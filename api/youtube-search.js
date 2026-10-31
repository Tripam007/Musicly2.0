// Vercel Serverless Function: /api/youtube-search
// High-performance YouTube Audio Stream & Search Recommendations Engine

export default async function handler(req, res) {
  // Enable CORS for all incoming requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawQuery = (req.query.q || req.query.query || '').trim();
  const qLower = rawQuery.toLowerCase();

  // If query is empty, default to live music radio
  if (!rawQuery) {
    return handleSearch('lofi hip hop radio live beats', rawQuery, res);
  }

  let targetSearch = rawQuery;

  // For partial letter queries or short queries (1 to 4 chars), expand using YouTube Suggest
  // to discover real artist, song, and music streams instead of non-music chatter
  if (rawQuery.length <= 4 && !/\b(song|songs|music|lofi|live|audio)\b/i.test(rawQuery)) {
    try {
      const suggestController = new AbortController();
      const suggestTimeout = setTimeout(() => suggestController.abort(), 1200);

      const sugRes = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(rawQuery)}`,
        { signal: suggestController.signal }
      );
      clearTimeout(suggestTimeout);

      if (sugRes.ok) {
        const sugData = await sugRes.json();
        const suggestions = Array.isArray(sugData?.[1]) ? sugData[1] : [];
        
        // Find top music-specific suggestion
        const musicSuggestion = suggestions.find(s => 
          /\b(song|songs|music|lofi|live|audio|track|remix|band|acoustic|singer)\b/i.test(s)
        );

        if (musicSuggestion) {
          targetSearch = musicSuggestion;
        } else if (suggestions.length > 0 && suggestions[0]) {
          targetSearch = `${suggestions[0]} song`;
        } else {
          targetSearch = `${rawQuery} songs`;
        }
      } else {
        targetSearch = `${rawQuery} songs`;
      }
    } catch {
      targetSearch = `${rawQuery} songs`;
    }
  }

  return handleSearch(targetSearch, rawQuery, res);
}

async function handleSearch(searchQuery, userRawQuery, res) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!ytRes.ok) {
      throw new Error(`YouTube responded with status ${ytRes.status}`);
    }

    const html = await ytRes.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) || html.match(/var ytInitialData\s*=\s*({.+?});/s);

    if (!match) {
      throw new Error('Unable to extract initial data from YouTube');
    }

    const data = JSON.parse(match[1]);
    const sectionList = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    const qClean = userRawQuery.toLowerCase().trim();
    // Safe regex for word boundary matching
    const safeEscaped = qClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = safeEscaped ? new RegExp(`\\b${safeEscaped}`, 'i') : null;

    for (const section of sectionList) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;

        const rawTitle = v.title?.runs?.[0]?.text || '';
        const channelName = v.ownerText?.runs?.[0]?.text || '';
        const isLive = !!v.badges?.some(b => 
          b.metadataBadgeRenderer?.style?.includes('BADGE_STYLE_TYPE_LIVE_NOW') || 
          b.metadataBadgeRenderer?.label === 'LIVE'
        );

        const durationText = v.lengthText?.simpleText || (isLive ? 'LIVE' : '3:45');
        
        let durationSec = 220;
        if (durationText && durationText.includes(':')) {
          const parts = durationText.split(':').map(Number);
          if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
          else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        // Clean common YouTube video suffixes for clean music display
        let cleanTitle = rawTitle
          .replace(/\s*[\(\[]\s*(official\s*)?(music\s*video|video|audio|lyrics?|visualizer|hd|hq|4k|remaster(ed)?|album\s*version|radio\s*edit|live|raw|acoustic|unplugged)\s*[\)\]]/gi, '')
          .replace(/\s*[\(\[]\s*(raw|acoustic|unplugged|extended|slowed\s*\+?\s*reverb|slowed|reverb)\s*[\)\]]/gi, '')
          .replace(/\s*[\(\[]\s*feat\.?.*[\)\]]/gi, '')
          .replace(/\s*[\(\[]\s*ft\.?.*[\)\]]/gi, '')
          .replace(/\|.*$/g, '')
          .trim();

        let cleanArtist = channelName.replace(/\s*-\s*Topic$/i, '').trim() || 'YouTube Artist';
        const sepMatch = cleanTitle.match(/^(.+?)\s*(?:[-–—:~]|(?:\s+by\s+))\s*(.+)$/i);
        if (sepMatch) {
          cleanArtist = sepMatch[1].trim();
          cleanTitle = sepMatch[2].trim();
        }

        const candidateTitle = cleanTitle || rawTitle;
        const titleLower = candidateTitle.toLowerCase();
        const artistLower = cleanArtist.toLowerCase();
        const rawTitleLower = rawTitle.toLowerCase();

        // Compute relevance and ranking score against user's search query
        let score = 0;

        if (qClean) {
          // Exact matches
          if (artistLower === qClean) score += 3000;
          if (titleLower === qClean) score += 2500;

          // Starts-with matches (top priority for partial letter search)
          if (artistLower.startsWith(qClean)) score += 2000;
          if (titleLower.startsWith(qClean)) score += 1800;

          // Word starting with search letters (e.g. 'col' -> 'Coldplay', 'J. Cole')
          if (wordRegex && wordRegex.test(artistLower)) score += 1500;
          if (wordRegex && wordRegex.test(titleLower)) score += 1200;

          // Contains substring
          if (artistLower.includes(qClean)) score += 800;
          if (titleLower.includes(qClean)) score += 600;
          if (rawTitleLower.includes(qClean)) score += 400;

          // Live stream bonus
          if (isLive) score += 150;

          // Official / Music Video bonus
          if (/official|vevo|audio|records|music/i.test(rawTitleLower)) score += 100;

          // Standard music track duration bonus (between 1.5 min and 7 min) or live
          if ((durationSec >= 90 && durationSec <= 450) || isLive) score += 80;

          // Penalize excessively long non-live videos (talk shows, movies, lectures)
          if (durationSec > 1800 && !isLive) score -= 400;

          // Penalize non-music noise
          if (!/\b(news|trailer|movie|reaction|interview|lecture|vlog)\b/i.test(qClean) &&
              /\b(news|trailer|full movie|reaction|interview|lecture|vlog|episode|podcast)\b/i.test(rawTitleLower)) {
            score -= 500;
          }
        } else {
          // Default sorting when query is empty: prefer live and official music
          if (isLive) score += 500;
          if (/lofi|chill|radio|relax/i.test(rawTitleLower)) score += 300;
        }

        const isTopMatch = qClean ? score >= 1200 : false;

        results.push({
          id: `yt-${v.videoId}`,
          youtubeId: v.videoId,
          title: candidateTitle,
          rawTitle,
          artist: cleanArtist,
          duration: durationSec,
          durationText,
          cover: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          audioUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
          isLive,
          isYouTube: true,
          score,
          isTopMatch
        });

        if (results.length >= 30) break;
      }
      if (results.length >= 30) break;
    }

    // Sort results descending by score: TOP MATCHED recommendations first, then more below
    results.sort((a, b) => b.score - a.score);

    res.status(200).json({
      query: searchQuery,
      rawQuery: userRawQuery,
      count: results.length,
      results
    });
  } catch (error) {
    console.warn('YouTube search error:', error.message);
    res.status(500).json({
      error: error.message,
      results: []
    });
  }
}
