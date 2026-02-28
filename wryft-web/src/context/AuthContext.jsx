import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has a token on mount
    const token = localStorage.getItem('token');
    if (token) {
      // In production, validate token with backend
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const userData = await api.login(email, password);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (email, username, password) => {
    const userData = await api.register(email, username, password);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    // Set status to offline before logging out
    try {
      await api.updatePresence('offline');
    } catch (err) {
      console.error('Failed to set offline on logout:', err);
    }
    
    api.logout();
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
