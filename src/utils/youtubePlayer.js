// YouTube IFrame Audio Engine Bridge for Musicly - High Performance, Zero-Delay Engine

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  // Clean surrounding whitespace, quotes, backticks, markdown angle brackets, and parentheses
  let clean = url.trim().replace(/^["'`<(\[]+|[>"'`\)\]]+$/g, '').trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Handle standard, embed, shorts, live, mobile, music, and partial /watch?v= URLs
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/|music\.youtube\.com\/(?:watch\?v=|live\/)|(?:^|[/?&])watch\?(?:.*&)?v=|(?:^|[?&])v=)([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regExp);
  if (match) return match[1];

  // Also check if any standalone 11-char YouTube ID exists after v= or v/
  const looseMatch = clean.match(/(?:[?&]v=|v\/|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/i);
  return looseMatch ? looseMatch[1] : null;
}

export function extractYouTubeStartTime(url) {
  if (!url || typeof url !== 'string') return 0;
  const match = url.match(/[?&](?:t|start)=([0-9hms]+)/i);
  if (!match) return 0;
  const val = match[1].toLowerCase();
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  let total = 0;
  const hours = val.match(/(\d+)h/);
  const mins = val.match(/(\d+)m/);
  const secs = val.match(/(\d+)s/);
  if (hours) total += parseInt(hours[1], 10) * 3600;
  if (mins) total += parseInt(mins[1], 10) * 60;
  if (secs) total += parseInt(secs[1], 10);
  return total || 0;
}

let isAPIReady = false;
let apiLoadingPromise = null;

// Dynamically load YouTube IFrame API script once with fast resolution
export function loadYouTubeAPI() {
  if (isAPIReady && window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadingPromise) {
    return apiLoadingPromise;
  }

  apiLoadingPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      isAPIReady = true;
      resolve();
      return;
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') previousOnReady();
      isAPIReady = true;
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  });

  return apiLoadingPromise;
}

