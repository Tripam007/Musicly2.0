/**
 * Intelligent Media & Metadata Parser for Musicly
 * Cleans titles, extracts artist names, and fetches YouTube oEmbed metadata.
 */

import { HINDI_ARTISTS, ENGLISH_ARTISTS, BENGALI_ARTISTS } from './languageDetector.js';

const KNOWN_ARTISTS_SET = new Set([
  ...HINDI_ARTISTS,
  ...ENGLISH_ARTISTS,
  ...BENGALI_ARTISTS
]);

export function disambiguateTitleAndArtist(part1, part2, channelName = '') {
  const p1 = (part1 || '').trim();
  const p2 = (part2 || '').trim();
  const p1Low = p1.toLowerCase();
  const p2Low = p2.toLowerCase();
  const chanClean = (channelName || '').toLowerCase().replace(/vevo|official|channel|records|music|media|- topic/g, '').trim();

  // 1. Explicit collaboration tags
  if (/\b(feat\.?|ft\.?|featuring|prod\.?|with)\b/i.test(p2) && !/\b(feat\.?|ft\.?|featuring)\b/i.test(p1)) {
    return { artist: p2, title: p1 };
  }
  if (/\b(feat\.?|ft\.?|featuring|prod\.?|with)\b/i.test(p1) && !/\b(feat\.?|ft\.?|featuring)\b/i.test(p2)) {
    return { artist: p1, title: p2 };
  }

  // 2. Channel match
  if (chanClean) {
    const chanMatch1 = chanClean.includes(p1Low) || p1Low.includes(chanClean);
    const chanMatch2 = chanClean.includes(p2Low) || p2Low.includes(chanClean);
    if (chanMatch2 && !chanMatch1) {
      return { artist: p2, title: p1 };
    }
    if (chanMatch1 && !chanMatch2) {
      return { artist: p1, title: p2 };
    }
  }

  // 3. Known artist match
  const isP1Artist = KNOWN_ARTISTS_SET.has(p1Low) || Array.from(KNOWN_ARTISTS_SET).some(a => a.length > 3 && p1Low === a);
  const isP2Artist = KNOWN_ARTISTS_SET.has(p2Low) || Array.from(KNOWN_ARTISTS_SET).some(a => a.length > 3 && p2Low === a);

  if (isP2Artist && !isP1Artist) {
    return { artist: p2, title: p1 };
  }
  if (isP1Artist && !isP2Artist) {
    return { artist: p1, title: p2 };
  }

  return { artist: p1, title: p2 };
}

export function parseAudioFilename(filename) {
  if (!filename) return { title: '', artist: 'Musicly Artist' };

  let clean = filename.replace(/\.(mp3|wav|ogg|flac|m4a|aac)$/i, '').trim();

  clean = clean
    .replace(/\s*[\(\[]\s*(official\s*)?(audio|music\s*video|video|lyrics?|hd|hq|4k|remaster(ed)?|visualizer|album\s*version|radio\s*edit|raw|acoustic|unplugged)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(raw|acoustic|unplugged|extended|slowed\s*\+?\s*reverb|slowed|reverb)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*\d+\s*(kbps|hz)\s*[\)\]]/gi, '')
    .trim();

  let detectedArtist = '';
  let detectedTitle = clean;

  const separatorMatch = clean.match(/^(.+?)\s*(?:[-–—:~]|(?:\s+by\s+))\s*(.+)$/i);

  if (separatorMatch) {
    const disambiguated = disambiguateTitleAndArtist(separatorMatch[1], separatorMatch[2]);
    detectedArtist = disambiguated.artist;
    detectedTitle = disambiguated.title;
  }

  return {
    title: detectedTitle || clean,
    artist: detectedArtist || 'Musicly Artist'
  };
}

export function parseYouTubeTitle(rawTitle, channelName) {
  if (!rawTitle) return { title: '', artist: channelName || 'YouTube Artist' };

  // Clean common YouTube suffixes
  let clean = rawTitle
    .replace(/\s*[\(\[]\s*(official\s*)?(music\s*video|video|audio|lyrics?|visualizer|hd|hq|4k|remaster(ed)?|album\s*version|radio\s*edit|live|raw|acoustic|unplugged)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*(raw|acoustic|unplugged|extended|slowed\s*\+?\s*reverb|slowed|reverb)\s*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*feat\.?.*[\)\]]/gi, '')
    .replace(/\s*[\(\[]\s*ft\.?.*[\)\]]/gi, '')
    .replace(/\|.*$/g, '')
    .trim();

  // Check for "Artist - Title" or "Artist : Title" or "Artist – Title"
  const sepMatch = clean.match(/^(.+?)\s*(?:[-–—:~]|(?:\s+by\s+))\s*(.+)$/i);

  if (sepMatch) {
    const disambiguated = disambiguateTitleAndArtist(sepMatch[1], sepMatch[2], channelName);
    return {
      artist: disambiguated.artist,
      title: disambiguated.title
    };
  }

  return {
    title: clean || rawTitle,
    artist: channelName ? channelName.replace(/\s*-\s*Topic$/i, '').trim() : 'YouTube Artist'
  };
}

export async function fetchYouTubeMetadata(ytId) {
  if (!ytId) return null;

  let data = null;
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
    if (res.ok) data = await res.json();
  } catch (e) {}

  if (!data || !data.title) {
    try {
      const res2 = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
      if (res2.ok) data = await res2.json();
    } catch (e) {}
  }

  if (data && data.title) {
    const { title: autoTitle, artist: autoArtist } = parseYouTubeTitle(data.title, data.author_name);
    return {
      title: autoTitle || data.title,
      artist: autoArtist || data.author_name || 'YouTube Artist',
      rawTitle: data.title,
      channelName: data.author_name || ''
    };
  }

  return null;
}
