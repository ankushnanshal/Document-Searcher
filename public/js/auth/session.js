import { state } from '../state.js';
import { els, setDefaultAvatar, setAvatarImage } from '../utils/dom.js';
import { isStudentRole, hasStaffAccess, canApproveDocuments } from '../utils/helpers.js';
import { ROLES } from '../constants.js';
import { renderActionButtons } from '../ui/actionButtons.js';
import { renderDepartmentBranchFilters } from '../ui/departmentFilters.js';
import { updateRequestTabBadge, fetchDeletionRequests, removeDeletionRequestsTab } from '../deletion/deletionRequests.js';
import { fetchNotifications } from '../notifications/notifications.js';
import { addDraftTab, fetchDrafts } from '../drafts/draftsPage.js';
import { fetchPendingApprovals } from '../approvals/approvals.js';
import { setupUploadButtons } from '../upload/uploadForm.js';
import { fetchDocuments } from '../documents/documentList.js';
import { fetchHistory } from '../history/history.js';
import { removePendingApprovalTab } from '../ui/actionButtons.js';
import { resetUserState } from '../state.js';
import { updateNotificationBadge } from '../utils/notifications.js';

export function handleUserSession(user) {
  if (!user) return;
  state.isUserLoggedIn = true;
  state.activeUserEmail = user.email;
  state.currentUserName = user.name || "";
  state.currentUserRole = String(user.role || ROLES.STUDENT).toLowerCase();
  state.currentUserDepartment = user.department;
  state.currentUserBranch = user.branch;
  state.currentUserPermissions = user.permissions || [];
  state.currentUserYear = user.year;
  state.currentUserSemester = user.semester;

  if (els.workspaceName) {
    let displayName = user.name;
    if (state.currentUserDepartment) {
      displayName += ` (${state.currentUserDepartment}`;
      if (state.currentUserBranch && state.currentUserBranch !== state.currentUserDepartment) {
        displayName += ` - ${state.currentUserBranch}`;
      }
      displayName += ')';
    }
    els.workspaceName.textContent = displayName;
  }

  if (els.authorizedActionsBlock) els.authorizedActionsBlock.classList.remove('hidden');

  const signInBtn = document.getElementById('goSignInBtn');
  const signUpBtn = document.getElementById('goSignUpBtn');
  if (signInBtn) signInBtn.classList.add('hidden');
  if (signUpBtn) signUpBtn.classList.add('hidden');

  renderActionButtons();
  renderDepartmentBranchFilters();
  updateRequestTabBadge(0);
  fetchDeletionRequests();
  fetchNotifications();

  if (hasStaffAccess()) {
    addDraftTab();
    setupUploadButtons();
    fetchDrafts();
    if (canApproveDocuments()) fetchPendingApprovals();
  }

  const studentUser = isStudentRole(state.currentUserRole);
  if (els.recommendedTab) {
    if (studentUser && state.currentUserBranch) {
      els.recommendedTab.classList.remove('hidden');
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      els.recommendedTab.classList.add('active');
      state.currentSelectedCategory = "recommended";
    } else {
      els.recommendedTab.classList.add('hidden');
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      const firstTab = document.querySelector('.filter-tab');
      if (firstTab) firstTab.classList.add('active');
      state.currentSelectedCategory = "all";
    }
  }

  if (user.avatar) setAvatarImage(els.avatarContainer, user.avatar);

  fetchDocuments();
  fetchHistory();
}

export function handleLogout() {
  resetUserState();
  if (els.workspaceName) els.workspaceName.textContent = 'My Workspace';
  if (els.authorizedActionsBlock) els.authorizedActionsBlock.classList.add('hidden');
  document.body.classList.add('role-student');
  if (els.adminActionWrapper) {
    els.adminActionWrapper.classList.add('hidden');
    els.adminActionWrapper.setAttribute('data-hidden', 'true');
    els.adminActionWrapper.style.display = 'none';
  }
  if (els.mainUploadBtn) {
    els.mainUploadBtn.classList.add('hidden');
    els.mainUploadBtn.setAttribute('hidden', '');
    els.mainUploadBtn.style.display = 'none';
  }
  if (els.draftManagerBtn) {
    els.draftManagerBtn.classList.add('hidden');
    els.draftManagerBtn.setAttribute('hidden', '');
    els.draftManagerBtn.style.display = 'none';
  }
  if (els.recommendedTab) els.recommendedTab.classList.add('hidden');
  if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
  if (els.departmentFilterContainer) els.departmentFilterContainer.classList.add('hidden');
  if (els.branchFilterContainer) els.branchFilterContainer.classList.add('hidden');
  setDefaultAvatar(els.avatarContainer);
  const goSignInBtnReal = document.getElementById('goSignInBtn');
  const goSignUpBtnReal = document.getElementById('goSignUpBtn');
  if (goSignInBtnReal) goSignInBtnReal.classList.remove('hidden');
  if (goSignUpBtnReal) goSignUpBtnReal.classList.remove('hidden');
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  const firstTab = document.querySelector('.filter-tab');
  if (firstTab) firstTab.classList.add('active');
  state.currentSelectedCategory = "all";
  state.currentSelectedDepartmentFilter = "all";
  state.currentSelectedBranchFilter = "all";
  if (els.mainDashboardView) els.mainDashboardView.classList.remove('hidden');
  if (els.historyPageView) els.historyPageView.classList.add('hidden');
  if (els.draftsPageView) els.draftsPageView.classList.add('hidden');
  if (els.resultsMeta) els.resultsMeta.classList.remove('hidden');
  removePendingApprovalTab();
  removeDeletionRequestsTab();
  updateNotificationBadge(0);
  fetchDocuments();
  renderActionButtons();
  renderDepartmentBranchFilters();
}