import React, { useState, useEffect } from 'react';
import { Phone, PhoneSlash, Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, SpeakerHigh, SpeakerSlash } from 'phosphor-react';
import { webrtcManager } from '../utils/webrtc';

function CallOverlay({ 
  callData, // { callId, userId, username, avatar, isVideo }
  callStatus, // 'ringing', 'connected'
  onEndCall 
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [duration, setDuration] = useState(0);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    let timer;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  const handleToggleMute = () => {
    const muted = webrtcManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleVideo = () => {
    const videoOff = webrtcManager.toggleVideo();
    setIsVideoOff(videoOff);
  };

  const handleToggleDeafen = () => {
    setIsDeafened(!isDeafened);
    // TODO: Implement actual deafen logic
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-overlay">
      {/* User Cards */}
      <div className="call-users-grid">
        {/* Current User Card */}
        <div className="call-user-card">
          <div 
            className="call-user-avatar"
            style={currentUser.avatar_url ? {
              backgroundImage: `url(${currentUser.avatar_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            {!currentUser.avatar_url && currentUser.username && currentUser.username[0].toUpperCase()}
          </div>
          <div className="call-user-info">
            <div className="call-user-name">{currentUser.username || 'You'}</div>
            {callStatus === 'connected' && (
              <div className="call-user-status">Connected</div>
            )}
          </div>
        </div>

        {/* Other User Card */}
        <div className="call-user-card">
          <div 
            className="call-user-avatar"
            style={callData.avatar ? {
              backgroundImage: `url(${callData.avatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            {!callData.avatar && callData.username[0].toUpperCase()}
          </div>
          <div className="call-user-info">
            <div className="call-user-name">{callData.username}</div>
            {callStatus === 'ringing' && (
              <div className="call-user-status">Ringing...</div>
            )}
            {callStatus === 'connected' && (
              <div className="call-user-status">Connected • {formatDuration(duration)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="call-controls-bar">
        <button 
          className={`call-control-btn ${isMuted ? 'active' : ''}`}
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicrophoneSlash size={20} weight="fill" /> : <Microphone size={20} weight="fill" />}
        </button>
        
        {callData.isVideo && (
          <button 
            className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
          >
            {isVideoOff ? <VideoCameraSlash size={20} weight="fill" /> : <VideoCamera size={20} weight="fill" />}
          </button>
        )}

        <button 
          className={`call-control-btn ${isDeafened ? 'active' : ''}`}
          onClick={handleToggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <SpeakerSlash size={20} weight="fill" /> : <SpeakerHigh size={20} weight="fill" />}
        </button>
        
        <button 
          className="call-control-btn call-end" 
          onClick={onEndCall} 
          title="End Call"
        >
          <PhoneSlash size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
}

export default CallOverlay;
