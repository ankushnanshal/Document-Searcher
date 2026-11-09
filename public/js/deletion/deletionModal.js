import { state } from '../state.js';
import { getRoleDisplay, COLLEGE_WIDE_ROLES, REQUEST_DELETE_ROLES } from '../constants.js';
import { getUploaderDisplay } from '../utils/helpers.js';
import { showNotification } from '../utils/notifications.js';
import { createDeletionRequest } from '../api/deletionRequests.js';
import { fetchDeletionRequests } from './deletionRequests.js';
import { fetchNotifications } from '../notifications/notifications.js';

export function showDeleteResourceConfirm(doc, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '6000';
  modal.innerHTML = `
    <div class="modal-glass-card delete-confirm-card" style="max-width: 500px;">
      <div class="modal-top-bar" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 12px;">
        <h3 style="color: #ef4444; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-trash-can"></i> Delete Resource
        </h3>
        <button class="modal-dismiss-icon" style="color: #94a3b8;">&times;</button>
      </div>
      <div style="padding: 16px 0; text-align: left;">
        <p style="color: #94a3b8; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Resource:</p>
        <p style="color: #f1f5f9; margin-bottom: 14px; font-size: 1rem; font-weight: 600;">${doc.title}</p>
        <p style="color: #94a3b8; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Original Uploader:</p>
        <p style="color: #a5b4fc; margin-bottom: 14px; font-size: 0.9rem; font-weight: 600;">${getUploaderDisplay(doc)}</p>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 4px;">You are deleting this resource as:</p>
        <p style="color: #fbbf24; font-size: 0.9rem; font-weight: 600; margin-bottom: 16px;">${getRoleDisplay(state.currentUserRole)}</p>
        <div class="input-block" style="text-align: left;">
          <label style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 6px; display: block;">Reason for deletion <span style="color: #ef4444;">*</span></label>
          <textarea class="delete-reason-input" placeholder="e.g., Outdated syllabus and replaced with the latest version." rows="3" style="width: 100%; background: rgba(11, 15, 27, 0.6); border: 1px solid var(--border-glass); padding: 12px 14px; border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; outline: none; resize: vertical; font-family: inherit;"></textarea>
          <p class="delete-error-msg" style="color: #ef4444; font-size: 0.8rem; margin-top: 6px; display: none;">Please provide a reason for deleting this resource.</p>
        </div>
        <p style="color: #94a3b8; font-size: 0.75rem; margin-top: 12px;">This reason will be permanently stored in the deletion audit history.</p>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border-glass);">
        <button class="del-cancel-btn form-action-trigger" style="background: rgba(255,255,255,0.08); padding: 10px 28px; font-size: 0.9rem; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);">Cancel</button>
        <button class="del-confirm-btn form-action-trigger" style="background: #ef4444; padding: 10px 28px; font-size: 0.9rem;">Delete Resource</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector('.modal-dismiss-icon');
  const cancelBtn = modal.querySelector('.del-cancel-btn');
  const confirmBtn = modal.querySelector('.del-confirm-btn');
  const reasonInput = modal.querySelector('.delete-reason-input');
  const errorMsg = modal.querySelector('.delete-error-msg');

  const close = () => {
    modal.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => modal.remove(), 180);
  };
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  reasonInput.addEventListener('input', () => {
    if (reasonInput.value.trim()) {
      errorMsg.style.display = 'none';
      reasonInput.style.borderColor = 'var(--border-glass)';
    }
  });

  confirmBtn.addEventListener('click', () => {
    const reason = reasonInput.value.trim();
    if (!reason) {
      errorMsg.style.display = 'block';
      reasonInput.style.borderColor = '#ef4444';
      reasonInput.focus();
      return;
    }
    close();
    setTimeout(() => onConfirm(reason), 200);
  });
  reasonInput.focus();
}

export function showRequestDeleteModal(doc) {
  const isCollegeWide = COLLEGE_WIDE_ROLES.includes(state.currentUserRole);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '6000';
  let targetOptions = '';
  if (isCollegeWide) {
    targetOptions = `
      <option value="UPLOADER_APPROVAL">Original Uploader (${doc.uploadedByName || doc.uploadedBy})</option>
    `;
  } else if (REQUEST_DELETE_ROLES.includes(state.currentUserRole)) {
    targetOptions = `
      <option value="UPLOADER_APPROVAL">Original Uploader (${doc.uploadedByName || doc.uploadedBy})</option>
      <option value="HIGHER_AUTHORITY_APPROVAL">Dean / Director / Admin</option>
    `;
  }
  modal.innerHTML = `
    <div class="modal-glass-card" style="max-width: 560px;">
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
          <label style="color: #94a3b8; font-size: 0.8rem;">Resource</label>
          <input type="text" value="${doc.title}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Original Uploader</label>
          <input type="text" value="${doc.uploadedByName || doc.uploadedBy}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Requested By</label>
          <input type="text" value="${getRoleDisplay(state.currentUserRole)}" disabled style="width: 100%; background: rgba(11, 15, 27, 0.4); border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">
        </div>
        <div class="input-block">
          <label style="color: #94a3b8; font-size: 0.8rem;">Send request to</label>
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
          <p class="req-error-msg" style="color: #ef4444; font-size: 0.8rem; margin-top: 6px; display: none;">Reason for deletion is mandatory.</p>
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
  const errorMsg = modal.querySelector('.req-error-msg');
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

  commentArea.addEventListener('input', () => {
    if (commentArea.value.trim()) {
      errorMsg.style.display = 'none';
      commentArea.style.borderColor = 'var(--border-glass)';
    }
  });

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
      errorMsg.style.display = 'block';
      commentArea.style.borderColor = '#ef4444';
      commentArea.focus();
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
      const { response, data } = await createDeletionRequest({
        resourceId: doc._id,
        comment,
        targetAuthority,
        requestType
      });
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