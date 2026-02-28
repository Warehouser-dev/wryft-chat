import { useState, useRef, useEffect } from 'react';
import { Plus, X, File as FileIcon, Image as ImageIcon, Smiley } from 'phosphor-react';
import { unlockAudio } from '../utils/notifications';
import { searchShortcodes, replaceShortcodes } from '../utils/emojiShortcodes';
import { Emoji } from '../utils/twemoji.jsx';
import { uploadAttachment } from '../utils/storage';
import EmojiPicker from './EmojiPicker';

function MessageInput({ onSendMessage, onTyping, channel, members = [], placeholder }) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  // Attachment states
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
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

    if (afterAt.includes(' ')) {
      return { show: false, search: '', startPos: -1 };
    }

    if (lastAtIndex === 0 || text[lastAtIndex - 1] === ' ') {
      return { show: true, search: afterAt, startPos: lastAtIndex };
    }

    return { show: false, search: '', startPos: -1 };
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(newValue);

    unlockAudio();

    if (onTyping && newValue.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      onTyping();

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
      if (e.key === 'Enter' || e.key === 'Tab') {
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File must be smaller than 10MB');
      return;
    }

    setAttachmentFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }

    // Clear the input so selecting the same file again works
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const handleEmojiSelect = (emojiOrGif) => {
    // Check if it's a GIF URL
    if (typeof emojiOrGif === 'string' && (emojiOrGif.startsWith('http://') || emojiOrGif.startsWith('https://'))) {
      // It's a GIF URL, insert it as text
      const cursorPos = inputRef.current?.selectionStart || message.length;
      const before = message.slice(0, cursorPos);
      const after = message.slice(cursorPos);
      const newMessage = `${before}${emojiOrGif}${after}`;
      const newCursorPos = cursorPos + emojiOrGif.length;

      setMessage(newMessage);

      // Focus input and restore cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      // It's an emoji
      const cursorPos = inputRef.current?.selectionStart || message.length;
      const before = message.slice(0, cursorPos);
      const after = message.slice(cursorPos);
      const newMessage = `${before}${emojiOrGif}${after}`;
      const newCursorPos = cursorPos + emojiOrGif.length;

      setMessage(newMessage);

      // Focus input and restore cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !attachmentFile) || showMentions || isUploading) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const messageWithEmojis = replaceShortcodes(message);
    let attachments = null;

    if (attachmentFile) {
      setIsUploading(true);
      try {
        const fileUrl = await uploadAttachment(attachmentFile);
        attachments = [{
          filename: attachmentFile.name,
          file_url: fileUrl,
          file_type: attachmentFile.type,
          file_size: attachmentFile.size
        }];
      } catch (err) {
        console.error('Failed to upload attachment:', err);
        alert(err.message || 'Failed to upload file. Please try again.');
        setIsUploading(false);
        return;
      }
    }

    onSendMessage(messageWithEmojis, attachments);

    setMessage('');
    setShowMentions(false);
    setMentionSearch('');
    setMentionStartPos(-1);
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setIsUploading(false);
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

      {attachmentFile && (
        <div className="attachment-preview-container">
          <div className="attachment-preview">
            {attachmentPreview ? (
              <img src={attachmentPreview} alt={attachmentFile.name} />
            ) : (
              <div className="attachment-file-icon">
                <FileIcon size={32} />
              </div>
            )}
            <div className="attachment-info">
              <span className="attachment-name">{attachmentFile.name}</span>
            </div>
            <button className="attachment-remove" onClick={removeAttachment}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`message-form ${attachmentFile ? 'has-attachment' : ''}`}>
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Plus size={24} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={isUploading ? "Uploading file..." : (placeholder || `Message #${channel}`)}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          disabled={isUploading}
        />
        <button
          type="button"
          className="emoji-picker-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isUploading}
        >
          <Smiley size={24} weight={showEmojiPicker ? 'fill' : 'regular'} />
        </button>
      </form>

      {showEmojiPicker && (
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}

export default MessageInput;
