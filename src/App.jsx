import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import TopBar from './components/TopBar';
import Player from './components/Player';
import PlaylistDrawer from './components/PlaylistDrawer';
import AmbientMixer from './components/AmbientMixer';
import AuthModal from './components/AuthModal';
import SceneSelector from './components/SceneSelector';
import UploadModal from './components/UploadModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';
import InteractiveBackdropHotspots from './components/InteractiveBackdropHotspots';
import ShootingStarSky from './components/ShootingStarSky';
import RetroTVMonitor from './components/RetroTVMonitor';
import LofiTurntableHotspot from './components/LofiTurntableHotspot';
import HeavensDoorHotspot from './components/HeavensDoorHotspot';
import ChooseYourVibeScene from './components/ChooseYourVibeScene';
import AfterglowScene from './components/AfterglowScene';
import AfterglowCinematicFilm from './components/AfterglowCinematicFilm';
import MinimalStudioScene from './components/MinimalStudioScene';
import AfterglowIntro from './components/AfterglowIntro';
import VelocityScene from './components/VelocityScene';
import CoffeeSupportModal from './components/CoffeeSupportModal';
import AboutUsExperience from './components/AboutUsExperience';
import AdminDashboardModal from './components/AdminDashboardModal';
import FeedbackModal from './components/FeedbackModal';
import FloatingFeedbackNote from './components/FloatingFeedbackNote';
import SongRequestModal from './components/SongRequestModal';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import AirControlsPreview from './components/AirControlsPreview';
import AirControlsModal from './components/AirControlsModal';
import AirControlsFeedback from './components/AirControlsFeedback';
import AirInstructionsGlassBox from './components/AirInstructionsGlassBox';
import AirAiAdminDashboard from './components/AirAiAdminDashboard';
import AirAiDatasetCollector from './components/AirAiDatasetCollector';
import { airControlsService } from './utils/airControlsService';
import './styles/airControls.css';
import { VoiceControlManager, MUSICLY_ACTIONS } from './voice';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { TRACKS, SCENES, GENRE_BACKDROPS, isGhazalLanguage } from './data/tracks';
import { ambientEngine, playTingSound, resumeAudioSynthContext } from './utils/audioSynth';
import { audioEngine } from './utils/audioEngine';
import { ytEngine, extractYouTubeId } from './utils/youtubePlayer';
import { saveTrackToDB, loadSavedTracksFromDB, deleteTrackFromDB, updateTrackGenresInDB, loadFromLocalCache } from './utils/storageDB';
import { loadPublicTracks, publishPublicTrack, updatePublicTrack, deletePublicTrack, getLocalPublicTracks, getDeletedPublicTrackIds } from './utils/publicLibraryDB';
import { checkIsAdmin, syncUserProfile } from './utils/userModel';
import { downloadYouTubeAudio, generateInstantAudioBlob, triggerFileDownload, saveTrackToMusiclyFolder } from './utils/audioDownloader';
import { loadPublicScenes, publishPublicScene, deletePublicScene } from './utils/publicScenesDB';
import { loadSavedWebappTheme, applyWebappTheme, resetWebappTheme } from './utils/aiThemeGenerator';
import { resolveOriginalTrack, resolveTrackAudioStreamAsync, isDirectPlayableAudio } from './utils/originalTrackResolver';
import { deduplicateTracks, findDuplicateTrack } from './utils/trackDeduplicator';
import { auth, onAuthStateChanged, signOut } from './firebase';
import { 
  purgeLegacyAudioSettings, 
  logAudioOutputDiagnostics, 
  normalizeVolume 
} from './utils/audioOutputManager';

