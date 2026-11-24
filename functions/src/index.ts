/**
 * Musicly Firebase Cloud Functions (2nd Gen)
 * 
 * Unified Hybrid Voice AI Pipeline:
 * 1. transcribeMusiclyCommand -> Google Cloud STT & ElevenLabs Scribe STT
 * 2. generateMusiclyVoice -> Google Cloud TTS & ElevenLabs TTS
 * 3. getConversationalAgentSignedUrl -> ElevenLabs Conversational AI Agent
 */

import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { handleTranscribeCommand } from './voice/transcribeCommand';
import { handleGenerateVoiceResponse } from './voice/generateVoiceResponse';
import { handleGetConversationalAgentSignedUrl } from './voice/getConversationalAgentSignedUrl';

// Initialize Admin SDK once
if (getApps().length === 0) {
  initializeApp();
}

// Define server-side secret for ElevenLabs API Key
const elevenLabsApiKey = defineSecret('ELEVENLABS_API_KEY');

/**
 * Callable Function: transcribeMusiclyCommand
 * Supports Google Cloud Speech-to-Text & ElevenLabs Scribe STT
 */
export const transcribeMusiclyCommand = onCall(
  {
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (request) => {
    let secretValue: string | undefined;
    try {
      secretValue = elevenLabsApiKey.value();
    } catch {
      secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return handleTranscribeCommand(request, secretValue);
  }
);

/**
 * Callable Function: generateMusiclyVoice
 * Supports Google Cloud Text-to-Speech & ElevenLabs TTS with in-memory caching
 */
export const generateMusiclyVoice = onCall(
  {
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 20,
  },
  async (request) => {
    let secretValue: string | undefined;
    try {
      secretValue = elevenLabsApiKey.value();
    } catch {
      secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return handleGenerateVoiceResponse(request, secretValue);
  }
);

/**
 * Callable Function: getConversationalAgentSignedUrl
 * Obtains temporary authenticated signed URLs for ElevenLabs Conversational AI
 */
export const getConversationalAgentSignedUrl = onCall(
  {
    cors: true,
    region: 'us-central1',
    secrets: [elevenLabsApiKey],
    maxInstances: 10,
    timeoutSeconds: 15,
  },
  async (request) => {
    let secretValue: string | undefined;
    try {
      secretValue = elevenLabsApiKey.value();
    } catch {
      secretValue = process.env.ELEVENLABS_API_KEY;
    }
    return handleGetConversationalAgentSignedUrl(request, secretValue);
  }
);
