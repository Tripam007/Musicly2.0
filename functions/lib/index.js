"use strict";
/**
 * Musicly Firebase Cloud Functions (2nd Gen)
 *
 * Secure Voice AI Pipeline:
 * 1. transcribeMusiclyCommand -> Google Cloud Speech-to-Text with short-command model & Hinglish/multilingual support
 * 2. generateMusiclyVoice -> ElevenLabs Text-to-Speech with server-side secret management & caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMusiclyVoice = exports.transcribeMusiclyCommand = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const transcribeCommand_1 = require("./voice/transcribeCommand");
const generateVoiceResponse_1 = require("./voice/generateVoiceResponse");
// Initialize Admin SDK once
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Define server-side secret for ElevenLabs API Key
const elevenLabsApiKey = (0, params_1.defineSecret)('ELEVENLABS_API_KEY');
/**
 * Callable Function: transcribeMusiclyCommand
 * Transcribes user voice commands using Google Cloud Speech-to-Text
 */
exports.transcribeMusiclyCommand = (0, https_1.onCall)({
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 30,
}, async (request) => {
    return (0, transcribeCommand_1.handleTranscribeCommand)(request);
});
/**
 * Callable Function: generateMusiclyVoice
 * Generates cinematic speech audio using ElevenLabs TTS with audio caching
 */
exports.generateMusiclyVoice = (0, https_1.onCall)({
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 20,
}, async (request) => {
    let secretValue;
    try {
        secretValue = elevenLabsApiKey.value();
    }
    catch {
        secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return (0, generateVoiceResponse_1.handleGenerateVoiceResponse)(request, secretValue);
});
//# sourceMappingURL=index.js.map