import React from 'react';

export const parseEmoji = (emoji) => {
  if (!emoji) return '';
  
  // Get the unicode codepoint
  const codePoint = emoji.codePointAt(0).toString(16);
  
  // Return Twemoji CDN URL
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;
};

export const Emoji = ({ emoji, size = 18 }) => {
  const src = parseEmoji(emoji);
  
  return (
    <img 
      src={src}
      alt={emoji}
      className="twemoji"
      style={{ 
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-block',
        verticalAlign: '-0.1em',
      }}
    />
  );
};

// Convert text with emojis and mentions to React elements
export const parseMessageText = (text) => {
  if (!text) return text;
  
  // Regex to match emojis
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  // Regex to match mentions (e.g. @username#1234 or @time)
  const mentionRegex = /@(\w+)(?:#(\d{4}))?/g;
  
  const tokens = [];
  
  // Find all emojis
  let match;
  while ((match = emojiRegex.exec(text)) !== null) {
    tokens.push({
      type: 'emoji',
      value: match[0],
      index: match.index,
      length: match[0].length
    });
  }
  
  // Find all mentions
  while ((match = mentionRegex.exec(text)) !== null) {
    tokens.push({
      type: 'mention',
      value: match[0],
      username: match[1],
      discriminator: match[2],
      index: match.index,
      length: match[0].length
    });
  }
  
  // Sort tokens by index
  tokens.sort((a, b) => a.index - b.index);
  
  const parts = [];
  let lastIndex = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Skip overlapping tokens (shouldn't happen with these regexes, but just in case)
    if (token.index < lastIndex) continue;
    
    // Add text before token
    if (token.index > lastIndex) {
      parts.push(text.slice(lastIndex, token.index));
    }
    
    // Add token
    if (token.type === 'emoji') {
      parts.push(
        <Emoji key={`emoji-${token.index}`} emoji={token.value} size={18} />
      );
    } else if (token.type === 'mention') {
      parts.push(
        <span key={`mention-${token.index}`} className="mention">
          {token.discriminator ? `@${token.username}#${token.discriminator}` : `@${token.username}`}
        </span>
      );
    }
    
    lastIndex = token.index + token.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Keep backwards compatibility for existing imports
export const parseTextWithEmojis = parseMessageText;
