// Web Audio API Synthesizers for Ambient Sounds, Melodic Chords & Technical UI Audio Effects

let audioCtx = null;
const audioBufferCache = {};

export async function getAudioBuffer(url, ctx) {
  if (audioBufferCache[url]) return audioBufferCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    audioBufferCache[url] = audioBuf;
    return audioBuf;
  } catch (e) {
    return null;
  }
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function resumeAudioSynthContext() {
  if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
    audioCtx.resume().catch(() => {});
  }
}

// Futuristic Technical UI "Bip-Ting!" Confirmation (Sci-Fi / Modern Tech Chime)
export function playTingSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Master bus
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.connect(ctx.destination);

    // 1. Initial High-Tech Micro Blip (850Hz -> 1300Hz)
    const blipOsc = ctx.createOscillator();
    const blipGain = ctx.createGain();
    blipOsc.type = 'sine';
    blipOsc.frequency.setValueAtTime(850, now);
    blipOsc.frequency.exponentialRampToValueAtTime(1350, now + 0.035);

    blipGain.gain.setValueAtTime(0.001, now);
    blipGain.gain.linearRampToValueAtTime(0.18, now + 0.006);
    blipGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    blipOsc.connect(blipGain);
    blipGain.connect(masterGain);
    blipOsc.start(now);
    blipOsc.stop(now + 0.05);

    // 2. High-Tech Harmonic "Ting!" Crystal Resonator (2093Hz C7 + 3136Hz G7)
    const tingTime = now + 0.032;

    const harmonics = [
      { freq: 2093.00, gain: 0.22, dur: 0.38 }, // C7
      { freq: 3135.96, gain: 0.14, dur: 0.28 }, // G7
      { freq: 4186.01, gain: 0.08, dur: 0.20 }  // C8 sparkle
    ];

    harmonics.forEach(({ freq, gain: gVal, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, tingTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.008, tingTime + 0.04);

      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 4;

      gain.gain.setValueAtTime(0.001, tingTime);
      gain.gain.linearRampToValueAtTime(gVal, tingTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, tingTime + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(tingTime);
      osc.stop(tingTime + dur + 0.02);
    });
  } catch (e) {}
}

export function playClickSound(pitch = 'normal') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = pitch === 'high' ? 1200 : 750;
    const endFreq = pitch === 'high' ? 300 : 120;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.038);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.042);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {}
}

// 📳 Tactile Apple/Taptic Style Micro Haptic Click & Vibration for Keyboard Shortcuts
export function triggerHapticFeedback(intensity = 'light') {
  // 1. Subtle, organic tactile audio click (low mechanical thump + crisp transient)
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Master bus (gentle volume so it doesn't interrupt music)
    const master = ctx.createGain();
    const vol = intensity === 'soft' ? 0.08 : 0.13;
    master.gain.setValueAtTime(vol, now);
    master.connect(ctx.destination);

    // Mechanical micro-thump (low tactile body)
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(140, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.016);

    thumpGain.gain.setValueAtTime(0.24, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(master);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.022);

    // Crisp tactile transient (like an Apple trackpad or mechanical keycap)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(2200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.009);

    filter.type = 'bandpass';
    filter.frequency.value = 1750;
    filter.Q.value = 2.4;

    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    clickOsc.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(master);
    clickOsc.start(now);
    clickOsc.stop(now + 0.014);
  } catch (e) {}

  // 2. Slight physical vibration on supported mobile/touch devices
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  } catch (e) {}
}

