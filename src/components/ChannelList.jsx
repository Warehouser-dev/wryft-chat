import { Hash, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

function ChannelList({ channels, activeChannel, setActiveChannel, onCreateChannel, onDeleteChannel, isOwner }) {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const handleCreate = () => {
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim());
      setNewChannelName('');
      setShowCreateInput(false);
    }
  };

  return (
    <div className="channel-list">
      <div className="channel-category">
        <span>Text Channels</span>
        {isOwner && (
          <button 
            className="channel-add-button"
            onClick={() => setShowCreateInput(!showCreateInput)}
            title="Create Channel"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showCreateInput && (
        <div className="channel-create-input">
          <input
            type="text"
            placeholder="new-channel"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            onBlur={handleCreate}
            autoFocus
          />
        </div>
      )}

      {channels.map(channel => (
        <div
          key={channel.id}
          className={`channel ${activeChannel === channel.name ? 'active' : ''}`}
          onClick={() => setActiveChannel(channel.name)}
        >
          <Hash size={20} className="channel-icon" />
          <span>{channel.name}</span>
          {isOwner && channel.name !== 'general' && (
            <button
              className="channel-delete-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChannel(channel.id);
              }}
              title="Delete Channel"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default ChannelList;
