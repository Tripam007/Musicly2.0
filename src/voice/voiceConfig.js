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
  CONVERSING: 'CONVERSING',
  SPEAKING: 'SPEAKING',
  COOLDOWN: 'COOLDOWN',
  UNSUPPORTED: 'UNSUPPORTED'
};

export const VOICE_PROVIDERS = {
  RECOGNITION: {
    GOOGLE: 'google',
    ELEVENLABS_SCRIBE: 'elevenlabs_scribe'
  },
  RESPONSE: {
    ELEVENLABS: 'elevenlabs',
    GOOGLE: 'google',
    ELEVENLABS_AGENT: 'elevenlabs_agent'
  }
};

export const VOICE_PERSONALITIES = {
  DEFAULT: {
    id: 'DEFAULT',
    name: 'Default',
    tagline: 'Friendly ElevenLabs Companion',
    recognitionProvider: 'elevenlabs_scribe',
    responseProvider: 'elevenlabs',
    voiceId: 'AeRdCCKzvd23BpJoofzx', // Nathaniel C
    provider: 'elevenlabs',
    systemPrompt: 'You are Musicly AI, a friendly, warm, and helpful music companion. You recommend actual songs from the Musicly catalog, understand mood, answer questions about playing tracks, and speak naturally.',
    speakingRate: 1.0,
    pitch: 0.0,
    language: 'en-US'
  },
  GOOGLE: {
    id: 'GOOGLE',
    name: 'Google Natural',
    tagline: 'Google Cloud Journey Voice',
    recognitionProvider: 'google',
    responseProvider: 'google',
    voiceId: 'en-US-Journey-F',
    provider: 'google',
    systemPrompt: 'You are Musicly AI powered by Google Cloud Voice. Natural, precise, articulate, and calm.',
    speakingRate: 1.0,
    pitch: 0.0,
    language: 'en-US'
  },
  CAPTAIN: {
    id: 'CAPTAIN',
    name: 'Captain',
    tagline: 'Playful Pirate Navigator',
    recognitionProvider: 'google',
    responseProvider: 'elevenlabs',
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17', // Roger
    provider: 'elevenlabs',
    systemPrompt: 'Ahoy! You are Captain of Musicly, a witty and playful pirate DJ. You treat playlists as treasure maps and navigate tracks with nautical charm.',
    speakingRate: 0.95,
    pitch: -0.1,
    language: 'en-US'
  },
  AFTERGLOW: {
    id: 'AFTERGLOW',
    name: 'Afterglow',
    tagline: 'Cinematic & Deeply Calm',
    recognitionProvider: 'elevenlabs_scribe',
    responseProvider: 'elevenlabs',
    voiceId: 'AeRdCCKzvd23BpJoofzx', // Nathaniel C
    provider: 'elevenlabs',
    systemPrompt: 'You are Afterglow, Musicly’s cinematic, reflective, and deeply serene narrator. Speak softly, thoughtfully, and poetically about the music and late-night ambience.',
    speakingRate: 0.88,
    pitch: -0.05,
    language: 'en-US'
  },
  DRIVE: {
    id: 'DRIVE',
    name: 'Drive',
    tagline: 'Energetic & Confident',
    recognitionProvider: 'google',
    responseProvider: 'elevenlabs',
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    provider: 'elevenlabs',
    systemPrompt: 'You are Drive, Musicly’s high-energy, upbeat co-pilot. Confident, modern, quick-witted, and ready to pump up the energy.',
    speakingRate: 1.05,
    pitch: 0.05,
    language: 'en-US'
  },
  STUDIO: {
    id: 'STUDIO',
    name: 'Studio',
    tagline: 'Professional & Relaxed Producer',
    recognitionProvider: 'google',
    responseProvider: 'google',
    voiceId: 'en-US-Journey-D',
    provider: 'google',
    systemPrompt: 'You are Studio, a relaxed, professional audio engineer and producer. You appreciate acoustic fidelity, crisp mastering, and smooth playback flow.',
    speakingRate: 0.98,
    pitch: 0.0,
    language: 'en-US'
  }
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
  WHAT_IS_PLAYING: 'WHAT_IS_PLAYING',

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
  voiceId: 'AeRdCCKzvd23BpJoofzx',  // Nathaniel C (ElevenLabs Curated Calm & Suspense)
  recognitionProvider: 'google',    // 'google' | 'elevenlabs_scribe'
  responseProvider: 'elevenlabs',   // 'elevenlabs' | 'google' | 'elevenlabs_agent'
  personalityId: 'DEFAULT',         // 'DEFAULT' | 'GOOGLE' | 'CAPTAIN' | 'AFTERGLOW' | 'DRIVE' | 'STUDIO'

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
