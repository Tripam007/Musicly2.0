import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Clock, 
  Users, 
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
import { GENRES, getAvailableGenres, LANGUAGES } from '../data/tracks';
import { VoiceControlUI } from '../voice/VoiceControlUI';
import { playClickSound } from '../utils/audioSynth';

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
  onOpenAudioSettings,
  isAirControlsActive = false,
  onOpenAirControls,
  user,
  isAdmin = false,
  onOpenAdminDashboard,
  onLogout,
  selectedLanguage,
  selectedLanguages = [],
  onSelectLanguage,
  voiceManager,
  onOpenCinematicIntro
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

  // TopBar Flip Mode: 'language' (Face 1) <-> 'genre' (Face 2)
  const [topBarMode, setTopBarMode] = useState('language');

  const TOP_LANGUAGES = useMemo(() => ['All', ...LANGUAGES], []);

  // Fluid Flowing Slider Indicator Logic for Genre Face (matches redpipe ok.mp4 sliding pill physics)
  const navRef = useRef(null);
  const pillRefs = useRef({});
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    isReady: false,
    skipTransition: true
  });

  // Fluid Flowing Slider Indicator Logic for Language Face
  const langNavRef = useRef(null);
  const langPillRefs = useRef({});
  const [hoveredLang, setHoveredLang] = useState(null);
  const [langIndicatorStyle, setLangIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    isReady: false,
    skipTransition: true
  });

  const availableGenres = useMemo(() => {
    return getAvailableGenres(selectedLanguage);
  }, [selectedLanguage]);

  const effectiveActiveGenre = useMemo(() => {
    if (availableGenres.includes(selectedGenre)) return selectedGenre;
    return availableGenres[0] || 'All';
  }, [availableGenres, selectedGenre]);

  const effectiveActiveLang = useMemo(() => {
    if (!selectedLanguages || selectedLanguages.length === 0) return 'All';
    const found = TOP_LANGUAGES.find(l => selectedLanguages.some(sl => sl.toLowerCase() === l.toLowerCase()));
    return found || 'All';
  }, [selectedLanguages, TOP_LANGUAGES]);

  const currentTargetGenre = hoveredGenre || effectiveActiveGenre;
  const isHoveringOther = Boolean(hoveredGenre && hoveredGenre !== effectiveActiveGenre);

  const currentTargetLang = hoveredLang || effectiveActiveLang;
  const isLangHoveringOther = Boolean(hoveredLang && hoveredLang !== effectiveActiveLang);

  const updateIndicatorPosition = useCallback((target = currentTargetGenre, isImmediate = false) => {
    const nav = navRef.current;
    if (!nav) return;
    const pill = pillRefs.current[target] || pillRefs.current[effectiveActiveGenre] || pillRefs.current[availableGenres[0]];
    if (!pill) return;

    const navRect = nav.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();

    const left = pillRect.left - navRect.left + nav.scrollLeft;
    const top = pillRect.top - navRect.top + nav.scrollTop;
    const width = pillRect.width;
    const height = pillRect.height;

    if (width > 0 && height > 0) {
      setIndicatorStyle(prev => ({
        left,
        top,
        width,
        height,
        opacity: 1,
        isReady: true,
        skipTransition: !prev.isReady || isImmediate
      }));
    }
  }, [currentTargetGenre, effectiveActiveGenre, availableGenres]);

  const updateLangIndicatorPosition = useCallback((target = currentTargetLang, isImmediate = false) => {
    const nav = langNavRef.current;
    if (!nav) return;
    const pill = langPillRefs.current[target] || langPillRefs.current[effectiveActiveLang] || langPillRefs.current['All'];
    if (!pill) return;

    const navRect = nav.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();

    const left = pillRect.left - navRect.left + nav.scrollLeft;
    const top = pillRect.top - navRect.top + nav.scrollTop;
    const width = pillRect.width;
    const height = pillRect.height;

    if (width > 0 && height > 0) {
      setLangIndicatorStyle(prev => ({
        left,
        top,
        width,
        height,
        opacity: 1,
        isReady: true,
        skipTransition: !prev.isReady || isImmediate
      }));
    }
  }, [currentTargetLang, effectiveActiveLang]);

  // Update positions on state changes
  useEffect(() => {
    updateIndicatorPosition(currentTargetGenre, !indicatorStyle.isReady);
  }, [currentTargetGenre, updateIndicatorPosition, indicatorStyle.isReady]);

  useEffect(() => {
    updateLangIndicatorPosition(currentTargetLang, !langIndicatorStyle.isReady);
  }, [currentTargetLang, updateLangIndicatorPosition, langIndicatorStyle.isReady]);

  // Handle re-aligning active indicator whenever topBarMode switches
  useEffect(() => {
    if (topBarMode === 'genre') {
      updateIndicatorPosition(currentTargetGenre, false);
      const t1 = setTimeout(() => updateIndicatorPosition(currentTargetGenre, false), 120);
      const t2 = setTimeout(() => updateIndicatorPosition(currentTargetGenre, false), 450);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      updateLangIndicatorPosition(currentTargetLang, false);
      const t1 = setTimeout(() => updateLangIndicatorPosition(currentTargetLang, false), 120);
      const t2 = setTimeout(() => updateLangIndicatorPosition(currentTargetLang, false), 450);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [topBarMode, currentTargetGenre, currentTargetLang, updateIndicatorPosition, updateLangIndicatorPosition]);

  // Window resize, ResizeObserver, and font load observers
  useEffect(() => {
    const handleResize = () => {
      updateIndicatorPosition(currentTargetGenre, false);
      updateLangIndicatorPosition(currentTargetLang, false);
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateIndicatorPosition(currentTargetGenre, false);
        updateLangIndicatorPosition(currentTargetLang, false);
      });
      if (navRef.current) resizeObserver.observe(navRef.current);
      if (langNavRef.current) resizeObserver.observe(langNavRef.current);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        updateIndicatorPosition(currentTargetGenre, true);
        updateLangIndicatorPosition(currentTargetLang, true);
      }).catch(() => {});
    }

    const timer = setTimeout(() => {
      updateIndicatorPosition(currentTargetGenre, true);
      updateLangIndicatorPosition(currentTargetLang, true);
    }, 120);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [currentTargetGenre, currentTargetLang, updateIndicatorPosition, updateLangIndicatorPosition]);

  // Direct wheel scrolling over the top nav bar (scroll down -> genre, scroll up -> language)
  const handleNavWheel = useCallback((e) => {
    if (Math.abs(e.deltaY) < 12) return;
    if (e.deltaY > 0) {
      if (topBarMode !== 'genre') {
        playClickSound('light');
        setTopBarMode('genre');
      }
    } else {
      if (topBarMode !== 'language') {
        playClickSound('light');
        setTopBarMode('language');
      }
    }
  }, [topBarMode]);

  // Window wheel listener: scrolling up shows language, scrolling down shows genre
  useEffect(() => {
    let lastWheelTime = 0;

    const handleWindowWheel = (e) => {
      const now = Date.now();
      if (now - lastWheelTime < 240) return;

      // Ignore if user is scrolling inside a modal or drawer
      if (e.target.closest?.('.app-modal, .vinyl-playlist-modal, .drawer-container, .dialog-content, .lyrics-container, .queue-list')) {
        return;
      }

      if (e.deltaY > 32) {
        setTopBarMode(prev => {
          if (prev !== 'genre') {
            playClickSound('light');
            return 'genre';
          }
          return prev;
        });
        lastWheelTime = now;
      } else if (e.deltaY < -32) {
        setTopBarMode(prev => {
          if (prev !== 'language') {
            playClickSound('light');
            return 'language';
          }
          return prev;
        });
        lastWheelTime = now;
      }
    };

    window.addEventListener('wheel', handleWindowWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWindowWheel);
  }, []);

  // Window touch listener for mobile swipe
  useEffect(() => {
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const duration = Date.now() - touchStartTime;

      if (e.target.closest?.('.app-modal, .vinyl-playlist-modal, .drawer-container, .dialog-content, .lyrics-container, .queue-list')) {
        return;
      }

      if (duration < 500 && Math.abs(deltaY) > 40) {
        if (deltaY < -40) {
          // Swiped up -> scroll down -> genre
          setTopBarMode('genre');
        } else if (deltaY > 40) {
          // Swiped down -> scroll up -> language
          setTopBarMode('language');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // When user clicks a language pill: selects language & turns smoothly to genre view
  const handleLanguageClick = (lang) => {
    playClickSound('light');
    if (onSelectLanguage) {
      onSelectLanguage(lang);
    }
    // After choosing language, make it turn with a smooth 3D transition to the genre section!
    setTimeout(() => {
      setTopBarMode('genre');
    }, 450);
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

      {/* Center: Dual-face 3D Turn Container (Language <-> Genre) */}
      <div 
        className={`topbar-nav-flip-container ${isAdmin ? 'admin-layout' : ''}`}
        onWheel={handleNavWheel}
      >
        <div className={`topbar-nav-flip-stage mode-${topBarMode}`}>
          {/* Face 1: Language Selection Bar */}
          <nav
            ref={langNavRef}
            className="topbar-nav-face face-language"
            aria-label="Language Selection"
            onMouseLeave={() => setHoveredLang(null)}
          >
            {/* Sliding Flow Indicator for Language Face */}
            <div
              className={`genre-sliding-indicator ${isLangHoveringOther ? 'is-hover' : 'is-active'} ${langIndicatorStyle.isReady ? 'is-ready' : ''}`}
              style={{
                transform: `translate3d(${langIndicatorStyle.left}px, ${langIndicatorStyle.top}px, 0)`,
                width: `${langIndicatorStyle.width}px`,
                height: `${langIndicatorStyle.height}px`,
                opacity: langIndicatorStyle.opacity,
                transition: langIndicatorStyle.skipTransition
                  ? 'none'
                  : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1), height 0.32s cubic-bezier(0.16, 1, 0.3, 1), background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease',
              }}
              aria-hidden="true"
            />

            {TOP_LANGUAGES.map((lang) => {
              const isAll = lang === 'All';
              const isActive = isAll
                ? (!selectedLanguages || selectedLanguages.length === 0)
                : (selectedLanguages && selectedLanguages.some(l => l.toLowerCase() === lang.toLowerCase()));
              const isHovered = hoveredLang === lang;
              const displayLabel = lang.toUpperCase();

              return (
                <button
                  key={lang}
                  ref={(el) => {
                    if (el) langPillRefs.current[lang] = el;
                    else delete langPillRefs.current[lang];
                  }}
                  id={`topbar-lang-${lang.toLowerCase()}`}
                  className={`genre-pill ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => handleLanguageClick(lang)}
                  onMouseEnter={() => setHoveredLang(lang)}
                  title={`Filter songs by ${lang} language (then auto-turns to genres)`}
                >
                  {isActive && <span className="pill-dot" />}
                  <span className="rolling-text" aria-label={displayLabel}>
                    {displayLabel.split('').map((char, i) => (
                      <span
                        key={i}
                        className="letter-roller"
                        style={{ '--char-index': i }}
                      >
                        <span className="letter-char letter-primary">{char === ' ' ? '\u00A0' : char}</span>
                        <span className="letter-char letter-secondary" aria-hidden="true">{char === ' ' ? '\u00A0' : char}</span>
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Face 2: Genre Selection Bar */}
          <nav
            ref={navRef}
            className="topbar-nav-face face-genre"
            aria-label="Genre Selection"
            onMouseLeave={() => setHoveredGenre(null)}
          >
            {/* Flowing Floating Sliding Indicator for Genre Face */}
            <div
              className={`genre-sliding-indicator ${isHoveringOther ? 'is-hover' : 'is-active'} ${indicatorStyle.isReady ? 'is-ready' : ''}`}
              style={{
                transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
                width: `${indicatorStyle.width}px`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
                transition: indicatorStyle.skipTransition
                  ? 'none'
                  : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1), height 0.32s cubic-bezier(0.16, 1, 0.3, 1), background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease',
              }}
              aria-hidden="true"
            />

            {availableGenres.map((genre) => {
              const isActive = effectiveActiveGenre === genre;
              const isHovered = hoveredGenre === genre;
              return (
                <button
                  key={genre}
                  ref={(el) => {
                    if (el) pillRefs.current[genre] = el;
                    else delete pillRefs.current[genre];
                  }}
                  id={`genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                  className={`genre-pill ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                  onClick={() => {
                    onSelectGenre(genre);
                    playClickSound('light');
                  }}
                  onMouseEnter={() => setHoveredGenre(genre)}
                  title={`Switch vibe to ${genre}`}
                >
                  {isActive && <span className="pill-dot" />}
                  <span className="rolling-text" aria-label={genre}>
                    {genre.split('').map((char, i) => (
                      <span
                        key={i}
                        className="letter-roller"
                        style={{ '--char-index': i }}
                      >
                        <span className="letter-char letter-primary">{char === ' ' ? '\u00A0' : char}</span>
                        <span className="letter-char letter-secondary" aria-hidden="true">{char === ' ' ? '\u00A0' : char}</span>
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

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

                  {/* 🎚 Sound & Equalizer Settings Option */}
                  <button 
                    id="btn-sound-settings-dropdown"
                    className="dropdown-item sound-settings-dropdown-item" 
                    onClick={() => { 
                      setShowProfileMenu(false); 
                      if (onOpenAudioSettings) onOpenAudioSettings(); 
                    }}
                    title="Audio Equalizer & Tactile Sound Settings"
                  >
                    <Sliders size={15} style={{ color: '#c084fc' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>Sound & Equalizer</span>
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '1px 6px', 
                      borderRadius: '9999px',
                      background: 'rgba(168, 85, 247, 0.16)',
                      color: '#d8b4fe',
                      fontWeight: 600
                    }}>
                      EQ
                    </span>
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
