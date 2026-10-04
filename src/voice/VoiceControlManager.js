/**
 * VoiceControlManager.js
 * 
 * Master coordinator for the Musicly Voice AI System.
 * Connects:
 * 1. WakeWordManager (Local offline "Hey Musicly" detector)
 * 2. VoiceRecorder (Opus MediaRecorder with real-time speech/silence detection)
 * 3. VoiceCommandClient (Firebase Cloud Functions -> Google Cloud STT & ElevenLabs TTS)
 * 4. VoiceCommandParser (Normalization, multilingual intents & fuzzy library matching)
 * 5. MusiclyActionRegistry (Centralized authoritative player action execution)
 * 6. VoiceResponseManager (ElevenLabs isolated playback with smooth music audio ducking)
 */

import { VOICE_STATES, MUSICLY_ACTIONS, DEFAULT_VOICE_CONFIG } from './voiceConfig.js';
import { WakeWordManager } from './WakeWordManager.js';
import { VoiceRecorder } from './VoiceRecorder.js';
import { VoiceCommandClient } from './VoiceCommandClient.js';
import { VoiceCommandParser } from './VoiceCommandParser.js';
import { MusiclyActionRegistry } from './MusiclyActionRegistry.js';
import { VoiceResponseManager } from './VoiceResponseManager.js';

