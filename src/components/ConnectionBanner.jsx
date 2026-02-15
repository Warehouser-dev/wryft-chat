import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

function ConnectionBanner({ isConnected }) {
  if (isConnected) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="connection-overlay">
      <div className="connection-content">
        <div className="connection-icon-wrapper">
          <AlertCircle size={120} />
        </div>
        <h1>Connection Lost</h1>
        <p>We're experiencing technical difficulties. Our servers are currently unavailable.</p>
        <div className="connection-actions">
          <button onClick={handleRefresh} className="connection-button primary">
            <RefreshCw size={20} />
            Try Again
          </button>
          <a 
            href="https://bsky.app/profile/your-username.bsky.social" 
            target="_blank" 
            rel="noopener noreferrer"
            className="connection-button secondary"
          >
            <ExternalLink size={20} />
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
