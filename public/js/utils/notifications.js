import { els } from './dom.js';

export function showNotification(message, type) {
  if (!els['notification-container']) { alert(message); return; }
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.borderLeftColor = '#ef4444';
  if (type === 'success') toast.style.borderLeftColor = '#4ade80';
  toast.style.borderLeft = '3px solid #6366f1';
  toast.innerText = message;
  els['notification-container'].appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

export function updateNotificationBadge(count) {
  let badge = document.getElementById('notificationBadge');
  const wrapper = els.profileMenuBtn || document.querySelector('.auth-wrapper');
  if (!wrapper) return;
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'notificationBadge';
      badge.style.cssText = 'position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 0.65rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; z-index: 10;';
      wrapper.style.position = 'relative';
      wrapper.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else if (badge) {
    badge.style.display = 'none';
  }
}