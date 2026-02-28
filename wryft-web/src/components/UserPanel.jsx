import React, { useState, useEffect } from 'react';
import { Microphone, MicrophoneSlash, Headphones, Gear } from 'phosphor-react';
import UserSettings from './UserSettings';
import UserProfileCard from './UserProfileCard';
import { api } from '../services/api';
import { useIdleDetection } from '../hooks/useIdleDetection';

function UserPanel({ user }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [status, setStatus] = useState('online');

  const statusOptions = [
    { value: 'online', label: 'Online', color: '#3ba55d' },
    { value: 'dnd', label: 'Do Not Disturb', color: '#ed4245' },
    { value: 'focus', label: 'Focus Mode', color: '#9b59b6' },
    { value: 'offline', label: 'Offline', color: '#747f8d' },
  ];

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    
    // Save to localStorage for persistence
    if (newStatus !== 'offline' && newStatus !== 'idle') {
      localStorage.setItem('lastStatus', newStatus);
    }
    
    try {
      await api.updatePresence(newStatus);
    } catch (err) {
      console.error('Failed to update presence:', err);
    }
  };

  // Use idle detection hook
  useIdleDetection(status, handleStatusChange);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profile = await api.getUserProfile(user.id);
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }

          // Restore last status (if not offline)
          const lastStatus = localStorage.getItem('lastStatus');
          if (lastStatus && lastStatus !== 'offline' && lastStatus !== 'idle') {
            setStatus(lastStatus);
            await api.updatePresence(lastStatus);
          } else {
            // Default to online
            await api.updatePresence('online');
          }
        } catch (err) {
          console.error('Failed to fetch user profile/presence:', err);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Set offline when component unmounts (logout, navigation)
  // Note: This is best-effort and may not work on hard browser close
  useEffect(() => {
    return () => {
      // This runs on logout and navigation, but NOT on hard browser close
      if (user) {
        api.updatePresence('offline').catch(() => {
          // Silently fail - the heartbeat timeout will handle it
        });
      }
    };
  }, [user]);

  return (
    <>
      <div className="user-panel">
        <div className="user-info" onClick={() => setShowProfileCard(!showProfileCard)}>
          <div
            className="user-avatar"
            style={avatarUrl ? {
              backgroundImage: `url(${avatarUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            {!avatarUrl && user.username[0].toUpperCase()}
            <div className={`status-indicator ${status}`} />
          </div>
          <div className="user-details">
            <div className="user-name">{user.username}#{user.discriminator}</div>
            <div className="user-status">{statusOptions.find(o => o.value === status)?.label || 'Online'}</div>
          </div>
        </div>

        <div className="user-controls">
          <button
            className={`control-button ${isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicrophoneSlash size={20} weight="fill" /> : <Microphone size={20} weight="fill" />}
          </button>

          <button
            className={`control-button ${isDeafened ? 'active' : ''}`}
            onClick={() => setIsDeafened(!isDeafened)}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones size={20} />
          </button>

          <button
            className="control-button"
            onClick={() => setShowSettings(true)}
            title="User Settings"
          >
            <Gear size={20} weight="fill" />
          </button>
        </div>
      </div>

      {showProfileCard && (
        <UserProfileCard
          user={user}
          status={status}
          avatarUrl={avatarUrl}
          statusOptions={statusOptions}
          onStatusChange={handleStatusChange}
          onEditProfile={() => {
            setShowSettings(true);
            setShowProfileCard(false);
          }}
          onClose={() => setShowProfileCard(false)}
        />
      )}

      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

export default UserPanel;
