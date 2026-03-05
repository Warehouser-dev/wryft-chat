import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'phosphor-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function UsernameSetup() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If no user in context, check localStorage
    if (!currentUser) {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        // No user found, redirect to login
        navigate('/login');
      }
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate username (3-32 chars, alphanumeric + ._-)
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (username.length > 32) {
      setError('Username must be less than 32 characters');
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, dots, underscores, and hyphens');
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user || !user.id) {
        setError('User session not found. Please log in again.');
        setLoading(false);
        navigate('/login');
        return;
      }
      
      // Update username via API
      const response = await api.updateUsername(user.id, username);
      
      if (!response.success) {
        setError(response.error || 'Failed to set username');
        setLoading(false);
        return;
      }
      
      // Update local storage with new username
      user.username = response.username;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Force page reload to update AuthContext
      window.location.href = '/channels/@me';
    } catch (err) {
      setError(err.message || 'Failed to set username');
      setLoading(false);
    }
  };

  return (
    <div className="username-setup-container">
      <div className="username-setup-box">
        <div className="username-setup-header">
          <h1 className="username-setup-title">Choose your username</h1>
          <p className="username-setup-subtitle">
            This is how others will see you on Wryft. You can always change it later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="username-setup-form">
          <div className="username-setup-input-group">
            <label>USERNAME</label>
            <div className="username-input-wrapper">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                required
                maxLength={32}
              />
              <div className="username-char-count">
                {username.length}/32
              </div>
            </div>
            <p className="username-hint">
              Letters, numbers, dots, underscores, and hyphens only
            </p>
          </div>

          {error && <div className="username-error">{error}</div>}

          <button 
            type="submit" 
            className="username-submit-button" 
            disabled={loading || !username}
          >
            {loading ? 'Setting up...' : 'Continue'}
            {!loading && <ArrowRight size={20} weight="bold" />}
          </button>
        </form>

        <div className="username-setup-footer">
          <p>Your username must be unique across Wryft</p>
        </div>
      </div>
    </div>
  );
}

export default UsernameSetup;
