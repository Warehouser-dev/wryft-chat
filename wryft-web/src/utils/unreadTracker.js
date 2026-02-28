// Unread message tracking
import { updateFaviconFromUnreads } from './faviconBadge';
import { setTauriBadgeCount } from './tauriNotifications';

const UNREAD_KEY = 'unread_messages';
const MENTIONS_KEY = 'unread_mentions';

// Get unread counts from localStorage
export const getUnreadCounts = () => {
  try {
    const stored = localStorage.getItem(UNREAD_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Get mention counts from localStorage
export const getMentionCounts = () => {
  try {
    const stored = localStorage.getItem(MENTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save unread counts
const saveUnreadCounts = (counts) => {
  localStorage.setItem(UNREAD_KEY, JSON.stringify(counts));
  // Update favicon badge
  const mentions = getMentionCounts();
  updateFaviconFromUnreads(counts, mentions);
  
  // Update Tauri badge count (macOS dock badge) - safe to call in web mode
  const totalUnread = Object.values(counts).reduce((sum, count) => sum + count, 0);
  setTauriBadgeCount(totalUnread).catch(() => {
    // Silently fail in web mode
  });
};

// Save mention counts
const saveMentionCounts = (counts) => {
  localStorage.setItem(MENTIONS_KEY, JSON.stringify(counts));
  // Update favicon badge
  const unreads = getUnreadCounts();
  updateFaviconFromUnreads(unreads, counts);
};

// Add unread message to a channel
export const addUnreadMessage = (channelKey, isMention = false) => {
  const unreads = getUnreadCounts();
  unreads[channelKey] = (unreads[channelKey] || 0) + 1;
  saveUnreadCounts(unreads);

  console.log(`➕ Added unread to ${channelKey}, total: ${unreads[channelKey]}, mention: ${isMention}`);

  if (isMention) {
    const mentions = getMentionCounts();
    mentions[channelKey] = (mentions[channelKey] || 0) + 1;
    saveMentionCounts(mentions);
    console.log(`🔔 Added mention to ${channelKey}, total: ${mentions[channelKey]}`);
  }

  // Dispatch event so components can update
  window.dispatchEvent(new CustomEvent('unreadUpdate', { detail: { channelKey, isMention } }));
};

// Clear unread messages for a channel
export const clearUnreadMessages = (channelKey) => {
  const unreads = getUnreadCounts();
  const mentions = getMentionCounts();
  
  delete unreads[channelKey];
  delete mentions[channelKey];
  
  saveUnreadCounts(unreads);
  saveMentionCounts(mentions);

  // Dispatch event
  window.dispatchEvent(new CustomEvent('unreadUpdate', { detail: { channelKey } }));
};

// Get unread count for a specific channel
export const getUnreadCount = (channelKey) => {
  const unreads = getUnreadCounts();
  return unreads[channelKey] || 0;
};

// Get mention count for a specific channel
export const getMentionCount = (channelKey) => {
  const mentions = getMentionCounts();
  return mentions[channelKey] || 0;
};

// Get total unread count for a server
export const getServerUnreadCount = (serverId) => {
  const unreads = getUnreadCounts();
  let total = 0;
  
  Object.keys(unreads).forEach(key => {
    if (key.startsWith(`${serverId}-`)) {
      total += unreads[key];
    }
  });
  
  return total;
};

// Get total mention count for a server
export const getServerMentionCount = (serverId) => {
  const mentions = getMentionCounts();
  let total = 0;
  
  Object.keys(mentions).forEach(key => {
    if (key.startsWith(`${serverId}-`)) {
      total += mentions[key];
    }
  });
  
  return total;
};

// Get total DM unread count
export const getDMUnreadCount = () => {
  const unreads = getUnreadCounts();
  let total = 0;
  
  Object.keys(unreads).forEach(key => {
    if (key.startsWith('dm-')) {
      total += unreads[key];
    }
  });
  
  return total;
};

// Flash the page title with unread count
let titleInterval = null;
let originalTitle = document.title;

export const startTitleFlash = (count) => {
  if (titleInterval) return; // Already flashing
  
  originalTitle = document.title;
  let showCount = true;
  
  titleInterval = setInterval(() => {
    if (showCount) {
      document.title = `(${count}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
    showCount = !showCount;
  }, 1000);
};

export const stopTitleFlash = () => {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
    document.title = originalTitle;
  }
};

// Update title flash count
export const updateTitleFlash = () => {
  const unreads = getUnreadCounts();
  const totalUnread = Object.values(unreads).reduce((sum, count) => sum + count, 0);
  
  if (totalUnread > 0 && (document.hidden || !document.hasFocus())) {
    startTitleFlash(totalUnread);
  } else {
    stopTitleFlash();
  }
};

// Listen for visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', updateTitleFlash);
  window.addEventListener('focus', updateTitleFlash);
  window.addEventListener('blur', updateTitleFlash);
}
