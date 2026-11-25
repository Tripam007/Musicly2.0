import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  onSnapshot 
} from 'firebase/firestore';
import { checkIsAdmin } from './userModel';
import { extractYouTubeId } from './youtubePlayer';
import { generateInstantAudioBlob } from './audioDownloader';
import { resolveOriginalTrack } from './originalTrackResolver';
import { deduplicateTracks } from './trackDeduplicator';
import { TRACKS } from '../data/tracks';

const PUBLIC_CACHE_KEY = 'musicly_public_tracks_cache';
const PENDING_SYNC_KEY = 'musicly_pending_cloud_sync';
const PUBLIC_STORE_NAME = 'public_audio_tracks';
const PUBLIC_DB_NAME = 'MusiclyPublicDB';
const PUBLIC_DB_VERSION = 1;

/**
 * Queue a track payload that failed or timed out during cloud sync
 */
export function queuePendingCloudSync(trackId, cloudData) {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[trackId] = cloudData;
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(map));
  } catch (e) {}
}

/**
 * Flush any queued pending public track uploads to Firestore
 */
export async function flushPendingCloudSync() {
  if (!firestore) return;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    const keys = Object.keys(map);
    if (keys.length === 0) return;

    for (const id of keys) {
      try {
        const docRef = doc(firestore, 'public_tracks', id);
        await setDoc(docRef, map[id], { merge: true });
        delete map[id];
      } catch (e) {}
    }
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(map));
  } catch (e) {}
}

