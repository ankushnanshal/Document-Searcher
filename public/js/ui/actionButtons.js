import { state } from '../state.js';
import { els, setElementVisible } from '../utils/dom.js';
import { hasStaffAccess } from '../utils/helpers.js';
import { renderDepartmentBranchFilters } from './departmentFilters.js';
import { updateRequestTabBadge, removeDeletionRequestsTab } from '../deletion/deletionRequests.js';

export function removePendingApprovalTab() {
  const approvalTab = document.querySelector('.filter-tab[data-category="pending_approval"]');
  if (approvalTab) approvalTab.remove();
}

export function renderActionButtons() {
  const staff = hasStaffAccess();
  document.body.classList.toggle('role-student', !staff);
  setElementVisible(els.adminActionWrapper, staff, 'flex');
  setElementVisible(els.mainUploadBtn, staff);
  setElementVisible(els.draftManagerBtn, staff);
  if (!staff) {
    const draftTab = document.querySelector('.filter-tab[data-category="drafts"]');
    if (draftTab) draftTab.classList.add('hidden');
    if (els.draftsPageView) els.draftsPageView.classList.add('hidden');
    removePendingApprovalTab();
    removeDeletionRequestsTab();
  } else if (state.isUserLoggedIn) {
    updateRequestTabBadge(0);
  }
  renderDepartmentBranchFilters();
}