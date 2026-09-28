// Storage and Event Dispatcher for Studio Activity & Notifications
// Tracks when a new song, new background image, or new color palette is added

const NOTIFICATIONS_STORAGE_KEY = 'musicly_studio_notifications';

// Purge any legacy seed notifications immediately on initialization
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(n => 
          n && 
          n.id !== 'notif-seed-1' && 
          n.id !== 'notif-seed-2' && 
          n.id !== 'notif-seed-3' &&
          n.title !== "Knockin' On Heaven's Door" &&
          n.title !== 'Nordic Coniferous Mist' &&
          n.title !== 'Ocean Aquamarine'
        );
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
  }
} catch (_err) {}

/**
 * Get all studio notifications (pure user/runtime updates, no persistent seed junk)
 */
export function getStudioNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any legacy dummy seeds
      const cleaned = parsed.filter(n => 
        n && 
        n.id !== 'notif-seed-1' && 
        n.id !== 'notif-seed-2' && 
        n.id !== 'notif-seed-3' &&
        n.title !== "Knockin' On Heaven's Door" &&
        n.title !== 'Nordic Coniferous Mist' &&
        n.title !== 'Ocean Aquamarine'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return [];
  } catch (err) {
    console.warn('Error reading studio notifications:', err);
    return [];
  }
}

/**
 * Save notification array to localStorage and emit cross-component change event
 */
function saveNotificationsAndDispatch(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.warn('Failed to save studio notifications:', err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly:studio-notification-change', {
      detail: { notifications }
    }));
  }
}

/**
 * Add a new notification (for new song, new bg image, or new color palette)
 */
export function addStudioNotification({ type, title, message, meta = {} }) {
  const current = getStudioNotifications();
  const newNotif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: type || 'system', // 'song' | 'background' | 'theme' | 'system'
    title: title || 'Studio Update',
    message: message || 'New changes have been made.',
    timestamp: Date.now(),
    read: false,
    meta
  };

  const updated = [newNotif, ...current].slice(0, 50); // keep up to 50
  saveNotificationsAndDispatch(updated);
  return newNotif;
}

/**
 * Mark all notifications as read
 */
export function markAllStudioNotificationsAsRead() {
  const current = getStudioNotifications();
  const updated = current.map(item => ({ ...item, read: true }));
  saveNotificationsAndDispatch(updated);
  return updated;
}

/**
 * Mark a single notification as read
 */
export function markStudioNotificationAsRead(id) {
  const current = getStudioNotifications();
  const updated = current.map(item => item.id === id ? { ...item, read: true } : item);
  saveNotificationsAndDispatch(updated);
  return updated;
}

/**
 * Remove a single notification
 */
export function removeStudioNotification(id) {
  const current = getStudioNotifications();
  const updated = current.filter(item => item.id !== id);
  saveNotificationsAndDispatch(updated);
  return updated;
}

/**
 * Clear all notifications
 */
export function clearAllStudioNotifications() {
  saveNotificationsAndDispatch([]);
}

/**
 * Get count of unread notifications
 */
export function getUnreadStudioNotificationCount() {
  const list = getStudioNotifications();
  return list.filter(item => !item.read).length;
}
