const User = require("../Models/user");
const { generateTokens } = require("../Middlewares/jwt");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

/**
 * Register a new user
 */
const registerUser = async (req, res) => {
  // 🟢 LOG START
  console.log(`[AUTH] Attempting to register user: ${req.body.email}`);
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      cPassword, // 1. Destructure confirmPassword
      phone,
      address, // 🔑 This is the incoming array of address objects [{street: '...', city: '...'}] from the frontend
      role,
      specialization,
      licenseNumber,
      hospitalAffiliation,
      dateOfBirth,
      gender,
    } = req.body; // ✅ Base validation

    if (!firstName || !lastName || !email || !password || !cPassword) {
      // 🟡 LOG VALIDATION FAILURE
      console.warn(
        `[AUTH:400] Registration failed: Missing required base fields for email: ${email}`
      );
      return res.status(400).json({
        message:
          "First name, last name, email, password, and confirm password are required.",
      });
    } // 2. Check if passwords match

    if (password !== cPassword) {
      console.warn(
        `[AUTH:400] Registration failed: Passwords do not match for email: ${email}`
      );
      return res.status(400).json({
        message: "Password and Confirm Password must match.",
      });
    } // ✅ Role-specific validation

    if (role === "doctor" && (!specialization || !licenseNumber)) {
      // 🟡 LOG VALIDATION FAILURE
      console.warn(
        `[AUTH:400] Registration failed: Doctor role requires specialization and licenseNumber for email: ${email}`
      );
      return res.status(400).json({
        message: "Doctors must provide specialization and license number.",
      });
    }

    // Patient gender and dateOfBirth are optional — frontend marks them as such.
    // ✅ Check if email exists

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 🟡 LOG CONFLICT
      console.warn(
        `[AUTH:400] Registration failed: Email already in use: ${email}`
      );
      return res.status(400).json({ message: "Email already in use." });
    } // ❌ NOTE: Logic for converting string to structuredAddress removed, as frontend sends the correct array format. // ✅ Create user

    const newUser = new User({
      firstName,
      lastName,
      email,
      password, // Password will be hashed automatically by the Mongoose 'pre('save')' hook.
      phone,
      address, // <<< Using the incoming 'address' array directly
      role,
      specialization,
      licenseNumber,
      hospitalAffiliation,
      dateOfBirth,
      gender,
    });

    await newUser.save(); // 🟢 LOG SUCCESS
    console.log(
      `[AUTH:201] Successfully registered new user: ${newUser.email} (${newUser.role})`
    ); // ✅ Generate tokens (Assumes 'generateTokens' is defined elsewhere)

    const { accessToken, refreshToken } = generateTokens(newUser);

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        userImage: newUser.userImage && newUser.userImage.url ? newUser.userImage.url : null,
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
    // 🔴 LOG SEVERE ERROR
    console.error(
      `[AUTH:500] Critical error during user registration for email: ${
        req.body.email || "N/A"
      }. Error: ${error.message}`,
      error.stack
    );
    res.status(500).json({ message: "Server error." });
  }
};

/**
 * Login user
 */
const loginUser = async (req, res) => {
  console.log(`[AUTH] Attempting login for email: ${req.body.email}`);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.warn("[AUTH:400] Login failed: Missing email or password.");
      return res.status(400).json({ message: "Please provide email and password." });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      console.warn(`[AUTH:401] Login failed: Invalid credentials for email: ${email}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }
    user.lastLogin = new Date();
    await user.save();
    console.log(`[AUTH:200] Successful login for user: ${user.email} (${user.role}).`);
    
    const tokens = await generateTokens(user); // Await the async function and store the result
    const { accessToken, refreshToken } = tokens; // Destructure after awaiting
    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        userImage: user.userImage && user.userImage.url ? user.userImage.url : null,
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
    console.error(`[AUTH:500] Critical error during user login for email: ${req.body.email || "N/A"}. Error:`, error.message, error.stack);
    res.status(500).json({ message: "Server error." });
  }
};
/**
 * Get current user profile
 */
// const getProfile = async (req, res) => {
//   try {
//     // `verifyToken` already attached decoded info in req.auth
//     const user = await User.findById(req.auth.userId).select("-password");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.status(200).json({ user });
//   } catch (error) {
//     console.error("Error fetching profile:", error);
//     res.status(500).json({ message: "Server error." });
//   }
// };



/**
 * Forgot Password — generates a reset token valid for 1 hour.
 * In production the token would be emailed; here we return 200 regardless
 * of whether the email exists (prevents user enumeration).
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
    // Always respond 200 — never reveal whether email is registered
    if (!user) {
      return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate a secure random token and store it hashed
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = await bcrypt.hash(rawToken, 10);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // TODO: send rawToken via email (e.g. SendGrid) in production.
    // For development, log it so it can be used directly.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
    }

    res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("[AUTH] forgotPassword error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

/**
 * Reset Password — validates the token and sets a new password.
 */
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

    user.password             = newPassword; // pre-save hook will hash it
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("[AUTH] resetPassword error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
