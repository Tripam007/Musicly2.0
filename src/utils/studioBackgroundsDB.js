// IndexedDB Storage Utility for Minimal Studio Background Visuals (Supporting 4K UHD Images & Live Video Wallpapers)

import { isLiveVisual, compressImageIfNeeded } from './publicScenesDB';
import { firestore } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { broadcastStudioVisual } from './realtimeRelay';

const DB_NAME = 'MusiclyStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'studio_backgrounds';
const KEY = 'current_gallery';
const KEY_CUSTOM_POOL = 'user_custom_studio_wallpapers';

export const DEFAULT_STUDIO_PHOTOS = [
  {
    id: 'wallpaper-route-66',
    url: '/assets/wallpapers/route_66.png',
    title: 'Route 66 Sunset Roadside',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-astronaut',
    url: '/assets/wallpapers/astronaut_neon.png',
    title: 'Neon Astronaut in Space',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-luffy',
    url: '/assets/wallpapers/luffy_anime.jpg',
    title: 'Monkey D. Luffy',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-gojo',
    url: '/assets/wallpapers/gojo_satoru.jpg',
    title: 'Gojo Satoru',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-red-eclipse',
    url: '/assets/wallpapers/red_eclipse_crown.png',
    title: 'Red Eclipse Crown',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-lone-knight',
    url: '/assets/wallpapers/lone_knight.png',
    title: 'Lone Knight Beneath Stormy Skies',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-zenitsu',
    url: '/assets/images/zenitsu_clean_wallpaper.jpg',
    title: 'Agatsuma Zenitsu',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-brad-pitt',
    url: '/assets/wallpapers/brad_pitt.jpg',
    title: "It's Not About Money - Cliff Booth",
    is4K: true,
    isDefault: true
  }
];

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieve user custom-uploaded background visuals from permanent IndexedDB pool
 */
export async function getCustomStudioPool() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CUSTOM_POOL);
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Permanently save user custom-uploaded background visuals into IndexedDB pool
 */
export async function saveCustomStudioPool(pool) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(Array.isArray(pool) ? pool : [], KEY_CUSTOM_POOL);
  } catch (err) {
    console.warn('Error saving custom studio pool:', err);
  }
}

/**
 * Load all backgrounds from IndexedDB, ensuring all custom uploaded visuals are permanently preserved
 */
export async function getStudioBackgrounds() {
  try {
    // Auto-migration: Purge any old mockup screenshots so clean 4K curated wallpapers take effect immediately
    const MIGRATION_KEY = 'musicly_studio_bg_v12_curated_wallpapers_8';
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
      try {
        localStorage.setItem(MIGRATION_KEY, 'true');
        localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(DEFAULT_STUDIO_PHOTOS));
        localStorage.setItem('musicly_studio_bg_index', '6');
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(DEFAULT_STUDIO_PHOTOS, KEY);
      } catch (e) {}
      return DEFAULT_STUDIO_PHOTOS;
    }

    const db = await openDB();
    const customPool = await getCustomStudioPool();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);

      req.onsuccess = () => {
        let baseList = [];
        if (Array.isArray(req.result) && req.result.length > 0) {
          baseList = req.result;
        } else {
          try {
            const local = localStorage.getItem('musicly_studio_bg_gallery');
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                baseList = parsed;
              }
            }
          } catch (e) {}
          if (baseList.length === 0) baseList = DEFAULT_STUDIO_PHOTOS;
        }

        // Always guarantee that any custom uploaded visual is permanently preserved at the front
        const customUrls = new Set(customPool.map(c => typeof c === 'string' ? c : (c?.url || c?.id)));
        const nonCustom = baseList.filter(item => {
          const u = typeof item === 'string' ? item : (item?.url || item?.id);
          return !customUrls.has(u);
        });
        const combined = [...customPool, ...nonCustom];
        resolve(combined);
      };

      req.onerror = () => {
        resolve(customPool.length > 0 ? [...customPool, ...DEFAULT_STUDIO_PHOTOS] : DEFAULT_STUDIO_PHOTOS);
      };
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, using defaults:', err);
    try {
      const local = localStorage.getItem('musicly_studio_bg_gallery');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_STUDIO_PHOTOS;
  }
}

