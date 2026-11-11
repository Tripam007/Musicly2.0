// Musicly Streaming Quality & Internet Data Usage Settings
// Allows switching between Low Data Usage (ultra-smooth, anti-stutter) and High Data Usage (standard)

const STREAMING_STORAGE_KEY = 'musicly_streaming_data_settings';

export const DATA_USAGE_OPTIONS = [
  {
    id: 'low',
    name: 'Low Internet Usage',
    badge: 'Ultra Smooth • Anti-Jitter',
    tag: 'Recommended',
    desc: 'Lightweight streaming (144p–240p). Consumes 90%+ less bandwidth, eliminating buffering pauses, stutter, and jitter even on weak or fluctuating connections.',
    ytQuality: 'small',
    benefit: 'Saves ~90% internet data & ensures uninterrupted continuous audio'
  },
  {
    id: 'high',
    name: 'High Internet Usage',
    badge: 'Standard Quality',
    tag: 'Fast Wi-Fi',
    desc: 'Streams at standard resolution. Ideal for fast, unmetered broadband or fiber connections.',
    ytQuality: 'default',
    benefit: 'Streams at default video resolution'
  }
];

const DEFAULT_SETTINGS = {
  dataUsage: 'low', // Default to 'low' for instant, stutter-free audio streaming
  autoRecovery: true
};

let cachedSettings = null;
const listeners = new Set();

export function getStreamingSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STREAMING_STORAGE_KEY);
      if (stored) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        return cachedSettings;
      }
    }
  } catch (e) {}
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

export function updateStreamingSettings(partial) {
  const current = getStreamingSettings();
  const next = { ...current, ...partial };
  cachedSettings = next;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STREAMING_STORAGE_KEY, JSON.stringify(next));
    }
  } catch (e) {}
  listeners.forEach(fn => {
    try { fn(next); } catch (err) {}
  });
  return next;
}

export function subscribeStreamingSettings(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
