const Analysis = require("../Models/analysis");
const { uploadToCloudinary } = require("../Middlewares/cloudinary");

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

    const result = await uploadToCloudinary(file.data, "medical-scans");

    const analysis = new Analysis({
      patient: req.user._id,
      requestedBy: req.user._id,
      type: VALID_TYPES.includes(type) ? type : "other",
      status: "pending",
      results: {
        attachments: [{ url: result.secure_url, type: "image" }],
      },
    });

    await analysis.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("analysisUpdate", {
        analysisId: analysis._id,
        status: "pending",
      });
    }

    console.log(`[ANALYSIS:201] Scan uploaded for user: ${req.user.email}`);
    res.status(201).json({ analysis, message: "Scan uploaded successfully." });
  } catch (error) {
    console.error("[ANALYSIS] Upload error:", error.message);
    res.status(500).json({ message: "Server error during scan upload." });
  }
};

module.exports = { getUserAnalyses, uploadScan };
