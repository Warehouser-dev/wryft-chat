import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneSlash, Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, X, SpeakerHigh, SpeakerSlash } from 'phosphor-react';
import { webrtcManager } from '../utils/webrtc';

function CallModal({ 
  isOpen, 
  callType, // 'incoming' or 'outgoing'
  callData, // { callId, userId, username, avatar }
  onClose,
  onAccept,
  onReject 
}) {
  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting', 'ringing', 'connected', 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (isOpen && callStatus === 'connected') {
      // Start call duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen, callStatus]);

  useEffect(() => {
    if (isOpen) {
      // Set initial status based on call type
      if (callType === 'outgoing') {
        setCallStatus('ringing');
      } else if (callType === 'incoming') {
        setCallStatus('ringing');
      } else if (callType === 'connected') {
        setCallStatus('connected');
      }
      
      // Set up WebRTC callbacks
      webrtcManager.onRemoteStream = (userId, stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setCallStatus('connected');
      };

      webrtcManager.onCallEnded = () => {
        setCallStatus('ended');
        setTimeout(() => {
          onClose();
        }, 2000);
      };

      // Set local stream
      if (webrtcManager.localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = webrtcManager.localStream;
      }
    } else {
      // Reset status when modal closes
      setCallStatus('connecting');
      setDuration(0);
    }

    return () => {
      webrtcManager.onRemoteStream = null;
      webrtcManager.onCallEnded = null;
    };
  }, [isOpen, onClose, callType]);

  const handleAccept = async () => {
    setCallStatus('connecting');
    await onAccept();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const handleEndCall = async () => {
    await webrtcManager.endCall();
    onClose();
  };

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

  if (!isOpen) return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-discord">
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
            <div className="call-user-name">{currentUser.username || 'You'}</div>
            {callStatus === 'connected' && (
              <div className="call-user-status">Connected</div>
            )}
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
            <div className="call-user-name">{callData.username}</div>
            {callStatus === 'ringing' && (
              <div className="call-user-status">
                {callType === 'incoming' ? 'Calling...' : 'Ringing...'}
              </div>
            )}
            {callStatus === 'connected' && (
              <div className="call-user-status">Connected</div>
            )}
            {callStatus === 'connecting' && (
              <div className="call-user-status">Connecting...</div>
            )}
          </div>
        </div>

        {/* Call Duration */}
        {callStatus === 'connected' && (
          <div className="call-duration">{formatDuration(duration)}</div>
        )}

        {/* Video Streams (hidden for voice calls) */}
        {callData.isVideo && (
          <div className="call-modal-videos">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline
              className="call-modal-remote-video"
            />
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className="call-modal-local-video"
            />
          </div>
        )}

        {/* Call Controls */}
        <div className="call-controls-bar">
          {callType === 'incoming' && callStatus === 'ringing' ? (
            <>
              <button className="call-control-btn call-accept" onClick={handleAccept} title="Accept">
                <Phone size={28} weight="fill" />
              </button>
              <button className="call-control-btn call-reject" onClick={handleReject} title="Reject">
                <PhoneSlash size={28} weight="fill" />
              </button>
            </>
          ) : callStatus === 'connected' || callStatus === 'ringing' ? (
            <>
              <button 
                className={`call-control-btn ${isMuted ? 'active' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicrophoneSlash size={24} weight="fill" /> : <Microphone size={24} weight="fill" />}
              </button>
              
              {callData.isVideo && (
                <button 
                  className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
                  onClick={handleToggleVideo}
                  title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                  {isVideoOff ? <VideoCameraSlash size={24} weight="fill" /> : <VideoCamera size={24} weight="fill" />}
                </button>
              )}

              <button 
                className={`call-control-btn ${isDeafened ? 'active' : ''}`}
                onClick={handleToggleDeafen}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened ? <SpeakerSlash size={24} weight="fill" /> : <SpeakerHigh size={24} weight="fill" />}
              </button>
              
              <button className="call-control-btn call-end" onClick={handleEndCall} title="End Call">
                <PhoneSlash size={28} weight="fill" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CallModal;
