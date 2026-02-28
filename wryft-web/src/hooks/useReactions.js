import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const useReactions = (messageId, isDM = false) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReactions = useCallback(async () => {
    if (!messageId) return;
    
    try {
      const data = isDM 
        ? await api.getDMMessageReactions(messageId)
        : await api.getMessageReactions(messageId);
      setReactions(data);
    } catch (error) {
      console.error('Failed to load reactions:', error);
    }
  }, [messageId, isDM]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const addReaction = async (emoji) => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (isDM) {
        await api.addDMReaction(messageId, emoji);
      } else {
        await api.addReaction(messageId, emoji);
      }
      await loadReactions();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeReaction = async (emoji) => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (isDM) {
        await api.removeDMReaction(messageId, emoji);
      } else {
        await api.removeReaction(messageId, emoji);
      }
      await loadReactions();
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReaction = async (emoji, userId) => {
    const userReaction = reactions.find(r => r.emoji === emoji && r.user_id === userId);
    if (userReaction) {
      await removeReaction(emoji);
    } else {
      await addReaction(emoji);
    }
  };

  // Group reactions by emoji with counts
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user_id);
    return acc;
  }, {});

  return {
    reactions,
    groupedReactions: Object.values(groupedReactions),
    addReaction,
    removeReaction,
    toggleReaction,
    loading,
    refresh: loadReactions,
  };
};
