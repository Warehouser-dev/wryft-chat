import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Users } from 'lucide-react';

function JoinInvite() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);

  useEffect(() => {
    const fetchInviteInfo = async () => {
      try {
        const info = await api.getInviteInfo(code);
        setInviteInfo(info);
        setLoading(false);
      } catch (err) {
        setError('Invalid or expired invite link');
        setLoading(false);
      }
    };

    fetchInviteInfo();
  }, [code]);

  const handleAccept = async () => {
    setJoining(true);
    try {
      const guild = await api.joinGuild(code);
      navigate(`/channels/${guild.id}/general`);
    } catch (err) {
      setError('Failed to join server');
      setJoining(false);
    }
  };

  const handleGoToServer = () => {
    navigate(`/channels/${inviteInfo.guild_id}/general`);
  };

  if (loading) {
    return (
      <div className="join-invite-container">
        <div className="join-invite-content">
          <Loader2 size={48} className="spinner" />
          <h2>Loading invite...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="join-invite-container">
        <div className="join-invite-content">
          <div className="invite-error-icon">!</div>
          <h2>Invite Invalid</h2>
          <p>{error}</p>
          <button 
            className="join-invite-button"
            onClick={() => navigate('/channels/@me')}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-invite-container">
      <div className="join-invite-card">
        <div className="invite-server-icon">
          {inviteInfo.guild_icon}
        </div>
        <h1 className="invite-server-name">{inviteInfo.guild_name}</h1>
        <div className="invite-member-count">
          <Users size={16} />
          <span>{inviteInfo.member_count} members</span>
        </div>
        
        {inviteInfo.is_member ? (
          <>
            <div className="invite-already-member">
              You're already a member of this server
            </div>
            <button 
              className="accept-invite-button"
              onClick={handleGoToServer}
            >
              Go to Server
            </button>
          </>
        ) : (
          <button 
            className="accept-invite-button"
            onClick={handleAccept}
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 size={18} className="spinner" />
                Joining...
              </>
            ) : (
              'Accept Invite'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default JoinInvite;
