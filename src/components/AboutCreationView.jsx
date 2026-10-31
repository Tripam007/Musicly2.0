import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Disc, ChevronDown, Compass, Anchor, Wind, Shield } from 'lucide-react';
import { playShootingStarSound, playClickSound, playPeacefulLikeSound } from '../utils/audioSynth';
import '../styles/aboutCreation.css';

// 4 Cinematic Voyage Milestones aligned with scroll progress (0% -> 100%)
const VOYAGE_CHAPTERS = [
  {
    id: 1,
    tag: 'VOYAGE 01 // 00°00\'N',
    title: 'Legend of the Seas',
    subtitle: 'Setting sail into autonomous audio',
    description: 'Musicly 2.0 is born at the confluence of human sentiment and autonomous audio intelligence. Every track is an uncompressed sonic voyage.',
    icon: Compass,
    accent: '#ffd166',
    scrollRange: [0, 28]
  },
  {
    id: 2,
    tag: 'VOYAGE 02 // 14°42\'W',
    title: 'The Audiophile Compass',
    subtitle: 'Pure analog warmth & 432Hz tuning',
    description: 'Deep vinyl warmth, acoustic harmonic overtones, and curated rooms designed to give sound a true physical sanctuary.',
    icon: Wind,
    accent: '#38bdf8',
    scrollRange: [25, 53]
  },
  {
    id: 3,
    tag: 'VOYAGE 03 // 32°18\'S',
    title: 'Uncharted Horizons',
    subtitle: 'Autonomous stream agents in real-time',
    description: 'Live broadcast agents scanning global frequencies to deliver pure audio streams directly into your personal captain\'s deck.',
    icon: Anchor,
    accent: '#f43f5e',
    scrollRange: [50, 78]
  },
  {
    id: 4,
    tag: 'VOYAGE 04 // 45°50\'E',
    title: 'Safe Harbor',
    subtitle: 'Crafted with passion for music & code',
    description: 'A sanctuary built by Tripam. Dedicated to audiophiles, night-shift coders, dreamers, and music lovers across the world.',
    icon: Shield,
    accent: '#4ade80',
    scrollRange: [75, 100]
  }
];

