import { apiFetch } from './client.js';

export async function fetchNotificationsApi() {
  return apiFetch('/notifications');
}

export async function fetchUnreadCount() {
  return apiFetch('/notifications/unread-count');
}