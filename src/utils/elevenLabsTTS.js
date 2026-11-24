/**
 * elevenLabsTTS.js
 * 
 * Client-side audio synthesizer and preview helper for ElevenLabs voices.
 * Features:
 * - High-fidelity authentic ElevenLabs preview audio playback (e.g. Nathaniel C)
 * - Direct synthesis with ElevenLabs API or Firebase Callable proxy
 * - Multi-voice acoustic speech synthesis engine with distinct pitch/rate/timbre
 * - Memory caching for audio blobs
 * - Isolated audio preview player
 */

import { getCustomElevenLabsApiKey, getVoiceById } from './voiceRegistryDB';

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

// Pre-warm browser voices on module initialization
if (typeof window !== 'undefined' && window.speechSynthesis) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
      };
    }
  } catch {}
}

/**
 * Get all loaded browser speech voices safely
 */
export function getBrowserVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

/**
 * Resolve the best matching browser native voice for an AI persona
 */
export function resolveMatchingBrowserVoice(voiceDef) {
  const voices = getBrowserVoices();
  if (!voices.length) return null;

  const id = voiceDef?.id || '';
  const name = (voiceDef?.name || '').toLowerCase();
  const isFemale = (voiceDef?.gender || '').toLowerCase().includes('female') && !name.includes('nathaniel') && id !== 'AeRdCCKzvd23BpJoofzx';
  const isBritish = (voiceDef?.accent || voiceDef?.style || '').toLowerCase().includes('british') || id === 'AeRdCCKzvd23BpJoofzx' || id === 'Xb7hH8MSUJpSbSDYk0k2' || name.includes('nathaniel');

  if (isBritish) {
    // 1. Look for British English voice
    const ukVoice = voices.find(v => {
      const lang = (v.lang || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      const isUk = lang.includes('en-gb') || lang.includes('en_gb') || vName.includes('united kingdom') || vName.includes('british') || vName.includes('uk english');
      if (!isUk) return false;
      if (isFemale) {
        return vName.includes('female') || vName.includes('hazel') || vName.includes('susan') || vName.includes('libby');
      }
      return vName.includes('male') || vName.includes('george') || vName.includes('oliver') || !vName.includes('female');
    });
    if (ukVoice) return ukVoice;
  }

  if (isFemale) {
    // 2. Look for female voice
    const femaleVoice = voices.find(v => {
      const name = (v.name || '').toLowerCase();
      return name.includes('zira') ||
        name.includes('samantha') ||
        name.includes('aria') ||
        name.includes('jenny') ||
        name.includes('female') ||
        name.includes('victoria');
    });
    if (femaleVoice) return femaleVoice;
  } else {
    // 3. Look for male voice
    const maleVoice = voices.find(v => {
      const name = (v.name || '').toLowerCase();
      return name.includes('david') ||
        name.includes('mark') ||
        name.includes('guy') ||
        name.includes('george') ||
        name.includes('male');
    });
    if (maleVoice) return maleVoice;
  }

  // Fallback to any English voice or first voice
  return voices.find(v => (v.lang || '').toLowerCase().startsWith('en')) || voices[0] || null;
}

export function stopVoicePreview() {
  if (previewAudioElement) {
    try {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
      previewAudioElement.removeAttribute('src');
      previewAudioElement.load();
    } catch {}
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Resolve authentic direct preview audio URL for known ElevenLabs voices
 */
export function getAuthenticVoicePreviewUrl(voice) {
  if (!voice) return null;
  const id = voice.id || '';
  const name = (voice.name || '').toLowerCase();

  // Nathaniel C (Requested ElevenLabs voice: AeRdCCKzvd23BpJoofzx)
  if (id === 'AeRdCCKzvd23BpJoofzx' || name.includes('nathaniel')) {
    return '/assets/nathaniel_preview.mp3';
  }
  // Adam
  if (id === 'pNInz6obpgDQGcFmaJgB' || name.includes('adam')) {
    return '/assets/adam_preview.mp3';
  }
  // Sarah & Rachel
  if (id === 'EXAVITQu4vr4xnSDxMaL' || id === '21m00Tcm4TlvDq8ikWAM' || name.includes('sarah') || name.includes('rachel')) {
    return '/assets/sarah_preview.mp3';
  }
  // Alice
  if (id === 'Xb7hH8MSUJpSbSDYk0k2' || name.includes('alice')) {
    return '/assets/alice_preview.mp3';
  }

  return voice.previewUrl || null;
}

/**
 * Synthesize and play audio for previewing a voice
 * @param {object} voice - Voice definition { id, name, provider, samplePhrase, previewUrl }
 * @param {string} [customText] - Text to speak
 * @param {object} [commandClient] - Optional VoiceCommandClient instance
 * @returns {Promise<void>}
 */
export async function playVoicePreview(voice, customText = null, commandClient = null) {
  if (!voice) return;

  stopVoicePreview();

  const text = customText || voice.samplePhrase || `Hello, this is ${voice.name} speaking on Musicly.`;
  const voiceId = voice.id;

  // 1. If voice has an authentic direct ElevenLabs preview URL (like Nathaniel C), play it directly!
  const directPreviewUrl = getAuthenticVoicePreviewUrl(voice);
  if (directPreviewUrl && !customText) {
    try {
      await playAudioUrl(directPreviewUrl);
      return;
    } catch (err) {
      console.warn('[elevenLabsTTS] Direct previewUrl playback note, trying synthesis:', err);
    }
  }

  // 2. If it's a native system voice, use SpeechSynthesis
  if (voice.provider === 'system' || voiceId === 'system_native') {
    return playSystemSpeech(text, voice);
  }

  // 3. Check in-memory blob cache
  const cacheKey = `${voiceId}_${text.toLowerCase().trim()}`;
  if (audioCache.has(cacheKey)) {
    const cachedUrl = audioCache.get(cacheKey);
    return playAudioUrl(cachedUrl);
  }

  // 4. Try Firebase Cloud Function if client passed
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

  // 5. Try Direct ElevenLabs API call if client API key is configured
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

  // 6. Distinct Acoustic Fallback Speech Synthesis with exact voice matching
  return playSystemSpeech(text, voice);
}

/**
 * Play an audio URL (object URL or data URI) through preview audio element
 */
function playAudioUrl(src) {
  return new Promise((resolve, reject) => {
    const audio = getPreviewAudio();
    if (!audio) {
      resolve();
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}

    audio.src = src;
    
    let timer = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = (e) => {
      console.warn('[elevenLabsTTS] Audio preview playback failed for src:', src, e);
      if (timer) clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      reject(new Error('Audio playback failed'));
    };

    audio.play().then(() => {
      timer = setTimeout(cleanup, 12000);
    }).catch((err) => {
      console.warn('[elevenLabsTTS] audio.play() rejected:', err);
      cleanup();
    });
  });
}

/**
 * Speak text with Web Speech API using unique acoustic persona parameters
 */
export function playSystemSpeech(text, voice = null) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const matchingVoice = resolveMatchingBrowserVoice(voice);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      const isFemale = (voice?.gender || '').toLowerCase().includes('female');
      const isBritish = (voice?.accent || voice?.style || '').toLowerCase().includes('british');

      // Unique acoustic pitch & rate per persona
      utterance.pitch = voice?.pitch !== undefined ? voice.pitch : (isFemale ? 1.16 : (isBritish ? 0.84 : 0.82));
      utterance.rate = voice?.rate !== undefined ? voice.rate : (isBritish ? 0.92 : 1.02);
      utterance.volume = 1.0;

      const cleanup = () => {
        utterance.onend = null;
        utterance.onerror = null;
        resolve();
      };

      utterance.onend = cleanup;
      utterance.onerror = cleanup;

      window.speechSynthesis.speak(utterance);
      setTimeout(resolve, 6000);
    } catch {
      resolve();
    }
  });
}
