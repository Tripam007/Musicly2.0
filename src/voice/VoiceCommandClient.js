/**
 * VoiceCommandClient.js
 * 
 * Secure Client wrapper for Firebase Cloud Functions:
 * 1. transcribeMusiclyCommand -> Google Cloud Speech-to-Text & ElevenLabs Scribe STT
 * 2. generateMusiclyVoice -> ElevenLabs TTS & Google Cloud TTS
 * 3. getConversationalAgentSignedUrl -> ElevenLabs Conversational AI
 * 
 * Features:
 * - Direct callable function invocation using Firebase SDK
 * - Independent provider selection (Google vs ElevenLabs)
 * - Automatic graceful client-side fallbacks
 * - Request cancellation and timeout handling
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.js';
import { getCustomElevenLabsApiKey } from '../utils/voiceRegistryDB.js';

export class VoiceCommandClient {
  constructor(options = {}) {
    this.functionsInstance = options.functions || functions;
    this.transcribeCallable = null;
    this.voiceCallable = null;
    this.agentSignedUrlCallable = null;

    this._initCallables();
  }

  _initCallables() {
    try {
      if (this.functionsInstance) {
        this.transcribeCallable = httpsCallable(this.functionsInstance, 'transcribeMusiclyCommand');
        this.voiceCallable = httpsCallable(this.functionsInstance, 'generateMusiclyVoice');
        this.agentSignedUrlCallable = httpsCallable(this.functionsInstance, 'getConversationalAgentSignedUrl');
      }
    } catch (e) {
      console.warn('[VoiceCommandClient] Callable initialization note:', e);
    }
  }

  /**
   * Transcribe short audio command via selected recognition provider (Google STT or ElevenLabs Scribe)
   * 
   * @param {string} audioBase64 - Base64 encoded audio
   * @param {string} mimeType - e.g. 'audio/webm;codecs=opus'
   * @param {string} languagePreference - 'en-IN' | 'en-US' | 'hi-IN' | 'bn-IN'
   * @param {string} provider - 'google' | 'elevenlabs_scribe'
   * @returns {Promise<{ success: boolean, transcript: string, confidence: number, detectedLanguage: string, alternatives: string[], providerUsed?: string, error?: string }>}
   */
  async transcribeAudio(
    audioBase64, 
    mimeType = 'audio/webm;codecs=opus', 
    languagePreference = 'en-IN',
    provider = 'google'
  ) {
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

    // 1. Try Firebase Callable Function
    if (this.transcribeCallable) {
      try {
        const response = await this.transcribeCallable({
          audioBase64,
          mimeType,
          languagePreference,
          provider
        });

        const data = response.data || {};
        return {
          success: true,
          transcript: data.transcript || '',
          confidence: data.confidence !== undefined ? data.confidence : 0.85,
          detectedLanguage: data.detectedLanguage || languagePreference,
          alternatives: data.alternatives || [],
          providerUsed: data.providerUsed || provider
        };
      } catch (err) {
        console.warn('[VoiceCommandClient] Transcribe callable note:', err?.message || err);
      }
    }

    // 2. Client-side fallback if ElevenLabs Scribe selected and client API key is available
    const clientApiKey = getCustomElevenLabsApiKey() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY);
    if (provider === 'elevenlabs_scribe' && clientApiKey) {
      try {
        const binaryStr = window.atob(audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob([bytes], { type: mimeType });
        const formData = new FormData();
        formData.append('file', blob, `voice.${ext}`);
        formData.append('model_id', 'scribe_v1');
        formData.append('language_code', languagePreference.slice(0, 2));

        const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: { 'xi-api-key': clientApiKey },
          body: formData
        });

        if (res.ok) {
          const scribeData = await res.json();
          return {
            success: true,
            transcript: scribeData.text ? scribeData.text.trim() : '',
            confidence: 0.95,
            detectedLanguage: scribeData.language_code || languagePreference,
            alternatives: [],
            providerUsed: 'elevenlabs_scribe'
          };
        }
      } catch (fallbackErr) {
        console.warn('[VoiceCommandClient] Direct Scribe STT note:', fallbackErr);
      }
    }

    return {
      success: false,
      transcript: '',
      confidence: 0,
      detectedLanguage: languagePreference,
      alternatives: [],
      error: 'STT service temporarily unavailable'
    };
  }

  /**
   * Request TTS audio for short system response via selected response provider
   * 
   * @param {string} text - Response text to speak
   * @param {object|string} [options] - Options or voiceStyle string
   * @returns {Promise<{ success: boolean, audioBase64: string|null, mimeType: string, cached?: boolean, providerUsed?: string, error?: string }>}
   */
  async generateVoiceResponse(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { success: false, audioBase64: null, mimeType: 'audio/mpeg' };
    }

    const opts = typeof options === 'string' ? { voiceStyle: options } : options;
    const voiceStyle = opts.voiceStyle || 'cinematic';
    const voiceId = opts.voiceId || 'AeRdCCKzvd23BpJoofzx';
    const provider = opts.provider || 'elevenlabs';
    const language = opts.language || 'en-US';
    const gender = opts.gender || 'FEMALE';

    // 1. Try Firebase Callable Function first
    if (!this.voiceCallable) {
      this._initCallables();
    }

    if (this.voiceCallable) {
      try {
        const response = await this.voiceCallable({
          text,
          voiceStyle,
          voiceId,
          provider,
          language,
          gender
        });

        const data = response.data || {};
        if (data.status === 'SUCCESS' && data.audioBase64) {
          return {
            success: true,
            audioBase64: data.audioBase64,
            mimeType: data.mimeType || 'audio/mpeg',
            cached: !!data.cached,
            providerUsed: data.providerUsed || provider
          };
        }
      } catch (err) {
        console.warn('[VoiceCommandClient] Generate voice response callable note:', err?.message || err);
      }
    }

    // 2. Direct browser fallback for ElevenLabs if client API key is configured
    const apiKey = getCustomElevenLabsApiKey() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY);
    if (provider === 'elevenlabs' && apiKey) {
      try {
        const directRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
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
            cached: false,
            providerUsed: 'elevenlabs'
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

  /**
   * Obtain temporary authenticated signed URL for ElevenLabs Conversational AI Agent
   * 
   * @param {string} [agentId]
   * @returns {Promise<{ success: boolean, signedUrl?: string, agentId?: string, error?: string }>}
   */
  async getConversationalAgentSignedUrl(agentId = null) {
    if (!this.agentSignedUrlCallable) {
      this._initCallables();
    }

    if (this.agentSignedUrlCallable) {
      try {
        const res = await this.agentSignedUrlCallable({ agentId: agentId || undefined });
        const data = res.data || {};
        if (data.success && data.signedUrl) {
          return {
            success: true,
            signedUrl: data.signedUrl,
            agentId: data.agentId
          };
        }
      } catch (err) {
        console.warn('[VoiceCommandClient] Signed URL callable note:', err?.message || err);
      }
    }

    // Direct fallback if client API key is provided
    const apiKey = getCustomElevenLabsApiKey() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY);
    if (apiKey) {
      try {
        const targetAgentId = agentId || 'agent_musicly_assistant';
        const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(targetAgentId)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'xi-api-key': apiKey }
        });
        if (res.ok) {
          const json = await res.json();
          return {
            success: true,
            signedUrl: json.signed_url,
            agentId: targetAgentId
          };
        }
      } catch (e) {
        console.warn('[VoiceCommandClient] Direct signed URL note:', e);
      }
    }

    return {
      success: false,
      error: 'Conversational Agent session could not be established.'
    };
  }
}
