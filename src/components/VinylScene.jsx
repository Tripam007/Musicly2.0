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
  Square,
  GripVertical,
  ListPlus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Mic2,
  Lock,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { playClickSound, playPeacefulLikeSound } from '../utils/audioSynth';
import { LANGUAGES, LANGUAGE_LABELS, isTrackInLanguages } from '../data/tracks';
import { fetchLyrics } from '../utils/lyricsService';
import { getLocalUserPlaylists, loadUserPlaylists, saveUserPlaylists } from '../utils/userPlaylistsDB';
import PixelCat from './PixelCat';
import SweatDropletsOverlay from './SweatDropletsOverlay';
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
  onOpenAboutUs = null,
  customQueue = [],
  onSetCustomQueue = null,
  activePlayingPlaylistId: propActivePlayingPlaylistId = undefined,
  onSetActivePlayingPlaylistId = null,
  publicPlaylists = [],
  onPublishPublicPlaylist = null,
  onUpdatePublicPlaylist = null,
  onDeletePublicPlaylist = null,
  isAnyModalOpen = false
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [localLanguages, setLocalLanguages] = useState([]);
  const [isLikedPanelOpen, setIsLikedPanelOpen] = useState(false);

  // Modal & Management States
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [selectedCustomPlaylist, setSelectedCustomPlaylist] = useState(null);
  const [isAddSongsToExistingOpen, setIsAddSongsToExistingOpen] = useState(false);
  const [isEditingPlaylistTitle, setIsEditingPlaylistTitle] = useState(false);
  const [editedPlaylistTitle, setEditedPlaylistTitle] = useState('');
  const [songForPlaylistModal, setSongForPlaylistModal] = useState(null);
  const [newPlaylistNameFromSong, setNewPlaylistNameFromSong] = useState('');

  // Master check: Any modal, dialog, drawer, or box is active (hides the top header bar)
  const isAnyModalActive = Boolean(
    isAnyModalOpen ||
    isAdminDashboardOpen ||
    isCreatePlaylistOpen ||
    selectedCustomPlaylist ||
    isAddSongsToExistingOpen ||
    songForPlaylistModal ||
    isLikedPanelOpen
  );

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

  // Strict language filtering helper
  const filterTracksByLang = useCallback((trackList) => {
    if (!trackList || trackList.length === 0) return [];
    if (!activeLanguages || activeLanguages.length === 0) return trackList;
    return trackList.filter(track => isTrackInLanguages(track.language, activeLanguages));
  }, [activeLanguages]);

  // Language selection toggle
  const handleLanguageToggle = useCallback((lang) => {
    if (onSelectLanguage) {
      onSelectLanguage(lang);
    } else {
      setLocalLanguages(prev => {
        if (!lang || lang === 'All') return [];
        if (prev.length === 1 && prev[0].toLowerCase() === lang.toLowerCase()) return [];
        return [lang];
      });
    }
  }, [onSelectLanguage]);

  // Playback Queue & Drag-and-Drop States
  const [carouselViewMode, setCarouselViewMode] = useState('queue');
  const [draggedCardIndex, setDraggedCardIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);

  // Persistent tracking for admin-deleted system playlists
  const [deletedPlaylistIds, setDeletedPlaylistIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicly_deleted_playlist_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Persistent tracking for admin-removed tracks from system playlists
  const [excludedTrackIdsByPlaylist, setExcludedTrackIdsByPlaylist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicly_excluded_tracks') || '{}');
    } catch {
      return {};
    }
  });

  // Persistent tracking for custom reordered sequence of tracks in any playlist (editorial or user)
  const [playlistTrackOrders, setPlaylistTrackOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('musicly_playlist_track_orders') || '{}');
    } catch {
      return {};
    }
  });

  // Reorder helper that applies saved custom track sequences to any playlist
  const sortTracksByCustomOrder = useCallback((playlistId, tracks) => {
    if (!tracks || tracks.length <= 1) return tracks;
    const customOrder = playlistTrackOrders[playlistId];
    if (!Array.isArray(customOrder) || customOrder.length === 0) return tracks;
    const orderMap = new Map();
    customOrder.forEach((id, idx) => orderMap.set(id, idx));
    return [...tracks].sort((a, b) => {
      const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
      const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
      return aOrder - bOrder;
    });
  }, [playlistTrackOrders]);

  // Cross-component Drag and Drop States for Queue & Playlists
  const [draggedTrackData, setDraggedTrackData] = useState(null);
  const [isQueueTabDragOver, setIsQueueTabDragOver] = useState(false);
  const [isModalQueueDropOver, setIsModalQueueDropOver] = useState(false);
  const [draggedModalTrackIndex, setDraggedModalTrackIndex] = useState(null);
  const [modalTrackDropTargetIndex, setModalTrackDropTargetIndex] = useState(null);

  // Effective Admin verification
  const effectiveIsAdmin = Boolean(
    isAdmin ||
    (user?.email && user.email.toLowerCase() === 'tripambiswas007@gmail.com') ||
    (typeof window !== 'undefined' && localStorage.getItem('musicly_user_role') === 'admin')
  );

  // Modern Clay Turntable Lyrics Mode States
  const [isLyricsViewOpen, setIsLyricsViewOpen] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef(null);

  // Derived upcoming queue: shows only the next 4 upcoming songs at a time,
  // strictly filtered by the selected language and automatically reloading as songs finish playing
  const upcomingQueue = useMemo(() => {
    if (!allTracks || allTracks.length === 0) return [];

    const pool = filterTracksByLang(allTracks);
    if (pool.length === 0) return [];

    // Prioritize user's customized playback queue if present
    const filteredCustom = filterTracksByLang(customQueue || []);
    if (filteredCustom && filteredCustom.length > 0) {
      if (filteredCustom.length >= 4) {
        return filteredCustom.slice(0, 4);
      }
      const currentIdx = pool.findIndex(t => t.id === currentTrack?.id);
      const customIds = new Set(filteredCustom.map(t => t.id));
      const after = pool.slice(currentIdx + 1).filter(t => !customIds.has(t.id) && t.id !== currentTrack?.id);
      const before = pool.slice(0, Math.max(0, currentIdx)).filter(t => !customIds.has(t.id) && t.id !== currentTrack?.id);
      const remaining = [...after, ...before];
      return [...filteredCustom, ...remaining].slice(0, 4);
    }

    const currentIdx = pool.findIndex(t => t.id === currentTrack?.id);
    if (currentIdx === -1) {
      return pool.slice(0, 4);
    }
    const after = pool.slice(currentIdx + 1);
    const before = pool.slice(0, currentIdx);
    return [...after, ...before].slice(0, 4);
  }, [customQueue, allTracks, currentTrack, filterTracksByLang]);

  // Queue reorder drag and drop handler
  const handleQueueReorder = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex === null || toIndex === null) return;
    const reordered = [...upcomingQueue];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedItem);
    if (onSetCustomQueue) {
      onSetCustomQueue(reordered);
    }
    playClickSound('toggle');
  }, [upcomingQueue, onSetCustomQueue]);

  // Remove track from queue
  const handleRemoveFromQueue = useCallback((trackId, e) => {
    e?.stopPropagation?.();
    const filtered = upcomingQueue.filter(t => t.id !== trackId);
    if (onSetCustomQueue) {
      onSetCustomQueue(filtered);
    }
    playClickSound('light');
  }, [upcomingQueue, onSetCustomQueue]);

  // Add track to queue from categories
  const handleAddToQueue = useCallback((track, e) => {
    e?.stopPropagation?.();
    if (!track) return;
    if (activeLanguages && activeLanguages.length > 0) {
      if (!isTrackInLanguages(track.language, activeLanguages)) {
        return;
      }
    }
    const alreadyIn = upcomingQueue.some(t => t.id === track.id);
    const updated = alreadyIn
      ? [...upcomingQueue.filter(t => t.id !== track.id), track]
      : [...upcomingQueue, track];
    if (onSetCustomQueue) {
      onSetCustomQueue(updated);
    }
    playPeacefulLikeSound();
  }, [upcomingQueue, onSetCustomQueue, activeLanguages]);

  // User Custom Playlists Persistence (strictly isolated to the authenticated user account or guest session)
  const [customPlaylists, setCustomPlaylists] = useState(() => getLocalUserPlaylists(user));

  // Sync user private playlists whenever user changes or cloud sync completes
  useEffect(() => {
    let isMounted = true;
    setCustomPlaylists(getLocalUserPlaylists(user));
    async function syncUserData() {
      try {
        const loaded = await loadUserPlaylists(user);
        if (isMounted && Array.isArray(loaded)) {
          setCustomPlaylists(loaded);
        }
      } catch (err) {
        console.warn("User playlists cloud sync warning:", err);
      }
    }
    syncUserData();
    return () => { isMounted = false; };
  }, [user?.uid]);



  // Form states for creating new playlist
  // Admin can choose between 'musicly' (Official Public Playlist) and 'user' (Personal Private Playlist)
  const [newPlaylistTarget, setNewPlaylistTarget] = useState('user');
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [selectedTrackIdsForNew, setSelectedTrackIdsForNew] = useState([]);
  const [songSearchQuery, setSongSearchQuery] = useState('');

  // Save custom playlists to user-scoped storage & private Firestore
  const saveCustomPlaylists = useCallback((playlists) => {
    setCustomPlaylists(playlists);
    saveUserPlaylists(playlists, user);
  }, [user]);

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

  // Create Playlist Handler (Public Official for Admin if chosen, or Private Personal)
  const handleCreatePlaylist = async (e) => {
    e?.preventDefault?.();
    if (!newPlaylistTitle.trim()) return;

    const coverImg = selectedTrackIdsForNew.length > 0
      ? (allTracks.find(t => t.id === selectedTrackIdsForNew[0])?.cover || '/assets/images/lofi_scene.jpg')
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';

    if (effectiveIsAdmin && newPlaylistTarget === 'musicly') {
      try {
        if (onPublishPublicPlaylist) {
          await onPublishPublicPlaylist({
            title: newPlaylistTitle.trim(),
            trackIds: selectedTrackIdsForNew,
            image: coverImg
          });
        }
        setIsCreatePlaylistOpen(false);
        setNewPlaylistTitle('');
        setSelectedTrackIdsForNew([]);
        playPeacefulLikeSound();
      } catch (err) {
        alert(err.message || "Failed to create public playlist");
      }
      return;
    }

    // Personal Private Playlist
    const newPlaylist = {
      id: 'playlist_' + Date.now(),
      title: newPlaylistTitle.trim(),
      trackIds: selectedTrackIdsForNew,
      image: coverImg,
      createdAt: Date.now(),
      isCustom: true,
      isMusiclyOfficial: false
    };

    const updated = [newPlaylist, ...customPlaylists];
    saveCustomPlaylists(updated);
    setIsCreatePlaylistOpen(false);
    setNewPlaylistTitle('');
    setSelectedTrackIdsForNew([]);
    playPeacefulLikeSound();
  };

  // Delete Playlist Handler
  const handleDeleteCustomPlaylist = async (playlistId) => {
    const isPublic = !selectedCustomPlaylist?.isCustom;
    const confirmMsg = isPublic
      ? 'Do you really want to delete this official Musicly playlist? This will permanently remove the entire playlist.'
      : 'Do you really want to delete this private playlist?';

    if (window.confirm(confirmMsg)) {
      if (isPublic) {
        if (!effectiveIsAdmin) {
          alert('Only verified admin can delete official Musicly playlists.');
          return;
        }
        if (onDeletePublicPlaylist) {
          try {
            await onDeletePublicPlaylist(playlistId);
          } catch (e) {
            console.warn('[Musicly] Delete public playlist error:', e);
          }
        }
        // Also persist in deletedPlaylistIds so built-in playlists stay deleted
        setDeletedPlaylistIds(prev => {
          const next = [...prev.filter(id => id !== playlistId), playlistId];
          try {
            localStorage.setItem('musicly_deleted_playlist_ids', JSON.stringify(next));
          } catch {}
          return next;
        });
      } else {
        const updated = customPlaylists.filter(p => p.id !== playlistId);
        saveCustomPlaylists(updated);
      }
      setSelectedCustomPlaylist(null);
      playClickSound('light');
    }
  };

  // Reorder Songs inside Playlist Modal via Drag and Drop
  const handlePlaylistTracksReorder = useCallback((fromIndex, toIndex) => {
    if (!selectedCustomPlaylist || fromIndex === toIndex || fromIndex === null || toIndex === null) return;
    const currentTracks = selectedCustomPlaylist.tracks || [];
    if (fromIndex < 0 || fromIndex >= currentTracks.length || toIndex < 0 || toIndex >= currentTracks.length) return;

    const reorderedTracks = [...currentTracks];
    const [movedTrack] = reorderedTracks.splice(fromIndex, 1);
    reorderedTracks.splice(toIndex, 0, movedTrack);
    const newTrackIds = reorderedTracks.map(t => t.id);

    // 1. Immediately update open modal playlist view
    setSelectedCustomPlaylist(prev => ({
      ...prev,
      tracks: reorderedTracks,
      trackIds: newTrackIds
    }));

    // 2. Persist custom sequence across restarts and tab switches
    setPlaylistTrackOrders(prev => {
      const next = { ...prev, [selectedCustomPlaylist.id]: newTrackIds };
      try {
        localStorage.setItem('musicly_playlist_track_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 3. Sync with user playlists or public playlists
    if (selectedCustomPlaylist.isCustom) {
      const updated = customPlaylists.map(p => {
        if (p.id === selectedCustomPlaylist.id) {
          return { ...p, trackIds: newTrackIds };
        }
        return p;
      });
      saveCustomPlaylists(updated);
    } else if (onUpdatePublicPlaylist) {
      onUpdatePublicPlaylist(selectedCustomPlaylist.id, { trackIds: newTrackIds });
    }
    playClickSound('toggle');
  }, [selectedCustomPlaylist, customPlaylists, saveCustomPlaylists, onUpdatePublicPlaylist]);

  // Save Renamed Playlist Title
  const handleSaveEditedTitle = async (playlistId) => {
    if (!editedPlaylistTitle.trim()) {
      setIsEditingPlaylistTitle(false);
      return;
    }
    const newTitle = editedPlaylistTitle.trim();
    const isPublic = selectedCustomPlaylist?.isMusiclyOfficial;

    if (isPublic) {
      if (!effectiveIsAdmin) {
        alert('Only verified admin can rename official Musicly playlists.');
        setIsEditingPlaylistTitle(false);
        return;
      }
      if (onUpdatePublicPlaylist) {
        await onUpdatePublicPlaylist(playlistId, { title: newTitle });
      }
      if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
        setSelectedCustomPlaylist(prev => ({ ...prev, title: newTitle }));
      }
    } else {
      const updated = customPlaylists.map(p => {
        if (p.id === playlistId) {
          return { ...p, title: newTitle };
        }
        return p;
      });
      saveCustomPlaylists(updated);
      if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
        setSelectedCustomPlaylist(prev => ({ ...prev, title: newTitle }));
      }
    }
    setIsEditingPlaylistTitle(false);
    playClickSound('light');
  };

  // Remove Song from Playlist
  const handleRemoveSongFromPlaylist = async (playlistId, trackId) => {
    const isPublic = !selectedCustomPlaylist?.isCustom;

    if (isPublic) {
      if (!effectiveIsAdmin) {
        alert('Only verified admin can edit official Musicly playlists.');
        return;
      }
      const curIds = selectedCustomPlaylist?.trackIds || selectedCustomPlaylist?.tracks?.map(t => t.id) || [];
      const newTrackIds = curIds.filter(id => id !== trackId);

      // Check if it's a Firestore/Firebase public playlist
      const isCustomPublic = Array.isArray(publicPlaylists) && publicPlaylists.some(p => p.id === playlistId);
      if (isCustomPublic && onUpdatePublicPlaylist) {
        await onUpdatePublicPlaylist(playlistId, { trackIds: newTrackIds });
      }

      // Persist in excludedTrackIdsByPlaylist map so system playlists remember removed tracks
      setExcludedTrackIdsByPlaylist(prev => {
        const next = { ...prev, [playlistId]: [...(prev[playlistId] || []), trackId] };
        try {
          localStorage.setItem('musicly_excluded_tracks', JSON.stringify(next));
        } catch {}
        return next;
      });

      setSelectedCustomPlaylist(prev => {
        if (!prev) return null;
        const newTracks = (prev.tracks || []).filter(t => t.id !== trackId);
        return {
          ...prev,
          trackIds: newTrackIds,
          tracks: newTracks,
          subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
          count: newTracks.length
        };
      });
    } else {
      const updated = customPlaylists.map(p => {
        if (p.id === playlistId) {
          return { ...p, trackIds: (p.trackIds || []).filter(id => id !== trackId) };
        }
        return p;
      });
      saveCustomPlaylists(updated);
      if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
        const newTrackIds = (selectedCustomPlaylist.trackIds || []).filter(id => id !== trackId);
        const newTracks = filterTracksByLang(allTracks.filter(t => newTrackIds.includes(t.id)));
        setSelectedCustomPlaylist(prev => ({
          ...prev,
          trackIds: newTrackIds,
          tracks: newTracks,
          subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
          count: newTracks.length
        }));
      }
    }

    setPlaylistTrackOrders(prev => {
      if (!prev[playlistId]) return prev;
      const next = { ...prev, [playlistId]: (prev[playlistId] || []).filter(id => id !== trackId) };
      try {
        localStorage.setItem('musicly_playlist_track_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    playClickSound('light');
  };

  // Toggle Song in Existing Playlist
  const handleToggleSongInExistingPlaylist = async (playlistId, trackId) => {
    const isPublic = selectedCustomPlaylist?.isMusiclyOfficial;

    if (isPublic) {
      if (!effectiveIsAdmin) {
        alert('Only verified admin can edit official Musicly playlists.');
        return;
      }
      const curIds = selectedCustomPlaylist?.trackIds || [];
      const newIds = curIds.includes(trackId)
        ? curIds.filter(id => id !== trackId)
        : [...curIds, trackId];

      if (onUpdatePublicPlaylist) {
        await onUpdatePublicPlaylist(playlistId, { trackIds: newIds });
      }
      const newTracks = filterTracksByLang(allTracks.filter(t => newIds.includes(t.id)));
      setSelectedCustomPlaylist(prev => ({
        ...prev,
        trackIds: newIds,
        tracks: newTracks,
        subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
        count: newTracks.length
      }));
    } else {
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
      saveCustomPlaylists(updated);
      if (selectedCustomPlaylist && selectedCustomPlaylist.id === playlistId) {
        const newTracks = filterTracksByLang(allTracks.filter(t => newIds.includes(t.id)));
        setSelectedCustomPlaylist(prev => ({
          ...prev,
          trackIds: newIds,
          tracks: newTracks,
          subtitle: `${newTracks.length} song${newTracks.length === 1 ? '' : 's'} in this list`,
          count: newTracks.length
        }));
      }
    }

    setPlaylistTrackOrders(prev => {
      if (!prev[playlistId]) return prev;
      const next = { ...prev, [playlistId]: (prev[playlistId] || []).filter(id => id !== trackId) };
      try {
        localStorage.setItem('musicly_playlist_track_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    playClickSound('light');
  };

  // Add or Toggle Song in a Custom Playlist from the + Button
  const handleToggleSongInCustomPlaylist = useCallback((playlistId, trackId) => {
    const target = customPlaylists.find(p => p.id === playlistId);
    if (!target) return;
    const curIds = target.trackIds || [];
    const newIds = curIds.includes(trackId)
      ? curIds.filter(id => id !== trackId)
      : [...curIds, trackId];

    const updated = customPlaylists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          trackIds: newIds,
          subtitle: `${newIds.length} song${newIds.length === 1 ? '' : 's'} in this list`,
          count: newIds.length
        };
      }
      return p;
    });
    saveCustomPlaylists(updated);
    playClickSound('light');
  }, [customPlaylists, saveCustomPlaylists]);

  // Create New Custom Playlist directly with a chosen song
  const handleCreatePlaylistWithSong = useCallback((track) => {
    if (!newPlaylistNameFromSong.trim() || !track) return;
    const newPlaylist = {
      id: `custom_${Date.now()}`,
      title: newPlaylistNameFromSong.trim(),
      subtitle: '1 song in this list',
      count: 1,
      trackIds: [track.id],
      image: track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      isCustom: true,
      isMusiclyOfficial: false,
      createdAt: new Date().toISOString()
    };
    const updated = [newPlaylist, ...customPlaylists];
    saveCustomPlaylists(updated);
    setNewPlaylistNameFromSong('');
    playPeacefulLikeSound();
  }, [newPlaylistNameFromSong, customPlaylists, saveCustomPlaylists]);

  // Filtered liked tracks for the favorites flyout panel
  const likedTracks = useMemo(() => {
    return filterTracksByLang(allTracks.filter(t => favorites.includes(t.id)));
  }, [allTracks, favorites, filterTracksByLang]);

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
  const deckStageWrapperRef = useRef(null);
  const modernLcdRef = useRef(null);
  const waveformTrackRef = useRef(null);
  const faderGrooveRef = useRef(null);

  // Modern Clay Turntable Pitch & Knob Drag States
  const [pitchValue, setPitchValue] = useState(9.661);
  const [isDraggingTopKnob, setIsDraggingTopKnob] = useState(false);
  const [isDraggingBottomKnob, setIsDraggingBottomKnob] = useState(false);

  const updatePitch = useCallback((val) => {
    const clamped = Math.max(0.001, Math.min(33.333, val));
    setPitchValue(clamped);
    if (audioElement) {
      // Subtle realistic pitch calibration from 0.88x to 1.12x (1.0x around 9.661)
      const rate = 0.88 + (clamped / 33.333) * 0.24;
      try {
        audioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
      } catch { }
    }
  }, [audioElement]);

  const handleTopKnobPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTopKnob(true);
    const startY = e.clientY;
    const startVal = pitchValue;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaY = startY - moveEvent.clientY; // upward drag increases
      const newVal = Math.max(0.001, Math.min(33.333, startVal + (deltaY * 0.08)));
      updatePitch(newVal);
    };

    const onPointerUp = () => {
      setIsDraggingTopKnob(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      playClickSound('light');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleTopKnobWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const step = e.deltaY < 0 ? 0.35 : -0.35;
    updatePitch(pitchValue + step);
  };

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
    e.stopPropagation();
    const waveformEl = e.currentTarget;
    if (!waveformEl || !safeDuration) return;
    const rect = waveformEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetSec = ratio * safeDuration;
    if (onSeek) {
      onSeek(targetSec);
    } else if (audioElement) {
      audioElement.currentTime = targetSec;
    }
    playClickSound('light');
  }, [safeDuration, audioElement, onSeek]);

  // Load lyrics when lyrics mode is opened or active song changes
  useEffect(() => {
    if (!isLyricsViewOpen || !currentTrack) return;
    let isCancelled = false;
    setIsLyricsLoading(true);

    const targetDur = (duration && duration > 0) ? duration : (currentTrack.duration || 0);

    fetchLyrics(currentTrack, targetDur)
      .then((data) => {
        if (!isCancelled) {
          setLyricsData(data);
          setIsLyricsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('[VinylScene] Failed to load lyrics:', err);
          setLyricsData({ notFound: true, title: currentTrack.title, artist: currentTrack.artist });
          setIsLyricsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isLyricsViewOpen, currentTrack, duration]);

  // Track active line index in synced lyrics with vocal anticipation
  const activeLineIndex = useMemo(() => {
    if (!lyricsData?.isSynced || !lyricsData.lines || lyricsData.lines.length === 0) return -1;
    // 150ms anticipation allows highlight to lock in synchronously with vocal onset
    const playbackTime = (currentTime || 0) + 0.15;
    let idx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (lyricsData.lines[i].time <= playbackTime) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsData, currentTime]);

  // Handle user manual scroll with auto-scroll resume timer
  const handleLyricsManualScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2800);
  }, []);

  // Smooth auto-scroll following the active synced line INSIDE the lyrics container ONLY
  // (Never calls scrollIntoView on elements, preventing page scroll hijacking)
  useEffect(() => {
    if (!isLyricsViewOpen || activeLineIndex === -1 || isUserScrollingRef.current) return;
    const activeEl = activeLineRef.current;
    const container = lyricsContainerRef.current;
    if (activeEl && container) {
      const targetScroll = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [activeLineIndex, isLyricsViewOpen]);

  // Seeking directly when tapping/clicking a lyric line
  const handleLyricLineClick = useCallback((timeSec) => {
    if (timeSec === undefined || isNaN(timeSec)) return;
    if (onSeek) {
      onSeek(timeSec);
    } else if (audioElement) {
      audioElement.currentTime = timeSec;
    }
    playClickSound('light');
  }, [onSeek, audioElement]);

  // Skin switcher callback
  const handleSkinChange = useCallback((skin) => {
    setTurntableSkin(skin);
    try {
      localStorage.setItem('musicly_turntable_skin', skin);
    } catch { }
    playClickSound('toggle');
  }, []);

  // ALT + SCROLL TURNTABLE DECK SWITCHER LISTENER
  useEffect(() => {
    const stageEl = deckStageWrapperRef.current;
    if (!stageEl) return;

    let lastSwitchTime = 0;
    const switchCooldown = 380; // ms to prevent rapid flip

    const handleWheel = (e) => {
      // Must be holding the Alt key (Option key on macOS) to switch turntable skins!
      if (!e.altKey) {
        // Alt key NOT pressed: let normal scroll happen freely!
        return;
      }

      // If user is actively dragging knobs or faders, don't switch
      if (isDraggingFader || isDraggingWaveform || isDraggingTopKnob || isDraggingBottomKnob) return;

      // Filter tiny jitter scrolls
      if (Math.abs(e.deltaY) < 10) return;

      // Alt key is held down and user is scrolling mouse wheel:
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastSwitchTime < switchCooldown) return;

      if (e.deltaY > 0) {
        // Alt + Scroll Down -> switch to Modern Clay deck
        setTurntableSkin((prev) => {
          if (prev !== 'modern') {
            lastSwitchTime = now;
            try { localStorage.setItem('musicly_turntable_skin', 'modern'); } catch { }
            playClickSound('toggle');
            return 'modern';
          }
          return prev;
        });
      } else if (e.deltaY < 0) {
        // Alt + Scroll Up -> switch to Vintage Hi-Fi deck
        setTurntableSkin((prev) => {
          if (prev !== 'vintage') {
            lastSwitchTime = now;
            try { localStorage.setItem('musicly_turntable_skin', 'vintage'); } catch { }
            playClickSound('toggle');
            return 'vintage';
          }
          return prev;
        });
      }
    };

    stageEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      stageEl.removeEventListener('wheel', handleWheel);
    };
  }, [isDraggingFader, isDraggingWaveform, isDraggingTopKnob, isDraggingBottomKnob]);

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
      list = list.filter(track => isTrackInLanguages(track.language, activeLanguages));
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

  // Curated Favorite Playlists Section data (strictly filtered by activeLanguages)
  const favoritePlaylists = useMemo(() => {
    const playlists = [];

    const getFilteredPlaylistTracks = (playlistId, rawTracks) => {
      const excluded = excludedTrackIdsByPlaylist[playlistId] || [];
      const filtered = filterTracksByLang(rawTracks.filter(t => !excluded.includes(t.id)));
      return sortTracksByCustomOrder(playlistId, filtered);
    };

    // 1. Liked Songs Playlist
    const likedRaw = filterTracksByLang(allTracks.filter(t => favorites.includes(t.id)));
    const liked = sortTracksByCustomOrder('liked_songs', likedRaw);
    playlists.push({
      id: 'liked_songs',
      title: 'Liked Songs',
      subtitle: `${liked.length} song${liked.length === 1 ? '' : 's'} in this list`,
      count: liked.length,
      tracks: liked,
      trackIds: liked.map(t => t.id),
      image: liked[0]?.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'
    });

    // 2. Vintage Vinyl & 80s Classics
    const retroTracks = getFilteredPlaylistTracks('vintage_retro', allTracks.filter(t => (t.genre || '').toLowerCase().includes('retro') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('retro')))));
    playlists.push({
      id: 'vintage_retro',
      title: 'Vintage Hi-Fi & 80s',
      subtitle: `${retroTracks.length} song${retroTracks.length === 1 ? '' : 's'} in this list`,
      count: retroTracks.length,
      tracks: retroTracks,
      trackIds: retroTracks.map(t => t.id),
      image: retroTracks[0]?.cover || '/assets/images/retro_scene.jpg',
      isCustom: false,
      isMusiclyOfficial: true
    });

    // 3. Late Night Lo-Fi
    const lofiTracks = getFilteredPlaylistTracks('latenight_lofi', allTracks.filter(t => (t.genre || '').toLowerCase().includes('lo-fi') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('lo-fi')))));
    playlists.push({
      id: 'latenight_lofi',
      title: 'Late Night Lo-Fi',
      subtitle: `${lofiTracks.length} song${lofiTracks.length === 1 ? '' : 's'} in this list`,
      count: lofiTracks.length,
      tracks: lofiTracks,
      trackIds: lofiTracks.map(t => t.id),
      image: lofiTracks[0]?.cover || '/assets/images/lofi_scene.jpg',
      isCustom: false,
      isMusiclyOfficial: true
    });

    // Language-Specific Featured Playlists
    const isEnglishOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'english';
    const isHindiOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'hindi';
    const isBengaliOnly = activeLanguages.length === 1 && (activeLanguages[0].toLowerCase() === 'bengali' || activeLanguages[0].toLowerCase() === 'bangla');
    const isOtherOnly = activeLanguages.length === 1 && activeLanguages[0].toLowerCase() === 'other';

    if (isOtherOnly || activeLanguages.length === 0) {
      const otherTracks = getFilteredPlaylistTracks('global_other_melodies', allTracks.filter(t => {
        const lang = (t.language || '').toLowerCase();
        return lang === 'other' || (!['english', 'hindi', 'bengali'].includes(lang) && Boolean(t.language));
      }));
      if (otherTracks.length > 0) {
        playlists.push({
          id: 'global_other_melodies',
          title: 'Global & Other Melodies',
          subtitle: `${otherTracks.length} song${otherTracks.length === 1 ? '' : 's'} in this list`,
          count: otherTracks.length,
          tracks: otherTracks,
          trackIds: otherTracks.map(t => t.id),
          image: otherTracks[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
          isCustom: false,
          isMusiclyOfficial: true
        });
      }
    }

    if (isEnglishOnly || activeLanguages.length === 0) {
      const countryTracks = getFilteredPlaylistTracks('country_roots', allTracks.filter(t =>
        (t.genre || '').toLowerCase().includes('country') ||
        (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('country')))
      ));
      if (countryTracks.length > 0) {
        playlists.push({
          id: 'country_roots',
          title: 'Country Roads & Roots',
          subtitle: `${countryTracks.length} song${countryTracks.length === 1 ? '' : 's'} in this list`,
          count: countryTracks.length,
          tracks: countryTracks,
          trackIds: countryTracks.map(t => t.id),
          image: countryTracks[0]?.cover || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300&auto=format&fit=crop&q=80',
          isCustom: false,
          isMusiclyOfficial: true
        });
      }
    }

    if (isHindiOnly || activeLanguages.length === 0) {
      const ghazalTracks = getFilteredPlaylistTracks('timeless_ghazals', allTracks.filter(t =>
        (t.genre || '').toLowerCase().includes('ghazal') ||
        (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('ghazal')))
      ));
      if (ghazalTracks.length > 0) {
        playlists.push({
          id: 'timeless_ghazals',
          title: 'Timeless Ghazals & Mehfil',
          subtitle: `${ghazalTracks.length} song${ghazalTracks.length === 1 ? '' : 's'} in this list`,
          count: ghazalTracks.length,
          tracks: ghazalTracks,
          trackIds: ghazalTracks.map(t => t.id),
          image: ghazalTracks[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
          isCustom: false,
          isMusiclyOfficial: true
        });
      }
    }

    if (isBengaliOnly) {
      const bengaliClassics = getFilteredPlaylistTracks('bengali_classics', allTracks.filter(t =>
        (t.genre || '').toLowerCase().includes('rabindra') ||
        (t.title || '').toLowerCase().includes('majhe') ||
        (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('rabindra')))
      ));
      if (bengaliClassics.length > 0) {
        playlists.push({
          id: 'bengali_classics',
          title: 'Rabindra Sangeet & Folk',
          subtitle: `${bengaliClassics.length} song${bengaliClassics.length === 1 ? '' : 's'} in this list`,
          count: bengaliClassics.length,
          tracks: bengaliClassics,
          trackIds: bengaliClassics.map(t => t.id),
          image: bengaliClassics[0]?.cover || 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/d6/d8/80d6d8ef-03fd-991a-4f6c-e2e979355bb7/840123905307.png/600x600bb.jpg',
          isCustom: false,
          isMusiclyOfficial: true
        });
      }
    }

    // 4. Indie Warmth & Acoustic ("Indie Acoustic Sessions")
    const indieTracks = getFilteredPlaylistTracks('indie_warmth', allTracks.filter(t => (t.genre || '').toLowerCase().includes('indie') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('indie')))));
    playlists.push({
      id: 'indie_warmth',
      title: 'Indie Acoustic Sessions',
      subtitle: `${indieTracks.length} song${indieTracks.length === 1 ? '' : 's'} in this list`,
      count: indieTracks.length,
      tracks: indieTracks,
      trackIds: indieTracks.map(t => t.id),
      image: indieTracks[0]?.cover || 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=300&auto=format&fit=crop&q=80',
      isCustom: false,
      isMusiclyOfficial: true
    });

    // 5. Official Public Musicly Playlists (Admin Created, Public Worldwide)
    if (Array.isArray(publicPlaylists)) {
      publicPlaylists.forEach(pp => {
        const rawTracks = allTracks.filter(t => (pp.trackIds || []).includes(t.id));
        const ppTracks = getFilteredPlaylistTracks(pp.id, rawTracks);
        playlists.push({
          id: pp.id,
          title: pp.title,
          subtitle: `${ppTracks.length} song${ppTracks.length === 1 ? '' : 's'} in this list`,
          count: ppTracks.length,
          tracks: ppTracks,
          trackIds: pp.trackIds || [],
          image: pp.image || ppTracks[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          isCustom: false,
          isMusiclyOfficial: true,
          createdBy: pp.createdBy || 'Musicly Admin',
          createdAt: pp.createdAt
        });
      });
    }

    // 6. User's Own Playlists (Strictly Private to the logged-in User's Account)
    if (Array.isArray(customPlaylists)) {
      customPlaylists.forEach(cp => {
        const trackMap = new Map(allTracks.map(t => [t.id, t]));
        const orderedFromIds = (cp.trackIds || []).map(id => trackMap.get(id)).filter(Boolean);
        const cpTracks = sortTracksByCustomOrder(cp.id, filterTracksByLang(orderedFromIds));
        playlists.push({
          id: cp.id,
          title: cp.title,
          subtitle: `${cpTracks.length} song${cpTracks.length === 1 ? '' : 's'} in this list`,
          count: cpTracks.length,
          tracks: cpTracks,
          trackIds: cp.trackIds || [],
          image: cp.image || cpTracks[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          isCustom: true,
          isMusiclyOfficial: false
        });
      });
    }

    return playlists.filter(p => !deletedPlaylistIds.includes(p.id));
  }, [allTracks, favorites, activeLanguages, customPlaylists, publicPlaylists, filterTracksByLang, deletedPlaylistIds, excludedTrackIdsByPlaylist, playlistTrackOrders, sortTracksByCustomOrder]);

  // Playlist Source Choice: 'musicly' (default) | 'custom' | 'all'
  const [playlistSourceMode, setPlaylistSourceMode] = useState('musicly');

  // Active playing playlist tracking (synchronized with App.jsx to stop once finished)
  const [localActivePlaylistId, setLocalActivePlaylistId] = useState(() => {
    try {
      return localStorage.getItem('musicly_active_playlist_id') || null;
    } catch {
      return null;
    }
  });

  const activePlayingPlaylistId = propActivePlayingPlaylistId !== undefined
    ? propActivePlayingPlaylistId
    : localActivePlaylistId;

  const setActivePlayingPlaylistId = useCallback((id) => {
    setLocalActivePlaylistId(id);
    if (onSetActivePlayingPlaylistId) {
      onSetActivePlayingPlaylistId(id);
    }
    if (id) {
      try {
        localStorage.setItem('musicly_active_playlist_id', id);
      } catch { }
    } else {
      try {
        localStorage.removeItem('musicly_active_playlist_id');
      } catch { }
    }
  }, [onSetActivePlayingPlaylistId]);

  const musiclyPlaylists = useMemo(() => {
    return favoritePlaylists.filter(p => !p.isCustom);
  }, [favoritePlaylists]);

  const userPlaylists = useMemo(() => {
    return favoritePlaylists.filter(p => p.isCustom);
  }, [favoritePlaylists]);

  const displayedPlaylists = useMemo(() => {
    if (playlistSourceMode === 'musicly') return musiclyPlaylists;
    if (playlistSourceMode === 'custom') return userPlaylists;
    return favoritePlaylists;
  }, [playlistSourceMode, musiclyPlaylists, userPlaylists, favoritePlaylists]);

  const activePlayingPlaylist = useMemo(() => {
    if (!activePlayingPlaylistId) return null;
    return favoritePlaylists.find(p => p.id === activePlayingPlaylistId) || null;
  }, [activePlayingPlaylistId, favoritePlaylists]);

  // Gym Workout Mode detection: detects if active playlist or track belongs to Gym
  const isGymPlaylist = useMemo(() => {
    // 1. Direct active playing playlist check
    if (activePlayingPlaylist && (activePlayingPlaylist.title || '').toLowerCase().includes('gym')) {
      return true;
    }

    // 2. By active playlist ID
    if (activePlayingPlaylistId && String(activePlayingPlaylistId).toLowerCase().includes('gym')) {
      return true;
    }

    // 3. By selected custom playlist
    if (selectedCustomPlaylist && (selectedCustomPlaylist.title || '').toLowerCase().includes('gym')) {
      const isSongFromSelected = (selectedCustomPlaylist.tracks || []).some(t => t.id === currentTrack?.id);
      if (isSongFromSelected) return true;
    }

    // 4. By custom or public playlists with 'gym' in the title
    const gymPlaylists = [
      ...customPlaylists.filter(p => (p.title || '').toLowerCase().includes('gym')),
      ...(Array.isArray(publicPlaylists) ? publicPlaylists.filter(p => (p.title || '').toLowerCase().includes('gym')) : [])
    ];
    if (gymPlaylists.some(p => (p.trackIds || []).includes(currentTrack?.id))) {
      return true;
    }

    // 5. By track genre or title
    const trackGenre = (currentTrack?.genre || '').toLowerCase();
    const trackTitle = (currentTrack?.title || '').toLowerCase();
    if (trackGenre.includes('gym') || trackGenre.includes('workout') || trackTitle.includes('gym')) {
      return true;
    }

    return false;
  }, [activePlayingPlaylist, activePlayingPlaylistId, selectedCustomPlaylist, currentTrack, customPlaylists, publicPlaylists]);

  // Persistent Gym Mode state: stays active even while paused until user idle wait completes
  const [isGymModeActive, setIsGymModeActive] = useState(false);
  const [isSmoothlyExitingScene, setIsSmoothlyExitingScene] = useState(false);
  const [gymExitNotice, setGymExitNotice] = useState('');

  // Handle Gym workout mode active lifecycle & calm idle exit timer
  useEffect(() => {
    if (!isGymPlaylist) {
      setIsGymModeActive(false);
      setIsSmoothlyExitingScene(false);
      setGymExitNotice('');
      return;
    }

    // If music is playing in gym playlist, keep gym mode active
    if (isPlaying) {
      setIsGymModeActive(true);
      setIsSmoothlyExitingScene(false);
      setGymExitNotice('');
      return;
    }

    // While music is paused: wait for some time (6 seconds). If user doesn't resume, smoothly change scene back to standard Vinyl page!
    if (isGymModeActive && !isPlaying) {
      let exitTimeoutId = null;
      const pauseWaitTimer = setTimeout(() => {
        setGymExitNotice('Workout paused — returning to Vinyl Studio...');
        setIsSmoothlyExitingScene(true);

        exitTimeoutId = setTimeout(() => {
          setIsGymModeActive(false);
          setIsSmoothlyExitingScene(false);
          setGymExitNotice('');
          onSetActivePlayingPlaylistId?.(null);
          // Return to the standard Vinyl Scene page (do not call onClose/home page)
        }, 1200);
      }, 6000);

      return () => {
        clearTimeout(pauseWaitTimer);
        if (exitTimeoutId) clearTimeout(exitTimeoutId);
      };
    }
  }, [isGymPlaylist, isPlaying, isGymModeActive, onSetActivePlayingPlaylistId]);

  // Keep selected playlist detail in sync when language filter changes
  useEffect(() => {
    if (selectedCustomPlaylist) {
      const updated = favoritePlaylists.find(p => p.id === selectedCustomPlaylist.id);
      if (updated) {
        setSelectedCustomPlaylist(updated);
      }
    }
  }, [favoritePlaylists]);

  // Handle Play Complete Playlist on Turntable & Load remaining tracks into Upcoming Queue
  const handlePlayPlaylist = useCallback((playlist, e) => {
    e?.stopPropagation?.();
    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) return;

    // If this playlist is currently playing and pressed again -> stop/pause playback!
    if (activePlayingPlaylistId === playlist.id && isPlaying) {
      onTogglePlay?.();
      return;
    }

    // If this playlist is active but paused -> resume playback
    if (activePlayingPlaylistId === playlist.id && !isPlaying && currentTrack) {
      onTogglePlay?.();
      return;
    }

    const tracksToPlay = filterTracksByLang(playlist.tracks);
    if (tracksToPlay.length === 0) return;

    setActivePlayingPlaylistId(playlist.id);

    let finalTracks = [...tracksToPlay];
    if (isShuffle) {
      for (let i = finalTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
      }
    }

    const [firstSong, ...remainingSongs] = finalTracks;
    if (firstSong) {
      onSelectTrack?.(firstSong, true, true);
    }
    if (onSetCustomQueue) {
      onSetCustomQueue(remainingSongs);
    }
    playPeacefulLikeSound();
  }, [filterTracksByLang, isShuffle, onSelectTrack, onSetCustomQueue, playPeacefulLikeSound, setActivePlayingPlaylistId, activePlayingPlaylistId, isPlaying, onTogglePlay, currentTrack]);

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

  // Modern Clay Turntable Master Volume Rotary Dial Drag Handler
  const handleBottomKnobPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBottomKnob(true);
    const startY = e.clientY;
    const startVol = currentVol;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaY = startY - moveEvent.clientY; // upward drag increases
      const nextVol = Math.max(0, Math.min(1, Math.round((startVol + (deltaY / 120)) * 100) / 100));
      if (onVolumeChange) {
        onVolumeChange(nextVol);
        if (nextVol > 0 && isMuted) setIsMuted(false);
      }
    };

    const onPointerUp = () => {
      setIsDraggingBottomKnob(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      playClickSound('light');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Modern Clay Turntable ON / OFF Power & Playback Toggle Button Handler
  const handlePowerToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTogglePlay) {
      onTogglePlay();
    }
    playClickSound('toggle');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
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

  // Render single playlist item in the playlist stack
  const renderPlaylistItem = (playlist) => {
    const isPlaylistActive = activePlayingPlaylistId === playlist.id;
    const isPlaylistPlaying = isPlaylistActive && isPlaying;

    return (
      <div
        key={playlist.id}
        className={`vinyl-playlist-item ${playlist.isCustom ? 'is-custom' : ''} ${isPlaylistActive ? 'is-active-playing' : ''}`}
        onClick={() => {
          if (playlist.id === 'liked_songs') {
            setIsLikedPanelOpen(true);
          } else {
            setSelectedCustomPlaylist(playlist);
            setIsEditingPlaylistTitle(false);
            playClickSound('light');
          }
        }}
        title={
          playlist.isCustom
            ? `Private playlist: Click to open & manage "${playlist.title}"`
            : (playlist.isMusiclyOfficial ? `Official Public playlist: Click to browse "${playlist.title}"` : `Browse "${playlist.title}"`)
        }
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
                <span className="vinyl-playlist-custom-badge vinyl-badge-private" title="Private to your account only">
                  <Lock size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                  PRIVATE
                </span>
              )}
              {isPlaylistPlaying && (
                <span className="vinyl-playlist-playing-badge" title="Playing on Turntable">
                  <span className="mini-equalizer-bar bar-1" />
                  <span className="mini-equalizer-bar bar-2" />
                  <span className="mini-equalizer-bar bar-3" />
                  PLAYING
                </span>
              )}
            </div>
            <span className="vinyl-playlist-sub">{playlist.subtitle}</span>
          </div>
        </div>

        {/* Circular Play Button: Loads playlist tracks into turntable queue */}
        <button
          className={`vinyl-playlist-play-btn ${isPlaylistPlaying ? 'is-playing' : ''}`}
          onClick={(e) => handlePlayPlaylist(playlist, e)}
          title={isPlaylistPlaying ? `Pause "${playlist.title}"` : `Play "${playlist.title}" on turntable and queue all songs`}
          aria-label={isPlaylistPlaying ? `Pause ${playlist.title}` : `Play ${playlist.title}`}
        >
          {isPlaylistPlaying ? (
            <Pause size={16} fill="#0d0d0f" />
          ) : (
            <Play size={16} fill="#0d0d0f" style={{ marginLeft: '2px' }} />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className={`vinyl-scene-root ${isFullscreen ? 'is-fullscreen-mode' : ''} ${isAnyModalActive ? 'is-modal-active' : ''} ${isGymModeActive ? 'is-gym-mode-active' : ''} ${isSmoothlyExitingScene ? 'is-smoothly-exiting' : ''}`}>
      {/* Subtle Grain Overlay */}
      <div className="vinyl-grain-overlay" />

      {/* Gym Workout Sweat Droplets & Motion Blur Overlay */}
      <SweatDropletsOverlay isActive={isGymModeActive} />

      {/* Gentle Calm Scene Exit Notification */}
      {gymExitNotice && (
        <div className="vinyl-gym-calm-exit-toast" role="status" aria-live="polite">
          <Sparkles size={16} className="text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>{gymExitNotice}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className={`vinyl-top-header ${isAnyModalActive ? 'is-hidden-by-modal' : ''}`}>
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

                      {/* + Add to custom playlist */}
                      <button
                        type="button"
                        className="vinyl-liked-row-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSongForPlaylistModal(track);
                          playClickSound('light');
                        }}
                        title={`Add "${track.title}" to your playlist`}
                        aria-label="Add to playlist"
                      >
                        <Plus size={14} strokeWidth={2.8} />
                      </button>

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
                <div className="vinyl-deck-scroll-hint" title="Hold Alt key and scroll mouse wheel over the turntable to switch between styles">
                  <span className="scroll-hint-kbd">Alt</span>
                  <span className="scroll-hint-plus">+</span>
                  <span>Scroll to switch deck</span>
                </div>
              </div>

              {/* Turntable Deck Stage Wrapper (Hold Alt + Scroll wheel over deck to switch) */}
              <div className="vinyl-deck-stage-wrapper" ref={deckStageWrapperRef}>
                {/* Turntable Switcher Container */}
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
                          className={`vinyl-record-disc ${isPlaying ? 'is-spinning' : 'is-paused'} ${isGymModeActive ? 'is-gym-disc' : ''}`}
                          style={{ '--vinyl-spin-duration': `${rpmSpeed === 33 ? 6.5 : 4.2}s` }}
                        >
                          {/* Concentric Vinyl Grooves */}
                          <div className="vinyl-grooves-layer" />

                          {/* Radial Light Reflection Sheen Sweeps */}
                          <div className="vinyl-sheen-sweep" />

                          {/* Center Hub: sleek metallic spindle pin in gym mode so the muscular statue is visible! */}
                          {isGymModeActive ? (
                            <div className="gym-center-spindle-pin" />
                          ) : (
                            /* Split Two-Tone Center Label */
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
                            className={`modern-record-disc ${isPlaying ? 'is-spinning' : 'is-paused'} ${isGymModeActive ? 'is-gym-disc' : ''}`}
                            style={{ '--vinyl-spin-duration': `${rpmSpeed === 33 ? 6.5 : 4.2}s` }}
                          >
                            {/* Fine Concentric Vinyl Grooves */}
                            <div className="modern-record-grooves" />

                            {/* Specular Sheen Sweep */}
                            <div className="modern-record-sheen" />

                            {/* Center Minimalist Spindle Hub */}
                            {isGymModeActive ? (
                              <div className="gym-center-spindle-pin" />
                            ) : (
                              <div className="modern-center-spindle-disc">
                                <div className="modern-center-spindle-hole" />
                              </div>
                            )}
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
                        {/* Left: Recessed Frosted LCD Display Card (Waveform vs Lyrics View) */}
                        <div
                          className={`modern-digital-display-card ${isLyricsViewOpen ? 'is-lyrics-mode' : ''}`}
                          ref={modernLcdRef}
                        >
                          {isLyricsViewOpen ? (
                            /* Lyrics Mode Viewport */
                            <div
                              className="modern-lcd-lyrics-viewport"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isLyricsLoading ? (
                                <div className="modern-lcd-lyrics-status">
                                  <Mic2 size={16} className="modern-lcd-status-icon pulse-icon" />
                                  <span className="modern-lcd-status-title">FETCHING LYRICS...</span>
                                  <span className="modern-lcd-status-sub">{currentTrack?.title}</span>
                                </div>
                              ) : lyricsData?.instrumental ? (
                                <div className="modern-lcd-lyrics-status">
                                  <Music size={16} className="modern-lcd-status-icon" />
                                  <span className="modern-lcd-status-title">INSTRUMENTAL TRACK</span>
                                  <span className="modern-lcd-status-sub">No lyrics for this piece</span>
                                </div>
                              ) : lyricsData?.lines && lyricsData.lines.length > 0 ? (
                                <div
                                  className="modern-lcd-lyrics-container"
                                  ref={lyricsContainerRef}
                                  onWheel={handleLyricsManualScroll}
                                  onTouchStart={handleLyricsManualScroll}
                                  onPointerDown={handleLyricsManualScroll}
                                >
                                  {lyricsData.lines.map((line, idx) => {
                                    const isActive = lyricsData.isSynced && idx === activeLineIndex;
                                    const isPassed = lyricsData.isSynced && idx < activeLineIndex;
                                    return (
                                      <div
                                        key={`${idx}-${line.time ?? ''}`}
                                        ref={isActive ? activeLineRef : null}
                                        className={`modern-lcd-lyric-line ${isActive ? 'is-active' : ''} ${isPassed ? 'is-passed' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (line.time !== undefined) {
                                            handleLyricLineClick(line.time);
                                          }
                                        }}
                                        title={line.time !== undefined ? `Jump to ${formatModernTime(line.time)}` : undefined}
                                      >
                                        {line.text}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="modern-lcd-lyrics-status">
                                  <span className="modern-lcd-status-title">LYRICS UNAVAILABLE</span>
                                  <span className="modern-lcd-status-sub">{currentTrack?.title || 'Unknown Track'}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Equalizer Barcode / Waveform Spectrogram Blocks */
                            <div
                              className="modern-barcode-waveform"
                              onClick={handleModernLcdSeek}
                              title="Click waveform to seek playback"
                            >
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
                          )}

                          {/* Display Footer: LYRICS Toggle Button & Digital Time Clocks */}
                          <div
                            className="modern-display-footer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`modern-lyrics-toggle-btn ${isLyricsViewOpen ? 'is-active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsLyricsViewOpen(prev => !prev);
                                playClickSound('toggle');
                              }}
                              title={isLyricsViewOpen ? 'Switch back to waveform display' : 'Show song lyrics'}
                            >
                              LYRICS
                              {isLyricsViewOpen && <span className="modern-lyrics-active-dot" />}
                            </button>
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
                          <div
                            className={`modern-knob-unit ${isDraggingTopKnob ? 'is-dragging' : ''}`}
                            onPointerDown={handleTopKnobPointerDown}
                            onWheel={handleTopKnobWheel}
                            title={`Pitch Calibration: ${pitchValue.toFixed(3)} (Click & drag up/down or scroll wheel to adjust)`}
                          >
                            <div
                              className="modern-conical-knob knob-top"
                              style={{ transform: `rotate(${((pitchValue / 33.333) * 270) - 135}deg)` }}
                            >
                              <div className="modern-knob-indicator" />
                            </div>
                            <div className="modern-knob-readout">
                              {pitchValue.toFixed(3)}
                            </div>
                          </div>

                          {/* Bottom Knob: Master Volume Rotary */}
                          <div
                            className={`modern-knob-unit ${isDraggingBottomKnob ? 'is-dragging' : ''}`}
                            onPointerDown={handleBottomKnobPointerDown}
                            onWheel={handleFaderWheel}
                            title={`Master Volume: ${Math.round(currentVol * 100)}% (Click & drag up/down or scroll wheel to adjust)`}
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
                            onClick={handlePowerToggleClick}
                            title={isPlaying ? "Turntable Power: ON (Click to Stop)" : "Turntable Power: OFF (Click to Start)"}
                          >
                            {isPlaying ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Now Playing Information Block */}
              <div className="vinyl-now-playing-panel">
                <div className="vinyl-now-playing-meta-row">
                  <div className="vinyl-track-info-block">
                    <div className="vinyl-now-playing-header-line">
                      <span className="vinyl-now-playing-kicker">NOW PLAYING</span>
                      {activePlayingPlaylist && (
                        <span
                          className="vinyl-now-playing-playlist-badge"
                          title={`Loaded from playlist: ${activePlayingPlaylist.title}`}
                        >
                          {activePlayingPlaylist.title}
                        </span>
                      )}
                    </div>
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
              </div>

            </section>

            {/* ==========================================================================
               RIGHT COLUMN: MUSIC CATEGORIES & FAVORITE PLAYLISTS
               ========================================================================== */}
            <section className="vinyl-content-column" aria-label="Music Discovery and Playlists">

              {/* Up Next Playback Queue & Categories Section */}
              <div className="vinyl-categories-section">
                <div className="vinyl-section-header">
                  <div className="vinyl-section-title-wrap">
                    <h2 className="vinyl-section-title">
                      {carouselViewMode === 'queue' ? 'UP NEXT QUEUE' : 'MUSIC CATEGORIES'}
                    </h2>
                  </div>

                  {/* Section Mode Switcher Tabs */}
                  <div className="vinyl-section-mode-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={carouselViewMode === 'queue'}
                      className={`vinyl-category-pill vinyl-mode-pill ${carouselViewMode === 'queue' ? 'is-active' : ''} ${isQueueTabDragOver ? 'is-drag-target-pulse' : ''}`}
                      onClick={() => {
                        setCarouselViewMode('queue');
                        playClickSound('light');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        if (!isQueueTabDragOver) setIsQueueTabDragOver(true);
                      }}
                      onDragLeave={() => setIsQueueTabDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsQueueTabDragOver(false);
                        if (draggedTrackData) {
                          handleAddToQueue(draggedTrackData, e);
                          setCarouselViewMode('queue');
                          playClickSound('toggle');
                        }
                        setDraggedTrackData(null);
                        setDraggedCardIndex(null);
                      }}
                      title="View and reorder upcoming playback queue (or drag & drop songs here to add)"
                    >
                      UP NEXT ({upcomingQueue.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={carouselViewMode === 'categories'}
                      className={`vinyl-category-pill vinyl-mode-pill ${carouselViewMode === 'categories' ? 'is-active' : ''}`}
                      onClick={() => {
                        setCarouselViewMode('categories');
                        playClickSound('light');
                      }}
                      title="Browse tracks by music category & language"
                    >
                      BROWSE CATEGORIES
                    </button>
                  </div>
                </div>

                {/* If in Categories Mode: Display Language & Category Selector Pills */}
                {carouselViewMode === 'categories' && (
                  <>
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
                  </>
                )}

                {/* 4 Cards Row: Queue Mode (Drag-and-Drop) vs Categories Browse Mode */}
                <div
                  className={`vinyl-cards-carousel ${carouselViewMode === 'queue' ? 'vinyl-queue-carousel' : ''}`}
                >
                  {carouselViewMode === 'queue' ? (
                    upcomingQueue.length === 0 ? (
                      <div
                        className="vinyl-cards-empty vinyl-queue-empty-drop"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedTrackData) {
                            handleAddToQueue(draggedTrackData, e);
                            playClickSound('toggle');
                          }
                          setDraggedTrackData(null);
                        }}
                      >
                        <span>No upcoming tracks in queue.</span>
                        <p style={{ margin: '4px 0 10px 0', fontSize: '0.85rem', color: '#a09a8f' }}>
                          Click below to browse songs.
                        </p>
                        <button
                          type="button"
                          className="vinyl-category-pill"
                          onClick={() => {
                            setCarouselViewMode('categories');
                            playClickSound('light');
                          }}
                        >
                          BROWSE SONGS TO QUEUE
                        </button>
                      </div>
                    ) : (
                      <>
                        {upcomingQueue.map((track, index) => {
                          const isCardPlaying = currentTrack?.id === track.id && isPlaying;
                          const isCurrent = currentTrack?.id === track.id;
                          const isDragging = draggedCardIndex === index;
                          const isDropTarget = dropTargetIndex === index;

                          return (
                            <div
                              key={track.id}
                              className={`vinyl-track-card vinyl-queue-card ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(index));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedCardIndex(index);
                                setDraggedTrackData(track);
                                playClickSound('light');
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                setDropTargetIndex(index);
                              }}
                              onDragLeave={() => {
                                if (dropTargetIndex === index) setDropTargetIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedCardIndex !== null && draggedCardIndex !== index) {
                                  handleQueueReorder(draggedCardIndex, index);
                                } else if (draggedTrackData) {
                                  const isAlready = upcomingQueue.some(t => t.id === draggedTrackData.id);
                                  const base = isAlready ? upcomingQueue.filter(t => t.id !== draggedTrackData.id) : [...upcomingQueue];
                                  const insertIdx = Math.min(index, base.length);
                                  base.splice(insertIdx, 0, draggedTrackData);
                                  if (onSetCustomQueue) {
                                    onSetCustomQueue(base);
                                  }
                                  playClickSound('toggle');
                                }
                                setDraggedCardIndex(null);
                                setDropTargetIndex(null);
                                setDraggedTrackData(null);
                              }}
                              onDragEnd={() => {
                                setDraggedCardIndex(null);
                                setDropTargetIndex(null);
                                setDraggedTrackData(null);
                              }}
                              onClick={() => {
                                if (currentTrack?.id === track.id) {
                                  onTogglePlay?.();
                                  return;
                                }
                                onSelectTrack?.(track, true);
                                if (onSetCustomQueue) {
                                  onSetCustomQueue(upcomingQueue.filter(t => t.id !== track.id));
                                }
                              }}
                              title={`#${index + 1} in queue: "${track.title}" by ${track.artist}. Drag to reorder, click to play.`}
                            >
                              <div className="vinyl-card-art-box">
                                <img
                                  src={track.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'}
                                  alt={track.title}
                                  className="vinyl-card-img"
                                  loading="lazy"
                                  draggable={false}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = track.youtubeId
                                      ? `https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`
                                      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                                  }}
                                />

                                {/* Queue Position Badge */}
                                <div className="vinyl-queue-order-badge">
                                  {index === 0 ? 'UP NEXT' : `#${index + 1}`}
                                </div>

                                {/* Drag Handle Indicator */}
                                <div className="vinyl-queue-drag-handle" title="Drag to reorder position in queue">
                                  <GripVertical size={14} />
                                </div>

                                {/* Remove from queue quick action */}
                                <button
                                  type="button"
                                  className="vinyl-queue-remove-btn"
                                  onClick={(e) => handleRemoveFromQueue(track.id, e)}
                                  title="Remove from queue"
                                  aria-label="Remove from queue"
                                >
                                  <X size={12} />
                                </button>

                                {/* Add to my own playlist button */}
                                <button
                                  type="button"
                                  className="vinyl-queue-add-playlist-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSongForPlaylistModal(track);
                                    playClickSound('light');
                                  }}
                                  title={`Add "${track.title}" to your playlist`}
                                  aria-label="Add to playlist"
                                >
                                  <Plus size={13} strokeWidth={2.8} />
                                </button>

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
                        })}
                      </>
                    )
                  ) : (
                    filteredCategoryTracks.length === 0 ? (
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
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'musicly_track', track }));
                              e.dataTransfer.effectAllowed = 'copy';
                              setDraggedTrackData(track);
                              playClickSound('light');
                            }}
                            onDragEnd={() => {
                              setDraggedTrackData(null);
                              setIsQueueTabDragOver(false);
                            }}
                            onClick={() => {
                              if (currentTrack?.id === track.id) {
                                onTogglePlay?.();
                              } else {
                                onSelectTrack?.(track, true);
                              }
                            }}
                            title={isCardPlaying ? `Pause "${track.title}"` : `Play "${track.title}" by ${track.artist}. Drag to add to queue.`}
                          >
                            <div className="vinyl-card-art-box">
                              <img
                                src={track.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'}
                                alt={track.title}
                                className="vinyl-card-img"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = track.youtubeId
                                    ? `https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`
                                    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                                }}
                              />

                              {/* Add to Queue Button */}
                              <button
                                type="button"
                                className="vinyl-card-queue-add-btn"
                                onClick={(e) => handleAddToQueue(track, e)}
                                title="Add to upcoming queue"
                                aria-label="Add to upcoming queue"
                              >
                                <ListPlus size={12} />
                                Queue
                              </button>

                              {/* Add to my own playlist button */}
                              <button
                                type="button"
                                className="vinyl-card-add-playlist-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSongForPlaylistModal(track);
                                  playClickSound('light');
                                }}
                                title={`Add "${track.title}" to your playlist`}
                                aria-label="Add to playlist"
                              >
                                <Plus size={13} strokeWidth={2.8} />
                              </button>

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
                    )
                  )}
                </div>
              </div>

              {/* Playlists Section: Two Sections for Musicly vs User's Own Playlist */}
              <div className="vinyl-playlists-section">
                <div className="vinyl-section-header">
                  <div className="vinyl-section-title-wrap">
                    <h2 className="vinyl-section-title">
                      PLAYLISTS ({displayedPlaylists.length})
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="vinyl-add-playlist-btn"
                    onClick={() => {
                      setNewPlaylistTitle('');
                      setSelectedTrackIdsForNew([]);
                      setSongSearchQuery('');
                      setNewPlaylistTarget(effectiveIsAdmin ? 'musicly' : 'user');
                      setIsCreatePlaylistOpen(true);
                      playClickSound('light');
                    }}
                    title={effectiveIsAdmin ? "Create official Musicly playlist or personal playlist" : "Create personal playlist (private to you)"}
                    aria-label="Create new playlist"
                  >
                    <Plus size={16} strokeWidth={2.8} />
                  </button>
                </div>

                {/* Playlist Source Chooser: Visual Cards for Musicly vs User's Own Playlist */}
                <div className="vinyl-playlist-source-selector" role="radiogroup" aria-label="Choose playlist source to play">
                  <div
                    className={`vinyl-source-card ${playlistSourceMode === 'musicly' ? 'is-active' : ''}`}
                    onClick={() => {
                      setPlaylistSourceMode(prev => prev === 'musicly' ? 'all' : 'musicly');
                      playClickSound('light');
                    }}
                    role="radio"
                    aria-checked={playlistSourceMode === 'musicly'}
                    title="Browse and play official Musicly public playlists"
                  >
                    <div className="vinyl-source-icon-wrap">
                      <Sparkles size={18} />
                    </div>
                    <div className="vinyl-source-info">
                      <div className="vinyl-source-title-row">
                        <span className="vinyl-source-title">MUSICLY PLAYLISTS</span>
                        <span className="vinyl-source-count">{musiclyPlaylists.length}</span>
                      </div>
                      <span className="vinyl-source-desc">Curated editorial classics, lo-fi & indie</span>
                    </div>
                    {activePlayingPlaylist && !activePlayingPlaylist.isCustom && isPlaying && (
                      <span className="vinyl-source-active-dot" title="A Musicly playlist is currently playing" />
                    )}
                  </div>

                  <div
                    className={`vinyl-source-card ${playlistSourceMode === 'custom' ? 'is-active' : ''}`}
                    onClick={() => {
                      setPlaylistSourceMode(prev => prev === 'custom' ? 'all' : 'custom');
                      playClickSound('light');
                    }}
                    role="radio"
                    aria-checked={playlistSourceMode === 'custom'}
                    title="Browse and play your own private playlists (only you can view or play)"
                  >
                    <div className="vinyl-source-icon-wrap">
                      <ListMusic size={18} />
                    </div>
                    <div className="vinyl-source-info">
                      <div className="vinyl-source-title-row">
                        <span className="vinyl-source-title">USER'S OWN PLAYLIST</span>
                        <span className="vinyl-source-count">{userPlaylists.length}</span>
                      </div>
                      <span className="vinyl-source-desc">Private mixes & tracklists built by you</span>
                    </div>
                    {activePlayingPlaylist && activePlayingPlaylist.isCustom && isPlaying && (
                      <span className="vinyl-source-active-dot" title="Your personal playlist is currently playing" />
                    )}
                  </div>
                </div>

                {/* Playlist Stack */}
                <div className="vinyl-playlists-stack">
                  {/* Mode: ALL (Shows both sections clearly separated) */}
                  {playlistSourceMode === 'all' && (
                    <>
                      {/* Section 1: Musicly Playlists */}
                      <div className="vinyl-playlist-section-label-row">
                        <span className="vinyl-playlist-section-label">MUSICLY PLAYLISTS ({musiclyPlaylists.length})</span>
                        {effectiveIsAdmin && (
                          <button
                            type="button"
                            className="vinyl-playlist-section-btn"
                            onClick={() => {
                              setNewPlaylistTitle('');
                              setSelectedTrackIdsForNew([]);
                              setSongSearchQuery('');
                              setNewPlaylistTarget('musicly');
                              setIsCreatePlaylistOpen(true);
                              playClickSound('light');
                            }}
                            title="Create official Musicly playlist (Public worldwide)"
                          >
                            <Plus size={13} />
                            <span>New Musicly Playlist</span>
                          </button>
                        )}
                      </div>
                      {musiclyPlaylists.map(playlist => renderPlaylistItem(playlist))}

                      {/* Section 2: User's Own Playlists */}
                      <div className="vinyl-playlist-section-label-row" style={{ marginTop: 14 }}>
                        <span className="vinyl-playlist-section-label">USER'S OWN PLAYLISTS ({userPlaylists.length})</span>
                        <button
                          type="button"
                          className="vinyl-playlist-section-btn"
                          onClick={() => {
                            setNewPlaylistTitle('');
                            setSelectedTrackIdsForNew([]);
                            setSongSearchQuery('');
                            setNewPlaylistTarget('user');
                            setIsCreatePlaylistOpen(true);
                            playClickSound('light');
                          }}
                          title="Create personal playlist (private to your account)"
                        >
                          <Plus size={13} />
                          <span>New Private Playlist</span>
                        </button>
                      </div>
                      {userPlaylists.length === 0 ? (
                        <div className="vinyl-playlist-empty-card">
                          <ListMusic size={26} className="vinyl-empty-icon" />
                          <div className="vinyl-playlist-empty-text">
                            <span className="vinyl-playlist-empty-title">NO USER PLAYLISTS YET</span>
                            <span className="vinyl-playlist-empty-sub">
                              Create your own private playlist or click the + sign beside songs in Musicly playlists to save them here.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="vinyl-btn-primary"
                            onClick={() => {
                              setNewPlaylistTitle('');
                              setSelectedTrackIdsForNew([]);
                              setSongSearchQuery('');
                              setNewPlaylistTarget('user');
                              setIsCreatePlaylistOpen(true);
                              playClickSound('light');
                            }}
                          >
                            <Plus size={15} />
                            <span>Create Your First Playlist</span>
                          </button>
                        </div>
                      ) : (
                        userPlaylists.map(playlist => renderPlaylistItem(playlist))
                      )}
                    </>
                  )}

                  {/* Mode: MUSICLY ONLY */}
                  {playlistSourceMode === 'musicly' && (
                    <>
                      {effectiveIsAdmin && (
                        <div className="vinyl-playlist-section-label-row" style={{ marginBottom: 10 }}>
                          <span className="vinyl-playlist-section-label">OFFICIAL PLAYLISTS ({musiclyPlaylists.length})</span>
                          <button
                            type="button"
                            className="vinyl-playlist-section-btn"
                            onClick={() => {
                              setNewPlaylistTitle('');
                              setSelectedTrackIdsForNew([]);
                              setSongSearchQuery('');
                              setNewPlaylistTarget('musicly');
                              setIsCreatePlaylistOpen(true);
                              playClickSound('light');
                            }}
                            title="Create official Musicly playlist (Public worldwide)"
                          >
                            <Plus size={13} />
                            <span>New Musicly Playlist</span>
                          </button>
                        </div>
                      )}
                      {musiclyPlaylists.map(playlist => renderPlaylistItem(playlist))}
                    </>
                  )}

                  {/* Mode: USER CUSTOM ONLY */}
                  {playlistSourceMode === 'custom' && (
                    <>
                      <div className="vinyl-playlist-section-label-row" style={{ marginBottom: 10 }}>
                        <span className="vinyl-playlist-section-label">YOUR PRIVATE PLAYLISTS ({userPlaylists.length})</span>
                        <button
                          type="button"
                          className="vinyl-playlist-section-btn"
                          onClick={() => {
                            setNewPlaylistTitle('');
                            setSelectedTrackIdsForNew([]);
                            setSongSearchQuery('');
                            setNewPlaylistTarget('user');
                            setIsCreatePlaylistOpen(true);
                            playClickSound('light');
                          }}
                          title="Create personal playlist (private to your account)"
                        >
                          <Plus size={13} />
                          <span>New Private Playlist</span>
                        </button>
                      </div>
                      {userPlaylists.length === 0 ? (
                        <div className="vinyl-playlist-empty-card">
                          <ListMusic size={26} className="vinyl-empty-icon" />
                          <div className="vinyl-playlist-empty-text">
                            <span className="vinyl-playlist-empty-title">NO USER PLAYLISTS YET</span>
                            <span className="vinyl-playlist-empty-sub">
                              Create your own private playlist or click the + sign beside songs in Musicly playlists to save them here.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="vinyl-btn-primary"
                            onClick={() => {
                              setNewPlaylistTitle('');
                              setSelectedTrackIdsForNew([]);
                              setSongSearchQuery('');
                              setNewPlaylistTarget('user');
                              setIsCreatePlaylistOpen(true);
                              playClickSound('light');
                            }}
                          >
                            <Plus size={15} />
                            <span>Create Your First Playlist</span>
                          </button>
                        </div>
                      ) : (
                        userPlaylists.map(playlist => renderPlaylistItem(playlist))
                      )}
                    </>
                  )}
                </div>
              </div>

            </section>

            {/* ==========================================================================
               ROW 2 - LEFT: DEDICATED VINYL PLAYER CONTROLS BAR (ANCHORED)
               ========================================================================== */}
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

            {/* ==========================================================================
               ROW 2 - RIGHT: PIXEL CAT LOUNGE (EXACT SAME LEVEL AS PLAYBAR)
               ========================================================================== */}
            <div className="vinyl-pixel-cat-card">
              <PixelCat isPlaying={isPlaying} />
            </div>

          </div>
        </main>
      </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 className="vinyl-playlist-modal-title">CREATE NEW PLAYLIST</h3>
                  {effectiveIsAdmin && (
                    <span className="vinyl-admin-pill-badge" title="You have Admin privileges to curate public playlists">
                      <ShieldCheck size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      ADMIN
                    </span>
                  )}
                </div>
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
                {/* Playlist Target & Privacy Chooser: Admin can publish Public Musicly or Private Personal; User gets Private */}
                {effectiveIsAdmin ? (
                  <div className="vinyl-playlist-type-selector-box">
                    <label className="vinyl-playlist-input-label">PLAYLIST TYPE & VISIBILITY</label>
                    <div className="vinyl-playlist-type-pills">
                      <button
                        type="button"
                        className={`vinyl-type-pill ${newPlaylistTarget === 'musicly' ? 'is-active is-public' : ''}`}
                        onClick={() => {
                          setNewPlaylistTarget('musicly');
                          playClickSound('light');
                        }}
                      >
                        <Globe size={14} />
                        <span>Official Musicly Playlist (Public)</span>
                      </button>
                      <button
                        type="button"
                        className={`vinyl-type-pill ${newPlaylistTarget === 'user' ? 'is-active is-private' : ''}`}
                        onClick={() => {
                          setNewPlaylistTarget('user');
                          playClickSound('light');
                        }}
                      >
                        <Lock size={14} />
                        <span>Personal Playlist (Private)</span>
                      </button>
                    </div>
                    <div className="vinyl-type-description">
                      {newPlaylistTarget === 'musicly' ? (
                        <span>
                          <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 5, color: '#ffd166' }} />
                          Published publicly to all users worldwide under official Musicly Playlists.
                        </span>
                      ) : (
                        <span>
                          <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 5, color: '#8c8375' }} />
                          Private to your account only. Other users cannot view or play this playlist.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="vinyl-private-notice-box">
                    <div className="vinyl-private-notice-header">
                      <Lock size={14} className="vinyl-private-lock-icon" />
                      <span className="vinyl-private-notice-title">PERSONAL PLAYLIST (PRIVATE)</span>
                    </div>
                    <p className="vinyl-private-notice-desc">
                      This playlist is private and viewable/playable only by your account. Official Musicly playlists are curated exclusively by Admins.
                    </p>
                  </div>
                )}

                <div>
                  <label className="vinyl-playlist-input-label">PLAYLIST NAME</label>
                  <input
                    type="text"
                    className="vinyl-playlist-text-input"
                    placeholder={
                      effectiveIsAdmin && newPlaylistTarget === 'musicly'
                        ? "e.g. Midnight Jazz, Synthwave Highway, Sunset Acoustic..."
                        : "e.g. My Favorites, Study Mix, Night Vibes..."
                    }
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
                    <span>
                      {effectiveIsAdmin && newPlaylistTarget === 'musicly' ? 'Publish Public Playlist' : 'Create Private Playlist'}
                    </span>
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
                      {(selectedCustomPlaylist.isCustom || effectiveIsAdmin) && (
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
                      )}
                    </div>
                  )}

                  <span className="vinyl-playlist-detail-sub">
                    {selectedCustomPlaylist.tracks?.length || 0} track{selectedCustomPlaylist.tracks?.length === 1 ? '' : 's'} •{' '}
                    {selectedCustomPlaylist.isCustom
                      ? 'Personal Playlist'
                      : (selectedCustomPlaylist.subtitle || 'Editorial Selection')}
                  </span>

                  <div className="vinyl-playlist-detail-actions">
                    {(() => {
                      const isModalPlaylistPlaying = activePlayingPlaylistId === selectedCustomPlaylist.id && isPlaying;
                      return (
                        <button
                          type="button"
                          className="vinyl-btn-primary"
                          onClick={() => {
                            handlePlayPlaylist(selectedCustomPlaylist);
                          }}
                          disabled={!selectedCustomPlaylist.tracks || selectedCustomPlaylist.tracks.length === 0}
                          title={isModalPlaylistPlaying ? "Pause playlist playback" : "Play all tracks in playlist"}
                        >
                          {isModalPlaylistPlaying ? (
                            <>
                              <Pause size={15} fill="currentColor" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={15} fill="currentColor" />
                              <span>Play All</span>
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {(selectedCustomPlaylist.isCustom || effectiveIsAdmin) && (
                      <>
                        <button
                          type="button"
                          className="vinyl-btn-secondary"
                          onClick={() => {
                            setSongSearchQuery('');
                            setIsAddSongsToExistingOpen(true);
                            playClickSound('light');
                          }}
                          title="Add songs to this playlist"
                        >
                          <Plus size={15} />
                          <span>Add Songs</span>
                        </button>

                        <button
                          type="button"
                          className="vinyl-btn-delete-icon-only"
                          onClick={() => handleDeleteCustomPlaylist(selectedCustomPlaylist.id)}
                          title="Delete this entire playlist"
                          aria-label="Delete playlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
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
                    {(selectedCustomPlaylist.isCustom || effectiveIsAdmin) && (
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
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCustomPlaylist.tracks.map((track, idx) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const isTrackPlaying = isCurrent && isPlaying;
                      return (
                        <div
                          key={track.id}
                          className={`vinyl-playlist-track-row ${isCurrent ? 'is-current' : ''} ${isTrackPlaying ? 'is-playing' : ''} ${draggedModalTrackIndex === idx ? 'is-dragging' : ''} ${modalTrackDropTargetIndex === idx ? 'is-drop-target' : ''}`}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(idx));
                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'musicly_track', track, index: idx }));
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedTrackData(track);
                            setDraggedModalTrackIndex(idx);
                            playClickSound('light');
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (modalTrackDropTargetIndex !== idx) {
                              setModalTrackDropTargetIndex(idx);
                            }
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setModalTrackDropTargetIndex(idx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedModalTrackIndex !== null && draggedModalTrackIndex !== idx) {
                              handlePlaylistTracksReorder(draggedModalTrackIndex, idx);
                            }
                            setDraggedModalTrackIndex(null);
                            setModalTrackDropTargetIndex(null);
                            setDraggedTrackData(null);
                          }}
                          onDragEnd={() => {
                            setDraggedModalTrackIndex(null);
                            setModalTrackDropTargetIndex(null);
                            setDraggedTrackData(null);
                          }}
                          onClick={() => {
                            if (currentTrack?.id === track.id) {
                              onTogglePlay?.();
                              return;
                            }
                            setActivePlayingPlaylistId(selectedCustomPlaylist.id);
                            const remaining = filterTracksByLang(selectedCustomPlaylist.tracks.slice(idx + 1));
                            onSelectTrack?.(track, true, true);
                            if (onSetCustomQueue) {
                              onSetCustomQueue(remaining);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`#${idx + 1}: "${track.title}" by ${track.artist}`}
                        >
                          <div className="vinyl-playlist-row-leading">
                            <GripVertical size={13} className="vinyl-playlist-row-grip" />
                            {isTrackPlaying ? (
                              <span className="vinyl-playlist-mini-eq" title="Now Playing">
                                <span className="mini-eq-bar bar-1" />
                                <span className="mini-eq-bar bar-2" />
                                <span className="mini-eq-bar bar-3" />
                              </span>
                            ) : isCurrent ? (
                              <span className="vinyl-playlist-current-indicator" title="Current song (Paused)">
                                <Pause size={12} fill="#ffd166" color="#ffd166" />
                              </span>
                            ) : (
                              <span className="vinyl-playlist-track-num">{idx + 1}</span>
                            )}
                          </div>
                          <img src={track.cover} alt={track.title} className="vinyl-song-thumb" draggable={false} />
                          <div className="vinyl-song-meta">
                            <span className="vinyl-song-title">{track.title}</span>
                            <span className="vinyl-song-artist">{track.artist}</span>
                          </div>
                          {track.genre && (
                            <span className="vinyl-song-genre-tag">{track.genre}</span>
                          )}

                          {/* Quick Add to Up Next Queue */}
                          <button
                            type="button"
                            className="vinyl-playlist-add-to-queue-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToQueue(track, e);
                            }}
                            title={`Add "${track.title}" to Up Next queue`}
                            aria-label="Add to queue"
                          >
                            <ListPlus size={16} />
                          </button>

                          {/* + Add to my own custom playlist */}
                          <button
                            type="button"
                            className="vinyl-playlist-add-to-custom-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSongForPlaylistModal(track);
                              playClickSound('light');
                            }}
                            title={`Add "${track.title}" to your playlist`}
                            aria-label="Add to playlist"
                          >
                            <Plus size={16} strokeWidth={2.6} />
                          </button>

                          {/* Delete song individually beside each song */}
                          {(selectedCustomPlaylist.isCustom || effectiveIsAdmin) && (
                            <button
                              type="button"
                              className="vinyl-playlist-track-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Do you really want to remove "${track.title}" from this playlist?`)) {
                                  handleRemoveSongFromPlaylist(selectedCustomPlaylist.id, track.id);
                                }
                              }}
                              title={`Delete "${track.title}" from this playlist`}
                              aria-label={`Delete ${track.title} from playlist`}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

        {/* ================= 4. ADD SONG TO CUSTOM PLAYLIST MODAL ================= */}
        {songForPlaylistModal && (
          <div className="vinyl-playlist-modal-backdrop" onClick={() => setSongForPlaylistModal(null)}>
            <div
              className="vinyl-playlist-modal vinyl-add-song-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Add Track to Playlist"
            >
              <div className="vinyl-playlist-modal-header">
                <h3 className="vinyl-playlist-modal-title">ADD SONG TO PLAYLIST</h3>
                <button
                  type="button"
                  className="vinyl-playlist-close-btn"
                  onClick={() => setSongForPlaylistModal(null)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="vinyl-playlist-modal-body">
                {/* Track Preview Header */}
                <div className="vinyl-song-to-add-card">
                  <img
                    src={songForPlaylistModal.cover}
                    alt={songForPlaylistModal.title}
                    className="vinyl-song-to-add-thumb"
                  />
                  <div className="vinyl-song-to-add-info">
                    <span className="vinyl-song-to-add-title">{songForPlaylistModal.title}</span>
                    <span className="vinyl-song-to-add-artist">{songForPlaylistModal.artist}</span>
                  </div>
                </div>

                {/* Quick Create Section */}
                <div className="vinyl-quick-create-box">
                  <span className="vinyl-quick-create-label">CREATE NEW PLAYLIST WITH THIS SONG</span>
                  <div className="vinyl-quick-create-row">
                    <input
                      type="text"
                      className="vinyl-quick-create-input"
                      placeholder="e.g. Midnight Vibes, Favorites..."
                      value={newPlaylistNameFromSong}
                      onChange={(e) => setNewPlaylistNameFromSong(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreatePlaylistWithSong(songForPlaylistModal);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="vinyl-quick-create-btn"
                      onClick={() => handleCreatePlaylistWithSong(songForPlaylistModal)}
                      disabled={!newPlaylistNameFromSong.trim()}
                    >
                      <Plus size={15} />
                      <span>Create & Add</span>
                    </button>
                  </div>
                </div>

                {/* Existing Custom Playlists Section */}
                <div className="vinyl-add-to-playlists-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="vinyl-add-to-playlists-title">YOUR PRIVATE PLAYLISTS</span>
                    <span style={{ fontSize: '0.72rem', color: '#8c8375' }}>Private to you</span>
                  </div>
                  {customPlaylists.length === 0 ? (
                    <div className="vinyl-empty-custom-playlists-hint">
                      You haven't created any private playlists yet. Use the field above to start your first one!
                    </div>
                  ) : (
                    <div className="vinyl-add-to-playlists-stack">
                      {customPlaylists.map(pl => {
                        const isAdded = (pl.trackIds || []).includes(songForPlaylistModal.id);
                        return (
                          <div
                            key={pl.id}
                            className={`vinyl-add-to-item ${isAdded ? 'is-added' : ''}`}
                            onClick={() => handleToggleSongInCustomPlaylist(pl.id, songForPlaylistModal.id)}
                          >
                            <img src={pl.image} alt={pl.title} className="vinyl-add-to-thumb" />
                            <div className="vinyl-add-to-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="vinyl-add-to-name">{pl.title}</span>
                                <Lock size={10} style={{ color: '#ffd166', opacity: 0.8 }} />
                              </div>
                              <span className="vinyl-add-to-sub">
                                {pl.trackIds?.length || 0} track{pl.trackIds?.length === 1 ? '' : 's'} • Private
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`vinyl-add-to-check-btn ${isAdded ? 'is-checked' : ''}`}
                              title={isAdded ? 'Remove from playlist' : 'Add to playlist'}
                            >
                              {isAdded ? (
                                <>
                                  <CheckSquare size={18} />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={16} />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* If Admin: also allow adding/removing song to/from official Musicly playlists */}
                  {effectiveIsAdmin && publicPlaylists.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span className="vinyl-add-to-playlists-title" style={{ color: '#ffd166' }}>OFFICIAL MUSICLY PLAYLISTS</span>
                        <span style={{ fontSize: '0.72rem', color: '#ffd166', background: 'rgba(255, 209, 102, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                          Admin Curation (Public)
                        </span>
                      </div>
                      <div className="vinyl-add-to-playlists-stack">
                        {publicPlaylists.map(pl => {
                          const isAdded = (pl.trackIds || []).includes(songForPlaylistModal.id);
                          return (
                            <div
                              key={pl.id}
                              className={`vinyl-add-to-item ${isAdded ? 'is-added' : ''}`}
                              onClick={() => {
                                const curIds = pl.trackIds || [];
                                const newIds = curIds.includes(songForPlaylistModal.id)
                                  ? curIds.filter(id => id !== songForPlaylistModal.id)
                                  : [...curIds, songForPlaylistModal.id];
                                if (onUpdatePublicPlaylist) {
                                  onUpdatePublicPlaylist(pl.id, { trackIds: newIds });
                                }
                                playClickSound('light');
                              }}
                            >
                              <img src={pl.image || '/assets/images/lofi_scene.jpg'} alt={pl.title} className="vinyl-add-to-thumb" />
                              <div className="vinyl-add-to-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className="vinyl-add-to-name">{pl.title}</span>
                                  <Globe size={11} style={{ color: '#4ade80' }} />
                                </div>
                                <span className="vinyl-add-to-sub">
                                  {pl.trackIds?.length || 0} track{pl.trackIds?.length === 1 ? '' : 's'} • Public Worldwide
                                </span>
                              </div>
                              <button
                                type="button"
                                className={`vinyl-add-to-check-btn ${isAdded ? 'is-checked' : ''}`}
                                title={isAdded ? 'Remove from official playlist' : 'Add to official playlist'}
                              >
                                {isAdded ? (
                                  <>
                                    <CheckSquare size={18} />
                                    <span>Added</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={16} />
                                    <span>Add</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="vinyl-playlist-modal-footer">
                <button
                  type="button"
                  className="vinyl-btn-primary"
                  onClick={() => setSongForPlaylistModal(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
