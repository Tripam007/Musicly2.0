import React, { useState, useMemo } from 'react';
import { 
  Keyboard, 
  X, 
  Search, 
  Play, 
  Navigation, 
  Sparkles, 
  Command as CommandIcon,
  Mic
} from 'lucide-react';
import { modKeyName, modKeyFull } from '../utils/platform';

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  allScenes = []
}) {
  const [search, setSearch] = useState('');

  // Build grouped shortcuts
  const groups = useMemo(() => {
    // Determine dynamic scenes for numbers
    const sceneShortcuts = [
      { key: '1', label: 'Afterglow Scene' },
      { key: '2', label: 'Indie Scene' },
      { key: '3', label: 'Drive Scene' },
      { key: '4', label: 'Minimal Studio Scene' },
      { key: '5', label: 'Ghazals Scene' },
      { key: 'N', label: 'Next Scene (Cycle)' },
      { key: 'G / C', label: 'Open Scene Selector' },
      { key: 'B', label: 'Toggle Ambience Soundscapes' }
    ];

    return [
      {
        id: 'playback',
        title: 'Playback',
        icon: Play,
        shortcuts: [
          { key: 'Space', label: 'Play / Pause' },
          { key: '← / →', label: 'Seek Backward / Forward 5s' },
          { key: 'Shift + ←', label: 'Previous Song' },
          { key: 'Shift + →', label: 'Next Song' },
          { key: '↑ / ↓', label: 'Volume Up / Down 5%' },
          { key: 'M', label: 'Mute / Unmute' },
          { key: 'S', label: 'Toggle Shuffle' },
          { key: 'R', label: 'Cycle Repeat (All / One / Off)' },
          { key: 'L', label: 'Like / Favorite Current Song' }
        ]
      },
      {
        id: 'navigation',
        title: 'Navigation',
        icon: Navigation,
        shortcuts: [
          { key: '/', label: 'Focus Search' },
          { key: 'H', label: 'Navigate Home (Cozy Studio)' },
          { key: `${modKeyName} + L`, label: 'Open My Library / Playlist' },
          { key: 'A', label: 'Open Add Music / Upload' },
          { key: 'Esc', label: 'Close Active Modal / Overlay' }
        ]
      },
      {
        id: 'scenes',
        title: 'Atmospheric Scenes',
        icon: Sparkles,
        shortcuts: sceneShortcuts
      },
      {
        id: 'voice',
        title: 'Hey Musicly Voice Control',
        icon: Mic,
        shortcuts: [
          { key: '"Hey Musicly"', label: 'Activate Voice Assistant' },
          { key: '"Play / Pause"', label: 'Toggle Playback' },
          { key: '"Next / Previous"', label: 'Skip or Return Tracks' },
          { key: '"Play [Song/Artist]"', label: 'Play Song by Title or Artist' },
          { key: '"Volume [0-100]%"', label: 'Set Volume Level' },
          { key: '"Switch to [Scene]"', label: 'Change Atmospheric Scene' },
          { key: '"Cancel" or Esc', label: 'Dismiss Active Voice Listening' }
        ]
      },
      {
        id: 'general',
        title: 'General',
        icon: CommandIcon,
        shortcuts: [
          { key: `${modKeyName} + K`, label: 'Open Command Palette' },
          { key: '?', label: 'Open Keyboard Shortcuts Help' }
        ]
      }
    ];
  }, [allScenes]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase().trim();
    return groups.map(group => ({
      ...group,
      shortcuts: group.shortcuts.filter(s => 
        s.label.toLowerCase().includes(q) || 
        s.key.toLowerCase().includes(q)
      )
    })).filter(g => g.shortcuts.length > 0);
  }, [groups, search]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay musicly-shortcuts-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      <div className="glass-modal-panel musicly-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="musicly-shortcuts-header-icon">
              <Keyboard size={20} />
            </div>
            <div>
              <h3>Keyboard Shortcuts</h3>
              <p>Control Musicly playback, navigation, and scenes from your keyboard</p>
            </div>
          </div>
          <button 
            id="btn-close-shortcuts"
            className="drawer-close-btn" 
            onClick={onClose}
            aria-label="Close shortcuts dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter input */}
        <div className="musicly-shortcuts-search-wrap">
          <Search size={15} className="musicly-shortcuts-search-icon" />
          <input 
            type="text"
            className="musicly-shortcuts-filter-input"
            placeholder="Search shortcuts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Shortcuts Content */}
        <div className="musicly-shortcuts-body">
          {filteredGroups.length === 0 ? (
            <div className="musicly-shortcuts-empty">
              No shortcuts found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredGroups.map(group => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="musicly-shortcuts-section">
                  <div className="musicly-shortcuts-section-title">
                    <GroupIcon size={14} className="musicly-shortcuts-sec-icon" />
                    <span>{group.title}</span>
                  </div>

                  <div className="musicly-shortcuts-grid">
                    {group.shortcuts.map(sc => (
                      <div key={sc.key + sc.label} className="musicly-shortcut-row">
                        <span className="musicly-shortcut-label">{sc.label}</span>
                        <kbd className="musicly-shortcut-kbd">{sc.key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="musicly-shortcuts-footer">
          <span>Shortcuts disabled while typing in text inputs or search</span>
          <kbd className="musicly-footer-esc-hint">Press ESC to close</kbd>
        </div>
      </div>
    </div>
  );
}
