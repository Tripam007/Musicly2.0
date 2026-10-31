import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, ArrowLeft, BookOpen, Compass, RotateCcw, Volume2, Sparkles, Navigation } from 'lucide-react';
import { playClickSound, playShootingStarSound } from '../utils/audioSynth';
import '../styles/aboutCreation.css';

export default function AboutCreationView({
  onBack,
  onSwitchView,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Scroll Scrubbing & Kinetic Voyage State
  const [scrollPercent, setScrollPercent] = useState(0); // 0 to 100
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const animRef = useRef(null);

  // Resume natural video playback after user stops scrolling
  const scheduleAutoResume = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().catch(() => {});
        setIsVideoPlaying(true);
      }
    }, 700);
  }, []);

  // Handle Mouse Wheel Scroll
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    isUserScrollingRef.current = true;

    // Smoothly accumulate wheel delta
    const delta = e.deltaY * 0.09;
    targetScrollRef.current = Math.max(0, Math.min(100, targetScrollRef.current + delta));

    scheduleAutoResume();
  }, [scheduleAutoResume]);

  // Handle Touch Swipe on Mobile/Tablets
  const touchStartYRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0] && touchStartYRef.current !== null) {
      isUserScrollingRef.current = true;
      const delta = (touchStartYRef.current - e.touches[0].clientY) * 0.18;
      targetScrollRef.current = Math.max(0, Math.min(100, targetScrollRef.current + delta));
      touchStartYRef.current = e.touches[0].clientY;
      scheduleAutoResume();
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      isUserScrollingRef.current = true;
      targetScrollRef.current = Math.min(100, targetScrollRef.current + 12);
      scheduleAutoResume();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      isUserScrollingRef.current = true;
      targetScrollRef.current = Math.max(0, targetScrollRef.current - 12);
      scheduleAutoResume();
    }
  };

  // Direct Timeline Scrubbing from the bottom slider
  const handleSliderScrub = (e) => {
    const val = parseFloat(e.target.value);
    targetScrollRef.current = val;
    isUserScrollingRef.current = true;
    scheduleAutoResume();
  };

  // Toggle Video Play / Pause manually
  const handleToggleVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsVideoPlaying(true);
      isUserScrollingRef.current = false;
    } else {
      video.pause();
      setIsVideoPlaying(false);
      isUserScrollingRef.current = true;
    }
    playClickSound('light');
  };

  // Reset Voyage Timeline
  const handleResetVoyage = () => {
    targetScrollRef.current = 0;
    currentScrollRef.current = 0;
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsVideoPlaying(true);
    }
    isUserScrollingRef.current = false;
    playClickSound('light');
  };

  // 60FPS Video Scrubbing and Smooth Movement Loop
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }

    const render = () => {
      // Smooth lerp current scroll toward target scroll
      currentScrollRef.current += (targetScrollRef.current - currentScrollRef.current) * 0.085;
      const currentScroll = currentScrollRef.current;

      setScrollPercent(Math.round(currentScroll));

      // When user is actively scrolling, bind video frame to scroll position
      if (isUserScrollingRef.current && video && video.duration) {
        if (!video.paused) {
          video.pause();
          setIsVideoPlaying(false);
        }
        const targetTime = (currentScroll / 100) * (video.duration - 0.05);
        if (Math.abs(video.currentTime - targetTime) > 0.03) {
          video.currentTime = targetTime;
        }
      } else if (!isUserScrollingRef.current && video && video.duration && !video.paused) {
        // Sync scroll percent to video playing progress
        const livePercent = (video.currentTime / video.duration) * 100;
        targetScrollRef.current = livePercent;
        currentScrollRef.current = livePercent;
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheel, scheduleAutoResume]);

  return (
    <div className="pirate-ship-experience" ref={containerRef} tabIndex={0}>
      {/* ================= 1. REFINED EDITORIAL TOP NAVIGATION ================= */}
      <header className="pirate-nav-header">
        <div className="pirate-nav-left">
          <button 
            type="button" 
            className="pirate-nav-back-btn" 
            onClick={onBack}
            title="Return to Musicly Player"
            aria-label="Back to Musicly"
          >
            <ArrowLeft size={15} />
            <span>Back to Musicly</span>
          </button>
          <span className="pirate-nav-divider" aria-hidden="true">/</span>
          <span className="pirate-nav-brand">MUSICLY • LEGEND OF THE SEAS</span>
        </div>

        {/* 1-CLICK TOGGLE BUTTON TO SWITCH TO "CLASSIC ABOUT" */}
        <div className="pirate-nav-right">
          <button
            type="button"
            className="pirate-switcher-btn"
            onClick={onSwitchView}
            title="Switch to Classic About View"
            aria-label="Switch to Classic About"
          >
            <BookOpen size={14} className="pirate-switcher-icon" />
            <span>Classic About</span>
          </button>
        </div>
      </header>

      {/* ================= 2. THE 3D PIRATE SHIP MOVING SCENE ================= */}
      {/* 100% IN FOCUS, CRISP, NOT BLURRY, NO DARK VIGNETTE, PURE SHIP MOTION */}
      <main className="pirate-video-stage" aria-label="3D Pirate Ship Video Showcase">
        <div className="pirate-video-frame">
          <video
            ref={videoRef}
            className="pirate-ship-video"
            src="/assets/about/pirate_bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />

          {/* Interactive Hotspot over "EXPLORE NOW" button on the video artwork */}
          <div className="pirate-explore-overlay-hotspot">
            <button
              type="button"
              className="pirate-explore-cta-button"
              onClick={() => {
                if (onTogglePlay) onTogglePlay();
                playShootingStarSound();
              }}
              title={isPlaying ? "Pause Musicly Audio" : "Play Musicly Soundtrack"}
              aria-label={isPlaying ? "Pause Musicly Audio" : "Explore Musicly Soundtrack"}
            >
              {isPlaying ? (
                <>
                  <Pause size={13} fill="currentColor" />
                  <span>PAUSE AUDIO</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" style={{ marginLeft: 2 }} />
                  <span>EXPLORE SOUND</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ================= 3. FLOATING DISCREET AUDIOPHILE DOCK ================= */}
      <footer className="pirate-bottom-dock">
        {/* Play / Pause Video Motion */}
        <button
          type="button"
          className="pirate-dock-icon-btn"
          onClick={handleToggleVideoPlay}
          title={isVideoPlaying ? "Pause Ship Movement" : "Resume Ship Sailing"}
          aria-label={isVideoPlaying ? "Pause Ship Movement" : "Resume Ship Sailing"}
        >
          {isVideoPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
        </button>

        {/* Reset Video to Start */}
        <button
          type="button"
          className="pirate-dock-icon-btn"
          onClick={handleResetVoyage}
          title="Restart Ship Voyage from Start"
          aria-label="Restart Voyage"
        >
          <RotateCcw size={14} />
        </button>

        {/* Audio Player Toggle */}
        <button
          type="button"
          className={`pirate-dock-audio-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => {
            if (onTogglePlay) onTogglePlay();
            playClickSound('light');
          }}
          title={isPlaying ? "Pause Musicly Track" : "Play Musicly Soundtrack"}
          aria-label={isPlaying ? "Pause Musicly Track" : "Play Musicly Soundtrack"}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
          <span className="pirate-dock-track-title">
            {currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : "Knockin' On Heaven's Door — Bob Dylan"}
          </span>
        </button>

        {/* Interactive Scrub Timeline */}
        <div className="pirate-timeline-group">
          <Navigation size={13} className="pirate-compass-icon" />
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={scrollPercent}
            onChange={handleSliderScrub}
            className="pirate-timeline-slider"
            title="Drag timeline or use mouse wheel / swipe to scrub voyage"
            aria-label="Ship voyage scrubber timeline"
          />
          <span className="pirate-timeline-percent">{scrollPercent}%</span>
        </div>

        {/* Dynamic soundwaves */}
        <div className="pirate-dock-waves" aria-hidden="true">
          <span className={`dock-wave ${isPlaying ? 'animate-wave-1' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-2' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-3' : ''}`} />
          <span className={`dock-wave ${isPlaying ? 'animate-wave-4' : ''}`} />
        </div>
      </footer>
    </div>
  );
}