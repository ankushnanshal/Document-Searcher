const API_URL = "http://localhost:5000/api";

document.body.classList.add('role-student');

let currentMode = 'signin';
let activeUserEmail = null;
let currentUserRole = 'student';
let currentUserDepartment = null;
let currentUserBranch = null;
let currentUserPermissions = [];
let currentUserYear = null;
let currentUserSemester = null;
let tempSignupAvatarBase64 = "";
let pendingUploadFile = null;
let currentSelectedCategory = "all";
let currentSelectedDepartmentFilter = "all";
let currentSelectedBranchFilter = "all";
let cachedDocuments = [];
let authToken = localStorage.getItem('token') || null;
let isUserLoggedIn = false;
let isLoading = false;
let draftCount = 0;
let pendingDeleteData = null;

const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  DEAN: 'dean',
  HOD: 'hod',
  PROFESSOR: 'professor',
  ASSISTANT_PROFESSOR: 'assistant_professor',
  STUDENT: 'student'
};

const DEPARTMENTS = {
  CSE: 'CSE',
  ECE: 'ECE',
  EE: 'EE',
  ME: 'ME',
  CE: 'CE',
  CHE: 'CHE'
};

const CSE_BRANCHES = ['CSE-R', 'CSE-A.I', 'CSE-SF'];

const ALL_DEPARTMENTS = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'CHE'];

const FACULTY_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN, ROLES.HOD, ROLES.PROFESSOR, ROLES.ASSISTANT_PROFESSOR];
const COLLEGE_WIDE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];

const profileMenuBtn = document.getElementById('profileMenuBtn');
const authDropdown = document.getElementById('authDropdown');
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const authForm = document.getElementById('authForm');
const modalTitle = document.getElementById('modalTitle');
const nameField = document.getElementById('nameField');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const uploadDocBtn = document.getElementById('mainUploadBtn');
const draftManagerBtn = document.getElementById('draftManagerBtn');
const profileImageInput = document.getElementById('profileImageInput');
const universalDocumentInput = document.getElementById('universalDocumentInput');
const avatarContainer = document.getElementById('avatarContainer');
const workspaceName = document.getElementById('workspaceName');
const modalAvatarBlock = document.getElementById('modalAvatarBlock');
const modalAvatarPreview = document.getElementById('modalAvatarPreview');
const modalAvatarInput = document.getElementById('modalAvatarInput');
const authorizedActionsBlock = document.getElementById('authorizedActionsBlock');
const resultsGrid = document.getElementById('resultsGrid');
const resultCount = document.getElementById('resultCount');
const notificationContainer = document.getElementById('notification-container');
const confirmUploadBtn = document.getElementById('confirmUploadBtn');
const uploadPopup = document.getElementById('uploadPopup');
const closeUploadPopupBtn = document.getElementById('closeUploadPopupBtn');
const filterTabs = document.querySelectorAll('.filter-tab');
const docCategorySelect = document.getElementById('docCategorySelect');
const universityFields = document.getElementById('universityFields');
const officialFields = document.getElementById('officialFields');
const studentFields = document.getElementById('studentFields');
const recommendedTab = document.getElementById('recommendedTab');
const emailInput = document.getElementById('email');
const previewModal = document.getElementById('previewModal');
const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
const previewModalTitle = document.getElementById('previewModalTitle');
const previewContainer = document.getElementById('previewContainer');
const editPopup = document.getElementById('editPopup');
const closeEditPopupBtn = document.getElementById('closeEditPopupBtn');
const confirmEditBtn = document.getElementById('confirmEditBtn');
const editTitleInput = document.getElementById('editTitleInput');
const editDocCategorySelect = document.getElementById('editDocCategorySelect');
const editUniversityFields = document.getElementById('editUniversityFields');
const editOfficialFields = document.getElementById('editOfficialFields');
const editDocSessionSelect = document.getElementById('editDocSessionSelect');
const editDocSemSelect = document.getElementById('editDocSemSelect');
const editDocBranchSelect = document.getElementById('editDocBranchSelect');
const editDocTypeSelect = document.getElementById('editDocTypeSelect');
const editOfficialDocTypeSelect = document.getElementById('editOfficialDocTypeSelect');
const editDocDateInput = document.getElementById('editDocDateInput');
let editingDocId = null;
const docSemSelect = document.getElementById('docSemSelect');
const docBranchSelect = document.getElementById('docBranchSelect');
const allBranchesOpt = document.getElementById('allBranchesOpt');
const docDepartmentSelect = document.getElementById('docDepartmentSelect');
const docDepartmentField = document.getElementById('docDepartmentField');
const officialDocDepartmentSelect = document.getElementById('officialDocDepartmentSelect');
const officialDocDepartmentField = document.getElementById('officialDocDepartmentField');
const mainDashboardView = document.getElementById('mainDashboardView');
const historyPageView = document.getElementById('historyPageView');
const draftsPageView = document.getElementById('draftsPageView');
const backFromDraftsBtn = document.getElementById('backFromDraftsBtn');
const refreshDraftsBtn = document.getElementById('refreshDraftsBtn');
const draftsContainer = document.getElementById('draftsContainer');
const draftsCountText = document.getElementById('draftsCountText');
const viewFullHistoryBtn = document.getElementById('viewFullHistoryBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const recentActivityList = document.getElementById('recentActivityList');
const fullHistoryContainer = document.getElementById('fullHistoryContainer');
const historyCountText = document.getElementById('historyCountText');
const navBrandHome = document.getElementById('navBrandHome');
const academicActionBtn = document.getElementById('academicActionBtn');
const academicModal = document.getElementById('academicModal');
const closeAcademicModalBtn = document.getElementById('closeAcademicModalBtn');
const submitAcademicDetailsBtn = document.getElementById('submitAcademicDetailsBtn');
const resultsMeta = document.getElementById('resultsMeta');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const closeDeleteConfirmBtn = document.getElementById('closeDeleteConfirmBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const adminActionWrapper = document.getElementById('adminActionWrapper');
const departmentFilterContainer = document.getElementById('departmentFilterContainer');
const branchFilterContainer = document.getElementById('branchFilterContainer');
const departmentFilterSelect = document.getElementById('departmentFilterSelect');
const branchFilterSelect = document.getElementById('branchFilterSelect');

function isFacultyRole(role) {
  return FACULTY_ROLES.includes(String(role || '').toLowerCase());
}

function isStudentRole(role) {
  return String(role || ROLES.STUDENT).toLowerCase() === ROLES.STUDENT;
}

function isCollegeWideRole() {
  return COLLEGE_WIDE_ROLES.includes(currentUserRole);
}

function isCseDepartment() {
  return currentUserDepartment === DEPARTMENTS.CSE;
}

function hasStaffAccess() {
  return isUserLoggedIn && isFacultyRole(currentUserRole);
}

function showNotification(message) {
  if (!notificationContainer) { alert(message); return; }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  notificationContainer.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

function setDefaultAvatar(container) {
  if (container) container.innerHTML = '<i class="fa-solid fa-user"></i>';
}

function setAvatarImage(container, base64Str) {
  if (container) container.innerHTML = `<img src="${base64Str}" alt="Profile">`;
}

function isFaculty() {
  return FACULTY_ROLES.includes(currentUserRole);
}

function isStudent() {
  return currentUserRole === ROLES.STUDENT;
}

function canManageDocuments() {
  return hasStaffAccess();
}

function canApproveDocuments() {
  return hasStaffAccess() && currentUserPermissions.includes('approve_document');
}

function canManageDrafts() {
  return hasStaffAccess();
}

function canManageUsers() {
  return currentUserRole === ROLES.ADMIN;
}

function canUploadDocuments() {
  return hasStaffAccess();
}

function canEditDocuments() {
  return hasStaffAccess();
}

function canDeleteDocuments() {
  return hasStaffAccess();
}

function userCanAccessResource(doc) {
  if (isCollegeWideRole()) return true;
  if (!currentUserDepartment) return false;
  if (!doc.department) return true;
  return doc.department === currentUserDepartment;
}

function userCanAccessBranch(docBranch, docDepartment) {
  if (isCollegeWideRole()) return true;
  if (!docBranch || docBranch === "All Branches" || docBranch === "") return true;
  if (!currentUserDepartment) return false;
  const normalizedDept = docDepartment || getDepartmentFromBranch(docBranch);
  if (normalizedDept === currentUserDepartment) return true;
  if (currentUserDepartment === DEPARTMENTS.CSE && CSE_BRANCHES.includes(docBranch)) return true;
  return false;
}

function getDepartmentFromBranch(branch) {
  if (!branch) return null;
  if (CSE_BRANCHES.includes(branch)) return DEPARTMENTS.CSE;
  if (ALL_DEPARTMENTS.includes(branch)) return branch;
  return null;
}

function showDeleteConfirmModal(subject, index) {
  pendingDeleteData = { subject, index };
  deleteConfirmModal.classList.remove('hidden');
  const card = deleteConfirmModal.querySelector('.delete-confirm-card');
  if (card) {
    card.style.animation = 'none';
    requestAnimationFrame(() => {
      card.style.animation = 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });
  }
}

function closeDeleteConfirmModal() {
  deleteConfirmModal.classList.add('hidden');
  pendingDeleteData = null;
}

if (deleteConfirmModal) {
  deleteConfirmModal.addEventListener('click', function(e) {
    if (e.target === this) closeDeleteConfirmModal();
  });
  if (closeDeleteConfirmBtn) closeDeleteConfirmBtn.addEventListener('click', closeDeleteConfirmModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', function() {
      if (pendingDeleteData) {
        deleteAnnouncement(pendingDeleteData.subject, pendingDeleteData.index);
        closeDeleteConfirmModal();
      }
    });
  }
}

if (emailInput && studentFields) {
  const toggleStudentFields = () => {
    const email = emailInput.value.trim().toLowerCase();
    const isAdminEmail = email === 'ankushadmin@gmail.com';
    if (currentMode === 'signup' && !isAdminEmail && email !== '') {
      studentFields.classList.remove('hidden');
    } else {
      studentFields.classList.add('hidden');
    }
  };
  emailInput.addEventListener('input', toggleStudentFields);
}

function handleSemesterBranchLogic() {
  if (!docSemSelect || !docBranchSelect || !allBranchesOpt) return;
  const selectedSem = parseInt(docSemSelect.value);
  if (selectedSem === 1 || selectedSem === 2) {
    allBranchesOpt.style.display = 'block';
    docBranchSelect.value = "All Branches";
  } else {
    allBranchesOpt.style.display = 'none';
    if (docBranchSelect.value === "All Branches") {
      if (isCseDepartment()) {
        docBranchSelect.value = "CSE-R";
      } else {
        docBranchSelect.value = currentUserDepartment || "CSE-R";
      }
    }
  }
}

if (docSemSelect) docSemSelect.addEventListener('change', handleSemesterBranchLogic);

if (docCategorySelect && universityFields && officialFields) {
  docCategorySelect.addEventListener('change', () => {
    if (docCategorySelect.value === 'University') {
      universityFields.style.display = 'block';
      officialFields.style.display = 'none';
      if (docSemSelect) docSemSelect.value = "1";
      handleSemesterBranchLogic();
    } else if (docCategorySelect.value === 'Official') {
      universityFields.style.display = 'none';
      officialFields.style.display = 'block';
    } else {
      universityFields.style.display = 'none';
      officialFields.style.display = 'none';
    }
    setupDepartmentBranchSelectors();
  });
}

if (profileMenuBtn && authDropdown) {
  profileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    authDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => authDropdown.classList.add('hidden'));
  authDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const goSignInBtn = document.getElementById('goSignInBtn');
if (goSignInBtn) {
  goSignInBtn.addEventListener('click', () => {
    currentMode = 'signin';
    if (modalTitle) modalTitle.textContent = 'Account Login';
    if (nameField) nameField.classList.add('hidden');
    if (modalAvatarBlock) modalAvatarBlock.classList.add('hidden');
    if (studentFields) studentFields.classList.add('hidden');
    const usernameInput = document.getElementById('username');
    if (usernameInput) usernameInput.removeAttribute('required');
    if (submitAuthBtn) submitAuthBtn.textContent = 'Sign In';
    if (authModal) authModal.classList.remove('hidden');
  });
}

const goSignUpBtn = document.getElementById('goSignUpBtn');
if (goSignUpBtn) {
  goSignUpBtn.addEventListener('click', () => {
    currentMode = 'signup';
    if (modalTitle) modalTitle.textContent = 'Create Account';
    if (nameField) nameField.classList.remove('hidden');
    if (modalAvatarBlock) modalAvatarBlock.classList.remove('hidden');
    const usernameInput = document.getElementById('username');
    if (usernameInput) usernameInput.setAttribute('required', 'required');
    if (submitAuthBtn) submitAuthBtn.textContent = 'Register';
    if (authModal) authModal.classList.remove('hidden');
    if (emailInput) {
      const email = emailInput.value.trim().toLowerCase();
      if (email !== '' && email !== 'ankushadmin@gmail.com') studentFields.classList.remove('hidden');
    }
  });
}

if (modalAvatarPreview && modalAvatarInput) {
  modalAvatarPreview.addEventListener('click', () => modalAvatarInput.click());
  modalAvatarInput.addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      tempSignupAvatarBase64 = event.target.result;
      setAvatarImage(modalAvatarPreview, tempSignupAvatarBase64);
    };
    reader.readAsDataURL(e.target.files[0]);
  });
}

