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
    volumes: { rain: 0.08, bugs: 0.12, thunder: 0.04, fire: 0.05, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  storm: {
    name: 'Thunderstorm',
    color: '#c084fc',
    volumes: { rain: 0.12, thunder: 0.09, bugs: 0, fire: 0, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  coffee: {
    name: 'Rainy Cafe',
    color: '#facc15',
    volumes: { cafe: 0.11, rain: 0.06, bugs: 0, thunder: 0, fire: 0, vinyl: 0, keyboard: 0 }
  },
  coding: {
    name: 'Late Night Code',
    color: '#4ade80',
    volumes: { keyboard: 0.10, rain: 0.06, bugs: 0, thunder: 0, fire: 0, vinyl: 0, cafe: 0 }
  },
  cozy: {
    name: 'Cozy Fireplace',
    color: '#fb923c',
    volumes: { fire: 0.12, vinyl: 0.07, rain: 0, bugs: 0, thunder: 0, cafe: 0, keyboard: 0 }
  }
};

/**
 * Scales preset atmosphere levels according to current song playback volume,
 * ensuring the sound bars stay low, gentle, and fit to the current song playing.
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

  // Atmospheric scaling factor: scales sound bars directly with song volume
  // keeping ambient bars low and subordinate to the song playing
  const songScalingFactor = Math.min(1.0, Math.max(0.4, safeMusicVol));

  const scaled = {};
  Object.entries(preset.volumes).forEach(([channel, rawVol]) => {
    if (rawVol <= 0) {
      scaled[channel] = 0;
    } else {
      const targetVol = rawVol * songScalingFactor;
      scaled[channel] = Math.max(0.01, Math.round(targetVol * 100) / 100);
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

  const safeMusicVol = typeof musicVolume === 'number' && !isNaN(musicVolume) 
    ? Math.max(0, Math.min(1, musicVolume)) 
    : 0.8;
  const maxAllowedVolume = Math.min(0.20, Math.max(0.06, Math.round(safeMusicVol * 0.22 * 100) / 100));

  // Check if a preset matches current volume mix
  const isPresetActive = (key) => {
    const p = PRESETS[key];
    if (!p) return false;
    const scaled = getScaledPresetVolumes(key, musicVolume);
    return Object.entries(scaled).every(([ch, expectedVol]) => {
      const actual = ambientVolumes[ch] || 0;
      return Math.abs(actual - expectedVol) < 0.04;
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

            return (
              <div key={ch.id} className={`ambient-fader-card ${isActive ? 'is-active' : ''}`}>
                <div className="fader-label-side">
                  <div className="fader-icon-badge" style={{ color: ch.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h5 className="fader-name">{ch.name}</h5>
                    <span className="fader-pct">{Math.round(vol * 100)}%</span>
                  </div>
                </div>

                <div className="fader-slider-side">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={vol}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      const safeVal = Math.min(raw, maxAllowedVolume);
                      onVolumeChange(ch.id, safeVal);
                    }}
                    className="ambient-range-input"
                    style={{
                      background: `linear-gradient(to right, ${ch.color} 0%, ${ch.color} ${vol * 100}%, rgba(255,255,255,0.1) ${vol * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
