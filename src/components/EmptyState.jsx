import React, { useState } from 'react';
import { Plus, Users, MessageSquare } from 'lucide-react';

function EmptyState({ onCreateServer, isDMView }) {
  const [showInput, setShowInput] = useState(false);
  const [serverName, setServerName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (serverName.trim()) {
      onCreateServer(serverName);
      setServerName('');
      setShowInput(false);
    }
  };

  if (isDMView) {
    return (
      <div className="empty-state">
        <div className="empty-state-content">
          <MessageSquare size={80} className="empty-icon" />
          <h2>No conversation selected</h2>
          <p>Select a conversation from the list to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <Users size={80} className="empty-icon" />
        <h2>No servers yet</h2>
        <p>Create your first server to start chatting with friends</p>
        
        {showInput ? (
          <form onSubmit={handleCreate} className="empty-state-form">
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name"
              autoFocus
              className="empty-state-input"
            />
            <div className="empty-state-buttons">
              <button type="submit" className="create-button">Create</button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => {
                  setShowInput(false);
                  setServerName('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="create-server-button" onClick={() => setShowInput(true)}>
            <Plus size={20} />
            Create Server
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
