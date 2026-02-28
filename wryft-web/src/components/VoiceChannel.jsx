import React, { useEffect, useRef } from 'react';
import { SpeakerHigh, SpeakerSlash, Headphones, PhoneDisconnect } from 'phosphor-react';
import { useVoiceChannel } from '../hooks/useVoiceChannel';
import { api } from '../services/api';

function VoiceChannel({ channelId, channelName, user, serverId, onClose }) {
  const {
    isConnected,
    isMuted,
    isDeafened,
    participants,
    connect,
    disconnect,
    toggleMute,
    toggleDeafen,
  } = useVoiceChannel(channelId, user.id, user.username);

  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    connect();
    
    // Start heartbeat to keep session alive
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await api.heartbeatVoiceChannel(channelId);
        console.log('💓 Heartbeat sent');
      } catch (err) {
        console.error('Failed to send heartbeat:', err);
      }
    }, 15000); // Every 15 seconds
    
    // Broadcast to server channel that we joined
    let serverWs = null;
    if (serverId) {
      serverWs = new WebSocket(`ws://localhost:3001/ws?channel=server-${serverId}&user=${user.username}`);
      serverWs.onopen = () => {
        serverWs.send(JSON.stringify({
          type: 'voice_user_joined',
          channelId,
          peerId: user.id,
          username: user.username,
        }));
      };
    }

    // Handle page unload/refresh
    const handleBeforeUnload = () => {
      // Synchronously leave voice channel
      const token = localStorage.getItem('token');
      if (token) {
        // Use sendBeacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
        navigator.sendBeacon(
          `http://localhost:3001/api/voice/${channelId}/leave`,
          blob
        );
      }
      
      // Broadcast leave via WebSocket if still open
      if (serverWs && serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify({
          type: 'voice_user_left',
          channelId,
          peerId: user.id,
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Broadcast that we're leaving
      if (serverWs && serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(JSON.stringify({
          type: 'voice_user_left',
          channelId,
          peerId: user.id,
        }));
        serverWs.close();
      }
      disconnect();
    };
  }, [connect, disconnect, channelId, serverId, user.id, user.username]);

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="voice-channel-panel">
      <div className="voice-channel-header">
        <div className="voice-channel-info">
          <SpeakerHigh size={20} weight="fill" />
          <span>{channelName}</span>
        </div>
        <button className="voice-disconnect-btn" onClick={handleDisconnect}>
          <PhoneDisconnect size={18} weight="fill" />
        </button>
      </div>

      <div className="voice-participants">
        <div className="voice-participant">
          <div className="voice-avatar">{user.username[0].toUpperCase()}</div>
          <span className="voice-username">{user.username} (You)</span>
          {isMuted && <SpeakerSlash size={16} className="voice-status-icon muted" weight="fill" />}
          {isDeafened && <SpeakerSlash size={16} className="voice-status-icon deafened" weight="fill" />}
        </div>

        {participants.map((participant) => (
          <div key={participant.peerId} className="voice-participant">
            <div className="voice-avatar">{participant.username[0].toUpperCase()}</div>
            <span className="voice-username">{participant.username}</span>
            <SpeakerHigh size={16} className="voice-status-icon speaking" weight="fill" />
          </div>
        ))}
      </div>

      <div className="voice-controls">
        <button
          className={`voice-control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <SpeakerSlash size={20} weight="fill" /> : <SpeakerHigh size={20} weight="fill" />}
        </button>
        <button
          className={`voice-control-btn ${isDeafened ? 'active' : ''}`}
          onClick={toggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <SpeakerSlash size={20} weight="fill" /> : <Headphones size={20} weight="fill" />}
        </button>
      </div>
    </div>
  );
}

export default VoiceChannel;
