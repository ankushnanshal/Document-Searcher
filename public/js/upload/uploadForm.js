import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { isCollegeWideRole, isCseDepartment } from '../utils/helpers.js';
import { uploadDocumentApi } from '../api/documents.js';
import { fetchDocuments } from '../documents/documentList.js';
import { fetchDrafts } from '../drafts/draftsPage.js';
import { fetchPendingApprovals } from '../approvals/approvals.js';
import { DEPARTMENTS, CSE_BRANCHES, ALL_DEPARTMENTS } from '../constants.js';

export function handleSemesterBranchLogic() {
  if (!els.docSemSelect || !els.docBranchSelect || !els.allBranchesOpt) return;
  const selectedSem = parseInt(els.docSemSelect.value);
  if (selectedSem === 1 || selectedSem === 2) {
    els.allBranchesOpt.style.display = 'block';
    els.docBranchSelect.value = "All Branches";
  } else {
    els.allBranchesOpt.style.display = 'none';
    if (els.docBranchSelect.value === "All Branches") {
      if (isCseDepartment()) {
        els.docBranchSelect.value = "CSE-R";
      } else {
        els.docBranchSelect.value = state.currentUserDepartment || "CSE-R";
      }
    }
  }
}

export function updateBranchOptionsForDepartment(department, branchSelect) {
  if (!branchSelect) return;
  const currentValue = branchSelect.value;
  branchSelect.innerHTML = '';
  if (department === DEPARTMENTS.CSE) {
    const allOption = document.createElement('option');
    allOption.value = 'All Branches';
    allOption.textContent = 'All CSE Branches';
    branchSelect.appendChild(allOption);
    CSE_BRANCHES.forEach(branch => {
      const opt = document.createElement('option');
      opt.value = branch;
      opt.textContent = branch;
      branchSelect.appendChild(opt);
    });
  } else if (department && ALL_DEPARTMENTS.includes(department)) {
    const opt = document.createElement('option');
    opt.value = department;
    opt.textContent = department;
    branchSelect.appendChild(opt);
    const allOpt = document.createElement('option');
    allOpt.value = 'All Branches';
    allOpt.textContent = 'All Branches';
    branchSelect.appendChild(allOpt);
  } else {
    const allOpt = document.createElement('option');
    allOpt.value = 'All Branches';
    allOpt.textContent = 'All Branches';
    branchSelect.appendChild(allOpt);
    CSE_BRANCHES.forEach(branch => {
      const opt = document.createElement('option');
      opt.value = branch;
      opt.textContent = branch;
      branchSelect.appendChild(opt);
    });
    ['ECE', 'EE', 'ME', 'CE', 'CHE'].forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      branchSelect.appendChild(opt);
    });
  }
  if (currentValue && branchSelect.querySelector(`option[value="${currentValue}"]`)) {
    branchSelect.value = currentValue;
  }
}

export function setupDepartmentBranchSelectors() {
  if (!els.docDepartmentSelect || !els.docBranchSelect) return;
  if (isCollegeWideRole()) {
    if (els.docDepartmentField) els.docDepartmentField.classList.remove('hidden');
    if (els.officialDocDepartmentField) els.officialDocDepartmentField.classList.remove('hidden');
    if (els.docDepartmentSelect) {
      els.docDepartmentSelect.disabled = false;
      els.docDepartmentSelect.value = "";
    }
    if (els.officialDocDepartmentSelect) {
      els.officialDocDepartmentSelect.disabled = false;
      els.officialDocDepartmentSelect.value = "";
    }
    updateBranchOptionsForDepartment(els.docDepartmentSelect?.value || "", els.docBranchSelect);
    if (els.officialDocDepartmentSelect) {
      updateBranchOptionsForDepartment(els.officialDocDepartmentSelect?.value || "", els.officialDocBranchSelect);
    }
  } else {
    if (els.docDepartmentField) els.docDepartmentField.classList.add('hidden');
    if (els.officialDocDepartmentField) els.officialDocDepartmentField.classList.add('hidden');
    if (els.docDepartmentSelect) {
      els.docDepartmentSelect.disabled = true;
      els.docDepartmentSelect.value = state.currentUserDepartment || "";
    }
    if (els.officialDocDepartmentSelect) {
      els.officialDocDepartmentSelect.disabled = true;
      els.officialDocDepartmentSelect.value = state.currentUserDepartment || "";
    }
    updateBranchOptionsForDepartment(state.currentUserDepartment || "", els.docBranchSelect);
    updateBranchOptionsForDepartment(state.currentUserDepartment || "", els.officialDocBranchSelect);
  }
}

