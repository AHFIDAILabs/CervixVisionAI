const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["patient", "doctor", "lab_technician", "admin"], // default set
    },
    description: {
      type: String,
    },
    permissions: [
      {
        type: String, // e.g., "create_analysis", "view_results", "send_message"
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
