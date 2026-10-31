import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Play, 
  Pause, 
  Disc, 
  Volume2, 
  Sparkles, 
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { playClickSound, playPeacefulLikeSound } from '../utils/audioSynth';
import '../styles/theMusiclyStory.css';

// 5 Editorial Chapters for "The Musicly Story"
const STORY_CHAPTERS = [
  {
    id: 1,
    tag: '01 / 05 — THE BEGINNING',
    shortTitle: 'The Beginning',
    title: 'A Blank Canvas for Sound',
    subtitle: 'The Genesis of a Personal Sanctuary',
    description: 'In an era of endless algorithmic noise, Musicly started with a simple thought: what if listening to music felt like stepping inside a quiet room built just for you? A space where sound, atmosphere, and imagination come together without distraction.',
    quote: 'Every song has a place. Every mood has a story.',
    image: '/assets/about/cassette_sunlight.png',
    accentColor: '#b45309', // Warm Amber
    aspectNote: 'WARM ANALOG TAPE • 1982'
  },
  {
    id: 2,
    tag: '02 / 05 — THE FEELING',
    shortTitle: 'The Feeling',
    title: 'The Intimacy of Listening',
    subtitle: 'Surrounded by Warmth & Tactile Emotion',
    description: 'Music is deeply tactile. It is the soft click of an analog switch, the gentle hum of vacuum tubes, and the warm harmonic resonance that makes a rainy afternoon feel infinite. We craft every detail to honor that emotional connection.',
    quote: 'Sound is not merely data. It is a shelter for the mind.',
    image: '/assets/about/piano_headphones.jpg',
    accentColor: '#d97706', // Ochre
    aspectNote: 'ACOUSTIC RESONANCE • 432Hz'
  },
  {
    id: 3,
    tag: '03 / 05 — THE WORLDS',
    shortTitle: 'The Worlds',
    title: 'Spaces for Every State of Mind',
    subtitle: 'Atmospheric Rooms, Weather & Living Moods',
    description: 'From rain-slicked midnight cafes to rolling countryside train cars and quiet fireside vinyl lofts, Musicly builds acoustic environments where sound and visual atmosphere breathe as one.',
    quote: 'Step into a world textured for your current frequency.',
    image: '/assets/images/vinyl_scene_preview.jpg',
    accentColor: '#0284c7', // Sky Azure
    aspectNote: 'CURATED SANCTUARIES • SPATIAL AUDIO'
  },
  {
    id: 4,
    tag: '04 / 05 — THE TECHNOLOGY',
    shortTitle: 'The Technology',
    title: 'Invisible Craft & Audio Architecture',
    subtitle: 'Where Autonomous Intelligence Meets Analog Care',
    description: 'Behind the calm, editorial surface lies precision engineering: custom Web Audio synthesizers, autonomous live stream agents scanning global broadcasts, and zero-latency pipelines built with pure devotion to sound fidelity.',
    quote: 'Complexity hidden beneath effortless stillness.',
    image: '/assets/about/nature_music_widgets.jpg',
    accentColor: '#059669', // Emerald
    aspectNote: 'AUTONOMOUS STREAM AGENTS • WEB AUDIO'
  },
  {
    id: 5,
    tag: '05 / 05 — THE PURPOSE',
    shortTitle: 'The Purpose',
    title: 'Somewhere You Go',
    subtitle: 'An Ever-Evolving Sonic Sanctuary',
    description: 'Music is not just something you hear. It\'s somewhere you go. A sanctuary you can return to whenever the world outside becomes too loud. Built with love by Tripam for listeners, dreamers, and night-shift creators worldwide.',
    quote: 'Music is not just something you hear. It\'s somewhere you go.',
    image: '/assets/about/airplane_hud.jpg',
    accentColor: '#7c3aed', // Royal Violet
    aspectNote: 'CRAFTED WITH PASSION • TRIPAM 2026'
  }
];

const AUTOPLAY_DURATION_MS = 6000;

