import { X, Trash, FloppyDisk, Globe } from 'phosphor-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { uploadBanner, uploadIcon } from '../utils/storage';
import RolesManager from './RolesManager';
import AuditLog from './AuditLog';
import EmojiManager from './EmojiManager';

function ServerSettings({ isOpen, onClose, server, onUpdate, onDelete }) {
  const [serverName, setServerName] = useState(server?.name || '');
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(server?.banner_url || '');
  const [bannerFile, setBannerFile] = useState(null);
  const [iconUrl, setIconUrl] = useState(server?.icon_url || '');
  const [iconFile, setIconFile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Update banner URL when server changes
  useEffect(() => {
    if (server?.banner_url) {
      setBannerUrl(server.banner_url);
    }
  }, [server?.banner_url]);

  // Update icon URL when server changes
  useEffect(() => {
    if (server?.icon_url) {
      setIconUrl(server.icon_url);
    }
  }, [server?.icon_url]);

  // Update server name when server changes
  useEffect(() => {
    if (server?.name) {
      setServerName(server.name);
    }
  }, [server?.name]);

  if (!isOpen || !server) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(serverName);
      
      let uploadedBannerUrl = bannerUrl;
      let uploadedIconUrl = iconUrl;
      
      // Upload banner if file selected
      if (bannerFile) {
        try {
          console.log('Uploading banner...');
          uploadedBannerUrl = await uploadBanner(bannerFile);
          console.log('Banner uploaded successfully:', uploadedBannerUrl);
        } catch (err) {
          console.error('Failed to upload banner:', err);
          alert(err.message || 'Failed to upload banner image. Please try again.');
          setSaving(false);
          return;
        }
      }
      
      // Upload icon if file selected
      if (iconFile) {
        try {
          console.log('Uploading icon...');
          uploadedIconUrl = await uploadIcon(iconFile);
          console.log('Icon uploaded successfully:', uploadedIconUrl);
        } catch (err) {
          console.error('Failed to upload icon:', err);
          alert(err.message || 'Failed to upload icon image. Please try again.');
          setSaving(false);
          return;
        }
      }
      
      // Update guild settings with banner and icon URLs
      await api.updateGuildSettings(server.id, isPublic, description, uploadedBannerUrl, uploadedIconUrl);
      handleClose();
    } catch (err) {
      console.error('Failed to update server:', err);
      alert('Failed to update guild settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Banner image must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setBannerFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setBannerUrl('');
    setBannerFile(null);
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Icon image must be less than 2MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setIconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    setIconUrl('');
    setIconFile(null);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${server.name}? This action cannot be undone!`)) {
      onDelete();
      handleClose();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'roles', label: 'Roles' },
    { id: 'emoji', label: 'Emoji' },
    { id: 'audit-log', label: 'Audit Log' },
    { id: 'delete', label: 'Delete Server' },
  ];

  return (
    <div className={`settings-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sidebar">
          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'delete' ? 'danger' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-content">
          <button className="settings-close" onClick={handleClose}>
            <X size={24} />
          </button>

          {activeTab === 'overview' && (
            <div className="settings-section">
              <h2>Server Overview</h2>
              
              <div className="settings-card">
                <div className="server-banner-container">
                  {bannerUrl ? (
                    <div className="server-banner-preview">
                      <img src={bannerUrl} alt="Server banner" />
                      <button className="remove-banner-btn" onClick={handleRemoveBanner}>
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="server-banner-placeholder">
                      <p>No banner set</p>
                    </div>
                  )}
                  <label className="upload-banner-btn">
                    Upload Banner
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                <div className="server-icon-section">
                  <label>Server Icon</label>
                  <div className="server-icon-container">
                    {iconUrl ? (
                      <div className="server-icon-preview">
                        <img src={iconUrl} alt="Server icon" />
                        <button className="remove-icon-btn" onClick={handleRemoveIcon}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="server-icon-placeholder">
                        {server.icon}
                      </div>
                    )}
                    <label className="upload-icon-btn">
                      Upload Icon
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <p className="settings-hint">Recommended size: 512x512px, max 2MB</p>
                </div>
              </div>

              <div className="settings-group">
                <label>Server Name</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Enter server name"
                />
                <p className="settings-hint">This is how your server will appear to others</p>
              </div>

              <div className="settings-group">
                <div className="settings-toggle">
                  <div>
                    <div className="settings-label">
                      <Globe size={18} style={{marginRight: '8px'}} />
                      Public Server
                    </div>
                    <p className="settings-hint">Make this server discoverable to everyone</p>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {isPublic && (
                <div className="settings-group">
                  <label>Server Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your server..."
                    rows="3"
                    maxLength="200"
                    style={{
                      width: '100%',
                      background: '#0a0a0a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#dcddde',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                  <p className="settings-hint">{description.length}/200 characters</p>
                </div>
              )}

              <button
                className="settings-save-button"
                onClick={handleSave}
                disabled={saving || !serverName.trim()}
              >
                <FloppyDisk size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'roles' && (
            <RolesManager server={server} onClose={onClose} />
          )}

          {activeTab === 'emoji' && (
            <EmojiManager server={server} />
          )}

          {activeTab === 'audit-log' && (
            <div className="settings-section">
              <AuditLog server={server} />
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="settings-section">
              <h2>Delete Server</h2>
              
              <div className="settings-danger-zone">
                <div className="danger-zone-content">
                  <div>
                    <div className="danger-zone-title">Delete {server.name}</div>
                    <div className="danger-zone-description">
                      Once you delete a server, there is no going back. Please be certain.
                    </div>
                  </div>
                  <button className="danger-button" onClick={handleDelete}>
                    <Trash size={18} weight="bold" />
                    Delete Server
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerSettings;