// 🌸 Serene & Peaceful Zen "Like" Acoustic Chime (528Hz Solfeggio + Harmonic Bell Resonance)
export function playPeacefulLikeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Master volume bus - balanced, gentle and soothing
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.connect(ctx.destination);

    // Warm Lowpass Filter - removes harsh digital sharpness, leaving organic acoustic warmth
    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.setValueAtTime(2400, now);
    warmFilter.Q.setValueAtTime(0.8, now);
    warmFilter.connect(masterGain);

    // Serene bell harmony:
    // 1. Warm base foundation: 264 Hz (sub-harmonic warmth, Tibetan singing bowl body)
    // 2. Main Solfeggio tone: 528 Hz (the "Miracle / Serenity" heart frequency)
    // 3. Ethereal chorus twin: 529.5 Hz (gentle singing bowl phasing / chorus shimmer)
    // 4. Peaceful fifth chime: 792 Hz (crystalline chime tone, blooms +35ms later)
    // 5. Octave sparkle: 1056 Hz (pure delicate air sparkle, blooms +45ms later)
    // 6. Ambient shimmer: 1584 Hz (delicate ambient sheen, blooms +60ms later)
    const tones = [
      { freq: 264.0, gain: 0.14, attack: 0.02, decay: 1.4, delay: 0.0, type: 'sine', detune: 0 },
      { freq: 528.0, gain: 0.28, attack: 0.018, decay: 1.6, delay: 0.0, type: 'sine', detune: 2 },
      { freq: 529.5, gain: 0.16, attack: 0.025, decay: 1.5, delay: 0.0, type: 'triangle', detune: -2 },
      { freq: 792.0, gain: 0.18, attack: 0.02, decay: 1.3, delay: 0.035, type: 'sine', detune: 3 },
      { freq: 1056.0, gain: 0.09, attack: 0.03, decay: 1.0, delay: 0.045, type: 'sine', detune: 0 },
      { freq: 1584.0, gain: 0.035, attack: 0.04, decay: 0.7, delay: 0.06, type: 'sine', detune: 5 }
    ];

    tones.forEach(({ freq, gain: targetGain, attack, decay, delay, type, detune }) => {
      const startTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);

      // Velvet smooth attack - eliminates any clicking transient
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(targetGain, startTime + attack);
      // Lingering peaceful exponential decay
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + decay);

      osc.connect(gain);
      gain.connect(warmFilter);

      osc.start(startTime);
      osc.stop(startTime + decay + 0.05);
    });
  } catch (e) {}
}


// 🎸 Authentic Acoustic Guitar Real Audio Sample Player
const GUITAR_SAMPLE_NAMES = [
  'A2', 'A3', 'A4',
  'C3', 'C4', 'C5',
  'D2', 'D3', 'D4', 'D5',
  'E2', 'E3', 'E4',
  'F2', 'F3', 'F4',
  'G2', 'G3', 'G4'
];

const SAMPLE_BASE_FREQS = {
  'A2': 110.00, 'A3': 220.00, 'A4': 440.00,
  'C3': 130.81, 'C4': 261.63, 'C5': 523.25,
  'D2': 73.42,  'D3': 146.83, 'D4': 293.66, 'D5': 587.33,
  'E2': 82.41,  'E3': 164.81, 'E4': 329.63,
  'F2': 87.31,  'F3': 174.61, 'F4': 349.23,
  'G2': 98.00,  'G3': 196.00, 'G4': 392.00
};

// Distinct real acoustic guitar stroke/strum patterns that cycle on every click
const REAL_GUITAR_STROKES = [
  // 1. Deep Acoustic Em Chord Downstrum (Rich open acoustic strings)
  {
    spread: 0.038,
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'A2', freq: 123.47 }, // B2
      { name: 'E3', freq: 164.81 },
      { name: 'G3', freq: 196.00 },
      { name: 'A3', freq: 246.94 }, // B3
      { name: 'E4', freq: 329.63 }
    ]
  },
  // 2. Bright Acoustic G Major Open Strum (Warm acoustic pop/rock)
  {
    spread: 0.034,
    notes: [
      { name: 'G2', freq: 98.00 },
      { name: 'A2', freq: 123.47 }, // B2
      { name: 'D3', freq: 146.83 },
      { name: 'G3', freq: 196.00 },
      { name: 'D4', freq: 293.66 },
      { name: 'G4', freq: 392.00 }
    ]
  },
  // 3. Crisp Folk Cadd9 Strum (Melodic acoustic pop)
  {
    spread: 0.036,
    notes: [
      { name: 'C3', freq: 130.81 },
      { name: 'E3', freq: 164.81 },
      { name: 'G3', freq: 196.00 },
      { name: 'D4', freq: 293.66 },
      { name: 'E4', freq: 329.63 }
    ]
  },
  // 4. Acoustic Dsus4 / D Major Strum
  {
    spread: 0.032,
    notes: [
      { name: 'D3', freq: 146.83 },
      { name: 'A3', freq: 220.00 },
      { name: 'D4', freq: 293.66 },
      { name: 'G4', freq: 392.00 }
    ]
  },
  // 5. Soulful Am7 Acoustic Chord Stroke
  {
    spread: 0.035,
    notes: [
      { name: 'A2', freq: 110.00 },
      { name: 'E3', freq: 164.81 },
      { name: 'G3', freq: 196.00 },
      { name: 'C4', freq: 261.63 },
      { name: 'E4', freq: 329.63 }
    ]
  },
  // 6. Spanish Flamenco E Major Rapid Rasgueado Sweep
  {
    spread: 0.022,
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'A2', freq: 123.47 },
      { name: 'E3', freq: 164.81 },
      { name: 'G3', freq: 207.65 }, // G#3
      { name: 'A3', freq: 246.94 },
      { name: 'E4', freq: 329.63 }
    ]
  },
  // 7. Cascading Acoustic Fingerstyle Melody Roll
  {
    spread: 0.090,
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'G3', freq: 196.00 },
      { name: 'D4', freq: 293.66 },
      { name: 'G4', freq: 392.00 },
      { name: 'D4', freq: 293.66 },
      { name: 'G3', freq: 196.00 }
    ]
  }
];

