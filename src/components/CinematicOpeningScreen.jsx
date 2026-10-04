import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import '../styles/cinematicOpening.css';

// 5 Curated Journey Chapters
const CHAPTERS = [
  {
    id: 'meadow',
    index: 1,
    name: 'The Beginning',
    landscape: '/assets/images/train_meadow.jpg',
    range: [0.0, 0.22],
    ambientClass: 'day',
    outdoorHaze: 'rgba(255, 248, 235, 0.06)',
    interiorTint: 'rgba(0, 0, 0, 0)',
    isHero: true,
    title: 'MUSICLY',
    subtitle: 'A DIFFERENT WAY TO FEEL MUSIC.',
    desc: 'Every song takes you somewhere.'
  },
  {
    id: 'city',
    index: 2,
    name: 'The City',
    landscape: '/assets/images/train_city.jpg',
    range: [0.22, 0.44],
    ambientClass: 'golden',
    outdoorHaze: 'rgba(251, 191, 36, 0.12)',
    interiorTint: 'rgba(20, 15, 5, 0.08)',
    chapterTag: 'CHAPTER 02 — THE CITY',
    quote: 'Somewhere between the noise and the silence.'
  },
  {
    id: 'mountains',
    index: 3,
    name: 'The Mountains',
    landscape: '/assets/images/train_mountains.jpg',
    range: [0.44, 0.68],
    ambientClass: 'alpine',
    outdoorHaze: 'rgba(186, 230, 253, 0.08)',
    interiorTint: 'rgba(10, 15, 25, 0.12)',
    chapterTag: 'CHAPTER 03 — THE MOUNTAINS',
    quote: 'Find your own rhythm.'
  },
  {
    id: 'night',
    index: 4,
    name: 'The Night Journey',
    landscape: '/assets/images/train_night.jpg',
    range: [0.68, 0.88],
    ambientClass: 'night',
    outdoorHaze: 'rgba(15, 23, 42, 0.55)',
    interiorTint: 'rgba(10, 15, 30, 0.42)',
    chapterTag: 'CHAPTER 04 — THE NIGHT JOURNEY',
    quote: 'Let the music take you further.'
  },
  {
    id: 'arrival',
    index: 5,
    name: 'Arrival',
    landscape: '/assets/images/train_arrival.jpg',
    range: [0.88, 1.0],
    ambientClass: 'arrival',
    outdoorHaze: 'rgba(249, 115, 22, 0.22)',
    interiorTint: 'rgba(25, 12, 5, 0.12)',
    chapterTag: 'CHAPTER 05 — ARRIVAL',
    quote: 'Arriving at Musicly.'
  }
];

