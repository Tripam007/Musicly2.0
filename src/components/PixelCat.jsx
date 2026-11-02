import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Heart, Music, Moon, Sun, Disc } from 'lucide-react';
import { playCatSound, playClickSound } from '../utils/audioSynth';
import '../styles/pixelCat.css';

// -------------------------------------------------------------
// Pixel Art Matrices (Width: 20-22, Height: 14)
// Legend:
// . = transparent
// 1 = outline (soft charcoal/brown)
// 2 = main fur
// 3 = belly / secondary fur / chest
// 4 = inner ear (pink)
// 5 = eye (dark)
// 6 = nose / mouth (pink)
// 7 = blush cheek (soft coral)
// 8 = headphone ear cup (amber / gold)
// 9 = headphone band (silver)
// - = closed sleeping eye
// -------------------------------------------------------------
const SPRITES = {
  sit: [
    '....................',
    '..11.........11.....',
    '.1441.......1441....',
    '.122111111111221....',
    '12222222222222221...',
    '12522222222252221...',
    '12222226222222221...',
    '.122222222222221....',
    '.122333333333221....',
    '12223333333332221...',
    '12223333333332221..1',
    '12222222222222221.121',
    '.1222222222222211221',
    '..11111111111111111.'
  ],
  sitBlink: [
    '....................',
    '..11.........11.....',
    '.1441.......1441....',
    '.122111111111221....',
    '12222222222222221...',
    '12-222222222-2221...',
    '12222226222222221...',
    '.122222222222221....',
    '.122333333333221....',
    '12223333333332221...',
    '12223333333332221..1',
    '12222222222222221.121',
    '.1222222222222211221',
    '..11111111111111111.'
  ],
  walk1: [
    '....................',
    '...11.........11....',
    '..1441.......1441...',
    '..122111111111221...',
    '.12222222222222221..',
    '.12522222222252221..',
    '.12222226222222221..',
    '..122222222222221...',
    '.1222233333333221.1.',
    '12222233333333222121',
    '12222222222222222121',
    '.121112222211122111.',
    '.121..121.121..121..',
    '.111..111.111..111..'
  ],
  walk2: [
    '....................',
    '...11.........11....',
    '..1441.......1441...',
    '..122111111111221...',
    '.12222222222222221..',
    '.12522222222252221..',
    '.12222226222222221..',
    '..122222222222221...',
    '.1222233333333221.11',
    '12222233333333222121',
    '12222222222222222121',
    '..11112222211111111.',
    '..121.121..121.121..',
    '..111.111..111.111..'
  ],
  sleep: [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '..11.........11.....',
    '.1441.......1441....',
    '.122111111111221....',
    '12222222222222221...',
    '12-222222222-2221...',
    '12222226222222221.11',
    '.1223333333322221121',
    '..12222222222222221.',
    '...111111111111111..'
  ],
  play: [
    '....................',
    '..11.........11.....',
    '.1441.......1441....',
    '.122111111111221....',
    '12222222222222221...',
    '12522222222252221...',
    '12222226222222221...',
    '.122222222222221....',
    '.122333333333221.11.',
    '12223333333332221221',
    '1222222222222222111.',
    '.112111111111211....',
    '..121......121......',
    '..111......111......'
  ],
  vibe: [
    '.....99999999.......',
    '...9119....9119.....',
    '..84489....98448....',
    '..82281111118228....',
    '.8222822222282228...',
    '.8252822222285228...',
    '..122222622222221...',
    '..122222222222221...',
    '..122333333333221...',
    '.12223333333332221..',
    '.12223333333332221.1',
    '.12222222222222221121',
    '..1222222222222211221',
    '...11111111111111111'
  ]
};

// Breeds & Fur Palettes
const BREEDS = {
  mochi: {
    name: 'Mochi (White)',
    outline: '#2b2622',
    main: '#ffffff',
    accent: '#f2eee9',
    ear: '#fca5b3',
    eye: '#3878b4',
    nose: '#f4728d',
    blush: '#fecdd3'
  },
  ginger: {
    name: 'Mikan (Orange)',
    outline: '#2b2622',
    main: '#f59e0b',
    accent: '#fef3c7',
    ear: '#fca5b3',
    eye: '#3d2514',
    nose: '#f4728d',
    blush: '#fed7aa'
  },
  calico: {
    name: 'Boba (Calico)',
    outline: '#2b2622',
    main: '#faf8f5',
    accent: '#ea8a46',
    ear: '#fca5b3',
    eye: '#2e7d32',
    nose: '#f4728d',
    blush: '#fecdd3'
  },
  kuro: {
    name: 'Kuro (Black)',
    outline: '#16141a',
    main: '#2a2833',
    accent: '#474457',
    ear: '#f87171',
    eye: '#4ade80',
    nose: '#f4728d',
    blush: '#f87171'
  }
};

