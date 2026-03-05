import { useState } from 'react';
import { X, Hash, SpeakerHigh } from 'phosphor-react';

function CreateChannelModal({ isOpen, onClose, onCreateChannel, onCreateCategory, type, categoryId = null }) {
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState(type === 'category' ? 'text' : type);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (type === 'category') {
      onCreateCategory(name.trim());
    } else {
      onCreateChannel(name.trim(), channelType, categoryId);
    }
    
    setName('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-channel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === 'category' ? 'Create Category' : 'Create Channel'}</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {type !== 'category' && (
              <div className="channel-type-selector">
                <label className="channel-type-option">
                  <input
                    type="radio"
                    name="channelType"
                    value="text"
                    checked={channelType === 'text'}
                    onChange={(e) => setChannelType(e.target.value)}
                  />
                  <div className="channel-type-card">
                    <Hash size={32} weight="bold" />
                    <div>
                      <div className="channel-type-title">Text Channel</div>
                      <div className="channel-type-desc">Send messages, images, and more</div>
                    </div>
                  </div>
                </label>

                <label className="channel-type-option">
                  <input
                    type="radio"
                    name="channelType"
                    value="voice"
                    checked={channelType === 'voice'}
                    onChange={(e) => setChannelType(e.target.value)}
                  />
                  <div className="channel-type-card">
                    <SpeakerHigh size={32} weight="fill" />
                    <div>
                      <div className="channel-type-title">Voice Channel</div>
                      <div className="channel-type-desc">Hang out together with voice and video</div>
                    </div>
                  </div>
                </label>
              </div>
            )}

            <div className="form-group">
              <label>{type === 'category' ? 'Category Name' : 'Channel Name'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'category' ? 'new-category' : channelType === 'text' ? 'new-channel' : 'new-voice-channel'}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Create {type === 'category' ? 'Category' : 'Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
