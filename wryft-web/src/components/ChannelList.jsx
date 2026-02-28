import { Hash, Plus, Trash, SpeakerHigh, CaretDown, CaretRight, DotsThree, Lock } from 'phosphor-react';
import { useState, useEffect } from 'react';
import { config } from '../config';
import { api } from '../services/api';
import CreateChannelModal from './CreateChannelModal';
import ChannelPermissionsModal from './ChannelPermissionsModal';

function ChannelList({ serverId, channels, activeChannel, setActiveChannel, onCreateChannel, onDeleteChannel, onVoiceChannelJoin, isOwner, voiceChannelUsers = {}, roles = [] }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('text');
  const [modalCategoryId, setModalCategoryId] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    if (serverId) {
      loadCategories();
    }
  }, [serverId]);

  const loadCategories = async () => {
    try {
      const cats = await api.getGuildCategories(serverId);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCreateCategory = async (name) => {
    try {
      const newCat = await api.createCategory(serverId, name);
      setCategories([...categories, newCat]);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const handleCreateChannelFromModal = (name, type, categoryId) => {
    onCreateChannel(name, type, categoryId);
  };

  const openCreateModal = (type, categoryId = null) => {
    setModalType(type);
    setModalCategoryId(categoryId);
    setShowModal(true);
    setContextMenu(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Delete this category? Channels will be moved to uncategorized.')) return;
    
    try {
      await api.deleteCategory(serverId, categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const textChannels = channels.filter(c => c.channel_type === 'text' || !c.channel_type);
  const voiceChannels = channels.filter(c => c.channel_type === 'voice');

  const handleVoiceClick = (channel) => {
    if (!config.features.voiceChat) {
      alert('Voice chat is disabled. Set VITE_ENABLE_VOICE=true to enable it.');
      return;
    }
    onVoiceChannelJoin(channel.id, channel.name);
  };

  const handleContextMenu = (e, type, categoryId = null) => {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      categoryId,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const renderChannels = (channelList, categoryId = null) => {
    return channelList
      .filter(ch => {
        // For uncategorized channels, check if category_id is null or undefined
        if (categoryId === null) {
          return ch.category_id === null || ch.category_id === undefined;
        }
        return ch.category_id === categoryId;
      })
      .map(channel => {
        if (channel.channel_type === 'voice') {
          const usersInChannel = voiceChannelUsers[channel.id] || [];
          return (
            <div key={channel.id} className="voice-channel-container">
              <div
                className="channel"
                onClick={() => handleVoiceClick(channel)}
                onContextMenu={(e) => {
                  if (!isOwner) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    type: 'channel',
                    channelId: channel.id,
                    channelName: channel.name,
                  });
                }}
              >
                <SpeakerHigh size={20} className="channel-icon" weight="fill" />
                <span>{channel.name}</span>
                {isOwner && (
                  <button
                    className="channel-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChannel(channel.id);
                    }}
                    title="Delete Channel"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                )}
              </div>
              {usersInChannel.length > 0 && (
                <div className="voice-channel-users">
                  {usersInChannel.map(user => (
                    <div key={user.id} className="voice-channel-user">
                      <div className="voice-user-avatar">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="voice-user-name">{user.username}</span>
                      <SpeakerHigh size={14} className="voice-user-icon" weight="fill" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div
              key={channel.id}
              className={`channel ${activeChannel === channel.name ? 'active' : ''}`}
              onClick={() => setActiveChannel(channel.name)}
              onContextMenu={(e) => {
                if (!isOwner) return;
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  type: 'channel',
                  channelId: channel.id,
                  channelName: channel.name,
                });
              }}
            >
              <Hash size={20} className="channel-icon" />
              <span>{channel.name}</span>
              {isOwner && (
                <button
                  className="channel-delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChannel(channel.id);
                  }}
                  title="Delete Channel"
                >
                  <Trash size={14} weight="bold" />
                </button>
              )}
            </div>
          );
        }
      });
  };

  return (
    <div 
      className="channel-list" 
      data-context-menu="true"
      onContextMenu={(e) => {
        if (!isOwner) return;
        // Check if we're clicking on empty space (not on a channel or button)
        const target = e.target;
        const isEmptySpace = 
          target.classList.contains('channel-list') ||
          target.classList.contains('channel-category') ||
          (target.tagName === 'SPAN' && target.parentElement.classList.contains('channel-category'));
        
        if (isEmptySpace) {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: 'text',
          });
        }
      }}
    >
      {/* Uncategorized Text Channels - no header, just channels */}
      {renderChannels(textChannels, null)}

      {/* Categories */}
      {categories.map(category => {
        const isCollapsed = collapsedCategories[category.id];
        const categoryChannels = [...textChannels, ...voiceChannels].filter(ch => ch.category_id === category.id);
        
        return (
          <div key={category.id}>
            <div 
              className="channel-category"
              onContextMenu={(e) => handleContextMenu(e, 'category', category.id)}
              data-context-menu="true"
            >
              <div className="category-header" onClick={() => toggleCategory(category.id)}>
                {isCollapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
                <span>{category.name.toUpperCase()}</span>
              </div>
              {isOwner && (
                <div className="category-actions">
                  <button 
                    className="channel-add-button"
                    onClick={() => openCreateModal('text', category.id)}
                    title="Create Channel"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="channel-add-button"
                    onClick={(e) => handleContextMenu(e, 'category', category.id)}
                    title="Category Options"
                  >
                    <DotsThree size={16} weight="bold" />
                  </button>
                </div>
              )}
            </div>

            {!isCollapsed && renderChannels([...textChannels, ...voiceChannels], category.id)}
          </div>
        );
      })}

      {/* Uncategorized Voice Channels - no header, just channels */}
      {renderChannels(voiceChannels, null)}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="channel-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {contextMenu.type === 'category' && contextMenu.categoryId && (
            <>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('text', contextMenu.categoryId)}
              >
                <Hash size={16} />
                Create Text Channel
              </button>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('voice', contextMenu.categoryId)}
              >
                <SpeakerHigh size={16} weight="bold" />
                Create Voice Channel
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  handleDeleteCategory(contextMenu.categoryId);
                  setContextMenu(null);
                }}
              >
                <Trash size={16} />
                Delete Category
              </button>
            </>
          )}
          {contextMenu.type === 'text' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('text', null)}
              >
                <Hash size={16} />
                Create Text Channel
              </button>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('voice', null)}
              >
                <SpeakerHigh size={16} weight="bold" />
                Create Voice Channel
              </button>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('category', null)}
              >
                <Plus size={16} />
                Create Category
              </button>
            </>
          )}
          {contextMenu.type === 'voice' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('text', null)}
              >
                <Hash size={16} />
                Create Text Channel
              </button>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('voice', null)}
              >
                <SpeakerHigh size={16} weight="bold" />
                Create Voice Channel
              </button>
              <button
                className="context-menu-item"
                onClick={() => openCreateModal('category', null)}
              >
                <Plus size={16} />
                Create Category
              </button>
            </>
          )}
          {contextMenu.type === 'channel' && contextMenu.channelId && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  const channel = channels.find(c => c.id === contextMenu.channelId);
                  setSelectedChannel(channel);
                  setShowPermissionsModal(true);
                  setContextMenu(null);
                }}
              >
                <Lock size={16} />
                Permissions
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  onDeleteChannel(contextMenu.channelId);
                  setContextMenu(null);
                }}
              >
                <Trash size={16} />
                Delete Channel
              </button>
            </>
          )}
        </div>
      )}
      
      <CreateChannelModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreateChannel={handleCreateChannelFromModal}
        onCreateCategory={handleCreateCategory}
        type={modalType}
        categoryId={modalCategoryId}
      />
      
      <ChannelPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedChannel(null);
        }}
        guildId={serverId}
        channelId={selectedChannel?.id}
        channelName={selectedChannel?.name}
        roles={roles}
      />
    </div>
  );
}

export default ChannelList;
