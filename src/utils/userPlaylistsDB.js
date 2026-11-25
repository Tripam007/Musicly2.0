import { firestore } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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

export function getUserPersonalSongsStorageKey(user) {
  if (user && !user.isAnonymous && user.uid) {
    return `musicly_user_personal_songs_${user.uid}`;
  }
  return 'musicly_user_personal_songs_guest';
}

/**
 * Get user's personal song IDs (immediate 0ms sync read from local cache)
 */
export function getLocalUserPersonalSongIds(user) {
  const key = getUserPersonalSongsStorageKey(user);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Load user's personal song IDs (local cache + cloud sync for logged-in accounts)
 */
export async function loadUserPersonalSongIds(user) {
  const key = getUserPersonalSongsStorageKey(user);
  let songIds = getLocalUserPersonalSongIds(user);

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'personal_songs');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      if (snap && snap.exists()) {
        const cloudData = snap.data();
        if (Array.isArray(cloudData?.songIds)) {
          songIds = cloudData.songIds;
          localStorage.setItem(key, JSON.stringify(songIds));
        }
      }
    } catch (e) {
      console.warn("User personal songs cloud sync notice:", e);
    }
  }
  return Array.isArray(songIds) ? songIds : [];
}

/**
 * Save user's personal song IDs (local cache + cloud sync)
 */
export async function saveUserPersonalSongIds(songIds, user) {
  const key = getUserPersonalSongsStorageKey(user);
  const safeIds = Array.isArray(songIds) ? songIds : [];
  try {
    localStorage.setItem(key, JSON.stringify(safeIds));
  } catch (e) {
    console.warn("User personal songs local save notice:", e);
  }

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'personal_songs');
      setDoc(docRef, { songIds: safeIds, updatedAt: Date.now() }, { merge: true }).catch(err => {
        console.warn("User personal songs background cloud save notice:", err);
      });
    } catch (err) {
      console.warn("User personal songs cloud save notice:", err);
    }
  }
}

// ----------------------------------------------------
// ❤️ USER FAVORITES (Cross-Device Cloud Sync)
// ----------------------------------------------------

export function getUserFavoritesStorageKey(user) {
  if (user && !user.isAnonymous && user.uid) {
    return `musicly_favorites_${user.uid}`;
  }
  return 'musicly_favorites_guest';
}

export function getLocalUserFavorites(user) {
  const key = getUserFavoritesStorageKey(user);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    const guest = localStorage.getItem('musicly_favorites_guest');
    if (guest) return JSON.parse(guest);
  } catch (e) {}
  return ['lofi-1', 'indie-1'];
}

export async function loadUserFavorites(user) {
  const key = getUserFavoritesStorageKey(user);
  let favs = getLocalUserFavorites(user);

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      if (snap && snap.exists()) {
        const cloudData = snap.data();
        if (Array.isArray(cloudData?.trackIds)) {
          favs = cloudData.trackIds;
          localStorage.setItem(key, JSON.stringify(favs));
        }
      }
    } catch (e) {
      console.warn("User favorites cloud sync notice:", e);
    }
  }
  return Array.isArray(favs) ? favs : ['lofi-1', 'indie-1'];
}

export async function saveUserFavorites(favorites, user) {
  const key = getUserFavoritesStorageKey(user);
  const safeFavs = Array.isArray(favorites) ? favorites : [];
  try {
    localStorage.setItem(key, JSON.stringify(safeFavs));
  } catch (e) {}

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
      setDoc(docRef, { trackIds: safeFavs, updatedAt: Date.now() }, { merge: true }).catch(err => {
        console.warn("User favorites background cloud save notice:", err);
      });
    } catch (err) {
      console.warn("User favorites cloud save notice:", err);
    }
  }
}

export function subscribeUserFavorites(user, callback) {
  if (!user || user.isAnonymous || !user.uid || !firestore) return () => {};
  try {
    const key = getUserFavoritesStorageKey(user);
    const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.trackIds)) {
          localStorage.setItem(key, JSON.stringify(data.trackIds));
          if (typeof callback === 'function') {
            callback(data.trackIds);
          }
        }
      }
    }, (err) => console.warn("User favorites subscription notice:", err));
    return unsub;
  } catch (e) {
    console.warn("User favorites subscription failed:", e);
    return () => {};
  }
}

// ----------------------------------------------------
// 🔀 USER CUSTOM QUEUE ORDER (Cross-Device Cloud Sync)
// ----------------------------------------------------

export function getUserQueueOrderStorageKey(user) {
  if (user && !user.isAnonymous && user.uid) {
    return `musicly_custom_queue_order_${user.uid}`;
  }
  return 'musicly_custom_queue_order';
}

export function getLocalUserQueueOrder(user) {
  try {
    if (user && !user.isAnonymous && user.uid) {
      const userRaw = localStorage.getItem(`musicly_custom_queue_order_${user.uid}`);
      if (userRaw) return JSON.parse(userRaw);
    }
    const legacyRaw = localStorage.getItem('musicly_custom_queue_order');
    if (legacyRaw) return JSON.parse(legacyRaw);
  } catch (e) {}
  return [];
}

export async function loadUserQueueOrder(user) {
  let order = getLocalUserQueueOrder(user);
  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      if (snap && snap.exists()) {
        const cloudData = snap.data();
        if (Array.isArray(cloudData?.trackOrder)) {
          order = cloudData.trackOrder;
          const userKey = getUserQueueOrderStorageKey(user);
          localStorage.setItem(userKey, JSON.stringify(order));
          localStorage.setItem('musicly_custom_queue_order', JSON.stringify(order));
        }
      }
    } catch (e) {
      console.warn("User queue order cloud sync notice:", e);
    }
  }
  return Array.isArray(order) ? order : [];
}

export async function saveUserQueueOrder(trackOrder, user) {
  const safeOrder = Array.isArray(trackOrder) ? trackOrder : [];
  try {
    const userKey = getUserQueueOrderStorageKey(user);
    localStorage.setItem(userKey, JSON.stringify(safeOrder));
    localStorage.setItem('musicly_custom_queue_order', JSON.stringify(safeOrder));
  } catch (e) {}

  if (user && !user.isAnonymous && user.uid && firestore) {
    try {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
      setDoc(docRef, { trackOrder: safeOrder, updatedAt: Date.now() }, { merge: true }).catch(err => {
        console.warn("User queue order background cloud save notice:", err);
      });
    } catch (err) {
      console.warn("User queue order cloud save notice:", err);
    }
  }
}

export function subscribeUserQueueOrder(user, callback) {
  if (!user || user.isAnonymous || !user.uid || !firestore) return () => {};
  try {
    const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.trackOrder)) {
          const userKey = getUserQueueOrderStorageKey(user);
          localStorage.setItem(userKey, JSON.stringify(data.trackOrder));
          localStorage.setItem('musicly_custom_queue_order', JSON.stringify(data.trackOrder));
          if (typeof callback === 'function') {
            callback(data.trackOrder);
          }
        }
      }
    }, (err) => console.warn("User queue order subscription notice:", err));
    return unsub;
  } catch (e) {
    console.warn("User queue order subscription failed:", e);
    return () => {};
  }
}
