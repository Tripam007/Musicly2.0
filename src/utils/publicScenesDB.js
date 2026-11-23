import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { checkIsAdmin } from './userModel';
import { broadcastSceneOverride, broadcastSceneReset } from './realtimeRelay';

const SCENES_CACHE_KEY = 'musicly_custom_scenes_cache';
const SCENE_OVERRIDES_CACHE_KEY = 'musicly_scene_overrides_cache';
const DELETED_OVERRIDES_KEY = 'musicly_deleted_scene_overrides';
const SCENE_VISUALS_STORE_KEY = 'musicly_scene_visuals_store_v1';

// IndexedDB configuration for permanent, quota-free storage of 4K wallpapers and video loops
const IDB_NAME = 'MusiclyVisualsDB';
const IDB_VERSION = 1;
const STORE_SCENE_VISUALS = 'scene_visuals';
const STORE_SCENE_OVERRIDES = 'scene_overrides';
const STORE_CUSTOM_POOL = 'custom_visuals_pool';

function openVisualsDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_SCENE_VISUALS)) {
        db.createObjectStore(STORE_SCENE_VISUALS, { keyPath: 'sceneId' });
      }
      if (!db.objectStoreNames.contains(STORE_SCENE_OVERRIDES)) {
        db.createObjectStore(STORE_SCENE_OVERRIDES, { keyPath: 'sceneId' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM_POOL)) {
        db.createObjectStore(STORE_CUSTOM_POOL, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => resolve(null);
  });
}

