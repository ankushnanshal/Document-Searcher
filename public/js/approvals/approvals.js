import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { canApproveDocuments } from '../utils/helpers.js';
import { showInputModal } from '../ui/modals.js';
import { fetchPendingApprovalApi } from '../api/drafts.js';
import { approveDocumentApi, rejectDocumentApi } from '../api/documents.js';
import { renderDocumentCard } from '../documents/documentCard.js';
import { fetchDocuments } from '../documents/documentList.js';
import { fetchDrafts } from '../drafts/draftsPage.js';

export async function fetchPendingApprovals() {
  if (!state.authToken || !canApproveDocuments()) {
    state.pendingApprovalCount = 0;
    updatePendingApprovalTabCount(0);
    return;
  }
  try {
    const response = await fetchPendingApprovalApi();
    if (response.ok) {
      const pending = await response.json();
      state.pendingApprovalCount = pending ? pending.length : 0;
      updatePendingApprovalTabCount(state.pendingApprovalCount);
      if (state.currentSelectedCategory === 'pending_approval') renderPendingApprovals(pending);
    }
  } catch (err) {
    console.error("Error fetching pending approvals:", err);
  }
}

export function updatePendingApprovalTabCount(count) {
  let approvalTab = document.querySelector('.filter-tab[data-category="pending_approval"]');
  if (!approvalTab && canApproveDocuments()) {
    const filterContainer = document.querySelector('.category-filter-table');
    if (filterContainer) {
      approvalTab = document.createElement('div');
      approvalTab.className = 'filter-tab';
      approvalTab.setAttribute('data-category', 'pending_approval');
      approvalTab.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Approval (${count})`;
      filterContainer.appendChild(approvalTab);
      approvalTab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        approvalTab.classList.add('active');
        state.currentSelectedCategory = 'pending_approval';
        fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
        if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
      });
    }
  } else if (approvalTab) {
    approvalTab.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Approval (${count})`;
    if (count === 0 && !state.currentSelectedCategory.includes('pending_approval')) {
      approvalTab.style.display = 'none';
    } else {
      approvalTab.style.display = 'flex';
    }
  }
}

export function renderPendingApprovals(pending) {
  if (state.currentSelectedCategory !== 'pending_approval') return;
  if (!els.resultsGrid) return;
  const existingCards = els.resultsGrid.querySelectorAll('.document-row-card');
  existingCards.forEach(card => card.remove());
  if (!pending || pending.length === 0) {
    const emptyMsg = document.createElement('span');
    emptyMsg.className = 'history-empty-state';
    emptyMsg.textContent = 'No documents pending approval.';
    els.resultsGrid.appendChild(emptyMsg);
    if (els.resultCount) els.resultCount.textContent = `0 items ready`;
    return;
  }
  if (els.resultCount) els.resultCount.textContent = `${pending.length} item${pending.length !== 1 ? 's' : ''} pending`;
  pending.forEach((doc) => renderDocumentCard(doc, els.resultsGrid, true));
}

export async function approveDocument(id) {
  if (!canApproveDocuments()) {
    showNotification("Access denied.", "error");
    return;
  }
  showInputModal(
    "Approve Document",
    "Enter approval comment (optional)...",
    "",
    async (comment) => {
      try {
        const { response, data } = await approveDocumentApi(id, comment);
        if (response.ok) {
          showNotification(data.message || "Document approved successfully.", "success");
          fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
          fetchPendingApprovals();
          fetchDrafts();
        } else {
          showNotification(data.message || "Approval failed.", "error");
        }
      } catch (err) {
        showNotification("Network error approving document.", "error");
      }
    }
  );
}

export async function rejectDocument(id) {
  if (!canApproveDocuments()) {
    showNotification("Access denied.", "error");
    return;
  }
  showInputModal(
    "Reject Document",
    "Enter rejection reason / improvement comment...",
    "",
    async (reason) => {
      if (!reason || !reason.trim()) {
        showNotification("Rejection reason is required.", "error");
        return;
      }
      try {
        const { response, data } = await rejectDocumentApi(id, reason);
        if (response.ok) {
          showNotification(data.message || "Document rejected and moved to drafts.", "success");
          fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
          fetchPendingApprovals();
          fetchDrafts();
        } else {
          showNotification(data.message || "Rejection failed.", "error");
        }
      } catch (err) {
        showNotification("Network error rejecting document.", "error");
      }
    },
    true
  );
}