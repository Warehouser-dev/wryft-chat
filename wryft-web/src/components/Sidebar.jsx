import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, CaretDown, SignOut, Gear } from 'phosphor-react';
import ChannelList from './ChannelList';
import UserPanel from './UserPanel';
import InviteModal from './InviteModal';
import ServerSettings from './ServerSettings';

function Sidebar({ 
  server,
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
  onVoiceChannelJoin,
  voiceChannelUsers,
  isOwner, 
  user,
  roles = []
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
      {server?.banner_url && (
        <div 
          className="server-header-banner" 
          style={{ backgroundImage: `url(${server.banner_url})` }}
        />
      )}
      <div className="server-name-header" ref={dropdownRef}>
        <div 
          className="server-name-clickable" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="server-name">{serverName}</span>
          <CaretDown size={18} className={`server-dropdown-icon ${showDropdown ? 'open' : ''}`} weight="bold" />
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
                  <Gear size={16} weight="bold" />
                  Guild Settings
                </button>
              </>
            )}
            {!isOwner && (
              <>
                <div className="server-dropdown-divider" />
                <button className="server-dropdown-item danger" onClick={handleLeave}>
                  <SignOut size={16} weight="bold" />
                  Leave Server
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      <ChannelList 
        serverId={serverId}
        channels={channels}
        activeChannel={activeChannel} 
        setActiveChannel={setActiveChannel}
        onCreateChannel={onCreateChannel}
        onDeleteChannel={onDeleteChannel}
        onVoiceChannelJoin={onVoiceChannelJoin}
        voiceChannelUsers={voiceChannelUsers}
        isOwner={isOwner}
        roles={roles}
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
        server={server || { id: serverId, name: serverName, icon: serverName.slice(0, 2).toUpperCase() }}
        onUpdate={onUpdateServer}
        onDelete={onDeleteServer}
      />
    </div>
  );
}

export default Sidebar;
