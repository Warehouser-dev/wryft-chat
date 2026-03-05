import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useVoiceChannel = (channelId, userId, username) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState([]);
  
  const localStream = useRef(null);
  const peerConnections = useRef(new Map());
  const audioElements = useRef(new Map());
  const ws = useRef(null);

  const sendWsMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('📤 Sending voice message:', message.type, message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket not ready, state:', ws.current?.readyState);
    }
  }, []);

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      localStream.current = stream;
      return true;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      
      if (err.name === 'NotAllowedError') {
        alert('Microphone access denied. Please enable microphone permissions in your browser and system settings, then try again.');
      } else if (err.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert(`Failed to access microphone: ${err.message}`);
      }
      
      return false;
    }
  }, []);

  const cleanupPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }

    const audio = audioElements.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audioElements.current.delete(peerId);
    }

    setParticipants(prev => prev.filter(p => p.peerId !== peerId));
  }, []);

  const createPeerConnection = useCallback((peerId, isInitiator) => {
    console.log(`🔗 Creating peer connection to ${peerId}, initiator: ${isInitiator}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        console.log('➕ Adding local track:', track.kind);
        pc.addTrack(track, localStream.current);
      });
    } else {
      console.log('⚠️ No local stream available');
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('🎵 Received remote track from', peerId, event.track.kind);
      const [remoteStream] = event.streams;
      
      // Create or update audio element
      let audio = audioElements.current.get(peerId);
      if (!audio) {
        console.log('🔊 Creating new audio element for', peerId);
        audio = new Audio();
        audio.autoplay = true;
        audioElements.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      console.log('✅ Audio element updated for', peerId);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to', peerId);
        sendWsMessage({
          type: 'voice_ice_candidate',
          channelId,
          peerId: userId,  // Our ID
          targetPeerId: peerId,  // Their ID
          candidate: event.candidate,
        });
      } else {
        console.log('✅ ICE gathering complete for', peerId);
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`🔌 Peer ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupPeerConnection(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);

    // If initiator, create and send offer
    if (isInitiator) {
      console.log('📞 Creating offer for', peerId);
      pc.createOffer()
        .then(offer => {
          console.log('✅ Offer created, setting local description');
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log('📤 Sending offer to', peerId);
          sendWsMessage({
            type: 'voice_offer',
            channelId,
            peerId: userId,
            targetPeerId: peerId,
            offer: pc.localDescription,
          });
        })
        .catch(err => console.error('❌ Failed to create offer:', err));
    }

    return pc;
  }, [channelId, userId, sendWsMessage, cleanupPeerConnection]);

  const handleSignalingMessage = useCallback((data) => {
    console.log('🔊 Handling signaling message:', data.type, data);
    
    switch (data.type) {
      case 'voice_user_joined':
        if (data.peerId !== userId) {
          console.log('✅ User joined:', data.username, 'peerId:', data.peerId);
          setParticipants(prev => {
            if (prev.some(p => p.peerId === data.peerId)) {
              console.log('⚠️ User already in participants list');
              return prev;
            }
            console.log('➕ Adding user to participants');
            return [...prev, { peerId: data.peerId, username: data.username }];
          });
          // Create offer to new user after a small delay to ensure they're ready
          setTimeout(() => {
            console.log('📞 Creating peer connection to:', data.peerId);
            createPeerConnection(data.peerId, true);
          }, 500);
        } else {
          console.log('⏭️ Ignoring own join message');
        }
        break;

      case 'voice_user_left':
        console.log('👋 User left:', data.peerId);
        cleanupPeerConnection(data.peerId);
        break;

      case 'voice_offer':
        console.log('📨 Received offer, targetPeerId:', data.targetPeerId, 'fromPeerId:', data.peerId, 'myId:', userId);
        if (data.targetPeerId === userId) {
          console.log('✅ Offer is for us from:', data.peerId);
          const pc = createPeerConnection(data.peerId, false);
          pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => {
              console.log('✅ Remote description set, creating answer');
              return pc.createAnswer();
            })
            .then(answer => {
              console.log('✅ Answer created, setting local description');
              return pc.setLocalDescription(answer);
            })
            .then(() => {
              console.log('📤 Sending answer to:', data.peerId);
              sendWsMessage({
                type: 'voice_answer',
                channelId,
                peerId: userId,
                targetPeerId: data.peerId,
                answer: pc.localDescription,
              });
            })
            .catch(err => console.error('❌ Failed to handle offer:', err));
        } else {
          console.log('⏭️ Offer not for us, target:', data.targetPeerId);
        }
        break;

      case 'voice_answer':
        console.log('📨 Received answer, targetPeerId:', data.targetPeerId, 'fromPeerId:', data.peerId, 'myId:', userId);
        if (data.targetPeerId === userId) {
          console.log('✅ Answer is for us from:', data.peerId);
          const pc = peerConnections.current.get(data.peerId);
          if (pc) {
            console.log('✅ Found peer connection, setting remote description');
            pc.setRemoteDescription(new RTCSessionDescription(data.answer))
              .then(() => console.log('✅ Remote description set successfully'))
              .catch(err => console.error('❌ Failed to set remote description:', err));
          } else {
            console.log('⚠️ No peer connection found for:', data.peerId);
          }
        } else {
          console.log('⏭️ Answer not for us, target:', data.targetPeerId);
        }
        break;

      case 'voice_ice_candidate':
        console.log('🧊 Received ICE candidate, targetPeerId:', data.targetPeerId, 'fromPeerId:', data.peerId, 'myId:', userId);
        if (data.targetPeerId === userId) {
          console.log('✅ ICE candidate is for us from:', data.peerId);
          const pc = peerConnections.current.get(data.peerId);
          if (pc) {
            console.log('✅ Found peer connection, adding ICE candidate');
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
              .then(() => console.log('✅ ICE candidate added successfully'))
              .catch(err => console.error('❌ Failed to add ICE candidate:', err));
          } else {
            console.log('⚠️ No peer connection found for:', data.peerId);
          }
        } else {
          console.log('⏭️ ICE candidate not for us, target:', data.targetPeerId);
        }
        break;

      case 'voice_participants':
        console.log('👥 Received participants list:', data.participants);
        setParticipants(data.participants.filter(p => p.peerId !== userId));
        // Create connections to existing participants
        data.participants.forEach(participant => {
          if (participant.peerId !== userId) {
            setTimeout(() => {
              createPeerConnection(participant.peerId, true);
            }, 500);
          }
        });
        break;
        
      default:
        console.log('⚠️ Unknown voice message type:', data.type);
    }
  }, [userId, channelId, createPeerConnection, cleanupPeerConnection, sendWsMessage]);

  const connect = useCallback(async () => {
    console.log('🎤 Connecting to voice channel:', channelId);
    const success = await initializeMedia();
    if (!success) {
      console.error('❌ Failed to initialize media');
      return false;
    }
    console.log('✅ Media initialized');

    // Create WebSocket connection
    const wsUrl = `ws://localhost:3001/ws?channel=${encodeURIComponent(`voice-${channelId}`)}&user=${encodeURIComponent(username)}`;
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('✅ Voice WebSocket connected');
      setIsConnected(true);
      
      // Notify server we're joining
      console.log('📢 Sending voice_join message');
      const joinMessage = {
        type: 'voice_join',
        channelId,
        peerId: userId,
        username,
      };
      console.log('📤 Join message:', joinMessage);
      ws.current.send(JSON.stringify(joinMessage));
      
      // Send heartbeat every 15 seconds to keep session alive
      const heartbeatInterval = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'voice_heartbeat',
            channelId,
            peerId: userId,
          }));
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 15000);
      
      // Store interval ID for cleanup
      ws.current.heartbeatInterval = heartbeatInterval;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type?.startsWith('voice_')) {
          handleSignalingMessage(data);
        } else {
          console.log('⏭️ Non-voice message:', data.type);
        }
      } catch (err) {
        console.error('❌ Failed to parse voice message:', err);
      }
    };

    ws.current.onerror = (error) => {
      console.error('❌ Voice WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('🔌 Voice WebSocket disconnected');
      setIsConnected(false);
      
      // Clear heartbeat interval
      if (ws.current && ws.current.heartbeatInterval) {
        clearInterval(ws.current.heartbeatInterval);
      }
    };

    return true;
  }, [channelId, userId, username, initializeMedia, handleSignalingMessage]);

  const disconnect = useCallback(() => {
    // Stop local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach((pc, peerId) => {
      cleanupPeerConnection(peerId);
    });

    // Notify server we're leaving
    sendWsMessage({
      type: 'voice_leave',
      channelId,
      peerId: userId,
    });

    // Close WebSocket
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setIsConnected(false);
    setParticipants([]);
  }, [channelId, userId, sendWsMessage, cleanupPeerConnection]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    
    // Mute all remote audio elements
    audioElements.current.forEach(audio => {
      audio.muted = newDeafened;
    });

    // Also mute self when deafened
    if (newDeafened && localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
      }
    }
  }, [isDeafened]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isMuted,
    isDeafened,
    participants,
    connect,
    disconnect,
    toggleMute,
    toggleDeafen,
    handleSignalingMessage,
  };
};
