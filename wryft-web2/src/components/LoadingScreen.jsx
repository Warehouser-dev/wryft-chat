import React from 'react';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo-wrap">
          <div className="loading-ring" />
          <div className="loading-logo-icon">W</div>
        </div>
        <div className="loading-tagline">Wryft</div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-text">Connecting...</div>
      </div>
    </div>
  );
}

export default LoadingScreen;