export default function PixelCat({ isPlaying = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // User Breed Selection
  const [selectedBreed, setSelectedBreed] = useState(() => {
    try {
      return localStorage.getItem('musicly_cat_breed') || 'calico';
    } catch {
      return 'calico';
    }
  });

  // Cat State Management
  const [catAction, setCatAction] = useState('idle'); // 'idle' | 'walking' | 'sleeping' | 'playing' | 'vibe'
  const [statusMessage, setStatusMessage] = useState('Chilling by the turntable');
  const [isSleeping, setIsSleeping] = useState(false);

  // Simulation physics & positions
  const simRef = useRef({
    x: 80,
    targetX: 80,
    speed: 1.1,
    facing: 1, // 1 = right, -1 = left
    frameIndex: 0,
    tick: 0,
    blinkTick: 0,
    isBlinking: false,
    vibeBeat: 0,
    yarn: {
      x: 220,
      y: 72,
      vx: 0,
      targetX: null,
      color: '#fb7185'
    },
    treat: null, // { x, y, life }
    particles: [] // { x, y, text, life, maxLife, vy, vx, color }
  });

  // Switch Cat Breed
  const handleSelectBreed = (key) => {
    setSelectedBreed(key);
    try {
      localStorage.setItem('musicly_cat_breed', key);
    } catch {}
    playClickSound('light');
    triggerHeartBubble();
  };

  // Helper: Trigger floating hearts or text particles
  const triggerHeartBubble = useCallback((text = '❤️', color = '#ef4444') => {
    const sim = simRef.current;
    sim.particles.push({
      x: sim.x + (sim.facing === 1 ? 24 : -4) + (Math.random() * 8 - 4),
      y: 42,
      text,
      life: 50,
      maxLife: 50,
      vy: -0.7 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      color
    });
  }, []);

  // Action: Pet Cat
  const handlePetCat = useCallback(() => {
    playCatSound(0);
    setIsSleeping(false);
    setCatAction('idle');
    setStatusMessage('Purring warmly...');
    triggerHeartBubble('❤️', '#ef4444');
    triggerHeartBubble('✨', '#ffd166');
  }, [triggerHeartBubble]);

  // Action: Toss Yarn Ball
  const handleTossYarn = useCallback((targetSpotX = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;

    setIsSleeping(false);
    playClickSound('light');

    const destX = targetSpotX !== null 
      ? Math.max(30, Math.min(canvas.width - 40, targetSpotX))
      : (sim.x > canvas.width / 2 ? 50 + Math.random() * 60 : canvas.width - 100 - Math.random() * 60);

    sim.yarn.vx = (destX - sim.yarn.x) * 0.08;
    sim.yarn.targetX = destX;
    sim.targetX = destX + (sim.x < destX ? -26 : 26);
    setCatAction('walking');
    setStatusMessage('Pouncing after yarn!');
  }, []);

  // Action: Give Treat
  const handleGiveTreat = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;

    setIsSleeping(false);
    playClickSound('light');

    const dropX = Math.max(30, Math.min(canvas.width - 40, sim.x + (sim.facing === 1 ? 90 : -90)));
    sim.treat = { x: dropX, y: 74, life: 180 };
    sim.targetX = dropX + (sim.x < dropX ? -22 : 22);
    setCatAction('walking');
    setStatusMessage('Sniffing out a yummy treat!');
  }, []);

  // Action: Toggle Sleep / Wake
  const handleToggleSleep = useCallback(() => {
    setIsSleeping(prev => {
      const next = !prev;
      playClickSound('light');
      if (next) {
        setCatAction('sleeping');
        setStatusMessage('Taking a cozy catnap...');
        triggerHeartBubble('💤', '#94a3b8');
      } else {
        setCatAction('idle');
        setStatusMessage('Woke up & ready to play!');
        playCatSound(0);
        triggerHeartBubble('✨', '#ffd166');
      }
      return next;
    });
  }, [triggerHeartBubble]);

  // Handle Canvas Click: Click cat to pet, or click floor to roll yarn
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const sim = simRef.current;
    const catBox = {
      x: sim.x - 10,
      y: 35,
      w: 60,
      h: 45
    };

    if (
      clickX >= catBox.x && 
      clickX <= catBox.x + catBox.w && 
      clickY >= catBox.y && 
      clickY <= catBox.y + catBox.h
    ) {
      handlePetCat();
    } else {
      handleTossYarn(clickX);
    }
  };

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let animId;
    const sim = simRef.current;

    // Resize canvas cleanly to match container width
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 360;
      canvas.width = Math.max(320, width);
      canvas.height = 92;
      ctx.imageSmoothingEnabled = false;
      sim.yarn.y = 72;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      sim.tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Minimalist Studio Floor / Rug Strip
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 78, canvas.width, 2);

      // Subtle woven rug in center-left
      ctx.fillStyle = 'rgba(212, 210, 203, 0.45)';
      ctx.fillRect(36, 76, 120, 4);
      ctx.fillStyle = 'rgba(180, 176, 166, 0.35)';
      for (let rx = 40; rx < 150; rx += 8) {
        ctx.fillRect(rx, 75, 4, 6);
      }

      // 2. Behavioral AI decision loop (every ~120-180 frames)
      if (!isSleeping && sim.tick % 160 === 0 && !sim.treat && !sim.yarn.targetX) {
        if (isPlaying) {
          setCatAction('vibe');
          setStatusMessage('Grooving to the vinyl record ♪');
          if (Math.random() < 0.4) {
            triggerHeartBubble('♪', '#f59e0b');
          }
        } else {
          const rand = Math.random();
          if (rand < 0.4) {
            // Pick a new wander spot
            const wanderX = 40 + Math.random() * (canvas.width - 90);
            sim.targetX = wanderX;
            setCatAction('walking');
            setStatusMessage('Strolling around the room');
          } else if (rand < 0.7) {
            setCatAction('idle');
            setStatusMessage('Watching the record spin');
          } else {
            // Play with yarn
            handleTossYarn();
          }
        }
      }

      // If playing music and not sleeping, vibe occasionally
      if (isPlaying && !isSleeping && catAction !== 'walking' && Math.random() < 0.015) {
        triggerHeartBubble(Math.random() > 0.5 ? '♪' : '♫', '#f59e0b');
      }

      // 3. Cat Movement Physics
      const distToTarget = sim.targetX - sim.x;
      if (Math.abs(distToTarget) > 3 && (catAction === 'walking' || sim.yarn.targetX || sim.treat)) {
        sim.facing = distToTarget > 0 ? 1 : -1;
        sim.x += (distToTarget > 0 ? 1 : -1) * sim.speed;
        if (sim.tick % 8 === 0) {
          sim.frameIndex = (sim.frameIndex + 1) % 4;
        }
      } else {
        if (catAction === 'walking') {
          // Reached destination!
          if (sim.treat) {
            // Eat treat!
            sim.treat = null;
            setCatAction('play');
            setStatusMessage('Munching treat *nom nom*');
            playCatSound(0);
            triggerHeartBubble('✨', '#ffd166');
            setTimeout(() => setCatAction('idle'), 2400);
          } else if (sim.yarn.targetX) {
            // Bat yarn ball!
            sim.yarn.targetX = null;
            sim.yarn.vx = (sim.facing === 1 ? 1 : -1) * (2.2 + Math.random() * 1.5);
            setCatAction('play');
            setStatusMessage('Patted the yarn ball!');
            setTimeout(() => setCatAction('idle'), 1800);
          } else {
            setCatAction('idle');
          }
        }
      }

      // 4. Yarn Physics
      if (Math.abs(sim.yarn.vx) > 0.05) {
        sim.yarn.x += sim.yarn.vx;
        sim.yarn.vx *= 0.94; // friction
        if (sim.yarn.x < 15) {
          sim.yarn.x = 15;
          sim.yarn.vx = -sim.yarn.vx * 0.7;
        } else if (sim.yarn.x > canvas.width - 25) {
          sim.yarn.x = canvas.width - 25;
          sim.yarn.vx = -sim.yarn.vx * 0.7;
        }
      }

      // 5. Draw Yarn Ball & Trail Thread
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sim.yarn.x - 14, 76);
      ctx.quadraticCurveTo(sim.yarn.x - 7, 72, sim.yarn.x, 75);
      ctx.stroke();

      // Yarn ball circle
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(sim.yarn.x, 74, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(sim.yarn.x - 1.5, 72.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // 6. Draw Treat if Present
      if (sim.treat) {
        sim.treat.life--;
        ctx.fillStyle = '#38bdf8';
        // Cute pixel fish shape
        const tx = sim.treat.x;
        const ty = 74;
        ctx.fillRect(tx, ty, 6, 4);
        ctx.fillRect(tx + 6, ty - 1, 2, 6);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(tx + 2, ty + 1, 1, 1); // eye
      }

      // 7. Select Sprite Matrix for Current Cat State
      let spriteKey = 'sit';
      if (isSleeping) {
        spriteKey = 'sleep';
      } else if (catAction === 'walking') {
        spriteKey = sim.frameIndex % 2 === 0 ? 'walk1' : 'walk2';
      } else if (catAction === 'play') {
        spriteKey = 'play';
      } else if (catAction === 'vibe' || (isPlaying && catAction === 'idle')) {
        spriteKey = 'vibe';
      } else {
        // Blinking logic during sit/idle
        if (sim.tick % 90 === 0) {
          sim.isBlinking = true;
          sim.blinkTick = 10;
        }
        if (sim.blinkTick > 0) {
          sim.blinkTick--;
          spriteKey = 'sitBlink';
        } else {
          spriteKey = 'sit';
        }
      }

      const spriteData = SPRITES[spriteKey] || SPRITES.sit;
      const breed = BREEDS[selectedBreed] || BREEDS.calico;
      const pixelSize = 2.7;

      // 8. Render Pixel Matrix
      ctx.save();
      const catDrawX = Math.round(sim.x);
      const catDrawY = Math.round(isSleeping ? 46 : 41);

      if (sim.facing === -1) {
        ctx.translate(catDrawX + 48, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(catDrawX, 0);
      }

      // Draw subtle cat shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.ellipse(24, 76, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let r = 0; r < spriteData.length; r++) {
        const row = spriteData[r];
        for (let c = 0; c < row.length; c++) {
          const char = row[c];
          if (char === '.') continue;

          let color = '#2b2622';
          if (char === '1') color = breed.outline;
          else if (char === '2') color = breed.main;
          else if (char === '3') color = breed.accent;
          else if (char === '4') color = breed.ear;
          else if (char === '5') color = breed.eye;
          else if (char === '6') color = breed.nose;
          else if (char === '7') color = breed.blush;
          else if (char === '8') color = '#f59e0b'; // retro yellow headphone
          else if (char === '9') color = '#94a3b8'; // silver band
          else if (char === '-') color = breed.outline;

          ctx.fillStyle = color;
          ctx.fillRect(c * pixelSize, catDrawY + r * pixelSize, pixelSize, pixelSize);
        }
      }
      ctx.restore();

      // 9. Floating Particles (Hearts, Music Notes, ZZZ)
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = p.color || '#ef4444';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();

        if (p.life <= 0) {
          sim.particles.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, isSleeping, selectedBreed, catAction, handlePetCat, handleTossYarn]);

  return (
    <div className="vinyl-pixel-cat-section" ref={containerRef}>
      {/* Cat Lounge Header */}
      <div className="vinyl-pixel-cat-header">
        <div className="vinyl-pixel-cat-title-wrap">
          <span className="vinyl-cat-dot-pulse" />
          <span className="vinyl-pixel-cat-name">
            {BREEDS[selectedBreed]?.name.split(' ')[0].toUpperCase()}
          </span>
          <span className="vinyl-pixel-cat-status">{statusMessage}</span>
        </div>

        {/* Breed Selector Pills */}
        <div className="vinyl-cat-breed-pills">
          {Object.entries(BREEDS).map(([key, b]) => (
            <button
              key={key}
              type="button"
              className={`vinyl-cat-breed-btn ${selectedBreed === key ? 'is-active' : ''}`}
              onClick={() => handleSelectBreed(key)}
              title={`Switch to ${b.name}`}
            >
              {key === 'mochi' && '⚪'}
              {key === 'ginger' && '🟠'}
              {key === 'kuro' && '⚫'}
              {key === 'calico' && '🎨'}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Cat Canvas Area */}
      <div 
        className="vinyl-pixel-cat-stage" 
        onClick={handleCanvasClick}
        title="Click the cat to pet or click floor to roll the yarn ball!"
      >
        <canvas ref={canvasRef} className="vinyl-pixel-cat-canvas" />
      </div>

      {/* Cute Minimal Toolbar Controls */}
      <div className="vinyl-pixel-cat-toolbar">
        <button
          type="button"
          className="vinyl-cat-tool-btn"
          onClick={handlePetCat}
          title="Pet your cat"
        >
          <Heart size={13} fill="#f43f5e" color="#f43f5e" />
          <span>Pet</span>
        </button>

        <button
          type="button"
          className="vinyl-cat-tool-btn"
          onClick={() => handleTossYarn()}
          title="Toss the yarn ball across the floor"
        >
          <span>🧶 Toss Yarn</span>
        </button>

        <button
          type="button"
          className="vinyl-cat-tool-btn"
          onClick={handleGiveTreat}
          title="Give a delicious fish treat"
        >
          <span>🐟 Treat</span>
        </button>

        <button
          type="button"
          className={`vinyl-cat-tool-btn ${isSleeping ? 'is-active' : ''}`}
          onClick={handleToggleSleep}
          title={isSleeping ? 'Wake up' : 'Take a cozy catnap'}
        >
          {isSleeping ? <Sun size={13} /> : <Moon size={13} />}
          <span>{isSleeping ? 'Wake' : 'Nap'}</span>
        </button>
      </div>
    </div>
  );
}
