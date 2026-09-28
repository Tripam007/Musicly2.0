/**
 * VoiceResponseManager.js
 *
 * Handles speech synthesis (TTS) and smooth audio ducking.
 * - Does NOT permanently modify user volume settings.
 * - Ducking temporarily scales playback audio during spoken feedback.
 * - Uses browser window.speechSynthesis with graceful fallback if unavailable.
 */

export class VoiceResponseManager {
  constructor(options = {}) {
    this.audioEngineGetter = options.getAudioEngine || null;
    this.getCurrentVolume = options.getCurrentVolume || (() => 0.7);
    this.setTemporaryVolume = options.setTemporaryVolume || null;
    
    this.enabled = true;
    this.duckingEnabled = true;
    this.duckFactor = 0.28; // Drop volume to 28% while speaking
    this.isSpeaking = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.selectedVoice = null;

    this._initVoice();
  }

  _initVoice() {
    if (!this.synth) return;
    const updateVoice = () => {
      try {
        const voices = this.synth.getVoices();
        // Prefer natural English voices (Google, Samantha, Karen, Daniel, etc.)
        this.selectedVoice = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Siri'))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
      } catch (e) {
        console.warn('[VoiceResponseManager] Error querying voices:', e);
      }
    };

    updateVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoice;
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
   * Speak response text briefly with optional audio ducking
   * @param {string} text - The short response message (e.g., "Playing Kaavish.")
   * @returns {Promise<void>}
   */
  async speak(text) {
    if (!this.enabled || !text || !this.synth) {
      return;
    }

    this.cancel();

    const originalVol = this.getCurrentVolume();
    const shouldDuck = this.duckingEnabled && typeof this.setTemporaryVolume === 'function' && originalVol > 0.05;

    if (shouldDuck) {
      this.setTemporaryVolume(originalVol * this.duckFactor);
    }

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        }
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const cleanup = () => {
          this.isSpeaking = false;
          if (shouldDuck) {
            this.setTemporaryVolume(originalVol);
          }
          resolve();
        };

        utterance.onend = cleanup;
        utterance.onerror = (err) => {
          console.warn('[VoiceResponseManager] TTS error:', err);
          cleanup();
        };

        this.isSpeaking = true;
        this.synth.speak(utterance);

        // Fallback safety timeout if TTS hangs (max 5s)
        setTimeout(() => {
          if (this.isSpeaking) {
            cleanup();
          }
        }, 5000);
      } catch (err) {
        console.warn('[VoiceResponseManager] speak failed:', err);
        if (shouldDuck) {
          this.setTemporaryVolume(originalVol);
        }
        resolve();
      }
    });
  }

  cancel() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.isSpeaking = false;
  }
}
