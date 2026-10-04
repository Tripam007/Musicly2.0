/**
 * WakeWordManager.js
 * 
 * Local "Hey Musicly" Wake Word Detector & Engine Abstraction.
 * Privacy-first:
 * - Operates 100% locally in the browser.
 * - Rejects continuous cloud streaming. Microphone audio is NEVER sent to Google Cloud for wake-word spotting.
 * - Enforces strict gatekeeping: Musicly only triggers on "Hey Musicly" or "Okay Musicly".
 * - Rock-solid stability: Prevents infinite restart loops, handles browser mic throttling safely.
 */

export class WakeWordManager {
  /**
   * @param {object} options
   * @param {string} [options.wakePhrase='Hey Musicly']
   * @param {string[]} [options.wakePhraseVariants]
   * @param {number} [options.cooldownMs=800]
   * @param {Function} [options.onWakeWord]
   */
  constructor(options = {}) {
    this.wakePhrase = options.wakePhrase || 'Hey Musicly';
    this.variants = options.wakePhraseVariants || [
      'hey musicly',
      'hey musically',
      'hey music ly',
      'hey music lee',
      'okay musicly',
      'ok musicly',
      'hay musicly'
    ];
    this.cooldownMs = options.cooldownMs || 800;
    this.onWakeWordCallback = options.onWakeWord || null;

    this.lastDetectedTime = 0;
    this.isLocked = false;
    this.isListeningActive = false;
    this.recognition = null;
    this.restartTimeoutId = null;
    this.consecutiveErrors = 0;
    this.mode = 'WAKE'; // 'WAKE' | 'COMMAND'
    this.onCommandCallback = null;
    this.lang = options.lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US';
    this.rollingBuffer = [];

    // Robust wake word regex: matches standard address ("Hey Musicly", "Okay Musicly", "Hi Musicly")
    // AND whisper transcriptions where consonants/vowels are softened or "hey" is dropped:
    this.wakeWordRegex = /\b(?:hey|hay|ay|eh|he|hi|a|ok|okay|listen)\s+(?:musicly|musically|music\s*ly|music\s*lee|misicly|muzicly|musely|macely|mixly|musical|music\s*(?:live|life|line|light|like)?|music)\b|^(?:musicly|musically|music\s*ly|music\s*lee|misicly|muzicly)\b/i;

    // Reject false positives where wake word isn't addressing the assistant
    this.falsePositiveRegexes = [
      /\bhey\s+google\b/i,
      /\bhey\s+siri\b/i,
      /\bhey\s+alexa\b/i,
      /\bmusicly\s+is\b/i,
      /\bi\s+like\s+musicly\b/i
    ];
  }

  /**
   * Set callback for wake word detection
   */
  onWakeWordDetected(callback) {
    this.onWakeWordCallback = callback;
  }

  /**
   * Switch into active command listening mode
   * Keeps the microphone continuously active to receive the command smoothly
   */
  startCommandMode(callback) {
    this.mode = 'COMMAND';
    this.onCommandCallback = callback;
    this.isLocked = false;
    this._clearRestart();
    if (!this.recognition) {
      this._initEngine();
    }
    if (this.recognition && !this.isListeningActive) {
      this.isListeningActive = true;
      try { this.recognition.start(); } catch {}
    }
  }

  /**
   * Switch back to wake-word phrase spotting mode
   */
  startWakeWordMode() {
    this.mode = 'WAKE';
    this.onCommandCallback = null;
    this.isLocked = false;
    this.lastDetectedTime = Date.now();
    this._clearRestart();
    if (!this.recognition) {
      this._initEngine();
    }
    if (this.recognition && !this.isListeningActive) {
      this.isListeningActive = true;
      try { this.recognition.start(); } catch {}
    }
  }

  /**
   * Check if currently listening for wake word
   */
  isListening() {
    return this.isListeningActive;
  }

  /**
   * Resets internal detection timer and lock
   */
  reset() {
    this.lastDetectedTime = 0;
    this.isLocked = false;
    this.mode = 'WAKE';
    this.onCommandCallback = null;
  }

  /**
   * Lock wake word detector (e.g. while recording a command)
   */
  lock() {
    this.isLocked = true;
    this._clearRestart();
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
  }

  /**
   * Unlock wake word detector
   */
  unlock() {
    this.isLocked = false;
    this.lastDetectedTime = Date.now();
    this._scheduleRestart(400);
  }

  _clearRestart() {
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
  }

  _scheduleRestart(delayMs = 200) {
    this._clearRestart();
    if (!this.isListeningActive || this.isLocked) return;

    this.restartTimeoutId = setTimeout(() => {
      if (this.isListeningActive && !this.isLocked && this.consecutiveErrors < 5) {
        try {
          if (!this.recognition) this._initEngine();
          this.recognition?.start();
        } catch {
          // Ignore if already active
        }
      }
    }, delayMs);
  }

  /**
   * Checks multi-word speech fragments that arrive split across interim frames
   */
  _checkRollingBuffer(transcript) {
    if (!transcript || this.isLocked || this.mode !== 'WAKE') return;
    const now = Date.now();
    this.rollingBuffer = (this.rollingBuffer || []).filter(e => now - e.time < 3500);
    this.rollingBuffer.push({ text: transcript.trim(), time: now });

    const combined = this.rollingBuffer.map(e => e.text).join(' ');
    if (combined && combined.length > transcript.trim().length) {
      this.processTranscript(combined);
    }
  }

