import { Crown } from 'lucide-react';
import { useState } from 'react';
import UserProfile from './UserProfile';

function MemberList({ members, ownerId }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const onlineMembers = members.filter(m => m.online);
  const offlineMembers = members.filter(m => !m.online);

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
      />
    </>
  );
}

export default MemberList;
