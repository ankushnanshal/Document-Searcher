const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const { ROLES, FACULTY_ROLES, COLLEGE_WIDE_ROLES, ROLE_PERMISSIONS } = require("../config/constants");
const { resolveAccess } = require("../utils/roleUtils");

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required.' });
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    try {
      const dbUser = await User.findById(decoded.id).select('email');
      if (!dbUser) return res.status(401).json({ message: 'User no longer exists.' });
      const access = resolveAccess(dbUser.email);
      req.user = {
        id: dbUser._id.toString(),
        email: dbUser.email,
        role: access.role,
        department: access.department,
        branch: access.branch,
        permissions: access.permissions
      };
      next();
    } catch (e) {
      res.status(500).json({ message: 'Authentication failed.' });
    }
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    const userPerms = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = permissions.some(p => userPerms.includes(p));
    if (!hasPermission) return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ message: 'Admin access required.' });
  next();
}

function requireFaculty(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!FACULTY_ROLES.includes(req.user.role)) return res.status(403).json({ message: 'Faculty access required.' });
  next();
}

function requireCollegeWideAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!COLLEGE_WIDE_ROLES.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireAdmin,
  requireFaculty,
  requireCollegeWideAccess
};