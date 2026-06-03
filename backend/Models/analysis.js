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
      summary: { type: String },
      values: [
        {
          parameter: String,
          value: String,
          unit: String,
          referenceRange: String,
          flag: { type: String, enum: ["low", "normal", "high", null] },
        },
      ],
      attachments: [
        {
          url: String,
          type: { type: String, enum: ["image", "pdf", "doc", "other"] },
        },
      ],
    },

    ml_results: {
      prediction:        { type: String, enum: ["Positive", "Negative"] },
      confidence:        { type: Number, min: 0, max: 1 },
      risk_score:        { type: Number, min: 0, max: 1 },
      lesion_class:      { type: String, enum: ["acetowhite_positive", "acetowhite_negative"] },
      uncertainty_score: { type: Number, min: 0, max: 1 },
      uncertainty_level: { type: String, enum: ["High", "Low"] },
      risk_level:        { type: String },
      recommendation:    { type: String },
      clinical_report:   { type: String },
      xai_output:        { type: String },   // base64 Grad-CAM overlay
      analysed_at:       { type: Date, default: Date.now },
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
