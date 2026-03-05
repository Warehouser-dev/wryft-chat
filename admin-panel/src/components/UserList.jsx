import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Shield, UserX, Trash2 } from 'lucide-react';
import { adminAPI } from '../utils/api';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getUsers(page);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId) => {
    const reason = prompt('Ban reason:');
    if (!reason) return;

    const days = prompt('Duration in days (leave empty for permanent):');
    const durationDays = days ? parseInt(days) : null;

    try {
      await adminAPI.banUser(userId, reason, durationDays);
      loadUsers();
      alert('User banned successfully');
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (userId) => {
    if (!confirm('Unban this user?')) return;

    try {
      await adminAPI.unbanUser(userId);
      loadUsers();
      alert('User unbanned successfully');
    } catch (err) {
      alert('Failed to unban user');
    }
  };

  const handleDelete = async (userId) => {
    const reason = prompt('Delete reason (this is permanent!):');
    if (!reason) return;

    if (!confirm('Are you SURE? This cannot be undone!')) return;

    try {
      await adminAPI.deleteUser(userId, reason);
      loadUsers();
      alert('User deleted successfully');
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-list">
      <div className="page-header">
        <h1>User Management</h1>
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Created</th>
            <th>Status</th>
            <th>Admin Level</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className={user.is_banned ? 'banned' : ''}>
              <td>
                {user.username}
                {user.is_premium && <span className="badge premium"><Star size={14} /> Premium</span>}
              </td>
              <td>{user.email}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                {user.is_banned ? (
                  <span className="status banned">Banned</span>
                ) : (
                  <span className="status active">Active</span>
                )}
              </td>
              <td>
                {user.admin_level > 0 ? (
                  <span className="badge admin"><Shield size={14} /> Level {user.admin_level}</span>
                ) : (
                  'User'
                )}
              </td>
              <td className="actions">
                {!user.is_banned ? (
                  <button onClick={() => handleBan(user.id)} className="btn-ban">
                    <UserX size={16} /> Ban
                  </button>
                ) : (
                  <button onClick={() => handleUnban(user.id)} className="btn-unban">
                    <UserX size={16} /> Unban
                  </button>
                )}
                <button onClick={() => handleDelete(user.id)} className="btn-delete">
                  <Trash2 size={16} /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
