import React, { useEffect, useRef } from 'react';

/**
 * IntroScene.jsx
 * Dark, quiet, architectural studio environment for Musicly:
 * - NO floating 3D demo look, NO bright yellow spheres.
 * - Deep obsidian studio background (#07090D - #0D1118) with dark corners.
 * - Exactly 3 subtle geometric environmental elements:
 *   1. Monolithic matte charcoal cube (left midground, faint glass edge, soft amber rim)
 *   2. Slender dark blue-gray slab / smoked glass (right midground, translucent edge)
 *   3. Distant dark architectural form partially dissolved in deep haze
 *   4. Single pinpoint atmospheric light source in deep distance (soft & dim, NOT a glowing ball)
 * - Ultra-slow autonomous drift (25-40s cycle) and mouse-driven micro-parallax & light response.
 * - 60 FPS hardware-accelerated Canvas with devicePixelRatio crispness.
 */
export default function IntroScene({ timelineRef, mouseRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let animId = null;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    // 16 whisper-quiet ambient micro dust motes catching faint light
    const dustMotes = Array.from({ length: 16 }, (_, i) => {
      const seed = (i + 1) / 16;
      return {
        x: (Math.sin(seed * 34.2) * 0.5 + 0.5) * width,
        y: (Math.cos(seed * 27.8) * 0.5 + 0.5) * height,
        size: 0.7 + (seed * 0.9),
        speedX: (Math.sin(seed * 19) * 0.08),
        speedY: -0.08 - (seed * 0.12),
        opacity: 0.10 + (seed * 0.16),
        phase: seed * Math.PI * 2
      };
    });

    // 3D Perspective Projection Math
    const project = (x, y, z, camZ, camX, camY) => {
      const fov = 720;
      const relZ = z - camZ;
      if (relZ <= 10) return null;
      const scale = fov / relZ;
      return {
        x: (x - camX) * scale + width / 2,
        y: (y - camY) * scale + height / 2,
        scale,
        relZ
      };
    };

    // Draw 3D Box with lighting and specular edges
    const drawBox = (cx, cy, cz, w, h, d, rotY, rotX, camZ, camX, camY, isTranslucent = false) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Local 8 cube vertices
      const hw = w / 2;
      const hh = h / 2;
      const hd = d / 2;

      const localVerts = [
        [-hw, -hh, -hd],
        [ hw, -hh, -hd],
        [ hw,  hh, -hd],
        [-hw,  hh, -hd],
        [-hw, -hh,  hd],
        [ hw, -hh,  hd],
        [ hw,  hh,  hd],
        [-hw,  hh,  hd]
      ];

      // Rotate and project vertices
      const projVerts = [];
      for (let i = 0; i < 8; i++) {
        const [vx, vy, vz] = localVerts[i];
        // Rotate Y
        const x1 = vx * cosY + vz * sinY;
        const z1 = -vx * sinY + vz * cosY;
        // Rotate X
        const y2 = vy * cosX - z1 * sinX;
        const z2 = vy * sinX + z1 * cosX;

        const p = project(cx + x1, cy + y2, cz + z2, camZ, camX, camY);
        if (!p) return;
        projVerts.push(p);
      }

      // Box Faces: [indices, baseColor, isTop, isFront]
      // 0-1-2-3 (front), 5-4-7-6 (back), 4-0-3-7 (left), 1-5-6-2 (right), 4-5-1-0 (top), 3-2-6-7 (bottom)
      const faces = [
        { idx: [0, 1, 2, 3], normZ: cosY * cosX, name: 'front' },
        { idx: [4, 5, 1, 0], normZ: -sinX, name: 'top' },
        { idx: [1, 5, 6, 2], normZ: sinY * cosX, name: 'right' },
        { idx: [4, 0, 3, 7], normZ: -sinY * cosX, name: 'left' }
      ];

      // Sort faces by depth
      faces.sort((a, b) => b.normZ - a.normZ);

      faces.forEach((f) => {
        const [i0, i1, i2, i3] = f.idx;
        const p0 = projVerts[i0];
        const p1 = projVerts[i1];
        const p2 = projVerts[i2];
        const p3 = projVerts[i3];

        // Backface culling
        const area = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        if (area <= 0 && !isTranslucent) return;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();

        if (isTranslucent) {
          // Dark blue-gray smoked glass with subtle translucency
          ctx.fillStyle = 'rgba(16, 22, 32, 0.78)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Matte charcoal with soft directional lighting
          if (f.name === 'top') {
            ctx.fillStyle = '#181f2a';
            ctx.fill();
            // Subtle specular glass edge on top
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (f.name === 'left' || f.name === 'front') {
            ctx.fillStyle = '#121620';
            ctx.fill();
            // Subtle amber rim highlight
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.035)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            ctx.fillStyle = '#0d1017';
            ctx.fill();
          }
        }
      });
    };

    let startTime = null;

    const render = (now) => {
      if (!isRunning) return;
      if (!startTime) startTime = now;
      const elapsed = (now - startTime) / 1000;

      const prog = timelineRef ? timelineRef.current : 0;
      const mouse = mouseRef ? mouseRef.current : { x: 0, y: 0 };

      // Scale canvas to retina resolution
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Studio Background: Deep near-black with atmospheric blue-gray center
      const bgGrad = ctx.createRadialGradient(
        width / 2 + mouse.x * 40,
        height * 0.48 + mouse.y * 30,
        width * 0.05,
        width / 2,
        height * 0.50,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#0d1118');
      bgGrad.addColorStop(0.45, '#0a0d13');
      bgGrad.addColorStop(0.85, '#07090d');
      bgGrad.addColorStop(1, '#05070a');

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Studio Floor Plane: Extends from horizon (~53% height) downward
      const floorHorizonY = height * 0.535;
      const floorGrad = ctx.createLinearGradient(0, floorHorizonY, 0, height);
      floorGrad.addColorStop(0, 'rgba(12, 16, 23, 0.45)');
      floorGrad.addColorStop(0.35, 'rgba(9, 12, 18, 0.75)');
      floorGrad.addColorStop(1, 'rgba(6, 8, 12, 0.98)');

      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorHorizonY, width, height - floorHorizonY);

      // 3. Floor Virtual Specular Light Sheen (Responds subtly to mouse)
      const floorLightX = width / 2 + mouse.x * 120;
      const floorLightY = height * 0.62 + mouse.y * 45;
      const floorLightGrad = ctx.createRadialGradient(
        floorLightX,
        floorLightY,
        0,
        floorLightX,
        floorLightY,
        width * 0.42
      );
      floorLightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.022)');
      floorLightGrad.addColorStop(0.28, 'rgba(245, 158, 11, 0.012)');
      floorLightGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = floorLightGrad;
      ctx.fillRect(0, floorHorizonY, width, height - floorHorizonY);

      // Camera coordinates: physical slow approach
      // Camera moves forward: 0 -> 140 over the timeline
      const camZ = prog * 140;
      const camX = mouse.x * 24;
      const camY = mouse.y * 16;

      // 4. Form 3 (Distant Dark Architectural Monolith in deep haze)
      const distZ = 980;
      const distP = project(-width * 0.16, -height * 0.15, distZ, camZ, camX, camY);
      if (distP) {
        ctx.save();
        ctx.globalAlpha = 0.42 * (1 - prog * 0.25);
        ctx.fillStyle = '#0c0f16';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const dw = 110 * distP.scale;
        const dh = 150 * distP.scale;
        ctx.fillRect(distP.x - dw / 2, distP.y - dh / 2, dw, dh);
        ctx.strokeRect(distP.x - dw / 2, distP.y - dh / 2, dw, dh);
        ctx.restore();
      }

      // 5. Distant Pinpoint Light Source (Much smaller, dimmer, softer atmospheric fixture)
      const lightZ = 1120;
      const lp = project(width * 0.26, -height * 0.22, lightZ, camZ, camX, camY);
      if (lp) {
        const glowRad = 22 * lp.scale;
        const lightGlow = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, glowRad);
        lightGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        lightGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.06)');
        lightGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = lightGlow;
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, glowRad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 1.8 * lp.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Form 1 (Matte Charcoal Monolith / Cube, Left Midground)
      // Slow autonomous rotation (cycle ~38s)
      const rotY1 = elapsed * 0.00035 + 0.38;
      const rotX1 = 0.16 + Math.sin(elapsed * 0.0002) * 0.03;
      drawBox(
        -width * 0.27,
        height * 0.04 + Math.sin(elapsed * 0.0004) * 6,
        660,
        135,
        165,
        125,
        rotY1,
        rotX1,
        camZ,
        camX,
        camY,
        false
      );

      // 7. Form 2 (Dark Blue-Gray Slab / Smoked Glass, Right Midground)
      // Slow autonomous drift (cycle ~32s)
      const rotY2 = -0.42 - elapsed * 0.00028;
      const rotX2 = 0.12 + Math.cos(elapsed * 0.0003) * 0.02;
      drawBox(
        width * 0.29,
        height * 0.08 + Math.cos(elapsed * 0.0005) * 5,
        590,
        175,
        125,
        32,
        rotY2,
        rotX2,
        camZ,
        camX,
        camY,
        true
      );

      // 8. Ambient Micro-Dust Motes (Drifting quietly)
      dustMotes.forEach((m) => {
        m.x += m.speedX;
        m.y += m.speedY;
        m.phase += 0.012;

        if (m.y < 0) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < 0) m.x = width;
        if (m.x > width) m.x = 0;

        const pulseOp = m.opacity * (0.7 + 0.3 * Math.sin(m.phase)) * (1 - prog * 0.4);
        ctx.fillStyle = `rgba(240, 235, 225, ${pulseOp.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [timelineRef, mouseRef]);

  return (
    <div className="intro-sculpture-viewport" aria-hidden="true">
      <canvas ref={canvasRef} className="intro-studio-canvas" />
    </div>
  );
}
