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
  ShieldCheck
} from 'lucide-react';
import { playPeacefulLikeSound } from '../utils/audioSynth';
import { getLocalUserPlaylists, loadUserPlaylists, saveUserPlaylists } from '../utils/userPlaylistsDB';
import { GENRES, LANGUAGES, LANGUAGE_LABELS, isGhazalLanguage, isCountryLanguage, isRabindraSangeetLanguage, getAvailableSections, isTrackInLanguages } from '../data/tracks';
import AppleGlassScrollbar from './AppleGlassScrollbar';

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
  onOpenAdminDashboard = null,
  onOpenAuthModal = null,
  autoFocusSearch = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mainSource, setMainSource] = useState('musicly'); // 'musicly' | 'user' | 'favorites'
  const [viewMode, setViewMode] = useState('single'); // 'playlists' | 'single'
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState(() => getLocalUserPlaylists(user));
  const [selectedUserPlaylistId, setSelectedUserPlaylistId] = useState(null);
  const [selectedMusiclyPlaylistId, setSelectedMusiclyPlaylistId] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState(null);
  const popoverRef = useRef(null);
  const trackListRef = useRef(null);

  // Sync user's private playlists (local cache + cloud sync)
  useEffect(() => {
    setUserPlaylists(getLocalUserPlaylists(user));
    if (isOpen) {
      loadUserPlaylists(user).then(loaded => {
        if (Array.isArray(loaded)) {
          setUserPlaylists(loaded);
        }
      });
    }
  }, [isOpen, user]);

  // Set default selected playlist when user playlists load
  useEffect(() => {
    if (userPlaylists.length > 0) {
      if (!selectedUserPlaylistId || !userPlaylists.some(p => p.id === selectedUserPlaylistId)) {
        setSelectedUserPlaylistId(userPlaylists[0].id);
      }
    } else {
      setSelectedUserPlaylistId(null);
    }
  }, [userPlaylists, selectedUserPlaylistId]);

  // Close row playlist menus when main source or view mode changes
  useEffect(() => {
    setPlaylistMenuTrackId(null);
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

  // Filter available sections based on selected languages
  const availableSections = useMemo(() => {
    return getAvailableSections(activeLangs);
  }, [activeLangs]);

  // When without login, show all official Musicly tracks (Public Library & Curated Catalog)
  const visibleTracks = tracks.filter(t => isAuthed ? (!t.isCustom || isOfflineTrack(t) || t.isCustom) : (!t.isCustom || !!t.isPublic));

  // Curated Official Musicly Playlists
  const musiclyPlaylists = useMemo(() => {
    const list = [];
    const official = visibleTracks.filter(t => !t.isCustom || !!t.isPublic);

    // 1. Vintage Hi-Fi & 80s
    const retro = official.filter(t => (t.genre || '').toLowerCase().includes('retro') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('retro'))));
    if (retro.length > 0) {
      list.push({ id: 'vintage_retro', title: 'Vintage Hi-Fi & 80s', tracks: retro, trackIds: retro.map(t => t.id) });
    }

    // 2. Late Night Lo-Fi
    const lofi = official.filter(t => (t.genre || '').toLowerCase().includes('lo-fi') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('lo-fi'))));
    if (lofi.length > 0) {
      list.push({ id: 'latenight_lofi', title: 'Late Night Lo-Fi', tracks: lofi, trackIds: lofi.map(t => t.id) });
    }

    // 3. Country Roads & Roots
    const country = official.filter(t => (t.genre || '').toLowerCase().includes('country') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('country'))));
    if (country.length > 0) {
      list.push({ id: 'country_roots', title: 'Country Roads & Roots', tracks: country, trackIds: country.map(t => t.id) });
    }

    // 4. Indie Acoustic Sessions
    const indie = official.filter(t => (t.genre || '').toLowerCase().includes('indie') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('indie'))));
    if (indie.length > 0) {
      list.push({ id: 'indie_warmth', title: 'Indie Acoustic Sessions', tracks: indie, trackIds: indie.map(t => t.id) });
    }

    // 5. Timeless Ghazals
    const ghazals = official.filter(t => (t.genre || '').toLowerCase().includes('ghazal') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('ghazal'))));
    if (ghazals.length > 0) {
      list.push({ id: 'timeless_ghazals', title: 'Timeless Ghazals & Mehfil', tracks: ghazals, trackIds: ghazals.map(t => t.id) });
    }

    // 6. Rabindra Sangeet & Folk
    const bengali = official.filter(t => (t.genre || '').toLowerCase().includes('rabindra') || (t.title || '').toLowerCase().includes('majhe'));
    if (bengali.length > 0) {
      list.push({ id: 'bengali_classics', title: 'Rabindra Sangeet & Folk', tracks: bengali, trackIds: bengali.map(t => t.id) });
    }

    // 7. Peace
    const peace = official.filter(t => (t.genre || '').toLowerCase().includes('peace') || (t.title || '').toLowerCase().includes('peace'));
    if (peace.length > 0) {
      list.push({ id: 'peace_playlist', title: 'Peace', tracks: peace, trackIds: peace.map(t => t.id) });
    }

    return list;
  }, [visibleTracks]);

  const activeMusiclyPlaylist = useMemo(() => {
    if (!selectedMusiclyPlaylistId) return musiclyPlaylists[0] || null;
    return musiclyPlaylists.find(p => p.id === selectedMusiclyPlaylistId) || musiclyPlaylists[0] || null;
  }, [musiclyPlaylists, selectedMusiclyPlaylistId]);

  const activeUserPlaylist = useMemo(() => {
    if (!selectedUserPlaylistId) return userPlaylists[0] || null;
    return userPlaylists.find(p => p.id === selectedUserPlaylistId) || userPlaylists[0] || null;
  }, [userPlaylists, selectedUserPlaylistId]);

  const filteredTracks = useMemo(() => {
    let baseList = [];

    if (mainSource === 'musicly') {
      if (viewMode === 'playlists') {
        baseList = activeMusiclyPlaylist?.tracks || [];
      } else {
        baseList = visibleTracks.filter(t => !t.isCustom || !!t.isPublic);
      }
    } else if (mainSource === 'user') {
      if (viewMode === 'playlists') {
        const tIds = activeUserPlaylist?.trackIds || [];
        baseList = tracks.filter(t => tIds.includes(t.id));
      } else {
        baseList = visibleTracks.filter(t => t.isCustom);
      }
    } else if (mainSource === 'favorites') {
      baseList = visibleTracks.filter(t => favorites.includes(t.id));
    }

    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((track) => {
      if (q) {
        const matchesSearch = 
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.genre.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (activeLangs.length > 0 && mainSource === 'musicly' && viewMode === 'single') {
        if (!isTrackInLanguages(track.language, activeLangs)) return false;
      }

      return true;
    });
  }, [mainSource, viewMode, activeMusiclyPlaylist, activeUserPlaylist, visibleTracks, tracks, favorites, searchQuery, activeLangs]);

  // Preserve user custom playlist track sequencing when in playlists tab
  const sortedFilteredTracks = useMemo(() => {
    if (mainSource === 'user' && viewMode === 'playlists' && activeUserPlaylist && Array.isArray(activeUserPlaylist.trackIds)) {
      const orderMap = new Map();
      activeUserPlaylist.trackIds.forEach((id, idx) => orderMap.set(id, idx));
      return [...filteredTracks].sort((a, b) => {
        const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
        const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
        return aOrder - bOrder;
      });
    }
    return filteredTracks;
  }, [filteredTracks, mainSource, viewMode, activeUserPlaylist]);

  // Playlist management actions (strictly private to user)
  const handleCreateNewPlaylist = (e) => {
    e?.preventDefault?.();
    const title = newPlaylistTitle.trim();
    if (!title) return;
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
    setSelectedUserPlaylistId(newPl.id);
    setIsCreatingPlaylist(false);
    setNewPlaylistTitle('');
    playPeacefulLikeSound();
  };

  const handleToggleSongInPlaylist = (playlistId, trackId) => {
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

  const handleDeletePlaylist = (playlistId) => {
    const target = userPlaylists.find(p => p.id === playlistId);
    if (!target) return;
    if (window.confirm(`Delete private playlist "${target.title}"?`)) {
      const updated = userPlaylists.filter(p => p.id !== playlistId);
      setUserPlaylists(updated);
      saveUserPlaylists(updated, user);
      if (selectedUserPlaylistId === playlistId) {
        setSelectedUserPlaylistId(updated[0]?.id || null);
      }
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatGenre = (t) => {
    if (!t) return 'Lo-Fi';
    if (Array.isArray(t.genres) && t.genres.length > 0) {
      const clean = t.genres.filter(g => g && g.toLowerCase() !== 'custom');
      if (clean.length > 0) return clean.join(', ');
    }
    if (t.genre && typeof t.genre === 'string' && t.genre.toLowerCase() !== 'custom') {
      return t.genre;
    }
    return 'Lo-Fi';
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
            <span>Musicly ({musiclyPlaylists.reduce((acc, p) => acc + (p.tracks?.length || 0), 0) > 0 ? (visibleTracks.filter(t => !t.isCustom || !!t.isPublic).length) : 0})</span>
          </button>

          {/* 2. User's Own Playlist (Only accessed and seen by the user respectively) */}
          <button 
            className={`drawer-tab-btn ${mainSource === 'user' ? 'active' : ''}`}
            onClick={() => setMainSource('user')}
            title="User's Own Playlist — Private mixes and songs only seen by you"
            aria-label="User's Own Playlist"
          >
            <ListMusic size={13} />
            <span>User's Own Playlist{userPlaylists.length > 0 ? ` (${userPlaylists.length})` : ''}</span>
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

      {/* When in Musicly Playlists Mode */}
      {mainSource === 'musicly' && viewMode === 'playlists' && (
        <div className="drawer-playlists-container">
          <div className="drawer-playlists-chips-row">
            {musiclyPlaylists.map(pl => {
              const isPlSelected = pl.id === activeMusiclyPlaylist?.id;
              const plCount = pl.tracks?.length || 0;
              return (
                <button
                  key={pl.id}
                  type="button"
                  className={`drawer-playlist-chip ${isPlSelected ? 'active' : ''}`}
                  onClick={() => setSelectedMusiclyPlaylistId(pl.id)}
                  title={`Musicly playlist: "${pl.title}" (${plCount} songs)`}
                >
                  <Sparkles size={11} style={{ color: '#ffd166' }} />
                  <span>{pl.title}</span>
                  <span className="playlist-chip-count">({plCount})</span>
                </button>
              );
            })}
          </div>

          {activeMusiclyPlaylist && (
            <div className="drawer-playlist-header-card">
              <div className="drawer-playlist-header-left">
                <div className="drawer-playlist-badge" style={{ color: '#ffd166', background: 'rgba(255, 209, 102, 0.15)' }}>OFFICIAL MUSICLY PLAYLIST</div>
                <h4 className="drawer-playlist-header-title">{activeMusiclyPlaylist.title}</h4>
                <span className="drawer-playlist-header-meta">
                  {(activeMusiclyPlaylist.tracks || []).length} songs • Curated by Musicly
                </span>
              </div>
              <div className="drawer-playlist-header-actions">
                {activeMusiclyPlaylist.tracks?.length > 0 && (
                  <button
                    type="button"
                    className="drawer-pl-action-btn play"
                    onClick={() => {
                      if (activeMusiclyPlaylist.tracks[0]) {
                        onSelectTrack(activeMusiclyPlaylist.tracks[0]);
                      }
                    }}
                    title={`Play all songs in "${activeMusiclyPlaylist.title}"`}
                  >
                    <Play size={12} fill="currentColor" /> Play All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* When in User's Own Playlist Mode */}
      {mainSource === 'user' && viewMode === 'playlists' && (
        <div className="drawer-playlists-container">
          <div className="drawer-playlists-chips-row">
            {userPlaylists.map(pl => {
              const isPlSelected = pl.id === activeUserPlaylist?.id;
              const plCount = Array.isArray(pl.trackIds) ? pl.trackIds.length : 0;
              return (
                <button
                  key={pl.id}
                  type="button"
                  className={`drawer-playlist-chip ${isPlSelected ? 'active' : ''}`}
                  onClick={() => setSelectedUserPlaylistId(pl.id)}
                  title={`Private playlist: "${pl.title}" (${plCount} songs)`}
                >
                  <ListMusic size={12} />
                  <span>{pl.title}</span>
                  <span className="playlist-chip-count">({plCount})</span>
                </button>
              );
            })}
            <button
              type="button"
              className="drawer-playlist-chip new-pl-chip"
              onClick={() => setIsCreatingPlaylist(true)}
              title="Create a new private playlist"
            >
              <Plus size={12} />
              <span>New Playlist</span>
            </button>
          </div>

          {isCreatingPlaylist && (
            <form onSubmit={handleCreateNewPlaylist} className="drawer-new-playlist-box">
              <input
                type="text"
                placeholder="New private playlist name..."
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                autoFocus
                className="drawer-new-playlist-input"
              />
              <button type="submit" className="drawer-new-playlist-btn submit">Create</button>
              <button 
                type="button" 
                className="drawer-new-playlist-btn cancel" 
                onClick={() => { setIsCreatingPlaylist(false); setNewPlaylistTitle(''); }}
              >
                Cancel
              </button>
            </form>
          )}

          {activeUserPlaylist && (
            <div className="drawer-playlist-header-card">
              <div className="drawer-playlist-header-left">
                <div className="drawer-playlist-badge">USER'S OWN PLAYLIST</div>
                <h4 className="drawer-playlist-header-title">{activeUserPlaylist.title}</h4>
                <span className="drawer-playlist-header-meta">
                  {(activeUserPlaylist.trackIds || []).length} songs • Accessible and seen only by you
                </span>
              </div>
              <div className="drawer-playlist-header-actions">
                {sortedFilteredTracks.length > 0 && (
                  <button
                    type="button"
                    className="drawer-pl-action-btn play"
                    onClick={() => {
                      if (sortedFilteredTracks[0]) {
                        onSelectTrack(sortedFilteredTracks[0]);
                      }
                    }}
                    title={`Play "${activeUserPlaylist.title}"`}
                  >
                    <Play size={12} fill="currentColor" /> Play All
                  </button>
                )}
                <button
                  type="button"
                  className="drawer-pl-action-btn delete"
                  onClick={() => handleDeletePlaylist(activeUserPlaylist.id)}
                  title="Delete this private playlist"
                  aria-label="Delete playlist"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}
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

      {/* Scrollable Track List with Apple VisionOS Glass Scrollbar */}
      <div className="drawer-track-list-container">
        <div className="drawer-track-list" ref={trackListRef}>
        {sortedFilteredTracks.length === 0 ? (
          <div className="drawer-empty-state">
            <Sparkles size={30} className="empty-icon" />
            <p>
              {mainSource === 'favorites'
                ? 'No liked songs yet. Click the heart icon on any song to add it to your favorites!'
                : mainSource === 'user' && viewMode === 'playlists'
                ? (userPlaylists.length === 0
                    ? 'No private playlists created yet. Click "+ New Playlist" to create your first personal mix!'
                    : `No songs in "${activeUserPlaylist?.title || 'this playlist'}" yet. Add songs using the + button!`)
                : mainSource === 'user' && viewMode === 'single'
                ? 'No uploaded songs found. Click "+ Add" to upload your personal music!'
                : 'No songs found'}
            </p>
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
                      onSelectTrack(track);
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
                        title="Click to change section/genre"
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

                    {/* Add to User's Private Playlist Quick Popover */}
                    <div className="row-playlist-add-wrapper" style={{ position: 'relative' }}>
                      <button 
                        type="button"
                        className="row-add-pl-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistMenuTrackId(prev => prev === track.id ? null : track.id);
                        }}
                        title="Add to your private playlist"
                        aria-label="Add to private playlist"
                      >
                        <Plus size={14} />
                      </button>
                      {playlistMenuTrackId === track.id && (
                        <div className="drawer-row-pl-menu" onClick={(e) => e.stopPropagation()}>
                          <div className="drawer-row-pl-menu-header">
                            <span>Add to Private Playlist</span>
                            <button 
                              type="button" 
                              className="drawer-row-pl-menu-close" 
                              onClick={() => setPlaylistMenuTrackId(null)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {userPlaylists.length === 0 ? (
                            <div className="drawer-row-pl-menu-empty">
                              <p style={{ margin: '0 0 6px', fontSize: '0.75rem', opacity: 0.7 }}>No private playlists yet.</p>
                              <button 
                                type="button" 
                                className="drawer-row-pl-create-btn"
                                onClick={() => {
                                  setPlaylistMenuTrackId(null);
                                  setMainSource('user');
                                  setViewMode('playlists');
                                  setIsCreatingPlaylist(true);
                                }}
                              >
                                + Create Playlist
                              </button>
                            </div>
                          ) : (
                            <div className="drawer-row-pl-menu-list">
                              {userPlaylists.map(pl => {
                                const inThis = Array.isArray(pl.trackIds) && pl.trackIds.includes(track.id);
                                return (
                                  <button
                                    key={pl.id}
                                    type="button"
                                    className={`drawer-row-pl-menu-item ${inThis ? 'is-in' : ''}`}
                                    onClick={() => {
                                      handleToggleSongInPlaylist(pl.id, track.id);
                                    }}
                                  >
                                    <span className="drawer-row-pl-menu-title">{pl.title}</span>
                                    {inThis ? <Check size={12} color="#4ade80" /> : <Plus size={12} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remove from this playlist button when in user's own playlist mode */}
                    {mainSource === 'user' && viewMode === 'playlists' && activeUserPlaylist && (
                      <button 
                        type="button"
                        className="row-remove-pl-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSongInPlaylist(activeUserPlaylist.id, track.id);
                        }}
                        title={`Remove from "${activeUserPlaylist.title}"`}
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

        {/* Apple VisionOS Capsule Glass Scrollbar */}
        <AppleGlassScrollbar targetRef={trackListRef} />
      </div>
    </div>
  );
}
