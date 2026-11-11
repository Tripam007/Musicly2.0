import React, { useEffect, useRef, useCallback, useState } from 'react';
import { playMeowSound, playPurrSound, preloadCatAudio } from '../utils/audioSynth';
import '../styles/pixelCat.css';

// -----------------------------------------------------------------------------
// Pure Black & White Realistic Pixel Cat with 4-Legged Walk, Meow/Purr & Draggable Toy
//
// 1. Directional Alignment:
//    The pixel art cat naturally faces left in its base sprite (head on left, tail on right).
//    When heading right, it is flipped horizontally (scaleX(-1)) so its head points right.
//    When heading left, it is rendered unflipped so its head points left.
//    When idle, it watches the toy and turns its head toward wherever the toy is placed.
//
// 2. Interactive Toy:
//    The pixel toy ball/mouse can be dragged anywhere and placed accordingly.
//    The kitty tracks the toy with its head while being dragged, and curiously
//    walks over to inspect it once placed.
//
// 3. Meow & Purr Sound System:
//    - Single click on kitty: authentic charming cat Meow sound with mouth open.
//    - Continuous clicks (rapid successive taps): soothing rhythmic velvety Purr
//      with happy squinting eyes and chest vibration.
// -----------------------------------------------------------------------------

const SPRITES = {
  // Sitting kitty (21 x 21) - Head on left (col 1-7), tail on right (col 14-20)
  sit: [
    '...1......1..........',
    '..121....121.........',
    '..1221..12221........',
    '..12221122221........',
    '..12222222221........',
    '..12222222221........',
    '..12222222221........',
    '.1212221222221.......',
    '.12122212222221..11..',
    '12222222222221..1221.',
    '.122222222221...12221',
    '..122222222221...1221',
    '...111222222221..1221',
    '...121222222221..1221',
    '...1222222222221.1221',
    '....1222222222221221.',
    '....1222222222221221.',
    '....122222222222121..',
    '....12122122222211...',
    '....121221222221.....',
    '.....1111111111......'
  ],

  // Sitting kitty blinking / purring happy squint (21 x 21)
  sitBlink: [
    '...1......1..........',
    '..121....121.........',
    '..1221..12221........',
    '..12221122221........',
    '..12222222221........',
    '..12222222221........',
    '..12222222221........',
    '.12-222-222221.......',
    '.12-222-2222221..11..',
    '12222222222221..1221.',
    '.122222222221...12221',
    '..122222222221...1221',
    '...111222222221..1221',
    '...121222222221..1221',
    '...1222222222221.1221',
    '....1222222222221221.',
    '....1222222222221221.',
    '....122222222222121..',
    '....12122122222211...',
    '....121221222221.....',
    '.....1111111111......'
  ],

  // Meow mouth open fitted onto sitting kitty (21 x 21)
  pop: [
    '...1......1..........',
    '..121....121.........',
    '..1221..12221........',
    '..12221122221........',
    '..12222222221........',
    '..12222222221........',
    '..12222222221........',
    '.1211121112221.......',
    '.12211112222221..11..',
    '12211111122221..1221.',
    '.121111111221...12221',
    '..121111112221...1221',
    '..1211111122221..1221',
    '...111111222221..1221',
    '...1222222222221.1221',
    '....1222222222221221.',
    '....1222222222221221.',
    '....122222222222121..',
    '....12122122222211...',
    '....121221222221.....',
    '.....1111111111......'
  ],

  // 4-Legged Walk: Step 1 (Left forward, Right back) (26 x 21)
  walk1: [
    '..1......1................',
    '.121....121...............',
    '.1221..12221..............',
    '.122211222211111111.......',
    '.1222222222222222221......',
    '.12222222222222222221.....',
    '.122222222222222222221....',
    '1212221222222222222221.11.',
    '12122212222222222222211221',
    '12222222222222222222211221',
    '.122222222222222222221.121',
    '..12222222222222222221.121',
    '...1122222222222222221.121',
    '....12222222222222221..121',
    '....1222222222222221..1221',
    '..1221..1221..1221..1221..',
    '.1221...1221..1221...1221.',
    '.1221...1221..1221...1221.',
    '.1221...1221..1221...1221.',
    '.1221...1221..1221...1221.',
    '.1111...1111..1111...1111.'
  ],

  // 4-Legged Walk: Step 2 (Passing pose, vertical paws) (26 x 21)
  walk2: [
    '..1......1................',
    '.121....121...............',
    '.1221..12221..............',
    '.122211222211111111.......',
    '.1222222222222222221......',
    '.12222222222222222221.....',
    '.122222222222222222221....',
    '1212221222222222222221.11.',
    '12122212222222222222211221',
    '12222222222222222222211221',
    '.122222222222222222221.121',
    '..12222222222222222221.121',
    '...1122222222222222221.121',
    '....12222222222222221..121',
    '....1222222222222221..1221',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1111..1111..1111..1111.'
  ],

  // 4-Legged Walk: Step 3 (Right forward, Left back) (26 x 21)
  walk3: [
    '..1......1................',
    '.121....121...............',
    '.1221..12221..............',
    '.122211222211111111.......',
    '.1222222222222222221......',
    '.12222222222222222221.....',
    '.122222222222222222221....',
    '1212221222222222222221.11.',
    '12122212222222222222211221',
    '12222222222222222222211221',
    '.122222222222222222221.121',
    '..12222222222222222221.121',
    '...1122222222222222221.121',
    '....12222222222222221..121',
    '....1222222222222221..1221',
    '...1221..1221..1221..1221.',
    '...1221.1221...1221.1221..',
    '...1221.1221...1221.1221..',
    '...1221.1221...1221.1221..',
    '...1221.1221...1221.1221..',
    '...1111.1111...1111.1111..'
  ],

  // Meow mouth open while walking (26 x 21)
  popWalk: [
    '..1......1................',
    '.121....121...............',
    '.1221..12221..............',
    '.122211222211111111.......',
    '.1222222222222222221......',
    '.12222222222222222221.....',
    '.122222222222222222221....',
    '1211121112222222222221.11.',
    '12211112222222222222211221',
    '12211111122222222222211221',
    '.1211111112222222222211221',
    '..12111111222222222221.121',
    '...1111112222222222221.121',
    '....12222222222222221..121',
    '....1222222222222221..1221',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1221..1221..1221..1221.',
    '...1111..1111..1111..1111.'
  ]
};

