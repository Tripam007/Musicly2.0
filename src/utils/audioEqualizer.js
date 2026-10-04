/**
 * Real-Time Web Audio Equalizer (EQ) Manager for Musicly
 * Provides 5-band parametric equalizer:
 * - Bass (Sub/Punch: Low-Shelf @ 120 Hz)
 * - Low-Mid (Warmth/Body: Peaking @ 400 Hz)
 * - Mid (Vocals/Lead: Peaking @ 1200 Hz)
 * - High-Mid (Presence/Clarity: Peaking @ 3600 Hz)
 * - Treble (Air/Sparkle: High-Shelf @ 8500 Hz)
 */

import { getSharedAudioContext } from './audioSynth';

const EQ_STORAGE_KEY = 'musicly_equalizer_settings';

export const EQ_PRESETS = [
  {
    id: 'flat',
    name: 'Flat',
    desc: 'Pure authentic reference response',
    bands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 }
  },
  {
    id: 'bass_boost',
    name: 'Bass Boost',
    desc: 'Deep sub-bass impact & heavy low-end body',
    bands: { bass: 8, lowMid: 5, mid: 0, highMid: 1, treble: 2 }
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Warmth',
    desc: 'Cozy tape warmth with rolled-off highs',
    bands: { bass: 6, lowMid: 4, mid: 1, highMid: -3, treble: -6 }
  },
  {
    id: 'vocal',
    name: 'Vocal Clarity',
    desc: 'Clean vocal intelligibility & reduced rumble',
    bands: { bass: -4, lowMid: -1, mid: 5, highMid: 6, treble: 3 }
  },
  {
    id: 'electronic',
    name: 'Electronic / Synth',
    desc: 'Punchy kick, scooped mids & crisp treble',
    bands: { bass: 7, lowMid: 2, mid: -2, highMid: 4, treble: 7 }
  },
  {
    id: 'chill',
    name: 'Chill Acoustic',
    desc: 'Natural warmth & soothing acoustic sparkle',
    bands: { bass: 3, lowMid: 2, mid: 3, highMid: 2, treble: 1 }
  }
];

export const EQ_BANDS_INFO = [
  { key: 'bass', label: 'Bass', freq: '120 Hz', sublabel: 'Sub & Punch', type: 'lowshelf' },
  { key: 'lowMid', label: 'Low-Mid', freq: '400 Hz', sublabel: 'Warmth & Body', type: 'peaking' },
  { key: 'mid', label: 'Mid-Range', freq: '1.2 kHz', sublabel: 'Vocals & Lead', type: 'peaking' },
  { key: 'highMid', label: 'High-Mid', freq: '3.6 kHz', sublabel: 'Presence & Bite', type: 'peaking' },
  { key: 'treble', label: 'Treble', freq: '8.5 kHz', sublabel: 'Air & Sparkle', type: 'highshelf' }
];

const DEFAULT_EQ_STATE = {
  enabled: true,
  preset: 'flat',
  bands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 }
};

class AudioEqualizerManager {
  constructor() {
    this.state = this.loadState();
    this.listeners = new Set();
    this.ctx = null;
    this.attachedElement = null;
    this.mediaSource = null;
    this.nodes = {};
  }

  loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(EQ_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            enabled: parsed.enabled ?? DEFAULT_EQ_STATE.enabled,
            preset: parsed.preset || 'flat',
            bands: { ...DEFAULT_EQ_STATE.bands, ...(parsed.bands || {}) }
          };
        }
      }
    } catch (e) {}
    return { ...DEFAULT_EQ_STATE, bands: { ...DEFAULT_EQ_STATE.bands } };
  }

  saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {}
    this.notify();
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn({ ...this.state, bands: { ...this.state.bands } }); } catch (e) {}
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState() {
    return { ...this.state, bands: { ...this.state.bands } };
  }

  resume() {
    try {
      if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  // Initialize Web Audio filter nodes using shared AudioContext
  initAudioGraph() {
    if (this.nodes.bass) return;
    try {
      this.ctx = getSharedAudioContext();
      if (!this.ctx) return;

      this.resume();

      // Create filter chain with musical, audibly distinct curves
      this.nodes.bass = this.ctx.createBiquadFilter();
      this.nodes.bass.type = 'lowshelf';
      this.nodes.bass.frequency.value = 120;

      this.nodes.lowMid = this.ctx.createBiquadFilter();
      this.nodes.lowMid.type = 'peaking';
      this.nodes.lowMid.frequency.value = 400;
      this.nodes.lowMid.Q.value = 0.8;

      this.nodes.mid = this.ctx.createBiquadFilter();
      this.nodes.mid.type = 'peaking';
      this.nodes.mid.frequency.value = 1200;
      this.nodes.mid.Q.value = 0.8;

      this.nodes.highMid = this.ctx.createBiquadFilter();
      this.nodes.highMid.type = 'peaking';
      this.nodes.highMid.frequency.value = 3600;
      this.nodes.highMid.Q.value = 0.8;

      this.nodes.treble = this.ctx.createBiquadFilter();
      this.nodes.treble.type = 'highshelf';
      this.nodes.treble.frequency.value = 8500;

      this.nodes.gain = this.ctx.createGain();
      this.nodes.gain.gain.value = 1.0;

      // Connect: bass -> lowMid -> mid -> highMid -> treble -> gain -> destination
      this.nodes.bass.connect(this.nodes.lowMid);
      this.nodes.lowMid.connect(this.nodes.mid);
      this.nodes.mid.connect(this.nodes.highMid);
      this.nodes.highMid.connect(this.nodes.treble);
      this.nodes.treble.connect(this.nodes.gain);
      this.nodes.gain.connect(this.ctx.destination);

      // Apply initial gains
      this.applyGainsToGraph();
    } catch (e) {
      console.warn('[Musicly EQ] Audio graph initialization notice:', e);
    }
  }

  attachMediaElement(audioElement) {
    if (!audioElement) return;
    this.initAudioGraph();
    this.resume();

    if (!this.ctx || !this.nodes.bass) return;
    if (this.attachedElement === audioElement) return;

    try {
      if (!this.mediaSource) {
        this.mediaSource = this.ctx.createMediaElementSource(audioElement);
        this.mediaSource.connect(this.nodes.bass);
        this.attachedElement = audioElement;
      }
    } catch (e) {
      // Element might already be connected to source node
    }
  }

  applyGainsToGraph() {
    this.resume();
    if (!this.ctx || !this.nodes.bass) return;
    const isBypassed = !this.state.enabled;

    EQ_BANDS_INFO.forEach(band => {
      const node = this.nodes[band.key];
      if (node && node.gain) {
        const gainVal = isBypassed ? 0 : (this.state.bands[band.key] || 0);
        try {
          node.gain.cancelScheduledValues(0);
          node.gain.setValueAtTime(gainVal, this.ctx.currentTime);
          node.gain.value = gainVal;
        } catch (e) {
          node.gain.value = gainVal;
        }
      }
    });
  }

  setBandGain(bandKey, valueDb) {
    this.resume();
    const clamped = Math.max(-12, Math.min(12, Math.round(Number(valueDb) * 10) / 10));
    this.state.bands[bandKey] = clamped;
    this.state.preset = 'custom';
    this.applyGainsToGraph();
    this.saveState();
  }

  resetBand(bandKey) {
    this.setBandGain(bandKey, 0);
  }

  setEqualizerEnabled(enabled) {
    this.state.enabled = Boolean(enabled);
    this.resume();
    this.applyGainsToGraph();
    this.saveState();
  }

  applyPreset(presetId) {
    const preset = EQ_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    this.resume();
    this.state.preset = preset.id;
    this.state.bands = { ...preset.bands };
    this.applyGainsToGraph();
    this.saveState();
  }

  resetToFlat() {
    this.applyPreset('flat');
  }
}

export const audioEqualizer = new AudioEqualizerManager();
