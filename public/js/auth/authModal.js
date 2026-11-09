import { state } from '../state.js';
import { els, setAvatarImage } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import { fetchMe, updateAvatar } from '../api/auth.js';
import { handleUserSession, handleLogout } from './session.js';
import { API_URL } from '../config.js';

export function setupAuthModal() {
  const emailInput = els.email;
  const studentFields = els.studentFields;

  if (emailInput && studentFields) {
    const toggleStudentFields = () => {
      const email = emailInput.value.trim().toLowerCase();
      const isAdminEmail = email === 'ankushadmin@gmail.com';
      if (state.currentMode === 'signup' && !isAdminEmail && email !== '') {
        studentFields.classList.remove('hidden');
      } else {
        studentFields.classList.add('hidden');
      }
    };
    emailInput.addEventListener('input', toggleStudentFields);
  }

  if (els.closeModalBtn && els.authModal) {
    els.closeModalBtn.addEventListener('click', () => els.authModal.classList.add('hidden'));
  }

  if (els.modalAvatarPreview && els.modalAvatarInput) {
    els.modalAvatarPreview.addEventListener('click', () => els.modalAvatarInput.click());
    els.modalAvatarInput.addEventListener('change', (e) => {
      if (!e.target.files[0]) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        state.tempSignupAvatarBase64 = event.target.result;
        setAvatarImage(els.modalAvatarPreview, state.tempSignupAvatarBase64);
      };
      reader.readAsDataURL(e.target.files[0]);
    });
  }

  if (els.updateProfileBtn && els.profileImageInput) {
    els.updateProfileBtn.addEventListener('click', () => els.profileImageInput.click());
  }

  if (els.profileImageInput) {
    els.profileImageInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const { response, data } = await updateAvatar(event.target.result);
          if (response.ok) {
            setAvatarImage(els.avatarContainer, data.avatar);
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

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', handleLogout);
  }

  if (els.authForm) {
    els.authForm.addEventListener('submit', async (e) => {
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
      if (state.currentMode === 'signup') {
        payload.name = usernameEl ? usernameEl.value : '';
        payload.avatar = state.tempSignupAvatarBase64;
        const isAdminEmail = email === 'ankushadmin@gmail.com';
        if (!isAdminEmail) {
          payload.year = regYearEl ? regYearEl.value : '';
          payload.semester = regSemEl ? regSemEl.value : '';
          payload.branch = regBranchEl ? regBranchEl.value : '';
        }
      }
      try {
        const response = await fetch(`${API_URL}/auth/${state.currentMode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
          if (data.token) {
            state.authToken = data.token;
            localStorage.setItem('token', data.token);
          }
          handleUserSession(data);
          if (els.authModal) els.authModal.classList.add('hidden');
          els.authForm.reset();
        } else {
          showNotification(data.message || "Authentication failed.", "error");
        }
      } catch (err) {
        showNotification("Connection error. Is the backend server running?", "error");
      }
    });
  }

  const goSignInBtn = document.getElementById('goSignInBtn');
  if (goSignInBtn) {
    goSignInBtn.addEventListener('click', () => {
      state.currentMode = 'signin';
      if (els.modalTitle) els.modalTitle.textContent = 'Account Login';
      if (els.nameField) els.nameField.classList.add('hidden');
      if (els.modalAvatarBlock) els.modalAvatarBlock.classList.add('hidden');
      if (els.studentFields) els.studentFields.classList.add('hidden');
      const usernameInput = document.getElementById('username');
      if (usernameInput) usernameInput.removeAttribute('required');
      if (els.submitAuthBtn) els.submitAuthBtn.textContent = 'Sign In';
      if (els.authModal) els.authModal.classList.remove('hidden');
    });
  }

  const goSignUpBtn = document.getElementById('goSignUpBtn');
  if (goSignUpBtn) {
    goSignUpBtn.addEventListener('click', () => {
      state.currentMode = 'signup';
      if (els.modalTitle) els.modalTitle.textContent = 'Create Account';
      if (els.nameField) els.nameField.classList.remove('hidden');
      if (els.modalAvatarBlock) els.modalAvatarBlock.classList.remove('hidden');
      const usernameInput = document.getElementById('username');
      if (usernameInput) usernameInput.setAttribute('required', 'required');
      if (els.submitAuthBtn) els.submitAuthBtn.textContent = 'Register';
      if (els.authModal) els.authModal.classList.remove('hidden');
      if (els.email) {
        const email = els.email.value.trim().toLowerCase();
        if (email !== '' && email !== 'ankushadmin@gmail.com') els.studentFields.classList.remove('hidden');
      }
    });
  }

  if (els.profileMenuBtn && els.authDropdown) {
    els.profileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.authDropdown.classList.toggle('hidden');
      if (!els.authDropdown.classList.contains('hidden') && state.isUserLoggedIn) {
        import('../notifications/notifications.js').then(m => m.fetchNotifications());
      }
    });
    document.addEventListener('click', () => els.authDropdown.classList.add('hidden'));
    els.authDropdown.addEventListener('click', (e) => e.stopPropagation());
  }
}