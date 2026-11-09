import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { userCanAccessResource } from '../utils/helpers.js';
import { openPreviewModal } from '../ui/preview.js';
import { fetchDocuments } from './documentList.js';

export function setupSearch() {
  if (els.searchBtn && els.searchInput) {
    els.searchBtn.addEventListener('click', () => {
      const query = els.searchInput.value.trim();
      fetchDocuments(query);
      if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = els.searchInput.value.trim();
        fetchDocuments(query);
        if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
      }
    });
    els.searchInput.addEventListener('input', () => {
      const query = els.searchInput.value.trim().toLowerCase();
      if (!query || state.cachedDocuments.length === 0) {
        if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
        return;
      }
      let filtered = state.cachedDocuments.filter(doc => {
        if (!userCanAccessResource(doc)) return false;
        if (state.currentSelectedCategory === "drafts") return doc.status === 'draft';
        if (state.currentSelectedCategory === "pending_approval") return doc.status === 'pending_approval';
        if (state.currentSelectedCategory === "recommended") {
          if (state.currentUserBranch) {
            const matchesBranch = doc.branch === state.currentUserBranch || doc.branch === "All Branches";
            const matchesSem = !state.currentUserSemester || String(doc.semester) === String(state.currentUserSemester);
            return doc.category === "University Paper" && matchesBranch && matchesSem;
          }
          return false;
        } else if (state.currentSelectedCategory !== "all" && state.currentSelectedCategory !== "drafts" && state.currentSelectedCategory !== "pending_approval") {
          return doc.category === state.currentSelectedCategory;
        }
        return true;
      });
      filtered = filtered.filter(doc => {
        const allText = `${doc.title || ''} ${doc.titleHindi || ''} ${doc.extractedText || ''} ${doc.extractedTextHindi || ''} ${doc.officialDocType || ''} ${doc.paperType || ''} ${doc.category || ''} ${doc.branch || ''} ${doc.year || ''} ${doc.semester || ''} ${doc.session || ''} ${doc.department || ''}`.toLowerCase();
        return allText.includes(query);
      });
      if (filtered.length === 0) {
        if (els.searchSuggestions) els.searchSuggestions.classList.add('hidden');
        return;
      }
      if (els.searchSuggestions) {
        els.searchSuggestions.innerHTML = '';
        const displayCount = Math.min(filtered.length, 10);
        for (let i = 0; i < displayCount; i++) {
          const doc = filtered[i];
          const row = document.createElement('div');
          row.className = 'suggestion-item';
          const isDraft = doc.status === 'draft';
          const isPending = doc.status === 'pending_approval';
          let statusBadge = '';
          if (isDraft) statusBadge = '<span style="background:#f59e0b;color:#000;padding:1px 6px;border-radius:3px;font-size:0.6rem;font-weight:700;margin-left:4px;">DRAFT</span>';
          if (isPending) statusBadge = '<span style="background:#3b82f6;color:#fff;padding:1px 6px;border-radius:3px;font-size:0.6rem;font-weight:700;margin-left:4px;">PENDING</span>';
          row.innerHTML = `
            <div class="suggestion-info">
              <span class="suggestion-title">${doc.title} ${statusBadge}</span>
              <span class="suggestion-meta">${doc.category}</span>
            </div>
            <div class="suggestion-actions">
              <button class="suggestion-view-btn" style="background:none;border:none;color:#a5b4fc;cursor:pointer;margin-right:8px;"><i class="fa-solid fa-eye"></i></button>
              <a href="${doc.fileUrl}" target="_blank" rel="noopener" download="${doc.title}" class="suggestion-action-btn"><i class="fa-solid fa-download"></i></a>
            </div>
          `;
          row.querySelector('.suggestion-view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openPreviewModal(doc.title, doc.fileUrl, doc._id);
          });
          row.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-action-btn') || e.target.closest('.suggestion-view-btn')) return;
            els.searchInput.value = doc.title;
            fetchDocuments(doc.title);
            els.searchSuggestions.classList.add('hidden');
          });
          els.searchSuggestions.appendChild(row);
        }
        els.searchSuggestions.classList.remove('hidden');
      }
    });
    document.addEventListener('click', (e) => {
      if (els.searchSuggestions && !e.target.closest('.search-container')) els.searchSuggestions.classList.add('hidden');
    });
  }
}