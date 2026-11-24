/**
 * voiceRegistryDB.js
 * 
 * Manages available voice AI models for Musicly Voice Control:
 * - Curated ElevenLabs voices (including user-requested Nathaniel C - AeRdCCKzvd23BpJoofzx)
 * - Real-time Firestore sync via `public_voices` for admin-added voices
 * - Offline / localStorage fallback caching
 * - Voice ID parsing from ElevenLabs links
 * - Voice preview player
 */

import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

const VOICES_CACHE_KEY = 'musicly_custom_voices_cache';
const SELECTED_VOICE_KEY = 'musicly_selected_voice_id';
const ELEVENLABS_KEY_STORAGE = 'musicly_elevenlabs_api_key';

// Curated default voices built into Musicly
export const DEFAULT_VOICES = [
  {
    id: 'AeRdCCKzvd23BpJoofzx',
    name: 'Nathaniel C',
    provider: 'elevenlabs',
    gender: 'Male',
    style: 'British Calm & Suspense',
    accent: 'British',
    description: 'Calm, thoughtful British narrator with suspenseful warmth and cinematic depth.',
    url: 'https://elevenlabs.io/voices/AeRdCCKzvd23BpJoofzx',
    samplePhrase: 'Hello, I am Nathaniel. Ready to curate your music experience on Musicly.',
    isFeatured: true,
    isDefault: true
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    provider: 'elevenlabs',
    gender: 'Female',
    style: 'Warm & Cinematic',
    accent: 'American',
    description: 'Warm, soothing, and clear voice designed for serene listening sessions.',
    url: 'https://elevenlabs.io/voices/21m00Tcm4TlvDq8ikWAM',
    samplePhrase: 'Welcome back. Tell me what track or vibe you want to hear next.',
    isFeatured: false
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    provider: 'elevenlabs',
    gender: 'Male',
    style: 'Deep & Resonant',
    accent: 'American',
    description: 'Resonant, confident, and smooth late-night host personality.',
    url: 'https://elevenlabs.io/voices/pNInz6obpgDQGcFmaJgB',
    samplePhrase: 'Hey there. Let me set the mood with some good music for you.',
    isFeatured: false
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    provider: 'elevenlabs',
    gender: 'Female',
    style: 'Bright & Crisp',
    accent: 'American',
    description: 'Bright, cheerful, and crisp modern AI assistant style.',
    url: 'https://elevenlabs.io/voices/AZnzlk1XvdvUeBnXmlld',
    samplePhrase: 'Musicly Voice active. Shuffling tracks and adjusting your ambience.',
    isFeatured: false
  },
  {
    id: 'system_native',
    name: 'System Native (Browser)',
    provider: 'system',
    gender: 'Neutral',
    style: 'Zero-Latency Local',
    accent: 'System',
    description: 'High-speed browser speech synthesis with zero cloud latency or data usage.',
    url: '',
    samplePhrase: 'Musicly local speech synthesis is working smoothly.',
    isFeatured: false
  }
];

/**
 * Extract Voice ID from ElevenLabs voice URL or clean ID string
 * e.g. "https://elevenlabs.io/voices/AeRdCCKzvd23BpJoofzx" -> "AeRdCCKzvd23BpJoofzx"
 * e.g. "https://elevenlabs.io/voice-lab/share/AeRdCCKzvd23BpJoofzx" -> "AeRdCCKzvd23BpJoofzx"
 */
export function extractVoiceId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  
  // If it's a URL
  const match = trimmed.match(/(?:voices|voice-lab\/share|voice-library\/[^\/]+)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  
  // If it contains query params or hash
  const clean = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const segments = clean.split('/');
  const lastSeg = segments[segments.length - 1];
  if (lastSeg && lastSeg.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(lastSeg)) {
    return lastSeg;
  }
  
  return trimmed;
}

/**
 * Load cached custom voices from localStorage
 */
