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
let currentUserName = "";
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
let pendingApprovalCount = 0;

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
const DIRECT_DELETE_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.DEAN];
const REQUEST_DELETE_ROLES = [ROLES.HOD, ROLES.PROFESSOR, ROLES.ASSISTANT_PROFESSOR];

const ROLE_DISPLAY = {
  admin: 'Admin',
  director: 'Director',
  dean: 'Dean',
  hod: 'HOD',
  professor: 'Professor',
  assistant_professor: 'Assistant Professor',
  student: 'Student'
};

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

function canApproveDocuments() {
  return hasStaffAccess() && currentUserPermissions.includes('approve_document');
}

function canManageDrafts() {
  return hasStaffAccess();
}

function canEditDocuments() {
  return hasStaffAccess();
}

function canUploadDocuments() {
  return hasStaffAccess();
}

function isResourceOwner(doc) {
  if (!doc || !doc.uploadedBy || !activeUserEmail) return false;
  return doc.uploadedBy.toLowerCase() === activeUserEmail.toLowerCase();
}

function canDirectlyDelete(doc) {
  if (!doc || !isUserLoggedIn) return false;
  if (DIRECT_DELETE_ROLES.includes(currentUserRole)) return true;
  if (isResourceOwner(doc)) return true;
  return false;
}

function canRequestDelete(doc) {
  if (!doc || !isUserLoggedIn) return false;
  if (canDirectlyDelete(doc)) return false;
  if (!REQUEST_DELETE_ROLES.includes(currentUserRole)) return false;
  return true;
}

function canCollegeWideRequestDelete(doc) {
  if (!doc || !isUserLoggedIn) return false;
  if (!COLLEGE_WIDE_ROLES.includes(currentUserRole)) return false;
  if (isResourceOwner(doc)) return false;
  return true;
}

function getRoleDisplay(role) {
  return ROLE_DISPLAY[role] || role;
}

function userCanAccessResource(doc) {
  if (!isUserLoggedIn) return false;
  if (isCollegeWideRole()) return true;
  if (!doc.department) return true;
  if (!currentUserDepartment) return false;
  return doc.department === currentUserDepartment;
}

function userCanAccessBranch(docBranch, docDepartment) {
  if (!isUserLoggedIn) return false;
  if (isCollegeWideRole()) return true;
  if (!docBranch || docBranch === "All Branches" || docBranch === "") return true;
  if (!currentUserDepartment) return false;
  const normalizedDept = docDepartment || getDepartmentFromBranch(docBranch);
  if (!normalizedDept) return true;
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

function showNotification(message, type) {
  if (!notificationContainer) { alert(message); return; }
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.borderLeftColor = '#ef4444';
  if (type === 'success') toast.style.borderLeftColor = '#4ade80';
  toast.style.borderLeft = '3px solid #6366f1';
  toast.innerText = message;
  notificationContainer.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

function setDefaultAvatar(container) {
  if (container) container.innerHTML = '<i class="fa-solid fa-user"></i>';
}

function setAvatarImage(container, base64Str) {
  if (container) container.innerHTML = `<img src="${base64Str}" alt="Profile">`;
}

function showInputModal(title, placeholder, defaultValue, onSubmit, requireValue) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay custom-input-modal';
  modal.style.zIndex = '5000';
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 520px;">
      <div class="modal-top-bar">
        <h3>${title}</h3>
        <button class="modal-dismiss-icon">&times;</button>
      </div>
      <div class="modal-form">
        <div class="input-block">
          <textarea class="custom-input-textarea" placeholder="${placeholder}" rows="4" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 12px 14px; border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; outline: none; resize: vertical; font-family: inherit;">${defaultValue || ''}</textarea>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
          <button class="custom-cancel-btn form-action-trigger" style="background: rgba(255,255,255,0.08); padding: 12px 24px; font-size: 0.9rem;">Cancel</button>
          <button class="custom-submit-btn form-action-trigger" style="padding: 12px 24px; font-size: 0.9rem;">Submit</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const textarea = modal.querySelector('.custom-input-textarea');
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const cancelBtn = modal.querySelector('.custom-cancel-btn');
  const submitBtn = modal.querySelector('.custom-submit-btn');

  const closeModal = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  submitBtn.addEventListener('click', () => {
    const value = textarea.value;
    if (requireValue && (!value || !value.trim())) {
      showNotification("This field is required.", "error");
      return;
    }
    closeModal();
    setTimeout(() => onSubmit(value), 200);
  });

  textarea.focus();
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitBtn.click();
    }
  });
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