if (updateProfileBtn && profileImageInput) {
  updateProfileBtn.addEventListener('click', () => profileImageInput.click());
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    activeUserEmail = null;
    currentUserRole = 'student';
    currentUserDepartment = null;
    currentUserBranch = null;
    currentUserPermissions = [];
    currentUserYear = null;
    currentUserSemester = null;
    cachedDocuments = [];
    authToken = null;
    isUserLoggedIn = false;
    localStorage.removeItem('token');
    if (workspaceName) workspaceName.textContent = 'My Workspace';
    if (authorizedActionsBlock) authorizedActionsBlock.classList.add('hidden');
    document.body.classList.add('role-student');
    if (adminActionWrapper) {
      adminActionWrapper.classList.add('hidden');
      adminActionWrapper.setAttribute('data-hidden', 'true');
      adminActionWrapper.style.display = 'none';
    }
    if (uploadDocBtn) {
      uploadDocBtn.classList.add('hidden');
      uploadDocBtn.setAttribute('hidden', '');
      uploadDocBtn.style.display = 'none';
    }
    if (draftManagerBtn) {
      draftManagerBtn.classList.add('hidden');
      draftManagerBtn.setAttribute('hidden', '');
      draftManagerBtn.style.display = 'none';
    }
    if (recommendedTab) recommendedTab.classList.add('hidden');
    if (searchSuggestions) searchSuggestions.classList.add('hidden');
    if (departmentFilterContainer) departmentFilterContainer.classList.add('hidden');
    if (branchFilterContainer) branchFilterContainer.classList.add('hidden');
    setDefaultAvatar(avatarContainer);
    const goSignInBtnReal = document.getElementById('goSignInBtn');
    const goSignUpBtnReal = document.getElementById('goSignUpBtn');
    if (goSignInBtnReal) goSignInBtnReal.classList.remove('hidden');
    if (goSignUpBtnReal) goSignUpBtnReal.classList.remove('hidden');
    filterTabs.forEach(t => t.classList.remove('active'));
    if (filterTabs[0]) filterTabs[0].classList.add('active');
    currentSelectedCategory = "all";
    currentSelectedDepartmentFilter = "all";
    currentSelectedBranchFilter = "all";
    if (mainDashboardView) mainDashboardView.classList.remove('hidden');
    if (historyPageView) historyPageView.classList.add('hidden');
    if (draftsPageView) draftsPageView.classList.add('hidden');
    if (academicActionBtn) academicActionBtn.classList.add('hidden');
    if (resultsMeta) resultsMeta.classList.remove('hidden');
    const academicCards = resultsGrid.querySelectorAll('.classroom-card');
    academicCards.forEach(card => card.remove());
    fetchDocuments();
    renderActionButtons();
    renderDepartmentBranchFilters();
  });
}

function setupDepartmentBranchSelectors() {
  if (!docDepartmentSelect || !docBranchSelect) return;
  if (isCollegeWideRole()) {
    if (docDepartmentField) docDepartmentField.classList.remove('hidden');
    if (officialDocDepartmentField) officialDocDepartmentField.classList.remove('hidden');
    if (docDepartmentSelect) {
      docDepartmentSelect.disabled = false;
      docDepartmentSelect.value = "";
    }
    if (officialDocDepartmentSelect) {
      officialDocDepartmentSelect.disabled = false;
      officialDocDepartmentSelect.value = "";
    }
    updateBranchOptionsForDepartment(docDepartmentSelect?.value || "", docBranchSelect);
    if (officialDocDepartmentSelect) {
      updateBranchOptionsForDepartment(officialDocDepartmentSelect?.value || "", document.getElementById('officialDocBranchSelect'));
    }
  } else {
    if (docDepartmentField) docDepartmentField.classList.add('hidden');
    if (officialDocDepartmentField) officialDocDepartmentField.classList.add('hidden');
    if (docDepartmentSelect) {
      docDepartmentSelect.disabled = true;
      docDepartmentSelect.value = currentUserDepartment || "";
    }
    if (officialDocDepartmentSelect) {
      officialDocDepartmentSelect.disabled = true;
      officialDocDepartmentSelect.value = currentUserDepartment || "";
    }
    updateBranchOptionsForDepartment(currentUserDepartment || "", docBranchSelect);
    updateBranchOptionsForDepartment(currentUserDepartment || "", document.getElementById('officialDocBranchSelect'));
  }
}

function updateBranchOptionsForDepartment(department, branchSelect) {
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

if (docDepartmentSelect) {
  docDepartmentSelect.addEventListener('change', () => {
    updateBranchOptionsForDepartment(docDepartmentSelect.value, docBranchSelect);
  });
}

if (officialDocDepartmentSelect) {
  officialDocDepartmentSelect.addEventListener('change', () => {
    updateBranchOptionsForDepartment(officialDocDepartmentSelect.value, document.getElementById('officialDocBranchSelect'));
  });
}

if (uploadDocBtn && universalDocumentInput) {
  uploadDocBtn.addEventListener('click', () => {
    if (!canUploadDocuments()) {
      showNotification("Access denied. Only authorized faculty and leadership roles can upload documents.");
      return;
    }
    if (docCategorySelect) docCategorySelect.value = "";
    if (universityFields) universityFields.style.display = 'none';
    if (officialFields) officialFields.style.display = 'none';
    const docSessionSelect = document.getElementById('docSessionSelect');
    if (docSessionSelect) docSessionSelect.value = "";
    const docDateInput = document.getElementById('docDateInput');
    if (docDateInput) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      docDateInput.value = `${year}-${month}-${day}`;
    }
    const docTitleInput = document.getElementById('docTitleInput');
    if (docTitleInput) docTitleInput.value = '';
    setupDepartmentBranchSelectors();
    universalDocumentInput.click();
  });
}

if (draftManagerBtn) {
  draftManagerBtn.addEventListener('click', () => {
    if (!canManageDrafts()) {
      showNotification("Access denied. Only authorized faculty and leadership roles can manage drafts.");
      return;
    }
    if (draftsPageView) {
      mainDashboardView.classList.add('hidden');
      historyPageView.classList.add('hidden');
      draftsPageView.classList.remove('hidden');
      fetchDrafts();
    }
  });
}

if (backFromDraftsBtn) {
  backFromDraftsBtn.addEventListener('click', () => {
    if (draftsPageView) draftsPageView.classList.add('hidden');
    if (mainDashboardView) mainDashboardView.classList.remove('hidden');
  });
}

if (refreshDraftsBtn) {
  refreshDraftsBtn.addEventListener('click', () => {
    fetchDrafts();
    showNotification("Drafts refreshed.");
  });
}

if (profileImageInput) {
  profileImageInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const response = await fetch(`${API_URL}/auth/update-avatar`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({ avatar: event.target.result })
        });
        const data = await response.json();
        if (response.ok) {
          setAvatarImage(avatarContainer, data.avatar);
          showNotification(data.message);
        } else {
          showNotification(data.message);
        }
      } catch (err) {
        showNotification("Network error processing avatar update.");
      }
    };
    reader.readAsDataURL(e.target.files[0]);
  });
}

if (universalDocumentInput) {
  universalDocumentInput.addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    pendingUploadFile = e.target.files[0];
    const docTitleInput = document.getElementById('docTitleInput');
    if (docTitleInput) {
      const nameWithoutExt = pendingUploadFile.name.replace(/\.[^.]+$/, '');
      docTitleInput.value = nameWithoutExt;
    }
    setupDepartmentBranchSelectors();
    if (uploadPopup) uploadPopup.classList.remove('hidden');
  });
}

if (closeUploadPopupBtn) {
  closeUploadPopupBtn.addEventListener('click', () => {
    if (uploadPopup) uploadPopup.classList.add('hidden');
    pendingUploadFile = null;
    if (universalDocumentInput) universalDocumentInput.value = "";
    const docTitleInput = document.getElementById('docTitleInput');
    if (docTitleInput) docTitleInput.value = '';
  });
}

