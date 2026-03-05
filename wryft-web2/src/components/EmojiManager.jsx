import { useState, useEffect } from 'react';
import { Trash, Plus, Smiley } from 'phosphor-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { uploadEmoji } from '../utils/storage';

function EmojiManager({ server }) {
  const { user } = useAuth();
  const [emoji, setEmoji] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [emojiName, setEmojiName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadEmoji();
  }, [server?.id]);

  const loadEmoji = async () => {
    if (!server?.id) return;
    
    try {
      setLoading(true);
      const data = await api.getGuildEmoji(server.id);
      setEmoji(data);
    } catch (err) {
      console.error('Failed to load emoji:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 256KB for emoji)
    if (file.size > 256 * 1024) {
      alert('Emoji must be smaller than 256KB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate emoji name
    if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
      alert('Emoji name must be between 2 and 32 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(emojiName)) {
      alert('Emoji name can only contain letters, numbers, and underscores');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadEmoji(file);
      const newEmoji = await api.createEmoji(server.id, user.id, emojiName, imageUrl);
      setEmoji([...emoji, newEmoji]);
      setEmojiName('');
      setShowUploadForm(false);
      e.target.value = '';
    } catch (err) {
      console.error('Failed to create emoji:', err);
      alert(err.message || 'Failed to create emoji. Name might already be taken.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (emojiId) => {
    if (!confirm('Are you sure you want to delete this emoji?')) return;

    try {
      await api.deleteEmoji(server.id, emojiId);
      setEmoji(emoji.filter(e => e.id !== emojiId));
    } catch (err) {
      console.error('Failed to delete emoji:', err);
      alert('Failed to delete emoji');
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <h2>Emoji</h2>
        <p style={{ color: 'var(--text-muted)' }}>Loading emoji...</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>Emoji</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Add custom emoji to your server. Max 256KB per emoji.
      </p>

      {!showUploadForm ? (
        <button
          onClick={() => setShowUploadForm(true)}
          style={{
            padding: '10px 20px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <Plus size={18} weight="bold" />
          Upload Emoji
        </button>
      ) : (
        <div style={{
          background: 'var(--background-secondary)',
          border: '2px solid var(--border)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              Emoji Name
            </label>
            <input
              type="text"
              value={emojiName}
              onChange={(e) => setEmojiName(e.target.value)}
              placeholder="my_cool_emoji"
              maxLength="32"
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '2px solid #2a2a2a',
                borderRadius: '6px',
                padding: '10px',
                color: '#dcddde',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Letters, numbers, and underscores only
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              Image File
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || !emojiName}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0a0a0a',
                border: '2px solid #2a2a2a',
                borderRadius: '6px',
                color: '#dcddde',
                fontSize: '14px',
                cursor: uploading || !emojiName ? 'not-allowed' : 'pointer',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setEmojiName('');
              }}
              disabled={uploading}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {emoji.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--text-muted)',
        }}>
          <Smiley size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No custom emoji yet</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Upload your first emoji to get started!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          {emoji.map((e) => (
            <div
              key={e.id}
              style={{
                background: 'var(--background-secondary)',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
              }}
            >
              <img
                src={e.image_url}
                alt={e.name}
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'contain',
                }}
              />
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}>
                :{e.name}:
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>Emoji Guidelines:</strong>
        </p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>Max file size: 256KB</li>
          <li>Recommended size: 128x128px</li>
          <li>Supported formats: PNG, JPG, GIF</li>
          <li>Name must be unique within the server</li>
        </ul>
      </div>
    </div>
  );
}

export default EmojiManager;