function showDeleteResourceConfirm(doc, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '6000';
  modal.innerHTML = `
    <div class="modal-glass-card delete-confirm-card" style="max-width: 460px;">
      <div class="modal-top-bar" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 12px;">
        <h3 style="color: #ef4444; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-trash-can"></i> Delete Resource
        </h3>
        <button class="modal-dismiss-icon" style="color: #94a3b8;">&times;</button>
      </div>
      <div style="padding: 16px 0; text-align: center;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444;"></i>
        </div>
        <p style="color: #e2e8f0; margin-bottom: 8px; font-size: 1rem; font-weight: 500;">Are you sure you want to permanently delete "${doc.title}"?</p>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 16px;">This action cannot be undone. The file, chunks, and embeddings will be permanently removed.</p>
        <div class="input-block" style="text-align: left;">
          <label style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 6px; display: block;">Reason for deletion (optional)</label>
          <input type="text" class="delete-reason-input" placeholder="e.g., Outdated content" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; outline: none;">
        </div>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border-glass);">
        <button class="del-cancel-btn form-action-trigger" style="background: rgba(255,255,255,0.08); padding: 10px 28px; font-size: 0.9rem; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);">Cancel</button>
        <button class="del-confirm-btn form-action-trigger" style="background: #ef4444; padding: 10px 28px; font-size: 0.9rem;">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const cancelBtn = modal.querySelector('.del-cancel-btn');
  const confirmBtn = modal.querySelector('.del-confirm-btn');
  const reasonInput = modal.querySelector('.delete-reason-input');
  const close = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  confirmBtn.addEventListener('click', () => {
    const reason = reasonInput.value.trim();
    close();
    setTimeout(() => onConfirm(reason), 200);
  });
  reasonInput.focus();
}

function showRequestDeleteModal(doc) {
  const isCollegeWide = COLLEGE_WIDE_ROLES.includes(currentUserRole);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '6000';
  let targetOptions = '';
  if (isCollegeWide) {
    targetOptions = `
      <option value="UPLOADER_APPROVAL">Original Uploader (${doc.uploadedByName || doc.uploadedBy})</option>
    `;
  } else if (REQUEST_DELETE_ROLES.includes(currentUserRole)) {
    targetOptions = `
      <option value="UPLOADER_APPROVAL">Original Uploader (${doc.uploadedByName || doc.uploadedBy})</option>
      <option value="HIGHER_AUTHORITY_APPROVAL">Dean / Director / Admin</option>
    `;
  }
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 540px;">
      <div class="modal-top-bar" style="border-bottom: 1px solid rgba(251, 191, 36, 0.2); padding-bottom: 12px;">
        <h3 style="color: #fbbf24; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-paper-plane"></i> Request Resource Deletion
        </h3>
        <button class="modal-dismiss-icon" style="color: #94a3b8;">&times;</button>
      </div>
      <div class="modal-form">
        <div style="background: rgba(251,191,36,0.08); border-left: 3px solid #fbbf24; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <p style="color: #fbbf24; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">Note:</p>
          <p style="color: #e2e8f0; font-size: 0.85rem;">You cannot directly delete this resource because you are not the original uploader. A deletion request will be sent for approval.</p>
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Resource Name</label>
          <input type="text" value="${doc.title}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Original Uploader</label>
          <input type="text" value="${doc.uploadedByName || doc.uploadedBy}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Your Role</label>
          <input type="text" value="${getRoleDisplay(currentUserRole)}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Send Request To</label>
          <select class="req-target-select" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; outline: none;">
            ${targetOptions}
          </select>
        </div>
        <div class="input-block req-authority-block hidden">
          <label style="color: #94a3b8; font-size: 0.8rem;">Select Higher Authority</label>
          <select class="req-authority-select" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; outline: none;">
            <option value="dean">Dean</option>
            <option value="director">Director</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Reason for deletion <span style="color: #ef4444;">*</span></label>
          <textarea class="req-comment-textarea" placeholder="Explain why this resource should be deleted..." rows="4" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 12px 14px; border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; outline: none; resize: vertical; font-family: inherit;"></textarea>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
          <button class="req-cancel-btn form-action-trigger" style="background: rgba(255,255,255,0.08); padding: 12px 24px; font-size: 0.9rem; color: #94a3b8;">Cancel</button>
          <button class="req-submit-btn form-action-trigger" style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 12px 24px; font-size: 0.9rem;">Send Delete Request</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const targetSelect = modal.querySelector('.req-target-select');
  const authorityBlock = modal.querySelector('.req-authority-block');
  const authoritySelect = modal.querySelector('.req-authority-select');
  const commentArea = modal.querySelector('.req-comment-textarea');
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const cancelBtn = modal.querySelector('.req-cancel-btn');
  const submitBtn = modal.querySelector('.req-submit-btn');

  if (targetSelect) {
    targetSelect.addEventListener('change', () => {
      if (targetSelect.value === 'HIGHER_AUTHORITY_APPROVAL') {
        authorityBlock.classList.remove('hidden');
      } else {
        authorityBlock.classList.add('hidden');
      }
    });
  }

  const close = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  submitBtn.addEventListener('click', async () => {
    const comment = commentArea.value.trim();
    if (!comment) {
      showNotification("Reason for deletion is mandatory.", "error");
      return;
    }
    const requestType = targetSelect ? targetSelect.value : 'UPLOADER_APPROVAL';
    let targetAuthority;
    if (requestType === 'HIGHER_AUTHORITY_APPROVAL') {
      targetAuthority = authoritySelect.value;
    } else {
      targetAuthority = doc.uploadedBy;
    }
    try {
      const response = await fetch(`${API_URL}/deletion-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          resourceId: doc._id,
          comment,
          targetAuthority,
          requestType
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification("Deletion request sent successfully.", "success");
        close();
        fetchDeletionRequests();
        fetchNotifications();
      } else {
        showNotification(data.message || "Failed to send request.", "error");
      }
    } catch (e) {
      showNotification("Network error sending request.", "error");
    }
  });
  commentArea.focus();
}

function showDeletionRequestsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '5500';
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 800px; width: 90%; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="modal-top-bar" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 12px;">
        <h3 style="color: #fbbf24; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-inbox"></i> Deletion Requests
        </h3>
        <button class="modal-dismiss-icon" style="color: #94a3b8;">&times;</button>
      </div>
      <div style="display: flex; gap: 8px; padding: 12px 0; border-bottom: 1px solid var(--border-glass);">
        <button class="req-tab active" data-tab="incoming" style="background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Incoming</button>
        <button class="req-tab" data-tab="outgoing" style="background: transparent; color: #94a3b8; border: 1px solid var(--border-glass); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">Outgoing</button>
      </div>
      <div class="req-content" style="flex: 1; overflow-y: auto; padding: 16px 0;">
        <div style="text-align: center; color: #94a3b8; padding: 40px;">Loading...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const content = modal.querySelector('.req-content');
  const tabs = modal.querySelectorAll('.req-tab');
  const close = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#94a3b8';
        t.style.borderColor = 'var(--border-glass)';
      });
      tab.classList.add('active');
      tab.style.background = 'rgba(99,102,241,0.15)';
      tab.style.color = '#a5b4fc';
      tab.style.borderColor = 'rgba(99,102,241,0.3)';
      loadRequestTab(tab.dataset.tab, content);
    });
  });

  loadRequestTab('incoming', content);
}

async function loadRequestTab(tab, container) {
  container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px;">Loading...</div>';
  try {
    const url = tab === 'incoming' ? `${API_URL}/deletion-requests/incoming` : `${API_URL}/deletion-requests/outgoing`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!response.ok) throw new Error("Failed to fetch");
    const requests = await response.json();
    renderRequestList(requests, container, tab);
  } catch (e) {
    container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 40px;">Failed to load requests.</div>';
  }
}

function renderRequestList(requests, container, tab) {
  if (!requests || requests.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No ${tab} requests.</div>`;
    return;
  }
  container.innerHTML = '';
  requests.forEach(req => {
    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px; margin-bottom: 12px;';
    let actionButtons = '';
    if (tab === 'incoming') {
      actionButtons = `
        <button class="req-approve-btn" style="background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500;"><i class="fa-solid fa-check"></i> Approve Delete</button>
        <button class="req-reject-btn" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 500;"><i class="fa-solid fa-xmark"></i> Reject Request</button>
      `;
    } else {
      actionButtons = `
        <button class="req-cancel-req-btn" style="background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid var(--border-glass); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">Cancel Request</button>
      `;
    }
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          <h4 style="color: #f1f5f9; font-size: 1rem; font-weight: 600; margin-bottom: 4px;">${req.resourceName}</h4>
          <p style="color: #94a3b8; font-size: 0.8rem;">Requested by: ${req.requesterName || req.requestedBy} (${getRoleDisplay(req.requesterRole)})</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Original Uploader: ${req.originalUploaderName || req.originalUploader}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Target: ${req.targetAuthority}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Type: ${req.requestType === 'UPLOADER_APPROVAL' ? 'Original Uploader' : 'Higher Authority'}</p>
          <p style="color: #94a3b8; font-size: 0.8rem;">Date: ${new Date(req.createdAt).toLocaleString()}</p>
        </div>
        <span style="background: #3b82f6; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">${req.status.toUpperCase()}</span>
      </div>
      <div style="background: rgba(251,191,36,0.08); border-left: 3px solid #fbbf24; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
        <p style="color: #fbbf24; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Reason:</p>
        <p style="color: #e2e8f0; font-size: 0.85rem;">${req.comment}</p>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
        ${actionButtons}
      </div>
    `;
    container.appendChild(card);

    const approveBtn = card.querySelector('.req-approve-btn');
    const rejectBtn = card.querySelector('.req-reject-btn');
    const cancelReqBtn = card.querySelector('.req-cancel-req-btn');

    if (approveBtn) approveBtn.addEventListener('click', () => handleApproveRequest(req._id));
    if (rejectBtn) rejectBtn.addEventListener('click', () => handleRejectRequest(req._id));
    if (cancelReqBtn) cancelReqBtn.addEventListener('click', () => handleCancelRequest(req._id));
  });
}

async function handleApproveRequest(requestId) {
  showInputModal(
    "Approve Deletion Request",
    "Optional response comment...",
    "",
    async (responseComment) => {
      try {
        const response = await fetch(`${API_URL}/deletion-requests/${requestId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ responseComment })
        });
        const data = await response.json();
        if (response.ok) {
          showNotification("Request approved. Resource deleted.", "success");
          fetchDocuments(searchInput ? searchInput.value.trim() : "");
          fetchNotifications();
          const reqContent = document.querySelector('.req-content');
          if (reqContent) {
            const activeTab = document.querySelector('.req-tab.active');
            if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
          }
        } else {
          showNotification(data.message || "Approval failed.", "error");
        }
      } catch (e) {
        showNotification("Network error.", "error");
      }
    },
    false
  );
}

async function handleRejectRequest(requestId) {
  showInputModal(
    "Reject Deletion Request",
    "Optional response comment...",
    "",
    async (responseComment) => {
      try {
        const response = await fetch(`${API_URL}/deletion-requests/${requestId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ responseComment })
        });
        const data = await response.json();
        if (response.ok) {
          showNotification("Request rejected.", "success");
          fetchNotifications();
          const reqContent = document.querySelector('.req-content');
          if (reqContent) {
            const activeTab = document.querySelector('.req-tab.active');
            if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
          }
        } else {
          showNotification(data.message || "Rejection failed.", "error");
        }
      } catch (e) {
        showNotification("Network error.", "error");
      }
    },
    false
  );
}

