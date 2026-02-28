import { WarningCircle, ArrowSquareOut, ArrowsClockwise } from 'phosphor-react';

function ConnectionBanner({ isConnected }) {
  if (isConnected) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="connection-overlay">
      <div className="connection-content">
        <div className="connection-icon-wrapper">
          <WarningCircle size={120} weight="thin" />
        </div>
        <h1>Connection Lost</h1>
        <p>We're experiencing technical difficulties. Our servers are currently unavailable.</p>
        <div className="connection-actions">
          <button onClick={handleRefresh} className="connection-button primary">
            <ArrowsClockwise size={20} weight="bold" />
            Try Again
          </button>
          <a 
            href="https://bsky.app/profile/wryft.bsky.social" 
            target="_blank" 
            rel="noopener noreferrer"
            className="connection-button secondary"
          >
            <ArrowSquareOut size={20} weight="bold" />
            Check Status on Bluesky
          </a>
        </div>
        <div className="connection-footer">
          We'll automatically reconnect when the service is back online
        </div>
      </div>
    </div>
  );
}

export default ConnectionBanner;
