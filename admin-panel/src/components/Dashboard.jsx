import { useState, useEffect } from 'react';
import { Users, Castle, MessageSquare, Circle, Ban } from 'lucide-react';
import { adminAPI } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.total_users.toLocaleString()}</p>
            <span className="stat-sub">+{stats.new_users_week} this week</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Castle size={32} />
          </div>
          <div className="stat-content">
            <h3>Total Guilds</h3>
            <p className="stat-number">{stats.total_guilds.toLocaleString()}</p>
            <span className="stat-sub">+{stats.new_guilds_week} this week</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <MessageSquare size={32} />
          </div>
          <div className="stat-content">
            <h3>Total Messages</h3>
            <p className="stat-number">{stats.total_messages.toLocaleString()}</p>
            <span className="stat-sub">{stats.messages_today} today</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Circle size={32} fill="currentColor" />
          </div>
          <div className="stat-content">
            <h3>Users Online</h3>
            <p className="stat-number">{stats.users_online.toLocaleString()}</p>
            <span className="stat-sub">Active now</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Ban size={32} />
          </div>
          <div className="stat-content">
            <h3>Banned Users</h3>
            <p className="stat-number">{stats.total_banned.toLocaleString()}</p>
            <span className="stat-sub">Total bans</span>
          </div>
        </div>
      </div>
    </div>
  );
}
