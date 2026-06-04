const jwt = require("jsonwebtoken");
const User = require("../Models/user");
const RefreshToken = require("../Models/refreshToken");
const bcrypt = require("bcryptjs");

if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.warn("[AUTH] WARNING: JWT_SECRET or REFRESH_TOKEN_SECRET is not set in .env");
}

const signJwt = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
    assignedDoctor: user.assignedDoctor ? user.assignedDoctor.toString() : undefined,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const signRefreshToken = async (user) => {
  const payload = { sub: user._id.toString(), role: user.role };
  const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
  const hashedToken = await bcrypt.hash(token, 10);
  return { token, hashedToken };
};

const generateTokens = async (user) => {
  const { token: refreshToken, hashedToken } = await signRefreshToken(user);
  await RefreshToken.create({
    token: hashedToken,
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const accessToken = signJwt(user);
  return { accessToken, refreshToken };
};

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

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

const revokeToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const storedTokens = await RefreshToken.find({ userId: decoded.sub });
  for (const stored of storedTokens) {
    const isMatch = await bcrypt.compare(token, stored.token);
    if (isMatch) {
      await stored.deleteOne();
      return;
    }
  }
};

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