let guitarPatternIndex = 0;

// Preload all real samples into memory cache
export function preloadGuitarSamples() {
  try {
    const ctx = getAudioContext();
    GUITAR_SAMPLE_NAMES.forEach(name => {
      getAudioBuffer(`/audio/guitar/${name}.mp3`, ctx);
    });
  } catch (e) {}
}

// Auto-trigger preload
if (typeof window !== 'undefined') {
  setTimeout(preloadGuitarSamples, 500);
}

export async function playGuitarSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const now = ctx.currentTime;
    const pattern = REAL_GUITAR_STROKES[guitarPatternIndex % REAL_GUITAR_STROKES.length];
    guitarPatternIndex++;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.92, now);
    masterGain.connect(ctx.destination);

    pattern.notes.forEach(async (note, i) => {
      const stringTime = now + (i * pattern.spread);
      const sampleUrl = `/audio/guitar/${note.name}.mp3`;
      const baseFreq = SAMPLE_BASE_FREQS[note.name];
      const buffer = await getAudioBuffer(sampleUrl, ctx);

      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        if (baseFreq && note.freq) {
          source.playbackRate.setValueAtTime(note.freq / baseFreq, stringTime);
        }

        const stringGain = ctx.createGain();
        stringGain.gain.setValueAtTime(0.95, stringTime);
        stringGain.gain.exponentialRampToValueAtTime(0.0001, stringTime + 2.8);

        source.connect(stringGain);
        stringGain.connect(masterGain);

        source.start(stringTime);
        source.stop(stringTime + 3.0);
      }
    });
  } catch (e) {
    console.warn("Real guitar playback error:", e);
  }
}


// 💡 Tactile Lamp Toggle Switch Click Synthesizer
export function playLampSwitchSound(turningOn = true) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.24, now);
    masterGain.connect(ctx.destination);

    // 1. Mechanical snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(turningOn ? 1400 : 950, now);
    osc.frequency.exponentialRampToValueAtTime(turningOn ? 280 : 180, now + 0.028);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.035);

    // 2. Micro toggle latch resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(turningOn ? 2100 : 1500, now + 0.012);
    osc2.frequency.exponentialRampToValueAtTime(350, now + 0.045);

    gain2.gain.setValueAtTime(0.25, now + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.012);
    osc2.stop(now + 0.055);
  } catch (e) {}
}

export function playCoffeeSipSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.22, now);
    masterGain.connect(ctx.destination);

    // Warm ceramic clink + gentle liquid sip shimmer
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, now); // Ceramic clink A6
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.13);

    // Warm harmonic bloom
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(523.25, now + 0.04); // C5
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.22); // E5
    gain2.gain.setValueAtTime(0.12, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.3);
  } catch (e) {}
}

export function playRainChimeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.connect(ctx.destination);

    // Atmospheric raindrops chime chord (E5, B5, E6)
    [659.25, 987.77, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.04;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.08);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {}
}


export class AmbientSoundEngine {
  constructor() {
    this.nodes = {};
    this.gains = {};
  }

  setVolume(type, volume) {
    const ctx = getAudioContext();
    if (!this.nodes[type] && volume > 0) {
      this.startSound(type);
    }
    if (this.gains[type]) {
      const mult = type === 'rain' ? 0.85 
                 : type === 'thunder' ? 1.75 
                 : type === 'fire' ? 0.9 
                 : type === 'keyboard' ? 0.95 
                 : type === 'cafe' ? 0.75 
                 : type === 'bugs' ? 0.95
                 : 0.55;
      this.gains[type].gain.setTargetAtTime(volume * mult, ctx.currentTime, 0.08);
    }
  }

