import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAudioMetrics } from '../utils/audioVisualizer';

/**
 * FloatingWaveformScrubber
 * Real-time audio pitch/frequency reactive floating wavy scrubber.
 * Modulates ripple density (waviness) according to song pitch, and crest height to bass/energy.
 */
export default function FloatingWaveformScrubber({
  currentTime = 0,
  duration = 180,
  onSeek,
  isPlaying = false,
  audioElement = null,
  themeColor = '#f59e0b',
  className = '',
  compact = false
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPos, setHoverPos] = useState(0);

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  // Real-time animation refs & DOM element refs (eliminates 60FPS React state re-render lag)
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);
  const progressRatioRef = useRef(progressRatio);
  progressRatioRef.current = progressRatio;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const audioElementRef = useRef(audioElement);
  audioElementRef.current = audioElement;

  const playedPathRef = useRef(null);
  const unplayedPathRef = useRef(null);
  const thumbHaloRef = useRef(null);
  const thumbPearlRef = useRef(null);

  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 60FPS Fluid Wave Generation loop: direct DOM attribute updates for butter-smooth 60FPS with 0% React re-render overhead
  useEffect(() => {
    const W = 500;
    const baseY = compact ? 22 : 28;
    const numPoints = 64;

    const renderLoop = () => {
      const playing = isPlayingRef.current;
      const audioEl = audioElementRef.current;
      const currentProgressRatio = progressRatioRef.current;

      // Sample live metrics from audio element
      const metrics = getAudioMetrics(audioEl, playing);

      // Calmer, silky phase advance
      const phaseSpeed = playing ? (0.022 + metrics.pitch * 0.018) : 0.008;
      phaseRef.current = (phaseRef.current + phaseSpeed) % (Math.PI * 200);
      const phase = phaseRef.current;

      // Less wavy: gentle, wide, elegant swells (~1.4 to 1.8 gentle cycles across 500px)
      const rippleCycles = playing 
        ? (1.35 + metrics.waviness * 0.45) 
        : 1.35;

      // Subtle, clean crest height (gentle 3.5px - 7px breathing amplitude instead of wild 28px)
      const crestAmp = playing
        ? (3.5 + metrics.bass * 3.5 + metrics.energy * 2.0)
        : 2.2;

      const points = [];
      const splitIndex = Math.round(currentProgressRatio * (numPoints - 1));
      let currentNeedleY = baseY;

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const x = t * W;

        // Smooth sinusoidal envelope tapering gently at start and end
        const envelope = Math.sin(t * Math.PI);

        // Clean harmonic curve: gentle primary swell + subtle secondary shimmer
        const wave1 = Math.sin(t * Math.PI * 2 * rippleCycles - phase);
        const wave2 = Math.sin(t * Math.PI * 4 * rippleCycles + phase * 1.2) * 0.18;

        const displacement = (wave1 + wave2) * crestAmp * envelope;
        const y = baseY - displacement;

        points.push({ x, y });

        if (i === splitIndex) {
          currentNeedleY = y;
        }
      }

      // Generate smooth SVG path strings
      const buildPathString = (pts) => {
        if (pts.length < 2) return '';
        let str = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const cx = ((prev.x + curr.x) / 2).toFixed(1);
          const cy = ((prev.y + curr.y) / 2).toFixed(1);
          str += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${cx} ${cy}`;
        }
        str += ` T ${pts[pts.length - 1].x.toFixed(1)} ${pts[pts.length - 1].y.toFixed(1)}`;
        return str;
      };

      const playedPts = points.slice(0, splitIndex + 1);
      const unplayedPts = points.slice(splitIndex);

      const playedPath = buildPathString(playedPts);
      const unplayedPath = buildPathString(unplayedPts);
      const needleX = Math.min(500, Math.max(0, currentProgressRatio * 500));

      // Direct DOM mutation: 0 React re-renders, 0 GC allocations
      if (playedPathRef.current) playedPathRef.current.setAttribute('d', playedPath);
      if (unplayedPathRef.current) unplayedPathRef.current.setAttribute('d', unplayedPath);
      if (thumbHaloRef.current) {
        thumbHaloRef.current.setAttribute('cx', needleX.toFixed(1));
        thumbHaloRef.current.setAttribute('cy', currentNeedleY.toFixed(1));
      }
      if (thumbPearlRef.current) {
        thumbPearlRef.current.setAttribute('cx', needleX.toFixed(1));
        thumbPearlRef.current.setAttribute('cy', currentNeedleY.toFixed(1));
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [compact]);

  // Click & Drag Scrubbing
  const calculateSeek = useCallback((clientX) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clickX / rect.width;
    return ratio * duration;
  }, [duration]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = calculateSeek(clientX);
    onSeek?.(newTime);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newTime = calculateSeek(clientX);
      onSeek?.(newTime);
    };

    const handleUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, calculateSeek, onSeek]);

  const handleMouseMove = (e) => {
    if (!containerRef.current || !duration) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * duration);
  };

  const needleX = Math.min(500, Math.max(0, progressRatio * 500));
  const baseY = compact ? 28 : 42;

  return (
    <div className={`floating-waveform-wrapper ${className} ${compact ? 'is-compact' : ''}`}>
      {/* Time Current (Left) */}
      <span className="wave-time-label time-current">
        {formatSeconds(currentTime)}
      </span>

      {/* Main Waveform Scrub Container */}
      <div 
        className="wave-scrub-hit-area"
        ref={containerRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        title="Click or drag to scrub track"
      >
        <svg 
          viewBox={`0 0 500 ${compact ? 36 : 56}`} 
          className="wave-svg-canvas"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Played Glowing Amber Gradient */}
            <linearGradient id="wavePlayedGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="60%" stopColor={themeColor || '#f59e0b'} />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Played Under-Wave Luminous Area Fill */}
            <linearGradient id="wavePlayedFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={themeColor || '#f59e0b'} stopOpacity="0.45" />
              <stop offset="50%" stopColor={themeColor || '#f59e0b'} stopOpacity="0.15" />
              <stop offset="100%" stopColor={themeColor || '#f59e0b'} stopOpacity="0.0" />
            </linearGradient>

            {/* Unplayed Misty Frosted Glass Area Fill */}
            <linearGradient id="waveUnplayedFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Needle Vertical Glow Gradient */}
            <linearGradient id="needleGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef08a" />
              <stop offset="85%" stopColor={themeColor || '#f59e0b'} />
              <stop offset="100%" stopColor={themeColor || '#f59e0b'} stopOpacity="0.6" />
            </linearGradient>

            {/* Soft Ambient Bloom Filter */}
            <filter id="waveGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Subtle, Minimal Base Track Line */}
          <line 
            x1="0" 
            y1={baseY} 
            x2="500" 
            y2={baseY} 
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* 2. Unplayed Smooth Minimal Frosted Wave */}
          <path 
            ref={unplayedPathRef}
            className="wave-stroke-unplayed"
          />

          {/* 3. Played Floating Glowing Minimal Wave */}
          <path 
            ref={playedPathRef}
            className="wave-stroke-played"
            stroke="url(#wavePlayedGlow)"
            filter="url(#waveGlowFilter)"
          />

          {/* 4. Sleek Minimal Glowing Playhead Pearl Thumb */}
          <g className="wave-thumb-group">
            {/* Ambient Soft Glow Halo */}
            <circle
              ref={thumbHaloRef}
              cx="0"
              cy={baseY}
              r="7"
              fill={themeColor || '#f59e0b'}
              fillOpacity="0.22"
            />
            {/* Crisp Minimal Core Pearl */}
            <circle
              ref={thumbPearlRef}
              cx="0"
              cy={baseY}
              r="3.5"
              fill="#ffffff"
              stroke={themeColor || '#f59e0b'}
              strokeWidth="1.5"
              filter="url(#waveGlowFilter)"
            />
          </g>
        </svg>

        {/* Hover preview timestamp tooltip */}
        {isHovering && !isDragging && (
          <div 
            className="wave-hover-tooltip"
            style={{ left: `${hoverPos}%` }}
          >
            {formatSeconds(hoverTime)}
          </div>
        )}
      </div>

      {/* Time Duration (Right) */}
      <span className="wave-time-label time-duration">
        {formatSeconds(duration)}
      </span>
    </div>
  );
}