function getFormDataForUpload(status) {
  const categorySelect = document.getElementById('docCategorySelect');
  const docTitleInput = document.getElementById('docTitleInput');
  const docDateInput = document.getElementById('docDateInput');
  const docSessionSelect = document.getElementById('docSessionSelect');
  const docTypeSelect = document.getElementById('docTypeSelect');
  const officialDocTypeSelect = document.getElementById('officialDocTypeSelect');
  const officialDocYearSelect = document.getElementById('officialDocYearSelect');
  const officialDocSessionSelect = document.getElementById('officialDocSessionSelect');
  const officialDocSemSelect = document.getElementById('officialDocSemSelect');

  if (!categorySelect || !categorySelect.value) {
    showNotification("Please select a resource category.");
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
  if (docTitleInput) {
    customTitle = docTitleInput.value.trim();
  }

  const formData = new FormData();
  formData.append('file', pendingUploadFile);

  if (customTitle && customTitle.length > 0) {
    formData.append('title', customTitle);
  } else {
    formData.append('title', pendingUploadFile.name);
  }

  formData.append('category', finalCategory);
  formData.append('docDate', selectedDate);
  formData.append('status', status || 'published');

  if (isCollegeWideRole()) {
    const selectedDept = docDepartmentSelect ? docDepartmentSelect.value : '';
    formData.append('department', selectedDept);
  } else {
    formData.append('department', currentUserDepartment || '');
  }

  if (finalCategory === 'University Paper') {
    formData.append('year', docSessionSelect ? docSessionSelect.value : '2024-25');
    formData.append('semester', docSemSelect ? docSemSelect.value : '1');
    formData.append('branch', docBranchSelect ? docBranchSelect.value : 'CSE-R');
    formData.append('paperType', docTypeSelect ? docTypeSelect.value : 'End Sem');
  } else {
    formData.append('officialDocType', officialDocTypeSelect ? officialDocTypeSelect.value : 'Notice');
    formData.append('year', officialDocYearSelect ? officialDocYearSelect.value : 'All Years');
    formData.append('session', officialDocSessionSelect ? officialDocSessionSelect.value : '2024-25');
    formData.append('semester', officialDocSemSelect ? officialDocSemSelect.value : '1');
    const officialBranchSelect = document.getElementById('officialDocBranchSelect');
    formData.append('branch', officialBranchSelect ? officialBranchSelect.value : 'All Branches');
  }

  return formData;
}

async function saveAsDraft() {
  if (!pendingUploadFile) {
    showNotification("No file selected.");
    return;
  }

  const formData = getFormDataForUpload('draft');
  if (!formData) return;

  try {
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showNotification("Document saved as draft successfully!");
      const docTitleInput = document.getElementById('docTitleInput');
      if (docTitleInput) {
        docTitleInput.value = '';
      }
      if (uploadPopup) {
        uploadPopup.classList.add('hidden');
      }
      pendingUploadFile = null;
      if (universalDocumentInput) {
        universalDocumentInput.value = "";
      }
      fetchDrafts();
      if (currentSelectedCategory === 'drafts') {
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
      }
    } else {
      showNotification(data.message || "Failed to save draft.");
    }
  } catch (err) {
    console.error("Draft save error:", err);
    showNotification("Network error saving draft.");
  }
}

async function publishDocument() {
  if (!pendingUploadFile) {
    showNotification("No file selected.");
    return;
  }

  const formData = getFormDataForUpload('published');
  if (!formData) return;

  try {
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(data.message || "Document uploaded successfully!");
      const docTitleInput = document.getElementById('docTitleInput');
      if (docTitleInput) {
        docTitleInput.value = '';
      }
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
      if (uploadPopup) {
        uploadPopup.classList.add('hidden');
      }
      pendingUploadFile = null;
      if (universalDocumentInput) {
        universalDocumentInput.value = "";
      }
      fetchDrafts();
    } else {
      showNotification(data.message || "Upload failed.");
    }
  } catch (err) {
    console.error("Upload error:", err);
    showNotification("Network error uploading document.");
  }
}

function setupUploadButtons() {
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const confirmUploadBtnReal = document.getElementById('confirmUploadBtn');

  if (saveDraftBtn) {
    saveDraftBtn.removeEventListener('click', saveAsDraft);
    saveDraftBtn.addEventListener('click', saveAsDraft);
  }

  if (confirmUploadBtnReal) {
    confirmUploadBtnReal.removeEventListener('click', publishDocument);
    confirmUploadBtnReal.addEventListener('click', publishDocument);
  }
}

async function fetchDrafts() {
  if (!authToken || !canManageDrafts()) {
    if (draftsContainer) {
      draftsContainer.innerHTML = '<span class="history-empty-state">No permission to view drafts.</span>';
    }
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/drafts`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    if (response.ok) {
      const drafts = await response.json();
      draftCount = drafts ? drafts.length : 0;
      renderDrafts(drafts);
      renderDraftList(drafts);
      updateDraftTabCount(drafts.length);
    } else {
      console.error("Failed to fetch drafts:", response.status);
    }
  } catch (err) {
    console.error("Error fetching drafts:", err);
    if (draftsContainer) {
      draftsContainer.innerHTML = '<span class="history-empty-state">Error loading drafts. Please try again.</span>';
    }
  }
}

function updateDraftTabCount(count) {
  const draftTab = document.querySelector('.filter-tab[data-category="drafts"]');
  if (!draftTab) return;
  draftCount = count;
  if (count > 0 && canManageDrafts()) {
    draftTab.classList.remove('hidden');
    draftTab.innerHTML = `<i class="fa-solid fa-file-pen"></i> Drafts (${count})`;
  } else {
    draftTab.classList.add('hidden');
    draftTab.innerHTML = `<i class="fa-solid fa-file-pen"></i> Drafts (0)`;
  }
}

function renderDrafts(drafts) {
  updateDraftTabCount(drafts ? drafts.length : 0);
}

function renderDraftList(drafts) {
  if (!draftsContainer) return;
  draftsContainer.innerHTML = '';
  if (!drafts || drafts.length === 0) {
    draftsContainer.innerHTML = '<span class="history-empty-state">No drafts found. Create a draft by uploading a file and selecting "Save as Draft".</span>';
    if (draftsCountText) draftsCountText.textContent = '0 drafts';
    return;
  }
  if (draftsCountText) draftsCountText.textContent = `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`;
  drafts.forEach((draft) => {
    const card = document.createElement('div');
    card.className = 'draft-item-card';
    const fileType = draft.fileType || draft.storageName ? draft.storageName.split('.').pop().toUpperCase() : 'Unknown';
    const createdAt = draft.draftCreatedAt ? new Date(draft.draftCreatedAt).toLocaleDateString() : new Date(draft.createdAt).toLocaleDateString();
    const deptInfo = draft.department ? ` • ${draft.department}` : '';
    const branchInfo = draft.branch && draft.branch !== draft.department ? ` • ${draft.branch}` : '';
    card.innerHTML = `
      <div class="draft-info">
        <h4>${draft.title}</h4>
        <p>${draft.category || 'Uncategorized'}${deptInfo}${branchInfo} • ${fileType} • Uploaded: ${createdAt}</p>
        <span class="draft-status-badge">Draft</span>
      </div>
      <div class="draft-actions">
        <button class="draft-action-btn draft-action-open" data-id="${draft._id}"><i class="fa-solid fa-pen"></i> Open</button>
        <button class="draft-action-btn draft-action-publish" data-id="${draft._id}"><i class="fa-solid fa-check"></i> Publish</button>
        <button class="draft-action-btn draft-action-delete" data-id="${draft._id}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    `;
    draftsContainer.appendChild(card);

    card.querySelector('.draft-action-open').addEventListener('click', () => openEditDocumentModal(draft));
    card.querySelector('.draft-action-publish').addEventListener('click', () => publishDraft(draft._id));
    card.querySelector('.draft-action-delete').addEventListener('click', () => deleteDraft(draft._id));
  });
}

function addDraftTab() {
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
    filterTabs.forEach(t => t.classList.remove('active'));
    draftTab.classList.add('active');
    currentSelectedCategory = 'drafts';
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    if (searchSuggestions) searchSuggestions.classList.add('hidden');
  });
}

function openEditDocumentModal(doc) {
  if (!canEditDocuments()) {
    showNotification("Access denied. Only authorized faculty and leadership roles can edit documents.");
    return;
  }
  if (!userCanAccessResource(doc)) {
    showNotification("Access denied. You don't have permission to edit this document.");
    return;
  }
  editingDocId = doc._id;
  if (editTitleInput) editTitleInput.value = doc.title || '';
  if (editDocDateInput) editDocDateInput.value = doc.docDate || '';
  const isUniversity = doc.category === 'University Paper';
  if (editDocCategorySelect) editDocCategorySelect.value = isUniversity ? 'University' : 'Official';
  if (editUniversityFields) editUniversityFields.style.display = isUniversity ? 'block' : 'none';
  if (editOfficialFields) editOfficialFields.style.display = isUniversity ? 'none' : 'block';
  if (isUniversity) {
    if (editDocSessionSelect) editDocSessionSelect.value = doc.year || '2024-25';
    if (editDocSemSelect) editDocSemSelect.value = doc.semester || '1';
    if (editDocBranchSelect) editDocBranchSelect.value = doc.branch || 'CSE-R';
    if (editDocTypeSelect) editDocTypeSelect.value = doc.paperType || 'End Sem';
  } else {
    if (editOfficialDocTypeSelect) editOfficialDocTypeSelect.value = doc.officialDocType || 'Notice';
    const yearSelect = document.getElementById('editOfficialDocYearSelect');
    if (yearSelect) yearSelect.value = doc.year || 'All Years';
    const sessionSelect = document.getElementById('editOfficialDocSessionSelect');
    if (sessionSelect) sessionSelect.value = doc.session || '2024-25';
    const semSelect = document.getElementById('editOfficialDocSemSelect');
    if (semSelect) semSelect.value = doc.semester || '1';
    const branchSelect = document.getElementById('editOfficialDocBranchSelect');
    if (branchSelect) branchSelect.value = doc.branch || 'All Branches';
  }
  if (editPopup) editPopup.classList.remove('hidden');
}

if (closeEditPopupBtn) {
  closeEditPopupBtn.addEventListener('click', () => {
    if (editPopup) editPopup.classList.add('hidden');
    editingDocId = null;
  });
}

if (editDocCategorySelect && editUniversityFields && editOfficialFields) {
  editDocCategorySelect.addEventListener('change', () => {
    if (editDocCategorySelect.value === 'University') {
      editUniversityFields.style.display = 'block';
      editOfficialFields.style.display = 'none';
    } else {
      editUniversityFields.style.display = 'none';
      editOfficialFields.style.display = 'block';
    }
  });
}

if (confirmEditBtn) {
  confirmEditBtn.addEventListener('click', async () => {
    if (!editingDocId) return;
    if (!canEditDocuments()) {
      showNotification("Access denied. Only authorized faculty and leadership roles can edit documents.");
      return;
    }
    const category = editDocCategorySelect ? editDocCategorySelect.value : 'University';
    const finalCategory = category === 'Official' ? 'Official Update' : 'University Paper';
    const payload = {
      title: editTitleInput ? editTitleInput.value.trim() : '',
      category: finalCategory,
      docDate: editDocDateInput ? editDocDateInput.value : ''
    };
    if (finalCategory === 'University Paper') {
      payload.year = editDocSessionSelect ? editDocSessionSelect.value : '2024-25';
      payload.semester = editDocSemSelect ? editDocSemSelect.value : '1';
      payload.branch = editDocBranchSelect ? editDocBranchSelect.value : 'CSE-R';
      payload.paperType = editDocTypeSelect ? editDocTypeSelect.value : 'End Sem';
      payload.officialDocType = '';
      payload.session = '';
    } else {
      payload.officialDocType = editOfficialDocTypeSelect ? editOfficialDocTypeSelect.value : 'Notice';
      const yearSelect = document.getElementById('editOfficialDocYearSelect');
      if (yearSelect) payload.year = yearSelect.value || 'All Years';
      const sessionSelect = document.getElementById('editOfficialDocSessionSelect');
      if (sessionSelect) payload.session = sessionSelect.value || '2024-25';
      const semSelect = document.getElementById('editOfficialDocSemSelect');
      if (semSelect) payload.semester = semSelect.value || '1';
      const branchSelect = document.getElementById('editOfficialDocBranchSelect');
      if (branchSelect) payload.branch = branchSelect.value || 'All Branches';
      payload.paperType = '';
    }
    if (!payload.title) { showNotification("Title cannot be empty."); return; }
    const url = `${API_URL}/documents/${editingDocId}`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        showNotification("Document updated successfully!");
        if (editPopup) editPopup.classList.add('hidden');
        editingDocId = null;
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
        fetchDrafts();
      } else {
        showNotification(data.message || "Update failed.");
      }
    } catch (err) {
      showNotification("Network error updating document.");
    }
  });
}

