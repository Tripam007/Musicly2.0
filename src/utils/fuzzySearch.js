/**
 * Ultra-Fast Phonetic & Fuzzy Sound-Alike Search Engine for Musicly
 * Supports:
 * - Single-letter matching (instant as-you-type)
 * - Phonetic sound-alike matching (e.g. 'jotsna' -> 'jyotsna', 'rate' -> 'raatey', 'arijeet' -> 'arijit')
 * - Vowel-omitted & typo tolerance (e.g. 'cldply' -> 'coldplay', 'ksriya' -> 'kesariya')
 * - Fuzzy Levenshtein edit-distance matching
 * - Multi-token relevance scoring & ranking
 */

/**
 * Phonetic normalization: converts a phrase into a sound-alike key.
 * Normalizes South Asian, Western, and phonetic Romanizations.
 */
export function phoneticSoundKey(str) {
  if (!str || typeof str !== 'string') return '';

  let s = str.toLowerCase().trim();

  // Strip non-alphanumeric (keep spaces temporarily)
  s = s.replace(/[^a-z0-9\s]/g, ' ');

  // 1. Common digraphs & sound-alike consonants
  s = s.replace(/ph/g, 'f');
  s = s.replace(/gh/g, 'g');
  s = s.replace(/kh/g, 'k');
  s = s.replace(/dh/g, 'd');
  s = s.replace(/bh/g, 'b');
  s = s.replace(/th/g, 't');
  s = s.replace(/jh/g, 'j');
  s = s.replace(/sh/g, 's');
  s = s.replace(/ch/g, 'c');
  s = s.replace(/sch/g, 's');
  s = s.replace(/ck/g, 'k');
  s = s.replace(/wh/g, 'w');

  // 2. Letter substitutions for identical sounds
  s = s.replace(/w/g, 'v');
  s = s.replace(/z/g, 'j');
  s = s.replace(/q/g, 'k');
  s = s.replace(/x/g, 'ks');

  // 'c' followed by e/i sounds like 's', otherwise 'k'
  s = s.replace(/c(?=[ei])/g, 's');
  s = s.replace(/c/g, 'k');

  // 3. Drop glide 'y' when right after consonant (e.g. 'jy' -> 'j', 'ty' -> 't', 'dy' -> 'd')
  s = s.replace(/([bcdfghjklmnpqrstvwxz])y/g, '$1');

  // 4. Vowel sound normalization
  s = s.replace(/ee|ea|ey/g, 'i');
  s = s.replace(/oo|ou/g, 'u');
  s = s.replace(/ai|ay|ei/g, 'e');
  s = s.replace(/au|aw/g, 'o');
  s = s.replace(/aa/g, 'a');

  // Normalize single vowels to unified sound
  s = s.replace(/y/g, 'i');

  // 5. Collapse duplicate letters (e.g. 'tt' -> 't', 'll' -> 'l', 'aa' -> 'a')
  s = s.replace(/(.)\1+/g, '$1');

  // Clean extra spaces
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Consonant skeleton for vowel-omitted searches (e.g. 'cldply' -> 'cldpl')
 */
export function consonantSkeleton(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^bcdfghjklmnpqrstvwxyz]/g, '').replace(/(.)\1+/g, '$1');
}

/**
 * Fast Levenshtein distance with max threshold cap for high performance
 */
export function levenshteinDistance(s1, s2, maxThreshold = 3) {
  if (s1 === s2) return 0;
  const l1 = s1.length;
  const l2 = s2.length;
  if (Math.abs(l1 - l2) > maxThreshold) return maxThreshold + 1;
  if (l1 === 0) return l2;
  if (l2 === 0) return l1;

  let prev = [];
  let curr = [];
  for (let j = 0; j <= l2; j++) prev[j] = j;

  for (let i = 1; i <= l1; i++) {
    curr[0] = i;
    let minVal = curr[0];
    const c1 = s1.charCodeAt(i - 1);

    for (let j = 1; j <= l2; j++) {
      const c2 = s2.charCodeAt(j - 1);
      const cost = c1 === c2 ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < minVal) minVal = curr[j];
    }

    if (minVal > maxThreshold) return maxThreshold + 1;
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[l2];
}

/**
 * Score how well a target text matches the user's search query.
 * Returns score > 0 if matched, 0 if no match.
 */
