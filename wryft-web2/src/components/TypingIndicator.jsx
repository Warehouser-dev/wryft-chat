import React from 'react';

const TypingIndicator = ({ typingText }) => {
  if (!typingText) return null;

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="typing-text">{typingText}</span>
    </div>
  );
};

export default TypingIndicator;
