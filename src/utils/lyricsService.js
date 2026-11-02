export function parseLRC(lrcString) {
  if (!lrcString) return [];
  const rawLines = lrcString.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[(ti|ar|al|by|offset|length):/i.test(trimmed)) continue;

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
      const time = min * 60 + sec + ms / 1000;
      result.push({ time, text: text || '♪' });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

const memoryCache = new Map();

export async function fetchLyrics(track) {
  if (!track || !track.title) return null;
  const cacheKey = track.id || `${track.title}__${track.artist}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

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

  let data = null;

  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist
    });
    if (track.duration && track.duration > 0) {
      params.append('duration', Math.round(track.duration));
    }
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (res.ok) {
      data = await res.json();
    }
  } catch (err) {
    console.warn('[Lyrics] Direct fetch error:', err.message);
  }

  if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
    try {
      const q = `${cleanArtist} ${cleanTitle}`.trim();
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          data = list.find(item => item.syncedLyrics) || list.find(item => item.plainLyrics) || list[0];
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
