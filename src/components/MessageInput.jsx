import { useState, useRef, useEffect } from 'react';

function MessageInput({ onSendMessage, onTyping, channel, members = [] }) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Special mentions
  const specialMentions = [
    { id: 'time', username: 'time', discriminator: '', isSpecial: true, description: "Refer to a time dynamically in the viewer's time zone" }
  ];

  const filteredSpecialMentions = specialMentions.filter(m =>
    m.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const filteredMembers = members.filter(m => 
    m.username.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const allFilteredMentions = [...filteredSpecialMentions, ...filteredMembers];

  // Detect @ mentions
  const detectMention = (text, cursorPos) => {
    const beforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      return { show: false, search: '', startPos: -1 };
    }
    
    const afterAt = beforeCursor.slice(lastAtIndex + 1);
    
    // Check if there's a space after @ (which means we're not in a mention anymore)
    if (afterAt.includes(' ')) {
      return { show: false, search: '', startPos: -1 };
    }
    
    // Check if @ is at start or has space before it
    if (lastAtIndex === 0 || text[lastAtIndex - 1] === ' ') {
      return { show: true, search: afterAt, startPos: lastAtIndex };
    }
    
    return { show: false, search: '', startPos: -1 };
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setMessage(newValue);
    
    // Trigger typing indicator
    if (onTyping && newValue.trim()) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing event
      onTyping();
      
      // Set timeout to stop sending typing events after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 3000);
    }
    
    const mention = detectMention(newValue, cursorPos);
    setShowMentions(mention.show);
    setMentionSearch(mention.search);
    setMentionStartPos(mention.startPos);
    setSelectedIndex(0);
  };

  const handleClick = (e) => {
    const cursorPos = e.target.selectionStart;
    const mention = detectMention(message, cursorPos);
    setShowMentions(mention.show);
    setMentionSearch(mention.search);
    setMentionStartPos(mention.startPos);
    setSelectedIndex(0);
  };

  const insertMention = (member) => {
    if (mentionStartPos === -1) return;
    
    const mentionText = member.isSpecial 
      ? `@${member.username}` 
      : `@${member.username}#${member.discriminator}`;
    
    const before = message.slice(0, mentionStartPos);
    const after = message.slice(inputRef.current.selectionStart);
    
    const newMessage = `${before}${mentionText} ${after}`;
    const newCursorPos = before.length + mentionText.length + 1;
    
    setMessage(newMessage);
    setShowMentions(false);
    setMentionSearch('');
    setMentionStartPos(-1);
    
    // Set cursor position after mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showMentions && allFilteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allFilteredMentions.length);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allFilteredMentions.length) % allFilteredMentions.length);
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(allFilteredMentions[selectedIndex]);
        return;
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        insertMention(allFilteredMentions[selectedIndex]);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        setMentionSearch('');
        setMentionStartPos(-1);
        return;
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !showMentions) {
      // Clear typing timeout when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      onSendMessage(message);
      setMessage('');
      setShowMentions(false);
      setMentionSearch('');
      setMentionStartPos(-1);
    }
  };

  return (
    <div className="message-input-container">
      {showMentions && allFilteredMentions.length > 0 && (
        <div className="mention-autocomplete">
          {filteredSpecialMentions.length > 0 && (
            <>
              {filteredSpecialMentions.map((mention, index) => (
                <div
                  key={mention.id}
                  className={`mention-item special ${index === selectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(mention);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="mention-avatar special">@</div>
                  <div className="mention-info">
                    <div className="mention-username">
                      @{mention.username}
                      <span className="mention-badge">NEW</span>
                    </div>
                    <div className="mention-description">{mention.description}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {filteredMembers.length > 0 && (
            <>
              <div className="mention-section-header">MEMBERS</div>
              {filteredMembers.map((member, index) => {
                const actualIndex = filteredSpecialMentions.length + index;
                return (
                  <div
                    key={member.id}
                    className={`mention-item ${actualIndex === selectedIndex ? 'selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(member);
                    }}
                    onMouseEnter={() => setSelectedIndex(actualIndex)}
                  >
                    <div className="mention-avatar">
                      {member.username[0].toUpperCase()}
                    </div>
                    <div className="mention-info">
                      <div className="mention-username">{member.username}</div>
                      <div className="mention-discriminator">#{member.discriminator}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={`Message #${channel}`}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
        />
      </form>
    </div>
  );
}

export default MessageInput;
