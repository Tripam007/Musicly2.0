// Authoritative Native Audio Playback Engine for Musicly
// Single persistent HTMLAudioElement singleton surviving all React renders,
// route/scene transitions, modals, and scrolling.
// Pure native stereo output directly to system default (laptop speakers, Bluetooth, wired, USB/HDMI).
// Zero DSP, zero compressors, zero biquad filters, zero mono downmixing, zero artificial gain reduction.

import { ytEngine, extractYouTubeId } from './youtubePlayer';
import { resolveOriginalTrack, resolveTrackAudioStreamAsync, isDirectPlayableAudio } from './originalTrackResolver';

class AudioEngine {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1.0;
    this.playbackMode = 'none'; // 'native' | 'youtube' | 'none'
    this.isSeeking = false;
    this.listeners = new Set();
    this.isInitialized = false;

    // Track loading & retry state
    this.activeLoadPromise = null;
    this.lastSrc = '';

    this.initNativeAudio();
    this.initYouTubeBridge();
  }

  initNativeAudio() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (this.audio) return;

    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.audio.playbackRate = 1.0;
    this.audio.defaultPlaybackRate = 1.0;
    this.audio.volume = 1.0;
    this.audio.muted = false;

    // Register native lifecycle listeners ONCE
    this.audio.addEventListener('play', () => {
      this.logDiag('PLAY');
      if (this.playbackMode === 'native') {
        this.isPlaying = true;
        this.notifyState();
      }
    });

    this.audio.addEventListener('playing', () => {
      this.logDiag('PLAYING');
      if (this.playbackMode === 'native') {
        this.isPlaying = true;
        this.notifyState();
      }
    });

    this.audio.addEventListener('pause', () => {
      this.logDiag('PAUSE');
      if (this.playbackMode === 'native' && !this.isSeeking) {
        this.isPlaying = false;
        this.notifyState();
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.playbackMode === 'native' && !this.isSeeking) {
        const time = this.audio.currentTime || 0;
        this.currentTime = time;
        this.notifyTime(time);
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.logDiag('LOADEDMETADATA');
      if (this.playbackMode === 'native') {
        const dur = this.audio.duration;
        if (dur && !isNaN(dur) && isFinite(dur)) {
          this.duration = dur;
          this.notifyDuration(dur);
        }
      }
    });

    this.audio.addEventListener('durationchange', () => {
      if (this.playbackMode === 'native') {
        const dur = this.audio.duration;
        if (dur && !isNaN(dur) && isFinite(dur)) {
          this.duration = dur;
          this.notifyDuration(dur);
        }
      }
    });

    this.audio.addEventListener('canplay', () => {
      this.logDiag('CANPLAY');
    });

    this.audio.addEventListener('waiting', () => {
      this.logDiag('WAITING');
    });

    this.audio.addEventListener('stalled', () => {
      this.logDiag('STALLED');
    });

    this.audio.addEventListener('ended', () => {
      this.logDiag('ENDED');
      if (this.playbackMode === 'native') {
        this.isPlaying = false;
        this.notifyEnded();
      }
    });

    this.audio.addEventListener('error', (err) => {
      this.logDiag('ERROR', {
        error: this.audio.error,
        src: this.audio.src,
        track: this.currentTrack?.title
      });
      if (this.playbackMode === 'native') {
        this.handleNativeAudioError();
      }
    });

    this.isInitialized = true;

    // Attach global diagnostic inspector for console debugging
    if (typeof window !== 'undefined') {
      window.__musiclyAudioDiag = () => this.getDiagnostics();
    }
  }

  initYouTubeBridge() {
    ytEngine.setCallbacks({
      onTimeUpdate: (time) => {
        if (this.playbackMode === 'youtube' && !this.isSeeking) {
          this.currentTime = time;
          this.notifyTime(time);
        }
      },
      onDurationChange: (dur) => {
        if (this.playbackMode === 'youtube') {
          if (dur && !isNaN(dur) && dur > 0) {
            this.duration = dur;
            this.notifyDuration(dur);
          }
        }
      },
      onEnded: () => {
        if (this.playbackMode === 'youtube') {
          this.isPlaying = false;
          this.notifyEnded();
        }
      },
      onError: (errInfo) => {
        this.logDiag('YOUTUBE ERROR', errInfo);
        if (this.playbackMode === 'youtube') {
          this.handleYouTubeError(errInfo);
        }
      },
      onStateChange: (state) => {
        if (this.playbackMode === 'youtube') {
          if (window.YT && state === window.YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.notifyState();
          } else if (window.YT && state === window.YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.notifyState();
          }
        }
      }
    });
  }

  logDiag(event, extra = null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `%c[Musicly AudioEngine] ${event}%c`,
        'background: #1e1e2e; color: #a6e3a1; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        '',
        extra ? extra : ''
      );
    }
  }

  getDiagnostics() {
    return {
      playbackMode: this.playbackMode,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      currentTrack: this.currentTrack ? {
        id: this.currentTrack.id,
        title: this.currentTrack.title,
        artist: this.currentTrack.artist,
        audioUrl: this.currentTrack.audioUrl,
        youtubeId: this.currentTrack.youtubeId,
        isYouTube: this.currentTrack.isYouTube
      } : null,
      nativeAudio: this.audio ? {
        src: this.audio.src,
        currentSrc: this.audio.currentSrc,
        paused: this.audio.paused,
        muted: this.audio.muted,
        volume: this.audio.volume,
        playbackRate: this.audio.playbackRate,
        readyState: this.audio.readyState,
        networkState: this.audio.networkState,
        bufferedRanges: this.audio.buffered.length > 0
          ? `${this.audio.buffered.start(0).toFixed(1)}s - ${this.audio.buffered.end(0).toFixed(1)}s`
          : 'none'
      } : null
    };
  }

  // Determine optimal playback route for a track
  resolvePlaybackRoute(track) {
    if (!track) return { mode: 'none', url: '', ytId: null };

    const resolved = resolveOriginalTrack(track);
    let resolvedUrl = resolved.audioUrl || '';
    const ytId = resolved.youtubeId || extractYouTubeId(resolvedUrl);

    // 1. Direct local file or user-uploaded blob -> Native HTMLAudioElement
    const isRealLocalFile = resolvedUrl && resolvedUrl.startsWith('/assets/audio/');
    const isUserUploadedBlob = resolved.blob instanceof Blob || (resolvedUrl && resolvedUrl.startsWith('blob:'));
    const isDirectAudio = isDirectPlayableAudio(resolvedUrl);

    if (isRealLocalFile || isUserUploadedBlob || (isDirectAudio && !resolved.isYouTube)) {
      if (resolved.blob instanceof Blob && (!resolvedUrl || !resolvedUrl.startsWith('blob:'))) {
        resolvedUrl = URL.createObjectURL(resolved.blob);
        resolved.audioUrl = resolvedUrl;
      }
      return {
        mode: 'native',
        url: resolvedUrl,
        ytId: null,
        duration: resolved.duration || 0
      };
    }

    // 2. YouTube track with valid ID -> YouTube engine
    if (ytId || resolved.isYouTube) {
      return {
        mode: 'youtube',
        url: `https://www.youtube.com/watch?v=${ytId}`,
        ytId,
        duration: resolved.duration || 0
      };
    }

    // 3. Any playable audio stream
    if (resolvedUrl && isDirectPlayableAudio(resolvedUrl)) {
      return {
        mode: 'native',
        url: resolvedUrl,
        ytId: null,
        duration: resolved.duration || 0
      };
    }

    return { mode: 'none', url: resolvedUrl, ytId };
  }

  // Load and play a specific track
  async playTrack(track, startTime = 0) {
    if (!track) return;
    this.currentTrack = track;

    const route = this.resolvePlaybackRoute(track);
    this.duration = route.duration || track.duration || 0;
    this.currentTime = startTime;

    if (route.mode === 'youtube' && route.ytId) {
      this.playbackMode = 'youtube';
      // Stop native audio cleanly
      if (this.audio) {
        this.audio.pause();
        if (this.audio.src) this.audio.removeAttribute('src');
      }
      this.isPlaying = true;
      this.notifyState();
      await ytEngine.playVideo(route.ytId, startTime, this.volume);
    } else if (route.mode === 'native' && route.url) {
      this.playbackMode = 'native';
      // Stop YouTube cleanly
      ytEngine.stop();
      await this.playNativeUrl(route.url, startTime);
    } else {
      // Stream upgrade attempt (fallback resolution without synthetic chord fallback)
      const upgraded = await resolveTrackAudioStreamAsync(track);
      if (upgraded && upgraded.audioUrl && isDirectPlayableAudio(upgraded.audioUrl)) {
        this.playbackMode = 'native';
        ytEngine.stop();
        await this.playNativeUrl(upgraded.audioUrl, startTime);
      } else {
        const fallbackYtId = track.youtubeId || extractYouTubeId(track.audioUrl || '');
        if (fallbackYtId) {
          this.playbackMode = 'youtube';
          if (this.audio) this.audio.pause();
          this.isPlaying = true;
          this.notifyState();
          await ytEngine.playVideo(fallbackYtId, startTime, this.volume);
        } else {
          console.warn('[Musicly AudioEngine] No playable audio source found for track:', track.title);
        }
      }
    }
  }

  async playNativeUrl(url, startTime = 0) {
    if (!this.audio) this.initNativeAudio();
    const audio = this.audio;

    const isSameSrc = this.isSameAudioSrc(url);
    if (!isSameSrc) {
      audio.src = url;
      this.lastSrc = url;
      audio.preload = 'auto';
      audio.load();
    }

    // Explicitly enforce playback rates
    audio.playbackRate = 1.0;
    audio.defaultPlaybackRate = 1.0;
    audio.volume = this.volume;
    audio.muted = false;

    if (startTime > 0) {
      try {
        audio.currentTime = startTime;
      } catch (e) {}
    }

    try {
      this.isPlaying = true;
      this.notifyState();
      await audio.play();
    } catch (err) {
      this.logDiag('Play call exception:', err);
      // Wait for user gesture or retry on loadedmetadata
      if (err.name !== 'AbortError') {
        console.warn('[Musicly AudioEngine] Native play warning:', err);
      }
    }
  }

  isSameAudioSrc(url) {
    if (!this.audio || !this.audio.src) return false;
    try {
      return this.audio.src === new URL(url, window.location.href).href;
    } catch (e) {
      return this.audio.src === url;
    }
  }

  // Resume or start playback of current track
  async play() {
    if (this.isPlaying) return;

    if (!this.currentTrack) return;

    if (this.playbackMode === 'youtube') {
      this.isPlaying = true;
      this.notifyState();
      const ytId = this.currentTrack.youtubeId || extractYouTubeId(this.currentTrack.audioUrl || '');
      if (ytId) {
        await ytEngine.playVideo(ytId, this.currentTime, this.volume);
      }
    } else if (this.playbackMode === 'native' && this.audio) {
      try {
        this.audio.volume = this.volume;
        this.audio.muted = false;
        this.isPlaying = true;
        this.notifyState();
        await this.audio.play();
      } catch (err) {
        this.logDiag('Resume error:', err);
        // If element is in an unready state, re-trigger playTrack
        if (this.currentTrack) {
          await this.playTrack(this.currentTrack, this.currentTime);
        }
      }
    } else if (this.currentTrack) {
      await this.playTrack(this.currentTrack, this.currentTime);
    }
  }

  // Pause playback
  pause() {
    this.isPlaying = false;
    this.notifyState();

    if (this.playbackMode === 'youtube') {
      ytEngine.pause();
    } else if (this.playbackMode === 'native' && this.audio) {
      this.audio.pause();
    }
  }

  // Authoritative seek: the ONLY place where audio.currentTime is written!
  seek(targetTime) {
    const clamped = Math.max(0, Math.min(this.duration || Infinity, targetTime));
    this.currentTime = clamped;
    this.isSeeking = true;

    if (this.playbackMode === 'youtube') {
      ytEngine.seek(clamped);
      setTimeout(() => { this.isSeeking = false; }, 200);
    } else if (this.playbackMode === 'native' && this.audio) {
      try {
        this.audio.currentTime = clamped;
      } catch (e) {
        console.warn('[Musicly AudioEngine] Seek error:', e);
      }
      setTimeout(() => { this.isSeeking = false; }, 200);
    } else {
      this.isSeeking = false;
    }

    this.notifyTime(clamped);
  }

  setVolume(vol) {
    const safeVol = Math.max(0, Math.min(1.0, isNaN(vol) ? 1.0 : Number(vol)));
    this.volume = safeVol;

    if (this.audio) {
      this.audio.volume = safeVol;
      this.audio.muted = (safeVol === 0);
    }
    ytEngine.setVolume(safeVol);
    this.notifyVolume(safeVol);
  }

  handleNativeAudioError() {
    if (!this.currentTrack) return;
    console.warn('[Musicly AudioEngine] Native stream error on track:', this.currentTrack.title);

    // If stream fails, check if track has a YouTube fallback
    const ytId = this.currentTrack.youtubeId || extractYouTubeId(this.currentTrack.audioUrl || '');
    if (ytId) {
      console.log('[Musicly AudioEngine] Falling back to YouTube stream:', ytId);
      this.playbackMode = 'youtube';
      ytEngine.playVideo(ytId, this.currentTime, this.volume);
    }
  }

  handleYouTubeError(errInfo) {
    console.warn('[Musicly AudioEngine] YouTube playback notice:', errInfo);
    // If error 150/101 (embedding restricted), attempt stream resolution
    if (errInfo?.isRestricted && this.currentTrack) {
      resolveTrackAudioStreamAsync(this.currentTrack).then(upgraded => {
        if (upgraded && isDirectPlayableAudio(upgraded.audioUrl)) {
          console.log('[Musicly AudioEngine] Switching restricted YouTube track to direct audio stream');
          this.playbackMode = 'native';
          ytEngine.stop();
          this.playNativeUrl(upgraded.audioUrl, this.currentTime);
        }
      });
    }
  }

  // Event Subscription System
  subscribe(listener) {
    this.listeners.add(listener);
    // Send immediate current state
    try {
      listener({
        type: 'INIT',
        isPlaying: this.isPlaying,
        currentTime: this.currentTime,
        duration: this.duration,
        volume: this.volume,
        playbackMode: this.playbackMode,
        currentTrack: this.currentTrack
      });
    } catch (e) {}

    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyState() {
    const state = {
      type: 'STATE_CHANGE',
      isPlaying: this.isPlaying,
      playbackMode: this.playbackMode,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      currentTrack: this.currentTrack
    };
    for (const listener of this.listeners) {
      try { listener(state); } catch (e) {}
    }
  }

  notifyTime(time) {
    const state = {
      type: 'TIME_UPDATE',
      currentTime: time,
      duration: this.duration
    };
    for (const listener of this.listeners) {
      try { listener(state); } catch (e) {}
    }
  }

  notifyDuration(dur) {
    const state = {
      type: 'DURATION_CHANGE',
      duration: dur
    };
    for (const listener of this.listeners) {
      try { listener(state); } catch (e) {}
    }
  }

  notifyVolume(vol) {
    const state = {
      type: 'VOLUME_CHANGE',
      volume: vol
    };
    for (const listener of this.listeners) {
      try { listener(state); } catch (e) {}
    }
  }

  notifyEnded() {
    const state = {
      type: 'ENDED'
    };
    for (const listener of this.listeners) {
      try { listener(state); } catch (e) {}
    }
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      playbackMode: this.playbackMode,
      currentTrack: this.currentTrack
    };
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
