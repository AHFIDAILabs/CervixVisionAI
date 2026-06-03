const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // doctor or system user
      required: true,
    },
    labTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assigned technician
    },

    type: {
      type: String,
      required: true,
      enum: [
        "blood_test",
        "urine_test",
        "xray",
        "mri",
        "ct_scan",
        "general",
        "other",
      ],
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "reviewed", "delivered"],
      default: "pending",
    },

    results: {
      // Flexible structure: can handle numeric, text, or file-based results
      summary: { type: String }, // human-readable summary
      values: [
        {
          parameter: String, // e.g., "Hemoglobin"
          value: String,     // e.g., "13.5"
          unit: String,      // e.g., "g/dL"
          referenceRange: String, // e.g., "12–16 g/dL"
          flag: { type: String, enum: ["low", "normal", "high", null] },
        },
      ],
      attachments: [
        {
          url: String, // file/image/pdf link
          type: { type: String, enum: ["image", "pdf", "doc", "other"] },
        },
      ],
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // doctor who validates results
    },
    reviewedAt: { type: Date },

    deliveredAt: { type: Date }, // when patient sees it

    notes: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);
