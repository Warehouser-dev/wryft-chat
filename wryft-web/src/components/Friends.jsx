import { useState, useEffect, useCallback } from 'react';
import { 
  UsersIcon, 
  ClockIcon, 
  UserMinusIcon, 
  CheckIcon, 
  XMarkIcon, 
  EllipsisVerticalIcon 
} from '@heroicons/react/24/solid';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRealtimeStatus } from '../hooks/useRealtimeStatus';

function Friends({ onStartDM }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [friendStatuses, setFriendStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendDiscriminator, setFriendDiscriminator] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const handleStatusUpdate = useCallback((userId, status) => {
    setFriendStatuses(prev => ({
      ...prev,
      [userId]: status
    }));
  }, []);

  useRealtimeStatus(user, handleStatusUpdate);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const loadStatuses = async () => {
      if (friends.length === 0) return;
      
      const userIds = friends.map(f => f.user_id);
      
      try {
        const statuses = await api.getBulkPresence(userIds);
        setFriendStatuses(statuses);
      } catch (err) {
        console.error('Failed to load bulk statuses:', err);
        const fallback = {};
        friends.forEach(f => fallback[f.user_id] = 'offline');
        setFriendStatuses(fallback);
      }
    };

    loadStatuses();
    const interval = setInterval(loadStatuses, 60000);
    return () => clearInterval(interval);
  }, [friends]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, pendingData, outgoingData, blockedData] = await Promise.all([
        api.getFriends(),
        api.getPendingRequests(),
        api.getOutgoingRequests(),
        api.getBlockedUsers(),
      ]);
      setFriends(friendsData);
      setPendingRequests(pendingData);
      setOutgoingRequests(outgoingData);
      setBlockedUsers(blockedData);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!friendUsername.trim() || !friendDiscriminator.trim()) {
      setError('Please enter both username and discriminator');
      return;
    }

    try {
      await api.sendFriendRequest(friendUsername.trim(), friendDiscriminator.trim());
      setSuccess(`Friend request sent to \${friendUsername}#\${friendDiscriminator}!`);
      setFriendUsername('');
      setFriendDiscriminator('');
      loadData();
    } catch (err) {
      if (err.message.includes('409')) {
        setError('Friend request already exists or you are already friends');
      } else if (err.message.includes('404')) {
        setError('User not found');
      } else if (err.message.includes('403')) {
        setError('Cannot send friend request to this user');
      } else {
        setError('Failed to send friend request');
      }
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await api.acceptFriendRequest(friendshipId);
      loadData();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      await api.declineFriendRequest(friendshipId);
      loadData();
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleRemoveFriend = async (friendUserId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.removeFriend(friendUserId);
      loadData();
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!confirm('Are you sure you want to block this user?')) return;
    try {
      await api.blockUser(userId);
      loadData();
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await api.unblockUser(userId);
      loadData();
    } catch (err) {
      console.error('Failed to unblock user:', err);
    }
  };

  const handleStartDM = async (friend) => {
    setContextMenu(null);
    if (onStartDM) {
      onStartDM(friend);
    }
  };

  const renderFriendCard = (friend, actions) => {
    const status = friendStatuses[friend.user_id] || 'offline';
    
    return (
      <div key={friend.id} className="friend-card">
        <div className="friend-info">
          <div className="friend-avatar-wrapper">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt={friend.username} className="friend-avatar" />
            ) : (
              <div className="friend-avatar-placeholder">
                {friend.username.charAt(0).toUpperCase()}
              </div>
            )}
            {friendStatuses[friend.user_id] && (
              <div className={`status-indicator \${status}`} />
            )}
          </div>
          <div className="friend-details">
            <div className="friend-name">
              {friend.username}
              <span className="friend-discriminator">#{friend.discriminator}</span>
            </div>
            {friendStatuses[friend.user_id] && (
              <div className="friend-status-text">
                {status === 'online' && 'Online'}
                {status === 'idle' && 'Idle'}
                {status === 'dnd' && 'Do Not Disturb'}
                {status === 'focus' && 'Focus Mode'}
                {status === 'offline' && 'Offline'}
              </div>
            )}
          </div>
        </div>
        <div className="friend-actions">{actions}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="friends-container">
        <div className="friends-header">
          <div className="friends-header-left">
            <UsersIcon className="icon-24 friends-header-icon" />
            <h2 className="friends-header-title">Friends</h2>
          </div>
        </div>
        <div className="friends-loading">Loading friends...</div>
      </div>
    );
  }

  const onlineFriends = friends.filter(f => {
    const status = friendStatuses[f.user_id];
    return status === 'online' || status === 'idle' || status === 'dnd' || status === 'focus';
  });

  return (
    <div className="friends-container">
      <div className="friends-header">
        <div className="friends-header-left">
          <UsersIcon className="icon-24 friends-header-icon" />
          <h2 className="friends-header-title">Friends</h2>
          <div className="friends-tabs">
            <button
              className={`friends-tab \${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`friends-tab \${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="tab-badge">{pendingRequests.length}</span>
              )}
            </button>
            <button
              className={`friends-tab \${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocked')}
            >
              Blocked
            </button>
            <button
              className={`friends-tab \${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              Add Friend
            </button>
          </div>
        </div>
      </div>

      <div className="friends-main-content">
        <div className="friends-content">
          {activeTab === 'add' && (
            <div className="add-friend-section">
              <h3 className="add-friend-title">ADD FRIEND</h3>
              <p className="add-friend-hint">
                You can add friends with their Wryft username and discriminator.
              </p>
              <form onSubmit={handleSendRequest} className="add-friend-form">
                <input
                  type="text"
                  placeholder="You can add friends with their Wryft Tag. It's cAsE sEnSitIvE!"
                  value={friendUsername ? `\${friendUsername}#\${friendDiscriminator}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parts = value.split('#');
                    setFriendUsername(parts[0] || '');
                    setFriendDiscriminator(parts[1] || '');
                  }}
                  className="friend-input-large"
                />
                <button type="submit" className="send-request-btn">
                  Send Friend Request
                </button>
              </form>
              {error && <div className="friend-message error">{error}</div>}
              {success && <div className="friend-message success">{success}</div>}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="friends-list">
              <div className="friends-list-header">
                ALL FRIENDS — {friends.length}
              </div>
              {friends.length === 0 ? (
                <div className="friends-empty-state">
                  <UsersIcon className="empty-state-icon" />
                  <p className="empty-state-text">No one's around to play with Wumpus.</p>
                </div>
              ) : (
                friends.map((friend) =>
                  renderFriendCard(
                    friend,
                    <div className="friend-menu-container">
                      <button
                        className="friend-action-btn more"
                        onClick={() =>
                          setContextMenu(contextMenu === friend.id ? null : friend.id)
                        }
                        title="More"
                      >
                        <EllipsisVerticalIcon className="icon-20" />
                      </button>
                      {contextMenu === friend.id && (
                        <div className="friend-context-menu">
                          <button onClick={() => handleStartDM(friend)}>
                            Message
                          </button>
                          <button onClick={() => handleRemoveFriend(friend.user_id)}>
                            Remove Friend
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleBlockUser(friend.user_id)}
                          >
                            Block
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="friends-list">
              {pendingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <div className="friends-empty-state">
                  <ClockIcon className="empty-state-icon" />
                  <p className="empty-state-text">There are no pending friend requests. Here's Wumpus for now.</p>
                </div>
              ) : (
                <>
                  {pendingRequests.length > 0 && (
                    <div className="pending-section">
                      <div className="friends-list-header">
                        INCOMING — {pendingRequests.length}
                      </div>
                      {pendingRequests.map((request) =>
                        renderFriendCard(
                          request,
                          <>
                            <button
                              className="friend-action-btn accept"
                              onClick={() => handleAcceptRequest(request.id)}
                              title="Accept"
                            >
                              <CheckIcon className="icon-20" />
                            </button>
                            <button
                              className="friend-action-btn decline"
                              onClick={() => handleDeclineRequest(request.id)}
                              title="Decline"
                            >
                              <XMarkIcon className="icon-20" />
                            </button>
                          </>
                        )
                      )}
                    </div>
                  )}
                  {outgoingRequests.length > 0 && (
                    <div className="pending-section">
                      <div className="friends-list-header">
                        OUTGOING — {outgoingRequests.length}
                      </div>
                      {outgoingRequests.map((request) =>
                        renderFriendCard(
                          request,
                          <button
                            className="friend-action-btn cancel"
                            onClick={() => handleRemoveFriend(request.user_id)}
                            title="Cancel"
                          >
                            <XMarkIcon className="icon-20" />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'blocked' && (
            <div className="friends-list">
              <div className="friends-list-header">
                BLOCKED — {blockedUsers.length}
              </div>
              {blockedUsers.length === 0 ? (
                <div className="friends-empty-state">
                  <UserMinusIcon className="empty-state-icon" />
                  <p className="empty-state-text">You can't unblock the Wumpus.</p>
                </div>
              ) : (
                blockedUsers.map((blocked) =>
                  renderFriendCard(
                    blocked,
                    <button
                      className="friend-action-btn unblock"
                      onClick={() => handleUnblockUser(blocked.user_id)}
                    >
                      Unblock
                    </button>
                  )
                )
              )}
            </div>
          )}
        </div>

        <div className="friends-activity-sidebar">
          <div className="activity-header">
            <h3 className="activity-title">Active Now</h3>
          </div>
          
          <div className="activity-content">
            {onlineFriends.length === 0 ? (
              <div className="activity-empty">
                <div className="activity-empty-icon">
                  <UsersIcon className="icon-32" />
                </div>
                <p className="activity-empty-text">It's quiet for now...</p>
                <p className="activity-empty-subtext">
                  When a friend starts an activity—like playing a game or hanging out on voice—we'll show it here!
                </p>
              </div>
            ) : (
              <div className="activity-list">
                {onlineFriends.map((friend) => {
                  const status = friendStatuses[friend.user_id] || 'offline';
                  return (
                    <div key={friend.id} className="activity-card">
                      <div className="activity-user-info">
                        <div className="activity-avatar-wrapper">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.username} className="activity-avatar" />
                          ) : (
                            <div className="activity-avatar-placeholder">
                              {friend.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`status-indicator \${status}`} />
                        </div>
                        <div className="activity-user-details">
                          <div className="activity-username">{friend.username}</div>
                          <div className="activity-status">
                            {status === 'online' && 'Online'}
                            {status === 'idle' && 'Idle'}
                            {status === 'dnd' && 'Do Not Disturb'}
                            {status === 'focus' && 'Focus Mode'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Friends;