async function handleCancelRequest(requestId) {
  try {
    const response = await fetch(`${API_URL}/deletion-requests/${requestId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Request cancelled.", "success");
      const reqContent = document.querySelector('.req-content');
      if (reqContent) {
        const activeTab = document.querySelector('.req-tab.active');
        if (activeTab) loadRequestTab(activeTab.dataset.tab, reqContent);
      }
    } else {
      showNotification(data.message || "Cancel failed.", "error");
    }
  } catch (e) {
    showNotification("Network error.", "error");
  }
}

async function fetchDeletionRequests() {
  if (!isUserLoggedIn) return;
  try {
    const response = await fetch(`${API_URL}/deletion-requests/pending-count`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      updateRequestTabBadge(data.count);
    }
  } catch (e) {
    console.error("Error fetching deletion requests count:", e);
  }
}

function updateRequestTabBadge(count) {
  let reqTab = document.querySelector('.filter-tab[data-category="deletion_requests"]');
  if (!reqTab && isUserLoggedIn && hasStaffAccess()) {
    const filterContainer = document.querySelector('.category-filter-table');
    if (filterContainer) {
      reqTab = document.createElement('div');
      reqTab.className = 'filter-tab';
      reqTab.setAttribute('data-category', 'deletion_requests');
      reqTab.innerHTML = `<i class="fa-solid fa-inbox"></i> Deletion Requests${count > 0 ? ` (${count})` : ''}`;
      filterContainer.appendChild(reqTab);
      reqTab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        reqTab.classList.add('active');
        currentSelectedCategory = 'deletion_requests';
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
        if (searchSuggestions) searchSuggestions.classList.add('hidden');
      });
    }
  } else if (reqTab) {
    reqTab.innerHTML = `<i class="fa-solid fa-inbox"></i> Deletion Requests${count > 0 ? ` (${count})` : ''}`;
  }
}

async function fetchNotifications() {
  if (!isUserLoggedIn) return;
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      await response.json();
      const unreadResp = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (unreadResp.ok) {
        const data = await unreadResp.json();
        updateNotificationBadge(data.count);
      }
    }
  } catch (e) {
    console.error("Error fetching notifications:", e);
  }
}

function updateNotificationBadge(count) {
  let badge = document.getElementById('notificationBadge');
  const dropdown = document.getElementById('authDropdown');
  if (!dropdown) return;
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'notificationBadge';
      badge.style.cssText = 'position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 0.65rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; z-index: 10;';
      const wrapper = profileMenuBtn || document.querySelector('.auth-wrapper');
      if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.appendChild(badge);
      }
    }
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else if (badge) {
    badge.style.display = 'none';
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
    if (!authDropdown.classList.contains('hidden') && isUserLoggedIn) {
      fetchNotifications();
    }
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
    currentUserName = "";
    cachedDocuments = [];
    authToken = null;
    isUserLoggedIn = false;
    pendingApprovalCount = 0;
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
    if (resultsMeta) resultsMeta.classList.remove('hidden');
    removePendingApprovalTab();
    removeDeletionRequestsTab();
    updateNotificationBadge(0);
    fetchDocuments();
    renderActionButtons();
    renderDepartmentBranchFilters();
  });
}

function removeDeletionRequestsTab() {
  const tab = document.querySelector('.filter-tab[data-category="deletion_requests"]');
  if (tab) tab.remove();
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
      showNotification("Access denied. Only authorized faculty and leadership roles can upload documents.", "error");
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
      showNotification("Access denied.", "error");
      return;
    }
    if (draftsPageView) {
      mainDashboardView.classList.add('hidden');
      historyPageView.classList.add('hidden');
      draftsPageView.classList.remove('hidden');
      fetchDrafts();
      fetchPendingApprovals();
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
    fetchPendingApprovals();
    showNotification("Drafts refreshed.", "success");
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
          showNotification(data.message, "success");
        } else {
          showNotification(data.message, "error");
        }
      } catch (err) {
        showNotification("Network error processing avatar update.", "error");
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
  formData.append('file', pendingUploadFile);
  formData.append('title', (customTitle && customTitle.length > 0) ? customTitle : pendingUploadFile.name);
  formData.append('category', finalCategory);
  formData.append('docDate', selectedDate);
  formData.append('status', status || 'pending_approval');

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
    showNotification("No file selected.", "error");
    return;
  }
  const formData = getFormDataForUpload('draft');
  if (!formData) return;
  try {
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Document saved as draft successfully!", "success");
      const docTitleInput = document.getElementById('docTitleInput');
      if (docTitleInput) docTitleInput.value = '';
      if (uploadPopup) uploadPopup.classList.add('hidden');
      pendingUploadFile = null;
      if (universalDocumentInput) universalDocumentInput.value = "";
      fetchDrafts();
      if (currentSelectedCategory === 'drafts') fetchDocuments(searchInput ? searchInput.value.trim() : "");
    } else {
      showNotification(data.message || "Failed to save draft.", "error");
    }
  } catch (err) {
    showNotification("Network error saving draft.", "error");
  }
}

async function publishDocument() {
  if (!pendingUploadFile) {
    showNotification("No file selected.", "error");
    return;
  }
  const formData = getFormDataForUpload('pending_approval');
  if (!formData) return;
  try {
    const response = await fetch(`${API_URL}/documents/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showNotification(data.message || "Document submitted for approval!", "success");
      const docTitleInput = document.getElementById('docTitleInput');
      if (docTitleInput) docTitleInput.value = '';
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
      if (uploadPopup) uploadPopup.classList.add('hidden');
      pendingUploadFile = null;
      if (universalDocumentInput) universalDocumentInput.value = "";
      fetchPendingApprovals();
    } else {
      showNotification(data.message || "Upload failed.", "error");
    }
  } catch (err) {
    showNotification("Network error uploading document.", "error");
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
    if (draftsContainer) draftsContainer.innerHTML = '<span class="history-empty-state">No permission to view drafts.</span>';
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
    }
  } catch (err) {
    console.error("Error fetching drafts:", err);
  }
}

