const Analysis = require("../Models/analysis");
const { uploadToCloudinary } = require("../Middlewares/cloudinary");
const { analyzeImage } = require("../Services/mlService");

const VALID_TYPES = ["blood_test", "urine_test", "xray", "mri", "ct_scan", "general", "other"];

const getUserAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .select("-notes");
    res.status(200).json({ analyses });
  } catch (error) {
    console.error("[ANALYSIS] Fetch error:", error.message);
    res.status(500).json({ message: "Server error fetching analyses." });
  }
};

const getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      patient: req.user._id,   // patients can only read their own
    }).select("-notes");

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found." });
    }
    res.status(200).json({ analysis });
  } catch (error) {
    console.error("[ANALYSIS] Fetch-by-id error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// Runs ML inference and updates the Analysis document after the HTTP response
// has already been sent. Errors are fully contained here.
const _runMlInBackground = async (analysisId, fileData, mimetype, filename, io, userId) => {
  let mlResult = null;
  try {
    mlResult = await analyzeImage(fileData, mimetype, filename);
  } catch (mlError) {
    console.error("[ANALYSIS] ML inference failed:", mlError.message);
  }

  try {
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) return;

    if (mlResult && !mlResult.error) {
      analysis.status = "completed";
      analysis.results.summary = mlResult.clinical_report;
      analysis.ml_results = {
        prediction:        mlResult.prediction,
        confidence:        mlResult.confidence,
        risk_score:        mlResult.risk_score,
        lesion_class:      mlResult.lesion_class,
        uncertainty_score: mlResult.uncertainty_score,
        uncertainty_level: mlResult.uncertainty_level,
        risk_level:        mlResult.risk_level,
        recommendation:    mlResult.recommendation,
        clinical_report:   mlResult.clinical_report,
        xai_output:        mlResult.xai_output,
        analysed_at:       new Date(),
      };
    } else {
      analysis.status = "pending";
    }

    await analysis.save();

    if (io) {
      io.to(userId).emit("analysisUpdate", {
        analysisId:  analysis._id,
        status:      analysis.status,
        prediction:  analysis.ml_results?.prediction  ?? null,
        risk_score:  analysis.ml_results?.risk_score  ?? null,
        risk_level:  analysis.ml_results?.risk_level  ?? null,
      });
    }

    console.log(`[ANALYSIS] Background ML done for ${analysisId} — ${analysis.status}`);
  } catch (saveError) {
    console.error("[ANALYSIS] Failed to save ML results:", saveError.message);
  }
};

const uploadScan = async (req, res) => {
  try {
    const { type } = req.body;

    if (!req.files || !req.files.scan) {
      return res.status(400).json({ message: "No scan file provided." });
    }

    const file = Array.isArray(req.files.scan) ? req.files.scan[0] : req.files.scan;

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed." });
    }

    // Upload to Cloudinary for permanent storage
    const cloudinaryResult = await uploadToCloudinary(file.data, "medical-scans", file.mimetype);

    // Create the Analysis record immediately as "in_progress"
    const analysis = new Analysis({
      patient:     req.user._id,
      requestedBy: req.user._id,
      type:        VALID_TYPES.includes(type) ? type : "other",
      status:      "in_progress",
      results: {
        attachments: [{ url: cloudinaryResult.secure_url, type: "image" }],
      },
    });
    await analysis.save();

    // Notify frontend that analysis has started
    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("analysisUpdate", {
        analysisId: analysis._id,
        status: "in_progress",
      });
    }

    // Respond immediately — the user does not wait for ML inference
    res.status(201).json({ analysis, message: "Scan uploaded. AI analysis in progress…" });

    // Run ML inference in the background after the response is sent
    _runMlInBackground(
      analysis._id.toString(),
      file.data,
      file.mimetype,
      file.name || "scan.jpg",
      io,
      req.user._id.toString()
    );
  } catch (error) {
    console.error("[ANALYSIS] Upload error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error during scan upload." });
    }
  }
};

module.exports = { getUserAnalyses, getAnalysisById, uploadScan };
