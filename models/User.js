const mongoose = require("mongoose");
const { ROLES, DEPARTMENTS } = require("../config/constants");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
  department: { type: String, enum: [...Object.values(DEPARTMENTS), null], default: null },
  branch: { type: String, default: null },
  permissions: { type: [String], default: [] },
  year: { type: String, default: "" },
  semester: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = { User, userSchema };