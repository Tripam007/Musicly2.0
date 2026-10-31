import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Volume2, Sparkles, Compass } from 'lucide-react';
import { playClickSound, playShootingStarSound } from '../utils/audioSynth';
import '../styles/aboutCreation.css';

export default function AboutCreationView({
  onBack,
  onSwitchView,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isAudioHovered, setIsAudioHovered] = useState(false);

  // Handle click on the illustrated "EXPLORE MUSICLY ▶" button
  const handleExploreClick = useCallback(() => {
    if (onTogglePlay) onTogglePlay();
    playShootingStarSound();
  }, [onTogglePlay]);

  // ---------------- High-Performance Animated Living Canvas ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Base coordinate space: 1024 x 768 matching the exact artwork
    const BASE_W = 1024;
    const BASE_H = 768;

    // Retina DPR scaling for razor-sharp vector lines
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BASE_W * dpr;
    canvas.height = BASE_H * dpr;
    ctx.scale(dpr, dpr);

    // 1. Drifting Clouds State
    const clouds = [
      { x: 340, y: 155, scale: 0.95, speed: 0.18, opacity: 0.42 },
      { x: 520, y: 200, scale: 1.15, speed: 0.26, opacity: 0.48 },
      { x: 740, y: 140, scale: 0.80, speed: 0.15, opacity: 0.36 },
      { x: 930, y: 215, scale: 0.90, speed: 0.22, opacity: 0.40 },
      { x: 140, y: 175, scale: 0.70, speed: 0.14, opacity: 0.32 }
    ];

    // 2. Flying Birds State
    const birds = [
      { x: 885, y: 105, speed: 0.85, flapSpeed: 7.5, wingSpan: 14, scale: 1.0, yOffset: 0 },
      { x: 835, y: 118, speed: 0.75, flapSpeed: 8.2, wingSpan: 12, scale: 0.85, yOffset: 1.2 },
      { x: 865, y: 142, speed: 0.92, flapSpeed: 7.8, wingSpan: 10, scale: 0.75, yOffset: 2.4 },
      { x: 790, y: 88, speed: 0.68, flapSpeed: 7.0, wingSpan: 9, scale: 0.65, yOffset: 3.6 }
    ];

    // 3. Bow Wake Foam Particles (Rushing backward to simulate forward sailing speed)
    const foamParticles = [];
    for (let i = 0; i < 45; i++) {
      foamParticles.push({
        x: 420 + Math.random() * 520,
        y: 650 + Math.random() * 35,
        speedX: 1.8 + Math.random() * 2.2,
        speedY: (Math.random() - 0.5) * 0.4,
        size: 1.5 + Math.random() * 3.5,
        alpha: Math.random() * 0.8,
        life: Math.random() * 80
      });
    }

    // 4. Drifting Musical Notes Surfing on Wave Crests
    const musicalNotes = [
      { sym: '♩', x: 80, speed: 0.95, size: 21, offset: 0 },
      { sym: '♪', x: 250, speed: 1.15, size: 25, offset: 1.2 },
      { sym: '♫', x: 440, speed: 1.05, size: 27, offset: 2.5 },
      { sym: '♬', x: 670, speed: 1.25, size: 23, offset: 3.8 },
      { sym: '𝄞', x: 890, speed: 0.85, size: 34, offset: 0.6 },
      { sym: '𝄢', x: 100, speed: 0.90, size: 28, offset: 1.9 },
      { sym: '♩', x: 360, speed: 1.10, size: 22, offset: 4.2 },
      { sym: '♫', x: 780, speed: 1.20, size: 26, offset: 2.1 }
    ];

    let startTime = performance.now();

    // ---------------- Main 60FPS Animation Loop ----------------
    const render = (now) => {
      const elapsed = (now - startTime) * 0.001; // seconds

      ctx.clearRect(0, 0, BASE_W, BASE_H);

      // ================= A. DRIFTING CLOUDS =================
      clouds.forEach((cloud) => {
        cloud.x -= cloud.speed;
        if (cloud.x < -140) cloud.x = BASE_W + 100;

        ctx.save();
        ctx.fillStyle = `rgba(248, 238, 222, ${cloud.opacity})`;
        ctx.beginPath();
        const cx = cloud.x;
        const cy = cloud.y + Math.sin(elapsed * 0.5 + cloud.x * 0.01) * 2;
        const s = cloud.scale;

        // Fluffy cloud lobes
        ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
        ctx.arc(cx + 25 * s, cy - 10 * s, 32 * s, 0, Math.PI * 2);
        ctx.arc(cx + 60 * s, cy - 8 * s, 28 * s, 0, Math.PI * 2);
        ctx.arc(cx + 85 * s, cy + 2 * s, 22 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ================= B. FLYING BIRDS =================
      birds.forEach((bird) => {
        bird.x -= bird.speed;
        if (bird.x < -30) {
          bird.x = BASE_W + 40;
          bird.y = 80 + Math.random() * 80;
        }

        const by = bird.y + Math.sin(elapsed * 1.8 + bird.yOffset) * 4;
        const wingFlap = Math.sin(elapsed * bird.flapSpeed + bird.yOffset) * bird.wingSpan;

        ctx.save();
        ctx.strokeStyle = '#2d2218';
        ctx.lineWidth = 1.8 * bird.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Left wing curve
        ctx.moveTo(bird.x - bird.wingSpan * bird.scale, by - wingFlap * bird.scale);
        ctx.quadraticCurveTo(
          bird.x - (bird.wingSpan * 0.4) * bird.scale, 
          by + (wingFlap * 0.3) * bird.scale, 
          bird.x, 
          by
        );
        // Right wing curve
        ctx.quadraticCurveTo(
          bird.x + (bird.wingSpan * 0.4) * bird.scale, 
          by + (wingFlap * 0.3) * bird.scale, 
          bird.x + bird.wingSpan * bird.scale, 
          by - wingFlap * bird.scale
        );
        ctx.stroke();
        ctx.restore();
      });

      // ================= C. SHIP FORWARD SAILING ILLUSION =================
      // 1. Warm Lantern Pulsing & Flickering Glow
      const glowPulse = 0.45 + Math.sin(elapsed * 4.2) * 0.12 + Math.cos(elapsed * 7.1) * 0.05;
      
      // Bow Lantern Glow (x=944, y=595)
      const bowGrad = ctx.createRadialGradient(944, 595, 2, 944, 595, 36);
      bowGrad.addColorStop(0, `rgba(255, 195, 60, ${glowPulse * 0.85})`);
      bowGrad.addColorStop(0.5, `rgba(245, 160, 30, ${glowPulse * 0.35})`);
      bowGrad.addColorStop(1, 'rgba(245, 160, 30, 0)');
      ctx.fillStyle = bowGrad;
      ctx.beginPath();
      ctx.arc(944, 595, 36, 0, Math.PI * 2);
      ctx.fill();

      // Stern Lantern Glow (x=412, y=662)
      const sternGrad = ctx.createRadialGradient(412, 662, 2, 412, 662, 32);
      sternGrad.addColorStop(0, `rgba(255, 190, 50, ${glowPulse * 0.8})`);
      sternGrad.addColorStop(0.5, `rgba(240, 150, 20, ${glowPulse * 0.3})`);
      sternGrad.addColorStop(1, 'rgba(240, 150, 20, 0)');
      ctx.fillStyle = sternGrad;
      ctx.beginPath();
      ctx.arc(412, 662, 32, 0, Math.PI * 2);
      ctx.fill();

      // Cabin Windows Ambient Warm Glow (x=465..580, y=650)
      const cabinGrad = ctx.createRadialGradient(520, 660, 10, 520, 660, 65);
      cabinGrad.addColorStop(0, `rgba(255, 210, 80, ${glowPulse * 0.35})`);
      cabinGrad.addColorStop(1, 'rgba(255, 180, 40, 0)');
      ctx.fillStyle = cabinGrad;
      ctx.beginPath();
      ctx.arc(520, 660, 65, 0, Math.PI * 2);
      ctx.fill();

      // 2. Masthead Pirate Pennant Wind Flutter (x=608, y=82)
      ctx.save();
      const flagFlutter = Math.sin(elapsed * 11) * 3.5;
      ctx.strokeStyle = 'rgba(40, 30, 22, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(608, 82);
      ctx.quadraticCurveTo(622, 80 + flagFlutter, 642, 82 - flagFlutter * 0.6);
      ctx.stroke();
      ctx.restore();

      // 3. Bow Wake & Foaming Water Rushing Backward (Simulating Forward Sailing)
      foamParticles.forEach((p) => {
        p.x -= p.speedX;
        p.y += p.speedY;
        p.life -= 1;

        if (p.x < 360 || p.life <= 0) {
          // Respawn at bow / prow
          p.x = 910 + Math.random() * 45;
          p.y = 650 + Math.random() * 25;
          p.speedX = 2.2 + Math.random() * 2.5;
          p.life = 70 + Math.random() * 50;
        }

        ctx.save();
        ctx.fillStyle = `rgba(255, 252, 245, ${Math.min(0.75, (p.life / 70) * 0.75)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ================= D. CONTINUOUS LIVING OCEAN WAVES =================
      const waveBaseY = (x) => 655 + Math.sin(x * 0.009 - elapsed * 2.8) * 9 + Math.cos(x * 0.0045 - elapsed * 1.5) * 6;
      const waveMidY = (x) => 682 + Math.sin(x * 0.011 - elapsed * 3.4 + 1.2) * 11 + Math.cos(x * 0.0055 - elapsed * 1.8) * 8;
      const waveFrontY = (x) => 715 + Math.sin(x * 0.013 - elapsed * 4.0 + 2.5) * 13 + Math.cos(x * 0.0065 - elapsed * 2.1) * 9;

      // 1. Water Swell Tint Fill
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(25, BASE_H - 25);
      for (let x = 25; x <= 995; x += 8) {
        ctx.lineTo(x, waveBaseY(x));
      }
      ctx.lineTo(995, BASE_H - 25);
      ctx.closePath();
      const waveGrad = ctx.createLinearGradient(0, 640, 0, BASE_H);
      waveGrad.addColorStop(0, 'rgba(235, 222, 204, 0.45)');
      waveGrad.addColorStop(1, 'rgba(215, 198, 175, 0.85)');
      ctx.fillStyle = waveGrad;
      ctx.fill();
      ctx.restore();

      // 2. Flowing Middle Wave Musical Staff Lines (Rolling forward)
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        const lineOffset = s * 4.2;
        for (let x = 30; x <= 990; x += 6) {
          const y = waveMidY(x) + lineOffset;
          if (x === 30) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(68, 54, 42, ${s === 0 ? 0.75 : 0.5})`;
        ctx.lineWidth = s === 0 ? 1.5 : 0.9;
        ctx.stroke();
      }

      // 3. Flowing Foreground Wave Musical Staff Lines
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        const lineOffset = s * 4.8;
        for (let x = 30; x <= 990; x += 6) {
          const y = waveFrontY(x) + lineOffset;
          if (x === 30) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(45, 35, 26, ${s === 0 ? 0.85 : 0.6})`;
        ctx.lineWidth = s === 0 ? 1.8 : 1.1;
        ctx.stroke();
      }

      // 4. White Crest Foam along Wave Peaks
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 252, 245, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 35; x <= 985; x += 12) {
        const y = waveMidY(x) - 3;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8, y + 1);
      }
      ctx.stroke();
      ctx.restore();

      // 5. Floating Musical Notes Surfing the Ocean Waves
      ctx.font = '24px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = 'rgba(38, 30, 22, 0.92)';

      musicalNotes.forEach((note) => {
        note.x -= note.speed;
        if (note.x < 20) note.x = 990;

        const currentX = note.x;
        const currentY = waveFrontY(currentX) - 14 + Math.sin(elapsed * 3.2 + note.offset) * 4;

        // Wave slope tangent
        const slope = (waveFrontY(currentX + 6) - waveFrontY(currentX - 6)) / 12;
        const angle = Math.atan(slope) * 0.55;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(angle);
        ctx.font = `${note.size}px "Times New Roman", serif`;
        ctx.fillText(note.sym, 0, 0);
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="musicly-voyage-master">
      {/* ================= 1. FIXED TOP EDITORIAL HEADER ================= */}
      <header className="voyage-fixed-header">
        <div className="voyage-header-left">
          <button 
            type="button" 
            className="voyage-back-pill-btn" 
            onClick={onBack}
            title="Return to Musicly Player"
            aria-label="Back to Musicly"
          >
            <ArrowLeft size={14} />
            <span>Back to Musicly</span>
          </button>
          <span className="voyage-header-divider" aria-hidden="true">/</span>
          <span className="voyage-header-brand">A VOYAGE THROUGH SOUND</span>
        </div>

        {/* 1-CLICK TOGGLE BUTTON TO SWITCH TO "CLASSIC ABOUT" */}
        <div className="voyage-header-right">
          <button
            type="button"
            className="voyage-switcher-pill-btn"
            onClick={onSwitchView}
            title="Switch to Classic About View"
            aria-label="Switch to Classic About"
          >
            <BookOpen size={14} className="voyage-switcher-icon" />
            <span>Classic About</span>
          </button>
        </div>
      </header>

      {/* ================= 2. PERFECT FULL-SCREEN VIEWPORT STAGE ================= */}
      {/* Fits 100% inside the screen with zero parts cut off on any device */}
      <main className="voyage-stage-viewport" aria-label="Musicly Voyage Through Sound Showcase">
        <div className="voyage-stage-canvas-frame">
          {/* Complete 1024x768 Original Artwork (Zero Cropping) */}
          <img
            src="/assets/about/voyage_art_original.jpg"
            alt="The Musicly - A Voyage Through Sound"
            className="voyage-base-art-img"
          />

          {/* Living High-Performance 60FPS Animation Canvas (Waves, Clouds, Birds, Sailing Wake) */}
          <canvas ref={canvasRef} className="voyage-interactive-canvas" />

          {/* Precise Interactive Hotspot over the drawn "EXPLORE MUSICLY ▶" button */}
          <div
            className={`voyage-button-hotspot ${isPlaying ? 'is-playing' : ''}`}
            onClick={handleExploreClick}
            onMouseEnter={() => setIsAudioHovered(true)}
            onMouseLeave={() => setIsAudioHovered(false)}
            role="button"
            tabIndex={0}
            title={isPlaying ? "Pause Musicly Audio" : "Play Musicly Soundtrack"}
            aria-label={isPlaying ? "Pause Musicly Audio" : "Play Musicly Soundtrack"}
          >
            <span className="voyage-hotspot-hint">
              {isPlaying ? (
                <>
                  <Pause size={12} fill="currentColor" />
                  <span>PLAYING SOUND</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" style={{ marginLeft: 2 }} />
                  <span>EXPLORE SOUND</span>
                </>
              )}
            </span>
          </div>
        </div>
      </main>

      {/* ================= 3. DISCREET AUDIOPHILE BOTTOM DOCK ================= */}
      <footer className="voyage-floating-audiophile-dock">
        <button
          type="button"
          className={`voyage-dock-audio-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => {
            if (onTogglePlay) onTogglePlay();
            playClickSound('light');
          }}
          title={isPlaying ? "Pause soundtrack" : "Play soundtrack"}
          aria-label={isPlaying ? "Pause soundtrack" : "Play soundtrack"}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
          <span className="voyage-dock-track-name">
            {currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : "Knockin' On Heaven's Door — Bob Dylan"}
          </span>
        </button>

        {/* Dynamic Soundwave Equalizer */}
        <div className="voyage-dock-soundwaves" aria-hidden="true">
          <span className={`dock-wave ${isPlaying ? 'animate-wave-1' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-2' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-3' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-4' : ''}`} />
        </div>
      </footer>
    </div>
  );
}