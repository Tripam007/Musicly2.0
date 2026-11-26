import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  Home, 
  Star, 
  Camera, 
  Briefcase, 
  BarChart2, 
  Grid, 
  SlidersHorizontal,
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Heart, 
  Bell, 
  Bookmark, 
  Sparkles, 
  Clock, 
  RotateCw, 
  Globe, 
  Info, 
  Hand,
  Volume2,
  Volume1,
  VolumeX,
  ThumbsUp,
  Speaker,
  Headphones,
  Mic2,
  Music,
  Check,
  X,
  Quote
} from 'lucide-react';
import { getRandomDeadPoetsQuote } from '../data/deadPoetsQuotes';
import AdminBackgroundGalleryModal from './AdminBackgroundGalleryModal';
import StudioThemePaletteModal from './StudioThemePaletteModal';
import StudioNotificationsDropdown from './StudioNotificationsDropdown';
import { STUDIO_THEMES, getSavedStudioTheme, saveStudioTheme, getIsAutoThemeEnabled, setIsAutoThemeEnabled } from '../data/studioThemes';
import { LANGUAGES, isGhazalLanguage, isCountryLanguage, isRabindraSangeetLanguage, isTrackInLanguages } from '../data/tracks';
import { extractThemeFromImage, generateThemeFromHex } from '../utils/themeExtractor';
import { fetchLyrics } from '../utils/lyricsService';
import { playClickSound } from '../utils/audioSynth';
import { 
  getStudioBackgrounds, 
  saveStudioBackgrounds, 
  resetStudioBackgroundsToDefaults,
  DEFAULT_STUDIO_PHOTOS,
  subscribeStudioBackgrounds,
  setActiveStudioBackgroundIndex,
  saveActiveStudioVisual,
  getActiveStudioVisual,
  deduplicateBackgrounds 
} from '../utils/studioBackgroundsDB';
import { isLiveVisual } from '../utils/publicScenesDB';
import { getUnreadStudioNotificationCount, addStudioNotification } from '../utils/studioNotificationsDB';
import { checkIsAdmin } from '../utils/userModel';
import audioEngine from '../utils/audioEngine';
import { 
  getLocalUserPlaylists, 
  loadUserPlaylists, 
  getLocalUserPersonalSongIds, 
  loadUserPersonalSongIds 
} from '../utils/userPlaylistsDB';
import { getUnifiedMusiclyPlaylists } from '../utils/publicPlaylistsDB';

const STUDIO_GENRES = [
  {
    name: 'Lo-Fi',
    image: '/assets/images/lofi_scene.jpg',
    accent: '#f4a000',
    subtitle: 'Chill Beats'
  },
  {
    name: 'Indie',
    image: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=1200&auto=format&fit=crop&q=85',
    accent: '#38ef7d',
    subtitle: 'Acoustic & Warm'
  },
  {
    name: 'Retro',
    image: '/assets/images/retro_scene.jpg',
    accent: '#ff7675',
    subtitle: 'Golden Classics'
  },
  {
    name: 'Synthwave',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=85',
    accent: '#e056fd',
    subtitle: 'Neon Night'
  },
  {
    name: 'Ghazal',
    image: '/assets/images/ghazals_bg.png',
    accent: '#f39c12',
    subtitle: 'Poetic Soul'
  },
  {
    name: 'Country',
    image: '/assets/images/country_scene.jpg',
    accent: '#e67e22',
    subtitle: 'Acoustic Americana'
  },
  {
    name: 'Rabindra Sangeet',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=85',
    accent: '#1abc9c',
    subtitle: 'Tagore Melodies'
  },
  {
    name: 'Peace',
    image: '/assets/images/peace_scene.jpg',
    accent: '#1dd1a1',
    subtitle: 'Calm Sanctuary'
  },
  {
    name: 'Chill/Sleep',
    image: '/assets/images/chill_sleep_scene.jpg',
    accent: '#54a0ff',
    subtitle: 'Deep Slumber'
  }
];

// 🔊 Edge Vertical Volume Slider Component ("from below")
function EdgeVolumeSlider({ volume = 0.85, onVolumeChange, accentColor = '#f4a000' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef(null);
  const [prevNonZeroVolume, setPrevNonZeroVolume] = useState(0.8);

  const safeVolume = typeof volume === 'number' && !isNaN(volume) ? Math.max(0, Math.min(1, volume)) : 0.85;

  const updateVolumeFromPointer = useCallback((clientY) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const fromBottom = rect.bottom - clientY;
    const fraction = fromBottom / rect.height;
    const clamped = Math.max(0, Math.min(1, fraction));
    const rounded = Math.round(clamped * 100) / 100;
    if (onVolumeChange) {
      onVolumeChange(rounded);
    }
  }, [onVolumeChange]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updateVolumeFromPointer(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      e.preventDefault();
      updateVolumeFromPointer(e.clientY);
    };

    const handlePointerUp = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, updateVolumeFromPointer]);

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const next = Math.max(0, Math.min(1, Math.round((safeVolume + delta) * 100) / 100));
    if (onVolumeChange) onVolumeChange(next);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!onVolumeChange) return;
    if (safeVolume > 0) {
      setPrevNonZeroVolume(safeVolume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevNonZeroVolume || 0.8);
    }
  };

  const volumePercent = Math.round(safeVolume * 100);
  // Track height is 130px, thumb height is 30px => available travel range is 100px.
  // bottom offset is safeVolume * 100px:
  const thumbBottomPx = Math.round(safeVolume * 100);

  return (
    <div 
      className={`ref-edge-volume-slider ${isHovered || isDragging ? 'is-active' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      aria-label="Volume Slider"
      role="slider"
      aria-valuenow={volumePercent}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div 
        ref={trackRef}
        className="ref-edge-volume-track"
        onPointerDown={handlePointerDown}
      >
        <div className="ref-edge-volume-groove">
          <div 
            className="ref-edge-volume-fill"
            style={{ 
              height: `${volumePercent}%`,
              background: `linear-gradient(to top, ${accentColor}, #ffffff)`
            }}
          />
        </div>

        {/* Small Box Notch Handle */}
        <div 
          className="ref-edge-volume-thumb"
          style={{ 
            bottom: `${thumbBottomPx}px`,
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}, 0 0 3px #ffffff`
          }}
        >
          <div className="ref-edge-volume-thumb-dot" />
        </div>
      </div>
    </div>
  );
}