  startSound(type) {
    const ctx = getAudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.connect(ctx.destination);
    this.gains[type] = gain;

    if (type === 'rain') {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      
      let b0 = 0, b1 = 0, b2 = 0;
      let rb0 = 0, rb1 = 0, rb2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        
        b0 = 0.99 * b0 + whiteL * 0.09;
        b1 = 0.95 * b1 + whiteL * 0.14;
        b2 = 0.82 * b2 + whiteL * 0.20;
        const dropL = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.5 : 0;
        left[i] = (b0 + b1 + b2) * 0.7 + dropL;

        rb0 = 0.99 * rb0 + whiteR * 0.09;
        rb1 = 0.95 * rb1 + whiteR * 0.14;
        rb2 = 0.82 * rb2 + whiteR * 0.20;
        const dropR = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.5 : 0;
        right[i] = (rb0 + rb1 + rb2) * 0.7 + dropR;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;

      noise.connect(filter);
      filter.connect(gain);
      noise.start();
      this.nodes[type] = { noise, filter };
    } else if (type === 'thunder') {
      // 1. Genuine Recorded Thunder Ambient Bed + Fallback Low Atmosphere
      const noise = ctx.createBufferSource();
      getAudioBuffer('/audio/thunder_ambient.ogg', ctx).then(ambBuf => {
        if (ambBuf && this.nodes[type]) {
          const ambSrc = ctx.createBufferSource();
          ambSrc.buffer = ambBuf;
          ambSrc.loop = true;
          const ambGain = ctx.createGain();
          ambGain.gain.value = 1.8;
          ambSrc.connect(ambGain);
          ambGain.connect(gain);
          ambSrc.start();
          this.nodes[type].ambSrc = ambSrc;
        }
      });

      // Continuous low storm atmosphere rumble
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      let lastL = 0.0, lastR = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        left[i] = (lastL + (0.02 * whiteL)) / 1.02;
        right[i] = (lastR + (0.02 * whiteR)) / 1.02;
        lastL = left[i];
        lastR = right[i];
        left[i] *= 3.8;
        right[i] *= 3.8;
      }
      noise.buffer = buffer;
      noise.loop = true;

      const subFilter = ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.value = 105;
      subFilter.Q.value = 2.0;

      noise.connect(subFilter);
      subFilter.connect(gain);
      noise.start();

      // Real Lightning audio samples list
      const lightningSamples = [
        '/audio/lightning_strike_close.wav',
        '/audio/thunder_strike1.ogg',
        '/audio/thunder_ambient.ogg'
      ];

      // Preload samples
      lightningSamples.forEach(url => getAudioBuffer(url, ctx));

      // 2. Play Real Lightning Strike Recording
      const triggerRealLightning = async () => {
        if (!this.gains[type] || this.gains[type].gain.value < 0.005) return;
        try {
          const now = ctx.currentTime;
          const sampleUrl = Math.random() > 0.4 ? '/audio/lightning_strike_close.wav' : '/audio/thunder_strike1.ogg';
          const strikeBuf = await getAudioBuffer(sampleUrl, ctx);

          if (strikeBuf && this.nodes[type]) {
            const strikeSrc = ctx.createBufferSource();
            strikeSrc.buffer = strikeBuf;
            // Slight natural pitch & speed variation for organic variety
            strikeSrc.playbackRate.value = 0.92 + Math.random() * 0.16;

            const strikeGain = ctx.createGain();
            strikeGain.gain.setValueAtTime(gain.gain.value * 2.8, now);

            strikeSrc.connect(strikeGain);
            strikeGain.connect(gain);
            strikeSrc.start(now);
          }
        } catch (e) {}
      };

      // Autonomous organic thunderstorm scheduler (random 8-16s intervals)
      const scheduleNextLightning = () => {
        if (!this.nodes[type]) return;
        const delay = 8000 + Math.random() * 9000;
        this.nodes[type].timeout = setTimeout(() => {
          triggerRealLightning();
          scheduleNextLightning();
        }, delay);
      };

      // Trigger first real lightning strike immediately on turning thunder on
      const initialTimer = setTimeout(() => {
        triggerRealLightning();
        scheduleNextLightning();
      }, 150);

      this.nodes[type] = { noise, timeout: initialTimer };
    } else if (type === 'fire') {
      // Crisp sizzling campfire with distinct wood snaps and warm burning rumble
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      
      let emberL = 0, emberR = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        
        emberL = 0.93 * emberL + whiteL * 0.12;
        emberR = 0.93 * emberR + whiteR * 0.12;

        // Frequent loud snapping embers & sizzling pops
        const popL = Math.random() > 0.975 ? (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.7) : (Math.random() * 2 - 1) * 0.06;
        const popR = Math.random() > 0.975 ? (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.7) : (Math.random() * 2 - 1) * 0.06;

        left[i] = emberL * 0.6 + popL * 1.1;
        right[i] = emberR * 0.6 + popR * 1.1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1300;
      filter.Q.value = 0.75;

      noise.connect(filter);
      filter.connect(gain);
      noise.start();

      // Deep wood log combustion pops
      const fireInterval = setInterval(() => {
        if (!this.gains[type] || this.gains[type].gain.value < 0.01) return;
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const popGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(550 + Math.random() * 900, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

          const vol = gain.gain.value * (1.1 + Math.random() * 0.9);
          popGain.gain.setValueAtTime(vol, now);
          popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

          osc.connect(popGain);
          popGain.connect(gain);
          osc.start(now);
          osc.stop(now + 0.05);
        } catch (e) {}
      }, 260);

      this.nodes[type] = { noise, filter, interval: fireInterval };
    } else if (type === 'vinyl') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const pop = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.95 : 0;
        data[i] = (Math.random() * 2 - 1) * 0.03 + pop;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(gain);
      noise.start();
      this.nodes[type] = { noise };
    } else if (type === 'keyboard') {
      // Tactile mechanical keyboard typing with realistic switch snap and key clack
      const triggerKeyClick = () => {
        if (!this.gains[type] || this.gains[type].gain.value < 0.01) return;
        try {
          const now = ctx.currentTime;
          const isSpacebar = Math.random() < 0.16;

          // 1. High-frequency switch snap (Blue/Brown switch mechanical tactile click)
          const snapLen = Math.floor(ctx.sampleRate * 0.022);
          const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
          const sData = snapBuf.getChannelData(0);
          for (let i = 0; i < snapLen; i++) {
            sData[i] = (Math.random() * 2 - 1) * (1 - i / snapLen);
          }
          const snapSrc = ctx.createBufferSource();
          snapSrc.buffer = snapBuf;

          const snapFilter = ctx.createBiquadFilter();
          snapFilter.type = 'highpass';
          snapFilter.frequency.setValueAtTime(isSpacebar ? 1100 : 2500, now);

          const snapGain = ctx.createGain();
          const snapVol = gain.gain.value * (isSpacebar ? 1.5 : 1.3);
          snapGain.gain.setValueAtTime(snapVol, now);
          snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

          snapSrc.connect(snapFilter);
          snapFilter.connect(snapGain);
          snapGain.connect(gain);
          snapSrc.start(now);
          snapSrc.stop(now + 0.025);

          // 2. Key body hollow clack
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          const baseFreq = isSpacebar ? 200 : 420 + Math.random() * 280;
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);

          const oscVol = gain.gain.value * (isSpacebar ? 1.6 : 1.2);
          oscGain.gain.setValueAtTime(oscVol, now);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

          osc.connect(oscGain);
          oscGain.connect(gain);
          osc.start(now);
          osc.stop(now + 0.055);
        } catch (e) {}
      };

      const scheduleNextKey = () => {
        if (!this.nodes[type]) return;
        triggerKeyClick();
        const nextDelay = Math.random() > 0.84 
          ? 320 + Math.random() * 350 
          : 85 + Math.random() * 115;
        this.nodes[type].timeout = setTimeout(scheduleNextKey, nextDelay);
      };

      this.nodes[type] = { timeout: setTimeout(scheduleNextKey, 100) };
    } else if (type === 'cafe') {
      // 1. Formant Speech Babble & Ambient Room Murmur
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      
      let l0 = 0, l1 = 0, l2 = 0;
      let r0 = 0, r1 = 0, r2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        l0 = 0.94 * l0 + whiteL * 0.16;
        l1 = 0.88 * l1 + whiteL * 0.24;
        l2 = 0.75 * l2 + whiteL * 0.20;
        left[i] = (l0 + l1 * 0.7 + l2 * 0.5) * 0.75;

        r0 = 0.94 * r0 + whiteR * 0.16;
        r1 = 0.88 * r1 + whiteR * 0.24;
        r2 = 0.75 * r2 + whiteR * 0.20;
        right[i] = (r0 + r1 * 0.7 + r2 * 0.5) * 0.75;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 650;
      filter.Q.value = 1.2;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25;
      lfoGain.gain.value = 180;
      lfo.connect(filter.frequency);
      lfo.start();

      noise.connect(filter);
      filter.connect(gain);
      noise.start();

      // 2. Ceramic Coffee Cup Clinks & Spoon Taps
      const cafeInterval = setInterval(() => {
        if (!this.gains[type] || this.gains[type].gain.value < 0.01) return;
        try {
          const now = ctx.currentTime;
          const clinkOsc = ctx.createOscillator();
          const clinkGain = ctx.createGain();
          const freq = 2200 + Math.random() * 1400;
          clinkOsc.type = 'sine';
          clinkOsc.frequency.setValueAtTime(freq, now);

          const clinkVol = gain.gain.value * (0.4 + Math.random() * 0.4);
          clinkGain.gain.setValueAtTime(clinkVol, now);
          clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

          clinkOsc.connect(clinkGain);
          clinkGain.connect(gain);
          clinkOsc.start(now);
          clinkOsc.stop(now + 0.1);
        } catch (e) {}
      }, 2400);

      this.nodes[type] = { noise, lfo, interval: cafeInterval };
    } else if (type === 'bugs') {
      // 1. Soothing Night Summer Insects & Crickets Atmosphere
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        left[i] = whiteL * 0.06;
        right[i] = whiteR * 0.06;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bgFilter = ctx.createBiquadFilter();
      bgFilter.type = 'bandpass';
      bgFilter.frequency.value = 4600;
      bgFilter.Q.value = 4.5;

      noise.connect(bgFilter);
      bgFilter.connect(gain);
      noise.start();

      // 2. High-Definition Cricket Stridulation Chirps (Periodic natural chirping clusters)
      const triggerCricketChirp = () => {
        if (!this.gains[type] || this.gains[type].gain.value < 0.005) return;
        try {
          const now = ctx.currentTime;
          const pulses = 3 + Math.floor(Math.random() * 3);
          const baseFreq = 4800 + Math.random() * 600;

          for (let p = 0; p < pulses; p++) {
            const pTime = now + (p * 0.026);
            const osc = ctx.createOscillator();
            const pGain = ctx.createGain();
            const pFilter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, pTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, pTime + 0.02);

            pFilter.type = 'bandpass';
            pFilter.frequency.value = baseFreq;
            pFilter.Q.value = 7.5;

            const chirpVol = gain.gain.value * (1.1 + Math.random() * 0.4);
            pGain.gain.setValueAtTime(0.0001, pTime);
            pGain.gain.linearRampToValueAtTime(chirpVol, pTime + 0.004);
            pGain.gain.exponentialRampToValueAtTime(0.0001, pTime + 0.02);

            osc.connect(pFilter);
            pFilter.connect(pGain);
            pGain.connect(gain);

            osc.start(pTime);
            osc.stop(pTime + 0.024);
          }
        } catch (e) {}
      };

      const scheduleNextCricket = () => {
        if (!this.nodes[type]) return;
        triggerCricketChirp();
        const nextDelay = 1400 + Math.random() * 2200;
        this.nodes[type].timeout = setTimeout(scheduleNextCricket, nextDelay);
      };

      this.nodes[type] = { noise, timeout: setTimeout(scheduleNextCricket, 150) };
    }
  }

  stopAll() {
    Object.keys(this.nodes).forEach(key => {
      if (this.nodes[key]?.noise) {
        try { this.nodes[key].noise.stop(); } catch (e) {}
      }
      if (this.nodes[key]?.ambSrc) {
        try { this.nodes[key].ambSrc.stop(); } catch (e) {}
      }
      if (this.nodes[key]?.lfo) {
        try { this.nodes[key].lfo.stop(); } catch (e) {}
      }
      if (this.nodes[key]?.interval) {
        clearInterval(this.nodes[key].interval);
      }
      if (this.nodes[key]?.timeout) {
        clearTimeout(this.nodes[key].timeout);
      }
    });
    this.nodes = {};
    this.gains = {};
  }
}

