import { useState, useEffect } from 'react';
import { EllipsisVerticalIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { api } from '../services/api';
import UserProfile from './UserProfile';

function DMProfileSidebar({ dmUser, onClose }) {
  const [profile, setProfile] = useState(null);
  const [mutualServers, setMutualServers] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFullProfile, setShowFullProfile] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [dmUser?.id]);

  const loadProfile = async () => {
    if (!dmUser?.id) return;
    
    setLoading(true);
    try {
      const userProfile = await api.getUserProfile(dmUser.id);
      console.log('📊 DM Profile loaded:', userProfile);
      console.log('🎨 Banner color:', userProfile.banner_color);
      console.log('🎨 Banner color secondary:', userProfile.banner_color_secondary);
      console.log('🖼️ Banner URL:', userProfile.banner_url);
      setProfile(userProfile);
      
      // TODO: Load mutual servers and friends when backend endpoint exists
      setMutualServers([]);
      setMutualFriends([]);
    } catch (err) {
      console.error('Failed to load DM profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!dmUser) return null;

  const handleAvatarClick = () => {
    setShowFullProfile(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Generate banner style
  const getBannerStyle = () => {
    console.log('🎨 Generating banner style with profile:', profile);
    
    if (profile?.banner_url) {
      console.log('✅ Using banner URL:', profile.banner_url);
      return {
        backgroundImage: `url(${profile.banner_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    
    if (profile?.banner_color && profile?.banner_color_secondary) {
      console.log('✅ Using gradient:', profile.banner_color, 'to', profile.banner_color_secondary);
      return {
        background: `linear-gradient(135deg, ${profile.banner_color} 0%, ${profile.banner_color_secondary} 100%)`
      };
    }
    
    if (profile?.banner_color) {
      console.log('✅ Using solid color:', profile.banner_color);
      return {
        background: profile.banner_color
      };
    }
    
    console.log('⚠️ No banner customization, using default');
    return {
      background: '#5DADE2'
    };
  };

  // Get avatar border color (frame color)
  const getAvatarBorderStyle = () => {
    if (profile?.banner_color) {
      console.log('✅ Using frame color:', profile.banner_color);
      return {
        borderColor: profile.banner_color,
        borderWidth: '6px',
        borderStyle: 'solid'
      };
    }
    console.log('⚠️ No frame color, using default');
    return {
      borderColor: '#232428',
      borderWidth: '6px',
      borderStyle: 'solid'
    };
  };

  // Get username section background color (matches banner)
  const getUsernameSectionStyle = () => {
    if (profile?.banner_color) {
      console.log('✅ Using username box color:', profile.banner_color);
      return {
        background: 'rgba(0, 0, 0, 0.45)',
        border: 'none'
      };
    }
    return {
      background: 'rgba(0, 0, 0, 0.45)',
      border: 'none'
    };
  };

  // Get sidebar background color
  const getSidebarStyle = () => {
    if (profile?.banner_color) {
      // Discord-style: solid color at top that fades down to a tinted background
      return {
        background: `linear-gradient(to bottom, ${profile.banner_color} 0px, ${profile.banner_color} 120px, ${profile.banner_color}40 220px, ${profile.banner_color}10 100%)`
      };
    }
    return {
      background: 'linear-gradient(to bottom, #5DADE2 0px, #5DADE2 120px, #5DADE240 220px, #5DADE210 100%)'
    };
  };

  return (
    <div 
      className="dm-profile-sidebar"
      style={getSidebarStyle()}
    >
      {loading ? (
        <div className="dm-profile-loading">Loading...</div>
      ) : (
        <>
          <div className="dm-profile-banner" style={getBannerStyle()}>
            <button className="dm-profile-menu-btn" onClick={onClose}>
              <EllipsisVerticalIcon className="icon-24" />
            </button>
            <div className="dm-profile-avatar-wrapper">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={dmUser.username} 
                  className="dm-profile-avatar"
                  style={{...getAvatarBorderStyle(), cursor: 'pointer'}}
                  onClick={handleAvatarClick}
                />
              ) : (
                <div 
                  className="dm-profile-avatar-placeholder"
                  style={{...getAvatarBorderStyle(), cursor: 'pointer'}}
                  onClick={handleAvatarClick}
                >
                  {dmUser.username[0].toUpperCase()}
                </div>
              )}
              <div className={`dm-profile-status ${dmUser.status || 'offline'}`} />
            </div>
          </div>

          <div className="dm-profile-body">
            <div 
              className="dm-profile-username-section"
              style={getUsernameSectionStyle()}
            >
              <div className="dm-profile-username">{dmUser.username}</div>
              <div className="dm-profile-tag">@{dmUser.username}#{dmUser.discriminator}</div>
            </div>

            <div className="dm-profile-divider" />

            <div className="dm-profile-section">
              <div className="dm-profile-section-title">Member Since</div>
              <div className="dm-profile-section-value">{formatDate(profile?.created_at)}</div>
            </div>

            <div className="dm-profile-divider" />

            <div className="dm-profile-clickable-section">
              <div className="dm-profile-section-content">
                <div className="dm-profile-section-title">{mutualServers.length} Mutual Servers</div>
              </div>
              <ChevronRightIcon className="icon-20 dm-profile-chevron" />
            </div>

            <div className="dm-profile-divider" />

            <div className="dm-profile-clickable-section">
              <div className="dm-profile-section-content">
                <div className="dm-profile-section-title">{mutualFriends.length} Mutual Friends</div>
              </div>
              <ChevronRightIcon className="icon-20 dm-profile-chevron" />
            </div>

            <div className="dm-profile-divider" />
          </div>
        </>
      )}

      <UserProfile
        user={{
          id: dmUser.id,
          username: dmUser.username,
          discriminator: dmUser.discriminator,
          avatar_url: profile?.avatar_url,
          about_me: profile?.about_me,
          created_at: profile?.created_at,
          banner_color: profile?.banner_color,
          banner_color_secondary: profile?.banner_color_secondary,
          banner_url: profile?.banner_url,
          is_premium: profile?.is_premium
        }}
        isOpen={showFullProfile}
        onClose={() => setShowFullProfile(false)}
        isOwner={false}
        onStartDM={() => {}}
        canDM={false}
      />
    </div>
  );
}

export default DMProfileSidebar;
