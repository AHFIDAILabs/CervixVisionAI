const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    cPassword: { type: String,  minlength: 6, select: false },
    phone: { type: String, trim: true },
    address: [
        {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: String,
        }
    ],

    userImage: {
  url: { type: String, default: null },
  public_id: { type: String, default: null },
},

    role: {
      type: String,
      enum: ["patient", "doctor", "lab_technician", "admin"],
      default: "patient",
    },

    // 👩‍⚕️ Doctor-specific
    specialization: { type: String },
    licenseNumber: { type: String },
    hospitalAffiliation: { type: String },

    // 🧑 Patient-specific
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    medicalHistory: [
      {
        condition: String,
        diagnosedAt: Date,
        notes: String,
      },
    ],
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 🔔 Notifications
    notifications: [
      {
        message: String,
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// 🔒 Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 Password check
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
