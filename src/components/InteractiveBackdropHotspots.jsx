import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Disc, Radio, Music, Music2, Play, ExternalLink, X, Coffee, Lightbulb, CloudRain, Sparkles, Heart, Zap, Eye, EyeOff } from 'lucide-react';
import { 
  playGuitarSound, 
  playLampSwitchSound, 
  playTingSound, 
  playCoffeeSipSound, 
  playRainChimeSound, 
  playPeacefulLikeSound 
} from '../utils/audioSynth';

const LinkedInIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.68 1.68 0 1 0 0-3.36 1.68 1.68 0 0 0 0 3.36m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
  </svg>
);

const GithubIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const InstagramIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

export const CODING_MONITORS_DATA = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: 'in/tripam-biswas-09b4b330a',
    title: 'Tripam Biswas on LinkedIn',
    url: 'https://www.linkedin.com/in/tripam-biswas-09b4b330a/',
    themeColor: '#0a66c2',
    accentGlow: 'rgba(10, 102, 194, 0.65)',
    className: 'hotspot-monitor-linkedin',
    screenPosition: 'Left Monitor'
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: '@Tripam007',
    title: 'Tripam007 on GitHub',
    url: 'https://github.com/Tripam007',
    themeColor: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.65)',
    className: 'hotspot-monitor-github',
    screenPosition: 'Main Screen'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@tripam4',
    title: '@tripam4 on Instagram',
    url: 'https://www.instagram.com/tripam4/',
    themeColor: '#e1306c',
    accentGlow: 'rgba(225, 48, 108, 0.65)',
    className: 'hotspot-monitor-instagram',
    screenPosition: 'Laptop Screen'
  }
];

export const ROOM_POSTERS_DATA = {
  coldplay: {
    id: 'coldplay',
    title: 'Coldplay - A Rush of Blood to the Head',
    category: 'Alternative Rock (2002)',
    shortBio: 'Multi-Grammy winning British rock band. Known for soaring melodic anthems, emotive acoustic piano ballads, and historic stadium singalongs.',
    anchor: { top: '6%', left: '21.5%' },
    tracks: [
      { name: 'The Scientist', artist: 'Coldplay', youtubeId: 'RB-RcX5DS5A', duration: 310 },
      { name: 'Clocks', artist: 'Coldplay', youtubeId: 'd020hcWA_Wg', duration: 308 },
      { name: 'In My Place', artist: 'Coldplay', youtubeId: 'gnIZ7RMuL5U', duration: 228 },
      { name: 'Yellow', artist: 'Coldplay', youtubeId: 'yKNxeF4KMsY', duration: 269 }
    ]
  },
  radiohead: {
    id: 'radiohead',
    title: 'Radiohead - OK Computer',
    category: 'Art Rock Landmark (1997)',
    shortBio: 'Groundbreaking English art-rock band. "OK Computer" is universally heralded as one of the greatest albums exploring modern alienation and soundscapes.',
    anchor: { top: '37%', left: '21.5%' },
    tracks: [
      { name: 'Paranoid Android', artist: 'Radiohead', youtubeId: 'fHiGbolFFGw', duration: 387 },
      { name: 'Karma Police', artist: 'Radiohead', youtubeId: '1uYWYWPc9HU', duration: 261 },
      { name: 'No Surprises', artist: 'Radiohead', youtubeId: 'u5CVsCnxyXg', duration: 228 },
      { name: 'Creep', artist: 'Radiohead', youtubeId: 'XFkzRNyygfk', duration: 238 }
    ]
  },
  oasisTop: {
    id: 'oasisTop',
    title: 'Oasis - Definitely Maybe',
    category: 'Britpop Anthem (1994)',
    shortBio: 'Legendary Manchester rock band fronted by Liam & Noel Gallagher. Fastest-selling UK debut album with unstoppable swagger and singalongs.',
    anchor: { top: '8%', left: '60%' },
    tracks: [
      { name: 'Live Forever', artist: 'Oasis', youtubeId: 'i_2mWhfOhGU', duration: 276 },
      { name: 'Supersonic', artist: 'Oasis', youtubeId: 'BJKpUH28nhg', duration: 283 },
      { name: 'Rock \'n\' Roll Star', artist: 'Oasis', youtubeId: 'nB8eG_2gX6k', duration: 323 },
      { name: 'Slide Away', artist: 'Oasis', youtubeId: 'TpqAUtzWDu8', duration: 392 }
    ]
  },
  oasisBottom: {
    id: 'oasisBottom',
    title: 'Oasis - Morning Glory',
    category: 'Stadium Rock (1995)',
    shortBio: 'Cultural juggernaut with over 22 million sales worldwide. Produced era-defining generational rock anthems.',
    anchor: { top: '32%', left: '60%' },
    tracks: [
      { name: 'Wonderwall', artist: 'Oasis', youtubeId: '6hzrDeceEKc', duration: 258 },
      { name: 'Don\'t Look Back in Anger', artist: 'Oasis', youtubeId: 'cmpRLQZkTb8', duration: 288 },
      { name: 'Champagne Supernova', artist: 'Oasis', youtubeId: 'tI-5uv4wryI', duration: 448 },
      { name: 'Stand by Me', artist: 'Oasis', youtubeId: 'maTP315XZCQ', duration: 356 }
    ]
  }
};