/**
 * Save current list of backgrounds to IndexedDB and localStorage (for fast init),
 * permanently isolating user custom uploads into KEY_CUSTOM_POOL so cloud snapshots
 * can never overwrite or remove them.
 */
export async function saveStudioBackgrounds(imagesList) {
  if (!Array.isArray(imagesList)) return;

  // 1. Permanently isolate custom-uploaded visuals into KEY_CUSTOM_POOL
  const defaultUrls = new Set(DEFAULT_STUDIO_PHOTOS.map(d => d.url));
  const customItems = imagesList.filter(item => {
    if (!item) return false;
    const u = typeof item === 'string' ? item : (item?.url || '');
    const id = typeof item === 'string' ? '' : (item?.id || '');
    return (
      item.isCustom === true ||
      id.startsWith('bg-') ||
      id.startsWith('custom-') ||
      (typeof u === 'string' && (u.startsWith('data:') || u.startsWith('blob:'))) ||
      !defaultUrls.has(u)
    );
  });
  await saveCustomStudioPool(customItems);

  // 2. Save full gallery list to IndexedDB
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(imagesList, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.warn('Error saving to IndexedDB:', err);
  }

  // 3. Backup non-massive items to localStorage for instant synchronous boot
  try {
    const safeForLocalStorage = imagesList.filter(item => {
      const u = typeof item === 'string' ? item : (item?.url || '');
      return !u.startsWith('data:') || u.length < 500000;
    });
    localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(safeForLocalStorage));
  } catch (e) {}

  // 4. Broadcast sync event so all open views update in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
      detail: { count: imagesList.length }
    }));
  }

  // 5. Broadcast via realtime relay (instant cross-device SSE & pub-sub)
  broadcastStudioVisual(undefined, imagesList).catch(() => {});

  // 6. Persist to Firestore cloud safely (keeping payload well under the 1MB Firestore limit)
  if (firestore) {
    (async () => {
      try {
        const compressedList = [];
        let totalPayloadBytes = 0;
        for (const item of imagesList) {
          const u = typeof item === 'string' ? item : (item?.url || '');
          if (u.startsWith('data:')) {
            // Compress data URL for cloud sync if space allows (< 400KB total)
            if (totalPayloadBytes < 400000) {
              const c = await compressImageIfNeeded(u, 1280, 0.75);
              totalPayloadBytes += c.length;
              compressedList.push(typeof item === 'string' ? c : { ...item, url: c });
            }
          } else {
            compressedList.push(item);
          }
        }
        const docRef = doc(firestore, 'public_settings', 'studio_gallery');
        await setDoc(docRef, {
          gallery: compressedList,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore studio gallery save notice:', err);
      }
    })();
  }
}

/**
 * Set active studio background index and broadcast update event locally and to Firestore
 */
export function setActiveStudioBackgroundIndex(idx) {
  try {
    localStorage.setItem('musicly_studio_bg_index', String(idx));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
        detail: { activeIndex: idx }
      }));
    }
  } catch (e) {}

  // Broadcast via realtime relay (instant cross-device SSE & pub-sub)
  broadcastStudioVisual(idx).catch(() => {});

  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_settings', 'studio_active_visual');
      setDoc(docRef, {
        activeIndex: idx,
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});
    } catch {}
  }
}

/**
 * Subscribe to real-time studio background updates (gallery + active visual) from Firestore.
 * Always merges cloud updates with local custom uploaded visuals so user uploads are NEVER deleted!
 */
