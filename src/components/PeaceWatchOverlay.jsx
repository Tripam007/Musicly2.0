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

  // Gesture dragging tracking
  const dragStartYRef = useRef(null);
  const isDraggingRef = useRef(false);

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
    if (deltaY < -26) {
      isDraggingRef.current = false;
      dragStartYRef.current = null;
      setCurrentSlide((prev) => (prev < 2 ? prev + 1 : 0));
      playTactileClickSound();
    }
    // Dragged Downwards: return screen (Breathing -> Track Info -> Clock)
    else if (deltaY > 26) {
      isDraggingRef.current = false;
      dragStartYRef.current = null;
      setCurrentSlide((prev) => (prev > 0 ? prev - 1 : 2));
      playTactileClickSound();
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragStartYRef.current = null;
  };

  // 5. Hardware Button Action Handlers
  const handleCrownClick = () => {
    playClickSound('normal');
    onTogglePlay?.();
  };

  const handleVolumeUp = () => {
    playClickSound('high');
    if (onVolumeChange) {
      onVolumeChange(Math.min(1, Math.round((volume + 0.08) * 100) / 100));
    }
  };

  const handleVolumeDown = () => {
    playClickSound('normal');
    if (onVolumeChange) {
      onVolumeChange(Math.max(0, Math.round((volume - 0.08) * 100) / 100));
    }
  };

  const handlePrev = () => {
    playClickSound('light');
    onPrevTrack?.();
  };

  const handleNext = () => {
    playClickSound('light');
    onNextTrack?.();
  };

  const handleTousenClick = () => {
    playClickSound('normal');
    setCurrentSlide((prev) => (prev + 1) % 3);
  };

  const handleConcaveButton = () => {
    playPeacefulLikeSound();
    onToggleFavorite?.();
  };

  const handleToggleTimeFormat = () => {
    playClickSound('light');
    setIs24Hour((prev) => !prev);
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
        <X size={22} strokeWidth={2.2} />
      </button>

      {/* Center Watch Device Wrapper */}
      <div className="peace-watch-device-wrapper">
        <img
          src="/assets/images/peace_watch_device.png"
          alt="Peace Minimal Cyber Watch"
          className="peace-watch-device-img"
        />

        {/* ------------------------------------------------------------------
            Circular Interactive Screen (Center)
           ------------------------------------------------------------------ */}
        <div
          className="peace-watch-screen"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag UP / DOWN or tap TOUSEN button to switch screen"
        >
          <div
            className="peace-screen-slides-container"
            style={{ transform: `translateY(-${currentSlide * 100}%)` }}
          >
            {/* SLIDE 0: Zen Clock Face (Faithful to Image 2) */}
            <div className="peace-screen-slide">
              <div className="peace-glyph-top">µ</div>

              <div className="peace-center-gauge-row">
                <div className={`peace-gauge-line ${isPlaying ? 'is-pulse' : ''}`} />
              </div>

              <div className="peace-time-bottom">
                <div className="peace-time-dots">
                  <span>·</span>
                  <span>{currentSecondsDot > 1 ? '●' : '·'}</span>
                </div>
                <div className="peace-time-numeric">{currentTimeStr}</div>
                <div className="peace-drag-hint-up">
                  <ChevronUp size={10} />
                  <span>DRAG UP</span>
                </div>
              </div>
            </div>

            {/* SLIDE 1: "Other Stuffs" (Track Info, Controls, Progress) */}
            <div className="peace-screen-slide peace-music-slide">
              <div className="peace-slide-header-tag">PEACE AUDIO</div>

              <div className="peace-track-info-box">
                <div className="peace-track-title">
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
                >
                  <SkipBack size={13} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="peace-screen-control-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCrownClick();
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" style={{ marginLeft: 1 }} />
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

              <div className="peace-drag-hint-down">
                <ChevronDown size={10} />
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            </div>

            {/* SLIDE 2: Zen Rhythm Breathing Guide */}
            <div className="peace-screen-slide peace-breathing-slide">
              <div className="peace-slide-header-tag">ZEN HARMONY</div>

              <div className="peace-breathing-circle-wrap">
                <div className="peace-breathing-circle" />
              </div>

              <div className="peace-breathing-label">{breathingPhase}</div>

              <div className="peace-drag-hint-down">
                <ChevronDown size={10} />
                <span>CLOCK</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Physical Hardware Button Hotspots (Overlayed over watch chassis)
           ------------------------------------------------------------------ */}

        {/* 1. Top-Left Rotary Dial (Volume Up) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-top-left-dial"
          onClick={handleVolumeUp}
          title={`Volume Up (${Math.round(volume * 100)}%)`}
          aria-label="Volume Up"
        />

        {/* 2. Bottom-Left Rotary Dial (Volume Down) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-bottom-left-dial"
          onClick={handleVolumeDown}
          title={`Volume Down (${Math.round(volume * 100)}%)`}
          aria-label="Volume Down"
        />

        {/* 3. Right Crown Knob with Red Stripe (Play / Pause) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-right-crown"
          onClick={handleCrownClick}
          title={isPlaying ? 'Pause Playback (Main Crown)' : 'Play Playback (Main Crown)'}
          aria-label="Play or Pause Playback"
        />

        {/* 4. Top-Left Red Push Button (Previous Song) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-top-red"
          onClick={handlePrev}
          title="Previous Track"
          aria-label="Previous Track"
        />

        {/* 5. Bottom-Left Red Push Button (Next Song) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-bottom-red"
          onClick={handleNext}
          title="Next Track"
          aria-label="Next Track"
        />

        {/* 6. TOUSEN Black Tactile Button (Switch Screen Mode) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-tousen"
          onClick={handleTousenClick}
          title="TOUSEN: Switch Screen (Clock / Track / Breathing)"
          aria-label="Switch Screen Mode"
        />

        {/* 7. Bottom-Right Concave Button (Zen Bell Chime & Like) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-bottom-right-circle"
          onClick={handleConcaveButton}
          title="Peaceful Bell Chime & Favorite"
          aria-label="Peaceful Bell Chime & Favorite"
        />

        {/* 8. Top-Right Mode Buttons (PSIT / EEFTI - 12h/24h Format) */}
        <button
          type="button"
          className="peace-hotspot peace-btn-top-right-modes"
          onClick={handleToggleTimeFormat}
          title="Toggle 12h / 24h Time Format"
          aria-label="Toggle Time Format"
        />
      </div>
    </div>
  );
}

