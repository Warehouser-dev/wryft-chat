// Notification utility for desktop notifications

class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
    this.enabled = false;
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (this.permission === 'granted') {
      this.enabled = true;
      return true;
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.enabled = permission === 'granted';
      return this.enabled;
    }

    return false;
  }

  showNotification(title, options = {}) {
    if (!this.enabled || this.permission !== 'granted') {
      return null;
    }

    // Don't show notification if window is focused
    if (document.hasFocus()) {
      return null;
    }

    const notification = new Notification(title, {
      icon: '/wryft-logo.png',
      badge: '/wryft-logo.png',
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }

  showMessageNotification(message, channelName, onClick) {
    const notification = this.showNotification(
      `${message.author} in ${channelName}`,
      {
        body: message.text,
        tag: `message-${message.id}`,
        requireInteraction: false,
      }
    );

    if (notification && onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }

  showDMNotification(message, username, onClick) {
    const notification = this.showNotification(
      `${username}`,
      {
        body: message.text,
        tag: `dm-${message.id}`,
        requireInteraction: false,
      }
    );

    if (notification && onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }

  showMentionNotification(message, channelName, onClick) {
    const notification = this.showNotification(
      `${message.author} mentioned you in ${channelName}`,
      {
        body: message.text,
        tag: `mention-${message.id}`,
        requireInteraction: true,
      }
    );

    if (notification && onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }

  showFriendRequestNotification(username, onClick) {
    const notification = this.showNotification(
      'New Friend Request',
      {
        body: `${username} sent you a friend request`,
        tag: 'friend-request',
        requireInteraction: false,
      }
    );

    if (notification && onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }

  isEnabled() {
    return this.enabled && this.permission === 'granted';
  }

  getPermission() {
    return this.permission;
  }
}

export const notificationManager = new NotificationManager();

// Backward compatibility exports
export const initNotifications = () => notificationManager.requestPermission();
export const unlockAudio = () => {
  // Audio unlock for iOS/Safari - play silent audio on user interaction
  const audio = new Audio();
  audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  audio.play().catch(() => {});
};
export const notifyDM = (username, message) => {
  notificationManager.showDMNotification({ text: message }, username);
};

export const notifyNewMessage = (message, channelName, onClick) => {
  notificationManager.showMessageNotification(message, channelName, onClick);
};

export const notifyMention = (message, channelName, onClick) => {
  notificationManager.showMentionNotification(message, channelName, onClick);
};

// Additional exports for UserSettings compatibility
export const getNotificationsEnabled = () => {
  return notificationManager.isEnabled();
};

export const setNotificationsEnabled = (enabled) => {
  if (enabled) {
    notificationManager.requestPermission();
  }
};

export const requestNotificationPermission = () => {
  return notificationManager.requestPermission();
};

export const getNotificationVolume = () => {
  return parseFloat(localStorage.getItem('notificationVolume') || '0.5');
};

export const setNotificationVolume = (volume) => {
  localStorage.setItem('notificationVolume', volume.toString());
};

export const playNotificationSound = () => {
  const volume = getNotificationVolume();
  const audio = new Audio('/notification.mp3');
  audio.volume = volume;
  audio.play().catch(() => {});
};
