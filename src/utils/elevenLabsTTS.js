/**
 * elevenLabsTTS.js
 * 
 * Client-side audio synthesizer and preview helper for ElevenLabs voices.
 * Features:
 * - Direct synthesis with ElevenLabs API or Firebase Callable proxy
 * - Graceful fallback to browser Web Speech Synthesis
 * - Audio blob memory cache to minimize redundant API calls
 * - Isolated audio preview player
 */

import { getCustomElevenLabsApiKey } from './voiceRegistryDB';

// In-memory audio URL cache for sample phrases
const audioCache = new Map();

let previewAudioElement = null;

function getPreviewAudio() {
  if (typeof window === 'undefined') return null;
  if (!previewAudioElement) {
    previewAudioElement = new Audio();
    previewAudioElement.preload = 'auto';
  }
  return previewAudioElement;
}

/**
 * Synthesize and play audio for previewing a voice
 * @param {object} voice - Voice definition { id, name, provider, samplePhrase }
 * @param {string} [customText] - Text to speak
 * @param {object} [commandClient] - Optional VoiceCommandClient instance
 * @returns {Promise<void>}
 */
export async function playVoicePreview(voice, customText = null, commandClient = null) {
  if (!voice) return;

  stopVoicePreview();

  const text = customText || voice.samplePhrase || `Hello, this is ${voice.name} speaking on Musicly.`;
  const voiceId = voice.id;

  // 1. If it's a native system voice, use SpeechSynthesis
  if (voice.provider === 'system' || voiceId === 'system_native') {
    return playSystemSpeech(text);
  }

  // 2. Check in-memory blob cache
  const cacheKey = `${voiceId}_${text.toLowerCase().trim()}`;
  if (audioCache.has(cacheKey)) {
    const cachedUrl = audioCache.get(cacheKey);
    return playAudioUrl(cachedUrl);
  }

  // 3. Try Firebase Cloud Function if client passed
  if (commandClient && typeof commandClient.generateVoiceResponse === 'function') {
    try {
      const res = await commandClient.generateVoiceResponse(text, 'cinematic', voiceId);
      if (res && res.success && res.audioBase64) {
        const audioSrc = `data:${res.mimeType || 'audio/mpeg'};base64,${res.audioBase64}`;
        audioCache.set(cacheKey, audioSrc);
        return playAudioUrl(audioSrc);
      }
    } catch (err) {
      console.warn('[elevenLabsTTS] Cloud function preview attempt note:', err);
    }
  }

  // 4. Try Direct ElevenLabs API call if client API key is configured
  const apiKey = getCustomElevenLabsApiKey() || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELEVENLABS_API_KEY);
  if (apiKey) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text.slice(0, 160),
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        audioCache.set(cacheKey, objectUrl);
        return playAudioUrl(objectUrl);
      }
    } catch (err) {
      console.warn('[elevenLabsTTS] Direct API call preview note:', err);
    }
  }

  // 5. Fallback to Browser Speech Synthesis
  return playSystemSpeech(text, voice);
}

/**
 * Play an audio URL (object URL or data URI) through preview audio element
 */
function playAudioUrl(src) {
  return new Promise((resolve) => {
    const audio = getPreviewAudio();
    if (!audio) {
      resolve();
      return;
    }

    audio.src = src;
    
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    audio.play().catch(() => resolve());
    setTimeout(cleanup, 8000);
  });
}

/**
 * Speak text with Web Speech API
 */
function playSystemSpeech(text, voice = null) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices() || [];
      if (voice && voice.accent) {
        const matching = voices.find(v => 
          v.name.toLowerCase().includes(voice.name.toLowerCase()) ||
          (voice.gender === 'Male' && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('george'))) ||
          (voice.gender === 'Female' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')))
        );
        if (matching) utterance.voice = matching;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
      setTimeout(resolve, 5000);
    } catch {
      resolve();
    }
  });
}

/**
 * Stop any active voice preview playback
 */
export function stopVoicePreview() {
  if (previewAudioElement) {
    try {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
    } catch {}
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
