/**
 * VoiceControlManager.js
 *
 * Master coordinator for the "HEY MUSICLY" voice control pipeline:
 * 1. WakeWordManager (Local detection of "Hey Musicly")
 * 2. SpeechRecognitionManager (Speech-to-text capture)
 * 3. VoiceCommandParser (Context-aware natural language understanding)
 * 4. MusiclyActionRegistry (Safe action execution)
 * 5. VoiceResponseManager (Speech synthesis + volume ducking)
 *
 * Manages explicit state machine:
 * IDLE -> LISTENING_FOR_WAKE_WORD -> WAKE_WORD_DETECTED -> LISTENING_FOR_COMMAND
 * -> PROCESSING_COMMAND -> EXECUTING_ACTION -> RESPONDING -> COOLDOWN -> LISTENING_FOR_WAKE_WORD
 */

import { VOICE_STATES, MUSICLY_ACTIONS, DEFAULT_VOICE_CONFIG } from './voiceConfig.js';
import { SpeechRecognitionManager } from './SpeechRecognitionManager.js';
import { WakeWordManager } from './WakeWordManager.js';
import { VoiceCommandParser } from './VoiceCommandParser.js';
import { MusiclyActionRegistry } from './MusiclyActionRegistry.js';
import { VoiceResponseManager } from './VoiceResponseManager.js';

