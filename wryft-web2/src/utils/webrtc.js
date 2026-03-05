// WebRTC Manager for voice/video calls
import { api } from '../services/api';

class WebRTCManager {
  constructor() {
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.currentChannelId = null;
    this.currentCallId = null;
    
    // ICE servers configuration (STUN/TURN)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  }

  // Initialize local media stream
  async getLocalStream(audio = true, video = false) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }

  // Create peer connection for a user
  createPeerConnection(userId, isInitiator = false) {
    const pc = new RTCPeerConnection(this.iceServers);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(userId, 'ice-candidate', {
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, event.streams[0]);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.removePeer(userId);
      }
    };

    this.peerConnections.set(userId, pc);
    return pc;
  }

  // Send WebRTC signaling data via WebSocket
  sendSignal(toUserId, signalType, signalData) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    // Send via WebSocket if available (from global context)
    if (window.globalWs && window.globalWs.readyState === WebSocket.OPEN) {
      window.globalWs.send(JSON.stringify({
        type: 'webrtc_signal',
        from_user_id: currentUser.id,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData,
        channel_id: this.currentChannelId,
      }));
    } else {
      console.error('WebSocket not available for signaling');
    }
  }

  // Handle incoming WebRTC signal
  async handleSignal(fromUserId, signalType, signalData) {
    let pc = this.peerConnections.get(fromUserId);

    if (signalType === 'offer') {
      if (!pc) {
        pc = this.createPeerConnection(fromUserId, false);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.sendSignal(fromUserId, 'answer', {
        type: answer.type,
        sdp: answer.sdp,
      });
    } else if (signalType === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      }
    } else if (signalType === 'ice-candidate') {
      if (pc && signalData.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    }
  }

  // Join a voice channel
  async joinVoiceChannel(channelId, userIds) {
    this.currentChannelId = channelId;
    
    // Get local stream
    await this.getLocalStream(true, false);

    // Create peer connections for all users in the channel
    for (const userId of userIds) {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (userId === currentUser.id) continue;

      const pc = this.createPeerConnection(userId, true);
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.sendSignal(userId, 'offer', {
        type: offer.type,
        sdp: offer.sdp,
      });
    }
  }

  // Leave voice channel
  leaveVoiceChannel() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    
    this.currentChannelId = null;
  }

  // Initiate a DM call
  async initiateCall(calleeId, callType = 'voice') {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📞 Initiating call:', {
        callId,
        callerId: currentUser.id,
        calleeId,
        callType
      });
      
      this.currentCallId = callId;
      
      // Try to get local stream, but don't fail if unavailable
      try {
        await this.getLocalStream(callType === 'voice', callType === 'video');
      } catch (mediaError) {
        console.warn('Could not access media devices:', mediaError);
        // Continue without local stream - user can still receive audio/video
      }
      
      // Send call initiation via WebSocket
      if (window.globalWs && window.globalWs.readyState === WebSocket.OPEN) {
        const callMessage = {
          type: 'incoming_call',
          call_id: callId,
          caller_id: currentUser.id,
          callee_id: calleeId,
          call_type: callType,
        };
        console.log('📤 Sending call message via WebSocket:', callMessage);
        window.globalWs.send(JSON.stringify(callMessage));
      } else {
        console.error('❌ WebSocket not available! State:', window.globalWs?.readyState);
      }
      
      return { call_id: callId, status: 'ringing' };
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  // Answer an incoming call
  async answerCall(callId, callerId, callType = 'voice') {
    try {
      this.currentCallId = callId;
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      // Try to get local stream, but don't fail if unavailable
      try {
        await this.getLocalStream(callType === 'voice', callType === 'video');
      } catch (mediaError) {
        console.warn('Could not access media devices:', mediaError);
        // Continue without local stream - user can still receive audio/video
      }
      
      // Create peer connection
      const pc = this.createPeerConnection(callerId, false);
      
      // Send acceptance via WebSocket
      if (window.globalWs && window.globalWs.readyState === WebSocket.OPEN) {
        window.globalWs.send(JSON.stringify({
          type: 'call_response',
          call_id: callId,
          caller_id: callerId,
          accepted: true,
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  // Reject a call
  async rejectCall(callId, callerId) {
    try {
      // Send rejection via WebSocket
      if (window.globalWs && window.globalWs.readyState === WebSocket.OPEN) {
        window.globalWs.send(JSON.stringify({
          type: 'call_response',
          call_id: callId,
          caller_id: callerId,
          accepted: false,
        }));
      }
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  }

  // End a call
  async endCall(otherUserId = null) {
    if (this.currentCallId) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        // Send end call via WebSocket
        if (window.globalWs && window.globalWs.readyState === WebSocket.OPEN) {
          const endCallMsg = {
            type: 'call_ended',
            call_id: this.currentCallId,
            ended_by: currentUser.id,
          };
          
          // Add other_user_id if provided
          if (otherUserId) {
            endCallMsg.other_user_id = otherUserId;
          }
          
          window.globalWs.send(JSON.stringify(endCallMsg));
        }
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
    
    this.leaveVoiceChannel();
    this.currentCallId = null;
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  // Toggle mute
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return muted state
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return video off state
      }
    }
    return false;
  }

  // Remove a peer connection
  removePeer(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
  }

  // Clean up
  cleanup() {
    this.leaveVoiceChannel();
    this.currentCallId = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
  }
}

export const webrtcManager = new WebRTCManager();
