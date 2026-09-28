import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Home,
  Moon, 
  Trees, 
  CassetteTape, 
  Waves, 
  Mountain, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Play,
  Pause,
  Music,
  X,
  Volume2,
  Image as ImageIcon,
  Sliders,
  LogIn,
  LogOut,
  Crown,
  User as UserIcon,
  MoreHorizontal,
  Coffee,
  Search,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Sparkles,
  Lock
} from 'lucide-react';
import FloatingWaveformScrubber from './FloatingWaveformScrubber';

const LANGUAGE_OPTIONS = [
  { id: 'English', label: 'English', native: null, icon: null },
  { id: 'Hindi', label: 'Hindi', native: 'हिंदी', icon: null },
  { id: 'Bengali', label: 'Bengali', native: 'বাংলা', icon: null }
];

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '3:15';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Clean excessive metadata, pipe suffixes, and tags so card titles stay crisp (max 2 lines)
const cleanTrackTitle = (rawTitle) => {
  if (!rawTitle) return '';
  // If title has pipe separators (e.g. "Tuta Pull Wahan | Deepak Rathore | Acoustic"), take the primary title part
  let clean = rawTitle.split('|')[0].trim();
  // Remove trailing dash, colon, or tilde
  clean = clean.replace(/\s*[-–—:~]\s*$/, '').trim();
  // Remove common YouTube/audio tags like (Official Video), (Audio), [Cover], etc.
  clean = clean.replace(/\s*[\(\[]\s*(official\s*)?(audio|music\s*video|video|lyrics?|hd|4k|cover|acoustic|visualizer)\s*[\)\]]/gi, '').trim();
  return clean || rawTitle;
};

// Custom Equalizer Waveform icon matching 03 Lo-Fi in the image
const WaveformBarsIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={{ display: 'inline-block' }}>
    <rect x="2" y="9" width="2" height="6" rx="1" />
    <rect x="7" y="5" width="2" height="14" rx="1" />
    <rect x="12" y="2" width="2" height="20" rx="1" />
    <rect x="17" y="5" width="2" height="14" rx="1" />
    <rect x="22" y="9" width="2" height="6" rx="1" />
  </svg>
);

export const VIBE_ITEMS = [
  {
    index: '01',
    id: 'chill_sleep',
    genre: 'Chill/Sleep',
    title: 'Chill / Sleep',
    descLine1: 'Slow down.',
    descLine2: 'Breathe more.',
    icon: Moon,
    image: '/assets/images/vibe_card_01.jpg',
    themeColor: '#38bdf8'
  },
  {
    index: '02',
    id: 'indie',
    genre: 'Indie',
    title: 'Indie',
    descLine1: 'For the dreamers.',
    descLine2: 'And the wanderers.',
    icon: Trees,
    image: '/assets/images/vibe_card_02.jpg',
    themeColor: '#10b981'
  },
  {
    index: '03',
    id: 'lofi',
    genre: 'Lo-Fi',
    title: 'Lo-Fi',
    descLine1: 'Warm beats.',
    descLine2: 'Calmer days.',
    icon: WaveformBarsIcon,
    image: '/assets/images/vibe_card_03.jpg',
    themeColor: '#fbbf24'
  },
  {
    index: '04',
    id: 'retro',
    genre: 'Retro',
    title: 'Retro',
    descLine1: 'Old sounds.',
    descLine2: 'New stories.',
    icon: CassetteTape,
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=90',
    themeColor: '#f43f5e'
  },
  {
    index: '05',
    id: 'synthwave',
    genre: 'Synthwave',
    title: 'Synthwave',
    descLine1: 'Neon skies.',
    descLine2: 'Endless nights.',
    icon: Waves,
    image: '/assets/images/vibe_card_05.jpg',
    themeColor: '#d946ef'
  },
  {
    index: '06',
    id: 'peace',
    genre: 'Peace',
    title: 'Peace',
    descLine1: 'Quieter mind.',
    descLine2: 'Brighter you.',
    icon: Mountain,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=90',
    themeColor: '#2dd4bf'
  }
];

// 18 minimal floating light dust motes drifting in the ambient twilight
const DUST_MOTES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  top: `${12 + ((i * 37) % 72)}%`,
  left: `${4 + ((i * 53) % 92)}%`,
  size: 2 + (i % 3) * 0.7,
  duration: 14 + (i % 6) * 3,
  delay: (i * 0.8) % 6,
  opacity: 0.18 + (i % 4) * 0.08
}));

