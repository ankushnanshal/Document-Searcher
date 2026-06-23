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

const mainDashboardView = document.getElementById('mainDashboardView');
const historyPageView = document.getElementById('historyPageView');
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

const API_URL = "http://localhost:5000/api";
let currentMode = 'signin';
let activeUserEmail = null;
let currentUserRole = 'student';
let currentUserYear = null;
let currentUserSemester = null;
let currentUserBranch = null;
let tempSignupAvatarBase64 = "";
let pendingUploadFile = null;
let currentSelectedCategory = "all";
let cachedDocuments = [];
let authToken = localStorage.getItem('token') || null;

const userSession = {
    role: "admin"
};

function showNotification(message) {
    if (!notificationContainer) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    notificationContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function setDefaultAvatar(container) { 
    if (container) container.innerHTML = `<i class="fa-solid fa-user"></i>`; 
}

function setAvatarImage(container, base64Str) { 
    if (container) container.innerHTML = `<img src="${base64Str}" alt="Profile">`; 
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
            docBranchSelect.value = "CSE-(R)"; 
        }
    }
}

if (docSemSelect) {
    docSemSelect.addEventListener('change', handleSemesterBranchLogic);
}

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
            if (email !== '' && email !== 'ankushadmin@gmail.com') {
                studentFields.classList.remove('hidden');
            }
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
        currentUserYear = null;
        currentUserSemester = null;
        currentUserBranch = null;
        cachedDocuments = [];
        authToken = null;
        localStorage.removeItem('token');
        if (workspaceName) workspaceName.textContent = 'My Workspace';
        if (authorizedActionsBlock) authorizedActionsBlock.classList.add('hidden');
        if (uploadDocBtn) uploadDocBtn.classList.add('hidden');
        if (recommendedTab) recommendedTab.classList.add('hidden');
        if (searchSuggestions) searchSuggestions.classList.add('hidden');
        setDefaultAvatar(avatarContainer);
        const goSignInBtnReal = document.getElementById('goSignInBtn');
        const goSignUpBtnReal = document.getElementById('goSignUpBtn');
        if (goSignInBtnReal) goSignInBtnReal.classList.remove('hidden');
        if (goSignUpBtnReal) goSignUpBtnReal.classList.remove('hidden');
        filterTabs.forEach(t => t.classList.remove('active'));
        if (filterTabs[0]) filterTabs[0].classList.add('active');
        currentSelectedCategory = "all";
        if (mainDashboardView) mainDashboardView.classList.remove('hidden');
        if (historyPageView) historyPageView.classList.add('hidden');
        fetchDocuments();
        renderActionButtons();
    });
}

if (uploadDocBtn && universalDocumentInput) {
    uploadDocBtn.addEventListener('click', () => {
        if (docCategorySelect) {
            docCategorySelect.value = "";
        }
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
        
        universalDocumentInput.click();
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
                    body: JSON.stringify({ email: activeUserEmail, avatar: event.target.result })
                });
                const data = await response.json();
                if(response.ok) { 
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
        if (uploadPopup) {
            uploadPopup.classList.remove('hidden');
        }
    });
}

if (closeUploadPopupBtn) {
    closeUploadPopupBtn.addEventListener('click', () => {
        if (uploadPopup) uploadPopup.classList.add('hidden');
        pendingUploadFile = null;
        if (universalDocumentInput) universalDocumentInput.value = "";
    });
}

