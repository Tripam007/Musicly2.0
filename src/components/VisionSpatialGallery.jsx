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
  Compass,
  X
} from 'lucide-react';
import { getUniqueSongQuote } from '../utils/songQuoteGenerator';
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
  onOpenAuthModal,
  voiceManager = null,
  onOpenPlaylistDrawer = null
}) {
  // Preload and monitor background image load state to eliminate glitches & seams
  const [bgLoaded, setBgLoaded] = useState(false);
  useEffect(() => {
    const img = new window.Image();
    img.src = '/assets/images/vision_spatial_room_bg.jpg';
    if (img.complete) {
      setBgLoaded(true);
    } else {
      img.onload = () => setBgLoaded(true);
      img.onerror = () => setBgLoaded(true);
    }
  }, []);

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
  const searchInputRef = useRef(null);

  // Monitor voice AI manager state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  useEffect(() => {
    if (!voiceManager) return;
    const unsub = voiceManager.subscribe((payload) => {
      setIsVoiceActive(payload?.state !== 'IDLE');
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [voiceManager]);

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

  // Dynamic Quote Counter to support manual refresh on click as well as per-song unique rotation
  const [quoteRefreshCount, setQuoteRefreshCount] = useState(0);

  // Dynamic Quote: unique to this exact song, and different every time
  const activeQuote = useMemo(() => {
    return getUniqueSongQuote(activeTrack);
  }, [activeTrack?.id, activeTrack?.title, quoteRefreshCount]);

  // Shift to Next / Prev card - ONLY updates carousel position for smooth browsing
  // Never auto-plays until user explicitly clicks the card or play button
  const handleShiftNext = useCallback(() => {
    setActiveSpatialIndex(prev => (prev + 1) % totalSongs);
  }, [totalSongs]);

  const handleShiftPrev = useCallback(() => {
    setActiveSpatialIndex(prev => (prev - 1 + totalSongs) % totalSongs);
  }, [totalSongs]);

  // Grid / Library drawer trigger
  const handleGridClick = () => {
    if (onOpenPlaylistDrawer) {
      onOpenPlaylistDrawer();
    } else {
      showToast('Browse All Collections');
    }
  };

  // Microphone / Voice AI trigger
  const handleMicClick = () => {
    if (voiceManager) {
      const active = voiceManager.toggle();
      showToast(active ? 'Voice AI: Listening for commands...' : 'Voice AI: Stopped');
    } else {
      showToast('Voice AI: Ready (Say "Hey Musicly")');
    }
  };

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

  // 3D Spatial Cylinder Card Transform calculations - Compact & perfectly proportioned with zero overlap
  const getCardTransform = (diff) => {
    // Distance from center
    const d = diff;
    if (d === 0) {
      return {
        x: 0,
        z: 70,
        rotateY: 0,
        scale: 1.05,
        opacity: 1,
        zIndex: 25
      };
    }
    // Left side cards
    if (d === -1) {
      return {
        x: -300,
        z: -110,
        rotateY: 26,
        scale: 0.86,
        opacity: 0.88,
        zIndex: 20
      };
    }
    if (d === -2) {
      return {
        x: -560,
        z: -250,
        rotateY: 46,
        scale: 0.72,
        opacity: 0.55,
        zIndex: 15
      };
    }
    if (d <= -3) {
      return {
        x: -780,
        z: -420,
        rotateY: 60,
        scale: 0.60,
        opacity: 0,
        zIndex: 5
      };
    }
    // Right side cards
    if (d === 1) {
      return {
        x: 300,
        z: -110,
        rotateY: -26,
        scale: 0.86,
        opacity: 0.88,
        zIndex: 20
      };
    }
    if (d === 2) {
      return {
        x: 560,
        z: -250,
        rotateY: -46,
        scale: 0.72,
        opacity: 0.55,
        zIndex: 15
      };
    }
    return {
      x: 780,
      z: -420,
      rotateY: -60,
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
      {/* Photo-Realistic Luxury Living Room Room Backdrop from user reference */}
      <div className={`vision-spatial-bg-layer ${bgLoaded ? 'is-loaded' : ''}`} />
      <div className="vision-spatial-scrim" />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="vision-toast" role="status">
          {toastMsg}
        </div>
      )}

      {/* =====================================================================
          1. TOP FLOATING NAVIGATION BAR: FLANKING PLAIN ICONS & CENTER SEARCH BAR
         ===================================================================== */}
      <header className="vision-top-nav-bar" onPointerDown={e => e.stopPropagation()}>
        {/* Left Side Plain Icons (No boxes) */}
        <div className="vision-nav-side-group vision-nav-left-group">
          <button 
            type="button" 
            className="vision-plain-icon-btn"
            onClick={handleGridClick}
            title="Browse All Collections & Playlists"
          >
            <Grid size={18} />
          </button>

          <button 
            type="button" 
            className="vision-plain-icon-btn"
            onClick={handleShiftPrev}
            title="Previous Track (Left Arrow)"
          >
            <ChevronLeft size={20} />
          </button>

          <button 
            type="button" 
            className="vision-plain-icon-btn"
            onClick={handleShiftNext}
            title="Next Track (Right Arrow)"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Center: The Entire Bar IS the Search Box */}
        <div 
          className={`vision-search-box-bar ${isSearching || searchQuery ? 'is-active' : ''}`}
          onClick={() => {
            setIsSearching(true);
            searchInputRef.current?.focus();
          }}
        >
          <Search size={15} className="vision-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="vision-search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveSpatialIndex(0);
            }}
            onFocus={() => setIsSearching(true)}
            onBlur={() => {
              if (!searchQuery) setIsSearching(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (activeTrack && onSelectTrack) {
                  onSelectTrack(activeTrack);
                  showToast(`Playing: ${cleanTitle(activeTrack.title)}`);
                }
              } else if (e.key === 'Escape') {
                setSearchQuery('');
                setIsSearching(false);
              }
            }}
            placeholder="Search spatial tracks, artists, vibes..."
          />
          {searchQuery ? (
            <button
              type="button"
              className="vision-search-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                setActiveSpatialIndex(0);
                searchInputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <Lock size={12} className="vision-search-lock-icon" />
          )}
        </div>

        {/* Right Side Plain Icons (No boxes) */}
        <div className="vision-nav-side-group vision-nav-right-group">
          <button 
            type="button" 
            className={`vision-plain-icon-btn ${isVoiceActive ? 'is-voice-active' : ''}`}
            onClick={handleMicClick}
            title={isVoiceActive ? "Voice AI: Active" : "Voice AI Search & Control"}
          >
            <Mic size={18} />
          </button>

          <button 
            type="button" 
            className={`vision-plain-icon-btn ${isFavorite ? 'is-favorite-active' : ''}`}
            onClick={() => {
              if (onToggleFavorite) onToggleFavorite(activeTrack?.id);
              showToast(isFavorite ? 'Removed from Sanctuary' : 'Saved to Sanctuary');
            }}
            title={isFavorite ? "Remove from Sanctuary" : "Add to Sanctuary"}
          >
            <Plus size={19} />
          </button>

          <button 
            type="button" 
            className="vision-plain-icon-btn"
            onClick={onClose}
            title="Shift back to Classic Vibe Carousel"
          >
            <Layers size={18} />
          </button>
        </div>
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
                          onClick={(e) => {
                            e.stopPropagation();
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

                      <p 
                        className="vision-card-description is-interactive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuoteRefreshCount(prev => prev + 1);
                        }}
                        title="Click to discover another unique reflection for this song"
                      >
                        {activeQuote}
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
