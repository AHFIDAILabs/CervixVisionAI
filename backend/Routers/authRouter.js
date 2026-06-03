const express = require('express');
const {loginUser, registerUser} = require('../Controllers/authController');
const {refreshTokenController, revokeTokenController} = require('../Controllers/refreshToken');
const {verifyToken} = require('../Middlewares/jwt');

const authRouter = express.Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
// authRouter.get('/me', verifyToken, getProfile);
authRouter.post('/refresh', refreshTokenController);
authRouter.post('/revoke', verifyToken, revokeTokenController);



module.exports = authRouter;