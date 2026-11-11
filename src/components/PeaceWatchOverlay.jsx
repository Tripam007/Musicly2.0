import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Heart, Volume2, Sparkles, ChevronUp, ChevronDown, Compass, Disc3 } from 'lucide-react';
import { playClickSound, playPeacefulLikeSound, playTactileClickSound } from '../utils/audioSynth';
import '../styles/peaceWatchOverlay.css';

export default function PeaceWatchOverlay({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  currentTime = 0,
  duration = 0,
  volume = 0.8,
  onVolumeChange,
  isFavorite = false,
  onToggleFavorite
}) {
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Cyber Time & Audio EQ, 1 = Track Info & Progress, 2 = Zen Breathing
  const [timeStr, setTimeStr] = useState('19:17');
  const [secondsStr, setSecondsStr] = useState(':00');
  const [dayStr, setDayStr] = useState('MON 10th');
  const [monthYearStr, setMonthYearStr] = useState('NOV 2026');
  const [breathingPhase, setBreathingPhase] = useState('INHALE');
  const [hudMessage, setHudMessage] = useState(null);
  const [activeControl, setActiveControl] = useState(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [jogRotation, setJogRotation] = useState(0);
  const [volRotation, setVolRotation] = useState(volume * 270 - 135);

  const hudTimerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync volume knob rotation with volume prop
  useEffect(() => {
    setVolRotation(volume * 270 - 135);
  }, [volume]);

  // Trigger transient on-screen HUD readout
  const showHud = useCallback((title, detail = '') => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudMessage({ title, detail });
    hudTimerRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 1500);
  }, []);

  // Flash active control state
  const triggerControl = (name) => {
    setActiveControl(name);
    setTimeout(() => setActiveControl(null), 250);
  };

  // 1. Live Real-Time Clock & Date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      
      const dayNum = now.getDate();
      let suffix = 'th';
      if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = 'st';
      else if (dayNum === 2 || dayNum === 22) suffix = 'nd';
      else if (dayNum === 3 || dayNum === 23) suffix = 'rd';

      setTimeStr(`${hours}:${minutes}`);
      setSecondsStr(`:${seconds}`);
      setDayStr(`${days[now.getDay()]} ${dayNum}${suffix}`);
      setMonthYearStr(`${months[now.getMonth()]} ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Peaceful Breathing Cycle (4s Inhale, 7s Hold, 8s Exhale)
  useEffect(() => {
    if (currentSlide !== 2) return;
    let timer = null;

    const runBreathingCycle = () => {
      setBreathingPhase('INHALE');
      timer = setTimeout(() => {
        setBreathingPhase('HOLD');
        timer = setTimeout(() => {
          setBreathingPhase('EXHALE');
          timer = setTimeout(() => {
            runBreathingCycle();
          }, 8000);
        }, 7000);
      }, 4000);
    };

    runBreathingCycle();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentSlide]);

  // 3. Escape key listener to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 4. Realistic 3D Gyroscope Mouse Parallax Tracking
  const handleMouseMove = (e) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
    const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

    // Limit tilt to 7.5 degrees for smooth elegance
    setTilt({
      x: Math.max(-8, Math.min(8, deltaX * 8)),
      y: Math.max(-8, Math.min(8, -deltaY * 8))
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // 5. Interactive Hardware Handlers
  // A. Main Crown Knob (Right Side) -> Play / Pause
  const handleCrownClick = () => {
    triggerControl('right-crown');
    playClickSound('normal');
    onTogglePlay?.();
    showHud(isPlaying ? '⏸ PAUSED' : '▶ PLAYING', currentTrack?.title || 'Peace Audio');
  };

  // B. Top-Left Rotary Knob (Inside Orange Chamber) -> Volume Up
  const handleVolUp = () => {
    triggerControl('top-left-knob');
    playClickSound('high');
    const newVol = Math.min(1, Math.round((volume + 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    setVolRotation(newVol * 270 - 135);
    showHud(`VOL ▲ ${Math.round(newVol * 100)}%`, newVol >= 1 ? 'MAX OUTPUT' : '');
  };

  // C. Top-Right Rotary Knob (Inside Orange Chamber) -> Volume Down
  const handleVolDown = () => {
    triggerControl('top-right-knob');
    playClickSound('normal');
    const newVol = Math.max(0, Math.round((volume - 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    setVolRotation(newVol * 270 - 135);
    showHud(`VOL ▼ ${Math.round(newVol * 100)}%`, newVol === 0 ? 'MUTED' : '');
  };

  // D. Large Center-Left Jog Dial -> Scrub / Skip Track
  const handleJogClick = (e) => {
    triggerControl('large-jog');
    playTactileClickSound();
    
    // Check if clicked top or bottom half of the jog dial
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    if (clickY < rect.height / 2) {
      // Top half: Next song
      setJogRotation((prev) => prev + 35);
      onNextTrack?.();
      showHud('NEXT TRACK ▶', 'Jog Scrub Forward');
    } else {
      // Bottom half: Prev song
      setJogRotation((prev) => prev - 35);
      onPrevTrack?.();
      showHud('◀ PREV TRACK', 'Jog Scrub Rewind');
    }
  };

  // E. Left Orange Push Button -> Zen Bell Chime & Favorite Toggle
  const handleOrangeButtonClick = () => {
    triggerControl('orange-btn');
    playPeacefulLikeSound();
    onToggleFavorite?.();
    showHud(isFavorite ? '🤍 UNFAVORITED' : '♥ ZEN FAVORITE', 'Peace Bell Chime');
  };

  // F. Left Black Crown -> Mode Switcher (Clock / Track / Zen)
  const handleModeSwitch = () => {
    triggerControl('left-crown');
    playClickSound('normal');
    setCurrentSlide((prev) => {
      const next = (prev + 1) % 3;
      const modes = ['CYBER TIME & EQ', 'TRACK AUDIO INFO', 'ZEN BREATHING'];
      showHud(modes[next]);
      return next;
    });
  };

  if (!isOpen) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="peace-cyber-backdrop"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      {/* Sleek Frosted Obsidian Exit Button */}
      <button
        type="button"
        className="peace-cyber-exit-btn"
        onClick={onClose}
        title="Exit Cyber Watch (or press Esc)"
        aria-label="Exit Peace Mode"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {/* Volumetric Studio Aura Glow behind the 3D watch */}
      <div className={`peace-cyber-ambient-glow ${isPlaying ? 'is-playing' : ''}`} />

      {/* 3D Perspective Card Viewport */}
      <div
        ref={wrapperRef}
        className="peace-cyber-watch-viewport"
        style={{
          transform: `perspective(1300px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`
        }}
      >
        {/* Main 3D Cyber Watch Transparent Image Asset */}
        <div className="peace-cyber-watch-housing">
          <img
            src="/assets/images/cyber_watch_3d.png"
            alt="3D Futuristic Cyber Timepiece"
            className="peace-cyber-watch-img"
          />

          {/* Dynamic Specular Glass Reflection Sheen */}
          <div
            className="peace-cyber-glass-specular"
            style={{
              transform: `translateX(${tilt.x * 2.5}px) translateY(${tilt.y * 2.5}px)`
            }}
          />

          {/* ----------------------------------------------------------------
              Top Neon-Orange Cavity Glow & Rotary Dials
             ---------------------------------------------------------------- */}
          <div className={`peace-orange-chamber-glow ${isPlaying ? 'is-pulsing' : ''}`} />

          {/* Interactive Rotary Dial Indicators inside Orange Chamber */}
          <div
            className="peace-knob-indicator peace-knob-ind-left"
            style={{ transform: `rotate(${volRotation}deg)` }}
          />
          <div
            className="peace-knob-indicator peace-knob-ind-right"
            style={{ transform: `rotate(${-volRotation}deg)` }}
          />

          {/* Interactive Indicator on Large Center-Left Jog Dial */}
          <div
            className="peace-jog-indicator"
            style={{ transform: `rotate(${jogRotation}deg)` }}
          />

          {/* Perforated Speaker Acoustic Wave Lights (8 dots) */}
          <div className={`peace-acoustic-speaker-grid ${isPlaying ? 'is-active' : ''}`}>
            {[...Array(8)].map((_, i) => (
              <span key={i} className="peace-speaker-dot" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>

          {/* Dual Diagonal Vents Glow (//) */}
          <div className={`peace-twin-vents-glow ${isPlaying ? 'is-active' : ''}`} />

          {/* ----------------------------------------------------------------
              Pill-Shaped OLED / LCD Digital Screen (Bottom-Right)
             ---------------------------------------------------------------- */}
          <div
            className="peace-pill-screen-container"
            onClick={handleModeSwitch}
            title="Click screen or Left Crown to switch modes"
          >
            {/* Transient Cyber HUD Flash Notice */}
            {hudMessage && (
              <div className="peace-pill-hud-notice" role="status" aria-live="polite">
                <span className="peace-pill-hud-title">{hudMessage.title}</span>
                {hudMessage.detail && (
                  <span className="peace-pill-hud-detail">{hudMessage.detail}</span>
                )}
              </div>
            )}

            {/* SCREEN SLIDE 0: Cyber Time & Frequency EQ Barcode */}
            {currentSlide === 0 && (
              <div className="peace-pill-slide peace-pill-time-slide">
                {/* Top Equalizer Frequency Bars */}
                <div className={`peace-pill-eq-bar-row ${isPlaying ? 'is-playing' : ''}`}>
                  {[...Array(14)].map((_, i) => (
                    <span
                      key={i}
                      className="peace-eq-bar-segment"
                      style={{
                        animationDuration: `${0.35 + (i % 5) * 0.15}s`,
                        animationDelay: `${(i % 4) * 0.08}s`
                      }}
                    />
                  ))}
                </div>

                {/* Day / Date Meta */}
                <div className="peace-pill-meta-day">{dayStr}</div>

                {/* Main Large LCD Digital Clock */}
                <div className="peace-pill-digits-clock">
                  <span className="peace-digits-main">{timeStr}</span>
                  <span className="peace-digits-sec">{secondsStr}</span>
                </div>

                {/* Bottom Tag / Year */}
                <div className="peace-pill-bottom-tag">
                  <span>{monthYearStr}</span>
                  <span className="peace-pill-mode-badge">D1 • PEACE</span>
                </div>
              </div>
            )}

            {/* SCREEN SLIDE 1: Audio Playback Info ("Other Stuffs") */}
            {currentSlide === 1 && (
              <div className="peace-pill-slide peace-pill-track-slide">
                <div className="peace-pill-track-badge">
                  <Disc3 size={8} className={isPlaying ? 'animate-spin' : ''} />
                  <span>PLAYING</span>
                </div>

                <div className="peace-pill-track-title" title={currentTrack?.title || 'Peace Audio'}>
                  {currentTrack?.title || 'Peace Audio'}
                </div>
                <div className="peace-pill-track-artist">
                  {currentTrack?.artist || 'Musicly Zen'}
                </div>

                {/* Progress Bar inside pill display */}
                <div className="peace-pill-progress-wrap">
                  <div
                    className="peace-pill-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="peace-pill-track-time-row">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* SCREEN SLIDE 2: Zen Rhythm Breathing Guide */}
            {currentSlide === 2 && (
              <div className="peace-pill-slide peace-pill-zen-slide">
                <div className="peace-pill-zen-tag">ZEN HARMONY</div>

                <div className="peace-pill-breath-ring-wrap">
                  <div className={`peace-pill-breath-ring phase-${breathingPhase.toLowerCase()}`} />
                </div>

                <div className="peace-pill-breath-phase">{breathingPhase}</div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Interactive Hardware Button Hotspots (Mapped seamlessly to 3D chassis)
             ---------------------------------------------------------------- */}

          {/* 1. Right Silver Crown (Main Play / Pause) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-right-crown ${activeControl === 'right-crown' ? 'is-active' : ''}`}
            onClick={handleCrownClick}
            title={isPlaying ? 'Right Crown: Pause Playback' : 'Right Crown: Start Playback'}
            aria-label="Play or Pause"
          />

          {/* 2. Top-Left Silver Rotary Knob (Volume Up) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-top-left-knob ${activeControl === 'top-left-knob' ? 'is-active' : ''}`}
            onClick={handleVolUp}
            title={`Top-Left Knob: Volume Up (${Math.round(volume * 100)}%)`}
            aria-label="Volume Up"
          />

          {/* 3. Top-Right Silver Rotary Knob (Volume Down) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-top-right-knob ${activeControl === 'top-right-knob' ? 'is-active' : ''}`}
            onClick={handleVolDown}
            title={`Top-Right Knob: Volume Down (${Math.round(volume * 100)}%)`}
            aria-label="Volume Down"
          />

          {/* 4. Large Center-Left Jog Dial (Scrub / Skip Track) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-large-jog ${activeControl === 'large-jog' ? 'is-active' : ''}`}
            onClick={handleJogClick}
            title="Center Jog Dial: Click Top for Next, Click Bottom for Prev Track"
            aria-label="Jog Track Navigation"
          />

          {/* 5. Left Orange Tactile Push Button (Zen Bell & Favorite) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-orange-btn ${activeControl === 'orange-btn' ? 'is-active' : ''}`}
            onClick={handleOrangeButtonClick}
            title="Orange Push Button: Peaceful Bell Chime & Favorite"
            aria-label="Peaceful Bell Chime"
          />

          {/* 6. Left Black Crown Knob (Mode Switcher) */}
          <button
            type="button"
            className={`peace-3d-hotspot peace-hs-left-crown ${activeControl === 'left-crown' ? 'is-active' : ''}`}
            onClick={handleModeSwitch}
            title="Left Crown: Switch Watch Mode (Clock / Track / Zen)"
            aria-label="Switch Mode"
          />
        </div>
      </div>
    </div>
  );
}
