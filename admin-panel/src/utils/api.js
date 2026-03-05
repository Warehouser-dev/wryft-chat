const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export const adminAPI = {
  // Auth
  login: (email, password) => 
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Dashboard
  getStats: () => apiCall('/admin/stats'),

  // Users
  getUsers: (page = 1, limit = 50) => 
    apiCall(`/admin/users?page=${page}&limit=${limit}`),
  
  banUser: (userId, reason, durationDays = null) =>
    apiCall(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, duration_days: durationDays }),
    }),
  
  unbanUser: (userId) =>
    apiCall(`/admin/users/${userId}/unban`, {
      method: 'POST',
    }),
  
  deleteUser: (userId, reason) =>
    apiCall(`/admin/users/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  // Guilds
  getGuilds: (page = 1, limit = 50) =>
    apiCall(`/admin/guilds?page=${page}&limit=${limit}`),
  
  deleteGuild: (guildId, reason) =>
    apiCall(`/admin/guilds/${guildId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
};
