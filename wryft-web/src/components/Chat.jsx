import { useEffect, useRef, useCallback, useState } from 'react';
import { Hash, User } from 'phosphor-react';
import MessageInput from './MessageInput';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import UserProfile from './UserProfile';
import DMProfileSidebar from './DMProfileSidebar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTyping } from '../hooks/useTyping';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { notifyNewMessage, notifyMention, notifyDM } from '../utils/notifications';
import { addUnreadMessage, clearUnreadMessages, updateTitleFlash } from '../utils/unreadTracker';

function Chat({ channel, messages, onSendMessage, loading, isDM, onReceiveMessage, onMessageUpdate, members = [], dmUsername }) {
  const { user } = useAuth();
  const { serverId, dmId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userAvatars, setUserAvatars] = useState({});
  const [showDMProfile, setShowDMProfile] = useState(false);
  const [dmUser, setDmUser] = useState(null);

  console.log('🔥 Chat component loaded - FIXED VERSION v2');

  // Load DM user data when in a DM
  useEffect(() => {
    const loadDMUser = async () => {
      if (!isDM || !dmId) return;
      
      try {
        // Get the DM user's profile using the dmId (which is the DM conversation ID)
        // We need to get the user ID from the activeDM in App.jsx
        // For now, we'll fetch all DMs and find the matching one
        const userDMs = await api.getUserDMs(user.id);
        const currentDM = userDMs.find(dm => dm.id === dmId);
        
        if (!currentDM) return;
        
        const otherUserId = currentDM.other_user.id;
        
        // Get the other user's profile
        const userProfile = await api.getUserProfile(otherUserId);
        setDmUser({
          id: otherUserId,
          username: userProfile.username,
          discriminator: userProfile.discriminator,
          status: userProfile.status || 'offline',
          created_at: userProfile.created_at,
          avatar_url: userProfile.avatar_url,
          about_me: userProfile.about_me,
          banner_color: userProfile.banner_color
        });
      } catch (err) {
        console.error('Failed to load DM user:', err);
      }
    };

    loadDMUser();
  }, [isDM, dmId, user?.id]);

  // Typing indicator hook
  const { typingText, startTyping, stopTyping } = useTyping(
    isDM ? null : channel,
    isDM ? dmId : null,
    user?.id
  );

  // Fetch avatars for users in messages
  useEffect(() => {
    const fetchAvatars = async () => {
      const uniqueUserIds = new Set();
      messages.forEach(msg => {
        if (msg.author_id) {
          uniqueUserIds.add(msg.author_id);
        } else {
          console.warn('Message missing author_id:', msg);
        }
      });

      // Also add members
      members.forEach(member => {
        if (member.id) {
          uniqueUserIds.add(member.id);
        }
      });

      console.log('Fetching avatars for users:', Array.from(uniqueUserIds));

      // Fetch avatars for users we don't have yet
      for (const userId of uniqueUserIds) {
        if (!userAvatars[userId]) {
          try {
            const profile = await api.getUserProfile(userId);
            console.log(`Fetched avatar for ${userId}:`, profile.avatar_url ? 'has avatar' : 'no avatar');
            if (profile.avatar_url) {
              setUserAvatars(prev => ({
                ...prev,
                [userId]: profile.avatar_url
              }));
            }
          } catch (err) {
            console.error(`Failed to fetch avatar for ${userId}:`, err);
          }
        }
      }
    };

    if (messages.length > 0 || members.length > 0) {
      fetchAvatars();
    }
  }, [messages, members]);

  const getAvatarForMessage = (message) => {
    const avatar = userAvatars[message.author_id];
    if (avatar) {
      console.log(`✅ Avatar found for ${message.author}:`, avatar.substring(0, 50) + '...');
    } else if (message.author_id) {
      console.log(`❌ No avatar cached for ${message.author} (${message.author_id})`);
    } else {
      console.log(`⚠️ Message from ${message.author} has no author_id`);
    }
    return avatar || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear unread messages when viewing this channel
  useEffect(() => {
    const channelKey = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
    clearUnreadMessages(channelKey);
    updateTitleFlash();
  }, [channel, isDM, serverId]);

  const handleWebSocketMessage = useCallback((data) => {
    console.log('📨 WebSocket message received:', data.type);
    
    if (data.type === 'message') {
      // Add author_id if not present (for backward compatibility)
      if (!data.author_id && user) {
        const messageAuthor = data.author.split('#')[0];
        if (messageAuthor === user.username) {
          data.author_id = user.id;
        }
      }

      onReceiveMessage(data);

      // Show notification if message is from someone else and window is not focused
      const messageAuthor = data.author.split('#')[0];
      const isFromSelf = messageAuthor === user?.username;
      const isWindowFocused = document.hasFocus() && !document.hidden;

      if (!isFromSelf && !isWindowFocused) {
        const messageText = data.content;
        const isMentioned = messageText.includes(`@${user?.username}`);

        // Track unread messages
        const channelKey = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
        addUnreadMessage(channelKey, isMentioned);
        updateTitleFlash();

        console.log('🔔 Message received, triggering notification');
        if (isDM) {
          notifyDM(messageAuthor, messageText);
        } else if (isMentioned) {
          notifyMention(messageAuthor, messageText, channel);
        } else {
          notifyNewMessage(messageAuthor, messageText, channel, false);
        }
      }
    } else if (data.type === 'message_edited') {
      onMessageUpdate({ ...data, edited: true });
    } else if (data.type === 'message_deleted') {
      onMessageUpdate({ ...data, deleted: true });
    } else if (data.type === 'user_joined') {
      console.log(`${data.user} joined the channel`);
    } else if (data.type === 'user_left') {
      console.log(`${data.user} left the channel`);
    }
    // Typing indicators are now handled by useTyping hook
  }, [onReceiveMessage, onMessageUpdate, user, isDM, channel, serverId]);

  // Use server-channel combination for WebSocket channel
  const wsChannel = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
  const displayName = isDM ? dmUsername : channel;

  const { sendMessage, isConnected } = useWebSocket(
    wsChannel,
    user?.username,
    handleWebSocketMessage
  );

  const handleSendMessage = async (text, attachments = null) => {
    // First save to database to get the real UUID
    const savedMessage = await onSendMessage(text, attachments);

    if (savedMessage) {
      // Format timestamp if it's an ISO string
      let timestamp = savedMessage.timestamp;
      if (!timestamp && savedMessage.created_at) {
        timestamp = new Date(savedMessage.created_at).toLocaleTimeString();
      }

      // Then broadcast via WebSocket with the real ID
      const message = {
        type: 'message',
        id: savedMessage.id,
        channel: wsChannel,
        content: text,
        author: `${user.username}#${user.discriminator}`,
        timestamp: timestamp || new Date().toLocaleTimeString(),
        attachments: savedMessage.attachments || attachments,
      };

      sendMessage(message);
    }
  };

  const handleTyping = () => {
    sendMessage({
      type: 'typing',
      channel: wsChannel,
      user: `${user.username}#${user.discriminator}`,
    });
  };

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;

    try {
      await api.editMessage(wsChannel, messageId, editText);

      // Broadcast edit via WebSocket
      sendMessage({
        type: 'message_edited',
        id: messageId,
        channel: wsChannel,
        content: editText,
      });

      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    console.log('🗑️ Delete message called for:', messageId);
    console.log('📍 Current channel:', wsChannel);
    console.log('📍 Is DM:', isDM);
    console.log('📋 All messages:', messages.map(m => ({ id: m.id, text: m.text.substring(0, 20) })));
    
    if (!window.confirm('Delete this message?')) return;

    try {
      if (isDM) {
        console.log('Deleting DM message:', { userId: user.id, dmId: channel, messageId });
        await api.deleteDMMessage(user.id, channel, messageId);
      } else {
        console.log('Deleting channel message:', { channel: wsChannel, messageId });
        await api.deleteMessage(wsChannel, messageId);
      }

      // Broadcast delete via WebSocket
      sendMessage({
        type: 'message_deleted',
        id: messageId,
        channel: wsChannel,
      });
      
      console.log('✅ Message deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete message:', err);
      alert('Failed to delete message: ' + err.message);
    }
  };

  const startEdit = (message) => {
    setEditingMessage(message.id);
    setEditText(message.text);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const isOwnMessage = (message) => {
    const isOwn = message.author === user?.username &&
      String(message.author_discriminator) === String(user?.discriminator);
    return isOwn;
  };

  const handleUserClick = (message) => {
    // Find the full user object from members
    const clickedUser = members.find(m =>
      m.username === message.author &&
      String(m.discriminator) === String(message.author_discriminator)
    );

    if (clickedUser) {
      setSelectedUser(clickedUser);
      setShowUserProfile(true);
    } else {
      // If not in members list, create a basic user object
      setSelectedUser({
        id: message.author_id,
        username: message.author,
        discriminator: message.author_discriminator,
        created_at: new Date().toISOString(),
      });
      setShowUserProfile(true);
    }
  };

  const handleStartDM = async () => {
    if (!selectedUser) return;

    try {
      const dm = await api.createDM(user.id, selectedUser.id);
      setShowUserProfile(false);
      navigate(`/channels/@me/${dm.id}`);
    } catch (err) {
      console.error('Failed to create DM:', err);
    }
  };

  const parseMentions = (text) => {
    // Match @username#1234 pattern
    const mentionRegex = /@(\w+)#(\d{4})/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add mention
      parts.push(
        <span key={match.index} className="mention">
          @{match[1]}#{match[2]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="chat" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="chat-header">
        {isDM ? <User size={24} className="channel-icon" /> : <Hash size={24} className="channel-icon" />}
        {displayName}
        {!isConnected && <span className="connection-status">Connecting...</span>}
        {isDM && dmUser && (
          <button
            onClick={() => setShowDMProfile(!showDMProfile)}
            className="control-button"
            style={{ marginLeft: 'auto' }}
            title={showDMProfile ? 'Hide Profile' : 'Show Profile'}
          >
            <User size={20} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="chat-messages">
            {loading && <div className="loading">Loading messages...</div>}
            {messages.map(message => {
          if (editingMessage === message.id) {
            // Keep inline editing for now
            return (
              <div key={message.id} className="message">
                <div className="message-avatar" />
                <div className="message-content">
                  <div className="message-edit-form">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditMessage(message.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="message-edit-input"
                    />
                    <div className="message-edit-actions">
                      <button onClick={() => handleEditMessage(message.id)} className="btn-save">Save</button>
                      <button onClick={cancelEdit} className="btn-cancel">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Message
              key={message.id}
              message={message}
              isDM={isDM}
              avatar={getAvatarForMessage(message)}
              onEdit={startEdit}
              onDelete={(msg) => handleDeleteMessage(msg.id)}
              onUserClick={handleUserClick}
            />
          );
        })}
            <TypingIndicator typingText={typingText} />
            <div ref={messagesEndRef} />
          </div>
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={startTyping}
            channel={displayName}
            members={members}
          />
        </div>

        {isDM && showDMProfile && dmUser && (
          <DMProfileSidebar
            dmUser={dmUser}
            onClose={() => setShowDMProfile(false)}
          />
        )}
      </div>

      <UserProfile
        user={selectedUser}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        isOwner={false}
        onStartDM={handleStartDM}
        canDM={!isDM && selectedUser?.id !== user?.id}
      />
    </div>
  );
}

export default Chat;
