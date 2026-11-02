import React, { useEffect, useRef, useCallback } from 'react';
import { playCatSound } from '../utils/audioSynth';
import '../styles/pixelCat.css';

// -------------------------------------------------------------
// Pure Black & White Realistic Pixel Cat Sprites
// Natural feline anatomy: distinct head, pointed ears with inner ear,
// almond eyes with pupils, nose, whiskers, 4 realistic legs with paws,
// and an elegant curved tail.
//
// Legend:
// . = transparent
// 1 = pure black (#111111)
// 2 = pure white (#ffffff)
// - = closed sleeping/blinking eye line (#111111)
// -------------------------------------------------------------
const SPRITES = {
  sit: [
    '..........................',
    '....11..............11....',
    '...1221............1221...',
    '...12221111111111112221...',
    '..1222222222222222222221..',
    '..1222222222222222222221..',
    '..1221122222222222211221..',
    '.122211222211222222112221.',
    '11122222221111222222222111',
    '..12222222211222222222221..',
    '...1122222222222222222211..',
    '....1222222222222222221....',
    '...122222222222222222221...',
    '..12222222222222222222221..',
    '..12221222211222212222221..1',
    '..1221.1221..1221.1222221.121',
    '..1221.1221..1221.12222211221',
    '..1221.1221..1221..1222221221',
    '.12221.1221..1221...111111221',
    '.11111.1111..1111........1111'
  ],
  sitBlink: [
    '..........................',
    '....11..............11....',
    '...1221............1221...',
    '...12221111111111112221...',
    '..1222222222222222222221..',
    '..1222222222222222222221..',
    '..122--222222222222--221..',
    '.1222--222211222222--2221.',
    '11122222221111222222222111',
    '..12222222211222222222221..',
    '...1122222222222222222211..',
    '....1222222222222222221....',
    '...122222222222222222221...',
    '..12222222222222222222221..',
    '..12221222211222212222221..1',
    '..1221.1221..1221.1222221.121',
    '..1221.1221..1221.12222211221',
    '..1221.1221..1221..1222221221',
    '.12221.1221..1221...111111221',
    '.11111.1111..1111........1111'
  ],
  walk1: [
    '............................',
    '...11.....11................',
    '..1221...1221...............',
    '..12221112221...............',
    '.1222222222211111111111.....',
    '.12222222222222222222221....',
    '.121122222222222222222221...',
    '11211222112222222222222211..',
    '112222222222222222222222121.',
    '.11122222222222222222222121.',
    '...112222222222222222222121.',
    '....122211221.122211222121..',
    '...12221..1221.12221111121..',
    '..12221...1221..12221.121...',
    '..1221....1221...1221.11....',
    '..1111....1111...1111.......'
  ],
  walk2: [
    '............................',
    '...11.....11................',
    '..1221...1221...............',
    '..12221112221...............',
    '.1222222222211111111111.....',
    '.12222222222222222222221....',
    '.121122222222222222222221.1.',
    '1121122211222222222222221121',
    '1122222222222222222222221221',
    '.11122222222222222222222121.',
    '...112222222222222222222121.',
    '....1111222221111111111111..',
    '....1221.1221.1221.1221.....',
    '....1221.1221.1221.1221.....',
    '...1221..1221..1221.1221....',
    '...1111..1111..1111.1111....'
  ],
  walk3: [
    '............................',
    '...11.....11................',
    '..1221...1221...............',
    '..12221112221...............',
    '.1222222222211111111111.....',
    '.12222222222222222222221....',
    '.121122222222222222222221...',
    '11211222112222222222222211..',
    '112222222222222222222222121.',
    '.11122222222222222222222121.',
    '...112222222222222222222121.',
    '....1222112221..12211222121.',
    '....1221..12221.1221.111121.',
    '...1221....1221.1221...121..',
    '...1221.....1221.1221..11...',
    '...1111.....1111.1111.......'
  ],
  sleep: [
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '....11..............11....',
    '...1221............1221...',
    '...12221111111111112221...',
    '..1222222222222222222221..',
    '..122--222222222222--221..',
    '.1222--222211222222--2221.',
    '11122222221111222222222111',
    '..12222222222222222222221.',
    '..12222222222222222222221.',
    '..12222222222222222222221.',
    '..122222222222222222222111',
    '..122222222222222222221121',
    '..111111111111111111111221',
    '.......................111'
  ],
  play: [
    '..........................',
    '....11..............11....',
    '...1221............1221...',
    '...12221111111111112221...',
    '..1222222222222222222221..',
    '..1221122222222222211221..',
    '.122211222211222222112221.',
    '11122222221111222222222111',
    '..12222222211222222222221..',
    '...1122222222222222222211..',
    '....1222222222222222221.11.',
    '...122222222222222222211221',
    '..122222222222222222222111.',
    '..1222122221122221222221...',
    '..112211111111111122111....',
    '...1221..........1221......',
    '..1221............1221.....',
    '..111..............111....'
  ]
};

