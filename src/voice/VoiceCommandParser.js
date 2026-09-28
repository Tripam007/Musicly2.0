/**
 * VoiceCommandParser - Natural Language Intent & Slot Parser
 * 
 * Maps natural speech expressions into strictly validated, typed Musicly actions.
 * NO arbitrary code execution. NO eval(). 100% schema-enforced.
 */

import { MUSICLY_ACTIONS } from './voiceConfig.js';

// Helper to sanitize and normalize text
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein similarity for fuzzy matching
function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const track = Array(b.length + 1).fill(null).map(() =>
    Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const dist = track[b.length][a.length];
  return 1 - dist / Math.max(a.length, b.length);
}

export class VoiceCommandParser {
  /**
   * Instance method wrapper
   */
  parse(rawCommand, context = {}) {
    const result = VoiceCommandParser.parse(rawCommand, context);
    if (result && result.payload && !result.params) {
      result.params = result.payload;
    }
    return result;
  }

  /**
   * Parse speech transcript into a validated action
   * 
   * @param {string} rawCommand - Speech transcript stripped of wake word
   * @param {object} context - Current player state { allTracks, currentTrack, currentScene, isAdmin, favorites, isPlaying }
   * @returns {{ action: string, payload: any, confidence: number, requiresConfirmation: boolean, feedback: string, spokenText: string }}
   */
  static parse(rawCommand, context = {}) {
    const text = normalizeText(rawCommand);
    if (!text) {
      return {
        action: MUSICLY_ACTIONS.UNKNOWN,
        payload: null,
        confidence: 0,
        requiresConfirmation: false,
        feedback: "Sorry, I didn't hear a command.",
        spokenText: "Sorry, I didn't hear a command."
      };
    }

    // 1. CANCEL / DISMISS
    if (/^(cancel|never mind|stop listening|close|dismiss|exit)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CANCEL,
        payload: null,
        confidence: 0.99,
        requiresConfirmation: false,
        feedback: "Cancelled.",
        spokenText: "Cancelled."
      };
    }

