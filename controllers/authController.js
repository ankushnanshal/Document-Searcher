const bcrypt = require("bcrypt");
const { User } = require("../models/User");
const { ROLES } = require("../config/constants");
const {
  resolveAccess,
  getDepartmentFromBranch,
  syncUserAccess,
  createToken
} = require("../utils/roleUtils");

async function signup(req, res) {
  try {
    const { name, email, password, avatar, year, semester, branch } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing registration details." });
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });
    const access = resolveAccess(normalizedEmail);
    const hashedPassword = await bcrypt.hash(password, 10);
    let userDepartment = access.department;
    let userBranch = access.branch;
    if (access.role === ROLES.STUDENT && branch) {
      const deptFromBranch = getDepartmentFromBranch(branch);
      if (deptFromBranch) userDepartment = deptFromBranch;
      userBranch = branch;
    }
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      avatar: avatar || "",
      role: access.role,
      department: userDepartment,
      branch: userBranch,
      permissions: access.permissions,
      year: year || "",
      semester: semester || ""
    });
    await user.save();
    const token = createToken(user);
    res.status(201).json({
      token,
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during signup." });
  }
}

async function signin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid email or password." });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password." });
    await syncUserAccess(user);
    const token = createToken(user);
    res.status(200).json({
      token,
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during signin." });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    await syncUserAccess(user);
    res.status(200).json({
      name: user.name, email: user.email, avatar: user.avatar,
      role: user.role, department: user.department, branch: user.branch,
      permissions: user.permissions,
      year: user.year, semester: user.semester
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while loading user." });
  }
}

async function updateAvatar(req, res) {
  try {
    const { avatar } = req.body;
    const user = await User.findOneAndUpdate({ email: req.user.email }, { avatar: avatar || "" }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ message: "Avatar updated successfully.", avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating avatar." });
  }
}

module.exports = { signup, signin, getMe, updateAvatar };