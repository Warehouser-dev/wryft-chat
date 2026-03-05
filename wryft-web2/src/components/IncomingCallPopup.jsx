import React from 'react';
import { Phone, PhoneSlash, VideoCamera } from 'phosphor-react';

function IncomingCallPopup({ caller, callType, onAccept, onReject }) {
  return (
    <div className="incoming-call-popup">
      <div className="incoming-call-content">
        <div 
          className="incoming-call-avatar"
          style={caller.avatar ? {
            backgroundImage: `url(${caller.avatar})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {!caller.avatar && caller.username[0].toUpperCase()}
        </div>
        
        <div className="incoming-call-info">
          <h3>{caller.username}</h3>
          <p className="incoming-call-type">
            {callType === 'video' ? (
              <>
                <VideoCamera size={16} weight="fill" />
                Incoming video call
              </>
            ) : (
              <>
                <Phone size={16} weight="fill" />
                Incoming voice call
              </>
            )}
          </p>
        </div>
        
        <div className="incoming-call-actions">
          <button 
            className="incoming-call-btn accept"
            onClick={onAccept}
            title="Accept"
          >
            <Phone size={24} weight="fill" />
          </button>
          <button 
            className="incoming-call-btn reject"
            onClick={onReject}
            title="Reject"
          >
            <PhoneSlash size={24} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallPopup;
