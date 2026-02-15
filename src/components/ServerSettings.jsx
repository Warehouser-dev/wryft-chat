import { X, Trash2, Save } from 'lucide-react';
import { useState } from 'react';

function ServerSettings({ isOpen, onClose, server, onUpdate, onDelete }) {
  const [serverName, setServerName] = useState(server?.name || '');
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !server) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(serverName);
      onClose();
    } catch (err) {
      console.error('Failed to update server:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${server.name}? This action cannot be undone!`)) {
      onDelete();
      onClose();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'delete', label: 'Delete Server' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
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
          <button className="settings-close" onClick={onClose}>
            <X size={24} />
          </button>

          {activeTab === 'overview' && (
            <div className="settings-section">
              <h2>Server Overview</h2>
              
              <div className="settings-card">
                <div className="server-settings-icon">
                  {server.icon}
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

              <button
                className="settings-save-button"
                onClick={handleSave}
                disabled={saving || !serverName.trim() || serverName === server.name}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
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
                    <Trash2 size={18} />
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
