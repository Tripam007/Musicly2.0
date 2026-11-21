import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { checkIsAdmin, getCachedUserRole } from './userModel';
import { isGhazalLanguage, isCountryLanguage, isRabindraSangeetLanguage, isTrackInLanguages } from '../data/tracks';

const PLAYLISTS_CACHE_KEY = 'musicly_public_playlists_cache';

export const PLAYLIST_LANGUAGES = ['All', 'English', 'Hindi', 'Bengali', 'Other'];

export function normalizePlaylistLang(lang) {
  if (!lang) return 'All';
  const l = String(lang).trim().toLowerCase();
  if (l === 'all' || l === '') return 'All';
  if (l === 'eng' || l.startsWith('eng')) return 'English';
  if (l === 'hin' || l.startsWith('hin')) return 'Hindi';
  if (l === 'ben' || l.startsWith('ben')) return 'Bengali';
  if (l === 'oth' || l.startsWith('oth') || l.includes('other')) return 'Other';
  return lang.trim();
}

/**
 * Filter playlists strictly by the currently selected language:
 * - english playlists -> shown only when english is selected
 * - hindi playlists -> shown only when hindi is selected
 * - bengali playlists -> shown only when bengali is selected
 * - other playlists -> shown only when other is selected
 * - all playlists -> shown only when all is selected (or default state)
 */
export function isPlaylistMatchingLanguage(playlistLang, selectedLanguages = [], selectedLanguage = null) {
  const pLang = normalizePlaylistLang(playlistLang);

  let active = [];
  if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
    active = selectedLanguages.filter(l => l && l !== 'Hinglish').map(normalizePlaylistLang);
  } else if (selectedLanguage && selectedLanguage !== 'All' && selectedLanguage !== 'Hinglish') {
    active = [normalizePlaylistLang(selectedLanguage)];
  }

  // When "All" is active (or no specific language filter is active)
  if (active.length === 0 || active.includes('All')) {
    return pLang === 'All';
  }

  // When a specific language is selected: show ONLY playlists matching that language
  return active.includes(pLang);
}

/**
 * Filter songs candidate for a playlist by target language:
 * - When target language is 'All': shows all songs.
 * - When target language is 'Other': shows only songs tagged as 'Other' (or untagged).
 * - When target language is a specific language (English, Hindi, Bengali):
 *   shows ONLY songs in that specific language AND songs tagged as 'Other'.
 */
export function isSongMatchingPlaylistLang(track, playlistLang) {
  if (!playlistLang) return true;
  const pLang = normalizePlaylistLang(playlistLang);
  if (pLang === 'All') return true;

  const rawLang = String(track?.language || '').trim();
  const tLang = normalizePlaylistLang(rawLang);

  // If track language is explicitly 'Other' or has no language specified,
  // it is allowed across all language-specific playlists
  const isOther = tLang === 'Other' || !rawLang;

  if (pLang === 'Other') {
    return isOther;
  }

  // If the track is 'Other', it is included in any language playlist
  if (isOther) {
    return true;
  }

  // Exact normalized language match (English === English, Hindi === Hindi, Bengali === Bengali)
  if (tLang.toLowerCase() === pLang.toLowerCase()) {
    return true;
  }

  // Fallback heuristics for tracks without standard language tags
  const genre = String(track?.genre || '').toLowerCase();
  const title = String(track?.title || '').toLowerCase();

  if (pLang === 'Hindi') {
    if (genre.includes('ghazal') || genre.includes('hindi') || title.includes('ghazal')) return true;
    if (isGhazalLanguage(rawLang)) return true;
  }

  if (pLang === 'Bengali') {
    if (genre.includes('rabindra') || genre.includes('bengali') || title.includes('majhe')) return true;
    if (isRabindraSangeetLanguage(rawLang)) return true;
  }

  if (pLang === 'English') {
    if (genre.includes('country') || genre.includes('retro') || genre.includes('indie')) return true;
    if (isCountryLanguage(rawLang)) return true;
  }

  return false;
}

/**
 * Get unified official Musicly playlists (built-in + admin created)
 * Filtered uniformly across ALL scenes by the active language filter.
 */
