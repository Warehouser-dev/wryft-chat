import { X, Copy, Check, UserPlus } from 'phosphor-react';
import { useState } from 'react';

function InviteModal({ isOpen, onClose, inviteCode, serverName }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite friends to {serverName}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Share this invite link with friends to let them join your server!
          </p>

          <div className="invite-link-container">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="invite-link-input"
            />
            <button className="invite-copy-button" onClick={handleCopy}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="invite-info">
            <UserPlus size={16} />
            <span>This invite link never expires and has unlimited uses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InviteModal;
