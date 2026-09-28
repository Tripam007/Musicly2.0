import React, { useState, useMemo } from 'react';
import { Play, Pause, Disc3, Sparkles, Sliders, RotateCw, Compass, Music, Volume2 } from 'lucide-react';
import { CircularGallery } from './ui/circular-gallery';

export default function CircularGalleryScene({
  activeBackdrop,
  currentScene,
  tracks = [],
  currentTrack,
  isPlaying,
  onSelectTrack,
  onTogglePlay,
  roomBrightness = 1.0
}) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [speedLevel, setSpeedLevel] = useState(1); // 0.5, 1, 1.8
  const [galleryRadius, setGalleryRadius] = useState(620);
  const [showControls, setShowControls] = useState(true);

  // Compute speed value for CircularGallery
  const autoRotateSpeed = autoRotate ? 0.02 * speedLevel : 0;

  // Prepare gallery items from song tracks
  const galleryItems = useMemo(() => {
    if (!tracks || tracks.length === 0) return [];

    return tracks.map((t) => {
      const isCurrent = currentTrack?.id === t.id;
      const formatDuration = (sec) => {
        if (!sec) return '';
        const m = Math.floor(sec / 60);
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
      };

      return {
        common: t.title || 'Untitled Track',
        binomial: `${t.artist || 'Unknown Artist'}${t.duration ? ' • ' + formatDuration(t.duration) : ''}`,
        photo: {
          url: t.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
          text: `${t.title} by ${t.artist}`,
          pos: 'center',
          by: t.genre || 'Song'
        },
        isPlaying: isCurrent && isPlaying,
        track: {
          ...t,
          isPlaying: isCurrent && isPlaying
        },
        onClick: () => {
          if (onSelectTrack) {
            onSelectTrack(t);
          }
        }
      };
    });
  }, [tracks, currentTrack?.id, isPlaying, onSelectTrack]);

  if (!currentScene || currentScene.id !== 'circular_gallery') {
    return null;
  }

  return (
    <div 
      className="circular-gallery-scene-container"
      style={{
        opacity: Math.max(0.2, roomBrightness)
      }}
    >
      {/* Dynamic Cosmic Ambient Particle Background */}
      <div className="circular-cosmic-glow-layer" />

      {/* Main 3D Gallery Stage */}
      <div className="circular-gallery-stage">
        <CircularGallery
          items={galleryItems}
          radius={galleryRadius}
          autoRotateSpeed={autoRotateSpeed}
          enableDrag={true}
          onItemClick={(item) => {
            if (item.track && onSelectTrack) {
              onSelectTrack(item.track);
            }
          }}
        />
      </div>

      {/* Floating HUD / Interactive Controls Bar */}
      <div className="circular-gallery-hud">
        <div className="circular-gallery-hud-card">
          <div className="hud-header-row">
            <div className="hud-badge-title">
              <span className="hud-sparkle-dot">
                <Sparkles size={14} className="hud-icon-spin" />
              </span>
              <span className="hud-title-text">3D Celestial Song Carousel</span>
            </div>

            <button 
              className="hud-toggle-btn"
              onClick={() => setShowControls(prev => !prev)}
              title={showControls ? "Collapse Controls" : "Expand Controls"}
            >
              <Sliders size={14} />
              <span>{showControls ? "Controls" : "Show"}</span>
            </button>
          </div>

          {showControls && (
            <div className="hud-controls-grid">
              {/* Auto-Rotation Toggle */}
              <button
                className={`hud-pill-btn ${autoRotate ? 'active' : ''}`}
                onClick={() => setAutoRotate(prev => !prev)}
                title="Toggle 3D auto rotation"
              >
                {autoRotate ? <Pause size={13} /> : <Play size={13} />}
                <span>{autoRotate ? 'Auto-Spin ON' : 'Spin Paused'}</span>
              </button>

              {/* Speed Preset Selector */}
              <div className="hud-speed-group">
                <span className="hud-group-label"><RotateCw size={12} /> Speed:</span>
                <div className="hud-pill-selector">
                  {[0.5, 1, 1.8].map(s => (
                    <button
                      key={s}
                      className={`hud-sub-pill ${speedLevel === s ? 'is-selected' : ''}`}
                      onClick={() => setSpeedLevel(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Depth / Radius Selector */}
              <div className="hud-radius-group">
                <span className="hud-group-label"><Compass size={12} /> Radius:</span>
                <div className="hud-pill-selector">
                  {[
                    { label: 'Compact', r: 520 },
                    { label: 'Normal', r: 620 },
                    { label: 'Wide', r: 760 }
                  ].map(preset => (
                    <button
                      key={preset.r}
                      className={`hud-sub-pill ${galleryRadius === preset.r ? 'is-selected' : ''}`}
                      onClick={() => setGalleryRadius(preset.r)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interaction Tip Hint */}
          <div className="hud-footer-hint">
            <span className="hint-mouse-indicator">🖱️</span>
            <span>Drag horizontally or use mouse wheel to spin • Click album to play</span>
            {currentTrack && (
              <span className="hud-now-playing-tag">
                <Music size={11} className="inline-block mr-1" />
                {isPlaying ? 'Playing: ' : 'Selected: '} <strong>{currentTrack.title}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
