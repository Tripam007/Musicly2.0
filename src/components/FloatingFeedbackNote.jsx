import React, { useState, useEffect, useRef, useCallback } from 'react';

// Chime chords with distinct harmonic frequencies for each musical emoticon
const CHIME_CHORDS = [
  // 0: ♪ - Warm E5 Major (E5, G#5, B5)
  [
    { freq: 659.25, gain: 0.18, dur: 0.65 },
    { freq: 830.61, gain: 0.14, dur: 0.55 },
    { freq: 987.77, gain: 0.11, dur: 0.45 }
  ],
  // 1: ♫ - F#5 Major
  [
    { freq: 739.99, gain: 0.18, dur: 0.65 },
    { freq: 932.33, gain: 0.14, dur: 0.55 },
    { freq: 1108.73, gain: 0.11, dur: 0.45 }
  ],
  // 2: ♬ - G#5 Major
  [
    { freq: 830.61, gain: 0.18, dur: 0.65 },
    { freq: 987.77, gain: 0.14, dur: 0.55 },
    { freq: 1244.51, gain: 0.11, dur: 0.45 }
  ],
  // 3: ♩ - A5 Celestial
  [
    { freq: 880.00, gain: 0.18, dur: 0.65 },
    { freq: 1108.73, gain: 0.14, dur: 0.55 },
    { freq: 1318.51, gain: 0.11, dur: 0.45 }
  ],
  // 4: 𝄞 - B5 Shimmer
  [
    { freq: 987.77, gain: 0.18, dur: 0.65 },
    { freq: 1244.51, gain: 0.14, dur: 0.55 },
    { freq: 1479.98, gain: 0.11, dur: 0.45 }
  ],
  // 5: Harmony - C#6 Dream
  [
    { freq: 1108.73, gain: 0.18, dur: 0.65 },
    { freq: 1318.51, gain: 0.14, dur: 0.55 },
    { freq: 1661.22, gain: 0.11, dur: 0.45 }
  ]
];

