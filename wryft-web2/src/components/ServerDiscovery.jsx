import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';

function ServerDiscovery({ onJoinServer }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPublicServers();
  }, []);

  const loadPublicServers = async () => {
    setLoading(true);
    try {
      const publicServers = await api.getPublicGuilds();
      setServers(publicServers);
    } catch (err) {
      console.error('Failed to load public servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinServer = async (serverId) => {
    // For now, we'll need an invite code
    // In a real app, you'd have a "join public server" endpoint
    alert('Public server joining coming soon! Use an invite link for now.');
  };

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (server.description && server.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="discovery-container-new">
      <div className="discovery-hero">
        <div className="discovery-hero-content">
          <MagnifyingGlassIcon className="discovery-hero-icon" />
          <h1 className="discovery-hero-title">Discover Communities</h1>
          <p className="discovery-hero-subtitle">Explore public servers and join communities that match your interests</p>
          
          <div className="discovery-search-wrapper">
            <MagnifyingGlassIcon className="discovery-search-icon" />
            <input
              type="text"
              className="discovery-search-input"
              placeholder="Search servers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="discovery-content">
        <div className="discovery-section">
          <div className="discovery-section-header">
            <h2>Verified Servers</h2>
            <span className="discovery-section-count">{filteredServers.length}</span>
          </div>

          {loading ? (
            <div className="discovery-loading">
              <div className="loading-spinner"></div>
              <p>Loading servers...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="discovery-empty">
              <p>{searchQuery ? 'No servers found' : 'No public servers available'}</p>
            </div>
          ) : (
            <div className="discovery-grid-new">
              {filteredServers.map(server => (
                <div
                  key={server.id}
                  className="discovery-card-new"
                  onClick={() => handleJoinServer(server.id)}
                >
                  <div className="discovery-card-header">
                    {server.is_verified && (
                      <img src="/verifiedguild.png" alt="Verified" className="discovery-verified-badge" />
                    )}
                  </div>
                  
                  <div className="discovery-card-icon-wrapper">
                    {server.icon_url ? (
                      <img src={server.icon_url} alt={server.name} className="discovery-card-icon-new" />
                    ) : (
                      <div className="discovery-card-icon-new discovery-card-icon-placeholder">
                        {server.icon || server.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="discovery-card-body">
                    <h3 className="discovery-card-title">{server.name}</h3>
                    <p className="discovery-card-desc">
                      {server.description || 'No description available'}
                    </p>
                    <div className="discovery-card-stats">
                      <div className="discovery-card-stat">
                        <div className="discovery-online-dot"></div>
                        <span>{server.member_count || 0} members</span>
                      </div>
                      <div className="discovery-card-stat">
                        <span>Joined</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerDiscovery;
