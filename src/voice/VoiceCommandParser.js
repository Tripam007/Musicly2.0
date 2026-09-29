/**
 * VoiceCommandParser.js
 * 
 * Production Natural Language Intent & Slot Parser for Musicly Voice AI.
 * Pipeline:
 * RAW TRANSCRIPT -> LOWERCASE -> TRIM -> PUNCTUATION NORMALIZATION
 * -> SPEECH NORMALIZATION (Numbers/Aliases) -> MULTILINGUAL MAPPING
 * -> INTENT DETECTION -> ENTITY EXTRACTION -> MULTI-LAYER CONFIDENCE
 * -> ACTION & AMBIGUITY RESOLUTION.
 */

import { MUSICLY_ACTIONS } from './voiceConfig.js';
import {
  normalizeText,
  normalizeNumbers,
  stringSimilarity,
  mapMultilingualPhrase
} from './normalization.js';

export class VoiceCommandParser {
  /**
   * Parse a raw transcript into a structured, validated action.
   * 
   * @param {string} rawTranscript - Raw speech string returned from STT
   * @param {object} context - Current player context { allTracks, currentTrack, currentScene, allScenes, volume, isPlaying, favorites, isAdmin }
   * @param {number} speechConfidence - Confidence score from STT engine (0.0 - 1.0)
   * @returns {object} Parsed action object
   */
  static parse(rawTranscript, context = {}, speechConfidence = 0.90) {
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return {
        action: MUSICLY_ACTIONS.UNKNOWN,
        intentConfidence: 0,
        speechConfidence: 0,
        entityConfidence: 0,
        actionConfidence: 0,
        feedback: "Didn't catch that.",
        spokenText: "Sorry, I didn't hear a command."
      };
    }

    // 1. Pipeline: Normalize text
    const cleanLower = normalizeText(rawTranscript);

    // 2. Multilingual phrase translation (Hindi/Bengali/Hinglish -> Canonical)
    const { translated: canonicalText } = mapMultilingualPhrase(cleanLower);

    // 3. Normalize numbers on canonical text (e.g. "volume fifty" -> "volume 50")
    const withNumbers = normalizeNumbers(canonicalText);
    const text = withNumbers.trim();

    // 3. Low Speech Confidence Gate
    if (speechConfidence < 0.40) {
      return {
        action: MUSICLY_ACTIONS.UNKNOWN,
        rawCommand: rawTranscript,
        speechConfidence,
        intentConfidence: 0.3,
        actionConfidence: 0.3,
        feedback: "Could you repeat that?",
        spokenText: "I couldn't understand that. Please repeat."
      };
    }

