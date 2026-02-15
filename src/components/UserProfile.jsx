import { X, Crown, Calendar, Mail } from 'lucide-react';

function UserProfile({ user, isOpen, onClose, isOwner }) {
  if (!isOpen || !user) return null;

  const joinDate = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="profile-banner" />
        
        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user.username[0].toUpperCase()}
              <div className={`profile-status ${user.online ? 'online' : 'offline'}`} />
            </div>
          </div>

          <div className="profile-info-section">
            <div className="profile-username">
              {isOwner && <Crown size={20} className="profile-crown" />}
              {user.username}
              <span className="profile-discriminator">#{user.discriminator}</span>
            </div>

            <div className="profile-divider" />

            <div className="profile-details">
              <div className="profile-detail-item">
                <Mail size={16} />
                <div>
                  <div className="profile-detail-label">Email</div>
                  <div className="profile-detail-value">{user.email || 'Not provided'}</div>
                </div>
              </div>

              <div className="profile-detail-item">
                <Calendar size={16} />
                <div>
                  <div className="profile-detail-label">Member Since</div>
                  <div className="profile-detail-value">{joinDate}</div>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="profile-badge">
                <Crown size={14} />
                Server Owner
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
