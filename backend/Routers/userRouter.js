const express = require("express");
const { getProfile, editProfile, changePassword, deleteAccount } = require("../Controllers/userController");
const { verifyToken, hydrateUser } = require("../Middlewares/jwt");

const userRouter = express.Router();

userRouter.get("/profile", verifyToken, hydrateUser, getProfile);
userRouter.put("/editProfile", verifyToken, hydrateUser, editProfile);
userRouter.put("/change-password", verifyToken, hydrateUser, changePassword);
userRouter.delete("/account", verifyToken, hydrateUser, deleteAccount);

module.exports = userRouter;
