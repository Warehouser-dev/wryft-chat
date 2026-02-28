function SkeletonLoader({ type = 'message', count = 3 }) {
  if (type === 'message') {
    return (
      <div className="skeleton-messages">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-message">
            <div className="skeleton-avatar" />
            <div className="skeleton-content">
              <div className="skeleton-header">
                <div className="skeleton-username" />
                <div className="skeleton-timestamp" />
              </div>
              <div className="skeleton-text" />
              <div className="skeleton-text short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'channel') {
    return (
      <div className="skeleton-channels">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-channel">
            <div className="skeleton-channel-icon" />
            <div className="skeleton-channel-name" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'member') {
    return (
      <div className="skeleton-members">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-member">
            <div className="skeleton-member-avatar" />
            <div className="skeleton-member-name" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default SkeletonLoader;
