import { useEffect } from 'react';

const isTauri = typeof window !== 'undefined' && window.__TAURI__;

export const useDiscordRPC = () => {
  useEffect(() => {
    console.log('🎮 useDiscordRPC: Checking if Tauri...', isTauri);
    if (!isTauri) {
      console.log('⚠️  Not running in Tauri, Discord RPC disabled');
      return;
    }

    const initRPC = async () => {
      try {
        console.log('🎮 Calling init_discord_rpc...');
        await window.__TAURI__.core.invoke('init_discord_rpc');
        console.log('✅ Discord RPC initialized from React');
      } catch (error) {
        console.error('❌ Failed to initialize Discord RPC from React:', error);
      }
    };

    initRPC();
  }, []);

  const updatePresence = async (details, state, largeImage = null, largeText = null) => {
    if (!isTauri) {
      console.log('⚠️  Not in Tauri, skipping presence update');
      return;
    }

    try {
      console.log('🎮 Updating presence:', { details, state, largeImage, largeText });
      await window.__TAURI__.core.invoke('update_discord_presence', {
        details,
        stateText: state,
        largeImage,
        largeText,
      });
      console.log('✅ Presence updated from React');
    } catch (error) {
      console.error('❌ Failed to update Discord presence from React:', error);
    }
  };

  const clearPresence = async () => {
    if (!isTauri) return;

    try {
      await window.__TAURI__.core.invoke('clear_discord_presence');
      console.log('✅ Presence cleared from React');
    } catch (error) {
      console.error('❌ Failed to clear Discord presence from React:', error);
    }
  };

  return { updatePresence, clearPresence };
};
