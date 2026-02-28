import { X, User, Bell, Shield, Palette, SignOut } from 'phosphor-react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PremiumModal from './PremiumModal';
import ColorPicker from './ColorPicker';
import UnsavedChangesBar from './UnsavedChangesBar';
import { 
  getNotificationsEnabled, 
  setNotificationsEnabled, 
  requestNotificationPermission,
  getNotificationVolume,
  setNotificationVolume,
  playNotificationSound
} from '../utils/notifications';
import { api } from '../services/api';
import { saveTheme, resetTheme, loadTheme, defaultTheme, coalTheme, applyTheme } from '../utils/theme';
import { uploadUserAvatar, uploadBanner } from '../utils/storage';


function UserSettings({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [isClosing, setIsClosing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(getNotificationsEnabled());
  const [notificationVolume, setNotificationVolumeState] = useState(getNotificationVolume());
  const [avatarUrl, setAvatarUrl] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [timezone, setTimezone] = useState('');
  const [bannerColor, setBannerColor] = useState('#2F6CCE');
  const [bannerColorSecondary, setBannerColorSecondary] = useState('#2F6CCE');
  const [bannerUrl, setBannerUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [originalValues, setOriginalValues] = useState({ avatarUrl: '', aboutMe: '', pronouns: '', timezone: '', bannerColor: '#2F6CCE', bannerColorSecondary: '#2F6CCE', bannerUrl: '' });
  const [themeColors, setThemeColors] = useState(defaultTheme);
  const [originalTheme, setOriginalTheme] = useState(defaultTheme);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Privacy settings
  const [allowDms, setAllowDms] = useState('everyone');
  const [allowFriendRequests, setAllowFriendRequests] = useState('everyone');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [explicitContentFilter, setExplicitContentFilter] = useState('friends');
  const [originalPrivacy, setOriginalPrivacy] = useState({ allowDms: 'everyone', allowFriendRequests: 'everyone', showOnlineStatus: true, explicitContentFilter: 'friends' });

  const hasProfileChanges = avatarUrl !== originalValues.avatarUrl || aboutMe !== originalValues.aboutMe || pronouns !== originalValues.pronouns || timezone !== originalValues.timezone || bannerColor !== originalValues.bannerColor || bannerColorSecondary !== originalValues.bannerColorSecondary || bannerUrl !== originalValues.bannerUrl;
  const hasThemeChanges = Object.keys(themeColors).some(key => themeColors[key] !== originalTheme[key]);
  const hasPrivacyChanges = allowDms !== originalPrivacy.allowDms || allowFriendRequests !== originalPrivacy.allowFriendRequests || showOnlineStatus !== originalPrivacy.showOnlineStatus || explicitContentFilter !== originalPrivacy.explicitContentFilter;
  const hasChanges = hasProfileChanges || hasThemeChanges || hasPrivacyChanges;
  const [showBar, setShowBar] = useState(false);
  const [barExiting, setBarExiting] = useState(false);

  // Animate bar in/out
  useEffect(() => {
    if (hasChanges) {
      setBarExiting(false);
      setShowBar(true);
    } else if (showBar) {
      setBarExiting(true);
      const t = setTimeout(() => {
        setShowBar(false);
        setBarExiting(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [hasChanges]);

  useEffect(() => {
    setNotificationsEnabledState(getNotificationsEnabled());
    setNotificationVolumeState(getNotificationVolume());

    // Load user profile
    if (isOpen && user) {
      api.getUserProfile(user.id).then(profile => {
        const av = profile.avatar_url || '';
        const ab = profile.about_me || '';
        const pr = profile.pronouns || '';
        const tz = profile.timezone || '';
        const bc = profile.banner_color || '#2F6CCE';
        const bc2 = profile.banner_color_secondary || '#2F6CCE';
        const bu = profile.banner_url || '';
        setAvatarUrl(av);
        setAboutMe(ab);
        setPronouns(pr);
        setTimezone(tz);
        setBannerColor(bc);
        setBannerColorSecondary(bc2);
        setBannerUrl(bu);
        setIsPremium(profile.is_premium || false);
        setOriginalValues({ avatarUrl: av, aboutMe: ab, pronouns: pr, timezone: tz, bannerColor: bc, bannerColorSecondary: bc2, bannerUrl: bu });

        // Load privacy settings
        const adm = profile.allow_dms || 'everyone';
        const afr = profile.allow_friend_requests || 'everyone';
        const sos = profile.show_online_status !== false;
        const ecf = profile.explicit_content_filter || 'friends';
        setAllowDms(adm);
        setAllowFriendRequests(afr);
        setShowOnlineStatus(sos);
        setExplicitContentFilter(ecf);
        setOriginalPrivacy({ allowDms: adm, allowFriendRequests: afr, showOnlineStatus: sos, explicitContentFilter: ecf });

        // Handle theme from backend
        if (profile.theme_config) {
          const backendTheme = { ...defaultTheme, ...profile.theme_config };
          setThemeColors(backendTheme);
          setOriginalTheme(backendTheme);
          applyTheme(backendTheme);
          saveTheme(backendTheme); // Keep local storage in sync
        } else {
          // Fallback to local storage if no backend theme
          const savedTheme = loadTheme();
          const initialTheme = { ...defaultTheme, ...savedTheme };
          setThemeColors(initialTheme);
          setOriginalTheme(initialTheme);
        }
      }).catch(err => {
        console.error('Failed to load profile:', err);
      });
    }
  }, [isOpen, user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadUserAvatar(file);
      setAvatarUrl(url);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadBanner(file);
      setBannerUrl(url);
    } catch (err) {
      console.error('Failed to upload banner:', err);
      alert(err.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled;

    if (newValue) {
      // Request permission when enabling
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert('Please enable notifications in your browser settings');
        return;
      }
    }

    setNotificationsEnabled(newValue);
    setNotificationsEnabledState(newValue);
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setNotificationVolume(volume);
    setNotificationVolumeState(volume);
  };

  const handleTestNotification = () => {
    playNotificationSound();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (hasProfileChanges || hasThemeChanges) {
        await api.updateUserProfile(
          user.id,
          aboutMe,
          avatarUrl,
          hasThemeChanges ? themeColors : null,
          bannerColor,
          bannerColorSecondary,
          bannerUrl,
          pronouns,
          timezone
        );
        setOriginalValues({ avatarUrl, aboutMe, pronouns, timezone, bannerColor, bannerColorSecondary, bannerUrl });
        if (hasThemeChanges) {
          saveTheme(themeColors);
          setOriginalTheme({ ...themeColors });
        }
      }
      if (hasPrivacyChanges) {
        await api.updatePrivacySettings(user.id, {
          allow_dms: allowDms,
          allow_friend_requests: allowFriendRequests,
          show_online_status: showOnlineStatus,
          explicit_content_filter: explicitContentFilter,
        });
        setOriginalPrivacy({ allowDms, allowFriendRequests, showOnlineStatus, explicitContentFilter });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAvatarUrl(originalValues.avatarUrl);
    setAboutMe(originalValues.aboutMe);
    setPronouns(originalValues.pronouns);
    setTimezone(originalValues.timezone);
    setBannerColor(originalValues.bannerColor);
    setBannerColorSecondary(originalValues.bannerColorSecondary);
    setBannerUrl(originalValues.bannerUrl);
    setThemeColors({ ...originalTheme });
    applyTheme(originalTheme);
    setAllowDms(originalPrivacy.allowDms);
    setAllowFriendRequests(originalPrivacy.allowFriendRequests);
    setShowOnlineStatus(originalPrivacy.showOnlineStatus);
    setExplicitContentFilter(originalPrivacy.explicitContentFilter);
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const tabs = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'premium', label: 'Premium', icon: () => <SparklesIcon className="icon-20" /> },
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
              <SignOut size={18} weight="bold" />
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
                  <div className="settings-avatar" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover' } : {}}>
                    {!avatarUrl && user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="settings-user-info">
                    <div className="settings-username">{user?.username}#{user?.discriminator}</div>
                    <div className="settings-email">{user?.email}</div>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <label>Username</label>
                <input type="text" value={`${user?.username}#${user?.discriminator}` || ''} disabled />
                <p className="settings-hint">Your unique username with discriminator</p>
              </div>

              <div className="settings-group">
                <label>Email</label>
                <input type="email" value={user?.email || ''} disabled />
                <p className="settings-hint">Your account email address</p>
              </div>

              <div className="settings-group">
                <label>Password</label>
                <button className="settings-button" style={{ width: 'fit-content' }}>
                  Change Password
                </button>
                <p className="settings-hint">Update your password to keep your account secure</p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>User Profile</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Customize how you appear to others on Wryft
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
                {/* Left side - Settings */}
                <div>
                  <div className="settings-group">
                    <label>About Me</label>
                    <textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows="4"
                      maxLength="190"
                      style={{
                        width: '100%',
                        background: '#0a0a0a',
                        border: '2px solid #2a2a2a',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#dcddde',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <p className="settings-hint">{aboutMe.length}/190 characters</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="settings-group">
                      <label>Pronouns</label>
                      <input
                        type="text"
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value)}
                        placeholder="e.g. he/him, she/her, they/them"
                        maxLength="50"
                      />
                      <p className="settings-hint">Let others know your pronouns</p>
                    </div>

                    <div className="settings-group">
                      <label>Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0a0a0a',
                          border: '2px solid #2a2a2a',
                          borderRadius: '8px',
                          padding: '12px',
                          color: '#dcddde',
                          fontSize: '15px',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select timezone...</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Europe/Stockholm">Stockholm (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Australia/Sydney">Sydney (AEDT)</option>
                      </select>
                      <p className="settings-hint">Your local timezone</p>
                    </div>
                  </div>

                  {isPremium && (
                    <>
                      <div className="settings-divider" style={{ margin: '32px 0' }} />
                      <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SparklesIcon className="icon-20" style={{ color: 'var(--primary)' }} />
                        Premium Customization
                      </h3>

                      <div className="settings-group">
                        <label>Profile Colors</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Background Color</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ColorPicker 
                                value={bannerColor} 
                                onChange={setBannerColor}
                              />
                              <input
                                type="text"
                                value={bannerColor}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^#[0-9A-F]{0,6}$/i.test(val)) {
                                    setBannerColor(val);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  background: '#0a0a0a',
                                  border: '2px solid #2a2a2a',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  color: '#dcddde',
                                  fontSize: '14px',
                                  fontFamily: 'monospace',
                                  textTransform: 'uppercase',
                                }}
                                maxLength="7"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Border Color</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ColorPicker 
                                value={bannerColorSecondary} 
                                onChange={setBannerColorSecondary}
                              />
                              <input
                                type="text"
                                value={bannerColorSecondary}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^#[0-9A-F]{0,6}$/i.test(val)) {
                                    setBannerColorSecondary(val);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  background: '#0a0a0a',
                                  border: '2px solid #2a2a2a',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  color: '#dcddde',
                                  fontSize: '14px',
                                  fontFamily: 'monospace',
                                  textTransform: 'uppercase',
                                }}
                                maxLength="7"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="settings-hint">Customize how your profile card appears to others</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Right side - Preview */}
                <div>
                  <div style={{ position: 'sticky', top: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Preview</h3>
                    <div className="profile-preview-card">
                      {/* Banner */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        disabled={uploadingBanner || !isPremium}
                        style={{ display: 'none' }}
                        id="banner-upload-preview"
                      />
                      <div 
                        className="profile-preview-banner"
                        style={{
                          background: bannerUrl 
                            ? `url(${bannerUrl}) center/cover` 
                            : `linear-gradient(135deg, ${bannerColor}, ${bannerColorSecondary})`,
                          cursor: isPremium ? 'pointer' : 'not-allowed',
                          position: 'relative',
                        }}
                        onClick={() => {
                          if (isPremium) {
                            document.getElementById('banner-upload-preview').click();
                          } else {
                            setShowPremiumModal(true);
                          }
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'white',
                        }}
                        className="banner-hover-overlay"
                        >
                          {isPremium ? (uploadingBanner ? 'Uploading...' : 'Change Banner') : '🔒 Premium Only'}
                        </div>
                      </div>
                      
                      {/* Avatar */}
                      <div className="profile-preview-avatar-container">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          style={{ display: 'none' }}
                          id="avatar-upload-preview"
                        />
                        <div 
                          className="profile-preview-avatar"
                          style={{
                            ...(avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover' } : {}),
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                          onClick={() => document.getElementById('avatar-upload-preview').click()}
                        >
                          {!avatarUrl && user?.username?.[0]?.toUpperCase()}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'white',
                            borderRadius: '50%',
                            textAlign: 'center',
                            padding: '8px',
                          }}
                          className="avatar-hover-overlay"
                          >
                            {uploading ? 'Uploading...' : 'Change Avatar'}
                          </div>
                          <div className="profile-preview-status" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="profile-preview-content">
                        <div className="profile-preview-username">{user?.username}</div>
                        <div className="profile-preview-discriminator">
                          {user?.username}#{user?.discriminator}
                          {pronouns && ` • ${pronouns}`}
                        </div>

                        {aboutMe && (
                          <div className="profile-preview-section">
                            <div className="profile-preview-section-title">About Me</div>
                            <div className="profile-preview-about">{aboutMe || 'No bio set'}</div>
                          </div>
                        )}

                        {timezone && (
                          <div className="profile-preview-section">
                            <div className="profile-preview-section-title">Timezone</div>
                            <div className="profile-preview-about">{timezone}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'premium' && (
            <div className="settings-section">
              <h2>Wryft Premium</h2>
              <div className="premium-promo">
                <SparklesIcon style={{ width: '80px', height: '80px', color: 'var(--primary)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Unlock Premium Features</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px' }}>
                  Get access to exclusive features, custom themes, animated avatars, and more for just $4.99/month.
                </p>
                <button 
                  onClick={() => setShowPremiumModal(true)}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto',
                  }}
                >
                  <SparklesIcon className="icon-20" />
                  Learn More
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Enable Notifications</div>
                    <p className="settings-hint">Get desktop notifications and sounds for new messages</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={handleNotificationToggle}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <label>Notification Volume</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={notificationVolume}
                    onChange={handleVolumeChange}
                    disabled={!notificationsEnabled}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      background: notificationsEnabled ? 'linear-gradient(to right, #5865f2 0%, #5865f2 ' + (notificationVolume * 100) + '%, #2a2a2a ' + (notificationVolume * 100) + '%, #2a2a2a 100%)' : '#2a2a2a',
                      outline: 'none',
                      cursor: notificationsEnabled ? 'pointer' : 'not-allowed',
                      opacity: notificationsEnabled ? 1 : 0.5,
                    }}
                  />
                  <span style={{ minWidth: '45px', color: '#dcddde', fontSize: '14px', fontWeight: '600' }}>
                    {Math.round(notificationVolume * 100)}%
                  </span>
                  <button
                    onClick={handleTestNotification}
                    disabled={!notificationsEnabled}
                    style={{
                      padding: '8px 16px',
                      background: notificationsEnabled ? '#5865f2' : '#2a2a2a',
                      color: notificationsEnabled ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: notificationsEnabled ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (notificationsEnabled) {
                        e.target.style.background = '#4752c4';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (notificationsEnabled) {
                        e.target.style.background = '#5865f2';
                      }
                    }}
                  >
                    Test Sound
                  </button>
                </div>
                <p className="settings-hint">Adjust the volume of notification sounds</p>
              </div>

              <div className="settings-info">
                <p>Notifications will appear when:</p>
                <ul>
                  <li>You receive a direct message</li>
                  <li>Someone mentions you with @username</li>
                  <li>You receive a message in a channel (when window is not focused)</li>
                </ul>
                <p style={{ marginTop: '16px', fontSize: '13px', color: '#b9bbbe' }}>
                  💡 <strong>Tip:</strong> Click anywhere or type a message to enable notification sounds.
                  You'll see a confirmation when sounds are ready.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy & Safety</h2>
              
              <div className="settings-group">
                <label>Who can send you direct messages?</label>
                <select
                  value={allowDms}
                  onChange={(e) => setAllowDms(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0a0a',
                    border: '2px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#dcddde',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="everyone">Everyone</option>
                  <option value="friends">Friends Only</option>
                  <option value="server_members">Server Members Only</option>
                  <option value="none">No One</option>
                </select>
                <p className="settings-hint">Control who can send you direct messages</p>
              </div>

              <div className="settings-group">
                <label>Who can send you friend requests?</label>
                <select
                  value={allowFriendRequests}
                  onChange={(e) => setAllowFriendRequests(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0a0a',
                    border: '2px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#dcddde',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="everyone">Everyone</option>
                  <option value="friends_of_friends">Friends of Friends</option>
                  <option value="server_members">Server Members Only</option>
                  <option value="none">No One</option>
                </select>
                <p className="settings-hint">Control who can send you friend requests</p>
              </div>

              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">Show Online Status</div>
                    <p className="settings-hint">Let others see when you're online</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => setShowOnlineStatus(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <label>Explicit Content Filter</label>
                <select
                  value={explicitContentFilter}
                  onChange={(e) => setExplicitContentFilter(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0a0a',
                    border: '2px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#dcddde',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="none">Don't scan any messages</option>
                  <option value="friends">Scan messages from non-friends</option>
                  <option value="everyone">Scan all messages</option>
                </select>
                <p className="settings-hint">Automatically scan and delete messages containing explicit content</p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <div className="settings-group">
                <label>Theme Presets</label>
                <div className="settings-options">
                  <button 
                    className={`settings-option ${JSON.stringify(themeColors) === JSON.stringify(defaultTheme) ? 'active' : ''}`}
                    onClick={() => {
                      const theme = { ...defaultTheme };
                      setThemeColors(theme);
                      applyTheme(theme);
                    }}
                  >
                    Default Dark
                  </button>
                  <button 
                    className={`settings-option ${JSON.stringify(themeColors) === JSON.stringify(coalTheme) ? 'active' : ''}`}
                    onClick={() => {
                      const theme = { ...coalTheme };
                      setThemeColors(theme);
                      applyTheme(theme);
                    }}
                  >
                    Coal
                  </button>
                  <button className="settings-option" onClick={() => {
                    resetTheme();
                    const theme = { ...defaultTheme };
                    setThemeColors(theme);
                    setOriginalTheme(theme);
                  }}>Reset to default</button>
                </div>
              </div>

              <div className="settings-group">
                <label style={{ marginBottom: '16px', display: 'block' }}>Custom Colors</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {Object.entries(themeColors).map(([variable, value]) => {
                    const label = variable.replace('--', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={variable} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => {
                            const newColors = { ...themeColors, [variable]: e.target.value };
                            setThemeColors(newColors);
                            applyTheme(newColors);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#dcddde' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />

      {/* Unsaved Changes Bar */}
      {showBar && (
        <UnsavedChangesBar
          onSave={handleSaveProfile}
          onReset={handleReset}
          saving={saving}
          isClosing={barExiting}
        />
      )}
    </div>
  );
}

export default UserSettings;
