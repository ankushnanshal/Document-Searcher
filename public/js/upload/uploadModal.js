import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { canUploadDocuments } from '../utils/helpers.js';
import { handleSemesterBranchLogic, setupDepartmentBranchSelectors, updateBranchOptionsForDepartment } from './uploadForm.js';

export function setupUploadModal() {
  if (els.mainUploadBtn && els.universalDocumentInput) {
    els.mainUploadBtn.addEventListener('click', () => {
      if (!canUploadDocuments()) {
        showNotification("Access denied. Only authorized faculty and leadership roles can upload documents.", "error");
        return;
      }
      if (els.docCategorySelect) els.docCategorySelect.value = "";
      if (els.universityFields) els.universityFields.style.display = 'none';
      if (els.officialFields) els.officialFields.style.display = 'none';
      if (els.docSessionSelect) els.docSessionSelect.value = "";
      if (els.docDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        els.docDateInput.value = `${year}-${month}-${day}`;
      }
      if (els.docTitleInput) els.docTitleInput.value = '';
      setupDepartmentBranchSelectors();
      els.universalDocumentInput.click();
    });
  }

  if (els.universalDocumentInput) {
    els.universalDocumentInput.addEventListener('change', (e) => {
      if (!e.target.files[0]) return;
      state.pendingUploadFile = e.target.files[0];
      if (els.docTitleInput) {
        const nameWithoutExt = state.pendingUploadFile.name.replace(/\.[^.]+$/, '');
        els.docTitleInput.value = nameWithoutExt;
      }
      setupDepartmentBranchSelectors();
      if (els.uploadPopup) els.uploadPopup.classList.remove('hidden');
    });
  }

  if (els.closeUploadPopupBtn) {
    els.closeUploadPopupBtn.addEventListener('click', () => {
      if (els.uploadPopup) els.uploadPopup.classList.add('hidden');
      state.pendingUploadFile = null;
      if (els.universalDocumentInput) els.universalDocumentInput.value = "";
      if (els.docTitleInput) els.docTitleInput.value = '';
    });
  }

  if (els.docSemSelect) els.docSemSelect.addEventListener('change', handleSemesterBranchLogic);

  if (els.docCategorySelect && els.universityFields && els.officialFields) {
    els.docCategorySelect.addEventListener('change', () => {
      if (els.docCategorySelect.value === 'University') {
        els.universityFields.style.display = 'block';
        els.officialFields.style.display = 'none';
        if (els.docSemSelect) els.docSemSelect.value = "1";
        handleSemesterBranchLogic();
      } else if (els.docCategorySelect.value === 'Official') {
        els.universityFields.style.display = 'none';
        els.officialFields.style.display = 'block';
      } else {
        els.universityFields.style.display = 'none';
        els.officialFields.style.display = 'none';
      }
      setupDepartmentBranchSelectors();
    });
  }

  if (els.docDepartmentSelect) {
    els.docDepartmentSelect.addEventListener('change', () => {
      updateBranchOptionsForDepartment(els.docDepartmentSelect.value, els.docBranchSelect);
    });
  }

  if (els.officialDocDepartmentSelect) {
    els.officialDocDepartmentSelect.addEventListener('change', () => {
      updateBranchOptionsForDepartment(els.officialDocDepartmentSelect.value, els.officialDocBranchSelect);
    });
  }
}