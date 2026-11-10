import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Heart, Volume2, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = Clock Face, 1 = Track Info ("Other Stuffs"), 2 = Zen Breathing
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentSecondsDot, setCurrentSecondsDot] = useState(2);
  const [is24Hour, setIs24Hour] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('INHALE'); // INHALE, HOLD, EXHALE
  const [hudMessage, setHudMessage] = useState(null); // On-screen tactile HUD feedback { title, detail }
  const [activeButtonKey, setActiveButtonKey] = useState(null); // For visible button click animation

  const hudTimerRef = useRef(null);
  const dragStartYRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Trigger on-screen HUD flash notification whenever any hardware or touch button is used
  const showHud = useCallback((title, detail = '') => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudMessage({ title, detail });
    hudTimerRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 1400);
  }, []);

  // Visual button depression trigger
  const flashButton = (key) => {
    setActiveButtonKey(key);
    setTimeout(() => setActiveButtonKey(null), 220);
  };

  // 1. Live Real-Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = now.getSeconds();

      if (!is24Hour) {
        hours = hours % 12 || 12;
      }
      const formattedHours = String(hours).padStart(2, '0');
      setCurrentTimeStr(`${formattedHours}:${minutes}`);
      setCurrentSecondsDot(Math.floor((seconds % 10) / 2)); // Cycles 0 to 4
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [is24Hour]);

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

  // 4. Touch & Pointer Drag Gestures on Circular Screen (Swipe up for other stuffs, swipe down for clock)
  const handlePointerDown = (e) => {
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;

    // Dragged Upwards: advance screen (Clock -> Track Info -> Breathing)
    if (deltaY < -24) {
      isDraggingRef.current = false;
      dragStartYRef.current = null;
      setCurrentSlide((prev) => {
        const next = prev < 2 ? prev + 1 : 0;
        const labels = ['CLOCK MODE', 'AUDIO PLAYBACK', 'ZEN BREATHING'];
        showHud(labels[next]);
        return next;
      });
      playTactileClickSound();
    }
    // Dragged Downwards: return screen (Breathing -> Track Info -> Clock)
    else if (deltaY > 24) {
      isDraggingRef.current = false;
      dragStartYRef.current = null;
      setCurrentSlide((prev) => {
        const next = prev > 0 ? prev - 1 : 2;
        const labels = ['CLOCK MODE', 'AUDIO PLAYBACK', 'ZEN BREATHING'];
        showHud(labels[next]);
        return next;
      });
      playTactileClickSound();
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragStartYRef.current = null;
  };

  // 5. Hardware Button Action Handlers with Visual HUD & Audio Response
  const handleCrownClick = () => {
    flashButton('crown');
    playClickSound('normal');
    onTogglePlay?.();
    showHud(isPlaying ? '⏸ PAUSED' : '▶ PLAYING', currentTrack?.title || 'Peace Audio');
  };

  const handleVolumeUp = () => {
    flashButton('vol-up');
    playClickSound('high');
    const newVol = Math.min(1, Math.round((volume + 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    showHud(`VOL ▲ ${Math.round(newVol * 100)}%`, `${newVol >= 1 ? 'MAX' : ''}`);
  };

  const handleVolumeDown = () => {
    flashButton('vol-down');
    playClickSound('normal');
    const newVol = Math.max(0, Math.round((volume - 0.08) * 100) / 100);
    onVolumeChange?.(newVol);
    showHud(`VOL ▼ ${Math.round(newVol * 100)}%`, `${newVol === 0 ? 'MUTED' : ''}`);
  };

  const handlePrev = () => {
    flashButton('prev');
    playClickSound('light');
    onPrevTrack?.();
    showHud('◀ PREV SONG', 'Skipping back');
  };

  const handleNext = () => {
    flashButton('next');
    playClickSound('light');
    onNextTrack?.();
    showHud('NEXT SONG ▶', 'Skipping forward');
  };

  const handleTousenClick = () => {
    flashButton('tousen');
    playClickSound('normal');
    setCurrentSlide((prev) => {
      const next = (prev + 1) % 3;
      const labels = ['CLOCK MODE', 'AUDIO PLAYBACK', 'ZEN BREATHING'];
      showHud(`TOUSEN: ${labels[next]}`);
      return next;
    });
  };

  const handleConcaveButton = () => {
    flashButton('concave');
    playPeacefulLikeSound();
    onToggleFavorite?.();
    showHud(isFavorite ? '🤍 UNFAVORITED' : '♥ ZEN FAVORITE', 'Peace Bell Chime');
  };

  const handleToggleTimeFormat = () => {
    flashButton('modes');
    playClickSound('light');
    setIs24Hour((prev) => {
      const next = !prev;
      showHud(next ? 'FORMAT: 24-HOUR' : 'FORMAT: 12-HOUR');
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
      className="peace-watch-backdrop"
      onDoubleClick={(e) => {
        // Double clicking blurred backdrop returns cleanly to normal deck
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      {/* Top-Right Exit Button */}
      <button
        type="button"
        className="peace-watch-exit-btn"
        onClick={onClose}
        title="Exit Peace Watch (or press Esc)"
        aria-label="Exit Peace Watch"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {/* Center Watch Device Wrapper */}
      <div className="peace-watch-device-wrapper">
        <img
          src="/assets/images/peace_watch_device.png"
          alt="Peace Minimal Cyber Watch"
          className="peace-watch-device-img"
        />

        {/* ------------------------------------------------------------------
            Circular Recessed E-Ink Screen (Center)
           ------------------------------------------------------------------ */}
        <div
          className="peace-watch-screen"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag UP / DOWN or tap TOUSEN button to switch screen"
        >
          {/* Subtle Top Rim Micro-Stamp matching original hardware */}
          <div className="peace-rim-stamp-top">S / P</div>

          {/* Transient E-Ink HUD Feedback Banner */}
          {hudMessage && (
            <div className="peace-screen-hud-toast" role="status" aria-live="polite">
              <div className="peace-screen-hud-title">{hudMessage.title}</div>
              {hudMessage.detail && (
                <div className="peace-screen-hud-detail">{hudMessage.detail}</div>
              )}
            </div>
          )}

          <div
            className="peace-screen-slides-container"
            style={{ transform: `translateY(-${currentSlide * 100}%)` }}
          >
            {/* SLIDE 0: Zen Clock Face (Faithful to Image 2) */}
            <div className="peace-screen-slide peace-clock-slide">
              {/* Authentic Stencil µ Glyph */}
              <div className="peace-glyph-top-box">
                <svg
                  className="peace-stencil-mu-svg"
                  viewBox="0 0 32 38"
                  width="26"
                  height="30"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 8 5 L 8 26 C 8 29.5 11 32 15 32 C 19 32 22 29.5 22 26 L 22 5"
                    stroke="#111113"
                    strokeWidth="3.6"
                    strokeLinecap="square"
                  />
                  <path
                    d="M 8 16 L 2 16"
                    stroke="#111113"
                    strokeWidth="3.6"
                    strokeLinecap="square"
                  />
                  <path
                    d="M 22 14 L 30 14 L 30 5"
                    stroke="#111113"
                    strokeWidth="3.6"
                    strokeLinecap="square"
                  />
                </svg>
              </div>

              {/* Bold Precision Technical Divider Bar */}
              <div className="peace-center-gauge-row">
                <div className={`peace-gauge-line ${isPlaying ? 'is-pulse' : ''}`} />
              </div>

              {/* Bottom Technical Indicators & Minimalist Time */}
              <div className="peace-time-bottom">
                <div className="peace-technical-meta-row">
                  <span className="peace-indicator-bracket">[:2</span>
                  <div className="peace-time-dots">
                    <span className="peace-dot-left">·</span>
                    <span className="peace-dot-right">{currentSecondsDot > 1 ? '●' : '·'}</span>
                  </div>
                  <span className="peace-indicator-angle">o/</span>
                </div>

                <div className="peace-time-numeric">{currentTimeStr}</div>

                <button
                  type="button"
                  className="peace-drag-hint-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide(1);
                    playTactileClickSound();
                    showHud('AUDIO PLAYBACK');
                  }}
                  title="View Peace Audio Controls"
                >
                  <ChevronUp size={10} strokeWidth={3} />
                  <span>AUDIO</span>
                </button>
              </div>
            </div>

            {/* SLIDE 1: "Other Stuffs" (Track Info, Controls, Progress) */}
            <div className="peace-screen-slide peace-music-slide">
              <div className="peace-slide-header-tag">PEACE AUDIO</div>

              <div className="peace-track-info-box">
                <div className="peace-track-title" title={currentTrack?.title || 'Peace Meditation'}>
                  {currentTrack?.title || 'Peace Meditation'}
                </div>
                <div className="peace-track-artist">
                  {currentTrack?.artist || 'Musicly Zen'}
                </div>
              </div>

              <div className="peace-music-playback-row">
                <button
                  type="button"
                  className="peace-screen-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  title="Previous Track"
                  aria-label="Previous Track"
                >
                  <SkipBack size={13} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="peace-screen-control-btn peace-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCrownClick();
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" style={{ marginLeft: 1.5 }} />
                  )}
                </button>
                <button
                  type="button"
                  className="peace-screen-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  title="Next Track"
                  aria-label="Next Track"
                >
                  <SkipForward size={13} fill="currentColor" />
                </button>
              </div>

              <div className="peace-track-progress-bar-wrap">
                <div
                  className="peace-track-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="peace-music-bottom-row">
                <span className="peace-time-display-micro">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <button
                  type="button"
                  className="peace-return-clock-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide(0);
                    playTactileClickSound();
                    showHud('CLOCK MODE');
                  }}
                  title="Return to Clock"
                >
                  <ChevronDown size={10} strokeWidth={3} />
                  <span>CLOCK</span>
                </button>
              </div>
            </div>

            {/* SLIDE 2: Zen Rhythm Breathing Guide */}
            <div className="peace-screen-slide peace-breathing-slide">
              <div className="peace-slide-header-tag">ZEN HARMONY</div>

              <div className="peace-breathing-circle-wrap">
                <div className={`peace-breathing-circle phase-${breathingPhase.toLowerCase()}`} />
                <div className="peace-breathing-center-dot" />
              </div>

              <div className="peace-breathing-label">{breathingPhase}</div>

              <button
                type="button"
                className="peace-return-clock-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(0);
                  playTactileClickSound();
                  showHud('CLOCK MODE');
                }}
                title="Return to Clock"
              >
                <ChevronDown size={10} strokeWidth={3} />
                <span>CLOCK</span>
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Physical Hardware Button Hotspots (Mapped seamlessly over watch chassis)
           ------------------------------------------------------------------ */}

        {/* 1. Top-Left Rotary Dial (Volume Up) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-top-left-dial ${activeButtonKey === 'vol-up' ? 'is-active' : ''}`}
          onClick={handleVolumeUp}
          title={`Top Dial: Volume Up (${Math.round(volume * 100)}%)`}
          aria-label="Volume Up"
        />

        {/* 2. Bottom-Left Rotary Dial (Volume Down) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-bottom-left-dial ${activeButtonKey === 'vol-down' ? 'is-active' : ''}`}
          onClick={handleVolumeDown}
          title={`Bottom Dial: Volume Down (${Math.round(volume * 100)}%)`}
          aria-label="Volume Down"
        />

        {/* 3. Right Crown Knob with Red Stripe (Play / Pause) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-right-crown ${activeButtonKey === 'crown' ? 'is-active' : ''}`}
          onClick={handleCrownClick}
          title={isPlaying ? 'Main Crown Knob: Pause (Click)' : 'Main Crown Knob: Play (Click)'}
          aria-label="Play or Pause Playback"
        />

        {/* 4. Top-Left Red Push Button (Previous Song) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-top-red ${activeButtonKey === 'prev' ? 'is-active' : ''}`}
          onClick={handlePrev}
          title="Red Button (Top): Previous Track"
          aria-label="Previous Track"
        />

        {/* 5. Bottom-Left Red Push Button (Next Song) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-bottom-red ${activeButtonKey === 'next' ? 'is-active' : ''}`}
          onClick={handleNext}
          title="Red Button (Bottom): Next Track"
          aria-label="Next Track"
        />

        {/* 6. TOUSEN Black Tactile Button (Switch Screen Mode) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-tousen ${activeButtonKey === 'tousen' ? 'is-active' : ''}`}
          onClick={handleTousenClick}
          title="TOUSEN Button: Switch Mode (Clock / Audio / Zen)"
          aria-label="Switch Screen Mode"
        />

        {/* 7. Bottom-Right Concave Button (Zen Bell Chime & Favorite) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-bottom-right-circle ${activeButtonKey === 'concave' ? 'is-active' : ''}`}
          onClick={handleConcaveButton}
          title="Concave Button: Zen Chime & Favorite"
          aria-label="Peaceful Bell Chime & Favorite"
        />

        {/* 8. Top-Right Mode Buttons (PSIT / EEFTI - 12h/24h Format) */}
        <button
          type="button"
          className={`peace-hotspot peace-btn-top-right-modes ${activeButtonKey === 'modes' ? 'is-active' : ''}`}
          onClick={handleToggleTimeFormat}
          title="PSIT / EEFTI: Toggle 12h / 24h Time Format"
          aria-label="Toggle Time Format"
        />
      </div>
    </div>
  );
}
