/**
 * voiceConfig.js
 * 
 * Central configuration, action enums, and state machine constants
 * for the Musicly Voice AI System.
 */

export const VOICE_STATES = {
  IDLE: 'IDLE',
  LISTENING_FOR_WAKE_WORD: 'LISTENING_FOR_WAKE_WORD',
  WAKE_WORD_DETECTED: 'WAKE_WORD_DETECTED',
  LISTENING_FOR_COMMAND: 'LISTENING_FOR_COMMAND',
  PROCESSING_COMMAND: 'PROCESSING_COMMAND',
  EXECUTING_ACTION: 'EXECUTING_ACTION',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  AMBIGUOUS: 'AMBIGUOUS',
  COOLDOWN: 'COOLDOWN',
  UNSUPPORTED: 'UNSUPPORTED'
};

export const MUSICLY_ACTIONS = {
  // Playback
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  TOGGLE_PLAY: 'TOGGLE_PLAY',
  STOP: 'STOP',
  NEXT_TRACK: 'NEXT_TRACK',
  PREVIOUS_TRACK: 'PREVIOUS_TRACK',
  REPLAY: 'REPLAY',
  SEEK: 'SEEK',

  // Volume
  SET_VOLUME: 'SET_VOLUME',
  VOLUME_UP: 'VOLUME_UP',
  VOLUME_DOWN: 'VOLUME_DOWN',
  MUTE: 'MUTE',
  UNMUTE: 'UNMUTE',

  // Modes
  TOGGLE_SHUFFLE: 'TOGGLE_SHUFFLE',
  SHUFFLE_ON: 'SHUFFLE_ON',
  SHUFFLE_OFF: 'SHUFFLE_OFF',
  TOGGLE_REPEAT: 'TOGGLE_REPEAT',
  REPEAT_ONE: 'REPEAT_ONE',
  REPEAT_ALL: 'REPEAT_ALL',
  REPEAT_OFF: 'REPEAT_OFF',

  // Favorites & Library
  LIKE: 'LIKE',
  UNLIKE: 'UNLIKE',
  OPEN_LIBRARY: 'OPEN_LIBRARY',
  ADD_TO_PLAYLIST: 'ADD_TO_PLAYLIST',

  // Search & Music Selection
  SEARCH: 'SEARCH',
  PLAY_SEARCH: 'PLAY_SEARCH',
  PLAY_SEARCH_RESULT: 'PLAY_SEARCH_RESULT',
  PLAY_SPECIFIC_SONG: 'PLAY_SPECIFIC_SONG',
  AMBIGUOUS_CHOICE: 'AMBIGUOUS_CHOICE',

  // Scenes & Genres
  CHANGE_SCENE: 'CHANGE_SCENE',
  NEXT_SCENE: 'NEXT_SCENE',
  OPEN_SCENE_SELECTOR: 'OPEN_SCENE_SELECTOR',

  // Ambience
  TOGGLE_AMBIENCE: 'TOGGLE_AMBIENCE',
  AMBIENCE_ON: 'AMBIENCE_ON',
  AMBIENCE_OFF: 'AMBIENCE_OFF',

  // Navigation & Modals
  OPEN_HOME: 'OPEN_HOME',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  OPEN_FEEDBACK: 'OPEN_FEEDBACK',
  OPEN_COFFEE: 'OPEN_COFFEE',
  REQUEST_SONG: 'REQUEST_SONG',

  // Auth
  AUTH_SIGN_IN: 'AUTH_SIGN_IN',
  AUTH_SIGN_OUT: 'AUTH_SIGN_OUT',

  // Voice Assistant Controls
  VOICE_OFF: 'VOICE_OFF',
  MUTE_VOICE: 'MUTE_VOICE',

  // Admin Actions (strictly verified server-side/claims)
  ADMIN_OPEN_DASHBOARD: 'ADMIN_OPEN_DASHBOARD',
  ADMIN_SHOW_FEEDBACK: 'ADMIN_SHOW_FEEDBACK',
  ADMIN_SHOW_AIR_AI: 'ADMIN_SHOW_AIR_AI',
  ADMIN_SHOW_REQUESTS: 'ADMIN_SHOW_REQUESTS',

  // Control
  CANCEL: 'CANCEL',
  UNKNOWN: 'UNKNOWN'
};

export const DEFAULT_VOICE_CONFIG = {
  // Wake-word
  wakePhrase: 'Hey Musicly',
  wakePhraseVariants: [
    'hey musicly',
    'hey musically',
    'hey music ly',
    'hey music lee',
    'okay musicly',
    'ok musicly',
    'hay musicly'
  ],
  wakeCooldownMs: 800,

  // Microphone Command Recording
  maxCommandDurationMs: 8000,       // Max 8 seconds command recording
  commandTimeoutMs: 8000,           // Wait up to 8s for user to speak their command after wake word
  initialSilenceTimeoutMs: 7000,    // Stop if user hasn't spoken within 7s
  endOfSpeechSilenceMs: 1600,       // Stop recording 1.6s after user finishes speaking
  silenceThresholdRms: 0.025,       // Audio energy threshold for silence
  minSpeechDurationMs: 300,         // Avoid micro-clicks

  // Language & Locales
  language: 'en-IN',
  supportedLanguages: ['en-IN', 'en-US', 'hi-IN', 'bn-IN'],

  // Audio Ducking & TTS
  enableVoiceResponses: true,
  enableDucking: true,
  duckingVolumeRatio: 0.28,         // Temporarily duck music to 28% of current level
  voicePersonality: 'cinematic',

  // Confidence Thresholds
  confidenceThresholds: {
    speech: 0.55,
    intent: 0.65,
    entity: 0.60
  },

  // Telemetry & Debug
  enableAnalytics: true,
  debugMode: false
};
