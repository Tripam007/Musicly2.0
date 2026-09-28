// High-Fidelity Web Audio Procedural Music Synthesizer
// Features dynamic song sections (Intro, Verse, Chorus, Drop, Outro) with instant seeking

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function resumeMusicSynthContext() {
  if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
    audioCtx.resume().catch(() => {});
  }
}

// Genre chords & lead melodies (frequencies in Hz)
export const THEMES = {
  'Lo-Fi': {
    bpm: 78,
    chords: [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ],
    leads: [523.25, 587.33, 659.25, 783.99, 659.25, 523.25, 493.88, 392.00],
    bassMultiplier: 0.5,
    filterFreq: 850
  },
  'Retro': {
    bpm: 112,
    chords: [
      [130.81, 164.81, 196.00, 246.94], // C
      [110.00, 130.81, 164.81, 196.00], // Am
      [87.31, 110.00, 130.81, 164.81],   // F
      [98.00, 123.47, 146.83, 174.61]   // G
    ],
    leads: [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 261.63],
    bassMultiplier: 1.0,
    filterFreq: 1400
  },
  'Indie': {
    bpm: 84,
    chords: [
      [196.00, 246.94, 293.66, 392.00], // G
      [146.83, 220.00, 293.66, 369.99], // D
      [164.81, 196.00, 246.94, 329.63], // Em
      [174.61, 220.00, 261.63, 349.23]  // C
    ],
    leads: [392.00, 440.00, 493.88, 587.33, 523.25, 493.88, 440.00, 392.00],
    bassMultiplier: 0.5,
    filterFreq: 1100
  },
  'Synthwave': {
    bpm: 118,
    chords: [
      [146.83, 220.00, 293.66, 440.00], // Dm
      [116.54, 174.61, 233.08, 349.23], // Bb
      [130.81, 196.00, 261.63, 392.00], // C
      [98.00, 146.83, 196.00, 293.66]   // Gm
    ],
    leads: [587.33, 659.25, 698.46, 880.00, 783.99, 698.46, 659.25, 587.33],
    bassMultiplier: 1.0,
    filterFreq: 1600
  },
  'Peace': {
    bpm: 56,
    chords: [
      [216.00, 271.93, 324.00, 432.00], // 432Hz Zen Tuning
      [180.00, 216.00, 271.93, 360.00],
      [144.00, 180.00, 216.00, 288.00],
      [162.00, 216.00, 271.93, 324.00]
    ],
    leads: [432.00, 540.00, 648.00, 864.00, 648.00, 540.00, 432.00],
    bassMultiplier: 0.5,
    filterFreq: 580
  },
  'Chill/Sleep': {
    bpm: 64,
    chords: [
      [174.61, 220.00, 261.63, 329.63], // 432Hz ambient tuned Fmaj7
      [196.00, 246.94, 293.66, 392.00],
      [220.00, 261.63, 329.63, 440.00]
    ],
    leads: [329.63, 392.00, 440.00, 523.25],
    bassMultiplier: 0.5,
    filterFreq: 500
  }
};

export class MusicEngine {
  constructor() {
    this.isPlaying = false;
    this.intervalId = null;
    this.masterGain = null;
    this.currentBeat = 0;
    this.genre = 'Lo-Fi';
    this.volume = 0.85;
  }

