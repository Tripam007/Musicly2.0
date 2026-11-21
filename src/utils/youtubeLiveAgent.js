/**
 * YouTube Live Stream AI Agent Engine for Musicly
 * Fetches real-time YouTube music streams, recommended live audio channels,
 * and enables audio-only playback and 1-click importing to Musicly Public Library.
 */

import { parseYouTubeTitle } from './trackParser.js';
import { extractYouTubeId } from './youtubePlayer.js';
import { detectSongLanguage, detectSongSections } from './languageDetector.js';
import { filterAndRankTracks } from './fuzzySearch.js';

// Curated high-fidelity 24/7 Live Stream fallbacks & presets
export const LIVE_STREAM_PRESETS = [
  {
    id: 'yt-jfKfPfyJRdk',
    youtubeId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 beats to relax/study to',
    artist: 'Lofi Girl',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Chill/Sleep'],
    language: 'English',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    isLive: true,
    isYouTube: true,
    tag: '24/7 Study'
  },
  {
    id: 'yt-7NOSDKb0HlU',
    youtubeId: '7NOSDKb0HlU',
    title: 'Chillhop Radio - Jazzy & Lofi Hip Hop Beats 🐾',
    artist: 'Chillhop Music',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie'],
    language: 'English',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/7NOSDKb0HlU/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=7NOSDKb0HlU',
    isLive: true,
    isYouTube: true,
    tag: 'Jazzy Cafe'
  },
  {
    id: 'yt-4xDzrJKXOOY',
    youtubeId: '4xDzrJKXOOY',
    title: 'synthwave radio 🌌 chill / retro beats',
    artist: 'Lofi Girl - Synthwave',
    genre: 'Retro',
    genres: ['Retro', 'Synthwave'],
    language: 'English',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    isLive: true,
    isYouTube: true,
    tag: 'Retro Neon'
  },
  {
    id: 'yt-WPni755-Krg',
    youtubeId: 'WPni755-Krg',
    title: 'Bollywood Lo-Fi Live 🌙 Midnight Hindi Chill Beats',
    artist: 'Bollywood Lo-Fi Station',
    genre: 'Lo-Fi',
    genres: ['Lo-Fi', 'Indie'],
    language: 'Hindi',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/WPni755-Krg/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=WPni755-Krg',
    isLive: true,
    isYouTube: true,
    tag: 'Hindi Lo-Fi'
  },
  {
    id: 'yt-DWcJFNfaw9c',
    youtubeId: 'DWcJFNfaw9c',
    title: 'Peaceful Piano & Soft Rain 🌧️ Deep Sleep & Relaxing Music',
    artist: 'Soothing Relaxation',
    genre: 'Chill/Sleep',
    genres: ['Chill/Sleep', 'Peace'],
    language: 'Instrumental',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
    isLive: true,
    isYouTube: true,
    tag: 'Sleep & Rain'
  },
  {
    id: 'yt-Dx5qF6HwsW8',
    youtubeId: 'Dx5qF6HwsW8',
    title: 'Coffee Shop Acoustic Radio ☕ Warm Guitar & Morning Vibes',
    artist: 'Cafe Music BGM',
    genre: 'Indie',
    genres: ['Indie', 'Lo-Fi'],
    language: 'English',
    duration: 240,
    durationText: 'LIVE',
    cover: 'https://img.youtube.com/vi/Dx5qF6HwsW8/hqdefault.jpg',
    audioUrl: 'https://www.youtube.com/watch?v=Dx5qF6HwsW8',
    isLive: true,
    isYouTube: true,
    tag: 'Coffee Shop'
  }
];

/**
 * Infer Genre and Language tags accurately from track title, artist, and rich YouTube metadata
 */
export function inferTrackMetadata(title = '', artist = '', extraContext = '') {
  const combinedContext = `${extraContext || ''} ${title || ''} ${artist || ''}`;
  const language = detectSongLanguage(title, artist, combinedContext);
  const detectedSections = detectSongSections(title, artist, 'All');

  let genres = (Array.isArray(detectedSections) && detectedSections.length > 0)
    ? detectedSections
    : (language === 'Hindi' || language === 'Bengali' ? ['Indie'] : ['Retro']);

  const cLow = combinedContext.toLowerCase();
  if (language === 'Hindi' && /ghazal/i.test(cLow) && !genres.includes('Ghazal')) {
    genres = ['Ghazal', ...genres.filter(g => g !== 'Ghazal')];
  } else if (language === 'Bengali' && /rabindra|tagore/i.test(cLow) && !genres.includes('Rabindra Sangeet')) {
    genres = ['Rabindra Sangeet', ...genres.filter(g => g !== 'Rabindra Sangeet')];
  } else if (language === 'English' && /country|nashville|bluegrass/i.test(cLow) && !genres.includes('Country')) {
    genres = ['Country', ...genres.filter(g => g !== 'Country')];
  }

  const genre = genres[0] || (language === 'Hindi' || language === 'Bengali' ? 'Indie' : 'Retro');
  return { genre, genres, language };
}