export class VoiceControlManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...options.config };
    this.state = VOICE_STATES.IDLE;
    this.listeners = new Set();
    this.commandTimeoutId = null;
    this.pendingConfirmation = null; // { actionObj, timeoutId }

    // Audio chime context for subtle auditory feedback
    this.audioCtx = null;

    // Sub-modules
    this.actionRegistry = new MusiclyActionRegistry();
    this.speechManager = new SpeechRecognitionManager();
    this.wakeWordManager = new WakeWordManager({
      onWakeWord: (payload) => this._onWakeWordTriggered(payload),
    });
    this.commandParser = new VoiceCommandParser();
    this.responseManager = new VoiceResponseManager({
      getCurrentVolume: options.getCurrentVolume,
      setTemporaryVolume: options.setTemporaryVolume,
    });

    this.responseManager.setEnabled(this.config.enableVoiceResponses);
    this.responseManager.setDucking(this.config.enableDucking);

    // Telemetry storage in localStorage
    this.telemetryKey = 'musicly_voice_analytics';
    this.telemetry = this._loadTelemetry();

    // Hook speech recognizer callbacks
    this._setupSpeechRecognition();
  }

  // --- State & Observer Pattern ---
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.getStatePayload());
    return () => this.listeners.delete(listener);
  }

  _notify(extra = {}) {
    const payload = { ...this.getStatePayload(), ...extra };
    this.listeners.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('[VoiceControlManager] Listener err:', e); }
    });
  }

  getStatePayload() {
    return {
      state: this.state,
      isSupported: this.speechManager.isSupported(),
      hasPermission: this.speechManager.hasPermission,
      lastRecognized: this.lastRecognized || '',
      lastResponse: this.lastResponse || '',
      confidence: this.lastConfidence || 0,
      config: { ...this.config },
    };
  }

  _setState(newState, extra = {}) {
    this.state = newState;
    this._notify(extra);
  }

  // --- Telemetry Tracking ---
  _loadTelemetry() {
    try {
      const data = localStorage.getItem(this.telemetryKey);
      if (data) return JSON.parse(data);
    } catch (e) { /* ignore */ }
    return {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      unknownCommands: 0,
      commandCounts: {},
      latencies: [],
    };
  }

  _recordTelemetry(action, success, latencyMs) {
    if (!this.config.enableAnalytics) return;
    this.telemetry.totalCommands++;
    if (success) {
      this.telemetry.successfulCommands++;
    } else {
      this.telemetry.failedCommands++;
    }
    if (action === MUSICLY_ACTIONS.UNKNOWN) {
      this.telemetry.unknownCommands++;
    }
    this.telemetry.commandCounts[action] = (this.telemetry.commandCounts[action] || 0) + 1;
    if (latencyMs) {
      this.telemetry.latencies.push(latencyMs);
      if (this.telemetry.latencies.length > 50) this.telemetry.latencies.shift();
    }
    try {
      localStorage.setItem(this.telemetryKey, JSON.stringify(this.telemetry));
    } catch (e) { /* ignore */ }
  }

  getAnalytics() {
    const avgLatency = this.telemetry.latencies.length
      ? Math.round(this.telemetry.latencies.reduce((a, b) => a + b, 0) / this.telemetry.latencies.length)
      : 0;

    return {
      totalCommands: this.telemetry.totalCommands,
      successfulCommands: this.telemetry.successfulCommands,
      failedCommands: this.telemetry.failedCommands,
      unknownCommands: this.telemetry.unknownCommands,
      averageLatencyMs: avgLatency,
      commandBreakdown: { ...this.telemetry.commandCounts },
    };
  }

  // --- Subtle Chime Audio Feedback ---
  _playChime(type = 'wake') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'wake') {
        // Subtle Apple-like dual tone (523Hz C5 -> 659Hz E5)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'confirm') {
        // Soft positive blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {
      // Audio chime failure should never crash app
    }
  }

  // --- Speech Recognition Binding ---
  _setupSpeechRecognition() {
    this.speechManager.on('result', (result) => {
      this._handleSpeechResult(result);
    });

    this.speechManager.on('error', (err) => {
      console.warn('[VoiceControlManager] Recognition error:', err);
    });

    this.speechManager.on('end', () => {
      if (this.state !== VOICE_STATES.IDLE && this.state !== VOICE_STATES.RESPONDING) {
        // Keep listening unless explicitly stopped
        if (this.speechManager.isListening) {
          this.speechManager.start();
        }
      }
    });
  }

  // --- Start / Stop Lifecycle ---
  async start() {
    if (!this.speechManager.isSupported()) {
      console.warn('[VoiceControlManager] Speech recognition not supported in browser.');
      return false;
    }

    const started = await this.speechManager.start();
    if (started) {
      this._setState(VOICE_STATES.LISTENING_FOR_WAKE_WORD);
    }
    return started;
  }

  stop() {
    this._clearCommandTimeout();
    this.pendingConfirmation = null;
    this.speechManager.stop();
    this.responseManager.cancel();
    this.wakeWordManager.reset();
    this._setState(VOICE_STATES.IDLE);
  }

  toggle() {
    if (this.state === VOICE_STATES.IDLE) {
      return this.start();
    } else {
      this.stop();
      return false;
    }
  }

  // --- Wake Word Handling ---
  _onWakeWordTriggered({ confidence, tailCommand }) {
    if (this.state !== VOICE_STATES.LISTENING_FOR_WAKE_WORD) return;

    this.lastConfidence = confidence;
    this._playChime('wake');
    this._setState(VOICE_STATES.WAKE_WORD_DETECTED);

    // If tail command was spoken in the same breath ("Hey Musicly play Faasle")
    if (tailCommand && tailCommand.trim().length > 1) {
      setTimeout(() => {
        this._processCommandString(tailCommand.trim());
      }, 350);
      return;
    }

    // Otherwise, transition to listening for command with timeout
    setTimeout(() => {
      if (this.state === VOICE_STATES.WAKE_WORD_DETECTED) {
        this._setState(VOICE_STATES.LISTENING_FOR_COMMAND);
        this._armCommandTimeout();
      }
    }, 450);
  }

  _armCommandTimeout() {
    this._clearCommandTimeout();
    this.commandTimeoutId = setTimeout(() => {
      if (this.state === VOICE_STATES.LISTENING_FOR_COMMAND) {
        this._handleCommandTimeout();
      }
    }, this.config.commandTimeoutMs);
  }

  _clearCommandTimeout() {
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
  }

  async _handleCommandTimeout() {
    this._setState(VOICE_STATES.RESPONDING, { lastResponse: "Didn't hear a command." });
    await this.responseManager.speak("Sorry, I didn't hear a command.");
    this._returnToWakeWordListening();
  }

  // --- Speech Results Pipeline ---
  _handleSpeechResult({ text, isFinal, confidence }) {
    if (!text) return;
    this.lastRecognized = text;

    // 1. If we are LISTENING_FOR_WAKE_WORD, pass to WakeWordManager
    if (this.state === VOICE_STATES.LISTENING_FOR_WAKE_WORD) {
      this.wakeWordManager.processTranscript(text);
      return;
    }

    // 2. If we are LISTENING_FOR_COMMAND, accept speech as command
    if (this.state === VOICE_STATES.LISTENING_FOR_COMMAND) {
      this._clearCommandTimeout();
      if (isFinal || text.split(' ').length >= 2) {
        this._processCommandString(text);
      }
    }
  }

  // --- Command Processing & Intent Parsing ---
  async _processCommandString(commandText) {
    this._clearCommandTimeout();
    this._setState(VOICE_STATES.PROCESSING_COMMAND, { lastRecognized: commandText });

    const startTime = performance.now();

    // Check cancellation
    if (/^(cancel|nevermind|stop listening|dismiss)$/i.test(commandText.trim())) {
      this._returnToWakeWordListening();
      return;
    }

    // Check confirmation if waiting for yes/no
    if (this.pendingConfirmation) {
      const isYes = /^(yes|confirm|sure|proceed|do it|okay)$/i.test(commandText.trim());
      const isNo = /^(no|cancel|don't|stop|abort)$/i.test(commandText.trim());

      const { actionObj } = this.pendingConfirmation;
      this.pendingConfirmation = null;

      if (isYes) {
        await this._executeAction(actionObj, startTime);
        return;
      } else {
        await this.responseManager.speak('Action cancelled.');
        this._returnToWakeWordListening();
        return;
      }
    }

    // Parse Intent
    const context = this.actionRegistry.contextProvider() || {};
    const parsedAction = this.commandParser.parse(commandText, context);

    if (parsedAction.action === MUSICLY_ACTIONS.CANCEL) {
      this._returnToWakeWordListening();
      return;
    }

    if (parsedAction.action === MUSICLY_ACTIONS.UNKNOWN) {
      this._recordTelemetry(MUSICLY_ACTIONS.UNKNOWN, false, performance.now() - startTime);
      this._setState(VOICE_STATES.RESPONDING, { lastResponse: "Command not recognized." });
      await this.responseManager.speak("Sorry, I didn't recognize that command.");
      this._returnToWakeWordListening();
      return;
    }

    // Check if requires confirmation
    if (parsedAction.requiresConfirmation && this.config.confirmationMode !== 'never') {
      this.pendingConfirmation = { actionObj: parsedAction };
      this._setState(VOICE_STATES.RESPONDING, { lastResponse: parsedAction.confirmPrompt });
      await this.responseManager.speak(parsedAction.confirmPrompt);
      // Wait for yes/no
      this._setState(VOICE_STATES.LISTENING_FOR_COMMAND);
      this._armCommandTimeout();
      return;
    }

    await this._executeAction(parsedAction, startTime);
  }

  async _executeAction(actionObj, startTime) {
    this._setState(VOICE_STATES.EXECUTING_ACTION);
    this._playChime('confirm');

    const result = await this.actionRegistry.execute(actionObj);
    const latency = Math.round(performance.now() - startTime);
    this._recordTelemetry(actionObj.action, result.success, latency);

    if (result.responseText) {
      this._setState(VOICE_STATES.RESPONDING, { lastResponse: result.responseText });
      await this.responseManager.speak(result.responseText);
    }

    this._returnToWakeWordListening();
  }

  _returnToWakeWordListening() {
    this.pendingConfirmation = null;
    this._clearCommandTimeout();
    this.wakeWordManager.reset();

    this._setState(VOICE_STATES.COOLDOWN);
    setTimeout(() => {
      if (this.speechManager.isListening) {
        this._setState(VOICE_STATES.LISTENING_FOR_WAKE_WORD, { lastResponse: '' });
      } else {
        this._setState(VOICE_STATES.IDLE);
      }
    }, this.config.wakeCooldownMs);
  }

  // --- Configuration updates ---
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    if ('enableVoiceResponses' in updates) {
      this.responseManager.setEnabled(this.config.enableVoiceResponses);
    }
    if ('enableDucking' in updates) {
      this.responseManager.setDucking(this.config.enableDucking);
    }
    this._notify();
  }
}
