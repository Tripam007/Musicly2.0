import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';

const INTRO_GENRES = [
  { id: 'indie', name: 'INDIE', x: 28, y: 38, glow: 'rgba(245, 158, 11, 0.45)', tint: 'rgba(180, 83, 9, 0.16)' },
  { id: 'retro', name: 'RETRO', x: 74, y: 34, glow: 'rgba(251, 146, 60, 0.45)', tint: 'rgba(194, 65, 12, 0.16)' },
  { id: 'ghazal', name: 'GHAZAL', x: 80, y: 56, glow: 'rgba(217, 119, 6, 0.45)', tint: 'rgba(146, 64, 14, 0.18)' },
  { id: 'lo-fi', name: 'LO-FI', x: 26, y: 64, glow: 'rgba(56, 189, 248, 0.45)', tint: 'rgba(14, 116, 144, 0.16)' },
  { id: 'synthwave', name: 'SYNTHWAVE', x: 48, y: 82, glow: 'rgba(236, 72, 153, 0.45)', tint: 'rgba(190, 24, 93, 0.16)' },
  { id: 'peace', name: 'PEACE', x: 18, y: 49, glow: 'rgba(167, 139, 250, 0.45)', tint: 'rgba(109, 40, 217, 0.16)' },
  { id: 'chill-sleep', name: 'CHILL / SLEEP', x: 70, y: 74, glow: 'rgba(129, 140, 248, 0.45)', tint: 'rgba(67, 56, 202, 0.16)' },
];