export default function MinimalStudioScene({
  currentScene,
  allTracks = [],
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 180,
  volume = 0.85,
  onVolumeChange,
  onSeek,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  selectedGenre,
  onSelectGenre,
  selectedLanguage,
  selectedLanguages = [],
  onSelectLanguage,
  onOpenSceneModal,
  onOpenPlaylistDrawer,
  onOpenSearch,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenAuthModal,
  user,
  isAdmin = false,
  favorites = [],
  onToggleFavorite,
  onClose,
  audioElement,
  audioOutputMode = 'speaker',
  onToggleAudioOutputMode,
  customQueue = [],
  onSetCustomQueue,
  publicPlaylists = [],
  backdropImage = null,
  activePlayingPlaylistId = null,
  onSetActivePlayingPlaylistId = null
}) {
  const isUserAdmin = Boolean(
    isAdmin ||
    checkIsAdmin(user) ||
    (user?.email && user.email.toLowerCase() === 'tripambiswas007@gmail.com') ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('musicly_user_role') === 'admin' ||
      localStorage.getItem('musicly_admin_mode') === 'true'
    ))
  );

  // Active Atmosphere Color Theme (defaults to auto background-adaptive or saved preference)
  const [currentTheme, setCurrentTheme] = useState(() => getSavedStudioTheme());
  const [isAutoTheme, setIsAutoTheme] = useState(() => getIsAutoThemeEnabled());
  const [autoTheme, setAutoTheme] = useState(null);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(() => getUnreadStudioNotificationCount());

  // Live Studio Clock & Calendar Year
  const [studioTime, setStudioTime] = useState(() => new Date());
  const [is24Hour, setIs24Hour] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setStudioTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNotifSync = () => {
      setUnreadNotifCount(getUnreadStudioNotificationCount());
    };
    window.addEventListener('musicly:studio-notification-change', handleNotifSync);
    return () => window.removeEventListener('musicly:studio-notification-change', handleNotifSync);
  }, []);

  // Background gallery state initialized from localStorage/defaults
  const [studioBackgrounds, setStudioBackgrounds] = useState(() => {
    try {
      const local = localStorage.getItem('musicly_studio_bg_gallery');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_STUDIO_PHOTOS;
  });

  // Dedicated permanent active visual URL state (persists directly across reloads, cloud sync, and tracks)
  const [activeVisualUrl, setActiveVisualUrl] = useState(() => {
    try {
      return localStorage.getItem('musicly_active_studio_bg_url') || null;
    } catch {}
    return null;
  });

  // Ensure active visual is also loaded from IndexedDB on startup (handles large data URLs)
  useEffect(() => {
    getActiveStudioVisual().then((savedUrl) => {
      if (savedUrl) {
        setActiveVisualUrl((prev) => prev || savedUrl);
      }
    }).catch(() => {});
  }, []);

  const [mediaPhotoIndex, setMediaPhotoIndex] = useState(() => {
    try {
      const activeUrl = localStorage.getItem('musicly_active_studio_bg_url');
      const saved = localStorage.getItem('musicly_studio_bg_index');
      if (saved !== null) return parseInt(saved, 10) || 0;
    } catch (e) {}
    return 0;
  });

  const updateMediaPhotoIndex = useCallback((updater, activeUrlOverride = null) => {
    setMediaPhotoIndex((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      let urlToSave = activeUrlOverride;
      if (!urlToSave && Array.isArray(studioBackgrounds) && studioBackgrounds[next]) {
        const item = studioBackgrounds[next];
        urlToSave = typeof item === 'string' ? item : (item?.url || '');
      }
      try {
        localStorage.setItem('musicly_studio_bg_index', String(next));
        if (urlToSave) {
          if (!urlToSave.startsWith('data:') || urlToSave.length < 50000) {
            localStorage.setItem('musicly_active_studio_bg_url', urlToSave);
          } else {
            localStorage.setItem('musicly_active_studio_bg_url', `data_ref:${next}`);
          }
          localStorage.setItem('musicly_studio_bg_updated_at', String(Date.now()));
        }
      } catch (e) {}

      if (urlToSave) {
        setActiveVisualUrl(urlToSave);
        saveActiveStudioVisual(urlToSave);
      }
      try {
        setActiveStudioBackgroundIndex(next, urlToSave);
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
          detail: { activeIndex: next, activeUrl: urlToSave }
        }));
      }

      return next;
    });
  }, [studioBackgrounds]);

  // Load persisted background visuals from IndexedDB and sync with cloud and local events in real time
  useEffect(() => {
    let isMounted = true;
    const reload = () => {
      getStudioBackgrounds().then((bgs) => {
        if (isMounted && Array.isArray(bgs) && bgs.length > 0) {
          const deduped = deduplicateBackgrounds(bgs);
          setStudioBackgrounds(deduped);
          try {
            const activeUrl = localStorage.getItem('musicly_active_studio_bg_url');
            if (activeUrl && !activeUrl.startsWith('data_ref:')) {
              setActiveVisualUrl((prev) => prev || activeUrl);
              const foundIdx = deduped.findIndex(item => {
                const u = typeof item === 'string' ? item : (item?.url || '');
                return u === activeUrl;
              });
              if (foundIdx >= 0) {
                setMediaPhotoIndex(foundIdx);
                return;
              }
            }
            const savedIdx = localStorage.getItem('musicly_studio_bg_index');
            if (savedIdx !== null && isMounted) {
              setMediaPhotoIndex(parseInt(savedIdx, 10) || 0);
            }
          } catch (e) {}
        }
      }).catch(() => {});
    };

    reload();
    window.addEventListener('musicly_studio_bg_updated', reload);

    // Cross-device cloud sync: listen in real time for any background or active visual changes
    const unsubCloud = subscribeStudioBackgrounds(({ backgrounds, activeIndex, activeUrl }) => {
      if (!isMounted) return;
      if (Array.isArray(backgrounds) && backgrounds.length > 0) {
        const deduped = deduplicateBackgrounds(backgrounds);
        setStudioBackgrounds(deduped);
        if (activeUrl) {
          setActiveVisualUrl(activeUrl);
          const foundIdx = deduped.findIndex(b => {
            const u = typeof b === 'string' ? b : (b?.url || '');
            return u === activeUrl;
          });
          if (foundIdx >= 0) {
            setMediaPhotoIndex(foundIdx);
            return;
          }
        }
      }
      if (typeof activeIndex === 'number' && !activeVisualUrl) {
        setMediaPhotoIndex(activeIndex);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('musicly_studio_bg_updated', reload);
      if (unsubCloud) unsubCloud();
    };
  }, [activeVisualUrl]);

  const currentStudioBgUrl = useMemo(() => {
    // 1. If an active studio visual URL is chosen, it is 100% PERMANENTLY LOCKED
    if (activeVisualUrl) {
      return activeVisualUrl;
    }

    try {
      const activeSavedUrl = localStorage.getItem('musicly_active_studio_bg_url');
      if (activeSavedUrl) return activeSavedUrl;
    } catch {}

    // 2. Otherwise use the safe index in studioBackgrounds
    if (Array.isArray(studioBackgrounds) && studioBackgrounds.length > 0) {
      const safeIdx = mediaPhotoIndex % studioBackgrounds.length;
      const item = studioBackgrounds[safeIdx];
      return typeof item === 'string' ? item : (item?.url || '/assets/images/zenitsu_clean_wallpaper.jpg');
    }

    return '/assets/images/zenitsu_clean_wallpaper.jpg';
  }, [activeVisualUrl, studioBackgrounds, mediaPhotoIndex]);

  // When the user plays something else (outside the country playlist), automatically clear country playlist state
  useEffect(() => {
    if (!activePlayingPlaylistId || !currentTrack) return;
    const isCountryPl = activePlayingPlaylistId === 'country_roots' || String(activePlayingPlaylistId).toLowerCase().includes('country');
    if (isCountryPl) {
      const isCountry = Boolean(
        (typeof currentTrack.genre === 'string' && currentTrack.genre.toLowerCase().includes('country')) ||
        (Array.isArray(currentTrack.genres) && currentTrack.genres.some(g => (g || '').toLowerCase().includes('country'))) ||
        (Array.isArray(currentTrack.sections) && currentTrack.sections.some(s => (s || '').toLowerCase().includes('country')))
      );
      if (!isCountry) {
        onSetActivePlayingPlaylistId?.(null);
        try {
          localStorage.removeItem('musicly_active_playlist_id');
        } catch {}
      }
    }
  }, [currentTrack, activePlayingPlaylistId, onSetActivePlayingPlaylistId]);

  // When user explicitly selects any curated or custom theme, manual selection is active
  const handleSelectTheme = useCallback((theme) => {
    setCurrentTheme(theme);
    setIsAutoTheme(false);
    setIsAutoThemeEnabled(false);
    saveStudioTheme(theme);
    setToastMsg(`Atmosphere: ${theme.name}`);
    setTimeout(() => setToastMsg(null), 2500);
    try {
      addStudioNotification({
        type: 'theme',
        title: 'New Color Atmosphere Applied',
        message: `"${theme.name}" 6-color merging blend palette is active in your studio.`,
        meta: { themeId: theme.id, themeName: theme.name, swatches: theme.swatches }
      });
    } catch (e) {}
  }, []);

  // Toggle dynamic background color auto-sync
  const handleToggleAutoTheme = useCallback((enabled) => {
    setIsAutoTheme(enabled);
    setIsAutoThemeEnabled(enabled);
    if (enabled) {
      if (autoTheme) {
        setCurrentTheme(autoTheme);
        saveStudioTheme(autoTheme);
      } else if (currentStudioBgUrl) {
        extractThemeFromImage(currentStudioBgUrl).then((extracted) => {
          if (extracted) {
            setAutoTheme(extracted);
            setCurrentTheme(extracted);
            saveStudioTheme(extracted);
          }
        });
      }
      setToastMsg('Atmosphere: Synced with Background');
    } else {
      setToastMsg('Auto-Sync Paused (Manual Theme Active)');
    }
    setTimeout(() => setToastMsg(null), 2500);
  }, [autoTheme, currentStudioBgUrl]);

  // Generate & apply custom theme from any color picker hex
  const handleSelectCustomHex = useCallback((hex) => {
    const customTheme = generateThemeFromHex(hex);
    setCurrentTheme(customTheme);
    setIsAutoTheme(false);
    setIsAutoThemeEnabled(false);
    saveStudioTheme(customTheme);
    setToastMsg(`Custom Atmosphere: ${hex.toUpperCase()}`);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Theme CSS custom properties injected into the stage container
  const themeStyles = useMemo(() => {
    const s = currentTheme?.swatches || ['#09090B', '#18181B', '#27272A', '#3F3F46', '#A1A1AA', '#F4F4F5'];
    const accent = currentTheme?.accent || '#E4E4E7';
    const accentLight = currentTheme?.accentLight || '#FFFFFF';
    const accentDark = currentTheme?.accentDark || '#3F3F46';
    const accentRgb = currentTheme?.accentRgb || '228, 228, 231';
    const dockGrad = currentTheme?.dockGradient || 'linear-gradient(180deg, rgba(39, 39, 42, 0.90) 0%, rgba(24, 24, 27, 0.94) 50%, rgba(9, 9, 11, 0.98) 100%)';
    const dockBorder = currentTheme?.dockBorder || 'rgba(228, 228, 231, 0.32)';
    const dockShadow = currentTheme?.dockShadow || 'rgba(0, 0, 0, 0.60)';
    const pillBg = currentTheme?.pillBg || 'linear-gradient(180deg, rgba(39, 39, 42, 0.92) 0%, rgba(24, 24, 27, 0.96) 100%)';
    const pillBorder = currentTheme?.pillBorder || 'rgba(228, 228, 231, 0.30)';

    return {
      '--ref-s0': s[0],
      '--ref-s1': s[1],
      '--ref-s2': s[2],
      '--ref-s3': s[3],
      '--ref-s4': s[4],
      '--ref-s5': s[5],
      '--ref-accent': accent,
      '--ref-accent-light': accentLight,
      '--ref-accent-dark': accentDark,
      '--ref-accent-glow': `rgba(${accentRgb}, 0.7)`,
      '--ref-dock-grad': dockGrad,
      '--ref-dock-border': dockBorder,
      '--ref-dock-shadow': dockShadow,
      '--ref-pill-bg': pillBg,
      '--ref-pill-border': pillBorder,
      '--ref-blend-gadget-screen': `linear-gradient(135deg, ${s[5]} 0%, ${s[4]} 32%, ${s[3]} 68%, ${s[2]} 100%)`,
      '--ref-blend-gadget-bezel': `linear-gradient(165deg, ${s[2]} 0%, ${s[1]} 55%, ${s[0]} 100%)`,
      '--ref-blend-gadget-text': s[0],
      '--ref-blend-active-pill': `linear-gradient(135deg, ${s[5]} 0%, ${s[4]} 48%, ${s[3]} 100%)`,
      '--ref-blend-btn': `linear-gradient(135deg, ${s[5]} 0%, ${s[4]} 45%, ${s[3]} 85%, ${s[2]} 100%)`,
      '--ref-btn-shadow': `0 8px 24px -2px ${s[3]}b3, 0 4px 12px ${s[4]}80`,
      '--ref-blend-gauge': `conic-gradient(from 200deg at 50% 50%, ${s[1]} 0deg, ${s[2]} 60deg, ${s[3]} 135deg, ${s[4]} 215deg, ${s[5]} 285deg, ${s[4]} 330deg, ${s[2]} 360deg)`,
      '--ref-blend-ambient': `radial-gradient(ellipse 70% 60% at 85% 15%, ${s[4]}38 0%, transparent 65%), radial-gradient(ellipse 75% 65% at 15% 85%, ${s[3]}30 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${s[1]}70 0%, ${s[0]} 100%)`,
      '--ref-ambient-glow-1': currentTheme?.ambientGlow1 || 'rgba(161, 161, 170, 0.35)',
      '--ref-ambient-glow-2': currentTheme?.ambientGlow2 || 'rgba(24, 24, 27, 0.70)'
    };
  }, [currentTheme]);

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [activeSidebarTab, setActiveSidebarTab] = useState('home');
  const [isSaved, setIsSaved] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isThumbsUp, setIsThumbsUp] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [dpsQuote, setDpsQuote] = useState(() => ({
    quote: "O Captain! My Captain!",
    author: "Dead Poets Society"
  }));

  const handleNextDpsQuote = useCallback(() => {
    setDpsQuote(getRandomDeadPoetsQuote());
  }, []);
  const [isAdminGalleryOpen, setIsAdminGalleryOpen] = useState(false);
  const [isQuickBgPickerOpen, setIsQuickBgPickerOpen] = useState(false);
  const quickBgPickerRef = useRef(null);
  const cameraClickTimerRef = useRef(null);

  useEffect(() => {
    if (!isQuickBgPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (quickBgPickerRef.current && !quickBgPickerRef.current.contains(e.target)) {
        setIsQuickBgPickerOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [isQuickBgPickerOpen]);

  const handleCameraClick = (e) => {
    e.stopPropagation();
    if (isUserAdmin) {
      setIsAdminGalleryOpen((prev) => !prev);
      setIsQuickBgPickerOpen(false);
    } else {
      setIsQuickBgPickerOpen((prev) => !prev);
    }
  };

  const waveformRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => current === msg ? null : current);
    }, 2200);
  }, []);

  // Live dynamic background theme extraction
  useEffect(() => {
    let isMounted = true;
    if (!currentStudioBgUrl) return;

    extractThemeFromImage(currentStudioBgUrl).then((extracted) => {
      if (!isMounted || !extracted) return;
      setAutoTheme(extracted);

      // If user has Auto-theme enabled or an auto-theme is active, apply the accurate extracted theme!
      if (getIsAutoThemeEnabled() || isAutoTheme || currentTheme?.isAuto || currentTheme?.id === 'auto_from_bg') {
        setCurrentTheme(extracted);
        setIsAutoTheme(true);
        saveStudioTheme(extracted);
      }
    }).catch((err) => {
      console.warn('Auto theme extraction notice:', err);
    });

    return () => { isMounted = false; };
  }, [currentStudioBgUrl]);

  const handleAddStudioBg = useCallback((newBg) => {
    const bgUrl = typeof newBg === 'string' ? newBg : (newBg?.url || '');
    setStudioBackgrounds((prev) => {
      const next = deduplicateBackgrounds([newBg, ...prev]);
      saveStudioBackgrounds(next);
      return next;
    });
    if (bgUrl) {
      setActiveVisualUrl(bgUrl);
      saveActiveStudioVisual(bgUrl);
    }
    updateMediaPhotoIndex(0, bgUrl);
    try {
      const bgTitle = typeof newBg === 'string' ? 'Custom Studio Visual' : (newBg.title || 'Studio Background Visual');
      addStudioNotification({
        type: 'background',
        title: 'New Background Visual Added',
        message: `"${bgTitle}" (4K UHD) is ready in your studio gallery.`,
        meta: { imageUrl: typeof newBg === 'string' ? newBg : newBg.url, title: bgTitle }
      });
    } catch (e) {}
  }, [updateMediaPhotoIndex]);

  const handleRemoveStudioBg = useCallback((indexToRemove, bgToRemove = null) => {
    setStudioBackgrounds((prev) => {
      if (prev.length <= 1) return prev;
      let next;
      if (bgToRemove) {
        const removeUrl = typeof bgToRemove === 'string' ? bgToRemove : (bgToRemove?.url || '');
        const removeId = typeof bgToRemove === 'string' ? '' : (bgToRemove?.id || '');
        next = prev.filter(b => {
          const u = typeof b === 'string' ? b : (b?.url || '');
          const id = typeof b === 'string' ? '' : (b?.id || '');
          if (removeId && id === removeId) return false;
          if (removeUrl && u === removeUrl) return false;
          return true;
        });
      } else {
        next = prev.filter((_, idx) => idx !== indexToRemove);
      }
      saveStudioBackgrounds(next);
      return next;
    });
    updateMediaPhotoIndex((prev) => {
      if (prev >= indexToRemove && prev > 0) return prev - 1;
      return 0;
    });
  }, [updateMediaPhotoIndex]);

  const handleSelectStudioBg = useCallback((index, bg) => {
    let bgUrl = typeof bg === 'string' ? bg : (bg?.url || '');
    if (!bgUrl && Array.isArray(studioBackgrounds) && studioBackgrounds[index]) {
      const item = studioBackgrounds[index];
      bgUrl = typeof item === 'string' ? item : (item?.url || '');
    }
    if (bgUrl) {
      setActiveVisualUrl(bgUrl);
      saveActiveStudioVisual(bgUrl);
    }
    const realIdx = Array.isArray(studioBackgrounds) ? studioBackgrounds.findIndex(b => {
      const u = typeof b === 'string' ? b : (b?.url || '');
      const id = typeof b === 'string' ? '' : (b?.id || '');
      return (bgUrl && u === bgUrl) || (bg?.id && id === bg.id);
    }) : -1;
    updateMediaPhotoIndex(realIdx >= 0 ? realIdx : index, bgUrl);
  }, [studioBackgrounds, updateMediaPhotoIndex]);

  const handleResetStudioBgDefaults = useCallback(() => {
    resetStudioBackgroundsToDefaults().then((defaults) => {
      setStudioBackgrounds(defaults);
      const firstBg = defaults[0];
      const firstUrl = typeof firstBg === 'string' ? firstBg : (firstBg?.url || '');
      if (firstUrl) {
        setActiveVisualUrl(firstUrl);
        saveActiveStudioVisual(firstUrl);
      }
      updateMediaPhotoIndex(0, firstUrl);
      showToast("Restored clean studio visuals (cleared duplicate overlays)");
    });
  }, [updateMediaPhotoIndex, showToast]);

  // Slideshow Auto-Cycle Background with Music Tracks (disabled so background stays fixed)
  const [isAutoCycleBg, setIsAutoCycleBg] = useState(() => {
    try {
      localStorage.setItem('musicly_auto_cycle_bg', 'false');
    } catch (e) {}
    return false;
  });

  const handleToggleAutoCycleBg = useCallback((enabled) => {
    setIsAutoCycleBg(enabled);
    try {
      localStorage.setItem('musicly_auto_cycle_bg', String(enabled));
    } catch (e) {}
    showToast(enabled ? "Visual Slideshow: Auto-cycles on track change" : "Visual Slideshow: Paused");
  }, [showToast]);

  // Quick Randomize / Shuffle Studio Visual
  const handleShuffleBackground = useCallback(() => {
    if (!studioBackgrounds || studioBackgrounds.length <= 1) return;
    const currentIdx = mediaPhotoIndex % studioBackgrounds.length;
    let nextIdx = Math.floor(Math.random() * studioBackgrounds.length);
    if (nextIdx === currentIdx) {
      nextIdx = (nextIdx + 1) % studioBackgrounds.length;
    }
    const item = studioBackgrounds[nextIdx];
    const itemUrl = typeof item === 'string' ? item : (item?.url || '');
    if (itemUrl) {
      setActiveVisualUrl(itemUrl);
      saveActiveStudioVisual(itemUrl);
    }
    updateMediaPhotoIndex(nextIdx, itemUrl);
    const title = typeof item === 'string' ? `Visual ${nextIdx + 1}` : (item?.title || `Visual ${nextIdx + 1}`);
    showToast(`Shuffled to: ${title}`);
  }, [studioBackgrounds, mediaPhotoIndex, updateMediaPhotoIndex, showToast]);

  // Active track resolution
  const activeTrack = useMemo(() => {
    return currentTrack || allTracks[0] || {
      id: 'default-track',
      title: 'The Night We Met',
      artist: 'Lord Huron',
      genre: 'Indie',
      duration: 208,
      image: '/assets/images/vibe_card_01.jpg'
    };
  }, [currentTrack, allTracks]);

  // 🎵 Playback Source State: 'musicly' catalog vs 'own' Mine Playlist (private mixes & personal songs)
  const [playSource, setPlaySource] = useState('musicly');

  // User's private playlists and personal songs state (synced with userPlaylistsDB)
  const [userPlaylists, setUserPlaylists] = useState(() => getLocalUserPlaylists(user));
  const [userPersonalSongIds, setUserPersonalSongIds] = useState(() => getLocalUserPersonalSongIds(user));

  useEffect(() => {
    setUserPlaylists(getLocalUserPlaylists(user));
    setUserPersonalSongIds(getLocalUserPersonalSongIds(user));
    loadUserPlaylists(user).then(loaded => {
      if (Array.isArray(loaded)) setUserPlaylists(loaded);
    });
    loadUserPersonalSongIds(user).then(loadedIds => {
      if (Array.isArray(loadedIds)) setUserPersonalSongIds(loadedIds);
    });
  }, [user]);

  // User's private "Mine Playlist" tracks ONLY (private mixes, personal songs, and unlisted uploads)
  const mineTracks = useMemo(() => {
    const personalIdSet = new Set(userPersonalSongIds || []);
    (userPlaylists || []).forEach(pl => {
      if (Array.isArray(pl.trackIds)) {
        pl.trackIds.forEach(id => personalIdSet.add(id));
      }
    });

    return (allTracks || []).filter(track => {
      if (!track) return false;
      // 1. Explicitly part of Mine Playlist (Single Songs or custom user playlist)
      if (personalIdSet.has(track.id)) return true;
      // 2. Private custom upload by the user (never seen publicly)
      if (track.isCustom && !track.isPublic) return true;
      // 3. User's own custom track
      if (track.isCustom && (track.userId === user?.uid || !track.userId)) return true;
      return false;
    });
  }, [allTracks, userPersonalSongIds, userPlaylists, user?.uid]);

  // Backward compatibility alias for any existing references
  const ownTracks = mineTracks;

  // Resolve active playing playlist name (for official curated playlists, custom playlists, or 'Mine Playlist')
  const activePlayingPlaylistName = useMemo(() => {
    if (playSource === 'own') {
      return 'Mine Playlist';
    }

    if (!activePlayingPlaylistId || !currentTrack) return null;

    if (activePlayingPlaylistId === 'liked_songs') {
      const isLiked = favorites && (favorites.includes(currentTrack.id) || favorites.some(f => (f?.id || f) === currentTrack.id));
      return isLiked ? 'Liked Songs' : null;
    }

    let pl = null;
    try {
      const unified = getUnifiedMusiclyPlaylists(allTracks, publicPlaylists);
      pl = unified.find(p => p.id === activePlayingPlaylistId);
    } catch (e) {}

    if (!pl) {
      try {
        const foundUserPl = (userPlaylists || []).find(p => p.id === activePlayingPlaylistId);
        if (foundUserPl) {
          const plTracks = (foundUserPl.trackIds || []).map(tId => (allTracks || []).find(t => t.id === tId)).filter(Boolean);
          pl = { ...foundUserPl, tracks: plTracks };
        }
      } catch (e) {}
    }

    if (!pl || !Array.isArray(pl.tracks) || pl.tracks.length === 0) return null;

    const belongs = pl.tracks.some(t => 
      t && currentTrack && (
        t.id === currentTrack.id || 
        (t.title && currentTrack.title && t.title.toLowerCase().trim() === currentTrack.title.toLowerCase().trim())
      )
    );

    if (!belongs) return null;

    const BUILTIN_NAMES = {
      'country_roots': 'Country Roads & Roots',
      'timeless_ghazals': 'Timeless Ghazals & Mehfil',
      'vintage_retro': 'Vintage Retro Classics',
      'latenight_lofi': 'Late Night Lo-Fi',
      'indie_warmth': 'Indie Acoustic Sessions',
      'bengali_classics': 'Rabindra Sangeet & Folk',
      'peace_playlist': 'Peace',
      'global_other_melodies': 'Global & Other Melodies'
    };

    return BUILTIN_NAMES[activePlayingPlaylistId] || pl.title || pl.name || (
      typeof activePlayingPlaylistId === 'string' && activePlayingPlaylistId.trim()
        ? activePlayingPlaylistId.replace(/[_-]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : null
    );
  }, [playSource, activePlayingPlaylistId, allTracks, publicPlaylists, userPlaylists, currentTrack, favorites]);

  // Dedicated next/prev song handlers that strictly isolate 'own' (Mine Playlist only) vs 'musicly'
  const handleNextSong = useCallback(() => {
    if (playSource === 'own') {
      if (mineTracks.length > 0) {
        const curIdx = mineTracks.findIndex(t => t.id === activeTrack?.id);
        const nextIdx = (curIdx + 1) % mineTracks.length;
        const nextSong = mineTracks[nextIdx];
        if (nextSong && onSelectTrack) {
          const nextQueue = [];
          for (let i = 1; i < mineTracks.length; i++) {
            nextQueue.push(mineTracks[(nextIdx + i) % mineTracks.length]);
          }
          if (onSetCustomQueue) {
            onSetCustomQueue(nextQueue);
          }
          onSelectTrack(nextSong, true, true);
          showToast(`Mine Playlist: ${nextSong.title}`);
        }
        return;
      } else {
        showToast("Mine Playlist is empty! Open library to add songs.");
        if (onOpenPlaylistDrawer) onOpenPlaylistDrawer();
        return;
      }
    }
    if (onNextTrack) onNextTrack();
  }, [playSource, mineTracks, activeTrack?.id, onSelectTrack, onSetCustomQueue, onNextTrack, showToast, onOpenPlaylistDrawer]);

  const handlePrevSong = useCallback(() => {
    if (playSource === 'own') {
      if (mineTracks.length > 0) {
        const curIdx = mineTracks.findIndex(t => t.id === activeTrack?.id);
        const prevIdx = (curIdx - 1 + mineTracks.length) % mineTracks.length;
        const prevSong = mineTracks[prevIdx];
        if (prevSong && onSelectTrack) {
          const nextQueue = [];
          for (let i = 1; i < mineTracks.length; i++) {
            nextQueue.push(mineTracks[(prevIdx + i) % mineTracks.length]);
          }
          if (onSetCustomQueue) {
            onSetCustomQueue(nextQueue);
          }
          onSelectTrack(prevSong, true, true);
          showToast(`Mine Playlist: ${prevSong.title}`);
        }
        return;
      } else {
        showToast("Mine Playlist is empty! Open library to add songs.");
        if (onOpenPlaylistDrawer) onOpenPlaylistDrawer();
        return;
      }
    }
    if (onPrevTrack) onPrevTrack();
  }, [playSource, mineTracks, activeTrack?.id, onSelectTrack, onSetCustomQueue, onPrevTrack, showToast, onOpenPlaylistDrawer]);

  // Handle switching between public Musicly catalog and user's private Mine Playlist
  const handleSourceChange = useCallback((source) => {
    setPlaySource(source);
    if (source === 'own') {
      if (mineTracks.length > 0) {
        const curIdx = mineTracks.findIndex(t => t.id === activeTrack?.id);
        const startSong = curIdx >= 0 ? mineTracks[curIdx] : mineTracks[0];
        const startIndex = curIdx >= 0 ? curIdx : 0;
        const nextQueue = [];
        for (let i = 1; i < mineTracks.length; i++) {
          nextQueue.push(mineTracks[(startIndex + i) % mineTracks.length]);
        }
        if (onSetCustomQueue) {
          onSetCustomQueue(nextQueue);
        }
        if (onSelectTrack && startSong.id !== activeTrack?.id) {
          onSelectTrack(startSong, true, true);
        }
        showToast(`Playing Mine Playlist: ${startSong.title}`);
      } else {
        showToast("Mine Playlist is empty! Open library to add songs.");
        if (onOpenPlaylistDrawer) onOpenPlaylistDrawer();
      }
    } else {
      if (onSetCustomQueue) {
        onSetCustomQueue([]);
      }
      const musiclyCatalog = (allTracks || []).filter(t => !t?.isCustom || !!t?.isPublic);
      const chosen = musiclyCatalog[0] || allTracks[0];
      if (chosen && onSelectTrack) {
        onSelectTrack(chosen, true);
        showToast(`Playing Musicly Catalog: ${chosen.title}`);
      }
    }
  }, [mineTracks, activeTrack?.id, allTracks, onSelectTrack, onSetCustomQueue, showToast, onOpenPlaylistDrawer]);

  // Auto-advance strictly within Mine Playlist when track ends and 'own' is selected
  useEffect(() => {
    const unsub = audioEngine.subscribe((event) => {
      if (event.type === 'ENDED' && playSource === 'own' && mineTracks.length > 0) {
        const curIdx = mineTracks.findIndex(t => t.id === activeTrack?.id);
        const nextIdx = (curIdx + 1) % mineTracks.length;
        const nextSong = mineTracks[nextIdx];
        if (nextSong && onSelectTrack) {
          onSelectTrack(nextSong, true, true);
        }
      }
    });
    return () => unsub();
  }, [playSource, mineTracks, activeTrack?.id, onSelectTrack]);

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

  // Check if track matches a language filter (null/empty plays all languages)
  const isTrackMatchingLang = useCallback((track, filterLangs) => {
    if (!track) return false;
    return isTrackInLanguages(track.language, filterLangs);
  }, []);

  // Song language selection handler (toggles language in/out of selection)
  const handleLanguageClick = useCallback((lang) => {
    if (onSelectLanguage) {
      onSelectLanguage(lang);
    }
  }, [onSelectLanguage]);

  // 🎙️ Zero-Lag High-Performance Lyrics State
  const [lyricsData, setLyricsData] = useState(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [livePlayTime, setLivePlayTime] = useState(currentTime || 0);
  const activeLineRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef(null);
  const lastTimeRef = useRef(currentTime || 0);

  // Sync initial live play time with currentTime prop and detect user seeks
  useEffect(() => {
    const cur = currentTime || 0;
    const diff = Math.abs(cur - lastTimeRef.current);
    if (diff > 0.8) {
      // User scrubbed or seeked: clear scroll-lock immediately so auto-scroll resumes
      isUserScrollingRef.current = false;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    }
    lastTimeRef.current = cur;
    setLivePlayTime(cur);
  }, [currentTime]);

  // Subscribe directly to audioEngine for real-time engine-level TIME_UPDATE events
  useEffect(() => {
    const unsub = audioEngine.subscribe((event) => {
      if (event.type === 'TIME_UPDATE' && typeof event.currentTime === 'number') {
        const diff = Math.abs(event.currentTime - lastTimeRef.current);
        if (diff > 0.8) {
          isUserScrollingRef.current = false;
          if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
        }
        lastTimeRef.current = event.currentTime;
        setLivePlayTime(event.currentTime);
      }
    });
    return () => unsub();
  }, []);

  // Frame-accurate micro-interpolation for synchronized lyrics (Native & YouTube) with seek immunity
  useEffect(() => {
    if (!isPlaying) {
      setLivePlayTime(currentTime || 0);
      return;
    }

    let animId;
    let lastPoll = 0;
    const pollLiveTime = (now) => {
      if (now - lastPoll >= 75) {
        lastPoll = now;
        let t = currentTime || 0;
        if (audioEngine.isSeeking) {
          t = audioEngine.currentTime !== undefined ? audioEngine.currentTime : (currentTime || 0);
        } else if (audioEngine.playbackMode === 'native' && audioEngine.audio && !isNaN(audioEngine.audio.currentTime)) {
          t = audioEngine.audio.currentTime;
        } else if (audioEngine.currentTime !== undefined && !isNaN(audioEngine.currentTime) && audioEngine.currentTime > 0) {
          t = audioEngine.currentTime;
        } else if (audioElement && !isNaN(audioElement.currentTime)) {
          t = audioElement.currentTime;
        }
        setLivePlayTime(t);
      }
      animId = requestAnimationFrame(pollLiveTime);
    };

    animId = requestAnimationFrame(pollLiveTime);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentTime, audioElement]);

  // Pre-load lyrics immediately whenever activeTrack changes (ensures ZERO lag/delay on click!)
  useEffect(() => {
    if (!activeTrack?.title) {
      setLyricsData(null);
      return;
    }
    let isMounted = true;
    setIsLyricsLoading(true);
    isUserScrollingRef.current = false;
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    fetchLyrics(activeTrack, duration || activeTrack.duration || 180)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsLyricsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLyricsData({ notFound: true });
          setIsLyricsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [activeTrack?.id, activeTrack?.title, activeTrack?.artist, duration]);

  // Track active line index in synced & plain lyrics with calibrated vocal onset anticipation
  const activeLineIndex = useMemo(() => {
    if (!lyricsData?.lines || lyricsData.lines.length === 0) return -1;

    const rawTime = (livePlayTime !== null && livePlayTime !== undefined && !isNaN(livePlayTime))
      ? livePlayTime
      : (currentTime || 0);
    // 80ms vocal anticipation locks in synchronously on vocal onset
    const playbackTime = rawTime + 0.08;

    // 1. Synced LRC lyrics with explicit millisecond timestamps
    if (lyricsData.isSynced) {
      let idx = -1;
      for (let i = 0; i < lyricsData.lines.length; i++) {
        const lineTime = lyricsData.lines[i].time;
        if (lineTime !== undefined && lineTime <= playbackTime) {
          idx = i;
        } else if (lineTime !== undefined && lineTime > playbackTime) {
          break;
        }
      }
      return idx;
    }

    // 2. Unsynced Plain Lyrics: fallback smoothly to duration-based progress estimation
    const effectiveDur = (duration && duration > 0) ? duration : (activeTrack?.duration || 180);
    if (effectiveDur > 0 && rawTime > 0) {
      const progress = Math.min(1, Math.max(0, rawTime / effectiveDur));
      const lineIdx = Math.min(lyricsData.lines.length - 1, Math.floor(progress * lyricsData.lines.length));
      return lineIdx;
    }

    return 0;
  }, [lyricsData, livePlayTime, currentTime, duration, activeTrack?.duration]);

  // Dedicated internal scroll function for lyrics: ONLY scrolls lyricsContainerRef, NEVER scrolls ancestor frames or window!
  const scrollToActiveLyricLine = useCallback((behavior = 'smooth') => {
    const container = lyricsContainerRef.current;
    const activeEl = activeLineRef.current;
    if (!container || !activeEl) return;

    // Calculate position strictly relative to the container without bubbling to parent DOM
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;
    const targetScrollTop = currentScrollTop + (activeRect.top - containerRect.top) - (container.clientHeight / 2) + (activeRect.height / 2);

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior
    });

    // Zero out any unintentional scroll displacement on ancestors
    const photoFrame = container.closest('.ref-main-photo-frame');
    if (photoFrame && photoFrame.scrollTop !== 0) {
      photoFrame.scrollTop = 0;
    }
    const centerStage = container.closest('.ref-center-stage');
    if (centerStage && centerStage.scrollTop !== 0) {
      centerStage.scrollTop = 0;
    }
  }, []);

  // Handle user manual scroll with auto-scroll resume timer that automatically re-centers
  const handleLyricsManualScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      scrollToActiveLyricLine('smooth');
    }, 1800);
  }, [scrollToActiveLyricLine]);

  // Smooth auto-scroll following the active synced line (strictly constrained to lyricsContainer)
  useEffect(() => {
    if (isLyricsOpen && activeLineRef.current && !isUserScrollingRef.current) {
      scrollToActiveLyricLine('smooth');
    }
  }, [activeLineIndex, isLyricsOpen, scrollToActiveLyricLine]);

  // When lyrics are opened, automatically scroll to the currently active lyric line
  useEffect(() => {
    if (isLyricsOpen) {
      const timer = setTimeout(() => {
        scrollToActiveLyricLine('auto');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isLyricsOpen, scrollToActiveLyricLine]);

  // Filter available studio genres based on language (Ghazal for Hindi, Country for English, Rabindra Sangeet for Bengali)
  const availableStudioGenres = useMemo(() => {
    return STUDIO_GENRES.filter(g => {
      const gName = g.name.toLowerCase();
      if (gName === 'ghazal') {
        return isGhazalLanguage(activeLangs);
      }
      if (gName === 'country') {
        return isCountryLanguage(activeLangs);
      }
      if (gName === 'rabindra sangeet') {
        return isRabindraSangeetLanguage(activeLangs);
      }
      return true;
    });
  }, [activeLangs]);

  // Resolve track genre to index in availableStudioGenres with strict priority matching
  const getGenreIndexForTrack = useCallback((track) => {
    if (!track) return 0;
    const tGenre = (track.genre || '').trim().toLowerCase();

    // 1. Direct exact match on track.genre first!
    if (tGenre) {
      const directIdx = availableStudioGenres.findIndex(g => g.name.toLowerCase() === tGenre);
      if (directIdx >= 0) return directIdx;

      // Check comma-separated primary genres in the track's order (e.g., "Synthwave, Retro")
      const splitGenres = tGenre.split(',').map(s => s.trim().toLowerCase());
      for (const sg of splitGenres) {
        const sIdx = availableStudioGenres.findIndex(g => g.name.toLowerCase() === sg);
        if (sIdx >= 0) return sIdx;
      }
    }

    // 2. Check track.genres array in the TRACK'S OWN ORDER (do not loop through availableStudioGenres)
    if (Array.isArray(track.genres)) {
      for (const gItem of track.genres) {
        const gLower = (gItem || '').trim().toLowerCase();
        const foundIdx = availableStudioGenres.findIndex(g => g.name.toLowerCase() === gLower);
        if (foundIdx >= 0) return foundIdx;
      }
    }

    return 0;
  }, [availableStudioGenres]);

  const [currentGenreIndex, setCurrentGenreIndex] = useState(() => {
    if (selectedGenre && selectedGenre !== 'All') {
      const foundIdx = availableStudioGenres.findIndex(g => g.name.toLowerCase() === selectedGenre.toLowerCase());
      if (foundIdx >= 0) return foundIdx;
    }
    return getGenreIndexForTrack(activeTrack);
  });

  // Clamp genre index if availableStudioGenres changes
  useEffect(() => {
    if (currentGenreIndex >= availableStudioGenres.length) {
      setCurrentGenreIndex(0);
    }
  }, [availableStudioGenres.length, currentGenreIndex]);

  const isUserNavigatingGenreRef = useRef(false);

  // Keep genre aligned when activeTrack changes externally (e.g. Next/Prev button)
  useEffect(() => {
    if (isUserNavigatingGenreRef.current) {
      isUserNavigatingGenreRef.current = false;
      return;
    }
    if (activeTrack) {
      const idx = getGenreIndexForTrack(activeTrack);
      setCurrentGenreIndex(idx);
    }
  }, [activeTrack?.id, getGenreIndexForTrack]);

  const lastWheelTimeRef = useRef(0);
  const genreBoxRef = useRef(null);

  const changeGenre = useCallback((direction) => {
    isUserNavigatingGenreRef.current = true;
    setCurrentGenreIndex((prev) => {
      const listLen = availableStudioGenres.length;
      if (listLen === 0) return 0;
      const nextIdx = (prev + direction + listLen) % listLen;
      const targetGenreObj = availableStudioGenres[nextIdx];
      const target = targetGenreObj.name.toLowerCase();

      const sourcePool = playSource === 'own' 
        ? mineTracks 
        : (allTracks || []).filter(t => !t?.isCustom || !!t?.isPublic);

      // Find all tracks matching this target genre AND selected language
      const matchingTracks = sourcePool.filter(track => {
        if (!track) return false;
        if (!isTrackMatchingLang(track, selectedLanguage)) return false;
        const g = (track.genre || '').toLowerCase();
        const gs = Array.isArray(track.genres) ? track.genres.map(x => (x || '').toLowerCase()) : [];
        const split = typeof track.genre === 'string' ? track.genre.split(',').map(s => s.trim().toLowerCase()) : [];
        return g === target || gs.includes(target) || split.includes(target);
      });

      const finalTracks = matchingTracks.length > 0 ? matchingTracks : sourcePool.filter(track => {
        if (!track) return false;
        const g = (track.genre || '').toLowerCase();
        const gs = Array.isArray(track.genres) ? track.genres.map(x => (x || '').toLowerCase()) : [];
        const split = typeof track.genre === 'string' ? track.genre.split(',').map(s => s.trim().toLowerCase()) : [];
        return g === target || gs.includes(target) || split.includes(target);
      });

      if (finalTracks.length > 0) {
        // If current track is already in the matching tracks list, take the next one; otherwise take the first
        const curIdx = finalTracks.findIndex(t => t.id === activeTrack?.id);
        const chosenTrack = curIdx >= 0 
          ? finalTracks[(curIdx + 1) % finalTracks.length]
          : finalTracks[0];

        if (onSelectTrack && chosenTrack) {
          onSelectTrack(chosenTrack, true);
        }
        showToast(`Genre: ${targetGenreObj.name} • ${chosenTrack.title}`);
      } else {
        showToast(`Genre: ${targetGenreObj.name}`);
      }

      if (onSelectGenre) {
        onSelectGenre(targetGenreObj.name);
      }

      return nextIdx;
    });
  }, [allTracks, ownTracks, playSource, activeTrack?.id, selectedLanguage, isTrackMatchingLang, onSelectTrack, onSelectGenre, showToast, availableStudioGenres]);

  // Non-passive wheel event listener on the genre box container
  useEffect(() => {
    const boxEl = genreBoxRef.current;
    if (!boxEl) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 280) return;
      lastWheelTimeRef.current = now;

      if (e.deltaY > 0 || e.deltaX > 0) {
        changeGenre(1);
      } else if (e.deltaY < 0 || e.deltaX < 0) {
        changeGenre(-1);
      }
    };

    boxEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      boxEl.removeEventListener('wheel', handleWheel);
    };
  }, [changeGenre]);

  const currentGenreObj = availableStudioGenres[currentGenreIndex] || availableStudioGenres[0];

  const isCurrentFav = useMemo(() => {
    return favorites.some(f => f.id === activeTrack.id);
  }, [favorites, activeTrack]);

  // Dynamic counter computations with real responsiveness
  const favCount = useMemo(() => 9977 + (isCurrentFav ? 1 : 0), [isCurrentFav]);
  const starCount = useMemo(() => 7523 + (isRated ? 1 : 0), [isRated]);
  const saveCount = useMemo(() => 4644 + (isSaved ? 1 : 0), [isSaved]);
  const likeCount = useMemo(() => 7 + (isLiked ? 1 : 0), [isLiked]);
  const thumbsCount = useMemo(() => 80 + (isThumbsUp ? 1 : 0), [isThumbsUp]);

  // Active track pool for Minimal Studio navigation (Mine Playlist, Active Curated Playlist, or Public Catalog)
  const activeSongPool = useMemo(() => {
    if (playSource === 'own') {
      return mineTracks;
    }
    if (activePlayingPlaylistId) {
      if (activePlayingPlaylistId === 'liked_songs') {
        const likedIds = new Set((favorites || []).map(f => (typeof f === 'string' ? f : f?.id)));
        const likedList = (allTracks || []).filter(t => likedIds.has(t.id));
        if (likedList.length > 0) return likedList;
      }
      try {
        const unified = getUnifiedMusiclyPlaylists(allTracks, publicPlaylists);
        const pl = unified.find(p => p.id === activePlayingPlaylistId);
        if (pl && Array.isArray(pl.tracks) && pl.tracks.length > 0) {
          return pl.tracks;
        }
      } catch (e) {}
      try {
        const foundUserPl = (userPlaylists || []).find(p => p.id === activePlayingPlaylistId);
        if (foundUserPl && Array.isArray(foundUserPl.trackIds)) {
          const plTracks = foundUserPl.trackIds.map(tId => (allTracks || []).find(t => t.id === tId)).filter(Boolean);
          if (plTracks.length > 0) return plTracks;
        }
      } catch (e) {}
    }
    return (allTracks || []).filter(t => !t?.isCustom || !!t?.isPublic);
  }, [playSource, mineTracks, activePlayingPlaylistId, favorites, allTracks, publicPlaylists, userPlaylists]);

  // Next track preview respecting active source ('own' Mine Playlist vs 'musicly')
  const nextTrack = useMemo(() => {
    if (!activeSongPool || activeSongPool.length <= 1) return null;
    const currentIndex = activeSongPool.findIndex(t => t.id === activeTrack?.id);
    if (currentIndex === -1) return activeSongPool[0];
    const nextIdx = (currentIndex + 1) % activeSongPool.length;
    return activeSongPool[nextIdx];
  }, [activeSongPool, activeTrack?.id]);

  // Previous track preview respecting active source ('own' Mine Playlist vs 'musicly')
  const prevTrack = useMemo(() => {
    if (!activeSongPool || activeSongPool.length <= 1) return null;
    const currentIndex = activeSongPool.findIndex(t => t.id === activeTrack?.id);
    if (currentIndex === -1) return activeSongPool[activeSongPool.length - 1];
    const prevIdx = (currentIndex - 1 + activeSongPool.length) % activeSongPool.length;
    return activeSongPool[prevIdx];
  }, [activeSongPool, activeTrack?.id]);

  // Media gallery photos (greesel_clean_portrait.jpg is the crystal-clear focused central visual)
  const mediaPhotos = useMemo(() => {
    return [
      '/assets/images/greesel_clean_portrait.jpg',
      activeTrack.image || '/assets/images/vibe_card_01.jpg',
      '/assets/images/vibe_card_02.jpg',
      '/assets/images/vibe_card_03.jpg',
      '/assets/images/vibe_card_05.jpg'
    ];
  }, [activeTrack]);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Waveform interactive seek handler
  const handleWaveformClick = useCallback((e) => {
    if (!waveformRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * duration;
    isUserScrollingRef.current = false;
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    lastTimeRef.current = targetTime;
    setLivePlayTime(targetTime);
    if (onSeek) onSeek(targetTime);
  }, [duration, onSeek]);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="ref-studio-stage" style={themeStyles}>
      {/* Outer blurred warm atmospheric background */}
      <div className="ref-ambient-bg" />

      {/* Floating Top Labels */}
      <div className="ref-outer-topbar">
        <span className="ref-outer-num">02</span>
        <button 
          className="ref-outer-badge"
          onClick={onOpenSceneModal}
          title="Change scene theme"
        >
          © musicly studio
        </button>
      </div>

      {/* =====================================================================
          MAIN CHASSIS CONTAINER (Exact match to reference photo)
         ===================================================================== */}
      <div className="ref-chassis-card">
        {/* -------------------------------------------------------------------
            COLUMN 1: LEFT VERTICAL SIDEBAR DOCK
           ------------------------------------------------------------------- */}
        <aside className="ref-sidebar-dock">
          {/* Top Logo Button */}
          <button 
            className="ref-logo-btn" 
            onClick={() => {
              if (onClose) onClose();
              showToast("Returning to Cozy Bedroom");
            }}
            title="Musicly Studio (Return Home)"
          >
            <svg viewBox="0 0 32 32" className="ref-logo-svg" fill="none">
              <path 
                d="M6 10 H26 C26 10 26 16 18 16 H6 M6 16 H26 C26 16 26 22 18 22 H6" 
                stroke={currentTheme.accentLight || "#ffffff"} 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </button>

          {/* Navigation Icons Group */}
          <div className="ref-sidebar-icons">
            <button 
              className="ref-side-btn"
              onClick={() => {
                if (onClose) onClose();
                showToast("Returning to Cozy Bedroom");
              }}
              title="Home (Cozy Bedroom Studio)"
            >
              <Home size={16} />
            </button>

            <button 
              className="ref-side-btn"
              onClick={() => {
                if (onToggleFavorite) onToggleFavorite(activeTrack);
                showToast(isCurrentFav ? "Removed from Favorites" : "Saved to Favorites!");
              }}
              title={isCurrentFav ? "Remove Favorite" : "Add Favorite"}
            >
              <Star size={16} fill={isCurrentFav ? "#f4a000" : "none"} color={isCurrentFav ? "#f4a000" : "currentColor"} />
            </button>

            <div className="ref-camera-btn-wrapper" ref={quickBgPickerRef}>
              <button 
                className={`ref-side-btn ${(isUserAdmin ? isAdminGalleryOpen : isQuickBgPickerOpen) ? 'active' : ''}`}
                onClick={handleCameraClick}
                title={isUserAdmin ? "Studio Visuals Manager (Admin)" : "Choose background visual"}
                aria-label={isUserAdmin ? "Studio Visuals Manager (Admin)" : "Choose background visual"}
              >
                <Camera size={16} />
              </button>

              {!isUserAdmin && isQuickBgPickerOpen && (
                <div className="ref-glass-bg-picker-flyout">
                  <div className="ref-glass-bg-picker-grid">
                    {studioBackgrounds.map((bg, idx) => {
                      const bgUrl = typeof bg === 'string' ? bg : bg.url;
                      const isSelected = (mediaPhotoIndex % (studioBackgrounds.length || 1)) === idx;
                      const isVideo = (typeof bg === 'object' && bg.type === 'video') || isLiveVisual(bgUrl);

                      return (
                        <button
                          key={bg.id || `quick-bg-${idx}`}
                          type="button"
                          className={`ref-glass-bg-thumb-btn ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStudioBg(idx, bg);
                            showToast("Studio visual updated");
                          }}
                          title={`Select visual ${idx + 1}`}
                        >
                          {isVideo ? (
                            <video 
                              src={bgUrl} 
                              autoPlay 
                              loop 
                              muted 
                              playsInline 
                              className="ref-glass-bg-thumb-media" 
                            />
                          ) : (
                            <img 
                              src={bgUrl} 
                              alt="" 
                              className="ref-glass-bg-thumb-media" 
                              loading="lazy" 
                            />
                          )}
                          {isSelected && (
                            <div className="ref-glass-bg-thumb-check">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button 
              className="ref-side-btn"
              onClick={() => {
                if (onOpenPlaylistDrawer) onOpenPlaylistDrawer();
                showToast("Opening Music Library & Queue");
              }}
              title="Music Library & Queue"
            >
              <Briefcase size={16} />
            </button>

            {onToggleAudioOutputMode && (
              <button 
                className={`ref-side-btn ${audioOutputMode === 'speaker' ? 'speaker-active-side-btn' : ''}`}
                onClick={() => {
                  onToggleAudioOutputMode();
                  showToast(audioOutputMode === 'speaker' ? "Switched to Headphone Mode" : "Switched to Speaker Mode (Room Audio Boost active)");
                }}
                title={audioOutputMode === 'speaker' ? "Speaker Mode Active (Click for Headphones)" : "Headphone Mode Active (Click for Speaker Mode)"}
              >
                {audioOutputMode === 'speaker' ? <Speaker size={16} /> : <Headphones size={16} />}
              </button>
            )}
          </div>

          {/* User Profile Avatar with Gold Rim */}
          <button 
            className="ref-avatar-btn"
            onClick={() => {
              if (onOpenAuthModal) onOpenAuthModal();
              showToast(user ? `Profile: ${user.displayName || 'User'}` : "Opening Sign In / Profile");
            }}
            title={user ? (user.displayName || 'Profile') : 'Log In / Profile'}
          >
            <img 
              src={user?.photoURL || activeTrack.image || '/assets/images/vibe_card_01.jpg'} 
              alt="User profile avatar" 
              className="ref-avatar-img"
            />
          </button>

          {/* Analytics / Equalizer Bar Graph Icon */}
          <button 
            className={`ref-side-btn ${isPlaying ? 'active-equalizer' : ''}`}
            onClick={() => {
              if (onTogglePlay) onTogglePlay();
              showToast(isPlaying ? "Playback paused" : "Playback resumed");
            }}
            title={isPlaying ? "Pause audio stream" : "Play audio stream"}
          >
            <BarChart2 size={16} />
          </button>

          {/* 3x3 Grid Apps / Scenes Icon */}
          <button 
            className="ref-side-btn"
            onClick={() => {
              if (onOpenSceneModal) onOpenSceneModal();
              showToast("Opening Room Themes & Scenes");
            }}
            title="Open Scenes Menu"
          >
            <Grid size={16} />
          </button>

          {/* Bottom Dual Pill Container */}
          <div className="ref-dual-pill-container">
            <button 
              className={`ref-dual-pill-btn ${activeAmbientCount > 0 ? 'ambient-active' : ''}`}
              onClick={() => {
                if (onOpenAmbient) onOpenAmbient();
                showToast("Opening Ambience Mixer");
              }}
              title="Ambience Soundscapes Mixer"
            >
              <SlidersHorizontal size={14} />
            </button>
            <button 
              className={`ref-dual-pill-btn ${isThemeModalOpen ? 'theme-btn-active' : ''} ${isAutoTheme ? 'theme-auto-synced' : ''}`}
              onClick={() => {
                setIsThemeModalOpen(prev => !prev);
              }}
              title={isAutoTheme ? "Studio Atmosphere: Auto-matched with Background (Click to customize)" : "Studio Atmosphere Color Themes (Palettes)"}
            >
              <span className="ref-dual-pill-subdot" />
            </button>
          </div>
        </aside>

        {/* -------------------------------------------------------------------
            COLUMN 2: CENTER FEATURED PHOTO STAGE & SPEECH BUBBLE NOTCH
           ------------------------------------------------------------------- */}
        {/* -------------------------------------------------------------------
            COLUMN 2: CENTER FEATURED PHOTO STAGE & COMPOSITION (EXACT MATCH IMAGE 2)
           ------------------------------------------------------------------- */}
        <section className="ref-center-stage">
          <div className="ref-main-photo-frame">
            {isLiveVisual(currentStudioBgUrl) ? (
              <video 
                src={currentStudioBgUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="ref-main-photo-img" 
              />
            ) : (
              <img 
                src={currentStudioBgUrl} 
                alt={activeTrack.title || "Studio Visual"}
                className="ref-main-photo-img"
              />
            )}

            {/* Vertical Volume Slider on Edge ("from below") */}
            <EdgeVolumeSlider 
              volume={volume}
              onVolumeChange={onVolumeChange}
              accentColor={currentTheme?.accent || '#f4a000'}
            />

            {/* Top Navigation Floating Badges & Center Canopy */}
            <div className="ref-photo-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="ref-badge-back-home"
                  onClick={prevTrack ? handlePrevSong : onClose}
                  title={prevTrack ? `Previous: ${prevTrack.title} (Click to Play)` : "Return to Cozy Bedroom Studio"}
                >
                  <span className="ref-badge-arrow">◀◀</span> <span>{prevTrack ? (prevTrack.title.length > 14 ? `${prevTrack.title.substring(0, 13)}…` : prevTrack.title) : 'Back to Home'}</span>
                </button>
                {prevTrack && (
                  <button
                    className="ref-badge-back-home"
                    onClick={onClose}
                    title="Return to Cozy Bedroom Studio"
                    style={{ padding: '7px 11px' }}
                  >
                    <Home size={13} />
                  </button>
                )}
              </div>

              <div className="ref-badge-center-stats">
                <button 
                  className="ref-top-stat-btn"
                  onClick={() => {
                    setIsLiked(prev => !prev);
                    showToast(!isLiked ? "Hearted! (8)" : "Heart removed (7)");
                  }}
                  title="Favorite Heart"
                >
                  <span className="ref-stat-num">{likeCount}</span>
                  <Heart size={14} fill={isLiked ? "#ff4d6d" : "rgba(255, 77, 109, 0.45)"} color="#ff4d6d" />
                </button>

                <button 
                  className="ref-top-stat-btn"
                  onClick={() => {
                    setIsThumbsUp(prev => !prev);
                    showToast(!isThumbsUp ? "Thumbs up! (81)" : "Thumbs up removed (80)");
                  }}
                  title="Thumbs Up"
                >
                  <span className="ref-stat-num">{thumbsCount}</span>
                  <ThumbsUp size={14} fill={isThumbsUp ? "#38bdf8" : "rgba(56, 189, 248, 0.45)"} color="#38bdf8" />
                </button>

                <div className="ref-bell-wrapper" style={{ position: 'relative' }}>
                  <button 
                    className={`ref-stat-bell ${isBellRinging ? 'ringing' : ''} ${unreadNotifCount > 0 ? 'has-unread' : ''}`}
                    onClick={() => {
                      setIsNotifOpen(prev => !prev);
                      setIsBellRinging(true);
                      setTimeout(() => setIsBellRinging(false), 600);
                    }}
                    title={unreadNotifCount > 0 ? `${unreadNotifCount} new studio changes! Click to view` : "Studio Updates & Notifications"}
                  >
                    <Bell size={14} fill={unreadNotifCount > 0 ? "#fbbf24" : (isBellRinging ? "#fbbf24" : "none")} color="#fbbf24" />
                    {unreadNotifCount > 0 && (
                      <span className="ref-bell-badge">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>

                  <StudioNotificationsDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                    currentTheme={currentTheme}
                    onSelectSong={(songTitle) => {
                      showToast?.(`Selected: ${songTitle}`);
                    }}
                    onSelectBackground={(bgUrl) => {
                      const foundIdx = studioBackgrounds.findIndex(b => (typeof b === 'string' ? b === bgUrl : b.url === bgUrl));
                      if (foundIdx >= 0) {
                        updateMediaPhotoIndex(foundIdx);
                      } else {
                        handleAddStudioBg({ url: bgUrl, title: 'Background Visual' });
                      }
                    }}
                    onSelectTheme={handleSelectTheme}
                    showToast={showToast}
                  />
                </div>
              </div>

              <button 
                className="ref-badge-next-song"
                onClick={handleNextSong}
                title={`Next: ${nextTrack ? nextTrack.title : 'Next Track'}`}
              >
                <span>{nextTrack ? (nextTrack.title.length > 14 ? `${nextTrack.title.substring(0, 13)}…` : nextTrack.title) : 'Next Track'}</span> <span className="ref-badge-arrow">▶▶</span>
              </button>
            </div>

            {/* Floating Touch Action Button (Play / Pause toggle) */}
            <button 
              className={`ref-floating-hand-btn ${isPlaying ? 'playing-pulse' : ''}`}
              onClick={() => {
                if (onTogglePlay) onTogglePlay();
                showToast(isPlaying ? "Paused" : "Playing track");
              }}
              title={isPlaying ? "Pause playback" : "Play track"}
            >
              <Hand size={22} color="#ffffff" />
            </button>

            {/* Bottom-Right Frosted Glass Artist Card */}
            <div className="ref-frosted-artist-card">
              <div className="ref-script-title-wrapper">
                <div className="ref-script-artist-lines">
                  <span className="ref-script-line1">MUSICLY</span>
                </div>
                <span className="ref-script-accent-x">X</span>
              </div>

              {/* Source Selector: musicly or own */}
              <div className="ref-source-selector">
                <button 
                  type="button"
                  className={`ref-source-btn ${playSource === 'musicly' ? 'active' : ''}`}
                  onClick={() => handleSourceChange('musicly')}
                  title="Play from Musicly catalog"
                >
                  musicly
                </button>
                <span className="ref-source-sep">or</span>
                <button 
                  type="button"
                  className={`ref-source-btn ${playSource === 'own' ? 'active' : ''}`}
                  onClick={() => handleSourceChange('own')}
                  title="Play strictly from your private Mine Playlist"
                >
                  own
                </button>
              </div>

              {/* Transparent Black Dead Poets Society Quote Pill */}
              <div 
                className="ref-quote-pill-transparent"
                title="Dead Poets Society"
              >
                <Quote size={12} className="ref-quote-pill-icon" style={{ color: currentTheme?.accent || '#f59e0b' }} />
                <span className="ref-quote-pill-text">"{dpsQuote.quote}"</span>
              </div>
            </div>

            {/* Bottom-Left Speech Bubble Island with 3D Flip */}
            <div className={`ref-speech-bubble-island-container ${isLyricsOpen ? 'is-flipped' : ''}`}>
              <div className="ref-island-flip-card">
                
                {/* FRONT FACE: Artist & Track Info */}
                <div className="ref-island-face ref-island-front">
                  <button 
                    type="button"
                    className="ref-lyrics-toggle-btn"
                    onClick={() => {
                      setIsLyricsOpen(true);
                      playClickSound('light');
                    }}
                    title="Flip card to view synchronized lyrics"
                  >
                    <Mic2 size={12} className="ref-lyrics-icon" />
                    <span className="ref-lyrics-text">Lyrics</span>
                    {lyricsData?.isSynced && <span className="ref-lyrics-synced-indicator" />}
                  </button>

                  <button 
                    className="ref-island-info-btn"
                    onClick={() => {
                      if (onOpenPlaylistDrawer) onOpenPlaylistDrawer();
                      showToast("Track & Artist Information");
                    }}
                    title="Track Information"
                  >
                    <span className="ref-info-letter" style={{ color: 'var(--ref-s0)' }}>i</span>
                  </button>

                  <div className="ref-bubble-pills">
                    <div className="ref-pill-row-top">
                      <span className="ref-pill-label">Artist</span>
                    </div>
                    <button 
                      className="ref-pill-row-bottom ref-pill-clickable"
                      style={{ borderColor: 'var(--ref-s4)' }}
                      onClick={() => {
                        navigator.clipboard?.writeText(activeTrack?.artist || "Musicly Artist");
                        showToast(`Copied: ${activeTrack?.artist || "Musicly Artist"}`);
                      }}
                      title="Click to copy artist name"
                    >
                      <span className="ref-pill-value" style={{ borderColor: 'var(--ref-s4)' }}>
                        {activeTrack?.artist || 'Musicly Artist'}
                      </span>
                    </button>
                  </div>

                  <div className="ref-bubble-meta-date">
                    <span className="ref-date-header">Now Playing</span>
                    <div className="ref-date-row">
                      <span className="ref-date-num" style={{ fontSize: '0.82rem', fontWeight: 700, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeTrack?.title || 'Track'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BACK FACE: Full-Box Synchronized Lyrics inside this exact box */}
                <div className="ref-island-face ref-island-back">
                  {/* Floating Flip-Back to Info Button with Musicly Icon (unclipped) */}
                  <button 
                    type="button"
                    className="ref-lyrics-toggle-btn is-active ref-lyrics-musicly-btn"
                    onClick={() => {
                      setIsLyricsOpen(false);
                      playClickSound('light');
                    }}
                    title="Flip back to Song Info"
                    aria-label="Back to Song Info"
                  >
                    <img 
                      src="/favicon.svg" 
                      alt="Musicly" 
                      className="ref-lyrics-musicly-icon" 
                    />
                  </button>

                  {/* Full-Box Lyrics Container */}
                  <div 
                    ref={lyricsContainerRef}
                    className="ref-island-lyrics-content is-full-box"
                    onScroll={handleLyricsManualScroll}
                  >
                    {isLyricsLoading ? (
                      <div className="ref-island-lyrics-empty">
                        <span className="ref-studio-lyrics-spinner" />
                        <span>Finding lyrics...</span>
                      </div>
                    ) : lyricsData?.instrumental ? (
                      <div className="ref-island-lyrics-empty">
                        <Music size={16} style={{ opacity: 0.5 }} />
                        <span>Instrumental (no lyrics)</span>
                      </div>
                    ) : lyricsData?.lines && lyricsData.lines.length > 0 ? (
                      <div className="ref-island-lyrics-stream">
                        {lyricsData.lines.map((line, idx) => {
                          const isActive = idx === activeLineIndex;
                          const isPassed = activeLineIndex !== -1 && idx < activeLineIndex;
                          return (
                            <div
                              key={idx}
                              ref={isActive ? activeLineRef : null}
                              className={`ref-island-lyric-line ${isActive ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
                              onClick={() => {
                                const targetTime = line.time !== undefined
                                  ? line.time
                                  : (lyricsData?.lines?.length > 0 ? (idx / lyricsData.lines.length) * (duration || 180) : undefined);
                                if (targetTime !== undefined && onSeek) {
                                  isUserScrollingRef.current = false;
                                  if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
                                  lastTimeRef.current = targetTime;
                                  setLivePlayTime(targetTime);
                                  onSeek(targetTime);
                                  setTimeout(() => {
                                    scrollToActiveLyricLine('smooth');
                                  }, 20);
                                }
                              }}
                            >
                              {line.text}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="ref-island-lyrics-empty">
                        <span>Lyrics unavailable</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Micro Toast Feedback */}
            {toastMsg && (
              <div className="ref-center-toast" style={{ borderColor: currentTheme.accent }}>
                {toastMsg}
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            COLUMN 3: RIGHT WIDGET STACK (Mini Player, Stats & Media)
           ------------------------------------------------------------------- */}
        <aside className="ref-right-column">
          {/* 1. Musicly Header & Song Language Pills */}
          <div className="ref-hometown-row">
            <div className="ref-musicly-top-meta">
              <span className="ref-musicly-top-label">Musicly</span>
            </div>

            {/* Song Language Selection Pills */}
            <div className="ref-genre-tags-row ref-lang-tags-row" role="group" aria-label="Song Language Selection">
              {LANGUAGES.map((lang) => {
                const isActive = activeLangs.some(l => l.toLowerCase() === lang.toLowerCase());
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`ref-tag-pill ref-lang-pill ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleLanguageClick(lang)}
                    title={
                      isActive 
                        ? `Selected: ${lang} (click to deselect)` 
                        : `Select ${lang} songs`
                    }
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Amber Gadget Player Box */}
          <div className="ref-gadget-player-box">
            {/* 3 Top Speaker Dots */}
            <div className="ref-gadget-speaker-dots">
              <span className="ref-dot" />
              <span className="ref-dot" />
              <span className="ref-dot" />
            </div>

            {/* Solid Golden Screen with dynamic waveform visualizer and song name */}
            <div className="ref-gadget-screen">
              <div className="ref-gadget-screen-header">
                <span className="ref-gadget-song-title" title={activeTrack.title}>
                  {activeTrack.title || 'Untitled Track'}
                </span>
                <span className="ref-gadget-song-artist" title={activeTrack.artist}>
                  {activeTrack.artist || 'Unknown Artist'}
                </span>
              </div>

              {/* Internal subtle equalizer bars when playing */}
              <div className="ref-screen-equalizer">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`ref-eq-bar ${isPlaying ? 'animating' : ''}`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Seek Bar with Playhead Dot */}
            <div 
              ref={waveformRef}
              className="ref-gadget-seek-track"
              onClick={handleWaveformClick}
              title="Seek audio track"
            >
              <div className="ref-gadget-seek-bg" />
              <div 
                className="ref-gadget-seek-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <div 
                className="ref-gadget-seek-thumb"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            {/* Gold Transport Buttons */}
            <div className="ref-gadget-controls-row">
              <button 
                className="ref-gadget-btn"
                onClick={handlePrevSong}
                title="Previous track"
              >
                ◀◀
              </button>

              <button 
                className="ref-gadget-btn ref-gadget-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>

              <button 
                className="ref-gadget-btn"
                onClick={handleNextSong}
                title="Next track"
              >
                ▶▶
              </button>
            </div>

            {/* Currently Playing Playlist Badge */}
            {activePlayingPlaylistName && (
              <div 
                className="ref-gadget-playlist-banner"
                title={`Currently playing from: ${activePlayingPlaylistName} • Click to open playlist`}
                onClick={onOpenPlaylistDrawer}
              >
                <span className="ref-gadget-playlist-disc">💿</span>
                <span className="ref-gadget-playlist-name">{activePlayingPlaylistName}</span>
              </div>
            )}
          </div>

          {/* 3. Live Current Time & Year Clock Card */}
          {(() => {
            const clockYear = studioTime.getFullYear();
            const rawHours = studioTime.getHours();
            const rawMinutes = studioTime.getMinutes();
            const rawSeconds = studioTime.getSeconds();
            const ampm = rawHours >= 12 ? 'PM' : 'AM';
            const displayHours = is24Hour ? String(rawHours).padStart(2, '0') : String(rawHours % 12 || 12);
            const displayMinutes = String(rawMinutes).padStart(2, '0');
            const fullDateStr = studioTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const clockHourAngle = ((rawHours % 12) + rawMinutes / 60) * 30;
            const clockMinuteAngle = (rawMinutes + rawSeconds / 60) * 6;

            return (
              <div 
                className="ref-years-active-box ref-live-clock-card"
                onClick={() => setIs24Hour(prev => !prev)}
                title={`Local Time: ${fullDateStr} • Click to switch 12h/24h format`}
              >
                <div className="ref-years-text-col">
                  <span className="ref-years-sublabel">Current Time</span>
                  <div className="ref-years-main-num">
                    <div className="ref-time-digits-box">
                      <span className="ref-num-bold">
                        {displayHours}<span className="ref-clock-colon">:</span>{displayMinutes}
                      </span>
                      <span className="ref-time-year-row">{clockYear}</span>
                    </div>
                    {!is24Hour && <span className="ref-time-ampm">{ampm}</span>}
                  </div>
                </div>

                {/* Circular Golden Gauge with Dynamic Live Clock Hands */}
                <div className="ref-clock-gauge" title={`${displayHours}:${displayMinutes} ${!is24Hour ? ampm : ''} • Year ${clockYear}`}>
                  <div className="ref-clock-inner-disc">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      {/* Pivot Pin */}
                      <circle cx="10" cy="10" r="1.6" fill={currentTheme.accent || "#f4a000"} />
                      {/* Hour Hand */}
                      <line 
                        x1="10" y1="10" x2="10" y2="4.8" 
                        stroke={currentTheme.accent || "#f4a000"} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        transform={`rotate(${clockHourAngle} 10 10)`} 
                      />
                      {/* Minute Hand */}
                      <line 
                        x1="10" y1="10" x2="10" y2="2.5" 
                        stroke="#ffffff" 
                        strokeWidth="1.4" 
                        strokeLinecap="round" 
                        opacity="0.95" 
                        transform={`rotate(${clockMinuteAngle} 10 10)`} 
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. Genre Selector Box (Click & Scroll to Change Song Genre) */}
          <div className="ref-media-section ref-genre-section">
            <div className="ref-media-header">
              <div className="ref-genre-header-left">
                <span className="ref-media-title">Genre</span>
                <span className="ref-genre-counter-pill">
                  {currentGenreIndex + 1}/{availableStudioGenres.length}
                </span>
              </div>
              <div className="ref-media-arrows">
                <button 
                  onClick={(e) => { e.stopPropagation(); changeGenre(-1); }}
                  title="Previous genre"
                >
                  ◀◀
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); changeGenre(1); }}
                  title="Next genre"
                >
                  ▶▶
                </button>
              </div>
            </div>

            {/* Floating Pure Glass Capsule Genre Selector with Genre Specific Background Image */}
            <div 
              ref={genreBoxRef}
              className="ref-genre-glass-capsule"
              onClick={() => changeGenre(1)}
              title="Click or scroll mouse wheel to switch genre & songs"
              role="button"
              tabIndex={0}
            >
              {/* Specific Genre Background Image Layer */}
              <div 
                className="ref-genre-box-bg-image"
                style={{
                  backgroundImage: `linear-gradient(rgba(14, 15, 22, 0.44), rgba(14, 15, 22, 0.68)), url(${currentGenreObj.image})`
                }}
              />
              <span className="ref-genre-badge-title">
                {currentGenreObj.name}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================================
          BOTTOM FLOATING FOOTER DOCK (URL, 4 Color Swatches, Bookmark & Refresh)
         ===================================================================== */}
      <footer className="ref-outer-bottom-bar">
        {/* Left Website URL */}
        <div className="ref-bottom-web-link">
          <Globe size={14} className="ref-web-icon" />
          <span>www.pinterest.com/danduiild</span>
        </div>

        {/* Center 4 Color Swatches */}
        <div className="ref-color-swatches-dock">
          <div 
            className={`ref-swatch swatch-amber ${selectedColorIndex === 0 ? 'selected' : ''}`}
            onClick={() => setSelectedColorIndex(0)}
            title="Amber Palette"
          />
          <div 
            className={`ref-swatch swatch-light-gray ${selectedColorIndex === 1 ? 'selected' : ''}`}
            onClick={() => setSelectedColorIndex(1)}
            title="Silver Palette"
          />
          <div 
            className={`ref-swatch swatch-dark-slate ${selectedColorIndex === 2 ? 'selected' : ''}`}
            onClick={() => setSelectedColorIndex(2)}
            title="Charcoal Palette"
          />
          <div 
            className={`ref-swatch swatch-off-white ${selectedColorIndex === 3 ? 'selected' : ''}`}
            onClick={() => setSelectedColorIndex(3)}
            title="White Palette"
          />
        </div>

        {/* Right Action Buttons */}
        <div className="ref-bottom-right-actions">
          <button 
            className="ref-save-later-btn"
            onClick={() => setIsSaved(!isSaved)}
          >
            <span>Save for later</span>
            <Bookmark size={12} fill={isSaved ? "#fff" : "none"} />
          </button>

          {/* Circular Refresh Button */}
          <button 
            className="ref-refresh-circle-btn"
            onClick={() => setMediaPhotoIndex((prev) => (prev + 1) % studioBackgrounds.length)}
            title="Refresh layout visual"
          >
            <RotateCw size={15} />
          </button>
        </div>
      </footer>

      {/* Admin Background Gallery Manager Modal */}
      {isUserAdmin && (
        <AdminBackgroundGalleryModal
          isOpen={isAdminGalleryOpen}
          onClose={() => setIsAdminGalleryOpen(false)}
          backgrounds={studioBackgrounds}
          activeBackgroundIndex={mediaPhotoIndex % (studioBackgrounds.length || 1)}
          activeBackgroundUrl={currentStudioBgUrl}
          onSelectBackground={handleSelectStudioBg}
          onAddBackground={handleAddStudioBg}
          onRemoveBackground={handleRemoveStudioBg}
          onResetDefaults={handleResetStudioBgDefaults}
          isAutoCycleBg={isAutoCycleBg}
          onToggleAutoCycleBg={handleToggleAutoCycleBg}
          onShuffleBackground={handleShuffleBackground}
          showToast={showToast}
        />
      )}

      {/* 🎨 Cascading Atmosphere Color Themes Palette Modal */}
      <StudioThemePaletteModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        autoTheme={autoTheme}
        isAutoTheme={isAutoTheme}
        onToggleAutoTheme={handleToggleAutoTheme}
        onSelectCustomHex={handleSelectCustomHex}
      />
    </div>
  );
}
