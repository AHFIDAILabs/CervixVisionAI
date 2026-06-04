const express = require("express");
const router = express.Router();
const RefreshToken = require("../Models/refreshToken");

// Manually trigger expired-token cleanup (called by an external cron scheduler)
router.get("/refresh-tokens", async (req, res) => {
  try {
    const result = await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
    res.status(200).json({ message: "Expired tokens cleaned up.", deleted: result.deletedCount });
  } catch (err) {
    console.error("[CRON] Token cleanup failed:", err);
    res.status(500).json({ message: "Error running token cleanup." });
  }
});

module.exports = router;
