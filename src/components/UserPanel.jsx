import React, { useState } from 'react';
import { Mic, MicOff, Headphones, Settings } from 'lucide-react';
import UserSettings from './UserSettings';

function UserPanel({ user }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="user-panel">
        <div className="user-info">
          <div className="user-avatar">
            {user.username[0].toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user.username}#{user.discriminator}</div>
            <div className="user-status">Online</div>
          </div>
        </div>
        
        <div className="user-controls">
          <button
            className={`control-button ${isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
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
            <Settings size={20} />
          </button>
        </div>
      </div>

      <UserSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}

export default UserPanel;
