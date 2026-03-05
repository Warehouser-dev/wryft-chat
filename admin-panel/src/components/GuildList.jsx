import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { adminAPI } from '../utils/api';

export default function GuildList() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadGuilds();
  }, [page]);

  const loadGuilds = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getGuilds(page);
      setGuilds(data);
    } catch (err) {
      console.error('Failed to load guilds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guildId, guildName) => {
    const reason = prompt(`Delete "${guildName}"? Enter reason:`);
    if (!reason) return;

    if (!confirm(`Are you SURE you want to delete "${guildName}"? This cannot be undone!`)) return;

    try {
      await adminAPI.deleteGuild(guildId, reason);
      loadGuilds();
      alert('Guild deleted successfully');
    } catch (err) {
      alert('Failed to delete guild');
    }
  };

  if (loading) return <div className="loading">Loading guilds...</div>;

  return (
    <div className="guild-list">
      <div className="page-header">
        <h1>Guild Management</h1>
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={guilds.length < 50}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner ID</th>
            <th>Members</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {guilds.map(guild => (
            <tr key={guild.id}>
              <td><strong>{guild.name}</strong></td>
              <td><code>{guild.owner_id.slice(0, 8)}...</code></td>
              <td>{guild.member_count}</td>
              <td>{new Date(guild.created_at).toLocaleDateString()}</td>
              <td className="actions">
                <button 
                  onClick={() => handleDelete(guild.id, guild.name)} 
                  className="btn-delete"
                >
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