class YouTubeAudioEngine {
  constructor() {
    this.player = null;
    this.currentVideoId = null;
    this.callbacks = {
      onTimeUpdate: null,
      onDurationChange: null,
      onEnded: null,
      onError: null,
      onStateChange: null,
      onBuffering: null
    };
    this.progressInterval = null;
    this.isReady = false;
    this.initPromise = null;
    this.pendingVideoId = null;
    this.pendingStartTime = 0;
    this.pendingVolume = 1;
    this.isSeeking = false;
    this.lastSeekTime = 0;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async init(containerId = 'musicly-yt-player-container') {
    if (this.isReady && this.player && typeof this.player.loadVideoById === 'function') {
      return this.player;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await loadYouTubeAPI();

      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        // Keep inside viewport with small non-zero dimensions without clip-path to prevent Chromium and YouTube embed security blocking
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.style.width = '200px';
        container.style.height = '200px';
        container.style.opacity = '0.02';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '0';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
      }

      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-inner-player-frame';
      container.innerHTML = '';
      container.appendChild(playerDiv);

      return new Promise((resolve) => {
        try {
          const initialVid = this.pendingVideoId || 'rm9coqlk8fY';
          this.player = new window.YT.Player('yt-inner-player-frame', {
            height: '200',
            width: '200',
            videoId: initialVid,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              iv_load_policy: 3,
              enablejsapi: 1
            },
            events: {
              onReady: (e) => {
                this.isReady = true;
                // Unmute initially to prevent browser silent lock
                try {
                  if (this.player.unMute) this.player.unMute();
                } catch (muteErr) {}

                if (this.pendingVideoId) {
                  const pVid = this.pendingVideoId;
                  const pStart = this.pendingStartTime;
                  const pVol = this.pendingVolume;
                  this.pendingVideoId = null;
                  this.playVideo(pVid, pStart, pVol);
                }
                resolve(this.player);
              },
              onStateChange: (event) => {
                if (this.callbacks.onStateChange) {
                  this.callbacks.onStateChange(event.data);
                }
                if (event.data === window.YT.PlayerState.PLAYING) {
                  this.clearBufferingWatchdog();
                  this.startProgressTracking();
                  if (this.player && this.player.getDuration) {
                    try {
                      const dur = this.player.getDuration();
                      if (dur && !isNaN(dur) && dur > 0 && this.callbacks.onDurationChange) {
                        this.callbacks.onDurationChange(Math.round(dur));
                      }
                    } catch (dErr) {}
                  }
                } else if (event.data === window.YT.PlayerState.BUFFERING) {
                  if (this.callbacks.onBuffering) {
                    this.callbacks.onBuffering(true);
                  }
                  this.startBufferingWatchdog();
                } else {
                  this.clearBufferingWatchdog();
                  this.stopProgressTracking();
                }

                if (event.data === window.YT.PlayerState.ENDED) {
                  if (this.callbacks.onEnded) {
                    this.callbacks.onEnded();
                  }
                }
              },
              onError: (event) => {
                const code = event?.data;
                console.warn("YouTube Player error event code:", code, "for video:", this.currentVideoId);
                // If it occurred during pre-warm or no video is actually playing, ignore
                if (!this.currentVideoId) return;

                if (this.callbacks.onError) {
                  this.callbacks.onError({
                    code,
                    videoId: this.currentVideoId,
                    isRestricted: code === 101 || code === 150,
                    isNotFound: code === 100,
                    isInvalid: code === 2
                  });
                }
              }
            }
          });
        } catch (initErr) {
          console.warn("YouTube Player instantiation notice:", initErr);
          resolve(null);
        }
      });
    })();

    return this.initPromise;
  }

  startProgressTracking() {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime && !this.isSeeking) {
        try {
          const current = this.player.getCurrentTime();
          const dur = this.player.getDuration ? this.player.getDuration() : null;
          if (dur && !isNaN(dur) && dur > 0 && this.callbacks.onDurationChange) {
            this.callbacks.onDurationChange(Math.round(dur));
          }
          if (current !== undefined && !isNaN(current) && this.callbacks.onTimeUpdate) {
            this.callbacks.onTimeUpdate(current);
          }
        } catch (e) {}
      }
    }, 250);
  }

  stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async playVideo(videoId, startSeconds = 0, volume = 1) {
    if (!videoId) return;

    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== 'function') {
      this.pendingVideoId = videoId;
      this.pendingStartTime = startSeconds;
      this.pendingVolume = volume;
      await this.init();
      // If player is now ready (handles case where initPromise was already resolved), start playback immediately!
      if (this.player && typeof this.player.loadVideoById === 'function') {
        const pVid = this.pendingVideoId || videoId;
        const pStart = this.pendingStartTime !== null ? this.pendingStartTime : startSeconds;
        const pVol = this.pendingVolume !== null ? this.pendingVolume : volume;
        this.pendingVideoId = null;
        return this.playVideo(pVid, pStart, pVol);
      }
      return;
    }

    try {
      this.setVolume(volume);
      if (this.player.unMute) {
        try { this.player.unMute(); } catch (e) {}
      }

      const startSec = Math.floor(startSeconds || 0);

      if (this.currentVideoId !== videoId) {
        this.currentVideoId = videoId;
        this.player.loadVideoById(videoId, startSec);
        if (this.player.playVideo) {
          this.player.playVideo();
        }
      } else {
        // Only seek if difference is significant (> 1.8s), preventing unnecessary buffer flushing!
        const curr = (this.player.getCurrentTime && this.player.getCurrentTime()) || 0;
        if (startSec > 0 && Math.abs(curr - startSec) > 1.8) {
          this.player.seekTo(startSec, true);
        }
        this.player.playVideo();
      }
      this.startProgressTracking();
    } catch (e) {
      console.warn("Error playing YouTube video:", e);
    }
  }

  pause() {
    this.stopProgressTracking();
    if (this.player && this.player.pauseVideo) {
      try {
        this.player.pauseVideo();
      } catch (e) {}
    }
  }

  resume() {
    if (this.player && this.player.playVideo) {
      try {
        if (this.player.unMute) this.player.unMute();
        this.player.playVideo();
        this.startProgressTracking();
      } catch (e) {}
    }
  }

  startBufferingWatchdog() {
    this.clearBufferingWatchdog();
    // Gently nudge the player if buffering takes more than 4.5s, without prematurely killing playback
    this.bufferingWatchdog = setTimeout(() => {
      try {
        if (this.player && typeof this.player.playVideo === 'function') {
          this.player.playVideo();
        }
      } catch (e) {}
    }, 4500);
  }

  clearBufferingWatchdog() {
    if (this.bufferingWatchdog) {
      clearTimeout(this.bufferingWatchdog);
      this.bufferingWatchdog = null;
    }
    if (this.bufferingFallbackWatchdog) {
      clearTimeout(this.bufferingFallbackWatchdog);
      this.bufferingFallbackWatchdog = null;
    }
  }

  stop() {
    this.clearBufferingWatchdog();
    this.stopProgressTracking();
    this.currentVideoId = null;
    if (this.player && this.player.stopVideo) {
      try {
        this.player.stopVideo();
      } catch (e) {}
    }
  }

  seek(seconds) {
    if (this.player && this.player.seekTo) {
      try {
        this.isSeeking = true;
        this.player.seekTo(seconds, true);
        if (this.player.playVideo) {
          this.player.playVideo();
        }
        setTimeout(() => {
          this.isSeeking = false;
        }, 200);
      } catch (e) {}
    }
  }

  setVolume(vol) {
    if (this.player && this.player.setVolume) {
      try {
        const ytVol = Math.max(0, Math.min(100, Math.round(vol * 100)));
        this.player.setVolume(ytVol);
      } catch (e) {}
    }
  }
}

export const ytEngine = new YouTubeAudioEngine();
