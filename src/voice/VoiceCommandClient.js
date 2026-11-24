/**
 * VoiceCommandClient.js
 * 
 * Secure Client wrapper for Firebase Cloud Functions:
 * 1. transcribeMusiclyCommand -> Google Cloud Speech-to-Text
 * 2. generateMusiclyVoice -> ElevenLabs Text-to-Speech
 * 
 * Features:
 * - Direct callable function invocation using Firebase SDK
 * - Request cancellation and timeout handling
 * - Clean error mapping without breaking the UI
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.js';
import { getCustomElevenLabsApiKey } from '../utils/voiceRegistryDB.js';

export class VoiceCommandClient {
  constructor(options = {}) {
    this.functionsInstance = options.functions || functions;
    this.transcribeCallable = null;
    this.voiceCallable = null;

    this._initCallables();
  }

  _initCallables() {
    try {
      if (this.functionsInstance) {
        this.transcribeCallable = httpsCallable(this.functionsInstance, 'transcribeMusiclyCommand');
        this.voiceCallable = httpsCallable(this.functionsInstance, 'generateMusiclyVoice');
      }
    } catch (e) {
      console.warn('[VoiceCommandClient] Callable initialization note:', e);
    }
  }

  /**
   * Transcribe short audio command via Google Cloud STT
   * 
   * @param {string} audioBase64 - Base64 encoded audio
   * @param {string} mimeType - e.g. 'audio/webm;codecs=opus'
   * @param {string} languagePreference - 'en-IN' | 'en-US' | 'hi-IN' | 'bn-IN'
   * @returns {Promise<{ success: boolean, transcript: string, confidence: number, detectedLanguage: string, alternatives: string[], error?: string }>}
   */
  async transcribeAudio(audioBase64, mimeType = 'audio/webm;codecs=opus', languagePreference = 'en-IN') {
    if (!audioBase64) {
      return {
        success: false,
        transcript: '',
        confidence: 0,
        detectedLanguage: languagePreference,
        alternatives: [],
        error: 'No audio captured'
      };
    }

    if (!this.transcribeCallable) {
      this._initCallables();
    }

    if (!this.transcribeCallable) {
      return {
        success: false,
        transcript: '',
        confidence: 0,
        detectedLanguage: languagePreference,
        alternatives: [],
        error: 'Firebase Functions not initialized'
      };
    }

    try {
      const response = await this.transcribeCallable({
        audioBase64,
        mimeType,
        languagePreference
      });

      const data = response.data || {};
      return {
        success: true,
        transcript: data.transcript || '',
        confidence: data.confidence !== undefined ? data.confidence : 0.85,
        detectedLanguage: data.detectedLanguage || languagePreference,
        alternatives: data.alternatives || []
      };
    } catch (err) {
      console.warn('[VoiceCommandClient] Transcribe call note:', err?.message || err);
      return {
        success: false,
        transcript: '',
        confidence: 0,
        detectedLanguage: languagePreference,
        alternatives: [],
        error: err?.message || 'STT transcription failed'
      };
    }
  }

  /**
   * Request ElevenLabs TTS audio for short system response
   * 
   * @param {string} text - Response text to speak (e.g. "Playing Kaavish.")
   * @param {string} [voiceStyle]
   * @param {string} [voiceId] - ElevenLabs voice ID (default Nathaniel C: AeRdCCKzvd23BpJoofzx)
   * @returns {Promise<{ success: boolean, audioBase64: string|null, mimeType: string, cached?: boolean, error?: string }>}
   */
  async generateVoiceResponse(text, voiceStyle = 'cinematic', voiceId = 'AeRdCCKzvd23BpJoofzx') {
    if (!text || typeof text !== 'string') {
      return { success: false, audioBase64: null, mimeType: 'audio/mpeg' };
    }

    const targetVoiceId = voiceId || 'AeRdCCKzvd23BpJoofzx';

    // 1. Try Firebase Callable Function first
    if (!this.voiceCallable) {
      this._initCallables();
    }

    if (this.voiceCallable) {
      try {
        const response = await this.voiceCallable({
          text,
          voiceStyle,
          voiceId: targetVoiceId
        });

        const data = response.data || {};
        if (data.status === 'SUCCESS' && data.audioBase64) {
          return {
            success: true,
            audioBase64: data.audioBase64,
            mimeType: data.mimeType || 'audio/mpeg',
            cached: !!data.cached
          };
        }
      } catch (err) {
        console.warn('[VoiceCommandClient] Generate voice response callable note:', err?.message || err);
      }
    }

    // 2. Direct browser fallback using configured ElevenLabs API key if available
    const apiKey = getCustomElevenLabsApiKey() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY);
    if (apiKey) {
      try {
        const directRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: text.trim().slice(0, 160),
            model_id: 'eleven_flash_v2_5',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.85
            }
          })
        });

        if (directRes.ok) {
          const buffer = await directRes.arrayBuffer();
          // Convert arrayBuffer to base64
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = window.btoa(binary);
          return {
            success: true,
            audioBase64: base64,
            mimeType: 'audio/mpeg',
            cached: false
          };
        }
      } catch (directErr) {
        console.warn('[VoiceCommandClient] Direct ElevenLabs API note:', directErr);
      }
    }

    return {
      success: false,
      audioBase64: null,
      mimeType: 'audio/mpeg',
      error: 'TTS generation unavailable'
    };
  }
}
