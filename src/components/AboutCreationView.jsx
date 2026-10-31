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
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Interaction State Refs (bypasses React state for 60fps animation loop)
  const animRef = useRef(null);
  const mouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, isDown: false });
  const targetMouseRef = useRef({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 });
  const scrollReachRef = useRef(0.85); // 0.0 (far apart) to 1.0 (touching)
  const targetReachRef = useRef(0.85);
  const touchStateRef = useRef({ isTouching: false, touchTime: 0, sparkIntensity: 0 });
  const particlesRef = useRef([]);
  const lightningArcsRef = useRef([]);
  const pulseRingsRef = useRef([]);
  const hasTriggeredInitialSound = useRef(false);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [touchLocked, setTouchLocked] = useState(false);

  // Initialize and run Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Starfield setup
    const numStars = 140;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      baseAlpha: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.03 + 0.008,
      phase: Math.random() * Math.PI * 2
    }));

    // Handle Window Resize with high DPI scaling
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      targetMouseRef.current.x = width * 0.5;
      targetMouseRef.current.y = height * 0.5;
    };
    window.addEventListener('resize', handleResize);

    // Touch & Mouse Event Listeners
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
      // Scroll moves hands closer (scroll down = meet) or farther (scroll up = retreat)
      const delta = e.deltaY * 0.0015;
      targetReachRef.current = Math.max(0.3, Math.min(1.08, targetReachRef.current + delta));
      if (!hasInteracted) setHasInteracted(true);
    };

    const handleMouseDown = () => {
      mouseRef.current.isDown = true;
      targetReachRef.current = 1.0; // Snap fingers to touch on click
      // Trigger instant pulse ring and sparks
      pulseRingsRef.current.push({
        x: mouseRef.current.x,
        y: mouseRef.current.y,
        radius: 5,
        maxRadius: 180,
        alpha: 1,
        color: '#ffd166'
      });
      playShootingStarSound();
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Render Loop
    let time = 0;
    const render = () => {
      time += 0.02;

      // Smooth lerp mouse towards target
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.12;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.12;

      // Smooth lerp reach factor
      scrollReachRef.current += (targetReachRef.current - scrollReachRef.current) * 0.1;
      const reach = scrollReachRef.current;

      ctx.clearRect(0, 0, width, height);

      // 1. Cosmic Deep Space Background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      // Subtle radial center nebula glow
      const radialGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 50,
        width * 0.5, height * 0.5, width * 0.7
      );
      radialGrad.addColorStop(0, 'rgba(25, 20, 36, 0.45)');
      radialGrad.addColorStop(0.5, 'rgba(14, 12, 22, 0.25)');
      radialGrad.addColorStop(1, 'rgba(6, 6, 8, 0)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Twinkling Stars with parallax shift
      const parallaxX = (mouseRef.current.x - width * 0.5) * 0.02;
      const parallaxY = (mouseRef.current.y - height * 0.5) * 0.02;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const alpha = star.baseAlpha + Math.sin(time * star.twinkleSpeed * 60 + star.phase) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, Math.min(1, alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x + parallaxX * (star.size * 0.6), star.y + parallaxY * (star.size * 0.6), star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // =========================================================================
      // KINEMATICS & HAND ANCHORS
      // =========================================================================
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Digital Hand Anchor (Top-Left)
      const dOriginX = -40;
      const dOriginY = -40;

      // Human Hand Anchor (Bottom-Right)
      const hOriginX = width + 40;
      const hOriginY = height + 40;

      // Distance and angles to target cursor
      const dDx = mx - dOriginX;
      const dDy = my - dOriginY;
      const dDist = Math.hypot(dDx, dDy);
      const dAngle = Math.atan2(dDy, dDx);

      const hDx = mx - hOriginX;
      const hDy = my - hOriginY;
      const hDist = Math.hypot(hDx, hDy);
      const hAngle = Math.atan2(hDy, hDx);

      // Fingertip meeting calculation:
      // When reach is 1.0, fingertips meet exactly at (mx, my)
      // When reach < 1.0, fingertips maintain a gap
      const gapOffset = Math.max(0, (1 - reach) * 160);

      const dTipX = mx - Math.cos(dAngle) * gapOffset;
      const dTipY = my - Math.sin(dAngle) * gapOffset;

      const hTipX = mx - Math.cos(hAngle) * gapOffset;
      const hTipY = my - Math.sin(hAngle) * gapOffset;

      const currentFingerGap = Math.hypot(dTipX - hTipX, dTipY - hTipY);
      const isTouching = currentFingerGap < 26 || reach >= 0.98;

      if (isTouching) {
        touchStateRef.current.isTouching = true;
        touchStateRef.current.sparkIntensity = Math.min(1, touchStateRef.current.sparkIntensity + 0.1);
        if (!hasTriggeredInitialSound.current) {
          playShootingStarSound();
          hasTriggeredInitialSound.current = true;
        }
      } else {
        touchStateRef.current.isTouching = false;
        touchStateRef.current.sparkIntensity = Math.max(0, touchStateRef.current.sparkIntensity - 0.05);
      }

      // =========================================================================
      // 3. DRAW DIGITAL WIREFRAME AI HAND (Top-Left to Tip1)
      // =========================================================================
      drawDigitalWireframeHand(ctx, dOriginX, dOriginY, dTipX, dTipY, dAngle, time, isTouching);

      // =========================================================================
      // 4. DRAW REALISTIC HUMAN HAND (Bottom-Right to Tip2)
      // =========================================================================
      drawRealisticHumanHand(ctx, hOriginX, hOriginY, hTipX, hTipY, hAngle, isTouching, time);

      // =========================================================================
      // 5. TOUCH POINT: QUANTUM ARCS & SPARK CORONA
      // =========================================================================
      drawQuantumTouchSpark(ctx, dTipX, dTipY, hTipX, hTipY, mx, my, currentFingerGap, isTouching, time);

      // 6. Particle & Pulse Wave Updates
      updateAndDrawParticles(ctx);
      updateAndDrawPulseRings(ctx);

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

  // =========================================================================
  // DIGITAL WIREFRAME HAND RENDERER (3D Neon Polygonal Mesh)
  // =========================================================================
  const drawDigitalWireframeHand = (ctx, startX, startY, endX, endY, angle, time, isTouching) => {
    ctx.save();

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);

    ctx.translate(startX, startY);
    ctx.rotate(angle);

    // Subtle neon glow effect
    ctx.shadowColor = isTouching ? '#ff9e7d' : '#ff6e59';
    ctx.shadowBlur = isTouching ? 18 : 10;
    ctx.strokeStyle = '#ff6e59';
    ctx.lineWidth = 1.2;

    // Cross-sectional 3D wireframe mesh rings along forearm -> palm -> finger
    const numRings = 14;
    const ringPoints = [];

    for (let r = 0; r <= numRings; r++) {
      const t = r / numRings;
      const x = t * length;

      // Realistic anatomical thickness profile
      let radiusY = 48 * Math.sin(t * Math.PI * 0.8 + 0.3);
      if (t > 0.65) {
        // Taper towards outstretched index finger
        radiusY = 14 * (1 - (t - 0.65) / 0.35) + 4;
      }

      // Small cyber vibration
      const vib = Math.sin(time * 8 + r) * 0.8;
      const rY = Math.max(3, radiusY + vib);

      // 6 vertices per elliptical cylinder ring
      const points = [];
      const numVerts = 6;
      for (let v = 0; v < numVerts; v++) {
        const phi = (v / numVerts) * Math.PI * 2;
        const py = Math.sin(phi) * rY;
        const pz = Math.cos(phi) * (rY * 0.85); // Simulated Z depth
        points.push({ x: x + pz * 0.25, y: py });
      }
      ringPoints.push(points);

      // Draw the transverse ring
      ctx.beginPath();
      for (let v = 0; v <= numVerts; v++) {
        const pt = points[v % numVerts];
        if (v === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Translucent polygon mesh fill
      ctx.fillStyle = `rgba(255, 110, 89, ${0.03 + (1 - t) * 0.05})`;
      ctx.fill();
    }

    // Connect longitudinal spine lines across rings
    const numSpines = 6;
    for (let s = 0; s < numSpines; s++) {
      ctx.beginPath();
      for (let r = 0; r <= numRings; r++) {
        const pt = ringPoints[r][s];
        if (r === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Curled thumb wireframe polygon
    ctx.beginPath();
    const thumbBaseX = length * 0.42;
    const thumbBaseY = 32;
    ctx.moveTo(thumbBaseX, thumbBaseY);
    ctx.lineTo(thumbBaseX + 28, thumbBaseY + 24);
    ctx.lineTo(thumbBaseX + 44, thumbBaseY + 12);
    ctx.lineTo(thumbBaseX + 32, thumbBaseY - 6);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 110, 89, 0.08)';
    ctx.fill();

    // Curled middle & ring fingers (foreshortened perspective wireframe)
    for (let f = 1; f <= 3; f++) {
      const fBaseX = length * 0.58;
      const fBaseY = -12 - f * 10;
      ctx.beginPath();
      ctx.moveTo(fBaseX, fBaseY);
      ctx.lineTo(fBaseX + 22, fBaseY - 12);
      ctx.lineTo(fBaseX + 36, fBaseY - 4);
      ctx.lineTo(fBaseX + 26, fBaseY + 10);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }

    // Glowing tip vertex on index finger
    ctx.beginPath();
    ctx.arc(length, 0, isTouching ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  };

  // =========================================================================
  // REALISTIC HUMAN HAND RENDERER (Warm Anatomical Gradients & Shading)
  // =========================================================================
  const drawRealisticHumanHand = (ctx, startX, startY, endX, endY, angle, isTouching, time) => {
    ctx.save();

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);

    ctx.translate(startX, startY);
    ctx.rotate(angle);

    // Realistic human skin tones
    const skinBase = '#d79b7d';
    const skinShadow = '#78432a';
    const skinHighlight = '#f4c5ad';
    const orangeRimLight = 'rgba(255, 110, 89, 0.45)';

    // 1. Forearm & Palm Outer Silhouette Path
    ctx.beginPath();
    ctx.moveTo(0, -45); // Top of wrist
    ctx.bezierCurveTo(length * 0.25, -42, length * 0.45, -34, length * 0.62, -22); // Dorsum & Knuckles
    ctx.bezierCurveTo(length * 0.72, -18, length * 0.88, -10, length, 0); // Outstretched index finger tip
    ctx.bezierCurveTo(length * 0.92, 10, length * 0.76, 16, length * 0.64, 18); // Finger bottom to palm
    ctx.bezierCurveTo(length * 0.50, 38, length * 0.32, 48, 0, 48); // Thenar palm muscle to inner wrist
    ctx.closePath();

    // 2. Realistic 3D Organic Skin Gradient Fill
    const skinGrad = ctx.createLinearGradient(0, -45, 0, 48);
    skinGrad.addColorStop(0, skinHighlight);
    skinGrad.addColorStop(0.35, skinBase);
    skinGrad.addColorStop(0.75, '#b87556');
    skinGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = skinGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 24;
    ctx.fill();

    // 3. Warm rim lighting reflection from cyber hand on the dorsal edge
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = orangeRimLight;
    ctx.stroke();

    // 4. Palm crease lines & anatomical knuckles
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(92, 45, 26, 0.35)';
    ctx.lineWidth = 1.2;
    // Proximal joint crease
    ctx.moveTo(length * 0.68, -12);
    ctx.quadraticCurveTo(length * 0.70, 2, length * 0.69, 14);
    // Interphalangeal joint crease
    ctx.moveTo(length * 0.83, -6);
    ctx.quadraticCurveTo(length * 0.84, 0, length * 0.83, 8);
    ctx.stroke();

    // 5. Realistic Fingernail on index tip
    const nailX = length - 12;
    const nailY = -3;
    ctx.beginPath();
    ctx.ellipse(nailX, nailY, 7, 4.5, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 230, 220, 0.55)';
    ctx.fill();
    // Specular nail sheen
    ctx.beginPath();
    ctx.ellipse(nailX - 1, nailY - 1, 4, 1.8, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // 6. Curled fingers and thumb resting naturally below
    ctx.beginPath();
    ctx.arc(length * 0.52, 22, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#a66244';
    ctx.fill();

    ctx.restore();
  };

  // =========================================================================
  // QUANTUM TOUCH SPARK & PLASMA ARCS (When fingertips meet)
  // =========================================================================
  const drawQuantumTouchSpark = (ctx, dX, dY, hX, hY, mx, my, gap, isTouching, time) => {
    // If fingers are within proximity (< 75px), draw electric plasma arcs bridging them
    if (gap < 85) {
      const arcIntensity = Math.max(0, 1 - gap / 85);

      // Dynamic electric lightning arcs between fingertips
      const numArcs = isTouching ? 4 : 2;
      for (let a = 0; a < numArcs; a++) {
        ctx.beginPath();
        ctx.moveTo(dX, dY);

        const segments = 6;
        for (let s = 1; s < segments; s++) {
          const frac = s / segments;
          const px = dX + (hX - dX) * frac;
          const py = dY + (hY - dY) * frac;
          // Jitter offset
          const jitter = (Math.random() - 0.5) * 18 * arcIntensity;
          ctx.lineTo(px + jitter, py + jitter);
        }

        ctx.lineTo(hX, hY);
        ctx.strokeStyle = a % 2 === 0 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(255, 214, 102, 0.9)';
        ctx.lineWidth = Math.random() * 1.5 + 0.8;
        ctx.stroke();
      }
    }

    // If fingertips touch: Radiant Celestial Corona
    if (isTouching || gap < 20) {
      const midX = (dX + hX) * 0.5;
      const midY = (dY + hY) * 0.5;

      // Soft expanding light corona
      const coronaGrad = ctx.createRadialGradient(midX, midY, 2, midX, midY, 45);
      coronaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      coronaGrad.addColorStop(0.25, 'rgba(255, 215, 100, 0.7)');
      coronaGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.35)');
      coronaGrad.addColorStop(1, 'rgba(255, 110, 89, 0)');

      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(midX, midY, 45, 0, Math.PI * 2);
      ctx.fill();

      // Emit stardust particles periodically on contact
      if (Math.random() < 0.45) {
        particlesRef.current.push({
          x: midX + (Math.random() - 0.5) * 10,
          y: midY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 3.5,
          vy: (Math.random() - 0.5) * 3.5 - 0.8,
          size: Math.random() * 2.5 + 1,
          alpha: 1,
          color: Math.random() > 0.5 ? '#ffd166' : '#38bdf8'
        });
      }
    }
  };

  // Particle simulation loop
  const updateAndDrawParticles = (ctx) => {
    const list = particlesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;

      if (p.alpha <= 0) {
        list.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  // Pulse wave rings loop
  const updateAndDrawPulseRings = (ctx) => {
    const rings = pulseRingsRef.current;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.radius += 3.8;
      r.alpha -= 0.022;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        rings.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  return (
    <div className="about-creation-container" ref={containerRef} tabIndex={0}>
      {/* Interactive Fullscreen Canvas */}
      <canvas ref={canvasRef} className="about-creation-canvas" />

      {/* FIXED TOP NAVIGATION BAR */}
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
          title="Switch to the full narrative editorial story view"
        >
          <BookOpen size={14} className="switcher-icon" />
          <span>Classic Story View</span>
        </button>
      </header>

      {/* CENTER COZY AUDIOPHILE EMBLEM & MINIMAL TYPOGRAPHY */}
      <div className="about-creation-center-hero" aria-label="Creation Story Typography">
        {/* Play/Pause Button inside Glass Ring */}
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

      {/* FOOTER MINIMAL CREDITS & INTERACTIVE TIP */}
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