export const ambientEngine = new AmbientSoundEngine();

// 🌠 Soft Ethereal Celestial Twinkle for Shooting Star
export function playShootingStarSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.08, now);
    masterGain.connect(ctx.destination);

    // Harmonic sparkle cascade
    const frequencies = [2637.02, 3135.96, 3951.07, 5274.04]; // E7, G7, B7, E8
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.045;
      const startTime = now + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.35);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {}
}

// 📺 Authentic Retro CRT TV Power Toggle (Click + Static Zap)
export function playTvPowerSound(isTurningOn = true) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Switch mechanical "thump / click"
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(isTurningOn ? 180 : 120, now);
    clickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.04);
    clickGain.gain.setValueAtTime(0.2, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.06);

    // CRT Phosphor / Degauss Hum & Static Zap
    const zapOsc = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zapOsc.type = 'sine';
    if (isTurningOn) {
      zapOsc.frequency.setValueAtTime(80, now + 0.02);
      zapOsc.frequency.exponentialRampToValueAtTime(8500, now + 0.12);
    } else {
      zapOsc.frequency.setValueAtTime(7500, now + 0.01);
      zapOsc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
    }
    zapGain.gain.setValueAtTime(0.001, now);
    zapGain.gain.linearRampToValueAtTime(0.06, now + 0.03);
    zapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    zapOsc.connect(zapGain);
    zapGain.connect(ctx.destination);
    zapOsc.start(now);
    zapOsc.stop(now + 0.18);
  } catch (_e) {}
}

