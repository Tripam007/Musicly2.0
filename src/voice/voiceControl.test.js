/**
 * voiceControl.test.js
 * 
 * Comprehensive Automated Test Suite for Musicly Voice AI System (Phase 28).
 * Tests:
 * - Local Wake Word Detection & False Positive Rejection
 * - Playback, Seeking, Volume, Modes, Likes, Scenes, Ambience, Navigation
 * - Multilingual Mapping (Hindi, Bengali, Hinglish)
 * - Search Intelligence, Entity Resolution & Ambiguity Detection
 * - Confidence Layer Gates
 * - Central MusiclyActionRegistry Execution
 */

import assert from 'node:assert';
import { WakeWordManager } from './WakeWordManager.js';
import { VoiceCommandParser } from './VoiceCommandParser.js';
import { MusiclyActionRegistry } from './MusiclyActionRegistry.js';
import { MUSICLY_ACTIONS } from './voiceConfig.js';

console.log('\n==================================================');
console.log('MUSICLY VOICE AI — AUTOMATED TEST SUITE');
console.log('==================================================\n');

// Mock context with Musicly catalog
const mockContext = {
  allTracks: [
    { id: 'track-1', title: 'Faasle', artist: 'Kaavish', genre: 'Acoustic' },
    { id: 'track-2', title: 'Faasle (Remix)', artist: 'Kaavish', genre: 'Electronic' },
    { id: 'track-3', title: 'Yellow', artist: 'Coldplay', genre: 'Rock' },
    { id: 'track-4', title: 'Fix You', artist: 'Coldplay', genre: 'Rock' },
    { id: 'track-5', title: 'Woh Lamhe', artist: 'Atif Aslam', genre: 'Hindi' },
    { id: 'track-6', title: 'Tum Mile', artist: 'Pritam', genre: 'Hindi' }
  ],
  allScenes: [
    { id: 'afterglow', name: 'Afterglow' },
    { id: 'drive', name: 'Drive' },
    { id: 'studio', name: 'Studio' },
    { id: 'indie', name: 'Indie' }
  ],
  currentTrack: { id: 'track-1', title: 'Faasle', artist: 'Kaavish' },
  volume: 0.8,
  isPlaying: true,
  favorites: ['track-1'],
  isAdmin: true
};

// ==========================================
// 1. WAKE WORD DETECTION & GATEKEEPING
// ==========================================
console.log('--- 1. Testing Local Wake Word Detection ---');

let triggered = false;
let capturedTail = '';
const wake = new WakeWordManager({
  onWakeWord: (payload) => {
    triggered = true;
    capturedTail = payload.tailCommand;
  }
});

// Test: Exact wake word
wake.processTranscript('Hey Musicly');
assert.strictEqual(triggered, true, 'Should trigger on "Hey Musicly"');
assert.strictEqual(capturedTail, '', 'Tail command should be empty');
console.log('✓ Trigger on "Hey Musicly" passed');

// Test: Natural variant "Okay Musicly"
triggered = false;
wake.reset();
wake.processTranscript('Okay Musicly');
assert.strictEqual(triggered, true, 'Should trigger on "Okay Musicly"');
console.log('✓ Trigger on variant "Okay Musicly" passed');

// Test: Single-breath tail command "Hey Musicly play Faasle"
triggered = false;
wake.reset();
wake.processTranscript('Hey Musicly play Faasle');
assert.strictEqual(triggered, true);
assert.strictEqual(capturedTail, 'play Faasle', 'Should capture single-breath tail command');
console.log('✓ Single-breath tail command capture passed');

// Test: False positive rejection (Musicly MUST NOT react to ordinary speech)
const falsePhrases = [
  'Musicly is an app',
  'I really like Musicly',
  'Hey Google what time is it',
  'Hey Siri play music',
  'Hey Alexa turn on lights',
  'just talking about music',
  'Hey there'
];

for (const phrase of falsePhrases) {
  triggered = false;
  wake.reset();
  wake.processTranscript(phrase);
  assert.strictEqual(triggered, false, `Must reject false positive: "${phrase}"`);
}
console.log('✓ False positive gatekeeping passed (7 tests)');

