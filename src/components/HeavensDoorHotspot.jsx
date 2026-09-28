import React, { useState, useLayoutEffect, useCallback } from 'react';
import { playDoorKnockSound } from '../utils/audioSynth';

export const HEAVENS_DOOR_TRACK_DATA = {
  id: 'heavens-door-bob-dylan',
  title: "Knockin' on Heaven's Door",
  name: "Knockin' on Heaven's Door",
  artist: 'Bob Dylan',
  genre: 'Synthwave',
  genres: ['Synthwave', 'Indie', 'Retro'],
  language: 'English',
  duration: 152,
  cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=85',
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=synthwave-80s-110045.mp3',
  youtubeId: 'rm9coqlk8fY',
  isYouTube: true,
  fallbackType: 'retro'
};

export default function HeavensDoorHotspot({
  activeBackdrop,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onSelectTrack
}) {
  const [coords, setCoords] = useState(null);

  // Check if castle/synthwave backdrop is active
  const isCastleScene = activeBackdrop && (
    activeBackdrop.includes('1518709268805') || 
    activeBackdrop.includes('synthwave') || 
    activeBackdrop.includes('castle')
  );

  // Check if Knockin' on Heaven's Door is currently active
  const isSongActive = currentTrack?.id === 'heavens-door-bob-dylan' ||
    currentTrack?.youtubeId === 'rm9coqlk8fY' ||
    (currentTrack?.title?.toLowerCase().includes('heaven') && currentTrack?.title?.toLowerCase().includes('knock'));

  const isDoorOpen = isSongActive && isPlaying;

  // Responsive coordinate calculator matching background-size: cover (1920x2905)
  const updateCoords = useCallback(() => {
    if (typeof window === 'undefined') return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgW = 1920;
    const imgH = 2905;
    const imgAspect = imgW / imgH; // ~0.6609
    const vpAspect = vw / vh;

    let renderedW, renderedH, leftOffset, topOffset;
    if (vpAspect >= imgAspect) {
      renderedW = vw;
      renderedH = vw / imgAspect;
      leftOffset = 0;
      topOffset = (vh - renderedH) / 2;
    } else {
      renderedH = vh;
      renderedW = vh * imgAspect;
      topOffset = 0;
      leftOffset = (vw - renderedW) / 2;
    }

    const scale = renderedW / imgW;

    // Measured coordinates in 1920x2905:
    // Outer doorway hotspot: left: 595, top: 1420, width: 270, height: 315
    // Inner door archway where light shines through: left: 618, top: 1438, width: 224, height: 292
    // Stone masonry directly above door arch: center: 730, top: 1348
    const signW = Math.round(180 * scale);
    const signH = Math.round(36 * scale);
    const signL = Math.round(leftOffset + (730 - 180 / 2) * scale);
    const signT = Math.round(topOffset + 1348 * scale);
    const fontSize = Math.max(8, Math.round(10.2 * scale));
    const rivetSize = Math.max(3, Math.round(5 * scale));

    setCoords({
      left: Math.round(leftOffset + 595 * scale),
      top: Math.round(topOffset + 1420 * scale),
      width: Math.round(270 * scale),
      height: Math.round(315 * scale),
      innerDoor: {
        left: Math.round(leftOffset + 618 * scale),
        top: Math.round(topOffset + 1438 * scale),
        width: Math.round(224 * scale),
        height: Math.round(292 * scale)
      },
      sign: {
        left: signL,
        top: signT,
        width: signW,
        height: signH,
        fontSize,
        rivetSize
      }
    });
  }, []);

  useLayoutEffect(() => {
    if (!isCastleScene) return;
    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [isCastleScene, updateCoords]);

  const handleDoorClick = (e) => {
    e.stopPropagation();

    // 2. Play subtle, gentle knock sound
    playDoorKnockSound();

    if (isSongActive) {
      if (onTogglePlay) {
        onTogglePlay();
      }
    } else {
      // 3. Start "Knockin' on Heaven's Door"
      if (onSelectTrack) {
        onSelectTrack(HEAVENS_DOOR_TRACK_DATA);
      } else if (onPlayTrack) {
        onPlayTrack(HEAVENS_DOOR_TRACK_DATA);
      }
    }
  };

  if (!isCastleScene || !coords) return null;

  return (
    <div className="heavens-door-system-layer" aria-label="Heaven's Door Hotspot Layer">
      {/* 🚪 Castle Doorway Light Portal: Shows slight bright ethereal light when door is open */}
      <div
        className={`heavens-doorway-portal ${isDoorOpen ? 'is-door-open' : 'is-door-closed'}`}
        style={{
          left: `${(coords.innerDoor || coords).left}px`,
          top: `${(coords.innerDoor || coords).top}px`,
          width: `${(coords.innerDoor || coords).width}px`,
          height: `${(coords.innerDoor || coords).height}px`,
          borderRadius: `${Math.round((coords.innerDoor || coords).width * 0.5)}px ${Math.round((coords.innerDoor || coords).width * 0.5)}px 0 0`
        }}
      >
        {/* Radiant soft heavenly light coming through the door */}
        <div className="doorway-heavenly-light" />

        {/* Heavenly Light Spill onto Stone Threshold */}
        <div className="doorway-light-spill" />
      </div>

      {/* 🚪 4. Rusty Sign Plaque Mounted in Stone above the Door Arch */}
      {coords.sign && (
        <div
          className="rusty-reveal-sign-board"
          style={{
            left: `${coords.sign.left}px`,
            top: `${coords.sign.top}px`,
            width: `${coords.sign.width}px`,
            height: `${coords.sign.height}px`
          }}
          aria-hidden="true"
        >
          <div className="rusty-reveal-sign-plate">
            {/* Weathered Iron Corner Rivets */}
            <span 
              className="rusty-corner-rivet tl" 
              style={{ width: `${coords.sign.rivetSize}px`, height: `${coords.sign.rivetSize}px` }} 
            />
            <span 
              className="rusty-corner-rivet tr" 
              style={{ width: `${coords.sign.rivetSize}px`, height: `${coords.sign.rivetSize}px` }} 
            />
            <span 
              className="rusty-corner-rivet bl" 
              style={{ width: `${coords.sign.rivetSize}px`, height: `${coords.sign.rivetSize}px` }} 
            />
            <span 
              className="rusty-corner-rivet br" 
              style={{ width: `${coords.sign.rivetSize}px`, height: `${coords.sign.rivetSize}px` }} 
            />

            {/* Stamped Authentic Weathered Lettering: changes dynamically */}
            <span 
              className={`rusty-sign-lettering ${isDoorOpen ? 'is-open' : ''}`}
              style={{ fontSize: `${coords.sign.fontSize}px` }}
            >
              {isDoorOpen ? 'THE DOOR IS OPEN' : 'Knock on the door'}
            </span>
          </div>
        </div>
      )}

      {/* 100% transparent clickable hotspot over the castle door */}
      <button
        type="button"
        className="heavens-door-hotspot"
        style={{
          position: 'absolute',
          left: `${coords.left}px`,
          top: `${coords.top}px`,
          width: `${coords.width}px`,
          height: `${coords.height}px`,
          borderRadius: `${Math.round(coords.width * 0.5)}px ${Math.round(coords.width * 0.5)}px 0 0`,
          background: 'transparent',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          cursor: 'pointer',
          zIndex: 16
        }}
        onClick={handleDoorClick}
        title={isDoorOpen 
          ? "The door is open — Bob Dylan (Click to close)" 
          : "🚪 Knock on the door — Bob Dylan (Click to open)"}
        aria-label="Knock on Heaven's Door by Bob Dylan"
      />
    </div>
  );
}