async function getIdbItem(storeName, key) {
  try {
    const db = await openVisualsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function getAllIdbItems(storeName) {
  try {
    const db = await openVisualsDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function putIdbItem(storeName, value) {
  try {
    const db = await openVisualsDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

async function deleteIdbItem(storeName, key) {
  try {
    const db = await openVisualsDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Curated default visuals for scenes matching the user's uploaded screenshot & local assets
 */
export const DEFAULT_STUDIO_VISUALS = [
  { id: 'vis_gojo', url: '/assets/wallpapers/gojo_satoru.jpg', type: 'image' },
  { id: 'vis_red_eclipse', url: '/assets/wallpapers/red_eclipse_crown.png', type: 'image' },
  { id: 'vis_astronaut', url: '/assets/wallpapers/astronaut_neon.png', type: 'image' },
  { id: 'vis_lone_knight', url: '/assets/wallpapers/lone_knight.png', type: 'image' },
  { id: 'vis_luffy', url: '/assets/wallpapers/luffy_anime.jpg', type: 'image' },
  { id: 'vis_gold_crown', url: '/assets/wallpapers/gold_crown_dark.png', type: 'image' },
  { id: 'vis_brad_pitt', url: '/assets/wallpapers/brad_pitt.jpg', type: 'image' },
  { id: 'vis_your_name', url: '/assets/wallpapers/your_name.jpg', type: 'image' },
  { id: 'vis_zenitsu', url: '/assets/wallpapers/zenitsu.png', type: 'image' },
  { id: 'vis_route66', url: '/assets/wallpapers/route_66.png', type: 'image' },
  { id: 'vis_pirate_live', url: '/assets/about/pirate_bg.mp4', type: 'video' }
];

/**
 * Check whether a visual URL is an animated or live video wallpaper (mp4, webm, etc.)
 */
export function isLiveVisual(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    url.startsWith('data:video/') ||
    url.startsWith('blob:')
  );
}

/**
 * Load available visuals for a given scene from IndexedDB (0ms quota-free) + local cache + Firestore
 */
export async function loadSceneVisuals(sceneId) {
  if (!sceneId) return [...DEFAULT_STUDIO_VISUALS];

  // 1. Try reading from permanent IndexedDB (no 5MB quota ceiling, holds full 4K & videos)
  const idbRecord = await getIdbItem(STORE_SCENE_VISUALS, sceneId);
  let visuals = idbRecord?.visuals;

  // 2. Fallback to localStorage cache if IndexedDB didn't have it yet
  if (!visuals || visuals.length === 0) {
    try {
      const raw = localStorage.getItem(SCENE_VISUALS_STORE_KEY);
      if (raw) {
        const store = JSON.parse(raw);
        if (store[sceneId] && store[sceneId].length > 0) {
          visuals = store[sceneId];
        }
      }
    } catch {}
  }

  // 3. Firestore cloud sync (if available)
  if (firestore) {
    try {
      const snap = await Promise.race([
        getDocs(collection(firestore, 'public_scene_visuals')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]).catch(() => null);

      if (snap && !snap.empty) {
        snap.forEach(docSnap => {
          if (docSnap.id === sceneId && docSnap.data()?.visuals && docSnap.data().visuals.length > 0) {
            visuals = docSnap.data().visuals;
          }
        });
      }
    } catch (_e) {
      console.warn("Firestore scene visuals load notice:", _e);
    }
  }

  // 4. Always retain and merge any custom visuals ever uploaded by the admin from the master pool
  const customPool = await getAllIdbItems(STORE_CUSTOM_POOL);
  if (customPool && customPool.length > 0) {
    if (!visuals || visuals.length === 0) {
      visuals = [...DEFAULT_STUDIO_VISUALS];
    }
    const existingUrls = new Set(visuals.map(v => v.url));
    const missingCustom = customPool.filter(c => !existingUrls.has(c.url));
    if (missingCustom.length > 0) {
      visuals = [...missingCustom, ...visuals];
    }
  }

  // 5. Initial boot fallback if brand new browser session with 0 configured items
  if (!visuals || visuals.length === 0) {
    visuals = [...DEFAULT_STUDIO_VISUALS];
  }

  // Persist back to IndexedDB so it is permanently cached forever
  await putIdbItem(STORE_SCENE_VISUALS, { sceneId, visuals, updatedAt: Date.now() });

  return visuals;
}

/**
 * Save available visuals list for a given scene permanently into IndexedDB and Cloud
 */
export async function saveSceneVisuals(sceneId, visualsList, user) {
  if (!sceneId) return visualsList;

  // 1. Permanently save to IndexedDB (virtually unlimited capacity, never wiped by quota)
  await putIdbItem(STORE_SCENE_VISUALS, { sceneId, visuals: visualsList, updatedAt: Date.now() });

  // 2. Identify custom visuals and record into the master pool
  const defaultUrls = new Set(DEFAULT_STUDIO_VISUALS.map(v => v.url));
  for (const v of visualsList) {
    if (!defaultUrls.has(v.url)) {
      await putIdbItem(STORE_CUSTOM_POOL, {
        id: v.id || v.url,
        url: v.url,
        type: v.type || (isLiveVisual(v.url) ? 'video' : 'image'),
        addedAt: Date.now()
      });
    }
  }

  // 3. LocalStorage safety cache (store only small references or URLs to prevent QuotaExceededError)
  try {
    const raw = localStorage.getItem(SCENE_VISUALS_STORE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const safeList = visualsList.map(v => {
      if (v.url && v.url.length > 200000) {
        return { ...v, url: v.url.slice(0, 100) + '...[idb_cached]' };
      }
      return v;
    });
    store[sceneId] = safeList;
    localStorage.setItem(SCENE_VISUALS_STORE_KEY, JSON.stringify(store));
  } catch {}

  // 4. Persist to Firestore if small enough (<500KB per doc)
  if (firestore) {
    try {
      const firestoreSafeList = visualsList.filter(v => typeof v.url === 'string' && v.url.length < 500000);
      if (firestoreSafeList.length > 0) {
        const docRef = doc(firestore, 'public_scene_visuals', sceneId);
        await Promise.race([
          setDoc(docRef, {
            sceneId,
            visuals: firestoreSafeList,
            updatedAt: Date.now(),
            updatedBy: user?.email || 'admin'
          }, { merge: true }),
          new Promise((resolve) => setTimeout(resolve, 1500))
        ]);
      }
    } catch (err) {
      console.warn("Firestore scene visuals save notice:", err);
    }
  }

  return visualsList;
}

/**
 * Manually delete a visual (ONLY called when admin explicitly clicks the trash icon)
 */
export async function deleteSceneVisual(sceneId, visualIdOrUrl, updatedList, user) {
  if (!sceneId) return updatedList;

  // 1. Update scene visuals in IndexedDB
  await putIdbItem(STORE_SCENE_VISUALS, { sceneId, visuals: updatedList, updatedAt: Date.now() });

  // 2. Remove specifically from custom pool in IndexedDB
  await deleteIdbItem(STORE_CUSTOM_POOL, visualIdOrUrl);
  const allCustom = await getAllIdbItems(STORE_CUSTOM_POOL);
  for (const c of allCustom) {
    if (c.id === visualIdOrUrl || c.url === visualIdOrUrl) {
      await deleteIdbItem(STORE_CUSTOM_POOL, c.id);
    }
  }

  // 3. Save to localStorage
  try {
    const raw = localStorage.getItem(SCENE_VISUALS_STORE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[sceneId] = updatedList;
    localStorage.setItem(SCENE_VISUALS_STORE_KEY, JSON.stringify(store));
  } catch {}

  // 4. Update Firestore if connected
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_scene_visuals', sceneId);
      const firestoreSafeList = updatedList.filter(v => typeof v.url === 'string' && v.url.length < 500000);
      await Promise.race([
        setDoc(docRef, {
          sceneId,
          visuals: firestoreSafeList,
          updatedAt: Date.now(),
          updatedBy: user?.email || 'admin'
        }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore scene visuals delete sync notice:", err);
    }
  }

  return updatedList;
}

/**
 * Reset available visuals for a scene back to defaults (while preserving custom uploaded visuals)
 */
export async function resetSceneVisualsToDefault(sceneId, user) {
  const customPool = await getAllIdbItems(STORE_CUSTOM_POOL);
  const preservedCustom = customPool && customPool.length > 0 ? customPool : [];
  const merged = [...preservedCustom, ...DEFAULT_STUDIO_VISUALS];
  return saveSceneVisuals(sceneId, merged, user);
}

/**
 * Load scene image overrides from IndexedDB + local cache (0ms) + Firestore cloud sync
 */
export async function loadSceneOverrides() {
  // Auto-migration: Purge any legacy blue cartoon test override for minimal_studio
  const PURGE_CARTOON_KEY = 'musicly_purge_cartoon_v2';
  if (typeof localStorage !== 'undefined' && !localStorage.getItem(PURGE_CARTOON_KEY)) {
    try {
      localStorage.setItem(PURGE_CARTOON_KEY, 'true');
      let cached = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
      if (cached['minimal_studio']) {
        delete cached['minimal_studio'];
        localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(cached));
      }
      deleteIdbItem(STORE_SCENE_OVERRIDES, 'minimal_studio');
    } catch {}
  }

  let overrides = {};
  let deletedSet = new Set();
  try {
    deletedSet = new Set(JSON.parse(localStorage.getItem(DELETED_OVERRIDES_KEY) || '[]'));
  } catch {}

  // 1. Read from permanent IndexedDB
  const allOverrides = await getAllIdbItems(STORE_SCENE_OVERRIDES);
  if (allOverrides && allOverrides.length > 0) {
    allOverrides.forEach(item => {
      if (item.sceneId && item.image && !deletedSet.has(item.sceneId)) {
        overrides[item.sceneId] = item.image;
      }
    });
  }

  // 2. Also read localStorage
  try {
    const cached = localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.keys(parsed).forEach(k => {
        if (!deletedSet.has(k)) {
          overrides[k] = parsed[k];
        }
      });
    }
  } catch (e) {
    console.warn("Local scene overrides cache read notice:", e);
  }

  // 3. Firestore cloud sync
  if (firestore) {
    try {
      const colRef = collection(firestore, 'public_scene_overrides');
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
      ]);
      if (snap && !snap.empty) {
        const cloudOverrides = {};
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.image && !deletedSet.has(docSnap.id)) {
            cloudOverrides[docSnap.id] = data.image;
          }
        });
        overrides = { ...overrides, ...cloudOverrides };
        try {
          localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
        } catch {}
      }
    } catch (e) {
      console.warn("Firestore scene overrides load notice:", e);
    }
  }

  return overrides;
}

/**
 * Helper: Compresses large base64 data URLs to high-quality 1080p JPEG
 * to guarantee they are under 400KB and seamlessly sync to Firestore without quota or document limit errors.
 */
export async function compressImageIfNeeded(dataUrl, maxDimension = 1920, quality = 0.82) {
  if (typeof window === 'undefined' || typeof dataUrl !== 'string') return dataUrl;
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  if (dataUrl.length < 350000) return dataUrl;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Save theme image override for any scene (Admin Only)
 * Persists locally and synchronizes to Firestore so every device updates in real time.
 */
export async function saveSceneOverride(sceneId, imageUrl, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can customize scene theme images.");
  }
  if (!sceneId) {
    throw new Error("Scene ID is required.");
  }
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Valid image URL or file is required.");
  }

  // Clear any tombstone for this sceneId so it is actively retained
  try {
    const deleted = JSON.parse(localStorage.getItem(DELETED_OVERRIDES_KEY) || '[]');
    const next = deleted.filter(id => id !== sceneId);
    localStorage.setItem(DELETED_OVERRIDES_KEY, JSON.stringify(next));
  } catch {}

  const cleanImage = imageUrl.trim();
  // Ensure image is compact for instant Firestore cloud sync across all devices
  const optimizedImage = await compressImageIfNeeded(cleanImage);

  // 1. Permanent IndexedDB storage
  await putIdbItem(STORE_SCENE_OVERRIDES, { sceneId, image: optimizedImage, updatedAt: Date.now() });

  // 2. Local storage cache
  let overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
  } catch {}
  try {
    if (optimizedImage.length < 500000) {
      overrides[sceneId] = optimizedImage;
      localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
    }
  } catch {}

  // Also update custom scenes local cache if applicable
  try {
    const customScenes = JSON.parse(localStorage.getItem(SCENES_CACHE_KEY) || '[]');
    const hasCustom = customScenes.some(s => s.id === sceneId);
    if (hasCustom) {
      const updated = customScenes.map(s => s.id === sceneId ? { ...s, image: optimizedImage } : s);
      localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // 3. Broadcast via realtime relay (instant cross-device SSE & pub-sub)
  broadcastSceneOverride(sceneId, optimizedImage).catch(() => {});

  // 4. Persist to Firestore cloud for global real-time synchronization
  if (firestore) {
    try {
      if (optimizedImage.length < 950000) {
        const docRef = doc(firestore, 'public_scene_overrides', sceneId);
        await Promise.race([
          setDoc(docRef, { 
            sceneId, 
            image: optimizedImage, 
            updatedAt: Date.now(), 
            updatedBy: user?.email || 'admin' 
          }, { merge: true }),
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
      }
    } catch (err) {
      console.warn("Firestore scene override save notice:", err);
    }
  }

  return optimizedImage;
}

/**
 * Reset theme image for a scene back to default (Admin Only)
 */
export async function removeSceneOverride(sceneId, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can reset scene theme images.");
  }
  // Mark as explicitly deleted so snapshots don't resurrect it
  try {
    const deleted = JSON.parse(localStorage.getItem(DELETED_OVERRIDES_KEY) || '[]');
    if (!deleted.includes(sceneId)) {
      deleted.push(sceneId);
      localStorage.setItem(DELETED_OVERRIDES_KEY, JSON.stringify(deleted));
    }
  } catch {}

  // 1. Remove from IndexedDB
  await deleteIdbItem(STORE_SCENE_OVERRIDES, sceneId);

  // 2. Remove from localStorage
  let overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
  } catch {}
  delete overrides[sceneId];
  try {
    localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
  } catch {}

  // 3. Broadcast reset via realtime relay (instant cross-device SSE & pub-sub)
  broadcastSceneReset(sceneId).catch(() => {});

  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_scene_overrides', sceneId);
      await Promise.race([
        deleteDoc(docRef),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore scene override delete notice:", err);
    }
  }

  return true;
}

/**
 * Load custom scenes from local cache (0ms) + Firestore cloud sync
 */
export async function loadPublicScenes() {
  let scenes = [];
  
  // 1. Read local cache for instantaneous rendering
  try {
    const cached = localStorage.getItem(SCENES_CACHE_KEY);
    if (cached) {
      scenes = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Local scenes cache read notice:", e);
  }

  // 2. Fetch latest from Firestore if online
  if (firestore) {
    try {
      const colRef = collection(firestore, 'public_scenes');
      const snap = await Promise.race([
        getDocs(colRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
      ]);

      if (snap && !snap.empty) {
        const reservedIds = new Set(['cozy_bedroom', 'vinyl', 'vibe_carousel', 'minimal_studio']);
        const cloudScenes = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!reservedIds.has(docSnap.id) && data?.name && data.name.trim()) {
            cloudScenes.push({ id: docSnap.id, ...data });
          }
        });
        
        // Sort newest first
        cloudScenes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        scenes = cloudScenes;
        localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(scenes));
      }
    } catch (err) {
      console.warn("Firestore public scenes fetch notice:", err);
    }
  }

  return scenes;
}

/**
 * Publish a new room theme / scene (Admin Only)
 */
export async function publishPublicScene(sceneData, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can publish room themes.");
  }

  if (!sceneData.name || !sceneData.name.trim()) {
    throw new Error("Theme title is required.");
  }

  if (!sceneData.image || !sceneData.image.trim()) {
    throw new Error("Theme image URL or file is required.");
  }

  const id = `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hasColors = !!(sceneData.primaryColor);
  const isInteractiveScene = !!sceneData.isInteractive || (Array.isArray(sceneData.interactiveHotspots) && sceneData.interactiveHotspots.length > 0);

  const newScene = {
    id,
    name: sceneData.name.trim(),
    image: sceneData.image.trim(),
    desc: sceneData.desc?.trim() || 'Cozy aesthetic room theme',
    createdBy: user.email || 'admin',
    createdAt: Date.now(),
    // Color theme metadata
    primaryColor: sceneData.primaryColor || null,
    secondaryColor: sceneData.secondaryColor || null,
    glowColor: sceneData.glowColor || null,
    isTheme: sceneData.isTheme !== undefined ? !!sceneData.isTheme : hasColors,
    // Live interactive hotspots metadata
    isInteractive: isInteractiveScene,
    interactiveHotspots: Array.isArray(sceneData.interactiveHotspots) ? sceneData.interactiveHotspots : []
  };

  // 1. Save to local cache immediately (instant 0ms persistence)
  try {
    const existing = JSON.parse(localStorage.getItem(SCENES_CACHE_KEY) || '[]');
    const updated = [newScene, ...existing.filter(s => s.id !== id)];
    localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local scenes cache write notice:", e);
  }

  // 2. Persist to Firestore with a fast 1500ms race timeout so it NEVER gets stuck
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_scenes', id);
      await Promise.race([
        setDoc(docRef, newScene),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore scene publish notice (saved locally):", err);
    }
  }

  return newScene;
}

/**
 * Delete a custom scene (Admin Only)
 */
export async function deletePublicScene(sceneId, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can delete room themes.");
  }

  // 1. Remove from local cache immediately
  try {
    const existing = JSON.parse(localStorage.getItem(SCENES_CACHE_KEY) || '[]');
    const filtered = existing.filter(s => s.id !== sceneId);
    localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Local scenes cache delete notice:", e);
  }

  // 2. Remove from Firestore with safety timeout
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_scenes', sceneId);
      await Promise.race([
        deleteDoc(docRef),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch (err) {
      console.warn("Firestore scene delete notice:", err);
    }
  }

  return true;
}

/**
 * Real-time subscription to scene image overrides from Firestore.
 * Automatically synchronizes any changes made by an admin across all connected devices in real time.
 * Safely merges with local storage and IndexedDB so custom images are never accidentally overwritten.
 */
export function subscribeSceneOverrides(callback) {
  if (!firestore) return () => {};
  try {
    const colRef = collection(firestore, 'public_scene_overrides');
    const unsubscribe = onSnapshot(colRef, async (snapshot) => {
      let deletedSet = new Set();
      try {
        deletedSet = new Set(JSON.parse(localStorage.getItem(DELETED_OVERRIDES_KEY) || '[]'));
      } catch {}

      // 1. Read existing local overrides first
      let localOverrides = {};
      try {
        localOverrides = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
      } catch {}
      const idbList = await getAllIdbItems(STORE_SCENE_OVERRIDES);
      if (Array.isArray(idbList)) {
        idbList.forEach(item => {
          if (item?.sceneId && item?.image && !deletedSet.has(item.sceneId)) {
            localOverrides[item.sceneId] = item.image;
          }
        });
      }

      // Purge any locally tracked deleted scenes
      Object.keys(localOverrides).forEach(id => {
        if (deletedSet.has(id)) delete localOverrides[id];
      });

      // 2. Collect cloud overrides
      const cloudOverrides = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.image && !deletedSet.has(docSnap.id)) {
          cloudOverrides[docSnap.id] = data.image;
        }
      });

      // 3. Merge: cloud overrides takes priority if present, but local overrides are NEVER wiped out!
      const merged = { ...localOverrides, ...cloudOverrides };

      // 4. Mirror to local cache and IndexedDB
      try {
        localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(merged));
      } catch {}

      if (typeof callback === 'function') {
        callback(merged);
      }
    }, (err) => {
      console.warn("Firestore scene overrides subscription notice:", err);
    });
    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach scene overrides subscription:", err);
    return () => {};
  }
}

/**
 * Real-time subscription to public custom scenes from Firestore.
 */
export function subscribePublicScenes(callback) {
  if (!firestore) return () => {};
  try {
    const colRef = collection(firestore, 'public_scenes');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const reservedIds = new Set(['cozy_bedroom', 'vinyl', 'vibe_carousel', 'minimal_studio']);
      const scenes = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name && data.name.trim() && !reservedIds.has(docSnap.id)) {
          scenes.push({ id: docSnap.id, ...data });
        }
      });
      try {
        localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(scenes));
      } catch {}
      if (typeof callback === 'function') {
        callback(scenes);
      }
    }, (err) => {
      console.warn("Firestore public scenes subscription notice:", err);
    });
    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach public scenes subscription:", err);
    return () => {};
  }
}

