import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { checkIsAdmin } from './userModel';
import { extractYouTubeId } from './youtubePlayer';
import { generateInstantAudioBlob } from './audioDownloader';
import { resolveOriginalTrack } from './originalTrackResolver';
import { deduplicateTracks } from './trackDeduplicator';
import { TRACKS } from '../data/tracks';

const PUBLIC_CACHE_KEY = 'musicly_public_tracks_cache';
const PUBLIC_STORE_NAME = 'public_audio_tracks';
const PUBLIC_DB_NAME = 'MusiclyPublicDB';
const PUBLIC_DB_VERSION = 1;

// IndexedDB instance for public tracks
function openPublicDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PUBLIC_DB_NAME, PUBLIC_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(PUBLIC_STORE_NAME)) {
        db.createObjectStore(PUBLIC_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Default Seed Public Library Tracks (guarantees public library always has all songs even on cold start/offline)
export const SEED_PUBLIC_TRACKS = TRACKS.map(t => ({
  ...t,
  isPublic: true,
  isOfficial: true,
  publishedBy: 'Musicly',
  publishedAt: 1710000000000
}));

export const PUBLIC_DELETED_KEY = 'musicly_public_deleted_track_ids';

// Initial pre-registered deleted IDs to immediately purge tracks if deleted by admin
export const INITIAL_PURGED_IDS = [];

/**
 * Returns a Set of track IDs that have been permanently deleted by the admin.
 */
export function getDeletedPublicTrackIds() {
  const set = new Set(INITIAL_PURGED_IDS);
  try {
    const raw = localStorage.getItem(PUBLIC_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (!id.startsWith('public-ghazal-') && id !== 'public-weightless' && id !== 'public-sweater-weather') {
            set.add(id);
          }
        });
      }
    }
  } catch (e) {}
  return set;
}

/**
 * Record a track ID as permanently deleted in local cache & storage.
 */
export function markPublicTrackDeleted(trackId) {
  try {
    const set = getDeletedPublicTrackIds();
    set.add(trackId);
    localStorage.setItem(PUBLIC_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/**
 * 0ms Synchronous Local Cache Reader
 * Loads instantly for any user, even when logged out!
 * Guaranteed to never return or revive deleted tracks.
 */
export function getLocalPublicTracks() {
  const deletedIds = getDeletedPublicTrackIds();

  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Exclude any deleted tracks from the stored list
        const cleanList = parsed.filter(t => !deletedIds.has(t.id));
        const resolvedList = cleanList.map(t => resolveOriginalTrack({ ...t, isPublic: true }));

        // Ensure official seeds are accessible ONLY if they have not been deleted
        const existingIds = new Set(resolvedList.map(t => t.id));
        const missingSeeds = SEED_PUBLIC_TRACKS.filter(s => !existingIds.has(s.id) && !deletedIds.has(s.id));
        const combined = deduplicateTracks([...missingSeeds, ...resolvedList]);

        // If stale deleted items were purged from the cache, save the cleaned list back
        if (cleanList.length !== parsed.length || missingSeeds.length > 0) {
          saveLocalPublicTracks(combined);
        }
        return combined;
      }
    }
  } catch (e) {}

  return deduplicateTracks(SEED_PUBLIC_TRACKS.filter(s => !deletedIds.has(s.id)));
}

/**
 * Save public list to local cache (strictly excludes any deleted tracks)
 */
function saveLocalPublicTracks(tracks) {
  try {
    const deletedIds = getDeletedPublicTrackIds();
    const safeList = tracks
      .filter(t => !deletedIds.has(t.id))
      .map(t => {
        const { blob: _, ...clean } = t;
        return clean;
      });
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(safeList));
  } catch (e) {}
}

/**
 * Load all Public Library songs.
 * Accessible to ANYONE (including logged-out visitors).
 */
