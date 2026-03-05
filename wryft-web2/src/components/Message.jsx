import React, { useState } from 'react';
import { DotsThreeVertical, PencilSimple, Trash, ArrowBendUpLeft } from 'phosphor-react';
import { useReactions } from '../hooks/useReactions';
import { useAuth } from '../context/AuthContext';
import ReactionButton from './ReactionPicker';
import LinkPreview from './LinkPreview';
import { Emoji, parseTextWithEmojis } from '../utils/twemoji.jsx';

// ── Markdown renderer ─────────────────────────────────────────────────────────
function parseMarkdown(text) {
  if (!text) return null;
  const parts = [];
  // Regex: ```code block```, `inline code`, **bold**, *italic*, ~~strike~~
  const pattern = /```([\s\S]*?)```|`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      parts.push(<code key={match.index} className="msg-code-block">{match[1].trim()}</code>);
    } else if (match[2] !== undefined) {
      parts.push(<code key={match.index} className="msg-inline-code">{match[2]}</code>);
    } else if (match[3] !== undefined) {
      parts.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      parts.push(<s key={match.index}>{match[5]}</s>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

// ── Highlight search matches ──────────────────────────────────────────────────
function highlightText(text, query) {
  if (!query || !text) return parseMarkdown(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return parseMarkdown(text);
  return (
    <>
      {parseMarkdown(text.slice(0, idx))}
      <mark className="msg-search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {parseMarkdown(text.slice(idx + query.length))}
    </>
  );
}

const Message = ({
  message,
  isDM,
  avatar,
  onEdit,
  onDelete,
  onUserClick,
  onReply,
  onContextMenu,
  showActions = true,
  searchQuery = '',
}) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const { groupedReactions, toggleReaction } = useReactions(message.id, isDM);

  const isOwnMessage = user && (
    message.author === user.username &&
    message.author_discriminator === user.discriminator
  );

  const handleReactionClick = (emoji) => {
    if (user) toggleReaction(emoji, user.id);
  };

  // Tenor GIF regex
  const tenorGifRegex = /(https?:\/\/[^\s]+\.tenor\.com[^\s]+\.gif)/gi;

  const renderMessageText = () => {
    const gifMatch = message.text.match(tenorGifRegex);
    if (gifMatch && gifMatch.length > 0) {
      const parts = message.text.split(tenorGifRegex);
      return (
        <>
          {parts.map((part, index) => {
            if (part.match(tenorGifRegex)) {
              return (
                <div key={index} className="message-gif">
                  <img src={part} alt="GIF" className="message-gif-image" onClick={() => window.open(part, '_blank')} />
                </div>
              );
            }
            return part ? <span key={index}>{highlightText(part, searchQuery)}</span> : null;
          })}
        </>
      );
    }
    return highlightText(message.text, searchQuery);
  };

  return (
    <div
      className="message"
      onMouseEnter={() => showActions && setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, message)}
    >
      {/* Reply preview */}
      {message.reply_to_text && (
        <div className="message-reply-preview">
          <div className="reply-preview-bar" />
          <span className="reply-preview-author">{message.reply_to_author}</span>
          <span className="reply-preview-text">{message.reply_to_text}</span>
        </div>
      )}

      <div className="message-avatar" onClick={() => onUserClick && onUserClick(message)}>
        {avatar ? (
          <img src={avatar} alt={message.author} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">{message.author.charAt(0).toUpperCase()}</div>
        )}
      </div>
      <div className="message-content-wrapper">
        <div className="message-header">
          <span
            className="message-author"
            onClick={() => onUserClick && onUserClick(message)}
            style={{ cursor: 'pointer' }}
          >
            {message.author}
            <span className="discriminator">#{message.author_discriminator}</span>
          </span>
          <span className="message-timestamp">{message.timestamp}</span>
          {message.edited && <span className="message-edited">(edited)</span>}
        </div>
        <div className="message-text">{renderMessageText()}</div>

        {/* Link Previews */}
        {(() => {
          const urlRegex = /(https?:\/\/[^\s]+)/gi;
          const urls = message.text.match(urlRegex) || [];
          const nonGifUrls = urls.filter(url => !url.match(tenorGifRegex));
          if (nonGifUrls.length > 0) {
            return (
              <div className="message-link-previews">
                {nonGifUrls.slice(0, 3).map((url, index) => <LinkPreview key={index} url={url} />)}
              </div>
            );
          }
          return null;
        })()}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map(att => {
              const isImage = att.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.filename);
              return (
                <div key={att.id || att.file_url} className="attachment-item">
                  {isImage ? (
                    <img src={att.file_url} alt={att.filename} className="attachment-image" onClick={() => window.open(att.file_url, '_blank')} />
                  ) : (
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="attachment-file-link">
                      <div className="attachment-file-icon">📄</div>
                      <div className="attachment-file-info">
                        <span className="attachment-file-name">{att.filename}</span>
                        {att.file_size && <span className="attachment-file-size">{(att.file_size / 1024).toFixed(1)} KB</span>}
                      </div>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className="message-reactions">
            {groupedReactions.map(({ emoji, count, users }) => {
              const userReacted = user && users.includes(user.id);
              return (
                <button key={emoji} className={`reaction-bubble ${userReacted ? 'reacted' : ''}`} onClick={() => handleReactionClick(emoji)} title={`${count} reaction${count > 1 ? 's' : ''}`}>
                  <span className="reaction-emoji"><Emoji emoji={emoji} size={16} /></span>
                  <span className="reaction-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hover Actions */}
        {showActions && showMenu && (
          <div className="message-actions">
            <ReactionButton onReactionSelect={handleReactionClick} />
            <button className="message-action-btn" onClick={() => onReply && onReply(message)} title="Reply">
              <ArrowBendUpLeft size={16} weight="bold" />
            </button>
            {isOwnMessage && (
              <>
                <button className="message-action-btn" onClick={() => onEdit && onEdit(message)} title="Edit message">
                  <PencilSimple size={16} weight="bold" />
                </button>
                <button className="message-action-btn" onClick={() => onDelete && onDelete(message)} title="Delete message">
                  <Trash size={16} weight="bold" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
