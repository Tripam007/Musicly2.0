/**
 * VoiceResponseManager.js
 * 
 * Handles hybrid spoken responses (Google Cloud TTS, ElevenLabs TTS, or local fallback)
 * and smooth music audio ducking.
 * 
 * Strict audio safety rules:
 * 1. Voice response audio plays through a dedicated, isolated HTML5 Audio element.
 * 2. NEVER routes voice audio through the main music player.
 * 3. NEVER modifies main player's currentTime or destroys its AudioContext.
 * 4. Temporarily ducks music volume smoothly during speech, then restores it.
 * 5. Supports both Google Cloud TTS & ElevenLabs TTS with zero-interruption fallback.
 * 6. Never plays two voice streams simultaneously.
 */

import { getSelectedVoiceId, getVoiceById } from '../utils/voiceRegistryDB.js';
import { resolveMatchingBrowserVoice } from '../utils/elevenLabsTTS.js';

export class VoiceResponseManager {
  /**
   * @param {object} options
   * @param {Function} [options.getCurrentVolume]
   * @param {Function} [options.setTemporaryVolume]
   * @param {object} [options.commandClient]
   * @param {string} [options.voiceId]
   * @param {string} [options.responseProvider='elevenlabs']
   * @param {number} [options.duckFactor=0.28]
   * @param {boolean} [options.enabled=true]
   * @param {boolean} [options.duckingEnabled=true]
   * @param {Function} [options.onSpeakingChange]
   */
  constructor(options = {}) {
    this.getCurrentVolume = options.getCurrentVolume || (() => 0.7);
    this.setTemporaryVolume = options.setTemporaryVolume || null;
    this.commandClient = options.commandClient || null;
    this.voiceId = options.voiceId || getSelectedVoiceId();
    this.responseProvider = options.responseProvider || 'elevenlabs';
    this.duckFactor = options.duckFactor !== undefined ? options.duckFactor : 0.28;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.duckingEnabled = options.duckingEnabled !== undefined ? options.duckingEnabled : true;
    this.onSpeakingChange = options.onSpeakingChange || null;

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

  setVoiceId(voiceId) {
    if (voiceId) {
      this.voiceId = voiceId;
    }
  }

  setResponseProvider(provider) {
    if (provider) {
      this.responseProvider = provider;
    }
  }

  setDucking(val) {
    this.duckingEnabled = !!val;
  }

  _setSpeakingState(isSpeaking) {
    this.isSpeaking = isSpeaking;
    if (typeof this.onSpeakingChange === 'function') {
      try {
        this.onSpeakingChange(isSpeaking);
      } catch {}
    }
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
   * Speak a system response via the selected provider (Google TTS or ElevenLabs TTS)
   * 
   * @param {string} text - Response text to speak
   * @param {object|string} [options] - Options object or voiceId string
   * @returns {Promise<void>}
   */
  async speak(text, options = null) {
    if (!this.enabled || !text) return;

    // Safety: Cancel any currently running voice to avoid overlapping dual streams
    this.cancel();
    this._setSpeakingState(true);
    const originalVol = this._duckAudio();

    const opts = typeof options === 'string' ? { voiceId: options } : (options || {});
    const targetVoiceId = opts.voiceId || this.voiceId || getSelectedVoiceId();
    const provider = opts.provider || this.responseProvider || 'elevenlabs';
    const language = opts.language || 'en-US';
    const gender = opts.gender || 'FEMALE';
    const voiceDef = getVoiceById(targetVoiceId);

    try {
      // 1. If explicit browser speech requested, use SpeechSynthesis
      if (provider === 'system_native' || targetVoiceId === 'system_native') {
        await this._speakFallback(text, voiceDef);
        return;
      }

      // 2. Primary TTS via VoiceCommandClient (Google TTS or ElevenLabs TTS)
      if (this.commandClient) {
        const ttsResult = await this.commandClient.generateVoiceResponse(text, {
          provider,
          voiceId: targetVoiceId,
          language,
          gender
        });

        if (ttsResult && ttsResult.success && ttsResult.audioBase64 && this.voiceAudio) {
          await this._playAudioBase64(ttsResult.audioBase64, ttsResult.mimeType || 'audio/mpeg');
          return;
        }

        // Automatic Provider Cross-Fallback: If primary provider failed, try alternate provider
        const alternateProvider = provider === 'google' ? 'elevenlabs' : 'google';
        const fallbackResult = await this.commandClient.generateVoiceResponse(text, {
          provider: alternateProvider,
          voiceId: targetVoiceId,
          language,
          gender
        });

        if (fallbackResult && fallbackResult.success && fallbackResult.audioBase64 && this.voiceAudio) {
          await this._playAudioBase64(fallbackResult.audioBase64, fallbackResult.mimeType || 'audio/mpeg');
          return;
        }
      }

      // 3. Fallback: Browser Web Speech Synthesis matching persona pitch/rate
      await this._speakFallback(text, voiceDef);
    } catch (err) {
      console.warn('[VoiceResponseManager] speak failed gracefully:', err);
    } finally {
      this._restoreAudio(originalVol);
      this._setSpeakingState(false);
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

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        if (this.voiceAudio) {
          this.voiceAudio.onended = null;
          this.voiceAudio.onerror = null;
        }
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

      // Safety timeout (max 7 seconds)
      setTimeout(cleanup, 7000);
    });
  }

  /**
   * Fallback using window.speechSynthesis configured to match persona
   */
  _speakFallback(text, voiceDef = null) {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const resolvedVoice = resolveMatchingBrowserVoice(voiceDef);
        if (resolvedVoice) {
          utterance.voice = resolvedVoice;
        } else if (this.fallbackVoice) {
          utterance.voice = this.fallbackVoice;
        }

        const isFemale = (voiceDef?.gender || '').toLowerCase().includes('female');
        const isBritish = (voiceDef?.accent || voiceDef?.style || '').toLowerCase().includes('british') || voiceDef?.id === 'AeRdCCKzvd23BpJoofzx';

        utterance.pitch = voiceDef?.pitch !== undefined ? voiceDef.pitch : (isFemale ? 1.15 : (isBritish ? 0.82 : 0.80));
        utterance.rate = voiceDef?.rate !== undefined ? voiceDef.rate : (isBritish ? 0.88 : 1.02);
        utterance.volume = 1.0;

        let resolved = false;
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          utterance.onend = null;
          utterance.onerror = null;
          resolve();
        };

        utterance.onend = cleanup;
        utterance.onerror = cleanup;

        this.synth.speak(utterance);

        // Safety timeout in case speechSynthesis hangs
        setTimeout(cleanup, 5000);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Cancel any active spoken response immediately
   */
  cancel() {
    this._setSpeakingState(false);
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.removeAttribute('src');
        this.voiceAudio.load();
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
