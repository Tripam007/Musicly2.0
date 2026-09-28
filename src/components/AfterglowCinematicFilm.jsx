import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Heart
} from 'lucide-react';
import { isGhazalLanguage } from '../data/tracks';

// Floating editorial genres (zero boxes, zero cards)
const GENRES = [
  { id: 'indie', name: 'INDIE', x: 26, y: 38, glow: 'rgba(245, 158, 11, 0.45)', color: '#fbbf24' },
  { id: 'retro', name: 'RETRO', x: 74, y: 34, glow: 'rgba(251, 146, 60, 0.45)', color: '#fb923c' },
  { id: 'ghazal', name: 'GHAZAL', x: 80, y: 55, glow: 'rgba(217, 119, 6, 0.45)', color: '#d97706' },
  { id: 'lo-fi', name: 'LO-FI', x: 25, y: 64, glow: 'rgba(56, 189, 248, 0.45)', color: '#38bdf8' },
  { id: 'synthwave', name: 'SYNTHWAVE', x: 48, y: 80, glow: 'rgba(236, 72, 153, 0.45)', color: '#ec4899' },
  { id: 'peace', name: 'PEACE', x: 18, y: 50, glow: 'rgba(167, 139, 250, 0.45)', color: '#a78bfa' },
  { id: 'chill-sleep', name: 'CHILL / SLEEP', x: 70, y: 72, glow: 'rgba(129, 140, 248, 0.45)', color: '#818cf8' },
];

// Curated cinematic journey songs per prompt specification
const DEFAULT_JOURNEY_TRACKS = [
  {
    id: 'afterglow-01',
    title: 'The Night We Met',
    artist: 'Lord Huron',
    duration: 208,
    genre: 'INDIE',
    envMood: {
      name: 'Warm Amber Highway',
      color: '#fbbf24',
      ambientGlow: 'rgba(251, 191, 36, 0.22)',
      portalTint: 'rgba(255, 183, 3, 0.35)',
      filter: 'sepia(0.2) saturate(1.15) brightness(1.02)'
    }
  },
  {
    id: 'afterglow-02',
    title: 'Faasle',
    artist: 'Kaavish',
    duration: 254,
    genre: 'INDIE',
    envMood: {
      name: 'Cool Mountain Mist',
      color: '#38bdf8',
      ambientGlow: 'rgba(56, 189, 248, 0.22)',
      portalTint: 'rgba(56, 189, 248, 0.35)',
      filter: 'hue-rotate(185deg) saturate(1.2) brightness(0.96)'
    }
  },
  {
    id: 'afterglow-03',
    title: 'Agar Tu Hota',
    artist: 'Ankit Tiwari',
    duration: 328,
    genre: 'INDIE',
    envMood: {
      name: 'Crimson Nightfall',
      color: '#f43f5e',
      ambientGlow: 'rgba(244, 63, 94, 0.24)',
      portalTint: 'rgba(244, 63, 94, 0.38)',
      filter: 'hue-rotate(320deg) saturate(1.3) brightness(0.94)'
    }
  },
  {
    id: 'afterglow-04',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    duration: 177,
    genre: 'INDIE',
    envMood: {
      name: 'Golden Sunrise Horizon',
      color: '#f59e0b',
      ambientGlow: 'rgba(245, 158, 11, 0.28)',
      portalTint: 'rgba(251, 146, 60, 0.42)',
      filter: 'sepia(0.35) saturate(1.35) brightness(1.06)'
    }
  }
];

