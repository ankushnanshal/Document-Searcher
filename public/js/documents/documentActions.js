import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { deleteDocumentApi } from '../api/documents.js';
import { publishDraftApi } from '../api/drafts.js';
import { fetchDocuments } from './documentList.js';
import { fetchDrafts } from '../drafts/draftsPage.js';
import { fetchPendingApprovals } from '../approvals/approvals.js';
import { fetchNotifications } from '../notifications/notifications.js';
import { fetchDeletionRequests } from '../deletion/deletionRequests.js';
import { canManageDrafts } from '../utils/helpers.js';

export async function deleteDocument(id, reason) {
  try {
    const { response, data } = await deleteDocumentApi(id, reason);
    if (response.ok) {
      showNotification("Resource deleted successfully.", "success");
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
      fetchDrafts();
      fetchPendingApprovals();
      fetchNotifications();
      fetchDeletionRequests();
    } else {
      showNotification(data.message || "Deletion failed.", "error");
    }
  } catch (err) {
    showNotification("Network error during deletion.", "error");
  }
}

export async function publishDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied.", "error");
    return;
  }
  try {
    const { response, data } = await publishDraftApi(id);
    if (response.ok) {
      showNotification("Draft submitted for approval!", "success");
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
      fetchDrafts();
      fetchPendingApprovals();
    } else {
      showNotification(data.message || "Failed to submit draft.", "error");
    }
  } catch (err) {
    showNotification("Network error submitting draft.", "error");
  }
}