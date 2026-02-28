import { useState, useEffect, useCallback } from 'react';
import { UserGroupIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/solid';
import UserPanel from './UserPanel';
import { api } from '../services/api';
import { useRealtimeStatus } from '../hooks/useRealtimeStatus';

function DMSidebar({ activeDM, setActiveDM, user, onLogout, onFriendsClick, showFriends, onNotesClick, showNotes, onPremiumClick, showPremium }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dms, setDms] = useState([]);
  const [dmStatuses, setDmStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  // Handle real-time status updates
  const handleStatusUpdate = useCallback((userId, status) => {
    setDmStatuses(prev => ({
      ...prev,
      [userId]: status
    }));
  }, []);

  // Use real-time status hook
  useRealtimeStatus(user, handleStatusUpdate);

  useEffect(() => {
    if (user?.id) {
      loadDMs();
    }
  }, [user]);

  // Load DM user statuses - OPTIMIZED with bulk API
  useEffect(() => {
    const loadStatuses = async () => {
      if (dms.length === 0) return;
      
      const userIds = dms.map(dm => dm.other_user.id);
      
      try {
        const statuses = await api.getBulkPresence(userIds);
        setDmStatuses(statuses);
      } catch (err) {
        console.error('Failed to load bulk DM statuses:', err);
        // Fallback: set all to offline
        const fallback = {};
        dms.forEach(dm => fallback[dm.other_user.id] = 'offline');
        setDmStatuses(fallback);
      }
    };

    loadStatuses();
    
    // Refresh statuses every 60 seconds (reduced from 30s for scale)
    const interval = setInterval(loadStatuses, 60000);
    return () => clearInterval(interval);
  }, [dms]);

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
    <div className="sidebar dm-sidebar">
      <div className="dm-top-section">
        <div className="dm-search-header">
          <div className="dm-search-wrapper">
            <input
              type="text"
              placeholder="Find or start conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dm-search-main"
            />
          </div>
        </div>

        {/* Friends Section */}
        <div 
          className={`dm-category-item ${showFriends ? 'active' : ''}`}
          onClick={onFriendsClick}
        >
          <UserGroupIcon className="icon-24 dm-category-icon" />
          <span className="dm-category-label">Friends</span>
        </div>

        {/* Personal Notes Section */}
        <div 
          className={`dm-category-item ${showNotes ? 'active' : ''}`}
          onClick={onNotesClick}
        >
          <DocumentTextIcon className="icon-24 dm-category-icon" />
          <span className="dm-category-label">Personal Notes</span>
        </div>

        {/* Premium Section */}
        <div 
          className={`dm-category-item ${showPremium ? 'active' : ''}`}
          onClick={onPremiumClick}
        >
          <SparklesIcon className="icon-24 dm-category-icon premium-icon-glow" />
          <span className="dm-category-label">Premium</span>
        </div>
      </div>

      <div className="dm-list">

        {/* Direct Messages Section */}
        <div className="dm-section-divider">
          <span className="dm-section-title">DIRECT MESSAGES</span>
        </div>

        {loading && (
          <div className="dm-loading">
            Loading...
          </div>
        )}

        {!loading && filteredDMs.length === 0 && !searchQuery && (
          <div className="dm-empty">
            No direct messages yet
          </div>
        )}

        {!loading && filteredDMs.length === 0 && searchQuery && (
          <div className="dm-empty">
            No results found
          </div>
        )}

        {filteredDMs.map(dm => {
          const status = dmStatuses[dm.other_user.id] || 'offline';
          const statusText = dm.other_user.custom_status || (status === 'online' ? 'Online' : 'Offline');
          return (
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
              <div className="dm-avatar" style={dm.other_user.avatar_url ? {
                backgroundImage: `url(${dm.other_user.avatar_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}>
                {!dm.other_user.avatar_url && dm.other_user.username[0].toUpperCase()}
                <div className={`status-indicator ${status}`} />
              </div>
              <div className="dm-info">
                <div className="dm-username">
                  {dm.other_user.username}
                </div>
                <div className="dm-status">
                  {statusText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <UserPanel user={user} />
    </div>
  );
}

export default DMSidebar;
