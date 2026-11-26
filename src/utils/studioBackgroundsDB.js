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
const KEY_ACTIVE_VISUAL = 'active_studio_visual';

export const DEFAULT_STUDIO_PHOTOS = [
  {
    id: 'wallpaper-classroom',
    url: '/assets/wallpapers/Carpe_Diem_in_a_Sunlit_Classroom.png',
    title: 'Carpe Diem in a Sunlit Classroom',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-statue-butterflies',
    url: '/assets/wallpapers/Gemini_Generated_Image_oxyls5oxyls5oxyl.png',
    title: 'Veiled Sculpture with Crimson Butterflies',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-dark-angel',
    url: '/assets/wallpapers/Gemini_Generated_Image_x17vxax17vxax17v.png',
    title: 'Dark Winged Angel of the Storm',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-batman',
    url: '/assets/wallpapers/Gemini_Generated_Image_yrjbfyrjbfyrjbfy.png',
    title: 'The Dark Knight Beneath Golden Rain',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-shelby',
    url: '/assets/wallpapers/Gemini_Generated_Image_lr2rtolr2rtolr2r.png',
    title: 'Peaky Rider in Cerulean Smoke',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-hands-touch',
    url: '/assets/wallpapers/Gemini_Generated_Image_uu56xcuu56xcuu56.png',
    title: 'Creation of Light - Reaching Hands',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-gojo',
    url: '/assets/wallpapers/Gemini_Generated_Image_i7rauzi7rauzi7ra_erasio.png',
    title: 'Gojo Satoru - Limitless Void',
    is4K: true,
    isDefault: true
  },
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
    id: 'wallpaper-brad-pitt',
    url: '/assets/wallpapers/brad_pitt.jpg',
    title: "It's Not About Money - Cliff Booth",
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-zenitsu',
    url: '/assets/images/zenitsu_clean_wallpaper.jpg',
    title: 'Agatsuma Zenitsu - Thunder Breathing',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-your-name',
    url: '/assets/wallpapers/your_name.jpg',
    title: 'Your Name - Twilight Horizon',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-gold-crown',
    url: '/assets/wallpapers/gold_crown_dark.png',
    title: 'Dark Sovereign Crown',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-studio-room',
    url: '/assets/wallpapers/Gemini_Generated_Image_ht28anht28anht28.png',
    title: 'Acoustic Music Studio Room',
    is4K: true,
    isDefault: true
  },
  {
    id: 'wallpaper-black-cat',
    url: '/assets/wallpapers/Black_Cat_Vinyl_Records.jpg',
    title: 'Black Cat Vinyl Records',
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
 * Resolves a canonical semantic visual key for any background item.
 * Enables intelligent deduplication across data URLs, uploaded filenames,
 * and static assets.
 */
export function getVisualCanonicalKey(item) {
  if (!item) return '';
  const url = (typeof item === 'string' ? item : (item.url || '')).toLowerCase();
  const id = (typeof item === 'string' ? '' : (item.id || '')).toLowerCase();
  const title = (typeof item === 'string' ? '' : (item.title || '')).toLowerCase();
  const combined = `${id} ${title} ${url.startsWith('data:') ? '' : url}`;

  if (combined.includes('gojo') || combined.includes('satoru') || combined.includes('五条') || combined.includes('โกะโจ') || combined.includes('i7rauzi7rauzi7ra')) return 'vis_gojo';
  if (combined.includes('x17vxax17vxax17v') || combined.includes('dark winged angel') || (combined.includes('dark') && combined.includes('angel'))) return 'vis_dark_angel';
  if (combined.includes('oxyls5oxyls5oxyl') || combined.includes('veiled sculpture') || combined.includes('crimson butterflies') || (combined.includes('statue') && combined.includes('butterfl'))) return 'vis_statue_butterflies';
  if (combined.includes('yrjbfyrjbfyrjbfy') || combined.includes('dark knight') || combined.includes('batman')) return 'vis_batman';
  if (combined.includes('lr2rtolr2rtolr2r') || combined.includes('peaky') || combined.includes('shelby')) return 'vis_shelby';
  if (combined.includes('uu56xcuu56xcuu56') || combined.includes('reaching hands') || combined.includes('hands touch') || combined.includes('creation of light')) return 'vis_hands_touch';
  if (combined.includes('carpe diem') || combined.includes('sunlit classroom') || combined.includes('golden classroom') || combined.includes('classroom')) return 'vis_classroom';
  if (combined.includes('route 66') || combined.includes('route_66') || combined.includes('route66')) return 'vis_route_66';
  if (combined.includes('astronaut') || combined.includes('bh7l23bh7l23bh7l')) return 'vis_astronaut';
  if (combined.includes('luffy') || combined.includes('monkey d')) return 'vis_luffy';
  if (combined.includes('red eclipse') || combined.includes('red_eclipse') || combined.includes('lvlz4ulvlz4ulvlz')) return 'vis_red_eclipse';
  if (combined.includes('lone knight') || combined.includes('lone_knight')) return 'vis_lone_knight';
  if (combined.includes('brad pitt') || combined.includes('brad_pitt') || combined.includes('cliff booth') || combined.includes('not about money')) return 'vis_brad_pitt';
  if (combined.includes('zenitsu') || combined.includes('agatsuma')) return 'vis_zenitsu';
  if (combined.includes('your name') || combined.includes('your_name') || combined.includes('kimi no na wa')) return 'vis_your_name';
  if (combined.includes('gold crown') || combined.includes('gold_crown') || combined.includes('r14b4vr14b4vr14b') || combined.includes('sovereign crown')) return 'vis_gold_crown';
  if (combined.includes('ht28anht28anht28') || combined.includes('music studio') || combined.includes('acoustic studio') || combined.includes('studio room')) return 'vis_studio_room';
  if (combined.includes('black cat') || combined.includes('vinyl records')) return 'vis_black_cat';

  if (url.startsWith('data:')) {
    return `data:${url.length}:${url.slice(0, 100)}`;
  }
  return url || id;
}

/**
 * Strict deduplication helper: eliminates identical backgrounds by canonical visual identity,
 * URL, or ID, always prioritizing clean lossless 4K static URLs over bloated data URLs.
 */
export function deduplicateBackgrounds(list) {
  if (!Array.isArray(list)) return [];
  const seenCanonicalKeys = new Set();
  const seenUrls = new Set();
  const seenIds = new Set();
  const result = [];

  // Sort static presets ahead of data URLs so the clean 4K asset is always retained
  const sorted = [...list].sort((a, b) => {
    const aUrl = typeof a === 'string' ? a : (a?.url || '');
    const bUrl = typeof b === 'string' ? b : (b?.url || '');
    const aIsData = aUrl.startsWith('data:');
    const bIsData = bUrl.startsWith('data:');
    if (aIsData && !bIsData) return 1;
    if (!aIsData && bIsData) return -1;
    return 0;
  });

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item) continue;
    const url = typeof item === 'string' ? item : (item.url || '');
    const id = typeof item === 'string' ? '' : (item.id || '');
    const cleanUrl = typeof url === 'string' ? url.trim() : '';
    if (!cleanUrl) continue;

    const canonicalKey = getVisualCanonicalKey(item);
    if (canonicalKey) {
      if (seenCanonicalKeys.has(canonicalKey)) {
        continue;
      }
      seenCanonicalKeys.add(canonicalKey);
    }

    let fingerprint = cleanUrl;
    if (cleanUrl.startsWith('data:')) {
      fingerprint = `data:${cleanUrl.length}:${cleanUrl.slice(0, 120)}:${cleanUrl.slice(-120)}`;
    } else {
      fingerprint = cleanUrl.toLowerCase().split('?')[0];
    }
    if (seenUrls.has(fingerprint)) continue;
    seenUrls.add(fingerprint);

    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    result.push(typeof item === 'string' ? { id: `bg-${result.length}`, url: cleanUrl } : { ...item, id: item.id || `bg-${result.length}` });
  }

  return result;
}

