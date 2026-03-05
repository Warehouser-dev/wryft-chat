import { useEffect } from 'react';
import { useGlobalWebSocket } from './useGlobalWebSocket';

export const useRealtimeStatus = (user, onStatusUpdate) => {
  useGlobalWebSocket(user, (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'presence_update' || data.type === 'PresenceUpdate') {
        const userId = data.userId || data.user_id;
        const status = data.status;
        
        if (userId && status) {
          onStatusUpdate(userId, status);
        }
      }
    } catch (err) {
      console.error('Failed to parse presence update:', err);
    }
  });
};
