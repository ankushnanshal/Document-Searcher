import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { userCanAccessResource, userCanAccessBranch } from '../utils/helpers.js';
import { searchDocuments } from '../api/documents.js';
import { renderDocumentCard } from './documentCard.js';
import { fetchPendingApprovals } from '../approvals/approvals.js';
import { DEPARTMENTS } from '../constants.js';
import { isCollegeWideRole } from '../utils/helpers.js';

export async function fetchDocuments(query = "") {
  if (state.isLoading) return;
  state.isLoading = true;
  const isDraftView = state.currentSelectedCategory === "drafts";
  const isPendingView = state.currentSelectedCategory === "pending_approval";

  if (!state.activeUserEmail || !state.authToken) {
    if (els.resultCount) els.resultCount.textContent = `0 items ready`;
    if (els.resultsGrid) {
      const documentCards = els.resultsGrid.querySelectorAll('.document-row-card');
      documentCards.forEach(card => card.remove());
    }
    state.isLoading = false;
    return;
  }

  if (isPendingView) {
    state.isLoading = false;
    await fetchPendingApprovals();
    return;
  }

  try {
    const params = { q: query };
    if (state.currentSelectedCategory === "drafts") params.status = 'draft';
    else if (state.currentSelectedCategory !== "all" && state.currentSelectedCategory !== "recommended" && state.currentSelectedCategory !== "pending_approval" && state.currentSelectedCategory !== "deletion_requests") {
      params.category = state.currentSelectedCategory;
    }
    if (state.currentSelectedCategory === "recommended" && state.currentUserBranch) {
      params.branch = state.currentUserBranch;
      if (state.currentUserSemester) params.semester = state.currentUserSemester;
    }
    if (isCollegeWideRole()) {
      if (state.currentSelectedDepartmentFilter && state.currentSelectedDepartmentFilter !== 'all') params.department = state.currentSelectedDepartmentFilter;
      if (state.currentSelectedBranchFilter && state.currentSelectedBranchFilter !== 'all') params.branch = state.currentSelectedBranchFilter;
    } else if (state.currentUserDepartment === DEPARTMENTS.CSE) {
      if (state.currentSelectedBranchFilter && state.currentSelectedBranchFilter !== 'all') params.branch = state.currentSelectedBranchFilter;
    }
    const response = await searchDocuments(params);
    if (!response.ok) {
      if (els.resultCount) els.resultCount.textContent = `0 items ready`;
      if (els.resultsGrid) {
        els.resultsGrid.innerHTML = '';
        const emptyMsg = document.createElement('span');
        emptyMsg.className = 'history-empty-state';
        emptyMsg.textContent = query ? `No documents found matching "${query}"` : 'No documents available.';
        els.resultsGrid.appendChild(emptyMsg);
      }
      state.isLoading = false;
      return;
    }
    let docs = await response.json();
    if (!Array.isArray(docs)) docs = docs.docs || [];
    docs = docs.filter(doc => userCanAccessResource(doc));
    docs = docs.filter(doc => userCanAccessBranch(doc.branch, doc.department));
    if (query === "") state.cachedDocuments = docs;

    if (isDraftView) docs = docs.filter(doc => doc.status === 'draft');
    else if (state.currentSelectedCategory === "recommended" && state.currentUserBranch) {
      docs = docs.filter(doc => {
        const matchesBranch = doc.branch === state.currentUserBranch || doc.branch === "All Branches";
        const matchesSem = !state.currentUserSemester || String(doc.semester) === String(state.currentUserSemester);
        return doc.category === "University Paper" && matchesBranch && matchesSem;
      });
    } else if (state.currentSelectedCategory !== "all" && state.currentSelectedCategory !== "recommended" && state.currentSelectedCategory !== "drafts" && state.currentSelectedCategory !== "pending_approval" && state.currentSelectedCategory !== "deletion_requests") {
      docs = docs.filter(doc => doc.category === state.currentSelectedCategory);
    }

    if (els.resultCount) {
      const count = docs.length;
      els.resultCount.textContent = `${count} item${count !== 1 ? 's' : ''} ready`;
    }
    if (!els.resultsGrid) { state.isLoading = false; return; }
    const documentCards = els.resultsGrid.querySelectorAll('.document-row-card');
    documentCards.forEach(card => card.remove());
    if (!isDraftView && !isPendingView) {
      const academicCards = els.resultsGrid.querySelectorAll('.classroom-card');
      academicCards.forEach(card => card.remove());
    }
    if (docs.length === 0) {
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      if (isDraftView) emptyMsg.textContent = 'No drafts saved.';
      else if (isPendingView) emptyMsg.textContent = 'No documents pending approval.';
      else emptyMsg.textContent = query ? `No documents found matching "${query}"` : 'No documents available.';
      els.resultsGrid.appendChild(emptyMsg);
    }
    for (const doc of docs) {
      await renderDocumentCard(doc, els.resultsGrid, isPendingView);
    }
    if (els.resultsMeta) els.resultsMeta.classList.remove('hidden');
  } catch (err) {
    console.error("Error fetching documents:", err);
    if (els.resultsGrid) {
      els.resultsGrid.innerHTML = '';
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      emptyMsg.textContent = 'Error loading documents. Please try again.';
      els.resultsGrid.appendChild(emptyMsg);
    }
  }
  state.isLoading = false;
}