export function scoreSearchMatch(query, targetText) {
  if (!query || !targetText) return 0;

  const q = query.toLowerCase().trim();
  const t = targetText.toLowerCase().trim();

  if (!q) return 1;
  if (t === q) return 10000;

  let totalScore = 0;

  // 1. Direct Prefix & Substring Matching
  if (t.startsWith(q)) totalScore += 6000;
  else if (t.includes(q)) totalScore += 3000;

  const targetWords = t.split(/[\s\-_,.:;()\\[\]/]+/).filter(Boolean);

  // 2. Single-letter / Short Prefix As-You-Type Matching
  if (q.length === 1) {
    if (t.startsWith(q)) return 5000;
    const startsWord = targetWords.some(w => w.startsWith(q));
    if (startsWord) return 3000;
    if (t.includes(q)) return 800;
    return 0;
  }

  // Check if any word starts with query
  const wordPrefixMatch = targetWords.some(w => w.startsWith(q));
  if (wordPrefixMatch) totalScore += 3500;

  // 3. Multi-token Query Matching
  const queryTokens = q.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    let tokensMatched = 0;
    for (const tok of queryTokens) {
      if (t.includes(tok) || targetWords.some(w => w.startsWith(tok))) {
        tokensMatched++;
      }
    }
    if (tokensMatched === queryTokens.length) {
      totalScore += 4000;
    } else if (tokensMatched > 0) {
      totalScore += tokensMatched * 800;
    }
  }

  // 4. Phonetic Sound-Alike Matching (Soundex / Sounds Closer)
  const qPhonetic = phoneticSoundKey(q);
  const tPhonetic = phoneticSoundKey(t);

  if (qPhonetic && tPhonetic) {
    if (tPhonetic === qPhonetic) {
      totalScore += 4500;
    } else if (tPhonetic.startsWith(qPhonetic)) {
      totalScore += 3500;
    } else if (tPhonetic.includes(qPhonetic)) {
      totalScore += 2500;
    } else {
      // Check individual words in phonetic form
      const tPhoneticWords = tPhonetic.split(' ').filter(Boolean);
      const qPhoneticWords = qPhonetic.split(' ').filter(Boolean);

      let pMatches = 0;
      for (const qw of qPhoneticWords) {
        if (tPhoneticWords.some(tw => tw.startsWith(qw) || tw === qw)) {
          pMatches++;
        }
      }
      if (pMatches > 0) {
        totalScore += pMatches * 1500;
      }
    }
  }

  // 5. Consonant Skeleton (Vowel-omitted / Shorthand e.g. 'cldply')
  if (q.length >= 3) {
    const qSkel = consonantSkeleton(q);
    const tSkel = consonantSkeleton(t);
    if (qSkel && tSkel) {
      if (tSkel === qSkel) totalScore += 3000;
      else if (tSkel.includes(qSkel)) totalScore += 1800;
    }
  }

  // 6. Fuzzy Distance / Typo Tolerance (Levenshtein)
  if (q.length >= 3 && totalScore === 0) {
    const maxAllowedDist = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;

    // Check against individual words
    for (const w of targetWords) {
      if (Math.abs(w.length - q.length) <= maxAllowedDist) {
        const dist = levenshteinDistance(q, w, maxAllowedDist);
        if (dist <= maxAllowedDist) {
          totalScore += Math.max(500, 2000 - dist * 500);
          break;
        }
      }
    }

    // Also check against phonetic words if needed
    if (totalScore === 0 && qPhonetic.length >= 3) {
      const tPhoneticWords = tPhonetic.split(' ').filter(Boolean);
      for (const pw of tPhoneticWords) {
        if (Math.abs(pw.length - qPhonetic.length) <= maxAllowedDist) {
          const dist = levenshteinDistance(qPhonetic, pw, maxAllowedDist);
          if (dist <= maxAllowedDist) {
            totalScore += Math.max(400, 1500 - dist * 400);
            break;
          }
        }
      }
    }
  }

  return totalScore;
}

/**
 * Search and rank a list of track objects.
 * Matches across title, artist, genre, genres, rawTitle, channelName, and language.
 */
export function filterAndRankTracks(tracks, searchQuery) {
  if (!tracks || !Array.isArray(tracks)) return [];
  const cleanQ = (searchQuery || '').trim();
  if (!cleanQ) return tracks;

  const scoredList = [];

  for (const track of tracks) {
    if (!track) continue;

    const title = track.title || track.name || '';
    const artist = track.artist || '';
    const genre = track.genre || '';
    const genres = Array.isArray(track.genres) ? track.genres.join(' ') : '';
    const extra = `${track.rawTitle || ''} ${track.channelName || ''} ${track.language || ''}`;

    // Score components with weighted importance
    const titleScore = scoreSearchMatch(cleanQ, title) * 1.5;
    const artistScore = scoreSearchMatch(cleanQ, artist) * 1.2;
    const genreScore = scoreSearchMatch(cleanQ, `${genre} ${genres}`) * 0.8;
    const extraScore = scoreSearchMatch(cleanQ, extra) * 0.6;

    const combinedScore = Math.max(titleScore, artistScore, genreScore, extraScore) +
      (titleScore > 0 && artistScore > 0 ? 1000 : 0);

    if (combinedScore > 0) {
      scoredList.push({ track, score: combinedScore });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.map(s => s.track);
}
