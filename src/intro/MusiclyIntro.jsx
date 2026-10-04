import React, { useState, useEffect, useRef, useCallback } from 'react';
import IntroScene from './IntroScene';
import MusiclyLogo from './MusiclyLogo';
import Reflection from './Reflection';
import IntroTransition from './IntroTransition';
import './intro.css';

/**
 * MusiclyIntro.jsx
 * Final Polish Cinematic Opening for Musicly:
 * - 100% Autonomous, zero scroll required (~8.4 second timeline)
 * - Dark modern studio environment with 3 subtle charcoal & blue-gray forms
 * - Hero MUSICLY editorial typography placed vertically at ~51%
 * - Realistic dark floor reflection (15-25% opacity, vertical gradient fade, NO water/ripples)
 * - Dynamic directional cast shadow moving opposite to the virtual mouse light with physical damping
 * - Slow physical camera approach without giant logo scaling or blur
 * - Gentle camera pass-through dissolving naturally into the Musicly player
 * - 60 FPS requestAnimationFrame with zero React re-renders per frame
 * - Minimal SKIP INTRO (top-right, Escape, Enter, Space, or click)
 */
export default function MusiclyIntro({
  onEnterApp,
  activeBackdrop = '/assets/images/cozy_bedroom.jpg'
}) {
  const [isComplete, setIsComplete] = useState(false);

  // References for zero-jitter DOM manipulation at 60 FPS
  const timelineRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  const logoWrapperRef = useRef(null);
  const reflectionWrapperRef = useRef(null);
  const transitionRef = useRef(null);
  const rootRef = useRef(null);

  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const isFinishedRef = useRef(false);
  const isAcceleratingRef = useRef(false);
  const accelerationStartRef = useRef(null);
  const progressAtAccelerationRef = useRef(0);

  // Complete and enter the application
  const completeIntro = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setIsComplete(true);

    try {
      localStorage.setItem('musicly_intro_v2_seen', 'true');
    } catch (e) {}

    setTimeout(() => {
      if (onEnterApp) {
        onEnterApp();
      }
    }, 450);
  }, [onEnterApp]);

  // Fast-forward / skip trigger
  const triggerSkip = useCallback(() => {
    if (isFinishedRef.current) return;
    if (!isAcceleratingRef.current) {
      isAcceleratingRef.current = true;
      accelerationStartRef.current = performance.now();
      progressAtAccelerationRef.current = timelineRef.current;
    }
  }, []);

  // Master 60 FPS Autonomous Animation & Physics Loop
  useEffect(() => {
    let isRunning = true;
    const TOTAL_DURATION = 8.4; // 8.4 seconds natural cinematic progression

    const tick = (now) => {
      if (!isRunning) return;

      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }

      const elapsedReal = (now - startTimeRef.current) / 1000;

      // 1. Mouse Virtual Light Damping with physical inertia
      const isMobile = window.innerWidth < 768;
      const targetM = targetMouseRef.current;
      const smoothM = smoothMouseRef.current;

      if (isMobile) {
        // Subtle autonomous breathing motion on mobile
        smoothM.x = Math.sin(elapsedReal * 0.6) * 0.22;
        smoothM.y = Math.cos(elapsedReal * 0.8) * 0.18;
      } else {
        // currentX += (targetX - currentX) * 0.04
        smoothM.x += (targetM.x - smoothM.x) * 0.04;
        smoothM.y += (targetM.y - smoothM.y) * 0.04;
      }
      mouseRef.current = smoothM;

      // 2. Timeline progression (0.0 to 1.0)
      let prog;
      if (isAcceleratingRef.current) {
        // Smooth fast-forward to 1.0 over ~320ms
        const accelElapsed = (now - accelerationStartRef.current) / 1000;
        const initial = progressAtAccelerationRef.current;
        prog = Math.min(1.0, initial + (1.0 - initial) * (accelElapsed / 0.32));
      } else {
        prog = Math.min(1.0, elapsedReal / TOTAL_DURATION);
      }
      timelineRef.current = prog;

      // 3. Update MUSICLY Wordmark Transform & Opacity
      const logoEl = logoWrapperRef.current;
      if (logoEl) {
        let logoOpacity = 0;
        let logoTranslateY = 0;
        let logoScale = 1.0;

        if (prog < 0.18) {
          // 0.0 - 1.5s: Emergence from darkness: Words quietly appear
          const t = prog / 0.18;
          const ease = 1 - Math.pow(1 - t, 2.2);
          logoOpacity = ease;
          logoTranslateY = 8 * (1 - ease);
          logoScale = 1.0;
        } else if (prog < 0.36) {
          // 1.5 - 3.0s: Hero state: 100% stable, commanding presence
          logoOpacity = 1;
          logoTranslateY = 0;
          logoScale = 1.0;
        } else if (prog < 0.60) {
          // 3.0 - 5.0s: Slow camera approach: natural physical depth
          const t = (prog - 0.36) / 0.24;
          logoOpacity = 1;
          logoTranslateY = -t * 4;
          logoScale = 1.0 + t * 0.08;
        } else if (prog < 0.83) {
          // 5.0 - 7.0s: Camera draws closer: Logo remains razor sharp!
          const t = (prog - 0.60) / 0.23;
          logoOpacity = 1;
          logoTranslateY = -4 - t * 8;
          logoScale = 1.08 + t * 0.10;
        } else {
          // 7.0 - 8.4s: Gentle pass-through: Wordmark glides gracefully past camera
          const t = (prog - 0.83) / 0.17;
          logoOpacity = Math.max(0, 1.0 - t * 1.5);
          logoTranslateY = -12 - Math.pow(t, 1.4) * 55;
          logoScale = 1.18 + t * 0.22; // Kept physically consistent, NO giant 4x zoom!
        }

        // Mouse micro-parallax (wordmark remains virtually stable)
        const logoMouseX = smoothM.x * 3.5;
        const logoMouseY = smoothM.y * 2.5;

        logoEl.style.transform = `translate3d(${logoMouseX.toFixed(2)}px, ${(logoTranslateY + logoMouseY).toFixed(2)}px, 0) scale(${logoScale.toFixed(3)})`;
        logoEl.style.opacity = logoOpacity.toFixed(3);

        // Subtitle microcopy fade
        const subtitleEl = logoEl.querySelector('.intro-microcopy');
        if (subtitleEl) {
          const subOp = Math.max(0, logoOpacity * (1 - Math.max(0, (prog - 0.38) * 3.0)));
          subtitleEl.style.opacity = subOp.toFixed(3);
        }
      }

      // 4. Update Floor Reflection & Dynamic Directional Cast Shadow
      const refStageEl = reflectionWrapperRef.current;
      if (refStageEl) {
        let refOpacity = 0.20;
        let baseStretch = 1.0;
        let shadowBaseOpacity = 0.48;

        if (prog < 0.18) {
          // 0.0 - 1.5s: Soft emergence alongside logo
          const t = prog / 0.18;
          const ease = 1 - Math.pow(1 - t, 2.2);
          refOpacity = 0.20 * ease;
          shadowBaseOpacity = 0.48 * ease;
          baseStretch = 1.0;
        } else if (prog < 0.36) {
          // 1.5 - 3.0s: Understated floor reflection on dark matte surface (15-25% opacity)
          refOpacity = 0.20;
          shadowBaseOpacity = 0.48;
          baseStretch = 1.0;
        } else if (prog < 0.60) {
          // 3.0 - 5.0s: Slow camera approach: reflection expands slightly in perspective
          const t = (prog - 0.36) / 0.24;
          refOpacity = 0.20 + t * 0.04;
          shadowBaseOpacity = 0.48 + t * 0.05;
          baseStretch = 1.0 + t * 0.14;
        } else if (prog < 0.83) {
          // 5.0 - 7.0s: Reflection slightly more pronounced as camera nears floor
          const t = (prog - 0.60) / 0.23;
          refOpacity = 0.24 + t * 0.03;
          shadowBaseOpacity = 0.53 - t * 0.08;
          baseStretch = 1.14 + t * 0.16;
        } else {
          // 7.0 - 8.4s: Camera passes through dark reflective layer
          const t = (prog - 0.83) / 0.17;
          refOpacity = Math.max(0, 0.27 * (1 - t * 1.8));
          shadowBaseOpacity = Math.max(0, 0.45 * (1 - t * 2.2));
          baseStretch = 1.30 + t * 0.25;
        }

        // MOUSE SHADOW & REFLECTION RESPONSE:
        // Move mouse RIGHT (light on right) -> shadow moves LEFT
        // Move mouse LEFT (light on left) -> shadow moves RIGHT
        // Move mouse UP (light high overhead) -> shadow becomes SHORTER
        // Move mouse DOWN (light low) -> shadow becomes LONGER
        const shadowShiftX = -smoothM.x * 26;
        const shadowSkewX = -smoothM.x * 12;
        // In screen coords, mouse up is smoothM.y < 0, mouse down is smoothM.y > 0
        const shadowScaleY = Math.max(0.55, 1.0 + smoothM.y * 0.35);

        // Reflection follows base with slight perspective angle
        const refShiftX = -smoothM.x * 10;
        const refSkewX = -smoothM.x * 3.5;
        const refScaleY = baseStretch * (1.0 + smoothM.y * 0.14);

        // Directional Cast Shadow DOM element
        const shadowEl = refStageEl.querySelector('.intro-directional-shadow');
        if (shadowEl) {
          shadowEl.style.transform = `translate3d(${shadowShiftX.toFixed(2)}px, 0, 0) skewX(${shadowSkewX.toFixed(2)}deg) scaleY(${shadowScaleY.toFixed(3)})`;
          shadowEl.style.opacity = shadowBaseOpacity.toFixed(3);
        }

        // Contact Shadow at baseline
        const contactEl = refStageEl.querySelector('.intro-contact-shadow');
        if (contactEl) {
          const cOp = Math.min(1.0, shadowBaseOpacity * 1.4);
          contactEl.style.opacity = cOp.toFixed(3);
        }

        // Specular floor sheen moving softly
        const sheenEl = refStageEl.querySelector('.intro-floor-specular-light');
        if (sheenEl) {
          sheenEl.style.transform = `translate3d(${(-shadowShiftX * 0.6).toFixed(2)}px, 0, 0)`;
          sheenEl.style.opacity = (refOpacity * 0.65).toFixed(3);
        }

        // Mirrored Typography Reflection DOM element
        const refBodyEl = refStageEl.querySelector('.intro-reflection-body');
        if (refBodyEl) {
          refBodyEl.style.transform = `scaleY(-1) translate3d(${refShiftX.toFixed(2)}px, 0, 0) skewX(${refSkewX.toFixed(2)}deg) scaleY(${refScaleY.toFixed(3)})`;
          refBodyEl.style.opacity = refOpacity.toFixed(3);
        }
      }

      // 5. Update Transition Layer (7.2s - 8.4s Seamless Pass-Through into Room)
      const transEl = transitionRef.current;
      if (transEl) {
        if (prog > 0.72) {
          transEl.style.opacity = '1';
          const roomEl = transEl.querySelector('.intro-room-preview');
          const bloomEl = transEl.querySelector('.intro-portal-light');

          if (bloomEl && prog >= 0.74 && prog <= 0.94) {
            const bt = (prog - 0.74) / 0.20;
            const bloom = Math.sin(bt * Math.PI) * 0.28;
            bloomEl.style.opacity = bloom.toFixed(3);
            bloomEl.style.transform = `scale(${(1 + prog * 0.18).toFixed(3)})`;
          }

          if (roomEl && prog > 0.78) {
            const rt = (prog - 0.78) / 0.22;
            const roomOpacity = Math.min(1, Math.pow(rt, 1.25));
            const roomBlur = Math.max(0, 16 * (1 - rt));
            const roomScale = 1.04 - roomOpacity * 0.04;
            roomEl.style.opacity = roomOpacity.toFixed(3);
            roomEl.style.filter = `blur(${roomBlur.toFixed(1)}px) brightness(${(0.80 + roomOpacity * 0.20).toFixed(2)})`;
            roomEl.style.transform = `scale(${roomScale.toFixed(3)})`;
          }
        } else {
          transEl.style.opacity = '0';
        }
      }

      // 6. Complete Intro automatically at end of timeline
      if (prog >= 0.99 && !isFinishedRef.current) {
        completeIntro();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [completeIntro]);

  // Normalized mouse coordinates listener (-1 to +1)
  useEffect(() => {
    if (isComplete) return;

    const handleMouseMove = (e) => {
      if (window.innerWidth < 768) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;
      targetMouseRef.current = {
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY))
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isComplete]);

  // Skip and Fast-Forward handlers (Keyboard, Scroll, Touch, Click)
  useEffect(() => {
    if (isComplete) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > 12) {
        triggerSkip();
      }
    };

    let touchStartY = null;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0]?.clientY || 0;
    };
    const handleTouchMove = (e) => {
      if (touchStartY === null) return;
      const currentY = e.touches[0]?.clientY || 0;
      if (Math.abs(touchStartY - currentY) > 28) {
        triggerSkip();
      }
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        triggerSkip();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isComplete, triggerSkip]);

  return (
    <div
      ref={rootRef}
      className={`musicly-intro-root ${isComplete ? 'is-complete' : ''}`}
      onClick={triggerSkip}
      role="dialog"
      aria-label="Welcome to Musicly"
    >
      {/* 1. Underlying 3D Studio Canvas (Deep near-black, charcoal monolith, glass slab, floor sheen) */}
      <IntroScene
        timelineRef={timelineRef}
        mouseRef={mouseRef}
      />

      {/* 2. Transition Layer (7.2s - 8.4s Seamless Depth Pass-Through into Room) */}
      <IntroTransition
        ref={transitionRef}
        activeBackdrop={activeBackdrop}
      />

      {/* 3. Hero Center Stage: Editorial MUSICLY Typography & Realistic Reflection/Shadow */}
      <main className="intro-center-stage">
        <MusiclyLogo ref={logoWrapperRef} />
        <Reflection ref={reflectionWrapperRef} />
      </main>

      {/* 4. Minimal Skip Button (Top Right) */}
      <div className="intro-skip-wrapper">
        <button
          className="intro-skip-button"
          onClick={(e) => {
            e.stopPropagation();
            triggerSkip();
          }}
          title="Skip intro to Musicly (Space / Enter / Esc)"
          aria-label="Skip intro"
        >
          SKIP INTRO
        </button>
      </div>
    </div>
  );
}
