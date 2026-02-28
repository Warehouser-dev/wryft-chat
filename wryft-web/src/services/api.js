const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  async register(email, username, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data.user;
  },

  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data.user;
  },

  async getMessages(channel) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${channel}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  },

  async sendMessage(channel, text, author, authorDiscriminator, attachments = null) {
    const token = localStorage.getItem('token');
    const payload = { text, author, author_discriminator: authorDiscriminator };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch(`${API_URL}/messages/${channel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  async createGuild(name) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to create guild');
    }

    return response.json();
  },

  async getUserGuilds() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch guilds');
    }

    return response.json();
  },

  async updateGuild(guildId, name) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to update guild');
    }

    return response.json();
  },

  async deleteGuild(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete guild');
    }
  },

  async getGuildMembers(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch guild members');
    }

    return response.json();
  },

  async getGuildChannels(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }

    return response.json();
  },

  async createChannel(guildId, name, channelType = 'text', categoryId = null) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, channel_type: channelType, category_id: categoryId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create channel');
    }

    return response.json();
  },

  async deleteChannel(guildId, channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels/${channelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete channel');
    }
  },

  // Categories
  async getGuildCategories(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  },

  async createCategory(guildId, name) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to create category');
    }

    return response.json();
  },

  async updateCategory(guildId, categoryId, updates) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/categories/${categoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update category');
    }

    return response.json();
  },

  async deleteCategory(guildId, categoryId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete category');
    }
  },

  // Channel Permissions
  async getChannelPermissions(guildId, channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels/${channelId}/permissions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channel permissions');
    }

    return response.json();
  },

  async createChannelPermission(guildId, channelId, permission) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels/${channelId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(permission),
    });

    if (!response.ok) {
      throw new Error('Failed to create channel permission');
    }

    return response.json();
  },

  async updateChannelPermission(guildId, channelId, permissionId, updates) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels/${channelId}/permissions/${permissionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update channel permission');
    }

    return response.json();
  },

  async deleteChannelPermission(guildId, channelId, permissionId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels/${channelId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete channel permission');
    }
  },

  async createInvite(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create invite');
    }

    return response.json();
  },

  async getInviteInfo(code) {
    const token = localStorage.getItem('token');
    const headers = token ? {
      'Authorization': `Bearer ${token}`,
    } : {};

    const response = await fetch(`${API_URL}/invites/${code}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to get invite info');
    }

    return response.json();
  },

  async joinGuild(code) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/invites/${code}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to join guild');
    }

    return response.json();
  },

  async leaveGuild(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to leave guild');
    }
  },

  async editMessage(channel, messageId, text) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${channel}/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to edit message');
    }
  },

  async deleteMessage(channel, messageId) {
    const token = localStorage.getItem('token');
    console.log('🔍 Deleting message:', { channel, messageId });
    
    const response = await fetch(`${API_URL}/messages/${channel}/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete failed:', response.status, errorText);
      throw new Error(`Failed to delete message: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Message deleted successfully');
  },

  // DM APIs
  async getUserDMs(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DMs');
    }

    return response.json();
  },

  async getOrCreateDM(currentUserId, otherUserId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${currentUserId}/${otherUserId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get/create DM');
    }

    return response.json();
  },

  async getDMMessages(userId, dmId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${userId}/${dmId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DM messages');
    }

    return response.json();
  },

  async sendDMMessage(userId, dmId, text, attachments = null) {
    const token = localStorage.getItem('token');
    const payload = { text };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch(`${API_URL}/dms/${userId}/${dmId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to send DM');
    }

    return response.json();
  },

  async editDMMessage(userId, dmId, messageId, text) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${userId}/${dmId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to edit DM');
    }
  },

  async deleteDMMessage(userId, dmId, messageId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${userId}/${dmId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete DM');
    }
  },

  // Voice APIs
  async getGuildVoiceUsers(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/voice`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voice users');
    }

    return response.json();
  },

  async joinVoiceChannel(channelId, peerId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/voice/${channelId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ peer_id: peerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to join voice channel');
    }
  },

  async leaveVoiceChannel(channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/voice/${channelId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to leave voice channel');
    }
  },

  async heartbeatVoiceChannel(channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/voice/${channelId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to send heartbeat');
    }
  },

  logout() {
    localStorage.removeItem('token');
  },

  // User Profile APIs
  async getUserProfile(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  },

  async updateUserProfile(userId, aboutMe, avatarUrl, themeConfig = null, bannerColor = null, bannerColorSecondary = null, bannerUrl = null, pronouns = null, timezone = null) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${userId}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        about_me: aboutMe,
        avatar_url: avatarUrl,
        theme_config: themeConfig,
        banner_color: bannerColor,
        banner_color_secondary: bannerColorSecondary,
        banner_url: bannerUrl,
        pronouns: pronouns,
        timezone: timezone,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
  },

  async updateCustomStatus(userId, customStatus, customStatusEmoji) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        custom_status: customStatus,
        custom_status_emoji: customStatusEmoji,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update custom status');
    }
  },

  async updatePrivacySettings(userId, settings) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${userId}/privacy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to update privacy settings');
    }
  },

  async getMutualGuilds(currentUserId, targetUserId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${currentUserId}/mutual-guilds/${targetUserId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mutual guilds');
    }

    return response.json();
  },

  async getMutualFriends(currentUserId, targetUserId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/${currentUserId}/mutual-friends/${targetUserId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mutual friends');
    }

    return response.json();
  },

  // Public Server Discovery
  async getPublicGuilds() {
    const response = await fetch(`${API_URL}/guilds/public`);

    if (!response.ok) {
      throw new Error('Failed to fetch public guilds');
    }

    return response.json();
  },

  async updateGuildSettings(guildId, isPublic, description, bannerUrl, iconUrl) {
    const token = localStorage.getItem('token');
    const body = {};
    if (isPublic !== undefined) body.is_public = isPublic;
    if (description !== undefined) body.description = description;
    if (bannerUrl !== undefined) body.banner_url = bannerUrl;
    if (iconUrl !== undefined) body.icon_url = iconUrl;

    const response = await fetch(`${API_URL}/guilds/${guildId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to update guild settings');
    }
  },

  // Reactions APIs
  async addReaction(messageId, emoji) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      throw new Error('Failed to add reaction');
    }

    return response.json();
  },

  async removeReaction(messageId, emoji) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove reaction');
    }
  },

  async getMessageReactions(messageId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reactions');
    }

    return response.json();
  },

  async addDMReaction(messageId, emoji) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      throw new Error('Failed to add reaction');
    }

    return response.json();
  },

  async removeDMReaction(messageId, emoji) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove reaction');
    }
  },

  async getDMMessageReactions(messageId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/messages/${messageId}/reactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reactions');
    }

    return response.json();
  },

  // Presence APIs
  async updatePresence(status) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update presence');
    }

    return response.json();
  },

  async presenceHeartbeat() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/presence/heartbeat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to send presence heartbeat');
    }
  },

  async getUserPresence(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/presence/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user presence');
    }

    return response.json();
  },

  async getGuildPresence(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/presence`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch guild presence');
    }

    return response.json();
  },

  // Typing Indicators APIs
  async startTyping(channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/channels/${channelId}/typing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start typing');
    }
  },

  async stopTyping(channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/channels/${channelId}/typing`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to stop typing');
    }
  },

  async getTypingUsers(channelId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/channels/${channelId}/typing`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch typing users');
    }

    return response.json();
  },

  async startDMTyping(dmId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${dmId}/typing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start typing');
    }
  },

  async stopDMTyping(dmId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${dmId}/typing`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to stop typing');
    }
  },

  async getDMTypingUsers(dmId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${dmId}/typing`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch typing users');
    }

    return response.json();
  },

  // Roles APIs
  async getGuildRoles(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json();
  },

  async createRole(guildId, name, color, permissions, mentionable, hoist) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, color, permissions, mentionable, hoist }),
    });

    if (!response.ok) {
      throw new Error('Failed to create role');
    }

    return response.json();
  },

  async updateRole(guildId, roleId, updates) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update role');
    }

    return response.json();
  },

  async deleteRole(guildId, roleId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete role');
    }
  },

  async assignRole(guildId, roleId, userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles/${roleId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign role');
    }
  },

  async removeRole(guildId, roleId, userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/roles/${roleId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove role');
    }
  },

  async getUserRoles(guildId, userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/members/${userId}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user roles');
    }

    return response.json();
  },

  // Audit Logs APIs
  async getGuildAuditLogs(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/audit-logs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch audit logs');
    }

    return response.json();
  },

  // Custom Emoji APIs
  async getGuildEmoji(guildId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/emoji`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch custom emoji');
    }

    return response.json();
  },

  async createEmoji(guildId, userId, name, imageUrl) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/emoji`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        image_url: imageUrl,
        created_by: userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create emoji');
    }

    return response.json();
  },

  async deleteEmoji(guildId, emojiId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/emoji/${emojiId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete emoji');
    }
  },

  // Friends APIs
  async getFriends() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch friends');
    }

    return response.json();
  },

  async sendFriendRequest(username, discriminator) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username, discriminator }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to send friend request');
    }

    return response.json();
  },

  async getPendingRequests() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/requests/pending`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending requests');
    }

    return response.json();
  },

  async getOutgoingRequests() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/requests/outgoing`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch outgoing requests');
    }

    return response.json();
  },

  async acceptFriendRequest(friendshipId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/requests/${friendshipId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to accept friend request');
    }
  },

  async declineFriendRequest(friendshipId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/requests/${friendshipId}/decline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to decline friend request');
    }
  },

  async removeFriend(friendUserId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/${friendUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove friend');
    }
  },

  async blockUser(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/block/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }
  },

  async unblockUser(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/block/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }
  },

  async getBlockedUsers() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/friends/blocked`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }

    return response.json();
  },

  // Bulk presence API (OPTIMIZED)
  async getBulkPresence(userIds) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/presence/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_ids: userIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bulk presence');
    }

    return response.json();
  },

  // Personal Notes
  async getPersonalNotes(userId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notes/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }

    return response.json();
  },

  async createPersonalNote(userId, text, attachments = []) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId, text, attachments }),
    });

    if (!response.ok) {
      throw new Error('Failed to create note');
    }

    return response.json();
  },

  async updatePersonalNote(noteId, text) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to update note');
    }

    return response.json();
  },

  async deletePersonalNote(noteId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete note');
    }

    return response.json();
  }
};