if (confirmUploadBtn) {
    confirmUploadBtn.addEventListener('click', async () => {
        if (!pendingUploadFile) return;

        const categorySelect = document.getElementById('docCategorySelect');
        const docDateInput = document.getElementById('docDateInput');
        const docSessionSelect = document.getElementById('docSessionSelect');
        const docTypeSelect = document.getElementById('docTypeSelect');
        const officialDocTypeSelect = document.getElementById('officialDocTypeSelect');

        if (!categorySelect || !categorySelect.value) {
            showNotification("Please select a resource category.");
            return;
        }

        const category = categorySelect.value;
        let finalCategory = category;
        if (category === 'Official') finalCategory = 'Official Update';
        if (category === 'University') finalCategory = 'University Paper';

        let selectedDate = docDateInput ? docDateInput.value : "";
        if (!selectedDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            selectedDate = `${year}-${month}-${day}`;
        }

        const formData = new FormData();
        formData.append('file', pendingUploadFile);
        formData.append('title', pendingUploadFile.name);
        formData.append('category', finalCategory);
        formData.append('docDate', selectedDate);

        if (finalCategory === 'University Paper') {
            formData.append('year', docSessionSelect ? docSessionSelect.value : "");
            formData.append('semester', docSemSelect ? docSemSelect.value : "");
            formData.append('branch', docBranchSelect ? docBranchSelect.value : "");
            formData.append('paperType', docTypeSelect ? docTypeSelect.value : "");
        } else if (finalCategory === 'Official Update') {
            formData.append('officialDocType', officialDocTypeSelect ? officialDocTypeSelect.value : "");
        }

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
                showNotification("Asset saved successfully!");
                fetchDocuments(searchInput ? searchInput.value.trim() : "");
                if (uploadPopup) uploadPopup.classList.add('hidden');
                pendingUploadFile = null;
                if (universalDocumentInput) universalDocumentInput.value = "";
            } else {
                showNotification(data.message);
            }
        } catch (err) {
            showNotification("Network error loading document.");
        }
    });
}