if (closeModalBtn && authModal) {
  closeModalBtn.addEventListener('click', () => authModal.classList.add('hidden'));
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const usernameEl = document.getElementById('username');
    const regYearEl = document.getElementById('regYearSelect');
    const regSemEl = document.getElementById('regSemSelect');
    const regBranchEl = document.getElementById('regBranchSelect');
    if (!emailEl || !passwordEl) return;
    const email = emailEl.value.trim().toLowerCase();
    const password = passwordEl.value;
    let payload = { email, password };
    if (currentMode === 'signup') {
      payload.name = usernameEl ? usernameEl.value : '';
      payload.avatar = tempSignupAvatarBase64;
      const isAdminEmail = email === 'ankushadmin@gmail.com';
      if (!isAdminEmail) {
        payload.year = regYearEl ? regYearEl.value : '';
        payload.semester = regSemEl ? regSemEl.value : '';
        payload.branch = regBranchEl ? regBranchEl.value : '';
      }
    }
    try {
      const response = await fetch(`${API_URL}/auth/${currentMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        if (data.token) {
          authToken = data.token;
          localStorage.setItem('token', data.token);
        }
        handleUserSession(data);
        if (authModal) authModal.classList.add('hidden');
        authForm.reset();
      } else {
        showNotification(data.message || "Authentication failed.");
      }
    } catch (err) {
      showNotification("Connection error. Is the backend server running?");
    }
  });
}

function handleUserSession(user) {
  if (!user) return;
  isUserLoggedIn = true;
  activeUserEmail = user.email;
  currentUserRole = String(user.role || ROLES.STUDENT).toLowerCase();
  currentUserDepartment = user.department;
  currentUserBranch = user.branch;
  currentUserPermissions = user.permissions || [];
  currentUserYear = user.year;
  currentUserSemester = user.semester;

  if (workspaceName) {
    let displayName = user.name;
    if (currentUserDepartment) {
      displayName += ` (${currentUserDepartment}`;
      if (currentUserBranch && currentUserBranch !== currentUserDepartment) {
        displayName += ` - ${currentUserBranch}`;
      }
      displayName += ')';
    }
    workspaceName.textContent = displayName;
  }

  if (authorizedActionsBlock) authorizedActionsBlock.classList.remove('hidden');

  const signInBtn = document.getElementById('goSignInBtn');
  const signUpBtn = document.getElementById('goSignUpBtn');
  if (signInBtn) signInBtn.classList.add('hidden');
  if (signUpBtn) signUpBtn.classList.add('hidden');

  const studentUser = isStudentRole(currentUserRole);

  renderActionButtons();
  renderDepartmentBranchFilters();

  if (hasStaffAccess()) {
    addDraftTab();
    setupUploadButtons();
    fetchDrafts();
  }

  const isAdminEmail = activeUserEmail === 'ankushadmin@gmail.com';
  if (academicActionBtn) {
    if (isAdminEmail && currentSelectedCategory === "Academic Resource") academicActionBtn.classList.remove('hidden');
    else academicActionBtn.classList.add('hidden');
  }

  if (recommendedTab) {
    if (studentUser && currentUserBranch) {
      recommendedTab.classList.remove('hidden');
      filterTabs.forEach(t => t.classList.remove('active'));
      recommendedTab.classList.add('active');
      currentSelectedCategory = "recommended";
    } else {
      recommendedTab.classList.add('hidden');
      filterTabs.forEach(t => t.classList.remove('active'));
      if (filterTabs[0]) filterTabs[0].classList.add('active');
      currentSelectedCategory = "all";
    }
  }

  if (user.avatar) setAvatarImage(avatarContainer, user.avatar);

  fetchDocuments();
  fetchHistory();
}

function renderDepartmentBranchFilters() {
  if (!departmentFilterContainer || !branchFilterContainer) return;
  if (isUserLoggedIn && isCollegeWideRole()) {
    departmentFilterContainer.classList.remove('hidden');
    branchFilterContainer.classList.remove('hidden');
    if (departmentFilterSelect) {
      departmentFilterSelect.innerHTML = `
        <option value="all">All Departments</option>
        <option value="CSE">CSE</option>
        <option value="ECE">ECE</option>
        <option value="EE">EE</option>
        <option value="ME">ME</option>
        <option value="CE">CE</option>
        <option value="CHE">CHE</option>
      `;
      departmentFilterSelect.value = currentSelectedDepartmentFilter;
    }
    updateBranchFilterOptions();
  } else if (isUserLoggedIn && currentUserDepartment === DEPARTMENTS.CSE) {
    departmentFilterContainer.classList.add('hidden');
    branchFilterContainer.classList.remove('hidden');
    if (branchFilterSelect) {
      branchFilterSelect.innerHTML = `
        <option value="all">All CSE Branches</option>
        <option value="CSE-R">CSE-R</option>
        <option value="CSE-A.I">CSE-A.I</option>
        <option value="CSE-SF">CSE-SF</option>
      `;
      branchFilterSelect.value = currentSelectedBranchFilter;
    }
  } else {
    departmentFilterContainer.classList.add('hidden');
    branchFilterContainer.classList.add('hidden');
  }
}

function updateBranchFilterOptions() {
  if (!branchFilterSelect) return;
  const selectedDept = departmentFilterSelect ? departmentFilterSelect.value : 'all';
  if (selectedDept === 'CSE' || selectedDept === 'all') {
    branchFilterSelect.innerHTML = `
      <option value="all">All CSE Branches</option>
      <option value="CSE-R">CSE-R</option>
      <option value="CSE-A.I">CSE-A.I</option>
      <option value="CSE-SF">CSE-SF</option>
    `;
  } else {
    branchFilterSelect.innerHTML = `
      <option value="all">All Branches</option>
      <option value="${selectedDept}">${selectedDept}</option>
    `;
  }
}

if (departmentFilterSelect) {
  departmentFilterSelect.addEventListener('change', () => {
    currentSelectedDepartmentFilter = departmentFilterSelect.value;
    updateBranchFilterOptions();
    currentSelectedBranchFilter = 'all';
    if (branchFilterSelect) branchFilterSelect.value = 'all';
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
  });
}

if (branchFilterSelect) {
  branchFilterSelect.addEventListener('change', () => {
    currentSelectedBranchFilter = branchFilterSelect.value;
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
  });
}

async function logHistory(title, documentId) {
  if (!activeUserEmail) return;
  try {
    await fetch(`${API_URL}/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, documentId })
    });
    fetchHistory();
  } catch (err) {
    console.error(err);
  }
}

