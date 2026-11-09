/**
 * YouTube Live Stream AI Agent Engine for Musicly
 * Fetches real-time YouTube music streams, recommended live audio channels,
 * and enables audio-only playback and 1-click importing to Musicly Public Library.
 */

import { parseYouTubeTitle } from './trackParser.js';
import { extractYouTubeId } from './youtubePlayer.js';
import { detectSongLanguage, detectSongSections } from './languageDetector.js';

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

/**
 * Real-time AI YouTube Live Stream & Audio Recommendations Fetcher
 */
export async function fetchLiveStreamRecommendations(query = '') {
  const cleanQ = (query || '').trim();

  // If a direct YouTube link is provided, parse the ID directly
  const directYtId = extractYouTubeId(cleanQ);
  if (directYtId) {
    const { genre, genres, language } = inferTrackMetadata(cleanQ, 'YouTube Artist', cleanQ);
    return [
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
  }

  // If query is empty, return top curated live stream presets
  if (!cleanQ) {
    return LIVE_STREAM_PRESETS;
  }

  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(cleanQ)}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map(item => {
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
  } catch (err) {
    console.warn("AI Live Stream API notice, applying smart fallback recommendations:", err);
  }

  // Filter presets or build query-based recommendations as seamless fallback
  const qLow = cleanQ.toLowerCase();
  const scoredPresets = LIVE_STREAM_PRESETS.map(p => {
    let score = 0;
    const t = p.title.toLowerCase();
    const a = p.artist.toLowerCase();
    if (a.startsWith(qLow)) score += 2000;
    if (t.startsWith(qLow)) score += 1800;
    if (a.includes(qLow)) score += 800;
    if (t.includes(qLow)) score += 600;
    if (p.genre.toLowerCase().includes(qLow)) score += 500;
    return {
      ...p,
      score,
      isTopMatch: score >= 1200
    };
  });

  const matchingPresets = scoredPresets.filter(p => p.score > 0);
  matchingPresets.sort((a, b) => b.score - a.score);

  return matchingPresets.length > 0 ? matchingPresets : LIVE_STREAM_PRESETS;
}
