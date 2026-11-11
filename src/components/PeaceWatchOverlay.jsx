import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Heart, Volume2, Sparkles, ChevronUp, ChevronDown, Disc3, RotateCcw, Orbit } from 'lucide-react';
import { playClickSound, playPeacefulLikeSound, playTactileClickSound, playTingSound } from '../utils/audioSynth';
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
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Cyber Time & EQ, 1 = Audio Track Info & Scrub, 2 = Zen Breathing
  const [timeStr, setTimeStr] = useState('11:23');
  const [secondsStr, setSecondsStr] = useState(':05');
  const [dayStr, setDayStr] = useState('WED 11th');
  const [monthYearStr, setMonthYearStr] = useState('NOV 2026');
  const [breathingPhase, setBreathingPhase] = useState('INHALE');
  const [hudMessage, setHudMessage] = useState(null);
  const [activeControl, setActiveControl] = useState(null);
  const [jogRotation, setJogRotation] = useState(0);
  const [volRotation, setVolRotation] = useState(volume * 270 - 135);

  // 360-Degree Continuous Rotation Physics & Motion Blur
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [motionBlur, setMotionBlur] = useState(0);
  const [isAutoSpin, setIsAutoSpin] = useState(false);

  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);
  const hudTimerRef = useRef(null);

  // Sync volume knob rotation
  useEffect(() => {
    setVolRotation(volume * 270 - 135);
  }, [volume]);

  // Trigger transient on-screen HUD
  const showHud = useCallback((title, detail = '') => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudMessage({ title, detail });
    hudTimerRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 1400);
  }, []);

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

  // 2. Peaceful Breathing Cycle
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

  // 4. Auto-Spin Showcase Loop
  useEffect(() => {
    if (!isAutoSpin || isDragging) return;
    let frameId;
    const spinLoop = () => {
      setRotY((prev) => (prev + 0.75) % 360);
      frameId = requestAnimationFrame(spinLoop);
    };
    frameId = requestAnimationFrame(spinLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isAutoSpin, isDragging]);

  // 5. 360° Drag Rotation with Inertia & Motion Blur
  const handlePointerDown = (e) => {
    // If clicking a control button or screen, don't initiate canvas rotation
    if (e.target.closest('.peace-interactive-el')) return;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsDragging(true);
    setIsAutoSpin(false);

    lastPointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now()
    };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastPointerRef.current.time);
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;

    // Apply rotation (continuous 360° on Y, clamped on X for natural view)
    setRotY((prev) => prev + dx * 0.75);
    setRotX((prev) => Math.max(-65, Math.min(65, prev - dy * 0.65)));

    // Measure instant rotational speed for motion blur
    const speed = Math.hypot(dx, dy) / dt; // pixels per ms
    if (speed > 0.4) {
      const blurPx = Math.min(16, (speed - 0.4) * 8.5);
      setMotionBlur(blurPx);
    } else {
      setMotionBlur(0);
    }

    velocityRef.current = {
      x: (dx / dt) * 14,
      y: (-dy / dt) * 14
    };

    lastPointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now
    };
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Friction momentum loop
    const runInertia = () => {
      velocityRef.current.x *= 0.93;
      velocityRef.current.y *= 0.93;

      const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
      if (currentSpeed > 0.12) {
        setRotY((prev) => prev + velocityRef.current.x * 0.75);
        setRotX((prev) => Math.max(-65, Math.min(65, prev + velocityRef.current.y * 0.65)));
        setMotionBlur(Math.min(16, currentSpeed * 1.4));
        animFrameRef.current = requestAnimationFrame(runInertia);
      } else {
        setMotionBlur(0);
      }
    };

    animFrameRef.current = requestAnimationFrame(runInertia);
  };

  // Reset to front face
  const handleResetFront = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsAutoSpin(false);
    setMotionBlur(0);
    setRotX(0);
    setRotY((prev) => {
      // Find closest full multiple of 360 so it smoothly snaps to 0
      const remainder = prev % 360;
      return prev - remainder;
    });
    playTactileClickSound();
    showHud('RESET: FRONT VIEW');
  };

  // Toggle Auto-Spin
  const handleToggleAutoSpin = () => {
    setIsAutoSpin((prev) => {
      const next = !prev;
      playClickSound('light');
      showHud(next ? '360° ORBIT: ACTIVE' : '360° ORBIT: PAUSED');
      return next;
    });
  };

  // 6. Hardware Action Handlers
  const handleCrownClick = () => {
    triggerControl('right-crown');
    playClickSound('normal');
    onTogglePlay?.();
    showHud(isPlaying ? '⏸ PAUSED' : '▶ PLAYING', currentTrack?.title || 'Peace Audio');
  };

  const handleVolUp = (e) => {
    e.stopPropagation();
    triggerControl('top-left-knob');
    playClickSound('high');
    const newVol = Math.min(1, Math.round((volume + 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    setVolRotation(newVol * 270 - 135);
    showHud(`VOL ▲ ${Math.round(newVol * 100)}%`, newVol >= 1 ? 'MAX OUTPUT' : '');
  };

  const handleVolDown = (e) => {
    e.stopPropagation();
    triggerControl('top-right-knob');
    playClickSound('normal');
    const newVol = Math.max(0, Math.round((volume - 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    setVolRotation(newVol * 270 - 135);
    showHud(`VOL ▼ ${Math.round(newVol * 100)}%`, newVol === 0 ? 'MUTED' : '');
  };

  const handleJogClick = (e) => {
    e.stopPropagation();
    triggerControl('large-jog');
    playTactileClickSound();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    if (clickY < rect.height / 2) {
      setJogRotation((prev) => prev + 35);
      onNextTrack?.();
      showHud('NEXT TRACK ▶', 'Jog Dial Forward');
    } else {
      setJogRotation((prev) => prev - 35);
      onPrevTrack?.();
      showHud('◀ PREV TRACK', 'Jog Dial Rewind');
    }
  };

  const handleOrangeButtonClick = () => {
    triggerControl('orange-btn');
    playPeacefulLikeSound();
    onToggleFavorite?.();
    showHud(isFavorite ? '🤍 UNFAVORITED' : '♥ ZEN FAVORITE', 'Peace Bell Chime');
  };

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
      className={`peace-cyber-backdrop ${isDragging ? 'is-user-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      {/* Sleek Frosted Glass Exit Button */}
      <button
        type="button"
        className="peace-cyber-exit-btn peace-interactive-el"
        onClick={onClose}
        title="Exit Cyber Watch (or press Esc)"
        aria-label="Exit Peace Mode"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {/* Floating 360° Quick Navigation & Physics Dock (Bottom Center) */}
      <div className="peace-360-dock-bar peace-interactive-el">
        <button
          type="button"
          className="peace-dock-btn"
          onClick={handleResetFront}
          title="Reset to Front View"
        >
          <RotateCcw size={13} />
          <span>FRONT</span>
        </button>

        <div className="peace-dock-separator" />

        <button
          type="button"
          className={`peace-dock-btn ${isAutoSpin ? 'is-active' : ''}`}
          onClick={handleToggleAutoSpin}
          title="Toggle 360° Automatic Showcase Orbit"
        >
          <Orbit size={13} className={isAutoSpin ? 'animate-spin' : ''} />
          <span>{isAutoSpin ? 'ORBITING' : '360° SPIN'}</span>
        </button>

        <div className="peace-dock-separator" />

        <div className="peace-dock-hint">DRAG TO ROTATE 360°</div>
      </div>

      {/* Volumetric Studio Aura Glow behind the 3D watch */}
      <div className={`peace-cyber-ambient-glow ${isPlaying ? 'is-playing' : ''}`} />

      {/* 3D Perspective Card Viewport */}
      <div className="peace-cyber-watch-viewport">
        
        {/* ==================================================================
            VOLUMETRIC 3D TIMEPIECE WITH CONTINUOUS 360° ROTATION & MOTION BLUR
           ================================================================== */}
        <div
          className="peace-cyber-watch-assembly"
          style={{
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            '--motion-blur': `${motionBlur}px`
          }}
        >
          {/* Dynamic Motion Blur Speed Streak Layer */}
          {motionBlur > 1.5 && (
            <div
              className="peace-motion-blur-trail"
              style={{ opacity: Math.min(0.85, motionBlur / 10) }}
            />
          )}

          {/* Left Segmented Wristband with Neon-Orange Accent Block */}
          <div className="peace-watch-strap-left">
            <div className="peace-strap-rib rib-1" />
            <div className="peace-strap-rib rib-2" />
            <div className="peace-strap-rib rib-3" />
            <div className="peace-strap-rib rib-4" />
            <div className="peace-strap-orange-accent" />
            <div className="peace-strap-rib rib-5" />
            <div className="peace-strap-rib rib-6" />
          </div>

          {/* Bottom Segmented Titanium Link Bracelet */}
          <div className="peace-watch-strap-bottom">
            <div className="peace-bracelet-link link-1" />
            <div className="peace-bracelet-link link-2" />
            <div className="peace-bracelet-link link-3" />
            <div className="peace-bracelet-link link-4" />
          </div>

          {/* Extruded 3D Side Walls (Chassis Thickness) */}
          <div className="peace-case-side-wall wall-right">
            {/* Right Ribbed Titanium Crown Dial (Main Play / Pause) */}
            <button
              type="button"
              className={`peace-hardware-right-crown peace-interactive-el ${activeControl === 'right-crown' ? 'is-active' : ''} ${isPlaying ? 'is-spinning' : ''}`}
              onClick={handleCrownClick}
              title={isPlaying ? 'Right Crown: Pause Playback' : 'Right Crown: Play Playback'}
              aria-label="Play or Pause"
            >
              <div className="peace-crown-ridges" />
            </button>
          </div>

          <div className="peace-case-side-wall wall-left">
            {/* Left Black Knurled Crown (Mode Switcher) */}
            <button
              type="button"
              className={`peace-hardware-left-crown peace-interactive-el ${activeControl === 'left-crown' ? 'is-active' : ''}`}
              onClick={handleModeSwitch}
              title="Left Crown: Switch Watch Mode"
              aria-label="Switch Mode"
            />

            {/* Left Tactile Neon-Orange Push Button (Zen Bell & Favorite) */}
            <button
              type="button"
              className={`peace-hardware-orange-btn peace-interactive-el ${activeControl === 'orange-btn' ? 'is-active' : ''} ${isFavorite ? 'is-favorited' : ''}`}
              onClick={handleOrangeButtonClick}
              title="Orange Push Button: Peaceful Bell Chime & Favorite"
              aria-label="Zen Bell Chime"
            />
          </div>

          <div className="peace-case-side-wall wall-top" />
          <div className="peace-case-side-wall wall-bottom" />

          {/* ==============================================================
              FACE 1: FRONT WATCH FACE (Brushed Titanium Cushion Case)
             ============================================================== */}
          <div className="peace-watch-face-front">
            <div className="peace-case-outer-rim" />
            <div className="peace-case-inner-rim" />
            <div className="peace-case-glass-glare" />

            {/* Corner Precision Screws */}
            <span className="peace-case-screw screw-tl" />
            <span className="peace-case-screw screw-tr" />
            <span className="peace-case-screw screw-bl" />
            <span className="peace-case-screw screw-br" />

            {/* DIAL INSET */}
            <div className="peace-watch-dial-face">
              
              {/* 1. TOP SECTION: Glowing Neon-Orange Recessed Chamber */}
              <div className={`peace-top-orange-chamber ${isPlaying ? 'is-pulsing' : ''}`}>
                <div className="peace-orange-chamber-glow-core" />
                <div className="peace-orange-chamber-bezel" />

                {/* Top-Left Rotary Dial (Volume Control) */}
                <div
                  className={`peace-rotary-dial dial-left peace-interactive-el ${activeControl === 'top-left-knob' ? 'is-active' : ''}`}
                  onClick={handleVolUp}
                  title={`Volume Up Dial (${Math.round(volume * 100)}%)`}
                >
                  <div className="peace-dial-cap">
                    <div
                      className="peace-dial-marker marker-orange"
                      style={{ transform: `rotate(${volRotation}deg) translate(0, -14px)` }}
                    />
                  </div>
                </div>

                {/* Top-Right Rotary Dial (Volume Down) */}
                <div
                  className={`peace-rotary-dial dial-right peace-interactive-el ${activeControl === 'top-right-knob' ? 'is-active' : ''}`}
                  onClick={handleVolDown}
                  title={`Volume Down Dial (${Math.round(volume * 100)}%)`}
                >
                  <div className="peace-dial-cap">
                    <div
                      className="peace-dial-marker marker-white"
                      style={{ transform: `rotate(${-volRotation}deg) translate(0, -14px)` }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. MIDDLE SECTION: Jog Dial & Speaker */}
              <div className="peace-dial-middle-row">
                {/* Large Center-Left Rotary Jog Dial */}
                <div
                  className={`peace-large-jog-dial peace-interactive-el ${activeControl === 'large-jog' ? 'is-active' : ''}`}
                  onClick={handleJogClick}
                  title="Jog Dial: Click top for Next Track, bottom for Prev Track"
                >
                  <div className="peace-jog-outer-knurled-ring" />
                  <div className="peace-jog-inner-cap">
                    <div
                      className="peace-jog-pointer-dot"
                      style={{ transform: `rotate(${jogRotation}deg) translate(0, -22px)` }}
                    />
                  </div>
                </div>

                {/* Branding & Acoustic Speaker Matrix */}
                <div className="peace-dial-branding-column">
                  <div className="peace-brand-label-row">
                    <span className="peace-brand-title-d1">D1</span>
                    <span className="peace-brand-title-x">x</span>
                    <span className="peace-brand-title-trk">TRK</span>
                  </div>

                  {/* 8-Aperture Acoustic Speaker Grid */}
                  <div className={`peace-acoustic-aperture-grid ${isPlaying ? 'is-active' : ''}`}>
                    {[...Array(8)].map((_, i) => (
                      <span key={i} className="peace-aperture-dot" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. BOTTOM SECTION: Vents & Recessed Pill OLED Display */}
              <div className="peace-dial-bottom-row">
                {/* Left: Dual Angled Vents (//) */}
                <div className="peace-vents-group">
                  <div className="peace-vent-slits">
                    <span className={`peace-vent-bar vent-1 ${isPlaying ? 'is-active' : ''}`} />
                    <span className={`peace-vent-bar vent-2 ${isPlaying ? 'is-active' : ''}`} />
                  </div>
                  <div className="peace-made-in-italy">MADE IN ITALY</div>
                </div>

                {/* Right: The Authentic Pill-Shaped OLED Screen */}
                <div
                  className="peace-pill-oled-display peace-interactive-el"
                  onClick={handleModeSwitch}
                  title="Click screen to cycle: Clock & EQ / Track Info / Zen Rhythm"
                >
                  <div className="peace-pill-optical-ticks-ring" />
                  <div className="peace-pill-glass-reflection" />

                  {/* On-Screen Transient HUD Flash Notice */}
                  {hudMessage && (
                    <div className="peace-pill-hud-overlay" role="status" aria-live="polite">
                      <span className="peace-pill-hud-title">{hudMessage.title}</span>
                      {hudMessage.detail && (
                        <span className="peace-pill-hud-detail">{hudMessage.detail}</span>
                      )}
                    </div>
                  )}

                  {/* SCREEN SLIDE 0: Cyber Time & Frequency EQ */}
                  {currentSlide === 0 && (
                    <div className="peace-oled-slide peace-slide-clock">
                      <div className={`peace-oled-eq-bar-row ${isPlaying ? 'is-playing' : ''}`}>
                        {[...Array(16)].map((_, i) => (
                          <span
                            key={i}
                            className="peace-oled-eq-bar"
                            style={{
                              animationDuration: `${0.35 + (i % 6) * 0.12}s`,
                              animationDelay: `${(i % 5) * 0.06}s`
                            }}
                          />
                        ))}
                      </div>

                      <div className="peace-oled-day-tag">{dayStr}</div>

                      <div className="peace-oled-digits-row">
                        <span className="peace-oled-digits-time">{timeStr}</span>
                        <span className="peace-oled-digits-sec">{secondsStr}</span>
                      </div>

                      <div className="peace-oled-bottom-status">
                        <span>{monthYearStr}</span>
                        <span className="peace-oled-peace-tag">D1 • PEACE</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN SLIDE 1: Audio Playback Info */}
                  {currentSlide === 1 && (
                    <div className="peace-oled-slide peace-slide-track">
                      <div className="peace-oled-track-status">
                        <Disc3 size={9} className={isPlaying ? 'animate-spin' : ''} />
                        <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                      </div>

                      <div className="peace-oled-track-title" title={currentTrack?.title || 'Peace Audio'}>
                        {currentTrack?.title || 'Peace Audio'}
                      </div>
                      <div className="peace-oled-track-artist">
                        {currentTrack?.artist || 'Musicly Zen'}
                      </div>

                      <div className="peace-oled-progress-wrap">
                        <div
                          className="peace-oled-progress-bar"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="peace-oled-time-counters">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN SLIDE 2: Zen Rhythm Breathing Guide */}
                  {currentSlide === 2 && (
                    <div className="peace-oled-slide peace-slide-zen">
                      <div className="peace-oled-zen-badge">ZEN HARMONY</div>

                      <div className="peace-oled-breath-circle-wrap">
                        <div className={`peace-oled-breath-circle phase-${breathingPhase.toLowerCase()}`} />
                      </div>

                      <div className="peace-oled-breath-phase">{breathingPhase}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ==============================================================
              FACE 2: BACK 3D CASEBACK (Exhibition Sapphire Glass & Calibre 01)
             ============================================================== */}
          <div className="peace-watch-face-back">
            <div className="peace-caseback-outer-rim" />
            <div className="peace-caseback-screws-layer">
              <span className="peace-case-screw screw-tl" />
              <span className="peace-case-screw screw-tr" />
              <span className="peace-case-screw screw-bl" />
              <span className="peace-case-screw screw-br" />
            </div>

            {/* Circular Machined Titanium Caseback Frame */}
            <div className="peace-caseback-circular-housing">
              {/* Technical Engravings Ring */}
              <div className="peace-caseback-engraved-text-ring">
                <span>MUSICLY PEACE CHRONOGRAPH • AUTOMATIC CALIBRE 01</span>
                <span>TITANIUM CHASSIS • 50M WATER RESISTANT • 28800 VPH</span>
              </div>

              {/* Sapphire Glass Exhibition Window */}
              <div className="peace-caseback-sapphire-window">
                {/* Rotating Skeleton Balance Rotor */}
                <div className={`peace-skeleton-rotor ${isPlaying ? 'is-spinning' : ''}`}>
                  <div className="peace-rotor-weight" />
                  <div className="peace-rotor-cutout" />
                </div>

                {/* Optical Heart-Rate & Audio Biosensor Pulse Core */}
                <div className={`peace-caseback-biosensor-core ${isPlaying ? 'is-active' : ''}`} />

                {/* Center Laser Etch Badge */}
                <div className="peace-caseback-center-badge">
                  <span className="peace-badge-calibre">CALIBRE 01</span>
                  <span className="peace-badge-logo">D1 x TRK</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
