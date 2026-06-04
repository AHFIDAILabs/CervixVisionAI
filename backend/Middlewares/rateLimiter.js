const rateLimit = require("express-rate-limit");

const handler = (req, res) =>
  res.status(429).json({
    message: "Too many requests. Please wait and try again.",
  });

// Strict limiter for auth endpoints — prevents brute force and credential stuffing.
// 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Moderate limiter for all other API routes.
// 100 requests per 15 minutes per IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Very tight limiter for password-reset requests specifically.
// 5 per hour per IP — slow down token-generation abuse.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { authLimiter, apiLimiter, forgotPasswordLimiter };
