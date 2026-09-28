import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  ArrowLeft, 
  Music, 
  Heart, 
  ListMusic, 
  Upload, 
  Sparkles, 
  Disc3, 
  Radio,
  SkipForward
} from 'lucide-react';
import { TRACKS } from '../data/tracks';
import { playCatSound } from '../utils/audioSynth';
import '../styles/aboutUs.css';

// SVG Icons for Social Links
const LinkedInIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0 0-3.36 1.68 1.68 0 0 0 0 3.36m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
  </svg>
);

const GithubIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

// Cozy Cat Companions Hotspots on Cropped Card (Exact % bounds)
const CAT_COMPANIONS = [
  {
    id: 'mochi',
    name: 'Mochi',
    role: 'The Sleepy Dreamer',
    soundIdx: 0,
    quote: 'Prrrr~ so cozy... 💤',
    left: '4%',
    top: '5%',
    width: '23%',
    height: '48%'
  },
  {
    id: 'tangerine',
    name: 'Tangerine',
    role: 'The Climber Tabby',
    soundIdx: 1,
    quote: 'Nyaa! Hanging on tight!',
    left: '27%',
    top: '22%',
    width: '18%',
    height: '56%'
  },
  {
    id: 'boba',
    name: 'Boba',
    role: 'The Curious Peeker',
    soundIdx: 2,
    quote: 'Mrrrp! What track is this?',
    left: '45%',
    top: '5%',
    width: '20%',
    height: '42%'
  },
  {
    id: 'pepper',
    name: 'Pepper',
    role: 'The Ledge Climber',
    soundIdx: 3,
    quote: 'Almost reached the top! ♡',
    left: '65%',
    top: '24%',
    width: '16%',
    height: '56%'
  },
  {
    id: 'cookie',
    name: 'Cookie',
    role: 'The Playful Kitten',
    soundIdx: 4,
    quote: 'Yarn balls & good vibes! ✨',
    left: '80%',
    top: '10%',
    width: '16%',
    height: '42%'
  }
];

// Clickable Social Profiles
const SOCIAL_LINKS = [
  {
    id: 'github',
    name: 'GitHub',
    handle: '@Tripam007',
    url: 'https://github.com/Tripam007',
    icon: GithubIcon,
    hoverGlow: 'rgba(168, 85, 247, 0.5)',
    accentColor: '#c084fc'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: 'Tripam Biswas',
    url: 'https://www.linkedin.com/in/tripam-biswas-09b4b330a/',
    icon: LinkedInIcon,
    hoverGlow: 'rgba(10, 102, 194, 0.5)',
    accentColor: '#38bdf8'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@tripam4',
    url: 'https://www.instagram.com/tripam4/?hl=en',
    icon: InstagramIcon,
    hoverGlow: 'rgba(225, 48, 108, 0.5)',
    accentColor: '#f43f5e'
  }
];

// Existing scene assets from Musicly
const SCENE_ASSETS = {
  afterglow: {
    name: 'AFTERGLOW',
    image: '/assets/images/afterglow_bg.jpg',
    tag: 'ANALOGUE WARMTH'
  },
  indie: {
    name: 'INDIE',
    image: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=1920&auto=format&fit=crop&q=85',
    tag: 'GOLDEN HORIZON'
  },
  drive: {
    name: 'DRIVE',
    image: '/assets/images/race_car_opening.jpg',
    tag: 'NIGHT RUNNER'
  },
  studio: {
    name: 'STUDIO',
    image: '/assets/images/cozy_bedroom.jpg',
    tag: 'BEDROOM VIBES'
  }
};

// Existing track artwork fragments from Musicly
const FLOATING_TRACK_FRAGMENTS = [
  {
    id: 'vienna',
    title: 'Vienna',
    artist: 'Billy Joel',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/37/68/4c/37684c52-dbdf-9bfe-0d87-07492f43dc4c/dj.gmcbwich.jpg/600x600bb.jpg',
    meta: 'RETRO • 1977'
  },
  {
    id: 'iris',
    title: 'Iris',
    artist: 'The Goo Goo Dolls',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/13/18/2c131801-00af-58b1-3cc2-13abf4ad5416/093624919162.jpg/600x600bb.jpg',
    meta: 'ACOUSTIC • 432Hz'
  },
  {
    id: 'until-i-found-you',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/d2/c5/64d2c511-67f4-ae09-5153-d39c3da413a3/21UMGIM75467.rgb.jpg/600x600bb.jpg',
    meta: 'TAPE WARMTH'
  },
  {
    id: 'knockin',
    title: "Knockin' On Heaven's Door",
    artist: 'Bob Dylan',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7e/06/12/7e06123a-c3af-75cf-c611-94334cb0bf20/886444247238.jpg/600x600bb.jpg',
    meta: 'MASTER CLASSIC'
  }
];

