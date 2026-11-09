import { state } from '../state.js';
import { els } from '../utils/dom.js';
import { DEPARTMENTS } from '../constants.js';
import { isCollegeWideRole } from '../utils/helpers.js';
import { fetchDocuments } from '../documents/documentList.js';

export function renderDepartmentBranchFilters() {
  if (!els.departmentFilterContainer || !els.branchFilterContainer) return;
  if (state.isUserLoggedIn && isCollegeWideRole()) {
    els.departmentFilterContainer.classList.remove('hidden');
    els.branchFilterContainer.classList.remove('hidden');
    if (els.departmentFilterSelect) {
      els.departmentFilterSelect.innerHTML = `
        <option value="all">All Departments</option>
        <option value="CSE">CSE</option>
        <option value="ECE">ECE</option>
        <option value="EE">EE</option>
        <option value="ME">ME</option>
        <option value="CE">CE</option>
        <option value="CHE">CHE</option>
      `;
      els.departmentFilterSelect.value = state.currentSelectedDepartmentFilter;
    }
    updateBranchFilterOptions();
  } else if (state.isUserLoggedIn && state.currentUserDepartment === DEPARTMENTS.CSE) {
    els.departmentFilterContainer.classList.add('hidden');
    els.branchFilterContainer.classList.remove('hidden');
    if (els.branchFilterSelect) {
      els.branchFilterSelect.innerHTML = `
        <option value="all">All CSE Branches</option>
        <option value="CSE-R">CSE-R</option>
        <option value="CSE-A.I">CSE-A.I</option>
        <option value="CSE-SF">CSE-SF</option>
      `;
      els.branchFilterSelect.value = state.currentSelectedBranchFilter;
    }
  } else {
    els.departmentFilterContainer.classList.add('hidden');
    els.branchFilterContainer.classList.add('hidden');
  }
}

export function updateBranchFilterOptions() {
  if (!els.branchFilterSelect) return;
  const selectedDept = els.departmentFilterSelect ? els.departmentFilterSelect.value : 'all';
  if (selectedDept === 'CSE' || selectedDept === 'all') {
    els.branchFilterSelect.innerHTML = `
      <option value="all">All CSE Branches</option>
      <option value="CSE-R">CSE-R</option>
      <option value="CSE-A.I">CSE-A.I</option>
      <option value="CSE-SF">CSE-SF</option>
    `;
  } else {
    els.branchFilterSelect.innerHTML = `
      <option value="all">All Branches</option>
      <option value="${selectedDept}">${selectedDept}</option>
    `;
  }
}

export function setupDepartmentFilters() {
  if (els.departmentFilterSelect) {
    els.departmentFilterSelect.addEventListener('change', () => {
      state.currentSelectedDepartmentFilter = els.departmentFilterSelect.value;
      updateBranchFilterOptions();
      state.currentSelectedBranchFilter = 'all';
      if (els.branchFilterSelect) els.branchFilterSelect.value = 'all';
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
    });
  }
  if (els.branchFilterSelect) {
    els.branchFilterSelect.addEventListener('change', () => {
      state.currentSelectedBranchFilter = els.branchFilterSelect.value;
      fetchDocuments(els.searchInput ? els.searchInput.value.trim() : "");
    });
  }
}