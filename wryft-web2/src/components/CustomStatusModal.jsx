import { useState, useEffect, useRef } from 'react';
import { X, Smiley } from 'phosphor-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SimpleEmojiPicker from './SimpleEmojiPicker';

function CustomStatusModal({ isOpen, onClose, currentStatus, currentEmoji, onUpdate }) {
  const { user } = useAuth();
  const [statusText, setStatusText] = useState(currentStatus || '');
  const [statusEmoji, setStatusEmoji] = useState(currentEmoji || '');
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef(null);

  useEffect(() => {
    if (emojiRef.current && statusEmoji && window.twemoji) {
      window.twemoji.parse(emojiRef.current, {
        folder: 'svg',
        ext: '.svg'
      });
    }
  }, [statusEmoji]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateCustomStatus(
        user.id,
        statusText.trim() || null,
        statusEmoji || null
      );
      onUpdate(statusText.trim() || null, statusEmoji || null);
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await api.updateCustomStatus(user.id, null, null);
      onUpdate(null, null);
      onClose();
    } catch (err) {
      console.error('Failed to clear status:', err);
      alert('Failed to clear status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="custom-status-overlay" onClick={onClose}>
      <div className="custom-status-popup" onClick={(e) => e.stopPropagation()}>
        <div className="custom-status-header">
          <h3>Set Custom Status</h3>
          <button className="custom-status-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="custom-status-body">
          <div className="custom-status-input-row">
            <button
              className={`custom-status-emoji-btn ${statusEmoji ? 'has-emoji' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {statusEmoji ? (
                <span className="custom-status-emoji-display" ref={emojiRef}>{statusEmoji}</span>
              ) : (
                <Smiley size={18} weight="regular" />
              )}
            </button>
            <input
              type="text"
              className="custom-status-text-input"
              placeholder="What's happening?"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={128}
              autoFocus
            />
          </div>

          {showEmojiPicker && (
            <SimpleEmojiPicker
              onSelect={(emoji) => setStatusEmoji(emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>

        <div className="custom-status-footer">
          {(currentStatus || currentEmoji) && (
            <button
              className="custom-status-clear-btn"
              onClick={handleClear}
              disabled={saving}
            >
              Clear
            </button>
          )}
          <button
            className="custom-status-save-btn"
            onClick={handleSave}
            disabled={saving || (!statusText.trim() && !statusEmoji)}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomStatusModal;