export default function App() {
  // Audio & Library state
  const [publicTracks, setPublicTracks] = useState(() => getLocalPublicTracks());
  const [customTracks, setCustomTracks] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [currentTrackId, setCurrentTrackId] = useState(() => TRACKS[0]?.id || 'lofi-1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(173);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('musicly_volume');
      if (saved) {
        const parsed = parseFloat(saved);
        return Math.max(0, Math.min(1, isNaN(parsed) ? 0.85 : parsed));
      }
      return 0.85;
    } catch (e) {
      return 0.85;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('musicly_volume', volume.toString());
    } catch (e) {}
  }, [volume]);

  // Purge any legacy device settings and log default audio routing diagnostics on mount
  useEffect(() => {
    purgeLegacyAudioSettings();
    logAudioOutputDiagnostics();
  }, []);

  // Handle system audio device changes (e.g. Bluetooth connected/disconnected, headphones plugged/unplugged)
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('[Musicly Audio] Output: default (system device change detected)');
      console.log('[Musicly Audio] Playback device: browser default');

      // Wake up Web Audio sound effect contexts if suspended
      resumeAudioSynthContext();

      // If playback was active when the device changed, ensure it continues seamlessly through the new default output
      if (isPlayingRef.current) {
        setTimeout(() => {
          audioEngine.play();
        }, 300);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  }, []);

  // Hydrate saved custom webapp theme if one was applied
  useEffect(() => {
    loadSavedWebappTheme();
  }, []);

  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'off' | 'all' | 'one'

  // Browser route state for cinematic /about-us experience & /admin/air-ai routes
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p === '/about-us' || p === '/admin/air-ai' || p.startsWith('/admin/air-ai')) {
        return p;
      }
      return '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/about-us' || p === '/admin/air-ai' || p.startsWith('/admin/air-ai')) {
        setCurrentRoute(p);
      } else {
        setCurrentRoute('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (path === currentRoute) return;
    window.history.pushState(null, '', path);
    setCurrentRoute(path);
  };

  // User Auth & Role state
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Load official Musicly Public Library tracks (accessible 100% of the time, even when logged out)
  useEffect(() => {
    let isMounted = true;
    async function initPublicTracks() {
      try {
        const loaded = await loadPublicTracks();
        if (isMounted && loaded && loaded.length > 0) {
          setPublicTracks(loaded);
        }
      } catch (e) {
        console.warn("Public tracks load warning:", e);
      }
    }
    initPublicTracks();

    // Listen to real-time public library change events across tabs/components
    const handlePublicChange = (e) => {
      const deletedId = e.detail?.deletedId;
      if (deletedId) {
        setPublicTracks(prev => prev.filter(t => t.id !== deletedId));
        setDeletedTrackIds(prev => prev.includes(deletedId) ? prev : [...prev, deletedId]);
      } else {
        setPublicTracks(getLocalPublicTracks());
      }
    };
    window.addEventListener('musicly_public_library_changed', handlePublicChange);

    return () => { 
      isMounted = false; 
      window.removeEventListener('musicly_public_library_changed', handlePublicChange);
    };
  }, []);

  // Custom Room Themes & Scenes published by Admin
  const [customScenes, setCustomScenes] = useState([]);

  // Load official Musicly Public Room Themes / Scenes (accessible 100% of the time worldwide)
  useEffect(() => {
    let isMounted = true;
    async function initPublicScenes() {
      try {
        const loaded = await loadPublicScenes();
        if (isMounted && loaded && loaded.length > 0) {
          setCustomScenes(loaded);
        }
      } catch (e) {
        console.warn("Public scenes load warning:", e);
      }
    }
    initPublicScenes();
    return () => { isMounted = false; };
  }, []);

  // Favorites persistence tied to user account
  const [favorites, setFavorites] = useState(['lofi-1', 'indie-1']);

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_favorites_${user.uid}` : 'musicly_favorites_guest';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFavorites(JSON.parse(saved));
      } else {
        setFavorites(['lofi-1', 'indie-1']);
      }
    } catch (e) {}
  }, [user?.uid]);

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_favorites_${user.uid}` : 'musicly_favorites_guest';
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites, user?.uid]);

  // User customizable genre/section overrides for any track in library
  const [genreOverrides, setGenreOverrides] = useState({});

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_genre_overrides_${user.uid}` : 'musicly_genre_overrides_guest';
    try {
      const saved = localStorage.getItem(storageKey);
      setGenreOverrides(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setGenreOverrides({});
    }
  }, [user?.uid]);

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_genre_overrides_${user.uid}` : 'musicly_genre_overrides_guest';
    try {
      localStorage.setItem(storageKey, JSON.stringify(genreOverrides));
    } catch (e) {}
  }, [genreOverrides, user?.uid]);

  // Load permanently saved uploaded tracks whenever auth user changes
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setCustomTracks([]);
      return;
    }

    // 1. Instant 0ms synchronous load from local cache so tracks show up immediately!
    const instant = loadFromLocalCache(user.uid, user.email);
    if (instant && instant.length > 0) {
      setCustomTracks(instant);
    }

    // 2. Background sync from IndexedDB + Cloud Firestore
    let isMounted = true;
    async function loadPersistedTracks() {
      try {
        const saved = await loadSavedTracksFromDB(user);
        if (isMounted && saved && saved.length > 0) {
          setCustomTracks(saved);
        }
      } catch (e) {
        console.warn("Error loading persisted audio tracks:", e);
      }
    }
    loadPersistedTracks();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.email]);

  // Deleted tracks persistence (allows manual deletion of any song per user)
  const [deletedTrackIds, setDeletedTrackIds] = useState([]);

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_deleted_${user.uid}` : 'musicly_deleted_guest';
    try {
      const saved = localStorage.getItem(storageKey);
      setDeletedTrackIds(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setDeletedTrackIds([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    const storageKey = (user && !user.isAnonymous) ? `musicly_deleted_${user.uid}` : 'musicly_deleted_guest';
    try {
      localStorage.setItem(storageKey, JSON.stringify(deletedTrackIds));
    } catch (e) {}
  }, [deletedTrackIds, user?.uid]);

  // Selected music languages state: array of ['English', 'Hindi', 'Bengali']
  // When empty ([]), NO language filter is active: all songs play freely without restriction
  // Users can select a single language, or multiple languages (e.g. ['English', 'Hindi']), or deselect all
  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    try {
      const savedList = localStorage.getItem('musicly_selected_languages');
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed)) {
          return parsed.filter(l => l && l !== 'Hinglish' && LANGUAGES.includes(l));
        }
      }
      const legacy = localStorage.getItem('musicly_selected_language');
      if (legacy && legacy !== 'All' && legacy !== 'Hinglish' && LANGUAGES.includes(legacy)) {
        return [legacy];
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('musicly_selected_languages', JSON.stringify(selectedLanguages));
      if (selectedLanguages.length === 1) {
        localStorage.setItem('musicly_selected_language', selectedLanguages[0]);
      } else {
        localStorage.removeItem('musicly_selected_language');
      }
    } catch (e) {}
  }, [selectedLanguages]);

  // Ensure Ghazal genre is ONLY accessible when language includes Hindi or when no filter is active
  useEffect(() => {
    if (selectedGenre && selectedGenre.toLowerCase() === 'ghazal' && !isGhazalLanguage(selectedLanguages)) {
      handleSelectGenre('All');
    }
  }, [selectedLanguages, selectedGenre]);

  // Multi-select / single-select / deselect toggle handler
  const handleSelectLanguage = (langOrLangs) => {
    if (!langOrLangs || langOrLangs === 'All') {
      setSelectedLanguages([]);
      return;
    }
    if (Array.isArray(langOrLangs)) {
      setSelectedLanguages(langOrLangs.filter(l => l && l !== 'Hinglish' && LANGUAGES.includes(l)));
      return;
    }
    // Single language toggle
    setSelectedLanguages(prev => {
      if (prev.includes(langOrLangs)) {
        return prev.filter(l => l !== langOrLangs);
      }
      return [...prev, langOrLangs];
    });
  };

  // Backwards-compatible single string representation
  const selectedLanguage = useMemo(() => {
    if (selectedLanguages.length === 1) return selectedLanguages[0];
    if (selectedLanguages.length > 1) return selectedLanguages.join(', ');
    return null;
  }, [selectedLanguages]);

  // Compute all available tracks:
  // 1. Musicly Public Library (visible worldwide to everyone, logged in or logged out!)
  // 2. User Private Uploads (strictly visible ONLY when authenticated to that specific account)
  // 3. Built-in Curated Catalog
  const allTracks = useMemo(() => {
    const isAuthed = user && !user.isAnonymous;
    const activeCustom = isAuthed ? customTracks : [];

    // Sanitize Public Library tracks (accessible 100% of the time, even when logged out)
    const sanitizedPublic = publicTracks.filter(t => !deletedTrackIds.includes(t.id)).map(t => {
      const overridden = genreOverrides[t.id];
      if (overridden) {
        return {
          ...t,
          isPublic: true,
          genres: overridden,
          genre: overridden.join(', ')
        };
      }
      return {
        ...t,
        isPublic: true
      };
    });

    // 🔒 STRICT: When without login, show ONLY the official Musicly Public Library
    if (!isAuthed) {
      return deduplicateTracks(sanitizedPublic).map(t => resolveOriginalTrack(t));
    }

    const sanitizedCustom = activeCustom.map(t => {
      const overridden = genreOverrides[t.id];
      let cleanGenres = overridden || (Array.isArray(t.genres) 
        ? t.genres.filter(g => g && g.toLowerCase() !== 'custom')
        : []);
      if (cleanGenres.length === 0 && t.genre && t.genre.toLowerCase() !== 'custom') {
        cleanGenres = t.genre.split(',').map(s => s.trim()).filter(g => g && g.toLowerCase() !== 'custom');
      }
      if (cleanGenres.length === 0) {
        const combined = `${t.title || ''} ${t.artist || ''}`.toLowerCase();
        if (combined.includes('piano man') || combined.includes('american pie') || combined.includes('billy joel') || combined.includes('mclean') || combined.includes('queen') || combined.includes('beatles')) {
          cleanGenres = ['Retro'];
        } else {
          cleanGenres = ['Lo-Fi'];
        }
      }
      return {
        ...t,
        isCustom: true,
        language: t.language || 'English',
        genres: cleanGenres,
        genre: cleanGenres.join(', ')
      };
    });

    const sanitizedCatalog = TRACKS.filter(t => !deletedTrackIds.includes(t.id)).map(t => {
      const overridden = genreOverrides[t.id];
      if (overridden) {
        return {
          ...t,
          language: t.language || 'English',
          genres: overridden,
          genre: overridden.join(', ')
        };
      }
      return {
        ...t,
        language: t.language || 'English'
      };
    });

    const combined = [...sanitizedCustom, ...sanitizedPublic, ...sanitizedCatalog];
    return deduplicateTracks(combined).map(t => resolveOriginalTrack(t));
  }, [publicTracks, customTracks, genreOverrides, deletedTrackIds, user]);

  // Active track list (supports multi-genre matching AND language filtering across all sections)
  const activePlaylist = useMemo(() => {
    // 1. Filter by section / mood
    let filtered = allTracks;
    if (selectedGenre !== 'All') {
      const target = selectedGenre.toLowerCase();
      filtered = filtered.filter(track => {
        const matchGenre = track.genre?.toLowerCase() === target;
        const matchArray = Array.isArray(track.genres) && track.genres.some(g => g && g.toLowerCase() === target);
        const matchSplit = typeof track.genre === 'string' && track.genre.split(',').map(s => s.trim().toLowerCase()).includes(target);
        return matchGenre || matchArray || matchSplit;
      });
    }

    // 2. Filter by language if any languages are actively selected; otherwise all songs play freely
    if (selectedLanguages && selectedLanguages.length > 0) {
      const lowerSelected = selectedLanguages.map(l => l.toLowerCase());
      const langFiltered = filtered.filter(track => {
        const trackLang = (track.language || 'English').toLowerCase();
        return lowerSelected.includes(trackLang);
      });
      if (langFiltered.length > 0) {
        return langFiltered;
      }
    }

    return filtered.length > 0 ? filtered : allTracks;
  }, [allTracks, selectedGenre, selectedLanguages]);

  // Room Lighting & Brightness state (0.25 = deep dark cozy night to 1.25 = bright day)
  const [roomBrightness, setRoomBrightness] = useState(() => {
    try {
      const saved = localStorage.getItem('musicly_room_brightness');
      const val = saved ? parseFloat(saved) : 1.0;
      return (!isNaN(val) && val >= 0.25) ? val : 1.0;
    } catch (e) {
      return 1.0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('musicly_room_brightness', roomBrightness.toString());
    } catch (e) {}
  }, [roomBrightness]);

  const handleToggleLamp = () => {
    const isCurrentlyDim = roomBrightness < 0.6;
    const nextVal = isCurrentlyDim ? 1.0 : 0.35;
    setRoomBrightness(nextVal);
  };

  // Scene / Visual state with smooth animated genre backdrops
  const [currentScene, setCurrentScene] = useState(SCENES[0]);
  const [backdropImage, setBackdropImage] = useState(GENRE_BACKDROPS['All']);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  const allScenes = useMemo(() => [...SCENES, ...customScenes], [customScenes]);

  // Afterglow Experience State ('film' | 'classic')
  const [afterglowMode, setAfterglowMode] = useState('film');
  const [afterglowChosenGenre, setAfterglowChosenGenre] = useState('Lo-Fi');

  // Ambient sound state
  const [ambientVolumes, setAmbientVolumes] = useState({
    rain: 0,
    thunder: 0,
    cafe: 0,
    fire: 0,
    vinyl: 0,
    keyboard: 0,
    bugs: 0
  });

  // Modal Visibility states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerSearchMode, setIsDrawerSearchMode] = useState(false);
  const [isAmbientOpen, setIsAmbientOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSceneOpen, setIsSceneOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCoffeeOpen, setIsCoffeeOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSongRequestOpen, setIsSongRequestOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // About Us button visibility tied strictly to clicking the coffee cup icon
  const [isAboutUsVisible, setIsAboutUsVisible] = useState(false);
  const [isAboutUsExiting, setIsAboutUsExiting] = useState(false);

  useEffect(() => {
    if (isCoffeeOpen && currentRoute !== '/about-us' && !isAdminDashboardOpen) {
      setIsAboutUsVisible(true);
      setIsAboutUsExiting(false);
    } else if (isAboutUsVisible) {
      setIsAboutUsExiting(true);
      const timer = setTimeout(() => {
        setIsAboutUsVisible(false);
        setIsAboutUsExiting(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isCoffeeOpen, currentRoute, isAdminDashboardOpen, isAboutUsVisible]);

  // Auto-feedback session prompt refs
  const wasAutoPausedForFeedbackRef = useRef(false);
  const lastCountedTrackIdRef = useRef(null);

  const audioRef = useRef(audioEngine.audio);
  audioRef.current = audioEngine.audio;
  const prevTrackIdRef = useRef(null);
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;
  const lastUiUpdateRef = useRef(0);

  const currentTrack = useMemo(() => {
    return allTracks.find(t => t.id === currentTrackId) || activePlaylist[0] || allTracks[0] || TRACKS[0];
  }, [allTracks, currentTrackId, activePlaylist]);

  // Live state refs to avoid stale closure issues in audio callbacks and intervals
  const activePlaylistRef = useRef(activePlaylist);
  activePlaylistRef.current = activePlaylist;

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;

  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const handleNextTrackAutoRef = useRef(null);

  // Air Controls State (Camera Hand Gesture Navigation)
  const [isAirControlsEnabled, setIsAirControlsEnabled] = useState(() => {
    try {
      return localStorage.getItem('musicly_air_controls_enabled') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isAirControlsModalOpen, setIsAirControlsModalOpen] = useState(false);
  const [showAirInstructions, setShowAirInstructions] = useState(false);
  const [airInstructionsCountdown, setAirInstructionsCountdown] = useState(8);
  const [showAirPreview, setShowAirPreview] = useState(true);
  const [isAirDebug, setIsAirDebug] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('airDebug=true');
    }
    return false;
  });
  const [airFeedback, setAirFeedback] = useState(null);

  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  const ambientVolumesRef = useRef(ambientVolumes);
  ambientVolumesRef.current = ambientVolumes;

  const prevVolumeRef = useRef(volume > 0 ? volume : 0.85);
  if (volume > 0) prevVolumeRef.current = volume;

  // Voice Control System ("Hey Musicly")
  const [voiceManager] = useState(() => {
    try {
      return new VoiceControlManager({
        getCurrentVolume: () => volumeRef.current,
        setTemporaryVolume: (vol) => {
          try {
            audioEngine.setVolume(vol);
          } catch (e) {
            // ignore
          }
        }
      });
    } catch (e) {
      console.warn('[VoiceControl] Failed to initialize VoiceControlManager:', e);
      return null;
    }
  });

  // Listen to Firebase Auth state & sync admin privileges
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser || null);
        const isAdm = checkIsAdmin(currentUser);
        setIsAdmin(isAdm);

        if (currentUser && !currentUser.isAnonymous) {
          syncUserProfile(currentUser).then(({ isAdmin: syncdAdm }) => {
            setIsAdmin(syncdAdm);
          });
          const instant = loadFromLocalCache(currentUser.uid, currentUser.email);
          if (instant && instant.length > 0) {
            setCustomTracks(instant);
          }
        } else {
          setCustomTracks([]);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Subscribe to authoritative AudioEngine events on mount
  useEffect(() => {
    // Eagerly pre-warm YouTube Audio Engine in background so it's ready instantly when user plays
    ytEngine.init().catch(e => console.warn("YouTube Engine pre-warm notice:", e));

    const unsubscribe = audioEngine.subscribe((event) => {
      if (event.type === 'STATE_CHANGE' || event.type === 'INIT') {
        setIsPlaying(event.isPlaying);
        if (event.duration && !isNaN(event.duration) && event.duration > 0) {
          setDuration(Math.round(event.duration));
        }
      } else if (event.type === 'TIME_UPDATE') {
        const time = event.currentTime;
        currentTimeRef.current = time;
        if (Math.abs(time - lastUiUpdateRef.current) >= 0.25) {
          lastUiUpdateRef.current = time;
          setCurrentTime(time);
        }
      } else if (event.type === 'DURATION_CHANGE') {
        if (event.duration && !isNaN(event.duration) && event.duration > 0) {
          setDuration(Math.round(event.duration));
        }
      } else if (event.type === 'ENDED') {
        handleNextTrackAutoRef.current?.();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Synchronize playback with AudioEngine on track or play state change
  useEffect(() => {
    if (!currentTrack) return;

    const isNewTrack = prevTrackIdRef.current !== currentTrack.id;
    prevTrackIdRef.current = currentTrack.id;

    if (isNewTrack) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
      if (currentTrack.duration) {
        setDuration(currentTrack.duration);
      }
    }

    if (isPlaying) {
      if (isNewTrack || !audioEngine.isPlaying) {
        const startSec = isNewTrack ? (currentTrack.startTime || 0) : (currentTimeRef.current || 0);
        audioEngine.playTrack(currentTrack, startSec);
      }
    } else {
      if (audioEngine.isPlaying) {
        audioEngine.pause();
      }
    }
  }, [currentTrack?.id, isPlaying]);

  // Volume synchronization with AudioEngine
  useEffect(() => {
    const safeVol = normalizeVolume(volume);
    audioEngine.setVolume(safeVol);
  }, [volume]);

  // Authoritative Playback Toggle
  const togglePlay = () => {
    resumeAudioSynthContext();
    console.log('[Musicly Audio] AudioContext: running');
    console.log('[Musicly Audio] Output: default');

    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (!nextState) {
      audioEngine.pause();
    } else {
      audioEngine.playTrack(currentTrack, currentTimeRef.current || 0);

      // Auto-activate Chill/Sleep ambient soundscape when playing in Chill/Sleep section
      if (currentTrack?.genre === 'Chill/Sleep' || selectedGenre === 'Chill/Sleep') {
        const isMuted = Object.values(ambientVolumes).every(v => v === 0);
        if (isMuted) {
          const sleepVolumes = { rain: 0.20, bugs: 0.45, thunder: 0.15, fire: 0.15, vinyl: 0, cafe: 0, keyboard: 0 };
          setAmbientVolumes(prev => ({ ...prev, ...sleepVolumes }));
          Object.entries(sleepVolumes).forEach(([ch, vol]) => ambientEngine.setVolume(ch, vol));
        }
      }
    }
  };

  // Dedicated single-track selector
  const handleSelectTrack = (track, shouldPlay = true) => {
    if (!track) return;
    setCurrentTrackId(track.id);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    if (shouldPlay) {
      setIsPlaying(true);
      audioEngine.playTrack(track, 0);
    } else {
      setIsPlaying(false);
      audioEngine.pause();
    }
  };

  // Seek handler: delegates cleanly to AudioEngine with ZERO continuous loops
  const handleSeek = (newTime) => {
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    setCurrentTime(clampedTime);
    currentTimeRef.current = clampedTime;
    audioEngine.seek(clampedTime);

    if (!isPlaying) {
      setIsPlaying(true);
      audioEngine.play();
    }
  };

  // Next Track: Jumps to the next song in the active (selected) section
  const handleNextTrack = () => {
    const list = activePlaylistRef.current || [];
    if (list.length === 0) return;

    const track = currentTrackRef.current;
    const shuffle = isShuffleRef.current;

    let nextTrack;
    if (shuffle) {
      const candidates = list.filter(t => t.id !== track?.id);
      nextTrack = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : list[0];
    } else {
      const currentIdxInActive = list.findIndex(t => t.id === track?.id);
      if (currentIdxInActive === -1) {
        // Current playing song was from a previous section; start playing from the newly selected section!
        nextTrack = list[0];
      } else {
        const nextIdx = (currentIdxInActive + 1) % list.length;
        nextTrack = list[nextIdx];
      }
    }

    if (nextTrack) {
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setCurrentTrackId(nextTrack.id);
      setIsPlaying(true);
    }
  };

  const handleNextTrackAuto = () => {
    const rMode = repeatModeRef.current;
    const track = currentTrackRef.current;
    const list = activePlaylistRef.current || [];
    const vol = volumeRef.current;

    if (rMode === 'one') {
      setCurrentTime(0);
      currentTimeRef.current = 0;
      audioEngine.seek(0);
      audioEngine.play();
    } else if (rMode === 'all') {
      handleNextTrack();
    } else {
      const currentIdxInActive = list.findIndex(t => t.id === track?.id);
      if (currentIdxInActive !== -1 && currentIdxInActive === list.length - 1) {
        setIsPlaying(false);
        audioEngine.pause();
      } else {
        handleNextTrack();
      }
    }
  };
  handleNextTrackAutoRef.current = handleNextTrackAuto;

  // Previous Track: Jumps to the previous song in the active (selected) section
  const handlePrevTrack = () => {
    const list = activePlaylistRef.current || [];
    if (list.length === 0) return;

    const track = currentTrackRef.current;
    let prevTrack;
    const currentIdxInActive = list.findIndex(t => t.id === track?.id);
    if (currentIdxInActive === -1) {
      prevTrack = list[list.length - 1];
    } else {
      const prevIdx = (currentIdxInActive === 0 ? list.length - 1 : currentIdxInActive - 1);
      prevTrack = list[prevIdx];
    }

    if (prevTrack) {
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setCurrentTrackId(prevTrack.id);
      setIsPlaying(true);
    }
  };

  const handleToggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleToggleFavorite = (trackId) => {
    const id = trackId || currentTrack?.id;
    if (!id) return;
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Unified Scene Selection
  const handleSelectScene = useCallback((scene) => {
    if (!scene) return;
    if (scene.id === 'afterglow') {
      setAfterglowMode('film');
    }
    setCurrentScene(scene);
    setBackdropImage(scene.image);
    if (scene.primaryColor || scene.isTheme) {
      applyWebappTheme({
        primaryColor: scene.primaryColor || '#ffb703',
        secondaryColor: scene.secondaryColor || '#fb8500',
        glowColor: scene.glowColor || 'rgba(251, 133, 0, 0.4)'
      });
    } else {
      resetWebappTheme();
    }
    setIsSceneOpen(false);
  }, []);

  // Keyboard and Navigation Handlers
  const handleGoHome = useCallback(() => {
    const homeScene = allScenes[0] || SCENES[0];
    handleSelectScene(homeScene);
    setSelectedGenre('All');
    setIsDrawerOpen(false);
  }, [allScenes, handleSelectScene]);

  const handleSeekForward = useCallback(() => {
    const dur = duration || 180;
    const current = currentTimeRef.current || currentTime || 0;
    const target = Math.min(dur, current + 5);
    handleSeek(target);
  }, [duration, currentTime, handleSeek]);

  const handleSeekBackward = useCallback(() => {
    const dur = duration || 180;
    const current = currentTimeRef.current || currentTime || 0;
    const target = Math.max(0, current - 5);
    handleSeek(target);
  }, [duration, currentTime, handleSeek]);

  const handleVolumeUp = useCallback(() => {
    setVolume(prev => Math.min(1, Math.round((prev + 0.05) * 100) / 100));
  }, []);

  const handleVolumeDown = useCallback(() => {
    setVolume(prev => Math.max(0, Math.round((prev - 0.05) * 100) / 100));
  }, []);

  const handleNextScene = useCallback(() => {
    if (!allScenes || allScenes.length === 0) return;
    const currentIdx = allScenes.findIndex(sc => sc.id === currentScene?.id);
    const nextIdx = (currentIdx + 1) % allScenes.length;
    handleSelectScene(allScenes[nextIdx]);
  }, [allScenes, currentScene?.id, handleSelectScene]);

  const handleOpenSearch = useCallback(() => {
    setIsDrawerSearchMode(true);
    setIsDrawerOpen(true);
  }, []);

  const handleOpenLibrary = useCallback(() => {
    setIsDrawerSearchMode(false);
    setIsDrawerOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  }, []);

  const handleToggleAmbient = useCallback(() => {
    setIsAmbientOpen(prev => !prev);
  }, []);

  // Topmost modal closure handler for ESC
  const handleCloseTopmostModal = useCallback(() => {
    if (isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false);
      return;
    }
    if (isShortcutsOpen) {
      setIsShortcutsOpen(false);
      return;
    }
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return;
    }
    if (isSceneOpen) {
      setIsSceneOpen(false);
      return;
    }
    if (isUploadOpen) {
      setIsUploadOpen(false);
      return;
    }
    if (isFeedbackOpen) {
      setIsFeedbackOpen(false);
      return;
    }
    if (isCoffeeOpen) {
      setIsCoffeeOpen(false);
      return;
    }
    if (isSongRequestOpen) {
      setIsSongRequestOpen(false);
      return;
    }
    if (isAmbientOpen) {
      setIsAmbientOpen(false);
      return;
    }
    if (voiceManager && (voiceManager.state === 'LISTENING_FOR_COMMAND' || voiceManager.state === 'WAKE_WORD_DETECTED')) {
      voiceManager._returnToWakeWordListening();
      return;
    }
    if (isAirControlsModalOpen) {
      setIsAirControlsModalOpen(false);
      return;
    }
    if (isAdminDashboardOpen) {
      setIsAdminDashboardOpen(false);
      return;
    }
    if (isAuthOpen) {
      setIsAuthOpen(false);
      return;
    }
  }, [
    isCommandPaletteOpen,
    isShortcutsOpen,
    isAirControlsModalOpen,
    isDrawerOpen,
    isSceneOpen,
    isUploadOpen,
    isFeedbackOpen,
    isCoffeeOpen,
    isSongRequestOpen,
    isAmbientOpen,
    isAdminDashboardOpen,
    isAuthOpen
  ]);

  // Central Authoritative Keyboard Shortcut Manager
  useKeyboardShortcuts({
    isPlaying,
    onTogglePlay: togglePlay,
    onPrevTrack: handlePrevTrack,
    onNextTrack: handleNextTrack,
    currentTime,
    duration,
    onSeek: handleSeek,
    volume,
    onVolumeChange: setVolume,
    isShuffle,
    onToggleShuffle: () => setIsShuffle(!isShuffle),
    repeatMode,
    onToggleRepeat: handleToggleRepeat,
    isFavorite: favorites.includes(currentTrack?.id),
    onToggleFavorite: () => handleToggleFavorite(currentTrack?.id),
    onOpenSearch: handleOpenSearch,
    onOpenLibrary: handleOpenLibrary,
    onGoHome: handleGoHome,
    onOpenUpload: () => {
      if (!user || user.isAnonymous) {
        setIsAuthOpen(true);
      } else {
        setIsUploadOpen(true);
      }
    },
    onToggleAmbient: handleToggleAmbient,
    isAmbientOpen,
    onOpenSceneModal: () => setIsSceneOpen(true),
    onSelectScene: handleSelectScene,
    allScenes,
    currentScene,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    onCloseTopmostModal: handleCloseTopmostModal
  });

  // 💬 Automatic Feedback Prompt Trigger (7th Song Played in Session)
  useEffect(() => {
    // Never prompt while in admin mode or if user is admin
    if (isAdmin || isAdminDashboardOpen) return;
    // Only track when music is actively playing with a valid song
    if (!isPlaying || !currentTrack?.id) return;

    // Avoid double counting on re-renders/restarts of the same song
    if (lastCountedTrackIdRef.current === currentTrack.id) return;
    lastCountedTrackIdRef.current = currentTrack.id;

    // Only prompt once per session
    if (sessionStorage.getItem('musicly_feedback_prompted') === 'true') return;

    // Increment session song counter
    const currentCount = parseInt(sessionStorage.getItem('musicly_session_songs_count') || '0', 10) + 1;
    sessionStorage.setItem('musicly_session_songs_count', String(currentCount));

    // After user finishes/plays their 7th song, pause and show feedback modal
    if (currentCount >= 7) {
      sessionStorage.setItem('musicly_feedback_prompted', 'true');
      const timer = setTimeout(() => {
        if (isAdmin || isAdminDashboardOpen) return;
        setIsPlaying(false);
        wasAutoPausedForFeedbackRef.current = true;
        setIsFeedbackOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentTrack?.id, isAdmin, isAdminDashboardOpen]);

  // Immediately close feedback if admin dashboard is opened
  useEffect(() => {
    if (isAdminDashboardOpen && isFeedbackOpen) {
      setIsFeedbackOpen(false);
    }
  }, [isAdminDashboardOpen, isFeedbackOpen]);

  // Handle closing / skipping / submitting feedback modal
  const handleCloseFeedback = ({ submitted = false } = {}) => {
    setIsFeedbackOpen(false);
    // If playback was paused for automatic feedback prompt, resume it
    if (wasAutoPausedForFeedbackRef.current) {
      wasAutoPausedForFeedbackRef.current = false;
      setIsPlaying(true);
    }
  };

  // Genre filter selection + Animated Dynamic Backdrop Switch
  const handleSelectGenre = (genre) => {
    if (genre && genre.toLowerCase() === 'ghazal' && !isGhazalLanguage(selectedLanguage)) {
      setSelectedGenre('All');
      return;
    }
    setSelectedGenre(genre);

    // If NOT playing, cue up the first song of the newly selected section
    // If IS playing, keep the current song playing completely uninterrupted!
    if (!isPlaying) {
      const genrePlaylist = (genre === 'All')
        ? allTracks
        : allTracks.filter(track => {
            const matchGenre = track.genre?.toLowerCase() === genre.toLowerCase();
            const matchArray = Array.isArray(track.genres) && track.genres.some(g => g.toLowerCase() === genre.toLowerCase());
            const matchSplit = typeof track.genre === 'string' && track.genre.split(',').map(s => s.trim().toLowerCase()).includes(genre.toLowerCase());
            return matchGenre || matchArray || matchSplit;
          });
      const firstTrack = genrePlaylist[0] || allTracks[0];
      if (firstTrack) {
        setCurrentTrackId(firstTrack.id);
        setCurrentTime(0);
        currentTimeRef.current = 0;
      }
    }

    const nextBackdrop = GENRE_BACKDROPS[genre] || GENRE_BACKDROPS['All'];
    if (nextBackdrop && nextBackdrop !== backdropImage) {
      setIsTransitioning(true);
      setTimeout(() => {
        setBackdropImage(nextBackdrop);
        setTimeout(() => setIsTransitioning(false), 60);
      }, 200);
    }
  };

  // Ambient sound fader
  const handleAmbientVolumeChange = (type, vol) => {
    setAmbientVolumes(prev => ({ ...prev, [type]: vol }));
    ambientEngine.setVolume(type, vol);
  };

  const handleResetAmbient = () => {
    setAmbientVolumes({ rain: 0, thunder: 0, cafe: 0, fire: 0, vinyl: 0, keyboard: 0, bugs: 0 });
    ambientEngine.stopAll();
  };

  const activeAmbientCount = Object.values(ambientVolumes).filter(v => v > 0).length;

  // Air Controls Activation & Camera Stream Lifecycle
  // Strict Privacy: Camera is NEVER accessed unless user explicitly enables Air Controls.
  useEffect(() => {
    try {
      localStorage.setItem('musicly_air_controls_enabled', isAirControlsEnabled ? 'true' : 'false');
    } catch (e) {}

    if (isAirControlsEnabled) {
      airControlsService.start();
    } else {
      airControlsService.stop();
    }
  }, [isAirControlsEnabled]);

  // Clean up media tracks and loops on unmount
  useEffect(() => {
    return () => {
      airControlsService.stop();
    };
  }, []);

  // 8-Second Glass Box Instructions Countdown (First-Time Activation)
  useEffect(() => {
    if (!showAirInstructions) return;

    const interval = setInterval(() => {
      setAirInstructionsCountdown(prev => {
        if (prev <= 1) {
          setShowAirInstructions(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      setShowAirInstructions(false);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [showAirInstructions]);

  // Click on Air icon: directly open camera & show 8s glass instructions for the first time
  const handleAirIconClick = () => {
    if (!isAirControlsEnabled) {
      setIsAirControlsEnabled(true);
      try {
        const hasSeen = localStorage.getItem('musicly_air_intro_seen');
        if (!hasSeen) {
          setShowAirInstructions(true);
          setAirInstructionsCountdown(8);
          localStorage.setItem('musicly_air_intro_seen', 'true');
        }
      } catch (e) {
        setShowAirInstructions(true);
        setAirInstructionsCountdown(8);
      }
    } else {
      setIsAirControlsEnabled(false);
      setShowAirInstructions(false);
    }
  };

  // Air Controls Gesture Action Dispatcher
  // Critical: Calls the EXACT same underlying player functions. Zero duplicate audio players!
  useEffect(() => {
    if (!isAirControlsEnabled) return;

    const unsub = airControlsService.subscribeGesture((gesture) => {
      console.log('[AirControls] Dispatched gesture:', gesture);

      switch (gesture) {
        case 'OPEN_PALM': {
          togglePlay();
          setAirFeedback({
            type: isPlayingRef.current ? 'PAUSE' : 'PLAY',
            label: isPlayingRef.current ? 'Ⅱ PAUSED' : '▶ PLAYING',
            sublabel: 'Open Palm'
          });
          break;
        }
        case 'FACE_RIGHT': {
          handleNextTrack();
          setAirFeedback({
            type: 'NEXT',
            label: 'NEXT TRACK →',
            sublabel: 'Face Right'
          });
          break;
        }
        case 'FACE_LEFT': {
          handlePrevTrack();
          setAirFeedback({
            type: 'PREV',
            label: 'PREVIOUS TRACK ←',
            sublabel: 'Face Left'
          });
          break;
        }
        case 'ONE_FINGER_UP': {
          setVolume(prev => {
            const next = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
            setAirFeedback({
              type: 'VOL_UP',
              label: `VOL ${Math.round(next * 100)}%`,
              sublabel: '+5% Up'
            });
            return next;
          });
          break;
        }
        case 'ONE_FINGER_DOWN': {
          setVolume(prev => {
            const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
            setAirFeedback({
              type: 'VOL_DOWN',
              label: `VOL ${Math.round(next * 100)}%`,
              sublabel: '-5% Down'
            });
            return next;
          });
          break;
        }
        case 'PEACE': {
          // Toggle ambience soundscape
          const currentCount = Object.values(ambientVolumesRef.current || {}).filter(v => v > 0).length;
          if (currentCount > 0) {
            handleResetAmbient();
            setAirFeedback({
              type: 'AMBIENCE_OFF',
              label: 'AMBIENCE OFF',
              sublabel: 'Peace Sign'
            });
          } else {
            const defaultSounds = { rain: 0.25, fire: 0.15 };
            setAmbientVolumes(prev => ({ ...prev, ...defaultSounds }));
            ambientEngine.setVolume('rain', 0.25);
            ambientEngine.setVolume('fire', 0.15);
            setAirFeedback({
              type: 'AMBIENCE_ON',
              label: 'AMBIENCE ON',
              sublabel: 'Rain & Fire'
            });
          }
          break;
        }
        case 'LIKE': {
          const trackId = currentTrackRef.current?.id;
          if (trackId) {
            handleToggleFavorite(trackId);
            const isFav = favoritesRef.current.includes(trackId);
            setAirFeedback({
              type: isFav ? 'UNLIKE' : 'LIKE',
              label: isFav ? '♡ UNLIKED' : '♥ LIKED',
              sublabel: isFav ? 'Removed from favorites' : 'Saved to favorites'
            });
          }
          break;
        }
        case 'FIST': {
          // Toggle mute
          if (volumeRef.current > 0) {
            prevVolumeRef.current = volumeRef.current;
            setVolume(0);
            setAirFeedback({
              type: 'MUTE',
              label: 'MUTED',
              sublabel: 'Closed Fist'
            });
          } else {
            const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.85;
            setVolume(restored);
            setAirFeedback({
              type: 'UNMUTE',
              label: `UNMUTED ${Math.round(restored * 100)}%`,
              sublabel: 'Closed Fist'
            });
          }
          break;
        }
        default:
          break;
      }
    });

    return unsub;
  }, [isAirControlsEnabled, togglePlay, handleNextTrack, handlePrevTrack, handleResetAmbient, handleToggleFavorite]);

  // Wire Voice Control Action Registry ("HEY MUSICLY")
  useEffect(() => {
    if (!voiceManager) return;

    // Provide dynamic context to VoiceCommandParser and ActionRegistry
    voiceManager.actionRegistry.setContextProvider(() => ({
      currentTrack: currentTrackRef.current,
      isPlaying: isPlayingRef.current,
      volume: volumeRef.current,
      isShuffle: isShuffleRef.current,
      repeatMode: repeatModeRef.current,
      favorites: favoritesRef.current,
      allTracks,
      allScenes,
      currentScene,
      selectedGenre,
      activePlaylist: activePlaylistRef.current,
      user,
      isAdmin,
      ambientVolumes: ambientVolumesRef.current,
    }));

    // Register safe actions
    const reg = voiceManager.actionRegistry;

    // Playback
    reg.register(MUSICLY_ACTIONS.PLAY, async () => {
      if (!isPlayingRef.current) {
        togglePlay();
      }
      return 'Playing.';
    });

    reg.register(MUSICLY_ACTIONS.PAUSE, async () => {
      if (isPlayingRef.current) {
        togglePlay();
      }
      return 'Paused.';
    });

    reg.register(MUSICLY_ACTIONS.TOGGLE_PLAY, async () => {
      togglePlay();
      return isPlayingRef.current ? 'Paused.' : 'Playing.';
    });

    reg.register(MUSICLY_ACTIONS.STOP, async () => {
      if (isPlayingRef.current) {
        togglePlay();
      }
      return 'Stopped.';
    });

    reg.register(MUSICLY_ACTIONS.NEXT_TRACK, async () => {
      handleNextTrack();
      return 'Next track.';
    });

    reg.register(MUSICLY_ACTIONS.PREVIOUS_TRACK, async () => {
      handlePrevTrack();
      return 'Previous track.';
    });

    reg.register(MUSICLY_ACTIONS.REPLAY, async () => {
      handleSeek(0);
      if (!isPlayingRef.current) togglePlay();
      return 'Replaying track.';
    });

    // Seeking
    reg.register(MUSICLY_ACTIONS.SEEK, async (params) => {
      const cur = currentTimeRef.current || 0;
      const dur = duration || 180;
      let target = cur;

      if (params.timestamp !== undefined) {
        target = Math.max(0, Math.min(dur, params.timestamp));
      } else if (params.offsetSeconds !== undefined) {
        const delta = params.direction === 'backward' ? -params.offsetSeconds : params.offsetSeconds;
        target = Math.max(0, Math.min(dur, cur + delta));
      } else if (params.type === 'relative') {
        target = Math.max(0, Math.min(dur, cur + (params.seconds || 0)));
      } else if (params.type === 'absolute') {
        target = Math.max(0, Math.min(dur, params.seconds || 0));
      }

      handleSeek(target);
      return `Jumped to ${Math.round(target)} seconds.`;
    });

    // Volume
    reg.register(MUSICLY_ACTIONS.SET_VOLUME, async (params) => {
      const vol = Math.max(0, Math.min(1, params.value));
      setVolume(vol);
      return `Volume set to ${Math.round(vol * 100)} percent.`;
    });

    reg.register(MUSICLY_ACTIONS.VOLUME_UP, async () => {
      handleVolumeUp();
      return 'Volume up.';
    });

    reg.register(MUSICLY_ACTIONS.VOLUME_DOWN, async () => {
      handleVolumeDown();
      return 'Volume down.';
    });

    reg.register(MUSICLY_ACTIONS.MUTE, async () => {
      if (volumeRef.current > 0) {
        prevVolumeRef.current = volumeRef.current;
        setVolume(0);
      }
      return 'Muted.';
    });

    reg.register(MUSICLY_ACTIONS.UNMUTE, async () => {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.85;
      setVolume(restored);
      return `Unmuted to ${Math.round(restored * 100)} percent.`;
    });

    // Shuffle & Repeat
    reg.register(MUSICLY_ACTIONS.TOGGLE_SHUFFLE, async (params) => {
      if (params.value !== undefined) {
        setIsShuffle(params.value);
        return params.value ? 'Shuffle on.' : 'Shuffle off.';
      }
      setIsShuffle(prev => {
        const next = !prev;
        return next;
      });
      return isShuffleRef.current ? 'Shuffle off.' : 'Shuffle on.';
    });

    reg.register(MUSICLY_ACTIONS.TOGGLE_REPEAT, async (params) => {
      if (params.mode) {
        setRepeatMode(params.mode);
        return `Repeat set to ${params.mode}.`;
      }
      handleToggleRepeat();
      return 'Toggled repeat.';
    });

    // Likes
    reg.register(MUSICLY_ACTIONS.LIKE, async () => {
      const trackId = currentTrackRef.current?.id;
      if (trackId && !favoritesRef.current.includes(trackId)) {
        handleToggleFavorite(trackId);
      }
      return 'Added to favorites.';
    });

    reg.register(MUSICLY_ACTIONS.UNLIKE, async () => {
      const trackId = currentTrackRef.current?.id;
      if (trackId && favoritesRef.current.includes(trackId)) {
        handleToggleFavorite(trackId);
      }
      return 'Removed from favorites.';
    });

    // Search & Play
    reg.register(MUSICLY_ACTIONS.SEARCH, async (params) => {
      setIsDrawerSearchMode(true);
      setIsDrawerOpen(true);
      return params.query ? `Searching for ${params.query}.` : 'Search opened.';
    });

    const playTrackHandler = async (params) => {
      const track = params.track || params.targetTrack;
      if (track) {
        handleSelectTrack(track, true);
        return `Playing ${track.title}.`;
      }
      return "Couldn't find that track in Musicly.";
    };

    reg.register(MUSICLY_ACTIONS.PLAY_SEARCH_RESULT, playTrackHandler);
    reg.register(MUSICLY_ACTIONS.PLAY_SPECIFIC_SONG, playTrackHandler);

    // Scenes & Ambience
    reg.register(MUSICLY_ACTIONS.CHANGE_SCENE, async (params) => {
      let targetScene = params.scene;
      if (!targetScene && params.sceneId) {
        targetScene = allScenes.find(s => s.id === params.sceneId || s.name?.toLowerCase().includes(params.sceneId.toLowerCase()));
      }
      if (!targetScene && params.sceneName) {
        targetScene = allScenes.find(s => s.name?.toLowerCase().includes(params.sceneName.toLowerCase()));
      }

      if (targetScene) {
        handleSelectScene(targetScene);
        return `Switched to ${targetScene.name || 'scene'}.`;
      }
      return 'Scene not found.';
    });

    reg.register(MUSICLY_ACTIONS.NEXT_SCENE, async () => {
      handleNextScene();
      return 'Next scene.';
    });

    reg.register(MUSICLY_ACTIONS.OPEN_SCENE_SELECTOR, async () => {
      setIsSceneOpen(true);
      return 'Scenes opened.';
    });

    const toggleAmbienceHandler = async (params = {}) => {
      if (params.value === false) {
        handleResetAmbient();
        return 'Ambience turned off.';
      } else if (params.value === true) {
        const defaultSounds = { rain: 0.25, fire: 0.15 };
        setAmbientVolumes(prev => ({ ...prev, ...defaultSounds }));
        ambientEngine.setVolume('rain', 0.25);
        ambientEngine.setVolume('fire', 0.15);
        return 'Ambience turned on.';
      }
      // Toggle
      const currentCount = Object.values(ambientVolumesRef.current || {}).filter(v => v > 0).length;
      if (currentCount > 0) {
        handleResetAmbient();
        return 'Ambience off.';
      } else {
        const defaultSounds = { rain: 0.25, fire: 0.15 };
        setAmbientVolumes(prev => ({ ...prev, ...defaultSounds }));
        ambientEngine.setVolume('rain', 0.25);
        ambientEngine.setVolume('fire', 0.15);
        return 'Ambience on.';
      }
    };

    reg.register(MUSICLY_ACTIONS.TOGGLE_AMBIENCE, toggleAmbienceHandler);
    reg.register(MUSICLY_ACTIONS.AMBIENCE_ON, async () => toggleAmbienceHandler({ value: true }));
    reg.register(MUSICLY_ACTIONS.AMBIENCE_OFF, async () => toggleAmbienceHandler({ value: false }));

    // Navigation & Modals
    reg.register(MUSICLY_ACTIONS.OPEN_LIBRARY, async () => {
      handleOpenLibrary();
      return 'Opening your library.';
    });

    reg.register(MUSICLY_ACTIONS.OPEN_HOME, async () => {
      handleGoHome();
      return 'Navigated home.';
    });

    reg.register(MUSICLY_ACTIONS.OPEN_SETTINGS, async () => {
      setIsShortcutsOpen(true);
      return 'Settings opened.';
    });

    reg.register(MUSICLY_ACTIONS.OPEN_FEEDBACK, async () => {
      setIsFeedbackOpen(true);
      return 'Opening feedback.';
    });

    reg.register(MUSICLY_ACTIONS.OPEN_COFFEE, async () => {
      setIsCoffeeOpen(true);
      return 'Opening Buy Me a Coffee.';
    });

    reg.register(MUSICLY_ACTIONS.REQUEST_SONG, async () => {
      if (!user || user.isAnonymous) {
        setIsAuthOpen(true);
      } else {
        setIsSongRequestOpen(true);
      }
      return 'Opening song requests.';
    });

    reg.register(MUSICLY_ACTIONS.ADD_TO_PLAYLIST, async () => {
      const track = currentTrackRef.current;
      if (track) {
        handleToggleFavorite(track.id);
        return `Added ${track.title} to your library.`;
      }
      return 'No song currently playing.';
    });

    // Auth
    reg.register(MUSICLY_ACTIONS.AUTH_SIGN_IN, async () => {
      setIsAuthOpen(true);
      return 'Opening sign in.';
    });

    reg.register(MUSICLY_ACTIONS.AUTH_SIGN_OUT, async () => {
      handleLogout();
      return 'Signed out.';
    });

    // Admin Commands
    reg.register(MUSICLY_ACTIONS.ADMIN_OPEN_DASHBOARD, async () => {
      setIsAdminDashboardOpen(true);
      return 'Admin dashboard opened.';
    });

    reg.register(MUSICLY_ACTIONS.ADMIN_SHOW_FEEDBACK, async () => {
      setIsAdminDashboardOpen(true);
      return 'Showing feedback in dashboard.';
    });

    reg.register(MUSICLY_ACTIONS.ADMIN_SHOW_AIR_AI, async () => {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin/air-ai');
        setCurrentRoute('/admin/air-ai');
      }
      return 'Opening Air AI dashboard.';
    });

    reg.register(MUSICLY_ACTIONS.ADMIN_SHOW_REQUESTS, async () => {
      setIsAdminDashboardOpen(true);
      return 'Showing song requests.';
    });

  }, [
    voiceManager,
    allTracks,
    allScenes,
    currentScene,
    selectedGenre,
    user,
    isAdmin,
    duration,
    togglePlay,
    handleNextTrack,
    handlePrevTrack,
    handleSeek,
    handleVolumeUp,
    handleVolumeDown,
    handleToggleRepeat,
    handleToggleFavorite,
    handleSelectTrack,
    handleSelectScene,
    handleNextScene,
    handleResetAmbient,
    handleOpenLibrary,
    handleGoHome,
    handleLogout
  ]);

  // Add custom track & persist permanently in IndexedDB
  const handleAddCustomTrack = async (newTrack, fileBlob) => {
    // Prevent adding if identical track or URL already exists
    const duplicate = findDuplicateTrack(newTrack, allTracks);
    if (duplicate) {
      console.warn("Duplicate track rejected (already present):", duplicate.title);
      return;
    }

    let cleanGenres = Array.isArray(newTrack.genres)
      ? newTrack.genres.filter(g => g && g.toLowerCase() !== 'custom')
      : [];
    if (cleanGenres.length === 0 && newTrack.genre && newTrack.genre.toLowerCase() !== 'custom') {
      cleanGenres = newTrack.genre.split(',').map(s => s.trim()).filter(g => g && g.toLowerCase() !== 'custom');
    }
    if (cleanGenres.length === 0) cleanGenres = ['Lo-Fi'];
    const cleanGenre = cleanGenres.join(', ');

    const userTrack = {
      ...newTrack,
      genres: cleanGenres,
      genre: cleanGenre,
      userId: (user && !user.isAnonymous) ? user.uid : 'guest',
      userEmail: user?.email || null
    };

    // 1. Instantly update React state so the track appears in the UI with 0ms delay!
    setCustomTracks(prev => [userTrack, ...prev.filter(t => t.id !== userTrack.id)]);

    // 2. Persist to storage in background
    try {
      await saveTrackToDB(userTrack, fileBlob, user);
    } catch (err) {
      console.warn("Storage persistence notice:", err);
    }

    // If already playing a song, keep current song playing uninterrupted!
    // If not playing, switch to new song and start playing in its section.
    if (!isPlaying) {
      const targetSection = cleanGenres[0] || 'All';
      setSelectedGenre(targetSection);
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setDuration(userTrack.duration || 180);
      setCurrentTrackId(userTrack.id);
      setIsPlaying(true);
    }
  };

  // 🔒 ADMIN ONLY: Publish song to Musicly Public Library
  const handlePublishPublicTrack = async (trackPayload, audioBlob) => {
    try {
      const newTrack = await publishPublicTrack(trackPayload, audioBlob, user);
      setPublicTracks(prev => [newTrack, ...prev.filter(t => t.id !== newTrack.id)]);
      return newTrack;
    } catch (err) {
      console.error("Publish public track error:", err);
      throw err;
    }
  };

  // 🔒 ADMIN ONLY: Update public track metadata
  const handleUpdatePublicTrack = async (trackId, updates) => {
    try {
      const updated = await updatePublicTrack(trackId, updates, user);
      setPublicTracks(prev => prev.map(t => t.id === trackId ? updated : t));
      return updated;
    } catch (err) {
      console.error("Update public track error:", err);
      throw err;
    }
  };

  // 🔒 ADMIN ONLY: Delete song from Musicly Public Library
  const handleDeletePublicTrack = async (trackId) => {
    try {
      await deletePublicTrack(trackId, user);
      setPublicTracks(prev => prev.filter(t => t.id !== trackId));
      setDeletedTrackIds(prev => prev.includes(trackId) ? prev : [...prev, trackId]);
      if (currentTrackId === trackId) {
        const remaining = allTracks.filter(t => t.id !== trackId);
        if (remaining.length > 0) {
          setCurrentTrackId(remaining[0].id);
        }
      }
      return true;
    } catch (err) {
      console.error("Delete public track error:", err);
      throw err;
    }
  };

  // 🔒 ADMIN ONLY: Add official room theme / scene to public catalog
  const handleAddScene = async (sceneData) => {
    try {
      const newScene = await publishPublicScene(sceneData, user);
      setCustomScenes(prev => [newScene, ...prev.filter(s => s.id !== newScene.id)]);
      return newScene;
    } catch (err) {
      console.error("Publish room theme error:", err);
      throw err;
    }
  };

  // 🔒 ADMIN ONLY: Delete room theme / scene
  const handleDeleteScene = async (sceneId) => {
    try {
      await deletePublicScene(sceneId, user);
      setCustomScenes(prev => prev.filter(s => s.id !== sceneId));
      if (currentScene?.id === sceneId) {
        setCurrentScene(SCENES[0]);
        setBackdropImage(SCENES[0].image);
      }
      return true;
    } catch (err) {
      console.error("Delete room theme error:", err);
      throw err;
    }
  };

  // Delete any track (custom or default) from library permanently
  const handleDeleteTrack = async (trackId) => {
    // 1. Immediately remove from active React state
    setCustomTracks(prev => prev.filter(t => t.id !== trackId));
    setDeletedTrackIds(prev => prev.includes(trackId) ? prev : [...prev, trackId]);
    setFavorites(prev => prev.filter(id => id !== trackId));

    if (currentTrack?.id === trackId) {
      const remaining = allTracks.filter(t => t.id !== trackId);
      if (remaining.length > 0) {
        setCurrentTrackId(remaining[0].id);
      }
      setCurrentTime(0);
      currentTimeRef.current = 0;
    }

    // 2. Persist deletion in IndexedDB, LocalStorage & Firestore
    try {
      await deleteTrackFromDB(trackId, user);
    } catch (err) {
      console.warn("Storage deletion notice:", err);
    }
  };

  // Update sections/genres for any track whenever the user desires
  const handleUpdateTrackGenres = async (trackId, newGenres) => {
    const cleanList = Array.isArray(newGenres) && newGenres.length > 0 ? newGenres : ['Lo-Fi'];
    const cleanGenre = cleanList.join(', ');

    // 1. Update genreOverrides state & persist
    setGenreOverrides(prev => ({
      ...prev,
      [trackId]: cleanList
    }));

    // 2. If it's an uploaded/downloaded track in IndexedDB, update permanent storage
    const isCustom = customTracks.some(t => t.id === trackId);
    if (isCustom) {
      await updateTrackGenresInDB(trackId, cleanList, user);
      setCustomTracks(prev => prev.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            genres: cleanList,
            genre: cleanGenre
          };
        }
        return t;
      }));
    }
  };

  // Restore all original default tracks if user deleted any
  const handleRestoreDefaultTracks = () => {
    setDeletedTrackIds([]);
  };

  // Download YouTube or custom/library track to device & store in IndexedDB for 100% offline playback
  const handleDownloadTrack = async (track) => {
    if (!track) return;
    if (!user || user.isAnonymous) {
      setToastMessage('Please sign in to your Musicly account to download songs.');
      setShowToast(true);
      setIsAuthOpen(true);
      return;
    }
    const ytId = track.youtubeId || extractYouTubeId(track.audioUrl);
    try {
      let audioBlob = track.blob || null;

      // 1. If track already has a direct playable URL, attempt to fetch authentic audio blob
      if (!audioBlob && track.audioUrl) {
        const url = track.audioUrl;
        if (url.startsWith('blob:') || url.startsWith('data:') || (isDirectPlayableAudio(url) && !url.includes('youtube.com'))) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const fetchedBlob = await res.blob();
              if (fetchedBlob && fetchedBlob.size > 1000) {
                audioBlob = fetchedBlob;
              }
            }
          } catch (fetchErr) {
            // CORS or network error, fallback to ultra-fast generator
          }
        }
      }

      // 2. If not fetched directly, generate high-fidelity offline audio for this track
      if (!audioBlob) {
        audioBlob = await downloadYouTubeAudio(
          ytId, 
          track.title, 
          track.genre || (Array.isArray(track.genres) ? track.genres[0] : 'Lo-Fi'), 
          track.duration || 180
        );
      }

      // 3. Save directly into the "musicly songs" folder (auto-created with zero Save As dialogs)
      const safeTitle = (track.title || 'Track').replace(/[\\/:*?"<>|]/g, '_');
      const safeArtist = (track.artist || 'Musicly').replace(/[\\/:*?"<>|]/g, '_');
      const ext = (audioBlob.type && audioBlob.type.includes('wav')) ? 'wav' : 'mp3';
      const saveResult = await saveTrackToMusiclyFolder(audioBlob, `${safeTitle} - ${safeArtist}.${ext}`);
      if (saveResult && saveResult.cancelled) {
        return;
      }

      // 4. Save into IndexedDB so it's also 100% available in the Offline Library tab
      const blobUrl = URL.createObjectURL(audioBlob);
      const updatedTrack = {
        ...track,
        audioUrl: blobUrl,
        blob: audioBlob,
        hasOfflineAudio: true,
        isOfflineDownloaded: true,
        isCustom: true
      };

      await saveTrackToDB(updatedTrack, audioBlob, user);
      
      setCustomTracks(prev => {
        const exists = prev.some(t => t.id === track.id);
        if (exists) {
          return prev.map(t => t.id === track.id ? updatedTrack : t);
        } else {
          return [updatedTrack, ...prev];
        }
      });

      playTingSound();
    } catch (err) {
      console.warn("Download track notice:", err);
    }
  };

  // Play a song directly from an interactive poster card & save permanently to user library
  const handlePlayPosterTrack = async (trackData) => {
    const trackGenre = trackData.genre || 'Retro';
    const trackTitle = trackData.title || trackData.name || 'Song';
    const trackId = trackData.id || ('poster-' + (trackData.youtubeId || trackTitle.toLowerCase().replace(/\s+/g, '-')));
    const posterTrack = {
      id: trackId,
      title: trackTitle,
      name: trackTitle,
      artist: trackData.artist || 'Featured Artist',
      genre: trackGenre,
      genres: [trackGenre],
      duration: trackData.duration || 240,
      cover: trackData.cover || (trackData.youtubeId 
        ? `https://img.youtube.com/vi/${trackData.youtubeId}/hqdefault.jpg` 
        : '/assets/images/cozy_bedroom.jpg'),
      isYouTube: !!trackData.youtubeId,
      youtubeId: trackData.youtubeId || null,
      audioUrl: trackData.audioUrl || (trackData.youtubeId ? `https://www.youtube.com/watch?v=${trackData.youtubeId}` : ''),
      isCustom: true,
      userId: (user && !user.isAnonymous) ? user.uid : 'guest',
      userEmail: user?.email || null
    };

    // Save permanently in storage under user account
    await saveTrackToDB(posterTrack, null, user);

    // Add to track list so it can be controlled in player
    setCustomTracks(prev => {
      if (prev.some(t => t.id === posterTrack.id)) return prev;
      return [posterTrack, ...prev];
    });

    // Switch and immediately play the song
    if (trackGenre !== 'Lo-Fi' && trackGenre !== selectedGenre) {
      setSelectedGenre(trackGenre);
    }
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(posterTrack.duration);
    setCurrentTrackId(posterTrack.id);
    setIsPlaying(true);
  };

  const isRetroScene = backdropImage?.includes('retro_scene');

  return (
    <main className={`app-viewport ${isRetroScene ? 'scene-is-retro' : ''}`}>
      {/* Background Wallpaper Image with Smooth Zoom, Brightness & Crossfade Animation */}
      <div 
        className={`scene-backdrop-layer ${isTransitioning ? 'transitioning' : ''} ${backdropImage?.includes('cozy_bedroom') ? 'cozy-backdrop' : ''} ${backdropImage?.includes('peace_scene') ? 'peace-backdrop' : ''} ${backdropImage?.includes('retro_scene') ? 'retro-backdrop' : ''} ${backdropImage?.includes('lofi_scene') ? 'lofi-backdrop' : ''} ${backdropImage?.includes('chill_sleep_scene') ? 'chill-backdrop' : ''} ${backdropImage?.includes('ghazals_bg') ? 'ghazal-backdrop' : ''}`}
        style={{ 
          backgroundImage: `url(${backdropImage})`,
          filter: `brightness(${roomBrightness}) saturate(${roomBrightness < 0.6 ? 0.88 : 1.0})`
        }}
      />

      {/* Dim & Lighting Overlay with dynamic room brightness attenuation */}
      <div 
        className="scene-dim-overlay"
        style={{ opacity: Math.max(0.1, overlayOpacity + (1 - roomBrightness) * 0.35) }}
      />

      {/* Ambient Vignette Overlay */}
      <div className="ambient-glow-layer" />

      {/* 🌠 Interactive Shooting Star Sky (Flyout on hover & click) */}
      <ShootingStarSky activeBackdrop={backdropImage} />

      {/* Interactive Room Posters & Wallpaper Hotspots */}
      <InteractiveBackdropHotspots 
        activeBackdrop={backdropImage} 
        currentScene={currentScene}
        onPlayTrack={handlePlayPosterTrack}
        roomBrightness={roomBrightness}
        onSetRoomBrightness={setRoomBrightness}
        onToggleLamp={handleToggleLamp}
      />

      {/* 📺 Retro TV Monitor Display (Song artwork & retro CRT screen) */}
      <RetroTVMonitor
        activeBackdrop={backdropImage}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
      />

      {/* 🎵 Lo-Fi Turntable Experience & "Slow Down" Hotspot */}
      <LofiTurntableHotspot
        activeBackdrop={backdropImage}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={handlePlayPosterTrack}
        onTogglePlay={togglePlay}
        onSelectTrack={(track) => {
          setCurrentTime(0);
          currentTimeRef.current = 0;
          setCurrentTrackId(track.id);
          setIsPlaying(true);
        }}
      />

      {/* 🚪 Castle Gate "Knock, knock, knock on heaven's door" Hotspot */}
      <HeavensDoorHotspot
        activeBackdrop={backdropImage}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={handlePlayPosterTrack}
        onTogglePlay={togglePlay}
        onSelectTrack={(track) => {
          setCurrentTime(0);
          currentTimeRef.current = 0;
          setCurrentTrackId(track.id);
          setIsPlaying(true);
        }}
      />

      {/* 🪐 Choose Your Vibe 3D Glass Cylindrical Scene */}
      <ChooseYourVibeScene
        currentScene={currentScene}
        onClose={() => {
          const bedroomScene = SCENES.find(s => s.id === 'cozy_bedroom') || SCENES[0];
          setCurrentScene(bedroomScene);
          setBackdropImage(bedroomScene.image);
        }}
        onSelectGenre={handleSelectGenre}
        selectedLanguage={selectedLanguage}
        selectedLanguages={selectedLanguages}
        onSelectLanguage={handleSelectLanguage}
        onPlayTrackForGenre={(genre) => {
          const lowerSelected = (selectedLanguages && selectedLanguages.length > 0)
            ? selectedLanguages.map(l => l.toLowerCase())
            : null;
          const match = allTracks.find(t => {
            const matchesGenre = Array.isArray(t.genres)
              ? t.genres.some(g => g.toLowerCase() === genre.toLowerCase())
              : (t.genre || '').toLowerCase().includes(genre.toLowerCase());
            if (!matchesGenre) return false;
            if (!lowerSelected) return true;
            const tLang = (t.language || 'English').toLowerCase();
            return lowerSelected.includes(tLang);
          }) || allTracks.find(t => {
            if (Array.isArray(t.genres)) {
              return t.genres.some(g => g.toLowerCase() === genre.toLowerCase());
            }
            return (t.genre || '').toLowerCase().includes(genre.toLowerCase());
          });
          if (match) {
            setCurrentTime(0);
            currentTimeRef.current = 0;
            setCurrentTrackId(match.id);
            setIsPlaying(true);
          }
        }}
        onSelectTrack={(track) => {
          if (currentTrackId === track.id) {
            setIsPlaying(prev => !prev);
          } else {
            setCurrentTime(0);
            currentTimeRef.current = 0;
            setCurrentTrackId(track.id);
            setIsPlaying(true);
          }
        }}
        onTogglePlay={togglePlay}
        tracks={allTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        roomBrightness={roomBrightness}
        onOpenSceneModal={() => setIsSceneOpen(true)}
        onOpenAmbient={() => {
          if (!user || user.isAnonymous) {
            setIsAuthOpen(true);
          } else {
            setIsAmbientOpen(true);
          }
        }}
        activeAmbientCount={activeAmbientCount}
        onOpenCoffeeModal={() => setIsCoffeeOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        user={user}
        isAdmin={isAdmin}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onLogout={handleLogout}
        favorites={favorites}
        customTracks={customTracks}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        audioElement={audioRef.current}
      />

      {/* 🌌 AFTERGLOW Immersive Editorial Cinematic Scene (9-Panel Continuous Scroll Film) */}
      {currentScene?.id === 'afterglow' && (
        afterglowMode === 'classic' ? (
          <AfterglowScene
            currentScene={currentScene}
            onClose={() => {
              const bedroomScene = SCENES.find(s => s.id === 'cozy_bedroom') || SCENES[0];
              setCurrentScene(bedroomScene);
              setBackdropImage(bedroomScene.image);
            }}
            currentTrack={currentTrack}
            allTracks={allTracks}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            onSeek={handleSeek}
            onTogglePlay={togglePlay}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            onOpenSceneModal={() => setIsSceneOpen(true)}
            onOpenAmbient={() => setIsAmbientOpen(true)}
            activeAmbientCount={activeAmbientCount}
            audioElement={audioRef.current}
            isShuffle={isShuffle}
            onToggleShuffle={() => setIsShuffle(!isShuffle)}
            repeatMode={repeatMode}
            onToggleRepeat={handleToggleRepeat}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectTrack={(track, shouldPlay) => {
              if (!track) return;
              setCurrentTrackId(track.id);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              if (shouldPlay !== undefined) {
                setIsPlaying(shouldPlay);
              }
            }}
            onOpenPlaylistDrawer={() => {
              setIsDrawerSearchMode(false);
              setIsDrawerOpen(true);
            }}
            onOpenSearch={() => {
              setIsDrawerSearchMode(true);
              setIsDrawerOpen(true);
            }}
            onOpenAuthModal={() => setIsAuthOpen(true)}
            user={user}
          />
        ) : (
          <AfterglowCinematicFilm
            allTracks={allTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            onSeek={handleSeek}
            onTogglePlay={togglePlay}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            onSelectTrack={(track, shouldPlay) => {
              if (!track) return;
              setCurrentTrackId(track.id);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              if (shouldPlay !== undefined) {
                setIsPlaying(shouldPlay);
              }
            }}
            onOpenSceneModal={() => setIsSceneOpen(true)}
            onOpenPlaylistDrawer={() => {
              setIsDrawerSearchMode(false);
              setIsDrawerOpen(true);
            }}
            onOpenSearch={() => {
              setIsDrawerSearchMode(true);
              setIsDrawerOpen(true);
            }}
            onOpenAmbient={() => setIsAmbientOpen(true)}
            activeAmbientCount={activeAmbientCount}
            onOpenAuthModal={() => setIsAuthOpen(true)}
            user={user}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenClassic={() => setAfterglowMode('classic')}
            onClose={() => {
              const bedroomScene = SCENES.find(s => s.id === 'cozy_bedroom') || SCENES[0];
              setCurrentScene(bedroomScene);
              setBackdropImage(bedroomScene.image);
            }}
            audioElement={audioRef.current}
            selectedLanguage={selectedLanguages}
          />
        )
      )}

      {/* 🏛️ MINIMAL Modern Architectural Studio Scene */}
      {currentScene?.id === 'minimal_studio' && (
        <MinimalStudioScene
          currentScene={currentScene}
          allTracks={allTracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onVolumeChange={setVolume}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onSelectTrack={(track, shouldPlay) => {
            if (!track) return;
            setCurrentTrackId(track.id);
            setCurrentTime(0);
            currentTimeRef.current = 0;
            if (shouldPlay !== undefined) {
              setIsPlaying(shouldPlay);
            }
          }}
          onOpenSceneModal={() => setIsSceneOpen(true)}
          onOpenPlaylistDrawer={() => {
            setIsDrawerSearchMode(false);
            setIsDrawerOpen(true);
          }}
          onOpenSearch={() => {
            setIsDrawerSearchMode(true);
            setIsDrawerOpen(true);
          }}
          onOpenAmbient={() => setIsAmbientOpen(true)}
          activeAmbientCount={activeAmbientCount}
          onOpenAuthModal={() => setIsAuthOpen(true)}
          user={user}
          isAdmin={isAdmin}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => {
            const bedroomScene = SCENES.find(s => s.id === 'cozy_bedroom') || SCENES[0];
            setCurrentScene(bedroomScene);
            setBackdropImage(bedroomScene.image);
          }}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
          selectedLanguage={selectedLanguage}
          selectedLanguages={selectedLanguages}
          onSelectLanguage={handleSelectLanguage}
          audioElement={audioRef.current}
        />
      )}

      {/* Application UI Shell */}
      <div className={`app-content-shell ${currentScene?.id === 'vibe_carousel' ? 'vibe-scene-active-shell' : ''} ${currentScene?.id === 'afterglow' ? 'afterglow-scene-active-shell' : ''} ${currentScene?.id === 'minimal_studio' ? 'minimal-scene-active-shell' : ''}`}>
        {/* Top Navigation Bar */}
        <TopBar
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
          selectedLanguage={selectedLanguages}
          onOpenAmbient={() => setIsAmbientOpen(true)}
          activeAmbientCount={activeAmbientCount}
          onOpenSceneModal={() => setIsSceneOpen(true)}
          onOpenAuthModal={() => setIsAuthOpen(true)}
          isAirControlsActive={isAirControlsEnabled}
          onOpenAirControls={handleAirIconClick}
          onOpenUploadModal={() => {
            if (!user || user.isAnonymous) {
              setIsAuthOpen(true);
            } else {
              setIsUploadOpen(true);
            }
          }}
          onOpenCoffeeModal={() => setIsCoffeeOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
          user={user}
          isAdmin={isAdmin}
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          onLogout={handleLogout}
          roomBrightness={roomBrightness}
          onSetRoomBrightness={setRoomBrightness}
          onToggleLamp={handleToggleLamp}
          voiceManager={voiceManager}
        />

        {/* Bottom Floating Music Player Bar */}
        <Player
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          isFavorite={favorites.includes(currentTrack?.id)}
          onToggleFavorite={() => handleToggleFavorite(currentTrack?.id)}
          onTogglePlaylistDrawer={() => {
            setIsDrawerSearchMode(false);
            setIsDrawerOpen(!isDrawerOpen);
          }}
          isDrawerOpen={isDrawerOpen}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={setVolume}
          onOpenCoffeeModal={() => setIsCoffeeOpen(true)}
          isCoffeeOpen={isCoffeeOpen}
          isAdmin={isAdmin}
          onOpenFeedbackModal={() => setIsFeedbackOpen(true)}
          audioElement={audioRef.current}
          onDownloadTrack={handleDownloadTrack}
          user={user}
          onOpenAuthModal={() => setIsAuthOpen(true)}
        />
      </div>

      {/* 📜 Music Library & Search Floating Modal Overlay */}
      {isDrawerOpen && (
        <div 
          className="playlist-drawer-backdrop modal-overlay"
          onClick={() => setIsDrawerOpen(false)}
        >
          <PlaylistDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            tracks={allTracks}
            user={user}
            isAdmin={isAdmin}
            onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
            selectedLanguage={selectedLanguage}
            selectedLanguages={selectedLanguages}
            onSelectLanguage={handleSelectLanguage}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={(track) => {
              if (track.genre !== 'Chill/Sleep') {
                const isSleepProfileActive = 
                  Math.abs((ambientVolumes.rain || 0) - 0.20) < 0.05 &&
                  Math.abs((ambientVolumes.bugs || 0) - 0.45) < 0.05;
                if (isSleepProfileActive) {
                  handleResetAmbient();
                }
              }
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setCurrentTrackId(track.id);
              setIsPlaying(true);
            }}
            onTogglePlay={togglePlay}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenUpload={() => {
              if (!user || user.isAnonymous) {
                setIsDrawerOpen(false);
                setIsAuthOpen(true);
                return;
              }
              setIsDrawerOpen(false);
              setIsUploadOpen(true);
            }}
            onOpenSongRequest={() => {
              if (!user || user.isAnonymous) {
                setIsDrawerOpen(false);
                setIsAuthOpen(true);
                return;
              }
              setIsDrawerOpen(false);
              setIsSongRequestOpen(true);
            }}
            onDeleteTrack={handleDeleteTrack}
            deletedCount={deletedTrackIds.length}
            onRestoreDefaultTracks={handleRestoreDefaultTracks}
            onUpdateTrackGenres={handleUpdateTrackGenres}
            onDownloadTrack={handleDownloadTrack}
            onOpenAuthModal={() => {
              setIsDrawerOpen(false);
              setIsAuthOpen(true);
            }}
            autoFocusSearch={isDrawerSearchMode}
          />
        </div>
      )}

      {/* Ambient Sounds Mixer Modal */}
      <AmbientMixer
        isOpen={isAmbientOpen}
        onClose={() => setIsAmbientOpen(false)}
        ambientVolumes={ambientVolumes}
        onVolumeChange={handleAmbientVolumeChange}
        onResetAll={handleResetAmbient}
      />

      {/* Google Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenCoffeeModal={() => setIsCoffeeOpen(true)}
        backdropImage={backdropImage}
        onUserLogin={(loggedInUser) => {
          setUser(loggedInUser);
          const adm = checkIsAdmin(loggedInUser);
          setIsAdmin(adm);
          if (loggedInUser && !loggedInUser.isAnonymous) {
            syncUserProfile(loggedInUser).then(({ isAdmin: syncdAdm }) => {
              setIsAdmin(syncdAdm);
            });
            const instant = loadFromLocalCache(loggedInUser.uid, loggedInUser.email);
            if (instant && instant.length > 0) {
              setCustomTracks(instant);
            }
          }
        }}
      />

      {/* Room Themes & Backdrops Modal */}
      <SceneSelector
        isOpen={isSceneOpen}
        onClose={() => setIsSceneOpen(false)}
        currentScene={currentScene}
        onSelectScene={handleSelectScene}
        overlayOpacity={overlayOpacity}
        onChangeOpacity={setOverlayOpacity}
        scenes={allScenes}
      />

      {/* Custom Music Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddCustomTrack={handleAddCustomTrack}
        currentGenre={selectedGenre}
        existingTracks={allTracks}
      />

      {/* ☕ Buy Me a Coffee Support Modal / Admin Received Coffee Ledger */}
      <CoffeeSupportModal
        isOpen={isCoffeeOpen}
        onClose={() => setIsCoffeeOpen(false)}
        isAdmin={isAdmin}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenAboutUs={() => {
          setIsCoffeeOpen(false);
          navigateTo('/about-us');
        }}
      />

      {/* 💬 Listener Feedback / Review Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen && !isAdminDashboardOpen}
        onClose={handleCloseFeedback}
        user={user}
        backdropImage={backdropImage}
      />

      {/* 🎵 Song Request Modal */}
      <SongRequestModal
        isOpen={isSongRequestOpen}
        onClose={() => setIsSongRequestOpen(false)}
        user={user}
      />

      {/* ☁️ Floating Aesthetic Cloud on Left Space (Appears when Coffee modal is open) */}
      <FloatingFeedbackNote
        isOpen={isCoffeeOpen && !isAdminDashboardOpen}
        onOpenFeedback={() => {
          setIsCoffeeOpen(false);
          if (!isAdminDashboardOpen) {
            setIsFeedbackOpen(true);
          }
        }}
        isFeedbackOpen={isFeedbackOpen}
      />

      {/* 👑 Admin Dashboard for Musicly Public Library & Themes */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        user={user}
        isAdmin={isAdmin}
        publicTracks={publicTracks}
        onPublishTrack={handlePublishPublicTrack}
        onUpdateTrack={handleUpdatePublicTrack}
        onDeleteTrack={handleDeletePublicTrack}
        onPlayTrack={(track) => {
          if (currentTrackId === track.id) {
            setIsPlaying(prev => !prev);
          } else {
            setCurrentTime(0);
            currentTimeRef.current = 0;
            setCurrentTrackId(track.id);
            setIsPlaying(true);
          }
        }}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        customScenes={customScenes}
        onAddScene={handleAddScene}
        onDeleteScene={handleDeleteScene}
        onSelectScene={(sc) => {
          if (sc.id === 'afterglow') {
            setAfterglowMode('film');
          }
          setCurrentScene(sc);
          setBackdropImage(sc.image);
        }}
        onApplyWebappTheme={applyWebappTheme}
        onResetWebappTheme={resetWebappTheme}
        onOpenAirAiDashboard={() => navigateTo('/admin/air-ai')}
      />

      {/* 🌟 Ultra-Premium Animated "About us" Pill (Shown ONLY when coffee icon is clicked) */}
      {isAboutUsVisible && currentRoute !== '/about-us' && !isAdminDashboardOpen && (
        <button
          type="button"
          id="btn-bottom-left-about-us"
          className={`premium-bottom-about-us-btn ${isAboutUsExiting ? 'is-exiting' : 'is-entering'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isCoffeeOpen) setIsCoffeeOpen(false);
            navigateTo('/about-us');
          }}
          title="About us"
          aria-label="About us"
        >
          {/* 🌈 Continuous Moving Ambient Glow Halo */}
          <span className="about-us-glow-aura" aria-hidden="true" />

          {/* 💫 Continuous Revolving Neon Border Beam */}
          <span className="about-us-border-track" aria-hidden="true">
            <span className="about-us-border-spinner" />
          </span>

          {/* 🖤 Obsidian Dark Core Surface */}
          <span className="about-us-core-surface" aria-hidden="true" />

          {/* ✨ Specular Light Shimmer */}
          <span className="about-us-shimmer" aria-hidden="true" />

          {/* ✦ Typography & Hover Star Accent */}
          <span className="about-us-pill-content">
            <span className="about-us-sparkle-icon" aria-hidden="true">✦</span>
            <span>About us</span>
          </span>
        </button>
      )}

      {/* 🎬 Cinematic Editorial "ABOUT US" Experience */}
      {currentRoute === '/about-us' && (
        <AboutUsExperience
          onBack={() => navigateTo('/')}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          allTracks={allTracks}
          onPlayTrack={(track) => {
            if (currentTrackId === track.id) {
              setIsPlaying(prev => !prev);
            } else {
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setCurrentTrackId(track.id);
              setIsPlaying(true);
            }
          }}
        />
      )}

      {/* ⌘ Musicly Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        volume={volume}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isFavorite={favorites.includes(currentTrack?.id)}
        onTogglePlay={togglePlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onSeekForward={handleSeekForward}
        onSeekBackward={handleSeekBackward}
        onVolumeUp={handleVolumeUp}
        onVolumeDown={handleVolumeDown}
        onToggleMute={() => {
          if (volume > 0) {
            setVolume(0);
          } else {
            setVolume(0.85);
          }
        }}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={handleToggleRepeat}
        onToggleFavorite={() => handleToggleFavorite(currentTrack?.id)}
        onOpenSearch={handleOpenSearch}
        onOpenLibrary={handleOpenLibrary}
        onGoHome={handleGoHome}
        onOpenUpload={() => {
          if (!user || user.isAnonymous) {
            setIsAuthOpen(true);
          } else {
            setIsUploadOpen(true);
          }
        }}
        onToggleAmbient={handleToggleAmbient}
        onOpenSceneModal={() => setIsSceneOpen(true)}
        onNextScene={handleNextScene}
        onSelectScene={handleSelectScene}
        allScenes={allScenes}
        currentScene={currentScene}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        onOpenAirControls={handleAirIconClick}
        isAirControlsActive={isAirControlsEnabled}
        onOpenAirAiDashboard={() => navigateTo('/admin/air-ai')}
        onOpenDatasetCollector={() => navigateTo('/admin/air-ai/dataset')}
      />

      {/* ⌨ Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        allScenes={allScenes}
      />

      {/* ✋ Air Controls Floating Confirmation Toast */}
      <AirControlsFeedback feedback={airFeedback} />

      {/* 📹 Air Controls Floating Camera Preview - Only Enabled for Admin */}
      {isAirControlsEnabled && showAirPreview && isAdmin && (
        <AirControlsPreview
          isOpen={isAirControlsEnabled && showAirPreview && isAdmin}
          onClose={() => {
            setIsAirControlsEnabled(false);
          }}
          onOpenSettings={() => setIsAirControlsModalOpen(true)}
          isDebug={isAirDebug}
          onToggleDebug={() => setIsAirDebug(prev => !prev)}
        />
      )}

      {/* 🧊 Air Controls 8-Second Glass Box Instructions (First-Time Activation) */}
      <AirInstructionsGlassBox
        isOpen={showAirInstructions}
        onClose={() => setShowAirInstructions(false)}
        secondsRemaining={airInstructionsCountdown}
      />

      {/* ✋ Air Controls Settings & Gesture Guide Modal */}
      <AirControlsModal
        isOpen={isAirControlsModalOpen}
        onClose={() => setIsAirControlsModalOpen(false)}
        isEnabled={isAirControlsEnabled}
        onToggleEnabled={() => {
          setIsAirControlsEnabled(prev => !prev);
        }}
        showPreview={showAirPreview}
        onToggleShowPreview={setShowAirPreview}
        isDebug={isAirDebug}
        onToggleDebug={() => setIsAirDebug(prev => !prev)}
        isAdmin={isAdmin}
        onOpenAirAiDashboard={() => navigateTo('/admin/air-ai')}
        onOpenDatasetCollector={() => navigateTo('/admin/air-ai/dataset')}
      />

      {/* 📊 Musicly Air AI - Admin Model Analytics Dashboard */}
      {currentRoute === '/admin/air-ai' && (
        <AirAiAdminDashboard
          onBack={() => navigateTo('/')}
          onNavigateToCollector={() => navigateTo('/admin/air-ai/dataset')}
        />
      )}

      {/* 🎯 Musicly Air AI - Dataset Collection Tool */}
      {currentRoute === '/admin/air-ai/dataset' && (
        <AirAiDatasetCollector
          onBack={() => navigateTo('/')}
          onNavigateToDashboard={() => navigateTo('/admin/air-ai')}
        />
      )}
    </main>
  );
}
