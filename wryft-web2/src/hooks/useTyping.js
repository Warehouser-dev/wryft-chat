import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export const useTyping = (channelId, dmId = null, currentUserId = null) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeout = useRef(null);
  const isTyping = useRef(false);

  const isDM = !!dmId;
  const id = isDM ? dmId : channelId;

  const loadTypingUsers = useCallback(async () => {
    if (!id) return;
    
    try {
      const users = isDM 
        ? await api.getDMTypingUsers(id)
        : await api.getTypingUsers(id);
      
      // Filter out current user
      const filtered = users.filter(u => u.user_id !== currentUserId);
      setTypingUsers(filtered);
    } catch (error) {
      console.error('Failed to load typing users:', error);
    }
  }, [id, isDM, currentUserId]);

  useEffect(() => {
    if (!id) return;

    loadTypingUsers();
    
    // Poll for typing users every 2 seconds
    const interval = setInterval(loadTypingUsers, 2000);
    
    return () => clearInterval(interval);
  }, [id, loadTypingUsers]);

  const startTyping = useCallback(async () => {
    if (!id || isTyping.current) return;
    
    isTyping.current = true;
    
    try {
      if (isDM) {
        await api.startDMTyping(id);
      } else {
        await api.startTyping(id);
      }
    } catch (error) {
      console.error('Failed to start typing:', error);
    }

    // Auto-stop typing after 8 seconds
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    typingTimeout.current = setTimeout(() => {
      stopTyping();
    }, 8000);
  }, [id, isDM]);

  const stopTyping = useCallback(async () => {
    if (!id || !isTyping.current) return;
    
    isTyping.current = false;
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    
    try {
      if (isDM) {
        await api.stopDMTyping(id);
      } else {
        await api.stopTyping(id);
      }
    } catch (error) {
      console.error('Failed to stop typing:', error);
    }
  }, [id, isDM]);

  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      if (isTyping.current) {
        stopTyping();
      }
    };
  }, [stopTyping]);

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
      : `${typingUsers.length} people are typing...`
    : '';

  return {
    typingUsers,
    typingText,
    startTyping: handleTyping,
    stopTyping,
    isTyping: typingUsers.length > 0,
  };
};
