export const els = {};

export function bindEls() {
  const ids = [
    'profileMenuBtn', 'authDropdown', 'authModal', 'closeModalBtn', 'authForm',
    'modalTitle', 'nameField', 'submitAuthBtn', 'searchInput', 'searchSuggestions',
    'updateProfileBtn', 'logoutBtn', 'mainUploadBtn', 'draftManagerBtn',
    'profileImageInput', 'universalDocumentInput', 'avatarContainer', 'workspaceName',
    'modalAvatarBlock', 'modalAvatarPreview', 'modalAvatarInput',
    'authorizedActionsBlock', 'resultsGrid', 'resultCount', 'notification-container',
    'confirmUploadBtn', 'uploadPopup', 'closeUploadPopupBtn', 'docCategorySelect',
    'universityFields', 'officialFields', 'studentFields', 'recommendedTab',
    'email', 'previewModal', 'closePreviewModalBtn', 'previewModalTitle',
    'previewContainer', 'editPopup', 'closeEditPopupBtn', 'confirmEditBtn',
    'editTitleInput', 'editDocCategorySelect', 'editUniversityFields',
    'editOfficialFields', 'editDocSessionSelect', 'editDocSemSelect',
    'editDocBranchSelect', 'editDocTypeSelect', 'editOfficialDocTypeSelect',
    'editDocDateInput', 'docSemSelect', 'docBranchSelect', 'allBranchesOpt',
    'docDepartmentSelect', 'docDepartmentField', 'officialDocDepartmentSelect',
    'officialDocDepartmentField', 'mainDashboardView', 'historyPageView',
    'draftsPageView', 'backFromDraftsBtn', 'refreshDraftsBtn', 'draftsContainer',
    'draftsCountText', 'viewFullHistoryBtn', 'backToHomeBtn', 'clearHistoryBtn',
    'recentActivityList', 'fullHistoryContainer', 'historyCountText',
    'navBrandHome', 'resultsMeta', 'adminActionWrapper', 'departmentFilterContainer',
    'branchFilterContainer', 'departmentFilterSelect', 'branchFilterSelect',
    'searchBtn', 'goSignInBtn', 'goSignUpBtn', 'username', 'password',
    'regYearSelect', 'regSemSelect', 'regBranchSelect', 'docTitleInput',
    'docSessionSelect', 'docTypeSelect', 'officialDocTypeSelect',
    'officialDocYearSelect', 'officialDocSessionSelect', 'officialDocSemSelect',
    'officialDocBranchSelect', 'docDateInput', 'saveDraftBtn',
    'editOfficialDocYearSelect', 'editOfficialDocSessionSelect',
    'editOfficialDocSemSelect', 'editOfficialDocBranchSelect'
  ];
  ids.forEach(id => { els[id] = document.getElementById(id); });
  els.filterTabs = document.querySelectorAll('.filter-tab');
}

export function setElementVisible(el, show, displayValue) {
  if (!el) return;
  if (show) {
    el.classList.remove('hidden');
    el.removeAttribute('hidden');
    el.removeAttribute('data-hidden');
    el.style.display = displayValue || '';
  } else {
    el.classList.add('hidden');
    el.setAttribute('hidden', '');
    el.setAttribute('data-hidden', 'true');
    el.style.display = 'none';
  }
}

export function setDefaultAvatar(container) {
  if (container) container.innerHTML = '<i class="fa-solid fa-user"></i>';
}

export function setAvatarImage(container, base64Str) {
  if (container) container.innerHTML = `<img src="${base64Str}" alt="Profile">`;
}