export default function CinematicOpeningScreen({
  activeBackdrop = '/assets/images/cozy_bedroom.jpg',
  onEnterApp,
  _currentTrack = null
}) {
  const [scrollProgress, setScrollProgress] = useState(0); // 0.0 to 1.0
  const [isExiting, setIsExiting] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const animFrameRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Continuous landscape offset refs for 60fps endless panning
  const landscapeOffsetRef = useRef(0);
  const polesOffsetRef = useRef(0);

  // DOM node refs for high-performance direct RAF transform manipulation
  const trackRefs = useRef([]);
  const polesTrackRef = useRef(null);
  const interiorStageRef = useRef(null);
  const glassSheenRef = useRef(null);

  // Preload all chapter assets immediately on mount
  useEffect(() => {
    CHAPTERS.forEach((ch) => {
      const img = new Image();
      img.src = ch.landscape;
    });
    const frameImg = new Image();
    frameImg.src = '/assets/images/train_window_frame.png';
  }, []);

  // Complete opening sequence and transition into main app
  const triggerEnter = useCallback(() => {
    if (hasEntered || isExiting) return;
    setIsExiting(true);
    setHasEntered(true);

    try {
      sessionStorage.removeItem('musicly_cinematic_opening_dismissed');
      localStorage.removeItem('musicly_train_intro_seen');
    } catch {}

    setTimeout(() => {
      if (onEnterApp) {
        onEnterApp();
      }
    }, 700);
  }, [hasEntered, isExiting, onEnterApp]);

  // Wheel / Scroll event listener with smooth normalized damping
  useEffect(() => {
    if (isExiting) return;

    const handleWheel = (e) => {
      // Normalizing wheel delta across different mice / trackpads
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.0015, 0.09);
      targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + delta));

      if (targetProgressRef.current >= 0.96 && !isExiting) {
        triggerEnter();
      }
    };

    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0]?.clientY || 0;
    };

    const handleTouchMove = (e) => {
      if (touchStartYRef.current === null) return;
      const currentY = e.touches[0]?.clientY || 0;
      const diff = touchStartYRef.current - currentY;
      touchStartYRef.current = currentY;

      const delta = (diff / window.innerHeight) * 0.9;
      targetProgressRef.current = Math.max(0, Math.min(1, targetProgressRef.current + delta));

      if (targetProgressRef.current >= 0.95 && !isExiting) {
        triggerEnter();
      }
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        triggerEnter();
      } else if (e.code === 'ArrowDown' || e.code === 'PageDown') {
        e.preventDefault();
        targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.25);
        if (targetProgressRef.current >= 0.95) triggerEnter();
      } else if (e.code === 'ArrowUp' || e.code === 'PageUp') {
        e.preventDefault();
        targetProgressRef.current = Math.max(0, targetProgressRef.current - 0.25);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExiting, triggerEnter]);

  // Normalized mouse coordinates listener (-1 to +1) for natural parallax
  const handleMouseMove = (e) => {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;
    setMousePos({ x: normX, y: normY });
  };

  // 60 FPS Render & Interactive Parallax Animation Loop
  useEffect(() => {
    let isRunning = true;
    const startTime = performance.now();
    let lastTime = performance.now();

    const animate = (now) => {
      if (!isRunning) return;

      const elapsed = (now - startTime) / 1000;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Natural, brisk automatic forward scrolling even without user input
      if (!isExiting) {
        const autoScrollSpeed = 0.075;
        targetProgressRef.current = Math.min(1, targetProgressRef.current + autoScrollSpeed * dt);
      }

      // 1. Smooth progress interpolation (lerp)
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;
      const nextProgress = current + (target - current) * 0.1;
      currentProgressRef.current = nextProgress;
      setScrollProgress(nextProgress);

      // Check arrival threshold
      if (nextProgress >= 0.97 && !isExiting) {
        triggerEnter();
      }

      // 2. Continuous landscape movement (speed subtly increases with scroll progress)
      const baseSpeed = 0.024; // percentage per frame for realistic outdoor drift
      const speedBoost = nextProgress * 0.028;
      const currentSpeed = baseSpeed + speedBoost;

      landscapeOffsetRef.current = (landscapeOffsetRef.current + currentSpeed) % 66.666667;
      polesOffsetRef.current = (polesOffsetRef.current + (baseSpeed * 2.8 + speedBoost * 3.8)) % 50;

      // Update scenery track positions directly in DOM for 60 FPS buttery smoothness
      trackRefs.current.forEach((track) => {
        if (track) {
          track.style.transform = `translate3d(-${landscapeOffsetRef.current}%, 0, 0)`;
        }
      });

      if (polesTrackRef.current) {
        polesTrackRef.current.style.transform = `translate3d(-${polesOffsetRef.current}%, 0, 0)`;
      }

      // 3. Subtle physical train motion (microscopic rail sway, natural and physical)
      const swayX = Math.sin(elapsed * 1.8) * 0.7;
      const swayY = Math.cos(elapsed * 2.4) * 0.5 + Math.sin(elapsed * 5.6) * 0.15;

      // Camera approach towards window as progress increases
      const cameraZoom = 1.0 + nextProgress * 0.15;

      if (interiorStageRef.current) {
        interiorStageRef.current.style.transform = `scale(${cameraZoom}) translate3d(${swayX}px, ${swayY}px, 0)`;
      }

      // 4. Subtle specular sheen movement on glass
      if (glassSheenRef.current) {
        const sheenX = mousePos.x * 16 + Math.sin(elapsed * 0.8) * 6;
        const sheenY = mousePos.y * 12 + Math.cos(elapsed * 0.6) * 4;
        glassSheenRef.current.style.transform = `translate3d(${sheenX}px, ${sheenY}px, 0)`;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mousePos.x, mousePos.y, isExiting, triggerEnter]);

  // Compute chapter opacities and active chapter index based on scrollProgress
  const currentChapterIndex = useMemo(() => {
    if (scrollProgress < 0.22) return 1;
    if (scrollProgress < 0.44) return 2;
    if (scrollProgress < 0.68) return 3;
    if (scrollProgress < 0.88) return 4;
    return 5;
  }, [scrollProgress]);

  // Helper to calculate smooth opacity curve for each chapter's scenery
  const getChapterOpacity = (index) => {
    const p = scrollProgress;
    if (index === 1) {
      if (p <= 0.18) return 1;
      if (p >= 0.28) return 0;
      return 1 - (p - 0.18) / 0.10;
    }
    if (index === 2) {
      if (p < 0.18) return 0;
      if (p >= 0.18 && p <= 0.26) return (p - 0.18) / 0.08;
      if (p > 0.26 && p <= 0.40) return 1;
      if (p > 0.40 && p <= 0.48) return 1 - (p - 0.40) / 0.08;
      return 0;
    }
    if (index === 3) {
      if (p < 0.40) return 0;
      if (p >= 0.40 && p <= 0.48) return (p - 0.40) / 0.08;
      if (p > 0.48 && p <= 0.64) return 1;
      if (p > 0.64 && p <= 0.72) return 1 - (p - 0.64) / 0.08;
      return 0;
    }
    if (index === 4) {
      if (p < 0.64) return 0;
      if (p >= 0.64 && p <= 0.72) return (p - 0.64) / 0.08;
      if (p > 0.72 && p <= 0.84) return 1;
      if (p > 0.84 && p <= 0.90) return 1 - (p - 0.84) / 0.06;
      return 0;
    }
    if (index === 5) {
      if (p < 0.84) return 0;
      if (p >= 0.84 && p <= 0.90) return (p - 0.84) / 0.06;
      return 1;
    }
    return 0;
  };

  // Compute text opacities for seamless chapter editorial fading
  const heroOpacity = Math.max(0, 1 - scrollProgress * 5.0); // Fades out before chapter 2
  const ch2Opacity = scrollProgress >= 0.22 && scrollProgress <= 0.42
    ? Math.sin(((scrollProgress - 0.22) / 0.20) * Math.PI)
    : 0;
  const ch3Opacity = scrollProgress >= 0.44 && scrollProgress <= 0.66
    ? Math.sin(((scrollProgress - 0.44) / 0.22) * Math.PI)
    : 0;
  const ch4Opacity = scrollProgress >= 0.68 && scrollProgress <= 0.86
    ? Math.sin(((scrollProgress - 0.68) / 0.18) * Math.PI)
    : 0;
  const ch5Opacity = scrollProgress >= 0.88
    ? Math.min(1, (scrollProgress - 0.88) * 10)
    : 0;

  // Active lighting tint & cabin state
  const isNightChapter = currentChapterIndex === 4;
  const isArrival = scrollProgress >= 0.88;

  return (
    <div
      className={`cinematic-train-container ${isExiting ? 'is-exiting' : ''} ${isArrival ? 'is-arrival' : ''}`}
      onMouseMove={handleMouseMove}
      role="dialog"
      aria-label="Welcome to Musicly — Train Journey Intro"
    >
      {/* 1. Underlying Real App Backdrop (Dissolves in as user enters at destination) */}
      <div
        className="cinematic-underlying-app-preview"
        style={{
          backgroundImage: `url(${activeBackdrop})`
        }}
        aria-hidden="true"
      />

      {/* 2. Panoramic Scenery Viewport (Outside the Window) */}
      <div className="train-scenery-viewport">
        {CHAPTERS.map((ch, idx) => {
          const opacity = getChapterOpacity(ch.index);
          return (
            <div
              key={ch.id}
              className="train-scenery-layer"
              style={{
                opacity: opacity.toFixed(3),
                visibility: opacity > 0.01 ? 'visible' : 'hidden'
              }}
              aria-hidden="true"
            >
              <div
                ref={(el) => (trackRefs.current[idx] = el)}
                className="train-panorama-track"
              >
                <div
                  className="train-panorama-tile"
                  style={{ backgroundImage: `url(${ch.landscape})` }}
                />
                <div
                  className="train-panorama-tile is-mirrored"
                  style={{ backgroundImage: `url(${ch.landscape})` }}
                />
                <div
                  className="train-panorama-tile"
                  style={{ backgroundImage: `url(${ch.landscape})` }}
                />
              </div>

              {/* Outdoor Atmospheric Haze */}
              <div
                className="train-outdoor-atmosphere"
                style={{ backgroundColor: ch.outdoorHaze }}
              />
            </div>
          );
        })}

        {/* Passing Foreground Speed Silhouettes (fences / poles / grass) */}
        <div
          ref={polesTrackRef}
          className="train-speed-poles-track"
          aria-hidden="true"
        />

        {/* Soft atmospheric depth gradient */}
        <div className="train-scenery-haze" aria-hidden="true" />
      </div>

      {/* 3. Window Glass Effects & Specular Sunlight */}
      <div className="train-window-glass-effects" aria-hidden="true">
        <div
          ref={glassSheenRef}
          className="train-glass-sheen"
          style={{
            opacity: isNightChapter ? 0.35 : 0.85
          }}
        />
        <div className="train-glass-vignette" />
      </div>

      {/* 4. Photorealistic Train Interior Frame (With transparent window cutouts) */}
      <div ref={interiorStageRef} className="train-interior-stage">
        <img
          src="/assets/images/train_window_frame.png"
          alt="Train Carriage Window"
          className="train-interior-image"
          aria-hidden="true"
        />

        {/* Interior Cabin Lighting shifts with time of day */}
        <div
          className="train-interior-ambient-tint"
          style={{
            backgroundColor: CHAPTERS[currentChapterIndex - 1]?.interiorTint || 'transparent'
          }}
          aria-hidden="true"
        />

        {/* Night Cabin Lantern Warmth */}
        <div
          className={`train-interior-night-lamp ${isNightChapter ? 'is-active' : ''}`}
          aria-hidden="true"
        />

        {/* Cabin Corner Vignette & Natural Depth */}
        <div className="train-cabin-shadows" aria-hidden="true" />
      </div>



      {/* 6. Centered Window Editorial Content Stage */}
      <main className="train-center-editorial-stage">
        {/* Chapter 01 — Opening Hero Content */}
        {heroOpacity > 0.01 && (
          <div
            className="train-hero-content"
            style={{
              opacity: heroOpacity.toFixed(2),
              transform: `translate3d(0, ${-scrollProgress * 40}px, 0)`
            }}
          >
            <h1 className="train-hero-title">MUSICLY</h1>

            <h2 className="train-hero-subtitle">
              A DIFFERENT WAY TO FEEL MUSIC.
            </h2>

            <p className="train-hero-desc">
              "Every song takes you somewhere."
            </p>
          </div>
        )}

        {/* Chapter 02 — The City */}
        {ch2Opacity > 0.01 && (
          <div
            className="train-chapter-editorial"
            style={{
              opacity: ch2Opacity.toFixed(2),
              transform: `translate3d(0, ${(1 - ch2Opacity) * 20}px, 0)`
            }}
          >
            <p className="train-chapter-quote">
              "Somewhere between the noise and the silence."
            </p>
          </div>
        )}

        {/* Chapter 03 — The Mountains */}
        {ch3Opacity > 0.01 && (
          <div
            className="train-chapter-editorial"
            style={{
              opacity: ch3Opacity.toFixed(2),
              transform: `translate3d(0, ${(1 - ch3Opacity) * 20}px, 0)`
            }}
          >
            <p className="train-chapter-quote">
              "Find your own rhythm."
            </p>
          </div>
        )}

        {/* Chapter 04 — The Night Journey */}
        {ch4Opacity > 0.01 && (
          <div
            className="train-chapter-editorial"
            style={{
              opacity: ch4Opacity.toFixed(2),
              transform: `translate3d(0, ${(1 - ch4Opacity) * 20}px, 0)`
            }}
          >
            <p className="train-chapter-quote">
              "Let the music take you further."
            </p>
          </div>
        )}

        {/* Chapter 05 — Arrival */}
        {ch5Opacity > 0.01 && (
          <div
            className="train-chapter-editorial"
            style={{
              opacity: ch5Opacity.toFixed(2),
              transform: `translate3d(0, ${(1 - ch5Opacity) * 20}px, 0)`
            }}
          >
            <p className="train-chapter-quote">
              "Arriving at Musicly."
            </p>
          </div>
        )}
      </main>

      {/* 7. Bottom Plain Downward Arrow */}
      <footer className="train-intro-footer">
        <button
          className="train-plain-arrow-btn"
          onClick={(e) => {
            e.stopPropagation();
            targetProgressRef.current = Math.min(1, targetProgressRef.current + 0.22);
          }}
          title="Scroll down"
          aria-label="Scroll down"
        >
          <ArrowDown size={30} strokeWidth={1.8} className="train-plain-down-arrow" />
        </button>
      </footer>
    </div>
  );
}