async function fetchHistory() {
  if (!activeUserEmail) return;
  try {
    const response = await fetch(`${API_URL}/history/${encodeURIComponent(activeUserEmail)}`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await response.json();

    if (recentActivityList) {
      recentActivityList.innerHTML = '';
      const recent = data.slice(0, 5);
      if (recent.length === 0) {
        recentActivityList.innerHTML = '<span class="history-empty-state" style="padding:8px; font-size:0.8rem;">No recent views</span>';
      } else {
        recent.forEach(item => {
          const div = document.createElement('div');
          div.style.padding = '6px 12px';
          div.style.fontSize = '0.8rem';
          div.style.color = '#94a3b8';
          div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          div.innerText = item.title;
          recentActivityList.appendChild(div);
        });
      }
    }

    if (historyCountText) historyCountText.textContent = `${data.length} items recorded`;

    if (fullHistoryContainer) {
      fullHistoryContainer.innerHTML = data.length === 0
        ? '<span class="history-empty-state">No download or viewing history found.</span>'
        : '';
      data.forEach(item => {
        const row = document.createElement('div');
        row.className = 'document-row-card';
        row.innerHTML = `<div class="doc-body-details"><h3>${item.title}</h3><p>Viewed on: ${new Date(item.timestamp).toLocaleString()}</p></div>`;
        fullHistoryContainer.appendChild(row);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if (!activeUserEmail) return;
    try {
      const response = await fetch(`${API_URL}/history/${encodeURIComponent(activeUserEmail)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        showNotification("History cleared");
        fetchHistory();
      }
    } catch (err) {
      showNotification("Failed to clear history");
    }
  });
}

if (viewFullHistoryBtn) {
  viewFullHistoryBtn.addEventListener('click', () => {
    if (mainDashboardView) mainDashboardView.classList.add('hidden');
    if (historyPageView) historyPageView.classList.remove('hidden');
    if (draftsPageView) draftsPageView.classList.add('hidden');
    authDropdown.classList.add('hidden');
  });
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener('click', () => {
    if (historyPageView) historyPageView.classList.add('hidden');
    if (mainDashboardView) mainDashboardView.classList.remove('hidden');
  });
}

if (navBrandHome) {
  navBrandHome.addEventListener('click', () => {
    if (historyPageView) historyPageView.classList.add('hidden');
    if (draftsPageView) draftsPageView.classList.add('hidden');
    if (mainDashboardView) mainDashboardView.classList.remove('hidden');
  });
}

function openPreviewModal(title, fileUrl, docId) {
  logHistory(title, docId);
  if (!previewModal || !previewContainer || !previewModalTitle) return;
  previewModalTitle.textContent = title;
  previewContainer.innerHTML = '';
  previewModal.classList.remove('hidden');

  if (!fileUrl) {
    const pre = document.createElement('pre');
    pre.textContent = "Preview unavailable for this asset.";
    pre.style.color = '#94a3b8';
    pre.style.display = 'block';
    previewContainer.appendChild(pre);
    return;
  }

  const lowerTitle = title.toLowerCase();
  const fileExtension = fileUrl.split('.').pop().toLowerCase().split('?')[0];

  if (lowerTitle.endsWith('.pdf') || fileExtension === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.width = '100%';
    iframe.style.height = '70vh';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.display = 'block';
    previewContainer.appendChild(iframe);
  } else if (lowerTitle.endsWith('.png') || lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg') ||
             lowerTitle.endsWith('.gif') || lowerTitle.endsWith('.webp') || lowerTitle.endsWith('.tiff') ||
             fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg' ||
             fileExtension === 'gif' || fileExtension === 'webp' || fileExtension === 'tiff') {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '70vh';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    previewContainer.appendChild(img);
  } else if (lowerTitle.endsWith('.txt') || lowerTitle.endsWith('.csv') || lowerTitle.endsWith('.json') ||
             lowerTitle.endsWith('.md') || fileExtension === 'txt' || fileExtension === 'csv' ||
             fileExtension === 'json' || fileExtension === 'md') {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.width = '100%';
    iframe.style.height = '70vh';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.backgroundColor = '#ffffff';
    iframe.style.display = 'block';
    previewContainer.appendChild(iframe);
  } else if (lowerTitle.endsWith('.docx') || lowerTitle.endsWith('.doc') ||
             fileExtension === 'docx' || fileExtension === 'doc') {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '40px 20px';
    wrapper.style.gap = '20px';
    wrapper.style.color = '#e2e8f0';
    wrapper.style.textAlign = 'center';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file-word" style="font-size: 4rem; color: #2b5797;"></i>
      <h3 style="color: #f1f5f9; font-weight: 600;">Microsoft Word Document</h3>
      <p style="color: #94a3b8; max-width: 400px; margin: 0 auto;">Word documents cannot be previewed directly in the browser.</p>
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <a href="${fileUrl}" target="_blank" rel="noopener" style="background: var(--accent-gradient); color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-download"></i> Download
        </a>
        <a href="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}" target="_blank" rel="noopener" style="background: rgba(255,255,255,0.08); color: #e2e8f0; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border-glass);">
          <i class="fa-solid fa-eye"></i> View Online
        </a>
      </div>
    `;
    previewContainer.appendChild(wrapper);
  } else if (lowerTitle.endsWith('.xlsx') || lowerTitle.endsWith('.xls') ||
             fileExtension === 'xlsx' || fileExtension === 'xls') {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '40px 20px';
    wrapper.style.gap = '20px';
    wrapper.style.color = '#e2e8f0';
    wrapper.style.textAlign = 'center';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file-excel" style="font-size: 4rem; color: #217346;"></i>
      <h3 style="color: #f1f5f9; font-weight: 600;">Excel Spreadsheet</h3>
      <p style="color: #94a3b8; max-width: 400px; margin: 0 auto;">Excel documents cannot be previewed directly in the browser.</p>
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <a href="${fileUrl}" target="_blank" rel="noopener" style="background: var(--accent-gradient); color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-download"></i> Download
        </a>
        <a href="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}" target="_blank" rel="noopener" style="background: rgba(255,255,255,0.08); color: #e2e8f0; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border-glass);">
          <i class="fa-solid fa-eye"></i> View Online
        </a>
      </div>
    `;
    previewContainer.appendChild(wrapper);
  } else if (lowerTitle.endsWith('.pptx') || lowerTitle.endsWith('.ppt') ||
             fileExtension === 'pptx' || fileExtension === 'ppt') {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '40px 20px';
    wrapper.style.gap = '20px';
    wrapper.style.color = '#e2e8f0';
    wrapper.style.textAlign = 'center';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file-powerpoint" style="font-size: 4rem; color: #d24726;"></i>
      <h3 style="color: #f1f5f9; font-weight: 600;">PowerPoint Presentation</h3>
      <p style="color: #94a3b8; max-width: 400px; margin: 0 auto;">PowerPoint documents cannot be previewed directly in the browser.</p>
      <div style="display: flex; gap: 16px; margin-top: 12px;">
        <a href="${fileUrl}" target="_blank" rel="noopener" style="background: var(--accent-gradient); color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-download"></i> Download
        </a>
        <a href="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}" target="_blank" rel="noopener" style="background: rgba(255,255,255,0.08); color: #e2e8f0; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border-glass);">
          <i class="fa-solid fa-eye"></i> View Online
        </a>
      </div>
    `;
    previewContainer.appendChild(wrapper);
  } else {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '40px 20px';
    wrapper.style.gap = '16px';
    wrapper.style.color = '#94a3b8';
    wrapper.style.textAlign = 'center';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file" style="font-size: 3rem; color: #64748b;"></i>
      <p style="color: #94a3b8; max-width: 400px;">Preview not supported for this file type.</p>
      <a href="${fileUrl}" target="_blank" rel="noopener" style="background: var(--accent-gradient); color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; margin-top: 8px;">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open file in new tab
      </a>
    `;
    previewContainer.appendChild(wrapper);
  }
}

if (closePreviewModalBtn) {
  closePreviewModalBtn.addEventListener('click', () => {
    if (previewModal) previewModal.classList.add('hidden');
    if (previewContainer) previewContainer.innerHTML = '';
  });
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    fetchDocuments(query);
    if (searchSuggestions) searchSuggestions.classList.add('hidden');
  });
}

if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      fetchDocuments(query);
      if (searchSuggestions) searchSuggestions.classList.add('hidden');
    }
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query || cachedDocuments.length === 0) {
      if (searchSuggestions) searchSuggestions.classList.add('hidden');
      return;
    }

    let searchQuery = query;

    let filtered = cachedDocuments.filter(doc => {
      if (!userCanAccessResource(doc)) return false;
      if (currentSelectedCategory === "drafts") {
        return doc.status === 'draft';
      }
      if (currentSelectedCategory === "recommended") {
        if (currentUserBranch) {
          const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
          const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
          return doc.category === "University Paper" && matchesBranch && matchesSem;
        }
        return false;
      } else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "drafts") {
        return doc.category === currentSelectedCategory;
      }
      return true;
    });

    filtered = filtered.filter(doc => {
      const searchLower = searchQuery.toLowerCase();
      const titleLower = (doc.title || '').toLowerCase();
      const titleHindiLower = (doc.titleHindi || '').toLowerCase();
      const textLower = (doc.extractedText || '').toLowerCase();
      const textHindiLower = (doc.extractedTextHindi || '').toLowerCase();
      const officialTypeLower = (doc.officialDocType || '').toLowerCase();
      const paperTypeLower = (doc.paperType || '').toLowerCase();
      const categoryLower = (doc.category || '').toLowerCase();
      const branchLower = (doc.branch || '').toLowerCase();
      const yearLower = (doc.year || '').toLowerCase();
      const semesterLower = (doc.semester || '').toLowerCase();
      const sessionLower = (doc.session || '').toLowerCase();
      const departmentLower = (doc.department || '').toLowerCase();

      const allText = `${titleLower} ${titleHindiLower} ${textLower} ${textHindiLower} ${officialTypeLower} ${paperTypeLower} ${categoryLower} ${branchLower} ${yearLower} ${semesterLower} ${sessionLower} ${departmentLower}`;

      return allText.includes(searchLower);
    });

    if (filtered.length === 0) {
      if (searchSuggestions) searchSuggestions.classList.add('hidden');
      return;
    }

    if (searchSuggestions) {
      searchSuggestions.innerHTML = '';
      const displayCount = Math.min(filtered.length, 10);
      for (let i = 0; i < displayCount; i++) {
        const doc = filtered[i];
        const row = document.createElement('div');
        row.className = 'suggestion-item';
        const isDraft = doc.status === 'draft';
        const draftBadge = isDraft ? '<span style="background: #f59e0b; color: #000; padding: 1px 6px; border-radius: 3px; font-size: 0.6rem; font-weight: 700; margin-left: 4px;">DRAFT</span>' : '';
        const hasContentMatch = (doc.extractedText || '').toLowerCase().includes(query) || (doc.extractedTextHindi || '').toLowerCase().includes(query);
        const deptInfo = doc.department ? `• ${doc.department}` : '';
        const branchInfo = doc.branch && doc.branch !== doc.department ? `• ${doc.branch}` : '';
        row.innerHTML = `
          <div class="suggestion-info">
            <span class="suggestion-title">${doc.title} ${draftBadge} ${hasContentMatch ? '📄' : ''}</span>
            <span class="suggestion-meta">${doc.category} ${deptInfo} ${branchInfo} ${isDraft ? '• Draft' : ''}</span>
          </div>
          <div class="suggestion-actions">
            <button class="suggestion-view-btn" style="background:none; border:none; color:#a5b4fc; cursor:pointer; margin-right:8px;"><i class="fa-solid fa-eye"></i></button>
            <a href="${doc.fileUrl}" target="_blank" rel="noopener" download="${doc.title}" class="suggestion-action-btn"><i class="fa-solid fa-download"></i></a>
          </div>
        `;
        row.querySelector('.suggestion-view-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openPreviewModal(doc.title, doc.fileUrl, doc._id);
        });
        row.addEventListener('click', (e) => {
          if (e.target.closest('.suggestion-action-btn') || e.target.closest('.suggestion-view-btn')) return;
          searchInput.value = doc.title;
          fetchDocuments(doc.title);
          searchSuggestions.classList.add('hidden');
        });
        searchSuggestions.appendChild(row);
      }
      searchSuggestions.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (searchSuggestions && !e.target.closest('.search-container')) searchSuggestions.classList.add('hidden');
  });
}

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSelectedCategory = tab.getAttribute('data-category');
    const isAdminEmail = activeUserEmail === 'ankushadmin@gmail.com';
    if (currentSelectedCategory === "drafts" && isUserLoggedIn && canManageDrafts()) {
      if (academicActionBtn) academicActionBtn.classList.add('hidden');
      if (resultsMeta) resultsMeta.classList.remove('hidden');
      fetchDrafts();
    } else if (currentSelectedCategory === "Academic Resource" && isAdminEmail && isUserLoggedIn) {
      if (academicActionBtn) academicActionBtn.classList.remove('hidden');
      if (resultsMeta) resultsMeta.classList.add('hidden');
    } else {
      if (academicActionBtn) academicActionBtn.classList.add('hidden');
      if (resultsMeta) resultsMeta.classList.remove('hidden');
      if (academicModal) academicModal.classList.add('hidden');
    }
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    if (searchSuggestions) searchSuggestions.classList.add('hidden');
  });
});

async function deleteDocument(id) {
  if (!canDeleteDocuments()) {
    showNotification("Access denied. Only authorized faculty and leadership roles can delete documents.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Removed successfully");
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
      fetchDrafts();
    } else {
      showNotification(data.message);
    }
  } catch (err) {
    showNotification("Failed to send drop request.");
  }
}

async function publishDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied. Only authorized faculty and leadership roles can publish drafts.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/publish/${id}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Draft published successfully!");
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
      fetchDrafts();
      if (currentSelectedCategory === 'drafts') {
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
      }
    } else {
      showNotification(data.message || "Failed to publish draft.");
    }
  } catch (err) {
    showNotification("Network error publishing draft.");
  }
}

async function deleteDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied. Only authorized faculty and leadership roles can delete drafts.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/draft/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Draft deleted successfully.");
      fetchDrafts();
      if (currentSelectedCategory === 'drafts') {
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
      }
    } else {
      showNotification(data.message || "Failed to delete draft.");
    }
  } catch (err) {
    showNotification("Network error deleting draft.");
  }
}

function viewAcademicCard(cardData) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '3000';
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 500px;">
      <div class="modal-top-bar"><h3>${cardData.subject}</h3><button class="modal-dismiss-icon" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 0;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-glass);">
          <span style="color: var(--text-secondary);">Branch</span><span style="font-weight: 500;">${cardData.branch}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-glass);">
          <span style="color: var(--text-secondary);">Semester</span><span style="font-weight: 500;">Semester ${cardData.semester}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-glass);">
          <span style="color: var(--text-secondary);">Teacher</span><span style="font-weight: 500;">${cardData.teacher}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: var(--text-secondary);">Status</span><span style="font-weight: 500; color: #4ade80;">Active</span>
        </div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="this.closest('.modal-overlay').remove()" class="form-action-trigger" style="background: rgba(255,255,255,0.1); padding: 8px 20px;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function deleteAcademicCard(subject) {
  if (activeUserEmail !== 'ankushadmin@gmail.com') { showNotification('Only admins can delete academic resources.'); return; }
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal-overlay';
  confirmModal.style.zIndex = '3000';
  confirmModal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 400px;">
      <div class="modal-top-bar"><h3 style="color: #ef4444;">Delete Academic Resource</h3><button class="modal-dismiss-icon" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
      <div style="padding: 16px 0; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #ef4444; margin-bottom: 12px;"></i>
        <p style="color: var(--text-secondary); margin-bottom: 8px;">Are you sure you want to delete "<strong>${subject}</strong>"?</p>
        <p style="color: var(--text-secondary); font-size: 0.85rem;">This action cannot be undone.</p>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
        <button onclick="this.closest('.modal-overlay').remove()" class="form-action-trigger" style="background: rgba(255,255,255,0.1); padding: 10px 24px;">Cancel</button>
        <button id="confirmAcademicDeleteBtn" class="form-action-trigger" style="background: #ef4444; padding: 10px 24px;">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);
  confirmModal.querySelector('#confirmAcademicDeleteBtn').addEventListener('click', function() {
    let savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
    savedCards = savedCards.filter(card => card.subject !== subject);
    localStorage.setItem('academicCards', JSON.stringify(savedCards));
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    showNotification("Academic card deleted.");
    confirmModal.remove();
  });
}

function editAcademicCard(cardData, index) {
  const subjectInput = document.getElementById('academicSubjectInput');
  const branchSelect = document.getElementById('academicBranchSelect');
  const semesterSelect = document.getElementById('academicSemesterSelect');
  const teacherInput = document.getElementById('academicTeacherInput');
  if (subjectInput) subjectInput.value = cardData.subject;
  if (branchSelect) branchSelect.value = cardData.branch;
  if (semesterSelect) semesterSelect.value = cardData.semester;
  if (teacherInput) teacherInput.value = cardData.teacher;
  academicModal.classList.remove('hidden');
  const originalSubmit = submitAcademicDetailsBtn.onclick;
  submitAcademicDetailsBtn.onclick = (e) => {
    e.preventDefault();
    const subject = subjectInput.value.trim();
    const branch = branchSelect.value;
    const semester = semesterSelect.value;
    const teacher = teacherInput.value.trim();
    if (!subject || !teacher) { alert('Please fill out all fields.'); return; }
    let savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
    savedCards[index] = {
      subject, branch, semester, teacher,
      firstLetter: teacher.charAt(0).toUpperCase() || '?',
      avatarBgColor: getAvatarColor(teacher),
      chosenTheme: cardData.chosenTheme || ['banner-blue', 'banner-teal', 'banner-slate'][Math.floor(Math.random() * 3)]
    };
    localStorage.setItem('academicCards', JSON.stringify(savedCards));
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    academicModal.classList.add('hidden');
    showNotification('Academic card updated.');
    submitAcademicDetailsBtn.onclick = originalSubmit;
  };
}

function pinAcademicCard(index) {
  let savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
  const card = savedCards.splice(index, 1)[0];
  savedCards.unshift(card);
  localStorage.setItem('academicCards', JSON.stringify(savedCards));
  fetchDocuments(searchInput ? searchInput.value.trim() : "");
  showNotification('Card pinned.');
}

function moveAcademicCard(index) {
  let savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
  const card = savedCards.splice(index, 1)[0];
  const newIndex = prompt('Enter new position (0 to ' + savedCards.length + '):', savedCards.length);
  if (newIndex !== null && !isNaN(newIndex) && newIndex >= 0 && newIndex <= savedCards.length) {
    savedCards.splice(parseInt(newIndex), 0, card);
    localStorage.setItem('academicCards', JSON.stringify(savedCards));
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    showNotification('Card moved.');
  }
}

function copyAcademicCard(cardData) {
  const text = `${cardData.subject}\n${cardData.branch} | ${cardData.semester} SEM\nTeacher: ${cardData.teacher}`;
  navigator.clipboard.writeText(text).then(() => showNotification('Card details copied.')).catch(() => showNotification('Could not copy.'));
}

function shareAcademicCard(cardData) {
  if (navigator.share) {
    navigator.share({ title: cardData.subject, text: `${cardData.subject}\n${cardData.branch} | ${cardData.semester} SEM\nTeacher: ${cardData.teacher}` }).catch(() => {});
  } else { copyAcademicCard(cardData); }
}

function showCardMenu(e, cardData, index, isUpper) {
  e.stopPropagation();
  const existingMenu = document.querySelector('.card-context-menu');
  if (existingMenu) existingMenu.remove();
  const menu = document.createElement('div');
  menu.className = 'card-context-menu';
  menu.style.cssText = `position:fixed;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 0;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:9999;color:#e2e8f0;`;
  let x = e.clientX || e.pageX || 0;
  let y = e.clientY || e.pageY || 0;
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
  let options = [];
  const isAdmin = activeUserEmail === 'ankushadmin@gmail.com';
  if (isUpper) {
    options = [
      { label: '👁️ View', action: () => { viewAcademicCard(cardData); menu.remove(); } },
      { label: '✏️ Edit', action: () => { editAcademicCard(cardData, index); menu.remove(); } },
      { label: '📌 Pin', action: () => { pinAcademicCard(index); menu.remove(); } },
    ];
    if (isAdmin) options.push({ label: '🗑️ Delete', action: () => { deleteAcademicCard(cardData.subject); menu.remove(); } });
  } else {
    options = [
      { label: '👁️ View', action: () => { viewAcademicCard(cardData); menu.remove(); } },
      { label: '📌 Pin', action: () => { pinAcademicCard(index); menu.remove(); } },
      { label: '📂 Move', action: () => { moveAcademicCard(index); menu.remove(); } },
      { label: '🔗 Share', action: () => { shareAcademicCard(cardData); menu.remove(); } }
    ];
  }
  options.forEach(opt => {
    const item = document.createElement('div');
    item.style.cssText = `padding:8px 16px;cursor:pointer;font-size:0.85rem;transition:background 0.15s;display:flex;align-items:center;gap:8px;`;
    if (opt.label.includes('Delete')) item.style.color = '#ef4444';
    item.textContent = opt.label;
    item.onmouseover = () => item.style.background = '#334155';
    item.onmouseout = () => { item.style.background = 'transparent'; if (opt.label.includes('Delete')) item.style.color = '#ef4444'; };
    item.onclick = (ev) => { ev.stopPropagation(); opt.action(); };
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function removeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', removeMenu); }
    });
  }, 10);
}

function setupCardEventListeners() {
  resultsGrid.addEventListener('click', function(e) {
    const upperBtn = e.target.closest('.upper-menu-btn');
    if (upperBtn) {
      e.stopPropagation();
      const card = upperBtn.closest('.classroom-card');
      if (!card) return;
      const subject = card.getAttribute('data-subject');
      const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
      const cardData = savedCards.find(c => c.subject === subject);
      const cardIndex = savedCards.findIndex(c => c.subject === subject);
      if (cardData) showCardMenu(e, cardData, cardIndex, true);
      return;
    }
    const lowerBtn = e.target.closest('.lower-menu-btn');
    if (lowerBtn) {
      e.stopPropagation();
      const card = lowerBtn.closest('.classroom-card');
      if (!card) return;
      const subject = card.getAttribute('data-subject');
      const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
      const cardData = savedCards.find(c => c.subject === subject);
      const cardIndex = savedCards.findIndex(c => c.subject === subject);
      if (cardData) showCardMenu(e, cardData, cardIndex, false);
      return;
    }
  });
}

async function fetchDocuments(query = "") {
  if (isLoading) return;
  isLoading = true;
  const shouldRenderAcademic = isUserLoggedIn && currentSelectedCategory === "Academic Resource";
  const isDraftView = currentSelectedCategory === "drafts";

  if (!activeUserEmail || !authToken) {
    if (resultCount) resultCount.textContent = `0 items ready`;
    if (resultsGrid) {
      const documentCards = resultsGrid.querySelectorAll('.document-row-card');
      documentCards.forEach(card => card.remove());
      const academicCards = resultsGrid.querySelectorAll('.classroom-card');
      academicCards.forEach(card => card.remove());
      if (shouldRenderAcademic) { renderAcademicCards(); setupCardEventListeners(); }
      else if (currentSelectedCategory === "Academic Resource") {
        const emptyMsg = document.createElement('span');
        emptyMsg.className = 'history-empty-state';
        emptyMsg.textContent = 'Please login to view academic resources.';
        resultsGrid.appendChild(emptyMsg);
      }
    }
    isLoading = false;
    return;
  }

  try {
    let url = `${API_URL}/documents/search?q=${encodeURIComponent(query)}`;
    if (currentSelectedCategory === "drafts") {
      url += `&status=draft`;
    } else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "recommended") {
      url += `&category=${encodeURIComponent(currentSelectedCategory)}`;
    }
    if (currentSelectedCategory === "recommended" && currentUserBranch) {
      url += `&branch=${encodeURIComponent(currentUserBranch)}`;
      if (currentUserSemester) url += `&semester=${encodeURIComponent(currentUserSemester)}`;
    }
    if (isCollegeWideRole()) {
      if (currentSelectedDepartmentFilter && currentSelectedDepartmentFilter !== 'all') {
        url += `&department=${encodeURIComponent(currentSelectedDepartmentFilter)}`;
      }
      if (currentSelectedBranchFilter && currentSelectedBranchFilter !== 'all') {
        url += `&branch=${encodeURIComponent(currentSelectedBranchFilter)}`;
      }
    } else if (currentUserDepartment === DEPARTMENTS.CSE) {
      if (currentSelectedBranchFilter && currentSelectedBranchFilter !== 'all') {
        url += `&branch=${encodeURIComponent(currentSelectedBranchFilter)}`;
      }
    }
    const response = await fetch(url, { headers: { "Authorization": `Bearer ${authToken}` } });
    if (!response.ok) {
      if (resultCount) resultCount.textContent = `0 items ready`;
      if (resultsGrid) {
        resultsGrid.innerHTML = '';
        const emptyMsg = document.createElement('span');
        emptyMsg.className = 'history-empty-state';
        emptyMsg.textContent = query ? `No documents found matching "${query}"` : 'No documents available.';
        resultsGrid.appendChild(emptyMsg);
      }
      isLoading = false;
      return;
    }
    let docs = await response.json();
    if (!Array.isArray(docs)) docs = docs.docs || [];
    docs = docs.filter(doc => userCanAccessResource(doc));
    docs = docs.filter(doc => userCanAccessBranch(doc.branch, doc.department));
    if (query === "") cachedDocuments = docs;

    if (isDraftView) {
      docs = docs.filter(doc => doc.status === 'draft');
    } else if (currentSelectedCategory === "recommended" && currentUserBranch) {
      docs = docs.filter(doc => {
        const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
        const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
        return doc.category === "University Paper" && matchesBranch && matchesSem;
      });
    } else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "recommended" && currentSelectedCategory !== "drafts") {
      docs = docs.filter(doc => doc.category === currentSelectedCategory);
    }

    if (resultCount) {
      const count = docs.length;
      resultCount.textContent = `${count} item${count !== 1 ? 's' : ''} ready`;
    }
    if (!resultsGrid) { isLoading = false; return; }
    const documentCards = resultsGrid.querySelectorAll('.document-row-card');
    documentCards.forEach(card => card.remove());
    if (!shouldRenderAcademic && !isDraftView) {
      const academicCards = resultsGrid.querySelectorAll('.classroom-card');
      academicCards.forEach(card => card.remove());
    }
    const isAdmin = currentUserRole === ROLES.ADMIN;
    if (docs.length === 0 && !shouldRenderAcademic) {
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      emptyMsg.textContent = isDraftView ? 'No drafts saved.' : (query ? `No documents found matching "${query}"` : 'No documents available.');
      resultsGrid.appendChild(emptyMsg);
    }
    docs.forEach((doc) => {
      const card = document.createElement('div');
      card.className = 'document-row-card';
      const isDraft = doc.status === 'draft';
      const isPending = doc.status === 'pending_approval';
      let pillsHtml = `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.category || 'University Paper'}</span>`;
      if (isDraft) {
        pillsHtml += `<span style="background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">DRAFT</span>`;
      }
      if (isPending) {
        pillsHtml += `<span style="background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">PENDING</span>`;
      }
      if (doc.department) {
        pillsHtml += `<span style="background: rgba(74,222,128,0.15); color: #4ade80; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.department}</span>`;
      }
      if (doc.category === 'University Paper') {
        if (doc.branch) pillsHtml += `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.branch}</span>`;
        if (doc.semester) pillsHtml += `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Semester ${doc.semester}</span>`;
        if (doc.paperType) pillsHtml += `<span style="background: rgba(168,85,247,0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.paperType}</span>`;
        if (doc.year) pillsHtml += `<span style="background: rgba(234,179,8,0.15); color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Session: ${doc.year}</span>`;
      } else {
        if (doc.officialDocType) pillsHtml += `<span style="background: rgba(168,85,247,0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.officialDocType}</span>`;
        if (doc.year && doc.year !== 'All Years') pillsHtml += `<span style="background: rgba(234,179,8,0.15); color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.year}</span>`;
        if (doc.semester && doc.semester !== 'All Semesters') pillsHtml += `<span style="background: rgba(234,179,8,0.15); color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Semester ${doc.semester}</span>`;
        if (doc.branch && doc.branch !== 'All Branches') pillsHtml += `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.branch}</span>`;
        if (doc.session) pillsHtml += `<span style="background: rgba(234,179,8,0.15); color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Session: ${doc.session}</span>`;
      }
      if (doc.ocrApplied) pillsHtml += `<span style="background: rgba(74,222,128,0.15); color: #4ade80; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">OCR</span>`;
      if (doc.isScanned) pillsHtml += `<span style="background: rgba(251,146,60,0.15); color: #fb923c; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Scanned</span>`;
      if (doc.ocrConfidence && doc.ocrConfidence > 0) pillsHtml += `<span style="background: rgba(148,163,184,0.15); color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.ocrConfidence}%</span>`;
      if (doc.relevanceScore && doc.relevanceScore > 0) pillsHtml += `<span style="background: rgba(251,191,36,0.15); color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Score: ${doc.relevanceScore}</span>`;
      const hasFile = !!doc.fileUrl;
      let relevanceInfo = '';
      const searchLower = (query || '').toLowerCase();
      const textLower = (doc.extractedText || '').toLowerCase();
      const textHindiLower = (doc.extractedTextHindi || '').toLowerCase();
      if (query && textLower.includes(searchLower)) {
        relevanceInfo = `<span style="color: #4ade80; font-size: 0.75rem; margin-left: 8px;">✓ Content match</span>`;
      }
      if (query && textHindiLower.includes(searchLower)) {
        relevanceInfo = `<span style="color: #4ade80; font-size: 0.75rem; margin-left: 8px;">✓ Hindi content match</span>`;
      }
      card.innerHTML = `
        <div class="doc-body-details">
          <h3>${doc.title} ${relevanceInfo} ${isDraft ? '<span style="background: #f59e0b; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 4px;">DRAFT</span>' : ''} ${isPending ? '<span style="background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 4px;">PENDING</span>' : ''}</h3>
          <p>Category: ${doc.category} ${doc.pageCount ? `• ${doc.pageCount} pages` : ''}</p>
          ${doc.category === 'University Paper' && doc.year ? `<p>Session: ${doc.year}</p>` : ''}
          ${doc.category === 'University Paper' && doc.semester ? `<p>Semester: ${doc.semester}</p>` : ''}
          ${doc.category === 'University Paper' && doc.branch ? `<p>Branch: ${doc.branch}</p>` : ''}
          ${doc.category === 'University Paper' && doc.paperType ? `<p>Type: ${doc.paperType}</p>` : ''}
          ${doc.category === 'Official Update' && doc.officialDocType ? `<p>Doc Type: ${doc.officialDocType}</p>` : ''}
          ${doc.category === 'Official Update' && doc.year && doc.year !== 'All Years' ? `<p>Year: ${doc.year}</p>` : ''}
          ${doc.category === 'Official Update' && doc.session ? `<p>Session: ${doc.session}</p>` : ''}
          ${doc.category === 'Official Update' && doc.semester && doc.semester !== 'All Semesters' ? `<p>Semester: ${doc.semester}</p>` : ''}
          ${doc.category === 'Official Update' && doc.branch && doc.branch !== 'All Branches' ? `<p>Branch: ${doc.branch}</p>` : ''}
          ${doc.department ? `<p>Department: ${doc.department}</p>` : ''}
          ${doc.docDate ? `<p>Date: ${doc.docDate}</p>` : ''}
          ${!hasFile ? `<p style="color:#ef4444; font-size:0.8rem;">File missing on storage — re-upload required.</p>` : ''}
          ${query && doc.extractedText ? `<p style="color: #94a3b8; font-size: 0.75rem; margin-top: 4px;">📄 Content: ${doc.extractedText.substring(0, 150)}${doc.extractedText.length > 150 ? '...' : ''}</p>` : ''}
          ${query && doc.extractedTextHindi ? `<p style="color: #94a3b8; font-size: 0.75rem; margin-top: 2px;">📄 Hindi: ${doc.extractedTextHindi.substring(0, 150)}${doc.extractedTextHindi.length > 150 ? '...' : ''}</p>` : ''}
          <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">${pillsHtml}</div>
        </div>
        <div class="doc-action-zone" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button class="action-btn-link view-btn" style="background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); padding: 6px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.9rem;">View</button>
          ${hasFile ? `<a href="${doc.fileUrl}" target="_blank" rel="noopener" download class="action-btn-link get-btn" style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent-gradient); color: #ffffff; padding: 6px 14px; border-radius: 6px; font-weight: 500; text-decoration: none; font-size: 0.9rem;">Get</a>` : `<button class="action-btn-link" disabled style="background: rgba(148,163,184,0.1); color: #64748b; border: 1px solid rgba(148,163,184,0.2); padding: 6px 14px; border-radius: 6px; font-weight: 500; cursor: not-allowed; font-size: 0.9rem;">Get</button>`}
          ${canManageDrafts() && isDraft ? `<button class="action-btn-link publish-btn" style="background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" data-id="${doc._id}">Publish</button>` : ''}
          ${canManageDrafts() && isDraft ? `<button class="action-btn-link delete-draft-btn" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" data-id="${doc._id}">Delete Draft</button>` : ''}
          ${canEditDocuments() && !isDraft ? `<button class="action-btn-link edit-btn" title="Edit" style="background: rgba(234,179,8,0.1); color: #fde047; border: 1px solid rgba(234,179,8,0.2); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${canDeleteDocuments() && !isDraft ? `<button class="action-btn-link delete-btn" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;" data-id="${doc._id}">Delete</button>` : ''}
        </div>
      `;
      card.querySelector('.view-btn').addEventListener('click', () => openPreviewModal(doc.title, doc.fileUrl, doc._id));
      const getBtn = card.querySelector('.get-btn');
      if (getBtn) getBtn.addEventListener('click', () => logHistory(doc.title, doc._id));
      const editBtn = card.querySelector('.edit-btn');
      if (editBtn) editBtn.addEventListener('click', () => openEditDocumentModal(doc));
      const deleteBtn = card.querySelector('.delete-btn');
      if (deleteBtn) deleteBtn.addEventListener('click', () => deleteDocument(doc._id));
      const publishBtn = card.querySelector('.publish-btn');
      if (publishBtn) publishBtn.addEventListener('click', () => publishDraft(doc._id));
      const deleteDraftBtn = card.querySelector('.delete-draft-btn');
      if (deleteDraftBtn) deleteDraftBtn.addEventListener('click', () => deleteDraft(doc._id));
      resultsGrid.appendChild(card);
    });
    const isAdminEmail = activeUserEmail === 'ankushadmin@gmail.com';
    if (academicActionBtn) {
      if (currentSelectedCategory === "Academic Resource" && isAdminEmail && isUserLoggedIn) {
        academicActionBtn.classList.remove('hidden');
        if (resultsMeta) resultsMeta.classList.add('hidden');
      } else {
        academicActionBtn.classList.add('hidden');
        if (resultsMeta) resultsMeta.classList.remove('hidden');
      }
    }
    if (shouldRenderAcademic) { renderAcademicCards(); setupCardEventListeners(); }
    else if (currentSelectedCategory === "Academic Resource" && !isUserLoggedIn) {
      const emptyMsg = resultsGrid.querySelector('.history-empty-state');
      if (!emptyMsg) {
        const msg = document.createElement('span');
        msg.className = 'history-empty-state';
        msg.textContent = 'Please login to view academic resources.';
        resultsGrid.appendChild(msg);
      }
    }
  } catch (err) {
    console.error("Error fetching documents:", err);
    if (resultsGrid) {
      resultsGrid.innerHTML = '';
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      emptyMsg.textContent = 'Error loading documents. Please try again.';
      resultsGrid.appendChild(emptyMsg);
    }
  }
  isLoading = false;
}

function setElementVisible(el, show, displayValue) {
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

function renderActionButtons() {
  const staff = hasStaffAccess();
  document.body.classList.toggle('role-student', !staff);
  setElementVisible(document.getElementById('adminActionWrapper'), staff, 'flex');
  setElementVisible(document.getElementById('mainUploadBtn'), staff);
  setElementVisible(document.getElementById('draftManagerBtn'), staff);
  if (!staff) {
    const draftTab = document.querySelector('.filter-tab[data-category="drafts"]');
    if (draftTab) draftTab.classList.add('hidden');
    if (draftsPageView) draftsPageView.classList.add('hidden');
  }
  renderDepartmentBranchFilters();
}

window.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('role-student');
  renderActionButtons();
  addDraftTab();
  setupUploadButtons();
  if (authToken) {
    try {
      const base64Url = authToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem('token');
        authToken = null;
        isUserLoggedIn = false;
        fetchDocuments();
        return;
      }
      const response = await fetch(`${API_URL}/auth/me`, { headers: { "Authorization": `Bearer ${authToken}` } });
      if (response.ok) {
        const user = await response.json();
        handleUserSession(user);
        if (canManageDrafts()) {
          fetchDrafts();
        }
      } else {
        localStorage.removeItem('token');
        authToken = null;
        isUserLoggedIn = false;
        fetchDocuments();
      }
    } catch (e) {
      localStorage.removeItem('token');
      authToken = null;
      isUserLoggedIn = false;
      fetchDocuments();
    }
  } else {
    isUserLoggedIn = false;
    fetchDocuments();
  }
  setupCardEventListeners();
});

if (academicActionBtn) {
  academicActionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentUserRole !== ROLES.ADMIN) {
      showNotification("Access denied. Admin only.");
      return;
    }
    academicModal.classList.remove('hidden');
  });
}

if (closeAcademicModalBtn) {
  closeAcademicModalBtn.addEventListener('click', () => { academicModal.classList.add('hidden'); });
}

window.addEventListener('click', (e) => {
  if (e.target === academicModal) academicModal.classList.add('hidden');
});

function getAvatarColor(username) {
  if (!username || username.trim() === "") return '#4f46e5';
  let hash = 0;
  const name = username.trim();
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    const baselineValue = Math.floor((value % 120) + 80);
    color += ('00' + baselineValue.toString(16)).substr(-2);
  }
  return color;
}

function generateCardHTML(data, isAdmin = false, index = 0) {
  const upperMenuStyle = isAdmin ? '' : 'display: none;';
  return `
    <div class="classroom-card" data-subject="${data.subject}" data-index="${index}" style="width: 300px; min-height: 280px; border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; position: relative; background: #fff; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15); cursor: pointer;">
      <div class="card-header-banner ${data.chosenTheme}" style="position: relative; padding: 16px; min-height: 100px; color: white; display: flex; flex-direction: column; justify-content: space-between;">
        <div class="banner-content" style="max-width: 70%;">
          <h3 class="course-title" title="${data.subject}" style="margin: 0; font-size: 1.1rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: underline;">${data.subject.toUpperCase()}</h3>
          <p class="course-subtitle" style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">B.TECH | ${data.branch.toUpperCase()} | ${data.semester} SEM</p>
        </div>
        <p class="teacher-name" style="margin: 12px 0 0 0; font-size: 0.8rem; opacity: 0.9; text-transform: uppercase;">${data.teacher}</p>
        <button class="banner-options-btn upper-menu-btn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; cursor: pointer; font-size: 1rem; ${upperMenuStyle}">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div class="card-avatar-container" style="position: absolute; right: 24px; bottom: -30px; z-index: 2;">
          <div class="avatar-letter" style="background-color: ${data.avatarBgColor}; width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.75rem; font-weight: 400; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${data.firstLetter}
          </div>
        </div>
      </div>
      <div class="card-body" style="flex-grow: 1; padding: 12px 16px; background: white; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e0e0e0;">
        <span style="font-size: 0.8rem; color: #5f6368;">${data.semester} SEM • ${data.branch}</span>
        <div class="card-actions" style="display: flex; gap: 4px;">
          <button class="action-btn lower-menu-btn" title="More options" style="background: none; border: none; color: #5f6368; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAcademicCards() {
  if (!isUserLoggedIn) {
    const existingCards = resultsGrid.querySelectorAll('.classroom-card');
    existingCards.forEach(card => card.remove());
    return;
  }
  const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
  const isAdmin = activeUserEmail === 'ankushadmin@gmail.com';
  const existingCards = resultsGrid.querySelectorAll('.classroom-card');
  existingCards.forEach(card => card.remove());
  if (savedCards.length === 0) {
    if (!resultsGrid.querySelector('.history-empty-state')) {
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      emptyMsg.textContent = 'No academic resources added yet.';
      resultsGrid.appendChild(emptyMsg);
    }
    return;
  }
  savedCards.forEach((cardData, index) => {
    resultsGrid.insertAdjacentHTML('beforeend', generateCardHTML(cardData, isAdmin, index));
  });
  const emptyState = resultsGrid.querySelector('.history-empty-state');
  if (emptyState) emptyState.remove();
}

let currentClassroomCard = null;
let classroomAnnouncements = JSON.parse(localStorage.getItem('classroomAnnouncements')) || {};

function openClassroomModal(cardData) {
  currentClassroomCard = cardData;
  const modal = document.getElementById('classroomModal');
  const title = document.getElementById('classroomTitle');
  const subtitle = document.getElementById('classroomSubtitle');
  title.textContent = cardData.subject || 'Unknown Subject';
  subtitle.textContent = `B.TECH | ${(cardData.branch || 'N/A').toUpperCase()} | ${cardData.semester || '?'} SEM | 2025-26`;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  loadClassroomAnnouncements(cardData.subject);
  document.querySelectorAll('.classroom-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.classroom-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      const tabName = this.dataset.tab;
      document.querySelectorAll('.classroom-tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`classroom${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    });
  });
}

function closeClassroomModal() {
  document.getElementById('classroomModal').classList.add('hidden');
  document.body.style.overflow = '';
  currentClassroomCard = null;
}

document.getElementById('closeClassroomModalBtn').addEventListener('click', closeClassroomModal);
document.getElementById('classroomModal').addEventListener('click', function(e) {
  if (e.target === this) closeClassroomModal();
});

function loadClassroomAnnouncements(subject) {
  const container = document.getElementById('announcementsList');
  if (!classroomAnnouncements[subject]) classroomAnnouncements[subject] = [];
  container.innerHTML = '';
  if (classroomAnnouncements[subject].length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.color = '#5f6368';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    emptyMsg.textContent = 'No announcements yet. Post your first announcement!';
    container.appendChild(emptyMsg);
    return;
  }
  const isAdmin = activeUserEmail === 'ankushadmin@gmail.com';
  classroomAnnouncements[subject].forEach((announcement, index) => {
    const div = document.createElement('div');
    div.className = 'announcement-item';
    const date = new Date(announcement.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    div.innerHTML = `
      <div class="announcement-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="announcement-avatar">${announcement.author.charAt(0).toUpperCase()}</div>
          <div class="announcement-user">
            <span class="announcement-name">${announcement.author}</span>
            <span class="announcement-date">${date}</span>
          </div>
        </div>
        ${isAdmin ? `<button class="delete-announcement-btn" data-subject="${subject}" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <div class="announcement-body">
        <p>${announcement.text}</p>
        ${announcement.attachments && announcement.attachments.length > 0 ? `
          <div class="announcement-attachments">
            ${announcement.attachments.map((att, idx) => `
              <div class="attachment-item" onclick="viewAttachment('${subject}', ${index}, ${idx})">
                <i class="fa-solid fa-file"></i> ${att.name}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('.delete-announcement-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const subject = this.dataset.subject;
      const index = parseInt(this.dataset.index);
      showDeleteConfirmModal(subject, index);
    });
    btn.addEventListener('mouseenter', function() { this.style.background = 'rgba(239, 68, 68, 0.1)'; });
    btn.addEventListener('mouseleave', function() { this.style.background = 'none'; });
  });
}

function deleteAnnouncement(subject, index) {
  if (activeUserEmail !== 'ankushadmin@gmail.com') { showNotification('Only admins can delete announcements.'); return; }
  if (classroomAnnouncements[subject]) {
    classroomAnnouncements[subject].splice(index, 1);
    localStorage.setItem('classroomAnnouncements', JSON.stringify(classroomAnnouncements));
    loadClassroomAnnouncements(subject);
    showNotification('Announcement deleted successfully.');
  }
}

function postAnnouncement() {
  const input = document.getElementById('announcementInput');
  const text = input.value.trim();
  if (!text && !window.pendingAttachments) { showNotification('Please enter an announcement message.'); return; }
  const subject = currentClassroomCard ? currentClassroomCard.subject : 'Unknown';
  if (!classroomAnnouncements[subject]) classroomAnnouncements[subject] = [];
  const attachments = window.pendingAttachments || [];
  classroomAnnouncements[subject].push({
    text: text || 'Posted an attachment',
    author: workspaceName ? workspaceName.textContent : 'Anonymous',
    timestamp: Date.now(),
    attachments: attachments
  });
  localStorage.setItem('classroomAnnouncements', JSON.stringify(classroomAnnouncements));
  input.value = '';
  window.pendingAttachments = [];
  document.getElementById('streamAttachments').innerHTML = '';
  loadClassroomAnnouncements(subject);
  showNotification('Announcement posted successfully!');
}

document.getElementById('postAnnouncementBtn').addEventListener('click', postAnnouncement);
document.getElementById('announcementInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postAnnouncement(); }
});

window.pendingAttachments = [];
document.getElementById('addAttachmentBtn').addEventListener('click', function() {
  document.getElementById('announcementFileInput').click();
});
document.getElementById('announcementFileInput').addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  const container = document.getElementById('streamAttachments');
  files.forEach(file => {
    window.pendingAttachments.push({
      name: file.name,
      size: file.size,
      type: file.type,
      data: URL.createObjectURL(file)
    });
    const div = document.createElement('div');
    div.className = 'attachment-item';
    div.innerHTML = `<i class="fa-solid fa-file"></i> ${file.name}`;
    div.onclick = function() {
      const idx = window.pendingAttachments.indexOf(window.pendingAttachments.find(a => a.name === file.name));
      if (idx > -1) {
        window.pendingAttachments.splice(idx, 1);
        this.remove();
        if (window.pendingAttachments.length === 0) container.innerHTML = '';
      }
    };
    container.appendChild(div);
  });
  this.value = '';
});

function viewAttachment(subject, announcementIndex, attachmentIndex) {
  const announcement = classroomAnnouncements[subject][announcementIndex];
  const attachment = announcement.attachments[attachmentIndex];
  if (attachment) window.open(attachment.data, '_blank');
}

function setupClassroomCardClick() {
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.classroom-card');
    if (card && !e.target.closest('.upper-menu-btn') && !e.target.closest('.lower-menu-btn') && !e.target.closest('button')) {
      const subject = card.dataset.subject;
      const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
      const cardData = savedCards.find(c => c.subject === subject);
      if (cardData) openClassroomModal(cardData);
    }
  });
}

setupClassroomCardClick();

window.addEventListener('load', function() {
  const targetGrid = document.getElementById('resultsGrid');
  if (!targetGrid) return;
  if (currentSelectedCategory === "Academic Resource" && isUserLoggedIn) {
    const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
    const isAdmin = activeUserEmail === 'ankushadmin@gmail.com';
    if (savedCards.length > 0) {
      const emptyState = targetGrid.querySelector('.history-empty-state');
      if (emptyState) emptyState.remove();
      savedCards.forEach((cardData, index) => {
        targetGrid.insertAdjacentHTML('beforeend', generateCardHTML(cardData, isAdmin, index));
      });
      setupCardEventListeners();
    }
  }
});

if (submitAcademicDetailsBtn) {
  submitAcademicDetailsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserRole !== ROLES.ADMIN) {
      showNotification("Access denied. Admin only.");
      return;
    }
    const subjectInput = document.getElementById('academicSubjectInput');
    const branchSelect = document.getElementById('academicBranchSelect');
    const semesterSelect = document.getElementById('academicSemesterSelect');
    const teacherInput = document.getElementById('academicTeacherInput');
    if (!subjectInput || !branchSelect || !semesterSelect || !teacherInput) {
      console.error('One or more form elements were not found in the DOM.');
      return;
    }
    const subject = subjectInput.value.trim();
    const branch = branchSelect.value;
    const semester = semesterSelect.value;
    const teacher = teacherInput.value.trim();
    if (!subject || !teacher) { alert('Please fill out all fields.'); return; }
    const firstLetter = teacher.charAt(0).toUpperCase() || '?';
    const avatarBgColor = getAvatarColor(teacher);
    const bannerThemes = ['banner-blue', 'banner-teal', 'banner-slate'];
    const chosenTheme = bannerThemes[Math.floor(Math.random() * bannerThemes.length)];
    const newCard = { subject, branch, semester, teacher, firstLetter, avatarBgColor, chosenTheme };
    const currentCards = JSON.parse(localStorage.getItem('academicCards')) || [];
    currentCards.push(newCard);
    localStorage.setItem('academicCards', JSON.stringify(currentCards));
    const searchInputValue = searchInput ? searchInput.value.trim() : "";
    fetchDocuments(searchInputValue);
    subjectInput.value = '';
    teacherInput.value = '';
    if (academicModal) academicModal.classList.add('hidden');
  });
}