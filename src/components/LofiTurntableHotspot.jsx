import React, { useState, useLayoutEffect, useCallback } from 'react';

export const VIENNA_TRACK_DATA = {
  id: 'lofi-vienna',
  title: 'Vienna',
  name: 'Vienna',
  artist: 'Billy Joel',
  genre: 'Lo-Fi',
  language: 'English',
  duration: 214,
  cover: '/assets/images/lofi_scene.jpg',
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  youtubeId: '3jL4S4X97sQ',
  isYouTube: true,
  fallbackType: 'lofi'
};

export default function LofiTurntableHotspot({
  activeBackdrop,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onSelectTrack
}) {
  const [coords, setCoords] = useState(null);

  // Check if Lo-Fi scene is active
  const isLofiScene = activeBackdrop && activeBackdrop.includes('lofi_scene');

  // Check if Vienna is currently the active track
  const isViennaActive = currentTrack?.id === 'lofi-vienna' || 
    (currentTrack?.title?.toLowerCase().includes('vienna') && currentTrack?.artist?.toLowerCase().includes('billy joel')) ||
    currentTrack?.youtubeId === '3jL4S4X97sQ';

  // Responsive coordinate calculator matching background-size: cover (1024x682)
  const updateCoords = useCallback(() => {
    if (typeof window === 'undefined') return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgW = 1024;
    const imgH = 682;
    const imgAspect = imgW / imgH;
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

    // Board coordinates inside 1024x682 image:
    // Suitcase lid containing the printed text "slow down you're doing fine"
    setCoords({
      board: {
        left: Math.round(leftOffset + 725 * scale),
        top: Math.round(topOffset + 335 * scale),
        width: Math.round(200 * scale),
        height: Math.round(160 * scale)
      }
    });
  }, []);

  useLayoutEffect(() => {
    if (!isLofiScene) return;
    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [isLofiScene, updateCoords]);

  // Handle clicking the board: plays the song immediately, or toggles pause/play if already active
  const handleBoardClick = (e) => {
    e.stopPropagation();

    if (isViennaActive) {
      if (onTogglePlay) {
        onTogglePlay();
      }
    } else {
      if (onSelectTrack) {
        onSelectTrack(VIENNA_TRACK_DATA);
      } else if (onPlayTrack) {
        onPlayTrack(VIENNA_TRACK_DATA);
      }
    }
  };

  if (!isLofiScene || !coords) return null;

  return (
    <div className="lofi-turntable-system-layer" aria-label="Lo-Fi Board Hotspot Layer">
      {/* Invisible clickable hotspot directly over the board saying "slow down you're doing fine" */}
      <button
        type="button"
        className="lofi-board-hotspot"
        style={{
          position: 'absolute',
          left: `${coords.board.left}px`,
          top: `${coords.board.top}px`,
          width: `${coords.board.width}px`,
          height: `${coords.board.height}px`,
          background: 'transparent',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          cursor: 'pointer'
        }}
        onClick={handleBoardClick}
        title={isViennaActive && isPlaying ? "Vienna — Billy Joel (Click to pause)" : "“Slow down, you're doing fine” — Click to play Vienna by Billy Joel"}
        aria-label="Play Vienna by Billy Joel"
      />
    </div>
  );
}
