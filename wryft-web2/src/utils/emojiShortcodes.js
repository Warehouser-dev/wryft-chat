// Map of emoji shortcodes to emoji characters
export const EMOJI_SHORTCODES = {
  // Smileys
  'grinning': '😀',
  'smiley': '😃',
  'smile': '😄',
  'grin': '😁',
  'laughing': '😆',
  'sweat_smile': '😅',
  'rofl': '🤣',
  'joy': '😂',
  'sob': '😭',
  'slightly_smiling': '🙂',
  'upside_down': '🙃',
  'wink': '😉',
  'blush': '😊',
  'innocent': '😇',
  'heart_eyes': '😍',
  'star_struck': '🤩',
  'kissing_heart': '😘',
  'kissing': '😗',
  'yum': '😋',
  'stuck_out_tongue': '😛',
  'stuck_out_tongue_winking_eye': '😜',
  'zany': '🤪',
  'money_mouth': '🤑',
  'hugs': '🤗',
  'hand_over_mouth': '🤭',
  'shushing': '🤫',
  'thinking': '🤔',
  'zipper_mouth': '🤐',
  'raised_eyebrow': '🤨',
  'neutral': '😐',
  'expressionless': '😑',
  'no_mouth': '😶',
  'smirk': '😏',
  'unamused': '😒',
  'eye_roll': '🙄',
  'grimacing': '😬',
  'lying': '🤥',
  'relieved': '😌',
  'pensive': '😔',
  'sleepy': '😪',
  'drooling': '🤤',
  'sleeping': '😴',
  'mask': '😷',
  'thermometer': '🤒',
  'head_bandage': '🤕',
  'nauseated': '🤢',
  'vomiting': '🤮',
  'sneezing': '🤧',
  'hot': '🥵',
  'cold': '🥶',
  'dizzy': '😵',
  'exploding_head': '🤯',
  'sunglasses': '😎',
  'nerd': '🤓',
  'monocle': '🧐',
  'confused': '😕',
  'worried': '😟',
  'frowning': '🙁',
  'open_mouth': '😮',
  'hushed': '😯',
  'astonished': '😲',
  'flushed': '😳',
  'pleading': '🥺',
  'fearful': '😨',
  'cold_sweat': '😰',
  'cry': '😢',
  'scream': '😱',
  'disappointed': '😞',
  'sweat': '😓',
  'weary': '😩',
  'tired': '😫',
  'yawning': '🥱',
  'triumph': '😤',
  'rage': '😡',
  'angry': '😠',
  'cursing': '🤬',
  
  // Hands
  'thumbsup': '👍',
  '+1': '👍',
  'thumbsdown': '👎',
  '-1': '👎',
  'ok_hand': '👌',
  'peace': '✌️',
  'crossed_fingers': '🤞',
  'love_you': '🤟',
  'metal': '🤘',
  'call_me': '🤙',
  'clap': '👏',
  'raised_hands': '🙌',
  'open_hands': '👐',
  'palms_up': '🤲',
  'handshake': '🤝',
  'pray': '🙏',
  
  // Hearts
  'heart': '❤️',
  'orange_heart': '🧡',
  'yellow_heart': '💛',
  'green_heart': '💚',
  'blue_heart': '💙',
  'purple_heart': '💜',
  'black_heart': '🖤',
  'white_heart': '🤍',
  'brown_heart': '🤎',
  'broken_heart': '💔',
  'two_hearts': '💕',
  'revolving_hearts': '💞',
  'heartbeat': '💓',
  'growing_heart': '💗',
  'sparkling_heart': '💖',
  'cupid': '💘',
  'gift_heart': '💝',
  
  // Symbols
  'fire': '🔥',
  'star': '⭐',
  'star2': '🌟',
  'sparkles': '✨',
  '100': '💯',
  'boom': '💥',
  'dash': '💨',
  'speech_balloon': '💬',
  'eyes': '👀',
  'tada': '🎉',
  'confetti': '🎊',
  'balloon': '🎈',
  'gift': '🎁',
};

// Convert shortcode to emoji
export const shortcodeToEmoji = (shortcode) => {
  return EMOJI_SHORTCODES[shortcode] || null;
};

// Get all shortcodes that match a search
export const searchShortcodes = (search) => {
  if (!search) return [];
  
  const lowerSearch = search.toLowerCase();
  return Object.keys(EMOJI_SHORTCODES)
    .filter(code => code.includes(lowerSearch))
    .slice(0, 10)
    .map(code => ({
      shortcode: code,
      emoji: EMOJI_SHORTCODES[code],
    }));
};

// Replace :shortcode: with emoji in text
export const replaceShortcodes = (text) => {
  return text.replace(/:(\w+):/g, (match, shortcode) => {
    return EMOJI_SHORTCODES[shortcode] || match;
  });
};
