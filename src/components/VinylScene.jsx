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
  Check,
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Square
} from 'lucide-react';
import { playClickSound, playPeacefulLikeSound } from '../utils/audioSynth';
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
  isAdminDashboardOpen = false,
  onLogout,
  onClose,
  selectedGenre = 'All',
  onSelectGenre,
  audioElement = null,
  selectedLanguage = null,
  selectedLanguages = [],
  onSelectLanguage = null,
  onOpenAboutUs = null
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [localLanguages, setLocalLanguages] = useState([]);
  const [isLikedPanelOpen, setIsLikedPanelOpen] = useState(false);

  // User Custom Playlists Persistence
  const [customPlaylists, setCustomPlaylists] = useState(() => {
    try {
      const raw = localStorage.getItem('musicly_user_custom_playlists');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modal & Management States
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [selectedCustomPlaylist, setSelectedCustomPlaylist] = useState(null);
  const [isAddSongsToExistingOpen, setIsAddSongsToExistingOpen] = useState(false);
  const [isEditingPlaylistTitle, setIsEditingPlaylistTitle] = useState(false);
  const [editedPlaylistTitle, setEditedPlaylistTitle] = useState('');

  // Form states for creating new playlist
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [selectedTrackIdsForNew, setSelectedTrackIdsForNew] = useState([]);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  // Save custom playlists to localStorage
  const saveCustomPlaylists = useCallback((playlists) => {
    try {
      localStorage.setItem('musicly_user_custom_playlists', JSON.stringify(playlists));
    } catch (e) {
      console.error('Failed to save custom playlists:', e);
    }
  }, []);

  // Filtered tracks for the song picker modal
  const filteredPickerTracks = useMemo(() => {
    if (!songSearchQuery.trim()) return allTracks.slice(0, 60);
    const q = songSearchQuery.toLowerCase();
    return allTracks.filter(t => 
      (t.title || '').toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q) ||
      (t.genre || '').toLowerCase().includes(q)
    );
  }, [allTracks, songSearchQuery]);

  // Create Playlist Handler
  const handleCreatePlaylist = (e) => {
    e?.preventDefault?.();
    if (!newPlaylistTitle.trim()) return;

    const newPlaylist = {
      id: 'playlist_' + Date.now(),
      title: newPlaylistTitle.trim(),
      trackIds: selectedTrackIdsForNew,
      image: selectedTrackIdsForNew.length > 0
        ? (allTracks.find(t => t.id === selectedTrackIdsForNew[0])?.cover || '/assets/images/lofi_scene.jpg')
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      createdAt: Date.now(),
      isCustom: true
    };

    const updated = [newPlaylist, ...customPlaylists];
    setCustomPlaylists(updated);
    saveCustomPlaylists(updated);
    setIsCreatePlaylistOpen(false);
    playPeacefulLikeSound();
  };

  // Delete Custom Playlist Handler
  const handleDeleteCustomPlaylist = (playlistId) => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      const updated = customPlaylists.filter(p => p.id !== playlistId);
      setCustomPlaylists(updated);
      saveCustomPlaylists(updated);
      setSelectedCustomPlaylist(null);
      playClickSound('light');
    }
  };

  // Save Renamed Custom Playlist Title
  const handleSaveEditedTitle = (playlistId) => {
    if (!editedPlaylistTitle.trim()) {
      setIsEditingPlaylistTitle(false);
      return;
    }
    const updated = customPlaylists.map(p => {
      if (p.id === playlistId) {
        return { ...p, title: editedPlaylistTitle.trim() };
      }
      return p;
    });
    setCustomPlaylists(updated);
    saveCustomPlaylists(updated);
    if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
      setSelectedCustomPlaylist(prev => ({ ...prev, title: editedPlaylistTitle.trim() }));
    }
    setIsEditingPlaylistTitle(false);
    playClickSound('light');
  };

  // Remove Song from Custom Playlist
  const handleRemoveSongFromPlaylist = (playlistId, trackId) => {
    const updated = customPlaylists.map(p => {
      if (p.id === playlistId) {
        return { ...p, trackIds: (p.trackIds || []).filter(id => id !== trackId) };
      }
      return p;
    });
    setCustomPlaylists(updated);
    saveCustomPlaylists(updated);
    if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
      const newTrackIds = (selectedCustomPlaylist.trackIds || []).filter(id => id !== trackId);
      const newTracks = allTracks.filter(t => newTrackIds.includes(t.id));
      setSelectedCustomPlaylist(prev => ({
        ...prev,
        trackIds: newTrackIds,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
        count: newTracks.length
      }));
    }
    playClickSound('light');
  };

  // Toggle Song in Existing Custom Playlist
  const handleToggleSongInExistingPlaylist = (playlistId, trackId) => {
    const target = customPlaylists.find(p => p.id === playlistId);
    if (!target) return;
    const curIds = target.trackIds || [];
    const newIds = curIds.includes(trackId)
      ? curIds.filter(id => id !== trackId)
      : [...curIds, trackId];

    const updated = customPlaylists.map(p => {
      if (p.id === playlistId) {
        return { ...p, trackIds: newIds };
      }
      return p;
    });
    setCustomPlaylists(updated);
    saveCustomPlaylists(updated);
    if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
      const newTracks = allTracks.filter(t => newIds.includes(t.id));
      setSelectedCustomPlaylist(prev => ({
        ...prev,
        trackIds: newIds,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
        count: newTracks.length
      }));
    }
    playClickSound('light');
  };

  // Filtered liked tracks for the favorites flyout panel
  const likedTracks = useMemo(() => {
    return allTracks.filter(t => favorites.includes(t.id));
  }, [allTracks, favorites]);

  // Close favorites panel on Escape key
  useEffect(() => {
    if (!isLikedPanelOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLikedPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLikedPanelOpen]);

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

  // Dynamic category pills:
  // English -> adds COUNTRY
  // Hindi -> adds GHAZALS
  // All (or other languages) -> neither COUNTRY nor GHAZALS
  const displayCategories = useMemo(() => {
    const isEnglishOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'english';
    const isHindiOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'hindi';

    const categories = ['ALL', 'CLASSIC', '90s', 'NEW'];
    if (isEnglishOnly) {
      categories.push('COUNTRY');
    }
    if (isHindiOnly) {
      categories.push('GHAZALS');
    }
    categories.push('INSTRUMENTAL', 'MODERN', 'INDIE', 'LO-FI');
    return categories;
  }, [activeLanguages]);

  // Reset category to ALL if current category is no longer available in the active language
  useEffect(() => {
    if (!displayCategories.includes(activeCategory)) {
      setActiveCategory('ALL');
    }
  }, [displayCategories, activeCategory]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isHoveringWaveform, setIsHoveringWaveform] = useState(false);
  const [hoverSeekRatio, setHoverSeekRatio] = useState(null);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strobePowerOn, setStrobePowerOn] = useState(true);

  // Turntable Speed (33 vs 45 RPM) & Interactive Deck Volume Fader State
  const [rpmSpeed, setRpmSpeed] = useState(33);
  const [isDraggingFader, setIsDraggingFader] = useState(false);
  const [showFaderTooltip, setShowFaderTooltip] = useState(false);

  // Turntable Deck Skin Style ('vintage' vs 'modern') - Switchable ONLY WITH SCROLLING over deck
  const [turntableSkin, setTurntableSkin] = useState(() => {
    try {
      return localStorage.getItem('musicly_turntable_skin') || 'vintage';
    } catch {
      return 'vintage';
    }
  });

  const deckContainerRef = useRef(null);
  const modernLcdRef = useRef(null);
  const waveformTrackRef = useRef(null);
  const faderGrooveRef = useRef(null);

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

  // Modern Clay Turntable Helpers
  const formatModernTime = useCallback((sec) => {
    if (isNaN(sec) || sec < 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  const modernTrackNumber = useMemo(() => {
    if (!currentTrack || !allTracks || allTracks.length === 0) return '29';
    const idx = allTracks.findIndex(t => t.id === currentTrack.id);
    if (idx === -1) return '29';
    return String(idx + 1).padStart(2, '0');
  }, [currentTrack, allTracks]);

  const modernWaveformBars = useMemo(() => {
    const heights = [
      32, 48, 64, 22, 82, 54, 96, 32, 72, 88, 28, 68,
      92, 42, 78, 36, 88, 62, 46, 72, 92, 58, 36, 68
    ];
    return heights.map((h, i) => ({
      id: i,
      height: h,
      opacity: (i % 3 === 0) ? 0.9 : (i % 2 === 0 ? 0.65 : 0.45)
    }));
  }, []);

  const handleModernLcdSeek = useCallback((e) => {
    if (!modernLcdRef.current || !safeDuration || !audioElement) return;
    const rect = modernLcdRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    audioElement.currentTime = ratio * safeDuration;
    playClickSound('light');
  }, [safeDuration, audioElement]);

  // Skin switcher callback
  const handleSkinChange = useCallback((skin) => {
    setTurntableSkin(skin);
    try {
      localStorage.setItem('musicly_turntable_skin', skin);
    } catch {}
    playClickSound('toggle');
  }, []);

  // SCROLL-ONLY TURNTABLE DECK SWITCHER LISTENER
  useEffect(() => {
    const el = deckContainerRef.current;
    if (!el) return;

    let lastSwitchTime = 0;
    const switchCooldown = 380; // ms to prevent rapid flip

    const handleWheel = (e) => {
      // If user is actively dragging the pitch fader or waveform scrubber, don't trigger switch
      if (isDraggingFader || isDraggingWaveform) return;

      // Filter tiny jitter scrolls
      if (Math.abs(e.deltaY) < 18) return;

      // Prevent the outer page from scrolling away while scrolling directly on the turntable deck
      e.preventDefault();

      const now = Date.now();
      if (now - lastSwitchTime < switchCooldown) return;

      if (e.deltaY > 0) {
        // Scrolling down -> switch to Modern Clay deck
        setTurntableSkin((prev) => {
          if (prev !== 'modern') {
            lastSwitchTime = now;
            try { localStorage.setItem('musicly_turntable_skin', 'modern'); } catch {}
            playClickSound('toggle');
            return 'modern';
          }
          return prev;
        });
      } else if (e.deltaY < 0) {
        // Scrolling up -> switch to Vintage Hi-Fi deck
        setTurntableSkin((prev) => {
          if (prev !== 'vintage') {
            lastSwitchTime = now;
            try { localStorage.setItem('musicly_turntable_skin', 'vintage'); } catch {}
            playClickSound('toggle');
            return 'vintage';
          }
          return prev;
        });
      }
    };

    // Mobile touch swipe gestures
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const duration = Date.now() - touchStartTime;
        if (Math.abs(deltaY) > 35 && duration < 600) {
          const now = Date.now();
          if (now - lastSwitchTime < switchCooldown) return;
          if (deltaY < 0) {
            // Swiped up -> modern
            lastSwitchTime = now;
            setTurntableSkin('modern');
            try { localStorage.setItem('musicly_turntable_skin', 'modern'); } catch {}
            playClickSound('toggle');
          } else {
            // Swiped down -> vintage
            lastSwitchTime = now;
            setTurntableSkin('vintage');
            try { localStorage.setItem('musicly_turntable_skin', 'vintage'); } catch {}
            playClickSound('toggle');
          }
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingFader, isDraggingWaveform]);

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
        if (cat === 'country') {
          return trackGenre.includes('country') || trackGenres.includes('country') || trackTitle.includes('country') || trackArtist.includes('denver') || trackArtist.includes('stapleton') || trackArtist.includes('cash') || trackArtist.includes('combs');
        }
        if (cat === 'ghazals' || cat === 'ghazal') {
          return trackGenre.includes('ghazal') || trackGenres.includes('ghazal') || trackTitle.includes('ghazal') || trackArtist.includes('jagjit') || trackArtist.includes('pankaj');
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

    // Language-Specific Featured Playlists (English -> Country, Hindi -> Ghazals, All -> neither)
    const isEnglishOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'english';
    const isHindiOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'hindi';

    if (isEnglishOnly) {
      const countryTracks = allTracks.filter(t => 
        (t.genre || '').toLowerCase().includes('country') || 
        (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('country')))
      );
      if (countryTracks.length > 0) {
        playlists.push({
          id: 'country_roots',
          title: 'Country Roads & Roots',
          subtitle: `${countryTracks.length} song${countryTracks.length === 1 ? '' : 's'} in this list`,
          count: countryTracks.length,
          tracks: countryTracks,
          image: countryTracks[0]?.cover || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&auto=format&fit=crop&q=80'
        });
      }
    }

    if (isHindiOnly) {
      const ghazalTracks = allTracks.filter(t => 
        (t.genre || '').toLowerCase().includes('ghazal') || 
        (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('ghazal')))
      );
      if (ghazalTracks.length > 0) {
        playlists.push({
          id: 'timeless_ghazals',
          title: 'Timeless Ghazals & Mehfil',
          subtitle: `${ghazalTracks.length} song${ghazalTracks.length === 1 ? '' : 's'} in this list`,
          count: ghazalTracks.length,
          tracks: ghazalTracks,
          image: ghazalTracks[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
        });
      }
    }

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

    // 5. User Custom Playlists
    if (Array.isArray(customPlaylists)) {
      customPlaylists.forEach(cp => {
        const cpTracks = allTracks.filter(t => (cp.trackIds || []).includes(t.id));
        playlists.push({
          id: cp.id,
          title: cp.title,
          subtitle: `${cpTracks.length} song${cpTracks.length === 1 ? '' : 's'} in this list`,
          count: cpTracks.length,
          tracks: cpTracks,
          trackIds: cp.trackIds || [],
          image: cp.image || cpTracks[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          isCustom: true
        });
      });
    }

    return playlists;
  }, [allTracks, favorites, activeLanguages, customPlaylists]);

  // Click on turntable record directly to toggle playback
  const handleRecordClick = (e) => {
    e.stopPropagation();
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
        <div 
          className="vinyl-brand-group" 
          onClick={(e) => {
            // Explicitly do nothing on single click (not even take to the home page)
            e.preventDefault();
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onOpenAboutUs) {
              onOpenAboutUs();
            }
          }}
          title="Musicly — Double-click to open About Us"
        >
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
              className={`vinyl-rail-btn ${isLikedPanelOpen ? 'is-active' : ''}`} 
              onClick={() => setIsLikedPanelOpen(prev => !prev)}
              title="Favorites & Liked Songs"
            >
              <Heart size={19} fill={isLikedPanelOpen ? '#ff4b60' : (favorites.length > 0 ? '#ff4b60' : 'none')} color={isLikedPanelOpen || favorites.length > 0 ? '#ff4b60' : 'currentColor'} />
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

        {/* Soft Blurry Background Backdrop when Liked Songs popover is open */}
        {isLikedPanelOpen && !isAdminDashboardOpen && (
          <div 
            className="vinyl-liked-popover-backdrop"
            onClick={() => setIsLikedPanelOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Liked Songs White Popover Box beside the rail */}
        {isLikedPanelOpen && !isAdminDashboardOpen && (
          <div 
            className="vinyl-liked-popover-panel" 
            role="dialog" 
            aria-label="Liked Songs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vinyl-liked-panel-header">
              <div className="vinyl-liked-header-left">
                <div className="vinyl-liked-heart-badge">
                  <Heart size={15} fill="#ff4b60" color="#ff4b60" />
                </div>
                <div className="vinyl-liked-title-group">
                  <h3 className="vinyl-liked-title">Liked Songs</h3>
                  <span className="vinyl-liked-counter">
                    {likedTracks.length} {likedTracks.length === 1 ? 'TRACK' : 'TRACKS'}
                  </span>
                </div>
              </div>

              <div className="vinyl-liked-header-actions">
                {likedTracks.length > 0 && (
                  <button 
                    type="button"
                    className="vinyl-liked-playall-btn"
                    onClick={() => {
                      if (likedTracks[0]) {
                        onSelectTrack?.(likedTracks[0], true);
                      }
                    }}
                    title="Play all liked songs"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>PLAY ALL</span>
                  </button>
                )}
                <button 
                  type="button"
                  className="vinyl-liked-close-btn"
                  onClick={() => setIsLikedPanelOpen(false)}
                  title="Close"
                  aria-label="Close liked songs"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List of liked songs */}
            <div className="vinyl-liked-tracks-list">
              {likedTracks.length === 0 ? (
                <div className="vinyl-liked-empty">
                  <div className="vinyl-liked-empty-icon">
                    <Heart size={28} color="#b8b6af" />
                  </div>
                  <p className="vinyl-liked-empty-title">No liked songs yet</p>
                  <p className="vinyl-liked-empty-sub">
                    Tap the heart icon on any song to save it to your vinyl favorites.
                  </p>
                </div>
              ) : (
                likedTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isTrackPlaying = isCurrent && isPlaying;

                  return (
                    <div 
                      key={track.id}
                      className={`vinyl-liked-track-row ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => onSelectTrack?.(track, true)}
                    >
                      <span className="vinyl-liked-row-num">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="vinyl-liked-row-cover-wrap">
                        <img 
                          src={track.cover || '/assets/images/cozy_bedroom.jpg'} 
                          alt={track.title} 
                          className="vinyl-liked-row-cover"
                          loading="lazy" 
                        />
                        <button 
                          type="button"
                          className={`vinyl-liked-row-play-btn ${isTrackPlaying ? 'is-playing' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrent) {
                              onTogglePlay?.();
                            } else {
                              onSelectTrack?.(track, true);
                            }
                          }}
                          aria-label={isTrackPlaying ? "Pause" : "Play"}
                        >
                          {isTrackPlaying ? (
                            <Pause size={12} fill="currentColor" />
                          ) : (
                            <Play size={12} fill="currentColor" />
                          )}
                        </button>
                      </div>

                      <div className="vinyl-liked-row-info">
                        <span className="vinyl-liked-row-title">{track.title}</span>
                        <span className="vinyl-liked-row-artist">{track.artist}</span>
                      </div>

                      <span className="vinyl-liked-row-duration">
                        {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}` : '3:45'}
                      </span>

                      <button 
                        type="button"
                        className="vinyl-liked-row-heart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(track.id);
                        }}
                        title="Remove from Liked Songs"
                        aria-label="Remove from Liked Songs"
                      >
                        <Heart size={14} fill="#ff4b60" color="#ff4b60" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Scrollable Main Workspace */}
        <main className="vinyl-main-scroll">
          <div className="vinyl-workspace-grid">
            
            {/* ==========================================================================
               LEFT COLUMN: HERO VINYL TURNTABLE & INTEGRATED PLAYER
               ========================================================================== */}
            <section className="vinyl-hero-column" aria-label="Vinyl Turntable Deck">
              
              {/* Turntable Skin Switcher Pill Bar (Can click or scroll over deck to switch) */}
              <div className="vinyl-deck-skin-bar">
                <div className="vinyl-deck-skin-toggle-group" role="tablist" aria-label="Turntable Deck Style">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={turntableSkin === 'vintage'}
                    className={`vinyl-deck-skin-btn ${turntableSkin === 'vintage' ? 'is-active' : ''}`}
                    onClick={() => handleSkinChange('vintage')}
                    title="Vintage Hi-Fi Turntable Deck (Scroll up over deck to switch)"
                  >
                    VINTAGE HI-FI
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={turntableSkin === 'modern'}
                    className={`vinyl-deck-skin-btn ${turntableSkin === 'modern' ? 'is-active' : ''}`}
                    onClick={() => handleSkinChange('modern')}
                    title="Modern Clay Turntable Deck (Scroll down over deck to switch)"
                  >
                    MODERN CLAY
                  </button>
                </div>
                <div className="vinyl-deck-scroll-hint" title="Scroll mouse wheel or trackpad over deck to switch skins">
                  <span className="scroll-hint-arrows">⇅</span>
                  <span>Scroll over deck to switch</span>
                </div>
              </div>

              {/* Turntable Switcher Container — Listens for scroll wheel & touch swipe */}
              <div 
                className={`vinyl-deck-switcher-container ${turntableSkin === 'modern' ? 'show-modern' : 'show-vintage'}`}
                ref={deckContainerRef}
              >
                {turntableSkin === 'vintage' ? (
                  /* Realistic Retro Turntable Chassis */
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
                ) : (
                  /* Futuristic Claymorphic Minimalist Turntable Deck */
                  <div className="vinyl-modern-clay-deck">
                    {/* Top Recessed Matte Black Deck Bay */}
                    <div className="modern-deck-top-well">
                      {/* Micro Strobe Dial at Top-Left */}
                      <div 
                        className="modern-top-dial-mini" 
                        onClick={() => setStrobePowerOn(!strobePowerOn)}
                        title="Deck Calibration Strobe"
                      />

                      {/* Rotating Turntable Platter Well */}
                      <div 
                        className="modern-platter-well"
                        onClick={handleRecordClick}
                        title={isPlaying ? "Click record to pause" : "Click record to play"}
                      >
                        {/* Outer Metallic Rim Ring */}
                        <div className="modern-platter-rim" />

                        {/* Modern Black Vinyl Disc */}
                        <div 
                          className={`modern-record-disc ${isPlaying ? 'is-spinning' : 'is-paused'}`}
                          style={{ '--vinyl-spin-duration': `${rpmSpeed === 33 ? 6.5 : 4.2}s` }}
                        >
                          {/* Fine Concentric Vinyl Grooves */}
                          <div className="modern-record-grooves" />

                          {/* Specular Sheen Sweep */}
                          <div className="modern-record-sheen" />

                          {/* Center Minimalist Spindle Hub */}
                          <div className="modern-center-spindle-disc">
                            <div className="modern-center-spindle-hole" />
                          </div>

                          {/* 3D Liquid Chrome Metal Spheres Cluster (Rests on vinyl disc, rotating in orbit) */}
                          <div className="modern-chrome-spheres-cluster" aria-hidden="true">
                            <div className="chrome-sphere sphere-main" />
                            <div className="chrome-sphere sphere-sub-1" />
                            <div className="chrome-sphere sphere-sub-2" />
                            <div className="chrome-sphere sphere-sub-3" />
                            <div className="chrome-sphere sphere-sub-4" />
                            <div className="chrome-sphere sphere-sub-5" />
                          </div>

                          {/* Secondary Mini Droplet Cluster near spindle */}
                          <div className="modern-chrome-micro-cluster" aria-hidden="true">
                            <div className="chrome-sphere micro-1" />
                            <div className="chrome-sphere micro-2" />
                            <div className="chrome-sphere micro-3" />
                          </div>
                        </div>
                      </div>

                      {/* Audio-Technica Style Straight Tonearm */}
                      <div className={`modern-tonearm-assembly ${isPlaying ? 'is-playing' : 'is-resting'}`}>
                        {/* Gimbal Pivot & Cylindrical Counterweight */}
                        <div className="modern-tonearm-gimbal">
                          <div className="modern-tonearm-counterweight" />
                        </div>
                        {/* Black Straight Tonearm Rod */}
                        <div className="modern-tonearm-pipe" />
                        {/* Cartridge Headshell & Stylus Needle */}
                        <div className="modern-tonearm-headshell">
                          <div className="modern-tonearm-needle-tip" />
                        </div>
                      </div>

                      {/* Right Edge Pitch Fader Scale */}
                      <div 
                        className="modern-pitch-slider-bay"
                        onWheel={handleFaderWheel}
                        title={`Pitch & Master Volume: ${Math.round(currentVol * 100)}%`}
                      >
                        <div className="modern-pitch-track-ticks">
                          <span>+</span>
                          <span className="tick-center">—</span>
                          <span>-</span>
                        </div>
                        <div className="modern-pitch-slider-groove">
                          <div 
                            className="modern-pitch-slider-thumb"
                            style={{ top: `${thumbPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Top Well Footer: Micro Strobe Toggle & Audio-Technica Branding */}
                      <div className="modern-top-well-footer">
                        <div 
                          className={`modern-strobe-dial-mini ${!strobePowerOn ? 'is-off' : ''}`}
                          onClick={() => setStrobePowerOn(!strobePowerOn)}
                          title="Strobe Power Toggle"
                        />
                        <div className="modern-branding-text">
                          <span className="modern-brand-logo-icon">▲</span>
                          <span>audio-technica</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Recessed Frosted LCD Display Card + Elevated Clay Rotary Controls */}
                    <div className="modern-deck-bottom-row">
                      {/* Left: Recessed Frosted LCD Display Card */}
                      <div 
                        className="modern-digital-display-card"
                        ref={modernLcdRef}
                        onClick={handleModernLcdSeek}
                        title="Click to seek track position"
                      >
                        {/* Equalizer Barcode / Waveform Spectrogram Blocks */}
                        <div className="modern-barcode-waveform">
                          {modernWaveformBars.map((bar) => {
                            const barRatio = bar.id / modernWaveformBars.length;
                            const isPassed = currentRatio >= barRatio;
                            return (
                              <div 
                                key={bar.id} 
                                className={`modern-barcode-column ${isPlaying ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
                              >
                                <div 
                                  className="modern-barcode-bar top-bar" 
                                  style={{ 
                                    height: `${bar.height}%`,
                                    opacity: bar.opacity 
                                  }} 
                                />
                                <div 
                                  className="modern-barcode-bar bottom-bar" 
                                  style={{ 
                                    height: `${Math.round(bar.height * 0.72)}%`,
                                    opacity: Math.max(0.35, bar.opacity * 0.8) 
                                  }} 
                                />
                              </div>
                            );
                          })}

                          {/* Tracking Cursor Needle */}
                          <div 
                            className="modern-tracking-needle"
                            style={{ left: `${Math.max(2, Math.min(98, currentRatio * 100))}%` }}
                          >
                            <div className="needle-head-top" />
                            <div className="needle-stem" />
                            <div className="needle-head-bottom" />
                          </div>
                        </div>

                        {/* Display Footer: Track Code & Digital Time Clocks */}
                        <div className="modern-display-footer">
                          <div className="modern-track-code">
                            T.{modernTrackNumber}
                          </div>
                          <div className="modern-time-readouts">
                            <div className="modern-time-elapsed">
                              {formatModernTime(currentTime)}
                            </div>
                            <div className="modern-time-total">
                              {formatModernTime(safeDuration)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Elevated Clay Rotary Controls Module */}
                      <div className="modern-rotary-controls-card">
                        {/* Top Knob: Numeric Readout Calibration Knob */}
                        <div className="modern-knob-unit">
                          <div 
                            className="modern-conical-knob knob-top" 
                            style={{ transform: `rotate(${(currentVol * 180) - 90}deg)` }}
                            title="Fine Frequency Knob"
                          >
                            <div className="modern-knob-indicator" />
                          </div>
                          <div className="modern-knob-readout">
                            {(currentVol * 33.313).toFixed(3)}
                          </div>
                        </div>

                        {/* Bottom Knob: Master Volume Rotary */}
                        <div 
                          className="modern-knob-unit"
                          onWheel={handleFaderWheel}
                          title={`Master Volume: ${Math.round(currentVol * 100)}% (Scroll wheel to adjust)`}
                        >
                          <div 
                            className="modern-conical-knob knob-bottom"
                            style={{ transform: `rotate(${(currentVol * 270) - 135}deg)` }}
                          >
                            <div className="modern-knob-indicator" />
                          </div>
                        </div>

                        {/* Pill ON / OFF Playback & Power Button */}
                        <button
                          type="button"
                          className={`modern-power-toggle-btn ${isPlaying ? 'is-on' : 'is-off'}`}
                          onClick={handleRecordClick}
                          title={isPlaying ? "Turntable Power: ON (Click to Stop)" : "Turntable Power: OFF (Click to Start)"}
                        >
                          {isPlaying ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                  {displayCategories.map(category => {
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
                  <div className="vinyl-section-title-wrap">
                    <h2 className="vinyl-section-title">
                      Favorite Playlists ({favoritePlaylists.length})
                    </h2>
                    <button
                      type="button"
                      className="vinyl-add-playlist-btn"
                      onClick={() => {
                        setNewPlaylistTitle('');
                        setSelectedTrackIdsForNew([]);
                        setSongSearchQuery('');
                        setIsCreatePlaylistOpen(true);
                        playClickSound('light');
                      }}
                      title="Create your own playlist and add songs"
                      aria-label="Create new playlist"
                    >
                      <Plus size={16} strokeWidth={2.8} />
                    </button>
                  </div>
                </div>

                {/* Playlist Rows */}
                <div className="vinyl-playlists-stack">
                  {favoritePlaylists.map(playlist => {
                    return (
                      <div 
                        key={playlist.id} 
                        className={`vinyl-playlist-item ${playlist.isCustom ? 'is-custom' : ''}`}
                        onClick={() => {
                          if (playlist.id === 'liked_songs') {
                            setIsLikedPanelOpen(true);
                          } else if (playlist.isCustom) {
                            setSelectedCustomPlaylist(playlist);
                            setIsEditingPlaylistTitle(false);
                            playClickSound('light');
                          } else {
                            onOpenPlaylistDrawer?.();
                          }
                        }}
                        title={playlist.isCustom ? `Manage ${playlist.title}` : `Open ${playlist.title} in music library`}
                      >
                        <div className="vinyl-playlist-info-left">
                          <img 
                            src={playlist.image} 
                            alt={playlist.title} 
                            className="vinyl-playlist-thumb" 
                            loading="lazy"
                          />
                          <div className="vinyl-playlist-text">
                            <div className="vinyl-playlist-name-row">
                              <span className="vinyl-playlist-name">{playlist.title}</span>
                              {playlist.isCustom && (
                                <span className="vinyl-playlist-custom-badge">CUSTOM</span>
                              )}
                            </div>
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
        {/* ================= 1. CREATE NEW PLAYLIST MODAL ================= */}
        {isCreatePlaylistOpen && (
          <div className="vinyl-playlist-modal-backdrop" onClick={() => setIsCreatePlaylistOpen(false)}>
            <div 
              className="vinyl-playlist-modal" 
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Create New Playlist"
            >
              <div className="vinyl-playlist-modal-header">
                <h3 className="vinyl-playlist-modal-title">CREATE NEW PLAYLIST</h3>
                <button
                  type="button"
                  className="vinyl-playlist-close-btn"
                  onClick={() => setIsCreatePlaylistOpen(false)}
                  title="Close"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreatePlaylist} className="vinyl-playlist-modal-body">
                <div>
                  <label className="vinyl-playlist-input-label">PLAYLIST NAME</label>
                  <input
                    type="text"
                    className="vinyl-playlist-text-input"
                    placeholder="e.g. Midnight Lo-Fi, Rainy Coffee, Roadtrip..."
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    autoFocus
                    maxLength={60}
                    required
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="vinyl-playlist-input-label" style={{ margin: 0 }}>
                      ADD SONGS ({selectedTrackIdsForNew.length} selected)
                    </label>
                    {selectedTrackIdsForNew.length > 0 && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ffd166', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                        onClick={() => setSelectedTrackIdsForNew([])}
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  <div className="vinyl-playlist-song-search-wrap">
                    <Search size={15} className="vinyl-playlist-search-icon" />
                    <input
                      type="text"
                      className="vinyl-playlist-search-input"
                      placeholder="Search songs by title, artist, genre..."
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="vinyl-playlist-picker-list">
                  {filteredPickerTracks.map((track) => {
                    const isSelected = selectedTrackIdsForNew.includes(track.id);
                    return (
                      <div
                        key={track.id}
                        className={`vinyl-playlist-song-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedTrackIdsForNew(prev => 
                            prev.includes(track.id) ? prev.filter(id => id !== track.id) : [...prev, track.id]
                          );
                          playClickSound('light');
                        }}
                      >
                        <span className="vinyl-song-check-btn">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </span>
                        <img src={track.cover} alt={track.title} className="vinyl-song-thumb" />
                        <div className="vinyl-song-meta">
                          <span className="vinyl-song-title">{track.title}</span>
                          <span className="vinyl-song-artist">{track.artist}</span>
                        </div>
                        {track.genre && (
                          <span className="vinyl-song-genre-tag">{track.genre}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="vinyl-playlist-modal-footer">
                  <button
                    type="button"
                    className="vinyl-btn-secondary"
                    onClick={() => setIsCreatePlaylistOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="vinyl-btn-primary"
                    disabled={!newPlaylistTitle.trim()}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Create Playlist</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= 2. CUSTOM PLAYLIST DETAILS & MANAGER MODAL ================= */}
        {selectedCustomPlaylist && (
          <div className="vinyl-playlist-modal-backdrop" onClick={() => setSelectedCustomPlaylist(null)}>
            <div 
              className="vinyl-playlist-modal" 
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Playlist Details"
            >
              <div className="vinyl-playlist-detail-header">
                <img 
                  src={selectedCustomPlaylist.image} 
                  alt={selectedCustomPlaylist.title} 
                  className="vinyl-playlist-detail-cover" 
                />
                <div className="vinyl-playlist-detail-info">
                  {isEditingPlaylistTitle ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="vinyl-playlist-text-input"
                        value={editedPlaylistTitle}
                        onChange={(e) => setEditedPlaylistTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditedTitle(selectedCustomPlaylist.id);
                          if (e.key === 'Escape') setIsEditingPlaylistTitle(false);
                        }}
                        style={{ padding: '6px 12px', fontSize: '1.1rem' }}
                      />
                      <button
                        type="button"
                        className="vinyl-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => handleSaveEditedTitle(selectedCustomPlaylist.id)}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="vinyl-playlist-detail-title-row">
                      <h3 className="vinyl-playlist-detail-title">{selectedCustomPlaylist.title}</h3>
                      <button
                        type="button"
                        className="vinyl-playlist-edit-title-btn"
                        onClick={() => {
                          setEditedPlaylistTitle(selectedCustomPlaylist.title);
                          setIsEditingPlaylistTitle(true);
                          playClickSound('light');
                        }}
                        title="Rename playlist"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  )}

                  <span className="vinyl-playlist-detail-sub">
                    {selectedCustomPlaylist.tracks?.length || 0} track{selectedCustomPlaylist.tracks?.length === 1 ? '' : 's'} • Custom Playlist
                  </span>

                  <div className="vinyl-playlist-detail-actions">
                    <button
                      type="button"
                      className="vinyl-btn-primary"
                      onClick={() => {
                        if (selectedCustomPlaylist.tracks && selectedCustomPlaylist.tracks.length > 0) {
                          onSelectTrack?.(selectedCustomPlaylist.tracks[0], true);
                        }
                      }}
                      disabled={!selectedCustomPlaylist.tracks || selectedCustomPlaylist.tracks.length === 0}
                    >
                      <Play size={15} fill="currentColor" />
                      <span>Play All</span>
                    </button>

                    <button
                      type="button"
                      className="vinyl-btn-secondary"
                      onClick={() => {
                        setSongSearchQuery('');
                        setIsAddSongsToExistingOpen(true);
                        playClickSound('light');
                      }}
                    >
                      <Plus size={15} />
                      <span>Add Songs</span>
                    </button>

                    <button
                      type="button"
                      className="vinyl-btn-secondary"
                      style={{ color: '#ff6b6b', borderColor: 'rgba(255, 107, 107, 0.3)' }}
                      onClick={() => handleDeleteCustomPlaylist(selectedCustomPlaylist.id)}
                      title="Delete this playlist"
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="vinyl-playlist-close-btn"
                  onClick={() => setSelectedCustomPlaylist(null)}
                  title="Close"
                  style={{ position: 'absolute', top: 16, right: 16 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tracks in Playlist */}
              <div className="vinyl-playlist-modal-body">
                {(!selectedCustomPlaylist.tracks || selectedCustomPlaylist.tracks.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8c8375' }}>
                    <Music size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>No songs in this playlist yet.</p>
                    <button
                      type="button"
                      className="vinyl-btn-primary"
                      onClick={() => {
                        setSongSearchQuery('');
                        setIsAddSongsToExistingOpen(true);
                        playClickSound('light');
                      }}
                    >
                      <Plus size={15} />
                      <span>Add Songs Now</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCustomPlaylist.tracks.map((track, idx) => {
                      const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
                      return (
                        <div
                          key={track.id}
                          className={`vinyl-playlist-track-row ${isCurrentPlaying ? 'is-active' : ''}`}
                          onClick={() => onSelectTrack?.(track, true)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '0.82rem', color: '#8c8375', width: 20, textAlign: 'center' }}>
                            {idx + 1}
                          </span>
                          <img src={track.cover} alt={track.title} className="vinyl-song-thumb" />
                          <div className="vinyl-song-meta">
                            <span className="vinyl-song-title">{track.title}</span>
                            <span className="vinyl-song-artist">{track.artist}</span>
                          </div>
                          {track.genre && (
                            <span className="vinyl-song-genre-tag">{track.genre}</span>
                          )}
                          <button
                            type="button"
                            className="vinyl-playlist-track-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSongFromPlaylist(selectedCustomPlaylist.id, track.id);
                            }}
                            title="Remove from playlist"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. ADD SONGS TO EXISTING PLAYLIST MODAL ================= */}
        {isAddSongsToExistingOpen && selectedCustomPlaylist && (
          <div className="vinyl-playlist-modal-backdrop" onClick={() => setIsAddSongsToExistingOpen(false)}>
            <div 
              className="vinyl-playlist-modal" 
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Add Songs to Playlist"
            >
              <div className="vinyl-playlist-modal-header">
                <h3 className="vinyl-playlist-modal-title">ADD SONGS TO {selectedCustomPlaylist.title.toUpperCase()}</h3>
                <button
                  type="button"
                  className="vinyl-playlist-close-btn"
                  onClick={() => setIsAddSongsToExistingOpen(false)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="vinyl-playlist-modal-body">
                <div className="vinyl-playlist-song-search-wrap">
                  <Search size={15} className="vinyl-playlist-search-icon" />
                  <input
                    type="text"
                    className="vinyl-playlist-search-input"
                    placeholder="Search songs to add..."
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="vinyl-playlist-picker-list" style={{ maxHeight: 360 }}>
                  {filteredPickerTracks.map((track) => {
                    const isAlreadyIn = (selectedCustomPlaylist.trackIds || []).includes(track.id);
                    return (
                      <div
                        key={track.id}
                        className={`vinyl-playlist-song-item ${isAlreadyIn ? 'is-selected' : ''}`}
                        onClick={() => handleToggleSongInExistingPlaylist(selectedCustomPlaylist.id, track.id)}
                      >
                        <span className="vinyl-song-check-btn">
                          {isAlreadyIn ? <CheckSquare size={18} /> : <Square size={18} />}
                        </span>
                        <img src={track.cover} alt={track.title} className="vinyl-song-thumb" />
                        <div className="vinyl-song-meta">
                          <span className="vinyl-song-title">{track.title}</span>
                          <span className="vinyl-song-artist">{track.artist}</span>
                        </div>
                        {track.genre && (
                          <span className="vinyl-song-genre-tag">{track.genre}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="vinyl-playlist-modal-footer">
                <button
                  type="button"
                  className="vinyl-btn-primary"
                  onClick={() => setIsAddSongsToExistingOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
