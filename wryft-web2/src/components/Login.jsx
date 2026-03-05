import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnvelopeSimple, Lock, User } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (username) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 32) {
      return 'Username must be less than 32 characters';
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, dots, underscores, and hyphens';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Validate username
        const usernameError = validateUsername(username);
        if (usernameError) {
          setError(usernameError);
          setLoading(false);
          return;
        }

        // Register with username
        await register(email, username, password);
        navigate('/channels/@me');
      } else {
        await login(email, password);
        navigate('/channels/@me');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">
          {isRegister ? 'Join Wryft' : 'Welcome to Wryft'}
        </h1>
        <p className="login-subtitle">
          {isRegister ? 'We\'re so excited to see you!' : 'We\'re so excited to see you again!'}
        </p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <EnvelopeSimple size={20} className="input-icon" weight="bold" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <User size={20} className="input-icon" weight="bold" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                  maxLength={32}
                />
              </div>
              <p className="input-hint">
                3-32 characters, letters, numbers, dots, underscores, and hyphens only
              </p>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" weight="bold" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Create Account' : 'Log In')}
          </button>

          <div className="login-footer">
            <span>
              {isRegister ? 'Already have an account?' : 'Need an account?'}
            </span>
            <button
              type="button"
              className="toggle-auth"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setUsername('');
              }}
            >
              {isRegister ? 'Log In' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
