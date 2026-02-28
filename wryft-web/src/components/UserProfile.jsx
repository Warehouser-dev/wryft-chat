import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { CalendarIcon, EnvelopeIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function UserProfile({ user, isOpen, onClose, isOwner, onStartDM, canDM = true }) {
  const { user: currentUser } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [aboutMe, setAboutMe] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [bannerColor, setBannerColor] = useState('#2F6CCE');
  const [bannerColorSecondary, setBannerColorSecondary] = useState('#2F6CCE');
  const [bannerUrl, setBannerUrl] = useState('');
  const [activeTab, setActiveTab] = useState('user-info');
  const [mutualGuilds, setMutualGuilds] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [loadingMutuals, setLoadingMutuals] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profile = await api.getUserProfile(user.id);
          setAvatarUrl(profile.avatar_url);
          setAboutMe(profile.about_me);
          setIsPremium(profile.is_premium || false);
          setBannerColor(profile.banner_color || '#2F6CCE');
          setBannerColorSecondary(profile.banner_color_secondary || '#2F6CCE');
          setBannerUrl(profile.banner_url || '');
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      }
    };

    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  // Fetch mutual data when tabs are clicked
  useEffect(() => {
    const fetchMutuals = async () => {
      if (!currentUser || !user || currentUser.id === user.id) return;
      
      setLoadingMutuals(true);
      try {
        if (activeTab === 'mutual-servers') {
          const guilds = await api.getMutualGuilds(currentUser.id, user.id);
          setMutualGuilds(guilds);
        } else if (activeTab === 'mutual-friends') {
          const friends = await api.getMutualFriends(currentUser.id, user.id);
          setMutualFriends(friends);
        }
      } catch (err) {
        console.error('Failed to fetch mutuals:', err);
      } finally {
        setLoadingMutuals(false);
      }
    };

    if (isOpen && (activeTab === 'mutual-servers' || activeTab === 'mutual-friends')) {
      fetchMutuals();
    }
  }, [isOpen, activeTab, currentUser, user]);

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const joinDate = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });

  const getBannerStyle = () => {
    if (bannerUrl) {
      return {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  };

  const getModalStyle = () => {
    if (bannerColor) {
      return {
        background: `linear-gradient(to bottom, ${bannerColor} 0px, ${bannerColor} 120px, ${bannerColor}40 220px, ${bannerColor}10 100%)`
      };
    }
    return {
      background: 'var(--bg-sidebar)'
    };
  };

  return (
    <div className={`profile-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div 
        className="profile-modal-new" 
        onClick={(e) => e.stopPropagation()}
        style={getModalStyle()}
      >
        <button className="profile-close" onClick={handleClose}>
          <XMarkIcon className="icon-24" />
        </button>

        <div 
          className="profile-banner-new" 
          style={getBannerStyle()} 
        />
        
        <div className="profile-content-new">
          <div className="profile-avatar-section-new">
            <div 
              className="profile-avatar-large-new"
              style={{
                ...(avatarUrl ? {
                  backgroundImage: `url(${avatarUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}),
                borderColor: isPremium && bannerColor ? bannerColor : 'var(--bg-sidebar)'
              }}
            >
              {!avatarUrl && user.username[0].toUpperCase()}
              <div 
                className={`profile-status-new ${user.online ? 'online' : 'offline'}`}
                data-tooltip={user.online ? 'Online' : 'Offline'}
                style={{ borderColor: isPremium && bannerColor ? bannerColor : 'var(--bg-sidebar)' }}
              />
            </div>
          </div>

          <div className="profile-info-new">
            <div className="profile-username-new">
              {user.username}
              <span className="profile-discriminator-new">#{user.discriminator}</span>
              <div className="profile-badges-new">
                {isPremium && (
                  <div className="profile-badge-wrapper" data-tooltip="Premium">
                    <img src="/premium.png" alt="Premium" className="profile-badge-icon" />
                  </div>
                )}
                {isOwner && (
                  <div className="profile-badge-wrapper" data-tooltip="Server Owner">
                    <SparklesIcon className="profile-badge-icon owner-badge-icon" />
                  </div>
                )}
              </div>
            </div>

            <div className="profile-tabs">
              <button 
                className={`profile-tab ${activeTab === 'user-info' ? 'active' : ''}`}
                onClick={() => setActiveTab('user-info')}
              >
                User Info
              </button>
              <button 
                className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
              <button 
                className={`profile-tab ${activeTab === 'mutual-servers' ? 'active' : ''}`}
                onClick={() => setActiveTab('mutual-servers')}
              >
                Mutual Servers
              </button>
              <button 
                className={`profile-tab ${activeTab === 'mutual-friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('mutual-friends')}
              >
                Mutual Friends
              </button>
            </div>

            <div className="profile-tab-content">
              {activeTab === 'user-info' && (
                <>
                  {aboutMe && (
                    <div className="profile-section-new">
                      <div className="profile-section-title">ABOUT ME</div>
                      <div className="profile-section-text">{aboutMe}</div>
                    </div>
                  )}

                  <div className="profile-section-new">
                    <div className="profile-section-title">MEMBER SINCE</div>
                    <div className="profile-section-text">{joinDate}</div>
                  </div>
                </>
              )}

              {activeTab === 'activity' && (
                <div className="profile-empty-state">
                  <div className="profile-empty-text">No activity to show</div>
                </div>
              )}

              {activeTab === 'mutual-servers' && (
                loadingMutuals ? (
                  <div className="profile-empty-state">
                    <div className="profile-empty-text">Loading...</div>
                  </div>
                ) : mutualGuilds.length > 0 ? (
                  <div className="mutual-list">
                    {mutualGuilds.map(guild => (
                      <div key={guild.id} className="mutual-item">
                        <div className="mutual-icon">
                          {guild.icon_url ? (
                            <img src={guild.icon_url} alt={guild.name} />
                          ) : (
                            guild.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="mutual-name">{guild.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-empty-state">
                    <div className="profile-empty-text">No mutual servers</div>
                  </div>
                )
              )}

              {activeTab === 'mutual-friends' && (
                loadingMutuals ? (
                  <div className="profile-empty-state">
                    <div className="profile-empty-text">Loading...</div>
                  </div>
                ) : mutualFriends.length > 0 ? (
                  <div className="mutual-list">
                    {mutualFriends.map(friend => (
                      <div key={friend.id} className="mutual-item">
                        <div className="mutual-avatar">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt={friend.username} />
                          ) : (
                            friend.username[0].toUpperCase()
                          )}
                        </div>
                        <div className="mutual-name">
                          {friend.username}
                          <span className="mutual-discriminator">#{friend.discriminator}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-empty-state">
                    <div className="profile-empty-text">No mutual friends</div>
                  </div>
                )
              )}
            </div>

            {canDM && (
              <button className="profile-message-btn-new" onClick={onStartDM}>
                <ChatBubbleLeftIcon className="icon-16" />
                Send Message
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
