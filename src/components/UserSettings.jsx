import { X, User, Bell, Shield, Palette, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function UserSettings({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const tabs = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className={`settings-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sidebar">
          <div className="settings-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
            <div className="settings-divider" />
            <button className="settings-tab logout" onClick={handleLogout}>
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </div>

        <div className="settings-content">
          <button className="settings-close" onClick={handleClose}>
            <X size={24} />
          </button>

          {activeTab === 'account' && (
            <div className="settings-section">
              <h2>My Account</h2>
              <div className="settings-card">
                <div className="settings-profile">
                  <div className="settings-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                  <div className="settings-user-info">
                    <div className="settings-username">{user?.username}</div>
                    <div className="settings-email">{user?.email}</div>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <label>Username</label>
                <input type="text" value={user?.username || ''} disabled />
                <p className="settings-hint">Your unique username with discriminator</p>
              </div>

              <div className="settings-group">
                <label>Email</label>
                <input type="email" value={user?.email || ''} disabled />
                <p className="settings-hint">Your account email address</p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Enable Desktop Notifications</div>
                    <p className="settings-hint">Get notified about new messages</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Enable Notification Sounds</div>
                    <p className="settings-hint">Play a sound when receiving messages</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy & Safety</h2>
              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Allow Direct Messages</div>
                    <p className="settings-hint">Allow other users to send you DMs</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Show Online Status</div>
                    <p className="settings-hint">Let others see when you're online</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <div className="settings-group">
                <label>Theme</label>
                <div className="settings-options">
                  <button className="settings-option active">Dark</button>
                  <button className="settings-option">Light</button>
                </div>
              </div>
              <div className="settings-group">
                <label>Message Display</label>
                <div className="settings-options">
                  <button className="settings-option active">Cozy</button>
                  <button className="settings-option">Compact</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
