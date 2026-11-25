import { firestore } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { checkIsAdmin } from './userModel';

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

  if (firestore) {
    try {
      // 1. Check public_settings/admin_favorites (always accessible without permission restrictions)
      const adminFavRef = doc(firestore, 'public_settings', 'admin_favorites');
      const adminFavSnap = await getDoc(adminFavRef).catch(() => null);
      if (adminFavSnap && adminFavSnap.exists()) {
        const cloudData = adminFavSnap.data();
        if (Array.isArray(cloudData?.trackIds) && cloudData.trackIds.length > 0) {
          favs = cloudData.trackIds;
          localStorage.setItem(key, JSON.stringify(favs));
        }
      }

      // 2. If authenticated, check user's private favorites document
      if (user && !user.isAnonymous && user.uid) {
        const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
        const snap = await getDoc(docRef).catch(() => null);
        if (snap && snap.exists()) {
          const cloudData = snap.data();
          if (Array.isArray(cloudData?.trackIds) && cloudData.trackIds.length > 0) {
            favs = cloudData.trackIds;
            localStorage.setItem(key, JSON.stringify(favs));
          }
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

  if (firestore) {
    const payload = { trackIds: safeFavs, updatedAt: Date.now() };

    // 1. Save to user private document if logged in
    if (user && !user.isAnonymous && user.uid) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
        setDoc(docRef, payload, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    // 2. If admin, ALSO save to public_settings/admin_favorites so all devices immediately get it
    if (checkIsAdmin(user)) {
      try {
        const adminDocRef = doc(firestore, 'public_settings', 'admin_favorites');
        setDoc(adminDocRef, payload, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  }
}

export function subscribeUserFavorites(user, callback) {
  if (!firestore) return () => {};
  const unsubs = [];
  const key = getUserFavoritesStorageKey(user);

  try {
    // 1. Subscribe to public_settings/admin_favorites (always works across all devices & sessions)
    const adminDocRef = doc(firestore, 'public_settings', 'admin_favorites');
    const unsubAdmin = onSnapshot(adminDocRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.trackIds) && data.trackIds.length > 0) {
          localStorage.setItem(key, JSON.stringify(data.trackIds));
          if (typeof callback === 'function') {
            callback(data.trackIds);
          }
        }
      }
    }, () => {});
    unsubs.push(unsubAdmin);

    // 2. If authenticated, also subscribe to user private favorites
    if (user && !user.isAnonymous && user.uid) {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'favorites');
      const unsubUser = onSnapshot(docRef, (snap) => {
        if (snap && snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.trackIds) && data.trackIds.length > 0) {
            localStorage.setItem(key, JSON.stringify(data.trackIds));
            if (typeof callback === 'function') {
              callback(data.trackIds);
            }
          }
        }
      }, () => {});
      unsubs.push(unsubUser);
    }

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (_e) {}
      });
    };
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
  return ['public-1795609929694', 'public-1795606194436'];
}

export async function loadUserQueueOrder(user) {
  let order = getLocalUserQueueOrder(user);

  if (firestore) {
    try {
      // 1. Check public_settings/admin_queue_order
      const adminQueueRef = doc(firestore, 'public_settings', 'admin_queue_order');
      const adminQueueSnap = await getDoc(adminQueueRef).catch(() => null);
      if (adminQueueSnap && adminQueueSnap.exists()) {
        const cloudData = adminQueueSnap.data();
        if (Array.isArray(cloudData?.trackOrder) && cloudData.trackOrder.length > 0) {
          order = cloudData.trackOrder;
          const userKey = getUserQueueOrderStorageKey(user);
          localStorage.setItem(userKey, JSON.stringify(order));
          localStorage.setItem('musicly_custom_queue_order', JSON.stringify(order));
        }
      }

      // 2. If authenticated, check user's private queue order document
      if (user && !user.isAnonymous && user.uid) {
        const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
        const snap = await getDoc(docRef).catch(() => null);
        if (snap && snap.exists()) {
          const cloudData = snap.data();
          if (Array.isArray(cloudData?.trackOrder) && cloudData.trackOrder.length > 0) {
            order = cloudData.trackOrder;
            const userKey = getUserQueueOrderStorageKey(user);
            localStorage.setItem(userKey, JSON.stringify(order));
            localStorage.setItem('musicly_custom_queue_order', JSON.stringify(order));
          }
        }
      }
    } catch (e) {
      console.warn("User queue order cloud sync notice:", e);
    }
  }

  // Ensure Tu Aake Dekhle and Despacito lead if not explicitly elsewhere
  if (Array.isArray(order) && order.length > 0) {
    return order;
  }
  return ['public-1795609929694', 'public-1795606194436'];
}

export async function saveUserQueueOrder(trackOrder, user) {
  const safeOrder = Array.isArray(trackOrder) ? trackOrder : [];
  try {
    const userKey = getUserQueueOrderStorageKey(user);
    localStorage.setItem(userKey, JSON.stringify(safeOrder));
    localStorage.setItem('musicly_custom_queue_order', JSON.stringify(safeOrder));
  } catch (e) {}

  if (firestore && safeOrder.length > 0) {
    const payload = { trackOrder: safeOrder, updatedAt: Date.now() };

    // 1. User private doc
    if (user && !user.isAnonymous && user.uid) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
        setDoc(docRef, payload, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    // 2. Admin public doc
    if (checkIsAdmin(user)) {
      try {
        const adminDocRef = doc(firestore, 'public_settings', 'admin_queue_order');
        setDoc(adminDocRef, payload, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  }
}

export function subscribeUserQueueOrder(user, callback) {
  if (!firestore) return () => {};
  const unsubs = [];
  const userKey = getUserQueueOrderStorageKey(user);

  try {
    // 1. Subscribe to public_settings/admin_queue_order
    const adminDocRef = doc(firestore, 'public_settings', 'admin_queue_order');
    const unsubAdmin = onSnapshot(adminDocRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.trackOrder) && data.trackOrder.length > 0) {
          localStorage.setItem(userKey, JSON.stringify(data.trackOrder));
          localStorage.setItem('musicly_custom_queue_order', JSON.stringify(data.trackOrder));
          if (typeof callback === 'function') {
            callback(data.trackOrder);
          }
        }
      }
    }, () => {});
    unsubs.push(unsubAdmin);

    // 2. If authenticated, also subscribe to user private queue order
    if (user && !user.isAnonymous && user.uid) {
      const docRef = doc(firestore, 'users', user.uid, 'user_data', 'queue_order');
      const unsubUser = onSnapshot(docRef, (snap) => {
        if (snap && snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.trackOrder) && data.trackOrder.length > 0) {
            localStorage.setItem(userKey, JSON.stringify(data.trackOrder));
            localStorage.setItem('musicly_custom_queue_order', JSON.stringify(data.trackOrder));
            if (typeof callback === 'function') {
              callback(data.trackOrder);
            }
          }
        }
      }, () => {});
      unsubs.push(unsubUser);
    }

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (_e) {}
      });
    };
  } catch (e) {
    console.warn("User queue order subscription failed:", e);
    return () => {};
  }
}
