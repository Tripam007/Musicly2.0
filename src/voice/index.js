/**
 * Voice Module Entry Point
 * Exports all core managers, UI components, and configs for "Hey Musicly"
 */

export { VOICE_STATES, MUSICLY_ACTIONS, DEFAULT_VOICE_CONFIG } from './voiceConfig.js';
export { WakeWordManager } from './WakeWordManager.js';
export { VoiceRecorder } from './VoiceRecorder.js';
export { VoiceCommandClient } from './VoiceCommandClient.js';
export { VoiceCommandParser } from './VoiceCommandParser.js';
export { MusiclyActionRegistry } from './MusiclyActionRegistry.js';
export { VoiceResponseManager } from './VoiceResponseManager.js';
export { VoiceControlManager } from './VoiceControlManager.js';
export { VoiceControlUI } from './VoiceControlUI.jsx';
export { VoiceSettingsModal } from './VoiceSettingsModal.jsx';
export { VoiceDebugPanel } from './VoiceDebugPanel.jsx';
export { normalizeText, normalizeNumbers, stringSimilarity, mapMultilingualPhrase } from './normalization.js';
