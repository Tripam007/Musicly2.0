import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCheck, 
  Trash2, 
  Music2, 
  Image as ImageIcon, 
  Palette, 
  Play,
  Check
} from 'lucide-react';
import { 
  getStudioNotifications, 
  markAllStudioNotificationsAsRead, 
  markStudioNotificationAsRead, 
  removeStudioNotification, 
  clearAllStudioNotifications 
} from '../utils/studioNotificationsDB';
import { STUDIO_THEMES } from '../data/studioThemes';

export default function StudioNotificationsDropdown({
  isOpen,
  onClose,
  currentTheme,
  onSelectSong,
  onSelectBackground,
  onSelectTheme,
  showToast
}) {
  const [notifications, setNotifications] = useState(() => getStudioNotifications());
  const dropdownRef = useRef(null);

  // Sync notifications on custom events
  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStudioNotifications());
    };
    window.addEventListener('musicly:studio-notification-change', handleUpdate);
    return () => window.removeEventListener('musicly:studio-notification-change', handleUpdate);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getStudioNotifications());
    }
  }, [isOpen]);

  // Handle outside clicks and Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (e.target.closest('.ref-stat-bell')) return;
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatShortTime = (ms) => {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleMarkAllRead = () => {
    markAllStudioNotificationsAsRead();
    showToast?.('All marked as read');
  };

  const handleClearAll = () => {
    clearAllStudioNotifications();
    setNotifications([]);
    showToast?.('Notifications cleared');
  };

  const handleDismiss = (e, notifId) => {
    e.stopPropagation();
    removeStudioNotification(notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const handleAction = (e, notif) => {
    e.stopPropagation();
    if (!notif.read) markStudioNotificationAsRead(notif.id);

    if (notif.type === 'theme' && notif.meta?.themeId && onSelectTheme) {
      const found = STUDIO_THEMES.find(t => t.id === notif.meta.themeId);
      if (found) {
        onSelectTheme(found);
        showToast?.(`Atmosphere: ${found.name}`);
      }
    } else if (notif.type === 'background' && onSelectBackground && notif.meta?.imageUrl) {
      onSelectBackground(notif.meta.imageUrl);
      showToast?.('Applied wallpaper');
    } else if (notif.type === 'song' && onSelectSong && notif.meta?.songTitle) {
      onSelectSong(notif.meta.songTitle);
      showToast?.(`Playing: ${notif.meta.songTitle}`);
    }
  };

  const handleCardClick = (notif) => {
    if (!notif.read) {
      markStudioNotificationAsRead(notif.id);
    }
  };

  return (
    <div 
      className="apple-glass-notif-box" 
      ref={dropdownRef}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Specular Apple Glass Header */}
      <header className="apple-glass-header">
        <div className="apple-glass-title-wrap">
          <span className="apple-glass-title">Updates</span>
          {unreadCount > 0 && (
            <span className="apple-glass-count-pill">{unreadCount}</span>
          )}
        </div>

        <div className="apple-glass-actions">
          {unreadCount > 0 && (
            <button 
              type="button" 
              className="apple-glass-icon-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              type="button" 
              className="apple-glass-icon-btn"
              onClick={handleClearAll}
              title="Clear all"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button 
            type="button" 
            className="apple-glass-icon-btn close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Clean Glass Notification Cards */}
      <div className="apple-glass-list">
        {notifications.length === 0 ? (
          <div className="apple-glass-empty">
            <span className="apple-glass-empty-text">No New Updates</span>
          </div>
        ) : (
          notifications.map((notif) => {
            const isSong = notif.type === 'song';
            const isBg = notif.type === 'background';
            const isTheme = notif.type === 'theme';

            return (
              <div 
                key={notif.id}
                className={`apple-glass-item ${!notif.read ? 'is-unread' : ''}`}
                onClick={() => handleCardClick(notif)}
              >
                {/* Visual Icon / Thumbnail */}
                <div className="apple-glass-item-icon">
                  {isBg && notif.meta?.imageUrl ? (
                    <img 
                      src={notif.meta.imageUrl} 
                      alt="" 
                      className="apple-glass-thumb" 
                    />
                  ) : isSong ? (
                    <div className="apple-glass-symbol-bubble symbol-music">
                      <Music2 size={14} />
                    </div>
                  ) : (
                    <div className="apple-glass-symbol-bubble symbol-palette">
                      <Palette size={14} />
                    </div>
                  )}
                </div>

                {/* Info Text */}
                <div className="apple-glass-item-content">
                  <div className="apple-glass-item-top">
                    <span className="apple-glass-item-title">{notif.title}</span>
                    <div className="apple-glass-item-meta">
                      <span className="apple-glass-item-time">{formatShortTime(notif.timestamp)}</span>
                      {!notif.read && <span className="apple-glass-unread-dot" />}
                    </div>
                  </div>

                  <div className="apple-glass-item-bottom">
                    <span className="apple-glass-item-desc">{notif.message}</span>

                    {/* Minimal Swatches for Theme */}
                    {isTheme && notif.meta?.swatches && (
                      <div className="apple-glass-swatches">
                        {notif.meta.swatches.slice(0, 6).map((hex, i) => (
                          <span 
                            key={hex + i} 
                            className="apple-glass-swatch-pip" 
                            style={{ backgroundColor: hex }} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Quick 1-Click Action Pill */}
                    <button 
                      type="button"
                      className="apple-glass-action-pill"
                      onClick={(e) => handleAction(e, notif)}
                      title={isSong ? "Play Song" : isBg ? "Apply Wallpaper" : "Apply Theme"}
                    >
                      {isSong ? <><Play size={10} fill="currentColor" /> Play</> : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* Dismiss X */}
                <button
                  type="button"
                  className="apple-glass-item-dismiss"
                  onClick={(e) => handleDismiss(e, notif.id)}
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
