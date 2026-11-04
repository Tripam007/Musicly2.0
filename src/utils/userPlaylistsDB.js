import { firestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function getUserPlaylistStorageKey(user) {
  if (user && !user.isAnonymous && user.uid) {
    return `musicly_user_custom_playlists_${user.uid}`;
  }
  return 'musicly_user_custom_playlists_guest';
}

/**
 * Get cached user playlists immediately (0ms sync read)
 */
export function getLocalUserPlaylists(user) {
  const storageKey = getUserPlaylistStorageKey(user);
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Load user's private playlists (instant local cache + cloud sync for logged-in users)
 */
export async function loadUserPlaylists(user) {
  const storageKey = getUserPlaylistStorageKey(user);
  let playlists = getLocalUserPlaylists(user);

  // Cloud sync for authenticated users
  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'custom_playlists');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);

      if (snap && snap.exists()) {
        const cloudData = snap.data();
        if (Array.isArray(cloudData?.playlists)) {
          playlists = cloudData.playlists;
          localStorage.setItem(storageKey, JSON.stringify(playlists));
        }
      }
    } catch (err) {
      console.warn("User playlists cloud sync notice:", err);
    }
  }

  return Array.isArray(playlists) ? playlists : [];
}

/**
 * Save user's private playlists (local cache + cloud sync)
 */
export async function saveUserPlaylists(playlists, user) {
  const storageKey = getUserPlaylistStorageKey(user);
  const safePlaylists = Array.isArray(playlists) ? playlists : [];

  try {
    localStorage.setItem(storageKey, JSON.stringify(safePlaylists));
  } catch (e) {
    console.warn("User playlists local save notice:", e);
  }

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'custom_playlists');
      await Promise.race([
        setDoc(docRef, { playlists: safePlaylists, updatedAt: Date.now() }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("User playlists cloud save notice:", err);
    }
  }
}