// ==========================================
// 2. PLAYBACK CONTROLS
// ==========================================
console.log('\n--- 2. Testing Playback Commands ---');

assert.strictEqual(VoiceCommandParser.parse('play', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(VoiceCommandParser.parse('resume', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(VoiceCommandParser.parse('start playing', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(VoiceCommandParser.parse('pause', mockContext).action, MUSICLY_ACTIONS.PAUSE);
assert.strictEqual(VoiceCommandParser.parse('stop', mockContext).action, MUSICLY_ACTIONS.PAUSE);
assert.strictEqual(VoiceCommandParser.parse('next', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(VoiceCommandParser.parse('next song', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(VoiceCommandParser.parse('skip this', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(VoiceCommandParser.parse('previous', mockContext).action, MUSICLY_ACTIONS.PREVIOUS_TRACK);
assert.strictEqual(VoiceCommandParser.parse('previous song', mockContext).action, MUSICLY_ACTIONS.PREVIOUS_TRACK);
assert.strictEqual(VoiceCommandParser.parse('restart', mockContext).action, MUSICLY_ACTIONS.REPLAY);
console.log('✓ Playback controls (play, pause, resume, stop, next, prev, restart) passed');

// ==========================================
// 3. SEEKING COMMANDS
// ==========================================
console.log('\n--- 3. Testing Seeking Commands ---');

const fwd10 = VoiceCommandParser.parse('forward 10 seconds', mockContext);
assert.strictEqual(fwd10.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(fwd10.params.seconds, 10);

const skip30 = VoiceCommandParser.parse('skip 30 seconds', mockContext);
assert.strictEqual(skip30.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(skip30.params.seconds, 30);

const back15 = VoiceCommandParser.parse('go back 15 seconds', mockContext);
assert.strictEqual(back15.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(back15.params.seconds, -15);

const rew20 = VoiceCommandParser.parse('rewind 20 seconds', mockContext);
assert.strictEqual(rew20.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(rew20.params.seconds, -20);
console.log('✓ Seeking commands (forward 10s, skip 30s, back 15s, rewind 20s) passed');

// ==========================================
// 4. VOLUME CONTROLS
// ==========================================
console.log('\n--- 4. Testing Volume Commands ---');

assert.strictEqual(VoiceCommandParser.parse('volume up', mockContext).action, MUSICLY_ACTIONS.VOLUME_UP);
assert.strictEqual(VoiceCommandParser.parse('turn it up', mockContext).action, MUSICLY_ACTIONS.VOLUME_UP);
assert.strictEqual(VoiceCommandParser.parse('volume down', mockContext).action, MUSICLY_ACTIONS.VOLUME_DOWN);
assert.strictEqual(VoiceCommandParser.parse('make it quieter', mockContext).action, MUSICLY_ACTIONS.VOLUME_DOWN);
assert.strictEqual(VoiceCommandParser.parse('mute', mockContext).action, MUSICLY_ACTIONS.MUTE);
assert.strictEqual(VoiceCommandParser.parse('unmute', mockContext).action, MUSICLY_ACTIONS.UNMUTE);

const vol50 = VoiceCommandParser.parse('volume 50', mockContext);
assert.strictEqual(vol50.action, MUSICLY_ACTIONS.SET_VOLUME);
assert.strictEqual(vol50.params.value, 0.5);

const vol70 = VoiceCommandParser.parse('set volume to 70', mockContext);
assert.strictEqual(vol70.action, MUSICLY_ACTIONS.SET_VOLUME);
assert.strictEqual(vol70.params.value, 0.7);
console.log('✓ Volume controls (up, down, mute, unmute, vol 50, set vol 70) passed');

// ==========================================
// 5. SCENES & AMBIENCE
// ==========================================
console.log('\n--- 5. Testing Scenes & Ambience Commands ---');

const scAfterglow = VoiceCommandParser.parse('switch to Afterglow', mockContext);
assert.strictEqual(scAfterglow.action, MUSICLY_ACTIONS.CHANGE_SCENE);
assert.strictEqual(scAfterglow.params.sceneId, 'afterglow');

const scDrive = VoiceCommandParser.parse('open Drive', mockContext);
assert.strictEqual(scDrive.action, MUSICLY_ACTIONS.CHANGE_SCENE);
assert.strictEqual(scDrive.params.sceneId, 'drive');

assert.strictEqual(VoiceCommandParser.parse('turn ambience on', mockContext).action, MUSICLY_ACTIONS.AMBIENCE_ON);
assert.strictEqual(VoiceCommandParser.parse('turn ambience off', mockContext).action, MUSICLY_ACTIONS.AMBIENCE_OFF);
console.log('✓ Scenes and ambience commands passed');

// ==========================================
// 6. MODES, LIKES, NAVIGATION & VOICE
// ==========================================
console.log('\n--- 6. Testing Modes, Likes, Navigation & Voice Controls ---');

assert.strictEqual(VoiceCommandParser.parse('shuffle', mockContext).action, MUSICLY_ACTIONS.TOGGLE_SHUFFLE);
assert.strictEqual(VoiceCommandParser.parse('repeat', mockContext).action, MUSICLY_ACTIONS.TOGGLE_REPEAT);
assert.strictEqual(VoiceCommandParser.parse('like this', mockContext).action, MUSICLY_ACTIONS.LIKE);
assert.strictEqual(VoiceCommandParser.parse('unlike this', mockContext).action, MUSICLY_ACTIONS.UNLIKE);
assert.strictEqual(VoiceCommandParser.parse('open my library', mockContext).action, MUSICLY_ACTIONS.OPEN_LIBRARY);
assert.strictEqual(VoiceCommandParser.parse('go home', mockContext).action, MUSICLY_ACTIONS.OPEN_HOME);
assert.strictEqual(VoiceCommandParser.parse('open settings', mockContext).action, MUSICLY_ACTIONS.OPEN_SETTINGS);
assert.strictEqual(VoiceCommandParser.parse('stop talking', mockContext).action, MUSICLY_ACTIONS.VOICE_OFF);
console.log('✓ Modes, likes, library, home, settings, voice off passed');

// ==========================================
// 7. MULTILINGUAL SUPPORT (Hindi, Bengali, Hinglish)
// ==========================================
console.log('\n--- 7. Testing Multilingual Commands (Hindi, Bengali, Hinglish) ---');

// Hindi
assert.strictEqual(VoiceCommandParser.parse('gaana chalao', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(VoiceCommandParser.parse('rok do', mockContext).action, MUSICLY_ACTIONS.PAUSE);
assert.strictEqual(VoiceCommandParser.parse('agla gaana', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(VoiceCommandParser.parse('pichhla gaana', mockContext).action, MUSICLY_ACTIONS.PREVIOUS_TRACK);
assert.strictEqual(VoiceCommandParser.parse('volume badhao', mockContext).action, MUSICLY_ACTIONS.VOLUME_UP);
console.log('✓ Hindi commands (gaana chalao, rok do, agla gaana, pichhla gaana, volume badhao) passed');

// Bengali
assert.strictEqual(VoiceCommandParser.parse('gaan chalao', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(VoiceCommandParser.parse('thamo', mockContext).action, MUSICLY_ACTIONS.PAUSE);
assert.strictEqual(VoiceCommandParser.parse('porer gaan', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(VoiceCommandParser.parse('sound barao', mockContext).action, MUSICLY_ACTIONS.VOLUME_UP);
console.log('✓ Bengali commands (gaan chalao, thamo, porer gaan, sound barao) passed');

// Hinglish
assert.strictEqual(VoiceCommandParser.parse('next gaana', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
console.log('✓ Hinglish command (next gaana) passed');

// ==========================================
// 8. SEARCH INTELLIGENCE & AMBIGUITY HANDLING
// ==========================================
console.log('\n--- 8. Testing Search Intelligence & Ambiguity Handling ---');

// Direct single match
const singleMatch = VoiceCommandParser.parse('play Tum Mile', mockContext);
assert.strictEqual(singleMatch.action, MUSICLY_ACTIONS.PLAY_SEARCH_RESULT);
assert.strictEqual(singleMatch.params.track.title, 'Tum Mile');
console.log('✓ Single song match (Tum Mile) passed');

// Ambiguity handling: When multiple songs match closely (e.g. "Faasle" and "Faasle (Remix)")
const ambMatch = VoiceCommandParser.parse('play Faasle', mockContext);
assert.strictEqual(ambMatch.action, MUSICLY_ACTIONS.AMBIGUOUS_CHOICE);
assert(ambMatch.params.candidates.length >= 2, 'Should provide candidate list for ambiguity');
assert.strictEqual(ambMatch.spokenText, 'Which one did you mean?');
console.log('✓ Ambiguity handling ("play Faasle" -> AMBIGUOUS_CHOICE with candidates) passed');

// Artist search
const artistMatch = VoiceCommandParser.parse('play something by Coldplay', mockContext);
assert.strictEqual(artistMatch.action, MUSICLY_ACTIONS.PLAY_SEARCH_RESULT);
assert.strictEqual(artistMatch.params.track.artist, 'Coldplay');
console.log('✓ Artist search (Coldplay) passed');

// ==========================================
// 9. CONFIDENCE GATES & ERROR RESILIENCE
// ==========================================
console.log('\n--- 9. Testing Confidence Gates & Edge Cases ---');

// Low speech confidence (< 0.40) must NOT blindly execute
const lowConf = VoiceCommandParser.parse('play yellow', mockContext, 0.35);
assert.strictEqual(lowConf.action, MUSICLY_ACTIONS.UNKNOWN);
assert.strictEqual(lowConf.spokenText, "I couldn't understand that. Please repeat.");
console.log('✓ Low confidence rejection gate passed');

// Non-existent song (must NOT throw TypeError, falls back gracefully)
const unknownSong = VoiceCommandParser.parse('play some completely unknown random song xyz', mockContext);
assert.ok(unknownSong.action === MUSICLY_ACTIONS.PLAY_SEARCH || unknownSong.action === MUSICLY_ACTIONS.UNKNOWN);
console.log('✓ Unknown song search resilience passed (no TypeError)');

// Empty transcript
const empty = VoiceCommandParser.parse('', mockContext);
assert.strictEqual(empty.action, MUSICLY_ACTIONS.UNKNOWN);
console.log('✓ Empty transcript handled safely');

// Whisper & softened address variants
wake.reset();
const whisper1 = wake.processTranscript('hey music');
assert.strictEqual(whisper1.detected, true, 'Should detect whispered "hey music"');
wake.reset();
const whisper2 = wake.processTranscript('musicly');
assert.strictEqual(whisper2.detected, true, 'Should detect direct whisper "musicly"');
wake.reset();
const whisper3 = wake.processTranscript('hey musical');
assert.strictEqual(whisper3.detected, true, 'Should detect whispered "hey musical"');
console.log('✓ Whisper & softened address variants passed');

// ==========================================
// 10. CENTRAL ACTION REGISTRY EXECUTION
// ==========================================
console.log('\n--- 10. Testing Central MusiclyActionRegistry Execution ---');

const registry = new MusiclyActionRegistry();
let executedAction = null;
let executedParam = null;

registry.setContextProvider(() => mockContext);

registry.register(MUSICLY_ACTIONS.PLAY, async () => {
  executedAction = 'PLAY';
  return 'Playing.';
});

registry.register(MUSICLY_ACTIONS.SET_VOLUME, async (params) => {
  executedAction = 'SET_VOLUME';
  executedParam = params.value;
  return `Volume set to ${params.value * 100}%.`;
});

// Execute via action property
const res1 = await registry.execute({ action: MUSICLY_ACTIONS.PLAY });
assert.strictEqual(res1.success, true);
assert.strictEqual(executedAction, 'PLAY');
assert.strictEqual(res1.responseText, 'Playing.');

// Execute via type property (canonical alias)
const res2 = await registry.execute({ type: 'SET_VOLUME', value: 0.65 });
assert.strictEqual(res2.success, true);
assert.strictEqual(executedAction, 'SET_VOLUME');
assert.strictEqual(executedParam, 0.65);

console.log('✓ MusiclyActionRegistry safe execution and unified dispatch passed');

console.log('\n==================================================');
console.log('ALL 42 VOICE AI SYSTEM UNIT TESTS PASSED SUCCESSFULLY!');
console.log('==================================================\n');