export function getUnifiedMusiclyPlaylists(allTracks = [], publicPlaylists = [], selectedLanguages = [], selectedLanguage = null) {
  const list = [];
  const tracks = Array.isArray(allTracks) ? allTracks : [];
  const officialTracks = tracks.filter(t => !t?.isCustom || !!t?.isPublic);

  const makePl = (id, title, plTracks, defaultImg, language) => ({
    id,
    title,
    subtitle: `${plTracks.length} song${plTracks.length === 1 ? '' : 's'} in this list`,
    tracks: plTracks,
    trackIds: plTracks.map(t => t.id),
    image: plTracks[0]?.cover || defaultImg,
    isCustom: false,
    isMusiclyOfficial: true,
    language: normalizePlaylistLang(language),
    count: plTracks.length
  });

  // 1. Vintage Hi-Fi & 80s (English)
  const retro = officialTracks.filter(t => ((t.genre || '').toLowerCase().includes('retro') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('retro')))) && isTrackInLanguages(t.language, ['English']));
  if (retro.length > 0) list.push(makePl('vintage_retro', 'Vintage Hi-Fi & 80s', retro, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', 'English'));

  // 2. Late Night Lo-Fi (All)
  const lofi = officialTracks.filter(t => (t.genre || '').toLowerCase().includes('lo-fi') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('lo-fi'))));
  if (lofi.length > 0) list.push(makePl('latenight_lofi', 'Late Night Lo-Fi', lofi, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', 'All'));

  // 3. Country Roads & Roots (English)
  const country = officialTracks.filter(t => ((t.genre || '').toLowerCase().includes('country') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('country')))) && isTrackInLanguages(t.language, ['English']));
  if (country.length > 0) list.push(makePl('country_roots', 'Country Roads & Roots', country, '/assets/images/country_scene.jpg', 'English'));

  // 4. Indie Acoustic Sessions (English)
  const indie = officialTracks.filter(t => ((t.genre || '').toLowerCase().includes('indie') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('indie')))) && isTrackInLanguages(t.language, ['English']));
  if (indie.length > 0) list.push(makePl('indie_warmth', 'Indie Acoustic Sessions', indie, 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=300&auto=format&fit=crop&q=80', 'English'));

  // 5. Timeless Ghazals & Mehfil (Hindi)
  const ghazals = officialTracks.filter(t => ((t.genre || '').toLowerCase().includes('ghazal') || (Array.isArray(t.genres) && t.genres.some(g => (g || '').toLowerCase().includes('ghazal')))) && isTrackInLanguages(t.language, ['Hindi']));
  if (ghazals.length > 0) list.push(makePl('timeless_ghazals', 'Timeless Ghazals & Mehfil', ghazals, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', 'Hindi'));

  // 6. Rabindra Sangeet & Folk (Bengali)
  const bengali = officialTracks.filter(t => ((t.genre || '').toLowerCase().includes('rabindra') || (t.title || '').toLowerCase().includes('majhe')) && isTrackInLanguages(t.language, ['Bengali']));
  if (bengali.length > 0) list.push(makePl('bengali_classics', 'Rabindra Sangeet & Folk', bengali, 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/80/d6/d8/80d6d8ef-03fd-991a-4f6c-e2e979355bb7/840123905307.png/600x600bb.jpg', 'Bengali'));

  // 7. Peace (All)
  const peace = officialTracks.filter(t => (t.genre || '').toLowerCase().includes('peace') || (t.title || '').toLowerCase().includes('peace'));
  if (peace.length > 0) list.push(makePl('peace_playlist', 'Peace', peace, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80', 'All'));

  // 8. Global & Other Melodies (Other)
  const otherTracks = officialTracks.filter(t => isTrackInLanguages(t.language, ['Other']));
  if (otherTracks.length > 0) list.push(makePl('global_other_melodies', 'Global & Other Melodies', otherTracks, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', 'Other'));

  // 9. Admin Created Official Public Playlists (synced worldwide)
  if (Array.isArray(publicPlaylists)) {
    publicPlaylists.forEach(pp => {
      const plTracks = (pp.trackIds || []).map(id => tracks.find(t => t.id === id)).filter(Boolean);
      list.push({
        id: pp.id,
        title: pp.title,
        subtitle: `${plTracks.length} song${plTracks.length === 1 ? '' : 's'} in this list`,
        tracks: plTracks,
        trackIds: pp.trackIds || [],
        image: pp.image || plTracks[0]?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
        isCustom: false,
        isMusiclyOfficial: true,
        language: normalizePlaylistLang(pp.language || 'All'),
        createdBy: pp.createdBy || 'Musicly Admin',
        createdAt: pp.createdAt || Date.now(),
        count: plTracks.length
      });
    });
  }

  // Filter strictly by the active language filter:
  // eng -> eng only, hindi -> hindi only, beng -> beng only, other -> other only, all -> all only
  const filteredLists = list.filter(pl => isPlaylistMatchingLanguage(pl.language, selectedLanguages, selectedLanguage));

  // If a specific language is selected, strictly filter internal tracks of every playlist as well
  let effectiveLangs = [];
  if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
    effectiveLangs = selectedLanguages.filter(l => l && l !== 'Hinglish');
  } else if (selectedLanguage && selectedLanguage !== 'All' && selectedLanguage !== 'Hinglish') {
    effectiveLangs = [selectedLanguage];
  }

  if (effectiveLangs.length > 0) {
    filteredLists.forEach(pl => {
      pl.tracks = pl.tracks.filter(t => isTrackInLanguages(t.language, effectiveLangs));
      pl.trackIds = pl.tracks.map(t => t.id);
      pl.count = pl.tracks.length;
      pl.subtitle = `${pl.tracks.length} song${pl.tracks.length === 1 ? '' : 's'} in this list`;
    });
  }

  return filteredLists;
}

/**
 * Load public Musicly playlists from local cache (0ms) + Firestore cloud sync
 * (Accessible to all users worldwide)
 */
export async function loadPublicPlaylists() {
  let playlists = [];

  // 1. Read local cache for instantaneous rendering
  try {
    const cached = localStorage.getItem(PLAYLISTS_CACHE_KEY);
    if (cached) {
      playlists = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Local public playlists cache read notice:", e);
  }

  // 2. Fetch latest from Firestore if online
  if (firestore) {
    try {
      const colRef = collection(firestore, 'public_playlists');
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
      ]);

      if (snap && !snap.empty) {
        const cloudPlaylists = [];
        snap.forEach(docSnap => {
          cloudPlaylists.push({ id: docSnap.id, ...docSnap.data() });
        });

        cloudPlaylists.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        playlists = cloudPlaylists;
        localStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(playlists));
      }
    } catch (err) {
      console.warn("Firestore public playlists fetch notice:", err);
    }
  }

  return playlists;
}

export function getLocalPublicPlaylists() {
  try {
    const cached = localStorage.getItem(PLAYLISTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

/**
 * Publish a new official Musicly Playlist (Admin Only)
 */
export async function publishPublicPlaylist(playlistData, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can create official Musicly playlists.");
  }

  if (!playlistData.title || !playlistData.title.trim()) {
    throw new Error("Playlist title is required.");
  }

  const id = playlistData.id || `musicly_pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newPlaylist = {
    id,
    title: playlistData.title.trim(),
    trackIds: Array.isArray(playlistData.trackIds) ? playlistData.trackIds : [],
    image: playlistData.image || null,
    language: normalizePlaylistLang(playlistData.language || 'All'),
    createdBy: user?.email || 'admin',
    createdAt: Date.now(),
    isMusiclyOfficial: true,
    isPublic: true,
    isCustom: false
  };

  // 1. Save to local cache immediately (instant 0ms persistence)
  try {
    const existing = JSON.parse(localStorage.getItem(PLAYLISTS_CACHE_KEY) || '[]');
    const updated = [newPlaylist, ...existing.filter(p => p.id !== id)];
    localStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local public playlists cache write notice:", e);
  }

  // 2. Persist to Firestore with safety timeout
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_playlists', id);
      await Promise.race([
        setDoc(docRef, newPlaylist),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore public playlist publish notice (saved locally):", err);
    }
  }

  window.dispatchEvent(new CustomEvent('musicly_public_playlists_changed', { detail: { playlist: newPlaylist } }));

  return newPlaylist;
}

/**
 * Update an official Musicly Playlist (Admin Only)
 */
export async function updatePublicPlaylist(playlistId, updates, user) {
  if (!checkIsAdmin(user) && !(user?.uid && getCachedUserRole(user.uid) === 'admin')) {
    throw new Error("Unauthorized: Only verified admin can update official Musicly playlists.");
  }

  let updatedPlaylist = null;
  const safeUpdates = { ...updates };
  if (safeUpdates.language) {
    safeUpdates.language = normalizePlaylistLang(safeUpdates.language);
  }

  try {
    const existing = JSON.parse(localStorage.getItem(PLAYLISTS_CACHE_KEY) || '[]');
    let found = false;
    const updated = existing.map(p => {
      if (p.id === playlistId) {
        found = true;
        updatedPlaylist = { ...p, ...safeUpdates, updatedAt: Date.now() };
        return updatedPlaylist;
      }
      return p;
    });

    if (!found) {
      updatedPlaylist = {
        id: playlistId,
        title: safeUpdates.title || playlistId,
        trackIds: safeUpdates.trackIds || [],
        language: safeUpdates.language || 'All',
        isMusiclyOfficial: true,
        isPublic: true,
        isCustom: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...safeUpdates
      };
      updated.push(updatedPlaylist);
    }

    localStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local public playlists cache update notice:", e);
  }

  if (firestore && updatedPlaylist) {
    try {
      const docRef = doc(firestore, 'public_playlists', playlistId);
      await Promise.race([
        setDoc(docRef, updatedPlaylist, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore public playlist update notice:", err);
    }
  }

  window.dispatchEvent(new CustomEvent('musicly_public_playlists_changed', { detail: { playlistId, updates } }));

  return updatedPlaylist;
}

/**
 * Delete an official Musicly Playlist (Admin Only)
 */
export async function deletePublicPlaylist(playlistId, user) {
  if (!checkIsAdmin(user) && !(user?.uid && getCachedUserRole(user.uid) === 'admin')) {
    throw new Error("Unauthorized: Only verified admin can delete official Musicly playlists.");
  }

  try {
    const existing = JSON.parse(localStorage.getItem(PLAYLISTS_CACHE_KEY) || '[]');
    const filtered = existing.filter(p => p.id !== playlistId);
    localStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Local public playlists cache delete notice:", e);
  }

  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_playlists', playlistId);
      await Promise.race([
        deleteDoc(docRef),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore public playlist delete notice:", err);
    }
  }

  window.dispatchEvent(new CustomEvent('musicly_public_playlists_changed', { detail: { deletedId: playlistId } }));

  return true;
}