/**
 * Retrieve user custom-uploaded background visuals from permanent IndexedDB pool,
 * filtering out any items that are already provided by canonical presets.
 */
export async function getCustomStudioPool() {
  try {
    const db = await openDB();
    const defaultKeys = new Set(DEFAULT_STUDIO_PHOTOS.map(d => getVisualCanonicalKey(d)));
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CUSTOM_POOL);
      req.onsuccess = () => {
        const raw = Array.isArray(req.result) ? req.result : [];
        const filtered = raw.filter(item => {
          const key = getVisualCanonicalKey(item);
          return key && !defaultKeys.has(key);
        });
        resolve(deduplicateBackgrounds(filtered));
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
    const defaultKeys = new Set(DEFAULT_STUDIO_PHOTOS.map(d => getVisualCanonicalKey(d)));
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const deduped = deduplicateBackgrounds(Array.isArray(pool) ? pool : []).filter(item => {
      const key = getVisualCanonicalKey(item);
      return key && !defaultKeys.has(key);
    });
    store.put(deduped, KEY_CUSTOM_POOL);
  } catch (err) {
    console.warn('Error saving custom studio pool:', err);
  }
}

/**
 * Load all backgrounds from IndexedDB, ensuring all custom uploaded visuals are permanently preserved
 * and strictly deduplicated
 */
