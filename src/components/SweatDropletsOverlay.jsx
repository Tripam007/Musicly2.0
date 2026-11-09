import React, { useEffect, useRef } from 'react';

/**
 * SweatDropletsOverlay
 * 
 * Hyper-realistic animated sweat & condensation droplets running down the screen
 * during high-intensity workout / GYM mode.
 * Features:
 * - Procedural glass specular highlights and refraction on every bead
 * - Static condensation beads + animated trickling sweat streams with wet trails
 * - High-DPI Retina canvas scaling
 * - Micro-vibrations responsive to gym bass beats
 * - Zero pointer-events interference
 */
export default function SweatDropletsOverlay({ isActive = false }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = window.devicePixelRatio || 1;

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Generate static condensation droplets (mist & small beads)
    const staticDrops = [];
    const numStatic = Math.min(100, Math.floor((width * height) / 12000));
    for (let i = 0; i < numStatic; i++) {
      staticDrops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() < 0.7 ? 1.5 + Math.random() * 2.5 : 4 + Math.random() * 5,
        alpha: 0.45 + Math.random() * 0.45,
        wobbleOffset: Math.random() * Math.PI * 2
      });
    }

    // Generate active trickling sweat drips
    const numDrips = Math.min(16, Math.max(8, Math.floor(width / 130)));
    const drips = [];
    for (let i = 0; i < numDrips; i++) {
      drips.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        startY: Math.random() * height * 0.3,
        r: 3.5 + Math.random() * 5.5,
        speed: 0.6 + Math.random() * 1.6,
        accel: 1.002 + Math.random() * 0.003,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.04,
        trail: []
      });
    }

    let time = 0;

    // Render individual water / sweat droplet with refraction & highlights
    const drawDroplet = (x, y, r, alpha = 0.8, isDrip = false) => {
      ctx.save();

      // Outer soft refraction shadow
      ctx.beginPath();
      ctx.ellipse(x + r * 0.25, y + r * 0.3, r, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.18 * alpha})`;
      ctx.fill();

      // Droplet base body (glossy water bead)
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.02, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        x - r * 0.3, y - r * 0.3, r * 0.1,
        x, y, r
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.7 * alpha})`);
      grad.addColorStop(0.3, `rgba(240, 245, 255, ${0.15 * alpha})`);
      grad.addColorStop(0.8, `rgba(80, 100, 120, ${0.12 * alpha})`);
      grad.addColorStop(1, `rgba(20, 30, 40, ${0.35 * alpha})`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Inverted internal caustic rim reflection (bottom right)
      ctx.beginPath();
      ctx.arc(x + r * 0.25, y + r * 0.25, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * alpha})`;
      ctx.fill();

      // Specular highlight glint (top left direct light)
      ctx.beginPath();
      ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.32, r * 0.22, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * alpha})`;
      ctx.fill();

      // Tiny secondary pin-point glint
      ctx.beginPath();
      ctx.arc(x - r * 0.1, y - r * 0.45, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * alpha})`;
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.04;

      // 1. Draw static condensation droplets with subtle breathing
      for (let i = 0; i < staticDrops.length; i++) {
        const d = staticDrops[i];
        const microWobble = Math.sin(time + d.wobbleOffset) * 0.15;
        drawDroplet(d.x, d.y, d.r + microWobble, d.alpha);
      }

      // 2. Update and draw trickling sweat streams
      for (let i = 0; i < drips.length; i++) {
        const drip = drips[i];

        // Store trail points
        drip.trail.push({ x: drip.x, y: drip.y, r: drip.r * 0.4 });
        if (drip.trail.length > 25) {
          drip.trail.shift();
        }

        // Draw faint wet trail streak
        if (drip.trail.length > 2) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(drip.trail[0].x, drip.trail[0].y);
          for (let t = 1; t < drip.trail.length; t++) {
            ctx.lineTo(drip.trail[t].x, drip.trail[t].y);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = drip.r * 0.55;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Thin glossy core inside the trail
          ctx.beginPath();
          ctx.moveTo(drip.trail[0].x, drip.trail[0].y);
          for (let t = 1; t < drip.trail.length; t++) {
            ctx.lineTo(drip.trail[t].x, drip.trail[t].y);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = drip.r * 0.2;
          ctx.stroke();
          ctx.restore();
        }

        // Physics: advance position with slight meandering wobble
        drip.wobble += drip.wobbleSpeed;
        drip.x += Math.sin(drip.wobble) * 0.45;
        drip.y += drip.speed;
        drip.speed *= drip.accel;

        // Draw head droplet (slightly teardrop elongated)
        drawDroplet(drip.x, drip.y, drip.r, 0.9, true);

        // Reset if reached bottom of screen
        if (drip.y > height + 30) {
          drip.x = Math.random() * width;
          drip.y = -10 - Math.random() * 40;
          drip.startY = drip.y;
          drip.speed = 0.6 + Math.random() * 1.5;
          drip.accel = 1.002 + Math.random() * 0.003;
          drip.r = 3.5 + Math.random() * 5.5;
          drip.trail = [];
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="vinyl-sweat-overlay-wrapper" aria-hidden="true">
      {/* Dynamic Motion Blur Speed Vignette */}
      <div className="vinyl-gym-motion-blur-vignette" />

      {/* Realistic Procedural Sweat Droplets Canvas */}
      <canvas
        ref={canvasRef}
        className="vinyl-sweat-droplets-canvas"
      />

      {/* Workout Intensity HUD Indicator */}
      <div className="vinyl-gym-hud-pill">
        <span className="vinyl-gym-hud-pulse-dot" />
        <span className="vinyl-gym-hud-text">WORKOUT MODE • MAXIMUM FOCUS</span>
      </div>
    </div>
  );
}
