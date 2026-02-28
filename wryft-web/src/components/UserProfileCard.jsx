import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardDocumentIcon, 
  ChevronRightIcon, 
  PencilIcon, 
  UserIcon, 
  FaceSmileIcon, 
  ShieldCheckIcon,
  MoonIcon,
  MinusCircleIcon,
  CircleStackIcon
} from '@heroicons/react/24/solid';
import CustomStatusModal from './CustomStatusModal';
import { api } from '../services/api';

function UserProfileCard({
    user,
    status,
    avatarUrl,
    onStatusChange,
    onEditProfile,
    onClose,
    statusOptions
}) {
    const [showStatusFlyout, setShowStatusFlyout] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
    const [customStatus, setCustomStatus] = useState(null);
    const [customStatusEmoji, setCustomStatusEmoji] = useState(null);
    const leaveTimer = useRef(null);

    // Load custom status
    useEffect(() => {
        const fetchCustomStatus = async () => {
            try {
                const profile = await api.getUserProfile(user.id);
                setCustomStatus(profile.custom_status);
                setCustomStatusEmoji(profile.custom_status_emoji);
            } catch (err) {
                console.error('Failed to fetch custom status:', err);
            }
        };
        fetchCustomStatus();
    }, [user.id]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 150);
    };

    const handleMouseEnter = () => {
        if (leaveTimer.current) {
            clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
        }
        setShowStatusFlyout(true);
    };

    const handleMouseLeave = () => {
        leaveTimer.current = setTimeout(() => {
            setShowStatusFlyout(false);
        }, 150);
    };

    useEffect(() => {
        return () => {
            if (leaveTimer.current) clearTimeout(leaveTimer.current);
        };
    }, []);

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleCopyUsername = () => {
        navigator.clipboard.writeText(`${user.username}#${user.discriminator}`);
    };

    const getStatusIcon = (statusValue, size = 16) => {
        switch (statusValue) {
            case 'online': return <div className="status-dot online" style={{ width: size, height: size }} />;
            case 'idle': return <MoonIcon className="status-icon-idle" style={{ width: size, height: size }} />;
            case 'dnd': return <MinusCircleIcon className="status-icon-dnd" style={{ width: size, height: size }} />;
            case 'focus': return <div className="status-dot focus" style={{ width: size, height: size }} />;
            case 'offline': return <CircleStackIcon className="status-icon-offline" style={{ width: size, height: size }} />;
            default: return <div className="status-dot online" style={{ width: size, height: size }} />;
        }
    };

    return (
        <div className={`profile-card-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <div className="profile-card-container" onClick={(e) => e.stopPropagation()}>
                <div className="profile-card">
                    <div className="profile-card-banner" />

                    <div className="profile-card-header">
                        <div
                            className="profile-card-avatar"
                            style={avatarUrl ? {
                                backgroundImage: `url(${avatarUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            } : {}}
                        >
                            {!avatarUrl && user.username[0].toUpperCase()}
                            <div className={`profile-card-status-crown ${status}`} />
                        </div>
                    </div>

                    <div className="profile-card-body">
                        <div className="profile-card-info">
                            <div className="profile-card-names" onClick={handleCopyUsername} title="Click to copy username">
                                <span className="profile-card-username">{user.username}</span>
                                <span className="profile-card-discriminator">#{user.discriminator}</span>
                            </div>
                            <div 
                                className="profile-card-custom-status"
                                onClick={() => setShowCustomStatusModal(true)}
                                style={{ cursor: 'pointer' }}
                            >
                                {customStatus || customStatusEmoji ? (
                                    <div className="user-custom-status">
                                        {customStatusEmoji && <span className="user-custom-status-emoji">{customStatusEmoji}</span>}
                                        {customStatus && <span>{customStatus}</span>}
                                    </div>
                                ) : (
                                    <>
                                        <FaceSmileIcon className="icon-16" />
                                        <span>Set a custom status</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="profile-card-divider" />

                        <div className="profile-card-menu">
                            <button
                                className={`profile-card-menu-item ${showStatusFlyout ? 'active' : ''}`}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => setShowStatusFlyout(!showStatusFlyout)}
                            >
                                {getStatusIcon(status, 18)}
                                <span className="flex-1 text-left">
                                    {statusOptions.find(o => o.value === status)?.label || 'Online'}
                                </span>
                                <ChevronRightIcon className="icon-16" />
                            </button>

                            <button className="profile-card-menu-item">
                                <UserIcon className="icon-20" />
                                <span className="flex-1 text-left">Switch Accounts</span>
                                <ChevronRightIcon className="icon-16" />
                            </button>

                            <button className="profile-card-menu-item" onClick={handleCopyId}>
                                <ShieldCheckIcon className="icon-20" />
                                <span className="flex-1 text-left">
                                    {copySuccess ? 'Copied ID!' : 'Copy User ID'}
                                </span>
                            </button>
                        </div>

                        <button className="profile-card-edit-btn" onClick={onEditProfile}>
                            <PencilIcon className="icon-16" />
                            Edit Profile
                        </button>
                    </div>
                </div>

                {showStatusFlyout && (
                    <div
                        className="status-flyout"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {statusOptions.map(option => (
                            <button
                                key={option.value}
                                className={`status-flyout-item ${status === option.value ? 'selected' : ''}`}
                                onClick={() => {
                                    onStatusChange(option.value);
                                    setShowStatusFlyout(false);
                                }}
                            >
                                {getStatusIcon(option.value, 18)}
                                <div className="status-option-info">
                                    <div className="status-option-label">{option.label}</div>
                                    {option.value !== 'online' && option.value !== 'focus' && (
                                        <div className="status-option-desc">
                                            {option.value === 'idle' && "You've been away"}
                                            {option.value === 'dnd' && "You won't receive notifications"}
                                            {option.value === 'offline' && "You'll appear offline"}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <CustomStatusModal
                isOpen={showCustomStatusModal}
                onClose={() => setShowCustomStatusModal(false)}
                currentStatus={customStatus}
                currentEmoji={customStatusEmoji}
                onUpdate={(newStatus, newEmoji) => {
                    setCustomStatus(newStatus);
                    setCustomStatusEmoji(newEmoji);
                }}
            />
        </div>
    );
}

export default UserProfileCard;
