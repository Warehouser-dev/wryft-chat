import { useEffect, useRef, useState } from 'react';

export function useWebSocket(channel, username, onMessage) {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const onMessageRef = useRef(onMessage);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000;

  // Keep the callback ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!channel || !username) return;

    const connect = () => {
      const wsUrl = `ws://localhost:3001/ws?channel=${encodeURIComponent(channel)}&user=${encodeURIComponent(username)}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [channel, username]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  return { sendMessage, isConnected, ws: ws.current };
}
