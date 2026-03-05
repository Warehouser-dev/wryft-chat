import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Trash, 
  PencilSimple, 
  Plus, 
  UserPlus, 
  UserMinus,
  ChatCircle,
  Hash,
  Folder,
  Shield
} from 'phosphor-react';

function AuditLog({ server }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [server?.id]);

  const loadAuditLogs = async () => {
    if (!server?.id) return;
    
    try {
      setLoading(true);
      console.log('Loading audit logs for guild:', server.id);
      const data = await api.getGuildAuditLogs(server.id);
      console.log('Audit logs loaded:', data);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'message_delete':
        return <Trash size={16} />;
      case 'message_edit':
        return <PencilSimple size={16} />;
      case 'channel_create':
        return <Plus size={16} />;
      case 'channel_delete':
        return <Trash size={16} />;
      case 'channel_update':
        return <PencilSimple size={16} />;
      case 'category_create':
        return <Folder size={16} />;
      case 'category_delete':
        return <Trash size={16} />;
      case 'member_join':
        return <UserPlus size={16} />;
      case 'member_leave':
        return <UserMinus size={16} />;
      case 'role_create':
        return <Shield size={16} />;
      case 'role_update':
        return <Shield size={16} />;
      case 'role_delete':
        return <Shield size={16} />;
      default:
        return <ChatCircle size={16} />;
    }
  };

  const getActionText = (log) => {
    const username = log.username || 'Unknown User';
    
    switch (log.action_type) {
      case 'message_delete':
        return `${username} deleted a message`;
      case 'message_edit':
        return `${username} edited a message`;
      case 'channel_create':
        return `${username} created channel`;
      case 'channel_delete':
        return `${username} deleted channel`;
      case 'channel_update':
        return `${username} updated channel`;
      case 'category_create':
        return `${username} created category`;
      case 'category_delete':
        return `${username} deleted category`;
      case 'member_join':
        return `${username} joined the server`;
      case 'member_leave':
        return `${username} left the server`;
      case 'role_create':
        return `${username} created role`;
      case 'role_update':
        return `${username} updated role`;
      case 'role_delete':
        return `${username} deleted role`;
      default:
        return `${username} performed ${log.action_type}`;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Show full date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getDetailText = (log) => {
    if (!log.details) return null;
    
    const details = log.details;
    
    if (details.channel_name) {
      return `#${details.channel_name}`;
    }
    
    if (details.category_name) {
      return details.category_name;
    }
    
    if (details.role_name) {
      return details.role_name;
    }
    
    if (details.message_content) {
      return details.message_content.substring(0, 50) + (details.message_content.length > 50 ? '...' : '');
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="audit-log-container">
        <h2>Audit Log</h2>
        <div className="audit-log-loading">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="audit-log-container">
      <h2>Audit Log</h2>
      <p className="audit-log-description">
        View recent actions performed in this server. Logs are kept for the last 100 actions.
      </p>
      
      {logs.length === 0 ? (
        <div className="audit-log-empty">
          <ChatCircle size={48} weight="thin" />
          <p>No audit logs yet</p>
          <span>Actions performed in this server will appear here</span>
        </div>
      ) : (
        <div className="audit-log-list">
          {logs.map((log) => (
            <div key={log.id} className="audit-log-entry">
              <div className="audit-log-icon">
                {getActionIcon(log.action_type)}
              </div>
              <div className="audit-log-content">
                <div className="audit-log-action">
                  {getActionText(log)}
                </div>
                {getDetailText(log) && (
                  <div className="audit-log-detail">
                    {getDetailText(log)}
                  </div>
                )}
                <div className="audit-log-timestamp">
                  {formatTimestamp(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditLog;