export function subscribeStudioBackgrounds(callback) {
  if (!firestore) return () => {};
  let unsubGallery = null;
  let unsubActive = null;

  try {
    const galleryDocRef = doc(firestore, 'public_settings', 'studio_gallery');
    unsubGallery = onSnapshot(galleryDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.gallery) && data.gallery.length > 0) {
          // CRITICAL: Load local custom uploaded visuals and merge them in front
          const localCustoms = await getCustomStudioPool();
          const customUrls = new Set(localCustoms.map(c => typeof c === 'string' ? c : (c?.url || c?.id)));
          const nonCustomFromCloud = data.gallery.filter(cg => {
            const u = typeof cg === 'string' ? cg : (cg?.url || cg?.id);
            return !customUrls.has(u);
          });
          const mergedGallery = [...localCustoms, ...nonCustomFromCloud];

          openDB().then((db) => {
            if (db) {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(mergedGallery, KEY);
            }
          }).catch(() => {});

          try {
            const safeForLocalStorage = mergedGallery.filter(item => {
              const u = typeof item === 'string' ? item : (item?.url || '');
              return !u.startsWith('data:') || u.length < 500000;
            });
            localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(safeForLocalStorage));
          } catch {}

          if (typeof callback === 'function') {
            callback({ backgrounds: mergedGallery });
          }
        }
      }
    }, (err) => console.warn('Studio gallery subscription notice:', err));

    const activeDocRef = doc(firestore, 'public_settings', 'studio_active_visual');
    unsubActive = onSnapshot(activeDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data?.activeIndex === 'number') {
          try {
            localStorage.setItem('musicly_studio_bg_index', String(data.activeIndex));
          } catch {}
          if (typeof callback === 'function') {
            callback({ activeIndex: data.activeIndex });
          }
        }
      }
    }, (err) => console.warn('Studio active visual subscription notice:', err));

    return () => {
      if (unsubGallery) unsubGallery();
      if (unsubActive) unsubActive();
    };
  } catch (err) {
    console.warn('Could not attach studio backgrounds subscription:', err);
    return () => {};
  }
}

/**
 * Get active studio background index
 */
export function getActiveStudioBackgroundIndex() {
  try {
    const val = localStorage.getItem('musicly_studio_bg_index');
    return val !== null ? parseInt(val, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Add a new background visual to the front of the list, save, and activate it
 */
export async function addStudioBackground(newBg) {
  try {
    const current = await getStudioBackgrounds();
    const next = [newBg, ...current.filter(item => {
      const u = typeof item === 'string' ? item : (item?.url || '');
      const newU = typeof newBg === 'string' ? newBg : (newBg?.url || '');
      return u !== newU;
    })];
    await saveStudioBackgrounds(next);
    setActiveStudioBackgroundIndex(0);
    return next;
  } catch (err) {
    console.error('Failed to add studio background:', err);
    throw err;
  }
}

/**
 * Remove a background visual by index (removing from both current gallery and custom pool)
 */
export async function removeStudioBackground(indexToRemove) {
  try {
    const current = await getStudioBackgrounds();
    if (current.length <= 1) return current;
    const itemToRemove = current[indexToRemove];
    const removeUrl = typeof itemToRemove === 'string' ? itemToRemove : (itemToRemove?.url || itemToRemove?.id);

    const next = current.filter((_, idx) => idx !== indexToRemove);

    // Also remove from custom pool if it was a custom visual
    const customPool = await getCustomStudioPool();
    const updatedCustom = customPool.filter(c => {
      const u = typeof c === 'string' ? c : (c?.url || c?.id);
      return u !== removeUrl;
    });
    await saveCustomStudioPool(updatedCustom);

    await saveStudioBackgrounds(next);
    const activeIdx = getActiveStudioBackgroundIndex();
    if (activeIdx >= indexToRemove && activeIdx > 0) {
      setActiveStudioBackgroundIndex(activeIdx - 1);
    } else {
      setActiveStudioBackgroundIndex(0);
    }
    return next;
  } catch (err) {
    console.error('Failed to remove studio background:', err);
    throw err;
  }
}

/**
 * Hard reset studio background gallery to pristine official default visuals (preserving custom uploads)
 */
export async function resetStudioBackgroundsToDefaults() {
  try {
    localStorage.removeItem('musicly_studio_bg_gallery');
    localStorage.setItem('musicly_studio_bg_index', '0');

    // Preserve custom uploads while restoring clean official default presets
    const customPool = await getCustomStudioPool();
    const merged = [...customPool, ...DEFAULT_STUDIO_PHOTOS];

    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(merged, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
      req.onerror = (e) => reject(e);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
        detail: { count: merged.length, activeIndex: 0 }
      }));
    }
    return merged;
  } catch (e) {
    console.warn('Error resetting studio backgrounds:', e);
    return DEFAULT_STUDIO_PHOTOS;
  }
}

