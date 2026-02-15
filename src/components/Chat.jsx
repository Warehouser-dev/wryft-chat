import { useEffect, useRef, useCallback, useState } from 'react';
import { Hash, User, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import MessageInput from './MessageInput';
import UserProfile from './UserProfile';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

function Chat({ channel, messages, onSendMessage, loading, isDM, onReceiveMessage, onMessageUpdate, members = [], dmUsername }) {
  const { user } = useAuth();
  const { serverId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'message') {
      onReceiveMessage(data);
      // Remove user from typing when they send a message
      setTypingUsers(prev => prev.filter(u => u !== data.author));
    } else if (data.type === 'message_edited') {
      onMessageUpdate({ ...data, edited: true });
    } else if (data.type === 'message_deleted') {
      onMessageUpdate({ ...data, deleted: true });
    } else if (data.type === 'user_joined') {
      console.log(`${data.user} joined the channel`);
    } else if (data.type === 'user_left') {
      console.log(`${data.user} left the channel`);
    } else if (data.type === 'typing') {
      const typingUser = data.user;
      // Don't show own typing indicator
      if (typingUser !== `${user?.username}#${user?.discriminator}`) {
        setTypingUsers(prev => {
          if (!prev.includes(typingUser)) {
            return [...prev, typingUser];
          }
          return prev;
        });
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== typingUser));
        }, 3000);
      }
    }
  }, [onReceiveMessage, onMessageUpdate, user]);

  // Use server-channel combination for WebSocket channel
  const wsChannel = isDM ? `dm-${channel}` : `${serverId}-${channel}`;
  const displayName = isDM ? dmUsername : channel;

  const { sendMessage, isConnected } = useWebSocket(
    wsChannel,
    user?.username,
    handleWebSocketMessage
  );

  const handleSendMessage = async (text) => {
    // First save to database to get the real UUID
    const savedMessage = await onSendMessage(text);
    
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
    if (!window.confirm('Delete this message?')) return;

    try {
      await api.deleteMessage(wsChannel, messageId);
      
      // Broadcast delete via WebSocket
      sendMessage({
        type: 'message_deleted',
        id: messageId,
        channel: wsChannel,
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
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
    <div className="chat">
      <div className="chat-header">
        {isDM ? <User size={24} className="channel-icon" /> : <Hash size={24} className="channel-icon" />}
        {displayName}
        {!isConnected && <span className="connection-status">Connecting...</span>}
      </div>
      <div className="chat-messages">
        {loading && <div className="loading">Loading messages...</div>}
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${isOwnMessage(message) ? 'own-message' : ''}`}
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            <div 
              className="message-avatar clickable"
              onClick={() => handleUserClick(message)}
            >
              {message.author[0].toUpperCase()}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span 
                  className="message-author clickable"
                  onClick={() => handleUserClick(message)}
                >
                  {message.author}#{message.author_discriminator}
                </span>
                <span className="message-timestamp">{message.timestamp}</span>
                {message.edited && <span className="message-edited">(edited)</span>}
              </div>
              {editingMessage === message.id ? (
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
              ) : (
                <div className="message-text">{parseMentions(message.text)}</div>
              )}
            </div>
            {isOwnMessage(message) && hoveredMessage === message.id && editingMessage !== message.id && (
              <div className="message-actions">
                <button 
                  className="message-action-btn"
                  onClick={() => startEdit(message)}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  className="message-action-btn"
                  onClick={() => handleDeleteMessage(message.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.length === 1 ? (
            <span>{typingUsers[0].split('#')[0]} is typing...</span>
          ) : typingUsers.length === 2 ? (
            <span>{typingUsers[0].split('#')[0]} and {typingUsers[1].split('#')[0]} are typing...</span>
          ) : (
            <span>Several people are typing...</span>
          )}
        </div>
      )}
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} channel={displayName} members={members} />
      
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
