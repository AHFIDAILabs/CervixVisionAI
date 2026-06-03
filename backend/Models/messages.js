const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    messageText: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["image", "video", "file", "audio", "other"],
          default: "other",
        },
      },
    ],

    contentType: {
      type: String,
      enum: ["text", "attachment", "system"],
      default: "text",
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },

    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