// Automatically flush pending items when device comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingCloudSync().catch(() => {});
  });
}

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
export const INITIAL_PURGED_IDS = [
  'public-1793379777672',
  'public-1793721929599',
  'public-1795454707151',
  'public-1793823416101',
  'public-1795173965201',
  'public-1795508538689',
  'public-1795509305132',
  'public-1795545004295',
  'public-1793715924955',
  'public-1794244862690',
  'public-1795517859484',
  'public-1794339646322',
  'public-1795459224536',
  'public-1794207269734',
  'public-1794207491058',
  'public-1794207643251',
  'public-1795096374464',
  'public-1795286966892'
];

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
      // Sync cloud deleted tombstones from public_settings/deleted_tracks
      try {
        const delDoc = await getDoc(doc(firestore, 'public_settings', 'deleted_tracks'));
        if (delDoc && delDoc.exists()) {
          const cloudDeleted = delDoc.data()?.deletedTrackIds;
          if (Array.isArray(cloudDeleted)) {
            cloudDeleted.forEach(id => {
              deletedIds.add(id);
              markPublicTrackDeleted(id);
            });
          }
        }
      } catch (_delErr) {}

      const publicColRef = collection(firestore, 'public_tracks');
      const snap = await Promise.race([
        getDocs(publicColRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 12000))
      ]);
      if (!snap.empty) {
        const cloudTracks = [];
        snap.forEach(d => {
          const data = d.data();
          // STRICT FILTER: Never include playlists or studio posters in song lists
          if (
            d.id.startsWith('poster-') ||
            d.id.startsWith('musicly_pl_') ||
            d.id === 'country_roots' ||
            d.id === 'gym_workout' ||
            data.isPlaylist ||
            !data.artist
          ) {
            return;
          }
          if (data && data.id && !deletedIds.has(data.id)) {
            cloudTracks.push({ ...data, isPublic: true });
          }
        });

        if (cloudTracks.length > 0) {
          // Authoritative merge: cloudTracks is authoritative for all public songs
          const authMap = new Map();
          cloudTracks.forEach(ct => {
            if (!deletedIds.has(ct.id)) authMap.set(ct.id, ct);
          });
          SEED_PUBLIC_TRACKS.forEach(s => {
            if (!deletedIds.has(s.id) && !authMap.has(s.id)) {
              authMap.set(s.id, s);
            }
          });
          merged = Array.from(authMap.values());

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

  // 3. Write to Firestore /public_tracks in background with durable retry
  if (firestore) {
    try {
      const { blob: _, ...cloudData } = record;
      const cleanCloudData = JSON.parse(JSON.stringify(cloudData));
      const docRef = doc(firestore, 'public_tracks', trackId);
      setDoc(docRef, cleanCloudData, { merge: true }).catch(err => {
        console.warn("Firestore background publish retry notice:", err);
        queuePendingCloudSync(trackId, cleanCloudData);
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
      const cleanCloudData = JSON.parse(JSON.stringify(cloudData));
      const docRef = doc(firestore, 'public_tracks', trackId);
      updateDoc(docRef, cleanCloudData).catch(err => {
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
      deleteDoc(docRef).catch(err => {
        console.warn("Firestore background delete notice:", err);
      });

      // Record tombstone in Firestore so all other devices purge it
      const delDocRef = doc(firestore, 'public_deleted_tracks', trackId);
      setDoc(delDocRef, {
        id: trackId,
        deletedAt: Date.now(),
        deletedBy: user?.email || user?.uid || 'admin'
      }, { merge: true }).catch(() => {});

      // Also record in central public_settings/deleted_tracks
      const centralDelRef = doc(firestore, 'public_settings', 'deleted_tracks');
      getDoc(centralDelRef).then(snap => {
        const currentList = snap.exists() ? (snap.data()?.deletedTrackIds || []) : [];
        if (!currentList.includes(trackId)) {
          setDoc(centralDelRef, {
            deletedTrackIds: [...currentList, trackId],
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        }
      }).catch(() => {});
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

/**
 * Format a single public track record consistently for runtime playback & display
 */
export function formatPublicTrack(t, deletedIds = new Set()) {
  if (!t || !t.id || deletedIds.has(t.id)) return null;

  const ytId = t.youtubeId || extractYouTubeId(t.audioUrl || '');
  const isYt = !!t.isYouTube || !!ytId;

  let finalAudioUrl = t.audioUrl || '';
  if (t.blob instanceof Blob) {
    finalAudioUrl = URL.createObjectURL(t.blob);
  } else if (isYt && ytId) {
    finalAudioUrl = `https://www.youtube.com/watch?v=${ytId}`;
  }

  const genresList = Array.isArray(t.genres) && t.genres.length > 0
    ? t.genres
    : (t.genre ? t.genre.split(',').map(s => s.trim()) : ['Lo-Fi']);

  return {
    ...t,
    isPublic: true,
    isCustom: false,
    isYouTube: isYt,
    youtubeId: ytId || null,
    audioUrl: finalAudioUrl,
    genre: genresList.join(', '),
    genres: genresList,
    language: t.language || 'English',
    cover: t.cover || (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80')
  };
}

/**
 * Subscribe to real-time changes to the public music library in Firestore.
 * Automatically synchronizes new songs, metadata edits, and deletions across all devices.
 * Uses real-time snapshot documents directly for instant 0ms cross-device synchronization.
 */
export function subscribePublicTracks(callback) {
  if (!firestore) return () => {};
  try {
    const colRef = collection(firestore, 'public_tracks');
    const unsubTracks = onSnapshot(colRef, async (snapshot) => {
      try {
        const deletedIds = getDeletedPublicTrackIds();
        const cloudTracks = [];
        snapshot.forEach(d => {
          const data = d.data();
          // STRICT FILTER: Exclude playlists and studio posters from song list
          if (
            d.id.startsWith('poster-') ||
            d.id.startsWith('musicly_pl_') ||
            d.id === 'country_roots' ||
            d.id === 'gym_workout' ||
            data.isPlaylist ||
            !data.artist
          ) {
            return;
          }
          if (data && data.id && !deletedIds.has(data.id)) {
            cloudTracks.push({ ...data, isPublic: true });
          }
        });

        // Authoritative synchronization: Cloud Firestore is the canonical truth for all public songs
        const mergedMap = new Map();

        // 1. Put cloud tracks (authoritative)
        cloudTracks.forEach(ct => {
          if (!deletedIds.has(ct.id)) {
            mergedMap.set(ct.id, { ...ct, isPublic: true });
          }
        });

        // 2. Ensure seed tracks are included if not deleted
        SEED_PUBLIC_TRACKS.forEach(s => {
          if (!deletedIds.has(s.id) && !mergedMap.has(s.id)) {
            mergedMap.set(s.id, s);
          }
        });

        const sanitized = Array.from(mergedMap.values())
          .map(t => formatPublicTrack(t, deletedIds))
          .filter(Boolean);

        saveLocalPublicTracks(sanitized);

        // Update IndexedDB in background
        openPublicDB().then(db => {
          const tx = db.transaction(PUBLIC_STORE_NAME, 'readwrite');
          const store = tx.objectStore(PUBLIC_STORE_NAME);
          cloudTracks.forEach(t => {
            if (!deletedIds.has(t.id)) store.put(t);
          });
        }).catch(() => {});

        if (typeof callback === 'function') {
          callback(sanitized);
        }
      } catch (e) {
        console.warn("Public tracks real-time sync notice:", e);
      }
    }, (err) => console.warn("Public tracks subscription notice:", err));

    return unsubTracks;
  } catch (err) {
    console.warn("Could not attach public tracks subscription:", err);
    return () => {};
  }
}

/**
 * 🔄 AUTO-RECONCILIATION:
 * Scans all local storage keys and IndexedDB on the current device. If any public or custom track
 * exists locally on Device A but is missing in Cloud Firestore, this function automatically uploads
 * them to Firestore /public_tracks so ALL other devices immediately receive and sync them.
 * Also synchronizes the user's master favorites list and custom queue order to public_settings.
 */
export async function reconcileLocalPublicTracksToCloud(user) {
  if (!checkIsAdmin(user) || !firestore) return 0;

  try {
    await flushPendingCloudSync();

    const deletedIds = getDeletedPublicTrackIds();

    // Sync cloud deleted tombstones before scanning
    try {
      const delDoc = await getDoc(doc(firestore, 'public_settings', 'deleted_tracks'));
      if (delDoc && delDoc.exists()) {
        const cloudDeleted = delDoc.data()?.deletedTrackIds;
        if (Array.isArray(cloudDeleted)) {
          cloudDeleted.forEach(id => deletedIds.add(id));
        }
      }
    } catch (_delErr) {}

    const catalogIdSet = new Set(TRACKS.map(t => t.id));
    const allCandidateMap = new Map();

    // 1. Scan getLocalPublicTracks()
    const localTracks = getLocalPublicTracks();
    localTracks.forEach(t => {
      if (
        t && t.id && 
        !deletedIds.has(t.id) &&
        !catalogIdSet.has(t.id) &&
        !t.id.startsWith('poster-') &&
        !t.id.startsWith('musicly_pl_') &&
        t.id !== 'country_roots' &&
        t.id !== 'gym_workout' &&
        !t.isPlaylist &&
        t.artist
      ) {
        allCandidateMap.set(t.id, t);
      }
    });

    // 2. Scan MusiclyPublicDB
    try {
      const db = await openPublicDB();
      const idbTracks = await new Promise((resolve) => {
        const tx = db.transaction(PUBLIC_STORE_NAME, 'readonly');
        const store = tx.objectStore(PUBLIC_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      idbTracks.forEach(t => {
        if (
          t && t.id && 
          !deletedIds.has(t.id) &&
          !catalogIdSet.has(t.id) &&
          !t.id.startsWith('poster-') &&
          !t.id.startsWith('musicly_pl_') &&
          t.id !== 'country_roots' &&
          t.id !== 'gym_workout' &&
          !t.isPlaylist &&
          t.artist
        ) {
          allCandidateMap.set(t.id, { ...(allCandidateMap.get(t.id) || {}), ...t });
        }
      });
    } catch (_idbErr) {}

    // Fetch existing public track IDs in Firestore
    const publicColRef = collection(firestore, 'public_tracks');
    const snap = await getDocs(publicColRef);
    const existingCloudIds = new Set();
    snap.forEach(d => existingCloudIds.add(d.id));

    // Upload any missing tracks to Cloud Firestore
    let syncedCount = 0;
    for (const [id, track] of allCandidateMap.entries()) {
      if (!existingCloudIds.has(id) && !deletedIds.has(id)) {
        const { blob: _, ...cleanData } = track;
        const cleanCloudData = JSON.parse(JSON.stringify({
          ...cleanData,
          id: id,
          isPublic: true,
          reconciledAt: Date.now(),
          publishedBy: user.email || user.uid || 'admin'
        }));

        try {
          const docRef = doc(firestore, 'public_tracks', id);
          await setDoc(docRef, cleanCloudData, { merge: true });
          syncedCount++;
          console.log(`[Musicly Sync] Reconciled track to cloud: ${track.title || id} (${id})`);
        } catch (uploadErr) {
          console.warn(`[Musicly Sync] Failed to reconcile ${id}:`, uploadErr);
        }
      }
    }

    // 5. Reconcile master favorites to public_settings and user_data
    if (typeof localStorage !== 'undefined') {
      try {
        let bestFavs = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('favorites')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(parsed) && parsed.length > bestFavs.length) {
                bestFavs = parsed;
              }
            } catch (_e) {}
          }
        }

        if (bestFavs.length > 2) {
          const favPayload = { trackIds: bestFavs, updatedAt: Date.now() };
          const adminFavRef = doc(firestore, 'public_settings', 'admin_favorites');
          await setDoc(adminFavRef, favPayload, { merge: true }).catch(() => {});
          if (user?.uid) {
            const userFavRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
            await setDoc(userFavRef, favPayload, { merge: true }).catch(() => {});
          }
          console.log(`[Musicly Sync] Reconciled ${bestFavs.length} favorites to cloud.`);
        }
      } catch (_favErr) {}
    }

    // 6. Reconcile master queue order to public_settings and user_data
    if (typeof localStorage !== 'undefined') {
      try {
        let bestOrder = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('queue_order')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(parsed) && parsed.length > bestOrder.length) {
                bestOrder = parsed;
              }
            } catch (_e) {}
          }
        }

        if (bestOrder.length > 0) {
          const orderPayload = { trackOrder: bestOrder, updatedAt: Date.now() };
          const adminOrderRef = doc(firestore, 'public_settings', 'admin_queue_order');
          await setDoc(adminOrderRef, orderPayload, { merge: true }).catch(() => {});
          if (user?.uid) {
            const userOrderRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
            await setDoc(userOrderRef, orderPayload, { merge: true }).catch(() => {});
          }
          console.log(`[Musicly Sync] Reconciled queue order to cloud.`);
        }
      } catch (_orderErr) {}
    }

    return syncedCount;
  } catch (err) {
    console.warn("reconcileLocalPublicTracksToCloud notice:", err);
    return 0;
  }
}