async function fetchPendingApprovals() {
  if (!authToken || !canApproveDocuments()) {
    pendingApprovalCount = 0;
    updatePendingApprovalTabCount(0);
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/pending-approval`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    if (response.ok) {
      const pending = await response.json();
      pendingApprovalCount = pending ? pending.length : 0;
      updatePendingApprovalTabCount(pendingApprovalCount);
      if (currentSelectedCategory === 'pending_approval') renderPendingApprovals(pending);
    }
  } catch (err) {
    console.error("Error fetching pending approvals:", err);
  }
}

function updatePendingApprovalTabCount(count) {
  let approvalTab = document.querySelector('.filter-tab[data-category="pending_approval"]');
  if (!approvalTab && canApproveDocuments()) {
    const filterContainer = document.querySelector('.category-filter-table');
    if (filterContainer) {
      approvalTab = document.createElement('div');
      approvalTab.className = 'filter-tab';
      approvalTab.setAttribute('data-category', 'pending_approval');
      approvalTab.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Approval (${count})`;
      filterContainer.appendChild(approvalTab);
      approvalTab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        approvalTab.classList.add('active');
        currentSelectedCategory = 'pending_approval';
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
        if (searchSuggestions) searchSuggestions.classList.add('hidden');
      });
    }
  } else if (approvalTab) {
    approvalTab.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Approval (${count})`;
    if (count === 0 && !currentSelectedCategory.includes('pending_approval')) {
      approvalTab.style.display = 'none';
    } else {
      approvalTab.style.display = 'flex';
    }
  }
}

function removePendingApprovalTab() {
  const approvalTab = document.querySelector('.filter-tab[data-category="pending_approval"]');
  if (approvalTab) approvalTab.remove();
}

function renderPendingApprovals(pending) {
  if (currentSelectedCategory !== 'pending_approval') return;
  if (!resultsGrid) return;
  const existingCards = resultsGrid.querySelectorAll('.document-row-card');
  existingCards.forEach(card => card.remove());
  if (!pending || pending.length === 0) {
    const emptyMsg = document.createElement('span');
    emptyMsg.className = 'history-empty-state';
    emptyMsg.textContent = 'No documents pending approval.';
    resultsGrid.appendChild(emptyMsg);
    if (resultCount) resultCount.textContent = `0 items ready`;
    return;
  }
  if (resultCount) resultCount.textContent = `${pending.length} item${pending.length !== 1 ? 's' : ''} pending`;
  pending.forEach((doc) => renderDocumentCard(doc, resultsGrid, true));
}

async function approveDocument(id) {
  if (!canApproveDocuments()) {
    showNotification("Access denied.", "error");
    return;
  }
  showInputModal(
    "Approve Document",
    "Enter approval comment (optional)...",
    "",
    async (comment) => {
      try {
        const response = await fetch(`${API_URL}/documents/${id}/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({ comment: comment || "" })
        });
        const data = await response.json();
        if (response.ok) {
          showNotification(data.message || "Document approved successfully.", "success");
          fetchDocuments(searchInput ? searchInput.value.trim() : "");
          fetchPendingApprovals();
          fetchDrafts();
        } else {
          showNotification(data.message || "Approval failed.", "error");
        }
      } catch (err) {
        showNotification("Network error approving document.", "error");
      }
    }
  );
}

