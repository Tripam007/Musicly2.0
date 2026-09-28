import { extractYouTubeId } from './youtubePlayer';

/**
 * Normalizes a string by stripping common media tags (Official Video, Audio, Lyrics, etc.),
 * punctuation, and excessive whitespace.
 */
export function normalizeMediaString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/\s*[\(\[]\s*(official\s*)?(audio|video|music\s*video|hd|4k|hq|lyrics?|remaster(ed)?|cover|acoustic|visualizer)\s*[\)\]]/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Checks if a candidate track/URL already exists in an existing collection of tracks.
 * Matches on:
 * 1. Exact track ID
 * 2. YouTube ID (extracting from URLs if needed)
 * 3. Direct Audio URL
 * 4. Normalized Title + Artist combination
 * 
 * Returns the matched existing track, or null if unique.
 */
export function findDuplicateTrack(candidate, existingTracks = []) {
  if (!candidate || !Array.isArray(existingTracks) || existingTracks.length === 0) {
    return null;
  }

  // Extract candidate identifiers
  const candidateUrl = (candidate.audioUrl || candidate.url || '').trim();
  const candidateYtId = candidate.youtubeId || extractYouTubeId(candidateUrl);
  const cleanCandTitle = normalizeMediaString(candidate.title);
  const cleanCandArtist = normalizeMediaString(candidate.artist);

  for (const t of existingTracks) {
    if (!t) continue;

    // 1. Exact ID match (unless custom track comparing against itself)
    if (candidate.id && t.id === candidate.id) {
      return t;
    }

    // 2. YouTube ID match
    const tYtId = t.youtubeId || extractYouTubeId(t.audioUrl);
    if (candidateYtId && tYtId && candidateYtId.toLowerCase() === tYtId.toLowerCase()) {
      return t;
    }

    // 3. Audio URL match (ignore ephemeral in-memory blob URLs)
    const tUrl = (t.audioUrl || '').trim();
    if (
      candidateUrl &&
      tUrl &&
      !candidateUrl.startsWith('blob:') &&
      !tUrl.startsWith('blob:') &&
      !candidateUrl.startsWith('data:') &&
      !tUrl.startsWith('data:')
    ) {
      if (candidateUrl.toLowerCase() === tUrl.toLowerCase()) {
        return t;
      }
    }

    // 4. Normalized Title & Artist match
    const tTitle = normalizeMediaString(t.title);
    const tArtist = normalizeMediaString(t.artist);

    if (cleanCandTitle && tTitle) {
      // Both title and artist match
      if (cleanCandTitle === tTitle && cleanCandArtist && tArtist) {
        if (cleanCandArtist === tArtist || cleanCandArtist.includes(tArtist) || tArtist.includes(cleanCandArtist)) {
          return t;
        }
      }

      // Title exact match with substantial length (>= 5 chars)
      if (cleanCandTitle.length >= 5 && cleanCandTitle === tTitle) {
        // If neither has an artist or one artist is unknown / generic
        const isCandGeneric = !cleanCandArtist || cleanCandArtist.includes('unknown') || cleanCandArtist.includes('youtube');
        const isTGeneric = !tArtist || tArtist.includes('unknown') || tArtist.includes('youtube');
        if (isCandGeneric || isTGeneric || cleanCandArtist === tArtist) {
          return t;
        }
      }
    }
  }

  return null;
}

/**
 * Deduplicates a list of tracks so that no identical song appears twice.
 * Prioritizes earlier items in the array (e.g. custom user tracks > public library > catalog).
 */
export function deduplicateTracks(trackList = []) {
  if (!Array.isArray(trackList) || trackList.length === 0) return [];

  const seenIds = new Set();
  const seenYtIds = new Set();
  const seenUrls = new Set();
  const seenTitleArtist = new Set();

  return trackList.filter(track => {
    if (!track) return false;

    // 1. Check ID
    if (track.id) {
      if (seenIds.has(track.id)) return false;
    }

    // 2. Check YouTube ID
    const ytId = track.youtubeId || extractYouTubeId(track.audioUrl);
    if (ytId) {
      const lowerYt = ytId.toLowerCase();
      if (seenYtIds.has(lowerYt)) return false;
    }

    // 3. Check Audio URL (non-blob)
    const audioUrl = (track.audioUrl || '').trim().toLowerCase();
    if (audioUrl && !audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:')) {
      if (seenUrls.has(audioUrl)) return false;
    }

    // 4. Check Title + Artist
    const cleanTitle = normalizeMediaString(track.title);
    const cleanArtist = normalizeMediaString(track.artist);
    if (cleanTitle) {
      const titleKey = cleanArtist ? `${cleanTitle}::${cleanArtist}` : cleanTitle;
      if (seenTitleArtist.has(titleKey)) return false;

      // Also check title alone if unique enough (>= 7 chars)
      if (cleanTitle.length >= 7 && seenTitleArtist.has(cleanTitle)) return false;
    }

    // Register identifiers as seen
    if (track.id) seenIds.add(track.id);
    if (ytId) seenYtIds.add(ytId.toLowerCase());
    if (audioUrl && !audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:')) {
      seenUrls.add(audioUrl);
    }
    if (cleanTitle) {
      const titleKey = cleanArtist ? `${cleanTitle}::${cleanArtist}` : cleanTitle;
      seenTitleArtist.add(titleKey);
      if (cleanTitle.length >= 7) {
        seenTitleArtist.add(cleanTitle);
      }
    }

    return true;
  });
}
