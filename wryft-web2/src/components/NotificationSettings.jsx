import React, { useState, useEffect } from 'react';
import { notificationManager } from '../utils/notifications';
import { Bell, BellSlash, Check } from 'phosphor-react';

function NotificationSettings() {
  const [permission, setPermission] = useState(notificationManager.getPermission());
  const [settings, setSettings] = useState({
    messages: true,
    dms: true,
    mentions: true,
    friendRequests: true,
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await notificationManager.requestPermission();
    setPermission(notificationManager.getPermission());
    if (!granted) {
      alert('Please enable notifications in your browser settings');
    }
  };

  const handleToggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Notifications</h2>
      
      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-info">
            <div className="settings-item-label">Desktop Notifications</div>
            <div className="settings-item-description">
              {permission === 'granted' && 'Notifications are enabled'}
              {permission === 'denied' && 'Notifications are blocked. Enable them in your browser settings.'}
              {permission === 'default' && 'Click to enable desktop notifications'}
            </div>
          </div>
          {permission === 'granted' ? (
            <div className="settings-status-badge success">
              <Check size={16} weight="bold" />
              Enabled
            </div>
          ) : permission === 'denied' ? (
            <div className="settings-status-badge error">
              <BellSlash size={16} weight="bold" />
              Blocked
            </div>
          ) : (
            <button className="settings-button primary" onClick={handleRequestPermission}>
              <Bell size={16} weight="bold" />
              Enable
            </button>
          )}
        </div>
      </div>

      {permission === 'granted' && (
        <>
          <div className="settings-divider" />
          
          <div className="settings-group">
            <h3 className="settings-group-title">Notification Types</h3>
            
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Channel Messages</div>
                <div className="settings-item-description">
                  Get notified for new messages in channels
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.messages}
                  onChange={() => handleToggleSetting('messages')}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Direct Messages</div>
                <div className="settings-item-description">
                  Get notified for new direct messages
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.dms}
                  onChange={() => handleToggleSetting('dms')}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Mentions</div>
                <div className="settings-item-description">
                  Get notified when someone @mentions you
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.mentions}
                  onChange={() => handleToggleSetting('mentions')}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Friend Requests</div>
                <div className="settings-item-description">
                  Get notified for new friend requests
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.friendRequests}
                  onChange={() => handleToggleSetting('friendRequests')}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationSettings;
