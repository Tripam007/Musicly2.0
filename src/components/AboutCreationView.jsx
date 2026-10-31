import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Sparkles, Volume2, Disc, Maximize2 } from 'lucide-react';
import { playShootingStarSound, playPeacefulLikeSound, playClickSound } from '../utils/audioSynth';
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
  const digitalHandRef = useRef(null);
  const humanHandRef = useRef(null);
  const videoRef = useRef(null);

  // Interaction State Refs (bypasses React re-renders for smooth 60fps kinematics)
  const animRef = useRef(null);
  const mouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, isDown: false });
  const targetMouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 });
  const reachRef = useRef(0.85); // 0.3 (pulled back) to 1.0 (fingertips touching)
  const targetReachRef = useRef(0.85);
  const isTouchingRef = useRef(false);
  const particlesRef = useRef([]);
  const pulseRingsRef = useRef([]);
  const sparkIntensityRef = useRef(0);
  const hasTriggeredInitialSound = useRef(false);

  const [hasInteracted, setHasInteracted] = useState(false);

  // High-Resolution Image Dimensions and Tip Offsets:
  // Both images are 1376 x 768.
  // digital_hand_wireframe.png: tip at (1171, 531)
  // human_hand_real.png: tip at (236, 132)
  const D_WIDTH = 1376;
  const D_HEIGHT = 768;
  const D_TIP_X = 1171;
  const D_TIP_Y = 531;

  const H_WIDTH = 1376;
  const H_HEIGHT = 768;
  const H_TIP_X = 236;
  const H_TIP_Y = 132;

  useEffect(() => {
    const canvas = effectsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initial mouse center
    targetMouseRef.current = { x: width * 0.5, y: height * 0.52 };
    mouseRef.current = { x: width * 0.5, y: height * 0.52, isDown: false };

    // Twinkling stars in the cosmic mist
    const numStars = 80;
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
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        targetMouseRef.current.x = e.touches[0].clientX;
        targetMouseRef.current.y = e.touches[0].clientY;
        if (!hasInteracted) setHasInteracted(true);
      }
    };

    const handleWheel = (e) => {
      // Scroll down: fingers meet closer (reach -> 1.0)
      // Scroll up: fingers pull back
      const delta = e.deltaY * 0.0018;
      targetReachRef.current = Math.max(0.35, Math.min(1.05, targetReachRef.current + delta));
      if (!hasInteracted) setHasInteracted(true);
    };

    const handleMouseDown = (e) => {
      mouseRef.current.isDown = true;
      targetReachRef.current = 1.0; // Snap to touch on click
      pulseRingsRef.current.push({
        x: mouseRef.current.x,
        y: mouseRef.current.y,
        radius: 6,
        maxRadius: 220,
        alpha: 1,
        color: '#ffd166'
      });
      playShootingStarSound();
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // 60FPS Kinematics and Effect Loop
    let time = 0;
    const render = () => {
      time += 0.02;

      // Smooth lerp mouse towards target
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.14;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.14;

      // Smooth lerp reach factor
      reachRef.current += (targetReachRef.current - reachRef.current) * 0.12;
      const reach = reachRef.current;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // =======================================================================
      // ANATOMICAL KINEMATICS & HAND POSITIONING
      // =======================================================================
      // Scale factor responsive to viewport size
      const handScale = Math.min(0.68, Math.max(0.38, width / 2100));

      // Scaled dimensions
      const dScaledW = D_WIDTH * handScale;
      const dScaledH = D_HEIGHT * handScale;
      const dTipOffX = D_TIP_X * handScale;
      const dTipOffY = D_TIP_Y * handScale;

      const hScaledW = H_WIDTH * handScale;
      const hScaledH = H_HEIGHT * handScale;
      const hTipOffX = H_TIP_X * handScale;
      const hTipOffY = H_TIP_Y * handScale;

      // Anchors for arm entry
      // Digital hand enters from top-left
      const dAnchorX = -dScaledW * 0.25;
      const dAnchorY = -dScaledH * 0.25;

      // Human hand enters from bottom-right
      const hAnchorX = width + hScaledW * 0.25;
      const hAnchorY = height + hScaledH * 0.25;

      // Angles to cursor
      const angleD = Math.atan2(my - dAnchorY, mx - dAnchorX);
      const angleH = Math.atan2(my - hAnchorY, mx - hAnchorX);

      // Fingertip meeting gap calculation:
      // When reach is 1.0, gap is 0 -> fingertips touch exactly at (mx, my)
      // When reach < 1.0, gap separates fingertips along their reach vectors
      const gapOffset = Math.max(0, (1 - reach) * 130);

      const dTipX = mx - Math.cos(angleD) * gapOffset;
      const dTipY = my - Math.sin(angleD) * gapOffset;

      const hTipX = mx - Math.cos(angleH) * gapOffset;
      const hTipY = my - Math.sin(angleH) * gapOffset;

      const fingerDistance = Math.hypot(dTipX - hTipX, dTipY - hTipY);
      const isTouching = fingerDistance < 18 || reach >= 0.99;
      isTouchingRef.current = isTouching;

      if (isTouching) {
        sparkIntensityRef.current = Math.min(1, sparkIntensityRef.current + 0.15);
        if (!hasTriggeredInitialSound.current) {
          playPeacefulLikeSound();
          hasTriggeredInitialSound.current = true;
        }
      } else {
        sparkIntensityRef.current = Math.max(0, sparkIntensityRef.current - 0.05);
        if (fingerDistance > 80) {
          hasTriggeredInitialSound.current = false;
        }
      }

      // Natural resting orientation of each hand asset:
      // digital_hand: points down-right (~22 deg = 0.38 rad)
      // human_hand: points up-left (-152 deg = -2.65 rad)
      const naturalAngleD = 0.38;
      const naturalAngleH = -2.65;

      // Soft pivot rotation (only 35% tracking so wrists do not over-rotate unnaturally)
      const rotD = (angleD - naturalAngleD) * 0.35;
      const rotH = (angleH - naturalAngleH) * 0.35;

      // Apply transforms to DOM hand images
      if (digitalHandRef.current) {
        digitalHandRef.current.style.width = `${dScaledW}px`;
        digitalHandRef.current.style.height = `${dScaledH}px`;
        digitalHandRef.current.style.transformOrigin = `${dTipOffX}px ${dTipOffY}px`;
        digitalHandRef.current.style.transform = `translate3d(${dTipX - dTipOffX}px, ${dTipY - dTipOffY}px, 0) rotate(${rotD}rad)`;
      }

      if (humanHandRef.current) {
        humanHandRef.current.style.width = `${hScaledW}px`;
        humanHandRef.current.style.height = `${hScaledH}px`;
        humanHandRef.current.style.transformOrigin = `${hTipOffX}px ${hTipOffY}px`;
        humanHandRef.current.style.transform = `translate3d(${hTipX - hTipOffX}px, ${hTipY - hTipOffY}px, 0) rotate(${rotH}rad)`;
      }

      // =======================================================================
      // EFFECTS CANVAS RENDERING (Spark Corona, Lightning Arcs, Stardust)
      // =======================================================================
      ctx.clearRect(0, 0, width, height);

      // Draw subtle twinkling stars in the cosmic mist
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const alpha = star.baseAlpha + Math.sin(time * 30 * star.speed + star.phase) * 0.25;
        ctx.fillStyle = `rgba(255, 235, 200, ${Math.max(0.08, Math.min(0.9, alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Proximity Lightning Arcs (< 100px)
      if (fingerDistance < 110) {
        const arcIntensity = Math.max(0, 1 - fingerDistance / 110);
        const numArcs = isTouching ? 4 : 2;

        for (let a = 0; a < numArcs; a++) {
          ctx.beginPath();
          ctx.moveTo(dTipX, dTipY);
          const segments = 5;
          for (let s = 1; s < segments; s++) {
            const frac = s / segments;
            const px = dTipX + (hTipX - dTipX) * frac;
            const py = dTipY + (hTipY - dTipY) * frac;
            const jitter = (Math.random() - 0.5) * 22 * arcIntensity;
            ctx.lineTo(px + jitter, py + jitter);
          }
          ctx.lineTo(hTipX, hTipY);
          ctx.strokeStyle = a % 2 === 0 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(255, 209, 102, 0.95)';
          ctx.lineWidth = Math.random() * 1.8 + 0.8;
          ctx.stroke();
        }
      }

      // Radiant Celestial Corona on contact
      if (isTouching || fingerDistance < 24) {
        const midX = (dTipX + hTipX) * 0.5;
        const midY = (dTipY + hTipY) * 0.5;

        // Radial golden-blue plasma lens flare
        const coronaGrad = ctx.createRadialGradient(midX, midY, 2, midX, midY, 56);
        coronaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        coronaGrad.addColorStop(0.2, 'rgba(255, 214, 102, 0.8)');
        coronaGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.45)');
        coronaGrad.addColorStop(1, 'rgba(255, 110, 89, 0)');

        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(midX, midY, 56, 0, Math.PI * 2);
        ctx.fill();

        // Emit glowing stardust particles
        if (Math.random() < 0.45) {
          particlesRef.current.push({
            x: midX + (Math.random() - 0.5) * 12,
            y: midY + (Math.random() - 0.5) * 12,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 0.6,
            size: Math.random() * 2.8 + 1,
            alpha: 1,
            color: Math.random() > 0.45 ? '#ffd166' : '#38bdf8'
          });
        }
      }

      // Particle simulation
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

      // Pulse waves simulation
      const rings = pulseRingsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += 4.2;
        r.alpha -= 0.022;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          rings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.6;
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
      window.removeEventListener('wheel', handleWheel);
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

      {/* 2. REAL HANDS LAYER (Photorealistic Human Hand & 3D Wireframe Cyber Hand) */}
      <div className="creation-hands-stage" aria-hidden="true">
        {/* Left Digital Wireframe Hand */}
        <div className="creation-hand-wrapper digital-hand-wrapper" ref={digitalHandRef}>
          <img
            src="/assets/about/digital_hand_wireframe.png"
            alt="3D Wireframe Cybernetic Hand"
            className="creation-hand-img digital-hand-img"
            draggable={false}
          />
        </div>

        {/* Right Photorealistic Human Hand */}
        <div className="creation-hand-wrapper human-hand-wrapper" ref={humanHandRef}>
          <img
            src="/assets/about/human_hand_real.png"
            alt="Photorealistic Human Hand"
            className="creation-hand-img human-hand-img"
            draggable={false}
          />
        </div>
      </div>

      {/* 3. INTERACTIVE EFFECTS CANVAS (Quantum sparks, lightning arcs, star particles) */}
      <canvas ref={effectsCanvasRef} className="about-creation-canvas" />

      {/* 4. FIXED TOP NAVIGATION BAR */}
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

        {/* 1-CLICK VIEW SWITCHER BUTTON: Switch between Classic Story & Creation Touch Experience */}
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

      {/* 5. CENTER AUDIOPHILE EMBLEM & MINIMAL TYPOGRAPHY */}
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

      {/* 6. FOOTER MINIMAL CREDITS & INTERACTIVE TIP */}
      <footer className="about-creation-footer">
        <p className="creation-guide-hint">
          <span>✨ Move cursor or scroll wheel to guide the fingertips</span>
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
