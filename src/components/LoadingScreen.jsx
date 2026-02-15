import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-icon">W</div>
        </div>
        <div className="loading-spinner">
          <Loader2 size={32} className="spinner" />
        </div>
        <div className="loading-text">Connecting to Wryft...</div>
      </div>
    </div>
  );
}

export default LoadingScreen;