export function getLocalCustomVoices() {
  try {
    const data = localStorage.getItem(VOICES_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save custom voices to localStorage cache
 */
export function saveLocalCustomVoices(voices) {
  try {
    localStorage.setItem(VOICES_CACHE_KEY, JSON.stringify(voices || []));
  } catch (e) {
    console.warn('[voiceRegistryDB] Local cache save error:', e);
  }
}

/**
 * Get active user selected voice ID
 */
export function getSelectedVoiceId() {
  try {
    const saved = localStorage.getItem(SELECTED_VOICE_KEY);
    if (saved) return saved;
  } catch {}
  return 'AeRdCCKzvd23BpJoofzx'; // Nathaniel C default
}

/**
 * Save user selected voice ID
 */
export function setSelectedVoiceId(voiceId) {
  try {
    localStorage.setItem(SELECTED_VOICE_KEY, voiceId);
  } catch (e) {
    console.warn('[voiceRegistryDB] Set selected voice error:', e);
  }
}

/**
 * Fetch all available voices (default + custom)
 */
export async function getAvailableVoices() {
  const localCustom = getLocalCustomVoices();
  const voiceMap = new Map();

  // 1. Add defaults
  DEFAULT_VOICES.forEach(v => voiceMap.set(v.id, v));

  // 2. Add local custom
  localCustom.forEach(v => voiceMap.set(v.id, v));

  // 3. Attempt Firestore fetch
  try {
    if (firestore) {
      const snap = await getDocs(collection(firestore, 'public_voices'));
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.id) {
          voiceMap.set(data.id, { ...data, isCustom: true });
        }
      });
      // Update local cache
      const customList = Array.from(voiceMap.values()).filter(v => v.isCustom);
      saveLocalCustomVoices(customList);
    }
  } catch (err) {
    console.warn('[voiceRegistryDB] Firestore fetch note (using local cache):', err?.message || err);
  }

  return Array.from(voiceMap.values());
}

/**
 * Subscribe to real-time voice updates from Firestore
 */
export function subscribeVoiceRegistry(onUpdate) {
  // Initial fire with cached data
  getAvailableVoices().then(onUpdate);

  if (!firestore) return () => {};

  try {
    const colRef = collection(firestore, 'public_voices');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const customVoices = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.id) {
          customVoices.push({ ...data, isCustom: true });
        }
      });
      saveLocalCustomVoices(customVoices);

      const voiceMap = new Map();
      DEFAULT_VOICES.forEach(v => voiceMap.set(v.id, v));
      customVoices.forEach(v => voiceMap.set(v.id, v));

      onUpdate(Array.from(voiceMap.values()));
    }, (err) => {
      console.warn('[voiceRegistryDB] Realtime listener note:', err?.message || err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[voiceRegistryDB] Subscription init failed:', err);
    return () => {};
  }
}

/**
 * Add a new custom voice (Admin only)
 */
export async function addCustomVoice(voiceInput, user) {
  const voiceId = extractVoiceId(voiceInput.id || voiceInput.url);
  if (!voiceId) {
    throw new Error('Please provide a valid ElevenLabs Voice ID or URL.');
  }

  const voiceData = {
    id: voiceId,
    name: (voiceInput.name || 'Custom Voice').trim(),
    provider: voiceInput.provider || 'elevenlabs',
    gender: voiceInput.gender || 'Unknown',
    style: (voiceInput.style || 'Custom').trim(),
    accent: (voiceInput.accent || 'Natural').trim(),
    description: (voiceInput.description || 'Custom voice model added by admin.').trim(),
    url: voiceInput.url ? voiceInput.url.trim() : `https://elevenlabs.io/voices/${voiceId}`,
    samplePhrase: (voiceInput.samplePhrase || `Hello, this is ${voiceInput.name || 'your custom voice'} on Musicly.`).trim(),
    addedBy: user?.email || 'admin',
    addedAt: Date.now(),
    isCustom: true
  };

  // 1. Update local cache immediately
  const localCustom = getLocalCustomVoices().filter(v => v.id !== voiceId);
  localCustom.unshift(voiceData);
  saveLocalCustomVoices(localCustom);

  // 2. Persist to Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_voices', voiceId);
      await setDoc(docRef, voiceData, { merge: true });
    } catch (err) {
      console.warn('[voiceRegistryDB] Firestore save note (saved locally):', err);
    }
  }

  return voiceData;
}

/**
 * Delete a custom voice (Admin only)
 */
export async function deleteCustomVoice(voiceId) {
  if (!voiceId) return;

  // 1. Remove from local cache
  const localCustom = getLocalCustomVoices().filter(v => v.id !== voiceId);
  saveLocalCustomVoices(localCustom);

  // 2. Remove from Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_voices', voiceId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[voiceRegistryDB] Firestore delete note:', err);
    }
  }
}

/**
 * Get / Set custom ElevenLabs API key for direct browser synthesis if needed
 */
export function getCustomElevenLabsApiKey() {
  try {
    return localStorage.getItem(ELEVENLABS_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setCustomElevenLabsApiKey(apiKey) {
  try {
    if (apiKey) {
      localStorage.setItem(ELEVENLABS_KEY_STORAGE, apiKey.trim());
    } else {
      localStorage.removeItem(ELEVENLABS_KEY_STORAGE);
    }
  } catch (e) {
    console.warn('[voiceRegistryDB] Save API key note:', e);
  }
}