export class VoiceControlManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...options.config };
    this.state = VOICE_STATES.IDLE;
    this.listeners = new Set();
    this.permissionGranted = false;
    this.lastDebugInfo = null;
    this.commandTimeoutId = null;

    // Sub-components
    this.actionRegistry = MusiclyActionRegistry.getInstance();
    this.commandClient = new VoiceCommandClient({ functions: options.functions });
    this.recorder = new VoiceRecorder({
      maxDurationMs: this.config.maxCommandDurationMs,
      initialSilenceTimeoutMs: this.config.initialSilenceTimeoutMs,
      endOfSpeechSilenceMs: this.config.endOfSpeechSilenceMs,
      silenceThresholdRms: this.config.silenceThresholdRms,
    });

    this.wakeWordManager = new WakeWordManager({
      wakePhrase: this.config.wakePhrase,
      wakePhraseVariants: this.config.wakePhraseVariants,
      cooldownMs: this.config.wakeCooldownMs,
      lang: this.config.language,
      onWakeWord: (payload) => this._onWakeWordTriggered(payload),
    });

    this.responseManager = new VoiceResponseManager({
      getCurrentVolume: options.getCurrentVolume,
      setTemporaryVolume: options.setTemporaryVolume,
      commandClient: this.commandClient,
      duckFactor: this.config.duckingVolumeRatio,
      enabled: this.config.enableVoiceResponses,
      duckingEnabled: this.config.enableDucking,
    });

    // Sub-chime audio context
    this.audioCtx = null;

    // Telemetry
    this.telemetryKey = 'musicly_voice_analytics';
    this.telemetry = this._loadTelemetry();

    // Playback coordinator callbacks
    this.pausePlayback = options.pausePlayback || (() => {
      const ctx = this.actionRegistry.contextProvider() || {};
      if (ctx.isPlaying) {
        this.actionRegistry.execute({ action: MUSICLY_ACTIONS.PAUSE });
      }
    });

    this.resumePlayback = options.resumePlayback || (() => {
      this.actionRegistry.execute({ action: MUSICLY_ACTIONS.PLAY });
    });

    this.getIsPlaying = options.getIsPlaying || (() => {
      const ctx = this.actionRegistry.contextProvider() || {};
      return !!ctx.isPlaying;
    });

    this.wasPlayingBeforeCommand = false;
  }

  // --- Observer / State Machine ---
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getStatePayload());
    return () => this.listeners.delete(listener);
  }

  _notify(extra = {}) {
    const payload = { ...this.getStatePayload(), ...extra };
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.warn('[VoiceControlManager] Listener exception:', err);
      }
    });
  }

  getStatePayload() {
    return {
      state: this.state,
      hasPermission: this.permissionGranted,
      lastRecognized: this.lastRecognized || '',
      lastResponse: this.lastResponse || '',
      confidence: this.lastConfidence || 0,
      ambiguousCandidates: this.ambiguousCandidates || [],
      debugInfo: this.lastDebugInfo || null,
      config: { ...this.config },
    };
  }

  _setState(newState, extra = {}) {
    this.state = newState;
    this._notify(extra);
  }

  // --- Chime Feedback ---
  _playChime(type = 'wake') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'wake') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'confirm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // Audio chime failure should never crash
    }
  }

  // --- Start / Stop / Command Listening Lifecycle ---
  async start() {
    try {
      this.wakeWordManager.start();
      this.permissionGranted = true;
      try {
        localStorage.setItem('musicly_voice_enabled', 'true');
      } catch {}
      this._setState(VOICE_STATES.LISTENING_FOR_WAKE_WORD);
      return true;
    } catch (err) {
      console.warn('[VoiceControlManager] Mic start error:', err);
      this.permissionGranted = false;
      this._setState(VOICE_STATES.ERROR, {
        lastResponse: 'Microphone access is required for Hey Musicly.',
      });
      return false;
    }
  }

  startCommandListening() {
    this._clearCommandTimeout();

    // 1. Stop / pause playback immediately so the room is quiet for listening
    const currentlyPlaying = this.getIsPlaying();
    if (currentlyPlaying) {
      this.wasPlayingBeforeCommand = true;
      try {
        this.pausePlayback();
      } catch (err) {
        console.warn('[VoiceControlManager] Pause on command start notice:', err);
      }
    } else {
      this.wasPlayingBeforeCommand = false;
    }

    const wakeTime = performance.now();
    this._playChime('wake');
    this.permissionGranted = true;
    this._startWaitingForCommand(wakeTime);
    return true;
  }

  cancel() {
    this._clearCommandTimeout();
    this.wakeWordManager.stop();
    this.recorder.stop();
    this.responseManager.cancel();
    this.ambiguousCandidates = [];
    if (this.wasPlayingBeforeCommand) {
      try {
        this.resumePlayback();
      } catch {}
      this.wasPlayingBeforeCommand = false;
    }
    this._setState(VOICE_STATES.IDLE);
  }

  stop() {
    this._clearCommandTimeout();
    this.wakeWordManager.stop();
    this.recorder.stop();
    this.responseManager.cancel();
    this.ambiguousCandidates = [];
    if (this.wasPlayingBeforeCommand) {
      try {
        this.resumePlayback();
      } catch {}
      this.wasPlayingBeforeCommand = false;
    }
    try {
      localStorage.setItem('musicly_voice_enabled', 'false');
    } catch {}
    this._setState(VOICE_STATES.IDLE);
  }

  toggle() {
    if (this.state === VOICE_STATES.IDLE || this.state === VOICE_STATES.ERROR) {
      return this.startCommandListening();
    } else {
      this.stop();
      return false;
    }
  }

  // --- Wake Word Trigger & Pipeline ---
  async _onWakeWordTriggered({ tailCommand }) {
    if (this.state !== VOICE_STATES.LISTENING_FOR_WAKE_WORD) return;

    // Pause music if currently playing so the command is heard clearly
    const currentlyPlaying = this.getIsPlaying();
    if (currentlyPlaying) {
      this.wasPlayingBeforeCommand = true;
      try {
        this.pausePlayback();
      } catch {}
    } else {
      this.wasPlayingBeforeCommand = false;
    }

    const wakeTime = performance.now();
    this._playChime('wake');
    this._setState(VOICE_STATES.WAKE_WORD_DETECTED);

    // If tail command was spoken in the exact same breath ("Hey Musicly play Faasle")
    if (tailCommand && tailCommand.trim().length > 1) {
      setTimeout(() => {
        this._processCommandString(tailCommand.trim(), 0.95, wakeTime);
      }, 250);
      return;
    }

    // Otherwise, transition to listening mode & patiently wait for the command given by the user
    setTimeout(() => {
      this._startWaitingForCommand(wakeTime);
    }, 350);
  }

  _startWaitingForCommand(wakeTime) {
    this.lastRecognized = '';
    this._setState(VOICE_STATES.LISTENING_FOR_COMMAND, { lastRecognized: '' });
    this._clearCommandTimeout();

    const hasSpeechRecognition = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    // Primary: If browser speech recognition is supported, keep mic open and listen live
    if (this.wakeWordManager && hasSpeechRecognition) {
      let silenceDebounceTimer = null;
      let accumulatedText = '';
      const commandTimeoutDuration = this.config.commandTimeoutMs || 8000;

      // Patiently wait up to 8 seconds for the user to begin speaking their command
      this.commandTimeoutId = setTimeout(() => {
        if (this.state === VOICE_STATES.LISTENING_FOR_COMMAND) {
          if (silenceDebounceTimer) clearTimeout(silenceDebounceTimer);
          this._handleCommandTimeout();
        }
      }, commandTimeoutDuration);

      this.wakeWordManager.startCommandMode(({ text, isFinal }) => {
        if (this.state !== VOICE_STATES.LISTENING_FOR_COMMAND) return;

        const clean = (text || '').trim();
        if (!clean) return;

        accumulatedText = clean;
        this.lastRecognized = clean;
        this._notify({ lastRecognized: clean });

        // Refresh command timeout so user is never cut off while speaking
        this._clearCommandTimeout();

        if (isFinal) {
          if (silenceDebounceTimer) clearTimeout(silenceDebounceTimer);
          this.wakeWordManager.lock();
          this._processCommandString(clean, 0.95, wakeTime);
        } else {
          // Debounce: if user pauses speaking for 1.3s after saying command, execute it
          if (silenceDebounceTimer) clearTimeout(silenceDebounceTimer);
          silenceDebounceTimer = setTimeout(() => {
            if (this.state === VOICE_STATES.LISTENING_FOR_COMMAND && accumulatedText) {
              this.wakeWordManager.lock();
              this._processCommandString(accumulatedText, 0.9, wakeTime);
            }
          }, 1300);
        }
      });
      return;
    }

    // Fallback: If Web Speech engine is unavailable, use MediaRecorder pipeline
    this._recordAndExecuteCommand(wakeTime);
  }

  _clearCommandTimeout() {
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
  }

  async _handleCommandTimeout() {
    this._clearCommandTimeout();
    this.wakeWordManager.lock();
    this._setState(VOICE_STATES.ERROR, { lastResponse: "Didn't hear a command." });
    if (this.wasPlayingBeforeCommand) {
      try {
        this.resumePlayback();
      } catch {}
      this.wasPlayingBeforeCommand = false;
    }
    if (this.config.enableVoiceResponses) {
      await this.responseManager.speak("Sorry, I didn't hear a command.");
    }
    this._finishCommandCycle(1800);
  }

  async _recordAndExecuteCommand(wakeTime) {
    const started = await this.recorder.start();
    if (!started) {
      this._returnToWakeWordListening();
      return;
    }

    // Wait until recording finishes (silence detector or max duration)
    const { audioBase64, mimeType, durationMs } = await this.recorder.stop();
    const commandRecordedTime = performance.now();

    if (!audioBase64 || durationMs < this.config.minSpeechDurationMs) {
      this._setState(VOICE_STATES.ERROR, { lastResponse: "Didn't hear a command." });
      await this.responseManager.speak("Sorry, I didn't hear a command.");
      this._returnToWakeWordListening();
      return;
    }

    // Transition to processing state
    this._setState(VOICE_STATES.PROCESSING_COMMAND);

    // Call Firebase Function for Google Cloud Speech-to-Text
    const sttResult = await this.commandClient.transcribeAudio(
      audioBase64,
      mimeType,
      this.config.language
    );
    const sttCompleteTime = performance.now();

    if (!sttResult.success || !sttResult.transcript) {
      this._setState(VOICE_STATES.ERROR, { lastResponse: "Couldn't understand." });
      await this.responseManager.speak("I couldn't understand that.");
      this._returnToWakeWordListening();
      return;
    }

    // Process the transcribed command
    await this._processCommandString(
      sttResult.transcript,
      sttResult.confidence,
      wakeTime,
      {
        sttDurationMs: Math.round(sttCompleteTime - commandRecordedTime),
        detectedLanguage: sttResult.detectedLanguage,
        alternatives: sttResult.alternatives,
      }
    );
  }

  // --- Command Processing & Intent Parsing ---
  async _processCommandString(commandText, speechConfidence = 0.9, wakeTime = 0, extraTelemetry = {}) {
    try {
      this.lastRecognized = commandText;
      this._setState(VOICE_STATES.PROCESSING_COMMAND, { lastRecognized: commandText });

      const parseStartTime = performance.now();
      const context = this.actionRegistry.contextProvider() || {};
      const parsed = VoiceCommandParser.parse(commandText, context, speechConfidence);
      const parseEndTime = performance.now();

      // Debug Panel Data Record
      this.lastDebugInfo = {
        wakeWord: 'DETECTED',
        microphone: 'READY',
        recording: 'NO',
        transcript: commandText,
        sttConfidence: speechConfidence,
        detectedLanguage: extraTelemetry.detectedLanguage || this.config.language,
        intent: parsed.action,
        intentConfidence: parsed.intentConfidence || 0,
        entity: parsed.params?.query || parsed.params?.track?.title || parsed.params?.scene?.name || 'None',
        entityConfidence: parsed.entityConfidence || 0,
        action: parsed.action,
        latencies: {
          wakeToCommandMs: wakeTime ? Math.round(parseStartTime - wakeTime) : 0,
          sttMs: extraTelemetry.sttDurationMs || 0,
          parseMs: Math.round(parseEndTime - parseStartTime),
        },
      };

      // 1. Cancel
      if (parsed.action === MUSICLY_ACTIONS.CANCEL) {
        this._setState(VOICE_STATES.SUCCESS, { lastResponse: 'Cancelled.' });
        if (this.wasPlayingBeforeCommand) {
          try {
            this.resumePlayback();
          } catch {}
          this.wasPlayingBeforeCommand = false;
        }
        this._finishCommandCycle(1200);
        return;
      }

      // 2. Ambiguity Handling (Phase 12)
      if (parsed.action === MUSICLY_ACTIONS.AMBIGUOUS_CHOICE) {
        this.ambiguousCandidates = parsed.params.candidates || [];
        this._setState(VOICE_STATES.AMBIGUOUS, {
          ambiguousCandidates: this.ambiguousCandidates,
          lastResponse: 'Which one did you mean?',
        });
        await this.responseManager.speak('Which one did you mean?');
        // Keep ambiguous state open so user can tap candidate or say next command
        return;
      }

      // 3. Unknown Command
      if (parsed.action === MUSICLY_ACTIONS.UNKNOWN) {
        this._recordTelemetry(MUSICLY_ACTIONS.UNKNOWN, false);
        this._setState(VOICE_STATES.ERROR, { lastResponse: parsed.feedback || "Didn't catch that." });
        if (this.wasPlayingBeforeCommand) {
          try {
            this.resumePlayback();
          } catch {}
          this.wasPlayingBeforeCommand = false;
        }
        if (this.config.enableVoiceResponses && parsed.spokenText) {
          await this.responseManager.speak(parsed.spokenText);
        }
        this._finishCommandCycle(2000);
        return;
      }

      // 4. Voice assistant mute
      if (parsed.action === MUSICLY_ACTIONS.VOICE_OFF) {
        this.responseManager.setEnabled(false);
        this._setState(VOICE_STATES.SUCCESS, { lastResponse: 'Voice responses muted.' });
        if (this.wasPlayingBeforeCommand) {
          try {
            this.resumePlayback();
          } catch {}
          this.wasPlayingBeforeCommand = false;
        }
        this._finishCommandCycle(1500);
        return;
      }

      // 5. Execute Action via Central Action Registry
      await this._executeAction(parsed);
    } catch (err) {
      console.error('[VoiceControlManager] Command execution caught error:', err);
      this._setState(VOICE_STATES.ERROR, { lastResponse: "Sorry, I couldn't process that." });
      if (this.wasPlayingBeforeCommand) {
        try {
          this.resumePlayback();
        } catch {}
        this.wasPlayingBeforeCommand = false;
      }
      this._finishCommandCycle(2000);
    }
  }

  async _executeAction(parsedAction) {
    this._setState(VOICE_STATES.EXECUTING_ACTION);
    this._playChime('confirm');

    const result = await this.actionRegistry.execute(parsedAction);
    this._recordTelemetry(parsedAction.action, result.success);

    const responseText = result.responseText || parsedAction.spokenText || null;
    this._setState(VOICE_STATES.SUCCESS, { lastResponse: responseText });

    if (responseText && this.config.enableVoiceResponses) {
      await this.responseManager.speak(responseText);
    }

    // Handle playback resumption if the action was a non-playback control (like volume, favorite, etc.)
    const playbackModifyingActions = [
      MUSICLY_ACTIONS.PLAY,
      MUSICLY_ACTIONS.PLAY_TRACK,
      MUSICLY_ACTIONS.PLAY_SEARCH_RESULT,
      MUSICLY_ACTIONS.PAUSE,
      MUSICLY_ACTIONS.STOP,
      MUSICLY_ACTIONS.TOGGLE_PLAY,
      MUSICLY_ACTIONS.NEXT_TRACK,
      MUSICLY_ACTIONS.PREVIOUS_TRACK,
      MUSICLY_ACTIONS.SWITCH_SCENE,
      MUSICLY_ACTIONS.SWITCH_GENRE,
      MUSICLY_ACTIONS.REPLAY,
    ];

    if (!playbackModifyingActions.includes(parsedAction.action) && this.wasPlayingBeforeCommand) {
      try {
        this.resumePlayback();
      } catch (e) {
        console.warn('[VoiceControlManager] Resume playback error:', e);
      }
    }
    this.wasPlayingBeforeCommand = false;

    // Conclude command and release microphone cleanly
    this._finishCommandCycle(2000);
  }

  _finishCommandCycle(delayMs = 2000) {
    this._clearCommandTimeout();
    this.ambiguousCandidates = [];
    setTimeout(() => {
      this.stop();
    }, delayMs);
  }

  /**
   * User selects candidate from ambiguity card
   */
  async selectAmbiguousCandidate(track) {
    if (!track) return;
    this.ambiguousCandidates = [];
    await this._executeAction({
      action: MUSICLY_ACTIONS.PLAY_SEARCH_RESULT,
      params: { track, targetTrack: track },
      spokenText: `Playing ${track.title}.`,
    });
  }

  _returnToWakeWordListening() {
    this._clearCommandTimeout();
    this.ambiguousCandidates = [];
    this._setState(VOICE_STATES.COOLDOWN);
    setTimeout(() => {
      this.wakeWordManager.startWakeWordMode();
      this._setState(VOICE_STATES.LISTENING_FOR_WAKE_WORD, { lastResponse: '' });
    }, this.config.wakeCooldownMs);
  }

  // --- Telemetry & Analytics ---
  _loadTelemetry() {
    try {
      const data = localStorage.getItem(this.telemetryKey);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      latencies: [],
    };
  }

  _recordTelemetry(action, success) {
    if (!this.config.enableAnalytics) return;
    this.telemetry.totalCommands++;
    if (success) {
      this.telemetry.successfulCommands++;
    } else {
      this.telemetry.failedCommands++;
    }
    try {
      localStorage.setItem(this.telemetryKey, JSON.stringify(this.telemetry));
    } catch {}
  }

  getAnalytics() {
    return {
      totalCommands: this.telemetry.totalCommands,
      successfulCommands: this.telemetry.successfulCommands,
      failedCommands: this.telemetry.failedCommands,
      successRate: this.telemetry.totalCommands
        ? Math.round((this.telemetry.successfulCommands / this.telemetry.totalCommands) * 100)
        : 100,
    };
  }

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
