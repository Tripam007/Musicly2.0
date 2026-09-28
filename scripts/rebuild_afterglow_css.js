import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cssPath = path.join(__dirname, '..', 'src', 'index.css');
let content = fs.readFileSync(cssPath, 'utf8');

const marker = '/* =========================================================================\r\n   AFTERGLOW CINEMATIC FILM';
const markerLF = '/* =========================================================================\n   AFTERGLOW CINEMATIC FILM';

let idx = content.indexOf(marker);
if (idx === -1) idx = content.indexOf(markerLF);

if (idx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}

const baseContent = content.slice(0, idx);

const newCss = `/* =========================================================================
   AFTERGLOW CINEMATIC MUSIC JOURNEY — MASTER REBUILD SPECIFICATION
   (Clean, GPU-Accelerated, Zero Cards, Zero Boxes, Pure Film Experience)
   ========================================================================= */

.afterglow-master-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: #020408;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  color: #fff;
  font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* =========================================================================
   PHASE A: AFTERGLOW HERO INTRO & EDITORIAL GENRE SELECTION
   ========================================================================= */

.afterglow-intro-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 10;
}

.afterglow-hero-photo-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform, filter;
  pointer-events: none;
}

.afterglow-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.afterglow-macro-eye-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 15;
  pointer-events: none;
  will-change: transform, opacity, filter;
}

.afterglow-macro-eye-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.afterglow-pupil-vortex-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 16;
  pointer-events: none;
  will-change: transform, opacity;
}

.afterglow-pupil-vortex-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.afterglow-droplets-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  pointer-events: none;
}

/* Floating Editorial Intro Typography (Zero boxes, zero cards) */
.afterglow-intro-editorial-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.afterglow-intro-header-block {
  position: absolute;
  top: 22%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.afterglow-editorial-title {
  font-size: clamp(3.2rem, 7.5vw, 6.8rem);
  font-weight: 200;
  letter-spacing: 0.38em;
  color: rgba(255, 255, 255, 0.96);
  margin: 0;
  padding: 0;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.25), 0 0 80px rgba(245, 158, 11, 0.15);
}

.afterglow-editorial-subtitle {
  font-size: clamp(0.72rem, 1.2vw, 0.95rem);
  letter-spacing: 0.52em;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 10px;
  font-weight: 300;
}

.afterglow-genres-floating-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.afterglow-genre-float-btn {
  position: absolute;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: clamp(0.92rem, 1.7vw, 1.45rem);
  letter-spacing: 0.32em;
  font-weight: 300;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
  white-space: nowrap;
  pointer-events: auto;
}

.afterglow-genre-float-btn:hover {
  color: #ffffff;
  letter-spacing: 0.44em;
  font-weight: 400;
  transform: translate(-50%, -50%) scale(1.12);
}

.afterglow-genre-float-btn.active-selected {
  color: #fbbf24;
  letter-spacing: 0.48em;
  font-weight: 500;
  text-shadow: 0 0 24px rgba(251, 191, 36, 0.7);
}

.afterglow-genre-float-btn.sibling-dimmed {
  opacity: 0.22;
  filter: blur(0.6px);
}

.afterglow-genre-hover-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  filter: blur(28px);
  opacity: 0.55;
  z-index: -1;
  pointer-events: none;
}

.afterglow-intro-bottom-prompt {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.64rem;
  letter-spacing: 0.36em;
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

/* =========================================================================
   PHASE B: WHITE EXPOSURE & BLOOM FLASH
   ========================================================================= */

.afterglow-white-exposure-screen {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: #ffffff;
  pointer-events: none;
  will-change: opacity;
  box-shadow: inset 0 0 120px rgba(255, 255, 255, 0.9);
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

/* =========================================================================
   PHASE C: INITIAL CAR REVEAL (1-Second Breathing Room)
   ========================================================================= */

.afterglow-car-reveal-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: opacity 0.8s ease-out;
}

.afterglow-reveal-editorial-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.afterglow-reveal-genre-title {
  font-size: clamp(2.8rem, 6.5vw, 5.5rem);
  letter-spacing: 0.42em;
  font-weight: 200;
  color: #fef08a;
  text-shadow: 0 0 50px rgba(251, 191, 36, 0.55);
}

.afterglow-reveal-line {
  width: 54px;
  height: 1px;
  background: rgba(255, 255, 255, 0.35);
  margin: 18px 0;
}

.afterglow-reveal-sub-quote {
  font-size: clamp(0.72rem, 1.2vw, 0.92rem);
  letter-spacing: 0.48em;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 300;
}

/* =========================================================================
   PHASE D: CAR WORLD & CINEMATIC 7-LAYER FORWARD TRAVEL
   ========================================================================= */

.afterglow-car-world-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  background: #03060a;
  z-index: 5;
  transition: filter 0.8s ease;
}

.afterglow-car-layer-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.afterglow-car-hd-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.afterglow-portal-sunbeam-layer {
  position: absolute;
  width: 220px;
  height: 220px;
  pointer-events: none;
  z-index: 3;
  will-change: transform, filter;
}

.afterglow-sunbeam-core {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 215, 150, 0.45) 45%, transparent 75%);
  filter: blur(12px);
}

.afterglow-road-perspective-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 6;
  pointer-events: none;
}

.afterglow-f1-car-anchor {
  position: absolute;
  pointer-events: none;
  z-index: 7;
  will-change: transform;
}

.afterglow-fia-rain-light {
  width: 13px;
  height: 20px;
  background: #ff2222;
  border-radius: 2px;
  box-shadow: 0 0 16px #ff0000, 0 0 32px rgba(255, 0, 0, 0.85);
  animation: fiaRainLightPulse 0.26s infinite alternate;
}

@keyframes fiaRainLightPulse {
  0% { opacity: 0.65; transform: scale(0.96); }
  100% { opacity: 1.0; transform: scale(1.08); }
}

.afterglow-particles-3d-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 8;
  pointer-events: none;
}

.afterglow-environment-mood-glow {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  mix-blend-mode: screen;
  transition: background 0.8s ease;
}

/* =========================================================================
   PHASE E: ONE-SONG-AT-A-TIME DISCOVERY & EDITORIAL TYPOGRAPHY
   ========================================================================= */

.afterglow-journey-music-overlay {
  position: absolute;
  inset: 0;
  z-index: 35;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 6vw 7vw;
}

.afterglow-floating-song-block {
  max-width: 580px;
  margin-bottom: 22px;
  pointer-events: auto;
}

.afterglow-song-indicator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 10px;
  font-weight: 400;
}

.afterglow-song-genre-tag {
  color: #fbbf24;
  font-weight: 600;
}

.afterglow-indicator-divider {
  color: rgba(255, 255, 255, 0.2);
}

.afterglow-song-count {
  color: rgba(255, 255, 255, 0.65);
}

.afterglow-editorial-song-title {
  font-size: clamp(1.8rem, 3.2vw, 3.2rem);
  font-weight: 300;
  letter-spacing: 0.04em;
  color: #ffffff;
  margin: 0 0 6px 0;
  line-height: 1.15;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85);
}

.afterglow-editorial-song-artist {
  font-size: 0.92rem;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 300;
  margin: 0 0 12px 0;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
}

.afterglow-destination-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.64rem;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.afterglow-dest-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* =========================================================================
   PART 12: THE ROAD BECOMES THE WAVEFORM
   ========================================================================= */

.afterglow-road-waveform-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(540px, 90vw);
  margin-bottom: 20px;
  pointer-events: auto;
}

.afterglow-waveform-time {
  font-size: 0.70rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
  font-weight: 300;
}

.afterglow-interactive-road-waveform {
  flex: 1;
  height: 32px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
}

.afterglow-waveform-road-axis {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
}

.afterglow-waveform-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.afterglow-waveform-playhead {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  pointer-events: none;
  box-shadow: 0 0 10px #fbbf24;
}

/* Transport Controls */
.afterglow-minimal-transport-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  pointer-events: auto;
}

.afterglow-trans-btn {
  background: transparent;
  border: none;
  padding: 6px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  outline: none;
}

.afterglow-trans-btn:hover {
  color: #fff;
  transform: scale(1.1);
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
}

.afterglow-trans-btn.is-fav {
  color: #f43f5e;
}

.afterglow-play-btn-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  outline: none;
}

.afterglow-play-btn-circle:hover {
  background: rgba(255, 255, 255, 0.26);
  border-color: rgba(255, 255, 255, 0.65);
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.play-icon-offset {
  margin-left: 2px;
}

.afterglow-scroll-drive-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.58rem;
  letter-spacing: 0.36em;
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.afterglow-scroll-indicator-line {
  width: 24px;
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  animation: scrollLinePulse 2s infinite ease-in-out;
}

@keyframes scrollLinePulse {
  0%, 100% { opacity: 0.2; transform: scaleX(0.7); }
  50% { opacity: 0.7; transform: scaleX(1.3); }
}

/* =========================================================================
   PHASE F: FLOATING TOP NAVIGATION
   ========================================================================= */

.afterglow-cinematic-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 38px;
  pointer-events: auto;
}

.afterglow-header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.82rem;
  letter-spacing: 0.32em;
  font-weight: 400;
  color: #fff;
}

.brand-primary {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.brand-sep {
  color: rgba(255, 255, 255, 0.25);
}

.brand-secondary {
  color: rgba(255, 255, 255, 0.65);
}

.brand-genre-pill {
  font-size: 0.65rem;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #fef08a;
  letter-spacing: 0.2em;
  font-weight: 500;
}

.afterglow-header-nav {
  display: flex;
  align-items: center;
  gap: 22px;
}

.afterglow-nav-item {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.24em;
  cursor: pointer;
  padding: 6px 4px;
  transition: all 0.25s ease;
  outline: none;
}

.afterglow-nav-item:hover {
  color: #fff;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
}

.afterglow-nav-item.classic-btn {
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 999px;
  padding: 5px 16px;
  background: rgba(245, 158, 11, 0.08);
}

.afterglow-nav-item.classic-btn:hover {
  color: #fff;
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.4);
}

.afterglow-nav-item.exit-btn {
  color: rgba(255, 255, 255, 0.45);
}

/* =========================================================================
   RESPONSIVE & ACCESSIBILITY
   ========================================================================= */

@media (max-width: 768px) {
  .afterglow-cinematic-header {
    padding: 16px 20px;
  }
  .afterglow-header-nav {
    gap: 12px;
  }
  .afterglow-nav-item {
    font-size: 0.64rem;
    letter-spacing: 0.16em;
  }
  .afterglow-journey-music-overlay {
    padding: 6vw 5vw;
  }
  .afterglow-floating-song-block {
    max-width: 100%;
  }
  .afterglow-editorial-song-title {
    font-size: 1.65rem;
  }
  .afterglow-road-waveform-container {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .afterglow-hero-photo-layer,
  .afterglow-car-layer-background,
  .afterglow-portal-sunbeam-layer,
  .afterglow-f1-car-anchor {
    transform: none !important;
    transition: none !important;
  }
  .afterglow-fia-rain-light,
  .afterglow-scroll-indicator-line {
    animation: none !important;
  }
}
`;

fs.writeFileSync(cssPath, baseContent + newCss, 'utf8');
console.log('Successfully updated src/index.css with rebuilt Afterglow CSS!');
