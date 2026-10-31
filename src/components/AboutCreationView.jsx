import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Volume2, Music, Sparkles } from 'lucide-react';
import { playClickSound, playShootingStarSound } from '../utils/audioSynth';
import '../styles/aboutCreation.css';

export default function AboutCreationView({
  onBack,
  onSwitchView,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const waveCanvasRef = useRef(null);
  const waveAnimRef = useRef(null);

  // ---------------- Continuously Flowing Musical Waves Canvas ----------------
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Drifting musical notes that ride along the wave crests
    const musicalNotes = [
      { sym: '♩', x: 80, speed: 0.65, size: 22, offset: 0 },
      { sym: '♪', x: 280, speed: 0.85, size: 26, offset: 1.2 },
      { sym: '♫', x: 520, speed: 0.75, size: 28, offset: 2.5 },
      { sym: '♬', x: 790, speed: 0.95, size: 24, offset: 3.8 },
      { sym: '𝄞', x: 1040, speed: 0.55, size: 36, offset: 0.6 },
      { sym: '𝄢', x: 1300, speed: 0.70, size: 30, offset: 1.9 },
      { sym: '♩', x: 1560, speed: 0.80, size: 23, offset: 4.2 },
      { sym: '♫', x: 1820, speed: 0.90, size: 27, offset: 2.1 },
    ];

    let startTime = performance.now();

    const renderWaves = (now) => {
      const elapsed = (now - startTime) * 0.001; // seconds

      ctx.clearRect(0, 0, width, height);

      // Procedural sine waves
      const wave1Y = (x) => height * 0.52 + Math.sin(x * 0.0045 + elapsed * 1.2) * 14 + Math.cos(x * 0.0028 + elapsed * 0.8) * 8;
      const wave2Y = (x) => height * 0.62 + Math.sin(x * 0.0065 + elapsed * 1.6 + 1.1) * 16 + Math.cos(x * 0.0035 + elapsed * 0.9) * 10;
      const wave3Y = (x) => height * 0.72 + Math.sin(x * 0.0085 + elapsed * 2.0 + 2.4) * 20 + Math.cos(x * 0.0045 + elapsed * 1.1) * 12;

      // 1. Back Wave Layer Fill
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        ctx.lineTo(x, wave1Y(x));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      const grad1 = ctx.createLinearGradient(0, height * 0.45, 0, height);
      grad1.addColorStop(0, 'rgba(238, 226, 209, 0.40)');
      grad1.addColorStop(1, 'rgba(222, 206, 185, 0.65)');
      ctx.fillStyle = grad1;
      ctx.fill();

      // 2. Middle Wave Layer with 5 Musical Staff Lines
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        ctx.lineTo(x, wave2Y(x));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      const grad2 = ctx.createLinearGradient(0, height * 0.55, 0, height);
      grad2.addColorStop(0, 'rgba(230, 215, 195, 0.55)');
      grad2.addColorStop(1, 'rgba(215, 196, 172, 0.85)');
      ctx.fillStyle = grad2;
      ctx.fill();

      // Draw 5 parallel musical staff lines on middle wave
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        const lineOffset = s * 4.5;
        for (let x = 0; x <= width; x += 8) {
          const y = wave2Y(x) + lineOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(74, 60, 47, ${s === 0 ? 0.65 : 0.45})`;
        ctx.lineWidth = s === 0 ? 1.4 : 0.9;
        ctx.stroke();
      }

      // 3. Foreground Wave Layer with 5 Flowing Staff Lines
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        ctx.lineTo(x, wave3Y(x));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      const grad3 = ctx.createLinearGradient(0, height * 0.65, 0, height);
      grad3.addColorStop(0, 'rgba(224, 208, 187, 0.70)');
      grad3.addColorStop(1, 'rgba(206, 186, 160, 0.95)');
      ctx.fillStyle = grad3;
      ctx.fill();

      for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        const lineOffset = s * 5.0;
        for (let x = 0; x <= width; x += 8) {
          const y = wave3Y(x) + lineOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(50, 40, 31, ${s === 0 ? 0.85 : 0.55})`;
        ctx.lineWidth = s === 0 ? 1.6 : 1.1;
        ctx.stroke();
      }

      // 4. Floating Notes Riding the Ocean Waves
      ctx.font = '24px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = 'rgba(40, 32, 24, 0.88)';

      musicalNotes.forEach((note) => {
        note.x = (note.x + note.speed) % (width + 60);

        const currentX = note.x - 30;
        const currentY = wave3Y(currentX) - 12 + Math.sin(elapsed * 2.8 + note.offset) * 4.5;

        // Wave slope tangent for natural tilt
        const slope = (wave3Y(currentX + 6) - wave3Y(currentX - 6)) / 12;
        const angle = Math.atan(slope) * 0.55;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(angle);
        ctx.font = `${note.size}px "Times New Roman", serif`;
        ctx.fillText(note.sym, 0, 0);
        ctx.restore();
      });

      waveAnimRef.current = requestAnimationFrame(renderWaves);
    };

    waveAnimRef.current = requestAnimationFrame(renderWaves);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);
    };
  }, []);

  return (
    <div className="musicly-voyage-master">
      {/* ================= FIXED TOP EDITORIAL HEADER ================= */}
      <header className="voyage-fixed-header">
        <div className="voyage-header-left">
          <button 
            type="button" 
            className="voyage-back-pill-btn" 
            onClick={onBack}
            title="Return to Musicly Player"
            aria-label="Back to Musicly"
          >
            <ArrowLeft size={15} />
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

      {/* ================= WHOLE SCREEN HERO (Edge-to-Edge, Not in a Box) ================= */}
      <main className="voyage-hero-fullscreen-section" aria-label="Musicly Voyage Through Sound">
        <div className="voyage-hero-artwork-canvas">
          <img
            src="/assets/about/voyage_hero_1080p.jpg"
            alt="The Musicly - A Voyage Through Sound"
            className="voyage-hero-main-img"
          />

          {/* Interactive Clickable Hotspot on "EXPLORE MUSICLY" button */}
          <div className="voyage-hero-cta-hotspot">
            <button
              type="button"
              className="voyage-hero-cta-btn"
              onClick={() => {
                if (onTogglePlay) onTogglePlay();
                playShootingStarSound();
              }}
              title={isPlaying ? "Pause Musicly Audio" : "Play Musicly Soundtrack"}
              aria-label={isPlaying ? "Pause Musicly Audio" : "Play Musicly Soundtrack"}
            >
              <span>{isPlaying ? "PAUSE AUDIO" : "EXPLORE MUSICLY"}</span>
              {isPlaying ? (
                <Pause size={11} fill="currentColor" style={{ marginLeft: 6 }} />
              ) : (
                <Play size={11} fill="currentColor" style={{ marginLeft: 6 }} />
              )}
            </button>
          </div>

          {/* Continuously Flowing Waves with Musical Staff Lines & Notes */}
          <canvas ref={waveCanvasRef} className="voyage-flowing-waves-canvas" />

          {/* Floating Audiophile Dock on the Flowing Ocean Waves */}
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
      </main>
    </div>
  );
}