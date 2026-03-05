import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export const usePresence = (guildId = null) => {
  const [presenceMap, setPresenceMap] = useState({});
  const heartbeatInterval = useRef(null);

  const loadGuildPresence = useCallback(async () => {
    if (!guildId) return;

    try {
      const presences = await api.getGuildPresence(guildId);
      const map = {};
      presences.forEach(p => {
        map[p.user_id] = p.status;
      });
      setPresenceMap(map);
    } catch (error) {
      console.error('Failed to load presence:', error);
    }
  }, [guildId]);

  const updatePresence = async (status) => {
    try {
      await api.updatePresence(status);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  };

  const startHeartbeat = useCallback(() => {
    // Send heartbeat every 30 seconds to stay online
    heartbeatInterval.current = setInterval(async () => {
      try {
        await api.presenceHeartbeat();
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (guildId) {
      loadGuildPresence();
      // Refresh presence every minute
      const interval = setInterval(loadGuildPresence, 60000);
      return () => clearInterval(interval);
    }
  }, [guildId, loadGuildPresence]);

  useEffect(() => {
    // Start heartbeat when hook is mounted
    startHeartbeat();

    return () => {
      stopHeartbeat();
    };
  }, [startHeartbeat, stopHeartbeat]);

  const getUserStatus = (userId) => {
    return presenceMap[userId] || 'offline';
  };

  return {
    presenceMap,
    getUserStatus,
    updatePresence,
    refresh: loadGuildPresence,
  };
};