export default function AfterglowIntro({
  onSelectGenre,
  onOpenClassic,
  onClose
}) {
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState('idle'); // 'idle' | 'genre_locked' | 'zooming' | 'iris_focus' | 'bloom' | 'darkness'
  
  const photoRef = useRef(null);
  const dropletsCanvasRef = useRef(null);
  const irisCanvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Background floating golden micro dust particles
  useEffect(() => {
    const canvas = dropletsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.6,
      speedX: (Math.random() - 0.5) * 0.28,
      speedY: -Math.random() * 0.35 - 0.1,
      opacity: Math.random() * 0.55 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    let isRunning = true;
    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const dynamicOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        ctx.fillStyle = `rgba(251, 191, 36, ${dynamicOpacity.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Iris Micro-particle Simulation during Stage 3
  useEffect(() => {
    if (transitionPhase !== 'iris_focus' && transitionPhase !== 'zooming') return;
    const canvas = irisCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Eye coordinates on screen (roughly 26.2% width, 28.5% height)
    const eyeX = width * 0.262;
    const eyeY = height * 0.285;

    const microLights = Array.from({ length: 30 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 80 + 10,
      speed: (Math.random() - 0.5) * 0.03,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3
    }));

    let id;
    const renderIris = () => {
      ctx.clearRect(0, 0, width, height);
      microLights.forEach(l => {
        l.angle += l.speed;
        const lx = eyeX + Math.cos(l.angle) * l.radius;
        const ly = eyeY + Math.sin(l.angle) * l.radius;
        ctx.fillStyle = `rgba(186, 230, 253, ${l.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(lx, ly, l.size, 0, Math.PI * 2);
        ctx.fill();
      });
      id = requestAnimationFrame(renderIris);
    };
    renderIris();

    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [transitionPhase]);

  // Cinematic Multi-Stage Eye Transition Sequence (2.5s total)
  const handleGenreClick = (genre) => {
    if (selectedGenre) return;
    setSelectedGenre(genre);

    // Stage 1: Selected genre stays highlighted, all other typography fades out (0ms - 450ms)
    setTransitionPhase('genre_locked');

    // Stage 2: Camera dives toward eye, background dims, depth-of-field focuses (450ms - 1700ms)
    setTimeout(() => {
      setTransitionPhase('zooming');
    }, 450);

    // Stage 3: Iris macro detail + micro-light particles inside iris (1700ms - 2200ms)
    setTimeout(() => {
      setTransitionPhase('iris_focus');
    }, 1700);

    // Stage 4: Light bloom flares out from pupil (2200ms - 2500ms)
    setTimeout(() => {
      setTransitionPhase('bloom');
    }, 2200);

    // Stage 5: Sudden cinematic shutter black (2500ms - 2750ms)
    setTimeout(() => {
      setTransitionPhase('darkness');
    }, 2500);

    // Stage 6: Arrive at Race Car Scene!
    setTimeout(() => {
      if (onSelectGenre) onSelectGenre(genre.name);
    }, 2800);
  };

  const activeTint = hoveredGenre ? hoveredGenre.tint : 'rgba(245, 158, 11, 0.08)';

  return (
    <div className={`afterglow-intro-canvas phase-${transitionPhase}`}>
      {/* 1. Full-Screen Cinematic Photograph Background */}
      <div className="afterglow-intro-photo-wrap" aria-hidden="true">
        <img
          ref={photoRef}
          src="/assets/images/afterglow_bg.jpg"
          alt="Afterglow Cinematic Scene"
          className="afterglow-intro-photo-img"
        />

        {/* Ambient Radial Color Lighting Shift derived from hovered genre */}
        <div
          className="afterglow-intro-ambient-tint"
          style={{
            background: `radial-gradient(circle at 60% 48%, ${activeTint} 0%, transparent 68%)`
          }}
        />

        {/* Dark Photographic Scrim & Vignette */}
        <div className="afterglow-intro-scrim" />

        {/* Parallax Depth Micro Dust Canvas */}
        <canvas ref={dropletsCanvasRef} className="afterglow-intro-dust-canvas" />

        {/* Iris Detailed Micro-Light Particle Canvas (Engaged during eye dive) */}
        <canvas ref={irisCanvasRef} className="afterglow-intro-iris-canvas" />
      </div>

      {/* 2. Top Minimal Branding & Quick Controls */}
      <header className="afterglow-intro-top-bar">
        <div className="afterglow-intro-brand">
          <span className="intro-brand-name">MUSICLY</span>
          <span className="intro-brand-dot">•</span>
          <span className="intro-brand-tag">AFTERGLOW</span>
        </div>

        <div className="afterglow-intro-top-right">
          {onOpenClassic && (
            <button
              className="afterglow-intro-nav-btn"
              onClick={onOpenClassic}
              title="Open Classic Afterglow Experience"
            >
              CLASSIC SCENE
            </button>
          )}
          {onClose && (
            <button
              className="afterglow-intro-nav-btn"
              onClick={onClose}
              title="Return to Studio"
            >
              EXIT
            </button>
          )}
        </div>
      </header>

      {/* 3. Center Hero Editorial Title */}
      <div className="afterglow-intro-hero-center">
        <h1 className="afterglow-intro-hero-title">
          AFTERGLOW
        </h1>
        <p className="afterglow-intro-hero-subtitle">
          CHOOSE YOUR JOURNEY
        </p>
      </div>

      {/* 4. Floating Typography Genres (Zero Cards, Zero Boxes, Zero Containers) */}
      <div className="afterglow-intro-floating-stage">
        {INTRO_GENRES.map((genre) => {
          const isSelected = selectedGenre?.id === genre.id;
          const isHovered = hoveredGenre?.id === genre.id;

          return (
            <button
              key={genre.id}
              className={`afterglow-intro-genre-btn ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
              style={{
                left: `${genre.x}%`,
                top: `${genre.y}%`,
                '--genre-glow': genre.glow
              }}
              onMouseEnter={() => !selectedGenre && setHoveredGenre(genre)}
              onMouseLeave={() => !selectedGenre && setHoveredGenre(null)}
              onClick={() => handleGenreClick(genre)}
              disabled={!!selectedGenre}
              aria-label={`Select ${genre.name} journey`}
            >
              <span className="genre-btn-text">{genre.name}</span>
              <span className="genre-btn-glow" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* 5. Photographic Light Bloom & Shutter Flash Layer (Stage 4 & 5) */}
      <div className="afterglow-eye-bloom-layer" aria-hidden="true" />
      <div className="afterglow-eye-darkness-layer" aria-hidden="true" />

      {/* 6. Bottom Minimal Aesthetic Anchor */}
      <footer className="afterglow-intro-footer" aria-hidden="true">
        <span>SOUNDS BETWEEN MOMENTS</span>
        <span className="footer-hyphen">—</span>
        <span>A KINDER YOU</span>
      </footer>
    </div>
  );
}
