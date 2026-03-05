import React, { useState } from 'react';
import { Smiley, MagnifyingGlass } from 'phosphor-react';
import { Emoji } from '../utils/twemoji.jsx';

const EMOJI_LIST = [
  { emoji: '😀', name: 'grinning', keywords: ['smile', 'happy'] },
  { emoji: '😃', name: 'smiley', keywords: ['smile', 'happy'] },
  { emoji: '😄', name: 'smile', keywords: ['happy', 'joy'] },
  { emoji: '😁', name: 'grin', keywords: ['happy', 'smile'] },
  { emoji: '😆', name: 'laughing', keywords: ['happy', 'laugh'] },
  { emoji: '😅', name: 'sweat_smile', keywords: ['hot', 'laugh'] },
  { emoji: '🤣', name: 'rofl', keywords: ['laugh', 'lol'] },
  { emoji: '😂', name: 'joy', keywords: ['laugh', 'cry', 'lol'] },
  { emoji: '🙂', name: 'slightly_smiling', keywords: ['smile'] },
  { emoji: '🙃', name: 'upside_down', keywords: ['silly'] },
  { emoji: '😉', name: 'wink', keywords: ['flirt'] },
  { emoji: '😊', name: 'blush', keywords: ['smile', 'happy'] },
  { emoji: '😇', name: 'innocent', keywords: ['angel'] },
  { emoji: '🥰', name: 'heart_eyes', keywords: ['love', 'crush'] },
  { emoji: '😍', name: 'heart_eyes', keywords: ['love', 'crush'] },
  { emoji: '🤩', name: 'star_struck', keywords: ['eyes', 'star'] },
  { emoji: '😘', name: 'kissing_heart', keywords: ['love', 'kiss'] },
  { emoji: '😗', name: 'kissing', keywords: ['kiss'] },
  { emoji: '😚', name: 'kissing_closed_eyes', keywords: ['kiss'] },
  { emoji: '😙', name: 'kissing_smiling_eyes', keywords: ['kiss'] },
  { emoji: '🥲', name: 'smiling_tear', keywords: ['sad', 'cry'] },
  { emoji: '😋', name: 'yum', keywords: ['tongue', 'food'] },
  { emoji: '😛', name: 'stuck_out_tongue', keywords: ['tongue'] },
  { emoji: '😜', name: 'stuck_out_tongue_winking_eye', keywords: ['tongue', 'wink'] },
  { emoji: '🤪', name: 'zany', keywords: ['crazy', 'wild'] },
  { emoji: '😝', name: 'stuck_out_tongue_closed_eyes', keywords: ['tongue'] },
  { emoji: '🤑', name: 'money_mouth', keywords: ['money', 'rich'] },
  { emoji: '🤗', name: 'hugs', keywords: ['hug'] },
  { emoji: '🤭', name: 'hand_over_mouth', keywords: ['quiet', 'oops'] },
  { emoji: '🤫', name: 'shushing', keywords: ['quiet', 'shh'] },
  { emoji: '🤔', name: 'thinking', keywords: ['think', 'hmm'] },
  { emoji: '🤐', name: 'zipper_mouth', keywords: ['quiet', 'secret'] },
  { emoji: '🤨', name: 'raised_eyebrow', keywords: ['suspicious'] },
  { emoji: '😐', name: 'neutral', keywords: ['meh'] },
  { emoji: '😑', name: 'expressionless', keywords: ['blank'] },
  { emoji: '😶', name: 'no_mouth', keywords: ['silent'] },
  { emoji: '😏', name: 'smirk', keywords: ['smug'] },
  { emoji: '😒', name: 'unamused', keywords: ['annoyed'] },
  { emoji: '🙄', name: 'eye_roll', keywords: ['annoyed'] },
  { emoji: '😬', name: 'grimacing', keywords: ['awkward'] },
  { emoji: '🤥', name: 'lying', keywords: ['pinocchio', 'lie'] },
  { emoji: '😌', name: 'relieved', keywords: ['calm'] },
  { emoji: '😔', name: 'pensive', keywords: ['sad'] },
  { emoji: '😪', name: 'sleepy', keywords: ['tired', 'sleep'] },
  { emoji: '🤤', name: 'drooling', keywords: ['drool'] },
  { emoji: '😴', name: 'sleeping', keywords: ['sleep', 'zzz'] },
  { emoji: '😷', name: 'mask', keywords: ['sick', 'covid'] },
  { emoji: '🤒', name: 'thermometer', keywords: ['sick', 'ill'] },
  { emoji: '🤕', name: 'head_bandage', keywords: ['hurt', 'injured'] },
  { emoji: '🤢', name: 'nauseated', keywords: ['sick', 'gross'] },
  { emoji: '🤮', name: 'vomiting', keywords: ['sick', 'puke'] },
  { emoji: '🤧', name: 'sneezing', keywords: ['sick', 'achoo'] },
  { emoji: '🥵', name: 'hot', keywords: ['heat', 'sweat'] },
  { emoji: '🥶', name: 'cold', keywords: ['freeze', 'ice'] },
  { emoji: '😵', name: 'dizzy', keywords: ['confused'] },
  { emoji: '🤯', name: 'exploding_head', keywords: ['mind blown', 'wow'] },
  { emoji: '😎', name: 'sunglasses', keywords: ['cool'] },
  { emoji: '🤓', name: 'nerd', keywords: ['geek', 'smart'] },
  { emoji: '🧐', name: 'monocle', keywords: ['fancy'] },
  { emoji: '😕', name: 'confused', keywords: ['unsure'] },
  { emoji: '😟', name: 'worried', keywords: ['concern'] },
  { emoji: '🙁', name: 'frowning', keywords: ['sad'] },
  { emoji: '☹️', name: 'frowning2', keywords: ['sad'] },
  { emoji: '😮', name: 'open_mouth', keywords: ['wow', 'surprise'] },
  { emoji: '😯', name: 'hushed', keywords: ['surprise'] },
  { emoji: '😲', name: 'astonished', keywords: ['shock'] },
  { emoji: '😳', name: 'flushed', keywords: ['embarrassed'] },
  { emoji: '🥺', name: 'pleading', keywords: ['puppy eyes', 'beg'] },
  { emoji: '😦', name: 'frowning_open_mouth', keywords: ['sad'] },
  { emoji: '😧', name: 'anguished', keywords: ['sad', 'pain'] },
  { emoji: '😨', name: 'fearful', keywords: ['scared', 'fear'] },
  { emoji: '😰', name: 'cold_sweat', keywords: ['nervous'] },
  { emoji: '😥', name: 'disappointed_relieved', keywords: ['sad', 'phew'] },
  { emoji: '😢', name: 'cry', keywords: ['sad', 'tear'] },
  { emoji: '😭', name: 'sob', keywords: ['cry', 'sad'] },
  { emoji: '😱', name: 'scream', keywords: ['scared', 'shock'] },
  { emoji: '😖', name: 'confounded', keywords: ['confused'] },
  { emoji: '😣', name: 'persevere', keywords: ['struggle'] },
  { emoji: '😞', name: 'disappointed', keywords: ['sad'] },
  { emoji: '😓', name: 'sweat', keywords: ['tired'] },
  { emoji: '😩', name: 'weary', keywords: ['tired'] },
  { emoji: '😫', name: 'tired', keywords: ['exhausted'] },
  { emoji: '🥱', name: 'yawning', keywords: ['tired', 'bored'] },
  { emoji: '😤', name: 'triumph', keywords: ['proud', 'smug'] },
  { emoji: '😡', name: 'rage', keywords: ['angry', 'mad'] },
  { emoji: '😠', name: 'angry', keywords: ['mad'] },
  { emoji: '🤬', name: 'cursing', keywords: ['angry', 'swear'] },
  { emoji: '👍', name: 'thumbsup', keywords: ['like', 'yes', 'ok'] },
  { emoji: '👎', name: 'thumbsdown', keywords: ['dislike', 'no'] },
  { emoji: '👌', name: 'ok_hand', keywords: ['ok', 'perfect'] },
  { emoji: '✌️', name: 'peace', keywords: ['victory'] },
  { emoji: '🤞', name: 'crossed_fingers', keywords: ['luck', 'hope'] },
  { emoji: '🤟', name: 'love_you', keywords: ['ily'] },
  { emoji: '🤘', name: 'metal', keywords: ['rock'] },
  { emoji: '🤙', name: 'call_me', keywords: ['phone'] },
  { emoji: '👏', name: 'clap', keywords: ['applause'] },
  { emoji: '🙌', name: 'raised_hands', keywords: ['celebrate', 'yay'] },
  { emoji: '👐', name: 'open_hands', keywords: ['hug'] },
  { emoji: '🤲', name: 'palms_up', keywords: ['pray'] },
  { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agreement'] },
  { emoji: '🙏', name: 'pray', keywords: ['thanks', 'please'] },
  { emoji: '❤️', name: 'heart', keywords: ['love'] },
  { emoji: '🧡', name: 'orange_heart', keywords: ['love'] },
  { emoji: '💛', name: 'yellow_heart', keywords: ['love'] },
  { emoji: '💚', name: 'green_heart', keywords: ['love'] },
  { emoji: '💙', name: 'blue_heart', keywords: ['love'] },
  { emoji: '💜', name: 'purple_heart', keywords: ['love'] },
  { emoji: '🖤', name: 'black_heart', keywords: ['love'] },
  { emoji: '🤍', name: 'white_heart', keywords: ['love'] },
  { emoji: '🤎', name: 'brown_heart', keywords: ['love'] },
  { emoji: '💔', name: 'broken_heart', keywords: ['sad', 'heartbreak'] },
  { emoji: '❣️', name: 'heart_exclamation', keywords: ['love'] },
  { emoji: '💕', name: 'two_hearts', keywords: ['love'] },
  { emoji: '💞', name: 'revolving_hearts', keywords: ['love'] },
  { emoji: '💓', name: 'heartbeat', keywords: ['love'] },
  { emoji: '💗', name: 'growing_heart', keywords: ['love'] },
  { emoji: '💖', name: 'sparkling_heart', keywords: ['love'] },
  { emoji: '💘', name: 'cupid', keywords: ['love', 'arrow'] },
  { emoji: '💝', name: 'gift_heart', keywords: ['love', 'gift'] },
  { emoji: '🔥', name: 'fire', keywords: ['hot', 'lit'] },
  { emoji: '⭐', name: 'star', keywords: ['favorite'] },
  { emoji: '🌟', name: 'star2', keywords: ['sparkle'] },
  { emoji: '✨', name: 'sparkles', keywords: ['shine'] },
  { emoji: '💯', name: '100', keywords: ['perfect', 'hundred'] },
  { emoji: '💢', name: 'anger', keywords: ['angry', 'mad'] },
  { emoji: '💥', name: 'boom', keywords: ['explosion'] },
  { emoji: '💫', name: 'dizzy', keywords: ['star'] },
  { emoji: '💦', name: 'sweat_drops', keywords: ['water'] },
  { emoji: '💨', name: 'dash', keywords: ['fast', 'wind'] },
  { emoji: '🕳️', name: 'hole', keywords: ['empty'] },
  { emoji: '💬', name: 'speech_balloon', keywords: ['chat', 'talk'] },
  { emoji: '👀', name: 'eyes', keywords: ['look', 'see'] },
  { emoji: '🎉', name: 'tada', keywords: ['party', 'celebrate'] },
  { emoji: '🎊', name: 'confetti', keywords: ['party', 'celebrate'] },
  { emoji: '🎈', name: 'balloon', keywords: ['party'] },
  { emoji: '🎁', name: 'gift', keywords: ['present', 'birthday'] },
];

const ReactionPicker = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const filteredEmojis = search
    ? EMOJI_LIST.filter(e => 
        e.name.includes(search.toLowerCase()) || 
        e.keywords.some(k => k.includes(search.toLowerCase()))
      )
    : EMOJI_LIST;

  return (
    <div className="reaction-picker">
      <div className="reaction-search">
        <MagnifyingGlass size={14} weight="bold" />
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="reaction-search-input"
        />
      </div>
      <div className="reaction-picker-grid">
        {filteredEmojis.slice(0, 50).map((item, index) => (
          <button
            key={index}
            className="reaction-emoji-btn"
            onClick={() => {
              onSelect(item.emoji);
              onClose();
            }}
            title={item.name}
          >
            <Emoji emoji={item.emoji} size={20} />
          </button>
        ))}
      </div>
    </div>
  );
};

const ReactionButton = ({ onReactionSelect }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="reaction-button-container">
      <button
        className="reaction-add-btn"
        onClick={() => setShowPicker(!showPicker)}
        title="Add reaction"
      >
        <Smiley size={16} weight="fill" />
      </button>
      {showPicker && (
        <>
          <div className="reaction-picker-backdrop" onClick={() => setShowPicker(false)} />
          <ReactionPicker
            onSelect={onReactionSelect}
            onClose={() => setShowPicker(false)}
          />
        </>
      )}
    </div>
  );
};

export default ReactionButton;
