import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Castle, LogOut, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UserList from './components/UserList';
import GuildList from './components/GuildList';
import Login from './components/Login';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('admin_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="admin-panel">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>
            <Shield size={24} />
            Wryft Admin
          </h1>
        </div>
        <ul className="nav-menu">
          <li className={currentPage === 'dashboard' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('dashboard')}>
              <LayoutDashboard size={20} /> Dashboard
            </button>
          </li>
          <li className={currentPage === 'users' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('users')}>
              <Users size={20} /> Users
            </button>
          </li>
          <li className={currentPage === 'guilds' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('guilds')}>
              <Castle size={20} /> Guilds
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </nav>

      <main className="content">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'users' && <UserList />}
        {currentPage === 'guilds' && <GuildList />}
      </main>
    </div>
  );
}

export default App;
