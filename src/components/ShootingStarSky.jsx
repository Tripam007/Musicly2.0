import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playShootingStarSound } from '../utils/audioSynth';

export default function ShootingStarSky({ activeBackdrop }) {
  const [stars, setStars] = useState([]);
  const hasInitialHoverPlayedRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const containerRef = useRef(null);

  // Check if current backdrop is the Retro scene
  const isRetro = !activeBackdrop || activeBackdrop.includes('retro_scene');

  // Reset initial hover state if user navigates back to Retro
  useEffect(() => {
    if (isRetro) {
      hasInitialHoverPlayedRef.current = false;
    }
  }, [isRetro]);

  const triggerShootingStar = useCallback(() => {
    if (!isRetro) return;

    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect ? rect.width : window.innerWidth;
    const height = rect ? rect.height : window.innerHeight;

    // Start in the upper-right sky above the tree and sun
    // Starts around X: 78% - 84%, Y: 6% - 10%
    const startX = width * (0.78 + Math.random() * 0.05);
    const startY = height * (0.07 + Math.random() * 0.04);

    // Travels down and left towards the distant mountains
    // Ending around X: 45% - 49%, Y: 46% - 49%
    const endX = width * (0.46 + Math.random() * 0.04);
    const endY = height * (0.47 + Math.random() * 0.03);

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = (angleRad * 180) / Math.PI; // (~142° to 148°)
    const distance = Math.hypot(deltaX, deltaY);

    const duration = 0.92; // Natural 0.92s meteor sweep

    // 2-3 delicate realistic stardust micro-particles
    const particles = [
      { id: `${now}-p0`, symbol: '·', delay: 0.2, offsetX: -6, offsetY: -3, size: 4 },
      { id: `${now}-p1`, symbol: '✦', delay: 0.4, offsetX: 4, offsetY: 2, size: 4 },
      { id: `${now}-p2`, symbol: '·', delay: 0.6, offsetX: -3, offsetY: 1, size: 3 }
    ];

    const newStar = {
      id: `${now}-${Math.random()}`,
      startX,
      startY,
      deltaX,
      deltaY,
      angle: angleDeg,
      distance,
      duration,
      particles
    };

    setStars([newStar]);
    playShootingStarSound();

    setTimeout(() => {
      setStars(prev => prev.filter(s => s.id !== newStar.id));
    }, duration * 1000 + 350);
  }, [isRetro]);

  // Initial hover: triggers once only
  const handleMouseEnter = () => {
    if (!hasInitialHoverPlayedRef.current) {
      hasInitialHoverPlayedRef.current = true;
      triggerShootingStar();
    }
  };

  // Subsequent triggers: on click only
  const handleClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 450) return;
    lastClickTimeRef.current = now;

    // Ensure hover flag is marked so hover doesn't re-trigger
    hasInitialHoverPlayedRef.current = true;
    triggerShootingStar();
  };

  if (!isRetro) return null;

  return (
    <div
      ref={containerRef}
      className="interactive-sky-zone retro-sky-zone"
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      aria-label="Retro Sky - Hover once or click to shoot stars"
      title="✨ Click the sky to see a shooting star"
    >
      {stars.map(star => (
        <div
          key={star.id}
          className="retro-shooting-star"
          style={{
            left: `${star.startX}px`,
            top: `${star.startY}px`,
            '--star-angle': `${star.angle}deg`,
            '--star-duration': `${star.duration}s`,
            '--star-delta-x': `${star.deltaX}px`,
            '--star-delta-y': `${star.deltaY}px`
          }}
        >
          {/* Subtle natural glowing tail */}
          <div className="retro-star-tail">
            {/* White/Soft-Yellow Core Head */}
            <div className="retro-star-head" />
          </div>

          {/* Micro Stardust Particles */}
          {star.particles.map(p => (
            <span
              key={p.id}
              className="retro-star-particle"
              style={{
                '--p-delay': `${p.delay}s`,
                '--p-offset-x': `${p.offsetX}px`,
                '--p-offset-y': `${p.offsetY}px`,
                '--p-size': `${p.size}px`
              }}
            >
              {p.symbol}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
