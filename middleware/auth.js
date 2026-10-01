const jwt = require('jsonwebtoken');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS, COLLEGE_WIDE_ROLES } = require('../config/roles');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function createToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient role.' });
    }
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated.' });
    const userPerms = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAny = permissions.some(p => userPerms.includes(p));
    if (!hasAny) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
}

function requireCollegeWideAccess(req, res, next) {
  if (!req.user || !COLLEGE_WIDE_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. College-wide access required.' });
  }
  next();
}

function canAccessDepartment(user, department) {
  if (!user) return false;
  if (COLLEGE_WIDE_ROLES.includes(user.role)) return true;
  if (!department) return true;
  return user.department === department;
}

function canApproveDocuments(user) {
  if (!user) return false;
  const perms = ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.APPROVE_DOCUMENT);
}

module.exports = {
  createToken,
  authenticateToken,
  requireRole,
  requirePermission,
  requireAdmin,
  requireCollegeWideAccess,
  canAccessDepartment,
  canApproveDocuments
};