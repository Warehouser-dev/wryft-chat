const API_URL = 'http://localhost:3001/api';

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

  async sendMessage(channel, text, author, authorDiscriminator) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/messages/${channel}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text, author, author_discriminator: authorDiscriminator }),
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

  async createChannel(guildId, name) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
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
    const response = await fetch(`${API_URL}/messages/${channel}/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
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

  async sendDMMessage(userId, dmId, text) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/dms/${userId}/${dmId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
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

  logout() {
    localStorage.removeItem('token');
  },
};
