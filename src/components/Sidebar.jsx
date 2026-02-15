import React, { useState } from 'react';
import { UserPlus, ChevronDown, LogOut, Settings } from 'lucide-react';
import ChannelList from './ChannelList';
import UserPanel from './UserPanel';
import InviteModal from './InviteModal';
import ServerSettings from './ServerSettings';

function Sidebar({ 
  serverName,
  serverId,
  channels, 
  activeChannel, 
  setActiveChannel, 
  onCreateChannel, 
  onDeleteChannel, 
  onCreateInvite,
  onLeaveServer,
  onUpdateServer,
  onDeleteServer,
  isOwner, 
  user 
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleInvite = async () => {
    const code = await onCreateInvite();
    setInviteCode(code);
    setShowInvite(true);
    setShowDropdown(false);
  };

  const handleLeave = () => {
    if (confirm(`Are you sure you want to leave ${serverName}?`)) {
      onLeaveServer();
      setShowDropdown(false);
    }
  };

  const handleSettings = () => {
    setShowSettings(true);
    setShowDropdown(false);
  };

  return (
    <div className="sidebar">
      <div className="server-name-header">
        <div 
          className="server-name-clickable" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="server-name">{serverName}</span>
          <ChevronDown size={18} className={`server-dropdown-icon ${showDropdown ? 'open' : ''}`} />
        </div>
        
        {showDropdown && (
          <div className="server-dropdown">
            <button className="server-dropdown-item" onClick={handleInvite}>
              <UserPlus size={16} />
              Invite People
            </button>
            {isOwner && (
              <>
                <div className="server-dropdown-divider" />
                <button className="server-dropdown-item" onClick={handleSettings}>
                  <Settings size={16} />
                  Server Settings
                </button>
              </>
            )}
            {!isOwner && (
              <>
                <div className="server-dropdown-divider" />
                <button className="server-dropdown-item danger" onClick={handleLeave}>
                  <LogOut size={16} />
                  Leave Server
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      <ChannelList 
        channels={channels}
        activeChannel={activeChannel} 
        setActiveChannel={setActiveChannel}
        onCreateChannel={onCreateChannel}
        onDeleteChannel={onDeleteChannel}
        isOwner={isOwner}
      />
      <UserPanel user={user} />

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        inviteCode={inviteCode}
        serverName={serverName}
      />

      <ServerSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        server={{ id: serverId, name: serverName, icon: serverName.slice(0, 2).toUpperCase() }}
        onUpdate={onUpdateServer}
        onDelete={onDeleteServer}
      />
    </div>
  );
}

export default Sidebar;