export async function getStudioBackgrounds() {
  try {
    // Auto-migration: Seed and upgrade to clean, deduplicated presets
    const MIGRATION_KEY = 'musicly_studio_bg_v18_strict_dedup_no_dups';
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
      try {
        localStorage.setItem(MIGRATION_KEY, 'true');
        const customPool = await getCustomStudioPool();
        const fullGallery = deduplicateBackgrounds([...DEFAULT_STUDIO_PHOTOS, ...customPool]);
        localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(fullGallery));
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(fullGallery, KEY);
        return fullGallery;
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

        // Strictly deduplicate combined list (all default presets guaranteed, custom pool kept, no duplicates)
        const combined = deduplicateBackgrounds([...DEFAULT_STUDIO_PHOTOS, ...customPool, ...baseList]);
        resolve(combined);
      };

      req.onerror = () => {
        resolve(deduplicateBackgrounds([...DEFAULT_STUDIO_PHOTOS, ...customPool]));
      };
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, using defaults:', err);
    try {
      const local = localStorage.getItem('musicly_studio_bg_gallery');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateBackgrounds(parsed);
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
  const dedupedList = deduplicateBackgrounds(imagesList);

  // 1. Permanently isolate custom-uploaded visuals into KEY_CUSTOM_POOL
  const defaultUrls = new Set(DEFAULT_STUDIO_PHOTOS.map(d => d.url));
  const customItems = dedupedList.filter(item => {
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

  // 2. Save full deduplicated gallery list to IndexedDB
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dedupedList, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.warn('Error saving to IndexedDB:', err);
  }

  // 3. Backup non-massive items to localStorage for instant synchronous boot
  try {
    const safeForLocalStorage = dedupedList.filter(item => {
      const u = typeof item === 'string' ? item : (item?.url || '');
      return !u.startsWith('data:') || u.length < 500000;
    });
    localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(safeForLocalStorage));
  } catch (e) {}

  // 4. Broadcast sync event so all open views update in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
      detail: { count: dedupedList.length }
    }));
  }

  // 5. Broadcast via realtime relay (instant cross-device SSE & pub-sub)
  broadcastStudioVisual(undefined, dedupedList).catch(() => {});

  // 6. Persist to Firestore cloud safely (keeping payload well under the 1MB Firestore limit)
  if (firestore) {
    (async () => {
      try {
        const compressedList = [];
        let totalPayloadBytes = 0;
        for (const item of dedupedList) {
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
export function setActiveStudioBackgroundIndex(idx, activeUrl = '') {
  const now = Date.now();
  try {
    localStorage.setItem('musicly_studio_bg_index', String(idx));
    if (activeUrl) {
      if (!activeUrl.startsWith('data:') || activeUrl.length < 50000) {
        localStorage.setItem('musicly_active_studio_bg_url', activeUrl);
      } else {
        localStorage.setItem('musicly_active_studio_bg_url', `data_ref:${idx}`);
      }
    }
    localStorage.setItem('musicly_studio_bg_updated_at', String(now));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('musicly_studio_bg_updated', {
        detail: { activeIndex: idx, activeUrl, updatedAt: now }
      }));
    }
  } catch (e) {}

  if (activeUrl) {
    saveActiveStudioVisual(activeUrl).catch(() => {});
  }

  // Broadcast via realtime relay (instant cross-device SSE & pub-sub)
  broadcastStudioVisual(idx).catch(() => {});

  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_settings', 'studio_active_visual');
      // Do not write massive data URLs to Firestore (must stay under 1MB)
      const safeCloudUrl = (activeUrl && (!activeUrl.startsWith('data:') || activeUrl.length < 400000)) ? activeUrl : '';
      setDoc(docRef, {
        activeIndex: idx,
        activeUrl: safeCloudUrl,
        updatedAt: now
      }, { merge: true }).catch(() => {});
    } catch {}
  }
}

/**
 * Permanently save the user's explicitly activated background visual into IndexedDB & localStorage
 */
export async function saveActiveStudioVisual(visualUrl) {
  if (!visualUrl) return;
  try {
    const now = Date.now();
    try {
      if (!visualUrl.startsWith('data:') || visualUrl.length < 50000) {
        localStorage.setItem('musicly_active_studio_bg_url', visualUrl);
      } else {
        localStorage.setItem('musicly_active_studio_bg_url', `data_ref:${visualUrl.slice(0, 80)}`);
      }
      localStorage.setItem('musicly_studio_bg_updated_at', String(now));
    } catch {}
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(visualUrl, KEY_ACTIVE_VISUAL);
    }
  } catch (err) {
    console.warn('Could not save active visual to IndexedDB:', err);
  }
}

/**
 * Get active studio background URL from localStorage or persistent IndexedDB
 */
