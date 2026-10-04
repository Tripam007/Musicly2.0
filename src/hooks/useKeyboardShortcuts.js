import { useEffect, useRef, useCallback } from 'react';
import { triggerHapticFeedback } from '../utils/audioSynth';

/**
 * Determine whether a DOM element is a text input or editable container
 */
function isInputElement(el) {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toUpperCase() : '';
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
  if (el.closest && el.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

export function useKeyboardShortcuts({
  // Playback state & handlers
  isPlaying,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  isFavorite,
  onToggleFavorite,
  // Navigation handlers
  onOpenSearch,
  onOpenLibrary,
  onGoHome,
  onOpenUpload,
  onToggleAmbient,
  isAmbientOpen,
  // Scene handlers
  onOpenSceneModal,
  onSelectScene,
  allScenes = [],
  currentScene,
  // Command Palette & Shortcuts Modal
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  isShortcutsOpen,
  setIsShortcutsOpen,
  // Cinematic opening screen trigger
  onOpenCinematicIntro,
  // Topmost modal closure handler
  onCloseTopmostModal
}) {
  const prevVolumeRef = useRef(volume > 0 ? volume : 0.8);
  const lastSeekTimeRef = useRef(0);
  const lastVolumeTimeRef = useRef(0);

  // Keep references to prevent stale closures while keeping the listener single and stable
  const stateRef = useRef({});
  stateRef.current = {
    isPlaying,
    onTogglePlay,
    onPrevTrack,
    onNextTrack,
    currentTime,
    duration,
    onSeek,
    volume,
    onVolumeChange,
    isShuffle,
    onToggleShuffle,
    repeatMode,
    onToggleRepeat,
    isFavorite,
    onToggleFavorite,
    onOpenSearch,
    onOpenLibrary,
    onGoHome,
    onOpenUpload,
    onToggleAmbient,
    isAmbientOpen,
    onOpenSceneModal,
    onSelectScene,
    allScenes,
    currentScene,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    onOpenCinematicIntro,
    onCloseTopmostModal
  };

  // Mute / Unmute handler
  const handleToggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.onVolumeChange) return;

    triggerHapticFeedback();
    if (s.volume > 0) {
      prevVolumeRef.current = s.volume;
      s.onVolumeChange(0);
    } else {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.85;
      s.onVolumeChange(restored);
    }
  }, []);

  // Next Scene handler
  const handleNextScene = useCallback(() => {
    const s = stateRef.current;
    if (!s.allScenes || s.allScenes.length === 0 || !s.onSelectScene) return;
    triggerHapticFeedback();
    const currentIdx = s.allScenes.findIndex(sc => sc.id === s.currentScene?.id);
    const nextIdx = (currentIdx + 1) % s.allScenes.length;
    const nextSc = s.allScenes[nextIdx];
    s.onSelectScene(nextSc);
  }, []);

  // Main global keydown listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const s = stateRef.current;
      const activeEl = document.activeElement;
      const isInput = isInputElement(activeEl);

      // 1. ESCAPE KEY (Highest Priority - works anywhere, even in inputs)
      if (e.key === 'Escape') {
        if (isInput) {
          activeEl.blur();
        }
        e.preventDefault();
        triggerHapticFeedback();
        s.onCloseTopmostModal?.();
        return;
      }

      // 2. INPUT SAFETY: If the user is typing in any input/textarea/select, STOP immediately!
      if (isInput) {
        return;
      }

      // 3. COMMAND PALETTE SHORTCUT (Ctrl + K or Cmd + K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        triggerHapticFeedback();
        s.setIsCommandPaletteOpen?.(prev => !prev);
        return;
      }

      // If Command Palette is open, let Command Palette handle navigation keys
      if (s.isCommandPaletteOpen) {
        return;
      }

      // 4. MY LIBRARY SHORTCUT (Ctrl/Cmd + L)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        triggerHapticFeedback();
        s.onOpenLibrary?.();
        return;
      }

      // Ignore other modifier keys for remaining shortcuts (except Shift for track skip)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // 5. KEYBOARD SHORTCUTS HELP MODAL (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        triggerHapticFeedback();
        s.setIsShortcutsOpen?.(prev => !prev);
        return;
      }

      // 6. PLAY / PAUSE (Space)
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onTogglePlay?.();
        return;
      }

      // 7. TRACK NAVIGATION (Shift + ArrowLeft / ArrowRight)
      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        triggerHapticFeedback();
        if (e.key === 'ArrowLeft') {
          s.onPrevTrack?.();
        } else {
          s.onNextTrack?.();
        }
        return;
      }

      // 8. SEEKING (ArrowLeft: -5s, ArrowRight: +5s)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        // Rate-limit rapid key repetition
        const now = Date.now();
        if (e.repeat && now - lastSeekTimeRef.current < 110) {
          return;
        }
        lastSeekTimeRef.current = now;

        triggerHapticFeedback('soft');
        const delta = e.key === 'ArrowLeft' ? -5 : 5;
        const dur = s.duration || 180;
        const current = s.currentTime || 0;
        const target = Math.max(0, Math.min(dur, current + delta));
        s.onSeek?.(target);
        return;
      }

      // 9. VOLUME ADJUSTMENT (ArrowUp: +5%, ArrowDown: -5%)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        // Rate-limit rapid key repetition
        const now = Date.now();
        if (e.repeat && now - lastVolumeTimeRef.current < 80) {
          return;
        }
        lastVolumeTimeRef.current = now;

        triggerHapticFeedback('soft');
        const delta = e.key === 'ArrowUp' ? 0.05 : -0.05;
        const currentVol = typeof s.volume === 'number' ? s.volume : 0.8;
        const nextVol = Math.max(0, Math.min(1, Math.round((currentVol + delta) * 100) / 100));
        s.onVolumeChange?.(nextVol);
        return;
      }

      // 10. MUTE / UNMUTE (M)
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      // 11. SHUFFLE (S)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onToggleShuffle?.();
        return;
      }

      // 12. REPEAT (R)
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onToggleRepeat?.();
        return;
      }

      // 13. LIKE / FAVORITE (L)
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onToggleFavorite?.();
        return;
      }

      // 14. FOCUS SEARCH (/)
      if (e.key === '/') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onOpenSearch?.();
        return;
      }

      // 15. NAVIGATE HOME (H)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onGoHome?.();
        return;
      }

      // 16. SCENE SELECTOR (G or C)
      if (e.key === 'g' || e.key === 'G' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onOpenSceneModal?.();
        return;
      }

      // 17. ADD MUSIC (A)
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onOpenUpload?.();
        return;
      }

      // 18. TOGGLE AMBIENCE (B)
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        triggerHapticFeedback();
        s.onToggleAmbient?.();
        return;
      }

      // 18b. REPLAY CINEMATIC OPENING SCREEN (Shift + O)
      if (e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        triggerHapticFeedback();
        s.onOpenCinematicIntro?.();
        return;
      }

      // 19. NEXT SCENE (N)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNextScene();
        return;
      }

      // 20. NUMERIC SCENE SWITCHING (1 -> AFTERGLOW, 2 -> INDIE, 3 -> DRIVE, 4 -> STUDIO, 5 -> GHAZALS)
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        if (!s.allScenes || s.allScenes.length === 0 || !s.onSelectScene) return;

        const targetKeywords = {
          '1': ['after_hours', 'vibe_carousel'],
          '2': ['indie'],
          '3': ['drive'],
          '4': ['studio', 'minimal', 'minimal_studio', 'cozy_bedroom'],
          '5': ['ghazal', 'ghazals']
        };

        const keywords = targetKeywords[e.key] || [];
        // Find matching scene dynamically
        const found = s.allScenes.find(sc => {
          const id = (sc.id || '').toLowerCase();
          const name = (sc.name || '').toLowerCase();
          return keywords.some(kw => id.includes(kw) || name.includes(kw));
        });

        if (found) {
          e.preventDefault();
          triggerHapticFeedback();
          s.onSelectScene(found);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextScene, handleToggleMute]);

  return {
    handleToggleMute,
    handleNextScene
  };
}
