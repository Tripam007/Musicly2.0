import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { checkIsAdmin } from './userModel';

const PLAYLISTS_CACHE_KEY = 'musicly_public_playlists_cache';

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
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can update official Musicly playlists.");
  }

  let updatedPlaylist = null;

  try {
    const existing = JSON.parse(localStorage.getItem(PLAYLISTS_CACHE_KEY) || '[]');
    const updated = existing.map(p => {
      if (p.id === playlistId) {
        updatedPlaylist = { ...p, ...updates, updatedAt: Date.now() };
        return updatedPlaylist;
      }
      return p;
    });
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
  if (!checkIsAdmin(user)) {
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

