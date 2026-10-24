const { User } = require("../models/User");
const { ROLES, ROLE_PERMISSIONS } = require("../config/constants");

async function getUsers(req, res) {
  try {
    const { department, role } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ role: 1, department: 1, name: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching users." });
  }
}

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching user." });
  }
}

async function updateUser(req, res) {
  try {
    const { name, role, department, branch, permissions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (name) user.name = name;
    if (role && Object.values(ROLES).includes(role)) {
      user.role = role;
      user.permissions = ROLE_PERMISSIONS[role] || [];
    }
    if (department !== undefined) user.department = department || null;
    if (branch !== undefined) user.branch = branch || null;
    if (permissions && Array.isArray(permissions)) user.permissions = permissions;
    await user.save();
    res.status(200).json({ message: "User updated successfully.", user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, branch: user.branch, permissions: user.permissions } });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating user." });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === ROLES.ADMIN) return res.status(403).json({ message: "Cannot delete admin account." });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting user." });
  }
}

module.exports = { getUsers, getUserById, updateUser, deleteUser };