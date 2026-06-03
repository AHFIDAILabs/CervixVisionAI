const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "message",       // chat messages
        "lab_result",    // new analysis result ready
        "appointment",   // doctor scheduled/updated appointment
        "system",        // system-wide notice
        "alert"          // urgent medical alert
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },

    // Link to related object (like chat, post, lab report, etc.)
    referenceModel: { type: String }, // e.g., "Message", "Post", "LabResult"
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel",
    },

    // Context for grouping (like which chat, department, or medical unit)
    chatContext: {
      chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
      type: { type: String }, // "private", "group", "lab", "department"
      name: { type: String },
    },

    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
