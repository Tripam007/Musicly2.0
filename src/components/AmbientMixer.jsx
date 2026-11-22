import React from 'react';
import {
  X,
  CloudRain,
  Zap,
  Flame,
  Disc,
  Keyboard,
  Coffee,
  Volume2,
  RotateCcw,
  Sparkles,
  Bug
} from 'lucide-react';

const AMBIENT_CHANNELS = [
  { id: 'rain', name: 'Rainfall', icon: CloudRain, color: '#38bdf8' },
  { id: 'bugs', name: 'Night Crickets / Bugs', icon: Bug, color: '#a78bfa' },
  { id: 'thunder', name: 'Rolling Thunder', icon: Zap, color: '#c084fc' },
  { id: 'fire', name: 'Campfire Crackle', icon: Flame, color: '#fb923c' },
  { id: 'cafe', name: 'Cozy Cafe Chatter', icon: Coffee, color: '#facc15' },
  { id: 'vinyl', name: 'Vintage Vinyl', icon: Disc, color: '#e879f9' },
  { id: 'keyboard', name: 'Mechanical Typing', icon: Keyboard, color: '#4ade80' }
];

export const PRESETS = {
  sleep: {
    name: '🌙 Chill / Sleep',
    color: '#818cf8',
    volumes: { rain: 0.25, bugs: 0.40, thunder: 0.18, fire: 0.18, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  storm: {
    name: 'Thunderstorm',
    color: '#c084fc',
    volumes: { rain: 0.55, thunder: 0.60, bugs: 0, fire: 0, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  coffee: {
    name: 'Rainy Cafe',
    color: '#facc15',
    volumes: { cafe: 0.50, rain: 0.30, bugs: 0, thunder: 0, fire: 0, vinyl: 0, keyboard: 0 }
  },
  coding: {
    name: 'Late Night Code',
    color: '#4ade80',
    volumes: { keyboard: 0.45, rain: 0.30, bugs: 0, thunder: 0, fire: 0, vinyl: 0, cafe: 0 }
  },
  cozy: {
    name: 'Cozy Fireplace',
    color: '#fb923c',
    volumes: { fire: 0.50, vinyl: 0.35, rain: 0, bugs: 0, thunder: 0, cafe: 0, keyboard: 0 }
  }
};

/**
 * Scales preset atmosphere levels according to current song playback volume,
 * ensuring presets remain audible and comfortably below the 70% loud threshold.
 */
export function getScaledPresetVolumes(presetKey, musicVolume = 0.8) {
  const preset = PRESETS[presetKey];
  if (!preset) return {};

  const safeMusicVol = typeof musicVolume === 'number' && !isNaN(musicVolume) 
    ? Math.max(0, Math.min(1, musicVolume)) 
    : 0.8;

  if (safeMusicVol <= 0) {
    const silent = {};
    Object.keys(preset.volumes).forEach(k => { silent[k] = 0; });
    return silent;
  }

  // Balanced scaling: keeps presets clear, audible, and comfortably under 70%
  const scale = Math.min(1.0, Math.max(0.65, safeMusicVol));

  const scaled = {};
  Object.entries(preset.volumes).forEach(([channel, rawVol]) => {
    if (rawVol <= 0) {
      scaled[channel] = 0;
    } else {
      const targetVol = rawVol * scale;
      scaled[channel] = Math.min(0.68, Math.round(targetVol * 100) / 100);
    }
  });

  return scaled;
}

export default function AmbientMixer({
  isOpen,
  onClose,
  ambientVolumes,
  onVolumeChange,
  onResetAll,
  musicVolume = 0.8
}) {
  if (!isOpen) return null;

  // Check if a preset matches current volume mix
  const isPresetActive = (key) => {
    const p = PRESETS[key];
    if (!p) return false;
    const scaled = getScaledPresetVolumes(key, musicVolume);
    return Object.entries(scaled).every(([ch, expectedVol]) => {
      const actual = ambientVolumes[ch] || 0;
      return Math.abs(actual - expectedVol) < 0.05;
    });
  };

  const togglePreset = (key) => {
    if (isPresetActive(key)) {
      onResetAll();
    } else {
      onResetAll();
      const scaledTarget = getScaledPresetVolumes(key, musicVolume);
      Object.entries(scaledTarget).forEach(([ch, vol]) => {
        onVolumeChange(ch, vol);
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal-panel ambient-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Volume2 className="panel-title-icon" size={22} />
            <div>
              <h3>Ambient Soundscapes</h3>
              <p>Layer realistic atmosphere over your music</p>
            </div>
          </div>
          <button id="btn-close-ambient" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Presets row */}
        <div className="ambient-presets-row">
          <span className="presets-label"><Sparkles size={14} /> Presets:</span>
          {Object.entries(PRESETS).map(([key, p]) => {
            const active = isPresetActive(key);
            return (
              <button
                key={key}
                className={`preset-chip ${active ? 'is-active' : ''}`}
                onClick={() => togglePreset(key)}
              >
                {p.name}
              </button>
            );
          })}
          <button className="preset-chip reset-chip" onClick={onResetAll}>
            <RotateCcw size={12} /> Clear
          </button>
        </div>

        {/* Sound Faders */}
        <div className="ambient-channels-list">
          {AMBIENT_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const vol = ambientVolumes[ch.id] || 0;
            const isActive = vol > 0;
            const isTooLoud = vol > 0.70;
            const pct = Math.round(vol * 100);

            // Track background: highlight the portion past 70% in warning red
            const trackBg = isTooLoud
              ? `linear-gradient(to right, ${ch.color} 0%, ${ch.color} 70%, #ef4444 70%, #ef4444 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`
              : `linear-gradient(to right, ${ch.color} 0%, ${ch.color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`;

            return (
              <div key={ch.id} className={`ambient-fader-card ${isActive ? 'is-active' : ''} ${isTooLoud ? 'is-too-loud' : ''}`}>
                <div className="fader-label-side">
                  <div className="fader-icon-badge" style={{ color: isTooLoud ? '#ef4444' : ch.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h5 className="fader-name">{ch.name}</h5>
                    <div className="fader-val-row">
                      <span className={`fader-pct ${isTooLoud ? 'is-warning' : ''}`}>{pct}%</span>
                      {isTooLoud && (
                        <span className="too-loud-badge">⚠️ Too Loud</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="fader-slider-side" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vol}
                    onInput={(e) => onVolumeChange(ch.id, parseFloat(e.target.value))}
                    onChange={(e) => onVolumeChange(ch.id, parseFloat(e.target.value))}
                    className={`ambient-range-input ${isTooLoud ? 'is-warning-slider' : ''}`}
                    style={{ background: trackBg }}
                    aria-label={`${ch.name} volume`}
                  />
                  {isTooLoud && (
                    <div className="too-loud-hint">
                      Volume exceeds 70% — may overpower the music
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
