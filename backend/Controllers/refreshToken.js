const { generateTokens, verifyRefreshToken, revokeToken } = require("../Middlewares/jwt");
const RefreshToken = require("../Models/refreshToken");
const User = require("../Models/user");
const bcrypt = require("bcryptjs");

const refreshTokenController = async (req, res) => {
  const { token } = req.body; // frontend sends { token }

  if (!token) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const userId = decoded.sub;

    const storedToken = await RefreshToken.findOne({ userId });
    if (!storedToken) {
      return res.status(403).json({ message: "Invalid or revoked refresh token" });
    }

    const isValid = await bcrypt.compare(token, storedToken.token);
    if (!isValid) {
      await storedToken.deleteOne();
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    if (storedToken.expiresAt < new Date()) {
      await storedToken.deleteOne();
      return res.status(403).json({ message: "Refresh token has expired" });
    }

    // Fetch user
    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      await storedToken.deleteOne();
      return res.status(404).json({ message: "User not found" });
    }

    // Revoke old token
    await storedToken.deleteOne();

    // ✅ Generate fresh tokens (this signs + saves refresh token internally)
    const { accessToken, refreshToken } = await generateTokens(user);

    // Clean up expired tokens
    await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });

    res.status(200).json({
      accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    let message = "Invalid refresh token";
    if (error.name === "TokenExpiredError") {
      message = "Refresh token has expired";
    } else if (error.name === "JsonWebTokenError") {
      message = "Invalid refresh token signature or format";
    }
    res.status(403).json({ message });
  }
};



const revokeTokenController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    await revokeToken(token);
    res.status(200).json({ message: "Token revoked successfully" });
  } catch (error) {
    console.error("Revoke token error:", error);
    res.status(500).json({ message: "Failed to revoke token" });
  }
};

module.exports = { refreshTokenController, revokeTokenController };