export default function PixelCat({ isPlaying = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Simulation physics & positions
  const simRef = useRef({
    x: 60,
    targetX: 60,
    speed: 1.0,
    facing: 1, // 1 = right, -1 = left
    frameIndex: 0,
    tick: 0,
    blinkTick: 0,
    isBlinking: false,
    catAction: 'idle', // 'idle' | 'walking' | 'sleeping' | 'playing'
    isSleeping: false,
    yarn: {
      x: 200,
      y: 64,
      vx: 0,
      targetX: null
    },
    particles: [] // floating B&W hearts or zzz
  });

  // Action: Pet Cat (plays purr audio & floats monochrome heart)
  const handlePetCat = useCallback(() => {
    const sim = simRef.current;
    sim.isSleeping = false;
    sim.catAction = 'idle';
    playCatSound(0);

    sim.particles.push({
      x: sim.x + (sim.facing === 1 ? 28 : 2),
      y: 30,
      text: '♥',
      life: 45,
      maxLife: 45,
      vy: -0.8
    });
  }, []);

  // Action: Toss Yarn / Ball Toy
  const handleTossToy = useCallback((targetSpotX = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;

    sim.isSleeping = false;

    const destX = targetSpotX !== null 
      ? Math.max(25, Math.min(canvas.width - 40, targetSpotX))
      : (sim.x > canvas.width / 2 ? 40 + Math.random() * 50 : canvas.width - 80 - Math.random() * 50);

    sim.yarn.vx = (destX - sim.yarn.x) * 0.085;
    sim.yarn.targetX = destX;
    sim.targetX = destX + (sim.x < destX ? -30 : 30);
    sim.catAction = 'walking';
  }, []);

  // Click on box: click cat to pet, click floor to toss toy
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const sim = simRef.current;
    const catBox = {
      x: sim.x - 10,
      y: 20,
      w: 68,
      h: 52
    };

    if (
      clickX >= catBox.x && 
      clickX <= catBox.x + catBox.w && 
      clickY >= catBox.y && 
      clickY <= catBox.y + catBox.h
    ) {
      handlePetCat();
    } else {
      handleTossToy(clickX);
    }
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.fillRect(0, 68, canvas.width, 1);

      // 2. Behavioral AI decision loop
      if (!sim.isSleeping && sim.tick % 180 === 0 && !sim.yarn.targetX) {
        const rand = Math.random();
        if (rand < 0.45) {
          // Wander across the room
          const wanderX = 35 + Math.random() * (canvas.width - 90);
          sim.targetX = wanderX;
          sim.catAction = 'walking';
        } else if (rand < 0.8) {
          // Sit & look around
          sim.catAction = 'idle';
        } else {
          // Play with toy
          handleTossToy();
        }
      }

      // 3. Movement Physics
      const distToTarget = sim.targetX - sim.x;
      if (Math.abs(distToTarget) > 3 && (sim.catAction === 'walking' || sim.yarn.targetX)) {
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
            sim.catAction = 'play';
            setTimeout(() => {
              sim.catAction = 'idle';
            }, 1800);
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

      // Ball: white circle with black outline and pixel texture
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
      if (sim.isSleeping) {
        spriteKey = 'sleep';
      } else if (sim.catAction === 'walking') {
        const walkFrames = ['walk1', 'walk2', 'walk3', 'walk2'];
        spriteKey = walkFrames[sim.frameIndex] || 'walk1';
      } else if (sim.catAction === 'play') {
        spriteKey = 'play';
      } else {
        if (sim.tick % 110 === 0) {
          sim.isBlinking = true;
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
      const pixelSize = 2.3;
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

      // 7. Floating Black/White Particles (Hearts, ZZZ)
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.y += p.vy;
        p.life--;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 13px monospace';
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
    };
  }, [handleTossToy]);

  return (
    <div 
      className="vinyl-pixel-cat-section" 
      ref={containerRef}
      onClick={handleCanvasClick}
      title="Click cat to pet • Click floor to roll toy"
    >
      <canvas ref={canvasRef} className="vinyl-pixel-cat-canvas" />
    </div>
  );
}
