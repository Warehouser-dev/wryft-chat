import { useEffect, useRef, useState } from 'react';

export function useWebSocket(channel, username, onMessage) {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeout = useRef(null);

  useEffect(() => {
    if (!channel || !username) return;

    const connect = () => {
      const wsUrl = `ws://localhost:3001/ws?channel=${encodeURIComponent(channel)}&user=${encodeURIComponent(username)}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
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
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
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
  }, [channel, username, onMessage]);

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  return { sendMessage, isConnected };
}
