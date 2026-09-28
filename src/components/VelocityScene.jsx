import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Heart, 
  Compass, 
  Sparkles,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  User,
  ExternalLink
} from 'lucide-react';

export default function VelocityScene({
  selectedGenre = 'Lo-Fi',
  allTracks = [],
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 180,
  volume = 0.85,
  onSeek,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  onOpenSceneModal,
  onOpenPlaylistDrawer,
  onOpenSearch,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenAuthModal,
  user,
  favorites = [],
  onToggleFavorite,
  onReturnToIntro,
  onOpenClassic,
  audioElement
}) {
  // Filter playlist by selected genre or curated discovery list
  const journeyTracks = useMemo(() => {
    if (!allTracks || allTracks.length === 0) return [];
    const genreLower = (selectedGenre || 'All').toLowerCase();
    
    let matched = allTracks.filter(t => {
      const g = (t.genre || '').toLowerCase();
      const arr = Array.isArray(t.genres) ? t.genres.map(x => x.toLowerCase()) : [];
      if (genreLower === 'all') return true;
      if (genreLower === 'chill / sleep' || genreLower === 'chill-sleep' || genreLower === 'chill/sleep') {
        return g.includes('chill') || g.includes('sleep') || arr.some(x => x.includes('chill') || x.includes('sleep'));
      }
      return g.includes(genreLower) || arr.includes(genreLower);
    });

    if (matched.length === 0) matched = allTracks;
    return matched;
  }, [allTracks, selectedGenre]);

  // Active track index within this journey
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = journeyTracks.findIndex(t => t.id === currentTrack?.id);
    return idx !== -1 ? idx : 0;
  });

  const activeSong = journeyTracks[currentIndex] || currentTrack || journeyTracks[0];

  const isFav = useMemo(() => {
    return Array.isArray(favorites) && activeSong && favorites.includes(activeSong.id);
  }, [favorites, activeSong]);

  // Switch song on wheel scroll
  useEffect(() => {
    let wheelAcc = 0;
    let timer = null;
    let lastTime = 0;

    const handleWheel = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      e.preventDefault();

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 24;
      else if (e.deltaMode === 2) delta *= window.innerHeight;

      const now = performance.now();
      wheelAcc += delta;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        wheelAcc = 0;
      }, 160);

      if (Math.abs(wheelAcc) >= 18 && (now - lastTime > 240)) {
        const dir = wheelAcc > 0 ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(journeyTracks.length - 1, currentIndex + dir));
        if (nextIdx !== currentIndex) {
          lastTime = now;
          wheelAcc = 0;
          setCurrentIndex(nextIdx);
          const song = journeyTracks[nextIdx];
          if (song && onSelectTrack) {
            onSelectTrack(song, isPlaying);
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (timer) clearTimeout(timer);
    };
  }, [journeyTracks, currentIndex, isPlaying, onSelectTrack]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIdx = Math.min(journeyTracks.length - 1, currentIndex + 1);
        setCurrentIndex(nextIdx);
        if (journeyTracks[nextIdx] && onSelectTrack) onSelectTrack(journeyTracks[nextIdx], isPlaying);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIdx = Math.max(0, currentIndex - 1);
        setCurrentIndex(prevIdx);
        if (journeyTracks[prevIdx] && onSelectTrack) onSelectTrack(journeyTracks[prevIdx], isPlaying);
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (onTogglePlay) onTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, journeyTracks, isPlaying, onSelectTrack, onTogglePlay]);

  // Format time
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  // Waveform direct scrubber
  const waveTrackRef = useRef(null);
  const handleWaveClick = (e) => {
    if (!waveTrackRef.current || !duration) return;
    const rect = waveTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (onSeek) onSeek(ratio * duration);
  };

  return (
    <div className="velocity-cinematic-stage">
      {/* 1. Full-Screen Race Car Background with Volumetric Tunnel Sunbeam Flare */}
      <div className="velocity-backdrop-canvas" aria-hidden="true">
        <img
          src="/assets/images/race_car_opening.jpg"
          alt="Race car speeding toward bright opening"
          className="velocity-backdrop-img"
        />

        {/* Volumetric Sunlight Atmosphere Scrim */}
        <div className="velocity-sunlight-bloom" />
        {/* Dark Tunnel Vignette & Edge Shadow */}
        <div className="velocity-vignette-scrim" />
        {/* Atmospheric Speed Light Streaks */}
        <div className="velocity-speed-streaks" />
      </div>

      {/* 2. Top Header Navigation (Floating Glass Typography) */}
      <header className="velocity-top-bar">
        <div className="velocity-brand-group">
          <span className="velocity-brand-name">MUSICLY</span>
          <span className="velocity-brand-dash" />
          <span className="velocity-genre-badge">{selectedGenre.toUpperCase()} JOURNEY</span>
        </div>

        <nav className="velocity-top-nav">
          {onOpenSceneModal && (
            <button className="velocity-nav-btn" onClick={onOpenSceneModal}>
              SCENES
            </button>
          )}
          {onOpenPlaylistDrawer && (
            <button className="velocity-nav-btn" onClick={onOpenPlaylistDrawer}>
              LIBRARY
            </button>
          )}
          {onOpenSearch && (
            <button className="velocity-nav-btn" onClick={onOpenSearch}>
              SEARCH
            </button>
          )}
          {onOpenAmbient && (
            <button 
              className={`velocity-nav-btn ${activeAmbientCount > 0 ? 'is-active' : ''}`} 
              onClick={onOpenAmbient}
            >
              AMBIENT{activeAmbientCount > 0 ? ` (${activeAmbientCount})` : ''}
            </button>
          )}
          {onReturnToIntro && (
            <button 
              className="velocity-nav-btn highlight-journey-btn" 
              onClick={onReturnToIntro}
              title="Choose another genre"
            >
              CHANGE JOURNEY
            </button>
          )}
          {onOpenClassic && (
            <button 
              className="velocity-nav-btn" 
              onClick={onOpenClassic}
              title="Switch to original Afterglow screen"
            >
              CLASSIC
            </button>
          )}
          {onOpenAuthModal && (
            <button 
              className="velocity-user-avatar-btn" 
              onClick={onOpenAuthModal}
              title={user && !user.isAnonymous ? (user.displayName || user.email) : 'Sign in / Profile'}
            >
              <div className="velocity-avatar-circle">
                <User size={13} strokeWidth={2} />
              </div>
              <span className="velocity-user-name">
                {user && !user.isAnonymous 
                  ? (user.displayName || (user.email ? user.email.split('@')[0] : 'USER'))
                  : 'USER'}
              </span>
            </button>
          )}
        </nav>
      </header>

      {/* 3. Main Floating Center Song Stage */}
      <main className="velocity-main-stage">
        {/* Journey Index Counter */}
        <div className="velocity-chapter-counter">
          <span className="current-song-num">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <span className="counter-slash">/</span>
          <span className="total-song-num">
            {String(journeyTracks.length).padStart(2, '0')}
          </span>
        </div>

        {/* Floating Song Identity (Title, Artist, Cover & Favorite) */}
        <div key={activeSong?.id || currentIndex} className="velocity-song-identity">
          <img
            src={activeSong?.cover || '/assets/images/vibe_card_01.jpg'}
            alt={activeSong?.title || 'Song'}
            className="velocity-song-cover"
          />
          <div className="velocity-song-meta">
            <h1 className="velocity-song-title">
              {activeSong?.title || 'Song'}
            </h1>
            <p className="velocity-song-artist">
              {activeSong?.artist || 'Artist'}
            </p>
          </div>
          <button
            className={`velocity-fav-btn ${isFav ? 'is-fav' : ''}`}
            onClick={() => onToggleFavorite && onToggleFavorite(activeSong?.id)}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={18}
              strokeWidth={1.8}
              fill={isFav ? '#fbbf24' : 'none'}
              color={isFav ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)'}
            />
          </button>
        </div>

        {/* Interactive Glowing Waveform Track Scrubber */}
        <div className="velocity-waveform-section">
          <span className="velocity-time-stamp time-left">
            {formatTime(currentTime)}
          </span>

          <div 
            className="velocity-waveform-track" 
            ref={waveTrackRef}
            onClick={handleWaveClick}
            title="Click to seek"
          >
            {/* Background Waveform Bars */}
            <div className="velocity-wave-bars-bg">
              {Array.from({ length: 48 }).map((_, i) => {
                const ratio = i / 48;
                const isPlayed = ratio <= progressRatio;
                // Height based on harmonic curve
                const barHeight = 6 + Math.sin(i * 0.38) * 14 + Math.cos(i * 0.72) * 8;
                return (
                  <span
                    key={i}
                    className={`wave-bar ${isPlayed ? 'is-played' : ''} ${isPlaying ? 'is-animating' : ''}`}
                    style={{
                      height: `${Math.max(6, barHeight)}px`,
                      animationDelay: `${(i * 0.05).toFixed(2)}s`
                    }}
                  />
                );
              })}
            </div>

            {/* Glowing Playhead Pin */}
            <div
              className="velocity-playhead-pin"
              style={{ left: `${(progressRatio * 100).toFixed(2)}%` }}
            >
              <div className="pin-halo" />
              <div className="pin-core" />
            </div>
          </div>

          <span className="velocity-time-stamp time-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Floating Minimal Transport Controls */}
        <div className="velocity-controls-row">
          <button
            className="velocity-ctrl-btn secondary"
            onClick={() => {
              const prevIdx = Math.max(0, currentIndex - 1);
              setCurrentIndex(prevIdx);
              if (journeyTracks[prevIdx] && onSelectTrack) onSelectTrack(journeyTracks[prevIdx], isPlaying);
            }}
            title="Previous Song (or Scroll Up)"
          >
            <SkipBack size={18} strokeWidth={1.8} />
          </button>

          <button
            className="velocity-ctrl-btn primary-play"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} fill="#0d111a" strokeWidth={0} />
            ) : (
              <Play size={20} fill="#0d111a" strokeWidth={0} style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            className="velocity-ctrl-btn secondary"
            onClick={() => {
              const nextIdx = Math.min(journeyTracks.length - 1, currentIndex + 1);
              setCurrentIndex(nextIdx);
              if (journeyTracks[nextIdx] && onSelectTrack) onSelectTrack(journeyTracks[nextIdx], isPlaying);
            }}
            title="Next Song (or Scroll Down)"
          >
            <SkipForward size={18} strokeWidth={1.8} />
          </button>
        </div>
      </main>

      {/* 4. Bottom Scroll Discovery Indicator */}
      <footer className="velocity-bottom-footer" aria-hidden="true">
        <span className="footer-label">SCROLL TO DISCOVER</span>
        <span className="footer-sublabel">TOWARDS THE OPENING</span>
      </footer>
    </div>
  );
}
