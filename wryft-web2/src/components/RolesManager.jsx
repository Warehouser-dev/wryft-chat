import { useState, useEffect } from 'react';
import { Plus, Trash, Shield, CaretRight } from 'phosphor-react';
import { api } from '../services/api';
import { PERMISSIONS, PERMISSION_NAMES, PERMISSION_DESCRIPTIONS, hasPermission, togglePermission } from '../utils/permissions';
import ColorPicker from './ColorPicker';
import { showToast } from './ToastContainer';
import UnsavedChangesBar from './UnsavedChangesBar';

function RolesManager({ server, onClose }) {
  const [roles, setRoles] = useState([]);
  const [originalRoles, setOriginalRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isClosingBar, setIsClosingBar] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (server) {
      loadRoles();
    }
  }, [server]);

  const loadRoles = async () => {
    try {
      const data = await api.getGuildRoles(server.id);
      setRoles(data);
      setOriginalRoles(JSON.parse(JSON.stringify(data))); // Deep copy
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    
    try {
      const newRole = await api.createRole(server.id, newRoleName, '#99aab5', 0, true, false);
      setRoles([...roles, newRole]);
      setNewRoleName('');
      setCreating(false);
      setSelectedRole(newRole);
      showToast('Role created successfully', 'success');
    } catch (err) {
      console.error('Failed to create role:', err);
      showToast('Failed to create role', 'error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await api.deleteRole(server.id, roleId);
      setRoles(roles.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) {
        setSelectedRole(roles[0] || null);
      }
      showToast('Role deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete role:', err);
      showToast('Failed to delete role', 'error');
    }
  };

  const handleUpdateRole = async (updates) => {
    if (!selectedRole) return;
    
    // Update local state immediately for UI feedback
    const updated = { ...selectedRole, ...updates };
    setRoles(roles.map(r => r.id === updated.id ? updated : r));
    setSelectedRole(updated);
    
    // Check if the updated role is different from original
    const originalRole = originalRoles.find(r => r.id === selectedRole.id);
    if (!originalRole) return;
    
    const isDifferent = 
      updated.name !== originalRole.name ||
      updated.color !== originalRole.color ||
      updated.permissions !== originalRole.permissions ||
      updated.hoist !== originalRole.hoist ||
      updated.mentionable !== originalRole.mentionable;
    
    if (isDifferent) {
      // Store pending updates
      setPendingUpdates(prev => ({
        ...prev,
        [selectedRole.id]: { ...prev[selectedRole.id], ...updates }
      }));
      setHasUnsavedChanges(true);
      setIsClosingBar(false);
    } else {
      // Remove from pending updates if it matches original
      setPendingUpdates(prev => {
        const newPending = { ...prev };
        delete newPending[selectedRole.id];
        return newPending;
      });
      const stillHasChanges = Object.keys(pendingUpdates).length > 1 || (Object.keys(pendingUpdates).length === 1 && !pendingUpdates[selectedRole.id]);
      
      if (!stillHasChanges && hasUnsavedChanges) {
        // Trigger closing animation
        setIsClosingBar(true);
        setTimeout(() => {
          setHasUnsavedChanges(false);
          setIsClosingBar(false);
        }, 300);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedRole || Object.keys(pendingUpdates).length === 0) return;
    
    // Trigger closing animation
    setIsClosingBar(true);
    
    setSaving(true);
    try {
      // Save all pending updates
      for (const [roleId, updates] of Object.entries(pendingUpdates)) {
        await api.updateRole(server.id, roleId, updates);
      }
      
      // Wait for animation to complete
      setTimeout(() => {
        // Update original roles to match current state
        setOriginalRoles(JSON.parse(JSON.stringify(roles)));
        setPendingUpdates({});
        setHasUnsavedChanges(false);
        setIsClosingBar(false);
        showToast('Changes saved successfully', 'success');
      }, 300);
    } catch (err) {
      console.error('Failed to save changes:', err);
      showToast('Failed to save changes', 'error');
      setIsClosingBar(false);
    } finally {
      setSaving(false);
    }
  };

  const handleResetChanges = () => {
    // Trigger closing animation
    setIsClosingBar(true);
    
    setTimeout(() => {
      setPendingUpdates({});
      setHasUnsavedChanges(false);
      setIsClosingBar(false);
      // Restore from original roles
      setRoles(JSON.parse(JSON.stringify(originalRoles)));
      if (selectedRole) {
        const originalRole = originalRoles.find(r => r.id === selectedRole.id);
        if (originalRole) {
          setSelectedRole(JSON.parse(JSON.stringify(originalRole)));
        }
      }
      showToast('Changes reset', 'info');
    }, 300);
  };

  const toggleRolePermission = (permission) => {
    if (!selectedRole) return;
    const newPermissions = togglePermission(selectedRole.permissions, permission);
    handleUpdateRole({ permissions: newPermissions });
  };

  if (loading) {
    return <div className="roles-manager-loading">Loading roles...</div>;
  }

  return (
    <div className="roles-manager">
      <div className="roles-sidebar">
        <div className="roles-header">
          <h3>Roles</h3>
          <button className="create-role-btn" onClick={() => setCreating(true)}>
            <Plus size={18} />
          </button>
        </div>

        {creating && (
          <div className="create-role-form">
            <input
              type="text"
              placeholder="Role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()}
              autoFocus
            />
            <div className="create-role-actions">
              <button onClick={handleCreateRole}>Create</button>
              <button onClick={() => { setCreating(false); setNewRoleName(''); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="roles-list">
          {roles.map(role => (
            <div
              key={role.id}
              className={`role-item ${selectedRole?.id === role.id ? 'active' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              <div className="role-color" style={{ backgroundColor: role.color }} />
              <span className="role-name">{role.name}</span>
              <CaretRight size={16} />
            </div>
          ))}
        </div>
      </div>

      <div className="roles-content">
        {selectedRole ? (
          <>
            <div className="role-editor-header">
              <div className="role-preview-badge" style={{ backgroundColor: selectedRole.color }}>
                <Shield size={16} />
              </div>
              <h3>{selectedRole.name}</h3>
            </div>

            <div className="role-display-section">
              <h4>Display</h4>
              
              <div className="role-settings-row">
                <div className="role-settings-group">
                  <label>Role Name</label>
                  <input
                    type="text"
                    value={selectedRole.name}
                    onChange={(e) => handleUpdateRole({ name: e.target.value })}
                    placeholder="Role name"
                  />
                </div>

                <div className="role-settings-group role-color-group">
                  <label>Role Color</label>
                  <ColorPicker
                    value={selectedRole.color}
                    onChange={(color) => handleUpdateRole({ color })}
                  />
                </div>
              </div>

              <div className="role-toggle-group">
                <div className="role-toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Display role members separately from online members</span>
                    <span className="toggle-hint">Members with this role will be shown in a separate section</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={selectedRole.hoist}
                      onChange={(e) => handleUpdateRole({ hoist: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="role-toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Allow anyone to @mention this role</span>
                    <span className="toggle-hint">All members will be able to mention this role in chat</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={selectedRole.mentionable}
                      onChange={(e) => handleUpdateRole({ mentionable: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="role-permissions-section">
              <h4>Permissions</h4>
              <p className="permissions-hint">
                {hasPermission(selectedRole.permissions, PERMISSIONS.ADMINISTRATOR) 
                  ? 'Members with this role have all permissions and bypass all permission checks.'
                  : 'Configure what members with this role can do in the server.'}
              </p>
              
              <div className="permissions-list">
                {Object.entries(PERMISSIONS).map(([key, value]) => (
                  <div key={key} className="permission-item">
                    <label className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={hasPermission(selectedRole.permissions, value)}
                        onChange={() => toggleRolePermission(value)}
                      />
                      <div className="permission-info">
                        <span className="permission-name">{PERMISSION_NAMES[value]}</span>
                        <span className="permission-desc">{PERMISSION_DESCRIPTIONS[value]}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="role-danger-zone">
              <h4>Danger Zone</h4>
              <div className="danger-zone-content">
                <div className="danger-zone-info">
                  <span className="danger-zone-title">Delete {selectedRole.name}</span>
                  <span className="danger-zone-desc">This action cannot be undone. All members will lose this role.</span>
                </div>
                <button
                  className="delete-role-btn"
                  onClick={() => handleDeleteRole(selectedRole.id)}
                >
                  <Trash size={16} weight="bold" />
                  Delete Role
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-role-selected">
            <Shield size={48} />
            <p>Select a role to edit</p>
          </div>
        )}
      </div>
      
      {hasUnsavedChanges && (
        <UnsavedChangesBar
          onSave={handleSaveChanges}
          onReset={handleResetChanges}
          saving={saving}
          isClosing={isClosingBar}
        />
      )}
    </div>
  );
}

export default RolesManager;
