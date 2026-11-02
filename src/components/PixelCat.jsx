import React, { useEffect, useRef, useCallback } from 'react';
import { playPopCatSound } from '../utils/audioSynth';
import '../styles/pixelCat.css';

// -----------------------------------------------------------------------------
// Pure Black & White Realistic Pixel Cat & Pop Cat Sprites
//
// 1. Cat 1 (Resting / Walking / Play):
//    Faithful recreation of the user's sitting cat pixel art (Image 1)
//    pointed ears, cute face, body with legs, and upright curved tail.
//
// 2. Cat 2 (Pop Cat Open Mouth):
//    Faithful recreation of the Pop Cat meme (Image 2) with ears back,
//    squinted happy eyes, and giant circular open "O" mouth.
//
// Legend:
// . = transparent
// 1 = pure black (#111111)
// 2 = pure white (#ffffff)
// - = closed eye line (#111111)
// -----------------------------------------------------------------------------

const SPRITES = {
  // Image 1: Sitting cat with upright tail (21 x 21)
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

  // Image 1: Blinking frame
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

  // Walking Frame 1
  walk1: [
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
    '....121.1221.12211...',
    '....121.1221..121....',
    '.....11..111..11.....'
  ],

  // Walking Frame 2
  walk2: [
    '...1......1..........',
    '..121....121.........',
    '..1221..12221........',
    '..12221122221........',
    '..12222222221........',
    '..12222222221........',
    '..12222222221........',
    '.1212221222221.......',
    '.12122212222221...11.',
    '12222222222221...1221',
    '.122222222221....1221',
    '..122222222221..1221.',
    '...111222222221.1221.',
    '...121222222221.1221.',
    '...12222222222211221.',
    '....1222222222221221.',
    '....122222222222121..',
    '....12222222222211...',
    '....121221.12221.....',
    '....121221..1221.....',
    '.....11111...111.....'
  ],

  // Walking Frame 3
  walk3: [
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
    '...1221.121.12211....',
    '...1221.121..121.....',
    '....111..11...11.....'
  ],

  // Image 2: Pop Cat Open Mouth meme (28 rows x 29 cols)
  popcat: [
    '........................11...',
    '.......................1221..',
    '.1111.................122221.',
    '122221...............1222221.',
    '1222221.............12222221.',
    '1222222111111111111122222221.',
    '1222222222222222222222222221.',
    '1222222222222222222222111221.',
    '1222222222221112222222222221.',
    '1222222222211222222222222221.',
    '1222222222222222111111112221.',
    '1222222222122221111111111221.',
    '1222222222222211111111111121.',
    '1222222222222111111111111111.',
    '1222222222221111111111111111.',
    '1222222222212111111111111111.',
    '1222222222212111111111111111.',
    '1222222222212111111111111111.',
    '1222222222212111111111111111.',
    '1222222222212211111111111121.',
    '1222222222221221111111111121.',
    '1222222222221222211111121221.',
    '1222222222222112222222212221.',
    '1222222222222221122221122221.',
    '1222222222222222211112222221.',
    '1222222222222222222222222221.',
    '1222122222222222222222222221.',
    '1111111111111111111111111111.'
  ]
};

