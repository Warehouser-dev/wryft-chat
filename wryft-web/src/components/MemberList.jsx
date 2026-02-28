import { Crown, CaretDown } from 'phosphor-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserProfile from './UserProfile';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../hooks/usePresence';

function MemberList({ members, ownerId }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [memberAvatars, setMemberAvatars] = useState({});
  const [onlineCollapsed, setOnlineCollapsed] = useState(false);
  const [offlineCollapsed, setOfflineCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { serverId } = useParams();
  const { getUserStatus } = usePresence(serverId);

  // Sort members by status
  const onlineMembers = members.filter(m => m.status === 'online' || m.status === 'idle' || m.status === 'dnd' || m.status === 'focus');
  const offlineMembers = members.filter(m => m.status === 'offline');

  // Fetch avatars for all members
  useEffect(() => {
    const fetchAvatars = async () => {
      for (const member of members) {
        if (member.id && !memberAvatars[member.id]) {
          try {
            const profile = await api.getUserProfile(member.id);
            if (profile.avatar_url) {
              setMemberAvatars(prev => ({
                ...prev,
                [member.id]: profile.avatar_url
              }));
            }
          } catch (err) {
            // Ignore errors
          }
        }
      }
    };

    if (members.length > 0) {
      fetchAvatars();
    }
  }, [members]);

  const handleStartDM = async (member) => {
    try {
      const dm = await api.getOrCreateDM(user.id, member.id);
      setSelectedUser(null);
      navigate(`/channels/@me/${dm.id}`);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  const MemberItem = ({ member, isOwner }) => {
    const avatarUrl = memberAvatars[member.id];
    const status = member.status || 'offline';

    return (
      <div className="member-item" onClick={() => setSelectedUser(member)}>
        <div className="member-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={member.username} />
          ) : (
            <div className="avatar-placeholder">
              {member.username[0].toUpperCase()}
            </div>
          )}
          <div className={`member-status-indicator member-status-${status}`} />
        </div>
        <div className="member-info">
          <div className="member-name">
            {isOwner && <Crown size={14} className="owner-icon" weight="fill" />}
            {member.username}
          </div>
          <div className="member-discriminator">#{member.discriminator}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="member-list">
        <div className="member-section">
          <div 
            className="member-section-header" 
            onClick={() => setOnlineCollapsed(!onlineCollapsed)}
          >
            <CaretDown 
              size={12} 
              weight="bold" 
              className={`member-section-caret ${onlineCollapsed ? 'collapsed' : ''}`}
            />
            Online — {onlineMembers.length}
          </div>
          {!onlineCollapsed && onlineMembers.map(member => (
            <MemberItem
              key={member.id}
              member={member}
              isOwner={member.id === ownerId}
            />
          ))}
        </div>

        {offlineMembers.length > 0 && (
          <div className="member-section">
            <div 
              className="member-section-header"
              onClick={() => setOfflineCollapsed(!offlineCollapsed)}
            >
              <CaretDown 
                size={12} 
                weight="bold" 
                className={`member-section-caret ${offlineCollapsed ? 'collapsed' : ''}`}
              />
              Offline — {offlineMembers.length}
            </div>
            {!offlineCollapsed && offlineMembers.map(member => (
              <MemberItem
                key={member.id}
                member={member}
                isOwner={member.id === ownerId}
              />
            ))}
          </div>
        )}
      </div>

      <UserProfile
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        isOwner={selectedUser?.id === ownerId}
        onStartDM={() => handleStartDM(selectedUser)}
        canDM={selectedUser?.id !== user?.id}
      />
    </>
  );
}

export default MemberList;
