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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, username, password);
      } else {
        await login(email, password);
      }
      navigate('/channels/@me');
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
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <User size={20} className="input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Your username"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Continue' : 'Log In')}
          </button>

          <div className="login-footer">
            <span>
              {isRegister ? 'Already have an account?' : 'Need an account?'}
            </span>
            <button
              type="button"
              className="toggle-auth"
              onClick={() => setIsRegister(!isRegister)}
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