function ChooseYourVibeScene({
  currentScene,
  onClose,
  onSelectGenre,
  onPlayTrackForGenre,
  onSelectTrack,
  onTogglePlay,
  tracks = [],
  currentTrack,
  isPlaying,
  roomBrightness = 1.0,
  onOpenSceneModal,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenCoffeeModal,
  onOpenAuthModal,
  user,
  isAdmin = false,
  onOpenAdminDashboard,
  onLogout,
  selectedLanguage = 'English',
  selectedLanguages = [],
  onSelectLanguage,
  favorites = [],
  customTracks = [],
  currentTime = 0,
  duration = 180,
  onSeek,
  audioElement = null
}) {
  // Mode: 'vibes' (categories) or 'songs' (tracks belonging to clicked section)
  const [viewMode, setViewMode] = useState('vibes');
  const [musicSource, setMusicSource] = useState('musicly'); // 'musicly' | 'library'
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [activeIndex, setActiveIndex] = useState(2);
  const [activeSongIndex, setActiveSongIndex] = useState(0);

  // Active languages array: supports multi-selection, single-selection, or empty (all)
  const activeLangs = useMemo(() => {
    if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
      return selectedLanguages.filter(l => l && l !== 'Hinglish');
    }
    if (selectedLanguage && selectedLanguage !== 'All' && selectedLanguage !== 'Hinglish') {
      return [selectedLanguage];
    }
    return [];
  }, [selectedLanguages, selectedLanguage]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDockOpen, setIsDockOpen] = useState(false);
  const dockContainerRef = useRef(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const sourceMenuRef = useRef(null);

  // Transition state: 'idle' | 'vibes-to-songs' | 'songs-to-vibes'
  const [transitionState, setTransitionState] = useState('idle');
  const [clickedVibeId, setClickedVibeId] = useState(null);
  const transitionTimerRef = useRef(null);
  const transitionStateRef = useRef('idle');
  transitionStateRef.current = transitionState;

  // Clean up transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Filter tracks belonging to the selected section/genre, source (Musicly vs My Library), selected language, and search query
  const vibeSongs = useMemo(() => {
    if (!selectedVibe || !Array.isArray(tracks)) return [];
    
    // Choose source: Musicly catalog vs My Library (user favorites + custom uploads)
    let sourcePool = tracks;
    if (musicSource === 'library') {
      const favSet = new Set(favorites || []);
      const userLib = tracks.filter(t => favSet.has(t.id) || t.isCustom);
      sourcePool = userLib.length > 0 ? userLib : tracks;
    }

    const genre = (selectedVibe.genre || '').toLowerCase();
    let filtered = sourcePool.filter(t => {
      if (Array.isArray(t.genres)) {
        return t.genres.some(g => g.toLowerCase() === genre);
      }
      return (t.genre || '').toLowerCase().includes(genre);
    });
    if (filtered.length === 0) {
      filtered = sourcePool.filter(t => (t.fallbackType || '').toLowerCase() === genre);
    }
    // Language filtering: prefer songs matching chosen language(s)
    if (activeLangs.length > 0) {
      const lower = activeLangs.map(l => l.toLowerCase());
      const langMatches = filtered.filter(t => {
        const tLang = (t.language || 'English').toLowerCase();
        return lower.includes(tLang);
      });
      if (langMatches.length > 0) {
        filtered = langMatches;
      }
    }
    const base = filtered.length > 0 ? filtered : sourcePool.slice(0, 6);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    const matched = base.filter(t => 
      (t.title || '').toLowerCase().includes(q) || 
      (t.artist || '').toLowerCase().includes(q)
    );
    return matched.length > 0 ? matched : base;
  }, [selectedVibe, tracks, searchQuery, activeLangs, musicSource, favorites, customTracks]);

  const isLoggedIn = Boolean(user && !user.isAnonymous);
  const displayName = user?.displayName || 'Tripam';
  const initial = (displayName.trim()[0] || 'T').toUpperCase();
  const photoURL = user?.photoURL || null;

  // Close dock, profile dropdown, language dropdown, or source menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isDockOpen && !showProfileMenu && !isLangMenuOpen && !isSourceMenuOpen) return;
    const handleOutsideClick = (e) => {
      // Do not treat clicks inside any open modal or modal backdrop as outside click for the dock
      if (e.target.closest && (e.target.closest('.modal-overlay') || e.target.closest('.glass-modal-panel'))) {
        return;
      }
      if (dockContainerRef.current && !dockContainerRef.current.contains(e.target)) {
        setIsDockOpen(false);
        setShowProfileMenu(false);
      } else if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target)) {
        setIsSourceMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDockOpen(false);
        setShowProfileMenu(false);
        setIsLangMenuOpen(false);
        setIsSourceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDockOpen, showProfileMenu, isLangMenuOpen, isSourceMenuOpen]);

  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasSwipedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const wheelAccumulatorRef = useRef(0);
  const isWheelLockedRef = useRef(false);

  // Symmetrical 3D Panoramic Arc: Replicate items so all 7 visible slots (-3 to +3) are always populated without blank wings
  const displayVibes = useMemo(() => {
    const result = [];
    // 2 copies = 12 items, perfectly filling all 7 visible slots (-3, -2, -1, 0, 1, 2, 3) symmetrically at all times
    for (let m = 0; m < 2; m++) {
      VIBE_ITEMS.forEach((item, i) => {
        result.push({
          item,
          originalIndex: i,
          key: `${item.id}-copy-${m}`
        });
      });
    }
    return result;
  }, []);

  const displaySongs = useMemo(() => {
    if (vibeSongs.length === 0) return [];
    if (vibeSongs.length === 1) {
      return [{ song: vibeSongs[0], originalIndex: 0, key: `${vibeSongs[0].id}-single` }];
    }
    // Replicate songs so cylinder has at least 10 items for a continuous, gapless panoramic arc
    const multiplier = Math.max(2, Math.ceil(10 / vibeSongs.length));
    const result = [];
    for (let m = 0; m < multiplier; m++) {
      vibeSongs.forEach((song, i) => {
        result.push({
          song,
          originalIndex: i,
          key: `${song.id}-copy-${m}`
        });
      });
    }
    return result;
  }, [vibeSongs]);

  const handlePrev = useCallback(() => {
    if (transitionState !== 'idle') return;
    if (viewMode === 'vibes') {
      setActiveIndex((prev) => (prev - 1 + displayVibes.length) % displayVibes.length);
    } else if (displaySongs.length > 0) {
      setActiveSongIndex((prev) => (prev - 1 + displaySongs.length) % displaySongs.length);
    }
  }, [viewMode, displayVibes.length, displaySongs.length, transitionState]);

  const handleNext = useCallback(() => {
    if (transitionState !== 'idle') return;
    if (viewMode === 'vibes') {
      setActiveIndex((prev) => (prev + 1) % displayVibes.length);
    } else if (displaySongs.length > 0) {
      setActiveSongIndex((prev) => (prev + 1) % displaySongs.length);
    }
  }, [viewMode, displayVibes.length, displaySongs.length, transitionState]);

  const jumpToVibeIndex = useCallback((targetIdx) => {
    if (transitionState !== 'idle') return;
    const currentBase = activeIndex % VIBE_ITEMS.length;
    let delta = targetIdx - currentBase;
    if (delta > VIBE_ITEMS.length / 2) delta -= VIBE_ITEMS.length;
    if (delta < -VIBE_ITEMS.length / 2) delta += VIBE_ITEMS.length;
    setActiveIndex((prev) => (prev + delta + displayVibes.length) % displayVibes.length);
  }, [activeIndex, transitionState, displayVibes.length]);

  const jumpToSongIndex = useCallback((targetIdx) => {
    if (transitionState !== 'idle' || vibeSongs.length === 0) return;
    const currentBase = activeSongIndex % vibeSongs.length;
    let delta = targetIdx - currentBase;
    if (delta > vibeSongs.length / 2) delta -= vibeSongs.length;
    if (delta < -vibeSongs.length / 2) delta += vibeSongs.length;
    setActiveSongIndex((prev) => (prev + delta + displaySongs.length) % displaySongs.length);
  }, [activeSongIndex, transitionState, vibeSongs.length, displaySongs.length]);

  // Smooth back to vibes handler (songs glide downwards, vibes descend gracefully from above)
  const handleBackToVibes = useCallback(() => {
    if (transitionState !== 'idle') return;
    setTransitionState('songs-to-vibes');
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      setViewMode('vibes');
      setTransitionState('idle');
    }, 550);
  }, [transitionState]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (transitionState !== 'idle') return;
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') {
        if (viewMode === 'songs') {
          handleBackToVibes();
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose, viewMode, transitionState, handleBackToVibes]);

  // 60/120fps zero-cost GPU mouse parallax via CSS custom properties (no React re-renders)
  useEffect(() => {
    let frameId = null;
    const handleMouseMove = (e) => {
      if (transitionStateRef.current !== 'idle') return;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        containerRef.current.style.setProperty('--mx', x.toFixed(3));
        containerRef.current.style.setProperty('--my', y.toFixed(3));
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const wheelResetTimeoutRef = useRef(null);

  // Professional intensity-matched wheel scrolling: moves 1 card at a time, but cadence speeds up proportionally with scroll intensity
  useEffect(() => {
    if (!currentScene || currentScene.id !== 'vibe_carousel') return;

    const onWheel = (e) => {
      if (transitionState !== 'idle') return;

      // 1. If ANY modal box, backdrop, drawer, or dialog is open in the app, completely disable background carousel scroll
      const activeModal = document.querySelector(
        '.modal-overlay, .glass-modal-panel, .scene-panel, .coffee-modal-overlay, .admin-modal-overlay, .feedback-modal-overlay, .playlist-floating-popover, [role="dialog"], .vibe-modal-no-wheel'
      );
      if (activeModal) {
        return;
      }

      // 2. If scroll event target is inside any modal box, panel, dropdown, or scroll container, let it scroll naturally
      if (
        e.target &&
        e.target.closest &&
        e.target.closest(
          '.modal-overlay, .glass-modal-panel, .scene-panel, .scenes-scroll-container, .scenes-grid, .coffee-modal-overlay, .admin-modal-overlay, .feedback-modal-overlay, .playlist-floating-popover, [role="dialog"], .vibe-modal-no-wheel, .vibe-dock-dropdown, .vibe-lang-dropdown-menu, .vibe-source-dropdown-menu'
        )
      ) {
        return;
      }

      e.preventDefault();

      // Pick dominant axis
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const intensity = Math.abs(delta);

      // Filter micro noise
      if (intensity < 1) return;

      // If transition is currently locked, discard momentum but keep sensitivity alive
      if (isWheelLockedRef.current) {
        return;
      }

      // Immediate reversal detection: if user switches scroll direction, wipe accumulator instantly
      if ((wheelAccumulatorRef.current > 0 && delta < 0) || (wheelAccumulatorRef.current < 0 && delta > 0)) {
        wheelAccumulatorRef.current = 0;
      }

      wheelAccumulatorRef.current += delta;

      // Reset accumulator if scrolling stops for 130ms
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current);
      }
      wheelResetTimeoutRef.current = setTimeout(() => {
        wheelAccumulatorRef.current = 0;
      }, 130);

      // Calibrated calm threshold: requires deliberate intention and avoids hyperactive triggers
      const threshold = intensity >= 70 ? 26 : 36;

      if (Math.abs(wheelAccumulatorRef.current) >= threshold) {
        const isForward = wheelAccumulatorRef.current > 0;
        wheelAccumulatorRef.current = 0;
        isWheelLockedRef.current = true;

        if (isForward) {
          handleNext();
        } else {
          handlePrev();
        }

        // Toned-down, premium pacing:
        // - Fast scroll: controlled 170ms cadence (smooth without racing)
        // - Moderate scroll: 230ms cadence
        // - Gentle scroll: 290ms cadence (stable, deliberate single-card stop)
        const cadence = intensity >= 90 ? 170 : intensity >= 45 ? 230 : 290;

        setTimeout(() => {
          isWheelLockedRef.current = false;
        }, cadence);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current);
      }
    };
  }, [currentScene?.id, handleNext, handlePrev, transitionState]);

  // Touch / mouse swipe gesture (calm 46px threshold)
  const handlePointerDown = (e) => {
    if (transitionState !== 'idle') return;
    isDraggingRef.current = true;
    hasSwipedRef.current = false;
    dragStartXRef.current = e.clientX;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || transitionState !== 'idle') return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 46) {
      isDraggingRef.current = false;
      hasSwipedRef.current = true;
      if (dx < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasSwipedRef.current = false;
    }, 120);
  };

  // When a vibe category box is clicked anywhere, initiate the upward flight animation
  const handleChooseVibeSection = useCallback((vibeItem, idx) => {
    if (hasSwipedRef.current || transitionState !== 'idle') return;
    setClickedVibeId(vibeItem.id);
    setSelectedVibe(vibeItem);
    setActiveSongIndex(0);
    setTransitionState('vibes-to-songs');
    if (onSelectGenre) {
      onSelectGenre(vibeItem.genre);
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      setActiveIndex(idx);
      setViewMode('songs');
      setTransitionState('idle');
      setClickedVibeId(null);
    }, 550);
  }, [transitionState, onSelectGenre]);

  // When a song card box is clicked anywhere, toggle play/pause if already active or play the selected song
  const handleSongClick = useCallback((song, idx, isCenter) => {
    if (hasSwipedRef.current || transitionState !== 'idle') return;
    if (!isCenter) {
      setActiveSongIndex(idx);
    }

    // If clicking on the song card that is already loaded: toggle play/pause
    if (currentTrack?.id === song.id) {
      if (onTogglePlay) {
        onTogglePlay();
      } else if (onSelectTrack) {
        onSelectTrack(song);
      }
      return;
    }

    // If clicking a different song card, play it
    if (onSelectTrack) {
      onSelectTrack(song);
    } else if (onPlayTrackForGenre && selectedVibe) {
      onPlayTrackForGenre(selectedVibe.genre);
    }
  }, [transitionState, onSelectTrack, onPlayTrackForGenre, onTogglePlay, selectedVibe, currentTrack?.id]);

  if (!currentScene || currentScene.id !== 'vibe_carousel') {
    return null;
  }

  // Pre-calculated horizontal offsets and angles for the 3D panoramic arc
  // GPU compositor handles these transforms smoothly without CPU filter recalculation
  const getCardTransform = (diff) => {
    switch (diff) {
      case 0:
        return { x: 0, z: 40, rotateY: 0, rotateX: 6.5, scale: 1.0, opacity: 1.0 };
      case -1:
        return { x: -248, z: -35, rotateY: 15, rotateX: 6.5, scale: 0.90, opacity: 0.90 };
      case 1:
        return { x: 248, z: -35, rotateY: -15, rotateX: 6.5, scale: 0.90, opacity: 0.90 };
      case -2:
        return { x: -480, z: -110, rotateY: 26, rotateX: 6.5, scale: 0.80, opacity: 0.75 };
      case 2:
        return { x: 480, z: -110, rotateY: -26, rotateX: 6.5, scale: 0.80, opacity: 0.75 };
      case -3:
        return { x: -695, z: -210, rotateY: 36, rotateX: 6.5, scale: 0.72, opacity: 0.38 };
      case 3:
        return { x: 695, z: -210, rotateY: -36, rotateX: 6.5, scale: 0.72, opacity: 0.38 };
      default:
        const sign = diff < 0 ? -1 : 1;
        return { x: sign * 890, z: -320, rotateY: sign * 45, rotateX: 6.5, scale: 0.65, opacity: 0 };
    }
  };

  const showVibes = viewMode === 'vibes' || transitionState !== 'idle';
  const showSongs = viewMode === 'songs' || transitionState !== 'idle';
  const effectiveMode = transitionState === 'vibes-to-songs' ? 'songs' : transitionState === 'songs-to-vibes' ? 'vibes' : viewMode;

  return (
    <div 
      ref={containerRef}
      className="vibe-scene-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ opacity: Math.max(0.3, roomBrightness) }}
    >
      {/* High-res cinematic evening room background with smooth CSS variable parallax */}
      <div className="vibe-scene-backdrop" />

      {/* Floating subtle light dust motes */}
      <div className="vibe-dust-layer">
        {DUST_MOTES.map(mote => (
          <span
            key={mote.id}
            className="vibe-dust-mote"
            style={{
              top: mote.top,
              left: mote.left,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              opacity: mote.opacity,
              animationDuration: `${mote.duration}s`,
              animationDelay: `-${mote.delay}s`
            }}
          />
        ))}
      </div>

      {/* Glossy reflective desk table surface in foreground with reactive reflection sheen */}
      <div className="vibe-scene-table-reflection-plane" />

      {/* Top Left Branding: MUSICLY — */}
      <div className="vibe-top-left-brand">
        <span className="vibe-brand-logo">MUSICLY</span>
        <span className="vibe-brand-line" />
      </div>

      {/* Top Right Controls: Tagline & Apple-Inspired 3-Dot Glass Popout Dock */}
      <div 
        className="vibe-top-right-group" 
        ref={dockContainerRef}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {!isDockOpen && (
          <div className="vibe-top-right-tag">
            <div className="vibe-tag-text">
              <span>SOUNDS</span>
              <span>FOR A</span>
              <span>BETTER YOU</span>
            </div>
            <span className="vibe-tag-divider" />
          </div>
        )}

        {/* 3-Dot Glass Box & Popout Dock */}
        <div className="vibe-dock-wrapper">
          {/* Popped-out Glass Control Dock */}
          {isDockOpen && (
            <nav className="vibe-glass-control-dock vibe-dock-popped" aria-label="Scene Controls Dock">
              {/* 1. Home Pill (Takes directly to Cozy Bedroom Studio theme) */}
              <button
                type="button"
                id="vibe-dock-home-btn"
                className="vibe-dock-pill-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClose) {
                    onClose();
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Return to Cozy Bedroom Studio"
              >
                <Home size={13} className="vibe-dock-btn-icon" />
                <span>Home</span>
              </button>

              {/* 2. Ambience Pill */}
              <button
                type="button"
                id="vibe-dock-ambience-btn"
                className={`vibe-dock-pill-btn ${activeAmbientCount > 0 ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenAmbient) {
                    onOpenAmbient();
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Ambient sound mixer"
              >
                <Sliders size={13} className="vibe-dock-btn-icon" />
                <span>Ambience</span>
                {activeAmbientCount > 0 && (
                  <span className="vibe-dock-badge">{activeAmbientCount}</span>
                )}
              </button>

              {/* 3. Tripam Profile Button / Log in */}
              <div className="vibe-dock-profile-wrapper" ref={profileMenuRef}>
                {isLoggedIn ? (
                  <button
                    type="button"
                    id="vibe-dock-profile-btn"
                    className={`vibe-dock-profile-btn ${showProfileMenu ? 'menu-open' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfileMenu(prev => !prev);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={displayName}
                  >
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="vibe-dock-avatar-img" />
                    ) : (
                      <span className="vibe-dock-avatar-initial">{initial}</span>
                    )}
                    <span className="vibe-dock-profile-name">{displayName}</span>
                    {isAdmin && (
                      <Crown size={11} className="vibe-dock-crown-icon" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    id="vibe-dock-login-btn"
                    className="vibe-dock-pill-btn vibe-dock-login-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenAuthModal) onOpenAuthModal();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Log in to Musicly"
                  >
                    <LogIn size={13} className="vibe-dock-btn-icon" />
                    <span>Log in</span>
                  </button>
                )}

                {/* Profile Dropdown Menu */}
                {isLoggedIn && showProfileMenu && (
                  <div className="vibe-dock-dropdown vibe-modal-no-wheel">
                    <div className="vibe-dock-dropdown-header">
                      <div className="vibe-dock-dropdown-name-row">
                        <span className="vibe-dock-dropdown-name">{displayName}</span>
                        {isAdmin && (
                          <span className="vibe-dock-dropdown-admin-tag">
                            <Crown size={9} /> Admin
                          </span>
                        )}
                      </div>
                      <span className="vibe-dock-dropdown-email">{user?.email || 'Member'}</span>
                    </div>

                    <div className="vibe-dock-dropdown-divider" />

                    {isAdmin && onOpenAdminDashboard && (
                      <button
                        type="button"
                        className="vibe-dock-dropdown-item vibe-dock-dropdown-admin"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProfileMenu(false);
                          onOpenAdminDashboard();
                        }}
                      >
                        <Crown size={13} className="text-amber-400" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    {!isAdmin && onOpenCoffeeModal && (
                      <button
                        type="button"
                        className="vibe-dock-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProfileMenu(false);
                          onOpenCoffeeModal();
                        }}
                      >
                        <span>☕</span>
                        <span>Buy Me a Coffee</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="vibe-dock-dropdown-item vibe-dock-dropdown-logout"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileMenu(false);
                        if (onLogout) onLogout();
                      }}
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* 3-Dot Glass Box Trigger Button */}
          <button
            type="button"
            id="vibe-dock-more-btn"
            className={`vibe-dock-more-btn ${isDockOpen ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsDockOpen(prev => !prev);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            title={isDockOpen ? "Collapse controls" : "Open controls"}
            aria-expanded={isDockOpen}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Center Title Header */}
      <div className="vibe-center-header">
        {showVibes && (
          <div className={`vibe-header-vibes ${
            transitionState === 'vibes-to-songs' 
              ? 'vibe-header-exit-up' 
              : transitionState === 'songs-to-vibes' 
                ? 'vibe-header-enter-down' 
                : ''
          }`}>
            <h1 className="vibe-main-title">
              Choose your <span className="vibe-title-accent">vibe</span>
            </h1>
            <p className="vibe-main-subtitle">DIFFERENT SCENES. SAME FEELINGS.</p>

            {/* Language Selector (Exact match to design in exact position) */}
            <div className="vibe-lang-selector-wrapper" ref={langDropdownRef}>
              <button
                type="button"
                id="vibe-language-selector-btn"
                className={`vibe-lang-pill-btn ${isLangMenuOpen ? 'is-open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLangMenuOpen(prev => !prev);
                }}
                aria-expanded={isLangMenuOpen}
                aria-haspopup="listbox"
                title="Select music language"
              >
                <Globe size={13} strokeWidth={1.8} className="vibe-lang-pill-icon" />
                <span className="vibe-lang-pill-label">Language</span>
                <span className="vibe-lang-pill-divider">|</span>
                <span className="vibe-lang-pill-current">
                  {activeLangs.length === 0 
                    ? 'All' 
                    : (activeLangs.length === 1 ? activeLangs[0] : `${activeLangs.length} Selected`)}
                </span>
                <ChevronDown size={13} strokeWidth={2} className={`vibe-lang-pill-chevron ${isLangMenuOpen ? 'is-open' : ''}`} />
              </button>

              {/* Exact floating glass dropdown menu */}
              {isLangMenuOpen && (
                <div 
                  className="vibe-lang-dropdown-menu"
                  role="listbox"
                  aria-label="Language options"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Dropdown Header: Globe + Language */}
                  <div className="vibe-lang-menu-header">
                    <Globe size={13} strokeWidth={1.8} className="vibe-lang-menu-header-icon" />
                    <span>Select Languages</span>
                  </div>

                  {/* Language Options List */}
                  <div className="vibe-lang-menu-list">
                    {LANGUAGE_OPTIONS.map((item) => {
                      const isActive = activeLangs.some(l => l.toLowerCase() === item.id.toLowerCase());
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`vibe-lang-menu-item ${isActive ? 'is-active' : ''}`}
                          onClick={() => {
                            if (typeof onSelectLanguage === 'function') {
                              onSelectLanguage(item.id);
                            }
                          }}
                        >
                          <div className="vibe-lang-item-left">
                            {isActive && (
                              <Check size={13} strokeWidth={2.4} className="vibe-lang-item-check" />
                            )}
                            {item.native && !isActive && (
                              <span className="vibe-lang-item-native">{item.native}</span>
                            )}
                            {!isActive && !item.native && (
                              <span className="vibe-lang-item-spacer" />
                            )}
                          </div>
                          <span className="vibe-lang-item-name">{item.label}</span>
                        </button>
                      );
                    })}
                    {activeLangs.length > 0 && (
                      <button
                        type="button"
                        className="vibe-lang-menu-item"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '6px', color: '#ffb703', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}
                        onClick={() => {
                          if (typeof onSelectLanguage === 'function') {
                            onSelectLanguage('All');
                          }
                        }}
                      >
                        Clear Filter (Play All)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showSongs && (
          <div className={`vibe-songs-header-block ${
            transitionState === 'vibes-to-songs' 
              ? 'vibe-header-enter-up' 
              : transitionState === 'songs-to-vibes' 
                ? 'vibe-header-exit-down' 
                : ''
          }`}>
            <h1 className="vibe-main-title">{selectedVibe?.title}</h1>

            {/* Apple macOS Glass Capsule Search Box */}
            <div className="vibe-apple-search-wrapper">
              <div className="vibe-apple-search-capsule">
                {/* Subtle Moving Top Corner Light */}
                <div className="vibe-apple-top-light-track">
                  <div className="vibe-apple-top-light-bead" />
                </div>

                {/* Inner Apple Frosted Glass Surface */}
                <div className="vibe-apple-search-inner">
                  {/* Apple Frosted Glass Icon Badge */}
                  <div className="vibe-apple-search-glass-icon">
                    <Search size={14} className="vibe-apple-search-icon" />
                  </div>

                  {/* Sleek Apple Glass Search Input */}
                  <input
                    type="text"
                    className="vibe-apple-search-input"
                    placeholder={`Search in ${selectedVibe?.title || 'songs'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />

                  {/* Clear 'X' Button */}
                  {searchQuery && (
                    <button
                      className="vibe-apple-search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}

                  {/* macOS Translucent Glass Badge */}
                  <div className="vibe-apple-search-badge">
                    <span>{vibeSongs.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D Cylindrical Panoramic Arc Viewport */}
      <div className={`vibe-carousel-viewport ${transitionState !== 'idle' ? 'is-animating-transition' : ''}`}>
        {/* VIBES CYLINDER */}
        {showVibes && (
          <div 
            className={`vibe-carousel-cylinder vibe-cylinder-vibes ${
              transitionState === 'vibes-to-songs'
                ? 'vibe-cylinder-exit-up'
                : transitionState === 'songs-to-vibes'
                  ? 'vibe-cylinder-enter-down'
                  : ''
            }`}
          >
            {displayVibes.map(({ item, originalIndex, key }, index) => {
              const totalVibes = displayVibes.length;
              // Shortest circular offset from activeIndex
              let diff = index - activeIndex;
              if (diff > totalVibes / 2) diff -= totalVibes;
              if (diff < -totalVibes / 2) diff += totalVibes;

              const isCenter = diff === 0;
              const isClicked = clickedVibeId === item.id;
              const distance = Math.min(3, Math.abs(diff));
              const { x, z, rotateY, rotateX = 6.5, scale, opacity } = getCardTransform(diff);
              const IconComponent = item.icon;
              const isVibePlaying = isPlaying && currentTrack && (
                currentTrack.genre?.toLowerCase().includes(item.genre.toLowerCase()) ||
                (Array.isArray(currentTrack.genres) && currentTrack.genres.some(g => g.toLowerCase() === item.genre.toLowerCase()))
              );

              return (
                <div
                  key={key}
                  className={`vibe-card-slot ${isCenter ? 'is-active-card' : ''} ${isClicked ? 'is-clicked-section' : ''} vibe-card-dist-${distance}`}
                  style={{
                    transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`,
                    opacity: opacity,
                    pointerEvents: Math.abs(diff) <= 2 && transitionState === 'idle' ? 'auto' : 'none',
                    zIndex: 20 - Math.abs(diff)
                  }}
                  onClick={() => handleChooseVibeSection(item, index)}
                >
                  {/* Soft ambient diffused halo behind active center card */}
                  {(isCenter || isClicked) && <div className="vibe-active-ambient-glow" />}

                  {/* Apple Vision Pro Glass Card */}
                  <div 
                    className={`vibe-card-inner ${isCenter || isClicked ? 'active-glow-border' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseVibeSection(item, index);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${item.title} songs`}
                  >
                    {/* Subtle vertical specular glass sheen */}
                    <div className="vibe-card-glass-sheen" />

                    {/* Card Background Image */}
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="vibe-card-bg-img" 
                    />
                    {/* Gradient Scrim for crisp text contrast */}
                    <div className="vibe-card-gradient-scrim" />

                    {/* Top Bar: Number & Icon */}
                    <div className="vibe-card-top-row">
                      <span className="vibe-card-num">{item.index}</span>
                      <span className="vibe-card-icon-wrap">
                        <IconComponent size={19} />
                      </span>
                    </div>

                    {/* Bottom Content: Title, Description & Circular Arrow Action Button */}
                    <div className="vibe-card-bottom-row">
                      <div className="vibe-card-text-group">
                        <h3 className="vibe-card-title">{item.title}</h3>
                        <p className="vibe-card-desc">
                          {item.descLine1}
                          <br />
                          {item.descLine2}
                        </p>
                      </div>

                      <button 
                        className={`vibe-card-action-btn ${isCenter || isClicked ? 'is-active-btn' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChooseVibeSection(item, index);
                        }}
                        title={`Explore ${item.genre} Songs`}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Playing Pulse Dot if currently playing this genre */}
                    {isVibePlaying && (
                      <div className="vibe-card-playing-indicator" title="Currently Playing">
                        <span className="vibe-pulse-ring" />
                        <span className="vibe-pulse-core" />
                      </div>
                    )}
                  </div>

                  {/* Specular Colored Ambient Floor Glow matching card vibe */}
                  <div 
                    className="vibe-card-floor-glow" 
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${item.themeColor}88 0%, ${item.themeColor}30 45%, transparent 75%)`
                    }}
                  />

                  {/* Reactive Floor Specular Mirror Reflection */}
                  <div className="vibe-card-floor-reflection">
                    <div className="vibe-card-inner reflection-card">
                      <img src={item.image} alt="" className="vibe-card-bg-img" />
                    </div>
                  </div>

                  {/* Floor Contact Specular Sheen */}
                  <div className="vibe-floor-specular-sheen" />
                </div>
              );
            })}
          </div>
        )}

        {/* SONGS CYLINDER */}
        {showSongs && (
          <div 
            className={`vibe-carousel-cylinder vibe-cylinder-songs ${
              transitionState === 'vibes-to-songs'
                ? 'vibe-cylinder-enter-up'
                : transitionState === 'songs-to-vibes'
                  ? 'vibe-cylinder-exit-down'
                  : ''
            }`}
          >
            {displaySongs.map(({ song, originalIndex, key }, index) => {
              const totalSongs = displaySongs.length;
              let diff = index - activeSongIndex;
              if (diff > totalSongs / 2) diff -= totalSongs;
              if (diff < -totalSongs / 2) diff += totalSongs;

              const isCenter = diff === 0;
              const distance = Math.min(3, Math.abs(diff));
              const { x, z, rotateY, rotateX = 6.5, scale, opacity } = getCardTransform(diff);
              const isThisSongPlaying = isPlaying && currentTrack?.id === song.id;
              const formattedIndex = String(originalIndex + 1).padStart(2, '0');
              const songCover = song.cover || selectedVibe?.image;
              const themeColor = selectedVibe?.themeColor || '#fbbf24';

              return (
                <div
                  key={key}
                  className={`vibe-card-slot ${isCenter ? 'is-active-card' : ''} vibe-card-dist-${distance}`}
                  style={{
                    transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`,
                    opacity: opacity,
                    pointerEvents: Math.abs(diff) <= 2 && transitionState === 'idle' ? 'auto' : 'none',
                    zIndex: 20 - Math.abs(diff)
                  }}
                  onClick={() => handleSongClick(song, index, isCenter)}
                >
                  {/* Soft ambient diffused halo behind active center card */}
                  {isCenter && <div className="vibe-active-ambient-glow" />}

                  {/* Apple Vision Pro Glass Card */}
                  <div 
                    className={`vibe-card-inner ${isCenter ? 'active-glow-border' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSongClick(song, index, isCenter);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${song.title}`}
                  >
                    {/* Subtle vertical specular glass sheen */}
                    <div className="vibe-card-glass-sheen" />

                    {/* Card Background Image */}
                    <img 
                      src={songCover} 
                      alt={song.title} 
                      className="vibe-card-bg-img" 
                    />
                    {/* Gradient Scrim for crisp text contrast */}
                    <div className="vibe-card-gradient-scrim" />

                    {/* Top Bar: Track Index & Playing Status Icon */}
                    <div className="vibe-card-top-row">
                      <span className="vibe-card-num">{formattedIndex}</span>
                      <span className="vibe-card-icon-wrap">
                        {isThisSongPlaying ? (
                          <WaveformBarsIcon size={19} className="text-amber-400 animate-pulse" />
                        ) : currentTrack?.id === song.id ? (
                          <Pause size={17} className="text-amber-400 opacity-70" />
                        ) : (
                          <Music size={17} />
                        )}
                      </span>
                    </div>

                    {/* Bottom Content: Title, Artist/Duration & Circular Action Button */}
                    <div className="vibe-card-bottom-row">
                      <div className="vibe-card-text-group">
                        <h3 className="vibe-card-title" title={song.title}>
                          {cleanTrackTitle(song.title)}
                        </h3>
                        <p className="vibe-card-desc" title={`${song.artist || 'Musicly Artist'} • ${formatDuration(song.duration)}`}>
                          {song.artist || 'Musicly Artist'}
                          <br />
                          {formatDuration(song.duration)}
                        </p>
                      </div>

                      <button 
                        className={`vibe-card-action-btn ${isCenter ? 'is-active-btn' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongClick(song, index, isCenter);
                        }}
                        title={isThisSongPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                      >
                        {isThisSongPlaying ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                      </button>
                    </div>

                    {/* Playing Pulse Dot */}
                    {isThisSongPlaying && (
                      <div className="vibe-card-playing-indicator" title="Currently Playing">
                        <span className="vibe-pulse-ring" />
                        <span className="vibe-pulse-core" />
                      </div>
                    )}
                  </div>

                  {/* Specular Colored Ambient Floor Glow matching card vibe */}
                  <div 
                    className="vibe-card-floor-glow" 
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${themeColor}88 0%, ${themeColor}30 45%, transparent 75%)`
                    }}
                  />

                  {/* Reactive Floor Specular Mirror Reflection */}
                  <div className="vibe-card-floor-reflection">
                    <div className="vibe-card-inner reflection-card">
                      <img src={songCover} alt="" className="vibe-card-bg-img" />
                    </div>
                  </div>

                  {/* Floor Contact Specular Sheen */}
                  <div className="vibe-floor-specular-sheen" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Controls: Navigation Arrows, Pagination Dashes & Animated SCROLL TO EXPLORE */}
      <div className={`vibe-bottom-controls ${transitionState !== 'idle' ? 'controls-transitioning' : ''}`}>
        {/* Floating Wavy Audio-Reactive Progress Scrubber - Only shown while music is actively playing */}
        {isPlaying && currentTrack && (
          <FloatingWaveformScrubber
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            isPlaying={isPlaying}
            audioElement={audioElement}
            themeColor={currentScene?.primaryColor || '#f59e0b'}
          />
        )}

        <div className="vibe-nav-row">
          <button 
            className="vibe-nav-arrow-btn" 
            onClick={handlePrev}
            disabled={transitionState !== 'idle'}
            title={effectiveMode === 'vibes' ? "Previous Vibe" : "Previous Song"}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="vibe-pagination-dashes">
            {(effectiveMode === 'vibes' ? VIBE_ITEMS : vibeSongs).map((item, idx) => (
              <span
                key={item.id}
                className={`vibe-dash ${
                  idx === (effectiveMode === 'vibes' 
                    ? (activeIndex % VIBE_ITEMS.length) 
                    : (activeSongIndex % (vibeSongs.length || 1))) 
                    ? 'active-dash' : ''
                }`}
                onClick={() => {
                  if (effectiveMode === 'vibes') {
                    jumpToVibeIndex(idx);
                  } else {
                    jumpToSongIndex(idx);
                  }
                }}
              />
            ))}
          </div>

          <button 
            className="vibe-nav-arrow-btn" 
            onClick={handleNext}
            disabled={transitionState !== 'idle'}
            title={effectiveMode === 'vibes' ? "Next Vibe" : "Next Song"}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Animated luminous glow indicator */}
        <span className="vibe-scroll-hint">
          {effectiveMode === 'vibes' ? 'SCROLL TO EXPLORE' : 'SCROLL TO BROWSE SONGS • CLICK ANY CARD TO PLAY'}
        </span>
      </div>

      {/* Bottom Left Corner Group: Music Source Selector Pill & Note */}
      <div className="vibe-bottom-left-group">
        {/* Music Source Selector Pill: Initially only the music icon appears; when clicked, expands to let user choose Musicly or My Library without heart emojis */}
        <div 
          ref={sourceMenuRef}
          className={`vibe-source-selector-pill ${isSourceMenuOpen ? 'is-expanded' : 'is-collapsed'}`}
          role="radiogroup" 
          aria-label="Music Source Selector"
        >
          {/* Music Icon Toggle Button */}
          <button
            type="button"
            id="vibe-source-toggle-btn"
            className={`vibe-source-trigger-btn ${isSourceMenuOpen ? 'is-open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsSourceMenuOpen(prev => !prev);
            }}
            title={isSourceMenuOpen ? "Close music source selector" : `Music Source: ${musicSource === 'library' ? 'My Library' : 'Musicly'} (Click to switch)`}
            aria-expanded={isSourceMenuOpen}
          >
            <Music size={14} strokeWidth={1.8} className={`vibe-source-music-icon ${musicSource === 'library' ? 'is-library-source' : ''}`} />
          </button>

          {/* Options: Musicly | My Library (Appears when clicked, NO heart emoji!) */}
          {isSourceMenuOpen && (
            <div className="vibe-source-options-wrap">
              {/* Option 1: Musicly */}
              <button
                type="button"
                id="vibe-source-musicly-btn"
                role="radio"
                aria-checked={musicSource === 'musicly'}
                className={`vibe-source-btn ${musicSource === 'musicly' ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMusicSource('musicly');
                }}
                title="Play from Musicly curated catalog"
              >
                <span>Musicly</span>
              </button>

              {/* Divider */}
              <span className="vibe-source-divider">|</span>

              {/* Option 2: My Library */}
              <button
                type="button"
                id="vibe-source-library-btn"
                role="radio"
                aria-checked={musicSource === 'library'}
                className={`vibe-source-btn ${musicSource === 'library' ? 'is-active' : ''} ${!isLoggedIn ? 'is-locked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLoggedIn) {
                    onOpenAuthModal?.();
                  } else {
                    setMusicSource('library');
                  }
                }}
                title={isLoggedIn ? "Play from your saved favorites & uploads" : "Sign in to access My Library"}
              >
                <span>My Library</span>
                {!isLoggedIn && (
                  <Lock size={10} strokeWidth={2.2} className="vibe-source-lock-icon" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Left Corner Note */}
        <div className="vibe-bottom-left-note">
          <span className="vibe-note-pipe">|</span>
          <div className="vibe-note-text">
            {effectiveMode === 'vibes' ? (
              <>
                <span>MORE SCENES</span>
                <span>COMING SOON</span>
              </>
            ) : (
              <button 
                className="vibe-footer-back-link" 
                onClick={handleBackToVibes}
                disabled={transitionState !== 'idle'}
                title="Return to Vibes view"
              >
                <span>← ALL VIBES</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Right Corner Note & Modern Black Coffee Button */}
      <div className="vibe-bottom-right-note">
        <div className="vibe-bottom-right-text">
          <span>MUSIC</span>
          <span>ANYWHERE</span>
          <span>ALWAYS</span>
        </div>

        {/* Modern Black Coffee Button (vector icon, not an emoji) */}
        <div className="vibe-bottom-coffee-wrapper">
          <button
            id="vibe-bottom-coffee-btn"
            className="vibe-bottom-coffee-btn"
            onClick={onOpenCoffeeModal}
            title="Keep Musicly free"
            aria-label="Keep Musicly free"
          >
            <Coffee size={14} className="vibe-coffee-icon-svg" />
          </button>
          <div className="vibe-bottom-coffee-tooltip" role="tooltip">
            Keep Musicly free
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ChooseYourVibeScene);