function openEditDocumentModal(doc) {
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
        if (editDocBranchSelect) editDocBranchSelect.value = doc.branch || 'All Branches';
        if (editDocTypeSelect) editDocTypeSelect.value = doc.paperType || 'End Sem';
    } else {
        if (editOfficialDocTypeSelect) editOfficialDocTypeSelect.value = doc.officialDocType || 'Notice';
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

        const category = editDocCategorySelect ? editDocCategorySelect.value : 'University';
        const finalCategory = category === 'Official' ? 'Official Update' : 'University Paper';

        const payload = {
            title: editTitleInput ? editTitleInput.value.trim() : '',
            category: finalCategory,
            docDate: editDocDateInput ? editDocDateInput.value : ''
        };

        if (finalCategory === 'University Paper') {
            payload.year = editDocSessionSelect ? editDocSessionSelect.value : '';
            payload.semester = editDocSemSelect ? editDocSemSelect.value : '';
            payload.branch = editDocBranchSelect ? editDocBranchSelect.value : '';
            payload.paperType = editDocTypeSelect ? editDocTypeSelect.value : '';
            payload.officialDocType = '';
        } else {
            payload.officialDocType = editOfficialDocTypeSelect ? editOfficialDocTypeSelect.value : '';
            payload.year = '';
            payload.semester = '';
            payload.branch = '';
            payload.paperType = '';
        }

        if (!payload.title) {
            showNotification("Title cannot be empty.");
            return;
        }

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
                showNotification("Document updated successfully!");
                if (editPopup) editPopup.classList.add('hidden');
                editingDocId = null;
                fetchDocuments(searchInput ? searchInput.value.trim() : "");
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
            if(response.ok) { 
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
    activeUserEmail = user.email;
    currentUserRole = user.role;
    currentUserYear = user.year;
    currentUserSemester = user.semester;
    currentUserBranch = user.branch;
    if (workspaceName) workspaceName.textContent = user.name;
    if (authorizedActionsBlock) authorizedActionsBlock.classList.remove('hidden');
    
    const signInBtn = document.getElementById('goSignInBtn');
    const signUpBtn = document.getElementById('goSignUpBtn');
    if (signInBtn) signInBtn.classList.add('hidden');
    if (signUpBtn) signUpBtn.classList.add('hidden');
    
    if (uploadDocBtn) {
        if (user.role === 'admin') {
            uploadDocBtn.classList.remove('hidden');
        }
    }
    
    if (academicActionBtn) {
        if (user.role === 'admin' && currentSelectedCategory === "Academic Resource") {
            academicActionBtn.classList.remove('hidden-vault-element');
        } else {
            academicActionBtn.classList.add('hidden-vault-element');
        }
    }
    
    if (recommendedTab) {
        if (user.role === 'student' && user.branch) {
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
    userSession.role = user.role;
    renderActionButtons();
}

async function logHistory(title) {
    if (!activeUserEmail) return;
    try {
        await fetch(`${API_URL}/history`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({ title: title })
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

        if (historyCountText) {
            historyCountText.textContent = `${data.length} items recorded`;
        }

        if (fullHistoryContainer) {
            fullHistoryContainer.innerHTML = data.length === 0 ? '<span class="history-empty-state">No download or viewing history found.</span>' : '';
            data.forEach(item => {
                const row = document.createElement('div');
                row.className = 'document-row-card';
                row.innerHTML = `
                    <div class="doc-body-details">
                        <h3>${item.title}</h3>
                        <p>Viewed on: ${new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                `;
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
        if (mainDashboardView) mainDashboardView.classList.remove('hidden');
    });
}

function openPreviewModal(title, fileUrl) {
    logHistory(title);
    if (!previewModal || !previewContainer || !previewModalTitle) return;

    previewModalTitle.textContent = title;
    previewContainer.innerHTML = '';
    previewModal.classList.remove('hidden');
    previewModal.style.setProperty('display', 'flex', 'important');

    if (!fileUrl) {
        const pre = document.createElement('pre');
        pre.textContent = "Preview unavailable for this asset.";
        pre.style.color = '#94a3b8';
        pre.style.display = 'block';
        previewContainer.appendChild(pre);
        return;
    }

    const lowerTitle = title.toLowerCase();
    if (lowerTitle.endsWith('.pdf')) {
        const iframe = document.createElement('iframe');
        iframe.src = fileUrl;
        iframe.style.width = '100%';
        iframe.style.height = '70vh';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.style.display = 'block';
        previewContainer.appendChild(iframe);
    } else if (lowerTitle.endsWith('.png') || lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg') || lowerTitle.endsWith('.gif') || lowerTitle.endsWith('.webp')) {
        const img = document.createElement('img');
        img.src = fileUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        previewContainer.appendChild(img);
    } else if (lowerTitle.endsWith('.txt') || lowerTitle.endsWith('.csv') || lowerTitle.endsWith('.json')) {
        const iframe = document.createElement('iframe');
        iframe.src = fileUrl;
        iframe.style.width = '100%';
        iframe.style.height = '70vh';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.style.backgroundColor = '#ffffff';
        iframe.style.display = 'block';
        previewContainer.appendChild(iframe);
    } else {
        const wrapper = document.createElement('div');
        wrapper.style.color = '#94a3b8';
        wrapper.style.padding = '24px';
        wrapper.style.textAlign = 'center';
        wrapper.innerHTML = `Preview not supported for this file type.<br><a href="${fileUrl}" target="_blank" rel="noopener" style="color:#a5b4fc;">Open file in new tab</a>`;
        previewContainer.appendChild(wrapper);
    }
}

if (closePreviewModalBtn) {
    closePreviewModalBtn.addEventListener('click', () => {
        if (previewModal) {
            previewModal.classList.add('hidden');
            previewModal.style.setProperty('display', 'none', 'important');
        }
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
            if (currentSelectedCategory === "recommended") {
                if (currentUserBranch) {
                    const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
                    const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
                    return doc.category === "University Paper" && matchesBranch && matchesSem;
                }
                return false;
            } else if (currentSelectedCategory !== "all") {
                return doc.category === currentSelectedCategory;
            }
            return true;
        });

        filtered = filtered.filter(doc => doc.title.toLowerCase().includes(query));

        if (filtered.length === 0) {
            if (searchSuggestions) searchSuggestions.classList.add('hidden');
            return;
        }

        if (searchSuggestions) {
            searchSuggestions.innerHTML = '';
            filtered.forEach(doc => {
                const row = document.createElement('div');
                row.className = 'suggestion-item';
                row.innerHTML = `
                    <div class="suggestion-info">
                        <span class="suggestion-title">${doc.title}</span>
                        <span class="suggestion-meta">${doc.category} ${doc.branch ? `• ${doc.branch}` : ''}</span>
                    </div>
                    <div class="suggestion-actions">
                        <button class="suggestion-view-btn" style="background:none; border:none; color:#a5b4fc; cursor:pointer; margin-right:8px;"><i class="fa-solid fa-eye"></i></button>
                        <a href="${doc.fileUrl}" target="_blank" rel="noopener" download="${doc.title}" class="suggestion-action-btn"><i class="fa-solid fa-download"></i></a>
                    </div>
                `;
                row.querySelector('.suggestion-view-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openPreviewModal(doc.title, doc.fileUrl);
                });
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.suggestion-action-btn') || e.target.closest('.suggestion-view-btn')) return;
                    searchInput.value = doc.title;
                    fetchDocuments(doc.title);
                    searchSuggestions.classList.add('hidden');
                });
                searchSuggestions.appendChild(row);
            });
            searchSuggestions.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (searchSuggestions && !e.target.closest('.search-container')) {
            searchSuggestions.classList.add('hidden');
        }
    });
}

filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSelectedCategory = tab.getAttribute('data-category');
        
        const isAdmin = userSession.role === 'admin';

        if (currentSelectedCategory === "Academic Resource" && isAdmin) {
            if (academicActionBtn) academicActionBtn.classList.remove('hidden-vault-element');
        } else {
            if (academicActionBtn) academicActionBtn.classList.add('hidden-vault-element');
            if (academicModal) academicModal.classList.add('hidden');
        }

        fetchDocuments(searchInput ? searchInput.value.trim() : "");
        if (searchSuggestions) searchSuggestions.classList.add('hidden');
    });
});

