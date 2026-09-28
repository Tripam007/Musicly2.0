import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Users, 
  Sparkles, 
  Sliders, 
  Moon, 
  Upload, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Image as ImageIcon,
  Crown,
  Keyboard,
  Hand,
  Mic
} from 'lucide-react';
import { GENRES, getAvailableGenres } from '../data/tracks';
import { VoiceControlUI } from '../voice/VoiceControlUI';

export default function TopBar({
  selectedGenre,
  onSelectGenre,
  onOpenAmbient,
  activeAmbientCount,
  onOpenSceneModal,
  onOpenAuthModal,
  onOpenUploadModal,
  onOpenCoffeeModal,
  onOpenShortcutsModal,
  isAirControlsActive = false,
  onOpenAirControls,
  user,
  isAdmin = false,
  onOpenAdminDashboard,
  onLogout,
  selectedLanguage,
  voiceManager
}) {
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [listeners, setListeners] = useState(1);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileDropdownRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showProfileMenu]);

  // Digital clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated live listeners variance
  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(prev => Math.max(1, Math.min(28, prev + (Math.random() > 0.6 ? 1 : Math.random() > 0.4 ? -1 : 0))));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    return time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: !is24Hour 
    });
  };

  return (
    <header className="top-bar-container">
      {/* Left side: Live indicator & Clock & Air Controls */}
      <div className="top-left-section">
        <div className="tuned-in-wrapper">
          {/* Live tuned-in badge */}
          <div className="tuned-in-badge" title="Live active listeners tuned into this room">
            <span className="live-dot pulse-glow"></span>
            <span className="listeners-text"><strong>{listeners}</strong> in tuned</span>
          </div>

          {/* Quick AI Controls (Air Gestures & Voice Control) side-by-side below tuned-in */}
          <div className="side-quick-controls">
            <button 
              id="btn-air-controls"
              className={`air-btn-below-tuned ${isAirControlsActive ? 'highlight-active active' : ''}`} 
              onClick={onOpenAirControls}
              title={isAirControlsActive ? "Air Controls Active (Webcam AI Running) — Click for settings" : "Air Controls — Control playback with webcam hand gestures"}
              aria-label="Air Controls"
            >
              <Hand size={17} />
              <span className={`air-hand-dot ${isAirControlsActive ? 'active' : ''}`} />
            </button>

            {voiceManager && (
              <VoiceControlUI voiceManager={voiceManager} />
            )}
          </div>
        </div>

        {/* Digital Clock */}
        <button 
          className="clock-badge" 
          onClick={() => setIs24Hour(!is24Hour)} 
          title="Click to toggle 12h/24h format"
        >
          <Clock size={15} className="clock-icon" />
          <span>{formatTime()}</span>
        </button>
      </div>

      {/* Center: Genre / Mood pills */}
      <nav className={`genre-pills-nav ${isAdmin ? 'admin-layout' : ''}`} aria-label="Genre Selection">
        {getAvailableGenres(selectedLanguage).map((genre) => {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              id={`genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
              className={`genre-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectGenre(genre)}
            >
              {isActive && <span className="pill-dot" />}
              {genre}
            </button>
          );
        })}
      </nav>

      {/* Right side: Action controls */}
      <div className="top-right-section">
        {/* Scene / Backdrop Changer (Only visible when 'All' is selected) */}
        {selectedGenre === 'All' && (
          <button 
            id="btn-scene-selector"
            className="glass-action-btn scene-btn-animate" 
            onClick={onOpenSceneModal}
            title="Change room scene wallpaper & lighting"
          >
            <ImageIcon size={17} />
            <span className="btn-label">Scene</span>
          </button>
        )}

        {/* Ambient Sounds Mixer */}
        <button 
          id="btn-ambient-mixer"
          className={`glass-action-btn ${activeAmbientCount > 0 ? 'highlight-active' : ''}`} 
          onClick={onOpenAmbient}
          title="Ambient Sound Mixer (Rain, Campfire, Vinyl, Keyboard, Bugs)"
        >
          <Sliders size={17} />
          <span className="btn-label">Ambience</span>
          {activeAmbientCount > 0 && (
            <span className="count-pill">{activeAmbientCount}</span>
          )}
        </button>

        {/* Custom Track Upload */}
        <button 
          id="btn-custom-upload"
          className="glass-action-btn" 
          onClick={onOpenUploadModal}
          title="Add custom local audio file or streaming URL"
        >
          <Upload size={17} />
          <span className="btn-label">Add Music</span>
        </button>

        {/* User Auth Profile / Login (Completely parallel in same plane) */}
        <div className="auth-profile-wrapper">
          {user ? (
            <div className="profile-dropdown-container" ref={profileDropdownRef}>
              <button 
                id="btn-user-profile"
                className="user-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar-img" />
                ) : (
                  <div className="user-avatar-placeholder">
                    <UserIcon size={16} />
                  </div>
                )}
                <span className="user-name-text">{user.displayName || user.email?.split('@')[0] || 'Member'}</span>
                {isAdmin && (
                  <span className="topbar-admin-pill" title="Verified Musicly Administrator">
                    <Crown size={12} style={{ color: '#ffd166' }} />
                  </span>
                )}
              </button>

              {showProfileMenu && (
                <div className="glass-dropdown-menu">
                  <div className="dropdown-user-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className="dropdown-user-name">{user.displayName || 'Music Enthusiast'}</p>
                      {isAdmin && (
                        <span className="dropdown-admin-tag">
                          <Crown size={10} /> Admin
                        </span>
                      )}
                    </div>
                    <p className="dropdown-user-email">{user.email || 'Guest Mode'}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  
                  {/* 👑 Admin Dashboard shortcut */}
                  {isAdmin && onOpenAdminDashboard && (
                    <>
                      <button 
                        id="btn-admin-dashboard-dropdown"
                        className="dropdown-item admin-dropdown-item" 
                        onClick={() => { 
                          setShowProfileMenu(false); 
                          onOpenAdminDashboard(); 
                        }}
                        title="Open Musicly Public Library Admin Dashboard"
                      >
                        <Crown size={15} style={{ color: '#ffd166' }} />
                        <span style={{ color: '#ffd166', fontWeight: 600 }}>Public Library Manager</span>
                      </button>
                      <hr className="dropdown-divider" />
                    </>
                  )}

                  {/* ☕ Buy Me a Coffee Option inside User Login Dropdown (Hidden for Admins) */}
                  {!isAdmin && (
                    <>
                      <button 
                        id="btn-coffee-dropdown"
                        className="dropdown-item coffee-dropdown-item" 
                        onClick={() => { 
                          setShowProfileMenu(false); 
                          if (onOpenCoffeeModal) onOpenCoffeeModal(); 
                        }}
                        title="Buy me a coffee ☕"
                      >
                        <span className="coffee-dropdown-icon">☕</span>
                        <span className="coffee-dropdown-text">Buy Me a Coffee</span>
                      </button>
                      <hr className="dropdown-divider" />
                    </>
                  )}
                  {/* ✋ Air Controls Option inside Profile Dropdown */}
                  <button 
                    id="btn-air-controls-dropdown"
                    className="dropdown-item air-controls-dropdown-item" 
                    onClick={() => { 
                      setShowProfileMenu(false); 
                      if (onOpenAirControls) onOpenAirControls(); 
                    }}
                    title="Control Music with Webcam Hand Gestures"
                  >
                    <Hand size={15} style={{ color: isAirControlsActive ? '#34d399' : '#38bdf8' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>Air Controls</span>
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '1px 6px', 
                      borderRadius: '9999px',
                      background: isAirControlsActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: isAirControlsActive ? '#34d399' : '#94a3b8',
                      fontWeight: 600
                    }}>
                      {isAirControlsActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <hr className="dropdown-divider" />

                  {/* ⌨ Keyboard Shortcuts Option inside Profile Dropdown */}
                  <button 
                    id="btn-shortcuts-dropdown"
                    className="dropdown-item shortcuts-dropdown-item" 
                    onClick={() => { 
                      setShowProfileMenu(false); 
                      if (onOpenShortcutsModal) onOpenShortcutsModal(); 
                    }}
                    title="View all Keyboard Shortcuts (?)"
                  >
                    <Keyboard size={15} style={{ color: '#60a5fa' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>Keyboard Shortcuts</span>
                    <kbd className="dropdown-kbd-hint">?</kbd>
                  </button>
                  <hr className="dropdown-divider" />

                  <button className="dropdown-item text-danger" onClick={() => { setShowProfileMenu(false); onLogout(); }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="guest-auth-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                id="btn-login-trigger"
                className="login-trigger-btn"
                onClick={onOpenAuthModal}
              >
                <LogIn size={16} />
                <span>Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
