import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Disc } from 'lucide-react';
import { playShootingStarSound, playClickSound } from '../utils/audioSynth';
import '../styles/aboutCreation.css';

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

  // Interaction State Refs (60fps canvas loop)
  const animRef = useRef(null);
  const mouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, isDown: false });
  const targetMouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 });
  const particlesRef = useRef([]);
  const pulseRingsRef = useRef([]);

  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const canvas = effectsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    targetMouseRef.current = { x: width * 0.5, y: height * 0.52 };
    mouseRef.current = { x: width * 0.5, y: height * 0.52, isDown: false };

    // Atmospheric twinkling stars
    const numStars = 90;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.4,
      baseAlpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    }));

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      targetMouseRef.current.x = e.clientX;
      targetMouseRef.current.y = e.clientY;
      if (!hasInteracted) setHasInteracted(true);

      // Subtle cosmic stardust trail on move
      if (Math.random() < 0.35) {
        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.4,
          size: Math.random() * 2 + 1,
          alpha: 0.85,
          color: Math.random() > 0.5 ? '#ffd166' : '#38bdf8'
        });
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        targetMouseRef.current.x = e.touches[0].clientX;
        targetMouseRef.current.y = e.touches[0].clientY;
        if (!hasInteracted) setHasInteracted(true);
      }
    };

    const handleMouseDown = (e) => {
      mouseRef.current.isDown = true;
      const clickX = e.clientX || mouseRef.current.x;
      const clickY = e.clientY || mouseRef.current.y;

      // Expand quantum pulse wave rings
      pulseRingsRef.current.push({
        x: clickX,
        y: clickY,
        radius: 8,
        maxRadius: 260,
        alpha: 1,
        color: '#ffd166'
      });
      pulseRingsRef.current.push({
        x: clickX,
        y: clickY,
        radius: 4,
        maxRadius: 180,
        alpha: 0.8,
        color: '#38bdf8'
      });

      // Emit burst of stardust sparks
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 1.2;
        particlesRef.current.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.8 + 1,
          alpha: 1,
          color: Math.random() > 0.5 ? '#ffd166' : '#38bdf8'
        });
      }

      playShootingStarSound();
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // 60FPS Effects & Ambient Render Loop
    let time = 0;
    const render = () => {
      time += 0.02;

      // Smooth lerp mouse towards target
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.14;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.14;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // 1. Twinkling stars in the background
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const alpha = star.baseAlpha + Math.sin(time * 30 * star.speed + star.phase) * 0.25;
        ctx.fillStyle = `rgba(255, 235, 200, ${Math.max(0.08, Math.min(0.9, alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Cursor Ambient Corona
      const cursorGlow = ctx.createRadialGradient(mx, my, 2, mx, my, 40);
      cursorGlow.addColorStop(0, 'rgba(255, 214, 102, 0.45)');
      cursorGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
      cursorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cursorGlow;
      ctx.beginPath();
      ctx.arc(mx, my, 40, 0, Math.PI * 2);
      ctx.fill();

      // 3. Stardust particles simulation
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.022;
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

      // 4. Expanding quantum shockwave rings
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hasInteracted]);

  return (
    <div className="about-creation-container" ref={containerRef} tabIndex={0}>
      {/* 1. CINEMATIC PIRATE WEBSITE BACKGROUND VIDEO */}
      <div className="creation-pirate-bg-wrapper">
        <video
          ref={videoRef}
          className="creation-pirate-bg-video"
          src="/assets/about/pirate_bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Atmospheric vignette & mist overlay matching Dribbble color palette */}
        <div className="creation-pirate-vignette" />
      </div>

      {/* 2. INTERACTIVE EFFECTS CANVAS (Quantum sparks, star particles, pulse waves) */}
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

        {/* 1-CLICK VIEW SWITCHER BUTTON: Switch between Classic Story & Creation Experience */}
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

      {/* 4. CENTER AUDIOPHILE EMBLEM & MINIMAL TYPOGRAPHY */}
      <div className="about-creation-center-hero" aria-label="Creation Story Typography">
        <button
          type="button"
          className={`creation-center-play-disk ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => {
            if (onTogglePlay) onTogglePlay();
            playClickSound('light');
          }}
          title={isPlaying ? "Pause music playback" : "Play music playback"}
          aria-label={isPlaying ? "Pause playback" : "Play playback"}
        >
          <div className="play-disk-ring" />
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 3 }} />}
        </button>

        <div className="creation-title-block">
          <span className="creation-version-tag">Musicly 2.0 • Creation of Sound</span>
          <h2 className="creation-hero-sub">by Tripam</h2>
          <p className="creation-brand-slogan">The Intersection of Human Emotion & Autonomous Audio</p>
        </div>

        {currentTrack && (
          <div className="creation-now-playing-pill">
            <span className="now-playing-pulse" />
            <Disc size={13} className={isPlaying ? 'spin-slow' : ''} />
            <span className="now-playing-text">
              {currentTrack.title} — {currentTrack.artist}
            </span>
          </div>
        )}
      </div>

      {/* 5. FOOTER MINIMAL CREDITS & INTERACTIVE TIP */}
      <footer className="about-creation-footer">
        <p className="creation-guide-hint">
          <span>✨ Move cursor to stir cosmic audio waves</span>
          <span className="hint-divider">•</span>
          <span>Click anywhere to pulse quantum sparks</span>
        </p>
        <div className="creation-credits-row">
          <span>hello@musicly.io</span>
          <span className="hint-divider">•</span>
          <span>Crafted with passion for music & code</span>
        </div>
      </footer>
    </div>
  );
}
