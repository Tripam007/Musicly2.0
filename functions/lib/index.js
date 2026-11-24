"use strict";
/**
 * Musicly Firebase Cloud Functions (2nd Gen)
 *
 * Unified Hybrid Voice AI Pipeline:
 * 1. transcribeMusiclyCommand -> Google Cloud STT & ElevenLabs Scribe STT
 * 2. generateMusiclyVoice -> Google Cloud TTS & ElevenLabs TTS
 * 3. getConversationalAgentSignedUrl -> ElevenLabs Conversational AI Agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationalAgentSignedUrl = exports.generateMusiclyVoice = exports.transcribeMusiclyCommand = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const transcribeCommand_1 = require("./voice/transcribeCommand");
const generateVoiceResponse_1 = require("./voice/generateVoiceResponse");
const getConversationalAgentSignedUrl_1 = require("./voice/getConversationalAgentSignedUrl");
// Initialize Admin SDK once
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Define server-side secret for ElevenLabs API Key
const elevenLabsApiKey = (0, params_1.defineSecret)('ELEVENLABS_API_KEY');
/**
 * Callable Function: transcribeMusiclyCommand
 * Supports Google Cloud Speech-to-Text & ElevenLabs Scribe STT
 */
exports.transcribeMusiclyCommand = (0, https_1.onCall)({
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 30,
}, async (request) => {
    let secretValue;
    try {
        secretValue = elevenLabsApiKey.value();
    }
    catch {
        secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return (0, transcribeCommand_1.handleTranscribeCommand)(request, secretValue);
});
/**
 * Callable Function: generateMusiclyVoice
 * Supports Google Cloud Text-to-Speech & ElevenLabs TTS with in-memory caching
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
/**
 * Callable Function: getConversationalAgentSignedUrl
 * Obtains temporary authenticated signed URLs for ElevenLabs Conversational AI
 */
exports.getConversationalAgentSignedUrl = (0, https_1.onCall)({
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 15,
}, async (request) => {
    let secretValue;
    try {
        secretValue = elevenLabsApiKey.value();
    }
    catch {
        secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return (0, getConversationalAgentSignedUrl_1.handleGetConversationalAgentSignedUrl)(request, secretValue);
});
//# sourceMappingURL=index.js.map