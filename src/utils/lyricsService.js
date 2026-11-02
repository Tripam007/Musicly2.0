/**
 * Intelligent Lyrics Service for Musicly
 * Fetches time-synced LRC & plain lyrics from LRCLIB with candidate scoring,
 * duration proximity matching, and offset calibration.
 */

export function parseLRC(lrcString) {
  if (!lrcString) return [];
  const rawLines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  let offsetMs = 0;

  // Detect [offset:+/-ms] tag
  for (const line of rawLines) {
    const trimmed = line.trim();
    const offsetMatch = trimmed.match(/^\[offset:\s*([+-]?\d+)\s*\]/i);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1], 10) || 0;
      break;
    }
  }
  const offsetSec = offsetMs / 1000;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      }
      const rawTime = min * 60 + sec + ms / 1000;
      // Apply offset calibration
      const time = Math.max(0, rawTime + offsetSec);
      result.push({ time, text: text || '♪' });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

function scoreCandidate(candidate, cleanTitle, cleanArtist, targetDuration) {
  let score = 0;
  const candTitle = (candidate.trackName || candidate.name || '').toLowerCase();
  const candArtist = (candidate.artistName || '').toLowerCase();
  const tTitle = cleanTitle.toLowerCase();
  const tArtist = cleanArtist.toLowerCase();

  // Synced lyrics prioritized
  if (candidate.syncedLyrics) score += 60;
  else if (candidate.plainLyrics) score += 10;

  // Title match
  if (candTitle === tTitle) score += 40;
  else if (candTitle.includes(tTitle) || tTitle.includes(candTitle)) score += 25;

  // Artist match
  if (candArtist === tArtist) score += 35;
  else if (candArtist.includes(tArtist) || tArtist.includes(candArtist)) score += 18;

  // Duration proximity matching to select exact audio master version
  if (targetDuration > 0 && candidate.duration > 0) {
    const diff = Math.abs(candidate.duration - targetDuration);
    if (diff <= 2) score += 50;
    else if (diff <= 5) score += 30;
    else if (diff <= 12) score += 10;
    else if (diff > 30) score -= 40; // Penalize wrong radio edit or extended cut
  }

  return score;
}

const memoryCache = new Map();

export async function fetchLyrics(track, targetDuration = 0) {
  if (!track || !track.title) return null;

  const cleanTitle = (track.title || '')
    .replace(/\s*[\(\[]\s*(official\s*)?(audio|music\s*video|video|lyrics?|hd|hq|4k|remaster(ed)?|visualizer|album\s*version|radio\s*edit|live|raw|acoustic|unplugged|remix)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(raw|acoustic|unplugged|extended|slowed\s*\+?\s*reverb|slowed|reverb)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*feat\.?.*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*ft\.?.*[\)\]]/gi, '')
    .replace(/\|.*$/g, '')
    .trim();

  const cleanArtist = (track.artist || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*(feat\.?|ft\.?).*$/i, '')
    .trim();

  const effectiveDuration = (targetDuration && targetDuration > 0) 
    ? targetDuration 
    : (track.duration && track.duration > 0 ? track.duration : 0);

  const cacheKey = `${track.id || cleanTitle}__${cleanArtist}__${Math.round(effectiveDuration)}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  let data = null;

  // 1. Try exact match via api/get
  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist
    });
    if (effectiveDuration > 0) {
      params.append('duration', Math.round(effectiveDuration));
    }
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json && (json.syncedLyrics || json.plainLyrics)) {
        data = json;
      }
    }
  } catch (err) {
    console.warn('[Lyrics] Direct fetch error:', err.message);
  }

  // 1b. Try api/get without duration parameter if duration-restricted call had no result
  if (!data) {
    try {
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist
      });
      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && (json.syncedLyrics || json.plainLyrics)) {
          data = json;
        }
      }
    } catch {}
  }

  // 2. Fallback to ranked search queries with scoring
  if (!data || !data.syncedLyrics) {
    try {
      const queries = [
        `${cleanArtist} ${cleanTitle}`.trim(),
        cleanTitle
      ];

      for (const q of queries) {
        if (!q) continue;
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            // Rank candidates by score
            const scored = list
              .map(c => ({ item: c, score: scoreCandidate(c, cleanTitle, cleanArtist, effectiveDuration) }))
              .sort((a, b) => b.score - a.score);

            if (scored[0] && scored[0].score > 30) {
              data = scored[0].item;
              if (data.syncedLyrics) break; // found high quality synced match
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Lyrics] Search fallback error:', err.message);
    }
  }

  let result = null;
  if (data && (data.syncedLyrics || data.plainLyrics || data.instrumental)) {
    const hasSynced = !!data.syncedLyrics;
    const parsedLines = hasSynced ? parseLRC(data.syncedLyrics) : [];
    const plainLines = data.plainLyrics
      ? data.plainLyrics.split('\n').map(l => ({ text: l.trim() })).filter(l => l.text.length > 0)
      : [];

    result = {
      isSynced: hasSynced && parsedLines.length > 0,
      lines: hasSynced && parsedLines.length > 0 ? parsedLines : plainLines,
      instrumental: !!data.instrumental,
      title: data.trackName || track.title,
      artist: data.artistName || track.artist
    };
  } else {
    result = {
      notFound: true,
      title: track.title,
      artist: track.artist
    };
  }

  memoryCache.set(cacheKey, result);
  return result;
}
