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
    volumes: { rain: 0.20, bugs: 0.45, thunder: 0.15, fire: 0.15, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  storm: {
    name: 'Thunderstorm',
    color: '#c084fc',
    volumes: { rain: 0.70, thunder: 0.85, bugs: 0, fire: 0, vinyl: 0, cafe: 0, keyboard: 0 }
  },
  coffee: {
    name: 'Rainy Cafe',
    color: '#facc15',
    volumes: { cafe: 0.65, rain: 0.40, bugs: 0, thunder: 0, fire: 0, vinyl: 0, keyboard: 0 }
  },
  coding: {
    name: 'Late Night Code',
    color: '#4ade80',
    volumes: { keyboard: 0.60, rain: 0.50, bugs: 0, thunder: 0, fire: 0, vinyl: 0, cafe: 0 }
  },
  cozy: {
    name: 'Cozy Fireplace',
    color: '#fb923c',
    volumes: { fire: 0.70, vinyl: 0.50, rain: 0, bugs: 0, thunder: 0, cafe: 0, keyboard: 0 }
  }
};

export default function AmbientMixer({
  isOpen,
  onClose,
  ambientVolumes,
  onVolumeChange,
  onResetAll
}) {
  if (!isOpen) return null;

  // Check if a preset matches current volume mix
  const isPresetActive = (key) => {
    const p = PRESETS[key];
    if (!p) return false;
    return Object.entries(p.volumes).every(([ch, expectedVol]) => {
      const actual = ambientVolumes[ch] || 0;
      return Math.abs(actual - expectedVol) < 0.05;
    });
  };

  const togglePreset = (key) => {
    if (isPresetActive(key)) {
      onResetAll();
    } else {
      onResetAll();
      const target = PRESETS[key].volumes;
      Object.entries(target).forEach(([ch, vol]) => {
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
                    step="0.02"
                    value={vol}
                    onChange={(e) => onVolumeChange(ch.id, parseFloat(e.target.value))}
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