export function getFormDataForUpload(status) {
  const categorySelect = els.docCategorySelect;
  const docTitleInput = els.docTitleInput;
  const docDateInput = els.docDateInput;

  if (!categorySelect || !categorySelect.value) {
    showNotification("Please select a resource category.", "error");
    return null;
  }

  const category = categorySelect.value;
  let finalCategory = category === 'Official' ? 'Official Update' : 'University Paper';

  let selectedDate = docDateInput ? docDateInput.value : "";
  if (!selectedDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    selectedDate = `${year}-${month}-${day}`;
  }

  let customTitle = '';
  if (docTitleInput) customTitle = docTitleInput.value.trim();

  const formData = new FormData();
  formData.append('file', state.pendingUploadFile);
  formData.append('title', (customTitle && customTitle.length > 0) ? customTitle : state.pendingUploadFile.name);
  formData.append('category', finalCategory);
  formData.append('docDate', selectedDate);
  formData.append('status', status || 'pending_approval');

  if (isCollegeWideRole()) {
    const selectedDept = els.docDepartmentSelect ? els.docDepartmentSelect.value : '';
    formData.append('department', selectedDept);
  } else {
    formData.append('department', state.currentUserDepartment || '');
  }

  if (finalCategory === 'University Paper') {
    formData.append('year', els.docSessionSelect ? els.docSessionSelect.value : '2024-25');
    formData.append('semester', els.docSemSelect ? els.docSemSelect.value : '1');
    formData.append('branch', els.docBranchSelect ? els.docBranchSelect.value : 'CSE-R');
    formData.append('paperType', els.docTypeSelect ? els.docTypeSelect.value : 'End Sem');
  } else {
    formData.append('officialDocType', els.officialDocTypeSelect ? els.officialDocTypeSelect.value : 'Notice');
    formData.append('year', els.officialDocYearSelect ? els.officialDocYearSelect.value : 'All Years');
    formData.append('session', els.officialDocSessionSelect ? els.officialDocSessionSelect.value : '2024-25');
    formData.append('semester', els.officialDocSemSelect ? els.officialDocSemSelect.value : '1');
    formData.append('branch', els.officialDocBranchSelect ? els.officialDocBranchSelect.value : 'All Branches');
  }

  return formData;
}

export async function saveAsDraft() {
  if (!state.pendingUploadFile) {
    showNotification("No file selected.", "error");
    return;
  }
  const formData = getFormDataForUpload('draft');
  if (!formData) return;
  try {
    const { response, data } = await uploadDocumentApi(formData);
    if (response.ok) {
      showNotification("Document saved as draft successfully!", "success");
      if (els.docTitleInput) els.docTitleInput.value = '';
      if (els.uploadPopup) els.uploadPopup.classList.add('hidden');
      state.pendingUploadFile = null;
      if (els.universalDocumentInput) els.universalDocumentInput.value = "";
      fetchDrafts();
      if (state.currentSelectedCategory === 'drafts') fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
    } else {
      showNotification(data.message || "Failed to save draft.", "error");
    }
  } catch (err) {
    showNotification("Network error saving draft.", "error");
  }
}

export async function publishDocument() {
  if (!state.pendingUploadFile) {
    showNotification("No file selected.", "error");
    return;
  }
  const formData = getFormDataForUpload('pending_approval');
  if (!formData) return;
  try {
    const { response, data } = await uploadDocumentApi(formData);
    if (response.ok) {
      showNotification(data.message || "Document submitted for approval!", "success");
      if (els.docTitleInput) els.docTitleInput.value = '';
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
      if (els.uploadPopup) els.uploadPopup.classList.add('hidden');
      state.pendingUploadFile = null;
      if (els.universalDocumentInput) els.universalDocumentInput.value = "";
      fetchPendingApprovals();
    } else {
      showNotification(data.message || "Upload failed.", "error");
    }
  } catch (err) {
    showNotification("Network error uploading document.", "error");
  }
}

export function setupUploadButtons() {
  if (els.saveDraftBtn) {
    els.saveDraftBtn.removeEventListener('click', saveAsDraft);
    els.saveDraftBtn.addEventListener('click', saveAsDraft);
  }
  if (els.confirmUploadBtn) {
    els.confirmUploadBtn.removeEventListener('click', publishDocument);
    els.confirmUploadBtn.addEventListener('click', publishDocument);
  }
}