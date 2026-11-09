import { state } from '../state.js';
import { DEPARTMENTS, CSE_BRANCHES, ALL_DEPARTMENTS, ROLES, FACULTY_ROLES, COLLEGE_WIDE_ROLES, DIRECT_DELETE_ROLES, REQUEST_DELETE_ROLES } from '../constants.js';

export function isFacultyRole(role) {
  return FACULTY_ROLES.includes(String(role || '').toLowerCase());
}

export function isStudentRole(role) {
  return String(role || ROLES.STUDENT).toLowerCase() === ROLES.STUDENT;
}

export function isCollegeWideRole() {
  return COLLEGE_WIDE_ROLES.includes(state.currentUserRole);
}

export function isCseDepartment() {
  return state.currentUserDepartment === DEPARTMENTS.CSE;
}

export function hasStaffAccess() {
  return state.isUserLoggedIn && isFacultyRole(state.currentUserRole);
}

export function canApproveDocuments() {
  return hasStaffAccess() && state.currentUserPermissions.includes('approve_document');
}

export function canManageDrafts() {
  return hasStaffAccess();
}

export function canEditDocuments() {
  return hasStaffAccess();
}

export function canUploadDocuments() {
  return hasStaffAccess();
}

export function isResourceOwner(doc) {
  if (!doc || !doc.uploadedBy || !state.activeUserEmail) return false;
  return doc.uploadedBy.toLowerCase() === state.activeUserEmail.toLowerCase();
}

export function canDirectlyDelete(doc) {
  if (!doc || !state.isUserLoggedIn) return false;
  if (DIRECT_DELETE_ROLES.includes(state.currentUserRole)) return true;
  return isResourceOwner(doc);
}

export function canRequestDelete(doc) {
  if (!doc || !state.isUserLoggedIn) return false;
  if (canDirectlyDelete(doc)) return false;
  if (!REQUEST_DELETE_ROLES.includes(state.currentUserRole)) return false;
  return true;
}

export function canCollegeWideRequestDelete(doc) {
  if (!doc || !state.isUserLoggedIn) return false;
  if (!COLLEGE_WIDE_ROLES.includes(state.currentUserRole)) return false;
  if (isResourceOwner(doc)) return false;
  return true;
}

export function getUploaderDisplay(doc) {
  if (!doc) return 'Unknown';
  return doc.uploadedByName || doc.uploadedBy || 'Unknown';
}

export function userCanAccessResource(doc) {
  if (!state.isUserLoggedIn) return false;
  if (isCollegeWideRole()) return true;
  if (!doc.department) return true;
  if (!state.currentUserDepartment) return false;
  return doc.department === state.currentUserDepartment;
}

export function userCanAccessBranch(docBranch, docDepartment) {
  if (!state.isUserLoggedIn) return false;
  if (isCollegeWideRole()) return true;
  if (!docBranch || docBranch === "All Branches" || docBranch === "") return true;
  if (!state.currentUserDepartment) return false;
  const normalizedDept = docDepartment || getDepartmentFromBranch(docBranch);
  if (!normalizedDept) return true;
  if (normalizedDept === state.currentUserDepartment) return true;
  if (state.currentUserDepartment === DEPARTMENTS.CSE && CSE_BRANCHES.includes(docBranch)) return true;
  return false;
}

export function getDepartmentFromBranch(branch) {
  if (!branch) return null;
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (ALL_DEPARTMENTS.includes(branch)) return branch;
  return null;
}