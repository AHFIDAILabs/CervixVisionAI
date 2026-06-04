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

    // 1. Upload image to Cloudinary for permanent storage
    const cloudinaryResult = await uploadToCloudinary(file.data, "medical-scans", file.mimetype);

    // 2. Create Analysis record immediately as "in_progress"
    const analysis = new Analysis({
      patient: req.user._id,
      requestedBy: req.user._id,
      type: VALID_TYPES.includes(type) ? type : "other",
      status: "in_progress",
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

    // 3. Send image buffer to ai_engine for ensemble inference
    let mlResult = null;
    try {
      mlResult = await analyzeImage(file.data, file.mimetype, file.name || "scan.jpg");
    } catch (mlError) {
      console.error("[ANALYSIS] ML service call failed:", mlError.message);
    }

    // 4. Store ML results and mark completed (or failed if ML errored)
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

    // 5. Emit result to patient via socket
    if (io) {
      io.to(req.user._id.toString()).emit("analysisUpdate", {
        analysisId:  analysis._id,
        status:      analysis.status,
        prediction:  analysis.ml_results?.prediction ?? null,
        risk_score:  analysis.ml_results?.risk_score ?? null,
        risk_level:  analysis.ml_results?.risk_level ?? null,
      });
    }

    console.log(`[ANALYSIS:201] Scan processed for ${req.user.email} — ${analysis.status}`);
    res.status(201).json({ analysis, message: "Scan uploaded and analysed successfully." });
  } catch (error) {
    console.error("[ANALYSIS] Upload error:", error.message);
    res.status(500).json({ message: "Server error during scan upload." });
  }
};

module.exports = { getUserAnalyses, uploadScan };