    // 2. PLAYBACK CONTROLS
    // Play / Resume
    if (/^(play|resume|start music|start the music|start playing|continue|continue playing|play the current song)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PLAY,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Resuming playback.",
        spokenText: "Playing."
      };
    }

    // Pause / Stop
    if (/^(pause|stop|freeze|pause music|pause song|stop music|stop playback)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PAUSE,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Paused.",
        spokenText: "Paused."
      };
    }

    // Next Track
    if (/^(next|next song|next track|play next|play the next song|skip|skip this|skip track|skip this one|next one)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.NEXT_TRACK,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Next track →",
        spokenText: "Next track."
      };
    }

    // Previous Track
    if (/^(previous|prev|previous song|previous track|prev song|prev track|go back|last song|last track|play previous)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PREVIOUS_TRACK,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Previous track ←",
        spokenText: "Previous track."
      };
    }

    // Replay / Start Over
    if (/^(replay|replay this|replay this song|replay the song|start over|start from the beginning|play from beginning|restart song)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REPLAY,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Replaying track.",
        spokenText: "Replaying."
      };
    }

    // 3. SEEKING
    // Relative Seek Forward
    const seekForwardMatch = text.match(/(?:skip|fast forward|forward|jump)\s*(?:forward)?\s*(\d+)\s*(?:seconds|secs|s)?/i);
    if (seekForwardMatch) {
      const seconds = parseInt(seekForwardMatch[1], 10) || 15;
      return {
        action: MUSICLY_ACTIONS.SEEK,
        payload: { offsetSeconds: seconds, direction: 'forward' },
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: `Skipping forward ${seconds}s.`,
        spokenText: `Forward ${seconds} seconds.`
      };
    }

    // Relative Seek Backward
    const seekBackwardMatch = text.match(/(?:go back|rewind|backward|back)\s*(\d+)\s*(?:seconds|secs|s)?/i);
    if (seekBackwardMatch) {
      const seconds = parseInt(seekBackwardMatch[1], 10) || 15;
      return {
        action: MUSICLY_ACTIONS.SEEK,
        payload: { offsetSeconds: seconds, direction: 'backward' },
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: `Rewinding ${seconds}s.`,
        spokenText: `Rewound ${seconds} seconds.`
      };
    }

    // Absolute Seek (e.g. "jump to 2 minutes", "go to 1 minute 30 seconds")
    const absoluteSeekMatch = text.match(/(?:jump to|go to|seek to)\s*(?:(\d+)\s*minutes?)?\s*(?:(\d+)\s*seconds?)?/i);
    if (absoluteSeekMatch && (absoluteSeekMatch[1] || absoluteSeekMatch[2])) {
      const mins = parseInt(absoluteSeekMatch[1] || '0', 10);
      const secs = parseInt(absoluteSeekMatch[2] || '0', 10);
      const targetTime = mins * 60 + secs;
      return {
        action: MUSICLY_ACTIONS.SEEK,
        payload: { timestamp: targetTime },
        confidence: 0.92,
        requiresConfirmation: false,
        feedback: `Seeking to ${mins}:${secs < 10 ? '0' : ''}${secs}.`,
        spokenText: `Seeking to ${mins} minutes.`
      };
    }

    // 4. VOLUME
    // Volume Up
    if (/^(turn it up|turn the volume up|volume up|raise volume|louder|increase volume|boost volume)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.VOLUME_UP,
        payload: { delta: 0.1 },
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Volume up +10%",
        spokenText: "Volume up."
      };
    }

    // Volume Down
    if (/^(turn it down|turn the volume down|volume down|quieter|lower volume|decrease volume|softer)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.VOLUME_DOWN,
        payload: { delta: -0.1 },
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Volume down -10%",
        spokenText: "Volume down."
      };
    }

    // Set Exact Volume (e.g. "set volume to 50 percent", "volume 80%", "volume 30")
    const volumeMatch = text.match(/(?:set\s+)?volume\s*(?:to)?\s*(\d{1,3})\s*(?:percent|%)?/i);
    if (volumeMatch) {
      let percent = parseInt(volumeMatch[1], 10);
      if (percent > 100) percent = 100;
      if (percent < 0) percent = 0;
      return {
        action: MUSICLY_ACTIONS.SET_VOLUME,
        payload: { value: percent / 100 },
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: `Volume set to ${percent}%.`,
        spokenText: `Volume ${percent} percent.`
      };
    }

    // Mute
    if (/^(mute|silence|be quiet|mute music|shut up)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.MUTE,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Muted 🔇",
        spokenText: "Muted."
      };
    }

    // Unmute
    if (/^(unmute|un-mute|restore volume|unmute music)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.UNMUTE,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Unmuted 🔊",
        spokenText: "Unmuted."
      };
    }

    // 5. SHUFFLE & REPEAT
    if (/^(turn shuffle on|shuffle on|enable shuffle)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.SHUFFLE_ON,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Shuffle enabled 🔀",
        spokenText: "Shuffle on."
      };
    }

    if (/^(turn shuffle off|shuffle off|disable shuffle)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.SHUFFLE_OFF,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Shuffle disabled.",
        spokenText: "Shuffle off."
      };
    }

    if (/^shuffle$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_SHUFFLE,
        payload: null,
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: "Toggling shuffle.",
        spokenText: "Shuffle toggled."
      };
    }

    if (/^(repeat this|repeat this song|repeat song|loop this|loop this song|repeat one)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REPEAT_ONE,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Repeat one track 🔂",
        spokenText: "Repeating this song."
      };
    }

    if (/^(repeat all|loop all|turn repeat on|enable repeat)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REPEAT_ALL,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Repeat all tracks 🔁",
        spokenText: "Repeat all."
      };
    }

    if (/^(turn repeat off|repeat off|stop repeat|disable repeat)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REPEAT_OFF,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Repeat off.",
        spokenText: "Repeat off."
      };
    }

    // 6. LIKES & FAVORITES
    if (/^(like this song|like this|add to favorites|favorite this|save this song|i love this song|heart this)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.LIKE,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Added to favorites ♥",
        spokenText: "Saved to your favorites."
      };
    }

    if (/^(unlike this|unlike this song|remove from favorites|unfavorite this)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.UNLIKE,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Removed from favorites.",
        spokenText: "Removed from favorites."
      };
    }

    // 7. SCENES & GENRES
    // Switch to Ghazals / Indie / Retro / Lo-Fi / Synthwave / Peace / Chill
    const genreMatch = text.match(/(?:switch to|change genre to|play|explore)?\s*(ghazals?|indie|lo-?fi|retro|synthwave|peace|chill(?:\/sleep)?)\s*(?:genre|music|songs?)?$/i);
    if (genreMatch && ['ghazal', 'ghazals', 'indie', 'lofi', 'lo-fi', 'retro', 'synthwave', 'peace', 'chill'].includes(genreMatch[1].toLowerCase())) {
      let targetGenre = genreMatch[1].toLowerCase();
      if (targetGenre.startsWith('ghazal')) targetGenre = 'Ghazal';
      else if (targetGenre === 'indie') targetGenre = 'Indie';
      else if (targetGenre.includes('lo')) targetGenre = 'Lo-Fi';
      else if (targetGenre === 'retro') targetGenre = 'Retro';
      else if (targetGenre === 'synthwave') targetGenre = 'Synthwave';
      else if (targetGenre === 'peace') targetGenre = 'Peace';
      else if (targetGenre.includes('chill')) targetGenre = 'Chill/Sleep';

      return {
        action: MUSICLY_ACTIONS.CHANGE_GENRE,
        payload: { genre: targetGenre },
        confidence: 0.94,
        requiresConfirmation: false,
        feedback: `Switched to ${targetGenre}.`,
        spokenText: `Switching to ${targetGenre}.`
      };
    }

    // Change Scene to Specific Room / Theme
    if (/afterglow/i.test(text)) {
      const matchedScene = context.allScenes?.find(s => s.id === 'afterglow');
      return {
        action: MUSICLY_ACTIONS.CHANGE_SCENE,
        payload: { sceneId: 'afterglow', sceneName: 'Afterglow', scene: matchedScene },
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening Afterglow scene.",
        spokenText: "Opening Afterglow."
      };
    }

    if (/(?:minimal|studio|workstation)/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CHANGE_SCENE,
        payload: { sceneId: 'minimal_studio', sceneName: 'Minimal' },
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: "Switching to Minimal Studio.",
        spokenText: "Showing Minimal Studio."
      };
    }

    if (/(?:cozy bedroom|bedroom)/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CHANGE_SCENE,
        payload: { sceneId: 'cozy_bedroom', sceneName: 'Cozy Bedroom Studio' },
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: "Switching to Cozy Bedroom.",
        spokenText: "Switching to Cozy Bedroom."
      };
    }

    if (/(?:after hours|vibe carousel|carousel)/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CHANGE_SCENE,
        payload: { sceneId: 'vibe_carousel', sceneName: 'After Hours' },
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: "Switching to After Hours.",
        spokenText: "Switching to After Hours."
      };
    }

    if (/^(next scene|change scene|switch scene)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.NEXT_SCENE,
        payload: null,
        confidence: 0.95,
        requiresConfirmation: false,
        feedback: "Next scene →",
        spokenText: "Changing scene."
      };
    }

    // 8. AMBIENCE SOUNDS
    if (/^(turn ambience on|enable ambience|play ambience|start ambience)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.AMBIENCE_ON,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Ambience turned on.",
        spokenText: "Ambience on."
      };
    }

    if (/^(turn ambience off|mute ambience|stop ambience|disable ambience)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.AMBIENCE_OFF,
        payload: null,
        confidence: 0.97,
        requiresConfirmation: false,
        feedback: "Ambience turned off.",
        spokenText: "Ambience off."
      };
    }

    // 9. LIBRARY & PLAYLISTS
    if (/^(open my library|show my songs|open music library|my library|show library)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_LIBRARY,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening your library.",
        spokenText: "Opening your library."
      };
    }

    if (/^(add this song to my playlist|add it to my playlist|add to playlist|save to playlist)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.ADD_TO_PLAYLIST,
        payload: { track: context.currentTrack },
        confidence: 0.94,
        requiresConfirmation: false,
        feedback: `Added ${context.currentTrack?.title || 'track'} to playlist.`,
        spokenText: "Added to your playlist."
      };
    }

    if (/^(create a playlist|new playlist|make a playlist)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CREATE_PLAYLIST,
        payload: null,
        confidence: 0.93,
        requiresConfirmation: false,
        feedback: "Opening playlist creator.",
        spokenText: "Let's create a playlist."
      };
    }

    // Destructive: Delete Playlist
    if (/^(delete this playlist|delete playlist|remove playlist)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.DELETE_PLAYLIST,
        payload: null,
        confidence: 0.95,
        requiresConfirmation: true, // Sensitive action!
        feedback: "Are you sure you want to delete this playlist?",
        spokenText: "Are you sure you want to delete this playlist?"
      };
    }

    // 10. NAVIGATION & MODALS
    if (/^(go home|home|back to home)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_HOME,
        payload: null,
        confidence: 0.98,
        requiresConfirmation: false,
        feedback: "Going Home.",
        spokenText: "Going home."
      };
    }

    if (/^(open settings|settings|preferences)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_SETTINGS,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening settings.",
        spokenText: "Opening settings."
      };
    }

    if (/^(open profile|sign in|log in|my account)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_PROFILE,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening account.",
        spokenText: "Opening account."
      };
    }

    if (/^(open feedback|send feedback|feedback)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_FEEDBACK,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening feedback.",
        spokenText: "Opening feedback."
      };
    }

    if (/^(open coffee|buy me a coffee|support|donation)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_COFFEE,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening coffee support ☕",
        spokenText: "Opening coffee support."
      };
    }

    if (/^(request a song|request song|song request)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REQUEST_SONG,
        payload: null,
        confidence: 0.96,
        requiresConfirmation: false,
        feedback: "Opening song request modal.",
        spokenText: "Opening song request."
      };
    }

    // 11. ADMIN ACTIONS (Requires context.isAdmin)
    if (context.isAdmin) {
      if (/^(open admin dashboard|admin dashboard|admin portal)$/i.test(text)) {
        return {
          action: MUSICLY_ACTIONS.OPEN_ADMIN_DASHBOARD,
          payload: null,
          confidence: 0.98,
          requiresConfirmation: false,
          feedback: "Opening Admin Dashboard.",
          spokenText: "Opening admin dashboard."
        };
      }

      if (/^(show today's feedback|show feedback|feedback ledger)$/i.test(text)) {
        return {
          action: MUSICLY_ACTIONS.SHOW_FEEDBACK,
          payload: null,
          confidence: 0.95,
          requiresConfirmation: false,
          feedback: "Viewing user feedback.",
          spokenText: "Showing feedback."
        };
      }

      if (/^(show air ai performance|air ai analytics|open air ai)$/i.test(text)) {
        return {
          action: MUSICLY_ACTIONS.SHOW_AIR_AI,
          payload: null,
          confidence: 0.95,
          requiresConfirmation: false,
          feedback: "Opening Air AI Model Analytics.",
          spokenText: "Opening Air AI analytics."
        };
      }

      if (/^(open song requests|show pending song requests|song requests)$/i.test(text)) {
        return {
          action: MUSICLY_ACTIONS.SHOW_SONG_REQUESTS,
          payload: null,
          confidence: 0.95,
          requiresConfirmation: false,
          feedback: "Opening song requests ledger.",
          spokenText: "Showing song requests."
        };
      }
    }

    // 12. SEARCH OR PLAY SPECIFIC SONG / ARTIST
    // Pattern: "play <Song/Artist>", "search for <Query>", "find <Query>"
    const playQueryMatch = text.match(/^(?:play|find|search for|search|listen to)\s+(.+)$/i);
    const searchQuery = playQueryMatch ? playQueryMatch[1].trim() : text;

    if (searchQuery && context.allTracks && context.allTracks.length > 0) {
      // Search through existing songs in Musicly
      const cleanQ = normalizeText(searchQuery);

      // Ranked candidates
      let bestMatch = null;
      let highestScore = 0;
      const candidates = [];

      for (const track of context.allTracks) {
        const titleNorm = normalizeText(track.title);
        const artistNorm = normalizeText(track.artist);

        let score = 0;
        if (titleNorm === cleanQ) score = 1.0;
        else if (artistNorm === cleanQ) score = 0.95;
        else if (titleNorm.includes(cleanQ)) score = 0.90;
        else if (artistNorm.includes(cleanQ)) score = 0.85;
        else if (cleanQ.includes(titleNorm)) score = 0.88;
        else {
          const simTitle = stringSimilarity(cleanQ, titleNorm);
          const simArtist = stringSimilarity(cleanQ, artistNorm);
          score = Math.max(simTitle, simArtist * 0.9);
        }

        if (score > 0.65) {
          candidates.push({ track, score });
          if (score > highestScore) {
            highestScore = score;
            bestMatch = track;
          }
        }
      }

      if (bestMatch && highestScore >= 0.70) {
        // Check ambiguity: are there two tracks with the exact same title?
        const sameTitleMatches = candidates.filter(c => 
          normalizeText(c.track.title) === normalizeText(bestMatch.title) && c.track.id !== bestMatch.id
        );

        if (sameTitleMatches.length > 0) {
          return {
            action: MUSICLY_ACTIONS.PLAY_SPECIFIC_SONG,
            payload: { track: bestMatch, ambiguousList: [bestMatch, ...sameTitleMatches.map(m => m.track)] },
            confidence: highestScore,
            isAmbiguous: true,
            feedback: `Found multiple versions of ${bestMatch.title}. Playing ${bestMatch.artist}'s version.`,
            spokenText: `Found ${bestMatch.title} by ${bestMatch.artist}.`
          };
        }

        return {
          action: MUSICLY_ACTIONS.PLAY_SPECIFIC_SONG,
          payload: { track: bestMatch },
          confidence: highestScore,
          requiresConfirmation: false,
          feedback: `▶ Playing ${bestMatch.title} by ${bestMatch.artist}`,
          spokenText: `Playing ${bestMatch.title}.`
        };
      }
    }

    // Search query fallback: open search drawer with query
    if (searchQuery.length >= 2) {
      return {
        action: MUSICLY_ACTIONS.SEARCH,
        payload: { query: searchQuery },
        confidence: 0.75,
        requiresConfirmation: false,
        feedback: `Searching for "${searchQuery}"`,
        spokenText: `Searching for ${searchQuery}.`
      };
    }

    // Default: Unrecognized
    return {
      action: MUSICLY_ACTIONS.UNKNOWN,
      payload: { rawText: text },
      confidence: 0.2,
      requiresConfirmation: false,
      feedback: `I didn't understand "${rawCommand}". Try saying "Play", "Next song", or "Volume 50%".`,
      spokenText: "I didn't catch that command."
    };
  }
}