// 🚪 Authentic Subtle Wooden Door Knock ("tap... tap")
export function playDoorKnockSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 2 very subtle gentle wooden knocks
    const knockDelays = [0, 0.14];
    knockDelays.forEach((delay, idx) => {
      const kTime = now + delay;

      // 1. Wood surface transient impact (filtered micro-noise pulse)
      const bufferSize = Math.floor(ctx.sampleRate * 0.02);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(260 + idx * 20, kTime);
      filter.Q.value = 3.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.065, kTime); // Very subtle
      gain.gain.exponentialRampToValueAtTime(0.0005, kTime + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(kTime);
      noise.stop(kTime + 0.04);

      // 2. Gentle hollow oak door body resonance
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130 + idx * 8, kTime);
      osc.frequency.exponentialRampToValueAtTime(55, kTime + 0.06);

      oscGain.gain.setValueAtTime(0.055, kTime); // Very subtle
      oscGain.gain.exponentialRampToValueAtTime(0.0005, kTime + 0.065);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(kTime);
      osc.stop(kTime + 0.07);
    });
  } catch (_e) {}
}

// 🐾 Real Cat Audio Buffer Cache
let cachedMeowBuffer = null;
let meowBufferPromise = null;

async function getMeowAudioBuffer(ctx) {
  if (cachedMeowBuffer) return cachedMeowBuffer;
  if (meowBufferPromise) return meowBufferPromise;

  meowBufferPromise = (async () => {
    try {
      const res = await fetch('/audio/cats/meow.mp3');
      if (!res.ok) throw new Error('Meow fetch failed');
      const arrayBuf = await res.arrayBuffer();
      cachedMeowBuffer = await ctx.decodeAudioData(arrayBuf);
      return cachedMeowBuffer;
    } catch (_e) {
      return null;
    } finally {
      meowBufferPromise = null;
    }
  })();

  return meowBufferPromise;
}

