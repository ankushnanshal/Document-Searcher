import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { canManageDrafts } from '../utils/helpers.js';
import { fetchDraftsApi, deleteDraftApi } from '../api/drafts.js';
import { openEditDocumentModal } from '../documents/editModal.js';
import { publishDraft } from '../documents/documentActions.js';
import { fetchDocuments } from '../documents/documentList.js';

export async function fetchDrafts() {
  if (!state.authToken || !canManageDrafts()) {
    if (els.draftsContainer) els.draftsContainer.innerHTML = '<span class="history-empty-state">No permission to view drafts.</span>';
    return;
  }
  try {
    const response = await fetchDraftsApi();
    if (response.ok) {
      const drafts = await response.json();
      state.draftCount = drafts ? drafts.length : 0;
      renderDrafts(drafts);
      renderDraftList(drafts);
      updateDraftTabCount(drafts.length);
    }
  } catch (err) {
    console.error("Error fetching drafts:", err);
  }
}

export function updateDraftTabCount(count) {
  const draftTab = document.querySelector('.filter-tab[data-category="drafts"]');
  if (!draftTab) return;
  state.draftCount = count;
  if (count > 0 && canManageDrafts()) {
    draftTab.classList.remove('hidden');
    draftTab.innerHTML = `<i class="fa-solid fa-file-pen"></i> Drafts (${count})`;
  } else {
    draftTab.classList.add('hidden');
    draftTab.innerHTML = `<i class="fa-solid fa-file-pen"></i> Drafts (0)`;
  }
}

export function renderDrafts(drafts) {
  updateDraftTabCount(drafts ? drafts.length : 0);
}

export function renderDraftList(drafts) {
  if (!els.draftsContainer) return;
  els.draftsContainer.innerHTML = '';
  if (!drafts || drafts.length === 0) {
    els.draftsContainer.innerHTML = '<span class="history-empty-state">No drafts found. Create a draft by uploading a file and selecting "Save as Draft".</span>';
    if (els.draftsCountText) els.draftsCountText.textContent = '0 drafts';
    return;
  }
  if (els.draftsCountText) els.draftsCountText.textContent = `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`;
  drafts.forEach((draft) => {
    const card = document.createElement('div');
    card.className = 'draft-item-card';
    const fileType = draft.fileType || draft.storageName ? draft.storageName.split('.').pop().toUpperCase() : 'Unknown';
    const createdAt = draft.draftCreatedAt ? new Date(draft.draftCreatedAt).toLocaleDateString() : new Date(draft.createdAt).toLocaleDateString();
    const deptInfo = draft.department ? ` • ${draft.department}` : '';
    const branchInfo = draft.branch && draft.branch !== draft.department ? ` • ${draft.branch}` : '';
    const hasRejection = draft.rejectionReason && draft.rejectionReason.length > 0;
    const rejectionBlock = hasRejection ? `<div style="margin-top: 8px; padding: 8px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px;"><p style="color: #fca5a5; font-size: 0.75rem; margin: 0;"><strong>Rejected by ${draft.rejectedBy || 'approver'}:</strong> ${draft.rejectionReason}</p></div>` : '';
    card.innerHTML = `
      <div class="draft-info">
        <h4>${draft.title}</h4>
        <p>${draft.category || 'Uncategorized'}${deptInfo}${branchInfo} • ${fileType} • Uploaded: ${createdAt}</p>
        <span class="draft-status-badge">Draft</span>
        ${rejectionBlock}
      </div>
      <div class="draft-actions">
        <button class="draft-action-btn draft-action-open" data-id="${draft._id}"><i class="fa-solid fa-pen"></i> Open</button>
        <button class="draft-action-btn draft-action-publish" data-id="${draft._id}"><i class="fa-solid fa-paper-plane"></i> Submit for Approval</button>
        <button class="draft-action-btn draft-action-delete" data-id="${draft._id}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    `;
    els.draftsContainer.appendChild(card);
    card.querySelector('.draft-action-open').addEventListener('click', () => openEditDocumentModal(draft));
    card.querySelector('.draft-action-publish').addEventListener('click', () => publishDraft(draft._id));
    card.querySelector('.draft-action-delete').addEventListener('click', () => deleteDraft(draft._id));
  });
}

export async function deleteDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied.", "error");
    return;
  }
  try {
    const { response, data } = await deleteDraftApi(id);
    if (response.ok) {
      showNotification("Draft deleted successfully.", "success");
      fetchDrafts();
      if (state.currentSelectedCategory === 'drafts') fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
    } else {
      showNotification(data.message || "Failed to delete draft.", "error");
    }
  } catch (err) {
    showNotification("Network error deleting draft.", "error");
  }
}

export function addDraftTab() {
  const filterContainer = document.querySelector('.category-filter-table');
  if (!filterContainer) return;
  const existingDraftTab = document.querySelector('.filter-tab[data-category="drafts"]');
  if (existingDraftTab) return;
  const draftTab = document.createElement('div');
  draftTab.className = 'filter-tab hidden';
  draftTab.setAttribute('data-category', 'drafts');
  draftTab.innerHTML = `<i class="fa-solid fa-file-pen"></i> Drafts (0)`;
  filterContainer.appendChild(draftTab);
  draftTab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    draftTab.classList.add('active');
    state.currentSelectedCategory = 'drafts';
    fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
    if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
  });
}

export function setupDraftsPage() {
  if (els.draftManagerBtn) {
    els.draftManagerBtn.addEventListener('click', () => {
      if (!canManageDrafts()) {
        showNotification("Access denied.", "error");
        return;
      }
      if (els.draftsPageView) {
        els.mainDashboardView.classList.add('hidden');
        els.historyPageView.classList.add('hidden');
        els.draftsPageView.classList.remove('hidden');
        fetchDrafts();
      }
    });
  }

  if (els.backFromDraftsBtn) {
    els.backFromDraftsBtn.addEventListener('click', () => {
      if (els.draftsPageView) els.draftsPageView.classList.add('hidden');
      if (els.mainDashboardView) els.mainDashboardView.classList.remove('hidden');
    });
  }

  if (els.refreshDraftsBtn) {
    els.refreshDraftsBtn.addEventListener('click', () => {
      fetchDrafts();
      showNotification("Drafts refreshed.", "success");
    });
  }
}