import { els } from '../utils/dom.js';
import { fetchDocuments } from '../documents/documentList.js';
import { state } from '../state.js';
import { addDraftTab } from '../drafts/draftsPage.js';

export function setupFilterTabs() {
  els.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentSelectedCategory = tab.getAttribute('data-category');
      if (state.currentSelectedCategory === "drafts" && state.isUserLoggedIn) {
        if (els.resultsMeta) els.resultsMeta.classList.remove('hidden');
        import('../drafts/draftsPage.js').then(m => m.fetchDrafts());
      } else if (state.currentSelectedCategory === "pending_approval" && state.isUserLoggedIn) {
        if (els.resultsMeta) els.resultsMeta.classList.remove('hidden');
        import('../approvals/approvals.js').then(m => m.fetchPendingApprovals());
      } else if (state.currentSelectedCategory === "deletion_requests") {
        if (els.resultsMeta) els.resultsMeta.classList.add('hidden');
        import('../deletion/deletionRequests.js').then(m => m.showDeletionRequestsModal());
      } else {
        if (els.resultsMeta) els.resultsMeta.classList.remove('hidden');
      }
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
      if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
    });
  });
}