export default function AfterglowCinematicFilm({
  allTracks = [],
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 180,
  volume = 0.85,
  onSeek,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSelectTrack,
  onOpenSceneModal,
  onOpenPlaylistDrawer,
  onOpenSearch,
  onOpenAmbient,
  activeAmbientCount = 0,
  onOpenAuthModal,
  user,
  favorites = [],
  onToggleFavorite,
  onOpenClassic,
  onClose,
  audioElement,
  selectedLanguage
}) {
  // =========================================================================
  // 1. STATE & LIFECYCLE MANAGEMENT
  // =========================================================================
  
  // Stages: 'intro' -> 'eye_transition' -> 'iris_flash' -> 'car_reveal' -> 'journey'
  const availableGenres = useMemo(() => {
    if (isGhazalLanguage(selectedLanguage)) {
      return GENRES;
    }
    return GENRES.filter(g => g.id !== 'ghazal');
  }, [selectedLanguage]);
  const [stage, setStage] = useState('intro');
  const [selectedGenre, setSelectedGenre] = useState('INDIE');
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [genreLocked, setGenreLocked] = useState(false);

  // Transition progression (0.0 to 1.0)
  const [eyeProgress, setEyeProgress] = useState(0);
  const [whiteExposure, setWhiteExposure] = useState(0); // 150-250ms white flash
  const [carRevealOpacity, setCarRevealOpacity] = useState(0);

  // Discrete song indexing (One song at a time)
  const [activeSongIndex, setActiveSongIndex] = useState(0);

  // Kinematic camera & road forward travel refs (decoupled from React render loop)
  const cameraZRef = useRef(0); // continuous virtual distance traveled
  const targetCameraZRef = useRef(0);
  const velocityRef = useRef(0);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const engineClockRef = useRef(0);

  // Canvas refs for high-performance GPU-friendly depth rendering
  const roadCanvasRef = useRef(null);
  const particlesCanvasRef = useRef(null);
  const dropletsCanvasRef = useRef(null);
  const waveformTrackRef = useRef(null);

  // Build the list of journey songs matching the selected genre or fallback to defaults
  const journeyTracks = useMemo(() => {
    const genreFiltered = allTracks.filter(t => 
      t.genre && t.genre.toLowerCase() === selectedGenre.toLowerCase()
    );

    if (genreFiltered.length >= 4) {
      return genreFiltered.slice(0, 12).map((track, i) => ({
        ...track,
        envMood: DEFAULT_JOURNEY_TRACKS[i % DEFAULT_JOURNEY_TRACKS.length].envMood
      }));
    }

    // Blend matched tracks with curated cinematic tracks
    return DEFAULT_JOURNEY_TRACKS.map(def => {
      const match = allTracks.find(t => 
        t.title && t.title.toLowerCase().includes(def.title.toLowerCase())
      );
      return match ? { ...match, envMood: def.envMood } : def;
    });
  }, [allTracks, selectedGenre]);

  const currentJourneyTrack = journeyTracks[activeSongIndex] || journeyTracks[0];
  const isCurrentFavorite = useMemo(() => {
    return favorites.some(f => f.id === currentJourneyTrack?.id);
  }, [favorites, currentJourneyTrack]);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // =========================================================================
  // 2. GENRE SELECTION & EYE CINEMATIC TRANSITION (Parts 1, 2, 3, 4)
  // =========================================================================
  
  const handleSelectGenre = useCallback((genre) => {
    if (genreLocked || stage !== 'intro') return;
    setGenreLocked(true);
    setSelectedGenre(genre.name);

    if (prefersReducedMotion) {
      // Direct crossfade for reduced motion users
      setStage('journey');
      setActiveSongIndex(0);
      return;
    }

    // STEP 1: Selected genre remains visible for approx 300ms
    setTimeout(() => {
      setStage('eye_transition');
      const startTime = performance.now();
      const DURATION = 2800; // 2.8s cinematic push into eye

      const stepEye = (now) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / DURATION);
        
        // Natural exponential camera push curve
        const easeCamera = Math.pow(p, 2.2);
        setEyeProgress(easeCamera);

        if (p < 1) {
          requestAnimationFrame(stepEye);
        } else {
          // STEP 4: IRIS TRANSITION -> LIGHT -> WHITE EXPOSURE -> DARKNESS -> CAR WORLD
          setStage('iris_flash');
          setWhiteExposure(1);

          // White frame lasts 180ms
          setTimeout(() => {
            setWhiteExposure(0);
            setStage('car_reveal');
            setCarRevealOpacity(1);

            // PART 7: 1-second cinematic breathing room with only "[GENRE] / MUSIC FOR THE ROAD AHEAD"
            setTimeout(() => {
              setStage('journey');
            }, 1100);
          }, 180);
        }
      };

      requestAnimationFrame(stepEye);
    }, 320);
  }, [genreLocked, stage, prefersReducedMotion]);

  // =========================================================================
  // 3. CONTINUOUS PERSPECTIVE CAMERA & PARTICLES ENGINE (Parts 5, 6, 10)
  // =========================================================================

  // Scroll listener for controlling the forward camera movement
  useEffect(() => {
    if (stage !== 'journey') return;

    let touchStartY = 0;

    const handleWheel = (e) => {
      e.preventDefault();
      // Scroll down = camera moves forward
      const delta = e.deltaY * 0.0018;
      targetCameraZRef.current = Math.max(0, targetCameraZRef.current + delta);
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const touchY = e.touches[0].clientY;
      const delta = (touchStartY - touchY) * 0.003;
      touchStartY = touchY;
      targetCameraZRef.current = Math.max(0, targetCameraZRef.current + delta);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        targetCameraZRef.current += 0.35;
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetCameraZRef.current = Math.max(0, targetCameraZRef.current - 0.35);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stage]);

  // 3D perspective particles definition
  const particlesRef = useRef([]);
  useEffect(() => {
    const count = 120;
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({
        x: (Math.random() - 0.5) * 2000,
        y: Math.random() * 800 - 200,
        z: Math.random() * 1500 + 100,
        size: Math.random() * 2.2 + 0.8,
        speed: Math.random() * 1.5 + 1.0,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
    particlesRef.current = pts;
  }, []);

  // Main 60 FPS cinematic render loop
  useEffect(() => {
    let active = true;

    const renderLoop = (time) => {
      if (!active) return;
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;
      engineClockRef.current += dt;

      // Silky smooth camera damping
      const prevZ = cameraZRef.current;
      cameraZRef.current += (targetCameraZRef.current - cameraZRef.current) * (1 - Math.exp(-dt * 6.5));
      const velocity = Math.abs(cameraZRef.current - prevZ) / (dt || 0.016);
      velocityRef.current = velocity;

      // Update active song index based on discrete camera destination intervals
      // Every 1.0 units of Z distance represents travel to the next song
      const songInterval = 1.0;
      const rawIndex = Math.floor(cameraZRef.current / songInterval);
      const boundedIndex = Math.max(0, Math.min(journeyTracks.length - 1, rawIndex));

      if (boundedIndex !== activeSongIndex && stage === 'journey') {
        setActiveSongIndex(boundedIndex);
      }

      // -----------------------------------------------------------------------
      // Canvas 1: Wet Road Perspective & Vanishing Rays
      // -----------------------------------------------------------------------
      const roadCanvas = roadCanvasRef.current;
      if (roadCanvas && stage === 'journey') {
        const ctx = roadCanvas.getContext('2d');
        const w = roadCanvas.width;
        const h = roadCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Vanishing point anchored at the portal: (29.5% x, 42.5% y)
        const vpX = w * 0.295;
        const vpY = h * 0.425;

        // Dynamic highway specular light reflections moving toward camera
        const roadZ = (cameraZRef.current * 80) % 100;
        const numStreaks = 22;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < numStreaks; i++) {
          const progress = ((i / numStreaks) + (roadZ / 100)) % 1;
          const y = vpY + (h - vpY) * Math.pow(progress, 2.4);
          const spread = Math.pow(progress, 2.0);
          const leftX = vpX - (w * 0.45) * spread;
          const rightX = vpX + (w * 0.85) * spread;

          if (y > vpY + 10) {
            const alpha = Math.sin(progress * Math.PI) * 0.18;
            ctx.strokeStyle = `rgba(255, 230, 180, ${alpha})`;
            ctx.lineWidth = Math.max(1, progress * 4.5);
            ctx.beginPath();
            ctx.moveTo(leftX, y);
            ctx.lineTo(rightX, y);
            ctx.stroke();
          }
        }

        // Wet asphalt high-speed tire spray & mist near the car (x=54%, 72%)
        if (velocity > 0.05) {
          const sprayAlpha = Math.min(0.28, velocity * 0.08);
          const gradient = ctx.createRadialGradient(w * 0.63, h * 0.76, 5, w * 0.63, h * 0.76, w * 0.22);
          gradient.addColorStop(0, `rgba(255, 215, 150, ${sprayAlpha})`);
          gradient.addColorStop(1, 'rgba(255, 215, 150, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(w * 0.45, h * 0.60, w * 0.45, h * 0.35);
        }

        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // Canvas 2: 3D Passing Dust / Light Particles (Perspective Projection)
      // -----------------------------------------------------------------------
      const partCanvas = particlesCanvasRef.current;
      if (partCanvas && stage === 'journey') {
        const ctx = partCanvas.getContext('2d');
        const w = partCanvas.width;
        const h = partCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const vpX = w * 0.295;
        const vpY = h * 0.425;
        const fov = 400;

        ctx.save();
        ctx.fillStyle = '#fff';

        const speedMultiplier = 1 + velocityRef.current * 4.5;

        particlesRef.current.forEach(p => {
          // Particles move toward camera as camera moves forward
          p.z -= p.speed * speedMultiplier * dt * 280;
          if (p.z <= 20) {
            p.z = 1500;
            p.x = (Math.random() - 0.5) * 2000;
            p.y = Math.random() * 800 - 200;
          }

          const scale = fov / p.z;
          const sx = vpX + p.x * scale;
          const sy = vpY + p.y * scale;

          if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
            const rad = Math.max(0.5, p.size * scale);
            const alpha = Math.min(0.7, p.alpha * (1 - p.z / 1500));
            
            ctx.fillStyle = `rgba(255, 235, 200, ${alpha})`;
            ctx.beginPath();
            
            // At high forward speed, particles stretch slightly into light streaks
            if (velocityRef.current > 0.4) {
              const streakLen = Math.min(25, velocityRef.current * 12 * scale);
              ctx.ellipse(sx, sy, rad, rad + streakLen, 0, 0, Math.PI * 2);
            } else {
              ctx.arc(sx, sy, rad, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        });

        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // Canvas 3: Water Droplets Parallax on Camera Lens (Eye Zoom Stage)
      // -----------------------------------------------------------------------
      const dropCanvas = dropletsCanvasRef.current;
      if (dropCanvas && stage === 'eye_transition') {
        const ctx = dropCanvas.getContext('2d');
        const w = dropCanvas.width;
        const h = dropCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Water droplets move outward as camera pushes in
        const dropCount = 35;
        const progress = eyeProgress;
        ctx.save();

        for (let i = 0; i < dropCount; i++) {
          const seed = i * 137.5;
          const baseX = (Math.sin(seed) * 0.5 + 0.5) * w;
          const baseY = (Math.cos(seed * 1.3) * 0.5 + 0.5) * h;
          
          // Outward drift from eye focal center (52.5% x, 44.2% y)
          const dirX = baseX - w * 0.525;
          const dirY = baseY - h * 0.442;
          const curX = baseX + dirX * progress * 0.8;
          const curY = baseY + dirY * progress * 0.8;
          const size = (Math.sin(seed * 2) * 2 + 3.5) * (1 + progress * 1.5);
          const alpha = Math.max(0, (1 - progress * 1.2) * 0.6);

          if (curX > 0 && curX < w && curY > 0 && curY < h && alpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(curX, curY, size, 0, Math.PI * 2);
            ctx.fill();

            // Specular droplet highlight
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.5})`;
            ctx.beginPath();
            ctx.arc(curX - size * 0.3, curY - size * 0.3, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stage, eyeProgress, activeSongIndex, journeyTracks.length]);

  // Handle window resizing for full-resolution canvases
  useEffect(() => {
    const handleResize = () => {
      const canvases = [roadCanvasRef.current, particlesCanvasRef.current, dropletsCanvasRef.current];
      canvases.forEach(cvs => {
        if (cvs) {
          cvs.width = window.innerWidth;
          cvs.height = window.innerHeight;
        }
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync journey song with Musicly audio player
  const handlePlayJourneyTrack = useCallback((track) => {
    if (!track) return;
    if (currentTrack?.id === track.id) {
      onTogglePlay();
    } else {
      onSelectTrack(track, true);
    }
  }, [currentTrack, onTogglePlay, onSelectTrack]);

  // Waveform interactive seek handler
  const handleWaveformSeek = useCallback((e) => {
    if (!waveformTrackRef.current || !duration) return;
    const rect = waveformTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * duration);
  }, [duration, onSeek]);

  // =========================================================================
  // 4. DEPTH & CAMERA TRANSFORM CALCULATIONS
  // =========================================================================

  // Continuous camera distance and speed
  const cameraZ = cameraZRef.current;
  const scrollVelocity = velocityRef.current;

  // 7 Cinematic Depth Layer Transforms:
  // Layer 1: Sky & Mountains (0.04x parallax)
  const mountainTransform = `scale(${1 + cameraZ * 0.04}) translate3d(0, ${cameraZ * 2}px, 0)`;
  
  // Layer 3: Light Portal & Sunbeams (0.35x parallax)
  const portalScale = 1 + cameraZ * 0.28;
  const portalBloom = Math.min(1.8, 1 + scrollVelocity * 0.45);
  const portalTransform = `translate(-50%, -50%) scale(${portalScale})`;

  // Layer 5: Grounded F1 Car (Spatially grounded at 63% x, 64% y)
  // Subtle 32Hz engine suspension micro-vibration + aerodynamic squat on forward acceleration
  const engineRumbleY = Math.sin(engineClockRef.current * 32) * 0.85;
  const throttleSquat = Math.min(6, scrollVelocity * 3.8);
  const carTransform = `translate3d(0, ${engineRumbleY + throttleSquat}px, 0) scale(${1 + cameraZ * 0.012})`;

  // Environment mood color styling based on active song
  const currentMood = currentJourneyTrack?.envMood || DEFAULT_JOURNEY_TRACKS[0].envMood;

  // =========================================================================
  // 5. RENDER PRESENTATION
  // =========================================================================
  return (
    <div className="afterglow-master-container">
      {/* =====================================================================
          PHASE A: AFTERGLOW HERO INTRO & EDITORIAL GENRE SELECTION
          (Part 1 & Part 2: Exact existing photograph, floating typography, zero cards)
         ===================================================================== */}
      {(stage === 'intro' || stage === 'eye_transition' || stage === 'iris_flash') && (
        <div 
          className="afterglow-intro-stage"
          style={{
            opacity: stage === 'iris_flash' ? 0 : 1,
            transition: stage === 'iris_flash' ? 'opacity 0.2s ease-out' : 'none'
          }}
        >
          {/* Depth Layer B: Base Hero Photograph with Progressive Defocus */}
          <div 
            className="afterglow-hero-photo-layer"
            style={{
              transformOrigin: '52.5% 44.2%', // Precise center of the woman's eye
              transform: stage === 'eye_transition' 
                ? `scale(${1 + eyeProgress * 14.5}) translate3d(${eyeProgress * -15}px, ${eyeProgress * -8}px, 0)` 
                : 'scale(1.0)',
              filter: stage === 'eye_transition' 
                ? `blur(${eyeProgress * 9.5}px) brightness(${1 + eyeProgress * 0.35})` 
                : 'none',
              transition: stage === 'eye_transition' ? 'none' : 'filter 0.5s ease'
            }}
          >
            <img 
              src="/assets/images/afterglow_bg.jpg" 
              alt="Afterglow Hero Visual" 
              className="afterglow-hero-img"
            />
          </div>

          {/* Depth Layer C: Macro Eye Layer emerging during camera approach (Part 3) */}
          {stage === 'eye_transition' && eyeProgress > 0.45 && (
            <div 
              className="afterglow-macro-eye-layer"
              style={{
                opacity: Math.min(1, (eyeProgress - 0.45) / 0.4),
                transformOrigin: 'center center',
                transform: `scale(${1 + (eyeProgress - 0.45) * 4.2})`,
                filter: `brightness(${1 + (eyeProgress - 0.45) * 0.5})`
              }}
            >
              <img 
                src="/assets/storyboard/panel_02_clean.jpg" 
                alt="Macro Eye Focus" 
                className="afterglow-macro-eye-img"
              />
            </div>
          )}

          {/* Depth Layer D: Pupil Vortex at closest proximity (Part 4) */}
          {stage === 'eye_transition' && eyeProgress > 0.82 && (
            <div 
              className="afterglow-pupil-vortex-layer"
              style={{
                opacity: Math.min(1, (eyeProgress - 0.82) / 0.18),
                transform: `scale(${1 + (eyeProgress - 0.82) * 6}) rotate(${(eyeProgress - 0.82) * 35}deg)`
              }}
            >
              <img 
                src="/assets/storyboard/panel_03_clean.jpg" 
                alt="Cosmic Pupil Vortex" 
                className="afterglow-pupil-vortex-img"
              />
            </div>
          )}

          {/* Depth Layer A: Foreground Water Droplets Canvas */}
          <canvas 
            ref={dropletsCanvasRef} 
            className="afterglow-droplets-canvas"
          />

          {/* Floating Editorial Intro Typography (Disappears cleanly on click) */}
          {stage === 'intro' && (
            <div className="afterglow-intro-editorial-overlay">
              {/* Brand Title: AFTERGLOW / CHOOSE YOUR JOURNEY */}
              <div className="afterglow-intro-header-block">
                <h1 className="afterglow-editorial-title">AFTERGLOW</h1>
                <p className="afterglow-editorial-subtitle">CHOOSE YOUR JOURNEY</p>
              </div>

              {/* Floating Genres (Zero cards, zero boxes, zero rectangular buttons) */}
              <div className="afterglow-genres-floating-field">
                {availableGenres.map((g) => {
                  const isHovered = hoveredGenre === g.id;
                  const isSelected = selectedGenre === g.name;
                  const isSiblingDimmed = hoveredGenre && hoveredGenre !== g.id;

                  return (
                    <button
                      key={g.id}
                      className={`afterglow-genre-float-btn ${isSelected ? 'active-selected' : ''} ${isSiblingDimmed ? 'sibling-dimmed' : ''}`}
                      style={{
                        left: `${g.x}%`,
                        top: `${g.y}%`
                      }}
                      onMouseEnter={() => setHoveredGenre(g.id)}
                      onMouseLeave={() => setHoveredGenre(null)}
                      onClick={() => handleSelectGenre(g)}
                    >
                      <span className="afterglow-genre-text">{g.name}</span>
                      {isHovered && (
                        <span 
                          className="afterglow-genre-hover-glow"
                          style={{ background: g.glow }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="afterglow-intro-bottom-prompt">
                SELECT A GENRE TO ENTER
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PHASE B: WHITE EXPOSURE & BLOOM FLASH (Part 4)
          (150–250ms exposure bloom, lens flare, motion blur curve)
         ===================================================================== */}
      {whiteExposure > 0 && (
        <div 
          className="afterglow-white-exposure-screen"
          style={{
            opacity: whiteExposure
          }}
        />
      )}

      {/* =====================================================================
          PHASE C: INITIAL CAR REVEAL (Part 7: 1-Second Breathing Room)
          "INDIE / MUSIC FOR THE ROAD AHEAD" — No song UI yet, establishing the world
         ===================================================================== */}
      {stage === 'car_reveal' && (
        <div 
          className="afterglow-car-reveal-overlay"
          style={{ opacity: carRevealOpacity }}
        >
          <div className="afterglow-reveal-editorial-card">
            <span className="afterglow-reveal-genre-title">{selectedGenre}</span>
            <div className="afterglow-reveal-line" />
            <span className="afterglow-reveal-sub-quote">MUSIC FOR THE ROAD AHEAD</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          PHASE D: CAR WORLD & CINEMATIC FORWARD TRAVEL (Parts 5, 6, 8, 9, 10, 11)
          (7 Depth Layers, True Vanishing Point Perspective, Grounded F1 Car)
         ===================================================================== */}
      {(stage === 'car_reveal' || stage === 'journey') && (
        <div 
          className="afterglow-car-world-stage"
          style={{
            filter: currentMood.filter
          }}
        >
          {/* Layer 1 & 2: Distant Mountains, Clouds & Horizon Parallax */}
          <div 
            className="afterglow-car-layer-background"
            style={{ transform: mountainTransform }}
          >
            <img 
              src="/assets/storyboard/panel_04_hd.jpg" 
              alt="Cinematic Car World Environment" 
              className="afterglow-car-hd-img"
            />
          </div>

          {/* Layer 3: Light Tunnel Portal & Volumetric Sunbeams */}
          <div 
            className="afterglow-portal-sunbeam-layer"
            style={{
              left: '29.5%',
              top: '42.5%',
              transform: portalTransform,
              filter: `brightness(${portalBloom}) drop-shadow(0 0 60px ${currentMood.portalTint})`
            }}
          >
            <div className="afterglow-sunbeam-core" />
          </div>

          {/* Layer 4: Road Perspective Canvas (Wet highway reflections, vanishing rays) */}
          <canvas 
            ref={roadCanvasRef} 
            className="afterglow-road-perspective-canvas"
          />

          {/* Layer 5: Spatially Grounded Race Car (FIA Rain Light, Engine Suspension Rumble) */}
          <div 
            className="afterglow-f1-car-anchor"
            style={{
              left: '63%',
              top: '64%',
              transform: carTransform
            }}
          >
            {/* FIA Pulsing Rain Light (True automotive detail) */}
            <div className="afterglow-fia-rain-light" />
          </div>

          {/* Layer 6 & 7: 3D Passing Dust Particles & Light Streaks */}
          <canvas 
            ref={particlesCanvasRef} 
            className="afterglow-particles-3d-canvas"
          />

          {/* Dynamic Ambient Environmental Lighting Shift (Part 16) */}
          <div 
            className="afterglow-environment-mood-glow"
            style={{
              background: `radial-gradient(circle at 30% 43%, ${currentMood.ambientGlow} 0%, transparent 70%)`
            }}
          />
        </div>
      )}

      {/* =====================================================================
          PHASE E: ONE-SONG-AT-A-TIME DISCOVERY & EDITORIAL TYPOGRAPHY
          (Parts 8, 9, 11, 14, 15: Zero cards, zero boxes, floating typography)
         ===================================================================== */}
      {stage === 'journey' && (
        <div className="afterglow-journey-music-overlay">
          {/* Song Info (Floating directly over the scene, 85% environment, 15% UI) */}
          <div className="afterglow-floating-song-block">
            {/* Tiny cinematic indicator: 01 / 12 */}
            <div className="afterglow-song-indicator-row">
              <span className="afterglow-song-genre-tag">{selectedGenre}</span>
              <span className="afterglow-indicator-divider">/</span>
              <span className="afterglow-song-count">
                {String(activeSongIndex + 1).padStart(2, '0')} / {String(journeyTracks.length).padStart(2, '0')}
              </span>
            </div>

            {/* Song Title & Artist: Pure editorial typography */}
            <h2 className="afterglow-editorial-song-title">
              {currentJourneyTrack?.title || 'The Night We Met'}
            </h2>
            <p className="afterglow-editorial-song-artist">
              {currentJourneyTrack?.artist || 'Lord Huron'}
            </p>

            {/* Environmental Destination Mood Name */}
            <div className="afterglow-destination-label">
              <span className="afterglow-dest-dot" style={{ background: currentMood.color }} />
              <span>{currentMood.name}</span>
            </div>
          </div>

          {/* =================================================================
              PART 12: THE ROAD BECOMES THE WAVEFORM
              (Thin glowing waveform line embedded directly into road perspective)
             ================================================================= */}
          <div className="afterglow-road-waveform-container">
            <span className="afterglow-waveform-time">
              {formatTime(currentTime)}
            </span>

            <div 
              ref={waveformTrackRef}
              className="afterglow-interactive-road-waveform"
              onClick={handleWaveformSeek}
              title="Click or drag on road waveform to seek"
            >
              {/* Road Waveform Center Axis */}
              <div className="afterglow-waveform-road-axis" />

              {/* Glowing Interactive Waveform Morph */}
              <svg 
                className="afterglow-waveform-svg" 
                viewBox="0 0 400 24" 
                preserveAspectRatio="none"
              >
                <path 
                  d={`M 0 12 Q 50 ${12 + (isPlaying ? Math.sin(currentTime * 8) * 6 : 0)}, 100 12 T 200 ${12 + (isPlaying ? Math.cos(currentTime * 6) * 7 : 0)} T 300 ${12 + (isPlaying ? Math.sin(currentTime * 7) * 5 : 0)} T 400 12`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="1.5"
                />
                <path 
                  d={`M 0 12 Q 50 ${12 + (isPlaying ? Math.sin(currentTime * 8) * 6 : 0)}, 100 12 T 200 ${12 + (isPlaying ? Math.cos(currentTime * 6) * 7 : 0)} T 300 ${12 + (isPlaying ? Math.sin(currentTime * 7) * 5 : 0)} T 400 12`}
                  fill="none"
                  stroke={currentMood.color}
                  strokeWidth="2.5"
                  strokeDasharray="400"
                  strokeDashoffset={400 - (duration ? (currentTime / duration) * 400 : 0)}
                  style={{ filter: `drop-shadow(0 0 6px ${currentMood.color})` }}
                />
              </svg>

              {/* Bright Playhead Dot ● */}
              <div 
                className="afterglow-waveform-playhead"
                style={{
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  boxShadow: `0 0 12px ${currentMood.color}`
                }}
              />
            </div>

            <span className="afterglow-waveform-time">
              {formatTime(duration)}
            </span>
          </div>

          {/* Minimal Transport Controls (Play/Pause, Prev, Next, Favorite) */}
          <div className="afterglow-minimal-transport-controls">
            <button 
              className="afterglow-trans-btn"
              onClick={() => {
                if (activeSongIndex > 0) {
                  targetCameraZRef.current = Math.max(0, targetCameraZRef.current - 1.0);
                } else {
                  onPrevTrack();
                }
              }}
              title="Previous Destination / Song"
            >
              <SkipBack size={18} />
            </button>

            <button 
              className="afterglow-play-btn-circle"
              onClick={() => handlePlayJourneyTrack(currentJourneyTrack)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="play-icon-offset" />}
            </button>

            <button 
              className="afterglow-trans-btn"
              onClick={() => {
                if (activeSongIndex < journeyTracks.length - 1) {
                  targetCameraZRef.current += 1.0;
                } else {
                  onNextTrack();
                }
              }}
              title="Next Destination / Song"
            >
              <SkipForward size={18} />
            </button>

            <button 
              className={`afterglow-trans-btn ${isCurrentFavorite ? 'is-fav' : ''}`}
              onClick={() => onToggleFavorite && onToggleFavorite(currentJourneyTrack)}
              title="Save to favorites"
            >
              <Heart size={16} fill={isCurrentFavorite ? '#f43f5e' : 'none'} color={isCurrentFavorite ? '#f43f5e' : 'currentColor'} />
            </button>
          </div>

          {/* Subtle Bottom Scroll Hint */}
          <div className="afterglow-scroll-drive-hint">
            <span>SCROLL TO DRIVE FORWARD</span>
            <div className="afterglow-scroll-indicator-line" />
          </div>
        </div>
      )}

      {/* =====================================================================
          PHASE F: FLOATING TOP NAVIGATION (Preserves All Musicly Features)
          (SCENES, LIBRARY, SEARCH, AMBIENT, CLASSIC, EXIT)
         ===================================================================== */}
      <header className="afterglow-cinematic-header">
        <div className="afterglow-header-brand">
          <span className="brand-primary">MUSICLY</span>
          <span className="brand-sep">/</span>
          <span className="brand-secondary">AFTERGLOW</span>
          {stage === 'journey' && (
            <span className="brand-genre-pill">{selectedGenre}</span>
          )}
        </div>

        <nav className="afterglow-header-nav">
          <button 
            className="afterglow-nav-item"
            onClick={onOpenSceneModal}
          >
            SCENES
          </button>

          <button 
            className="afterglow-nav-item"
            onClick={onOpenPlaylistDrawer}
          >
            LIBRARY
          </button>

          <button 
            className="afterglow-nav-item"
            onClick={onOpenSearch}
          >
            SEARCH
          </button>

          <button 
            className="afterglow-nav-item"
            onClick={onOpenAmbient}
          >
            AMBIENT {activeAmbientCount > 0 && `(${activeAmbientCount})`}
          </button>

          <button 
            className="afterglow-nav-item classic-btn"
            onClick={onOpenClassic}
            title="Switch to original classic AFTERGLOW scene"
          >
            CLASSIC
          </button>

          <button 
            className="afterglow-nav-item exit-btn"
            onClick={onClose}
            title="Exit Afterglow"
          >
            EXIT
          </button>
        </nav>
      </header>
    </div>
  );
}