  start(genre = 'Lo-Fi', startSec = 0) {
    this.stop();
    this.isPlaying = true;
    this.genre = genre;
    const ctx = getAudioCtx();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);

    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.82;
    }
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    const theme = THEMES[this.genre] || THEMES['Lo-Fi'];
    const beatIntervalMs = (60 / theme.bpm) * 1000;

    this.currentBeat = Math.floor((startSec * 1000) / beatIntervalMs);

    // Play immediate feedback step on seek/start
    this.playStep(ctx, this.currentBeat);

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;
      this.currentBeat++;
      this.playStep(ctx, this.currentBeat);
    }, beatIntervalMs);
  }

  seek(targetSec) {
    const theme = THEMES[this.genre] || THEMES['Lo-Fi'];
    const beatIntervalMs = (60 / theme.bpm) * 1000;
    this.currentBeat = Math.max(0, Math.floor((targetSec * 1000) / beatIntervalMs));

    if (this.isPlaying) {
      const ctx = getAudioCtx();
      // Instantly trigger the chord and lead for this exact new section
      this.playStep(ctx, this.currentBeat, true);
    }
  }

  playStep(ctx, beat, isImmediateSeek = false) {
    const theme = THEMES[this.genre] || THEMES['Lo-Fi'];
    const chordList = theme.chords;
    const chordIdx = Math.floor((beat % (chordList.length * 4)) / 4);
    const chord = chordList[chordIdx];
    const beatInBar = beat % 4;

    // Determine Song Section based on beat/time
    // Beats: 0-20 (Intro), 20-60 (Verse), 60-110 (Chorus / Main Drop), 110-160 (Verse 2), 160+ (Outro)
    const isIntro = beat < 20;
    const isChorus = (beat >= 50 && beat < 100) || (beat >= 140 && beat < 190);
    const isOutro = beat >= 220;

    // 1. Play Chord Tone (Warm Electric Piano / Synth Pad)
    if (beatInBar === 0 || isImmediateSeek) {
      chord.forEach((freq, i) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = (this.genre === 'Retro' || this.genre === 'Synthwave') ? 'sawtooth' : 'triangle';
          
          // Higher octave in Chorus for rich fullness
          const octaveShift = isChorus && i === 0 ? 2 : 1;
          osc.frequency.setValueAtTime(freq * octaveShift, ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(isChorus ? theme.filterFreq * 1.5 : theme.filterFreq, ctx.currentTime);

          const dur = (this.genre === 'Chill/Sleep' || this.genre === 'Peace') ? 3.2 : 1.8;
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime((isChorus ? 0.12 : 0.08) / (i + 1), ctx.currentTime + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + dur);
        } catch (e) {}
      });
    }

    // 2. Play Melodic Lead Note (In Verse and Chorus)
    if (!isIntro && !isOutro && (beatInBar === 1 || beatInBar === 3 || isImmediateSeek)) {
      const leadNote = theme.leads[beat % theme.leads.length];
      if (leadNote) {
        try {
          const leadOsc = ctx.createOscillator();
          const leadGain = ctx.createGain();
          const leadFilter = ctx.createBiquadFilter();

          leadOsc.type = 'sine';
          leadOsc.frequency.setValueAtTime(leadNote, ctx.currentTime);

          leadFilter.type = 'lowpass';
          leadFilter.frequency.value = 1800;

          leadGain.gain.setValueAtTime(0.001, ctx.currentTime);
          leadGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.05);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

          leadOsc.connect(leadFilter);
          leadFilter.connect(leadGain);
          leadGain.connect(this.masterGain);

          leadOsc.start(ctx.currentTime);
          leadOsc.stop(ctx.currentTime + 0.85);
        } catch (e) {}
      }
    }

    // 3. Play Deep Bass Note (In Verse and Chorus)
    if (!isIntro && (beatInBar === 0 || beatInBar === 2 || isImmediateSeek)) {
      try {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const bassFilter = ctx.createBiquadFilter();

        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime((chord[0] * theme.bassMultiplier) / 2, ctx.currentTime);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 220;

        bassGain.gain.setValueAtTime(0.2, ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.masterGain);

        bassOsc.start(ctx.currentTime);
        bassOsc.stop(ctx.currentTime + 0.65);
      } catch (e) {}
    }

    // 4. Play Rhythm Percussion (Kick / Snare / Rim) in Verse/Chorus
    if (this.genre !== 'Chill/Sleep' && this.genre !== 'Peace' && !isIntro) {
      if (beatInBar === 0 || (isChorus && beatInBar === 2)) {
        this.playKick(ctx);
      } else if (beatInBar === 2 || (isChorus && beatInBar === 3)) {
        this.playSnare(ctx);
      }
    }
  }

  playKick(ctx) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  }

  playSnare(ctx) {
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.18;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1300;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(ctx.currentTime);
    } catch (e) {}
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain && audioCtx) {
      this.masterGain.gain.setTargetAtTime(v * 0.45, audioCtx.currentTime, 0.05);
    }
  }

  getSpectrum() {
    if (!this.isPlaying || !this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const musicEngine = new MusicEngine();
