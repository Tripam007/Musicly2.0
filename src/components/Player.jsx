import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
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
  Heart,
  Download
} from 'lucide-react';
import { playPeacefulLikeSound } from '../utils/audioSynth';

export default function Player({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  isShuffle,
  onToggleShuffle,
  repeatMode, // 'off' | 'all' | 'one'
  onToggleRepeat,
  isFavorite,
  onToggleFavorite,
  onTogglePlaylistDrawer,
  isDrawerOpen,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onOpenCoffeeModal,
  isCoffeeOpen = false,
  isAdmin = false,
  onOpenFeedbackModal,
  audioElement = null,
  onDownloadTrack,
  user,
  onOpenAuthModal,
  children
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const likeTimeoutRef = useRef(null);
  const progressTrackRef = useRef(null);

  useEffect(() => {
    return () => {
      if (likeTimeoutRef.current) clearTimeout(likeTimeoutRef.current);
    };
  }, []);

  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [dragPercent, setDragPercent] = useState(null);
  const activePercent = dragPercent !== null ? dragPercent : (duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0);
  const progressPercent = activePercent;

  const isDraggingRef = useRef(false);
  const lastClientXRef = useRef(0);

  const calculateSeekFromEvent = useCallback((e) => {
    if (!progressTrackRef.current || !duration) return 0;
    const rect = progressTrackRef.current.getBoundingClientRect();
    let clientX = e?.clientX;
    if (clientX === undefined || clientX === null) {
      if (e?.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if (e?.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
      } else {
        clientX = lastClientXRef.current || 0;
      }
    }
    lastClientXRef.current = clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    return ratio * duration;
  }, [duration]);

  const handlePointerDown = (e) => {
    // Only primary button (left mouse click or touch)
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsHoveringProgress(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const targetTime = calculateSeekFromEvent(e);
    if (duration > 0) {
      const pos = Math.max(0, Math.min(1, targetTime / duration));
      setDragPercent(pos * 100);
      setHoverPosition(pos * 100);
      setHoverTime(targetTime);
    }

    // Immediately seek & play from clicked or held position
    if (onSeek) {
      onSeek(targetTime);
    }
  };

  const handlePointerMove = (e) => {
    if (!progressTrackRef.current || !duration) return;
    const targetTime = calculateSeekFromEvent(e);
    const pos = Math.max(0, Math.min(1, targetTime / duration));
    setHoverPosition(pos * 100);
    setHoverTime(targetTime);

    if (isDraggingRef.current) {
      setDragPercent(pos * 100);
    }
  };

  const handlePointerUp = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);

      try {
        if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      const finalTime = calculateSeekFromEvent(e);
      setDragPercent(null);
      if (onSeek) {
        onSeek(finalTime);
      }

      // If mouse released outside the hit area, hide tooltip immediately
      if (progressTrackRef.current) {
        const rect = progressTrackRef.current.getBoundingClientRect();
        const clientX = e?.clientX !== undefined ? e.clientX : (lastClientXRef.current || 0);
        const clientY = e?.clientY !== undefined ? e.clientY : 0;
        const isInside = 
          clientX >= rect.left && 
          clientX <= rect.right && 
          clientY >= rect.top && 
          clientY <= rect.bottom;
        if (!isInside) {
          setIsHoveringProgress(false);
        }
      }
    }
  };

  // Global safety release: catches pointerup, mouseup, touchend anywhere on window
  useEffect(() => {
    const handleGlobalRelease = (e) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setIsHoveringProgress(false);
        const finalTime = calculateSeekFromEvent(e);
        setDragPercent(null);
        if (onSeek) {
          onSeek(finalTime);
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setIsHoveringProgress(false);
        setDragPercent(null);
      }
    });

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [calculateSeekFromEvent, onSeek]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.85);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const handleFavoriteClick = () => {
    const willBeFav = !isFavorite;
    onToggleFavorite();
    if (willBeFav) {
      playPeacefulLikeSound();
      setJustLiked(true);
      if (likeTimeoutRef.current) clearTimeout(likeTimeoutRef.current);
      likeTimeoutRef.current = setTimeout(() => {
        setJustLiked(false);
      }, 750);
    }
  };

  return (
    <div className="player-floating-wrapper">
      {/* Floating Library Popover rendered right beside the library button */}
      {children}

      <div className="player-glass-card">
        {/* Left: Album Artwork & Track Info */}
        <div className="player-track-info">
          <div className="album-art-wrapper">
            <img 
              src={currentTrack?.cover || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=200'} 
              alt={currentTrack?.title} 
              className={`album-art-img ${isPlaying ? 'pulse-art' : ''}`}
            />
            {isPlaying && <div className="art-glow-halo"></div>}
          </div>

          <div className="track-meta">
            <div className="now-playing-label">
              <span>NOW PLAYING</span>
              {(() => {
                let g = currentTrack?.genre;
                if (Array.isArray(currentTrack?.genres) && currentTrack.genres.length > 0) {
                  const clean = currentTrack.genres.filter(x => x && x.toLowerCase() !== 'custom');
                  if (clean.length > 0) g = clean.join(', ');
                }
                if (g && g.toLowerCase() === 'custom') g = 'Lo-Fi';
                return g ? <span className="track-genre-tag">{g}</span> : null;
              })()}
            </div>
            <h3 className="track-title" title={currentTrack?.title}>
              {currentTrack?.title || 'No Track Selected'}
            </h3>
            <p className="track-artist">
              {currentTrack?.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Favorite Heart Button with Minimal Aesthetic Zen Animation */}
          <button 
            id="btn-favorite"
            className={`favorite-btn ${isFavorite ? 'is-fav' : ''} ${justLiked ? 'just-liked' : ''}`} 
            onClick={handleFavoriteClick}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {justLiked && (
              <span className="minimal-like-aura" aria-hidden="true">
                <span className="zen-ripple-ring" />
                <span className="zen-glow-bloom" />
                <span className="zen-sparkle s-1" />
                <span className="zen-sparkle s-2" />
                <span className="zen-sparkle s-3" />
              </span>
            )}
            <Heart 
              size={18} 
              className={`heart-icon ${justLiked ? 'heart-zen-pulse' : ''}`}
              fill={isFavorite ? '#ff4b60' : 'transparent'} 
              color={isFavorite ? '#ff4b60' : 'rgba(255,255,255,0.7)'} 
            />
          </button>

          {/* Quick Download Button */}
          {onDownloadTrack && currentTrack && (
            <button
              id="btn-player-quick-download"
              className="ctrl-icon-btn player-download-btn"
              onClick={() => {
                if (!user || user.isAnonymous) {
                  if (onOpenAuthModal) onOpenAuthModal();
                  return;
                }
                onDownloadTrack(currentTrack);
              }}
              title={(!user || user.isAnonymous) ? "Sign in to download songs (.mp3)" : "Download this song (.mp3)"}
              aria-label="Download this song (.mp3)"
            >
              <Download size={18} />
            </button>
          )}
        </div>

        {/* Center: Controls & Scrubbing Progress Bar */}
        <div className="player-center-controls">
          {/* Main playback control buttons */}
          <div className="playback-buttons-row">
            {/* Shuffle */}
            <button 
              id="btn-shuffle"
              className={`ctrl-icon-btn ${isShuffle ? 'active-ctrl' : ''}`} 
              onClick={onToggleShuffle}
              title={isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
            >
              <Shuffle size={18} />
            </button>

            {/* Previous */}
            <button 
              id="btn-prev"
              className="ctrl-icon-btn" 
              onClick={onPrevTrack}
              title="Previous Track"
            >
              <SkipBack size={20} />
            </button>

            {/* Glowing Play / Pause Primary Button */}
            <button 
              id="btn-play-pause"
              className={`primary-play-btn ${isPlaying ? 'is-playing' : ''}`} 
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="play-icon-offset" />}
            </button>

            {/* Next */}
            <button 
              id="btn-next"
              className="ctrl-icon-btn" 
              onClick={onNextTrack}
              title="Next Track"
            >
              <SkipForward size={20} />
            </button>

            {/* Repeat Mode (off / all / one) */}
            <button 
              id="btn-repeat"
              className={`ctrl-icon-btn ${repeatMode !== 'off' ? 'active-ctrl' : ''}`} 
              onClick={onToggleRepeat}
              title={`Repeat: ${repeatMode.toUpperCase()}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={19} /> : <Repeat size={18} />}
            </button>
          </div>

          {/* Standard Scrubbing Progress Bar */}
          <div className="progress-bar-container">
            <span className="time-display time-current">{formatSeconds(currentTime)}</span>
            <div 
              className="progress-hit-area"
              ref={progressTrackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={(e) => {
                const finalTime = calculateSeekFromEvent(e);
                if (onSeek) onSeek(finalTime);
              }}
              onMouseEnter={() => setIsHoveringProgress(true)}
              onMouseLeave={() => {
                if (!isDraggingRef.current) {
                  setIsHoveringProgress(false);
                }
              }}
            >
              <div className="progress-track">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="progress-thumb" />
                </div>
                {(isHoveringProgress || isDragging) && duration > 0 && (
                  <div 
                    className="seek-tooltip"
                    style={{ left: `${isDragging ? progressPercent : hoverPosition}%` }}
                  >
                    {formatSeconds(isDragging ? (progressPercent / 100) * duration : hoverTime)}
                  </div>
                )}
              </div>
            </div>
            <span className="time-display time-total">{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Playlist Drawer Toggle */}
        <div className="player-right-section">

          {/* Volume Control */}
          <div className="volume-control-wrapper">
            <button 
              id="btn-mute-toggle"
              className="ctrl-icon-btn vol-btn" 
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={19} />
              ) : volume < 0.5 ? (
                <Volume1 size={19} />
              ) : (
                <Volume2 size={19} />
              )}
            </button>

            <input 
              id="volume-slider"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                setIsMuted(false);
                onVolumeChange(parseFloat(e.target.value));
              }}
              className="volume-slider"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Playlist Drawer Button */}
          <button 
            id="btn-playlist-toggle"
            className={`ctrl-icon-btn drawer-btn ${isDrawerOpen ? 'active-ctrl' : ''}`}
            onClick={onTogglePlaylistDrawer}
            title="Open Playlist / Library"
          >
            <ListMusic size={21} />
          </button>
        </div>
      </div>

      {/* ☕ Steaming Coffee Cup in accordance with the Player Box */}
      {onOpenCoffeeModal && (
        <button
          id="btn-realistic-coffee-corner"
          className={`corner-coffee-cup-btn ${isCoffeeOpen ? 'cup-active' : ''} ${isAdmin ? 'admin-coffee-cup' : ''}`}
          onClick={onOpenCoffeeModal}
          title={isAdmin ? "Coffee Earnings & Received Ledger ☕" : "Buy me a coffee ☕"}
          aria-label={isAdmin ? "Coffee Earnings & Received Ledger ☕" : "Buy me a coffee ☕"}
        >
          <div className="realistic-cup-container">
            {/* Realistic smoking steam animation rising from cup */}
            <div className="cup-smoke-stream" aria-hidden="true">
              <span className="cup-smoke-wisp wisp-1"></span>
              <span className="cup-smoke-wisp wisp-2"></span>
              <span className="cup-smoke-wisp wisp-3"></span>
              <span className="cup-smoke-wisp wisp-4"></span>
            </div>
            <img 
              src="/assets/images/coffee_cup_real.jpg" 
              alt="Realistic Steaming Coffee Cup" 
              className="borderless-coffee-img" 
            />
          </div>
        </button>
      )}
    </div>
  );
}