const FUNNY_GUY_QUOTES = [
  "Don't disturb, let me enjoy music 🎧",
  "Shh... I'm in the zone. Code is compiling in my dreams 💤",
  "One does not simply interrupt a programmer during a guitar solo 🎸",
  "Hey! I'm debugging with my eyes closed 😌",
  "404: Attention not found. Only vibes here ☕",
  "Five more minutes... the bass just dropped 🔥",
  "Just 1 more Lo-Fi track and I swear I'll fix that bug 🐛",
  "I'm not sleeping, I'm mentally refactoring the backend 🧠",
  "Can't talk right now, soaking in pure audio therapy ✨",
  "Please... my playlist is at the best part 🎵",
  "Guitar riffs > your meetings 🤘",
  "I'm in my flow state. Send snacks, not bugs 🍕"
];

export default function InteractiveBackdropHotspots({
  activeBackdrop,
  currentScene,
  onPlayTrack,
  roomBrightness = 1.0,
  onSetRoomBrightness,
  onToggleLamp
}) {
  const [clickedPoster, setClickedPoster] = useState(null);
  const [isPosterClosing, setIsPosterClosing] = useState(false);

  const [guyQuote, setGuyQuote] = useState(null);
  const [isGuyClosing, setIsGuyClosing] = useState(false);

  // 🎸 Guitar interactive state
  const [guitarNotes, setGuitarNotes] = useState([]);
  const [isGuitarVibrating, setIsGuitarVibrating] = useState(false);

  // Dynamic Scene Hotspots State (for AI generated & custom interactive themes)
  const [activeSpotBubble, setActiveSpotBubble] = useState(null);
  const [steamPuffs, setSteamPuffs] = useState([]);
  const [sceneNotes, setSceneNotes] = useState([]);
  const [showHotspotPins, setShowHotspotPins] = useState(true);
  const dynamicTimerRef = useRef(null);

  const customHotspots = Array.isArray(currentScene?.interactiveHotspots) ? currentScene.interactiveHotspots : [];
  const hasCustomHotspots = customHotspots.length > 0;
  const isCozyBedroom = !activeBackdrop || activeBackdrop.includes('cozy_bedroom');

  const handleDynamicSpotClick = (e, spot) => {
    e.stopPropagation();
    if (dynamicTimerRef.current) clearTimeout(dynamicTimerRef.current);

    if (spot.type === 'lamp') {
      const nextState = roomBrightness < 0.6;
      playLampSwitchSound(nextState);
      if (onToggleLamp) onToggleLamp();
      else if (onSetRoomBrightness) onSetRoomBrightness(nextState ? 1.0 : 0.35);

      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || '💡 Ambient lighting toggled',
        top: spot.top,
        left: spot.left
      });
    } else if (spot.type === 'coffee') {
      playCoffeeSipSound();
      const newPuff = { id: Date.now() + Math.random(), top: spot.top, left: spot.left };
      setSteamPuffs(prev => [...prev.slice(-3), newPuff]);
      setTimeout(() => setSteamPuffs(prev => prev.filter(p => p.id !== newPuff.id)), 2200);

      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || 'Freshly brewed warm coffee... soothing lo-fi fuel ☕',
        top: spot.top,
        left: spot.left
      });
    } else if (spot.type === 'music' || spot.type === 'guitar') {
      playGuitarSound();
      const symbols = ['♪', '♫', '♬', '♩', '🎶'];
      const newNote = {
        id: Date.now() + Math.random(),
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        top: spot.top,
        left: spot.left
      };
      setSceneNotes(prev => [...prev.slice(-4), newNote]);
      setTimeout(() => setSceneNotes(prev => prev.filter(n => n.id !== newNote.id)), 2000);

      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || 'Spinning analogue vinyl grooves... pure vibes 🎶',
        top: spot.top,
        left: spot.left
      });
    } else if (spot.type === 'window') {
      playRainChimeSound();
      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || 'Watching gentle raindrops cascade down the glass 🌧️✨',
        top: spot.top,
        left: spot.left
      });
    } else if (spot.type === 'companion') {
      playPeacefulLikeSound();
      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || 'Purring softly... totally immersed in the rhythm 🐾🎧',
        top: spot.top,
        left: spot.left
      });
    } else {
      playTingSound();
      setActiveSpotBubble({
        spotId: spot.id,
        text: spot.dialogue || `Interacted with ${spot.name}! ✨`,
        top: spot.top,
        left: spot.left
      });
    }

    dynamicTimerRef.current = setTimeout(() => {
      setActiveSpotBubble(null);
    }, 4000);
  };

  // 💻 Electronics Desk Zone (Monitors, Laptop, Keyboard) - Click to Open Social Dock
  const [isSocialDockOpen, setIsSocialDockOpen] = useState(false);
  const [isSocialDockClosing, setIsSocialDockClosing] = useState(false);
  const [dockCoords, setDockCoords] = useState({ x: 0, y: 0 });
  const [activeSocialId, setActiveSocialId] = useState(null);
  const [hoveredSocialId, setHoveredSocialId] = useState(null);
  const socialDockRef = useRef(null);

  const dismissSocialDock = useCallback(() => {
    if (!isSocialDockOpen || isSocialDockClosing) return;
    setIsSocialDockClosing(true);
    setTimeout(() => {
      setIsSocialDockOpen(false);
      setIsSocialDockClosing(false);
      setActiveSocialId(null);
      setHoveredSocialId(null);
    }, 220);
  }, [isSocialDockOpen, isSocialDockClosing]);

  const handleElectronicsClick = (e, targetSocialId = null) => {
    e.stopPropagation();
    if (isSocialDockOpen && !isSocialDockClosing) {
      if (targetSocialId && targetSocialId === activeSocialId) {
        dismissSocialDock();
        return;
      }
      if (targetSocialId) {
        setActiveSocialId(targetSocialId);
        return;
      }
      dismissSocialDock();
      return;
    }

    // Anchor dock nicely above clicked position
    const minX = 140;
    const maxX = window.innerWidth - 140;
    const clampedX = Math.min(maxX, Math.max(minX, e.clientX));
    let targetY = e.clientY - 46;
    if (targetY < 80) targetY = e.clientY + 42;

    setDockCoords({ x: clampedX, y: targetY });
    setActiveSocialId(targetSocialId || 'github');
    setIsSocialDockClosing(false);
    setIsSocialDockOpen(true);
    playTingSound();
  };

  // Close dock on outside click or Escape key
  useEffect(() => {
    if (!isSocialDockOpen) return;
    const handleClickOutside = (e) => {
      if (socialDockRef.current && !socialDockRef.current.contains(e.target)) {
        dismissSocialDock();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismissSocialDock();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSocialDockOpen, dismissSocialDock]);

  const handleOpenSocial = (e, url) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const lastQuoteIndexRef = useRef(-1);
  const posterDismissTimerRef = useRef(null);
  const guyTimerRef = useRef(null);
  const isPosterHoveredRef = useRef(false);
  const isCardHoveredRef = useRef(false);
  const cardRef = useRef(null);

  const handleGuitarClick = (e) => {
    e.stopPropagation();
    playGuitarSound();
    setIsGuitarVibrating(true);
    setTimeout(() => setIsGuitarVibrating(false), 450);

    const noteSymbols = ['♪', '♫', '♬', '♩', '🎶'];
    const newNote = {
      id: Date.now() + Math.random(),
      symbol: noteSymbols[Math.floor(Math.random() * noteSymbols.length)],
      offsetX: Math.floor(Math.random() * 24 - 12)
    };
    setGuitarNotes(prev => [...prev.slice(-4), newNote]);
    setTimeout(() => {
      setGuitarNotes(prev => prev.filter(n => n.id !== newNote.id));
    }, 1700);
  };

  const handleLampClick = (e) => {
    e.stopPropagation();
    const nextState = roomBrightness < 0.6;
    playLampSwitchSound(nextState);
    if (onToggleLamp) {
      onToggleLamp();
    } else if (onSetRoomBrightness) {
      onSetRoomBrightness(nextState ? 1.0 : 0.35);
    }
  };

  const clearGuyTimer = () => {
    if (guyTimerRef.current) {
      clearTimeout(guyTimerRef.current);
      guyTimerRef.current = null;
    }
  };

  const clearPosterDismissTimer = () => {
    if (posterDismissTimerRef.current) {
      clearTimeout(posterDismissTimerRef.current);
      posterDismissTimerRef.current = null;
    }
  };

  // Smoothly dismiss poster card
  const dismissPoster = () => {
    clearPosterDismissTimer();
    if (!clickedPoster) return;
    setIsPosterClosing(true);
    setTimeout(() => {
      setClickedPoster(null);
      setIsPosterClosing(false);
    }, 220);
  };

  // Check if cursor left both the poster and the floating info card
  const schedulePosterDismissCheck = () => {
    clearPosterDismissTimer();
    posterDismissTimerRef.current = setTimeout(() => {
      if (!isPosterHoveredRef.current && !isCardHoveredRef.current) {
        dismissPoster();
      }
    }, 260);
  };

  const handlePosterClick = (poster) => {
    clearPosterDismissTimer();
    if (clickedPoster?.id === poster.id) {
      dismissPoster();
    } else {
      setIsPosterClosing(false);
      setClickedPoster(poster);
      isPosterHoveredRef.current = true;
    }
  };

  const handlePosterMouseEnter = (poster) => {
    isPosterHoveredRef.current = true;
    clearPosterDismissTimer();
  };

  const handlePosterMouseLeave = () => {
    isPosterHoveredRef.current = false;
    schedulePosterDismissCheck();
  };

  const handleCardMouseEnter = () => {
    isCardHoveredRef.current = true;
    clearPosterDismissTimer();
  };

  const handleCardMouseLeave = () => {
    isCardHoveredRef.current = false;
    schedulePosterDismissCheck();
  };

  // Smoothly dismiss guy speech bubble
  const dismissGuy = () => {
    clearGuyTimer();
    if (!guyQuote) return;
    setIsGuyClosing(true);
    guyTimerRef.current = setTimeout(() => {
      setGuyQuote(null);
      setIsGuyClosing(false);
    }, 220);
  };

  const handleGuyMouseLeave = () => {
    clearGuyTimer();
    guyTimerRef.current = setTimeout(() => {
      dismissGuy();
    }, 320);
  };

  const handleGuyClick = (e) => {
    e.stopPropagation();
    clearGuyTimer();
    setIsGuyClosing(false);

    // Pick a fresh quote guaranteed to differ from previous
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * FUNNY_GUY_QUOTES.length);
    } while (nextIndex === lastQuoteIndexRef.current && FUNNY_GUY_QUOTES.length > 1);

    lastQuoteIndexRef.current = nextIndex;
    setGuyQuote(FUNNY_GUY_QUOTES[nextIndex]);

    // Auto-dismiss after 4.5 seconds
    guyTimerRef.current = setTimeout(() => {
      dismissGuy();
    }, 4500);
  };

  // Global mouse tracker: keep box as long as hovered on poster or box, dismiss if hovered elsewhere
  useEffect(() => {
    if (!guyQuote && !clickedPoster) return;

    let globalMoveTimer;
    const handleGlobalMouseMove = (e) => {
      // For Guy speech bubble
      if (guyQuote) {
        const isOverPerson = e.target.closest('.person-hotspot-zone');
        const isOverBubble = e.target.closest('.guy-speech-bubble');
        if (!isOverPerson && !isOverBubble) {
          clearTimeout(globalMoveTimer);
          globalMoveTimer = setTimeout(() => {
            dismissGuy();
          }, 180);
        }
      }

      // For Poster & Floating Info Box
      if (clickedPoster) {
        const isOverPoster = e.target.closest('.poster-hotspot-zone');
        const isOverCard = e.target.closest('.poster-floating-card');

        if (isOverPoster) isPosterHoveredRef.current = true;
        else isPosterHoveredRef.current = false;

        if (isOverCard) isCardHoveredRef.current = true;
        else isCardHoveredRef.current = false;

        if (!isOverPoster && !isOverCard) {
          clearTimeout(globalMoveTimer);
          globalMoveTimer = setTimeout(() => {
            if (!isPosterHoveredRef.current && !isCardHoveredRef.current) {
              dismissPoster();
            }
          }, 260);
        } else {
          clearTimeout(globalMoveTimer);
          clearPosterDismissTimer();
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      clearTimeout(globalMoveTimer);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [guyQuote, clickedPoster]);

  // Close when clicking outside
  useEffect(() => {
    if (!clickedPoster && !guyQuote) return;
    const handleOutsideClick = (e) => {
      if (
        cardRef.current && 
        !cardRef.current.contains(e.target) && 
        !e.target.closest('.poster-hotspot-zone')
      ) {
        dismissPoster();
      }
      if (!e.target.closest('.person-hotspot-zone') && !e.target.closest('.guy-speech-bubble')) {
        dismissGuy();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [clickedPoster, guyQuote]);

  // Show hotspots if cozy bedroom OR if active scene has custom hotspots
  if (!isCozyBedroom && !hasCustomHotspots) return null;

  return (
    <div className="interactive-hotspots-layer" aria-label="Interactive Room Hotspots">
      {/* 1. Cozy Bedroom Default Interactive Posters & Elements */}
      {isCozyBedroom && (
        <>
          {/* 1. Coldplay Poster Hotspot */}

      <button
        type="button"
        className="poster-hotspot-zone hotspot-coldplay"
        onMouseEnter={() => handlePosterMouseEnter(ROOM_POSTERS_DATA.coldplay)}
        onMouseLeave={handlePosterMouseLeave}
        onClick={() => handlePosterClick(ROOM_POSTERS_DATA.coldplay)}
        title="Coldplay - Click to view info & play songs"
      >
        <div className="hotspot-hover-card">
          <Disc size={13} className="spin-slow" />
          <span>Coldplay</span>
        </div>
      </button>

      {/* 2. Radiohead OK Computer Poster Hotspot */}
      <button
        type="button"
        className="poster-hotspot-zone hotspot-radiohead"
        onMouseEnter={() => handlePosterMouseEnter(ROOM_POSTERS_DATA.radiohead)}
        onMouseLeave={handlePosterMouseLeave}
        onClick={() => handlePosterClick(ROOM_POSTERS_DATA.radiohead)}
        title="Radiohead - Click to view info & play songs"
      >
        <div className="hotspot-hover-card">
          <Radio size={13} />
          <span>Radiohead</span>
        </div>
      </button>

      {/* 3. Oasis Top Poster Hotspot */}
      <button
        type="button"
        className="poster-hotspot-zone hotspot-oasis-top"
        onMouseEnter={() => handlePosterMouseEnter(ROOM_POSTERS_DATA.oasisTop)}
        onMouseLeave={handlePosterMouseLeave}
        onClick={() => handlePosterClick(ROOM_POSTERS_DATA.oasisTop)}
        title="Oasis - Click to view info & play songs"
      >
        <div className="hotspot-hover-card">
          <Music size={13} />
          <span>Oasis</span>
        </div>
      </button>

      {/* 4. Oasis Bottom Poster Hotspot */}
      <button
        type="button"
        className="poster-hotspot-zone hotspot-oasis-bottom"
        onMouseEnter={() => handlePosterMouseEnter(ROOM_POSTERS_DATA.oasisBottom)}
        onMouseLeave={handlePosterMouseLeave}
        onClick={() => handlePosterClick(ROOM_POSTERS_DATA.oasisBottom)}
        title="Oasis Live - Click to view info & play songs"
      >
        <div className="hotspot-hover-card">
          <Music size={13} />
          <span>Oasis Live</span>
        </div>
      </button>

      {/* 5. Resting Person with Headphones (No hover effect, fresh funny quotes on click) */}
      <button
        type="button"
        className="person-hotspot-zone"
        onClick={handleGuyClick}
        onMouseLeave={handleGuyMouseLeave}
        title="Resting Programmer"
      />

      {/* 6. Acoustic Guitar Hotspot (Gibson acoustic guitar on left wall - completely transparent and clean) */}
      <button
        type="button"
        id="hotspot-guitar"
        className={`guitar-hotspot-zone ${isGuitarVibrating ? 'guitar-vibrating' : ''}`}
        onClick={handleGuitarClick}
        title="Gibson Acoustic Guitar - Click to play guitar"
      />

      {/* Floating Guitar Musical Notes on Click */}
      {guitarNotes.map(n => (
        <span 
          key={n.id} 
          className="floating-guitar-note" 
          style={{ transform: `translateX(${n.offsetX}px)` }}
        >
          {n.symbol}
        </span>
      ))}

      {/* 7. Edison Lamp / Bulb on Desk Hotspot (Desk coordinates: left: 62.6%, top: 41.5%) - Direct brightness toggle with zero popups */}
      <button
        type="button"
        id="hotspot-edison-lamp"
        className={`lamp-hotspot-zone ${roomBrightness < 0.6 ? 'lamp-is-off' : 'lamp-is-on'}`}
        onClick={handleLampClick}
        title={roomBrightness < 0.6 ? "Edison Lamp - Click to turn on light" : "Edison Lamp - Click to dim light"}
      />

      {/* 💻 Entire Electronics Desk Zone (Left Monitor, Center Monitor, Laptop, Keyboard) - Click to Open */}
      <div
        className="electronics-desk-zone"
        onClick={(e) => handleElectronicsClick(e, null)}
        title="Developer Desk — Click to view social links"
      >
        {/* Invisible Click Targets for Screens */}
        <div
          className="screen-target screen-target-linkedin"
          onClick={(e) => handleElectronicsClick(e, 'linkedin')}
          title="Click to view LinkedIn"
        />
        <div
          className="screen-target screen-target-github"
          onClick={(e) => handleElectronicsClick(e, 'github')}
          title="Click to view GitHub"
        />
        <div
          className="screen-target screen-target-instagram"
          onClick={(e) => handleElectronicsClick(e, 'instagram')}
          title="Click to view Instagram"
        />
      </div>

      {/* Aesthetic Cyber-Glass Social Capsule (Pops only on click) */}
      {isSocialDockOpen && (
        <div 
          ref={socialDockRef}
          className={`developer-desk-social-bar is-visible ${isSocialDockClosing ? 'is-closing' : ''}`}
          style={{
            left: `${dockCoords.x}px`,
            top: `${dockCoords.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="social-bar-links">
            {CODING_MONITORS_DATA.map((item) => {
              const isFocused = (hoveredSocialId || activeSocialId) === item.id;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-bar-pill pill-${item.id} ${isFocused ? 'active' : ''}`}
                  onClick={(e) => handleOpenSocial(e, item.url)}
                  onMouseEnter={() => setHoveredSocialId(item.id)}
                  onMouseLeave={() => setHoveredSocialId(null)}
                  title={item.title}
                  aria-label={item.title}
                  style={{
                    '--pill-accent': item.themeColor
                  }}
                >
                  <span className="pill-icon-wrap">
                    {item.id === 'linkedin' && <LinkedInIcon size={19} />}
                    {item.id === 'github' && <GithubIcon size={20} />}
                    {item.id === 'instagram' && <InstagramIcon size={19} />}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Funny Speech Bubble for the Guy with Smooth Fade Animation */}
      {guyQuote && (
        <div 
          className={`guy-speech-bubble ${isGuyClosing ? 'is-closing' : ''}`}
          onMouseEnter={clearGuyTimer}
          onMouseLeave={handleGuyMouseLeave}
          onClick={dismissGuy}
        >
          <span className="guy-speech-text">{guyQuote}</span>
          <div className="guy-speech-tail" />
        </div>
      )}

      {/* Sleek Floating Glass Info Card beside Poster */}
      {clickedPoster && (
        <div 
          ref={cardRef}
          className={`poster-floating-card ${isPosterClosing ? 'is-closing' : ''}`}
          style={{
            top: clickedPoster.anchor?.top || '20%',
            left: clickedPoster.anchor?.left || '25%'
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="floating-card-header">
            <div className="floating-card-title-group">
              <span className="floating-card-tag">{clickedPoster.category}</span>
              <h4 className="floating-card-title">{clickedPoster.title}</h4>
            </div>
          </div>

          <p className="floating-card-bio">{clickedPoster.shortBio}</p>

          <div className="floating-card-songs-block">
            <span className="floating-songs-label">
              <Music2 size={12} /> Popular Hits (Click to play)
            </span>
            <div className="floating-songs-grid">
              {clickedPoster.tracks.map((track, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="floating-song-pill clickable"
                  onClick={() => onPlayTrack && onPlayTrack(track)}
                  title={`Play "${track.name}" by ${track.artist}`}
                >
                  <span className="pill-play-icon">
                    <Play size={11} fill="currentColor" />
                  </span>
                  <span className="pill-title">{track.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* 2. Dynamic Scene Hotspots (For AI Generated & Custom Interactive Themes) */}
      {hasCustomHotspots && showHotspotPins && (
        <div className="dynamic-hotspots-group">
          {customHotspots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={`dynamic-hotspot-pin spot-type-${spot.type}`}
              style={{ top: spot.top, left: spot.left }}
              onClick={(e) => handleDynamicSpotClick(e, spot)}
              title={`${spot.name} — ${spot.actionHint || 'Click to interact'}`}
            >
              <div className="dynamic-hotspot-beacon" />
              <div className="dynamic-hotspot-icon-inner">
                {spot.type === 'lamp' && <Lightbulb size={15} />}
                {spot.type === 'coffee' && <Coffee size={15} />}
                {(spot.type === 'music' || spot.type === 'guitar') && <Music size={15} />}
                {spot.type === 'window' && <CloudRain size={15} />}
                {spot.type === 'companion' && <Heart size={15} />}
                {spot.type === 'neon' && <Zap size={15} />}
                {!['lamp', 'coffee', 'music', 'guitar', 'window', 'companion', 'neon'].includes(spot.type) && <Sparkles size={15} />}
              </div>
              <span className="dynamic-hotspot-tooltip">{spot.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Steam Puffs for Coffee */}
      {steamPuffs.map(puff => (
        <div 
          key={puff.id} 
          className="steam-puff-anim"
          style={{ top: `calc(${puff.top} - 24px)`, left: `calc(${puff.left} + 6px)` }}
        >
          <span className="steam-wav-1">~</span>
          <span className="steam-wav-2">~</span>
        </div>
      ))}

      {/* Floating Musical Notes for Turntable */}
      {sceneNotes.map(n => (
        <div 
          key={n.id} 
          className="floating-musical-note-anim"
          style={{ top: `calc(${n.top} - 18px)`, left: `calc(${n.left} + 6px)` }}
        >
          {n.symbol}
        </div>
      ))}

      {/* Dynamic Interactive Speech / Thought Bubble */}
      {activeSpotBubble && (
        <div 
          className="dynamic-speech-bubble"
          style={{ 
            top: `calc(${activeSpotBubble.top} - 62px)`, 
            left: activeSpotBubble.left 
          }}
          onClick={(e) => { e.stopPropagation(); setActiveSpotBubble(null); }}
        >
          <Sparkles size={13} className="bubble-sparkle-icon" />
          <span>{activeSpotBubble.text}</span>
          <div className="dynamic-bubble-tail" />
        </div>
      )}

      {/* Subtle Hotspots ON/OFF Badge for live scenes */}
      {hasCustomHotspots && (
        <button
          type="button"
          className="dynamic-hotspots-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowHotspotPins(!showHotspotPins);
            playTingSound();
          }}
          title={showHotspotPins ? "Hide Interactive Markers" : "Show Interactive Markers"}
        >
          {showHotspotPins ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{showHotspotPins ? "Interactive: ON" : "Interactive: OFF"}</span>
        </button>
      )}
    </div>
  );
}

