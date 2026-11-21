import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Search, 
  Play, 
  Pause, 
  Heart, 
  Music, 
  Plus, 
  Sparkles, 
  Trash2,
  ListMusic,
  Download,
  Check,
  Tag,
  Globe,
  Crown,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { playPeacefulLikeSound, playClickSound } from '../utils/audioSynth';
import { 
  getLocalUserPlaylists, 
  loadUserPlaylists, 
  saveUserPlaylists,
  getLocalUserPersonalSongIds,
  loadUserPersonalSongIds,
  saveUserPersonalSongIds
} from '../utils/userPlaylistsDB';
import { GENRES, LANGUAGES, LANGUAGE_LABELS, isGhazalLanguage, isCountryLanguage, isRabindraSangeetLanguage, getAvailableSections, isTrackInLanguages } from '../data/tracks';
import { getUnifiedMusiclyPlaylists, PLAYLIST_LANGUAGES, normalizePlaylistLang, isSongMatchingPlaylistLang } from '../utils/publicPlaylistsDB';
import AppleGlassScrollbar from './AppleGlassScrollbar';
import { filterAndRankTracks } from '../utils/fuzzySearch';

const AVAILABLE_SECTIONS = GENRES.filter(g => g !== 'All');

const YouTubeIcon = ({ size = 13, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    style={{ color: '#ef4444', verticalAlign: 'middle', display: 'inline-block' }}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function PlaylistDrawer({
  isOpen,
  onClose,
  tracks,
  user = null,
  selectedLanguage = 'All',
  selectedLanguages = [],
  onSelectLanguage,
  currentTrack,
  isPlaying,
  activePlayingPlaylistId = null,
  onSetActivePlayingPlaylistId = null,
  onSetCustomQueue = null,
  onSelectTrack,
  onTogglePlay,
  favorites,
  onToggleFavorite,
  onOpenUpload,
  onOpenSongRequest,
  onDeleteTrack,
  deletedCount = 0,
  onRestoreDefaultTracks,
  onUpdateTrackGenres,
  onDownloadTrack,
  isAdmin = false,
  publicPlaylists = [],
  onPublishPublicPlaylist = null,
  onUpdatePublicPlaylist = null,
  onDeletePublicPlaylist = null,
  onOpenAdminDashboard = null,
  onOpenAuthModal = null,
  autoFocusSearch = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mainSource, setMainSource] = useState('musicly'); // 'musicly' | 'user' | 'favorites'
  const [viewMode, setViewMode] = useState('single'); // 'playlists' | 'single'
  const [drilldownPlaylistId, setDrilldownPlaylistId] = useState(null);
  const [userPersonalSongIds, setUserPersonalSongIds] = useState(() => getLocalUserPersonalSongIds(user));
  const [isAddSongsToPlaylistOpen, setIsAddSongsToPlaylistOpen] = useState(false);
  const [addSongSearchQuery, setAddSongSearchQuery] = useState('');
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState(() => getLocalUserPlaylists(user));
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistTarget, setNewPlaylistTarget] = useState('user'); // 'user' | 'musicly'
  const [newPlaylistLanguage, setNewPlaylistLanguage] = useState('All');
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState(null);
  const clickTimerRef = useRef(null);
  const popoverRef = useRef(null);
  const trackListRef = useRef(null);

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

  // Automatically autoselect language from active language filter when creating a playlist
  useEffect(() => {
    if (isCreatingPlaylist) {
      const activeLang = (activeLangs && activeLangs.length > 0 && activeLangs[0] !== 'All')
        ? normalizePlaylistLang(activeLangs[0])
        : 'All';
      setNewPlaylistLanguage(activeLang);
    }
  }, [isCreatingPlaylist, activeLangs]);

  // Sync user's private playlists and personal songs (local cache + cloud sync)
  useEffect(() => {
    setUserPlaylists(getLocalUserPlaylists(user));
    setUserPersonalSongIds(getLocalUserPersonalSongIds(user));
    if (isOpen) {
      loadUserPlaylists(user).then(loaded => {
        if (Array.isArray(loaded)) {
          setUserPlaylists(loaded);
        }
      });
      loadUserPersonalSongIds(user).then(loadedIds => {
        if (Array.isArray(loadedIds)) {
          setUserPersonalSongIds(loadedIds);
        }
      });
    }
  }, [isOpen, user]);

  // Close row playlist menus, add songs overlay, and drilldown when source or view mode changes
  useEffect(() => {
    setPlaylistMenuTrackId(null);
    setDrilldownPlaylistId(null);
    setIsAddSongsToPlaylistOpen(false);
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, [mainSource, viewMode]);

  // Auto-focus search input if opened in search mode
  useEffect(() => {
    if (isOpen && autoFocusSearch) {
      const timer = setTimeout(() => {
        const input = document.getElementById('drawer-search-input');
        if (input) {
          input.focus();
          input.select();
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocusSearch]);

  // Default to 'musicly' so official curated tracks are autoselected at first
  useEffect(() => {
    setMainSource('musicly');
  }, [user]);

  // Close when clicking outside with safe mount delay
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        !e.target.closest('.drawer-toggle-btn')
      ) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  const isAuthed = !!(user && !user.isAnonymous);

  const isYouTubeTrack = (t) => {
    return !!t.isYouTube || !!t.youtubeId || (t.audioUrl && (t.audioUrl.includes('youtube.com') || t.audioUrl.includes('youtu.be')));
  };

  const isOfflineTrack = (t) => {
    if (t.blob || t.hasOfflineAudio || t.isOfflineDownloaded || (t.audioUrl && (t.audioUrl.startsWith('blob:') || t.audioUrl.startsWith('data:')))) {
      return true;
    }
    if (isYouTubeTrack(t)) return false;
    return !!t.isCustom;
  };

  // Filter available sections based on selected languages
  const availableSections = useMemo(() => {
    return getAvailableSections(activeLangs);
  }, [activeLangs]);

  // When without login, show all official Musicly tracks (Public Library & Curated Catalog)
  const visibleTracks = tracks.filter(t => isAuthed ? (!t.isCustom || isOfflineTrack(t) || t.isCustom) : (!t.isCustom || !!t.isPublic));

  // Curated Official Musicly Playlists (Unified across all scenes and strictly language-curated)
  const musiclyPlaylists = useMemo(() => {
    return getUnifiedMusiclyPlaylists(tracks, publicPlaylists, selectedLanguages, selectedLanguage);
  }, [tracks, publicPlaylists, selectedLanguages, selectedLanguage]);

  // Enriched User Playlists with resolved track objects
  const enrichedUserPlaylists = useMemo(() => {
    return userPlaylists.map(pl => {
      const plTracks = (pl.trackIds || []).map(id => tracks.find(t => t.id === id)).filter(Boolean);
      return {
        ...pl,
        tracks: plTracks,
        count: plTracks.length,
        image: pl.image || plTracks[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
        isCustom: true
      };
    });
  }, [userPlaylists, tracks]);

  const currentPlaylists = useMemo(() => {
    return mainSource === 'musicly' ? musiclyPlaylists : enrichedUserPlaylists;
  }, [mainSource, musiclyPlaylists, enrichedUserPlaylists]);

  const activeDrilldownPlaylist = useMemo(() => {
    if (!drilldownPlaylistId) return null;
    return currentPlaylists.find(p => p.id === drilldownPlaylistId) || null;
  }, [currentPlaylists, drilldownPlaylistId]);

  const canEditDrilldown = Boolean(activeDrilldownPlaylist && (activeDrilldownPlaylist.isCustom || isAdmin));

  const displayedPlaylists = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return currentPlaylists;
    return filterAndRankTracks(currentPlaylists, q);
  }, [currentPlaylists, searchQuery]);

  const sortedFilteredTracks = useMemo(() => {
    const q = searchQuery.trim();

    if (viewMode === 'playlists') {
      if (!activeDrilldownPlaylist) return [];
      let baseList = activeDrilldownPlaylist.tracks || [];
      // Only filter by active language when not searching, so search finds any song
      if (!q && activeLangs.length > 0) {
        baseList = baseList.filter(t => isTrackInLanguages(t.language, activeLangs));
      }
      if (!q) return baseList;
      return filterAndRankTracks(baseList, q);
    }

    let baseList = [];
    if (mainSource === 'musicly') {
      baseList = visibleTracks.filter(t => !t.isCustom || !!t.isPublic);
    } else if (mainSource === 'user') {
      baseList = visibleTracks.filter(t => t.isCustom || userPersonalSongIds.includes(t.id));
    } else if (mainSource === 'favorites') {
      baseList = visibleTracks.filter(t => favorites.includes(t.id));
    }

    // When NOT searching, filter by active language; when searching, search across all songs!
    if (!q && activeLangs.length > 0 && mainSource === 'musicly') {
      baseList = baseList.filter(t => isTrackInLanguages(t.language, activeLangs));
    }

    if (!q) return baseList;

    // Use phonetic & fuzzy matching across all tracks
    return filterAndRankTracks(baseList, q);
  }, [viewMode, activeDrilldownPlaylist, mainSource, visibleTracks, userPersonalSongIds, favorites, searchQuery, activeLangs]);

  // Toggle personal song in user's collection (from clicking + in Musicly)
  const handleTogglePersonalSong = (track) => {
    if (!track) return;
    const isAlreadyAdded = userPersonalSongIds.includes(track.id);
    let updated;
    if (isAlreadyAdded) {
      updated = userPersonalSongIds.filter(id => id !== track.id);
    } else {
      updated = [track.id, ...userPersonalSongIds];
    }
    setUserPersonalSongIds(updated);
    saveUserPersonalSongIds(updated, user);
    playPeacefulLikeSound();
  };

  // Candidate songs available to add into the playlist
  const candidateAddSongs = useMemo(() => {
    if (!activeDrilldownPlaylist) return [];
    const isPublic = !activeDrilldownPlaylist.isCustom;
    const q = addSongSearchQuery.trim();
    const targetLang = activeDrilldownPlaylist?.language || 'All';
    const userPool = visibleTracks.filter(t => t.isCustom || userPersonalSongIds.includes(t.id));
    // For official playlists or when searching or when personal pool is empty: choose from all visible songs
    const pool = (isPublic || q || userPool.length === 0) ? visibleTracks : userPool;

    const langFiltered = pool.filter(t => isSongMatchingPlaylistLang(t, targetLang));
    if (!q) return langFiltered;
    return filterAndRankTracks(langFiltered, q);
  }, [visibleTracks, userPersonalSongIds, addSongSearchQuery, activeDrilldownPlaylist]);

  // Toggle play / pause for entire playlist
  const handlePlaylistTogglePlay = (playlist) => {
    if (!playlist) return;
    const plTracks = playlist.tracks || [];
    if (plTracks.length === 0) return;

    const isThisPlaylistPlaying = activePlayingPlaylistId === playlist.id;

    if (isThisPlaylistPlaying) {
      if (typeof onTogglePlay === 'function') {
        onTogglePlay();
      }
    } else {
      if (typeof onSelectTrack === 'function') {
        onSelectTrack(plTracks[0], true, true, playlist.id);
      }
      if (typeof onSetActivePlayingPlaylistId === 'function') {
        onSetActivePlayingPlaylistId(playlist.id);
      }
      if (typeof onSetCustomQueue === 'function') {
        onSetCustomQueue(plTracks.slice(1));
      }
      playPeacefulLikeSound();
    }
  };

  const handlePlayEntirePlaylist = handlePlaylistTogglePlay;

  // Single-click (play/pause) vs Double-click (just open songs) handler
  const handlePlaylistRowClick = (playlist) => {
    if (clickTimerRef.current) {
      // Second click within 250ms -> DOUBLE CLICK! Just open the songs
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setDrilldownPlaylistId(playlist.id);
      playClickSound('light');
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      // Single click -> toggle play/pause!
      handlePlaylistTogglePlay(playlist);
    }, 250);
  };

  const handlePlaylistRowDoubleClick = (playlist) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    // Double click -> just open the songs
    setDrilldownPlaylistId(playlist.id);
    playClickSound('light');
  };

  // Playlist management actions (Admin can create Public Official with Language; User creates Private)
  const handleCreateNewPlaylist = async (e) => {
    e?.preventDefault?.();
    const title = newPlaylistTitle.trim();
    if (!title) return;

    if (isAdmin && newPlaylistTarget === 'musicly') {
      try {
        if (onPublishPublicPlaylist) {
          await onPublishPublicPlaylist({
            title,
            trackIds: [],
            language: newPlaylistLanguage || 'All'
          });
        }
        setIsCreatingPlaylist(false);
        setNewPlaylistTitle('');
        setNewPlaylistLanguage('All');
        playPeacefulLikeSound();
      } catch (err) {
        alert(err.message || 'Failed to publish official playlist');
      }
      return;
    }

    const newPl = {
      id: 'playlist_' + Date.now(),
      title,
      trackIds: [],
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      createdAt: Date.now(),
      isCustom: true,
      isMusiclyOfficial: false
    };
    const updated = [newPl, ...userPlaylists];
    setUserPlaylists(updated);
    saveUserPlaylists(updated, user);
    setDrilldownPlaylistId(newPl.id);
    setIsCreatingPlaylist(false);
    setNewPlaylistTitle('');
    playPeacefulLikeSound();
  };

  const handleToggleSongInPlaylist = async (playlistId, trackId) => {
    // 1. If this is an official Musicly playlist and admin is editing
    if (activeDrilldownPlaylist && !activeDrilldownPlaylist.isCustom) {
      if (onUpdatePublicPlaylist) {
        const curIds = Array.isArray(activeDrilldownPlaylist.trackIds) ? activeDrilldownPlaylist.trackIds : [];
        const isAlreadyIn = curIds.includes(trackId);
        const newIds = isAlreadyIn 
          ? curIds.filter(id => id !== trackId)
          : [...curIds, trackId];
        await onUpdatePublicPlaylist(playlistId, { trackIds: newIds });
        playPeacefulLikeSound();
      }
      return;
    }

    // 2. Custom User Playlist
    const target = userPlaylists.find(p => p.id === playlistId);
    if (!target) return;
    const currentIds = Array.isArray(target.trackIds) ? target.trackIds : [];
    const isAlreadyIn = currentIds.includes(trackId);
    const newIds = isAlreadyIn 
      ? currentIds.filter(id => id !== trackId)
      : [...currentIds, trackId];

    const updated = userPlaylists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          trackIds: newIds,
          subtitle: `${newIds.length} song${newIds.length === 1 ? '' : 's'} in this list`
        };
      }
      return p;
    });

    setUserPlaylists(updated);
    saveUserPlaylists(updated, user);
    playPeacefulLikeSound();
  };

  const handleDeletePlaylist = async (playlistId) => {
    // 1. If this is an official Musicly playlist
    if (activeDrilldownPlaylist && !activeDrilldownPlaylist.isCustom) {
      if (isAdmin && onDeletePublicPlaylist) {
        if (window.confirm(`Delete official playlist "${activeDrilldownPlaylist.title}"? It will be removed worldwide.`)) {
          await onDeletePublicPlaylist(playlistId);
          setDrilldownPlaylistId(null);
          playClickSound();
        }
      }
      return;
    }

    // 2. Custom User Playlist
    const target = userPlaylists.find(p => p.id === playlistId);
    if (!target) return;
    if (window.confirm(`Delete private playlist "${target.title}"?`)) {
      const updated = userPlaylists.filter(p => p.id !== playlistId);
      setUserPlaylists(updated);
      saveUserPlaylists(updated, user);
      if (drilldownPlaylistId === playlistId) {
        setDrilldownPlaylistId(null);
      }
      playClickSound();
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getCleanGenres = (t) => {
    if (!t) return ['Lo-Fi'];
    let items = [];
    if (Array.isArray(t.genres) && t.genres.length > 0) {
      items = t.genres.filter(g => g && typeof g === 'string' && g.toLowerCase() !== 'custom');
    } else if (t.genre && typeof t.genre === 'string' && t.genre.toLowerCase() !== 'custom') {
      items = t.genre.split(',').map(s => s.trim()).filter(g => g && g.toLowerCase() !== 'custom');
    }
    return items.length > 0 ? items : ['Lo-Fi'];
  };

  const formatGenre = (t) => {
    const items = getCleanGenres(t);
    if (items.length <= 1) return items[0] || 'Lo-Fi';
    if (items.length === 2) {
      const combined = `${items[0]}, ${items[1]}`;
      return combined.length <= 18 ? combined : `${items[0]} +1`;
    }
    // When more genres are present (> 2): show in short e.g. "Lo-Fi, Country +4"
    if (items[0].length + items[1].length <= 16) {
      return `${items[0]}, ${items[1]} +${items.length - 2}`;
    }
    return `${items[0]} +${items.length - 1}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="playlist-floating-popover" 
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="drawer-header">
        <div className="drawer-title-group">
          <ListMusic size={18} className="drawer-header-icon" />
          <h3>Music Library</h3>
        </div>
        <button id="btn-close-drawer" className="drawer-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="drawer-search-box">
        <Search size={16} className="search-icon" />
        <input 
          id="drawer-search-input"
          type="text" 
          placeholder="Search songs, artists, genres..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category / Filter Tabs: ONLY Musicly, User's Own Playlist, and Like */}
      <div className="drawer-tabs-row">
        <div className="drawer-tabs-group">
          {/* 1. Official Musicly (Autoselected at first, with Musicly icon) */}
          <button 
            className={`drawer-tab-btn musicly-tab-btn ${mainSource === 'musicly' ? 'active' : ''}`}
            onClick={() => setMainSource('musicly')}
            title="Musicly Official Catalog & Playlists"
            aria-label="Musicly"
          >
            <img 
              src="/favicon.svg" 
              alt="Musicly" 
              className="drawer-musicly-tab-icon"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span>Musicly ({musiclyPlaylists.reduce((acc, p) => acc + (p.tracks?.length || 0), 0) > 0 ? (visibleTracks.filter(t => (!t.isCustom || !!t.isPublic) && (activeLangs.length === 0 || isTrackInLanguages(t.language, activeLangs))).length) : 0})</span>
          </button>

          {/* 2. Mine Playlist (Only accessed and seen by the user respectively) */}
          <button 
            className={`drawer-tab-btn ${mainSource === 'user' ? 'active' : ''}`}
            onClick={() => setMainSource('user')}
            title="Mine Playlist — Private mixes and songs only seen by you"
            aria-label="Mine Playlist"
          >
            <ListMusic size={13} />
            <span>Mine Playlist{userPlaylists.length > 0 ? ` (${userPlaylists.length})` : ''}</span>
          </button>

          {/* 3. Liked Songs */}
          <button 
            className={`drawer-tab-btn ${mainSource === 'favorites' ? 'active' : ''}`}
            onClick={() => setMainSource('favorites')}
            title={`Liked (${favorites.length})`}
            aria-label={`Liked (${favorites.length})`}
          >
            <Heart size={13} fill={mainSource === 'favorites' ? '#ff4b4b' : 'currentColor'} />
            <span>({favorites.length})</span>
          </button>
        </div>

        <div className="drawer-actions-right">
          {isAdmin && onOpenAdminDashboard && (
            <button 
              className="drawer-tab-btn admin-btn"
              onClick={onOpenAdminDashboard}
              title="Admin Dashboard: Manage Musicly Public Library"
            >
              <Crown size={13} style={{ color: '#ffd166' }} /> Admin
            </button>
          )}
          <button 
            className="drawer-tab-btn add-btn"
            onClick={() => {
              if (!user || user.isAnonymous) {
                if (typeof onOpenAuthModal === 'function') {
                  onOpenAuthModal();
                  return;
                }
              }
              onOpenUpload?.();
            }}
            title="Add your own music"
          >
            <Plus size={13} /> Add
          </button>
          {!isAdmin && (
            <button 
              className="drawer-tab-btn request-btn"
              onClick={() => {
                if (!user || user.isAnonymous) {
                  if (typeof onOpenAuthModal === 'function') {
                    onOpenAuthModal();
                    return;
                  }
                }
                onOpenSongRequest?.();
              }}
              title="Request a song for Musicly Public Library"
            >
              <Music size={13} /> Request
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector: Choose Playlist or Play Songs Singly */}
      {(mainSource === 'musicly' || mainSource === 'user') && (
        <div className="drawer-mode-toggle-row">
          <div className="drawer-mode-toggle-pill">
            <button
              type="button"
              className={`drawer-mode-toggle-btn ${viewMode === 'playlists' ? 'active' : ''}`}
              onClick={() => setViewMode('playlists')}
              title={mainSource === 'musicly' ? "Browse Musicly Curated Playlists" : "Browse Your Private Playlists"}
            >
              <ListMusic size={13} />
              <span>Playlists</span>
            </button>
            <button
              type="button"
              className={`drawer-mode-toggle-btn ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
              title={mainSource === 'musicly' ? "Play Musicly songs individually" : "Play your uploaded songs individually"}
            >
              <Music size={13} />
              <span>Single Songs</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Language Filter Chips (Only in Musicly Single Songs mode) */}
      {mainSource === 'musicly' && viewMode === 'single' && (
        <div 
          className="drawer-lang-filter-bar"
          style={!isAuthed ? { justifyContent: 'center', padding: '4px 14px 12px 14px' } : {}}
        >
          <div 
            className="lang-filter-chips"
            style={!isAuthed ? { justifyContent: 'center' } : {}}
          >
            {LANGUAGES.map(lang => {
              const isActive = activeLangs.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  className={`drawer-lang-chip ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (typeof onSelectLanguage === 'function') onSelectLanguage(lang);
                  }}
                  title={isActive 
                    ? `Click to deselect ${LANGUAGE_LABELS[lang] || lang}` 
                    : `Filter by ${LANGUAGE_LABELS[lang] || lang}`}
                >
                  {isActive && <Check size={11} className="chip-active-check" />}
                  <span>{LANGUAGE_LABELS[lang] || lang}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content: Either Playlists Catalog or Track List */}
      <div className="drawer-track-list-container">
        {viewMode === 'playlists' && !activeDrilldownPlaylist ? (
          /* SHOW ONLY THE PLAYLIST'S NAMES HERE */
          <div className="drawer-track-list" ref={trackListRef}>
            <div className="drawer-playlists-cards-list">
              {(mainSource === 'user' || (mainSource === 'musicly' && isAdmin)) && (
                <div className="drawer-new-playlist-row">
                  {!isCreatingPlaylist ? (
                    <button
                      type="button"
                      className="drawer-create-playlist-card"
                      onClick={() => {
                        const activeLang = (activeLangs && activeLangs.length > 0 && activeLangs[0] !== 'All')
                          ? normalizePlaylistLang(activeLangs[0])
                          : 'All';
                        setNewPlaylistLanguage(activeLang);
                        setNewPlaylistTarget(mainSource === 'musicly' && isAdmin ? 'musicly' : 'user');
                        setIsCreatingPlaylist(true);
                        playClickSound('light');
                      }}
                    >
                      <div className="drawer-create-pl-icon">
                        <Plus size={16} />
                      </div>
                      <div className="drawer-create-pl-text">
                        <span className="drawer-create-pl-title">
                          {mainSource === 'musicly' && isAdmin ? '+ Create Official Musicly Playlist' : '+ Create New Playlist'}
                        </span>
                        <span className="drawer-create-pl-desc">
                          {mainSource === 'musicly' && isAdmin ? 'Publish public playlist curated by language' : 'Build your personal private tracklist'}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <form onSubmit={handleCreateNewPlaylist} className="drawer-new-playlist-box full-width">
                      {isAdmin && (
                        <div className="drawer-pl-type-toggle">
                          <button
                            type="button"
                            className={`drawer-type-toggle-btn ${newPlaylistTarget === 'musicly' ? 'active' : ''}`}
                            onClick={() => setNewPlaylistTarget('musicly')}
                          >
                            <Globe size={12} /> Official Public
                          </button>
                          <button
                            type="button"
                            className={`drawer-type-toggle-btn ${newPlaylistTarget === 'user' ? 'active' : ''}`}
                            onClick={() => setNewPlaylistTarget('user')}
                          >
                            Personal Private
                          </button>
                        </div>
                      )}

                      {isAdmin && newPlaylistTarget === 'musicly' && (
                        <div className="drawer-new-playlist-lang-row">
                          <span className="drawer-new-pl-lang-label">Show in Language:</span>
                          <div className="drawer-new-pl-lang-pills">
                            {PLAYLIST_LANGUAGES.map(lang => (
                              <button
                                key={lang}
                                type="button"
                                className={`drawer-lang-pill ${newPlaylistLanguage === lang ? 'active' : ''}`}
                                onClick={() => setNewPlaylistLanguage(lang)}
                              >
                                {lang}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="drawer-new-pl-input-row">
                        <input
                          type="text"
                          placeholder={newPlaylistTarget === 'musicly' ? 'Official playlist name (e.g. Hindi Chill, Lo-Fi Beat)...' : 'New private playlist name...'}
                          value={newPlaylistTitle}
                          onChange={(e) => setNewPlaylistTitle(e.target.value)}
                          autoFocus
                          className="drawer-new-playlist-input"
                        />
                        <button type="submit" className="drawer-new-playlist-btn submit">
                          {newPlaylistTarget === 'musicly' ? 'Publish' : 'Create'}
                        </button>
                        <button 
                          type="button" 
                          className="drawer-new-playlist-btn cancel" 
                          onClick={() => { setIsCreatingPlaylist(false); setNewPlaylistTitle(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {displayedPlaylists.length === 0 ? (
                <div className="drawer-empty-state">
                  <ListMusic size={30} className="empty-icon" />
                  <p>
                    {mainSource === 'user'
                      ? 'No private playlists found. Click "+ Create New Playlist" above!'
                      : 'No playlists match your active language filter.'}
                  </p>
                </div>
              ) : (
                displayedPlaylists.map(pl => {
                  const isThisPlaying = activePlayingPlaylistId === pl.id && isPlaying;
                  const count = pl.tracks ? pl.tracks.length : (pl.trackIds ? pl.trackIds.length : 0);
                  return (
                    <div
                      key={pl.id}
                      className={`drawer-playlist-item-card ${isThisPlaying ? 'is-playing' : ''}`}
                      onClick={() => handlePlaylistRowClick(pl)}
                      onDoubleClick={() => handlePlaylistRowDoubleClick(pl)}
                      title={pl.title}
                    >
                      <div className="drawer-pl-thumb-wrap">
                        <img 
                          src={pl.image || (pl.tracks && pl.tracks[0]?.cover) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'} 
                          alt={pl.title}
                          className="drawer-pl-thumb"
                        />
                        <div className="drawer-pl-overlay-play">
                          {isThisPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </div>
                      </div>

                      <div className="drawer-pl-text-details">
                        <div className="drawer-pl-name-row">
                          <h4 className="drawer-pl-name">{pl.title}</h4>
                          {isThisPlaying && (
                            <span className="drawer-pl-playing-tag">PLAYING</span>
                          )}
                        </div>
                        <span className="drawer-pl-count">
                          {count} {count === 1 ? 'song' : 'songs'} {pl.isCustom ? '• Mine' : '• Curated by Musicly'}
                        </span>
                      </div>

                      <div className="drawer-pl-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="drawer-pl-card-play-btn"
                          onClick={() => handlePlaylistTogglePlay(pl)}
                          title={isThisPlaying ? `Pause "${pl.title}"` : `Play "${pl.title}"`}
                        >
                          {isThisPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* SHOW SONGS: Either drilled down into a playlist OR in single songs mode OR liked songs */
          <div className="drawer-track-list" ref={trackListRef}>
            {viewMode === 'playlists' && activeDrilldownPlaylist && (
              <div className="drawer-drilldown-header">
                <button
                  type="button"
                  className="drawer-back-to-playlists-btn"
                  onClick={() => {
                    setDrilldownPlaylistId(null);
                    playClickSound('light');
                  }}
                  title="Back to all playlists"
                >
                  <ChevronLeft size={15} />
                  <span>All Playlists</span>
                </button>
                <div className="drawer-drilldown-header-content">
                  <div className="drawer-drilldown-info">
                    <div className="drawer-playlist-badge">
                      {activeDrilldownPlaylist.isCustom ? "MINE PLAYLIST" : "OFFICIAL MUSICLY PLAYLIST"}
                    </div>
                    <h3 className="drawer-drilldown-title">{activeDrilldownPlaylist.title}</h3>
                    <span className="drawer-drilldown-meta">
                      {activeDrilldownPlaylist.tracks?.length || 0} songs • {activeDrilldownPlaylist.isCustom ? "Accessible and seen only by you" : "Curated by Musicly"}
                    </span>
                  </div>
                  <div className="drawer-drilldown-actions">
                    {activeDrilldownPlaylist.tracks?.length > 0 && (
                      <button
                        type="button"
                        className="drawer-pl-action-btn play"
                        onClick={() => handlePlayEntirePlaylist(activeDrilldownPlaylist)}
                        title={`Play all songs in "${activeDrilldownPlaylist.title}"`}
                      >
                        <Play size={12} fill="currentColor" /> Play All
                      </button>
                    )}
                    {canEditDrilldown && (
                      <>
                        <button
                          type="button"
                          className={`drawer-pl-action-btn add-songs ${isAddSongsToPlaylistOpen ? 'active' : ''}`}
                          onClick={() => {
                            setIsAddSongsToPlaylistOpen(prev => !prev);
                            setAddSongSearchQuery('');
                            playClickSound('light');
                          }}
                          title={activeDrilldownPlaylist.isCustom ? "Add personal choice songs to this playlist" : "Add songs to this official playlist"}
                        >
                          <Plus size={12} /> {isAddSongsToPlaylistOpen ? 'Close Picker' : 'Add Songs'}
                        </button>
                        <button
                          type="button"
                          className="drawer-pl-action-btn delete"
                          onClick={() => {
                            handleDeletePlaylist(activeDrilldownPlaylist.id);
                          }}
                          title={activeDrilldownPlaylist.isCustom ? "Delete this private playlist" : "Delete this official playlist"}
                          aria-label="Delete playlist"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* If Add Songs picker is open for this playlist */}
            {viewMode === 'playlists' && canEditDrilldown && isAddSongsToPlaylistOpen && (
              <div className="drawer-add-songs-box">
                <div className="drawer-add-songs-box-header">
                  <div className="drawer-add-songs-box-info">
                    <span className="drawer-add-songs-box-title">Add Songs to "{activeDrilldownPlaylist.title}"</span>
                    <span className="drawer-add-songs-box-sub">
                      {activeDrilldownPlaylist.isCustom 
                        ? "Choose from your personal choice songs or search all tracks" 
                        : "Choose from all available Musicly songs"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="drawer-add-songs-box-done-btn"
                    onClick={() => setIsAddSongsToPlaylistOpen(false)}
                  >
                    Done
                  </button>
                </div>
                <div className="drawer-add-songs-box-search">
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search songs to add..."
                    value={addSongSearchQuery}
                    onChange={(e) => setAddSongSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {addSongSearchQuery && (
                    <button className="clear-search-btn" onClick={() => setAddSongSearchQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="drawer-add-songs-box-list">
                  {candidateAddSongs.length === 0 ? (
                    <div className="drawer-add-songs-empty">
                      <p>
                        {addSongSearchQuery 
                          ? `No songs matching "${addSongSearchQuery}" found.` 
                          : 'No songs available to add in this language.'}
                      </p>
                    </div>
                  ) : (
                    candidateAddSongs.map(t => {
                      const isAlreadyIn = Array.isArray(activeDrilldownPlaylist.trackIds) && activeDrilldownPlaylist.trackIds.includes(t.id);
                      return (
                        <div key={t.id} className={`drawer-add-song-row ${isAlreadyIn ? 'is-added' : ''}`}>
                          <img src={t.cover} alt={t.title} className="track-mini-thumb" />
                          <div className="track-text-details">
                            <span className="track-row-title">{t.title}</span>
                            <span className="track-row-artist">{t.artist}</span>
                          </div>
                          <button
                            type="button"
                            className={`drawer-add-song-chip-btn ${isAlreadyIn ? 'is-in' : ''}`}
                            onClick={() => handleToggleSongInPlaylist(activeDrilldownPlaylist.id, t.id)}
                            title={isAlreadyIn ? "Remove from this playlist" : "Add to this playlist"}
                          >
                            {isAlreadyIn ? <Check size={11} color="#4ade80" /> : <Plus size={11} />}
                            <span>{isAlreadyIn ? 'Added' : 'Add'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {sortedFilteredTracks.length === 0 ? (
              <div className="drawer-empty-state">
                <Sparkles size={30} className="empty-icon" />
                <p>
                  {mainSource === 'favorites'
                    ? 'No liked songs yet. Click the heart icon on any song to add it to your favorites!'
                    : viewMode === 'playlists' && activeDrilldownPlaylist
                    ? (canEditDrilldown 
                        ? `No songs in "${activeDrilldownPlaylist.title}" yet. Click "+ Add Songs" below to add songs!`
                        : `No songs found in "${activeDrilldownPlaylist.title}".`)
                    : mainSource === 'user' && viewMode === 'single'
                    ? 'No personal choice songs added yet. In the Musicly tab, click the + icon on any song to add it here!'
                    : 'No songs found'}
                </p>
                {viewMode === 'playlists' && canEditDrilldown && !isAddSongsToPlaylistOpen && (
                  <button
                    type="button"
                    className="drawer-empty-add-songs-btn"
                    onClick={() => {
                      setIsAddSongsToPlaylistOpen(true);
                      setAddSongSearchQuery('');
                      playClickSound('light');
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Songs to Playlist</span>
                  </button>
                )}
              </div>
            ) : (
          sortedFilteredTracks.map((track, idx) => {
            const isSelected = currentTrack?.id === track.id;
            const isFav = favorites.includes(track.id);
            const isOffline = isOfflineTrack(track);
            const isEditingThis = editingTrackId === track.id;

            return (
              <React.Fragment key={track.id}>
                <div 
                  className={`drawer-track-row ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      onTogglePlay();
                    } else {
                      if (activeDrilldownPlaylist) {
                        onSelectTrack(track, true, true, activeDrilldownPlaylist.id);
                        if (typeof onSetActivePlayingPlaylistId === 'function') {
                          onSetActivePlayingPlaylistId(activeDrilldownPlaylist.id);
                        }
                        if (typeof onSetCustomQueue === 'function') {
                          const remaining = sortedFilteredTracks.slice(idx + 1);
                          onSetCustomQueue(remaining);
                        }
                      } else {
                        onSelectTrack(track);
                        if (typeof onSetActivePlayingPlaylistId === 'function') {
                          onSetActivePlayingPlaylistId(null);
                        }
                      }
                    }
                  }}
                >
                  <div className="track-number-wrapper">
                    {isSelected && isPlaying ? (
                      <div className="mini-equalizer">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <span className="track-index">{idx + 1}</span>
                    )}
                  </div>

                  <img src={track.cover} alt={track.title} className="track-mini-thumb" />

                  <div className="track-text-details">
                    <h4 className="track-row-title">{track.title}</h4>
                    <div className="track-row-sub">
                      {track.artist && track.artist.trim() !== '' && (
                        <>
                          <span className="track-row-artist">{track.artist}</span>
                          <span className="dot-sep">•</span>
                        </>
                      )}
                      <button
                        type="button"
                        className="genre-tag-interactive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrackId(isEditingThis ? null : track.id);
                        }}
                        title={`Genres: ${getCleanGenres(track).join(', ')} • Click to edit`}
                      >
                        <span className="track-row-genre">{formatGenre(track)}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>▾</span>
                      </button>
                      {track.isPublic && (
                        <span className="track-public-tag" title="Official Musicly Public Library Track (Visible to all visitors)" aria-label="Public Track">
                          <Globe size={11} />
                        </span>
                      )}
                      {isOffline && (
                        <span className="track-offline-tag" title="Saved locally in browser memory for 100% offline listening" aria-label="Offline Track">
                          <Download size={11} />
                        </span>
                      )}
                      {isYouTubeTrack(track) && (
                        <span className="track-youtube-tag" title="YouTube Stream • Stored permanently under your account" aria-label="YouTube Stream">
                          <YouTubeIcon size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="track-row-actions">
                    <span className="track-row-duration">{formatDuration(track.duration)}</span>

                    {/* In Musicly: show + icon to add this song to Mine Playlist (Single Songs).
                        In Mine Playlist: do NOT show this + icon as it is already added! */}
                    {mainSource === 'musicly' && (
                      <button 
                        type="button"
                        className={`row-add-pl-btn ${userPersonalSongIds.includes(track.id) ? 'is-added' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePersonalSong(track);
                        }}
                        title={userPersonalSongIds.includes(track.id) 
                          ? "Added to Mine Playlist Single Songs • Click to remove" 
                          : "Add to Mine Playlist (Single Songs)"}
                        aria-label="Add to Mine Playlist"
                      >
                        {userPersonalSongIds.includes(track.id) ? (
                          <Check size={14} color="#4ade80" />
                        ) : (
                          <Plus size={14} />
                        )}
                      </button>
                    )}

                    {/* Remove from this playlist button when in playlist drilldown mode */}
                    {viewMode === 'playlists' && activeDrilldownPlaylist && canEditDrilldown && (
                      <button 
                        type="button"
                        className="row-remove-pl-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSongInPlaylist(activeDrilldownPlaylist.id, track.id);
                        }}
                        title={`Remove from "${activeDrilldownPlaylist.title}"`}
                        aria-label="Remove from playlist"
                      >
                        <Trash2 size={13} color="#f87171" />
                      </button>
                    )}

                    {/* Download button for saving offline and downloading audio file */}
                    <button 
                      type="button"
                      className={`row-download-btn ${isOffline ? 'is-downloaded' : ''}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!user || user.isAnonymous) {
                          if (typeof onOpenAuthModal === 'function') {
                            onOpenAuthModal();
                          }
                          return;
                        }
                        if (downloadingTrackId || !onDownloadTrack) return;
                        setDownloadingTrackId(track.id);
                        const safetyTimeout = setTimeout(() => setDownloadingTrackId(null), 3000);
                        try {
                          await onDownloadTrack(track);
                        } catch (err) {
                          console.error("Download error:", err);
                        } finally {
                          clearTimeout(safetyTimeout);
                          setDownloadingTrackId(null);
                        }
                      }}
                      title={isOffline ? "Downloaded (Click to download file again)" : "Download track (.mp3)"}
                      disabled={downloadingTrackId === track.id}
                      aria-label="Download track"
                    >
                      {downloadingTrackId === track.id ? (
                        <span className="mini-download-spinner" />
                      ) : isOffline ? (
                        <Check size={14} color="#4ade80" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    
                    <button 
                      className={`row-heart-btn ${isFav ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFav) {
                          playPeacefulLikeSound();
                        }
                        onToggleFavorite(track.id);
                      }}
                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      aria-label={isFav ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart size={15} fill={isFav ? '#ff4b60' : 'transparent'} color={isFav ? '#ff4b60' : 'rgba(255,255,255,0.4)'} />
                    </button>

                    {/* Delete Track Button - Only visible for admin or owner of custom upload */}
                    {(isAdmin || (isAuthed && track.isCustom && (!track.uploadedBy || track.uploadedBy === user?.uid))) && (
                      <button 
                        type="button"
                        className="row-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onDeleteTrack) {
                            onDeleteTrack(track.id);
                          }
                        }}
                        title={`Remove "${track.title}" from library`}
                        aria-label={`Remove "${track.title}" from library`}
                      >
                        <Trash2 size={14} color="#f87171" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Section / Genre Editor */}
                {isEditingThis && (
                  <div className="inline-genre-editor" onClick={(e) => e.stopPropagation()}>
                    <div className="genre-editor-header">
                      <span>Assign to Section(s):</span>
                      <button 
                        type="button" 
                        className="genre-editor-close"
                        onClick={() => setEditingTrackId(null)}
                      >
                        Done
                      </button>
                    </div>
                    <div className="genre-editor-chips">
                      {availableSections.map((sec) => {
                        const currentSections = Array.isArray(track.genres) && track.genres.length > 0
                          ? track.genres.filter(g => g && g.toLowerCase() !== 'custom')
                          : (track.genre ? track.genre.split(',').map(s => s.trim()).filter(g => g && g.toLowerCase() !== 'custom') : ['Lo-Fi']);
                        const isSectionSelected = currentSections.some(s => s.toLowerCase() === sec.toLowerCase());

                        return (
                          <button
                            key={sec}
                            type="button"
                            className={`genre-edit-chip ${isSectionSelected ? 'is-selected' : ''}`}
                            onClick={() => {
                              let nextSections;
                              if (isSectionSelected) {
                                if (currentSections.length === 1) return; // Keep at least one section
                                nextSections = currentSections.filter(s => s.toLowerCase() !== sec.toLowerCase());
                              } else {
                                nextSections = [...currentSections, sec];
                              }
                              if (onUpdateTrackGenres) {
                                onUpdateTrackGenres(track.id, nextSections);
                              }
                            }}
                          >
                            {isSectionSelected ? <Check size={11} /> : <Plus size={11} />}
                            <span>{sec}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
          </div>
        )}

        {/* Apple VisionOS Capsule Glass Scrollbar */}
        <AppleGlassScrollbar targetRef={trackListRef} />
      </div>
    </div>
  );
}
