import { showNotification } from '../utils/notifications.js';

export function showInputModal(title, placeholder, defaultValue, onSubmit, requireValue) {
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