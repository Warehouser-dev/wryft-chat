import React, { useState } from 'react';
import { Search, Plus, User } from 'lucide-react';
import UserPanel from './UserPanel';

function DMSidebar({ activeDM, setActiveDM, user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Empty DM list - users will add DMs as they chat
  const [dms] = useState([]);

  const filteredDMs = dms.filter(dm => 
    dm.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="dm-header">
        <div className="dm-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Find or start a conversation"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dm-search-input"
          />
        </div>
      </div>

      <div className="dm-list">
        <div className="dm-section-header">
          <span>Direct Messages</span>
          <button className="dm-add-button" title="Create DM">
            <Plus size={16} />
          </button>
        </div>

        {filteredDMs.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#72767d', fontSize: '14px' }}>
            No direct messages yet
          </div>
        )}

        {filteredDMs.map(dm => (
          <div
            key={dm.id}
            className={`dm-item ${activeDM?.id === dm.id ? 'active' : ''}`}
            onClick={() => setActiveDM(dm)}
          >
            <div className="dm-avatar">
              <User size={20} />
              <span className={`status-indicator ${dm.status}`} />
            </div>
            <div className="dm-info">
              <div className="dm-username">{dm.username}#{dm.discriminator}</div>
              <div className="dm-last-message">{dm.lastMessage}</div>
            </div>
          </div>
        ))}
      </div>

      <UserPanel user={user} />
    </div>
  );
}

export default DMSidebar;
