import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import { checkIsAdmin } from './userModel';

const SCENES_CACHE_KEY = 'musicly_custom_scenes_cache';
const SCENE_OVERRIDES_CACHE_KEY = 'musicly_scene_overrides_cache';

/**
 * Load scene image overrides from local cache (0ms) + Firestore cloud sync
 */
export async function loadSceneOverrides() {
  let overrides = {};
  try {
    const cached = localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY);
    if (cached) {
      overrides = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Local scene overrides cache read notice:", e);
  }

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
          if (data && data.image) {
            cloudOverrides[docSnap.id] = data.image;
          }
        });
        overrides = { ...overrides, ...cloudOverrides };
        localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
      }
    } catch (e) {
      console.warn("Firestore scene overrides load notice:", e);
    }
  }

  return overrides;
}

/**
 * Save theme image override for any scene (Admin Only)
 */
export async function saveSceneOverride(sceneId, imageUrl, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can change room theme images.");
  }
  if (!sceneId) {
    throw new Error("Scene ID is required.");
  }
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Valid image URL or file is required.");
  }

  const cleanImage = imageUrl.trim();

  // 1. Instant local persistence
  let overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
  } catch (e) {}
  overrides[sceneId] = cleanImage;
  localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));

  // Also update custom scenes local cache if applicable
  try {
    const customScenes = JSON.parse(localStorage.getItem(SCENES_CACHE_KEY) || '[]');
    const hasCustom = customScenes.some(s => s.id === sceneId);
    if (hasCustom) {
      const updated = customScenes.map(s => s.id === sceneId ? { ...s, image: cleanImage } : s);
      localStorage.setItem(SCENES_CACHE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // 2. Persist to Firestore with safety race
  if (firestore) {
    try {
      const docRef = doc(firestore, 'public_scene_overrides', sceneId);
      await Promise.race([
        setDoc(docRef, { 
          sceneId, 
          image: cleanImage, 
          updatedAt: Date.now(), 
          updatedBy: user.email || 'admin' 
        }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);

      // If it is in public_scenes (custom scene), update there as well
      const customDocRef = doc(firestore, 'public_scenes', sceneId);
      await Promise.race([
        setDoc(customDocRef, { image: cleanImage }, { merge: true }),
        new Promise((resolve) => setTimeout(resolve, 1200))
      ]).catch(() => {});
    } catch (err) {
      console.warn("Firestore scene override save notice:", err);
    }
  }

  return cleanImage;
}

/**
 * Reset theme image for a scene back to default (Admin Only)
 */
export async function removeSceneOverride(sceneId, user) {
  if (!checkIsAdmin(user)) {
    throw new Error("Unauthorized: Only verified admin can reset room theme images.");
  }

  let overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(SCENE_OVERRIDES_CACHE_KEY) || '{}');
  } catch (e) {}
  delete overrides[sceneId];
  localStorage.setItem(SCENE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));

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
        const cloudScenes = [];
        snap.forEach(docSnap => {
          cloudScenes.push({ id: docSnap.id, ...docSnap.data() });
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

