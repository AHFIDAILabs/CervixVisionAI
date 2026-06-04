// controllers/userController.js
const User = require("../Models/user");
const { generateTokens } = require("../Middlewares/jwt");

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



module.exports = { registerUser, loginUser};
