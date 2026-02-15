import React, { useEffect, useRef, useCallback } from 'react';
import { Hash, User } from 'lucide-react';
import MessageInput from './MessageInput';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';

function Chat({ channel, messages, onSendMessage, loading, isDM, onReceiveMessage }) {
  const { user } = useAuth();
  const { serverId } = useParams();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'message') {
      onReceiveMessage(data);
    } else if (data.type === 'user_joined') {
      console.log(`${data.user} joined the channel`);
    } else if (data.type === 'user_left') {
      console.log(`${data.user} left the channel`);
    }
  }, [onReceiveMessage]);

  // Use server-channel combination for WebSocket channel
  const wsChannel = isDM ? channel : `${serverId}-${channel}`;

  const { sendMessage, isConnected } = useWebSocket(
    wsChannel,
    user?.username,
    handleWebSocketMessage
  );

  const handleSendMessage = (text) => {
    const message = {
      type: 'message',
      id: Date.now().toString(),
      channel: wsChannel,
      content: text,
      author: `${user.username}#${user.discriminator}`,
      timestamp: new Date().toISOString(),
    };

    // Send via WebSocket for real-time delivery
    const sent = sendMessage(message);
    
    // Also save to database via REST API (but don't add to UI, WebSocket will handle that)
    if (sent) {
      onSendMessage(text);
    }
  };

  return (
    <div className="chat">
      <div className="chat-header">
        {isDM ? <User size={24} className="channel-icon" /> : <Hash size={24} className="channel-icon" />}
        {channel}
        {!isConnected && <span className="connection-status">Connecting...</span>}
      </div>
      <div className="chat-messages">
        {loading && <div className="loading">Loading messages...</div>}
        {messages.map(message => (
          <div key={message.id} className="message">
            <div className="message-avatar">
              {message.author[0].toUpperCase()}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-author">{message.author}#{message.author_discriminator}</span>
                <span className="message-timestamp">{message.timestamp}</span>
              </div>
              <div className="message-text">{message.text}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} channel={channel} />
    </div>
  );
}

export default Chat;
