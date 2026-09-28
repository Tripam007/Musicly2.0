import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { playTvPowerSound } from '../utils/audioSynth';

export default function RetroTVMonitor({
  activeBackdrop,
  currentTrack,
  isPlaying,
  onTogglePlay
}) {
  const [isTvOn, setIsTvOn] = useState(true);
  const [isPowerAnimating, setIsPowerAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tvCoords, setTvCoords] = useState(null);
  const [barHeights, setBarHeights] = useState(() => [25, 45, 60, 80, 65, 90, 75, 85, 60, 70, 50, 40, 20]);
  const animFrameRef = useRef(null);

  // Only render on the Retro scene
  const isRetro = activeBackdrop && activeBackdrop.includes('retro_scene');

  // Dynamically calculate pixel-perfect TV screen bounds on the retro_scene.jpg background
  // retro_scene.jpg natural dimensions: 1024 x 682
  // Physical CRT TV bezel aperture in 1024x682:
  // minX = 716, minY = 441, width = 110, height = 94
  // Fully covers the artwork's underlying screen so no blue light eminence peeks out from behind
  const updateTvCoords = useCallback(() => {
    if (typeof window === 'undefined') return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgW = 1024;
    const imgH = 682;
    const imgAspect = imgW / imgH; // 1.50146627566
    const vpAspect = vw / vh;

    let renderedW, renderedH, leftOffset, topOffset;
    if (vpAspect >= imgAspect) {
      // Viewport is wider than image (standard wide 16:9 screen)
      renderedW = vw;
      renderedH = vw / imgAspect;
      leftOffset = 0;
      topOffset = (vh - renderedH) / 2;
    } else {
      // Viewport is taller than image (narrow or vertical screen)
      renderedH = vh;
      renderedW = vh * imgAspect;
      topOffset = 0;
      leftOffset = (vw - renderedW) / 2;
    }

    const scale = renderedW / imgW;

    setTvCoords({
      left: Math.round(leftOffset + 716 * scale),
      top: Math.round(topOffset + 441 * scale),
      width: Math.round(110 * scale),
      height: Math.round(94 * scale),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isRetro) return;
    updateTvCoords();
    window.addEventListener('resize', updateTvCoords);
    return () => window.removeEventListener('resize', updateTvCoords);
  }, [isRetro, updateTvCoords]);

  // Live flowing audio spectrum / rhythmic music bar equalizer loop
  useEffect(() => {
    if (!isRetro || !isTvOn) return;

    let t = 0;
    let lastTime = 0;
    const updateSpectrum = (time) => {
      if (time - lastTime >= 50) {
        lastTime = time;
        t += 0.08;
        if (isPlaying) {
          const count = 13;
          const heights = [];
          for (let i = 0; i < count; i++) {
            const wave1 = Math.sin(t * 5.2 + i * 0.52) * 0.36;
            const wave2 = Math.cos(t * 8.6 + i * 0.94) * 0.22;
            const pct = Math.min(100, Math.max(12, Math.round((Math.abs(wave1 + wave2) * 0.85 + 0.15) * 100)));
            heights.push(pct);
          }
          setBarHeights(heights);
        } else {
          setBarHeights(Array(13).fill(8));
        }
      }
      animFrameRef.current = requestAnimationFrame(updateSpectrum);
    };

    animFrameRef.current = requestAnimationFrame(updateSpectrum);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isTvOn]);

  const handleTogglePower = (e) => {
    e.stopPropagation();
    const nextState = !isTvOn;
    playTvPowerSound(nextState);
    setIsPowerAnimating(true);
    setIsTvOn(nextState);
    setTimeout(() => {
      setIsPowerAnimating(false);
    }, 450);
  };

  const handleOsdPlayPause = (e) => {
    e.stopPropagation();
    if (onTogglePlay) {
      onTogglePlay();
    }
  };

  const trackTitle = currentTrack?.title || 'Retro Synthwave';
  const trackArtist = currentTrack?.artist || 'Musicly FM';

  if (!isRetro) return null;

  return (
    <div
      className={`retro-tv-screen-container ${isTvOn ? 'tv-is-on' : 'tv-is-off'} ${isPowerAnimating ? (isTvOn ? 'crt-power-on-anim' : 'crt-power-off-anim') : ''} ${isHovered ? 'tv-is-hovered' : ''}`}
      style={tvCoords ? {
        position: 'absolute',
        left: `${tvCoords.left}px`,
        top: `${tvCoords.top}px`,
        width: `${tvCoords.width}px`,
        height: `${tvCoords.height}px`,
      } : undefined}
      onClick={handleTogglePower}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isTvOn ? "📺 TV is ON • Click to turn OFF" : "📺 TV is OFF • Click to turn ON"}
      aria-label="Retro CRT TV Monitor"
    >
      {/* Outer CRT Curved Tube Frame */}
      <div className="crt-screen-tube">
        {/* Active TV Broadcast Layer */}
        {isTvOn && (
          <div className="crt-broadcast-content">
            {/* Deep CRT Phosphor Background Glow */}
            <div className="crt-phosphor-glow-bg" />

            {/* Retro Phosphor Raster Grid */}
            <div className="crt-raster-grid" />

            {/* Vintage VCR On-Screen Display (OSD) Top Bar */}
            <div className="crt-osd-top">
              <button
                type="button"
                className={`crt-osd-mode-btn ${isPlaying ? 'mode-live' : 'mode-paused'}`}
                onClick={handleOsdPlayPause}
                title={isPlaying ? "Click to Pause" : "Click to Play"}
              >
                <span className={`crt-rec-dot ${isPlaying ? 'dot-blink' : ''}`} />
                <span>{isPlaying ? 'PLAY ▶' : 'PAUSE ❚❚'}</span>
              </button>
              <div className="crt-osd-meta">
                <span className="crt-ch-badge">CH 03</span>
                <span className="crt-stereo-badge">STEREO</span>
              </div>
            </div>

            {/* Center Stage: Current Song Name Playing & Flowing Music Bar Animation as per Sound */}
            <div className="crt-center-stage">
              <div className="crt-song-info-box">
                <div 
                  className={`crt-song-title ${isPlaying ? 'title-playing-glow' : 'title-paused-dim'}`}
                  title={trackTitle}
                >
                  {trackTitle}
                </div>
                <div className="crt-song-artist">
                  {trackArtist}
                </div>
              </div>

              {/* Flowing Music Bars Audio Visualizer Below Song Name */}
              <div className="crt-music-bars-flow">
                {barHeights.map((h, idx) => (
                  <span
                    key={idx}
                    className={`crt-flow-bar ${isPlaying ? 'bar-alive' : 'bar-idle'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Row: Track Info Marquee Ticker */}
            <div className="crt-osd-bottom">
              <div className="crt-marquee-track">
                <span className="crt-marquee-content">
                  {isPlaying ? '♪ STEREO 432Hz ' : '❚❚ PAUSED '}[{currentTrack?.genre || 'RETRO'}] — {trackTitle}
                </span>
              </div>
            </div>

            {/* CRT Horizontal Scanlines Raster */}
            <div className="crt-scanlines-raster" />

            {/* CRT High-Voltage 60Hz Screen Flicker */}
            <div className="crt-flicker-layer" />

            {/* Subtle VHS Static / Tape Tracking Noise */}
            <div className="crt-vhs-grain" />
          </div>
        )}

        {/* Powered-off Black Glass View with Realistic Tube Reflection */}
        {!isTvOn && (
          <div className="crt-off-glass">
            <div className="crt-off-darkness" />
            <div className="crt-off-reflection" />
            <div className="crt-off-phosphor-afterglow" />
          </div>
        )}

        {/* Heavy Curved Glass Tube Glare & Bevel Reflection */}
        <div className="crt-screen-glare" />

        {/* Tube Corner Vignette & Curved Bezel Shadow */}
        <div className="crt-tube-bevel-vignette" />

        {/* Power On/Off Cathode Beam Burst Animation */}
        {isPowerAnimating && <div className="crt-collapse-beam" />}
      </div>
    </div>
  );
}