export default function PixelCat() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Interaction tracking refs
  const isDraggingToyRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const clickTimestampsRef = useRef([]);
  const meowTimeoutRef = useRef(null);
  const purrTimeoutRef = useRef(null);
  const [cursorStyle, setCursorStyle] = useState('default');

  // Simulation physics & positions
  const simRef = useRef({
    x: 170,
    targetX: 170,
    speed: 1.15,
    facing: -1, // 1 = right, -1 = left (sprite naturally faces left)
    frameIndex: 0,
    tick: 0,
    blinkTick: 0,
    catAction: 'idle', // 'idle' | 'walking'
    isMeowing: false,
    isPurring: false,
    yarn: {
      x: 48,
      y: 64,
      vx: 0,
      targetX: null
    },
    particles: []
  });

  // Action: Trigger Meow Sound & Mouth Open
  const handleMeow = useCallback(() => {
    const sim = simRef.current;
    sim.isMeowing = true;
    playMeowSound();

    const meowPhrases = ['Meow~', 'Mrow~', 'Nya~', 'Meoow!'];
    const phrase = meowPhrases[Math.floor(Math.random() * meowPhrases.length)];

    sim.particles.push({
      x: sim.x + (sim.facing === 1 ? 26 : 8),
      y: 22,
      text: phrase,
      life: 38,
      maxLife: 38,
      vy: -0.92
    });

    if (meowTimeoutRef.current) clearTimeout(meowTimeoutRef.current);
    meowTimeoutRef.current = setTimeout(() => {
      sim.isMeowing = false;
    }, 380);
  }, []);

  // Action: Trigger Purr Sound & Velvety Flutter
  const handlePurr = useCallback(() => {
    const sim = simRef.current;
    sim.isPurring = true;
    sim.isMeowing = false;
    playPurrSound();

    const purrPhrases = ['~purr~ 💕', 'purrrrr~', '♥ purr ♥', 'purr ♪'];
    const phrase = purrPhrases[Math.floor(Math.random() * purrPhrases.length)];

    sim.particles.push({
      x: sim.x + (sim.facing === 1 ? 28 : 10),
      y: 18,
      text: phrase,
      life: 52,
      maxLife: 52,
      vy: -0.72
    });

    if (purrTimeoutRef.current) clearTimeout(purrTimeoutRef.current);
    purrTimeoutRef.current = setTimeout(() => {
      sim.isPurring = false;
    }, 1800);
  }, []);

  // Pointer Down (Handle dragging toy or clicking kitty)
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const sim = simRef.current;

    // 1. Check if clicking on the Toy (Hit radius: ~22px)
    const distToToy = Math.hypot(clickX - sim.yarn.x, clickY - sim.yarn.y);
    if (distToToy <= 22) {
      isDraggingToyRef.current = true;
      dragOffsetRef.current = {
        x: clickX - sim.yarn.x,
        y: clickY - sim.yarn.y
      };
      sim.yarn.vx = 0;
      sim.yarn.targetX = null;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch (_) {}
      setCursorStyle('grabbing');
      return;
    }

    // 2. Check if clicking on the Kitty (Generous, responsive hit box)
    const isCatHit = clickX >= sim.x - 18 && clickX <= sim.x + 72 && clickY >= 8 && clickY <= 76;
    if (isCatHit) {
      const now = Date.now();
      // Keep click timestamps within the last 1500ms
      clickTimestampsRef.current = clickTimestampsRef.current.filter(t => now - t < 1500);
      clickTimestampsRef.current.push(now);
      const clickCount = clickTimestampsRef.current.length;

      if (clickCount >= 3) {
        // Continuous clicking detected -> Purr!
        handlePurr();
      } else {
        // Single tap or start of tapping -> Meow!
        handleMeow();
      }
      return;
    }

    // 3. Clicked floor area: Cat looks and steps toward clicked location
    if (clickY > 40) {
      const destX = Math.max(35, Math.min(canvas.width - 60, clickX));
      sim.targetX = destX;
      sim.catAction = 'walking';
      sim.facing = destX >= sim.x ? 1 : -1;
    }
  };

  // Pointer Move (Drag toy & update cursor)
  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const sim = simRef.current;

    if (isDraggingToyRef.current) {
      // Place toy accordingly clamped inside canvas bounds
      const newX = Math.max(16, Math.min(canvas.width - 20, mouseX - dragOffsetRef.current.x));
      const newY = Math.max(20, Math.min(64, mouseY - dragOffsetRef.current.y));
      sim.yarn.x = newX;
      sim.yarn.y = newY;
      sim.yarn.vx = 0;

      // Kitty's head turns to watch the toy while it is being dragged
      sim.facing = sim.yarn.x >= sim.x ? 1 : -1;
      return;
    }

    // Hover detection for responsive cursor feedback
    const distToToy = Math.hypot(mouseX - sim.yarn.x, mouseY - sim.yarn.y);
    if (distToToy <= 20) {
      setCursorStyle('grab');
    } else if (mouseX >= sim.x - 12 && mouseX <= sim.x + 64 && mouseY >= 14 && mouseY <= 72) {
      setCursorStyle('pointer');
    } else {
      setCursorStyle('default');
    }
  };

  // Pointer Up / Release (Finish dragging and settle toy)
  const handlePointerUp = (e) => {
    if (isDraggingToyRef.current) {
      isDraggingToyRef.current = false;
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      setCursorStyle('grab');

      const sim = simRef.current;
      // Toy rests cleanly on the floor at the user-chosen spot
      sim.yarn.y = 64;
      sim.yarn.vx = 0;
      sim.yarn.targetX = null;

      // Kitty notices the placed toy! Head turns to look at it
      sim.facing = sim.yarn.x >= sim.x ? 1 : -1;

      // If placed more than 35px away, walk over to play with it
      const dist = Math.abs(sim.yarn.x - sim.x);
      if (dist > 35) {
        sim.targetX = sim.yarn.x + (sim.x < sim.yarn.x ? -35 : 35);
        sim.catAction = 'walking';
      }
    }
  };

  // Preload authentic cat audio buffer on mount so clicks trigger 0ms instantaneously
  useEffect(() => {
    preloadCatAudio();
  }, []);

  // Main Canvas Animation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    let animId;
    const sim = simRef.current;

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 360;
      canvas.width = Math.max(300, width);
      canvas.height = 76;
      ctx.imageSmoothingEnabled = false;
      if (!isDraggingToyRef.current) {
        sim.yarn.y = 64;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      sim.tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Subtle minimal ground line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 68, canvas.width, 1);

      // 2. Behavioral AI decision loop (when idle and not dragging)
      if (!sim.isMeowing && !sim.isPurring && !isDraggingToyRef.current && sim.tick % 190 === 0 && !sim.yarn.targetX) {
        const rand = Math.random();
        if (rand < 0.45) {
          // Wander across the room
          const wanderX = 35 + Math.random() * (canvas.width - 95);
          sim.targetX = wanderX;
          sim.catAction = 'walking';
        } else if (rand < 0.8) {
          // Sit & look toward toy
          sim.catAction = 'idle';
          sim.facing = sim.yarn.x >= sim.x ? 1 : -1;
        } else {
          // Playfully nudge the toy ball
          const destX = sim.x > canvas.width / 2 ? 40 + Math.random() * 50 : canvas.width - 80 - Math.random() * 50;
          sim.yarn.vx = (destX - sim.yarn.x) * 0.07;
          sim.yarn.targetX = destX;
          sim.targetX = destX + (sim.x < destX ? -35 : 35);
          sim.catAction = 'walking';
        }
      }

      // 3. Movement Physics & Head Direction Flip
      const distToTarget = sim.targetX - sim.x;
      if (!sim.isMeowing && Math.abs(distToTarget) > 3 && (sim.catAction === 'walking' || sim.yarn.targetX)) {
        // Head turns towards the side it is heading to:
        // distToTarget > 0 means moving right -> facing = 1
        // distToTarget < 0 means moving left -> facing = -1
        sim.facing = distToTarget > 0 ? 1 : -1;
        sim.x += sim.facing * sim.speed;

        if (sim.tick % 6 === 0) {
          sim.frameIndex = (sim.frameIndex + 1) % 4;
        }
      } else {
        if (sim.catAction === 'walking') {
          if (sim.yarn.targetX) {
            sim.yarn.targetX = null;
            sim.yarn.vx = (sim.facing === 1 ? 1 : -1) * (2.0 + Math.random() * 1.2);
            setTimeout(() => {
              sim.catAction = 'idle';
            }, 1000);
          } else {
            sim.catAction = 'idle';
          }
        }
        // When idle, keep head turned toward toy if nearby or placed
        if (!isDraggingToyRef.current && Math.abs(sim.yarn.x - sim.x) > 15) {
          sim.facing = sim.yarn.x >= sim.x ? 1 : -1;
        }
      }

      // 4. Toy Physics (When rolled or drifting)
      if (!isDraggingToyRef.current && Math.abs(sim.yarn.vx) > 0.04) {
        sim.yarn.x += sim.yarn.vx;
        sim.yarn.vx *= 0.94;
        if (sim.yarn.x < 15) {
          sim.yarn.x = 15;
          sim.yarn.vx = -sim.yarn.vx * 0.7;
        } else if (sim.yarn.x > canvas.width - 25) {
          sim.yarn.x = canvas.width - 25;
          sim.yarn.vx = -sim.yarn.vx * 0.7;
        }
      }

      // 5. Draw Black & White Pixel Toy
      const yx = Math.round(sim.yarn.x);
      const yy = Math.round(sim.yarn.y);

      // Playful trailing string connecting to ground or following movement
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.max(6, yx - 14), 67);
      ctx.quadraticCurveTo(yx - 7, (yy + 67) / 2 + 1, yx - 4, yy + 1);
      ctx.stroke();

      // Pixel Toy Body (mouse/bell cassette aesthetic)
      ctx.fillStyle = '#111111';
      ctx.fillRect(yx - 5, yy - 5, 10, 10);
      ctx.fillRect(yx - 6, yy - 4, 12, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(yx - 4, yy - 4, 8, 8);
      ctx.fillRect(yx - 5, yy - 3, 10, 6);
      ctx.fillStyle = '#111111';
      ctx.fillRect(yx - 2, yy - 2, 4, 1);
      ctx.fillRect(yx - 1, yy, 3, 1);
      ctx.fillRect(yx - 2, yy + 2, 4, 1);

      // 6. Select Cat Sprite
      let spriteKey = 'sit';
      const pixelSize = 2.4;

      if (sim.isMeowing) {
        // Meow mouth open
        spriteKey = sim.catAction === 'walking' ? 'popWalk' : 'pop';
      } else if (sim.isPurring) {
        // Soothing squint eyes while purring
        spriteKey = 'sitBlink';
      } else if (sim.catAction === 'walking') {
        const walkCycle = ['walk1', 'walk2', 'walk3', 'walk2'];
        spriteKey = walkCycle[sim.frameIndex] || 'walk1';
      } else {
        if (sim.tick % 115 === 0) {
          sim.blinkTick = 12;
        }
        if (sim.blinkTick > 0) {
          sim.blinkTick--;
          spriteKey = 'sitBlink';
        } else {
          spriteKey = 'sit';
        }
      }

      const spriteData = SPRITES[spriteKey] || SPRITES.sit;
      const spriteH = spriteData.length; // 21
      const spriteW = spriteData[0].length; // 21 or 26

      ctx.save();
      const catDrawX = Math.round(sim.x);
      // Gentle purring chest vibration tremolo when purring
      const purrJitterY = sim.isPurring ? Math.sin(sim.tick * 0.9) * 0.6 : 0;
      const catDrawY = Math.round(68 - spriteH * pixelSize + purrJitterY);

      // -----------------------------------------------------------------------
      // HEAD DIRECTION TRANSFORMATION:
      // In SPRITES, col 0 is the face (left) and col 20/25 is the tail (right).
      // When heading right (facing === 1): flip horizontally so head points right.
      // When heading left (facing === -1): render unflipped so head points left.
      // -----------------------------------------------------------------------
      if (sim.facing === 1) {
        ctx.translate(catDrawX + spriteW * pixelSize, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(catDrawX, 0);
        ctx.scale(1, 1);
      }

      // Pure Black & White Pixel Rendering
      for (let r = 0; r < spriteData.length; r++) {
        const row = spriteData[r];
        for (let c = 0; c < row.length; c++) {
          const char = row[c];
          if (char === '.') continue;

          let color = '#ffffff';
          if (char === '1' || char === '-') {
            color = '#111111'; // Pure Black
          } else if (char === '2') {
            color = '#ffffff'; // Pure White
          }

          ctx.fillStyle = color;
          ctx.fillRect(c * pixelSize, catDrawY + r * pixelSize, pixelSize, pixelSize);
        }
      }
      ctx.restore();

      // 7. Floating Text Particles (Meow / Purr / Hearts)
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.y += p.vy;
        p.life--;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#111111';
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
      if (meowTimeoutRef.current) clearTimeout(meowTimeoutRef.current);
      if (purrTimeoutRef.current) clearTimeout(purrTimeoutRef.current);
    };
  }, [handleMeow, handlePurr]);

  return (
    <div
      className="vinyl-pixel-cat-section"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: cursorStyle }}
      title="Click kitty to Meow • Pet continuously to Purr • Drag toy anywhere to play"
    >
      <canvas ref={canvasRef} className="vinyl-pixel-cat-canvas" />
    </div>
  );
}