async function deleteDocument(id) {
    try {
        const response = await fetch(`${API_URL}/documents/${id}`, { 
            method: "DELETE", 
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        if(response.ok) { 
            showNotification("Removed successfully"); 
            fetchDocuments(searchInput ? searchInput.value.trim() : ""); 
        } else {
            showNotification(data.message);
        }
    } catch (err) {
        showNotification("Failed to send drop request.");
    }
}

async function fetchDocuments(query = "") {
    if (!activeUserEmail || !authToken) {
        if (resultCount) resultCount.textContent = `0 items ready`;
        if (resultsGrid) resultsGrid.innerHTML = '<span class="history-empty-state">Please login to search and access resources.</span>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/documents?search=${encodeURIComponent(query)}&limit=200`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (!response.ok) {
            if (resultCount) resultCount.textContent = `0 items ready`;
            if (resultsGrid) resultsGrid.innerHTML = '<span class="history-empty-state">Unable to load resources.</span>';
            return;
        }
        const responseData = await response.json();
        let docs = Array.isArray(responseData) ? responseData : (responseData.docs || []);

        if (query === "") {
            cachedDocuments = docs;
        }

        if (currentSelectedCategory === "recommended") {
            if (currentUserBranch) {
                docs = docs.filter(doc => {
                    const matchesBranch = doc.branch === currentUserBranch || doc.branch === "All Branches";
                    const matchesSem = !currentUserSemester || String(doc.semester) === String(currentUserSemester);
                    return doc.category === "University Paper" && matchesBranch && matchesSem;
                });
            }
        } else if (currentSelectedCategory !== "all") {
            docs = docs.filter(doc => doc.category === currentSelectedCategory);
        }

        if (resultCount) resultCount.textContent = `${docs.length} items ready`;
        if (!resultsGrid) return;
        resultsGrid.innerHTML = docs.length === 0 ? '<span class="history-empty-state">No resources.</span>' : '';
        
        const isAdmin = currentUserRole === 'admin';

        docs.forEach((doc) => {
            const card = document.createElement('div');
            card.className = 'document-row-card';
            
            let pillsHtml = `<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.category || 'University Paper'}</span>`;
            if (doc.category === 'University Paper') {
                if (doc.branch) {
                    pillsHtml += `<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.branch}</span>`;
                }
                if (doc.semester) {
                    pillsHtml += `<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Semester ${doc.semester}</span>`;
                }
                if (doc.paperType) {
                    pillsHtml += `<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.paperType}</span>`;
                }
                if (doc.year) {
                    pillsHtml += `<span style="background: rgba(234, 179, 8, 0.15); color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Session: ${doc.year}</span>`;
                }
            } else {
                if (doc.officialDocType) {
                    pillsHtml += `<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${doc.officialDocType}</span>`;
                }
            }

            const hasFile = !!doc.fileUrl;

            card.innerHTML = `
                <div class="doc-body-details">
                    <h3>${doc.title}</h3>
                    <p>Category: ${doc.category}</p>
                    ${doc.category === 'University Paper' && doc.year ? `<p>Session: ${doc.year}</p>` : ''}
                    ${doc.category === 'University Paper' && doc.semester ? `<p>Semester: ${doc.semester}</p>` : ''}
                    ${doc.category === 'University Paper' && doc.branch ? `<p>Branch: ${doc.branch}</p>` : ''}
                    ${doc.category === 'University Paper' && doc.paperType ? `<p>Type: ${doc.paperType}</p>` : ''}
                    ${doc.category === 'Official Update' && doc.officialDocType ? `<p>Doc Type: ${doc.officialDocType}</p>` : ''}
                    ${doc.docDate ? `<p>Date: ${doc.docDate}</p>` : ''}
                    ${!hasFile ? `<p style="color:#ef4444; font-size:0.8rem;">File missing on storage — re-upload required.</p>` : ''}
                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${pillsHtml}
                    </div>
                </div>
                <div class="doc-action-zone" style="display: flex; align-items: center; gap: 8px;">
                    <button class="action-btn-link view-btn" style="background: rgba(99, 102, 241, 0.1); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.2); padding: 6px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.9rem; transition: background 0.2s;">View</button>
                    ${hasFile
                        ? `<a href="${doc.fileUrl}" target="_blank" rel="noopener" download="${doc.title}" class="action-btn-link get-btn" style="display: inline-flex; align-items: center; justify-content: center; background: var(--accent-gradient); color: #ffffff; padding: 6px 14px; border-radius: 6px; font-weight: 500; text-decoration: none; font-size: 0.9rem; transition: opacity 0.2s;">Get</a>`
                        : `<button class="action-btn-link" disabled style="background: rgba(148, 163, 184, 0.1); color: #64748b; border: 1px solid rgba(148, 163, 184, 0.2); padding: 6px 14px; border-radius: 6px; font-weight: 500; cursor: not-allowed; font-size: 0.9rem;">Get</button>`
                    }
                    ${isAdmin ? `<button class="action-btn-link edit-btn" title="Edit Resource" style="background: rgba(234, 179, 8, 0.1); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.2); padding: 6px 10px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.9rem; transition: background 0.2s;"><i class="fa-solid fa-pen"></i></button>` : ''}
                    ${isAdmin ? `<button class="action-btn-link" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px 14px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.9rem; transition: background 0.2s;" onclick="deleteDocument('${doc._id}')">Delete</button>` : ''}
                </div>
            `;
            
            card.querySelector('.view-btn').addEventListener('click', () => openPreviewModal(doc.title, doc.fileUrl));
            const getBtn = card.querySelector('.get-btn');
            if (getBtn) getBtn.addEventListener('click', () => logHistory(doc.title));
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) editBtn.addEventListener('click', () => openEditDocumentModal(doc));
            resultsGrid.appendChild(card);
        });

        if (academicActionBtn) {
            if (currentSelectedCategory === "Academic Resource" && userSession && userSession.role === 'admin') {
                academicActionBtn.classList.remove('hidden-vault-element');
            } else {
                academicActionBtn.classList.add('hidden-vault-element');
            }
        }

        if (currentSelectedCategory === "Academic Resource") {
            const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
            savedCards.forEach(cardData => {
                resultsGrid.insertAdjacentHTML('beforeend', generateCardHTML(cardData));
            });
        }
    } catch (err) {
        console.error("Error fetching documents:", err);
    }
} // <--- Added the missing closing curly brace for fetchDocuments here!

function renderActionButtons() {
    const adminButtons = document.querySelectorAll('.admin-only');
    if (userSession.role === 'admin') {
        adminButtons.forEach(button => {
            button.classList.remove('hidden');
        });
    } else {
        adminButtons.forEach(button => {
            button.classList.add('hidden');
        });
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    renderActionButtons();
    if (authToken) {
        try {
            const base64Url = authToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                localStorage.removeItem('token');
                authToken = null;
                fetchDocuments();
                return;
            }
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.ok) {
                const user = await response.json();
                handleUserSession(user);
            } else {
                localStorage.removeItem('token');
                authToken = null;
                fetchDocuments();
            }
        } catch (e) {
            localStorage.removeItem('token');
            authToken = null;
            fetchDocuments();
        }
    } else {
        fetchDocuments();
    }
});

if (academicActionBtn) {
    academicActionBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        academicModal.classList.remove('hidden');
    });
}

if (closeAcademicModalBtn) {
    closeAcademicModalBtn.addEventListener('click', () => {
        academicModal.classList.add('hidden');
    });
}

window.addEventListener('click', (e) => {
    if (e.target === academicModal) {
        academicModal.classList.add('hidden');
    }
});

function getAvatarColor(username) {
    if (!username || username.trim() === "") return '#4f46e5';
    let hash = 0;
    const name = username.trim();
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        const baselineValue = Math.floor((value % 120) + 80); 
        color += ('00' + baselineValue.toString(16)).substr(-2);
    }
    return color;
}

function generateCardHTML(data) {
    return `
        <div class="classroom-card" style="width: 300px; min-height: 280px; border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; position: relative; background: #fff; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);">
            <div class="card-header-banner ${data.chosenTheme}" style="position: relative; padding: 16px; min-height: 100px; color: white; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="banner-content" style="max-width: 70%;">
                    <h3 class="course-title" title="${data.subject}" style="margin: 0; font-size: 1.1rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: underline;">${data.subject.toUpperCase()}</h3>
                    <p class="course-subtitle" style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.9;">B.TECH | ${data.branch.toUpperCase()} | ${data.semester} SEM</p>
                </div>
                <p class="teacher-name" style="margin: 12px 0 0 0; font-size: 0.8rem; opacity: 0.9; text-transform: uppercase;">${data.teacher}</p>
                <button class="banner-options-btn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; cursor: pointer; font-size: 1rem;"><i class="fas fa-ellipsis-v"></i></button>
                
                <div class="card-avatar-container" style="position: absolute; right: 24px; bottom: -30px; z-index: 2;">
                    <div class="avatar-letter" style="background-color: ${data.avatarBgColor}; width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.75rem; font-weight: 400; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${data.firstLetter}
                    </div>
                </div>
            </div>
            
            <div class="card-body" style="flex-grow: 1; padding: 16px; background: white;"></div>
            
            <div class="card-footer" style="padding: 8px 16px; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 16px; align-items: center; background: white; min-height: 48px;">
                <div class="card-actions" style="display: flex; gap: 20px;">
                    <button class="action-btn" title="Open Assignment Book" style="background: none; border: none; color: #5f6368; cursor: pointer; font-size: 1.2rem;"><i class="far fa-id-badge"></i></button>
                    <button class="action-btn" title="Open Drive Folder" style="background: none; border: none; color: #5f6368; cursor: pointer; font-size: 1.2rem;"><i class="far fa-folder"></i></button>
                    <button class="action-btn" title="More Options" style="background: none; border: none; color: #5f6368; cursor: pointer; font-size: 1.2rem;"><i class="fas fa-ellipsis-v"></i></button>
                </div>
            </div>
        </div>
    `;
}

window.addEventListener('load', () => {
    const targetGrid = document.getElementById('resultsGrid');
    if (!targetGrid) return;
    
    const savedCards = JSON.parse(localStorage.getItem('academicCards')) || [];
    targetGrid.innerHTML = ''; 
    savedCards.forEach(cardData => {
        targetGrid.insertAdjacentHTML('beforeend', generateCardHTML(cardData));
    });
});

if (submitAcademicDetailsBtn) {
    submitAcademicDetailsBtn.addEventListener('click', (e) => {
        e.preventDefault();

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

        if (!subject || !teacher) {
            alert('Please fill out all fields.');
            return;
        }
        
        const firstLetter = teacher.charAt(0).toUpperCase() || '?';
        
        const avatarBgColor = (typeof getAvatarColor === 'function') 
            ? getAvatarColor(teacher) 
            : '#4f46e5'; 

        const bannerThemes = ['banner-blue', 'banner-teal', 'banner-slate'];
        const chosenTheme = bannerThemes[Math.floor(Math.random() * bannerThemes.length)];

        const newCard = {
            subject,
            branch,
            semester,
            teacher,
            firstLetter,
            avatarBgColor,
            chosenTheme
        };
        
        const currentCards = JSON.parse(localStorage.getItem('academicCards')) || [];
        currentCards.push(newCard);
        localStorage.setItem('academicCards', JSON.stringify(currentCards));
        
        const searchInputValue = searchInput ? searchInput.value.trim() : "";
        if (typeof fetchDocuments === 'function') {
            fetchDocuments(searchInputValue);
        } else {
            console.warn('fetchDocuments function is not defined.');
        }
        
        subjectInput.value = '';
        teacherInput.value = '';

        if (academicModal) {
            academicModal.classList.add('hidden');
        }
    });
}