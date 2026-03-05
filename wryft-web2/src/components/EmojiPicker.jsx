import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlass, Smiley, Sticker, Star, Clock, Plus, Image, CircleNotch } from 'phosphor-react';
import { Emoji } from '../utils/twemoji.jsx';
import { EMOJI_SHORTCODES } from '../utils/emojiShortcodes';

// Emoji categories
const EMOJI_CATEGORIES = {
  'Frequently Used': [],
  'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛', '🤜', '👋', '🤚', '👆', '👇', '👈', '👉', '🖕', '🖐️', '✋', '🤙'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Symbols': ['🔥', '⭐', '🌟', '✨', '💯', '💢', '💥', '💫', '💦', '💨', '💬', '👀', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚡', '🌈', '☀️', '🌙', '⭐', '💎', '🎯', '🎮', '🎵', '🎶', '🔔', '🔕', '📢', '📣', '💤', '💭', '🗯️', '💬'],
};

const EmojiPicker = ({ onEmojiSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState('emoji');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Smileys & Emotion');
  const [isClosing, setIsClosing] = useState(false);
  const pickerRef = useRef(null);

  // GIF states
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState(null);
  const [selectedGifCategory, setSelectedGifCategory] = useState('Trending');
  const [favoriteGifs, setFavoriteGifs] = useState([]);
  const searchTimeoutRef = useRef(null);

  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public Tenor API key

  const GIF_CATEGORIES = [
    'Trending',
    'Reactions',
    'Memes',
    'Anime',
    'Gaming',
    'Sports',
    'Animals',
    'Food',
    'Love',
    'Dance',
    'Sad',
    'Happy',
  ];

  // Load favorite GIFs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteGifs');
    if (saved) {
      try {
        setFavoriteGifs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load favorite GIFs:', e);
      }
    }
  }, []);

  // Save favorite GIFs to localStorage
  const saveFavorites = (newFavorites) => {
    setFavoriteGifs(newFavorites);
    localStorage.setItem('favoriteGifs', JSON.stringify(newFavorites));
  };

  const toggleFavoriteGif = (gif) => {
    const gifData = {
      id: gif.id,
      url: gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url,
      preview: gif.media_formats?.tinygif?.url,
    };

    const isFavorite = favoriteGifs.some(f => f.id === gif.id);
    
    if (isFavorite) {
      saveFavorites(favoriteGifs.filter(f => f.id !== gif.id));
    } else {
      saveFavorites([...favoriteGifs, gifData]);
    }
  };

  const isGifFavorite = (gifId) => {
    return favoriteGifs.some(f => f.id === gifId);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150); // Match animation duration
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch GIFs when tab changes to GIF or search/category changes
  useEffect(() => {
    if (activeTab === 'gif') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        if (selectedGifCategory === 'Favorites') {
          setGifs([]);
          setGifLoading(false);
        } else if (search) {
          fetchGifs(search);
        } else if (selectedGifCategory === 'Trending') {
          fetchGifs('trending');
        } else {
          fetchGifs(selectedGifCategory.toLowerCase());
        }
      }, 500);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [activeTab, search, selectedGifCategory]);

  const fetchGifs = async (query) => {
    setGifLoading(true);
    setGifError(null);

    try {
      const endpoint = query === 'trending' 
        ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif`
        : `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch GIFs');
      }

      const data = await response.json();
      setGifs(data.results || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setGifError('Failed to load GIFs');
      setGifs([]);
    } finally {
      setGifLoading(false);
    }
  };

  // Get all emojis from categories
  const getAllEmojis = () => {
    const allEmojis = [];
    Object.values(EMOJI_CATEGORIES).forEach(category => {
      allEmojis.push(...category);
    });
    return allEmojis;
  };

  // Filter emojis based on search
  const getFilteredEmojis = () => {
    if (!search) {
      return EMOJI_CATEGORIES[selectedCategory] || [];
    }

    // Search in shortcodes
    const matchingShortcodes = Object.entries(EMOJI_SHORTCODES)
      .filter(([code]) => code.includes(search.toLowerCase()))
      .map(([, emoji]) => emoji);

    return matchingShortcodes;
  };

  const filteredEmojis = getFilteredEmojis();

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    // Don't close picker to allow multiple selections
  };

  const handleGifClick = (gif) => {
    // Get the GIF URL (using the gif format for better quality)
    const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
    if (gifUrl) {
      onEmojiSelect(gifUrl);
      handleClose(); // Close picker after selecting GIF with animation
    }
  };

  return (
    <div className={`emoji-picker ${isClosing ? 'closing' : ''}`} ref={pickerRef}>
      {/* Tabs */}
      <div className="emoji-picker-tabs">
        <button
          className={`emoji-picker-tab ${activeTab === 'gif' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('gif');
            setSearch('');
          }}
          title="GIFs"
        >
          GIF
        </button>
        <button
          className={`emoji-picker-tab ${activeTab === 'sticker' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('sticker');
            setSearch('');
          }}
          title="Stickers"
        >
          <Sticker size={20} weight="fill" />
        </button>
        <button
          className={`emoji-picker-tab ${activeTab === 'emoji' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('emoji');
            setSearch('');
          }}
          title="Emoji"
        >
          <Smiley size={20} weight="fill" />
        </button>
      </div>

      {/* Search */}
      <div className="emoji-picker-search">
        <MagnifyingGlass size={16} weight="bold" />
        <input
          type="text"
          placeholder={activeTab === 'gif' ? 'Search GIFs' : activeTab === 'sticker' ? 'Search Stickers' : 'Search emojis'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="emoji-picker-search-input"
        />
      </div>

      {/* Content based on active tab */}
      {activeTab === 'emoji' && (
        <div className="emoji-picker-content">
          {/* Category sidebar */}
          {!search && (
            <div className="emoji-picker-categories">
              {Object.keys(EMOJI_CATEGORIES).map((category) => {
                const firstEmoji = EMOJI_CATEGORIES[category][0];
                return (
                  <button
                    key={category}
                    className={`emoji-category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                    title={category}
                  >
                    <Emoji emoji={firstEmoji} size={20} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Emoji grid */}
          <div className="emoji-picker-grid-container">
            {!search && (
              <div className="emoji-category-label">{selectedCategory}</div>
            )}
            <div className="emoji-picker-grid">
              {filteredEmojis.length > 0 ? (
                filteredEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    className="emoji-picker-emoji-btn"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    <Emoji emoji={emoji} size={28} />
                  </button>
                ))
              ) : (
                <div className="emoji-picker-empty">No emojis found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gif' && (
        <>
          {/* GIF Categories */}
          {!search && (
            <div className="gif-categories">
              <button
                className={`gif-category-btn ${selectedGifCategory === 'Favorites' ? 'active' : ''}`}
                onClick={() => setSelectedGifCategory('Favorites')}
              >
                <Star size={16} weight={selectedGifCategory === 'Favorites' ? 'fill' : 'regular'} />
                Favorites
              </button>
              {GIF_CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`gif-category-btn ${selectedGifCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedGifCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {selectedGifCategory === 'Favorites' && favoriteGifs.length > 0 ? (
            <div className="gif-picker-grid">
              {favoriteGifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                >
                  <img
                    src={gif.preview || gif.url}
                    alt="Favorite GIF"
                    loading="lazy"
                    onClick={() => {
                      onEmojiSelect(gif.url);
                      handleClose();
                    }}
                  />
                  <button
                    className="gif-favorite-btn active"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteGif(gif);
                    }}
                    title="Remove from favorites"
                  >
                    <Star size={16} weight="fill" />
                  </button>
                </div>
              ))}
            </div>
          ) : selectedGifCategory === 'Favorites' ? (
            <div className="emoji-picker-placeholder">
              <Star size={48} weight="thin" />
              <p>No favorite GIFs yet</p>
              <span className="emoji-picker-placeholder-hint">Star GIFs to add them to favorites</span>
            </div>
          ) : gifLoading ? (
            <div className="gif-loading">
              <CircleNotch size={32} weight="bold" />
              <span>Loading GIFs...</span>
            </div>
          ) : gifError ? (
            <div className="gif-error">
              <Image size={48} weight="thin" />
              <p>{gifError}</p>
              <span className="emoji-picker-placeholder-hint">Please try again</span>
            </div>
          ) : gifs.length > 0 ? (
            <div className="gif-picker-grid">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                >
                  <img
                    src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                    alt={gif.content_description || 'GIF'}
                    loading="lazy"
                    onClick={() => handleGifClick(gif)}
                  />
                  <button
                    className={`gif-favorite-btn ${isGifFavorite(gif.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteGif(gif);
                    }}
                    title={isGifFavorite(gif.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={16} weight={isGifFavorite(gif.id) ? 'fill' : 'regular'} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="emoji-picker-placeholder">
              <Image size={48} weight="thin" />
              <p>No GIFs found</p>
              <span className="emoji-picker-placeholder-hint">Try a different search</span>
            </div>
          )}
        </>
      )}

      {activeTab === 'sticker' && (
        <div className="emoji-picker-placeholder">
          <Sticker size={48} weight="thin" />
          <p>Stickers coming soon</p>
          <span className="emoji-picker-placeholder-hint">This feature is under development</span>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
