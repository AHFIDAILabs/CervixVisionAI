const express = require('express');
const {getProfile, editProfile} = require('../Controllers/userController');
const {verifyToken, hydrateUser} = require('../Middlewares/jwt');
const userRouter = express.Router();

userRouter.get('/profile', verifyToken, hydrateUser, getProfile);
userRouter.put('/editProfile', verifyToken, hydrateUser, editProfile);

module.exports = userRouter;