const TACTILE_STORAGE_KEY = 'musicly_tactile_feedback_settings';

export const TACTILE_STYLES = [
  { id: 'matte', name: 'Aesthetic Tap', desc: 'Apple/Trackpad subtle matte click' },
  { id: 'thock', name: 'Mechanical Thock', desc: 'Deeper low-frequency switch bump' },
  { id: 'tick', name: 'Crisp Tick', desc: 'Ultra-light micro high-clarity tick' }
];

const DEFAULT_SETTINGS = {
  enabled: true,
  volume: 0.35, // 0.0 to 1.0
  style: 'matte' // 'matte' | 'thock' | 'tick'
};

let cachedSettings = null;
const listeners = new Set();

export function getTactileSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(TACTILE_STORAGE_KEY);
      if (stored) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        return cachedSettings;
      }
    }
  } catch (e) {}
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

export function updateTactileSettings(partial) {
  const current = getTactileSettings();
  const next = { ...current, ...partial };
  cachedSettings = next;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TACTILE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch (e) {}
  listeners.forEach(fn => {
    try { fn(next); } catch (err) {}
  });
  return next;
}

export function subscribeTactileSettings(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
