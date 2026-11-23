import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Grid, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Mic, 
  Plus, 
  Share2, 
  Copy, 
  Layers, 
  Paperclip, 
  Heart, 
  User, 
  Maximize2, 
  MoreHorizontal, 
  MapPin, 
  Play, 
  Pause, 
  Volume2, 
  Music,
  Lock,
  Sparkles,
  Compass
} from 'lucide-react';
import '../styles/visionSpatialGallery.css';

// Clean track title (strip ugly pipe separators or redundant brackets)
const cleanTitle = (rawTitle) => {
  if (!rawTitle) return 'Untitled Track';
  let t = rawTitle.split('|')[0].trim();
  t = t.replace(/\s*[-–—:~]\s*$/, '').trim();
  t = t.replace(/\s*[\(\[]\s*(official\s*)?(audio|music\s*video|video|lyrics?|hd|4k|cover|acoustic|visualizer)\s*[\)\]]/gi, '').trim();
  return t || rawTitle;
};

// Format duration in seconds
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '3:15';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Evocative description generator for cards (matching the Rome Explorer aesthetic)
const getTrackDescription = (track) => {
  if (track?.description && track.description.length > 20) {
    return track.description;
  }
  const genre = (track?.genre || track?.genres?.[0] || 'Acoustic').toLowerCase();
  const artist = track?.artist || 'Musicly Artist';
  
  if (genre.includes('country') || genre.includes('americana')) {
    return `An iconic acoustic anthem crafted by ${artist}. Resonating with open highways, nostalgic mountain air, and heartfelt storytelling recorded in pure warm analog harmonic fidelity.`;
  }
  if (genre.includes('indie') || genre.includes('folk')) {
    return `A tender sanctuary of melody and delicate acoustic strings by ${artist}. Evoking quiet rainy mornings, thoughtful solitude, and timeless poetry for the wandering soul.`;
  }
  if (genre.includes('lofi') || genre.includes('lo-fi') || genre.includes('chill')) {
    return `A soothing harmonic tapestry of gentle vinyl flutter and tape warmth by ${artist}. Sculpted for deep focus, peaceful twilight relaxation, and midnight introspection.`;
  }
  if (genre.includes('retro') || genre.includes('classic') || genre.includes('vintage')) {
    return `A golden vintage treasure remastered in pristine spatial depth. Featuring the timeless expressive vocal warmth of ${artist} that defined an unforgettable era of sound.`;
  }
  if (genre.includes('ghazal') || genre.includes('sufi')) {
    return `A profound poetic voyage through love, longing, and transcendental harmony. Performed with masterly emotional depth by ${artist} in rich acoustic resonance.`;
  }
  return `An iconic musical composition by ${artist}. Mastered in ultra-high fidelity for Musicly's spatial acoustic sanctuary, inviting listeners into deep calm and sonic presence.`;
};