export default function TheMusiclyStory({
  onBack,
  onSwitchView,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState('next');
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [autoplayProgress, setAutoplayProgress] = useState(0);

  const touchStartXRef = useRef(null);
  const progressTimerRef = useRef(null);

  const activeChapter = STORY_CHAPTERS[currentIndex];

  // Go to Next Chapter
  const handleNext = useCallback((isAuto = false) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection('next');
    if (!isAuto) {
      setIsAutoplay(false);
      playClickSound('light');
    }
    setAutoplayProgress(0);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % STORY_CHAPTERS.length);
      setIsTransitioning(false);
    }, 280);
  }, [isTransitioning]);

  // Go to Previous Chapter
  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection('prev');
    setIsAutoplay(false);
    setAutoplayProgress(0);
    playClickSound('light');

    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + STORY_CHAPTERS.length) % STORY_CHAPTERS.length);
      setIsTransitioning(false);
    }, 280);
  }, [isTransitioning]);

  // Jump directly to chapter index
  const handleSelectChapter = useCallback((index) => {
    if (index === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setDirection(index > currentIndex ? 'next' : 'prev');
    setIsAutoplay(false);
    setAutoplayProgress(0);
    playClickSound('light');

    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 280);
  }, [currentIndex, isTransitioning]);

  // Toggle Autoplay
  const handleToggleAutoplay = () => {
    setIsAutoplay((prev) => {
      const nextState = !prev;
      if (!nextState) setAutoplayProgress(0);
      playClickSound('light');
      return nextState;
    });
  };

  // Autoplay Progression Loop (smooth 50ms tick)
  useEffect(() => {
    // Respect user's reduced-motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsAutoplay(false);
      return;
    }

    if (!isAutoplay) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const intervalStep = 50;
    progressTimerRef.current = setInterval(() => {
      setAutoplayProgress((prev) => {
        const next = prev + (intervalStep / AUTOPLAY_DURATION_MS) * 100;
        if (next >= 100) {
          handleNext(true);
          return 0;
        }
        return next;
      });
    }, intervalStep);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isAutoplay, handleNext]);

  // Keyboard Navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        // Spacebar toggles autoplay if not on a button
        if (!e.target.closest('button')) {
          e.preventDefault();
          handleToggleAutoplay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch Swipe Handlers for Mobile & Tablet
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;
    if (Math.abs(diffX) > 45) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <div 
      className="musicly-story-page" 
      role="main" 
      aria-label="The Musicly Story"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ================= 1. REFINED EDITORIAL HEADER ================= */}
      <header className="story-nav-header">
        <div className="story-nav-left">
          <button 
            type="button" 
            className="story-back-btn" 
            onClick={onBack}
            title="Return to Musicly Player"
            aria-label="Back to Musicly"
          >
            <ArrowLeft size={15} />
            <span>Back to Musicly</span>
          </button>
          <span className="story-header-divider" aria-hidden="true">/</span>
          <span className="story-studio-label">The Musicly Story</span>
        </div>

        {/* 1-CLICK TOGGLE BUTTON TO SWITCH BACK TO "CLASSIC ABOUT" */}
        <div className="story-nav-right">
          <button
            type="button"
            className="story-switcher-btn"
            onClick={onSwitchView}
            title="Switch to the Classic About page experience"
            aria-label="Switch to Classic About"
          >
            <Compass size={14} className="story-switcher-icon" />
            <span className="story-switcher-label">Classic About</span>
          </button>
        </div>
      </header>

      {/* ================= 2. EDITORIAL INTRO HERO ================= */}
      <section className="story-hero-section">
        <div className="story-hero-inner">
          <div className="story-eyebrow">
            <span className="eyebrow-pip" />
            <span>ORIGIN & PHILOSOPHY // EST. 2024</span>
          </div>

          <h1 className="story-main-heading">
            Every song has a place. <br className="break-desktop" />
            <em>Every mood has a story.</em>
          </h1>

          <p className="story-lead-copy">
            Musicly was created around a simple thought: music should feel personal. 
            A space where sound, atmosphere, and imagination come together.
          </p>
        </div>
      </section>

      {/* ================= 3. CENTRAL FRAMED INTERACTIVE VISUAL ================= */}
      <section className="story-interactive-showcase" aria-label="Interactive Chapter Frame">
        {/* Gallery Mat Outer Border Frame */}
        <div className="story-cinematic-frame">
          {/* Top Bar of the Framed Artwork */}
          <div className="frame-meta-bar">
            <div className="frame-meta-left">
              <span className="frame-index-badge">{activeChapter.tag}</span>
              <span className="frame-aspect-note">{activeChapter.aspectNote}</span>
            </div>
            <div className="frame-meta-right">
              {/* Autoplay status indicator */}
              <button
                type="button"
                className={`frame-autoplay-chip ${isAutoplay ? 'is-active' : ''}`}
                onClick={handleToggleAutoplay}
                title={isAutoplay ? "Pause chapter autoplay" : "Resume chapter autoplay (6s)"}
                aria-label={isAutoplay ? "Pause autoplay" : "Start autoplay"}
              >
                {isAutoplay ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" style={{ marginLeft: 1 }} />}
                <span>{isAutoplay ? 'Autoplay' : 'Paused'}</span>
              </button>
            </div>
          </div>

          {/* Inner Visual Viewport */}
          <div className={`frame-viewport direction-${direction} ${isTransitioning ? 'is-fading' : ''}`}>
            {/* Background Artwork */}
            <img 
              src={activeChapter.image} 
              alt={activeChapter.title}
              className="frame-illustration-img"
              loading="eager"
            />

            {/* Subtle Warm Film Grain Texture */}
            <div className="frame-film-grain" aria-hidden="true" />

            {/* Editorial Vignette & Content Gradient */}
            <div className="frame-gradient-overlay" />

            {/* Chapter Caption Content Card inside Frame */}
            <div className="frame-caption-block">
              <span className="caption-accent-bar" style={{ backgroundColor: activeChapter.accentColor }} />
              <div className="caption-text-group">
                <span className="caption-subtitle">{activeChapter.subtitle}</span>
                <h2 className="caption-title">{activeChapter.title}</h2>
                <p className="caption-description">{activeChapter.description}</p>
                <div className="caption-quote-row">
                  <span className="quote-mark">“</span>
                  <span className="quote-text">{activeChapter.quote}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Autoplay Horizontal Segmented Progress Strip */}
          <div className="frame-bottom-progress-strip">
            {STORY_CHAPTERS.map((ch, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <div 
                  key={ch.id} 
                  className={`progress-segment ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''}`}
                  onClick={() => handleSelectChapter(idx)}
                  role="button"
                  tabIndex={0}
                  title={`Jump to ${ch.shortTitle}`}
                >
                  <div 
                    className="progress-segment-fill"
                    style={{ 
                      width: isActive 
                        ? (isAutoplay ? `${autoplayProgress}%` : '100%') 
                        : (isPast ? '100%' : '0%') 
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 4. INTERACTIVE CHAPTER NAVIGATION CONTROLS ================= */}
        <div className="story-controls-bar">
          {/* Previous Button */}
          <button 
            type="button" 
            className="story-nav-arrow-btn prev-btn"
            onClick={handlePrev}
            title="Previous Chapter (← Left Arrow)"
            aria-label="Previous Chapter"
          >
            <ArrowLeft size={16} />
            <span className="arrow-text">Previous</span>
          </button>

          {/* Segmented Chapter Indicators (Clickable Pills) */}
          <nav className="story-chapter-pills" aria-label="Chapter Indicators">
            {STORY_CHAPTERS.map((ch, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`chapter-pill-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSelectChapter(idx)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="pill-number">0{ch.id}</span>
                  <span className="pill-title">{ch.shortTitle}</span>
                </button>
              );
            })}
          </nav>

          {/* Next Button */}
          <button 
            type="button" 
            className="story-nav-arrow-btn next-btn"
            onClick={() => handleNext(false)}
            title="Next Chapter (→ Right Arrow)"
            aria-label="Next Chapter"
          >
            <span className="arrow-text">Next</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* ================= 5. DISCREET AUDIO PLAYBACK CONTROL ================= */}
        <div className="story-audio-companion" aria-label="Current Track Audio Companion">
          <button
            type="button"
            className={`audio-companion-play-btn ${isPlaying ? 'is-playing' : ''}`}
            onClick={() => {
              if (onTogglePlay) onTogglePlay();
              playClickSound('light');
            }}
            title={isPlaying ? "Pause music playback" : "Play music playback"}
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>

          <div className="audio-companion-info">
            <span className="audio-status-label">
              {isPlaying ? 'Now Playing in Musicly' : 'Listen with Soundtrack'}
            </span>
            <span className="audio-track-title">
              {currentTrack ? `${currentTrack.title} — ${currentTrack.artist}` : "Knockin' On Heaven's Door — Bob Dylan"}
            </span>
          </div>

          <div className="audio-companion-waves" aria-hidden="true">
            <span className={`wave-bar ${isPlaying ? 'animate-bar-1' : ''}`} />
            <span className={`wave-bar ${isPlaying ? 'animate-bar-2' : ''}`} />
            <span className={`wave-bar ${isPlaying ? 'animate-bar-3' : ''}`} />
            <span className={`wave-bar ${isPlaying ? 'animate-bar-4' : ''}`} />
          </div>
        </div>
      </section>

      {/* ================= 6. REFINED EDITORIAL FOOTER ================= */}
      <footer className="story-ending-section">
        <div className="ending-divider-line" />

        <div className="ending-content-block">
          <span className="ending-monogram">MUSICLY</span>
          <h3 className="ending-heading">THIS IS MUSICLY.</h3>
          <p className="ending-subtext">
            An ever-evolving space, built for the moments that deserve a soundtrack.
          </p>

          {/* Tasteful Action Button: "Back to Listening" */}
          <button
            type="button"
            className="story-back-to-listening-btn"
            onClick={onBack}
            title="Return to the Musicly listening experience"
          >
            <span>Back to Listening</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="ending-sub-footer">
          <span className="footer-credits">Crafted with devotion by Tripam</span>
          <span className="footer-bullet">•</span>
          <span className="footer-rights">All sound recordings belong to their respective creators</span>
        </div>
      </footer>
    </div>
  );
}

