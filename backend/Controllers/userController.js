const mongoose = require("mongoose")
const User = require("../Models/user")
const { generateTokens } = require("../Middlewares/jwt")
const {uploadToCloudinary, deleteFromCloudinary} = require("../Middlewares/cloudinary")

const getProfile = async (req, res) => {
  console.log(`[AUTH] Attempting to get profile for email: ${req.user?.email || "N/A"}`);
  try {
    // Check if req.user is defined (set by hydrateUser)
    if (!req.user || !req.user._id) {
      console.warn("[AUTH:401] Unauthorized: User not authenticated.");
      return res.status(401).json({ message: "Unauthorized: User not authenticated." });
    }

    const user = await User.findById(req.user._id).select("-password -cPassword");
    if (!user) {
      console.warn(`[AUTH:404] Profile fetch failed: User ${req.user._id} not found.`);
      return res.status(404).json({ message: "User not found." });
    }

    console.log(`[AUTH:200] Successfully fetched profile for email: ${user.email}`);
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
                userImage: user.userImage && user.userImage.url ? user.userImage.url : null,

      },
    });
  } catch (error) {
    console.error(`[AUTH:500] Critical error during profile fetch for email: ${req.user?.email || "N/A"}. Error:`, error.message, error.stack);
    res.status(500).json({ message: "Server error during profile fetch." });
  }
};


  const editProfile = async (req, res) => {
    console.log(`[AUTH] Attempting to edit profile for email: ${req.user?.email || "N/A"}`);
    try {
      const { firstName, lastName, email, phone, address } = req.body;

      // Input validation
      if (!firstName || !lastName || !email || !phone) {
        console.warn("[AUTH:400] Profile edit failed: Missing required fields.");
        return res.status(400).json({ message: "First name, last name, email, and phone are required." });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.warn("[AUTH:400] Profile edit failed: Invalid email format.");
        return res.status(400).json({ message: "Invalid email format." });
      }

      // Check for email uniqueness (if changed)
      if (req.user.email !== email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
          console.warn(`[AUTH:400] Profile edit failed: Email ${email} already in use.`);
          return res.status(400).json({ message: "Email already in use." });
        }
      }

      // Find and update the user
      const user = await User.findById(req.user._id);
      if (!user) {
        console.warn(`[AUTH:404] Profile edit failed: User ${req.user._id} not found.`);
        return res.status(404).json({ message: "User not found." });
      }

      user.firstName = firstName;
      user.lastName = lastName;
      user.email = email;
      user.phone = phone;
      if (address && Array.isArray(address)) {
        user.address = address.map((addr, index) => ({
          ...addr,
          _id: addr._id || new mongoose.Types.ObjectId(),
        }));
      }

      // Handle userImage upload
      if (req.files && req.files.userImage) {
        const file = Array.isArray(req.files.userImage) ? req.files.userImage[0] : req.files.userImage;

        if (!file.mimetype.startsWith("image/")) {
          return res.status(400).json({ message: "Only image files are allowed." });
        }

        const fileBuffer = file.data || file.buffer;
        if (fileBuffer) {
          // Delete old image if exists
          if (user.userImage?.public_id) {
            await deleteFromCloudinary(user.userImage.public_id);
          }
          const result = await uploadToCloudinary(fileBuffer, "profile-images");
          user.userImage = { url: result.secure_url, public_id: result.public_id };
        }
      }

      await user.save();

      // Generate new tokens if key fields changed
      const shouldRegenerateTokens = req.user.email !== email || req.user.firstName !== firstName || req.user.lastName !== lastName;
      const { accessToken, refreshToken } = shouldRegenerateTokens
        ? await generateTokens(user)
        : { accessToken: req.token, refreshToken: undefined };

      console.log(`[AUTH:200] Successfully updated profile for email: ${user.email}`);
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
          userImage: user.userImage && user.userImage.url ? user.userImage.url : null,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error(`[AUTH:500] Critical error during profile edit for email: ${req.user?.email || "N/A"}. Error:`, error.message, error.stack);
      res.status(500).json({ message: "Server error during profile edit." });
    }
  };

module.exports = {
    getProfile,
    editProfile,
}