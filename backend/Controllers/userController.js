const mongoose = require("mongoose");
const User = require("../Models/user");
const { generateTokens } = require("../Middlewares/jwt");
const { uploadToCloudinary, deleteFromCloudinary } = require("../Middlewares/cloudinary");
const logger = require("../Middlewares/logger");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -cPassword");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({
      message: "Profile fetched successfully.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        userImage: user.userImage?.url ?? null,
      },
    });
  } catch (error) {
    logger.error(`[USER] getProfile error: ${error.message}`);
    res.status(500).json({ message: "Server error during profile fetch." });
  }
};

const editProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: "First name, last name, email, and phone are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (req.user.email !== email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: "Email already in use." });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.firstName = firstName;
    user.lastName  = lastName;
    user.email     = email;
    user.phone     = phone;

    if (address && Array.isArray(address)) {
      user.address = address.map((addr) => ({
        ...addr,
        _id: addr._id || new mongoose.Types.ObjectId(),
      }));
    }

    if (req.files && req.files.userImage) {
      const file = Array.isArray(req.files.userImage) ? req.files.userImage[0] : req.files.userImage;
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed." });
      }
      const fileBuffer = file.data || file.buffer;
      if (fileBuffer) {
        if (user.userImage?.public_id) {
          await deleteFromCloudinary(user.userImage.public_id);
        }
        const result = await uploadToCloudinary(fileBuffer, "profile-images", file.mimetype);
        user.userImage = { url: result.secure_url, public_id: result.public_id };
      }
    }

    await user.save();

    const shouldRegenerateTokens =
      req.user.email !== email ||
      req.user.firstName !== firstName ||
      req.user.lastName !== lastName;

    const { accessToken, refreshToken } = shouldRegenerateTokens
      ? await generateTokens(user)
      : { accessToken: req.token, refreshToken: undefined };

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        userImage: user.userImage?.url ?? null,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error(`[USER] editProfile error: ${error.message}`);
    res.status(500).json({ message: "Server error during profile edit." });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    logger.error(`[USER] changePassword error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const Analysis = require("../Models/analysis");
    await Analysis.deleteMany({ patient: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    logger.error(`[USER] deleteAccount error: ${error.message}`);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { getProfile, editProfile, changePassword, deleteAccount };
