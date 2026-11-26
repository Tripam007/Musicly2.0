import { useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../utils/audioEngine';

/**
 * Regex to detect headphones, headsets, earphones, and bluetooth audio devices
 */
const HEADPHONE_DEVICE_REGEX = /headphone|headset|earphone|airpod|buds|bluetooth|hands-free|wireless|iem/i;

/**
 * Dedicated Headphone & Hardware Media Remote Controller
 * 
 * Supports:
 * 1. navigator.mediaSession API for Bluetooth/wired headphone buttons:
 *    - Play / Pause (single click) at current time
 *    - Next Song (double click)
 *    - Previous Song (triple click)
 *    - Seek Forward (+5s or hardware offset)
 *    - Seek Backward (-5s or hardware offset)
 *    - Seek To exact position
 * 2. Hardware media key events:
 *    - MediaPlayPause, MediaTrackNext, MediaTrackPrevious, MediaStop
 *    - AudioVolumeUp, AudioVolumeDown (headphone volume buttons)
 *    - AudioVolumeMute
 * 3. Headphone Connection & Disconnection Sensing:
 *    - navigator.mediaDevices.ondevicechange
 *    - Auto-pause when headphones are disconnected ("Becoming Noisy" protection)
 *    - Auto-route audio output sink to headphones via setSinkId if supported
 *    - Micro-HUD feedback for headphone button actions
 */
export function useHeadphoneControls({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onFeedback
}) {
  const handlersRef = useRef({});
  handlersRef.current = {
    currentTrack,
    isPlaying,
    onTogglePlay,
    onPrevTrack,
    onNextTrack,
    currentTime,
    duration,
    onSeek,
    volume,
    onVolumeChange,
    onFeedback
  };

  const isHeadphonesConnectedRef = useRef(false);
  const knownDeviceIdsRef = useRef(new Set());
  const initialDetectionDoneRef = useRef(false);
  const lastVolumeTimeRef = useRef(0);

  // 1. Initialize navigator.mediaSession action handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const ms = navigator.mediaSession;

    const handlePlay = () => {
      const h = handlersRef.current;
      h.onTogglePlay?.(true);
      h.onFeedback?.({
        type: 'PLAY',
        label: 'PLAYING',
        sublabel: 'Headphone Remote'
      });
    };

    const handlePause = () => {
      const h = handlersRef.current;
      h.onTogglePlay?.(false);
      h.onFeedback?.({
        type: 'PAUSE',
        label: 'PAUSED',
        sublabel: 'Headphone Remote'
      });
    };

    const handlePrev = () => {
      const h = handlersRef.current;
      h.onPrevTrack?.();
      h.onFeedback?.({
        type: 'PREV',
        label: 'PREVIOUS TRACK',
        sublabel: 'Headphone Remote'
      });
    };

    const handleNext = () => {
      const h = handlersRef.current;
      h.onNextTrack?.();
      h.onFeedback?.({
        type: 'NEXT',
        label: 'NEXT TRACK',
        sublabel: 'Headphone Remote'
      });
    };

    const handleSeekBackward = (details) => {
      const h = handlersRef.current;
      const offset = details?.seekOffset || 5;
      const cur = h.currentTime || 0;
      const target = Math.max(0, cur - offset);
      h.onSeek?.(target);
      h.onFeedback?.({
        type: 'PREV',
        label: `-${offset}s`,
        sublabel: 'Headphone Remote'
      });
    };

    const handleSeekForward = (details) => {
      const h = handlersRef.current;
      const offset = details?.seekOffset || 5;
      const dur = h.duration || 180;
      const cur = h.currentTime || 0;
      const target = Math.min(dur, cur + offset);
      h.onSeek?.(target);
      h.onFeedback?.({
        type: 'NEXT',
        label: `+${offset}s`,
        sublabel: 'Headphone Remote'
      });
    };

    const handleSeekTo = (details) => {
      const h = handlersRef.current;
      if (details?.seekTime !== undefined && !isNaN(details.seekTime)) {
        h.onSeek?.(details.seekTime);
      }
    };

    const handleStop = () => {
      const h = handlersRef.current;
      h.onTogglePlay?.(false);
      h.onFeedback?.({
        type: 'PAUSE',
        label: 'STOPPED',
        sublabel: 'Headphone Remote'
      });
    };

    try {
      ms.setActionHandler('play', handlePlay);
      ms.setActionHandler('pause', handlePause);
      ms.setActionHandler('previoustrack', handlePrev);
      ms.setActionHandler('nexttrack', handleNext);
      ms.setActionHandler('seekbackward', handleSeekBackward);
      ms.setActionHandler('seekforward', handleSeekForward);
      ms.setActionHandler('seekto', handleSeekTo);
      ms.setActionHandler('stop', handleStop);
    } catch (e) {
      console.warn('[Musicly HeadphoneControls] mediaSession setActionHandler error:', e);
    }

    return () => {
      try {
        ms.setActionHandler('play', null);
        ms.setActionHandler('pause', null);
        ms.setActionHandler('previoustrack', null);
        ms.setActionHandler('nexttrack', null);
        ms.setActionHandler('seekbackward', null);
        ms.setActionHandler('seekforward', null);
        ms.setActionHandler('seekto', null);
        ms.setActionHandler('stop', null);
      } catch (e) {}
    };
  }, []);

  // 2. Synchronize MediaMetadata with active track
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const title = currentTrack.title || 'Unknown Song';
    const artist = currentTrack.artist || 'Musicly';
    const album = currentTrack.album || currentTrack.genre || 'Musicly Studio';
    const artworkSrc = currentTrack.coverUrl || '/favicon.svg';

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: artworkSrc, sizes: '512x512', type: 'image/png' },
          { src: artworkSrc, sizes: '256x256', type: 'image/png' },
          { src: artworkSrc, sizes: '128x128', type: 'image/png' },
          { src: artworkSrc, sizes: '96x96', type: 'image/png' }
        ]
      });
    } catch (e) {
      console.warn('[Musicly HeadphoneControls] Failed to update MediaMetadata:', e);
    }
  }, [currentTrack]);

  // 3. Synchronize playbackState (playing / paused / none)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [isPlaying]);

  // 4. Synchronize Position State at current time
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    if (duration && !isNaN(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1.0,
          position: Math.max(0, Math.min(duration, currentTime || 0))
        });
      } catch (e) {}
    }
  }, [currentTime, duration]);

  // 5. Hardware Media Keys Listener (Headphone Volume Buttons & Remote Buttons)
  useEffect(() => {
    const handleHardwareMediaKeys = (e) => {
      const h = handlersRef.current;
      const key = e.key;

      // Handle Headphone / Media Remote Volume Buttons
      if (key === 'AudioVolumeUp' || key === 'VolumeUp') {
        e.preventDefault();
        const now = Date.now();
        if (e.repeat && now - lastVolumeTimeRef.current < 60) return;
        lastVolumeTimeRef.current = now;

        const currentVol = typeof h.volume === 'number' ? h.volume : 0.8;
        const nextVol = Math.min(1.0, Math.round((currentVol + 0.05) * 100) / 100);
        h.onVolumeChange?.(nextVol);
        h.onFeedback?.({
          type: 'VOL_UP',
          label: `VOL ${Math.round(nextVol * 100)}%`,
          sublabel: 'Headphone Remote'
        });
        return;
      }

      if (key === 'AudioVolumeDown' || key === 'VolumeDown') {
        e.preventDefault();
        const now = Date.now();
        if (e.repeat && now - lastVolumeTimeRef.current < 60) return;
        lastVolumeTimeRef.current = now;

        const currentVol = typeof h.volume === 'number' ? h.volume : 0.8;
        const nextVol = Math.max(0.0, Math.round((currentVol - 0.05) * 100) / 100);
        h.onVolumeChange?.(nextVol);
        h.onFeedback?.({
          type: 'VOL_DOWN',
          label: `VOL ${Math.round(nextVol * 100)}%`,
          sublabel: 'Headphone Remote'
        });
        return;
      }

      if (key === 'AudioVolumeMute' || key === 'VolumeMute') {
        e.preventDefault();
        const currentVol = typeof h.volume === 'number' ? h.volume : 0.8;
        if (currentVol > 0) {
          h.onVolumeChange?.(0);
          h.onFeedback?.({
            type: 'MUTE',
            label: 'MUTED',
            sublabel: 'Headphone Remote'
          });
        } else {
          h.onVolumeChange?.(0.85);
          h.onFeedback?.({
            type: 'UNMUTE',
            label: 'UNMUTED 85%',
            sublabel: 'Headphone Remote'
          });
        }
        return;
      }

      // Handle Headphone Media Keys (Play/Pause, Next, Prev, Stop)
      if (key === 'MediaPlayPause') {
        e.preventDefault();
        const nextState = !h.isPlaying;
        h.onTogglePlay?.(nextState);
        h.onFeedback?.({
          type: nextState ? 'PLAY' : 'PAUSE',
          label: nextState ? 'PLAYING' : 'PAUSED',
          sublabel: 'Headphone Remote'
        });
        return;
      }

      if (key === 'MediaTrackNext') {
        e.preventDefault();
        h.onNextTrack?.();
        h.onFeedback?.({
          type: 'NEXT',
          label: 'NEXT TRACK',
          sublabel: 'Headphone Remote'
        });
        return;
      }

      if (key === 'MediaTrackPrevious') {
        e.preventDefault();
        h.onPrevTrack?.();
        h.onFeedback?.({
          type: 'PREV',
          label: 'PREVIOUS TRACK',
          sublabel: 'Headphone Remote'
        });
        return;
      }

      if (key === 'MediaStop') {
        e.preventDefault();
        if (h.isPlaying) {
          h.onTogglePlay?.(false);
          h.onFeedback?.({
            type: 'PAUSE',
            label: 'STOPPED',
            sublabel: 'Headphone Remote'
          });
        }
      }
    };

    window.addEventListener('keydown', handleHardwareMediaKeys, { capture: true });
    return () => window.removeEventListener('keydown', handleHardwareMediaKeys, { capture: true });
  }, []);

  // 6. Headphone Connection & Disconnection Monitoring via navigator.mediaDevices
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let isMounted = true;

    const checkHeadphoneDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!isMounted) return;

        const outputDevices = devices.filter(d => d.kind === 'audiooutput');
        const currentIds = new Set(outputDevices.map(d => d.deviceId));

        // Find headphone/headset devices
        const headphone = outputDevices.find(d => HEADPHONE_DEVICE_REGEX.test(d.label));
        const hasHeadphones = Boolean(headphone);

        // First initial pass: register devices without triggering disconnection toast
        if (!initialDetectionDoneRef.current) {
          initialDetectionDoneRef.current = true;
          isHeadphonesConnectedRef.current = hasHeadphones;
          knownDeviceIdsRef.current = currentIds;

          if (hasHeadphones && headphone) {
            console.log('[Musicly HeadphoneControls] Headphones detected at launch:', headphone.label);
            audioEngine.setAudioOutputSink?.(headphone.deviceId);
          }
          return;
        }

        // Subsequent changes: detect connection or disconnection
        const wasConnected = isHeadphonesConnectedRef.current;

        if (!wasConnected && hasHeadphones) {
          // Headphones newly connected!
          isHeadphonesConnectedRef.current = true;
          const h = handlersRef.current;
          console.log('[Musicly HeadphoneControls] Headphones connected:', headphone?.label);

          if (headphone?.deviceId) {
            audioEngine.setAudioOutputSink?.(headphone.deviceId);
          }

          h.onFeedback?.({
            type: 'HEADPHONES_CONNECTED',
            label: 'HEADPHONES CONNECTED',
            sublabel: headphone?.label || 'Remote controls ready'
          });
        } else if (wasConnected && !hasHeadphones) {
          // Headphones disconnected!
          isHeadphonesConnectedRef.current = false;
          const h = handlersRef.current;
          console.log('[Musicly HeadphoneControls] Headphones disconnected');

          // Becoming Noisy Protection: auto-pause at current time if playing
          if (h.isPlaying) {
            h.onTogglePlay?.(false);
            h.onFeedback?.({
              type: 'HEADPHONES_DISCONNECTED',
              label: 'HEADPHONES UNPLUGGED',
              sublabel: 'Playback paused at current time'
            });
          } else {
            h.onFeedback?.({
              type: 'HEADPHONES_DISCONNECTED',
              label: 'HEADPHONES UNPLUGGED',
              sublabel: 'Audio device changed'
            });
          }
        }

        knownDeviceIdsRef.current = currentIds;
      } catch (err) {
        console.warn('[Musicly HeadphoneControls] enumerateDevices error:', err);
      }
    };

    // Initial check
    checkHeadphoneDevices();

    // Listen for device change events (Bluetooth connect/disconnect, USB headset plug/unplug)
    const onDeviceChange = () => {
      checkHeadphoneDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    return () => {
      isMounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    };
  }, []);
}