    // 4. CANCEL / DISMISS
    if (/^(cancel|nevermind|stop listening|close|dismiss|exit|chup|thamo)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.CANCEL,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.99,
        speechConfidence,
        actionConfidence: 0.99,
        feedback: "Cancelled.",
        spokenText: "Cancelled."
      };
    }

    // 5. VOICE ASSISTANT CONTROLS
    if (/^(stop talking|mute voice|mute musicly voice|voice off|turn voice off)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.VOICE_OFF,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Voice muted.",
        spokenText: "Voice muted."
      };
    }

    // 6. PLAYBACK CONTROLS
    // Play / Resume
    if (/^(play|resume|continue|start playing|start music|play music|unpause)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PLAY,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Resuming playback.",
        spokenText: "Playing."
      };
    }

    // Pause / Stop
    if (/^(pause|stop|halt|hold on|pause music|stop music)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PAUSE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Music paused.",
        spokenText: "Paused."
      };
    }

    // Next Track / Skip
    if (/^(next|next song|next track|skip|skip this|skip song|play next|go next)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.NEXT_TRACK,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Playing next track.",
        spokenText: "Next track."
      };
    }

    // Previous Track / Rewind to previous
    if (/^(previous|previous song|previous track|prev song|prev|go back|back song|play previous)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.PREVIOUS_TRACK,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Playing previous track.",
        spokenText: "Previous track."
      };
    }

    // Restart / Replay current song
    if (/^(restart|restart this song|restart track|replay|play from beginning|start over)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REPLAY,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Replaying track.",
        spokenText: "Replaying."
      };
    }

    // 7. SEEKING (Forward / Backward relative or absolute seconds)
    // E.g. "forward 10 seconds", "skip 30 seconds", "rewind 20 seconds", "go back 15 seconds"
    const seekMatch = text.match(/(?:skip|forward|jump|go|rewind|back)\s+(?:forward\s+|ahead\s+|back\s+)?(\d+)\s*(?:seconds?|secs?)?/i);
    if (seekMatch) {
      const seconds = parseInt(seekMatch[1], 10);
      const isBackward = /rewind|back/i.test(text);
      return {
        action: MUSICLY_ACTIONS.SEEK,
        params: {
          type: 'relative',
          direction: isBackward ? 'backward' : 'forward',
          offsetSeconds: seconds,
          seconds: isBackward ? -seconds : seconds
        },
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: `${isBackward ? 'Rewound' : 'Skipped'} ${seconds} seconds.`,
        spokenText: `${isBackward ? 'Rewound' : 'Skipped'} ${seconds} seconds.`
      };
    }

    // 8. VOLUME CONTROLS
    // Absolute Volume: "volume 50", "set volume to 70", "volume at 80 percent"
    const volNumMatch = text.match(/(?:set\s+)?volume\s+(?:to\s+|at\s+)?(\d+)(?:\s*percent|%)?/i);
    if (volNumMatch) {
      const val = parseInt(volNumMatch[1], 10);
      const clampedPercent = Math.max(0, Math.min(100, val));
      const decimalValue = clampedPercent / 100;
      return {
        action: MUSICLY_ACTIONS.SET_VOLUME,
        params: { value: decimalValue, percent: clampedPercent },
        rawCommand: rawTranscript,
        intentConfidence: 0.97,
        speechConfidence,
        actionConfidence: 0.97,
        feedback: `Volume set to ${clampedPercent}%.`,
        spokenText: `Volume set to ${clampedPercent} percent.`
      };
    }

    // Volume Up / Louder
    if (/^(volume up|turn it up|louder|make it louder|increase volume|boost volume)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.VOLUME_UP,
        params: { step: 0.10 },
        rawCommand: rawTranscript,
        intentConfidence: 0.97,
        speechConfidence,
        actionConfidence: 0.97,
        feedback: "Volume increased.",
        spokenText: "Volume up."
      };
    }

    // Volume Down / Quieter
    if (/^(volume down|turn it down|quieter|make it quieter|decrease volume|lower volume)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.VOLUME_DOWN,
        params: { step: 0.10 },
        rawCommand: rawTranscript,
        intentConfidence: 0.97,
        speechConfidence,
        actionConfidence: 0.97,
        feedback: "Volume decreased.",
        spokenText: "Volume down."
      };
    }

    // Mute
    if (/^(mute|silence|turn off sound|mute sound|mute musicly)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.MUTE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Muted.",
        spokenText: "Muted."
      };
    }

    // Unmute
    if (/^(unmute|restore sound|turn sound back on)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.UNMUTE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.98,
        speechConfidence,
        actionConfidence: 0.98,
        feedback: "Unmuted.",
        spokenText: "Unmuted."
      };
    }

    // 9. SHUFFLE & REPEAT
    if (/^(shuffle|turn shuffle on|enable shuffle|start shuffle)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_SHUFFLE,
        params: { value: true },
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Shuffle enabled.",
        spokenText: "Shuffle on."
      };
    }
    if (/^(turn shuffle off|disable shuffle|stop shuffle)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_SHUFFLE,
        params: { value: false },
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Shuffle disabled.",
        spokenText: "Shuffle off."
      };
    }

    if (/^(repeat|repeat this song|repeat track|loop this song)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_REPEAT,
        params: { mode: 'one' },
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Repeating current track.",
        spokenText: "Repeating this song."
      };
    }
    if (/^(turn repeat off|stop repeat|disable repeat)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_REPEAT,
        params: { mode: 'off' },
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Repeat turned off.",
        spokenText: "Repeat off."
      };
    }

    // 10. LIKE / FAVORITES
    if (/^(like|like this|like this song|favorite this|add to favorites|i love this song)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.LIKE,
        params: { trackId: context.currentTrack?.id },
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Added to favorites.",
        spokenText: "Added to favorites."
      };
    }
    if (/^(unlike|unlike this|remove from favorites|dislike this)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.UNLIKE,
        params: { trackId: context.currentTrack?.id },
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Removed from favorites.",
        spokenText: "Removed from favorites."
      };
    }

    // 11. NAVIGATION & MODALS
    if (/^(open my library|open library|show my library|show library|my music|open playlists|show playlists|show liked songs)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_LIBRARY,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Opening your library.",
        spokenText: "Opening your library."
      };
    }

    if (/^(go home|open home|home screen)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_HOME,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Navigated home.",
        spokenText: "Navigating home."
      };
    }

    if (/^(open settings|settings|keyboard shortcuts|show shortcuts)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_SETTINGS,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Opening settings.",
        spokenText: "Settings."
      };
    }

    if (/^(open feedback|give feedback|send feedback)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_FEEDBACK,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Opening feedback.",
        spokenText: "Opening feedback."
      };
    }

    if (/^(buy me a coffee|support musicly|open coffee)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.OPEN_COFFEE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Opening Coffee modal.",
        spokenText: "Opening coffee."
      };
    }

    if (/^(request song|request a song|song request)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.REQUEST_SONG,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Opening song requests.",
        spokenText: "Opening song request."
      };
    }

    // 12. AMBIENCE SOUNDSCAPES
    if (/^(turn ambience on|ambience on|start rain|play rain|enable ambience)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.AMBIENCE_ON,
        params: { value: true },
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Ambience turned on.",
        spokenText: "Ambience on."
      };
    }
    if (/^(turn ambience off|ambience off|stop rain|disable ambience|mute ambience)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.AMBIENCE_OFF,
        params: { value: false },
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Ambience turned off.",
        spokenText: "Ambience off."
      };
    }
    if (/^(toggle ambience|switch ambience)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.TOGGLE_AMBIENCE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.94,
        speechConfidence,
        actionConfidence: 0.94,
        feedback: "Toggled ambience.",
        spokenText: "Ambience toggled."
      };
    }

    // 13. SCENE SWITCHING
    // E.g. "open Afterglow", "switch to Drive", "open Studio", "open Indie", "switch scene"
    const sceneMatch = text.match(/(?:switch\s+to|change\s+to|open|switch\s+scene\s+to)\s+([a-z\s]+)(?:\s+scene)?/i);
    if (sceneMatch) {
      const queryScene = sceneMatch[1].trim();
      const allScenes = context.allScenes || [];
      const matchedScene = allScenes.find((s) => {
        const sName = normalizeText(s.name);
        const sId = normalizeText(s.id);
        return sName === queryScene || sId === queryScene || stringSimilarity(sName, queryScene) > 0.75;
      });

      if (matchedScene) {
        return {
          action: MUSICLY_ACTIONS.CHANGE_SCENE,
          params: { scene: matchedScene, sceneId: matchedScene.id, sceneName: matchedScene.name },
          rawCommand: rawTranscript,
          intentConfidence: 0.95,
          speechConfidence,
          entityConfidence: 0.96,
          actionConfidence: 0.95,
          feedback: `Switching to ${matchedScene.name}.`,
          spokenText: `Switching to ${matchedScene.name}.`
        };
      }
    }

    if (/^(switch scene|next scene)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.NEXT_SCENE,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Switching scene.",
        spokenText: "Switching scene."
      };
    }

    // 14. ADMIN ACTIONS (Checked for context.isAdmin)
    if (/^(open admin dashboard|admin dashboard|open admin)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.ADMIN_OPEN_DASHBOARD,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.96,
        speechConfidence,
        actionConfidence: 0.96,
        feedback: "Opening admin dashboard.",
        spokenText: "Opening admin dashboard."
      };
    }
    if (/^(show feedback|open admin feedback|admin feedback)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.ADMIN_SHOW_FEEDBACK,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Showing feedback in dashboard.",
        spokenText: "Opening feedback dashboard."
      };
    }
    if (/^(open air ai|show air ai|air ai dashboard)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.ADMIN_SHOW_AIR_AI,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Opening Air AI dashboard.",
        spokenText: "Opening Air AI."
      };
    }
    if (/^(show song requests|open song requests admin)$/i.test(text)) {
      return {
        action: MUSICLY_ACTIONS.ADMIN_SHOW_REQUESTS,
        params: {},
        rawCommand: rawTranscript,
        intentConfidence: 0.95,
        speechConfidence,
        actionConfidence: 0.95,
        feedback: "Showing song requests.",
        spokenText: "Showing song requests."
      };
    }

    // 15. MUSIC SEARCH & PLAY ENTITY EXTRACTION
    // E.g. "play Faasle", "play something by Kaavish", "play Coldplay", "play some hindi songs", "search for Coldplay"
    const searchPlayMatch = text.match(/(?:play\s+something\s+(?:by|from)|play\s+(?:some\s+)?|search\s+(?:for\s+)?|find\s+)(.+)/i);
    const searchQuery = searchPlayMatch ? searchPlayMatch[1].trim() : text;

    if (searchQuery && searchQuery.length > 1) {
      const allTracks = context.allTracks || [];
      const cleanQuery = normalizeText(searchQuery);

      // Scored matching against Musicly Library
      const scoredTracks = allTracks.map((track) => {
        const titleNorm = normalizeText(track.title);
        const artistNorm = normalizeText(track.artist);
        const genreNorm = normalizeText(track.genre);

        let score = 0;
        let matchType = 'none';

        // 1. Exact match on title
        if (titleNorm === cleanQuery) {
          score = 1.0;
          matchType = 'exact_title';
        }
        // 2. Exact match on artist
        else if (artistNorm === cleanQuery) {
          score = 0.95;
          matchType = 'exact_artist';
        }
        // 3. Title contains query or query contains title
        else if (titleNorm.includes(cleanQuery) || cleanQuery.includes(titleNorm)) {
          const ratio = Math.min(titleNorm.length, cleanQuery.length) / Math.max(titleNorm.length, cleanQuery.length);
          score = 0.88 + ratio * 0.08;
          matchType = 'partial_title';
        }
        // 4. Artist contains query
        else if (artistNorm.includes(cleanQuery) || cleanQuery.includes(artistNorm)) {
          score = 0.85;
          matchType = 'partial_artist';
        }
        // 5. Genre contains query (e.g. "hindi songs", "lo-fi")
        else if (genreNorm.includes(cleanQuery) || cleanQuery.includes(genreNorm)) {
          score = 0.80;
          matchType = 'genre';
        }
        // 6. Fuzzy string similarity
        else {
          const titleSim = stringSimilarity(titleNorm, cleanQuery);
          const artistSim = stringSimilarity(artistNorm, cleanQuery);
          const bestSim = Math.max(titleSim, artistSim);
          if (bestSim >= 0.65) {
            score = bestSim * 0.85;
            matchType = 'fuzzy';
          }
        }

        return { track, score, matchType };
      });

      // Filter matches above threshold and sort descending
      const matches = scoredTracks.filter((m) => m.score >= 0.60).sort((a, b) => b.score - a.score);

      // Ambiguity Check (Phase 12):
      // Distinguish song title ambiguity (e.g. original vs remix) from general artist playback
      const isArtistRequest = matches.length > 1 && matches[0]?.matchType === 'exact_artist' && matches[1]?.matchType === 'exact_artist';
      const hasCloseCompetitor = !isArtistRequest && matches.length > 1 && (
        (matches[0].score - matches[1].score) < 0.15 ||
        (matches[1].score >= 0.88 && matches[1].track?.title?.toLowerCase().includes(cleanQuery))
      );

      if (hasCloseCompetitor && matches.length > 0) {
        const topCandidates = matches.slice(0, 3).map((m) => m.track);
        return {
          action: MUSICLY_ACTIONS.AMBIGUOUS_CHOICE,
          params: {
            candidates: topCandidates,
            query: searchQuery
          },
          rawCommand: rawTranscript,
          intentConfidence: 0.90,
          speechConfidence,
          entityConfidence: matches[0]?.score || 0.8,
          actionConfidence: 0.85,
          feedback: "Which one did you mean?",
          spokenText: "Which one did you mean?"
        };
      }

      // Strong single match found
      if (matches.length > 0) {
        const top = matches[0];
        const spokenTitle = top.track.title;
        return {
          action: MUSICLY_ACTIONS.PLAY_SEARCH_RESULT,
          params: {
            track: top.track,
            targetTrack: top.track,
            query: searchQuery,
            score: top.score,
            matchType: top.matchType
          },
          rawCommand: rawTranscript,
          intentConfidence: 0.94,
          speechConfidence,
          entityConfidence: top.score,
          actionConfidence: Math.round(((speechConfidence + top.score) / 2) * 100) / 100,
          feedback: `Playing ${spokenTitle}.`,
          spokenText: `Playing ${spokenTitle}.`
        };
      }

      // If user said "search for [x]", open drawer in search mode
      if (/^(?:search\s+for|search|find)\s+/i.test(text)) {
        return {
          action: MUSICLY_ACTIONS.SEARCH,
          params: { query: searchQuery },
          rawCommand: rawTranscript,
          intentConfidence: 0.92,
          speechConfidence,
          actionConfidence: 0.92,
          feedback: `Searching for ${searchQuery}.`,
          spokenText: `Searching for ${searchQuery}.`
        };
      }
    }

    // Default: UNKNOWN
    return {
      action: MUSICLY_ACTIONS.UNKNOWN,
      params: { rawText: text },
      rawCommand: rawTranscript,
      intentConfidence: 0.20,
      speechConfidence,
      entityConfidence: 0,
      actionConfidence: 0.20,
      feedback: "Command not recognized.",
      spokenText: "Sorry, I didn't recognize that command."
    };
  }
}