export default function PixelCat() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const popTimeoutRef = useRef(null);

  // Simulation state
  const simRef = useRef({
    x: 60,
    targetX: 60,
    speed: 1.0,
    facing: 1, // 1 = right, -1 = left
    frameIndex: 0,
    tick: 0,
    blinkTick: 0,
    catAction: 'idle', // 'idle' | 'walking'
    isPopped: false,
    yarn: {
      x: 210,
      y: 64,
      vx: 0,
      targetX: null
    },
    particles: []
  });

  // Action: Trigger Pop Cat Open Mouth & Meme Sound
  const handlePop = useCallback((targetSpotX = null) => {
    const sim = simRef.current;
    sim.isPopped = true;
    playPopCatSound();

    // Spawn retro "POP!" floating indicator
    sim.particles.push({
      x: sim.x + (sim.facing === 1 ? 16 : 4),
      y: 20,
      text: 'POP!',
      life: 38,
      maxLife: 38,
      vy: -0.9
    });

    // If user clicked the floor away from the cat, also roll the toy ball
    if (targetSpotX !== null) {
      const canvas = canvasRef.current;
      if (canvas) {
        const destX = Math.max(25, Math.min(canvas.width - 40, targetSpotX));
        sim.yarn.vx = (destX - sim.yarn.x) * 0.085;
        sim.yarn.targetX = destX;
        sim.targetX = destX + (sim.x < destX ? -30 : 30);
        sim.catAction = 'walking';
      }
    }

    // Keep popped for at least 220ms so it is clearly seen on quick taps
    if (popTimeoutRef.current) {
      clearTimeout(popTimeoutRef.current);
    }
    popTimeoutRef.current = setTimeout(() => {
      if (!isPointerDownRef.current) {
        sim.isPopped = false;
      }
    }, 220);
  }, []);

  // Pointer Down (Tap / Click start)
  const handlePointerDown = (e) => {
    isPointerDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    handlePop(clickY > 44 ? clickX : null);
  };

  // Pointer Up (Tap / Click release)
  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    setTimeout(() => {
      if (!isPointerDownRef.current) {
        simRef.current.isPopped = false;
      }
    }, 120);
  };

  // Main Canvas Render Loop
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
      sim.yarn.y = 64;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      sim.tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Subtle minimal ground line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 68, canvas.width, 1);

      // 2. Behavioral AI decision loop (when not popped)
      if (!sim.isPopped && sim.tick % 180 === 0 && !sim.yarn.targetX) {
        const rand = Math.random();
        if (rand < 0.5) {
          // Wander across the room
          const wanderX = 35 + Math.random() * (canvas.width - 90);
          sim.targetX = wanderX;
          sim.catAction = 'walking';
        } else if (rand < 0.85) {
          // Sit & look around
          sim.catAction = 'idle';
        } else {
          // Gently roll the toy ball
          const destX = sim.x > canvas.width / 2 ? 40 + Math.random() * 50 : canvas.width - 80 - Math.random() * 50;
          sim.yarn.vx = (destX - sim.yarn.x) * 0.08;
          sim.yarn.targetX = destX;
          sim.targetX = destX + (sim.x < destX ? -30 : 30);
          sim.catAction = 'walking';
        }
      }

      // 3. Movement Physics
      const distToTarget = sim.targetX - sim.x;
      if (!sim.isPopped && Math.abs(distToTarget) > 3 && (sim.catAction === 'walking' || sim.yarn.targetX)) {
        sim.facing = distToTarget > 0 ? 1 : -1;
        sim.x += (distToTarget > 0 ? 1 : -1) * sim.speed;
        if (sim.tick % 7 === 0) {
          sim.frameIndex = (sim.frameIndex + 1) % 4;
        }
      } else {
        if (sim.catAction === 'walking') {
          if (sim.yarn.targetX) {
            sim.yarn.targetX = null;
            sim.yarn.vx = (sim.facing === 1 ? 1 : -1) * (2.2 + Math.random() * 1.5);
            setTimeout(() => {
              sim.catAction = 'idle';
            }, 1200);
          } else {
            sim.catAction = 'idle';
          }
        }
      }

      // 4. Toy Ball Physics
      if (Math.abs(sim.yarn.vx) > 0.04) {
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

      // 5. Draw Black & White Pixel Toy Ball
      // Trailing thread
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sim.yarn.x - 12, 67);
      ctx.lineTo(sim.yarn.x - 6, 65);
      ctx.lineTo(sim.yarn.x, 66);
      ctx.stroke();

      // Ball: pure white core with black outline
      const yx = Math.round(sim.yarn.x);
      const yy = 64;
      ctx.fillStyle = '#111111';
      ctx.fillRect(yx - 4, yy - 5, 8, 10);
      ctx.fillRect(yx - 5, yy - 4, 10, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(yx - 3, yy - 4, 6, 8);
      ctx.fillRect(yx - 4, yy - 3, 8, 6);
      // Black winding line pattern
      ctx.fillStyle = '#111111';
      ctx.fillRect(yx - 2, yy - 2, 4, 1);
      ctx.fillRect(yx - 1, yy, 3, 1);
      ctx.fillRect(yx - 2, yy + 2, 4, 1);

      // 6. Select Sprite
      let spriteKey = 'sit';
      let pixelSize = 2.4;

      if (sim.isPopped) {
        spriteKey = 'popcat';
        pixelSize = 1.8; // 28 rows * 1.8 = 50.4px height, exact match with 21 rows * 2.4 = 50.4px
      } else if (sim.catAction === 'walking') {
        const walkFrames = ['walk1', 'walk2', 'walk3', 'walk2'];
        spriteKey = walkFrames[sim.frameIndex] || 'walk1';
        pixelSize = 2.4;
      } else {
        if (sim.tick % 110 === 0) {
          sim.blinkTick = 12;
        }
        if (sim.blinkTick > 0) {
          sim.blinkTick--;
          spriteKey = 'sitBlink';
        } else {
          spriteKey = 'sit';
        }
        pixelSize = 2.4;
      }

      const spriteData = SPRITES[spriteKey] || SPRITES.sit;
      const spriteH = spriteData.length;
      const spriteW = Math.max(...spriteData.map(r => r.length));

      ctx.save();
      const catDrawX = Math.round(sim.x);
      const catDrawY = Math.round(68 - spriteH * pixelSize);

      if (sim.facing === -1) {
        ctx.translate(catDrawX + spriteW * pixelSize, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(catDrawX, 0);
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

      // 7. Floating Black/White "POP!" Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.y += p.vy;
        p.life--;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 13px "Courier New", monospace';
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
      if (popTimeoutRef.current) clearTimeout(popTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      className="vinyl-pixel-cat-section" 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title="Tap cat to Pop! • Click floor to roll toy"
    >
      <canvas ref={canvasRef} className="vinyl-pixel-cat-canvas" />
    </div>
  );
}
