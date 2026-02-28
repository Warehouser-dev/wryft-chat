import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let intervalId;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_URL}/api/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsConnected(response.ok);
        setIsInitialLoad(false);
      } catch (error) {
        setIsConnected(false);
        setIsInitialLoad(false);
      }
    };

    // Check immediately
    checkConnection();

    // Then check every 10 seconds
    intervalId = setInterval(checkConnection, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { isConnected, isInitialLoad };
}
