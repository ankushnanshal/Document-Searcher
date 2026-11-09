import { state } from '../state.js';
import { fetchNotificationsApi, fetchUnreadCount } from '../api/notifications.js';
import { updateNotificationBadge } from '../utils/notifications.js';

export async function fetchNotifications() {
  if (!state.isUserLoggedIn) return;
  try {
    const response = await fetchNotificationsApi();
    if (response.ok) {
      await response.json();
      const unreadResp = await fetchUnreadCount();
      if (unreadResp.ok) {
        const data = await unreadResp.json();
        updateNotificationBadge(data.count);
      }
    }
  } catch (e) {
    console.error("Error fetching notifications:", e);
  }
}