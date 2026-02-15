import React, { useState } from 'react';
import { X } from 'lucide-react';

function CreateServerModal({ onClose, onCreateServer }) {
  const [serverName, setServerName] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverName.trim()) {
      onCreateServer(serverName);
      handleClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create a server</h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Give your server a personality with a name. You can always change it later.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Server Name</label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="Enter server name"
                autoFocus
                className="modal-input"
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-button-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="modal-button-primary" disabled={!serverName.trim()}>
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateServerModal;
