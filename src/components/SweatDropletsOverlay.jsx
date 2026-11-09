import React, { useEffect, useRef } from 'react';

/**
 * SweatDropletsOverlay
 * 
 * Hyper-realistic physical condensation & sweat droplets simulation.
 * Pure water optics:
 * - Transparent glass meniscus (no fake bubble rings or dark fills)
 * - Directional specular reflections and bottom caustic light focusing
 * - Natural stick-and-slip gravity sliding with glossy wet streak trails
 * - High-density micro-condensation mist
 * - Non-blocking pointer events
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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

    // 1. High-density micro-condensation mist (tiny 0.8px - 2px droplets clustered around edges)
    const microMist = [];
    const numMicro = Math.min(180, Math.floor((width * height) / 8000));
    for (let i = 0; i < numMicro; i++) {
      // Bias slightly towards perimeter/corners
      const edgeBias = Math.random() < 0.6;
      const x = edgeBias
        ? (Math.random() < 0.5 ? Math.random() * (width * 0.28) : width - Math.random() * (width * 0.28))
        : Math.random() * width;
      const y = Math.random() * height;
      microMist.push({
        x,
        y,
        r: 0.8 + Math.random() * 1.6,
        alpha: 0.35 + Math.random() * 0.45
      });
    }

    // 2. Medium static clinging sweat beads (3px - 8px)
    const staticBeads = [];
    const numStatic = Math.min(65, Math.floor((width * height) / 18000));
    for (let i = 0; i < numStatic; i++) {
      const rx = 2.5 + Math.random() * 4.5;
      const ry = rx * (1.05 + Math.random() * 0.25); // slightly elongated by gravity
      staticBeads.push({
        x: Math.random() * width,
        y: Math.random() * height,
        rx,
        ry,
        alpha: 0.6 + Math.random() * 0.35,
        rotation: (Math.random() - 0.5) * 0.2
      });
    }

    // 3. Active running / trickling sweat drips
    const numDrips = Math.min(12, Math.max(6, Math.floor(width / 160)));
    const drips = [];
    for (let i = 0; i < numDrips; i++) {
      drips.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        rx: 3.5 + Math.random() * 4.5,
        ry: 4.5 + Math.random() * 6.5,
        velocity: 0.2 + Math.random() * 0.6,
        targetVelocity: 0.5 + Math.random() * 1.8,
        slipTimer: Math.random() * 60,
        trail: [],
        meanderAngle: Math.random() * Math.PI * 2,
        alpha: 0.85
      });
    }

    // Draw realistic water drop with genuine optical refraction & highlights
    const drawRealisticDrop = (x, y, rx, ry, alpha = 0.8, isTeardrop = false, rot = 0) => {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);

      // A. Soft contact shadow cast on glass beneath drop (subtle blur)
      ctx.beginPath();
      ctx.ellipse(0.5, ry * 0.25, rx * 0.95, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30, 20, 15, ${0.12 * alpha})`;
      ctx.fill();

      // B. Drop geometry path
      ctx.beginPath();
      if (isTeardrop) {
        // Natural tapered teardrop for sliding sweat
        ctx.moveTo(0, -ry * 1.3);
        ctx.bezierCurveTo(rx * 0.9, -ry * 0.4, rx * 1.05, ry * 0.85, 0, ry * 0.95);
        ctx.bezierCurveTo(-rx * 1.05, ry * 0.85, -rx * 0.9, -ry * 0.4, 0, -ry * 1.3);
      } else {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      }

      // C. Pure clear water body: mostly transparent glass with subtle light absorption
      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 * alpha})`;
      ctx.fill();

      // D. Thin refraction meniscus rim (outer edge where light bends)
      ctx.strokeStyle = `rgba(40, 30, 20, ${0.25 * alpha})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // E. Internal caustic light pool (light bends and focuses at the bottom inner edge)
      ctx.beginPath();
      ctx.ellipse(0, ry * 0.38, rx * 0.65, ry * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * alpha})`;
      ctx.fill();

      // F. Razor-sharp specular highlight glint (top-left direct light source)
      ctx.beginPath();
      ctx.ellipse(-rx * 0.32, -ry * 0.35, rx * 0.3, ry * 0.18, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.96 * alpha})`;
      ctx.fill();

      // G. Tiny secondary specular reflection (opposite rim point)
      if (rx > 3) {
        ctx.beginPath();
        ctx.arc(rx * 0.28, ry * 0.28, rx * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * alpha})`;
        ctx.fill();
      }

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw micro-condensation mist beads
      for (let i = 0; i < microMist.length; i++) {
        const m = microMist[i];
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha * 0.7})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(30, 20, 10, ${m.alpha * 0.18})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // 2. Draw static clinging sweat beads
      for (let i = 0; i < staticBeads.length; i++) {
        const b = staticBeads[i];
        drawRealisticDrop(b.x, b.y, b.rx, b.ry, b.alpha, false, b.rotation);
      }

      // 3. Update & render trickling sweat drips
      for (let i = 0; i < drips.length; i++) {
        const drip = drips[i];

        // Store trail
        drip.trail.push({ x: drip.x, y: drip.y, rx: drip.rx * 0.35, alpha: 0.6 });
        if (drip.trail.length > 28) {
          drip.trail.shift();
        }

        // Draw faint glossy wet streak trail left on glass
        if (drip.trail.length > 2) {
          ctx.save();
          // Soft wet path outline
          ctx.beginPath();
          ctx.moveTo(drip.trail[0].x, drip.trail[0].y);
          for (let t = 1; t < drip.trail.length; t++) {
            ctx.lineTo(drip.trail[t].x, drip.trail[t].y);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = drip.rx * 0.55;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Thin glossy core highlight along the wet streak
          ctx.beginPath();
          ctx.moveTo(drip.trail[0].x, drip.trail[0].y);
          for (let t = 1; t < drip.trail.length; t++) {
            ctx.lineTo(drip.trail[t].x, drip.trail[t].y);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = drip.rx * 0.18;
          ctx.stroke();
          ctx.restore();
        }

        // Realistic "Stick-and-Slip" liquid physics
        drip.slipTimer--;
        if (drip.slipTimer <= 0) {
          // Switch between sticking and slipping
          if (Math.random() < 0.4) {
            drip.targetVelocity = 0.15 + Math.random() * 0.3; // brief stick / slow down
            drip.slipTimer = 20 + Math.random() * 40;
          } else {
            drip.targetVelocity = 0.9 + Math.random() * 2.2; // sudden slip downward
            drip.slipTimer = 15 + Math.random() * 30;
          }
        }

        // Smooth velocity interpolation
        drip.velocity += (drip.targetVelocity - drip.velocity) * 0.08;

        // Meander slightly left and right as water rolls over glass
        drip.meanderAngle += 0.04;
        drip.x += Math.sin(drip.meanderAngle) * 0.35;
        drip.y += drip.velocity;

        // Draw head drip drop (elongated teardrop)
        drawRealisticDrop(drip.x, drip.y, drip.rx, drip.ry, 0.92, true);

        // Reset if reached bottom of screen
        if (drip.y > height + 40) {
          drip.x = Math.random() * width;
          drip.y = -10 - Math.random() * 50;
          drip.rx = 3.5 + Math.random() * 4.5;
          drip.ry = drip.rx * (1.2 + Math.random() * 0.4);
          drip.velocity = 0.3;
          drip.targetVelocity = 0.8 + Math.random() * 1.5;
          drip.slipTimer = 20 + Math.random() * 30;
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
      {/* High-Octane Speed Vignette */}
      <div className="vinyl-gym-motion-blur-vignette" />

      {/* Realistic Procedural Sweat Droplets Canvas */}
      <canvas
        ref={canvasRef}
        className="vinyl-sweat-droplets-canvas"
      />
    </div>
  );
}
