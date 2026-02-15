import { useState, useEffect } from 'react';
import { Search, Plus, User } from 'lucide-react';
import UserPanel from './UserPanel';
import { api } from '../services/api';

function DMSidebar({ activeDM, setActiveDM, user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dms, setDms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDMs();
    }
  }, [user]);

  const loadDMs = async () => {
    try {
      const userDMs = await api.getUserDMs(user.id);
      setDms(userDMs);
    } catch (err) {
      console.error('Failed to load DMs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDMs = dms.filter(dm => 
    dm.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
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
        </div>

        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#72767d', fontSize: '14px' }}>
            Loading...
          </div>
        )}

        {!loading && filteredDMs.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#72767d', fontSize: '14px' }}>
            No direct messages yet. Click on a member in a server to start chatting!
          </div>
        )}

        {filteredDMs.map(dm => (
          <div
            key={dm.id}
            className={`dm-item ${activeDM?.id === dm.id ? 'active' : ''}`}
            onClick={() => setActiveDM({
              id: dm.id,
              username: dm.other_user.username,
              discriminator: dm.other_user.discriminator,
              user_id: dm.other_user.id,
            })}
          >
            <div className="dm-avatar">
              {dm.other_user.username[0].toUpperCase()}
            </div>
            <div className="dm-info">
              <div className="dm-username">
                {dm.other_user.username}#{dm.other_user.discriminator}
              </div>
            </div>
          </div>
        ))}
      </div>

      <UserPanel user={user} />
    </div>
  );
}

export default DMSidebar;
