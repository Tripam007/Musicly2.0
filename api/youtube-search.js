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

  const query = (req.query.q || req.query.query || '').trim();
  const searchQuery = query || 'lofi hip hop radio live beats';

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

        // Clean common YouTube suffixes
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

        results.push({
          id: `yt-${v.videoId}`,
          youtubeId: v.videoId,
          title: cleanTitle || rawTitle,
          rawTitle,
          artist: cleanArtist,
          duration: durationSec,
          durationText,
          cover: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          audioUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
          isLive,
          isYouTube: true
        });

        if (results.length >= 24) break;
      }
      if (results.length >= 24) break;
    }

    res.status(200).json({
      query: searchQuery,
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