// Soft, warm acoustic chime chord when a floating music emoticon is clicked
function playCloudChimeSound(chordIndex = 0) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!window._floatingCloudAudioCtx) {
      window._floatingCloudAudioCtx = new AudioContext();
    }
    const ctx = window._floatingCloudAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const chord = CHIME_CHORDS[chordIndex % CHIME_CHORDS.length];

    chord.forEach(({ freq, gain: gVal, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gVal, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  } catch (_e) {}
}

// Vector Treble Clef glyph ensuring crisp rendering across all operating systems
const TrebleClefGlyph = ({ size = 42 }) => (
  <svg 
    width={Math.round(size * 0.72)} 
    height={size} 
    viewBox="0 0 36 64" 
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
    aria-hidden="true"
  >
    <path d="M21.2 5.5c-1.2-1.6-3.1-2.5-5.2-2.5-3.6 0-6.6 3-6.6 6.7 0 2.4 1.3 4.6 3.3 5.8l-4.8 16.4c-1.6-1-3.6-1.6-5.8-1.6-5.2 0-9.4 4.2-9.4 9.4s4.2 9.4 9.4 9.4c4.8 0 8.7-3.6 9.2-8.3l4.6-15.8c1.4 1.2 3.2 1.8 5.2 1.8 4.4 0 8-3.6 8-8 0-2.8-1.4-5.2-3.6-6.6l3.6-5c1.2-1.6 1-4-.6-5.2-1.6-1.2-4-1-5.2.6l-2.1 3zm-6 4.2c0-1.4 1.2-2.6 2.6-2.6s2.6 1.2 2.6 2.6c0 1-.6 1.8-1.4 2.2l-1.6-2.2h-2.2zm-8.2 32.8c-3 0-5.4-2.4-5.4-5.4s2.4-5.4 5.4-5.4c2.2 0 4 1.2 4.8 3.2l-4.8 7.6zm7.2-11.6l3.4-11.8c1 .8 1.6 2 1.6 3.4 0 2.4-2 4.4-4.4 4.4-.2 0-.4 0-.6 0z"/>
  </svg>
);

// Multiple distinct song emoticons in the same blurry atmosphere
export const FLOATING_SONG_EMOTICONS = [
  {
    id: 'note-eighth',
    symbol: '♪',
    label: 'Eighth Note',
    tooltip: 'Feedback ♡',
    baseSize: 38,
    initX: 18,
    initY: 26,
    blur: 0,
    glideVariant: 0,
    speed: 5.4,
    enterDelay: 0
  },
  {
    id: 'note-double',
    symbol: '♫',
    label: 'Beamed Notes',
    tooltip: 'Leave a note 🎵',
    baseSize: 42,
    initX: 38,
    initY: 20,
    blur: 0.6,
    glideVariant: 1,
    speed: 6.2,
    enterDelay: 80
  },
  {
    id: 'note-sixteenth',
    symbol: '♬',
    label: 'Sixteenth Notes',
    tooltip: 'Your thoughts 💭',
    baseSize: 36,
    initX: 14,
    initY: 58,
    blur: 0.9,
    glideVariant: 2,
    speed: 5.8,
    enterDelay: 150
  },
  {
    id: 'note-quarter',
    symbol: '♩',
    label: 'Quarter Note',
    tooltip: 'Rate the vibe ✨',
    baseSize: 34,
    initX: 54,
    initY: 26,
    blur: 0.3,
    glideVariant: 0,
    speed: 6.5,
    enterDelay: 220
  },
  {
    id: 'note-clef',
    symbol: '𝄞',
    label: 'Treble Clef',
    tooltip: 'Tune in ✨',
    baseSize: 44,
    initX: 30,
    initY: 66,
    blur: 0.7,
    glideVariant: 1,
    speed: 5.2,
    enterDelay: 290
  }
];

// Single Floating Emoticon Item with its own autonomous organic trajectory
function FloatingSongEmoticonItem({
  item,
  index,
  isExiting,
  onItemClick
}) {
  const [pos, setPos] = useState({ x: item.initX, y: item.initY });
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  // Smooth wandering within its respective safe sector
  const pickNextPosition = useCallback(() => {
    setPos((prev) => {
      const minX = Math.max(6, item.initX - 13);
      const maxX = Math.min(64, item.initX + 13);
      const minY = Math.max(10, item.initY - 14);
      const maxY = Math.min(78, item.initY + 14);

      let nextX = Math.round(minX + Math.random() * (maxX - minX));
      let nextY = Math.round(minY + Math.random() * (maxY - minY));

      return { x: nextX, y: nextY };
    });
  }, [item.initX, item.initY]);

  useEffect(() => {
    // Initial slight displacement on appearance
    const initialTimer = setTimeout(() => {
      pickNextPosition();
    }, 400 + item.enterDelay);

    const scheduleNextMove = () => {
      const delay = 4600 + Math.random() * 2200;
      timerRef.current = setTimeout(() => {
        if (!isHovered) {
          pickNextPosition();
        }
        scheduleNextMove();
      }, delay);
    };

    scheduleNextMove();

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pickNextPosition, isHovered, item.enterDelay]);

  const handleClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onItemClick(e, index);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      id={`floating-song-emoticon-${item.id}`}
      className={`floating-cloud-container glide-variant-${item.glideVariant} ${isExiting ? 'is-exiting' : 'is-entering'} ${isHovered ? 'is-hovered' : ''}`}
      style={{
        left: `${pos.x}vw`,
        top: `${pos.y}vh`,
        transition: `left ${item.speed}s cubic-bezier(0.38, 0.16, 0.25, 1), top ${item.speed}s cubic-bezier(0.38, 0.16, 0.25, 1)`,
        animationDelay: `${item.enterDelay}ms`,
        '--note-blur': `${item.blur}px`,
        '--note-base-size': `${item.baseSize}px`
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Click to leave feedback: ${item.label}`}
      title={item.tooltip}
    >
      {/* Soft atmospheric ambient glow */}
      <div className="floating-cloud-ambient-bloom" />

      {/* Borderless Emoticon Button */}
      <button
        type="button"
        id={`btn-floating-note-${item.id}`}
        className="floating-cloud-btn"
        onClick={handleClick}
        aria-label={item.label}
        tabIndex={-1}
      >
        <span 
          className="floating-cloud-emoticon" 
          role="img" 
          aria-label={item.label}
          style={{ fontSize: `${item.baseSize}px` }}
        >
          {item.symbol === '𝄞' ? (
            <TrebleClefGlyph size={item.baseSize} />
          ) : (
            item.symbol
          )}
        </span>
      </button>

      {/* Aesthetic floating tooltip on hover */}
      <div className={`floating-cloud-tooltip ${isHovered ? 'is-visible' : ''}`}>
        <span>{item.tooltip}</span>
        <span className="tooltip-heart">♡</span>
      </div>
    </div>
  );
}

export default function FloatingFeedbackNote({ isOpen = false, onOpenFeedback, isFeedbackOpen = false }) {
  const [mounted, setMounted] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  // Sync mounting and cool exit animation with isOpen
  useEffect(() => {
    if (isOpen && !isFeedbackOpen) {
      setMounted(true);
      setIsExiting(false);
    } else if (mounted) {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        setMounted(false);
        setIsExiting(false);
      }, 440);
      return () => clearTimeout(exitTimer);
    }
  }, [isOpen, isFeedbackOpen, mounted]);

  const handleItemClick = (e, index) => {
    playCloudChimeSound(index);
    setIsExiting(true);

    setTimeout(() => {
      onOpenFeedback?.();
    }, 220);
  };

  if (!mounted) return null;

  return (
    <div className="floating-song-emoticons-layer" aria-hidden={isExiting ? 'true' : 'false'}>
      {FLOATING_SONG_EMOTICONS.map((item, index) => (
        <FloatingSongEmoticonItem
          key={item.id}
          item={item}
          index={index}
          isExiting={isExiting}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  );
}

