import { useEffect, useRef, useCallback, useState } from 'react';
import { Hash, User, Phone, VideoCamera, MagnifyingGlass, ArrowDown, X, CaretLeft } from 'phosphor-react';
import MessageInput from './MessageInput';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import UserProfile from './UserProfile';
import DMProfileSidebar from './DMProfileSidebar';
import CallOverlay from './CallOverlay';
import MessageContextMenu from './MessageContextMenu';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTyping } from '../hooks/useTyping';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { notifyNewMessage, notifyMention, notifyDM } from '../utils/notifications';
import { addUnreadMessage, clearUnreadMessages, updateTitleFlash } from '../utils/unreadTracker';

function Chat({ channel, messages, onSendMessage, loading, isDM, onReceiveMessage, onMessageUpdate, members = [], dmUsername, onMenuOpen }) {
  const { user } = useAuth();
  const { serverId, dmId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userAvatars, setUserAvatars] = useState({});
  const [showDMProfile, setShowDMProfile] = useState(false);
  const [dmUser, setDmUser] = useState(null);

  // Jump to bottom
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Unread divider
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const wasUnfocused = useRef(false);

  // Reply
  const [replyTo, setReplyTo] = useState(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message }

  const webrtc = useWebRTC(user);

  // Track window focus for unread divider
  useEffect(() => {
    const onBlur = () => { wasUnfocused.current = true; };
    const onFocus = () => { wasUnfocused.current = false; setFirstUnreadId(null); };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, []);

  // Scroll listener for jump-to-bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowJumpToBottom(distFromBottom > 200);
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // Keyboard shortcut: Ctrl+F = search, Escape = close search/context menu
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(s => !s);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
        setContextMenu(null);
        setReplyTo(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  useEffect(() => {
    const loadDMUser = async () => {
      if (!isDM || !dmId) return;
      try {
        const userDMs = await api.getUserDMs(user.id);
        const currentDM = userDMs.find(dm => dm.id === dmId);
        if (!currentDM) return;
        const otherUserId = currentDM.other_user.id;
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

  const { typingText, startTyping, stopTyping } = useTyping(
    isDM ? null : channel,
    isDM ? dmId : null,
    user?.id
  );

  useEffect(() => {
    const fetchAvatars = async () => {
      const uniqueUserIds = new Set();
      messages.forEach(msg => { if (msg.author_id) uniqueUserIds.add(msg.author_id); });
      members.forEach(member => { if (member.id) uniqueUserIds.add(member.id); });
      for (const userId of uniqueUserIds) {
        if (!userAvatars[userId]) {
          try {
            const profile = await api.getUserProfile(userId);
            if (profile.avatar_url) {
              setUserAvatars(prev => ({ ...prev, [userId]: profile.avatar_url }));
            }
          } catch (err) { }
        }
      }
    };
    if (messages.length > 0 || members.length > 0) fetchAvatars();
  }, [messages, members]);

  const getAvatarForMessage = (message) => userAvatars[message.author_id] || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJumpToBottom(false);
  };

  useEffect(() => {
    // Only auto-scroll if user is near bottom
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 300) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const channelKey = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
    clearUnreadMessages(channelKey);
    updateTitleFlash();
    setFirstUnreadId(null);
  }, [channel, isDM, serverId]);

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'message') {
      if (!data.author_id && user) {
        const messageAuthor = data.author.split('#')[0];
        if (messageAuthor === user.username) data.author_id = user.id;
      }
      onReceiveMessage(data);

      const messageAuthor = data.author.split('#')[0];
      const isFromSelf = messageAuthor === user?.username;
      const isWindowFocused = document.hasFocus() && !document.hidden;

      if (!isFromSelf && !isWindowFocused) {
        // Set first unread ID
        if (!firstUnreadId) setFirstUnreadId(data.id);

        const messageText = data.content;
        const isMentioned = messageText.includes(`@${user?.username}`);
        const channelKey = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
        addUnreadMessage(channelKey, isMentioned);
        updateTitleFlash();

        if (isDM) notifyDM(messageAuthor, messageText);
        else if (isMentioned) notifyMention(messageAuthor, messageText, channel);
        else notifyNewMessage(messageAuthor, messageText, channel, false);
      }
    } else if (data.type === 'message_edited') {
      onMessageUpdate({ ...data, edited: true });
    } else if (data.type === 'message_deleted') {
      onMessageUpdate({ ...data, deleted: true });
    }
  }, [onReceiveMessage, onMessageUpdate, user, isDM, channel, serverId, firstUnreadId]);

  const wsChannel = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
  const displayName = isDM ? dmUsername : channel;

  const { sendMessage, isConnected } = useWebSocket(wsChannel, user?.username, handleWebSocketMessage);

  const handleSendMessage = async (text, attachments = null, replyToId = null) => {
    const savedMessage = await onSendMessage(text, attachments);
    if (savedMessage) {
      let timestamp = savedMessage.timestamp;
      if (!timestamp && savedMessage.created_at) {
        timestamp = new Date(savedMessage.created_at).toLocaleTimeString();
      }
      sendMessage({
        type: 'message',
        id: savedMessage.id,
        channel: wsChannel,
        content: text,
        author: `${user.username}#${user.discriminator}`,
        timestamp: timestamp || new Date().toLocaleTimeString(),
        attachments: savedMessage.attachments || attachments,
        reply_to_id: replyToId,
      });
    }
    setReplyTo(null);
  };

  const handleTyping = () => {
    sendMessage({ type: 'typing', channel: wsChannel, user: user.username });
  };

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;
    try {
      await api.editMessage(wsChannel, messageId, editText);
      sendMessage({ type: 'message_edited', id: messageId, channel: wsChannel, content: editText });
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      if (isDM) await api.deleteDMMessage(user.id, channel, messageId);
      else await api.deleteMessage(wsChannel, messageId);
      sendMessage({ type: 'message_deleted', id: messageId, channel: wsChannel });
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message: ' + err.message);
    }
  };

  const startEdit = (message) => { setEditingMessage(message.id); setEditText(message.text); };
  const cancelEdit = () => { setEditingMessage(null); setEditText(''); };

  const isOwnMessage = (message) =>
    message.author === user?.username && String(message.author_discriminator) === String(user?.discriminator);

  const handleUserClick = (message) => {
    const clickedUser = members.find(m => m.username === message.author && String(m.discriminator) === String(message.author_discriminator));
    setSelectedUser(clickedUser || { id: message.author_id, username: message.author, discriminator: message.author_discriminator, created_at: new Date().toISOString() });
    setShowUserProfile(true);
  };

  const handleStartDM = async () => {
    if (!selectedUser) return;
    try {
      const dm = await api.createDM(user.id, selectedUser.id);
      setShowUserProfile(false);
      navigate(`/channels/@me/${dm.id}`);
    } catch (err) { }
  };

  const handleStartCall = async (isVideo = false) => {
    if (!dmUser) return;
    try {
      await webrtc.initiateCall(dmUser.id, dmUser.username, isVideo ? 'video' : 'voice');
    } catch (error) { }
  };

  const handleEndCall = async () => {
    try { await webrtc.endCall(); } catch (error) { }
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  // Filter messages for search
  const displayedMessages = searchQuery.trim()
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="chat" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div className="chat-header">
        <button className="mobile-back-btn" onClick={onMenuOpen}>
          <CaretLeft size={24} weight="bold" />
        </button>
        {isDM ? <User size={24} className="channel-icon" /> : <Hash size={24} className="channel-icon" />}
        {displayName}
        {!isConnected && <span className="connection-status">Connecting...</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isDM && dmUser && (
            <>
              <button onClick={() => handleStartCall(false)} className="control-button" title="Voice Call"><Phone size={20} /></button>
              <button onClick={() => handleStartCall(true)} className="control-button" title="Video Call"><VideoCamera size={20} /></button>
              <button onClick={() => setShowDMProfile(!showDMProfile)} className="control-button" title="Profile"><User size={20} /></button>
            </>
          )}
          <button
            className={`control-button ${showSearch ? 'active' : ''}`}
            onClick={() => { setShowSearch(s => !s); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            title="Search (Ctrl+F)"
          >
            <MagnifyingGlass size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="chat-search-bar">
          <MagnifyingGlass size={16} className="chat-search-icon" />
          <input
            ref={searchInputRef}
            className="chat-search-input"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <span className="chat-search-count">{displayedMessages.length} result{displayedMessages.length !== 1 ? 's' : ''}</span>}
          <button className="chat-search-close" onClick={() => { setShowSearch(false); setSearchQuery(''); }}><X size={16} /></button>
        </div>
      )}

      {/* Call Overlay */}
      {webrtc.activeCall && isDM && (
        <CallOverlay
          callData={{ userId: webrtc.activeCall.userId, username: webrtc.activeCall.username, avatar: dmUser?.avatar_url, isVideo: webrtc.activeCall.type === 'video' }}
          callStatus={webrtc.activeCall.isOutgoing ? 'ringing' : 'connected'}
          onEndCall={handleEndCall}
        />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Messages */}
          <div className="chat-messages" ref={messagesContainerRef}>
            {loading && <div className="loading">Loading messages...</div>}
            {displayedMessages.map((message, index) => {
              const showUnreadDivider = firstUnreadId && message.id === firstUnreadId;

              if (editingMessage === message.id) {
                return (
                  <div key={message.id}>
                    {showUnreadDivider && <div className="unread-divider"><span>NEW</span></div>}
                    <div className="message">
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
                  </div>
                );
              }

              return (
                <div key={message.id}>
                  {showUnreadDivider && <div className="unread-divider"><span>NEW</span></div>}
                  <Message
                    message={message}
                    isDM={isDM}
                    avatar={getAvatarForMessage(message)}
                    onEdit={startEdit}
                    onDelete={(msg) => handleDeleteMessage(msg.id)}
                    onUserClick={handleUserClick}
                    onReply={(msg) => setReplyTo(msg)}
                    onContextMenu={handleContextMenu}
                    searchQuery={searchQuery}
                  />
                </div>
              );
            })}
            <TypingIndicator typingText={typingText} />
            <div ref={messagesEndRef} />
          </div>

          {/* Jump to bottom */}
          {showJumpToBottom && (
            <button className="jump-to-bottom" onClick={scrollToBottom}>
              <ArrowDown size={20} weight="bold" />
            </button>
          )}

          <MessageInput
            onSendMessage={(text, attachments) => handleSendMessage(text, attachments, replyTo?.id)}
            onTyping={startTyping}
            channel={displayName}
            members={members}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>

        {isDM && showDMProfile && dmUser && (
          <DMProfileSidebar dmUser={dmUser} onClose={() => setShowDMProfile(false)} />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          isOwn={isOwnMessage(contextMenu.message)}
          onReply={(msg) => { setReplyTo(msg); setContextMenu(null); }}
          onEdit={(msg) => { startEdit(msg); setContextMenu(null); }}
          onDelete={(msg) => { handleDeleteMessage(msg.id); setContextMenu(null); }}
          onCopyText={(msg) => { navigator.clipboard.writeText(msg.text); setContextMenu(null); }}
          onClose={() => setContextMenu(null)}
        />
      )}

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