async function rejectDocument(id) {
  if (!canApproveDocuments()) {
    showNotification("Access denied.", "error");
    return;
  }
  showInputModal(
    "Reject Document",
    "Enter rejection reason / improvement comment...",
    "",
    async (reason) => {
      if (!reason || !reason.trim()) {
        showNotification("Rejection reason is required.", "error");
        return;
      }
      try {
        const response = await fetch(`${API_URL}/documents/${id}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({ reason })
        });
        const data = await response.json();
        if (response.ok) {
          showNotification(data.message || "Document rejected and moved to drafts.", "success");
          fetchDocuments(searchInput ? searchInput.value.trim() : "");
          fetchPendingApprovals();
          fetchDrafts();
        } else {
          showNotification(data.message || "Rejection failed.", "error");
        }
      } catch (err) {
        showNotification("Network error rejecting document.", "error");
      }
    },
    true
  );
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
    const hasRejection = draft.rejectionReason && draft.rejectionReason.length > 0;
    const rejectionBlock = hasRejection ? `<div style="margin-top: 8px; padding: 8px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px;"><p style="color: #fca5a5; font-size: 0.75rem; margin: 0;"><strong>Rejected by ${draft.rejectedBy || 'approver'}:</strong> ${draft.rejectionReason}</p></div>` : '';
    card.innerHTML = `
      <div class="draft-info">
        <h4>${draft.title}</h4>
        <p>${draft.category || 'Uncategorized'}${deptInfo}${branchInfo} • ${fileType} • Uploaded: ${createdAt}</p>
        <span class="draft-status-badge">Draft</span>
        ${rejectionBlock}
      </div>
      <div class="draft-actions">
        <button class="draft-action-btn draft-action-open" data-id="${draft._id}"><i class="fa-solid fa-pen"></i> Open</button>
        <button class="draft-action-btn draft-action-publish" data-id="${draft._id}"><i class="fa-solid fa-paper-plane"></i> Submit for Approval</button>
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
    showNotification("Access denied.", "error");
    return;
  }
  if (!userCanAccessResource(doc)) {
    showNotification("Access denied.", "error");
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
      showNotification("Access denied.", "error");
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
    if (!payload.title) { showNotification("Title cannot be empty.", "error"); return; }
    try {
      const response = await fetch(`${API_URL}/documents/${editingDocId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        showNotification("Document updated successfully!", "success");
        if (editPopup) editPopup.classList.add('hidden');
        editingDocId = null;
        fetchDocuments(searchInput ? searchInput.value.trim() : "");
        fetchDrafts();
      } else {
        showNotification(data.message || "Update failed.", "error");
      }
    } catch (err) {
      showNotification("Network error updating document.", "error");
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
        showNotification(data.message || "Authentication failed.", "error");
      }
    } catch (err) {
      showNotification("Connection error. Is the backend server running?", "error");
    }
  });
}

function handleUserSession(user) {
  if (!user) return;
  isUserLoggedIn = true;
  activeUserEmail = user.email;
  currentUserName = user.name || "";
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
  updateRequestTabBadge(0);
  fetchDeletionRequests();
  fetchNotifications();

  if (hasStaffAccess()) {
    addDraftTab();
    setupUploadButtons();
    fetchDrafts();
    if (canApproveDocuments()) fetchPendingApprovals();
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
        showNotification("History cleared", "success");
        fetchHistory();
      }
    } catch (err) {
      showNotification("Failed to clear history", "error");
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
    previewContainer.appendChild(pre);
    return;
  }
  const lowerTitle = title.toLowerCase();
  const fileExtension = fileUrl.split('.').pop().toLowerCase().split('?')[0];
  if (lowerTitle.endsWith('.pdf') || fileExtension === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:8px;display:block;';
    previewContainer.appendChild(iframe);
  } else if (['png','jpg','jpeg','gif','webp','tiff'].includes(fileExtension) ||
             lowerTitle.endsWith('.png') || lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg')) {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.cssText = 'max-width:100%;max-height:70vh;object-fit:contain;border-radius:8px;display:block;';
    previewContainer.appendChild(img);
  } else if (['txt','csv','json','md'].includes(fileExtension)) {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.style.cssText = 'width:100%;height:70vh;border:none;border-radius:8px;background:#fff;display:block;';
    previewContainer.appendChild(iframe);
  } else {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;color:#94a3b8;text-align:center;';
    wrapper.innerHTML = `
      <i class="fa-solid fa-file" style="font-size:3rem;color:#64748b;"></i>
      <p style="color:#94a3b8;max-width:400px;">Preview not supported for this file type.</p>
      <a href="${fileUrl}" target="_blank" rel="noopener" style="background:var(--accent-gradient);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in new tab
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
    let filtered = cachedDocuments.filter(doc => {
      if (!userCanAccessResource(doc)) return false;
      if (currentSelectedCategory === "drafts") return doc.status === 'draft';
      if (currentSelectedCategory === "pending_approval") return doc.status === 'pending_approval';
      if (currentSelectedCategory === "recommended") {
        if (currentUserBranch) {
          const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
          const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
          return doc.category === "University Paper" && matchesBranch && matchesSem;
        }
        return false;
      } else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "drafts" && currentSelectedCategory !== "pending_approval") {
        return doc.category === currentSelectedCategory;
      }
      return true;
    });
    filtered = filtered.filter(doc => {
      const allText = `${doc.title || ''} ${doc.titleHindi || ''} ${doc.extractedText || ''} ${doc.extractedTextHindi || ''} ${doc.officialDocType || ''} ${doc.paperType || ''} ${doc.category || ''} ${doc.branch || ''} ${doc.year || ''} ${doc.semester || ''} ${doc.session || ''} ${doc.department || ''}`.toLowerCase();
      return allText.includes(query);
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
    if (currentSelectedCategory === "drafts" && isUserLoggedIn && canManageDrafts()) {
      if (resultsMeta) resultsMeta.classList.remove('hidden');
      fetchDrafts();
    } else if (currentSelectedCategory === "pending_approval" && isUserLoggedIn && canApproveDocuments()) {
      if (resultsMeta) resultsMeta.classList.remove('hidden');
      fetchPendingApprovals();
    } else if (currentSelectedCategory === "deletion_requests") {
      if (resultsMeta) resultsMeta.classList.add('hidden');
      showDeletionRequestsModal();
    } else {
      if (resultsMeta) resultsMeta.classList.remove('hidden');
    }
    fetchDocuments(searchInput ? searchInput.value.trim() : "");
    if (searchSuggestions) searchSuggestions.classList.add('hidden');
  });
});

async function deleteDocument(id, reason) {
  try {
    const response = await fetch(`${API_URL}/documents/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ reason: reason || "" })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Resource deleted successfully.", "success");
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
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

async function publishDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied.", "error");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/publish/${id}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Draft submitted for approval!", "success");
      fetchDocuments(searchInput ? searchInput.value.trim() : "");
      fetchDrafts();
      fetchPendingApprovals();
    } else {
      showNotification(data.message || "Failed to submit draft.", "error");
    }
  } catch (err) {
    showNotification("Network error submitting draft.", "error");
  }
}

async function deleteDraft(id) {
  if (!canManageDrafts()) {
    showNotification("Access denied.", "error");
    return;
  }
  try {
    const response = await fetch(`${API_URL}/documents/draft/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Draft deleted successfully.", "success");
      fetchDrafts();
      if (currentSelectedCategory === 'drafts') fetchDocuments(searchInput ? searchInput.value.trim() : "");
    } else {
      showNotification(data.message || "Failed to delete draft.", "error");
    }
  } catch (err) {
    showNotification("Network error deleting draft.", "error");
  }
}

async function renderDocumentCard(doc, container, isPendingView) {
  const card = document.createElement('div');
  card.className = 'document-row-card';
  const isDraft = doc.status === 'draft';
  const isPending = doc.status === 'pending_approval';
  const owner = isResourceOwner(doc);
  const canDel = canDirectlyDelete(doc);
  const canReq = canRequestDelete(doc);
  const canCWReq = canCollegeWideRequestDelete(doc);
  let pillsHtml = `<span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.category || 'University Paper'}</span>`;
  if (isDraft) pillsHtml += `<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">DRAFT</span>`;
  if (isPending) pillsHtml += `<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">PENDING</span>`;
  if (owner) pillsHtml += `<span style="background:rgba(74,222,128,0.15);color:#4ade80;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">YOUR UPLOAD</span>`;
  if (doc.department) pillsHtml += `<span style="background:rgba(74,222,128,0.15);color:#4ade80;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">${doc.department}</span>`;
  if (doc.branch) pillsHtml += `<span style="background:rgba(99,102,241,0.15);color:#a5b4fc;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;">${doc.branch}</span>`;
  let approvalInfo = '';
  if (isPending) {
    approvalInfo = `<p style="color:#fbbf24;font-size:0.8rem;margin-top:4px;">Stage: ${doc.approvalStage || 'pending'}</p>`;
  }
  let rejectionInfo = '';
  if (doc.rejectionReason && doc.status === 'draft') {
    rejectionInfo = `<p style="color:#fca5a5;font-size:0.8rem;margin-top:4px;padding:6px;background:rgba(239,68,68,0.1);border-radius:4px;">Rejected: ${doc.rejectionReason}</p>`;
  }
  let actionButtons = `<button class="action-btn-link view-btn" style="background:rgba(99,102,241,0.1);color:#a5b4fc;border:1px solid rgba(99,102,241,0.2);padding:6px 14px;border-radius:6px;font-weight:500;cursor:pointer;font-size:0.9rem;">View</button>`;
  if (doc.fileUrl) {
    actionButtons += `<a href="${doc.fileUrl}" target="_blank" rel="noopener" download class="action-btn-link get-btn" style="display:inline-flex;align-items:center;justify-content:center;background:var(--accent-gradient);color:#ffffff;padding:6px 14px;border-radius:6px;font-weight:500;text-decoration:none;font-size:0.9rem;">Get</a>`;
  }
  if (canManageDrafts() && isDraft) {
    actionButtons += `<button class="action-btn-link publish-btn" style="background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Submit for Approval</button>`;
  }
  if (canApproveDocuments() && isPending) {
    actionButtons += `<button class="action-btn-link approve-btn" style="background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Approve</button>`;
    actionButtons += `<button class="action-btn-link reject-btn" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;">Reject</button>`;
  }
  if (canEditDocuments() && !isPending) {
    actionButtons += `<button class="action-btn-link edit-btn" title="Edit" style="background:rgba(234,179,8,0.1);color:#fde047;border:1px solid rgba(234,179,8,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.9rem;"><i class="fa-solid fa-pen"></i></button>`;
  }
  let deleteTooltip = "";
  let deleteClass = "";
  if (canDel && !isPending && !isDraft) {
    deleteTooltip = "Delete this resource";
    deleteClass = "delete-btn";
  } else if ((canReq || canCWReq) && !isPending && !isDraft) {
    deleteTooltip = "Request deletion of this resource";
    deleteClass = "req-delete-btn";
  }
  if (deleteTooltip) {
    actionButtons += `<button class="action-btn-link ${deleteClass}" title="${deleteTooltip}" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;"><i class="fa-solid fa-trash"></i> Delete</button>`;
  }
  if (canCWReq && !isPending && !isDraft) {
    actionButtons += `<button class="action-btn-link req-delete-cw-btn" title="Request deletion from uploader" style="background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;"><i class="fa-solid fa-paper-plane"></i> Request Delete from Uploader</button>`;
  }
  card.innerHTML = `
    <div class="doc-body-details">
      <h3>${doc.title} ${isDraft ? '<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-left:4px;">DRAFT</span>' : ''} ${isPending ? '<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-left:4px;">PENDING</span>' : ''}</h3>
      <p>Category: ${doc.category} ${doc.pageCount ? `• ${doc.pageCount} pages` : ''}</p>
      ${doc.year ? `<p>Session: ${doc.year}</p>` : ''}
      ${doc.semester ? `<p>Semester: ${doc.semester}</p>` : ''}
      ${doc.branch ? `<p>Branch: ${doc.branch}</p>` : ''}
      ${doc.officialDocType ? `<p>Doc Type: ${doc.officialDocType}</p>` : ''}
      ${doc.paperType ? `<p>Type: ${doc.paperType}</p>` : ''}
      ${doc.department ? `<p>Department: ${doc.department}</p>` : ''}
      ${doc.docDate ? `<p>Date: ${doc.docDate}</p>` : ''}
      ${doc.uploadedByName || doc.uploadedBy ? `<p>Uploaded By: ${doc.uploadedByName || doc.uploadedBy}</p>` : ''}
      ${approvalInfo}
      ${rejectionInfo}
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${pillsHtml}</div>
    </div>
    <div class="doc-action-zone" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${actionButtons}
    </div>
  `;
  container.appendChild(card);
  card.querySelector('.view-btn').addEventListener('click', () => openPreviewModal(doc.title, doc.fileUrl, doc._id));
  const getBtn = card.querySelector('.get-btn');
  if (getBtn) getBtn.addEventListener('click', () => logHistory(doc.title, doc._id));
  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) editBtn.addEventListener('click', () => openEditDocumentModal(doc));
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => showDeleteResourceConfirm(doc, (reason) => deleteDocument(doc._id, reason)));
  const reqDeleteBtn = card.querySelector('.req-delete-btn');
  if (reqDeleteBtn) reqDeleteBtn.addEventListener('click', () => showRequestDeleteModal(doc));
  const reqDeleteCWBtn = card.querySelector('.req-delete-cw-btn');
  if (reqDeleteCWBtn) reqDeleteCWBtn.addEventListener('click', () => showRequestDeleteModal(doc));
  const publishBtn = card.querySelector('.publish-btn');
  if (publishBtn) publishBtn.addEventListener('click', () => publishDraft(doc._id));
  const approveBtn = card.querySelector('.approve-btn');
  if (approveBtn) approveBtn.addEventListener('click', () => approveDocument(doc._id));
  const rejectBtn = card.querySelector('.reject-btn');
  if (rejectBtn) rejectBtn.addEventListener('click', () => rejectDocument(doc._id));
}

async function fetchDocuments(query = "") {
  if (isLoading) return;
  isLoading = true;
  const isDraftView = currentSelectedCategory === "drafts";
  const isPendingView = currentSelectedCategory === "pending_approval";

  if (!activeUserEmail || !authToken) {
    if (resultCount) resultCount.textContent = `0 items ready`;
    if (resultsGrid) {
      const documentCards = resultsGrid.querySelectorAll('.document-row-card');
      documentCards.forEach(card => card.remove());
    }
    isLoading = false;
    return;
  }

  if (isPendingView) {
    isLoading = false;
    await fetchPendingApprovals();
    return;
  }

  try {
    let url = `${API_URL}/documents/search?q=${encodeURIComponent(query)}`;
    if (currentSelectedCategory === "drafts") url += `&status=draft`;
    else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "recommended" && currentSelectedCategory !== "pending_approval" && currentSelectedCategory !== "deletion_requests") {
      url += `&category=${encodeURIComponent(currentSelectedCategory)}`;
    }
    if (currentSelectedCategory === "recommended" && currentUserBranch) {
      url += `&branch=${encodeURIComponent(currentUserBranch)}`;
      if (currentUserSemester) url += `&semester=${encodeURIComponent(currentUserSemester)}`;
    }
    if (isCollegeWideRole()) {
      if (currentSelectedDepartmentFilter && currentSelectedDepartmentFilter !== 'all') url += `&department=${encodeURIComponent(currentSelectedDepartmentFilter)}`;
      if (currentSelectedBranchFilter && currentSelectedBranchFilter !== 'all') url += `&branch=${encodeURIComponent(currentSelectedBranchFilter)}`;
    } else if (currentUserDepartment === DEPARTMENTS.CSE) {
      if (currentSelectedBranchFilter && currentSelectedBranchFilter !== 'all') url += `&branch=${encodeURIComponent(currentSelectedBranchFilter)}`;
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

    if (isDraftView) docs = docs.filter(doc => doc.status === 'draft');
    else if (currentSelectedCategory === "recommended" && currentUserBranch) {
      docs = docs.filter(doc => {
        const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
        const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
        return doc.category === "University Paper" && matchesBranch && matchesSem;
      });
    } else if (currentSelectedCategory !== "all" && currentSelectedCategory !== "recommended" && currentSelectedCategory !== "drafts" && currentSelectedCategory !== "pending_approval" && currentSelectedCategory !== "deletion_requests") {
      docs = docs.filter(doc => doc.category === currentSelectedCategory);
    }

    if (resultCount) {
      const count = docs.length;
      resultCount.textContent = `${count} item${count !== 1 ? 's' : ''} ready`;
    }
    if (!resultsGrid) { isLoading = false; return; }
    const documentCards = resultsGrid.querySelectorAll('.document-row-card');
    documentCards.forEach(card => card.remove());
    if (!isDraftView && !isPendingView) {
      const academicCards = resultsGrid.querySelectorAll('.classroom-card');
      academicCards.forEach(card => card.remove());
    }
    if (docs.length === 0) {
      const emptyMsg = document.createElement('span');
      emptyMsg.className = 'history-empty-state';
      if (isDraftView) emptyMsg.textContent = 'No drafts saved.';
      else if (isPendingView) emptyMsg.textContent = 'No documents pending approval.';
      else emptyMsg.textContent = query ? `No documents found matching "${query}"` : 'No documents available.';
      resultsGrid.appendChild(emptyMsg);
    }
    for (const doc of docs) {
      await renderDocumentCard(doc, resultsGrid, isPendingView);
    }
    if (resultsMeta) resultsMeta.classList.remove('hidden');
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
    removePendingApprovalTab();
    removeDeletionRequestsTab();
  } else if (isUserLoggedIn) {
    updateRequestTabBadge(0);
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
        if (canManageDrafts()) fetchDrafts();
        if (canApproveDocuments()) fetchPendingApprovals();
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
});

window.addEventListener('click', (e) => {
  if (e.target === previewModal) {
    if (previewModal) previewModal.classList.add('hidden');
    if (previewContainer) previewContainer.innerHTML = '';
  }
  if (e.target === editPopup) {
    if (editPopup) editPopup.classList.add('hidden');
    editingDocId = null;
  }
  if (e.target === authModal) authModal.classList.add('hidden');
});