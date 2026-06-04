const User = require("../Models/user");
const { generateTokens } = require("../Middlewares/jwt");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const logger = require("../Middlewares/logger");

const registerUser = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password, cPassword,
      phone, address, role, specialization, licenseNumber,
      hospitalAffiliation, dateOfBirth, gender,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !cPassword) {
      return res.status(400).json({
        message: "First name, last name, email, password, and confirm password are required.",
      });
    }

    if (password !== cPassword) {
      return res.status(400).json({ message: "Password and Confirm Password must match." });
    }

    if (role === "doctor" && (!specialization || !licenseNumber)) {
      return res.status(400).json({ message: "Doctors must provide specialization and license number." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const newUser = new User({
      firstName, lastName, email, password, phone, address,
      role, specialization, licenseNumber, hospitalAffiliation,
      dateOfBirth, gender,
    });

    await newUser.save();
    logger.info(`[AUTH:201] Registered: ${newUser.role}`);

    // generateTokens is async — must be awaited or tokens will be undefined
    const { accessToken, refreshToken } = await generateTokens(newUser);

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        userImage: newUser.userImage?.url ?? null,
        phone: newUser.phone,
        address: newUser.address,
        specialization: newUser.specialization,
        licenseNumber: newUser.licenseNumber,
        hospitalAffiliation: newUser.hospitalAffiliation,
        dateOfBirth: newUser.dateOfBirth,
        gender: newUser.gender,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error(`[AUTH:500] Registration error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    user.lastLogin = new Date();
    await user.save();
    logger.info(`[AUTH:200] Login: ${user.role}`);

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        userImage: user.userImage?.url ?? null,
        phone: user.phone,
        address: user.address,
        specialization: user.specialization,
        licenseNumber: user.licenseNumber,
        hospitalAffiliation: user.hospitalAffiliation,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error(`[AUTH:500] Login error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user) {
      return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = await bcrypt.hash(rawToken, 10);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // TODO: send rawToken via email (e.g. SendGrid) in production.
    if (process.env.NODE_ENV !== "production") {
      logger.info(`[DEV] Password reset token issued for account.`);
    }

    res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (error) {
    logger.error(`[AUTH] forgotPassword error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Email, token, and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters." });
  }

  try {
    const user = await User.findOne({
      email,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires +password");

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or has expired." });
    }

    const isValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValid) {
      return res.status(400).json({ message: "Reset token is invalid or has expired." });
    }

    user.password             = newPassword;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    logger.error(`[AUTH] resetPassword error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
