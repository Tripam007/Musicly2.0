/**
 * VoiceRecorder.js
 * 
 * Production MediaRecorder command capture with real-time silence & end-of-speech detection.
 * Configured specifically for short voice commands:
 * - Preferred MIME type: audio/webm;codecs=opus
 * - Max duration: 8 seconds
 * - Initial silence timeout: 4 seconds
 * - End-of-speech silence detection: 1.2 seconds
 * - Automatic track cleanup to ensure microphone privacy
 */

export class VoiceRecorder {
  /**
   * @param {object} options
   * @param {number} [options.maxDurationMs=8000]
   * @param {number} [options.initialSilenceTimeoutMs=4000]
   * @param {number} [options.endOfSpeechSilenceMs=1200]
   * @param {number} [options.silenceThresholdRms=0.012]
   */
  constructor(options = {}) {
    this.maxDurationMs = options.maxDurationMs || 8000;
    this.initialSilenceTimeoutMs = options.initialSilenceTimeoutMs || 7000;
    this.endOfSpeechSilenceMs = options.endOfSpeechSilenceMs || 1600;
    this.silenceThresholdRms = options.silenceThresholdRms || 0.025;

    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.chunks = [];
    this.isRecording = false;

    // Timers
    this.maxDurationTimer = null;
    this.initialSilenceTimer = null;
    this.silenceCheckInterval = null;

    // Speech energy tracking
    this.hasSpeechBegun = false;
    this.lastSpeechTime = 0;
    this.startTime = 0;
  }

  /**
   * Determine best supported audio MIME type
   */
  static getSupportedMimeType() {
    if (typeof window === 'undefined' || !window.MediaRecorder) {
      return '';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4'
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  /**
   * Start recording a command with silence detection
   * @param {MediaStream} [existingStream] Optional existing mic stream to reuse
   * @returns {Promise<boolean>}
   */
  async start(existingStream = null) {
    if (this.isRecording) {
      this.stop();
    }

    try {
      this.chunks = [];
      this.hasSpeechBegun = false;
      this.startTime = Date.now();
      this.lastSpeechTime = Date.now();

      // Acquire mic stream if not provided
      if (existingStream && existingStream.active) {
        this.audioStream = existingStream;
      } else {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      const mimeType = VoiceRecorder.getSupportedMimeType();
      const recorderOptions = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.audioStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      // Set up Web Audio Analyser for real-time speech / silence detection
      this._setupSilenceDetection(this.audioStream);

      // Start recording with 100ms time slice for steady data accumulation
      this.mediaRecorder.start(100);
      this.isRecording = true;

      // 1. Initial silence timeout (if user doesn't start speaking in 4 seconds)
      this.initialSilenceTimer = setTimeout(() => {
        if (this.isRecording && !this.hasSpeechBegun) {
          this.stop();
        }
      }, this.initialSilenceTimeoutMs);

      // 2. Max command duration (8 seconds limit)
      this.maxDurationTimer = setTimeout(() => {
        if (this.isRecording) {
          this.stop();
        }
      }, this.maxDurationMs);

      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Start error:', err);
      this._cleanup();
      return false;
    }
  }

  /**
   * Monitor audio stream volume/energy (RMS) to detect when user starts and stops speaking
   */
  _setupSilenceDetection(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speechFrames = 0;

      this.silenceCheckInterval = setInterval(() => {
        if (!this.isRecording || !this.analyser) return;

        const now = Date.now();
        // Ignore audio in first 500ms (grace period for chime sound / mic acquisition pop)
        if (now - this.startTime < 500) {
          this.lastSpeechTime = now;
          return;
        }

        this.analyser.getByteTimeDomainData(dataArray);

        // Calculate Root Mean Square (RMS) energy
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        if (rms > this.silenceThresholdRms) {
          speechFrames++;
          // Require at least 2 consecutive frames (~160ms) above threshold to avoid mic pops
          if (speechFrames >= 2) {
            if (!this.hasSpeechBegun) {
              this.hasSpeechBegun = true;
              if (this.initialSilenceTimer) {
                clearTimeout(this.initialSilenceTimer);
                this.initialSilenceTimer = null;
              }
            }
            this.lastSpeechTime = now;
          }
        } else {
          speechFrames = 0;
          // Silence detected: if user has already spoken, check if they stopped speaking
          if (this.hasSpeechBegun && now - this.lastSpeechTime > this.endOfSpeechSilenceMs) {
            this.stop();
          }
        }
      }, 80);
    } catch (e) {
      // Graceful fallback: If Web Audio Analyser is unavailable, max duration timer still works
      console.warn('[VoiceRecorder] Silence detection setup note:', e);
    }
  }

  /**
   * Stop recording and package the captured audio
   * @returns {Promise<{ audioBlob: Blob|null, audioBase64: string, mimeType: string, durationMs: number }>}
   */
  async stop() {
    // Clear all timers immediately
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    if (this.initialSilenceTimer) clearTimeout(this.initialSilenceTimer);
    if (this.silenceCheckInterval) clearInterval(this.silenceCheckInterval);

    // Release microphone tracks immediately to free hardware
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.audioStream = null;
    }

    if (!this.isRecording && !this.mediaRecorder) {
      this._cleanup();
      return { audioBlob: null, audioBase64: '', mimeType: '', durationMs: 0 };
    }

    this.isRecording = false;

    return new Promise((resolve) => {
      const finish = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = this.chunks.length > 0 ? new Blob(this.chunks, { type: mimeType }) : null;
        const durationMs = Date.now() - this.startTime;

        let audioBase64 = '';
        if (audioBlob && audioBlob.size > 200) {
          try {
            audioBase64 = await this._blobToBase64(audioBlob);
          } catch (e) {
            console.warn('[VoiceRecorder] Base64 conversion notice:', e);
          }
        }

        this._cleanup();
        resolve({ audioBlob, audioBase64, mimeType, durationMs });
      };

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = finish;
        try {
          this.mediaRecorder.stop();
        } catch {
          finish();
        }
      } else {
        finish();
      }
    });
  }

  /**
   * Convert Blob to Base64 data string (excluding data URI header)
   */
  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        if (typeof res === 'string') {
          const base64Data = res.split(',')[1] || '';
          resolve(base64Data);
        } else {
          resolve('');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Release audio tracks and audio context to protect privacy and free memory
   */
  _cleanup() {
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.audioStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.isRecording = false;
  }
}
