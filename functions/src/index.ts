/**
 * Musicly Firebase Cloud Functions (2nd Gen)
 * 
 * Secure Voice AI Pipeline:
 * 1. transcribeMusiclyCommand -> Google Cloud Speech-to-Text with short-command model & Hinglish/multilingual support
 * 2. generateMusiclyVoice -> ElevenLabs Text-to-Speech with server-side secret management & caching
 */

import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { handleTranscribeCommand } from './voice/transcribeCommand';
import { handleGenerateVoiceResponse } from './voice/generateVoiceResponse';

// Initialize Admin SDK once
if (getApps().length === 0) {
  initializeApp();
}

// Define server-side secret for ElevenLabs API Key
const elevenLabsApiKey = defineSecret('ELEVENLABS_API_KEY');

/**
 * Callable Function: transcribeMusiclyCommand
 * Transcribes user voice commands using Google Cloud Speech-to-Text
 */
export const transcribeMusiclyCommand = onCall(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (request) => {
    return handleTranscribeCommand(request);
  }
);

/**
 * Callable Function: generateMusiclyVoice
 * Generates cinematic speech audio using ElevenLabs TTS with audio caching
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
