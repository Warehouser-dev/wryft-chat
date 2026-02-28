import { useEffect, useRef } from 'react';
import { config } from '../config';

// Global WebSocket instance (singleton)
let globalWs = null;
let wsListeners = new Set();
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second

export const useGlobalWebSocket = (user, onMessage) => {
  const listenerRef = useRef(onMessage);

  useEffect(() => {
    listenerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!user) return;

    // Create listener wrapper
    const listener = (event) => {
      if (listenerRef.current) {
        listenerRef.current(event);
      }
    };

    // Add listener
    wsListeners.add(listener);

    // Create WebSocket if it doesn't exist
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
      connectWebSocket(user);
    }

    // Cleanup
    return () => {
      wsListeners.delete(listener);
      
      // Close WebSocket if no more listeners
      if (wsListeners.size === 0 && globalWs) {
        globalWs.close();
        globalWs = null;
        reconnectAttempts = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      }
    };
  }, [user]);
};

function connectWebSocket(user) {
  try {
    // Connect to user-specific channel for DM notifications
    const channel = `user-${user.id}`;
    globalWs = new WebSocket(`${config.wsUrl}?channel=${encodeURIComponent(channel)}&user=${encodeURIComponent(user.username)}`);

    globalWs.onopen = () => {
      console.log('Global WebSocket connected');
      reconnectAttempts = 0; // Reset on successful connection
    };

    globalWs.onmessage = (event) => {
      // Broadcast to all listeners
      wsListeners.forEach(listener => {
        try {
          listener(event);
        } catch (err) {
          console.error('WebSocket listener error:', err);
        }
      });
    };

    globalWs.onerror = (error) => {
      console.error('Global WebSocket error:', error);
    };

    globalWs.onclose = (event) => {
      console.log('Global WebSocket closed', event.code, event.reason);
      globalWs = null;
      
      // Reconnect with exponential backoff if there are still listeners
      if (wsListeners.size > 0 && !reconnectTimer && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
        reconnectAttempts++;
        
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (wsListeners.size > 0) {
            connectWebSocket(user);
          }
        }, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    };
  } catch (err) {
    console.error('Failed to create WebSocket:', err);
  }
}