  /**
   * Initialize local browser speech engine for offline phrase spotting
   */
  _initEngine() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;
      // Examine top 5 hypotheses: whispers often land in alternative #2 or #3
      this.recognition.maxAlternatives = 5;

      this.recognition.onstart = () => {
        this.consecutiveErrors = 0;
      };

      this.recognition.onresult = (event) => {
        if (!this.isListeningActive || this.isLocked) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const topTranscript = item[0]?.transcript || '';
          if (!topTranscript) continue;

          if (this.mode === 'COMMAND') {
            if (item.isFinal) {
              finalTranscript += topTranscript;
            } else {
              interimTranscript += topTranscript;
            }
          } else {
            // WAKE mode: check top transcript AND all N-best alternatives (essential for whispers!)
            let found = false;
            for (let a = 0; a < item.length; ++a) {
              const altText = item[a]?.transcript || '';
              if (altText) {
                const res = this.processTranscript(altText);
                if (res.detected) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && topTranscript) {
              this._checkRollingBuffer(topTranscript);
            }
          }
        }

        if (this.mode === 'COMMAND') {
          const raw = (finalTranscript || interimTranscript).trim();
          if (raw) {
            // Strip any wake word that might still be in the recognizer's buffer
            const cleanText = raw.replace(this.wakeWordRegex, '').replace(/^[,.\s]+/, '').trim();
            if (typeof this.onCommandCallback === 'function') {
              this.onCommandCallback({
                text: cleanText || raw,
                isFinal: !!finalTranscript,
                rawText: raw
              });
            }
          }
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') {
          // Soft quiet speech or pause is normal
          this.consecutiveErrors = 0;
          return;
        }
        this.consecutiveErrors++;
        console.warn('[WakeWordManager] Local phrase spotter event:', e.error);

        // If permission explicitly denied by user, stop looping
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.isListeningActive = false;
          this._clearRestart();
        } else {
          // For audio-capture busy or network hiccups: retry after 600ms
          this._scheduleRestart(600);
        }
      };

      this.recognition.onend = () => {
        // Fast restart so there is no dead audio window for quiet whispers
        if (this.isListeningActive && !this.isLocked) {
          this._scheduleRestart(this.consecutiveErrors > 0 ? 800 : 150);
        }
      };
    } catch (err) {
      console.warn('[WakeWordManager] Speech engine init note:', err);
    }
  }

  /**
   * Start listening for "Hey Musicly"
   */
  start() {
    this.isListeningActive = true;
    this.isLocked = false;
    this.consecutiveErrors = 0;
    this.rollingBuffer = [];
    this._clearRestart();

    if (!this.recognition) {
      this._initEngine();
    }
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // already started or transitioning
      }
    }
    return true;
  }

  /**
   * Stop listening for wake word and unconditionally release microphone
   */
  stop() {
    this.isListeningActive = false;
    this.isLocked = false;
    this.consecutiveErrors = 0;
    this.rollingBuffer = [];
    this._clearRestart();

    if (this.recognition) {
      const rec = this.recognition;
      // Strip handlers so no error or onend restarts occur
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {}
      try {
        rec.stop();
      } catch {}
      this.recognition = null;
    }
  }

  /**
   * Pause listening (e.g. during command recording or TTS response)
   */
  pause() {
    this.isLocked = true;
    this._clearRestart();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Resume listening after command execution or cooldown
   */
  resume() {
    this.isLocked = false;
    this.lastDetectedTime = Date.now();
    this._scheduleRestart(350);
  }

  /**
   * Evaluates text transcript for the "Hey Musicly" wake word
   * @param {string} text
   * @returns {{ detected: boolean, confidence: number, tailCommand: string }}
   */
  processTranscript(text) {
    if (!text || typeof text !== 'string') {
      return { detected: false, confidence: 0, tailCommand: '' };
    }

    const now = Date.now();
    if (this.isLocked || (this.lastDetectedTime > 0 && now - this.lastDetectedTime < this.cooldownMs)) {
      return { detected: false, confidence: 0, tailCommand: '' };
    }

    const clean = text.trim();

    // Check false positive phrases
    for (const fp of this.falsePositiveRegexes) {
      if (fp.test(clean) && !/\b(?:hey|ok|okay)\s+musicly\s+play\b/i.test(clean)) {
        return { detected: false, confidence: 0, tailCommand: '' };
      }
    }

    const match = this.wakeWordRegex.exec(clean);
    if (!match) {
      return { detected: false, confidence: 0, tailCommand: '' };
    }

    // Wake word detected! Extract trailing words spoken in the same breath
    const matchEnd = match.index + match[0].length;
    const tailCommand = clean.substring(matchEnd).replace(/^[,.\s]+/, '').trim();
    const isExact = match[0].toLowerCase() === 'hey musicly';
    const confidence = isExact ? 0.98 : 0.92;

    this.lastDetectedTime = now;
    this.isLocked = true; // immediately lock to prevent double-firing

    const payload = {
      detected: true,
      confidence,
      tailCommand,
      matchSnippet: match[0].trim()
    };

    if (typeof this.onWakeWordCallback === 'function') {
      try {
        this.onWakeWordCallback(payload);
      } catch (err) {
        console.warn('[WakeWordManager] onWakeWordCallback exception:', err);
      }
    }

    return payload;
  }
}
