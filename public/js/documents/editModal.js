import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { canEditDocuments, userCanAccessResource } from '../utils/helpers.js';
import { updateDocumentApi } from '../api/documents.js';
import { fetchDocuments } from './documentList.js';
import { fetchDrafts } from '../drafts/draftsPage.js';

export function openEditDocumentModal(doc) {
  if (!canEditDocuments()) {
    showNotification("Access denied.", "error");
    return;
  }
  if (!userCanAccessResource(doc)) {
    showNotification("Access denied.", "error");
    return;
  }
  state.editingDocId = doc._id;
  if (els.editTitleInput) els.editTitleInput.value = doc.title || '';
  if (els.editDocDateInput) els.editDocDateInput.value = doc.docDate || '';
  const isUniversity = doc.category === 'University Paper';
  if (els.editDocCategorySelect) els.editDocCategorySelect.value = isUniversity ? 'University' : 'Official';
  if (els.editUniversityFields) els.editUniversityFields.style.display = isUniversity ? 'block' : 'none';
  if (els.editOfficialFields) els.editOfficialFields.style.display = isUniversity ? 'none' : 'block';
  if (isUniversity) {
    if (els.editDocSessionSelect) els.editDocSessionSelect.value = doc.year || '2024-25';
    if (els.editDocSemSelect) els.editDocSemSelect.value = doc.semester || '1';
    if (els.editDocBranchSelect) els.editDocBranchSelect.value = doc.branch || 'CSE-R';
    if (els.editDocTypeSelect) els.editDocTypeSelect.value = doc.paperType || 'End Sem';
  } else {
    if (els.editOfficialDocTypeSelect) els.editOfficialDocTypeSelect.value = doc.officialDocType || 'Notice';
    if (els.editOfficialDocYearSelect) els.editOfficialDocYearSelect.value = doc.year || 'All Years';
    if (els.editOfficialDocSessionSelect) els.editOfficialDocSessionSelect.value = doc.session || '2024-25';
    if (els.editOfficialDocSemSelect) els.editOfficialDocSemSelect.value = doc.semester || '1';
    if (els.editOfficialDocBranchSelect) els.editOfficialDocBranchSelect.value = doc.branch || 'All Branches';
  }
  if (els.editPopup) els.editPopup.classList.remove('hidden');
}

export function setupEditModal() {
  if (els.closeEditPopupBtn) {
    els.closeEditPopupBtn.addEventListener('click', () => {
      if (els.editPopup) els.editPopup.classList.add('hidden');
      state.editingDocId = null;
    });
  }
  if (els.editDocCategorySelect && els.editUniversityFields && els.editOfficialFields) {
    els.editDocCategorySelect.addEventListener('change', () => {
      if (els.editDocCategorySelect.value === 'University') {
        els.editUniversityFields.style.display = 'block';
        els.editOfficialFields.style.display = 'none';
      } else {
        els.editUniversityFields.style.display = 'none';
        els.editOfficialFields.style.display = 'block';
      }
    });
  }
  if (els.confirmEditBtn) {
    els.confirmEditBtn.addEventListener('click', async () => {
      if (!state.editingDocId) return;
      if (!canEditDocuments()) {
        showNotification("Access denied.", "error");
        return;
      }
      const category = els.editDocCategorySelect ? els.editDocCategorySelect.value : 'University';
      const finalCategory = category === 'Official' ? 'Official Update' : 'University Paper';
      const payload = {
        title: els.editTitleInput ? els.editTitleInput.value.trim() : '',
        category: finalCategory,
        docDate: els.editDocDateInput ? els.editDocDateInput.value : ''
      };
      if (finalCategory === 'University Paper') {
        payload.year = els.editDocSessionSelect ? els.editDocSessionSelect.value : '2024-25';
        payload.semester = els.editDocSemSelect ? els.editDocSemSelect.value : '1';
        payload.branch = els.editDocBranchSelect ? els.editDocBranchSelect.value : 'CSE-R';
        payload.paperType = els.editDocTypeSelect ? els.editDocTypeSelect.value : 'End Sem';
        payload.officialDocType = '';
        payload.session = '';
      } else {
        payload.officialDocType = els.editOfficialDocTypeSelect ? els.editOfficialDocTypeSelect.value : 'Notice';
        if (els.editOfficialDocYearSelect) payload.year = els.editOfficialDocYearSelect.value || 'All Years';
        if (els.editOfficialDocSessionSelect) payload.session = els.editOfficialDocSessionSelect.value || '2024-25';
        if (els.editOfficialDocSemSelect) payload.semester = els.editOfficialDocSemSelect.value || '1';
        if (els.editOfficialDocBranchSelect) payload.branch = els.editOfficialDocBranchSelect.value || 'All Branches';
        payload.paperType = '';
      }
      if (!payload.title) { showNotification("Title cannot be empty.", "error"); return; }
      try {
        const { response, data } = await updateDocumentApi(state.editingDocId, payload);
        if (response.ok) {
          showNotification("Document updated successfully!", "success");
          if (els.editPopup) els.editPopup.classList.add('hidden');
          state.editingDocId = null;
          fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
          fetchDrafts();
        } else {
          showNotification(data.message || "Update failed.", "error");
        }
      } catch (err) {
        showNotification("Network error updating document.", "error");
      }
    });
  }
}