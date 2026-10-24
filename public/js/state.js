import { ROLES } from './constants.js';

export const state = {
  currentMode: 'signin',
  activeUserEmail: null,
  currentUserRole: 'student',
  currentUserDepartment: null,
  currentUserBranch: null,
  currentUserPermissions: [],
  currentUserYear: null,
  currentUserSemester: null,
  currentUserName: "",
  tempSignupAvatarBase64: "",
  pendingUploadFile: null,
  currentSelectedCategory: "all",
  currentSelectedDepartmentFilter: "all",
  currentSelectedBranchFilter: "all",
  cachedDocuments: [],
  authToken: localStorage.getItem('token') || null,
  isUserLoggedIn: false,
  isLoading: false,
  draftCount: 0,
  pendingApprovalCount: 0,
  editingDocId: null
};

export function resetUserState() {
  state.activeUserEmail = null;
  state.currentUserRole = ROLES.STUDENT;
  state.currentUserDepartment = null;
  state.currentUserBranch = null;
  state.currentUserPermissions = [];
  state.currentUserYear = null;
  state.currentUserSemester = null;
  state.currentUserName = "";
  state.cachedDocuments = [];
  state.authToken = null;
  state.isUserLoggedIn = false;
  state.pendingApprovalCount = 0;
  localStorage.removeItem('token');
}