// 🐾 Authentic Real Cat Sound Player (5 Distinct Personalities)
export async function playCatSound(catIndex = 0) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;

    // Try playing real recorded cat audio with distinct per-cat voice modulation
    const realBuffer = await getMeowAudioBuffer(ctx);

    if (realBuffer) {
      if (catIndex === 0) {
        // Cat 0: Mochi (Sleepy Tabby on Ledge) -> Soothing, rhythmic cat purr with soft sleepy "mrrr" onset
        // 1. Soft vocalized "mrrr" onset (soft, warm, gently slowed domestic cat voice)
        const vocalSrc = ctx.createBufferSource();
        const vocalFilter = ctx.createBiquadFilter();
        const vocalGain = ctx.createGain();
        vocalSrc.buffer = realBuffer;
        vocalSrc.playbackRate.setValueAtTime(0.82, now);
        vocalFilter.type = 'lowpass';
        vocalFilter.frequency.setValueAtTime(1800, now);
        vocalGain.gain.setValueAtTime(0.01, now);
        vocalGain.gain.linearRampToValueAtTime(0.36, now + 0.06);
        vocalGain.gain.exponentialRampToValueAtTime(0.005, now + 0.52);
        vocalSrc.connect(vocalFilter);
        vocalFilter.connect(vocalGain);
        vocalGain.connect(ctx.destination);
        vocalSrc.start(now);
        vocalSrc.stop(now + 0.55);

        // 2. Deep, velvety rhythmic chest purr (natural 2-phase breathing flutter at 24-26Hz)
        const dur = 1.85;
        const purrMasterGain = ctx.createGain();
        purrMasterGain.connect(ctx.destination);

        // Two-phase organic breath swell (exhale purr into gentle inhale purr)
        purrMasterGain.gain.setValueAtTime(0.01, now);
        purrMasterGain.gain.linearRampToValueAtTime(0.68, now + 0.16);
        purrMasterGain.gain.setValueAtTime(0.55, now + 0.72);
        purrMasterGain.gain.linearRampToValueAtTime(0.42, now + 0.88); // breath turn
        purrMasterGain.gain.linearRampToValueAtTime(0.62, now + 1.15); // second gentle purr wave
        purrMasterGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        // 25 Hz laryngeal flutter tremolo
        const purrLFO = ctx.createOscillator();
        const purrLFOGain = ctx.createGain();
        purrLFO.type = 'sine';
        purrLFO.frequency.setValueAtTime(24.5, now);
        purrLFO.frequency.linearRampToValueAtTime(26.0, now + 0.9);
        purrLFO.frequency.linearRampToValueAtTime(23.5, now + dur);
        purrLFOGain.gain.value = 0.52;

        const purrGainVCA = ctx.createGain();
        purrGainVCA.gain.value = 0.48;
        purrLFO.connect(purrGainVCA.gain);
        purrGainVCA.connect(purrMasterGain);

        // Warm, resonant chest sub-harmonics (pure sine tones, no harsh sawtooth)
        const subOsc = ctx.createOscillator();
        const warmOsc = ctx.createOscillator();
        const chestGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(58, now);
        subOsc.frequency.linearRampToValueAtTime(62, now + 1.0);
        subOsc.frequency.linearRampToValueAtTime(56, now + dur);

        warmOsc.type = 'sine';
        warmOsc.frequency.setValueAtTime(116, now);
        warmOsc.frequency.linearRampToValueAtTime(124, now + 1.0);
        warmOsc.frequency.linearRampToValueAtTime(112, now + dur);

        chestGain.gain.value = 0.42;
        subOsc.connect(chestGain);
        warmOsc.connect(chestGain);
        chestGain.connect(purrGainVCA);

        // Velvety soft breath/throat noise texture (filtered pink noise)
        const sampleCount = Math.floor(ctx.sampleRate * dur);
        const noiseBuf = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < sampleCount; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.0990460;
          b1 = 0.96300 * b1 + white * 0.2965164;
          b2 = 0.57000 * b2 + white * 1.0526913;
          noiseData[i] = (b0 + b1 + b2 + white * 0.1848) * 0.075;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(430, now);
        noiseFilter.Q.value = 2.2;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.46;

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(purrGainVCA);

        purrLFO.start(now);
        subOsc.start(now);
        warmOsc.start(now);
        noiseSrc.start(now);

        purrLFO.stop(now + dur + 0.05);
        subOsc.stop(now + dur + 0.05);
        warmOsc.stop(now + dur + 0.05);
        noiseSrc.stop(now + dur + 0.05);
      } else if (catIndex === 1) {
        // Cat 1: Tangerine (Orange Tabby Climber) -> Natural authentic domestic cat meow (1.0x)
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = realBuffer;
        src.playbackRate.setValueAtTime(1.0, now);
        gain.gain.setValueAtTime(0.55, now);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
      } else if (catIndex === 2) {
        // Cat 2: Boba (Chubby Peeker) -> Deep, warm, mature cat meow (0.82x with warm acoustic filter)
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = realBuffer;
        src.playbackRate.setValueAtTime(0.82, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);
        gain.gain.setValueAtTime(0.58, now);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
      } else if (catIndex === 3) {
        // Cat 3: Pepper (Grey Climber) -> Sweet, softer, higher cat meow (1.18x)
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = realBuffer;
        src.playbackRate.setValueAtTime(1.18, now);
        gain.gain.setValueAtTime(0.5, now);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
      } else {
        // Cat 4: Cookie (Playful Kitten) -> Adorable double kitten squeak (1.5x)
        [0, 0.22].forEach((delay, idx) => {
          const s = ctx.createBufferSource();
          const g = ctx.createGain();
          s.buffer = realBuffer;
          s.playbackRate.setValueAtTime(1.48 + idx * 0.08, now + delay);
          g.gain.setValueAtTime(0.42, now + delay);
          s.connect(g);
          g.connect(ctx.destination);
          s.start(now + delay);
        });
      }
    } else {
      // Fallback formant synthesizer if audio buffer is not ready
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const pitches = [480, 560, 420, 680, 880];
      const p = pitches[catIndex] || 520;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p, now);
      osc.frequency.exponentialRampToValueAtTime(p * 1.5, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(p * 1.05, now + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(p * 2, now);
      filter.Q.value = 2.0;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (_e) {}
}

