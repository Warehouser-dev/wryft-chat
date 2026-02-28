import { useState, useEffect } from 'react';
import { X, Plus, Trash, Eye, ChatCircle, Wrench, Check, Minus, MagnifyingGlass, GridFour, List } from 'phosphor-react';
import { api } from '../services/api';
import '../App.css';

// Three-state permission system
const getPermissionState = (allow, deny) => {
  if (deny) return 'DENY';
  if (allow) return 'ALLOW';
  return 'NEUTRAL';
};

function ChannelPermissionsModal({ isOpen, onClose, guildId, channelId, channelName, roles }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissionSearchQuery, setPermissionSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('comfy'); // comfy or dense
  const [gridMode, setGridMode] = useState(false);

  useEffect(() => {
    if (isOpen && guildId && channelId) {
      loadPermissions();
    }
  }, [isOpen, guildId, channelId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      console.log('Loading permissions for channel:', channelId);
      console.log('Available roles:', roles);
      
      const perms = await api.getChannelPermissions(guildId, channelId);
      console.log('Current permissions:', perms);
      setPermissions(perms);
      
      // Find @everyone role
      const everyoneRole = roles.find(r => r.name === '@everyone');
      console.log('Found @everyone role:', everyoneRole);
      
      // If @everyone role exists but no permission entry, create one
      if (everyoneRole && !perms.find(p => p.role_id === everyoneRole.id)) {
        console.log('Creating @everyone permission entry...');
        try {
          const everyonePermission = {
            role_id: everyoneRole.id,
            user_id: null,
            allow_view: true,
            allow_send_messages: true,
            allow_manage_messages: false,
          };
          
          console.log('Creating permission with:', everyonePermission);
          await api.createChannelPermission(guildId, channelId, everyonePermission);
          console.log('@everyone permission created successfully');
          
          // Reload permissions after creating @everyone
          const updatedPerms = await api.getChannelPermissions(guildId, channelId);
          console.log('Updated permissions:', updatedPerms);
          setPermissions(updatedPerms);
          
          // Select @everyone by default
          if (!selectedRole) {
            setSelectedRole(everyoneRole.id);
          }
        } catch (err) {
          console.error('Failed to create @everyone permission:', err);
          console.error('Error details:', err.response?.data);
        }
      } else if (everyoneRole && !selectedRole) {
        console.log('Selecting existing @everyone role');
        setSelectedRole(everyoneRole.id);
      } else if (!everyoneRole) {
        console.warn('No @everyone role found in roles array!');
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (roleId) => {
    try {
      const permission = {
        role_id: roleId,
        user_id: null,
        allow_view: true,
        allow_send_messages: true,
        allow_manage_messages: false,
      };
      
      await api.createChannelPermission(guildId, channelId, permission);
      await loadPermissions();
      setSelectedRole(roleId);
    } catch (err) {
      console.error('Failed to add permission:', err);
    }
  };

  const handleDeletePermission = async (permissionId) => {
    if (!confirm('Remove this role override?')) return;

    try {
      await api.deleteChannelPermission(guildId, channelId, permissionId);
      await loadPermissions();
      
      const everyoneRole = roles.find(r => r.name === '@everyone');
      if (everyoneRole) {
        setSelectedRole(everyoneRole.id);
      }
    } catch (err) {
      console.error('Failed to delete permission:', err);
    }
  };

  const handlePermissionChange = async (permissionId, field, currentValue) => {
    try {
      await api.updateChannelPermission(guildId, channelId, permissionId, {
        [field]: !currentValue,
      });
      await loadPermissions();
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleSetAllPermissions = async (state) => {
    if (!selectedPermission) return;
    
    const updates = {};
    permissionsList.forEach(perm => {
      if (state === 'ALLOW') {
        updates[perm.field] = true;
      } else if (state === 'DENY') {
        updates[perm.field] = false;
      }
    });

    try {
      await api.updateChannelPermission(guildId, channelId, selectedPermission.id, updates);
      await loadPermissions();
    } catch (err) {
      console.error('Failed to update permissions:', err);
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  const getRoleColor = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.color || '#99aab5';
  };

  const selectedPermission = permissions.find(p => p.role_id === selectedRole);
  const availableRoles = roles.filter(r => !permissions.find(p => p.role_id === r.id));

  const permissionsList = [
    {
      icon: Eye,
      name: 'View Channel',
      description: 'Allows members to view this channel by default.',
      field: 'allow_view'
    },
    {
      icon: ChatCircle,
      name: 'Send Messages',
      description: 'Allows members to send messages in this channel.',
      field: 'allow_send_messages'
    },
    {
      icon: Wrench,
      name: 'Manage Messages',
      description: 'Allows members to delete messages from other members.',
      field: 'allow_manage_messages'
    }
  ];

  const filteredPermissions = permissionSearchQuery
    ? permissionsList.filter(p => 
        p.name.toLowerCase().includes(permissionSearchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(permissionSearchQuery.toLowerCase())
      )
    : permissionsList;

  // Check if all permissions have the same state
  const allPermissionsState = selectedPermission ? (() => {
    const states = permissionsList.map(p => getPermissionState(selectedPermission[p.field], !selectedPermission[p.field]));
    const firstState = states[0];
    return states.every(s => s === firstState) ? firstState : undefined;
  })() : undefined;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content permissions-modal-fluxer" onClick={(e) => e.stopPropagation()}>
        <div className="permissions-header-fluxer">
          <div>
            <h2>Channel Access Control</h2>
            <p>Use permissions to customize who can do what in #{channelName}.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="permissions-layout-fluxer">
          <div className="permissions-sidebar-fluxer">
            <div className="sidebar-header">
              <span className="sidebar-title">ACCESS OVERRIDES</span>
            </div>
            
            <div className="sidebar-add-btn-wrapper">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddRole(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="role-select-add"
              >
                <option value="">+ Add Override</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div className="roles-list-fluxer">
              {permissions.filter(p => p.role_id).map(perm => (
                <div
                  key={perm.id}
                  className={`role-item-fluxer ${selectedRole === perm.role_id ? 'active' : ''}`}
                  onClick={() => setSelectedRole(perm.role_id)}
                >
                  <div className="role-item-content">
                    <div 
                      className="role-color-dot" 
                      style={{ backgroundColor: getRoleColor(perm.role_id) }}
                    />
                    <span>{getRoleName(perm.role_id)}</span>
                  </div>
                  {getRoleName(perm.role_id) !== '@everyone' && (
                    <button
                      className="role-delete-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePermission(perm.id);
                      }}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="permissions-content-fluxer">
            {loading ? (
              <div className="permissions-loading-fluxer">
                <div className="spinner"></div>
                <p>Loading permissions...</p>
              </div>
            ) : selectedPermission ? (
              <>
                <div className="section-header-fluxer">
                  <div>
                    <h2>Edit Access for {getRoleName(selectedPermission.role_id)}</h2>
                    <p className="section-subtitle">
                      {getRoleName(selectedPermission.role_id) === '@everyone' 
                        ? 'Configure base access for this channel'
                        : 'Configure overrides for this role'}
                    </p>
                  </div>
                  {getRoleName(selectedPermission.role_id) !== '@everyone' && (
                    <button
                      className="btn-delete-override"
                      onClick={() => handleDeletePermission(selectedPermission.id)}
                    >
                      <Trash size={16} />
                      Remove Override
                    </button>
                  )}
                </div>

                <div className="perm-header-row">
                  <p className="perm-help-text">Use these buttons to quickly set all permissions.</p>
                  <div className="state-buttons-container">
                    <button
                      className={`state-button deny ${allPermissionsState === 'DENY' ? 'active' : ''}`}
                      onClick={() => handleSetAllPermissions('DENY')}
                      title="Deny All"
                    >
                      <X size={16} weight="bold" />
                    </button>
                    <div className="state-divider" />
                    <button
                      className={`state-button neutral ${allPermissionsState === 'NEUTRAL' ? 'active' : ''}`}
                      onClick={() => handleSetAllPermissions('NEUTRAL')}
                      title="Neutral (Inherit)"
                    >
                      <Minus size={16} weight="bold" />
                    </button>
                    <div className="state-divider" />
                    <button
                      className={`state-button allow ${allPermissionsState === 'ALLOW' ? 'active' : ''}`}
                      onClick={() => handleSetAllPermissions('ALLOW')}
                      title="Allow All"
                    >
                      <Check size={16} weight="bold" />
                    </button>
                  </div>
                </div>

                <div className="search-row-fluxer">
                  <div className="search-input-wrapper">
                    <MagnifyingGlass size={16} weight="bold" className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search Permissions..."
                      value={permissionSearchQuery}
                      onChange={(e) => setPermissionSearchQuery(e.target.value)}
                      className="search-input-fluxer"
                    />
                  </div>
                  <div className="layout-buttons">
                    <button
                      className="layout-button"
                      onClick={() => setLayoutMode(layoutMode === 'comfy' ? 'dense' : 'comfy')}
                      title={layoutMode === 'comfy' ? 'Dense layout' : 'Comfy layout'}
                    >
                      <List size={20} weight="bold" />
                    </button>
                    <button
                      className="layout-button"
                      onClick={() => setGridMode(!gridMode)}
                      title={gridMode ? 'Single column' : 'Two columns'}
                    >
                      <GridFour size={20} weight={gridMode ? 'fill' : 'bold'} />
                    </button>
                  </div>
                </div>

                <div className={`permissions-list-fluxer ${layoutMode === 'dense' ? 'dense' : ''} ${gridMode ? 'grid' : ''}`}>
                  <h3 className="category-title-fluxer">General Channel Permissions</h3>
                  {filteredPermissions.map(perm => {
                    const Icon = perm.icon;
                    const isAllowed = selectedPermission[perm.field];
                    const state = getPermissionState(isAllowed, !isAllowed);
                    
                    return (
                      <div key={perm.field} className="permission-row-fluxer">
                        <div className="permission-info-fluxer">
                          <Icon size={20} />
                          <div>
                            <div className="permission-name-fluxer">{perm.name}</div>
                            {layoutMode === 'comfy' && (
                              <div className="permission-desc-fluxer">{perm.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="permission-controls-fluxer">
                          <button
                            className={`permission-btn-fluxer deny ${state === 'DENY' ? 'active' : ''}`}
                            onClick={() => handlePermissionChange(selectedPermission.id, perm.field, isAllowed)}
                            title="Deny"
                          >
                            <X size={16} weight="bold" />
                          </button>
                          <button
                            className={`permission-btn-fluxer allow ${state === 'ALLOW' ? 'active' : ''}`}
                            onClick={() => handlePermissionChange(selectedPermission.id, perm.field, isAllowed)}
                            title="Allow"
                          >
                            <Check size={16} weight="bold" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPermissions.length === 0 && (
                    <div className="empty-state-fluxer">No permissions found</div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state-fluxer">Select a role to view permissions</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelPermissionsModal;
