// IndexedDB Storage Utility for Minimal Studio Background Visuals (Supporting 4K UHD Images & Live Video Wallpapers)

import { isLiveVisual } from './publicScenesDB';

const DB_NAME = 'MusiclyStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'studio_backgrounds';
const KEY = 'current_gallery';

export const DEFAULT_STUDIO_PHOTOS = [
  {
    id: 'default-zenitsu',
    url: '/assets/images/zenitsu_clean_wallpaper.jpg',
    title: 'Agatsuma Zenitsu (Clean Anime Visual)',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-1',
    url: '/assets/images/greesel_clean_portrait.jpg',
    title: 'Studio Portrait',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-2',
    url: '/assets/images/vibe_card_01.jpg',
    title: 'Warm Studio Vibe',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-3',
    url: '/assets/images/vibe_card_02.jpg',
    title: 'Neon Dusk Vibe',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-4',
    url: '/assets/images/vibe_card_03.jpg',
    title: 'Cozy Twilight',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-5',
    url: '/assets/images/vibe_card_05.jpg',
    title: 'Retro Aesthetic',
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
 * Load all backgrounds from IndexedDB, falling back to localStorage or defaults
 */
export async function getStudioBackgrounds() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);

      req.onsuccess = () => {
        if (Array.isArray(req.result) && req.result.length > 0) {
          resolve(req.result);
        } else {
          // Check localStorage fallback
          try {
            const local = localStorage.getItem('musicly_studio_bg_gallery');
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                resolve(parsed);
                return;
              }
            }
          } catch (e) {}
          resolve(DEFAULT_STUDIO_PHOTOS);
        }
      };

      req.onerror = () => {
        resolve(DEFAULT_STUDIO_PHOTOS);
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
 * Save current list of backgrounds to IndexedDB and localStorage (for fast init)
 */
export async function saveStudioBackgrounds(imagesList) {
  if (!Array.isArray(imagesList)) return;
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

  // Backup non-massive items to localStorage for instant synchronous boot
  try {
    // Exclude oversized base64 from localStorage to prevent quota errors
    const safeForLocalStorage = imagesList.filter(item => {
      const u = typeof item === 'string' ? item : (item?.url || '');
      return !u.startsWith('data:') || u.length < 500000;
    });
    localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(safeForLocalStorage));
  } catch (e) {}

  // Broadcast sync event so all open views update in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
      detail: { count: imagesList.length }
    }));
  }
}

/**
 * Set active studio background index and broadcast update event
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
 * Remove a background visual by index
 */
export async function removeStudioBackground(indexToRemove) {
  try {
    const current = await getStudioBackgrounds();
    if (current.length <= 1) return current;
    const next = current.filter((_, idx) => idx !== indexToRemove);
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
 * Hard reset studio background gallery to pristine official default visuals
 */
export async function resetStudioBackgroundsToDefaults() {
  try {
    localStorage.removeItem('musicly_studio_bg_gallery');
    localStorage.setItem('musicly_studio_bg_index', '0');
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(DEFAULT_STUDIO_PHOTOS, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
      req.onerror = (e) => reject(e);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
        detail: { count: DEFAULT_STUDIO_PHOTOS.length, activeIndex: 0 }
      }));
    }
  } catch (e) {
    console.warn('Error resetting studio backgrounds:', e);
  }
  return DEFAULT_STUDIO_PHOTOS;
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
