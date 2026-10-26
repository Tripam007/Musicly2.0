import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  Home, 
  Heart, 
  Music, 
  Disc, 
  Sliders, 
  Settings, 
  Coffee, 
  Search, 
  Bell, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX, 
  Volume1, 
  ListMusic, 
  Maximize2, 
  Minimize2, 
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { LANGUAGES, LANGUAGE_LABELS } from '../data/tracks';
import '../styles/vinylScene.css';

// Curated Category Filters inspired by the reference image
const VINYL_CATEGORIES = [
  'ALL', 
  'CLASSIC', 
  '90s', 
  'NEW', 
  'INSTRUMENTAL', 
  'MODERN', 
  'INDIE', 
  'LO-FI'
];

export default function VinylScene({
  currentScene,
  allTracks = [],
  currentTrack,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  volume = 0.85,
  onVolumeChange,
  onSeek,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  isShuffle = false,
  onToggleShuffle,
  repeatMode = 'all', // 'off' | 'all' | 'one'
  onToggleRepeat,
  favorites = [],
  onToggleFavorite,
  onSelectTrack,
  onOpenSceneModal,
  onOpenPlaylistDrawer,
  onOpenSearch,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenAuthModal,
  onOpenCoffeeModal,
  onOpenShortcutsModal,
  onOpenAudioSettings,
  user = null,
  isAdmin = false,
  onLogout,
  onClose,
  selectedGenre = 'All',
  onSelectGenre,
  audioElement = null,
  selectedLanguage = null,
  selectedLanguages = [],
  onSelectLanguage = null
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [localLanguages, setLocalLanguages] = useState([]);

  // Active languages resolution (supporting global props or local fallback)
  const activeLanguages = useMemo(() => {
    if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
      return selectedLanguages;
    }
    if (selectedLanguage && selectedLanguage !== 'All') {
      return [selectedLanguage];
    }
    return localLanguages;
  }, [selectedLanguages, selectedLanguage, localLanguages]);

  // Language selection toggle
  const handleLanguageToggle = useCallback((lang) => {
    if (onSelectLanguage) {
      onSelectLanguage(lang);
    } else {
      setLocalLanguages(prev => {
        if (!lang || lang === 'All') return [];
        if (prev.includes(lang)) return prev.filter(l => l !== lang);
        return [...prev, lang];
      });
    }
  }, [onSelectLanguage]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [clickRipple, setClickRipple] = useState(null);
  const [isHoveringWaveform, setIsHoveringWaveform] = useState(false);
  const [hoverSeekRatio, setHoverSeekRatio] = useState(null);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strobePowerOn, setStrobePowerOn] = useState(true);

  // Turntable Speed (33 vs 45 RPM) & Interactive Deck Volume Fader State
  const [rpmSpeed, setRpmSpeed] = useState(33);
  const [isDraggingFader, setIsDraggingFader] = useState(false);
  const [showFaderTooltip, setShowFaderTooltip] = useState(false);

  const waveformTrackRef = useRef(null);
  const rippleTimeoutRef = useRef(null);
  const faderGrooveRef = useRef(null);

  // Clean up ripple timer on unmount
  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    };
  }, []);

  // Format seconds to mm:ss
  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Safe percentage calculation
  const safeDuration = duration > 0 ? duration : 180;
  const currentRatio = Math.max(0, Math.min(1, currentTime / safeDuration));

  // 64 dynamic waveform bars with natural soundwave envelope
  const waveformBars = useMemo(() => {
    const bars = [];
    const count = 64;
    for (let i = 0; i < count; i++) {
      // Harmonic formula combining sine waves with subtle randomness for authentic hi-fi envelope
      const norm = i / count;
      const base = Math.sin(norm * Math.PI);
      const harmonic1 = 0.35 * Math.sin(norm * Math.PI * 4);
      const harmonic2 = 0.2 * Math.cos(norm * Math.PI * 7);
      const pseudoRand = ((i * 19) % 11) / 35;
      const heightPercent = Math.max(18, Math.min(100, Math.round((base * 0.65 + harmonic1 + harmonic2 + pseudoRand + 0.25) * 100)));
      bars.push({ id: i, heightPercent });
    }
    return bars;
  }, []);

  // Filter tracks by category and search
  const filteredCategoryTracks = useMemo(() => {
    if (!allTracks || allTracks.length === 0) return [];
    
    let list = allTracks;

    // 1. Language Filter
    if (activeLanguages && activeLanguages.length > 0) {
      const lowerSelected = activeLanguages.map(l => l.toLowerCase());
      list = list.filter(track => {
        const trackLang = (track.language || 'English').toLowerCase();
        return lowerSelected.includes(trackLang);
      });
    }

    // 2. Category mapping logic to Musicly's real genres and metadata
    if (activeCategory !== 'ALL') {
      const cat = activeCategory.toLowerCase();
      list = list.filter(track => {
        const trackGenre = (track.genre || '').toLowerCase();
        const trackGenres = Array.isArray(track.genres) ? track.genres.map(g => (g || '').toLowerCase()) : [];
        const trackTitle = (track.title || '').toLowerCase();
        const trackArtist = (track.artist || '').toLowerCase();

        if (cat === 'classic') {
          return trackGenre.includes('retro') || trackGenres.includes('retro') || trackTitle.includes('classic') || trackArtist.includes('dylan') || trackArtist.includes('joel');
        }
        if (cat === '90s') {
          return trackGenre.includes('retro') || trackGenres.includes('retro') || trackGenre.includes('indie') || trackTitle.includes('iris') || trackArtist.includes('dolls');
        }
        if (cat === 'new') {
          return track.isPublic || track.isOriginalAudio || trackGenre.includes('synthwave');
        }
        if (cat === 'instrumental') {
          return trackGenre.includes('peace') || trackGenre.includes('chill') || trackGenre.includes('sleep') || trackGenres.includes('peace');
        }
        if (cat === 'modern') {
          return trackGenre.includes('synthwave') || trackGenre.includes('indie');
        }
        if (cat === 'indie') {
          return trackGenre.includes('indie') || trackGenres.includes('indie');
        }
        if (cat === 'lo-fi') {
          return trackGenre.includes('lo-fi') || trackGenres.includes('lo-fi') || trackGenre.includes('peace');
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.title || '').toLowerCase().includes(q) || 
        (t.artist || '').toLowerCase().includes(q) ||
        (t.genre || '').toLowerCase().includes(q)
      );
    }

    return list.slice(0, 12);
  }, [allTracks, activeCategory, activeLanguages, searchQuery]);

  // Curated Favorite Playlists Section data
  const favoritePlaylists = useMemo(() => {
    const playlists = [];

    // 1. Liked Songs Playlist
    const likedTracks = allTracks.filter(t => favorites.includes(t.id));
    playlists.push({
      id: 'liked_songs',
      title: 'Liked Songs',
      subtitle: `${likedTracks.length} song${likedTracks.length === 1 ? '' : 's'} in this list`,
      count: likedTracks.length,
      tracks: likedTracks.length > 0 ? likedTracks : allTracks.slice(0, 5),
      image: likedTracks[0]?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'
    });

    // 2. Vintage Vinyl & 80s Classics
    const retroTracks = allTracks.filter(t => (t.genre || '').toLowerCase().includes('retro') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('retro'))));
    playlists.push({
      id: 'vintage_retro',
      title: 'Vintage Hi-Fi & 80s',
      subtitle: `${retroTracks.length} song${retroTracks.length === 1 ? '' : 's'} in this list`,
      count: retroTracks.length,
      tracks: retroTracks.length > 0 ? retroTracks : allTracks,
      image: retroTracks[0]?.cover || '/assets/images/retro_scene.jpg'
    });

    // 3. Late Night Lo-Fi
    const lofiTracks = allTracks.filter(t => (t.genre || '').toLowerCase().includes('lo-fi') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('lo-fi'))));
    playlists.push({
      id: 'latenight_lofi',
      title: 'Late Night Lo-Fi',
      subtitle: `${lofiTracks.length} song${lofiTracks.length === 1 ? '' : 's'} in this list`,
      count: lofiTracks.length,
      tracks: lofiTracks.length > 0 ? lofiTracks : allTracks,
      image: lofiTracks[0]?.cover || '/assets/images/lofi_scene.jpg'
    });

    // 4. Indie Warmth & Acoustic
    const indieTracks = allTracks.filter(t => (t.genre || '').toLowerCase().includes('indie') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('indie'))));
    playlists.push({
      id: 'indie_warmth',
      title: 'Indie Acoustic Sessions',
      subtitle: `${indieTracks.length} song${indieTracks.length === 1 ? '' : 's'} in this list`,
      count: indieTracks.length,
      tracks: indieTracks.length > 0 ? indieTracks : allTracks,
      image: indieTracks[0]?.cover || 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=300&auto=format&fit=crop&q=80'
    });

    return playlists;
  }, [allTracks, favorites]);

  // Click on turntable record directly to toggle playback
  const handleRecordClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setClickRipple({ x, y, id: Date.now() });
    if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    rippleTimeoutRef.current = setTimeout(() => {
      setClickRipple(null);
    }, 600);

    if (onTogglePlay) {
      onTogglePlay();
    }
  };

  // Waveform seek calculation accurately clamped to rect.width
  const calculateWaveformSeek = useCallback((clientX) => {
    if (!waveformTrackRef.current || !safeDuration) return { ratio: 0, targetSec: 0 };
    const rect = waveformTrackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return { ratio: 0, targetSec: 0 };
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    return { ratio, targetSec: ratio * safeDuration };
  }, [safeDuration]);

  const handleWaveformPointerDown = (e) => {
    e.preventDefault();
    setIsDraggingWaveform(true);
    setIsHoveringWaveform(true);
    const { ratio, targetSec } = calculateWaveformSeek(e.clientX);
    setHoverSeekRatio(ratio);
    if (onSeek) onSeek(targetSec);

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const { ratio: moveRatio, targetSec: moveSec } = calculateWaveformSeek(moveEvent.clientX);
      setHoverSeekRatio(moveRatio);
      if (onSeek) onSeek(moveSec);
    };

    const handlePointerUp = () => {
      setIsDraggingWaveform(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleWaveformPointerMove = (e) => {
    if (isDraggingWaveform) return;
    const { ratio } = calculateWaveformSeek(e.clientX);
    setHoverSeekRatio(ratio);
  };

  const handleWaveformPointerUp = () => {
    setIsDraggingWaveform(false);
  };

  // Volume & Mute handling
  const handleToggleMute = () => {
    if (!onVolumeChange) return;
    if (isMuted || volume === 0) {
      setIsMuted(false);
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.85);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const handleVolumeSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    if (onVolumeChange) {
      onVolumeChange(val);
      if (val > 0) setIsMuted(false);
    }
  };

  // Deck Volume Fader Calculations & Handlers
  const currentVol = isMuted ? 0 : (typeof volume === 'number' ? volume : 0.85);
  const thumbPercent = Math.max(0, Math.min(100, (1 - currentVol) * 100));

  const updateVolumeFromFader = useCallback((clientY) => {
    if (!faderGrooveRef.current || !onVolumeChange) return;
    const rect = faderGrooveRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;

    const offsetY = clientY - rect.top;
    const clampedY = Math.max(0, Math.min(rect.height, offsetY));
    // Top of groove is 100% (1.0), bottom is 0% (0.0)
    const newVol = Math.round((1 - clampedY / rect.height) * 100) / 100;
    onVolumeChange(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [onVolumeChange, isMuted]);

  const handleFaderPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFader(true);
    setShowFaderTooltip(true);
    updateVolumeFromFader(e.clientY);

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      updateVolumeFromFader(moveEvent.clientY);
    };

    const handlePointerUp = () => {
      setIsDraggingFader(false);
      setShowFaderTooltip(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleFaderWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onVolumeChange) return;
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const nextVol = Math.max(0, Math.min(1, Math.round((currentVol + delta) * 100) / 100));
    onVolumeChange(nextVol);
    if (nextVol > 0 && isMuted) setIsMuted(false);
  };

  const handleFaderKeyDown = (e) => {
    if (!onVolumeChange) return;
    let step = 0;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') step = 0.05;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') step = -0.05;
    else if (e.key === 'PageUp') step = 0.1;
    else if (e.key === 'PageDown') step = -0.1;
    else if (e.key === 'Home') step = 1;
    else if (e.key === 'End') step = -1;
    else return;

    e.preventDefault();
    const nextVol = Math.max(0, Math.min(1, Math.round((currentVol + step) * 100) / 100));
    onVolumeChange(nextVol);
    if (nextVol > 0 && isMuted) setIsMuted(false);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Category pill click handler
  const handleCategoryClick = (category) => {
    setActiveCategory(category);
    if (onSelectGenre) {
      const genreMap = {
        'ALL': 'All',
        'CLASSIC': 'Retro',
        '90s': 'Retro',
        'NEW': 'Synthwave',
        'INSTRUMENTAL': 'Peace',
        'MODERN': 'Indie',
        'INDIE': 'Indie',
        'LO-FI': 'Lo-Fi'
      };
      const mapped = genreMap[category] || 'All';
      onSelectGenre(mapped);
    }
  };

  // Track is currently playing check
  const isCurrentFavorite = favorites.includes(currentTrack?.id);

  return (
    <div className={`vinyl-scene-root ${isFullscreen ? 'is-fullscreen-mode' : ''}`}>
      {/* Subtle Grain Overlay */}
      <div className="vinyl-grain-overlay" />

      {/* Top Header Bar */}
      <header className="vinyl-top-header">
        {/* Brand / Logo */}
        <div className="vinyl-brand-group" onClick={onClose} title="Musicly — Return to default room">
          <div className="vinyl-brand-logo-mark">
            <Disc size={16} />
          </div>
          <span className="vinyl-brand-title">MUSICLY</span>
        </div>

        {/* Search Bar Capsule */}
        <div className="vinyl-search-wrapper">
          <Search size={15} className="vinyl-search-icon" />
          <input
            id="vinyl-search-input"
            type="text"
            className="vinyl-search-input"
            placeholder="Search for songs, artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onOpenSearch) {
                onOpenSearch(searchQuery);
              }
            }}
          />
          {searchQuery && (
            <button 
              className="vinyl-search-clear" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="vinyl-header-actions">
          {/* Ambience Mixer Icon */}
          <button 
            id="vinyl-btn-ambient"
            className="vinyl-icon-btn" 
            onClick={onOpenAmbient}
            title="Ambient Sound Mixer"
          >
            <Sliders size={16} />
            {activeAmbientCount > 0 && (
              <span className="vinyl-btn-badge">{activeAmbientCount}</span>
            )}
          </button>

          {/* Notifications / Shortcuts */}
          <button 
            id="vinyl-btn-shortcuts"
            className="vinyl-icon-btn" 
            onClick={onOpenShortcutsModal}
            title="Keyboard Shortcuts & Hints"
          >
            <Bell size={16} />
          </button>

          {/* User Profile / Login */}
          {user && !user.isAnonymous ? (
            <button 
              id="vinyl-btn-user"
              className="vinyl-user-btn" 
              onClick={onOpenAuthModal}
              title={`Logged in as ${user.displayName || user.email}`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="vinyl-user-avatar" />
              ) : (
                <div className="vinyl-user-initial">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="vinyl-user-name">{user.displayName || user.email?.split('@')[0]}</span>
            </button>
          ) : (
            <button 
              id="vinyl-btn-login"
              className="vinyl-user-btn" 
              onClick={onOpenAuthModal}
              title="Sign in to sync your favorites & playlists"
            >
              <div className="vinyl-user-initial">G</div>
              <span className="vinyl-user-name">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Stage: Left Rail + Responsive Workspace */}
      <div className="vinyl-stage-layout">
        {/* Left Navigation Rail */}
        <aside className="vinyl-nav-rail" aria-label="Navigation Rail">
          <div className="vinyl-rail-group">
            <button 
              id="vinyl-rail-home"
              className="vinyl-rail-btn is-active" 
              onClick={onClose}
              title="Home Room (Cozy Bedroom Studio)"
            >
              <Home size={19} />
            </button>

            <button 
              id="vinyl-rail-favorites"
              className="vinyl-rail-btn" 
              onClick={onOpenPlaylistDrawer}
              title="Favorites & Liked Songs"
            >
              <Heart size={19} />
            </button>

            <button 
              id="vinyl-rail-library"
              className="vinyl-rail-btn" 
              onClick={onOpenPlaylistDrawer}
              title="Music Library & Search"
            >
              <Music size={19} />
            </button>

            <button 
              id="vinyl-rail-scenes"
              className="vinyl-rail-btn" 
              onClick={onOpenSceneModal}
              title="Room Themes & Backdrops"
            >
              <Disc size={19} />
            </button>
          </div>

          <div className="vinyl-rail-group">
            <button 
              id="vinyl-rail-coffee"
              className="vinyl-rail-btn" 
              onClick={onOpenCoffeeModal}
              title="Support Musicly / Coffee"
            >
              <Coffee size={19} />
            </button>

            <button 
              id="vinyl-rail-settings"
              className="vinyl-rail-btn" 
              onClick={onOpenAudioSettings}
              title="Audio Equalizer & Settings"
            >
              <Settings size={19} />
            </button>
          </div>
        </aside>

        {/* Scrollable Main Workspace */}
        <main className="vinyl-main-scroll">
          <div className="vinyl-workspace-grid">
            
            {/* ==========================================================================
               LEFT COLUMN: HERO VINYL TURNTABLE & INTEGRATED PLAYER
               ========================================================================== */}
            <section className="vinyl-hero-column" aria-label="Vinyl Turntable Deck">
              
              {/* Realistic Turntable Chassis */}
              <div className="vinyl-turntable-deck">
                {/* 4 Corner Screws */}
                <div className="vinyl-deck-screw pos-tl" />
                <div className="vinyl-deck-screw pos-tr" />
                <div className="vinyl-deck-screw pos-bl" />
                <div className="vinyl-deck-screw pos-br" />

                {/* Strobe Power Dial on lower left */}
                <button 
                  className="vinyl-deck-power-toggle" 
                  onClick={() => setStrobePowerOn(!strobePowerOn)}
                  title="Strobe Lamp Power"
                  aria-label="Toggle Turntable Strobe"
                >
                  <Disc size={16} color="#444" />
                </button>
                <div className={`vinyl-deck-strobe-pillar ${!strobePowerOn ? 'is-off' : ''}`} />

                {/* 33 & 45 RPM Speed Buttons */}
                <div className="vinyl-deck-speed-badges" role="group" aria-label="Turntable rotation speed">
                  <button 
                    type="button"
                    className={`vinyl-speed-btn ${rpmSpeed === 33 ? 'is-active' : ''}`}
                    onClick={() => setRpmSpeed(33)}
                    title="33 RPM — Slow, relaxed rotation (6.5s per spin)"
                    aria-label="33 RPM Speed"
                    aria-pressed={rpmSpeed === 33}
                  >
                    33
                  </button>
                  <button 
                    type="button"
                    className={`vinyl-speed-btn ${rpmSpeed === 45 ? 'is-active' : ''}`}
                    onClick={() => setRpmSpeed(45)}
                    title="45 RPM — Moderate rotation (4.2s per spin)"
                    aria-label="45 RPM Speed"
                    aria-pressed={rpmSpeed === 45}
                  >
                    45
                  </button>
                </div>

                {/* Interactive Turntable Volume Fader Slider on Right Edge */}
                <div 
                  className={`vinyl-deck-pitch-fader ${isDraggingFader ? 'is-dragging' : ''}`}
                  onPointerDown={handleFaderPointerDown}
                  onWheel={handleFaderWheel}
                  onKeyDown={handleFaderKeyDown}
                  onMouseEnter={() => setShowFaderTooltip(true)}
                  onMouseLeave={() => !isDraggingFader && setShowFaderTooltip(false)}
                  tabIndex={0}
                  role="slider"
                  aria-label="Turntable Volume Slider"
                  aria-valuenow={Math.round(currentVol * 100)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  title={`Volume: ${Math.round(currentVol * 100)}% (Click or drag to adjust volume)`}
                >
                  <div className="vinyl-fader-groove" ref={faderGrooveRef}>
                    <div 
                      className="vinyl-fader-level-bar" 
                      style={{ height: `${currentVol * 100}%` }}
                    />
                    <div 
                      className="vinyl-fader-thumb" 
                      style={{ top: `${thumbPercent}%` }}
                    />
                  </div>

                  {(showFaderTooltip || isDraggingFader) && (
                    <div className="vinyl-fader-tooltip" aria-hidden="true">
                      {Math.round(currentVol * 100)}%
                    </div>
                  )}
                </div>

                {/* Rotating Turntable Platter Well */}
                <div 
                  className="vinyl-platter-well"
                  onClick={handleRecordClick}
                  title={isPlaying ? "Click record to pause" : "Click record to play"}
                >
                  {/* Strobe Dots Pattern around Rim */}
                  <div className="vinyl-platter-strobe-rim" />

                  {/* Black Vinyl Disc */}
                  <div 
                    className={`vinyl-record-disc ${isPlaying ? 'is-spinning' : 'is-paused'}`}
                    style={{ '--vinyl-spin-duration': `${rpmSpeed === 33 ? 6.5 : 4.2}s` }}
                  >
                    {/* Concentric Vinyl Grooves */}
                    <div className="vinyl-grooves-layer" />

                    {/* Radial Light Reflection Sheen Sweeps */}
                    <div className="vinyl-sheen-sweep" />

                    {/* Split Two-Tone Center Label */}
                    <div 
                      className="vinyl-center-label" 
                      title={`${currentTrack?.title || 'No Track Selected'}${currentTrack?.artist ? ` — ${currentTrack.artist}` : ''}`}
                    >
                      {/* Top Cream Half: Micro Brand + Current Track Name */}
                      <div className="vinyl-label-top-section">
                        <span className="vinyl-label-sub-brand">MUSICLY • STEREO</span>
                        <span className="vinyl-label-song-title">
                          {currentTrack?.title || 'No Track Selected'}
                        </span>
                      </div>

                      {/* Center Spindle Core */}
                      <div className="vinyl-label-center-core">
                        {/* Spindle hole */}
                        <div className="vinyl-center-spindle-hole" />
                      </div>

                      {/* Bottom Black Half: Artist Name + RPM Speed */}
                      <div className="vinyl-label-bottom-section">
                        <span className="vinyl-label-song-artist">
                          {currentTrack?.artist || 'Musicly Audio'}
                        </span>
                        <span className="vinyl-label-rpm-badge">{rpmSpeed === 33 ? '33⅓ RPM' : '45 RPM'}</span>
                      </div>
                    </div>

                    {/* Ripple animation on click */}
                    {clickRipple && (
                      <div 
                        className="vinyl-click-ripple"
                        style={{
                          left: `${clickRipple.x - 30}px`,
                          top: `${clickRipple.y - 30}px`
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* S-Shaped Chrome Tonearm Assembly */}
                <div className={`vinyl-tonearm-assembly ${isPlaying ? 'is-playing' : 'is-resting'}`}>
                  {/* Gimbal Base Bearing */}
                  <div className="vinyl-arm-base-gimbal">
                    <div className="vinyl-arm-counterweight" />
                  </div>

                  {/* Curved Tonearm Pipe (SVG) */}
                  <svg className="vinyl-arm-rod-svg" viewBox="0 0 90 250" fill="none">
                    <path
                      d="M 70 10 C 65 60, 20 120, 25 180 C 27 210, 15 230, 8 245"
                      stroke="url(#chromeGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="35%" stopColor="#c8c8cf" />
                        <stop offset="70%" stopColor="#888890" />
                        <stop offset="100%" stopColor="#eeeeef" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Headshell Cartridge & Stylus Needle */}
                  <div className="vinyl-arm-headshell">
                    <div className="vinyl-headshell-fingerlift" />
                    <div className="vinyl-stylus-needle" />
                  </div>
                </div>
              </div>

              {/* Now Playing Information Block */}
              <div className="vinyl-now-playing-panel">
                <div className="vinyl-now-playing-meta-row">
                  <div className="vinyl-track-info-block">
                    <span className="vinyl-now-playing-kicker">NOW PLAYING</span>
                    <h1 className="vinyl-track-title" title={currentTrack?.title || 'No Track Selected'}>
                      {currentTrack?.title || 'The Suffering'}
                    </h1>
                    <p className="vinyl-track-artist">
                      {currentTrack?.artist || 'Musicly Editorial'}
                    </p>
                  </div>

                  {/* Like / Heart Counter Pill */}
                  <button 
                    id="vinyl-btn-like"
                    className={`vinyl-like-pill-btn ${isCurrentFavorite ? 'is-liked' : ''}`}
                    onClick={() => onToggleFavorite?.(currentTrack?.id)}
                    title={isCurrentFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart size={14} fill={isCurrentFavorite ? "#ffffff" : "none"} strokeWidth={2.5} />
                    <span>{isCurrentFavorite ? 'LIKED' : 'LIKE'}</span>
                  </button>
                </div>

                {/* Genre Tag Pill */}
                <div className="vinyl-pill-row">
                  <span className="vinyl-genre-pill">
                    {currentTrack?.genre || selectedGenre || 'CLASSIC'}
                  </span>
                </div>

                {/* Waveform Scrubber */}
                <div className="vinyl-waveform-wrapper">
                  <span className="vinyl-time-label">
                    {formatSeconds(currentTime)}
                  </span>

                  <div 
                    className={`vinyl-waveform-track ${isPlaying ? 'is-playing' : ''} ${isDraggingWaveform ? 'is-dragging' : ''}`}
                    ref={waveformTrackRef}
                    onPointerDown={handleWaveformPointerDown}
                    onPointerMove={handleWaveformPointerMove}
                    onPointerUp={handleWaveformPointerUp}
                    onMouseEnter={() => setIsHoveringWaveform(true)}
                    onMouseLeave={() => {
                      if (!isDraggingWaveform) {
                        setIsHoveringWaveform(false);
                        setHoverSeekRatio(null);
                      }
                    }}
                    title="Click or drag to seek track progress"
                  >
                    {waveformBars.map((bar, idx) => {
                      const barCenterRatio = (idx + 0.5) / waveformBars.length;
                      const isPlayed = barCenterRatio <= currentRatio;
                      const isHovered = (isHoveringWaveform || isDraggingWaveform) && hoverSeekRatio !== null;
                      
                      let barClass = 'vinyl-waveform-bar';
                      if (isPlayed) {
                        barClass += ' is-played';
                      }
                      if (isHovered) {
                        if (hoverSeekRatio > currentRatio && barCenterRatio > currentRatio && barCenterRatio <= hoverSeekRatio) {
                          barClass += ' is-hover-preview';
                        } else if (hoverSeekRatio < currentRatio && barCenterRatio > hoverSeekRatio && barCenterRatio <= currentRatio) {
                          barClass += ' is-hover-dim';
                        }
                      }

                      return (
                        <div 
                          key={bar.id} 
                          className={barClass}
                          style={{
                            height: `${bar.heightPercent}%`,
                            '--bar-index': idx
                          }}
                        />
                      );
                    })}

                    {/* Floating timestamp tooltip during hover or drag */}
                    {(isHoveringWaveform || isDraggingWaveform) && hoverSeekRatio !== null && (
                      <div 
                        className="vinyl-waveform-hover-tooltip"
                        style={{ left: `${Math.min(96, Math.max(4, hoverSeekRatio * 100))}%` }}
                        aria-hidden="true"
                      >
                        {formatSeconds(hoverSeekRatio * safeDuration)}
                      </div>
                    )}
                  </div>

                  <span className="vinyl-time-label" style={{ textAlign: 'right' }}>
                    {formatSeconds(safeDuration)}
                  </span>
                </div>

                {/* Dedicated Vinyl Player Controls Bar */}
                <div className="vinyl-controls-bar">
                  <div className="vinyl-ctrl-cluster">
                    {/* Scene Exit / Back */}
                    <button 
                      id="vinyl-btn-close-scene"
                      className="vinyl-ctrl-btn" 
                      onClick={onClose}
                      title="Return to standard room"
                    >
                      <X size={18} />
                    </button>

                    {/* Shuffle */}
                    <button 
                      id="vinyl-btn-shuffle"
                      className={`vinyl-ctrl-btn ${isShuffle ? 'is-active' : ''}`}
                      onClick={onToggleShuffle}
                      title={isShuffle ? "Shuffle enabled" : "Shuffle disabled"}
                    >
                      <Shuffle size={18} />
                    </button>

                    {/* Skip Previous */}
                    <button 
                      id="vinyl-btn-prev"
                      className="vinyl-ctrl-btn" 
                      onClick={onPrevTrack}
                      title="Previous song"
                    >
                      <SkipBack size={20} />
                    </button>
                  </div>

                  {/* Large Central Play / Pause Button */}
                  <button 
                    id="vinyl-btn-play-pause"
                    className="vinyl-play-pause-btn"
                    onClick={onTogglePlay}
                    title={isPlaying ? "Pause music" : "Play music"}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="#ffffff" />
                    ) : (
                      <Play size={24} fill="#ffffff" style={{ marginLeft: '3px' }} />
                    )}
                  </button>

                  <div className="vinyl-ctrl-cluster">
                    {/* Skip Next */}
                    <button 
                      id="vinyl-btn-next"
                      className="vinyl-ctrl-btn" 
                      onClick={onNextTrack}
                      title="Next song"
                    >
                      <SkipForward size={20} />
                    </button>

                    {/* Repeat Mode */}
                    <button 
                      id="vinyl-btn-repeat"
                      className={`vinyl-ctrl-btn ${repeatMode !== 'off' ? 'is-active' : ''}`}
                      onClick={onToggleRepeat}
                      title={`Repeat mode: ${repeatMode}`}
                    >
                      {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button 
                      id="vinyl-btn-fullscreen"
                      className="vinyl-ctrl-btn" 
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Scene"}
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {/* Library Drawer Open */}
                    <button 
                      id="vinyl-btn-drawer"
                      className="vinyl-ctrl-btn" 
                      onClick={onOpenPlaylistDrawer}
                      title="Open full music catalog & playlist drawer"
                    >
                      <ListMusic size={19} />
                    </button>
                  </div>

                  {/* Volume Cluster */}
                  <div className="vinyl-volume-cluster">
                    <button 
                      className="vinyl-ctrl-btn" 
                      onClick={handleToggleMute}
                      title={isMuted || volume === 0 ? "Unmute" : "Mute"}
                      style={{ padding: '6px' }}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX size={17} />
                      ) : volume < 0.5 ? (
                        <Volume1 size={17} />
                      ) : (
                        <Volume2 size={17} />
                      )}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeSliderChange}
                      className="vinyl-volume-slider"
                      title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                  </div>
                </div>

              </div>

            </section>

            {/* ==========================================================================
               RIGHT COLUMN: MUSIC CATEGORIES & FAVORITE PLAYLISTS
               ========================================================================== */}
            <section className="vinyl-content-column" aria-label="Music Discovery and Playlists">
              
              {/* Categories Section */}
              <div className="vinyl-categories-section">
                <div className="vinyl-section-header">
                  <div className="vinyl-section-title-wrap">
                    <h2 className="vinyl-section-title">Music Categories</h2>
                  </div>

                  {/* Language Selection Section Beside Here in the Same Format */}
                  <div className="vinyl-lang-selection-section" aria-label="Language Selection">
                    <span className="vinyl-lang-header-label">LANGUAGES:</span>
                    <div className="vinyl-lang-pills-row" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeLanguages.length === 0}
                        className={`vinyl-category-pill vinyl-lang-pill ${activeLanguages.length === 0 ? 'is-active' : ''}`}
                        onClick={() => handleLanguageToggle('All')}
                        title="Show songs in all languages"
                      >
                        ALL
                      </button>
                      {LANGUAGES.map(lang => {
                        const isSelected = activeLanguages.some(l => l.toLowerCase() === lang.toLowerCase());
                        return (
                          <button
                            key={lang}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            className={`vinyl-category-pill vinyl-lang-pill ${isSelected ? 'is-active' : ''}`}
                            onClick={() => handleLanguageToggle(lang)}
                            title={`Filter by ${LANGUAGE_LABELS[lang] || lang}`}
                          >
                            {lang.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      className="vinyl-section-link"
                      onClick={onOpenPlaylistDrawer}
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      View all
                    </button>
                  </div>
                </div>

                {/* Horizontal Category Pills */}
                <div className="vinyl-categories-row" role="tablist">
                  {VINYL_CATEGORIES.map(category => {
                    const isSelected = activeCategory === category;
                    return (
                      <button
                        key={category}
                        role="tab"
                        aria-selected={isSelected}
                        className={`vinyl-category-pill ${isSelected ? 'is-active' : ''}`}
                        onClick={() => handleCategoryClick(category)}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                {/* Horizontal Featured Cards Carousel */}
                <div className="vinyl-cards-carousel">
                  {filteredCategoryTracks.length === 0 ? (
                    <div className="vinyl-cards-empty">
                      <span>No tracks found in this category & language.</span>
                      <button 
                        type="button"
                        className="vinyl-category-pill"
                        onClick={() => {
                          setActiveCategory('ALL');
                          handleLanguageToggle('All');
                        }}
                      >
                        RESET FILTERS
                      </button>
                    </div>
                  ) : (
                    filteredCategoryTracks.slice(0, 4).map(track => {
                      const isCardPlaying = currentTrack?.id === track.id && isPlaying;
                      const isCurrent = currentTrack?.id === track.id;

                      return (
                        <div 
                          key={track.id}
                          className="vinyl-track-card"
                          onClick={() => onSelectTrack?.(track, true)}
                          title={`Play "${track.title}" by ${track.artist}`}
                        >
                          <div className="vinyl-card-art-box">
                            <img 
                              src={track.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'} 
                              alt={track.title} 
                              className="vinyl-card-img" 
                              loading="lazy"
                            />
                            <div className="vinyl-card-play-overlay">
                              <div className="vinyl-card-play-circle">
                                {isCardPlaying ? (
                                  <Pause size={18} fill="#0d0d0f" />
                                ) : (
                                  <Play size={18} fill="#0d0d0f" style={{ marginLeft: '2px' }} />
                                )}
                              </div>
                            </div>
                            {isCurrent && (
                              <div className="vinyl-card-active-indicator">
                                {isPlaying ? 'PLAYING' : 'ACTIVE'}
                              </div>
                            )}
                          </div>

                          <div className="vinyl-card-meta">
                            <span className="vinyl-card-title">{track.title}</span>
                            <span className="vinyl-card-artist">by {track.artist}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Favorite Playlists Section */}
              <div className="vinyl-playlists-section">
                <div className="vinyl-section-header">
                  <h2 className="vinyl-section-title">
                    Favorite Playlists ({favoritePlaylists.length})
                  </h2>
                </div>

                {/* Playlist Rows */}
                <div className="vinyl-playlists-stack">
                  {favoritePlaylists.map(playlist => {
                    return (
                      <div 
                        key={playlist.id} 
                        className="vinyl-playlist-item"
                        onClick={onOpenPlaylistDrawer}
                        title={`Open ${playlist.title} in music library`}
                      >
                        <div className="vinyl-playlist-info-left">
                          <img 
                            src={playlist.image} 
                            alt={playlist.title} 
                            className="vinyl-playlist-thumb" 
                            loading="lazy"
                          />
                          <div className="vinyl-playlist-text">
                            <span className="vinyl-playlist-name">{playlist.title}</span>
                            <span className="vinyl-playlist-sub">{playlist.subtitle}</span>
                          </div>
                        </div>

                        {/* Circular Play Button */}
                        <button 
                          className="vinyl-playlist-play-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playlist.tracks && playlist.tracks.length > 0) {
                              onSelectTrack?.(playlist.tracks[0], true);
                            }
                          }}
                          title={`Play ${playlist.title}`}
                          aria-label={`Play ${playlist.title}`}
                        >
                          <Play size={16} fill="#0d0d0f" style={{ marginLeft: '2px' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