export async function loadPublicTracks() {
  const deletedIds = getDeletedPublicTrackIds();

  // 1. Start with local cache for immediate 0ms response
  const cached = getLocalPublicTracks().filter(t => !deletedIds.has(t.id));
  let merged = [...cached];

  // 2. Fetch from IndexedDB
  try {
    const db = await openPublicDB();
    const idbTracks = await new Promise((resolve) => {
      const tx = db.transaction(PUBLIC_STORE_NAME, 'readonly');
      const store = tx.objectStore(PUBLIC_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (idbTracks && idbTracks.length > 0) {
      idbTracks.forEach(t => {
        // If track was marked deleted, remove it from IndexedDB!
        if (deletedIds.has(t.id)) {
          try {
            const delTx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
            delTx.objectStore(PUBLIC_STORE_NAME).delete(t.id);
          } catch (_e) {}
          return;
        }

        const idx = merged.findIndex(m => m.id === t.id);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...t, isPublic: true };
        } else {
          merged.push({ ...t, isPublic: true });
        }
      });
    }
  } catch (e) {
    console.warn("Public IndexedDB load notice:", e);
  }

  // 3. Fetch from Cloud Firestore /public_tracks with timeout protection
  if (firestore) {
    try {
      // Sync cloud deleted tombstones
      try {
        const deletedSnap = await getDocs(collection(firestore, 'public_deleted_tracks'));
        deletedSnap.forEach(d => {
          if (d.id) {
            deletedIds.add(d.id);
            markPublicTrackDeleted(d.id);
          }
        });
      } catch (_delErr) {}

      const publicColRef = collection(firestore, 'public_tracks');
      const snap = await Promise.race([
        getDocs(publicColRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
      ]);
      if (!snap.empty) {
        const cloudTracks = [];
        snap.forEach(d => {
          const data = d.data();
          if (data && data.id && !deletedIds.has(data.id)) {
            cloudTracks.push({ ...data, isPublic: true });
          }
        });

        if (cloudTracks.length > 0) {
          // Sync with merged
          cloudTracks.forEach(ct => {
            if (deletedIds.has(ct.id)) return;
            const idx = merged.findIndex(m => m.id === ct.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...ct };
            } else {
              merged.push(ct);
            }
          });

          // Save to IndexedDB
          try {
            const db = await openPublicDB();
            const tx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
            const store = tx.objectStore(PUBLIC_STORE_NAME);
            cloudTracks.forEach(t => {
              if (!deletedIds.has(t.id)) store.put(t);
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Firestore public tracks fetch notice:", err);
    }
  }

  // Format and ensure audioUrls and metadata are robust (strictly filter out deleted)
  const sanitized = merged
    .filter(t => !deletedIds.has(t.id))
    .map(t => {
    const ytId = t.youtubeId || extractYouTubeId(t.audioUrl || '');
    const isYt = !!t.isYouTube || !!ytId;

    let finalAudioUrl = t.audioUrl || '';
    if (t.blob instanceof Blob) {
      finalAudioUrl = URL.createObjectURL(t.blob);
    } else if (isYt && ytId) {
      finalAudioUrl = `https://www.youtube.com/watch?v=${ytId}`;
    }

    return {
      ...t,
      isPublic: true,
      isCustom: false, // Not a private user custom track
      isYouTube: isYt,
      youtubeId: ytId || null,
      audioUrl: finalAudioUrl,
      genre: t.genre || 'Lo-Fi',
      genres: Array.isArray(t.genres) && t.genres.length > 0 ? t.genres : [t.genre || 'Lo-Fi'],
      language: t.language || 'English',
      cover: t.cover || (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80')
    };
  });

  saveLocalPublicTracks(sanitized);
  return sanitized;
}

/**
 * 🔒 ADMIN ONLY: Publish a song to the Musicly Public Library.
 * Throws an error if the user is not authenticated with admin privileges.
 */
export async function publishPublicTrack(trackData, audioBlob = null, user = null) {
  // STRICT ADMIN ROLE CHECK
  if (!checkIsAdmin(user)) {
    throw new Error("Access Denied: Only verified admin accounts can publish to Musicly Public Library.");
  }

  const trackId = trackData.id || `public-${Date.now()}`;
  const ytId = trackData.youtubeId || extractYouTubeId(trackData.audioUrl || '');
  const isYt = !!trackData.isYouTube || !!ytId;

  const genresList = Array.isArray(trackData.genres) && trackData.genres.length > 0
    ? trackData.genres
    : (trackData.genre ? trackData.genre.split(',').map(s => s.trim()) : ['Lo-Fi']);

  let finalBlob = audioBlob || trackData.blob || null;
  if (!isYt && (!finalBlob || !(finalBlob instanceof Blob))) {
    try {
      finalBlob = generateInstantAudioBlob(genresList[0] || 'Lo-Fi', trackData.duration || 180);
    } catch (e) {}
  }

  const record = {
    id: trackId,
    title: trackData.title || 'Untitled Public Song',
    artist: trackData.artist || 'Musicly Public',
    genre: genresList.join(', '),
    genres: genresList,
    language: trackData.language || 'English',
    duration: trackData.duration || (isYt ? 240 : 180),
    cover: trackData.cover || (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'),
    audioUrl: trackData.audioUrl || (isYt ? `https://www.youtube.com/watch?v=${ytId}` : ''),
    isPublic: true,
    isYouTube: isYt,
    youtubeId: ytId || null,
    publishedBy: user.email || user.uid,
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    blob: finalBlob
  };

  const finalRecord = resolveOriginalTrack(record);

  // If previously deleted, unmark it
  try {
    const deletedSet = getDeletedPublicTrackIds();
    if (deletedSet.has(trackId)) {
      deletedSet.delete(trackId);
      localStorage.setItem(PUBLIC_DELETED_KEY, JSON.stringify(Array.from(deletedSet)));
      if (firestore) {
        deleteDoc(doc(firestore, 'public_deleted_tracks', trackId)).catch(() => {});
      }
    }
  } catch (e) {}

  // 1. Write to IndexedDB first for instant local persistence
  try {
    const db = await openPublicDB();
    const tx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
    tx.objectStore(PUBLIC_STORE_NAME).put(finalRecord);
  } catch (e) {}

  // 2. Update local cache
  const currentList = getLocalPublicTracks();
  const filtered = currentList.filter(t => t.id !== trackId);
  saveLocalPublicTracks([finalRecord, ...filtered]);

  // 3. Write to Firestore /public_tracks in background or with quick timeout
  if (firestore) {
    try {
      const { blob: _, ...cloudData } = record;
      const docRef = doc(firestore, 'public_tracks', trackId);
      Promise.race([
        setDoc(docRef, cloudData, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore background publish notice:", err);
      });
    } catch (err) {
      console.warn("Firestore publish public track notice:", err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_public_library_changed', { detail: { publishedTrack: finalRecord } }));
  }

  return record;
}

/**
 * 🔒 ADMIN ONLY: Edit/Update metadata for a song in the Musicly Public Library.
 */
export async function updatePublicTrack(trackId, updates, user = null) {
  if (!checkIsAdmin(user)) {
    throw new Error("Access Denied: Only verified admin accounts can edit public library tracks.");
  }

  const currentList = getLocalPublicTracks();
  const existing = currentList.find(t => t.id === trackId);
  if (!existing) {
    throw new Error("Public track not found");
  }

  const updatedRecord = {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  };

  // 1. Update local cache immediately
  const updatedList = currentList.map(t => t.id === trackId ? updatedRecord : t);
  saveLocalPublicTracks(updatedList);

  // 2. Update IndexedDB
  try {
    const db = await openPublicDB();
    const tx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
    tx.objectStore(PUBLIC_STORE_NAME).put(updatedRecord);
  } catch (e) {}

  // 3. Update Firestore in background
  if (firestore) {
    try {
      const { blob: _, ...cloudData } = updatedRecord;
      const docRef = doc(firestore, 'public_tracks', trackId);
      Promise.race([
        updateDoc(docRef, cloudData),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore background update notice:", err);
      });
    } catch (err) {
      console.warn("Firestore update public track notice:", err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_public_library_changed', { detail: { updatedTrack: updatedRecord } }));
  }

  return updatedRecord;
}

/**
 * 🔒 ADMIN ONLY: Delete a song from the Musicly Public Library.
 */
export async function deletePublicTrack(trackId, user = null) {
  if (!checkIsAdmin(user)) {
    throw new Error("Access Denied: Only verified admin accounts can delete public library tracks.");
  }

  // Record permanent deletion tombstone so this song is NEVER revived
  markPublicTrackDeleted(trackId);

  // 1. Delete from local cache immediately
  const currentList = getLocalPublicTracks();
  const updatedList = currentList.filter(t => t.id !== trackId);
  saveLocalPublicTracks(updatedList);

  // 2. Delete from IndexedDB
  try {
    const db = await openPublicDB();
    const tx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
    tx.objectStore(PUBLIC_STORE_NAME).delete(trackId);
  } catch (e) {}

  // 3. Delete from Firestore and record tombstone document
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_tracks', trackId);
      Promise.race([
        deleteDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 2500))
      ]).catch(err => {
        console.warn("Firestore background delete notice:", err);
      });

      // Record tombstone in Firestore so all other devices purge it
      const delDocRef = doc(firestore, 'public_deleted_tracks', trackId);
      setDoc(delDocRef, {
        id: trackId,
        deletedAt: Date.now(),
        deletedBy: user?.email || user?.uid || 'admin'
      }, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn("Firestore delete public track notice:", err);
    }
  }

  // 4. Dispatch global event so all UI components and lists reflect deletion instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_public_library_changed', { detail: { deletedId: trackId } }));
  }

  return true;
}
