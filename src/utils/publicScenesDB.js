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

