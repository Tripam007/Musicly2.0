/**
 * Intelligent Media & Metadata Parser for Musicly
 * Cleans titles, extracts artist names, and fetches YouTube oEmbed metadata.
 */

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
    detectedArtist = separatorMatch[1].trim();
    detectedTitle = separatorMatch[2].trim();
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
    return {
      artist: sepMatch[1].trim(),
      title: sepMatch[2].trim()
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
