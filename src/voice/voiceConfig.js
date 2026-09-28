/**
 * Musicly Voice Control - Action Enums, State Machine States & Default Configuration
 */

export const VOICE_STATES = {
  IDLE: 'IDLE',
  LISTENING_FOR_WAKE_WORD: 'LISTENING_FOR_WAKE_WORD',
  WAKE_WORD_DETECTED: 'WAKE_WORD_DETECTED',
  LISTENING_FOR_COMMAND: 'LISTENING_FOR_COMMAND',
  PROCESSING_COMMAND: 'PROCESSING_COMMAND',
  EXECUTING_ACTION: 'EXECUTING_ACTION',
  RESPONDING: 'RESPONDING',
  COOLDOWN: 'COOLDOWN',
  ERROR: 'ERROR',
  UNSUPPORTED: 'UNSUPPORTED'
};

export const MUSICLY_ACTIONS = {
  // Playback
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  TOGGLE_PLAY: 'TOGGLE_PLAY',
  NEXT_TRACK: 'NEXT_TRACK',
  PREVIOUS_TRACK: 'PREVIOUS_TRACK',
  SEEK: 'SEEK',
  REPLAY: 'REPLAY',

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

  // Favorites
  LIKE: 'LIKE',
  UNLIKE: 'UNLIKE',

  // Search & Music Selection
  SEARCH: 'SEARCH',
  PLAY_SEARCH_RESULT: 'PLAY_SEARCH_RESULT',
  PLAY_SPECIFIC_SONG: 'PLAY_SPECIFIC_SONG',

  // Scenes & Genres
  CHANGE_SCENE: 'CHANGE_SCENE',
  NEXT_SCENE: 'NEXT_SCENE',
  CHANGE_GENRE: 'CHANGE_GENRE',
  OPEN_SCENE_SELECTOR: 'OPEN_SCENE_SELECTOR',

  // Ambience
  TOGGLE_AMBIENCE: 'TOGGLE_AMBIENCE',
  AMBIENCE_ON: 'AMBIENCE_ON',
  AMBIENCE_OFF: 'AMBIENCE_OFF',
  SET_AMBIENT_SOUND: 'SET_AMBIENT_SOUND',

  // Navigation & Modals
  OPEN_HOME: 'OPEN_HOME',
  OPEN_LIBRARY: 'OPEN_LIBRARY',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  OPEN_PROFILE: 'OPEN_PROFILE',
  OPEN_FEEDBACK: 'OPEN_FEEDBACK',
  OPEN_COFFEE: 'OPEN_COFFEE',
  REQUEST_SONG: 'REQUEST_SONG',
  OPEN_SHORTCUTS: 'OPEN_SHORTCUTS',

  // Playlists
  ADD_TO_PLAYLIST: 'ADD_TO_PLAYLIST',
  CREATE_PLAYLIST: 'CREATE_PLAYLIST',
  DELETE_PLAYLIST: 'DELETE_PLAYLIST',

  // Admin
  OPEN_ADMIN_DASHBOARD: 'OPEN_ADMIN_DASHBOARD',
  SHOW_FEEDBACK: 'SHOW_FEEDBACK',
  SHOW_AIR_AI: 'SHOW_AIR_AI',
  SHOW_ACCURACY: 'SHOW_ACCURACY',
  SHOW_SONG_REQUESTS: 'SHOW_SONG_REQUESTS',

  // Control
  CANCEL: 'CANCEL',
  UNKNOWN: 'UNKNOWN'
};

export const DEFAULT_VOICE_CONFIG = {
  wakePhrase: 'Hey Musicly',
  wakePhraseVariants: [
    'hey musicly',
    'hey musically',
    'hey music ly',
    'hey music lee',
    'hey music',
    'a musicly',
    'hay musicly',
    'ok musicly'
  ],
  commandTimeoutMs: 6500, // Duration to listen for command after wake word
  cooldownMs: 800,        // Cooldown between command completion and wake listening
  wakeCooldownMs: 800,
  voiceResponsesEnabled: true,
  enableVoiceResponses: true,
  audioDuckingEnabled: true,
  enableDucking: true,
  duckingVolumeRatio: 0.28, // Temporarily lower music to 28% of current volume during TTS
  confirmSensitiveActions: true,
  analyticsEnabled: true,
  enableAnalytics: true
};
