import React, { useState, useEffect } from 'react';
import { PlusIcon, GlobeAltIcon } from '@heroicons/react/24/solid';
import CreateServerModal from './CreateServerModal';
import { getServerUnreadCount, getServerMentionCount, getDMUnreadCount } from '../utils/unreadTracker';

function ServerList({ servers, activeServer, setActiveServer, onCreateServer, onHomeClick, viewMode, onDiscoveryClick }) {
  const [showModal, setShowModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Update unread counts
  const updateUnreadCounts = () => {
    const counts = {};
    servers.forEach(server => {
      const unread = getServerUnreadCount(server.id);
      const mentions = getServerMentionCount(server.id);
      counts[server.id] = {
        unread,
        mentions,
      };
      if (unread > 0 || mentions > 0) {
        console.log(`📊 Server ${server.name} unreads:`, unread, 'mentions:', mentions);
      }
    });
    const dmUnread = getDMUnreadCount();
    counts['dm'] = dmUnread;
    if (dmUnread > 0) {
      console.log(`📊 DM unreads:`, dmUnread);
    }
    setUnreadCounts(counts);
  };

  useEffect(() => {
    updateUnreadCounts();
    
    // Listen for unread updates
    const handleUnreadUpdate = () => updateUnreadCounts();
    window.addEventListener('unreadUpdate', handleUnreadUpdate);
    
    return () => window.removeEventListener('unreadUpdate', handleUnreadUpdate);
  }, [servers]);

  return (
    <>
      <div className="server-list">
        <div
          className={`server-icon ${viewMode === 'dm' && !activeServer ? 'active' : ''}`}
          onClick={onHomeClick}
          title="Direct Messages"
        >
          <img src="/wryfttransparent.png" alt="Wryft" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          {unreadCounts['dm'] > 0 && (
            <div className="unread-badge">{unreadCounts['dm'] > 99 ? '99+' : unreadCounts['dm']}</div>
          )}
        </div>

        <div
          className={`server-icon ${viewMode === 'discovery' ? 'active' : ''}`}
          onClick={onDiscoveryClick}
          title="Discover Guilds"
        >
          <GlobeAltIcon className="icon-24" />
        </div>
        
        <div className="server-separator" />
        
        {servers.map(server => {
          const serverUnread = unreadCounts[server.id];
          const hasMentions = serverUnread?.mentions > 0;
          const hasUnread = serverUnread?.unread > 0;
          
          return (
            <div
              key={server.id}
              className={`server-icon ${activeServer === server.id ? 'active' : ''}`}
              onClick={() => setActiveServer(server.id)}
              title={server.name}
            >
              {server.icon_url ? (
                <img 
                  src={server.icon_url} 
                  alt={server.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                  onError={(e) => {
                    console.error('Failed to load guild icon:', server.icon_url);
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = server.icon;
                  }}
                />
              ) : (
                server.icon
              )}
              {hasMentions && (
                <div className="unread-badge mention">{serverUnread.mentions > 99 ? '99+' : serverUnread.mentions}</div>
              )}
              {!hasMentions && hasUnread && (
                <div className="unread-dot"></div>
              )}
            </div>
          );
        })}
        
        <div 
          className="server-icon add-server"
          onClick={() => setShowModal(true)}
          title="Add a Guild"
        >
          <PlusIcon className="icon-32" />
        </div>
      </div>

      {showModal && (
        <CreateServerModal
          onClose={() => setShowModal(false)}
          onCreateServer={onCreateServer}
        />
      )}
    </>
  );
}

export default ServerList;