export default function VisionSpatialGallery({
  tracks = [],
  currentTrack = null,
  isPlaying = false,
  onSelectTrack,
  onTogglePlay,
  onClose,
  favorites = [],
  onToggleFavorite,
  user = null,
  isAdmin = false,
  onOpenAuthModal
}) {
  // Filter active songs pool
  const songPool = useMemo(() => {
    if (!Array.isArray(tracks) || tracks.length === 0) return [];
    // Dedup and prioritize playable tracks
    return tracks.filter(t => t && t.title);
  }, [tracks]);

  // Find initial active index matching currentTrack if playing
  const initialIndex = useMemo(() => {
    if (!currentTrack || songPool.length === 0) return 0;
    const found = songPool.findIndex(t => t.id === currentTrack.id);
    return found !== -1 ? found : 0;
  }, [currentTrack, songPool]);

  const [activeSpatialIndex, setActiveSpatialIndex] = useState(initialIndex);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef(null);

  // Sync activeSpatialIndex when currentTrack changes externally (e.g. from background queue)
  useEffect(() => {
    if (currentTrack && songPool.length > 0) {
      const idx = songPool.findIndex(t => t.id === currentTrack.id);
      if (idx !== -1 && idx !== activeSpatialIndex) {
        setActiveSpatialIndex(idx);
      }
    }
  }, [currentTrack, songPool]);

  // Show Toast helper
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Filtered tracks when user searches
  const displaySongs = useMemo(() => {
    if (!searchQuery.trim()) return songPool;
    const q = searchQuery.toLowerCase();
    return songPool.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) || 
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.genre && t.genre.toLowerCase().includes(q))
    );
  }, [songPool, searchQuery]);

  const totalSongs = displaySongs.length || 1;
  const safeActiveIndex = Math.max(0, Math.min(activeSpatialIndex, totalSongs - 1));
  const activeTrack = displaySongs[safeActiveIndex] || songPool[0] || {};
  const isCurrentActivePlaying = isPlaying && currentTrack?.id === activeTrack?.id;
  const isFavorite = (favorites || []).includes(activeTrack?.id);

  // Shift to Next / Prev card
  const handleShiftNext = useCallback(() => {
    setActiveSpatialIndex(prev => (prev + 1) % totalSongs);
  }, [totalSongs]);

  const handleShiftPrev = useCallback(() => {
    setActiveSpatialIndex(prev => (prev - 1 + totalSongs) % totalSongs);
  }, [totalSongs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        handleShiftNext();
      } else if (e.key === 'ArrowLeft') {
        handleShiftPrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (onTogglePlay) onTogglePlay();
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShiftNext, handleShiftPrev, onTogglePlay, onClose]);

  // Touch and Mouse Drag / Swipe Handlers
  const dragStartXRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    dragStartXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handlePointerUp = (e) => {
    if (dragStartXRef.current !== null) {
      const diffX = e.clientX - dragStartXRef.current;
      if (Math.abs(diffX) > 40) {
        if (diffX < 0) {
          handleShiftNext();
        } else {
          handleShiftPrev();
        }
      }
    }
    dragStartXRef.current = null;
    setIsDragging(false);
  };

  // Mouse wheel scroll to shift
  const lastWheelTimeRef = useRef(0);
  const handleWheel = (e) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 280) return;
    if (Math.abs(e.deltaX) > 25 || Math.abs(e.deltaY) > 30) {
      lastWheelTimeRef.current = now;
      if (e.deltaX > 0 || e.deltaY > 0) {
        handleShiftNext();
      } else {
        handleShiftPrev();
      }
    }
  };

  // 3D Spatial Cylinder Card Transform calculations
  const getCardTransform = (diff) => {
    // Distance from center
    const d = diff;
    if (d === 0) {
      return {
        x: 0,
        z: 80,
        rotateY: 0,
        scale: 1.08,
        opacity: 1,
        zIndex: 25
      };
    }
    // Left side cards
    if (d === -1) {
      return {
        x: -360,
        z: -90,
        rotateY: 25,
        scale: 0.88,
        opacity: 0.85,
        zIndex: 20
      };
    }
    if (d === -2) {
      return {
        x: -680,
        z: -270,
        rotateY: 46,
        scale: 0.74,
        opacity: 0.58,
        zIndex: 15
      };
    }
    if (d <= -3) {
      return {
        x: -960,
        z: -480,
        rotateY: 58,
        scale: 0.60,
        opacity: 0,
        zIndex: 5
      };
    }
    // Right side cards
    if (d === 1) {
      return {
        x: 360,
        z: -90,
        rotateY: -25,
        scale: 0.88,
        opacity: 0.85,
        zIndex: 20
      };
    }
    if (d === 2) {
      return {
        x: 680,
        z: -270,
        rotateY: -46,
        scale: 0.74,
        opacity: 0.58,
        zIndex: 15
      };
    }
    return {
      x: 960,
      z: -480,
      rotateY: -58,
      scale: 0.60,
      opacity: 0,
      zIndex: 5
    };
  };

  // Click card action
  const handleCardClick = (song, index, isCenter) => {
    if (!isCenter) {
      setActiveSpatialIndex(index);
    } else {
      // If center, toggle playback
      if (currentTrack?.id === song.id) {
        if (onTogglePlay) onTogglePlay();
      } else {
        if (onSelectTrack) onSelectTrack(song);
      }
    }
  };

  // Copy share link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(`Link copied: ${cleanTitle(activeTrack.title)}`);
    } else {
      showToast('Sharing track...');
    }
  };

  return (
    <div 
      className="vision-spatial-viewport"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      role="region"
      aria-label="Apple Vision Pro Spatial 3D Music Explorer"
    >
      {/* Ambient Scrim Backdrop */}
      <div className="vision-spatial-scrim" />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="vision-toast" role="status">
          {toastMsg}
        </div>
      )}

      {/* =====================================================================
          1. TOP FLOATING FROSTED GLASS CAPSULE BAR (VisionOS Window Chrome)
         ===================================================================== */}
      <header className="vision-top-capsule-bar" onPointerDown={e => e.stopPropagation()}>
        {/* 9-dot Grid Menu */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={() => showToast('Musicly Spatial Library')}
          title="Browse All Collections"
        >
          <Grid size={17} />
        </button>

        {/* Previous Chevron */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={handleShiftPrev}
          title="Previous Track (Left Arrow)"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Next Chevron */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={handleShiftNext}
          title="Next Track (Right Arrow)"
        >
          <ChevronRight size={18} />
        </button>

        {/* Font / View Mode 'aA' */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={() => showToast('Spatial Typography View: Active')}
          title="View Mode"
        >
          <span className="vision-bar-btn-text">aA</span>
        </button>

        {/* Center Search / Location Pill */}
        <div 
          className="vision-bar-center-pill"
          onClick={() => setIsSearching(true)}
        >
          <Lock size={12} style={{ opacity: 0.65, flexShrink: 0 }} />
          {isSearching ? (
            <input
              type="text"
              autoFocus
              className="vision-bar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => {
                if (!searchQuery) setIsSearching(false);
              }}
              placeholder="Search spatial tracks..."
            />
          ) : (
            <span className="vision-bar-pill-text">
              {searchQuery ? `Searching: "${searchQuery}"` : 'Musicly Explorer'}
            </span>
          )}
        </div>

        {/* Microphone */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={() => showToast('Voice AI: Ready')}
          title="Voice Search"
        >
          <Mic size={17} />
        </button>

        {/* Add (+) */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={() => {
            if (onToggleFavorite) onToggleFavorite(activeTrack?.id);
            showToast(isFavorite ? 'Removed from Sanctuary' : 'Saved to Sanctuary');
          }}
          title="Add to Sanctuary"
        >
          <Plus size={17} />
        </button>

        {/* Share */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={handleShare}
          title="Share Song"
        >
          <Share2 size={16} />
        </button>

        {/* Shift back to Classic Mode */}
        <button 
          type="button" 
          className="vision-bar-btn"
          onClick={onClose}
          title="Shift back to Classic Vibe Carousel"
        >
          <Layers size={17} />
        </button>
      </header>

      {/* =====================================================================
          2. LEFT FLOATING VERTICAL MINI DOCK
         ===================================================================== */}
      <aside className="vision-left-floating-dock" onPointerDown={e => e.stopPropagation()}>
        {/* Paperclip / Pin link */}
        <button 
          type="button" 
          className="vision-dock-btn"
          onClick={handleShare}
          title="Copy Track Audio Link"
        >
          <Paperclip size={16} />
        </button>

        {/* Heart Favorite */}
        <button 
          type="button" 
          className={`vision-dock-btn ${isFavorite ? 'is-active' : ''}`}
          onClick={() => {
            if (onToggleFavorite) onToggleFavorite(activeTrack?.id);
            showToast(isFavorite ? 'Removed from Favorites' : 'Added to Favorites');
          }}
          title={isFavorite ? "Favorited" : "Favorite this track"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {/* User Profile */}
        <button 
          type="button" 
          className="vision-dock-btn"
          onClick={() => {
            if (!user && onOpenAuthModal) onOpenAuthModal();
            else showToast(user?.displayName ? `Signed in as ${user.displayName}` : 'Musicly Guest');
          }}
          title={user?.displayName || "Profile / Sign In"}
        >
          <User size={16} />
        </button>
      </aside>

      {/* =====================================================================
          3. SPATIAL 3D CURVED FANNED CAROUSEL STAGE
         ===================================================================== */}
      <main className={`vision-spatial-stage ${isDragging ? 'is-dragging' : ''}`}>
        <div className="vision-cards-cylinder">
          {displaySongs.map((song, index) => {
            let diff = index - safeActiveIndex;
            // Handle wrap around for smooth infinite carousel
            if (diff > totalSongs / 2) diff -= totalSongs;
            if (diff < -totalSongs / 2) diff += totalSongs;

            // Only render cards within distance 2 for top performance
            if (Math.abs(diff) > 2) return null;

            const isCenter = diff === 0;
            const { x, z, rotateY, scale, opacity, zIndex } = getCardTransform(diff);
            const coverArt = song.cover || '/assets/images/lofi_scene.jpg';
            const title = cleanTitle(song.title);
            const artist = song.artist || 'Musicly Artist';
            const durationText = formatDuration(song.duration);
            const genre = song.genre || 'Acoustic Americana';

            return (
              <div 
                key={song.id || index}
                className={`vision-card-slot ${isCenter ? 'is-center' : ''}`}
                style={{
                  transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity: opacity,
                  zIndex: zIndex
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(song, index, isCenter);
                }}
              >
                <div className="vision-glass-card">
                  {/* Card Artwork Image (Top 60%) */}
                  <div className="vision-card-art-box">
                    <img 
                      src={coverArt} 
                      alt={title} 
                      className="vision-card-art-img" 
                      loading="eager"
                    />
                    <div className="vision-card-art-gradient" />

                    {/* Top Action Pills (Rendered on Center Card like in image) */}
                    {isCenter && (
                      <div className="vision-card-top-badges" onPointerDown={e => e.stopPropagation()}>
                        <button 
                          type="button" 
                          className="vision-card-pill-btn"
                          onClick={() => {
                            if (currentTrack?.id === song.id) {
                              if (onTogglePlay) onTogglePlay();
                            } else {
                              if (onSelectTrack) onSelectTrack(song);
                            }
                          }}
                          title={isCurrentActivePlaying ? "Pause Track" : "Play Track"}
                        >
                          {isCurrentActivePlaying ? (
                            <>
                              <Pause size={12} fill="currentColor" />
                              <span>Playing</span>
                            </>
                          ) : (
                            <>
                              <Play size={12} fill="currentColor" />
                              <span>Play</span>
                            </>
                          )}
                        </button>

                        <button 
                          type="button" 
                          className="vision-card-circle-btn"
                          onClick={() => showToast(`Curated by Musicly: ${title}`)}
                          title="More Details"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Content: Distinct between Center vs Flanking Cards */}
                  {isCenter ? (
                    <div className="vision-card-content">
                      <div className="vision-card-header-row">
                        <h2 className="vision-card-title" title={title}>
                          {title}
                        </h2>
                        <span className="vision-card-index">
                          {`${safeActiveIndex + 1} / ${totalSongs}`}
                        </span>
                      </div>

                      <p className="vision-card-description">
                        {getTrackDescription(song)}
                      </p>

                      <div className="vision-card-meta-row">
                        <MapPin size={12} className="vision-card-meta-icon" />
                        <span>
                          {`Musicly Sanctuary • ${artist} • ${durationText} • Lossless Audio • 44.1 kHz`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Flanking Cards Display Elegant Bottom Title & Subtitle */
                    <div className="vision-side-card-overlay">
                      <h3 className="vision-side-title">{title}</h3>
                      <p className="vision-side-subtitle">{artist}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* =====================================================================
          4. TABLE SURFACE SPECULAR REFLECTION
         ===================================================================== */}
      <div className="vision-table-reflection-stage" aria-hidden="true">
        <div className="vision-reflection-card">
          <img 
            src={activeTrack.cover || '/assets/images/lofi_scene.jpg'} 
            alt="" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div className="vision-table-surface-sheen" />
      </div>

      {/* =====================================================================
          5. BOTTOM FLOATING FROSTED GLASS DOCK & PAGINATION
         ===================================================================== */}
      <footer className="vision-bottom-dock-wrapper" onPointerDown={e => e.stopPropagation()}>
        <nav className="vision-bottom-dock" aria-label="Playback Controller">
          {/* Left Arrow */}
          <button 
            type="button" 
            className="vision-dock-arrow-btn"
            onClick={handleShiftPrev}
            title="Shift to Previous Song"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Circular Thumbnail with Rotation when Playing */}
          <div 
            className="vision-dock-thumb-wrap"
            onClick={() => {
              if (currentTrack?.id === activeTrack.id) {
                if (onTogglePlay) onTogglePlay();
              } else {
                if (onSelectTrack) onSelectTrack(activeTrack);
              }
            }}
            title={isCurrentActivePlaying ? "Pause Audio" : "Play Audio"}
          >
            <img 
              src={activeTrack.cover || '/assets/images/lofi_scene.jpg'} 
              alt={activeTrack.title} 
              className={`vision-dock-thumb-img ${isCurrentActivePlaying ? 'is-spinning' : ''}`}
            />
          </div>

          {/* Track Title & Subtitle */}
          <div 
            className="vision-dock-track-info"
            onClick={() => {
              if (currentTrack?.id === activeTrack.id) {
                if (onTogglePlay) onTogglePlay();
              } else {
                if (onSelectTrack) onSelectTrack(activeTrack);
              }
            }}
          >
            <span className="vision-dock-title">
              {cleanTitle(activeTrack.title)}
            </span>
            <span className="vision-dock-subtitle">
              {`${activeTrack.artist || 'Musicly Artist'} • ${formatDuration(activeTrack.duration)}`}
            </span>
          </div>

          {/* Favorite Heart */}
          <button 
            type="button" 
            className={`vision-dock-heart-btn ${isFavorite ? 'is-active' : ''}`}
            onClick={() => {
              if (onToggleFavorite) onToggleFavorite(activeTrack.id);
              showToast(isFavorite ? 'Removed from Sanctuary' : 'Saved to Sanctuary');
            }}
            title={isFavorite ? "In Sanctuary" : "Save to Sanctuary"}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {/* Right Arrow */}
          <button 
            type="button" 
            className="vision-dock-arrow-btn"
            onClick={handleShiftNext}
            title="Shift to Next Song"
          >
            <ChevronRight size={16} />
          </button>
        </nav>

        {/* Pagination Dots (Showing 7 active window dots) */}
        <div className="vision-pagination-dots" role="tablist">
          {displaySongs.slice(0, Math.min(7, totalSongs)).map((_, i) => (
            <button 
              key={i}
              type="button"
              className={`vision-dot ${i === (safeActiveIndex % Math.min(7, totalSongs)) ? 'is-active' : ''}`}
              onClick={() => setActiveSpatialIndex(i)}
              title={`Jump to Track ${i + 1}`}
              aria-label={`Jump to Track ${i + 1}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
