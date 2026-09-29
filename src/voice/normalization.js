/**
 * normalization.js
 * 
 * Production text normalization, number conversion, phonetic alias resolution,
 * and multilingual mapping (English, Hindi, Bengali, Hinglish) for Musicly Voice AI.
 */

// Number words to digits map
const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  // Hindi numbers
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  panch: 5,
  das: 10,
  pandrah: 15,
  bees: 20,
  tees: 30,
  pachaas: 50,
  pachas: 50,
  // Bengali numbers
  ek: 1,
  dui: 2,
  tin: 3,
  dash: 10,
  ponero: 15,
  kuri: 20,
  ponchas: 50,
};

// Common artist and music aliases to prevent STT mistranscriptions
const COMMON_ALIASES = [
  [/\bcold\s*play\b/gi, 'coldplay'],
  [/\bkaa?v?ish\b/gi, 'kaavish'],
  [/\bfaasle\b/gi, 'faasle'],
  [/\bfaasley\b/gi, 'faasle'],
  [/\bmusic\s*ly\b/gi, 'musicly'],
  [/\bmusically\b/gi, 'musicly'],
  [/\bafter\s*glow\b/gi, 'afterglow'],
  [/\blo\s*fi\b/gi, 'lo-fi'],
  [/\byou\s*tube\b/gi, 'youtube'],
];

/**
 * Standardize text: lower, strip punctuation, collapse whitespace
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"'+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Apply common artist & brand aliases
  for (const [pattern, replacement] of COMMON_ALIASES) {
    str = str.replace(pattern, replacement);
  }

  return str;
}

/**
 * Convert spoken number words to numerals (e.g. "volume fifty" -> "volume 50")
 */
export function normalizeNumbers(text) {
  if (!text) return '';
  const words = text.split(' ');
  const result = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (NUMBER_WORDS[word] !== undefined) {
      // Check if next word is also a number (e.g., "twenty five" -> 25)
      const nextWord = words[i + 1]?.toLowerCase();
      if (nextWord && NUMBER_WORDS[nextWord] !== undefined && NUMBER_WORDS[word] >= 20 && NUMBER_WORDS[nextWord] < 10) {
        result.push(String(NUMBER_WORDS[word] + NUMBER_WORDS[nextWord]));
        i++; // skip next word
      } else {
        result.push(String(NUMBER_WORDS[word]));
      }
    } else {
      result.push(words[i]);
    }
  }

  return result.join(' ');
}

/**
 * Levenshtein distance similarity calculation (0.0 to 1.0)
 */
export function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) {
    const lenRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.85, lenRatio);
  }

  const track = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const dist = track[b.length][a.length];
  return 1 - dist / Math.max(a.length, b.length);
}

/**
 * Normalizes Hindi and Bengali phrasing into canonical command intents
 */
export function mapMultilingualPhrase(text) {
  const norm = normalizeText(text);

  // --- Hindi / Hinglish ---
  // Play
  if (/\b(?:gaana|gana|song)\s+(?:chalao|bajao|shuru\s+karo|chalu\s+karo)\b/i.test(norm) ||
      /\b(?:chalao|baja\s+do|shuru\s+karo|chalu\s+karo)\b/i.test(norm)) {
    return { translated: 'play', original: text };
  }
  // Pause
  if (/\b(?:rok\s+do|ruko|band\s+karo|gana\s+roko|gaana\s+roko)\b/i.test(norm)) {
    return { translated: 'pause', original: text };
  }
  // Next
  if (/\b(?:agla\s+gaana|agla\s+song|aage\s+badhao|next\s+gaana|next\s+song)\b/i.test(norm)) {
    return { translated: 'next track', original: text };
  }
  // Previous
  if (/\b(?:pichhla\s+gaana|pichla\s+gaana|pichhla\s+song|peeche\s+karo)\b/i.test(norm)) {
    return { translated: 'previous track', original: text };
  }
  // Volume up
  if (/\b(?:awaz|awaaz|volume)\s+(?:badhao|badha\s+do|tez\s+karo|zyada\s+karo)\b/i.test(norm)) {
    return { translated: 'volume up', original: text };
  }
  // Volume down
  if (/\b(?:awaz|awaaz|volume)\s+(?:kam\s+karo|kamti\s+karo|dheere\s+karo|ghatao)\b/i.test(norm)) {
    return { translated: 'volume down', original: text };
  }
  // Mute
  if (/\b(?:awaz|awaaz)\s+(?:band\s+karo|band|mute\s+karo)\b/i.test(norm)) {
    return { translated: 'mute', original: text };
  }

  // --- Bengali ---
  // Play
  if (/\b(?:gaan\s+chalao|gaan\s+bajao|shuru\s+koro|chalu\s+koro)\b/i.test(norm)) {
    return { translated: 'play', original: text };
  }
  // Pause
  if (/\b(?:thamo|thamao|gaan\s+thamao|bondho\s+koro)\b/i.test(norm)) {
    return { translated: 'pause', original: text };
  }
  // Next
  if (/\b(?:porer\s+gaan|porer\s+ta|porerta|next\s+gaan)\b/i.test(norm)) {
    return { translated: 'next track', original: text };
  }
  // Previous
  if (/\b(?:aager\s+gaan|aager\s+ta|agerta)\b/i.test(norm)) {
    return { translated: 'previous track', original: text };
  }
  // Volume up
  if (/\b(?:sound|awaj|awaz|volume)\s+(?:barao|bariye\s+dao)\b/i.test(norm)) {
    return { translated: 'volume up', original: text };
  }
  // Volume down
  if (/\b(?:sound|awaj|awaz|volume)\s+(?:komao|komiye\s+dao)\b/i.test(norm)) {
    return { translated: 'volume down', original: text };
  }
  // Mute
  if (/\b(?:sound|awaj|awaz)\s+(?:bondho\s+koro|mute\s+koro)\b/i.test(norm)) {
    return { translated: 'mute', original: text };
  }

  return { translated: norm, original: text };
}