// In-memory instant keystroke query cache
const liveStreamCache = new Map();

/**
 * Real-time AI YouTube Live Stream & Audio Recommendations Fetcher
 * Optimized for instant as-you-type letter search with multi-tier fallbacks
 */
export async function fetchLiveStreamRecommendations(query = '', signal = null) {
  const cleanQ = (query || '').trim();

  // If query is empty, return top curated live stream presets
  if (!cleanQ) {
    return LIVE_STREAM_PRESETS;
  }

  const qKey = cleanQ.toLowerCase();

  // 1. Instant Cache Hit: 0ms response when typing/backspacing letters
  if (liveStreamCache.has(qKey)) {
    return liveStreamCache.get(qKey);
  }

  // If a direct YouTube link is provided, parse the ID directly
  const directYtId = extractYouTubeId(cleanQ);
  if (directYtId) {
    const { genre, genres, language } = inferTrackMetadata(cleanQ, 'YouTube Artist', cleanQ);
    const directResult = [
      {
        id: `yt-${directYtId}`,
        youtubeId: directYtId,
        title: 'YouTube Audio Stream',
        artist: 'YouTube Live',
        duration: 240,
        durationText: 'STREAM',
        cover: `https://img.youtube.com/vi/${directYtId}/hqdefault.jpg`,
        audioUrl: `https://www.youtube.com/watch?v=${directYtId}`,
        isLive: true,
        isYouTube: true,
        genre,
        genres,
        language
      }
    ];
    liveStreamCache.set(qKey, directResult);
    return directResult;
  }

  let finalResults = [];

  // 2. Primary: Fast local API endpoint (YouTube InnerTube JSON API)
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(cleanQ)}`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: signal || undefined
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        finalResults = data.results.map(item => {
          const extraContext = `${item.rawTitle || ''} ${item.channelName || ''} ${cleanQ}`.trim();
          const { genre, genres, language } = inferTrackMetadata(item.title, item.artist, extraContext);
          return {
            ...item,
            genre,
            genres,
            language
          };
        });
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    console.warn("Local YouTube search notice, checking direct fallbacks:", err?.message || err);
  }

  // 3. Secondary Fallback: Direct iTunes Audio Search on client if server endpoint was unreachable
  if (finalResults.length === 0) {
    try {
      const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=15`, {
        signal: signal || undefined
      });
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (Array.isArray(itunesData?.results) && itunesData.results.length > 0) {
          finalResults = itunesData.results.map(item => {
            const { genre, genres, language } = inferTrackMetadata(item.trackName, item.artistName, cleanQ);
            const durationSec = Math.round((item.trackTimeMillis || 180000) / 1000);
            return {
              id: `itunes-${item.trackId}`,
              youtubeId: null,
              title: item.trackName || 'Audio Track',
              artist: item.artistName || 'Artist',
              duration: durationSec,
              durationText: `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`,
              cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
              audioUrl: item.previewUrl || '',
              isLive: false,
              isYouTube: false,
              isAudioStream: true,
              genre,
              genres,
              language,
              score: 2500,
              isTopMatch: true
            };
          });
        }
      }
    } catch (itunesErr) {
      if (itunesErr?.name === 'AbortError') throw itunesErr;
    }
  }

  // 4. Tertiary Fallback: Check curated presets with phonetic and fuzzy ranking
  if (finalResults.length === 0) {
    const scored = filterAndRankTracks(LIVE_STREAM_PRESETS, cleanQ);
    finalResults = scored.map(p => ({
      ...p,
      isTopMatch: (p._searchScore || 0) >= 1200
    }));
  }

  // NEVER return unrelated presets when the user provided a search query!
  if (finalResults.length > 0) {
    liveStreamCache.set(qKey, finalResults);
  }
  return finalResults;
}
