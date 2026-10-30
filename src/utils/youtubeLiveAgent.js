/**
 * YouTube Live Stream AI Agent Engine for Musicly
 * Fetches real-time YouTube music streams, recommended live audio channels,
 * and enables audio-only playback and 1-click importing to Musicly Public Library.
 */

import { parseYouTubeTitle } from './trackParser';
import { extractYouTubeId } from './youtubePlayer';

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
 * Infer Genre and Language tags from track title and artist
 */
export function inferTrackMetadata(title = '', artist = '') {
  const text = `${title} ${artist}`.toLowerCase();
  
  let genre = 'Lo-Fi';
  let genres = ['Lo-Fi'];
  let language = 'English';

  if (text.includes('sleep') || text.includes('relax') || text.includes('meditation') || text.includes('rain') || text.includes('deep sleep')) {
    genre = 'Chill/Sleep';
    genres = ['Chill/Sleep', 'Peace'];
  } else if (text.includes('synth') || text.includes('retro') || text.includes('80s') || text.includes('vaporwave') || text.includes('cyberpunk')) {
    genre = 'Retro';
    genres = ['Retro', 'Synthwave'];
  } else if (text.includes('piano') || text.includes('acoustic') || text.includes('instrumental') || text.includes('guitar')) {
    genre = 'Peace';
    genres = ['Peace', 'Indie'];
  } else if (text.includes('rock') || text.includes('live concert') || text.includes('band') || text.includes('coldplay')) {
    genre = 'Retro';
    genres = ['Retro', 'Indie'];
  } else if (text.includes('indie') || text.includes('folk')) {
    genre = 'Indie';
    genres = ['Indie', 'Lo-Fi'];
  }

  // Language inference
  if (text.includes('hindi') || text.includes('bollywood') || text.includes('arijit') || text.includes('shreya') || text.includes('ghazal')) {
    language = 'Hindi';
  } else if (text.includes('bengali') || text.includes('bangla') || text.includes('rabindra')) {
    language = 'Bengali';
  } else if (text.includes('instrumental') || text.includes('piano') || text.includes('ambient') || text.includes('bgm')) {
    language = 'Instrumental';
  }

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
    const { genre, genres, language } = inferTrackMetadata(cleanQ, 'YouTube Artist');
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
        const { genre, genres, language } = inferTrackMetadata(item.title, item.artist);
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
  const filteredPresets = LIVE_STREAM_PRESETS.filter(p => 
    p.title.toLowerCase().includes(cleanQ.toLowerCase()) || 
    p.artist.toLowerCase().includes(cleanQ.toLowerCase()) ||
    p.genre.toLowerCase().includes(cleanQ.toLowerCase())
  );

  return filteredPresets.length > 0 ? filteredPresets : LIVE_STREAM_PRESETS;
}
