import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Heart, 
  User, 
  X,
  ChevronDown
} from 'lucide-react';
import { getAudioMetrics } from '../utils/audioVisualizer';

/**
 * Format seconds into m:ss
 */
const formatTime = (sec) => {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/**
 * Solar Eclipse 'O' matching exact reference image
 */
const EclipseO = () => (
  <span className="afterglow-eclipse-wrapper" aria-label="O">
    <svg width="0.88em" height="0.88em" viewBox="0 0 100 100" className="afterglow-eclipse-svg" style={{ display: 'inline-block', verticalAlign: '-0.04em', margin: '0 0.03em' }}>
      <defs>
        <radialGradient id="eclipseAmberCorona" cx="62%" cy="48%" r="60%">
          <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
          <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
        <filter id="eclipseGlowBlur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Outer Corona Aura */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#eclipseAmberCorona)" strokeWidth="9" opacity="0.85" filter="url(#eclipseGlowBlur)" />
      {/* Dark Moon Body */}
      <circle cx="45" cy="50" r="39" fill="#080b11" />
      {/* Brilliant Luminous Crescent Rim on Right */}
      <path d="M 54 12 A 39 39 0 0 1 54 88 A 34 34 0 0 0 54 12 Z" fill="#ffffff" filter="url(#eclipseGlowBlur)" />
      <path d="M 55 15 A 36 36 0 0 1 55 85 A 32 32 0 0 0 55 15 Z" fill="#fef3c7" />
    </svg>
  </span>
);

/**
 * Mood & Wave harmonic presets for cinematic atmosphere transitions
 */
const SONG_MOOD_PROFILES = [
  {
    tint: 'rgba(245, 158, 11, 0.12)', // Warm Amber Dusk
    glowColor: '#fbbf24',
    bgZoom: 1.05,
    bgOrigin: '24% 28%',
    brightness: 0.98,
    contrast: 1.04,
    waveFreq1: 5.2,
    waveFreq2: 11.2,
    ampBoost: 1.05
  },
  {
    tint: 'rgba(56, 189, 248, 0.10)', // Twilight Cyan / Indigo
    glowColor: '#38bdf8',
    bgZoom: 1.10,
    bgOrigin: '28% 32%',
    brightness: 0.92,
    contrast: 1.08,
    waveFreq1: 6.4,
    waveFreq2: 13.5,
    ampBoost: 1.18
  },
  {
    tint: 'rgba(45, 212, 191, 0.10)', // Ethereal Emerald / Teal
    glowColor: '#2dd4bf',
    bgZoom: 1.07,
    bgOrigin: '22% 26%',
    brightness: 0.90,
    contrast: 1.06,
    waveFreq1: 4.8,
    waveFreq2: 10.4,
    ampBoost: 0.95
  },
  {
    tint: 'rgba(251, 146, 60, 0.12)', // Vintage Sunset Amber
    glowColor: '#fb923c',
    bgZoom: 1.12,
    bgOrigin: '26% 30%',
    brightness: 0.96,
    contrast: 1.05,
    waveFreq1: 5.8,
    waveFreq2: 12.0,
    ampBoost: 1.12
  },
  {
    tint: 'rgba(168, 85, 247, 0.10)', // Deep Violet Midnight
    glowColor: '#c084fc',
    bgZoom: 1.09,
    bgOrigin: '25% 28%',
    brightness: 0.88,
    contrast: 1.10,
    waveFreq1: 6.0,
    waveFreq2: 12.8,
    ampBoost: 1.08
  },
  {
    tint: 'rgba(234, 179, 8, 0.11)', // Golden Horizon
    glowColor: '#facc15',
    bgZoom: 1.14,
    bgOrigin: '23% 27%',
    brightness: 0.94,
    contrast: 1.04,
    waveFreq1: 5.0,
    waveFreq2: 11.6,
    ampBoost: 1.02
  }
];

export default function AfterglowScene({
  currentScene,
  currentTrack,
  allTracks = [],
  isPlaying = false,
  currentTime = 0,
  duration = 180,
  volume = 0.85,
  onSeek,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  isShuffle = false,
  onToggleShuffle,
  repeatMode = 'all',
  onToggleRepeat,
  favorites = [],
  onToggleFavorite,
  onOpenSceneModal,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenPlaylistDrawer,
  onOpenSearch,
  onOpenAuthModal,
  user = null,
  audioElement = null,
  onClose
}) {
  const stageContainerRef = useRef(null);
  const waveTrackRef = useRef(null);
  const particlesCanvasRef = useRef(null);

  // 1. Build the discovery journey tracklist (Strictly ordered: Agar Tu Hota, The Night We Met, Faasle, Until I Found You)
  const journeyTracks = useMemo(() => {
    if (!allTracks || allTracks.length === 0) return [];

    const priorityKeywords = [
      { title: 'agar tu hota', artist: 'ankit' },
      { title: 'night we met', artist: 'lord huron' },
      { title: 'faasle', artist: 'kaavish' },
      { title: 'until i found you', artist: 'sanchez' }
    ];

    const prioritized = [];
    const remaining = [...allTracks];

    priorityKeywords.forEach(({ title, artist }) => {
      const idx = remaining.findIndex(t => {
        const tTitle = (t.title || '').toLowerCase();
        const tArtist = (t.artist || '').toLowerCase();
        return tTitle.includes(title) || (tTitle.includes(title.split(' ')[0]) && tArtist.includes(artist));
      });
      if (idx !== -1) {
        prioritized.push(remaining[idx]);
        remaining.splice(idx, 1);
      }
    });

    const list = [...prioritized, ...remaining].slice(0, 15);
    return list;
  }, [allTracks]);

  // Track initial active index
  const initialIndex = useMemo(() => {
    if (!currentTrack || journeyTracks.length === 0) return 0;
    const found = journeyTracks.findIndex(t => t.id === currentTrack.id);
    return found !== -1 ? found : 0;
  }, [currentTrack, journeyTracks]);

  // Continuous Position Physics State (0.00 to N-1)
  const [continuousPos, setContinuousPos] = useState(initialIndex);
  const continuousPosRef = useRef(initialIndex);
  continuousPosRef.current = continuousPos;

  const targetPosRef = useRef(initialIndex);
  const [dominantIndex, setDominantIndex] = useState(initialIndex);
  const dominantIndexRef = useRef(initialIndex);
  dominantIndexRef.current = dominantIndex;

  const scrollVelocityRef = useRef(0);
  const snapTimeoutRef = useRef(null);
  const audioSyncTimeoutRef = useRef(null);
  const isDraggingSeekRef = useRef(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  // User interaction & Audio Sync Protection Refs
  const isUserInteractingRef = useRef(false);
  const interactionTimerRef = useRef(null);
  const lastSyncedSongIdRef = useRef(currentTrack?.id || null);
  const photoImgRef = useRef(null);

  const markUserInteracting = useCallback(() => {
    isUserInteractingRef.current = true;
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 400);
  }, []);

  // Derived indices and interpolation fractions
  const fromIndex = Math.min(journeyTracks.length - 1, Math.max(0, Math.floor(continuousPos)));
  const toIndex = Math.min(journeyTracks.length - 1, fromIndex + 1);
  const stepProgress = Math.max(0, Math.min(1, continuousPos - fromIndex));
  const stepProgressRef = useRef(stepProgress);
  stepProgressRef.current = stepProgress;
  const fromIndexRef = useRef(fromIndex);
  fromIndexRef.current = fromIndex;
  const toIndexRef = useRef(toIndex);
  toIndexRef.current = toIndex;

  // Active tracks
  const activeTrack = journeyTracks[dominantIndex] || currentTrack || journeyTracks[0];
  const fromTrack = journeyTracks[fromIndex] || activeTrack;
  const toTrack = journeyTracks[toIndex] || activeTrack;

  const isFavorite = useMemo(() => {
    return Array.isArray(favorites) && activeTrack && favorites.includes(activeTrack.id);
  }, [favorites, activeTrack]);

  // Live player state refs
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const audioElementRef = useRef(audioElement);
  audioElementRef.current = audioElement;

  // SVG Wave Element Refs for 60fps direct GPU updates
  const playedWavePathRef = useRef(null);
  const unplayedWavePathRef = useRef(null);
  const waveThread2Ref = useRef(null);
  const waveThread3Ref = useRef(null);
  const playheadGlowRef = useRef(null);
  const playheadCoreRef = useRef(null);
  const playheadDropLineRef = useRef(null);
  const waveAnimFrameRef = useRef(null);
  const wavePhaseRef = useRef(0);

  // Sync external track change to position (ONLY when user is NOT actively scrolling)
  useEffect(() => {
    if (!currentTrack || journeyTracks.length === 0) return;
    lastSyncedSongIdRef.current = currentTrack.id;
    const idx = journeyTracks.findIndex(t => t.id === currentTrack.id);
    if (idx !== -1 && idx !== dominantIndexRef.current && !isUserInteractingRef.current) {
      const diff = Math.abs(targetPosRef.current - continuousPosRef.current);
      if (diff < 0.05) {
        targetPosRef.current = idx;
      }
    }
  }, [currentTrack?.id, journeyTracks]);

  // Smooth scroll target setter
  const scrollToSong = useCallback((index) => {
    if (journeyTracks.length === 0) return;
    markUserInteracting();
    const clamped = Math.max(0, Math.min(journeyTracks.length - 1, index));
    targetPosRef.current = clamped;
  }, [journeyTracks.length, markUserInteracting]);

  // Ultra-Smooth Physics Momentum Loop (Runs on requestAnimationFrame at 60/120Hz)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const physicsLoop = (time) => {
      const deltaMs = Math.min(32, time - lastTime);
      lastTime = time;

      const current = continuousPosRef.current;
      const target = targetPosRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.0003) {
        // Silky exponential lerp damping
        const lerpFactor = 1 - Math.exp(-0.011 * deltaMs);
        const nextPos = current + diff * Math.max(0.06, Math.min(0.22, lerpFactor * 9));
        
        scrollVelocityRef.current = Math.abs(diff);
        setContinuousPos(nextPos);
        continuousPosRef.current = nextPos;

        // Smooth continuous eye-zoom on <img> directly (zero lag, 120fps GPU)
        const maxIdx = Math.max(1, journeyTracks.length - 1);
        const scrollFraction = Math.max(0, Math.min(1, nextPos / maxIdx));
        // Scales smoothly from 1.05 up to ~2.35 directly focused into the eyes at (26.2%, 28.5%)
        const zoomScale = 1.05 + Math.pow(scrollFraction, 0.88) * 1.30;
        const contrastVal = 1.04 + scrollFraction * 0.08;
        const brightnessVal = 0.98 - scrollFraction * 0.04;
        const saturateVal = 1.05 + scrollFraction * 0.05;

        if (photoImgRef.current) {
          photoImgRef.current.style.transform = `scale(${zoomScale.toFixed(4)})`;
          photoImgRef.current.style.filter = `brightness(${brightnessVal.toFixed(3)}) contrast(${contrastVal.toFixed(3)}) saturate(${saturateVal.toFixed(3)})`;
        }

        // Continuous photo zoom and harmonic wave interpolation smoothly tracks nextPos
      } else if (current !== target) {
        setContinuousPos(target);
        continuousPosRef.current = target;
        scrollVelocityRef.current = 0;

        const maxIdx = Math.max(1, journeyTracks.length - 1);
        const scrollFraction = Math.max(0, Math.min(1, target / maxIdx));
        const zoomScale = 1.05 + Math.pow(scrollFraction, 0.88) * 1.30;
        const contrastVal = 1.04 + scrollFraction * 0.08;
        const brightnessVal = 0.98 - scrollFraction * 0.04;
        const saturateVal = 1.05 + scrollFraction * 0.05;

        if (photoImgRef.current) {
          photoImgRef.current.style.transform = `scale(${zoomScale.toFixed(4)})`;
          photoImgRef.current.style.filter = `brightness(${brightnessVal.toFixed(3)}) contrast(${contrastVal.toFixed(3)}) saturate(${saturateVal.toFixed(3)})`;
        }
      }

      // Smooth audio synchronization ONLY when completely settled and idle
      const isSettled = Math.abs(targetPosRef.current - continuousPosRef.current) < 0.006;
      if (isSettled && !isUserInteractingRef.current) {
        const settledIndex = dominantIndexRef.current;
        const song = journeyTracks[settledIndex];
        if (song && song.id !== lastSyncedSongIdRef.current) {
          if (audioSyncTimeoutRef.current) clearTimeout(audioSyncTimeoutRef.current);
          audioSyncTimeoutRef.current = setTimeout(() => {
            if (song && song.id !== currentTrack?.id && onSelectTrack) {
              lastSyncedSongIdRef.current = song.id;
              onSelectTrack(song, isPlayingRef.current);
            }
          }, 350);
        }
      }

      animId = requestAnimationFrame(physicsLoop);
    };

    animId = requestAnimationFrame(physicsLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioSyncTimeoutRef.current) clearTimeout(audioSyncTimeoutRef.current);
    };
  }, [journeyTracks, currentTrack?.id, onSelectTrack]);

  // Global Wheel & Trackpad Interceptor on the Scene Stage
  useEffect(() => {
    let wheelAccumulator = 0;
    let wheelTimer = null;
    let lastSwitchTime = 0;

    const handleWheel = (e) => {
      // Don't intercept if dragging playhead
      if (isDraggingSeekRef.current) return;

      e.preventDefault();
      markUserInteracting();

      let delta = e.deltaY;
      // Normalize line/page deltas
      if (e.deltaMode === 1) delta *= 24;
      else if (e.deltaMode === 2) delta *= window.innerHeight;

      const now = performance.now();
      wheelAccumulator += delta;

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelAccumulator = 0;
      }, 160);

      // Decisive threshold: immediately show next (or prev) song when scrolled
      const threshold = 18;
      if (Math.abs(wheelAccumulator) >= threshold && (now - lastSwitchTime > 240)) {
        const direction = wheelAccumulator > 0 ? 1 : -1;
        const currentIdx = dominantIndexRef.current;
        const maxIdx = journeyTracks.length - 1;
        const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + direction));

        if (nextIdx !== currentIdx) {
          lastSwitchTime = now;
          wheelAccumulator = 0;
          targetPosRef.current = nextIdx;
          setDominantIndex(nextIdx);
          dominantIndexRef.current = nextIdx;
        }
      }
    };

    // Touch Support for Mobile & Tablets
    let touchStartY = 0;
    let touchLastY = 0;
    let touchVelocity = 0;
    let lastTouchTime = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1 || isDraggingSeekRef.current) return;
      markUserInteracting();
      touchStartY = e.touches[0].clientY;
      touchLastY = touchStartY;
      touchVelocity = 0;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length !== 1 || isDraggingSeekRef.current) return;
      markUserInteracting();
      const y = e.touches[0].clientY;
      const deltaY = touchLastY - y;
      touchVelocity = deltaY;
      touchLastY = y;
      const now = performance.now();

      if (Math.abs(deltaY) > 22 && (now - lastTouchTime > 260)) {
        const direction = deltaY > 0 ? 1 : -1;
        const currentIdx = dominantIndexRef.current;
        const maxIdx = journeyTracks.length - 1;
        const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + direction));

        if (nextIdx !== currentIdx) {
          lastTouchTime = now;
          targetPosRef.current = nextIdx;
          setDominantIndex(nextIdx);
          dominantIndexRef.current = nextIdx;
        }
      }
    };

    const handleTouchEnd = () => {
      if (isDraggingSeekRef.current) return;
      markUserInteracting();
      if (Math.abs(touchVelocity) > 10) {
        const direction = touchVelocity > 0 ? 1 : -1;
        const currentIdx = dominantIndexRef.current;
        const maxIdx = journeyTracks.length - 1;
        const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + direction));
        targetPosRef.current = nextIdx;
        setDominantIndex(nextIdx);
        dominantIndexRef.current = nextIdx;
      }
    };

    const stageEl = stageContainerRef.current;
    if (stageEl) {
      stageEl.addEventListener('wheel', handleWheel, { passive: false });
      stageEl.addEventListener('touchstart', handleTouchStart, { passive: true });
      stageEl.addEventListener('touchmove', handleTouchMove, { passive: true });
      stageEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (stageEl) {
        stageEl.removeEventListener('wheel', handleWheel);
        stageEl.removeEventListener('touchstart', handleTouchStart);
        stageEl.removeEventListener('touchmove', handleTouchMove);
        stageEl.removeEventListener('touchend', handleTouchEnd);
      }
      if (wheelTimer) clearTimeout(wheelTimer);
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, [journeyTracks.length, markUserInteracting]);

  // Keyboard Shortcuts (Arrow keys, PageUp/Down, Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') {
        e.preventDefault();
        scrollToSong(Math.round(targetPosRef.current) + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') {
        e.preventDefault();
        scrollToSong(Math.round(targetPosRef.current) - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToSong(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToSong(journeyTracks.length - 1);
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (onTogglePlay) onTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToSong, onTogglePlay, journeyTracks.length]);

  // Waveform Click & Drag Scrubbing
  const calculateSeekTime = useCallback((clientX) => {
    if (!waveTrackRef.current || !durationRef.current) return 0;
    const rect = waveTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * durationRef.current;
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    setIsDraggingSeek(true);
    isDraggingSeekRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const targetTime = calculateSeekTime(clientX);
    if (onSeek) onSeek(targetTime);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingSeekRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const targetTime = calculateSeekTime(clientX);
      if (onSeek) onSeek(targetTime);
    };

    const handleUp = () => {
      if (isDraggingSeekRef.current) {
        setIsDraggingSeek(false);
        isDraggingSeekRef.current = false;
      }
    };

    if (isDraggingSeek) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingSeek, calculateSeekTime, onSeek]);

  // Ambient Golden Micro Dust Particles Canvas
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const PARTICLE_COUNT = 48;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -Math.random() * 0.45 - 0.15,
      alpha: Math.random() * 0.55 + 0.2,
      pulse: Math.random() * Math.PI * 2
    }));

    const renderParticles = () => {
      ctx.clearRect(0, 0, width, height);

      const velocity = scrollVelocityRef.current;
      const speedMultiplier = 1 + velocity * 1.8;

      particles.forEach((p) => {
        p.pulse += 0.022;
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${currentAlpha})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = p.size * 3.2;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(renderParticles);
    };

    animId = requestAnimationFrame(renderParticles);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // 60FPS Fluid Glowing Multi-Threaded Audio Wave Animation Loop with MORPHING
  useEffect(() => {
    const W = 600;
    const baseY = 36;
    const numPoints = 84;

    const renderWaveLoop = () => {
      const playing = isPlayingRef.current;
      const audioEl = audioElementRef.current;
      const cTime = currentTimeRef.current;
      const dur = durationRef.current || 180;
      const stepProg = stepProgressRef.current;
      const fIdx = fromIndexRef.current;
      const tIdx = toIndexRef.current;

      const fMood = SONG_MOOD_PROFILES[fIdx % SONG_MOOD_PROFILES.length];
      const tMood = SONG_MOOD_PROFILES[tIdx % SONG_MOOD_PROFILES.length];

      // Smoothly morph wave harmonic parameters
      const curFreq1 = fMood.waveFreq1 + (tMood.waveFreq1 - fMood.waveFreq1) * stepProg;
      const curFreq2 = fMood.waveFreq2 + (tMood.waveFreq2 - fMood.waveFreq2) * stepProg;
      const curAmpBoost = fMood.ampBoost + (tMood.ampBoost - fMood.ampBoost) * stepProg;

      const progressRatio = dur > 0 ? Math.min(1, Math.max(0, cTime / dur)) : 0;
      const metrics = getAudioMetrics(audioEl, playing);

      const basePhaseSpeed = playing ? 0.024 + metrics.pitch * 0.018 : 0.009;
      wavePhaseRef.current = (wavePhaseRef.current + basePhaseSpeed) % (Math.PI * 200);
      const phase = wavePhaseRef.current;

      const primaryAmp = (playing ? 16 + metrics.bass * 18 : 12.5) * curAmpBoost;
      const secondaryAmp = (playing ? 11 + metrics.mid * 13 : 8.5) * curAmpBoost;
      const tertiaryAmp = (playing ? 7.5 + metrics.treble * 9 : 5.5) * curAmpBoost;

      let primaryD = '';
      let thread2D = '';
      let thread3D = '';

      let playheadX = progressRatio * W;
      let playheadY = baseY;

      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * W;
        const normX = i / numPoints;
        const envelope = Math.sin(normX * Math.PI);

        const y1 = baseY +
          Math.sin(normX * curFreq1 + phase) * (primaryAmp * 0.72) * envelope +
          Math.sin(normX * curFreq2 - phase * 0.7) * (primaryAmp * 0.28) * envelope;

        const y2 = baseY +
          Math.sin(normX * (curFreq1 * 1.25) - phase * 0.85) * (secondaryAmp * 0.75) * envelope +
          Math.cos(normX * (curFreq2 * 1.15) + phase * 0.55) * (secondaryAmp * 0.25) * envelope;

        const y3 = baseY +
          Math.cos(normX * (curFreq1 * 1.5) + phase * 0.8) * (tertiaryAmp * 0.8) * envelope +
          Math.sin(normX * (curFreq2 * 1.35) - phase * 1.1) * (tertiaryAmp * 0.2) * envelope;

        if (i === 0) {
          primaryD = `M ${x.toFixed(1)} ${y1.toFixed(1)}`;
          thread2D = `M ${x.toFixed(1)} ${y2.toFixed(1)}`;
          thread3D = `M ${x.toFixed(1)} ${y3.toFixed(1)}`;
        } else {
          primaryD += ` L ${x.toFixed(1)} ${y1.toFixed(1)}`;
          thread2D += ` L ${x.toFixed(1)} ${y2.toFixed(1)}`;
          thread3D += ` L ${x.toFixed(1)} ${y3.toFixed(1)}`;
        }

        if (normX <= progressRatio && (i + 1) / numPoints >= progressRatio) {
          playheadY = y1;
        }
      }

      if (playedWavePathRef.current) playedWavePathRef.current.setAttribute('d', primaryD);
      if (unplayedWavePathRef.current) unplayedWavePathRef.current.setAttribute('d', primaryD);
      if (waveThread2Ref.current) waveThread2Ref.current.setAttribute('d', thread2D);
      if (waveThread3Ref.current) waveThread3Ref.current.setAttribute('d', thread3D);

      if (playheadGlowRef.current) {
        playheadGlowRef.current.setAttribute('cx', playheadX.toFixed(1));
        playheadGlowRef.current.setAttribute('cy', playheadY.toFixed(1));
      }
      if (playheadCoreRef.current) {
        playheadCoreRef.current.setAttribute('cx', playheadX.toFixed(1));
        playheadCoreRef.current.setAttribute('cy', playheadY.toFixed(1));
      }
      if (playheadDropLineRef.current) {
        playheadDropLineRef.current.setAttribute('x1', playheadX.toFixed(1));
        playheadDropLineRef.current.setAttribute('y1', playheadY.toFixed(1));
        playheadDropLineRef.current.setAttribute('x2', playheadX.toFixed(1));
        playheadDropLineRef.current.setAttribute('y2', (baseY + 34).toFixed(1));
      }

      waveAnimFrameRef.current = requestAnimationFrame(renderWaveLoop);
    };

    waveAnimFrameRef.current = requestAnimationFrame(renderWaveLoop);

    return () => {
      if (waveAnimFrameRef.current) cancelAnimationFrame(waveAnimFrameRef.current);
    };
  }, []);

  // Compute smooth cinematic background interpolation
  const fromMood = SONG_MOOD_PROFILES[fromIndex % SONG_MOOD_PROFILES.length];
  const toMood = SONG_MOOD_PROFILES[toIndex % SONG_MOOD_PROFILES.length];

  const normalizedTotalProgress = (journeyTracks.length > 1) ? (continuousPos / (journeyTracks.length - 1)) : 0;
  const bgScale = fromMood.bgZoom + (toMood.bgZoom - fromMood.bgZoom) * stepProgress + normalizedTotalProgress * 0.08;
  const bgBrightness = fromMood.brightness + (toMood.brightness - fromMood.brightness) * stepProgress;
  const bgContrast = fromMood.contrast + (toMood.contrast - fromMood.contrast) * stepProgress;
  const bgTranslateX = -normalizedTotalProgress * 18;
  const bgTranslateY = normalizedTotalProgress * 12;

  // Transition indicator for ambient color tint
  const isTransitioning = fromIndex !== toIndex && stepProgress > 0.005 && stepProgress < 0.995;

  return (
    <div 
      className="afterglow-cinematic-stage" 
      ref={stageContainerRef}
    >
      {/* 1. Full-Screen Cinematic Photograph Background Canvas */}
      <div className="afterglow-photo-canvas" aria-hidden="true">
        <img 
          ref={photoImgRef}
          src="/assets/images/afterglow_bg.jpg" 
          alt="Afterglow Cinematic Scene" 
          className="afterglow-photo-img"
          style={{
            transform: `scale(${bgScale.toFixed(4)})`,
            filter: `brightness(${bgBrightness.toFixed(3)}) contrast(${bgContrast.toFixed(3)}) saturate(1.05)`
          }}
        />

        {/* Ambient Subtle Color Tint Layer derived from active song mood */}
        <div 
          className="afterglow-artwork-ambient-layer"
          style={{
            backgroundColor: isTransitioning ? toMood.tint : fromMood.tint,
            opacity: 0.85
          }}
        />

        {/* Ambient Dark Photographic Vignette & Amber Bokeh Scrim */}
        <div className="afterglow-cinematic-scrim" />
        <div 
          className="afterglow-amber-light-flare"
          style={{
            background: `radial-gradient(circle at 62% 46%, ${isTransitioning ? toMood.tint : fromMood.tint} 0%, transparent 60%)`
          }}
        />

        {/* Floating Golden Micro Dust Particles */}
        <canvas ref={particlesCanvasRef} className="afterglow-particles-canvas" />
      </div>

      {/* 2. Top Navigation Bar (Floating Borderless Typography & Icons) */}
      <header className="afterglow-top-bar">
        {/* Top Left Branding */}
        <div className="afterglow-top-left-brand">
          <div className="brand-logo-row">
            <span className="brand-logo-text">MUSICLY</span>
            <span className="brand-dash-line" />
          </div>
          <div className="brand-motto-stack">
            <span>SOUNDS</span>
            <span>FOR A</span>
            <span>BETTER YOU</span>
          </div>
        </div>

        {/* Top Right Navigation */}
        <nav className="afterglow-top-right-nav">
          {onOpenSceneModal && (
            <button className="afterglow-nav-link" onClick={onOpenSceneModal}>
              SCENES
            </button>
          )}
          {onOpenPlaylistDrawer && (
            <button className="afterglow-nav-link" onClick={onOpenPlaylistDrawer}>
              LIBRARY
            </button>
          )}
          {onOpenSearch && (
            <button className="afterglow-nav-link" onClick={onOpenSearch}>
              SEARCH
            </button>
          )}
          {onOpenAmbient && (
            <button 
              className={`afterglow-nav-link ${activeAmbientCount > 0 ? 'is-active' : ''}`} 
              onClick={onOpenAmbient}
            >
              AMBIENT{activeAmbientCount > 0 ? ` (${activeAmbientCount})` : ''}
            </button>
          )}
          {onOpenAuthModal && (
            <button 
              className="afterglow-nav-user-btn" 
              onClick={onOpenAuthModal}
              title={user && !user.isAnonymous ? (user.displayName || user.email) : 'Sign in / Profile'}
            >
              <div className="afterglow-user-avatar-circle">
                <User size={13} strokeWidth={2} />
              </div>
              <span className="afterglow-user-name-label">
                {user && !user.isAnonymous 
                  ? (user.displayName || (user.email ? user.email.split('@')[0] : 'USER'))
                  : 'USER'}
              </span>
            </button>
          )}
        </nav>
      </header>

      {/* 3. Subtle Corner Editorial Reflections (Zero intrusive side clutter) */}
      <div 
        className="afterglow-bottom-left-editorial" 
        style={{ opacity: Math.max(0, 1 - normalizedTotalProgress * 2.5) }}
        aria-hidden="true"
      >
        <span>SOME</span>
        <span>SONGS</span>
        <span>STAY</span>
        <span>LONGER</span>
      </div>

      <div 
        className="afterglow-bottom-right-editorial"
        style={{ opacity: Math.max(0, 1 - normalizedTotalProgress * 2.5) }}
        aria-hidden="true"
      >
        <span className="bottom-right-line" />
        <div className="bottom-right-words">
          <span>A</span>
          <span>KINDER</span>
          <span>YOU</span>
        </div>
      </div>

      {/* 4. Main Floating Center-Right Visual Stage (Position: Fixed, Zero Boxes) */}
      <main className="afterglow-center-right-cluster">
        
        {/* Main Title Block: AFTERGLOW + Subtle Song Counter */}
        <div className="afterglow-title-block">
          <div className="afterglow-hero-title-row">
            <h1 className="afterglow-hero-title">
              AFTERGL<EclipseO />W
            </h1>
            <span className="afterglow-song-count-text">
              {String(dominantIndex + 1).padStart(2, '0')} / {String(journeyTracks.length).padStart(2, '0')}
            </span>
          </div>
          <p className="afterglow-hero-subtitle">
            SOUNDS BETWEEN MOMENTS
          </p>
        </div>

        {/* Floating Song Identity Block: Directly displays the active / next song on scroll */}
        <div className="afterglow-song-identity-stage">
          <div 
            key={activeTrack?.id || dominantIndex}
            className="afterglow-song-identity"
          >
            <img 
              src={activeTrack?.cover || '/assets/images/vibe_card_01.jpg'} 
              alt={activeTrack?.title || 'Song'} 
              className="afterglow-song-cover"
            />
            <div className="afterglow-song-meta">
              <h2 className="afterglow-song-title">
                {activeTrack?.title || 'Agar Tu Hota'}
              </h2>
              <p className="afterglow-song-artist">
                {activeTrack?.artist || 'Ankit Tiwari'}
              </p>
            </div>
            <button 
              className={`afterglow-fav-heart-btn ${isFavorite ? 'is-fav' : ''}`}
              onClick={() => onToggleFavorite && onToggleFavorite(activeTrack?.id)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart 
                size={18} 
                strokeWidth={1.8}
                fill={isFavorite ? '#fbbf24' : 'none'} 
                color={isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)'} 
              />
            </button>
          </div>
        </div>

        {/* Glowing Flowing Audio Waveform (Morphs Smoothly Across Songs) */}
        <div className="afterglow-waveform-region">
          {/* Left Elapsed Time */}
          <span className="afterglow-wave-time time-left">
            {formatTime(currentTime)}
          </span>

          {/* The Multi-Threaded Audio Waveform Track */}
          <div 
            className="afterglow-waveform-track"
            ref={waveTrackRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            title="Drag or click to seek"
          >
            <svg 
              viewBox="0 0 600 64" 
              className="afterglow-waveform-svg"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Glowing Amber / Gold Audio Thread Gradient */}
                <linearGradient id="afterglowThreadGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.45" />
                  <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.5" />
                </linearGradient>

                {/* Secondary Harmonic Wave Thread */}
                <linearGradient id="afterglowSecondaryThread" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                  <stop offset="50%" stopColor="rgba(251, 191, 36, 0.45)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" />
                </linearGradient>

                {/* Ethereal Luminous Bloom Filter */}
                <filter id="afterglowWaveGlowFilter" x="-20%" y="-40%" width="140%" height="180%">
                  <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. Base Subtle Guide Line */}
              <line 
                x1="0" 
                y1="32" 
                x2="600" 
                y2="32" 
                stroke="rgba(255, 255, 255, 0.08)" 
                strokeWidth="1" 
              />

              {/* 2. Secondary Harmonic Wave Thread */}
              <path 
                ref={waveThread2Ref}
                fill="none" 
                stroke="url(#afterglowSecondaryThread)" 
                strokeWidth="1.2" 
                opacity="0.65"
              />

              {/* 3. Tertiary Shimmer Wave Thread */}
              <path 
                ref={waveThread3Ref}
                fill="none" 
                stroke="rgba(255, 255, 255, 0.22)" 
                strokeWidth="0.8" 
                opacity="0.5"
              />

              {/* 4. Primary Luminous Audio Wave Thread (Warm Amber Glow) */}
              <path 
                ref={playedWavePathRef}
                fill="none" 
                stroke="url(#afterglowThreadGlow)" 
                strokeWidth="2.2" 
                filter="url(#afterglowWaveGlowFilter)"
              />

              {/* 5. Playhead Vertical Drop Indicator Line */}
              <line 
                ref={playheadDropLineRef}
                x1="0" 
                y1="32" 
                x2="0" 
                y2="64" 
                stroke="rgba(251, 191, 36, 0.45)" 
                strokeWidth="1" 
                strokeDasharray="2 3"
              />

              {/* 6. Playhead Radiant Aura Glow */}
              <circle 
                ref={playheadGlowRef}
                cx="0" 
                cy="32" 
                r="9" 
                fill="rgba(251, 191, 36, 0.35)" 
                filter="url(#afterglowWaveGlowFilter)"
              />

              {/* 7. Playhead Core Pearl */}
              <circle 
                ref={playheadCoreRef}
                cx="0" 
                cy="32" 
                r="4.5" 
                fill="#ffffff" 
                stroke="#fbbf24" 
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Right Total Duration */}
          <span className="afterglow-wave-time time-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Floating Minimal Playback Controls */}
        <div className="afterglow-playback-controls">
          <button 
            className={`afterglow-ctrl-icon-btn ${isShuffle ? 'is-active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} strokeWidth={1.8} />
          </button>

          <button 
            className="afterglow-ctrl-icon-btn"
            onClick={() => scrollToSong(Math.round(targetPosRef.current) - 1)}
            title="Previous Song"
          >
            <SkipBack size={18} strokeWidth={1.8} />
          </button>

          {/* Play / Pause Circular Outline Button */}
          <button 
            className="afterglow-play-circle-outline"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" style={{ marginLeft: '2.5px' }} />
            )}
          </button>

          <button 
            className="afterglow-ctrl-icon-btn"
            onClick={() => scrollToSong(Math.round(targetPosRef.current) + 1)}
            title="Next Song"
          >
            <SkipForward size={18} strokeWidth={1.8} />
          </button>

          <button 
            className={`afterglow-ctrl-icon-btn ${repeatMode !== 'off' ? 'is-active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={17} strokeWidth={1.8} />
            ) : (
              <Repeat size={17} strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Scroll Cue Hint */}
        <div 
          className="afterglow-scroll-cue" 
          style={{ opacity: Math.max(0, 1 - continuousPos * 2.5) }}
          onClick={() => scrollToSong(1)}
        >
          <span>SCROLL TO DISCOVER SONGS</span>
          <ChevronDown size={14} className="scroll-cue-chevron" />
        </div>

      </main>
    </div>
  );
}

