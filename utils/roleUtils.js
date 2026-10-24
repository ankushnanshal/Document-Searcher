const jwt = require("jsonwebtoken");
const {
  ROLES,
  DEPARTMENTS,
  CSE_BRANCHES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  FACULTY_ROLES,
  COLLEGE_WIDE_ROLES,
  APPROVAL_CHAIN,
  ROLE_DISPLAY_MAP,
  ADMIN_EMAILS,
  STAFF_BY_EMAIL
} = require("../config/constants");
const { JWT_SECRET } = require("../config/env");

function getRoleDisplay(role) {
  return ROLE_DISPLAY_MAP[role] || role;
}

function resolveAccess(email) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    return {
      role: ROLES.ADMIN,
      department: null,
      branch: null,
      permissions: ROLE_PERMISSIONS[ROLES.ADMIN]
    };
  }
  const staff = STAFF_BY_EMAIL.get(normalizedEmail);
  if (staff) {
    return {
      role: staff.role,
      department: staff.department || null,
      branch: staff.branch || null,
      permissions: ROLE_PERMISSIONS[staff.role]
    };
  }
  return { role: ROLES.STUDENT, department: null, branch: null, permissions: ROLE_PERMISSIONS[ROLES.STUDENT] };
}

function normalizeDepartmentForResource(department, branch) {
  if (!department) return null;
  const upperDept = String(department).toUpperCase().trim();
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (upperDept === 'CSE' || CSE_BRANCHES.some(b => upperDept.includes(b.replace('CSE-', '')))) {
    return DEPARTMENTS.CSE;
  }
  if (Object.values(DEPARTMENTS).includes(upperDept)) return upperDept;
  return null;
}

function getDepartmentFromBranch(branch) {
  if (!branch) return null;
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (Object.values(DEPARTMENTS).includes(branch)) return branch;
  return null;
}

function normalizeBranchForResource(branch, department) {
  if (!branch) return department || '';
  if (branch === 'All Branches') return 'All Branches';
  if (CSE_BRANCHES.includes(branch)) return branch;
  if (Object.values(DEPARTMENTS).includes(branch)) return branch;
  if (department === DEPARTMENTS.CSE) {
    if (branch.includes('R') || branch.includes('R)')) return 'CSE-R';
    if (branch.includes('AI') || branch.includes('A.I')) return 'CSE-A.I';
    if (branch.includes('SF')) return 'CSE-SF';
  }
  return branch;
}

function getApprovalChain(role) {
  return APPROVAL_CHAIN[role] || [];
}

function requiresApproval(role) {
  const chain = getApprovalChain(role);
  return chain.length > 0;
}

function canApproveRole(approverRole, submitterRole) {
  const chain = getApprovalChain(submitterRole);
  return chain.includes(approverRole);
}

async function syncUserAccess(user) {
  const access = resolveAccess(user.email);
  const samePerms = Array.isArray(user.permissions) &&
    user.permissions.length === access.permissions.length &&
    access.permissions.every(p => user.permissions.includes(p));
  if (user.role !== access.role ||
      (user.department || null) !== access.department ||
      (user.branch || null) !== access.branch ||
      !samePerms) {
    user.role = access.role;
    user.department = access.department;
    user.branch = access.branch;
    user.permissions = access.permissions;
    await user.save();
  }
  return user;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department,
      branch: user.branch,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function isCollegeWideRole(user) {
  return COLLEGE_WIDE_ROLES.includes(user.role);
}

function userCanAccessResource(user, resource) {
  if (isCollegeWideRole(user)) return true;
  if (!resource.department) return true;
  if (!user.department) return false;
  return resource.department === user.department;
}

function userCanAccessBranch(user, resourceBranch, resourceDepartment) {
  if (isCollegeWideRole(user)) return true;
  if (!resourceBranch || resourceBranch === 'All Branches' || resourceBranch === '') return true;
  if (!user.department) return false;
  const normalizedDept = resourceDepartment || getDepartmentFromBranch(resourceBranch);
  if (!normalizedDept) return true;
  if (normalizedDept === user.department) return true;
  if (user.department === DEPARTMENTS.CSE && CSE_BRANCHES.includes(resourceBranch)) return true;
  return false;
}

function canApproveDocuments(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.APPROVE_DOCUMENT);
}

function canManageDocuments(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.CREATE_DOCUMENT) ||
         perms.includes(PERMISSIONS.DELETE_DOCUMENT) ||
         perms.includes(PERMISSIONS.APPROVE_DOCUMENT);
}

function canManageDrafts(user) {
  const perms = user.permissions || ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(PERMISSIONS.MANAGE_DRAFTS);
}

function isFaculty(user) {
  return FACULTY_ROLES.includes(user.role);
}

function isStudent(user) {
  return user.role === ROLES.STUDENT;
}

function validateDepartmentForUser(user, requestedDepartment) {
  if (isCollegeWideRole(user)) {
    if (!requestedDepartment) return null;
    return normalizeDepartmentForResource(requestedDepartment, null);
  }
  return user.department;
}

function validateBranchForUser(user, requestedBranch, department) {
  if (!requestedBranch || requestedBranch === 'All Branches') {
    if (department === DEPARTMENTS.CSE && !isCollegeWideRole(user)) {
      return 'All Branches';
    }
    return requestedBranch || '';
  }
  if (isCollegeWideRole(user)) {
    return normalizeBranchForResource(requestedBranch, department);
  }
  if (department === DEPARTMENTS.CSE) {
    if (CSE_BRANCHES.includes(requestedBranch)) return requestedBranch;
    return 'CSE-R';
  }
  return department || requestedBranch;
}

module.exports = {
  getRoleDisplay,
  resolveAccess,
  normalizeDepartmentForResource,
  getDepartmentFromBranch,
  normalizeBranchForResource,
  getApprovalChain,
  requiresApproval,
  canApproveRole,
  syncUserAccess,
  createToken,
  isCollegeWideRole,
  userCanAccessResource,
  userCanAccessBranch,
  canApproveDocuments,
  canManageDocuments,
  canManageDrafts,
  isFaculty,
  isStudent,
  validateDepartmentForUser,
  validateBranchForUser
};