/**
 * Checks if a URL is a Gemini conversation or canvas sharing link.
 */
export function isGeminiShareLink(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('share.gemini.google') || url.includes('gemini.google.com/share');
}

/**
 * Normalizes web URLs for direct visual consumption, supporting Google Drive,
 * Dropbox, and Google UserContent (Gemini generated image addresses).
 */
export function normalizeVisualUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();

  // Google Drive: https://drive.google.com/file/d/FILE_ID/view... -> direct view link
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`;
  }

  // Dropbox: dl=0 -> raw=1
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  // Google UserContent (Gemini generated image addresses): ensure original full resolution
  if (trimmed.includes('googleusercontent.com') && trimmed.includes('=s')) {
    return trimmed.replace(/=s\d+[^&?]*/, '=s0');
  }

  return trimmed;
}

/**
 * Process uploaded file or image URL with 100% lossless fidelity.
 * Preserves the exact original image data without any canvas compression,
 * downsampling, or convolution degradation.
 */
export async function process4KImageFile(fileOrUrl) {
  return new Promise((resolve, reject) => {
    if (!fileOrUrl) {
      return reject(new Error('Please provide an image or video.'));
    }

    if (typeof fileOrUrl === 'string') {
      const cleanUrl = normalizeVisualUrl(fileOrUrl);
      if (isLiveVisual(cleanUrl)) {
        resolve({
          url: cleanUrl,
          width: 3840,
          height: 2160,
          is4K: true,
          type: 'video',
          title: 'Live Studio Wallpaper'
        });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 3840;
        const h = img.naturalHeight || 2160;
        resolve({
          url: cleanUrl,
          width: w,
          height: h,
          is4K: w >= 2560 || h >= 1440,
          type: 'image',
          title: 'Studio Wallpaper'
        });
      };
      img.onerror = () => {
        resolve({
          url: cleanUrl,
          width: 3840,
          height: 2160,
          is4K: true,
          type: 'image',
          title: 'Studio Wallpaper'
        });
      };
      img.src = cleanUrl;
    } else if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
      const isVideo = (fileOrUrl.type && fileOrUrl.type.startsWith('video/')) || isLiveVisual(fileOrUrl.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        if (isVideo) {
          resolve({
            url: rawDataUrl,
            width: 3840,
            height: 2160,
            is4K: true,
            type: 'video',
            title: fileOrUrl.name ? fileOrUrl.name.replace(/\.[^/.]+$/, "") : 'Live Studio Wallpaper'
          });
          return;
        }
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 3840;
          const h = img.naturalHeight || 2160;
          resolve({
            url: rawDataUrl,
            width: w,
            height: h,
            is4K: w >= 2560 || h >= 1440,
            type: 'image',
            title: fileOrUrl.name ? fileOrUrl.name.replace(/\.[^/.]+$/, "") : 'Studio 4K Visual'
          });
        };
        img.onerror = () => {
          resolve({
            url: rawDataUrl,
            width: 3840,
            height: 2160,
            is4K: true,
            type: 'image',
            title: fileOrUrl.name ? fileOrUrl.name.replace(/\.[^/.]+$/, "") : 'Studio 4K Visual'
          });
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(fileOrUrl);
    } else {
      reject(new Error('Invalid image or video input.'));
    }
  });
}
