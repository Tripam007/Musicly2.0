import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Volume1,
  Shuffle, 
  Repeat, 
  Heart, 
  Home, 
  FolderHeart, 
  Upload, 
  Sliders, 
  ImageIcon, 
  Sparkles, 
  Keyboard, 
  ArrowRight,
  X,
  FastForward,
  Rewind,
  Hand,
  Activity,
  Database
} from 'lucide-react';
import { modKeyName } from '../utils/platform';

export default function CommandPalette({
  isOpen,
  onClose,
  // Player state
  isPlaying,
  currentTrack,
  volume,
  isShuffle,
  repeatMode,
  isFavorite,
  // Player actions
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFavorite,
  // Navigation actions
  onOpenSearch,
  onOpenLibrary,
  onGoHome,
  onOpenUpload,
  onToggleAmbient,
  onOpenSceneModal,
  onNextScene,
  onSelectScene,
  allScenes = [],
  currentScene,
  onOpenShortcutsModal,
  onOpenAirControls,
  isAirControlsActive = false,
  onOpenAirAiDashboard,
  onOpenDatasetCollector,
  onOpenCinematicIntro
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Auto-focus on open and reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Construct dynamic action list
  const actions = useMemo(() => {
    const list = [
      // PLAYBACK
      {
        id: 'play_pause',
        category: 'Playback',
        title: isPlaying ? 'Pause Playback' : 'Play Music',
        subtitle: currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : 'Resume stream',
        icon: isPlaying ? Pause : Play,
        shortcut: 'Space',
        action: () => onTogglePlay?.()
      },
      {
        id: 'next_track',
        category: 'Playback',
        title: 'Next Track',
        subtitle: 'Skip to next song in playlist',
        icon: SkipForward,
        shortcut: 'Shift + →',
        action: () => onNextTrack?.()
      },
      {
        id: 'prev_track',
        category: 'Playback',
        title: 'Previous Track',
        subtitle: 'Return to previous song',
        icon: SkipBack,
        shortcut: 'Shift + ←',
        action: () => onPrevTrack?.()
      },
      {
        id: 'seek_forward',
        category: 'Playback',
        title: 'Seek Forward 5s',
        subtitle: 'Jump ahead 5 seconds',
        icon: FastForward,
        shortcut: '→',
        action: () => onSeekForward?.()
      },
      {
        id: 'seek_backward',
        category: 'Playback',
        title: 'Seek Backward 5s',
        subtitle: 'Rewind 5 seconds',
        icon: Rewind,
        shortcut: '←',
        action: () => onSeekBackward?.()
      },
      {
        id: 'volume_up',
        category: 'Playback',
        title: 'Volume Up (+5%)',
        subtitle: `Current volume: ${Math.round((volume || 0) * 100)}%`,
        icon: Volume2,
        shortcut: '↑',
        action: () => onVolumeUp?.()
      },
      {
        id: 'volume_down',
        category: 'Playback',
        title: 'Volume Down (-5%)',
        subtitle: `Current volume: ${Math.round((volume || 0) * 100)}%`,
        icon: Volume1,
        shortcut: '↓',
        action: () => onVolumeDown?.()
      },
      {
        id: 'toggle_mute',
        category: 'Playback',
        title: volume === 0 ? 'Unmute Audio' : 'Mute Audio',
        subtitle: volume === 0 ? 'Restore previous volume' : 'Silence playback',
        icon: volume === 0 ? Volume2 : VolumeX,
        shortcut: 'M',
        action: () => onToggleMute?.()
      },
      {
        id: 'toggle_shuffle',
        category: 'Playback',
        title: isShuffle ? 'Disable Shuffle' : 'Enable Shuffle',
        subtitle: isShuffle ? 'Shuffle is currently active' : 'Play songs in random order',
        icon: Shuffle,
        shortcut: 'S',
        badge: isShuffle ? 'ON' : 'OFF',
        action: () => onToggleShuffle?.()
      },
      {
        id: 'toggle_repeat',
        category: 'Playback',
        title: `Repeat Mode: ${repeatMode === 'one' ? 'Repeat 1' : repeatMode === 'all' ? 'Repeat All' : 'Off'}`,
        subtitle: 'Cycle through Off, Repeat All, and Repeat One',
        icon: Repeat,
        shortcut: 'R',
        badge: (repeatMode || 'off').toUpperCase(),
        action: () => onToggleRepeat?.()
      },
      {
        id: 'toggle_like',
        category: 'Playback',
        title: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        subtitle: currentTrack?.title || 'Heart current song',
        icon: Heart,
        shortcut: 'L',
        badge: isFavorite ? 'LIKED' : null,
        action: () => onToggleFavorite?.()
      },

      // NAVIGATION
      {
        id: 'search_music',
        category: 'Navigation',
        title: 'Search Music',
        subtitle: 'Find songs, artists, or genres in catalog',
        icon: Search,
        shortcut: '/',
        action: () => onOpenSearch?.()
      },
      {
        id: 'my_library',
        category: 'Navigation',
        title: 'My Library',
        subtitle: 'Open saved tracks, uploads, and playlists',
        icon: FolderHeart,
        shortcut: `${modKeyName} + L`,
        action: () => onOpenLibrary?.()
      },
      {
        id: 'home',
        category: 'Navigation',
        title: 'Navigate Home',
        subtitle: 'Return to default studio view',
        icon: Home,
        shortcut: 'H',
        action: () => onGoHome?.()
      },
      {
        id: 'add_music',
        category: 'Navigation',
        title: 'Add Music / Upload Track',
        subtitle: 'Upload local MP3 or stream audio URL',
        icon: Upload,
        shortcut: 'A',
        action: () => onOpenUpload?.()
      },
      {
        id: 'toggle_ambience',
        category: 'Navigation',
        title: 'Ambience Soundscapes Mixer',
        subtitle: 'Mix rain, vinyl crackle, waves, birds & lo-fi noise',
        icon: Sliders,
        shortcut: 'B',
        action: () => onToggleAmbient?.()
      },

      // SCENES
      {
        id: 'open_scenes',
        category: 'Scenes',
        title: 'Change Room Scene / Theme',
        subtitle: 'Browse all room backdrops, lighting & visual vibes',
        icon: ImageIcon,
        shortcut: 'G',
        action: () => onOpenSceneModal?.()
      },
      {
        id: 'next_scene',
        category: 'Scenes',
        title: 'Next Available Scene',
        subtitle: 'Cycle to next visual atmosphere',
        icon: Sparkles,
        shortcut: 'N',
        action: () => onNextScene?.()
      }
    ];

    // Add dynamic scene items from allScenes
    if (allScenes && allScenes.length > 0) {
      allScenes.forEach((sc, idx) => {
        const isCurrent = currentScene?.id === sc.id;
        // Check if there is a primary numeric shortcut
        let numKey = null;
        const nameLower = (sc.name || '').toLowerCase();
        const idLower = (sc.id || '').toLowerCase();
        if (idLower === 'afterglow' || nameLower.includes('afterglow')) numKey = '1';
        else if (idLower === 'indie' || nameLower.includes('indie')) numKey = '2';
        else if (idLower === 'drive' || nameLower.includes('drive')) numKey = '3';
        else if (idLower.includes('studio') || idLower.includes('minimal') || nameLower.includes('studio')) numKey = '4';
        else if (idLower.includes('ghazal') || nameLower.includes('ghazal')) numKey = '5';

        list.push({
          id: `scene_${sc.id}`,
          category: 'Scenes',
          title: `Scene: ${sc.name}`,
          subtitle: sc.desc || 'Atmospheric room theme',
          icon: ImageIcon,
          shortcut: numKey || null,
          badge: isCurrent ? 'CURRENT' : null,
          action: () => onSelectScene?.(sc)
        });
      });
    }

    // GENERAL
    list.push({
      id: 'air_controls',
      category: 'General',
      title: isAirControlsActive ? 'Air Controls: Settings & Guide (Active)' : 'Air Controls: Hand Gesture Navigation',
      subtitle: 'Control music with webcam hand gestures',
      icon: Hand,
      badge: isAirControlsActive ? 'ACTIVE' : null,
      action: () => onOpenAirControls?.()
    });

    if (onOpenAirAiDashboard) {
      list.push({
        id: 'air_ai_analytics',
        category: 'General',
        title: 'Air AI: Admin Model Analytics',
        subtitle: 'Inspect real training metrics, confusion matrix & telemetry',
        icon: Activity,
        badge: 'ADMIN',
        action: () => onOpenAirAiDashboard?.()
      });
    }

    if (onOpenDatasetCollector) {
      list.push({
        id: 'air_ai_dataset',
        category: 'General',
        title: 'Air AI: Dataset Collector',
        subtitle: 'Record hand landmark vectors for model training',
        icon: Database,
        badge: 'ADMIN',
        action: () => onOpenDatasetCollector?.()
      });
    }

    list.push({
      id: 'keyboard_shortcuts_help',
      category: 'General',
      title: 'Keyboard Shortcuts Cheatsheet',
      subtitle: 'View all keyboard controls and keys',
      icon: Keyboard,
      shortcut: '?',
      action: () => onOpenShortcutsModal?.()
    });

    if (onOpenCinematicIntro) {
      list.push({
        id: 'cinematic_opening_screen',
        category: 'General',
        title: 'Cinematic Opening Screen ("Thanks for listening.")',
        subtitle: 'Atmospheric opening with smooth scroll and sayings',
        icon: Sparkles,
        shortcut: '⇧O',
        action: () => onOpenCinematicIntro?.()
      });
    }

    return list;
  }, [
    isPlaying,
    currentTrack,
    volume,
    isShuffle,
    repeatMode,
    isFavorite,
    allScenes,
    currentScene,
    isAirControlsActive,
    onOpenAirControls,
    onOpenAirAiDashboard,
    onOpenDatasetCollector,
    onOpenCinematicIntro,
    onTogglePlay,
    onNextTrack,
    onPrevTrack,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    onToggleShuffle,
    onToggleRepeat,
    onToggleFavorite,
    onOpenSearch,
    onOpenLibrary,
    onGoHome,
    onOpenUpload,
    onToggleAmbient,
    onOpenSceneModal,
    onNextScene,
    onSelectScene,
    onOpenShortcutsModal
  ]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase().trim();
    return actions.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q) ||
      (item.shortcut && item.shortcut.toLowerCase().includes(q))
    );
  }, [actions, query]);

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Execute selected action
  const executeAction = (item) => {
    if (!item) return;
    onClose();
    // Allow palette close animation before action
    setTimeout(() => {
      item.action?.();
    }, 40);
  };

  // Keyboard navigation inside Command Palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        executeAction(filteredActions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scroll list when selected index changes
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElem) {
      selectedElem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="musicly-command-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="musicly-command-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="musicly-command-input-wrapper">
          <Search size={18} className="musicly-command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="musicly-command-input"
            placeholder="Type a command or search action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Command input"
          />
          {query ? (
            <button 
              className="musicly-command-clear-btn" 
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="musicly-command-shortcut-hint">
              <kbd>ESC</kbd> to exit
            </div>
          )}
        </div>

        {/* Action List */}
        <div className="musicly-command-list" ref={listRef}>
          {filteredActions.length === 0 ? (
            <div className="musicly-command-empty">
              <p>No actions matching &ldquo;{query}&rdquo;</p>
              <span>Try &ldquo;play&rdquo;, &ldquo;volume&rdquo;, &ldquo;scene&rdquo;, or &ldquo;library&rdquo;</span>
            </div>
          ) : (
            filteredActions.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon || ArrowRight;

              // Check if category header should be displayed
              const showCategory = 
                index === 0 || 
                filteredActions[index - 1].category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {showCategory && (
                    <div className="musicly-command-category-header">
                      {item.category}
                    </div>
                  )}
                  <div
                    data-index={index}
                    className={`musicly-command-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => executeAction(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="musicly-command-item-left">
                      <div className="musicly-command-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="musicly-command-item-info">
                        <span className="musicly-command-item-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="musicly-command-item-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                    </div>

                    <div className="musicly-command-item-right">
                      {item.badge && (
                        <span className="musicly-command-item-badge">{item.badge}</span>
                      )}
                      {item.shortcut && (
                        <kbd className="musicly-command-kbd">{item.shortcut}</kbd>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="musicly-command-footer">
          <div className="musicly-command-footer-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <div className="musicly-command-brand">Musicly Command</div>
        </div>
      </div>
    </div>
  );
}
