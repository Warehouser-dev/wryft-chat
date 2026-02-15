import React, { useState } from 'react';
import { Home, Plus } from 'lucide-react';
import CreateServerModal from './CreateServerModal';

function ServerList({ servers, activeServer, setActiveServer, onCreateServer, onHomeClick, viewMode }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="server-list">
        <div
          className={`server-icon ${viewMode === 'dm' && !activeServer ? 'active' : ''}`}
          onClick={onHomeClick}
          title="Direct Messages"
        >
          <Home size={24} />
        </div>
        
        <div className="server-separator" />
        
        {servers.map(server => (
          <div
            key={server.id}
            className={`server-icon ${activeServer === server.id ? 'active' : ''}`}
            onClick={() => setActiveServer(server.id)}
            title={server.name}
          >
            {server.icon}
          </div>
        ))}
        
        <div 
          className="server-icon add-server"
          onClick={() => setShowModal(true)}
          title="Add a Server"
        >
          <Plus size={32} />
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
