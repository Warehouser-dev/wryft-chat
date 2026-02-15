import React, { useState } from 'react';

function MessageInput({ onSendMessage, channel }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="message-input"
          placeholder={`Message #${channel}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </form>
    </div>
  );
}

export default MessageInput;