export default function AboutCreationView({
  onBack,
  onSwitchView,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const containerRef = useRef(null);
  const effectsCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const bgWrapperRef = useRef(null);

  // Scroll and Parallax State (Inertial Smooth Scrubbing)
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 100
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const lastTouchYRef = useRef(null);
  const isScrubbingRef = useRef(false);

  // 3D Parallax Tilt based on cursor
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const pulseRingsRef = useRef([]);

  // Active Chapter computed from scroll
  const activeChapter = VOYAGE_CHAPTERS.find(
    (ch) => scrollProgress >= ch.scrollRange[0] && scrollProgress <= ch.scrollRange[1]
  ) || VOYAGE_CHAPTERS[0];

  // Jump to Chapter on Navigator Click
  const handleJumpToChapter = (chapter) => {
    const target = (chapter.scrollRange[0] + chapter.scrollRange[1]) * 0.5;
    targetScrollRef.current = target;
    playClickSound('light');
  };

  useEffect(() => {
    const canvas = effectsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Subtle atmospheric stars
    const numStars = 60;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.4 + 0.4,
      baseAlpha: Math.random() * 0.5 + 0.15,
      speed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    }));

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Smooth Scroll Wheel Handler
    const handleWheel = (e) => {
      e.preventDefault();
      // Smooth scroll delta
      const delta = e.deltaY * 0.08;
      targetScrollRef.current = Math.max(0, Math.min(100, targetScrollRef.current + delta));
      isScrubbingRef.current = true;
    };

    // Touch Swipe Handler for Mobile/Tablets
    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        lastTouchYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0] && lastTouchYRef.current !== null) {
        const delta = (lastTouchYRef.current - e.touches[0].clientY) * 0.18;
        targetScrollRef.current = Math.max(0, Math.min(100, targetScrollRef.current + delta));
        lastTouchYRef.current = e.touches[0].clientY;
        isScrubbingRef.current = true;
      }
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    // Keyboard Navigation (Arrow Keys / Page Keys)
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        targetScrollRef.current = Math.min(100, targetScrollRef.current + 12);
        isScrubbingRef.current = true;
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetScrollRef.current = Math.max(0, targetScrollRef.current - 12);
        isScrubbingRef.current = true;
      }
    };

    // Mouse Move for Parallax Tilt & Subtle Stardust
    const handleMouseMove = (e) => {
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      mouseRef.current.targetX = (e.clientX - centerX) / centerX; // -1 to 1
      mouseRef.current.targetY = (e.clientY - centerY) / centerY; // -1 to 1

      if (Math.random() < 0.25) {
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4 - 0.4,
          size: Math.random() * 2 + 0.8,
          alpha: 0.75,
          color: Math.random() > 0.5 ? '#ffd166' : '#38bdf8'
        });
      }
    };

    // Click to pulse quantum shockwave rings
    const handleMouseDown = (e) => {
      // Don't trigger canvas pulse if clicking buttons or links
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.voyage-nav-dot')) return;

      const clickX = e.clientX;
      const clickY = e.clientY;

      pulseRingsRef.current.push({
        x: clickX,
        y: clickY,
        radius: 8,
        maxRadius: 260,
        alpha: 0.9,
        color: '#ffd166'
      });
      pulseRingsRef.current.push({
        x: clickX,
        y: clickY,
        radius: 4,
        maxRadius: 180,
        alpha: 0.7,
        color: '#38bdf8'
      });

      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.2;
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.5 + 1,
          alpha: 1,
          color: Math.random() > 0.5 ? '#ffd166' : '#38bdf8'
        });
      }

      playShootingStarSound();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    // 60FPS Inertial Animation & Video Scrubbing Loop
    let time = 0;
    let lastReportedScroll = -1;

    const render = () => {
      time += 0.02;

      // 1. Inertial Smooth Scroll Lerp (Damped Spring)
      currentScrollRef.current += (targetScrollRef.current - currentScrollRef.current) * 0.085;
      const currentScroll = currentScrollRef.current;

      // Update state for React UI when scroll changes by 0.3%
      if (Math.abs(currentScroll - lastReportedScroll) > 0.3) {
        lastReportedScroll = currentScroll;
        setScrollProgress(Math.round(currentScroll));
      }

      // 2. Smooth Mouse Tilt Lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const tiltX = mouseRef.current.x * 12; // px
      const tiltY = mouseRef.current.y * 12; // px
      const rotX = -mouseRef.current.y * 2.5; // deg
      const rotY = mouseRef.current.x * 3.5; // deg

      // 3. Scrub Video Timeline with Scroll Position
      const video = videoRef.current;
      if (video && video.duration) {
        // Map scroll 0 -> 100 to video time 0 -> duration
        const targetTime = (currentScroll / 100) * (video.duration - 0.05);
        if (Math.abs(video.currentTime - targetTime) > 0.04) {
          video.currentTime = targetTime;
        }
      }

      // 4. Parallax 3D Transformation on Background Scene
      const bgWrapper = bgWrapperRef.current;
      if (bgWrapper) {
        const zoom = 1.0 + (currentScroll / 100) * 0.08;
        const driftY = -(currentScroll / 100) * 35;
        bgWrapper.style.transform = `scale(${zoom}) translate3d(${tiltX}px, ${driftY + tiltY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }

      // 5. Render Stardust & Quantum Ripple Rings on Canvas
      ctx.clearRect(0, 0, width, height);

      // Ambient Twinkling Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const alpha = star.baseAlpha + Math.sin(time * 30 * star.speed + star.phase) * 0.25;
        ctx.fillStyle = `rgba(255, 235, 200, ${Math.max(0.05, Math.min(0.85, alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x + tiltX * 0.3, star.y + tiltY * 0.3, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stardust Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.024;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Expanding Shockwave Rings
      const rings = pulseRingsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += 4.5;
        r.alpha -= 0.022;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = r.alpha;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <div className="about-creation-container" ref={containerRef} tabIndex={0}>
      {/* 1. RAZOR-SHARP IN-FOCUS PIRATE SCENE (With 3D Gyro Tilt & Scroll Scrubbing) */}
      <div className="creation-pirate-bg-wrapper" ref={bgWrapperRef}>
        <video
          ref={videoRef}
          className="creation-pirate-bg-video"
          src="/assets/about/pirate_bg.mp4"
          muted
          playsInline
          preload="auto"
        />
      </div>

      {/* Subtle edge-only vignettes: Leaves the central 3D pirate ship 100% in focus */}
      <div className="creation-pirate-top-veil" />
      <div className="creation-pirate-bottom-veil" />

      {/* 2. INTERACTIVE PARTICLES & SHOCKWAVE CANVAS */}
      <canvas ref={effectsCanvasRef} className="about-creation-canvas" />

      {/* 3. FIXED TOP NAVIGATION BAR */}
      <header className="about-creation-nav">
        <button 
          type="button" 
          className="creation-nav-back-btn" 
          onClick={onBack}
          title="Return to Musicly Player"
        >
          <ArrowLeft size={16} />
          <span>Back to Musicly</span>
        </button>

        {/* 1-CLICK VIEW SWITCHER BUTTON: Switch between Pirate Voyage & Classic Story View */}
        <button
          type="button"
          className="creation-view-switcher-btn"
          onClick={onSwitchView}
          title="Switch to the classic editorial story view"
        >
          <BookOpen size={14} className="switcher-icon" />
          <span>Classic Story View</span>
        </button>
      </header>

      {/* 4. PARALLAX VOYAGE CHAPTER CARD (Glides smoothly on scroll without blocking the ship) */}
      <div className="voyage-chapter-card" key={activeChapter.id}>
        <div className="voyage-tag-row">
          <span className="voyage-chapter-tag" style={{ color: activeChapter.accent }}>
            {activeChapter.tag}
          </span>
          <span className="voyage-progress-num">{Math.round(scrollProgress)}%</span>
        </div>
        <h2 className="voyage-chapter-title">{activeChapter.title}</h2>
        <h3 className="voyage-chapter-sub">{activeChapter.subtitle}</h3>
        <p className="voyage-chapter-desc">{activeChapter.description}</p>
      </div>

      {/* 5. VERTICAL VOYAGE RAIL NAVIGATOR (Right side) */}
      <aside className="voyage-vertical-nav" aria-label="Voyage Chapters Navigator">
        <div className="voyage-rail-track">
          <div 
            className="voyage-rail-fill" 
            style={{ height: `${scrollProgress}%` }} 
          />
        </div>
        <div className="voyage-milestone-nodes">
          {VOYAGE_CHAPTERS.map((ch) => {
            const isActive = activeChapter.id === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                className={`voyage-nav-dot ${isActive ? 'is-active' : ''}`}
                onClick={() => handleJumpToChapter(ch)}
                title={`Jump to ${ch.title}`}
                aria-label={`Jump to Chapter ${ch.id}: ${ch.title}`}
              >
                <span className="voyage-dot-pip" style={{ background: isActive ? ch.accent : 'rgba(255,255,255,0.3)' }} />
                <span className="voyage-dot-label">0{ch.id}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 6. FLOATING BOTTOM AUDIOPHILE DOCK (Unobtrusive & Clean) */}
      <footer className="about-creation-bottom-dock">
        {/* Play / Pause Disk */}
        <button
          type="button"
          className={`creation-dock-play-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => {
            if (onTogglePlay) onTogglePlay();
            playClickSound('light');
          }}
          title={isPlaying ? "Pause music playback" : "Play music playback"}
          aria-label={isPlaying ? "Pause playback" : "Play playback"}
        >
          <div className="play-dock-dashed-ring" />
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>

        {/* Current Track Info */}
        <div className="creation-dock-track-info">
          <div className="dock-track-title-row">
            <span className="dock-live-pulse" />
            <Disc size={13} className={isPlaying ? 'spin-slow' : ''} />
            <span className="dock-track-name">
              {currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : "Knockin' On Heaven's Door — Bob Dylan"}
            </span>
          </div>
          <div className="dock-scroll-hint">
            <span>Scroll mouse wheel or swipe to navigate the voyage</span>
            <ChevronDown size={12} className="bounce-subtle" />
          </div>
        </div>

        {/* Brand signature */}
        <div className="creation-dock-brand">
          <span className="dock-brand-name">Musicly 2.0</span>
          <span className="dock-brand-author">by Tripam</span>
        </div>
      </footer>
    </div>
  );
}
