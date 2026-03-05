import { useEffect, useState } from 'react';
import { webrtcManager } from '../utils/webrtc';
import { useGlobalWebSocket } from './useGlobalWebSocket';

export const useWebRTC = (user) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Handle WebSocket messages for WebRTC
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('🔔 useWebRTC received message:', data.type, data);
      
      // Handle WebRTC signals
      if (data.type === 'webrtc_signal') {
        console.log('📞 Received WebRTC signal:', data.signal_type);
        webrtcManager.handleSignal(
          data.from_user_id,
          data.signal_type,
          data.signal_data
        );
      }
      
      // Handle incoming call
      if (data.type === 'incoming_call') {
        console.log('📞 INCOMING CALL DETECTED from:', data.caller_id, 'callId:', data.call_id);
        setIncomingCall({
          callId: data.call_id,
          callerId: data.caller_id,
          callType: data.call_type,
        });
      }
      
      // Handle call response
      if (data.type === 'call_response') {
        console.log('📞 Call response:', data.accepted ? 'accepted' : 'rejected');
        if (!data.accepted) {
          webrtcManager.endCall();
          setActiveCall(null);
        }
      }
      
      // Handle call ended
      if (data.type === 'call_ended') {
        console.log('📞 Call ended by:', data.ended_by);
        webrtcManager.endCall();
        setActiveCall(null);
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Error handling WebRTC message:', error);
    }
  };

  // Subscribe to global WebSocket
  useGlobalWebSocket(user, handleWebSocketMessage);

  // Set up WebRTC callbacks
  useEffect(() => {
    webrtcManager.onCallEnded = () => {
      setActiveCall(null);
      setIncomingCall(null);
    };

    return () => {
      webrtcManager.onCallEnded = null;
    };
  }, []);

  const initiateCall = async (calleeId, calleeUsername, callType = 'voice') => {
    try {
      const response = await webrtcManager.initiateCall(calleeId, callType);
      setActiveCall({
        callId: response.call_id,
        userId: calleeId,
        username: calleeUsername,
        type: callType,
        isOutgoing: true,
      });
      return response;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  };

  const answerCall = async (callerUsername) => {
    if (!incomingCall) return;
    
    try {
      await webrtcManager.answerCall(
        incomingCall.callId,
        incomingCall.callerId,
        incomingCall.callType
      );
      
      setActiveCall({
        callId: incomingCall.callId,
        userId: incomingCall.callerId,
        username: callerUsername,
        type: incomingCall.callType,
        isOutgoing: false,
      });
      
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      await webrtcManager.rejectCall(incomingCall.callId, incomingCall.callerId);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  const endCall = async () => {
    try {
      await webrtcManager.endCall();
      setActiveCall(null);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  return {
    incomingCall,
    activeCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
  };
};
