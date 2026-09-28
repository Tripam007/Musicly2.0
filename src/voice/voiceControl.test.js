import assert from 'node:assert';
import { WakeWordManager } from './WakeWordManager.js';
import { VoiceCommandParser } from './VoiceCommandParser.js';
import { MUSICLY_ACTIONS } from './voiceConfig.js';

console.log('--- Testing "HEY MUSICLY" Wake Word Detection ---');

// Test 1: Explicit wake word
let triggered = false;
let tail = null;
const wakeManager = new WakeWordManager({
  onWakeWord: (payload) => {
    triggered = true;
    tail = payload.tailCommand;
  }
});

wakeManager.processTranscript('Hey Musicly');
assert.strictEqual(triggered, true, 'Should trigger on "Hey Musicly"');
assert.strictEqual(tail, '', 'Tail command should be empty string');
console.log('✓ Trigger on "Hey Musicly" passed');

// Test 2: Single breath wake + tail
triggered = false;
wakeManager.reset();
wakeManager.processTranscript('Hey Musicly play Faasle');
assert.strictEqual(triggered, true, 'Should trigger on "Hey Musicly play Faasle"');
assert.strictEqual(tail, 'play Faasle', 'Should capture tail command "play Faasle"');
console.log('✓ Capture tail command in single breath passed');

// Test 3: False positive rejection
triggered = false;
wakeManager.reset();
const falsePhrases = [
  'Musicly',
  'Hey',
  'Hey Google play songs',
  'Musicly is awesome',
  'I like music',
  'Hey Siri'
];

for (const phrase of falsePhrases) {
  wakeManager.processTranscript(phrase);
  assert.strictEqual(triggered, false, `Must reject false activation: "${phrase}"`);
}
console.log('✓ False activation rejection passed');

console.log('\n--- Testing Natural Language Command Parsing ---');

const mockContext = {
  allTracks: [
    { id: 'track-1', title: 'Faasle', artist: 'Kaavish' },
    { id: 'track-2', title: 'Yellow', artist: 'Coldplay' },
    { id: 'track-3', title: 'Woh Lamhe', artist: 'Atif Aslam' }
  ],
  allScenes: [
    { id: 'afterglow', name: 'Afterglow' },
    { id: 'cozy_studio', name: 'Cozy Studio' }
  ],
  currentTrack: { id: 'track-1', title: 'Faasle', artist: 'Kaavish' }
};

const parser = new VoiceCommandParser();

// Playback
assert.strictEqual(parser.parse('play', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(parser.parse('start the music', mockContext).action, MUSICLY_ACTIONS.PLAY);
assert.strictEqual(parser.parse('pause', mockContext).action, MUSICLY_ACTIONS.PAUSE);
assert.strictEqual(parser.parse('next song', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(parser.parse('skip this one', mockContext).action, MUSICLY_ACTIONS.NEXT_TRACK);
assert.strictEqual(parser.parse('previous track', mockContext).action, MUSICLY_ACTIONS.PREVIOUS_TRACK);
assert.strictEqual(parser.parse('replay this song', mockContext).action, MUSICLY_ACTIONS.REPLAY);
console.log('✓ Playback commands (play, pause, next, prev, replay) passed');

// Seeking
const fwd = parser.parse('skip forward 30 seconds', mockContext);
assert.strictEqual(fwd.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(fwd.params.offsetSeconds, 30);
assert.strictEqual(fwd.params.direction, 'forward');

const back = parser.parse('go back 10 seconds', mockContext);
assert.strictEqual(back.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(back.params.offsetSeconds, 10);
assert.strictEqual(back.params.direction, 'backward');

const jump = parser.parse('jump to 2 minutes', mockContext);
assert.strictEqual(jump.action, MUSICLY_ACTIONS.SEEK);
assert.strictEqual(jump.params.timestamp, 120);
console.log('✓ Seeking commands (skip forward, go back, jump to) passed');

// Volume
const v50 = parser.parse('set volume to 50 percent', mockContext);
assert.strictEqual(v50.action, MUSICLY_ACTIONS.SET_VOLUME);
assert.strictEqual(v50.params.value, 0.5);

assert.strictEqual(parser.parse('turn it up', mockContext).action, MUSICLY_ACTIONS.VOLUME_UP);
assert.strictEqual(parser.parse('turn the volume down', mockContext).action, MUSICLY_ACTIONS.VOLUME_DOWN);
assert.strictEqual(parser.parse('mute', mockContext).action, MUSICLY_ACTIONS.MUTE);
assert.strictEqual(parser.parse('unmute', mockContext).action, MUSICLY_ACTIONS.UNMUTE);
console.log('✓ Volume commands (set volume, up, down, mute, unmute) passed');

// Search & Catalog Matching
const playFaasle = parser.parse('play Faasle', mockContext);
assert.strictEqual(playFaasle.action, MUSICLY_ACTIONS.PLAY_SPECIFIC_SONG);
assert.strictEqual(playFaasle.params.track.title, 'Faasle');

const playColdplay = parser.parse('play something by Coldplay', mockContext);
assert.strictEqual(playColdplay.action, MUSICLY_ACTIONS.PLAY_SPECIFIC_SONG);
assert.strictEqual(playColdplay.params.track.artist, 'Coldplay');
console.log('✓ Search & Catalog Matching (track and artist) passed');

// Scenes & Ambience
const scene = parser.parse('switch to Afterglow', mockContext);
assert.strictEqual(scene.action, MUSICLY_ACTIONS.CHANGE_SCENE);
assert.strictEqual(scene.params.scene.id, 'afterglow');

const ambOn = parser.parse('turn ambience on', mockContext);
assert.strictEqual(ambOn.action, MUSICLY_ACTIONS.AMBIENCE_ON);

const ambOff = parser.parse('turn ambience off', mockContext);
assert.strictEqual(ambOff.action, MUSICLY_ACTIONS.AMBIENCE_OFF);
console.log('✓ Scenes & Ambience controls passed');

// Cancellation
assert.strictEqual(parser.parse('cancel', mockContext).action, MUSICLY_ACTIONS.CANCEL);
console.log('✓ Command cancellation passed');

console.log('\n========================================');
console.log('ALL HEY MUSICLY VOICE ENGINE TESTS PASSED!');
console.log('========================================\n');