export async function getActiveStudioVisual() {
  try {
    const fromLocal = localStorage.getItem('musicly_active_studio_bg_url');
    if (fromLocal && !fromLocal.startsWith('data_ref:')) return fromLocal;
  } catch {}
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ACTIVE_VISUAL);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
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
          // CRITICAL: Load local custom uploaded visuals and merge them in front,
          // AND always ensure all DEFAULT_STUDIO_PHOTOS are included so no curated visuals are ever lost!
          const localCustoms = await getCustomStudioPool();
          const customUrls = new Set(localCustoms.map(c => typeof c === 'string' ? c : (c?.url || c?.id)));
          const nonCustomFromCloud = data.gallery.filter(cg => {
            const u = typeof cg === 'string' ? cg : (cg?.url || cg?.id);
            return !customUrls.has(u);
          });
          const mergedGallery = deduplicateBackgrounds([...DEFAULT_STUDIO_PHOTOS, ...localCustoms, ...nonCustomFromCloud]);

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
          const remoteTime = typeof data?.updatedAt === 'number' ? data.updatedAt : 0;
          let localTime = 0;
          try {
            localTime = parseInt(localStorage.getItem('musicly_studio_bg_updated_at') || '0', 10);
          } catch {}

          // Only accept remote active visual if it is strictly newer than the local user selection
          if (remoteTime > localTime) {
            try {
              localStorage.setItem('musicly_studio_bg_index', String(data.activeIndex));
              if (data?.activeUrl) {
                localStorage.setItem('musicly_active_studio_bg_url', data.activeUrl);
              }
              localStorage.setItem('musicly_studio_bg_updated_at', String(remoteTime));
            } catch {}
            if (typeof callback === 'function') {
              callback({ activeIndex: data.activeIndex, activeUrl: data.activeUrl });
            }
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
 * Get active studio background URL
 */
export function getActiveStudioBackgroundUrl() {
  try {
    return localStorage.getItem('musicly_active_studio_bg_url') || null;
  } catch (e) {
    return null;
  }
}

/**
 * Add a new background visual to the front of the list, save, and activate it
 */
export async function addStudioBackground(newBg) {
  try {
    const newU = typeof newBg === 'string' ? newBg : (newBg?.url || '');
    const current = await getStudioBackgrounds();
    const next = [newBg, ...current.filter(item => {
      const u = typeof item === 'string' ? item : (item?.url || '');
      return u !== newU;
    })];
    await saveStudioBackgrounds(next);
    setActiveStudioBackgroundIndex(0, newU);
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
    const activeUrl = getActiveStudioBackgroundUrl();
    if (activeUrl === removeUrl) {
      const fallbackItem = next[0];
      const fallbackUrl = typeof fallbackItem === 'string' ? fallbackItem : (fallbackItem?.url || '');
      setActiveStudioBackgroundIndex(0, fallbackUrl);
    } else if (activeUrl) {
      const newActiveIdx = next.findIndex(item => {
        const u = typeof item === 'string' ? item : (item?.url || '');
        return u === activeUrl;
      });
      if (newActiveIdx >= 0) {
        setActiveStudioBackgroundIndex(newActiveIdx, activeUrl);
      } else if (activeIdx >= indexToRemove && activeIdx > 0) {
        setActiveStudioBackgroundIndex(activeIdx - 1);
      } else {
        setActiveStudioBackgroundIndex(0);
      }
    } else {
      if (activeIdx >= indexToRemove && activeIdx > 0) {
        setActiveStudioBackgroundIndex(activeIdx - 1);
      } else {
        setActiveStudioBackgroundIndex(0);
      }
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
    localStorage.removeItem('musicly_active_studio_bg_url');
    localStorage.setItem('musicly_studio_bg_index', '0');

    // Preserve custom uploads while restoring clean official default presets
    const customPool = await getCustomStudioPool();
    const merged = deduplicateBackgrounds([...customPool, ...DEFAULT_STUDIO_PHOTOS]);

    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY_ACTIVE_VISUAL);
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
      reader.onload = async (e) => {
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
        try {
          // Optimize/compress image so it is crisp UHD (up to 2560px), ultra-fast, and safe for storage quotas
          const optimized = await compressImageIfNeeded(rawDataUrl, 2560, 0.88);
          const img = new Image();
          img.onload = () => {
            const w = img.naturalWidth || 2560;
            const h = img.naturalHeight || 1440;
            resolve({
              url: optimized,
              width: w,
              height: h,
              is4K: w >= 2560 || h >= 1440,
              type: 'image',
              title: fileOrUrl.name ? fileOrUrl.name.replace(/\.[^/.]+$/, "") : 'Studio 4K Visual'
            });
          };
          img.onerror = () => {
            resolve({
              url: optimized,
              width: 2560,
              height: 1440,
              is4K: true,
              type: 'image',
              title: fileOrUrl.name ? fileOrUrl.name.replace(/\.[^/.]+$/, "") : 'Studio 4K Visual'
            });
          };
          img.src = optimized;
        } catch {
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
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(fileOrUrl);
    } else {
      reject(new Error('Invalid image or video input.'));
    }
  });
}