export default function AboutUsExperience({
  onBack,
  currentTrack = null,
  isPlaying = false,
  onTogglePlay = null,
  allTracks = null,
  onPlayTrack = null
}) {
  // Current visible chapter (1 through 5)
  const [activeChapter, setActiveChapter] = useState(1);
  const [scrollPercent, setScrollPercent] = useState(0);

  // Dynamic Vinyl Track Rotation over time (different songs at different times)
  const vinylSongCatalog = useMemo(() => {
    if (Array.isArray(allTracks) && allTracks.length > 0) return allTracks;
    return TRACKS;
  }, [allTracks]);

  const [vinylIndex, setVinylIndex] = useState(0);
  const [isVinylFlipping, setIsVinylFlipping] = useState(false);

  // Automatically cycle through different songs over time (every 5 seconds)
  useEffect(() => {
    if (vinylSongCatalog.length <= 1) return;
    const interval = setInterval(() => {
      setIsVinylFlipping(true);
      setTimeout(() => {
        setVinylIndex((prev) => (prev + 1) % vinylSongCatalog.length);
        setIsVinylFlipping(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [vinylSongCatalog]);

  const activeVinylSong = vinylSongCatalog[vinylIndex] || currentTrack || TRACKS[0];
  const isCurrentSongPlaying = isPlaying && (currentTrack?.id === activeVinylSong?.id);

  const handleNextVinylSong = (e) => {
    e?.stopPropagation?.();
    setIsVinylFlipping(true);
    setTimeout(() => {
      setVinylIndex((prev) => (prev + 1) % vinylSongCatalog.length);
      setIsVinylFlipping(false);
    }, 200);
  };

  const handleVinylPlayClick = (e) => {
    e?.stopPropagation?.();
    if (onPlayTrack && activeVinylSong) {
      if (currentTrack?.id === activeVinylSong.id) {
        onTogglePlay?.();
      } else {
        onPlayTrack(activeVinylSong);
      }
    } else {
      onTogglePlay?.();
    }
  };

  // Interactive Cats State (live movements, clicks & pet count)
  const [pettedCount, setPettedCount] = useState(0);
  const [catReactions, setCatReactions] = useState([]);
  const [activeBouncingCat, setActiveBouncingCat] = useState(null);
  const [lastPettedCatName, setLastPettedCatName] = useState(null);

  // Animation & scroll refs for zero layout thrashing 60/120fps interpolation
  const scrollTrackRef = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const rafIdRef = useRef(null);

  // Target and current interpolated values
  const currentScrollRef = useRef(0);
  const targetScrollRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // DOM node refs for direct GPU transform mutations
  const ch1Ref = useRef(null);
  const ch2Ref = useRef(null);
  const ch3Ref = useRef(null);
  const ch4Ref = useRef(null);
  const ch5Ref = useRef(null);
  const ch2PlayerCardRef = useRef(null);
  const sceneLayersRef = useRef({});
  const artifactsRef = useRef({});
  const ambientGlowRef = useRef(null);
  const verticalPipRef = useRef(null);
  const bgSlidesRef = useRef({});
  const catsShelfRef = useRef(null);

  // Set document title according to strict design guidelines
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'ABOUT US';
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Handle keyboard navigation and escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onBack?.();
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    if (e.key === 'ArrowDown') {
      container.scrollTop += 140;
    } else if (e.key === 'ArrowUp') {
      container.scrollTop -= 140;
    } else if (e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button'))) {
      container.scrollTop += window.innerHeight * 0.85;
    } else if (e.key === 'PageUp') {
      container.scrollTop -= window.innerHeight * 0.85;
    } else if (e.key === 'Home') {
      container.scrollTop = 0;
    } else if (e.key === 'End') {
      container.scrollTop = container.scrollHeight;
    }
  }, [onBack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Mouse parallax tracking
  const handleMouseMove = useCallback((e) => {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;
    mousePosRef.current.targetX = normX;
    mousePosRef.current.targetY = normY;
  }, []);

  // Scroll listener updates target scroll based on container scroll position
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;
    const rawProgress = Math.max(0, Math.min(1, container.scrollTop / maxScroll));
    targetScrollRef.current = rawProgress;
  }, []);

  // Click on vertical progress bar jumps to that fraction of scroll
  const handleProgressClick = useCallback((e) => {
    const container = containerRef.current;
    const bar = e.currentTarget;
    if (!container || !bar) return;
    const rect = bar.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / rect.height));
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: ratio * maxScroll, behavior: 'smooth' });
  }, []);

  // Continuous RAF interpolation loop
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let lastReportedChapter = 1;
    let lastReportedPct = 0;

    const renderFrame = () => {
      // Smooth lerp interpolation for buttery continuous movement
      const scrollSpeed = 0.075;
      currentScrollRef.current += (targetScrollRef.current - currentScrollRef.current) * scrollSpeed;
      const progress = currentScrollRef.current;

      // Mouse lerp
      const mouseSpeed = 0.05;
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * mouseSpeed;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * mouseSpeed;
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;

      // Update vertical progress pip
      if (verticalPipRef.current) {
        verticalPipRef.current.style.transform = `translateY(${progress * 100}px)`;
      }

      // Update active chapter state periodically when chapter changes
      let currentCh = 1;
      if (progress >= 0.80) currentCh = 5;
      else if (progress >= 0.60) currentCh = 4;
      else if (progress >= 0.40) currentCh = 3;
      else if (progress >= 0.20) currentCh = 2;

      if (currentCh !== lastReportedChapter) {
        lastReportedChapter = currentCh;
        setActiveChapter(currentCh);
      }

      const roundedPct = Math.round(progress * 100);
      if (Math.abs(roundedPct - lastReportedPct) >= 1) {
        lastReportedPct = roundedPct;
        setScrollPercent(roundedPct);
      }

      // Background color atmospheric shifts across chapters
      if (stageRef.current) {
        if (progress < 0.20) {
          // Chapter 01: Deep obsidian / charcoal
          stageRef.current.style.backgroundColor = '#07090d';
        } else if (progress < 0.40) {
          // Chapter 02: Warm deep charcoal with brass tint
          stageRef.current.style.backgroundColor = '#0b0d13';
        } else if (progress < 0.60) {
          // Chapter 03: Atmospheric scene darkness
          stageRef.current.style.backgroundColor = '#080a0f';
        } else if (progress < 0.80) {
          // Chapter 04: Warm dark espresso
          stageRef.current.style.backgroundColor = '#0a0a0f';
        } else {
          // Chapter 05: Deepest midnight obsidian
          stageRef.current.style.backgroundColor = '#040507';
        }
      }

      // Ambient glow movement & tint
      if (ambientGlowRef.current) {
        const glowOpacity = 0.22 + Math.sin(progress * Math.PI) * 0.18;
        const glowX = mx * 25;
        const glowY = my * 20;
        ambientGlowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
        ambientGlowRef.current.style.opacity = glowOpacity.toFixed(2);
      }

      // Dynamic Photographic Backgrounds Interpolation
      const bgPiano = bgSlidesRef.current?.piano;
      const bgNature = bgSlidesRef.current?.nature;
      const bgAirplane = bgSlidesRef.current?.airplane;
      const bgCassette = bgSlidesRef.current?.cassette;

      if (bgPiano) {
        const pPiano = progress < 0.16 ? 1 : Math.max(0, 1 - (progress - 0.16) / 0.12);
        bgPiano.style.opacity = pPiano.toFixed(3);
        bgPiano.style.transform = `scale(${1.04 + progress * 0.06}) translate3d(${mx * -15}px, ${my * -10}px, 0)`;
      }

      if (bgNature) {
        let pNature = 0;
        if (progress >= 0.18 && progress < 0.30) {
          pNature = (progress - 0.18) / 0.12;
        } else if (progress >= 0.30 && progress < 0.45) {
          pNature = 1;
        } else if (progress >= 0.45 && progress < 0.58) {
          pNature = Math.max(0, 1 - (progress - 0.45) / 0.13);
        }
        bgNature.style.opacity = pNature.toFixed(3);
        bgNature.style.transform = `scale(${1.05 + (progress - 0.2) * 0.05}) translate3d(${mx * -16}px, ${my * -12}px, 0)`;
      }

      if (bgAirplane) {
        let pAirplane = 0;
        if (progress >= 0.45 && progress < 0.60) {
          pAirplane = (progress - 0.45) / 0.15;
        } else if (progress >= 0.60 && progress < 0.76) {
          pAirplane = 1;
        } else if (progress >= 0.76 && progress < 0.88) {
          pAirplane = Math.max(0, 1 - (progress - 0.76) / 0.12);
        }
        bgAirplane.style.opacity = pAirplane.toFixed(3);
        bgAirplane.style.transform = `scale(${1.05 + (progress - 0.5) * 0.05}) translate3d(${mx * -18}px, ${my * -14}px, 0)`;
      }

      // 📼 Warm Golden Sunlight Cassette Tape (Chapter 05 Finale Background Animation)
      if (bgCassette) {
        let pCassette = 0;
        if (progress >= 0.75 && progress < 0.88) {
          pCassette = (progress - 0.75) / 0.13;
        } else if (progress >= 0.88) {
          pCassette = 1;
        }
        bgCassette.style.opacity = pCassette.toFixed(3);
        const cassetteZoom = 1.04 + (progress - 0.75) * 0.08;
        bgCassette.style.transform = `scale(${cassetteZoom.toFixed(3)}) translate3d(${mx * -20}px, ${my * -14}px, 0)`;
      }

      // ====================================================================
      // 1. CHAPTER 01 CHOREOGRAPHY (Progress 0.00 – 0.20)
      // ====================================================================
      if (ch1Ref.current) {
        if (progress < 0.20) {
          const p1 = Math.min(1, Math.max(0, (progress - 0.10) / 0.10));
          const opacity = Math.max(0, 1 - p1);
          const scale = 1 + p1 * 0.35;
          const zPush = p1 * 280;
          const blur = p1 * 12;

          ch1Ref.current.style.display = 'flex';
          ch1Ref.current.style.opacity = opacity.toFixed(3);
          ch1Ref.current.style.transform = `translate3d(${mx * -15}px, ${my * -12}px, ${zPush}px) scale(${scale})`;
          ch1Ref.current.style.filter = `blur(${blur.toFixed(1)}px)`;

          // Words separate outwards in 3D
          const words = ch1Ref.current.querySelectorAll('.word-line');
          words.forEach((w, idx) => {
            const spreadY = (idx - 2) * p1 * 70;
            const spreadZ = (idx - 1) * p1 * 120;
            w.style.transform = `translate3d(0, ${spreadY}px, ${spreadZ}px)`;
          });
        } else {
          ch1Ref.current.style.display = 'none';
        }
      }

      // ====================================================================
      // 2. CHAPTER 02 CHOREOGRAPHY (Progress 0.20 – 0.40)
      // ====================================================================
      if (ch2Ref.current) {
        if (progress >= 0.20 && progress < 0.40) {
          ch2Ref.current.style.display = 'flex';

          let opacity = 1;
          if (progress < 0.25) {
            opacity = (progress - 0.20) / 0.05;
          } else if (progress > 0.35) {
            opacity = 1 - (progress - 0.35) / 0.05;
          }

          const moveZ = (progress - 0.30) * -240;
          const moveY = (progress - 0.30) * -50;

          ch2Ref.current.style.opacity = Math.max(0, opacity).toFixed(3);
          ch2Ref.current.style.transform = `translate3d(${mx * -18}px, ${moveY + my * -14}px, ${moveZ}px)`;

          // Suspended 3D Player rotation and subtle tilt
          if (ch2PlayerCardRef.current) {
            const rotY = (progress - 0.30) * 50 + mx * 12;
            const rotX = my * -10 - 4;
            ch2PlayerCardRef.current.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
          }
        } else {
          ch2Ref.current.style.display = 'none';
        }
      }

      // ====================================================================
      // 3. CHAPTER 03 CHOREOGRAPHY — THE WORLD (Progress 0.40 – 0.60)
      // ====================================================================
      if (ch3Ref.current) {
        if (progress >= 0.40 && progress < 0.60) {
          ch3Ref.current.style.display = 'flex';

          let opacity = 1;
          if (progress < 0.45) {
            opacity = (progress - 0.40) / 0.05;
          } else if (progress > 0.55) {
            opacity = 1 - (progress - 0.55) / 0.05;
          }

          ch3Ref.current.style.opacity = Math.max(0, opacity).toFixed(3);

          // Scene Depth Layer Choreography
          const rel3 = (progress - 0.50) / 0.10;

          // AFTERGLOW — Far background depth
          if (sceneLayersRef.current.afterglow) {
            const z = -200 + rel3 * 160;
            const y = mx * 10;
            sceneLayersRef.current.afterglow.style.transform = `translate3d(${y}px, 0, ${z}px) scale(0.95)`;
            sceneLayersRef.current.afterglow.style.filter = `blur(${Math.max(0, 2 - Math.abs(rel3) * 3)}px)`;
          }

          // INDIE — Mid-ground floating forward
          if (sceneLayersRef.current.indie) {
            const z = -80 + rel3 * 200;
            const x = mx * -14;
            sceneLayersRef.current.indie.style.transform = `translate3d(${x}px, 0, ${z}px) scale(1.02)`;
          }

          // DRIVE — Sweeping across horizontally
          if (sceneLayersRef.current.drive) {
            const sweepX = (rel3 * 240) + (mx * -22);
            const z = -30 + rel3 * 160;
            sceneLayersRef.current.drive.style.transform = `translate3d(${sweepX}px, 0, ${z}px)`;
          }

          // STUDIO — Emerging into tactile foreground focus
          if (sceneLayersRef.current.studio) {
            const z = 80 + rel3 * 220;
            const x = mx * -18;
            const y = my * -14;
            sceneLayersRef.current.studio.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
          }
        } else {
          ch3Ref.current.style.display = 'none';
        }
      }

      // ====================================================================
      // 4. CHAPTER 04 CHOREOGRAPHY — YOUR MUSIC (Progress 0.60 – 0.80)
      // ====================================================================
      if (ch4Ref.current) {
        if (progress >= 0.60 && progress < 0.80) {
          ch4Ref.current.style.display = 'flex';

          let opacity = 1;
          if (progress < 0.65) {
            opacity = (progress - 0.60) / 0.05;
          } else if (progress > 0.75) {
            opacity = 1 - (progress - 0.75) / 0.05;
          }

          ch4Ref.current.style.opacity = Math.max(0, opacity).toFixed(3);

          const rel4 = (progress - 0.70) / 0.10;

          // Floating editorial artifacts with optical depth of field
          const artKeys = ['art1', 'art2', 'art3', 'art4'];
          artKeys.forEach((k, idx) => {
            const el = artifactsRef.current[k];
            if (el) {
              const dir = idx % 2 === 0 ? 1 : -1;
              const depthZ = (idx * 50 - 75) + (rel4 * 160);
              const driftX = (dir * rel4 * 50) + (mx * -12 * (idx + 1));
              const driftY = (my * -10 * (idx + 1));
              const blurAmt = Math.max(0, Math.abs(depthZ) * 0.015);

              el.style.transform = `translate3d(${driftX}px, ${driftY}px, ${depthZ}px)`;
              el.style.filter = `blur(${blurAmt.toFixed(1)}px)`;
            }
          });
        } else {
          ch4Ref.current.style.display = 'none';
        }
      }

      // ====================================================================
      // 5. CHAPTER 05 CHOREOGRAPHY — SILENCE & STAY (Progress 0.80 – 1.00)
      // ====================================================================
      if (ch5Ref.current) {
        if (progress >= 0.80) {
          ch5Ref.current.style.display = 'flex';

          const enterP = Math.min(1, (progress - 0.80) / 0.06);
          ch5Ref.current.style.opacity = enterP.toFixed(3);

          // Smoothly lift the entire stage as the user reaches the end (integer pixel aligned, no blur-inducing scale)
          const endShift = Math.max(0, (progress - 0.88) / 0.12);
          const shiftY = Math.round(endShift * -80);
          ch5Ref.current.style.transform = `translate3d(0, ${shiftY}px, 0)`;

          const stayVisibleP = Math.max(0, Math.min(1, (progress - 0.85) / 0.06));
          const stayEl = ch5Ref.current.querySelector('.about-ch5-stay-text');
          if (stayEl) {
            stayEl.style.opacity = stayVisibleP.toFixed(3);
            stayEl.style.transform = `translate3d(0, ${(1 - stayVisibleP) * 16}px, 0)`;
          }

          const exitBlock = ch5Ref.current.querySelector('.about-final-exit-block');
          if (exitBlock) {
            const exitP = Math.max(0, Math.min(1, (progress - 0.89) / 0.08));
            exitBlock.style.opacity = exitP.toFixed(3);
            exitBlock.style.transform = `translate3d(0, ${(1 - exitP) * 16}px, 0)`;
          }
        } else {
          ch5Ref.current.style.display = 'none';
        }
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [handleScroll, handleMouseMove]);

  // Clean back navigation to Musicly home page
  const handleExitToHome = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onBack?.();
  };

  // Interactive Cat Companion Click Handler (different cat sound for each cat)
  const handleCatClick = (e, cat) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    // Play different distinct cat sound for each cat via Web Audio API
    playCatSound(cat.soundIdx);

    setActiveBouncingCat(cat.id);
    setTimeout(() => {
      setActiveBouncingCat(null);
    }, 450);
  };

  // Currently playing or fallback iconic song info
  const displayTrack = currentTrack || FLOATING_TRACK_FRAGMENTS[0];

  return (
    <div 
      className="about-us-experience" 
      ref={containerRef}
      role="main" 
      aria-label="About Us"
      tabIndex={0}
    >
      {/* Tall Scroll Track */}
      <div className="about-scroll-track" ref={scrollTrackRef} />

      {/* Fixed 3D Cinematic Stage */}
      <div className="about-stage" ref={stageRef}>
        {/* Subtle Ambient Color Glow */}
        <div 
          className={`about-stage-ambient-glow ${isPlaying ? 'is-playing' : ''}`}
          ref={ambientGlowRef}
          style={{ background: 'radial-gradient(circle, #fb8500 0%, #1e1b4b 60%, transparent 80%)' }}
        />

        {/* Film Grain & Vignette */}
        <div className="about-stage-vignette" />

        {/* 🎬 Cinematic Dynamic Background Panoramas (User's Aesthetic Photos) */}
        <div className="about-dynamic-backdrops" aria-hidden="true">
          <div 
            className="about-bg-slide bg-piano" 
            ref={(el) => { if (bgSlidesRef.current) bgSlidesRef.current.piano = el; }}
            style={{ backgroundImage: `url('/assets/about/piano_headphones.jpg')` }}
          />
          <div 
            className="about-bg-slide bg-nature" 
            ref={(el) => { if (bgSlidesRef.current) bgSlidesRef.current.nature = el; }}
            style={{ backgroundImage: `url('/assets/about/nature_music_widgets.jpg')` }}
          />
          <div 
            className="about-bg-slide bg-airplane" 
            ref={(el) => { if (bgSlidesRef.current) bgSlidesRef.current.airplane = el; }}
            style={{ backgroundImage: `url('/assets/about/airplane_hud.jpg')` }}
          />
          <div 
            className="about-bg-slide bg-cassette" 
            ref={(el) => { if (bgSlidesRef.current) bgSlidesRef.current.cassette = el; }}
            style={{ backgroundImage: `url('/assets/about/cassette_sunlight.png')` }}
          />
          <div className="about-bg-overlay-veil" />
        </div>

        {/* ================= FIXED HUD (Clean Minimal Header) ================= */}
        <header className="about-hud" aria-label="About Us Header">
          <div className="about-hud-brand">
            <h1 className="about-hud-title">ABOUT US</h1>
          </div>
        </header>


        {/* ================= CHAPTER 01: "MUSIC SHOULD FEEL LIKE A PLACE." ================= */}
        <section className="about-ch1-container" ref={ch1Ref}>
          {/* Floating Objects around Typography */}
          <div 
            className="about-floating-object about-tile-art" 
            style={{ top: '15%', left: '12%', transform: 'rotate(-7deg)' }}
          >
            <img src={FLOATING_TRACK_FRAGMENTS[0].cover} alt="Vienna Album Artwork" />
          </div>

          <div 
            className="about-floating-object about-badge-tag" 
            style={{ top: '24%', right: '14%', transform: 'rotate(5deg)' }}
          >
            <Sparkles size={11} className="badge-accent" />
            <span>432Hz • ANALOG TAPE</span>
          </div>

          {/* 💿 Interactive Vinyl Record with Live Song Title, Spin Animation & Controls */}
          <div 
            className={`about-tile-vinyl about-interactive-vinyl ${isCurrentSongPlaying ? 'is-spinning' : 'is-paused'} ${isVinylFlipping ? 'is-switching' : ''}`}
            style={{ bottom: '14%', right: '10%' }}
            onClick={handleVinylPlayClick}
            role="button"
            tabIndex={0}
            aria-label={`Interactive Vinyl Record: ${activeVinylSong?.title || 'Vienna'} by ${activeVinylSong?.artist || 'Billy Joel'}. Click to play`}
            title={`Click to play: ${activeVinylSong?.title} • ${activeVinylSong?.artist} (Changes track over time)`}
          >
            {/* Vinyl Grooves & Specular Light Reflection Rings */}
            <div className="vinyl-groove-rings" aria-hidden="true" />
            <div className="vinyl-specular-glare" aria-hidden="true" />

            {/* Circular Running Track Name Along Vinyl Grooves */}
            <svg className="vinyl-circular-groove-text" viewBox="0 0 220 220" aria-hidden="true">
              <defs>
                <path 
                  id="vinylTextPath" 
                  d="M 110, 110 m -74, 0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0" 
                />
              </defs>
              <text>
                <textPath xlinkHref="#vinylTextPath" href="#vinylTextPath" startOffset="0%">
                  {`• ${activeVinylSong?.title || 'VIENNA'} • ${activeVinylSong?.artist || 'BILLY JOEL'} • MUSICLY 33⅓ RPM `}
                </textPath>
              </text>
            </svg>

            {/* Center Record Label with Amber Vintage Styling & Song Info */}
            <div className="about-vinyl-center">
              <div className={`vinyl-label-inner ${isVinylFlipping ? 'label-flipping' : ''}`}>
                <span className="vinyl-label-micro">MUSICLY</span>
                <span className="vinyl-label-title" title={activeVinylSong?.title || 'Vienna'}>
                  {activeVinylSong?.title || 'Vienna'}
                </span>
                <span className="vinyl-label-artist" title={activeVinylSong?.artist || 'Billy Joel'}>
                  {activeVinylSong?.artist || 'Billy Joel'}
                </span>
                <div className="vinyl-spindle-hole">
                  {isCurrentSongPlaying ? (
                    <Pause size={9} className="vinyl-play-indicator" />
                  ) : (
                    <Play size={9} className="vinyl-play-indicator" />
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Floating Hover Pill Tag with Live Status & Skip Action */}
            <div className="about-vinyl-hover-tag">
              <span className={`vinyl-tag-indicator ${isCurrentSongPlaying ? 'is-live' : ''}`} />
              <span className="vinyl-tag-song">
                {activeVinylSong?.title || 'Vienna'}
              </span>
              <button
                type="button"
                className="vinyl-tag-next-btn"
                onClick={handleNextVinylSong}
                title="Next song on vinyl"
                aria-label="Next song"
              >
                <SkipForward size={11} />
              </button>
            </div>
          </div>

          <div 
            className="about-floating-object about-waveform-sliver" 
            style={{ bottom: '22%', left: '14%' }}
          >
            <span className="about-waveform-bar" style={{ height: '14px', animationDelay: '0.1s' }} />
            <span className="about-waveform-bar" style={{ height: '24px', animationDelay: '0.3s' }} />
            <span className="about-waveform-bar" style={{ height: '18px', animationDelay: '0.2s' }} />
            <span className="about-waveform-bar" style={{ height: '28px', animationDelay: '0.5s' }} />
            <span className="about-waveform-bar" style={{ height: '12px', animationDelay: '0.4s' }} />
          </div>

          <div 
            className="about-floating-object about-light-leak" 
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />

          {/* ✨ Borderless Floating Statement (No Enclosing Box) */}
          <div className="about-ch1-content-wrap">

            <div className="about-ch1-statement about-editorial-serif">
              <span className="word-line">MUSIC SHOULD FEEL</span>
              <span className="word-line word-place">LIKE A PLACE.</span>
            </div>

            <p className="about-editorial-sub">
              More than sound — a living space of focus, stillness, and mood.
            </p>
          </div>
        </section>

        {/* ================= CHAPTER 02: "WE WANTED MUSIC TO FEEL PERSONAL AGAIN." ================= */}
        <section className="about-ch2-container" ref={ch2Ref} style={{ display: 'none' }}>
          <div className="about-ch2-heading-group">
            <span className="about-meta-label">WHY WE MADE IT</span>
            <h2 className="about-ch2-title about-editorial-serif">
              WE WANTED<br />
              MUSIC TO FEEL<br />
              <span className="italic-personal">PERSONAL AGAIN.</span>
            </h2>
          </div>

          {/* Suspended 3D Minimal Player Physical Object */}
          <div className="about-ch2-player-card" ref={ch2PlayerCardRef}>
            <div className="about-player-card-inner">
              <div className="about-player-card-cover">
                <img 
                  src={displayTrack?.cover || FLOATING_TRACK_FRAGMENTS[0].cover} 
                  alt={displayTrack?.title || 'Current Track'} 
                />
              </div>

              <div className="about-player-card-info">
                <span className="about-player-badge">NOW SUSPENDED IN SPACE</span>
                <h3 className="about-player-song-title">
                  {displayTrack?.title || 'Vienna'}
                </h3>
                <span className="about-player-song-artist">
                  {displayTrack?.artist || 'Billy Joel'}
                </span>
              </div>
            </div>

            <div className="about-player-controls-row">
              <button 
                type="button" 
                className="about-player-interactive-btn"
                onClick={onTogglePlay}
                title={isPlaying ? "Pause music" : "Play music"}
                aria-label={isPlaying ? "Pause music" : "Play music"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>

              <div className="about-player-waveform-wrap" aria-hidden="true">
                {[18, 30, 14, 26, 34, 20, 28, 16, 32, 22, 12, 24, 30, 18, 26, 34, 22, 16].map((h, i) => (
                  <span 
                    key={i} 
                    className={`about-player-wave-bar ${i % 3 === 0 ? 'bar-accent' : ''}`}
                    style={{ height: `${isPlaying ? Math.max(10, (h * (0.6 + (i % 4) * 0.2))) : h * 0.4}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= CHAPTER 03: "NOT JUST A PLAYER. A PLACE TO LISTEN." ================= */}
        <section className="about-ch3-container" ref={ch3Ref} style={{ display: 'none' }}>
          <div className="about-ch3-text-hero">
            <span className="about-meta-label">THE WORLD</span>
            <h2 className="about-ch3-title about-editorial-serif">
              NOT JUST<br />
              A PLAYER.<br />
              <span className="italic-place">A PLACE TO LISTEN.</span>
            </h2>
          </div>

          {/* Multilayered Scene Depth Choreography with Existing Assets */}
          <div className="about-scenes-deep-canvas">
            {/* 1. AFTERGLOW: Far Background */}
            <div 
              className="about-scene-layer layer-afterglow" 
              ref={(el) => { sceneLayersRef.current.afterglow = el; }}
            >
              <img src={SCENE_ASSETS.afterglow.image} alt={SCENE_ASSETS.afterglow.name} />
              <div className="about-scene-tag-glass">
                <span className="tag-dot" />
                <span>{SCENE_ASSETS.afterglow.name}</span>
              </div>
            </div>

            {/* 2. INDIE: Golden Horizon */}
            <div 
              className="about-scene-layer layer-indie" 
              ref={(el) => { sceneLayersRef.current.indie = el; }}
            >
              <img src={SCENE_ASSETS.indie.image} alt={SCENE_ASSETS.indie.name} />
              <div className="about-scene-tag-glass">
                <span className="tag-dot" />
                <span>{SCENE_ASSETS.indie.name}</span>
              </div>
            </div>

            {/* 3. DRIVE: Cinematic Highway */}
            <div 
              className="about-scene-layer layer-drive" 
              ref={(el) => { sceneLayersRef.current.drive = el; }}
            >
              <img src={SCENE_ASSETS.drive.image} alt={SCENE_ASSETS.drive.name} />
              <div className="about-scene-tag-glass">
                <span className="tag-dot" />
                <span>{SCENE_ASSETS.drive.name}</span>
              </div>
            </div>

            {/* 4. STUDIO: Cozy Bedroom Foreground */}
            <div 
              className="about-scene-layer layer-studio" 
              ref={(el) => { sceneLayersRef.current.studio = el; }}
            >
              <img src={SCENE_ASSETS.studio.image} alt={SCENE_ASSETS.studio.name} />
              <div className="about-scene-tag-glass">
                <span className="tag-dot" />
                <span>{SCENE_ASSETS.studio.name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CHAPTER 04: "YOUR MUSIC. YOUR MOMENTS." ================= */}
        <section className="about-ch4-container" ref={ch4Ref} style={{ display: 'none' }}>
          <div className="about-ch4-heading-wrap">
            <span className="about-meta-label">MADE FOR YOUR LISTENING</span>
            <h2 className="about-ch4-title about-editorial-serif">
              YOUR MUSIC.<br />
              <span className="italic-moments">YOUR MOMENTS.</span>
            </h2>
          </div>

          {/* Floating Editorial Feature Artifacts */}
          <div 
            className="about-floating-artifact artifact-pos-1" 
            ref={(el) => { artifactsRef.current.art1 = el; }}
          >
            <div className="about-artifact-icon icon-playlist">
              <ListMusic size={18} />
            </div>
            <div className="about-artifact-meta">
              <span className="meta-top">CURATED & CUSTOM</span>
              <span className="meta-title">Personal Playlists</span>
            </div>
          </div>

          <div 
            className="about-floating-artifact artifact-pos-2" 
            ref={(el) => { artifactsRef.current.art2 = el; }}
          >
            <div className="about-artifact-icon icon-favorite">
              <Heart size={18} />
            </div>
            <div className="about-artifact-meta">
              <span className="meta-top">HEARTED TRACKS</span>
              <span className="meta-title">Cherished Library</span>
            </div>
          </div>

          <div 
            className="about-floating-artifact artifact-pos-3" 
            ref={(el) => { artifactsRef.current.art3 = el; }}
          >
            <div className="about-artifact-icon icon-upload">
              <Upload size={18} />
            </div>
            <div className="about-artifact-meta">
              <span className="meta-top">LOSSLESS / LOCAL</span>
              <span className="meta-title">Your Uploaded Audio</span>
            </div>
          </div>

          <div 
            className="about-floating-artifact artifact-pos-4" 
            ref={(el) => { artifactsRef.current.art4 = el; }}
          >
            <div className="about-artifact-icon icon-request">
              <Disc3 size={18} />
            </div>
            <div className="about-artifact-meta">
              <span className="meta-top">COMMUNITY WISHLIST</span>
              <span className="meta-title">Song Requests</span>
            </div>
          </div>
        </section>

        {/* ================= CHAPTER 05: "JUST LISTEN. AND STAY A LITTLE LONGER." & FINAL EXIT ================= */}
        <section className="about-ch5-container" ref={ch5Ref} style={{ display: 'none' }}>
          {/* ✨ Borderless Floating Finale (No Enclosing Box) */}
          <div className="about-ch5-content-wrap">
            <div className="about-editorial-pill-badge">
              <span className="pill-badge-dot" />
              <span>THE INVITATION</span>
            </div>

            <div className="about-ch5-hero-words">
              <h2 className="about-ch5-listen-text about-editorial-serif">
                JUST LISTEN.
              </h2>
              <p className="about-ch5-stay-text about-editorial-serif-italic">
                AND STAY A LITTLE LONGER.
              </p>
            </div>

            <div className="about-ch5-tagline-wrap">
              <div className="about-ch5-brand-mark">Musicly</div>
              <p className="about-ch5-manifesto">
                Made with music, curiosity & a little obsession.
              </p>
            </div>

            <div className="about-final-exit-block">
              <span className="about-final-thanks">Thanks for listening.</span>
              <button 
                type="button" 
                className="about-final-back-link" 
                onClick={handleExitToHome}
                aria-label="Back to Musicly"
              >
                <ArrowLeft size={16} className="arrow-icon" />
                <span>Back to Musicly</span>
              </button>

              {/* 🐾 Interactive Cat Image directly below "Back to Musicly" (No enclosing black box) */}
              <div 
                className="about-cats-clean-stage"
                role="region"
                aria-label="Cozy Listening Companions"
              >
                <img 
                  src="/assets/about/cats_companions.png" 
                  alt="Cozy Listening Companions" 
                  className="about-cats-clean-img" 
                />

                {/* Clickable hitboxes for each individual cat (Different sounds, NO yellow hover effect) */}
                <div className="cats-clean-hit-layer">
                  {CAT_COMPANIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`cat-clean-hit-zone ${activeBouncingCat === cat.id ? 'is-cat-wobble' : ''}`}
                      style={{
                        left: cat.left,
                        top: cat.top,
                        width: cat.width,
                        height: cat.height
                      }}
                      onClick={(e) => handleCatClick(e, cat)}
                      title={`Click to hear ${cat.name}`}
                      aria-label={`Pet ${cat.name}`}
                    />
                  ))}
                </div>
              </div>

              {/* 🌐 Clickable Social Icons (Only icons: GitHub, LinkedIn, Instagram) */}
              <div className="about-social-icons-cluster" aria-label="Social profiles">
                {SOCIAL_LINKS.map((social) => {
                  const IconComp = social.icon;
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`about-social-circle-btn btn-social-${social.id}`}
                      title={social.name}
                      aria-label={social.name}
                    >
                      <IconComp size={20} className="social-svg-icon" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
