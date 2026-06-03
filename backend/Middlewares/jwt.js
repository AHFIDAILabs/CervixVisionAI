// middleware/jwtAuth.js
const jwt = require("jsonwebtoken");
const User = require("../Models/user");
const RefreshToken = require("../Models/refreshToken");
const bcrypt = require("bcryptjs");

if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.warn("JWT_SECRET or REFRESH_TOKEN_SECRET is not set in .env");
}

/**
 * Create an access token (short lived)
 */
const signJwt = (user) => {
  try {
    console.log("[AUTH] Signing JWT for user:", user._id, "with secret:", !!process.env.JWT_SECRET);
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
      assignedDoctor: user.assignedDoctor ? user.assignedDoctor.toString() : undefined,
    };
    console.log("[AUTH] JWT Payload:", payload);
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
    console.log("[AUTH] JWT Signed:", token);
    return token;
  } catch (error) {
    console.error("[AUTH] Error signing JWT:", error);
    throw error;
  }
};

const signRefreshToken = async (user) => {
  try {
    console.log("[AUTH] Signing Refresh Token for user:", user._id, "with secret:", !!process.env.REFRESH_TOKEN_SECRET);
    const payload = { sub: user._id.toString(), role: user.role };
    console.log("[AUTH] Refresh Token Payload:", payload);
    const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
    console.log("[AUTH] Refresh Token Signed:", token);
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(token, salt);
    return { token, hashedToken };
  } catch (error) {
    console.error("[AUTH] Error signing Refresh Token:", error);
    throw error;
  }
};

const generateTokens = async (user) => {
  try {
    console.log("[AUTH] Generating tokens for user:", user);
    const { token: refreshToken, hashedToken } = await signRefreshToken(user);
    await RefreshToken.create({
      token: hashedToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const accessToken = signJwt(user);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("[AUTH] Error generating tokens:", error);
    throw error;
  }
};

/**
 * Verify access token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = (req.headers.authorization || "").toString();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
      name: decoded.name,
      assignedDoctor: decoded.assignedDoctor,
    };
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ message: msg });
  }
};

/**
 * Role-based authorization
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    return decoded;
  } catch (err) {
    throw err;
  }
};

/**
 * Revoke a refresh token
 */
const revokeToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const salt = await bcrypt.genSalt(10);
  const hashedToken = await bcrypt.hash(token, salt);
  await RefreshToken.deleteOne({ token: hashedToken, userId: decoded.sub });
};

/**
 * Hydrate full user details
 */
const hydrateUser = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    console.error("hydrateUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  signJwt,
  signRefreshToken,
  generateTokens,
  verifyToken,
  authorize,
  verifyRefreshToken,
  revokeToken,
  hydrateUser,
};