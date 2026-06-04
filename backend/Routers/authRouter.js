const express = require("express");
const { loginUser, registerUser, forgotPassword, resetPassword } = require("../Controllers/authController");
const { refreshTokenController, revokeTokenController } = require("../Controllers/refreshToken");
const { verifyToken } = require("../Middlewares/jwt");

const authRouter = express.Router();

authRouter.post("/register",        registerUser);
authRouter.post("/login",           loginUser);
authRouter.post("/refresh",         refreshTokenController);
authRouter.post("/revoke",          verifyToken, revokeTokenController);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password",  resetPassword);

module.exports = authRouter;
