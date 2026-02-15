import { Crown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from './UserProfile';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function MemberList({ members, ownerId }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const onlineMembers = members.filter(m => m.online);
  const offlineMembers = members.filter(m => !m.online);

  const handleStartDM = async (member) => {
    try {
      const dm = await api.getOrCreateDM(user.id, member.id);
      setSelectedUser(null);
      navigate(`/channels/@me/${dm.id}`);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  const MemberItem = ({ member, isOwner }) => (
    <div className="member-item" onClick={() => setSelectedUser(member)}>
      <div className="member-avatar">
        {member.username[0].toUpperCase()}
        <div className={`member-status ${member.online ? 'online' : 'offline'}`} />
      </div>
      <div className="member-info">
        <div className="member-name">
          {isOwner && <Crown size={14} className="owner-icon" />}
          {member.username}
        </div>
        <div className="member-discriminator">#{member.discriminator}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="member-list">
        <div className="member-section">
          <div className="member-section-header">
            Online — {onlineMembers.length}
          </div>
          {onlineMembers.map(member => (
            <MemberItem 
              key={member.id} 
              member={member} 
              isOwner={member.id === ownerId}
            />
          ))}
        </div>

        {offlineMembers.length > 0 && (
          <div className="member-section">
            <div className="member-section-header">
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.map(member => (
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
