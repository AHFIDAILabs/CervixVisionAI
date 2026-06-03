const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: "1d" }, // Optional: Auto-remove expired tokens using TTL index
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);