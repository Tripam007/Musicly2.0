/**
 * VoiceResponseManager.js
 * 
 * Handles ElevenLabs voice responses and smooth music audio ducking.
 * Strict audio safety rules:
 * 1. Voice response audio plays through a dedicated, isolated HTML5 Audio element.
 * 2. NEVER routes voice audio through the main music player.
 * 3. NEVER modifies main player's currentTime or destroy its AudioContext.
 * 4. Temporarily ducks music volume smoothly during speech, then restores it.
 * 5. If ElevenLabs is unavailable, gracefully falls back to browser SpeechSynthesis.
 * 6. Player actions ALWAYS succeed even if voice feedback fails.
 */

export class VoiceResponseManager {
  /**
   * @param {object} options
   * @param {Function} [options.getCurrentVolume]
   * @param {Function} [options.setTemporaryVolume]
   * @param {object} [options.commandClient]
   * @param {number} [options.duckFactor=0.28]
   * @param {boolean} [options.enabled=true]
   * @param {boolean} [options.duckingEnabled=true]
   */
  constructor(options = {}) {
    this.getCurrentVolume = options.getCurrentVolume || (() => 0.7);
    this.setTemporaryVolume = options.setTemporaryVolume || null;
    this.commandClient = options.commandClient || null;
    this.duckFactor = options.duckFactor !== undefined ? options.duckFactor : 0.28;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.duckingEnabled = options.duckingEnabled !== undefined ? options.duckingEnabled : true;

    // Dedicated, isolated Audio element for voice responses
    this.voiceAudio = typeof window !== 'undefined' ? new Audio() : null;
    if (this.voiceAudio) {
      this.voiceAudio.preload = 'auto';
    }

    this.isSpeaking = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.fallbackVoice = null;

    this._initFallbackVoice();
  }

  _initFallbackVoice() {
    if (!this.synth) return;
    const findVoice = () => {
      try {
        const voices = this.synth.getVoices();
        this.fallbackVoice =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;
      } catch {
        // ignore
      }
    };
    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled) {
      this.cancel();
    }
  }

  setDucking(val) {
    this.duckingEnabled = !!val;
  }

  /**
   * Smoothly duck music volume
   */
  _duckAudio() {
    if (!this.duckingEnabled || typeof this.setTemporaryVolume !== 'function') {
      return null;
    }
    const originalVol = this.getCurrentVolume();
    if (originalVol > 0.05) {
      const ducked = Math.max(0.08, originalVol * this.duckFactor);
      this.setTemporaryVolume(ducked);
      return originalVol;
    }
    return null;
  }

  /**
   * Smoothly restore music volume
   */
  _restoreAudio(originalVol) {
    if (originalVol !== null && typeof this.setTemporaryVolume === 'function') {
      this.setTemporaryVolume(originalVol);
    }
  }

  /**
   * Speak a short system response using ElevenLabs, with fallback to browser SpeechSynthesis
   * @param {string} text - Short response text (e.g. "Playing Kaavish.")
   * @returns {Promise<void>}
   */
  async speak(text) {
    if (!this.enabled || !text) return;

    this.cancel();
    this.isSpeaking = true;
    const originalVol = this._duckAudio();

    try {
      // 1. Attempt ElevenLabs via Cloud Functions if client is available
      if (this.commandClient) {
        const elevenLabsResult = await this.commandClient.generateVoiceResponse(text);
        if (elevenLabsResult.success && elevenLabsResult.audioBase64 && this.voiceAudio) {
          await this._playAudioBase64(elevenLabsResult.audioBase64, elevenLabsResult.mimeType);
          this._restoreAudio(originalVol);
          this.isSpeaking = false;
          return;
        }
      }

      // 2. Fallback to Web Speech Synthesis
      await this._speakFallback(text);
    } catch (err) {
      console.warn('[VoiceResponseManager] speak failed gracefully:', err);
    } finally {
      this._restoreAudio(originalVol);
      this.isSpeaking = false;
    }
  }

  /**
   * Play base64 audio through isolated voiceAudio element
   */
  _playAudioBase64(base64Data, mimeType = 'audio/mpeg') {
    return new Promise((resolve) => {
      if (!this.voiceAudio) {
        resolve();
        return;
      }

      const audioSrc = `data:${mimeType};base64,${base64Data}`;
      this.voiceAudio.src = audioSrc;

      const cleanup = () => {
        this.voiceAudio.onended = null;
        this.voiceAudio.onerror = null;
        resolve();
      };

      this.voiceAudio.onended = cleanup;
      this.voiceAudio.onerror = (e) => {
        console.warn('[VoiceResponseManager] Audio element playback note:', e);
        cleanup();
      };

      this.voiceAudio.play().catch((err) => {
        console.warn('[VoiceResponseManager] Play error:', err);
        cleanup();
      });

      // Safety timeout (max 6 seconds)
      setTimeout(cleanup, 6000);
    });
  }

  /**
   * Fallback using window.speechSynthesis
   */
  _speakFallback(text) {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.fallbackVoice) {
          utterance.voice = this.fallbackVoice;
        }
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const cleanup = () => {
          utterance.onend = null;
          utterance.onerror = null;
          resolve();
        };

        utterance.onend = cleanup;
        utterance.onerror = cleanup;

        this.synth.speak(utterance);

        // Safety timeout in case speechSynthesis hangs
        setTimeout(cleanup, 4500);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Cancel any active spoken response
   */
  cancel() {
    this.isSpeaking = false;
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.src = '';
      } catch {
        // ignore
      }
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }
}
