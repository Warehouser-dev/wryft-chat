import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';
import ServerList from './components/ServerList';
import Sidebar from './components/Sidebar';
import DMSidebar from './components/DMSidebar';
import Chat from './components/Chat';
import EmptyState from './components/EmptyState';
import ConnectionBanner from './components/ConnectionBanner';
import MemberList from './components/MemberList';
import VoiceChannel from './components/VoiceChannel';
import ServerDiscovery from './components/ServerDiscovery';
import PersonalNotes from './components/PersonalNotes';
import PremiumPage from './components/PremiumPage';
import Friends from './components/Friends';
import ToastContainer from './components/ToastContainer';
import SplashScreen from './components/SplashScreen';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { config } from './config';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useGlobalWebSocket } from './hooks/useGlobalWebSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { initNotifications, unlockAudio, notifyDM, notificationManager } from './utils/notifications';
import { getUnreadCounts, getMentionCounts } from './utils/unreadTracker';
import { updateFaviconFromUnreads } from './utils/faviconBadge';
import { loadTheme, applyTheme, saveTheme } from './utils/theme';
import { useDiscordRPC } from './hooks/useDiscordRPC';
import IncomingCallPopup from './components/IncomingCallPopup';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';

function App() {
  const { user, logout } = useAuth();
  const { serverId, channelId, dmId } = useParams();
  const navigate = useNavigate();
  const { isConnected, isInitialLoad } = useConnectionStatus();
  const { updatePresence, clearPresence } = useDiscordRPC();

  const [servers, setServers] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [activeDM, setActiveDM] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [voiceChannel, setVoiceChannel] = useState(null);
  const [voiceChannelUsers, setVoiceChannelUsers] = useState({});
  const [hasCleanedVoice, setHasCleanedVoice] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // 'list' = show conversation list, 'chat' = show chat panel
  const [mobileView, setMobileView] = useState('list');
  const [callerInfo, setCallerInfo] = useState(null);

  // WebRTC hook for handling calls
  const webrtc = useWebRTC(user);

  const viewMode = showDiscovery ? 'discovery' : (dmId || activeDM || showFriends || showNotes || showPremium ? 'dm' : serverId ? 'server' : 'dm');
  const activeServer = serverId || null;
  const heartbeatInterval = React.useRef(null);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcut: Ctrl+/ = shortcuts modal
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Listen for DM notifications on user-specific WebSocket channel
  useGlobalWebSocket(user, (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('🌐 Global WebSocket message:', data);

      if (data.type === 'dm_message') {
        // Check if this is from someone else
        if (data.author_id !== user?.id) {
          // Get notification settings
          const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"dms":true}');
          
          if (settings.dms) {
            // Only notify if window is not focused or DM is not currently open
            const isWindowFocused = document.hasFocus() && !document.hidden;
            const isDMOpen = dmId === data.dm_id;

            if (!isWindowFocused || !isDMOpen) {
              const messageAuthor = data.author;
              console.log('💬 DM notification received from:', messageAuthor);
              
              notificationManager.showDMNotification(
                { text: data.content },
                messageAuthor,
                () => navigate(`/channels/@me/${data.dm_id}`)
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse global WebSocket message:', err);
    }
  });

  // Global Presence Heartbeat
  useEffect(() => {
    if (user && isConnected) {
      // Send initial heartbeat
      api.presenceHeartbeat();

      // Start interval
      heartbeatInterval.current = setInterval(async () => {
        try {
          await api.presenceHeartbeat();
        } catch (error) {
          console.error('Presence heartbeat failed:', error);
        }
      }, 30000);
    }

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      // Set offline when component unmounts (logout, page close, etc.)
      if (user) {
        api.updatePresence('offline').catch(err => {
          console.error('Failed to set offline on unmount:', err);
        });
      }
    };
  }, [user, isConnected]);

  // Initialize notifications on mount
  useEffect(() => {
    loadTheme();
    initNotifications();

    // Initialize favicon badge with current unread counts
    const unreads = getUnreadCounts();
    const mentions = getMentionCounts();
    updateFaviconFromUnreads(unreads, mentions);

    console.log('🚀 App initialized with unreads:', unreads, 'mentions:', mentions);

    // Aggressive audio unlocking on ANY user interaction
    const handleUserInteraction = () => {
      unlockAudio();
    };

    // Listen for multiple interaction types
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, capture: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, { capture: true });
      });
    };
  }, []);

  // Handle incoming calls
  useEffect(() => {
    if (webrtc.incomingCall) {
      // Fetch caller info
      const fetchCallerInfo = async () => {
        try {
          const callerProfile = await api.getUserProfile(webrtc.incomingCall.callerId);
          setCallerInfo({
            username: callerProfile.username,
            avatar: callerProfile.avatar_url,
            callType: webrtc.incomingCall.callType,
          });
        } catch (err) {
          console.error('Failed to fetch caller info:', err);
          setCallerInfo({
            username: 'Unknown User',
            avatar: null,
            callType: webrtc.incomingCall.callType,
          });
        }
      };

      fetchCallerInfo();
    } else {
      setCallerInfo(null);
    }
  }, [webrtc.incomingCall]);

  const handleAcceptCall = async () => {
    if (!webrtc.incomingCall || !callerInfo) return;

    try {
      await webrtc.answerCall(callerInfo.username);
      setCallerInfo(null); // Just hide the popup, the CallOverlay in Chat will show
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleRejectCall = async () => {
    if (!webrtc.incomingCall) return;

    try {
      await webrtc.rejectCall();
      setCallerInfo(null);
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await webrtc.endCall();
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadGuilds();
      // Sync theme from backend
      api.getUserProfile(user.id).then(profile => {
        if (profile.theme_config) {
          applyTheme(profile.theme_config);
          saveTheme(profile.theme_config);
        }
      }).catch(err => console.error('Failed to sync theme:', err));
    }
  }, [user]);

  useEffect(() => {
    if (serverId && user) {
      loadGuildMembers(serverId);
      loadGuildChannels(serverId);
      loadGuildRoles(serverId);
      loadGuildVoiceUsers(serverId);

      // Clean up voice sessions only once on initial load
      if (!hasCleanedVoice) {
        cleanupUserVoiceSessions();
        setHasCleanedVoice(true);
      }

      const guild = servers.find(s => s.id === serverId);
      setCurrentGuild(guild);
    }
  }, [serverId, user, servers]);

  // Update Discord Rich Presence
  useEffect(() => {
    if (!currentGuild || !activeChannel) return;

    const channelObj = channels.find(c => c.id === activeChannel);
    const channelName = channelObj?.name || 'Unknown Channel';

    updatePresence(
      `In ${currentGuild.name}`,
      `#${channelName}`,
      'wryft_logo', // You'll need to upload this to Discord Developer Portal
      'Wryft - Connect Without Limits'
    );
  }, [currentGuild, activeChannel, channels, updatePresence]);

  // Clear Discord presence when viewing DMs, friends, etc.
  useEffect(() => {
    if (showFriends || showNotes || showPremium || showDiscovery) {
      let details = 'Using Wryft';
      if (showFriends) details = 'Browsing Friends';
      if (showNotes) details = 'Personal Notes';
      if (showPremium) details = 'Premium Page';
      if (showDiscovery) details = 'Server Discovery';

      updatePresence(details, '', 'wryft_logo', 'Wryft - Connect Without Limits');
    }
  }, [showFriends, showNotes, showPremium, showDiscovery, updatePresence]);

  const cleanupUserVoiceSessions = async () => {
    // Clean up all voice sessions for this user (in case of page reload while in VC)
    try {
      // Get all servers
      const allServers = await api.getUserGuilds();

      // For each server, get voice channels and leave them
      for (const server of allServers) {
        try {
          const serverChannels = await api.getGuildChannels(server.id);
          const voiceChannels = serverChannels.filter(c => c.channel_type === 'voice');

          for (const channel of voiceChannels) {
            try {
              await api.leaveVoiceChannel(channel.id);
            } catch (err) {
              // Ignore - not in this channel
            }
          }
        } catch (err) {
          // Ignore server errors
        }
      }

      // Reload voice users after cleanup
      if (serverId) {
        loadGuildVoiceUsers(serverId);
      }
    } catch (err) {
      console.error('Failed to cleanup voice sessions:', err);
    }
  };

  const loadGuildVoiceUsers = async (guildId) => {
    try {
      const voiceData = await api.getGuildVoiceUsers(guildId);
      const voiceMap = {};
      voiceData.forEach(channel => {
        voiceMap[channel.channel_id] = channel.users;
      });
      setVoiceChannelUsers(voiceMap);
    } catch (err) {
      console.error('Failed to load voice users:', err);
    }
  };

  const loadGuilds = async () => {
    try {
      const guilds = await api.getUserGuilds();
      setServers(guilds);
    } catch (err) {
      console.error('Failed to load guilds:', err);
    }
  };

  const loadGuildMembers = async (guildId) => {
    try {
      const guildMembers = await api.getGuildMembers(guildId);
      setMembers(guildMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const loadGuildChannels = async (guildId) => {
    try {
      const guildChannels = await api.getGuildChannels(guildId);
      setChannels(guildChannels);

      // Only set active channel if we don't have a channelId from URL
      if (!channelId) {
        // Find first text channel (not voice)
        const firstTextChannel = guildChannels.find(c => c.channel_type === 'text' || !c.channel_type);
        if (firstTextChannel) {
          setActiveChannel(firstTextChannel.name);
        } else {
          // No text channels, clear active channel
          setActiveChannel(null);
        }
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadGuildRoles = async (guildId) => {
    try {
      const guildRoles = await api.getGuildRoles(guildId);
      setRoles(guildRoles);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId);
    }
  }, [channelId]);

  // Update document title based on current view
  useEffect(() => {
    if (viewMode === 'dm' && activeDM) {
      document.title = `Wryft | @${activeDM.username}`;
    } else if (viewMode === 'server' && activeServer && activeChannel) {
      const serverName = currentGuild?.name || 'Server';
      document.title = `Wryft | ${serverName} | #${activeChannel}`;
    } else if (viewMode === 'dm' && !activeDM) {
      document.title = 'Wryft | Direct Messages';
    } else {
      document.title = 'Wryft';
    }
  }, [viewMode, activeDM, activeServer, activeChannel, currentGuild]);

  useEffect(() => {
    if (dmId && user) {
      loadDMData(dmId);
    }
  }, [dmId, user]);

  const loadDMData = async (id) => {
    try {
      // Load DM messages
      const dmMessages = await api.getDMMessages(user.id, id);

      // Set messages
      const formattedMessages = dmMessages.map(m => ({
        id: m.id,
        text: m.text,
        author: m.author,
        author_discriminator: m.author_discriminator,
        author_id: m.author_id,
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString() : '',
        edited: !!m.edited_at,
      }));

      setMessages(prev => ({
        ...prev,
        [`dm-${id}`]: formattedMessages,
      }));

      // Get the DM info to set the active DM with proper user info
      const userDMs = await api.getUserDMs(user.id);
      const currentDM = userDMs.find(dm => dm.id === id);

      if (currentDM) {
        setActiveDM({
          id: currentDM.id,
          username: currentDM.other_user.username,
          discriminator: currentDM.other_user.discriminator,
          user_id: currentDM.other_user.id,
        });
      }
    } catch (err) {
      console.error('Failed to load DM:', err);
    }
  };

  useEffect(() => {
    if (user && activeChannel && activeServer && viewMode === 'server') {
      const channelKey = `${activeServer}-${activeChannel}`;
      loadMessages(channelKey);
    }
  }, [activeChannel, user, activeServer, viewMode]);

  // Removed duplicate DM message loading - loadDMData already handles this

  const loadMessages = async (channel) => {
    setLoading(true);
    try {
      const channelMessages = await api.getMessages(channel);
      setMessages(prev => ({
        ...prev,
        [channel]: channelMessages,
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (text, attachments = null) => {
    try {
      if (viewMode === 'dm' && activeDM) {
        // Send DM message with attachments
        const savedMessage = await api.sendDMMessage(user.id, activeDM.id, text, attachments);
        return savedMessage;
      } else {
        // Send server message
        const channelKey = `${activeServer}-${activeChannel}`;
        const savedMessage = await api.sendMessage(
          channelKey,
          text,
          user.username,
          attachments
        );
        return savedMessage;
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      return null;
    }
  };

  const handleReceiveMessage = (wsMessage) => {
    const channelKey = viewMode === 'dm' ? `dm-${activeDM?.id}` : `${activeServer}-${activeChannel}`;

    // Convert WebSocket message format to our message format
    const message = {
      id: wsMessage.id,
      text: wsMessage.content,
      author: wsMessage.author.split('#')[0],
      author_id: wsMessage.author_id,
      timestamp: wsMessage.timestamp || new Date().toLocaleTimeString(),
      attachments: wsMessage.attachments,
    };

    // Check if message is from someone else
    if (message.author_id !== user?.id) {
      // Get notification settings
      const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"messages":true,"dms":true,"mentions":true}');
      
      // Check if user is mentioned
      const isMentioned = message.text && message.text.includes(`@${user?.username}`);
      
      // Show notification if window is not focused or channel is not active
      const isWindowFocused = document.hasFocus() && !document.hidden;
      const isChannelActive = viewMode === 'dm' 
        ? dmId === activeDM?.id 
        : serverId === activeServer && channelId === activeChannel;

      if (!isWindowFocused || !isChannelActive) {
        
        if (isMentioned && settings.mentions) {
          // Show mention notification
          const channelName = channels.find(c => c.id === activeChannel)?.name || 'channel';
          notificationManager.showMentionNotification(message, channelName, () => {
            if (viewMode === 'dm') {
              navigate(`/channels/@me/${activeDM?.id}`);
            } else {
              navigate(`/channels/${activeServer}/${activeChannel}`);
            }
          });
        } else if (settings.messages) {
          // Show regular message notification
          const channelName = channels.find(c => c.id === activeChannel)?.name || 'channel';
          notificationManager.showMessageNotification(message, channelName, () => {
            if (viewMode === 'dm') {
              navigate(`/channels/@me/${activeDM?.id}`);
            } else {
              navigate(`/channels/${activeServer}/${activeChannel}`);
            }
          });
        }
      }
    }

    setMessages(prev => {
      const existing = prev[channelKey] || [];
      // Avoid duplicates
      if (existing.some(m => m.id === message.id)) {
        return prev;
      }
      return {
        ...prev,
        [channelKey]: [...existing, message],
      };
    });
  };

  const handleMessageUpdate = (wsMessage) => {
    const channelKey = viewMode === 'dm' ? `dm-${activeDM?.id}` : `${activeServer}-${activeChannel}`;

    setMessages(prev => {
      const existing = prev[channelKey] || [];

      if (wsMessage.deleted) {
        // Remove deleted message
        return {
          ...prev,
          [channelKey]: existing.filter(m => m.id !== wsMessage.id),
        };
      } else if (wsMessage.edited) {
        // Update edited message
        return {
          ...prev,
          [channelKey]: existing.map(m =>
            m.id === wsMessage.id
              ? { ...m, text: wsMessage.content, edited: true }
              : m
          ),
        };
      }

      return prev;
    });
  };

  const createServer = async (serverName) => {
    try {
      const newGuild = await api.createGuild(serverName);
      setServers([...servers, newGuild]);
      navigate(`/channels/${newGuild.id}/general`);
    } catch (err) {
      console.error('Failed to create guild:', err);
    }
  };

  const handleServerSelect = (serverId) => {
    setShowDiscovery(false);
    setShowFriends(false);
    setShowNotes(false);
    setShowPremium(false);
    setActiveDM(null);
    navigate(`/channels/${serverId}/general`);
  };

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    setShowMobileMenu(false);
    setMobileView('chat');
    navigate(`/channels/${activeServer}/${channel}`);
  };

  const handleVoiceChannelJoin = async (channelId, channelName) => {
    setVoiceChannel({ id: channelId, name: channelName });

    // Call API to join voice channel
    try {
      await api.joinVoiceChannel(channelId, user.id);
    } catch (err) {
      console.error('Failed to join voice channel:', err);
    }

    // Add current user to voice channel users locally
    setVoiceChannelUsers(prev => ({
      ...prev,
      [channelId]: [...(prev[channelId] || []).filter(u => u.id !== user.id), { id: user.id, username: user.username }]
    }));
  };

  const handleVoiceChannelLeave = async () => {
    if (voiceChannel && user) {
      // Call API to leave voice channel
      try {
        await api.leaveVoiceChannel(voiceChannel.id);
      } catch (err) {
        console.error('Failed to leave voice channel:', err);
      }

      // Remove current user from voice channel users locally
      setVoiceChannelUsers(prev => ({
        ...prev,
        [voiceChannel.id]: (prev[voiceChannel.id] || []).filter(u => u.id !== user.id)
      }));
    }
    setVoiceChannel(null);
  };

  // Listen for voice channel updates from other users
  useEffect(() => {
    if (!activeServer) return;

    const handleServerEvent = (data) => {
      if (data.type === 'voice_user_joined' || data.type === 'voice_user_left') {
        // Reload voice users from API to get fresh data
        loadGuildVoiceUsers(activeServer);
      } else if (data.type === 'presence_update') {
        const { userId, status } = data;
        setMembers(prev => prev.map(member =>
          member.id === userId
            ? { ...member, status, online: status === 'online' || status === 'focus' || status === 'dnd' }
            : member
        ));
      }
    };

    // Listen to the server's WebSocket for voice updates
    const ws = new WebSocket(`${config.wsUrl}?channel=server-${activeServer}&user=${user.username}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerEvent(data);
      } catch (err) {
        console.error('Failed to parse server message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [activeServer, user]);

  const handleCreateChannel = async (name, channelType = 'text', categoryId = null) => {
    try {
      const newChannel = await api.createChannel(activeServer, name, channelType, categoryId);
      setChannels([...channels, newChannel]);
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    try {
      await api.deleteChannel(activeServer, channelId);
      setChannels(channels.filter(c => c.id !== channelId));
      if (channels.find(c => c.id === channelId)?.name === activeChannel) {
        setActiveChannel('general');
        navigate(`/channels/${activeServer}/general`);
      }
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const invite = await api.createInvite(activeServer);
      return invite.code;
    } catch (err) {
      console.error('Failed to create invite:', err);
      return null;
    }
  };

  const handleLeaveServer = async () => {
    try {
      await api.leaveGuild(activeServer);
      setServers(servers.filter(s => s.id !== activeServer));
      navigate('/channels/@me');
    } catch (err) {
      console.error('Failed to leave server:', err);
    }
  };

  const handleUpdateServer = async (newName) => {
    try {
      const updated = await api.updateGuild(activeServer, newName);
      setServers(servers.map(s => s.id === activeServer ? updated : s));
      setCurrentGuild(updated);
    } catch (err) {
      console.error('Failed to update server:', err);
      throw err;
    }
  };

  const handleDeleteServer = async () => {
    try {
      await api.deleteGuild(activeServer);
      setServers(servers.filter(s => s.id !== activeServer));
      navigate('/channels/@me');
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const handleDMSelect = (dm) => {
    setShowFriends(false);
    setShowNotes(false);
    setShowPremium(false);
    setActiveDM(dm);
    setShowMobileMenu(false);
    setMobileView('chat');
    navigate(`/channels/@me/${dm.id}`);
  };

  const handleHomeClick = () => {
    setShowDiscovery(false);
    setShowFriends(false);
    setShowNotes(false);
    setShowPremium(false);
    setActiveDM(null);
    navigate('/channels/@me');
  };

  const handleDiscoveryClick = () => {
    setShowDiscovery(true);
    setShowFriends(false);
    setShowNotes(false);
    setShowPremium(false);
    setActiveDM(null);
    navigate('/channels/@me');
  };

  const handleFriendsClick = () => {
    setShowDiscovery(false);
    setShowFriends(true);
    setShowNotes(false);
    setShowPremium(false);
    setActiveDM(null);
    navigate('/channels/@me');
  };

  const handleNotesClick = () => {
    setShowDiscovery(false);
    setShowFriends(false);
    setShowNotes(true);
    setShowPremium(false);
    setActiveDM(null);
    navigate('/channels/@me');
  };

  const handlePremiumClick = () => {
    setShowDiscovery(false);
    setShowFriends(false);
    setShowNotes(false);
    setShowPremium(true);
    setActiveDM(null);
    navigate('/channels/@me');
  };

  const handleStartDMFromFriend = async (friend) => {
    try {
      const dm = await api.getOrCreateDM(user.id, friend.user_id);
      setShowFriends(false);
      setShowNotes(false);
      setShowPremium(false);
      navigate(`/channels/@me/${dm.id}`);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <SplashScreen isConnecting={showSplash} />
      {showShortcutsModal && <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />}
      <ConnectionBanner isConnected={isConnected} />
      <div className="app">

        {/* ── MOBILE: server strip (always visible) ── */}
        <div className="mobile-server-strip">
          <ServerList
            servers={servers}
            activeServer={activeServer}
            setActiveServer={(id) => { handleServerSelect(id); setMobileView('list'); }}
            onCreateServer={createServer}
            onHomeClick={() => { handleHomeClick(); setMobileView('list'); }}
            onDiscoveryClick={() => { handleDiscoveryClick(); setMobileView('list'); }}
            viewMode={viewMode}
          />
        </div>

        {/* ── MOBILE: conversation list panel ── */}
        <div className={`mobile-list-panel ${mobileView === 'chat' ? 'hidden' : ''}`}>
          {viewMode === 'dm' ? (
            <DMSidebar
              activeDM={activeDM}
              setActiveDM={handleDMSelect}
              user={user}
              onLogout={handleLogout}
              onFriendsClick={handleFriendsClick}
              showFriends={showFriends}
              onNotesClick={handleNotesClick}
              showNotes={showNotes}
              onPremiumClick={handlePremiumClick}
              showPremium={showPremium}
            />
          ) : activeServer ? (
            <Sidebar
              server={currentGuild}
              serverName={currentGuild?.name || 'Server'}
              serverId={activeServer}
              channels={channels}
              activeChannel={activeChannel}
              setActiveChannel={handleChannelSelect}
              onCreateChannel={handleCreateChannel}
              onDeleteChannel={handleDeleteChannel}
              onCreateInvite={handleCreateInvite}
              onLeaveServer={handleLeaveServer}
              onUpdateServer={handleUpdateServer}
              onDeleteServer={handleDeleteServer}
              onVoiceChannelJoin={handleVoiceChannelJoin}
              voiceChannelUsers={voiceChannelUsers}
              isOwner={currentGuild?.owner_id === user?.id}
              user={user}
              roles={roles}
            />
          ) : (
            <EmptyState isDMView={viewMode === 'dm'} onCreateServer={createServer} />
          )}
        </div>

        {/* ── MOBILE: chat panel ── */}
        <div className={`mobile-chat-panel ${mobileView === 'chat' ? 'active' : ''}`}>
          {viewMode === 'dm' && activeDM ? (
            <Chat
              channel={activeDM.id}
              messages={messages[`dm-${activeDM.id}`] || []}
              onSendMessage={addMessage}
              onReceiveMessage={handleReceiveMessage}
              onMessageUpdate={handleMessageUpdate}
              loading={loading}
              isDM={true}
              members={[]}
              dmUsername={activeDM.username}
              onMenuOpen={() => setMobileView('list')}
            />
          ) : activeServer && activeChannel ? (
            <Chat
              channel={activeChannel}
              messages={messages[`${activeServer}-${activeChannel}`] || []}
              onSendMessage={addMessage}
              onReceiveMessage={handleReceiveMessage}
              onMessageUpdate={handleMessageUpdate}
              loading={loading}
              isDM={false}
              members={members}
              onMenuOpen={() => setMobileView('list')}
            />
          ) : null}
        </div>

        {/* ── MOBILE: bottom tab bar ── */}
        <div className="mobile-tab-bar">
          <button
            className={`mobile-tab ${(viewMode === 'dm' || !activeServer) && mobileView === 'list' ? 'active' : ''}`}
            onClick={() => { handleHomeClick(); setMobileView('list'); }}
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M224 115.55V208a16 16 0 0 1-16 16h-48a16 16 0 0 1-16-16v-48H112v48a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-92.45a16 16 0 0 1 5.17-11.78l80-75.48.29-.28a16 16 0 0 1 21.1 0l.29.28 80 75.48a16 16 0 0 1 5.15 11.78Z" /></svg>
            Home
          </button>
          <button
            className="mobile-tab"
            onClick={() => { }}
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M221.8 175.94C216.25 166.38 208 139.33 208 104a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h48a32 32 0 0 0 64 0h48a16 16 0 0 0 13.8-24.06Z" /></svg>
            Alerts
          </button>
          <button
            className="mobile-tab"
            onClick={() => { }}
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 88.07-52s69.23 19.44 88.07 52a8 8 0 1 0 13.85-8Z" /></svg>
            You
          </button>
        </div>

        {/* ── DESKTOP: render sidebars inline ── */}
        <div className="desktop-sidebars">
          <ServerList
            servers={servers}
            activeServer={activeServer}
            setActiveServer={handleServerSelect}
            onCreateServer={createServer}
            onHomeClick={handleHomeClick}
            onDiscoveryClick={handleDiscoveryClick}
            viewMode={viewMode}
          />
        </div>

        {viewMode === 'discovery' ? (
          <ServerDiscovery />
        ) : viewMode === 'dm' ? (
          <>
            <div className="desktop-sidebars">
              <DMSidebar
                activeDM={activeDM}
                setActiveDM={handleDMSelect}
                user={user}
                onLogout={handleLogout}
                onFriendsClick={handleFriendsClick}
                showFriends={showFriends}
                onNotesClick={handleNotesClick}
                showNotes={showNotes}
                onPremiumClick={handlePremiumClick}
                showPremium={showPremium}
              />
            </div>
            {showFriends ? (
              <Friends onStartDM={handleStartDMFromFriend} />
            ) : showNotes ? (
              <PersonalNotes user={user} />
            ) : showPremium ? (
              <PremiumPage />
            ) : activeDM ? (
              <Chat
                channel={activeDM.id}
                messages={messages[`dm-${activeDM.id}`] || []}
                onSendMessage={addMessage}
                onReceiveMessage={handleReceiveMessage}
                onMessageUpdate={handleMessageUpdate}
                loading={loading}
                isDM={true}
                members={[]}
                dmUsername={activeDM.username}
                onMenuOpen={() => setShowMobileMenu(true)}
              />
            ) : (
              <EmptyState isDMView={true} />
            )}
          </>
        ) : activeServer ? (
          <>
            <div className="desktop-sidebars">
              <Sidebar
                server={currentGuild}
                serverName={currentGuild?.name || 'Server'}
                serverId={activeServer}
                channels={channels}
                activeChannel={activeChannel}
                setActiveChannel={handleChannelSelect}
                onCreateChannel={handleCreateChannel}
                onDeleteChannel={handleDeleteChannel}
                onCreateInvite={handleCreateInvite}
                onLeaveServer={handleLeaveServer}
                onUpdateServer={handleUpdateServer}
                onDeleteServer={handleDeleteServer}
                onVoiceChannelJoin={handleVoiceChannelJoin}
                voiceChannelUsers={voiceChannelUsers}
                isOwner={currentGuild?.owner_id === user?.id}
                user={user}
                roles={roles}
              />
            </div>
            <Chat
              channel={activeChannel}
              messages={messages[`${activeServer}-${activeChannel}`] || []}
              onSendMessage={addMessage}
              onReceiveMessage={handleReceiveMessage}
              onMessageUpdate={handleMessageUpdate}
              loading={loading}
              isDM={false}
              members={members}
              onMenuOpen={() => setShowMobileMenu(true)}
            />
            <MemberList
              members={members}
              ownerId={currentGuild?.owner_id}
            />
          </>
        ) : (
          <EmptyState onCreateServer={createServer} isDMView={false} />
        )}
        {voiceChannel && (
          <VoiceChannel
            channelId={voiceChannel.id}
            channelName={voiceChannel.name}
            user={user}
            serverId={activeServer}
            onClose={handleVoiceChannelLeave}
          />
        )}
      </div>
      <ToastContainer />

      {/* Incoming Call Popup */}
      {callerInfo && (
        <IncomingCallPopup
          caller={callerInfo}
          callType={callerInfo.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </>
  );
}

export default App;
