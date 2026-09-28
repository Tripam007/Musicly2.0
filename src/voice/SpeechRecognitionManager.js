/**
 * SpeechRecognitionManager - Abstract Speech-to-Text Provider Wrapper
 * 
 * Safely wraps browser Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * with robust auto-reconnection, error classification, and provider abstraction.
 */

export class SpeechRecognitionManager {
  constructor(options = {}) {
    this.lang = options.lang || 'en-US';
    this.continuous = options.continuous !== undefined ? options.continuous : true;
    this.interimResults = options.interimResults !== undefined ? options.interimResults : true;
    this.maxAlternatives = options.maxAlternatives || 2;

    this.recognition = null;
    this.isListening = false;
    this.isExplicitlyStopped = true;
    this.restartTimeoutId = null;

    // Callbacks & listeners
    this.listeners = {
      result: new Set(),
      error: new Set(),
      start: new Set(),
      end: new Set()
    };
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;

    this.init();
  }

  isSupported() {
    return SpeechRecognitionManager.isSupported();
  }

  static isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  on(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event].add(fn);
    }
    return () => this.listeners[event]?.delete(fn);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => {
        try { fn(data); } catch (e) { console.error(`[SpeechRecognition] Listener err (${event}):`, e); }
      });
    }
  }

  start() {
    return this.startListening();
  }

  stop() {
    return this.stopListening();
  }

  init() {
    if (!SpeechRecognitionManager.isSupported()) {
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = this.continuous;
      this.recognition.interimResults = this.interimResults;
      this.recognition.maxAlternatives = this.maxAlternatives;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStartCallback?.();
        this.emit('start');
      };

      this.recognition.onresult = (event) => {
        if (!event.results) return;

        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0.85;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0].transcript;
          if (item[0].confidence > 0) {
            highestConfidence = Math.max(highestConfidence, item[0].confidence);
          }

          if (item.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const cleanFinal = finalTranscript.trim();
        const cleanInterim = interimTranscript.trim();
        const text = cleanFinal || cleanInterim;

        if (text) {
          const payload = {
            text,
            transcript: text,
            finalText: cleanFinal,
            interimText: cleanInterim,
            isFinal: !!cleanFinal,
            confidence: Math.round(highestConfidence * 100) / 100
          };
          this.onResultCallback?.(payload);
          this.emit('result', payload);
        }
      };

      this.recognition.onerror = (event) => {
        // "no-speech" is normal when user is quiet
        if (event.error === 'no-speech') {
          return;
        }

        // "aborted" occurs on normal stop/abort
        if (event.error === 'aborted') {
          return;
        }

        console.warn('[SpeechRecognition] Engine error:', event.error, event.message);
        this.onErrorCallback?.(event.error, event);
        this.emit('error', event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onEndCallback?.();
        this.emit('end');

        // Browser engines occasionally terminate continuous recognition automatically.
        // If the user didn't explicitly call stop(), restart gracefully after 150ms.
        if (!this.isExplicitlyStopped) {
          if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);
          this.restartTimeoutId = setTimeout(() => {
            if (!this.isExplicitlyStopped) {
              this.startListening();
            }
          }, 150);
        }
      };

      return true;
    } catch (err) {
      console.error('[SpeechRecognition] Init failure:', err);
      return false;
    }
  }

  setCallbacks({ onResult, onError, onStart, onEnd }) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;
  }

  startListening() {
    if (!this.recognition) {
      const initialized = this.init();
      if (!initialized) return false;
    }

    this.isExplicitlyStopped = false;

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      // If already started or transitioning, ignore DOMException
      if (err.name !== 'InvalidStateError') {
        console.warn('[SpeechRecognition] Start caught exception:', err);
      }
      return false;
    }
  }

  stopListening() {
    this.isExplicitlyStopped = true;
    if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  abort() {
    this.isExplicitlyStopped = true;
    if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }
    this.isListening = false;
  }

  destroy() {
    this.stopListening();
    this.recognition = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
  }
}
