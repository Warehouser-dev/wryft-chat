import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';
import ServerList from './components/ServerList';
import Sidebar from './components/Sidebar';
import DMSidebar from './components/DMSidebar';
import Chat from './components/Chat';
import EmptyState from './components/EmptyState';
import ConnectionBanner from './components/ConnectionBanner';
import LoadingScreen from './components/LoadingScreen';
import MemberList from './components/MemberList';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { useConnectionStatus } from './hooks/useConnectionStatus';

function App() {
  const { user, logout } = useAuth();
  const { serverId, channelId, dmId } = useParams();
  const navigate = useNavigate();
  const { isConnected, isInitialLoad } = useConnectionStatus();
  
  const [servers, setServers] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [activeDM, setActiveDM] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [currentGuild, setCurrentGuild] = useState(null);
  const [channels, setChannels] = useState([]);

  const viewMode = dmId ? 'dm' : serverId ? 'server' : 'dm';
  const activeServer = serverId || null;

  useEffect(() => {
    if (user) {
      loadGuilds();
    }
  }, [user]);

  useEffect(() => {
    if (serverId && user) {
      loadGuildMembers(serverId);
      loadGuildChannels(serverId);
      const guild = servers.find(s => s.id === serverId);
      setCurrentGuild(guild);
    }
  }, [serverId, user, servers]);

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
      if (guildChannels.length > 0 && !channelId) {
        setActiveChannel(guildChannels[0].name);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId);
    }
  }, [channelId]);

  useEffect(() => {
    if (dmId) {
      // Mock DM data - in production, fetch from backend
      setActiveDM({ id: parseInt(dmId), username: `User${dmId}` });
    }
  }, [dmId]);

  useEffect(() => {
    if (user && activeChannel && activeServer && viewMode === 'server') {
      const channelKey = `${activeServer}-${activeChannel}`;
      loadMessages(channelKey);
    }
  }, [activeChannel, user, activeServer, viewMode]);

  useEffect(() => {
    if (user && activeDM && viewMode === 'dm') {
      loadMessages(`dm-${activeDM.id}`);
    }
  }, [activeDM, user, viewMode]);

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

  const addMessage = async (text) => {
    try {
      const channelKey = viewMode === 'dm' ? `dm-${activeDM.id}` : `${activeServer}-${activeChannel}`;
      // Just save to database, don't update state (WebSocket will handle that)
      await api.sendMessage(
        channelKey, 
        text, 
        user.username,
        user.discriminator
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleReceiveMessage = (wsMessage) => {
    const channelKey = viewMode === 'dm' ? `dm-${activeDM?.id}` : `${activeServer}-${activeChannel}`;
    
    // Convert WebSocket message format to our message format
    const message = {
      id: wsMessage.id,
      text: wsMessage.content,
      author: wsMessage.author.split('#')[0],
      author_discriminator: wsMessage.author.split('#')[1],
      timestamp: new Date(wsMessage.timestamp).toLocaleTimeString(),
    };

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
    navigate(`/channels/${serverId}/general`);
  };

  const handleChannelSelect = (channel) => {
    setActiveChannel(channel);
    navigate(`/channels/${activeServer}/${channel}`);
  };

  const handleCreateChannel = async (name) => {
    try {
      const newChannel = await api.createChannel(activeServer, name);
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

  const handleDMSelect = (dm) => {
    setActiveDM(dm);
    navigate(`/channels/@me/${dm.id}`);
  };

  const handleHomeClick = () => {
    navigate('/channels/@me');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading screen on initial load
  if (isInitialLoad) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ConnectionBanner isConnected={isConnected} />
      <div className="app">
        <ServerList 
          servers={servers}
          activeServer={activeServer} 
          setActiveServer={handleServerSelect}
          onCreateServer={createServer}
          onHomeClick={handleHomeClick}
          viewMode={viewMode}
        />
      {viewMode === 'dm' ? (
        <>
          <DMSidebar 
            activeDM={activeDM}
            setActiveDM={handleDMSelect}
            user={user}
            onLogout={handleLogout}
          />
          {activeDM ? (
            <Chat 
              channel={activeDM.username}
              messages={messages[`dm-${activeDM.id}`] || []} 
              onSendMessage={addMessage}
              onReceiveMessage={handleReceiveMessage}
              loading={loading}
              isDM={true}
            />
          ) : (
            <EmptyState isDMView={true} />
          )}
        </>
      ) : activeServer ? (
        <>
          <Sidebar 
            serverName={currentGuild?.name || 'Server'}
            channels={channels}
            activeChannel={activeChannel} 
            setActiveChannel={handleChannelSelect}
            onCreateChannel={handleCreateChannel}
            onDeleteChannel={handleDeleteChannel}
            onCreateInvite={handleCreateInvite}
            onLeaveServer={handleLeaveServer}
            isOwner={currentGuild?.owner_id === user?.id}
            user={user}
          />
          <Chat 
            channel={activeChannel} 
            messages={messages[`${activeServer}-${activeChannel}`] || []} 
            onSendMessage={addMessage}
            onReceiveMessage={handleReceiveMessage}
            loading={loading}
            isDM={false}
          />
          <MemberList 
            members={members}
            ownerId={currentGuild?.owner_id}
          />
        </>
      ) : (
        <EmptyState onCreateServer={createServer} isDMView={false} />
      )}
    </div>
    </>
  );
}

export default App;
