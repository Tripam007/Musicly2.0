import { firestore } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'track_likes';

/**
 * Computes a deterministic, natural base like count for any song
 * so every track has an authentic baseline count (e.g. 18 to 140).
 */
export function getTrackBaseLikes(track) {
  if (!track) return 14;
  const str = String(track.id || track.title || 'musicly');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  return 12 + (positive % 78); // Deterministic baseline between 12 and 89
}

/**
 * Subscribes to live like count for a track from Cloud Firestore.
 * Fallbacks seamlessly to local cache if offline or unauthenticated.
 */
export function subscribeRealtimeTrackLikes(track, onCountChange) {
  if (!track) return { cleanup: () => {} };
  const trackId = String(track.id || track.title || 'track').replace(/[\/\s#$[\]]/g, '_');
  const baseLikes = getTrackBaseLikes(track);
  const cacheKey = `musicly_likes_${trackId}`;

  // Read local cache first for instant UI response
  let cachedDelta = 0;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) {
      cachedDelta = parseInt(cached, 10) || 0;
    }
  } catch {}

  onCountChange(Math.max(0, baseLikes + cachedDelta));

  if (!firestore) {
    return { cleanup: () => {} };
  }

  let unsubscribe = null;
  try {
    const docRef = doc(firestore, COLLECTION_NAME, trackId);
    unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        const firestoreCount = typeof data?.likesCount === 'number' 
          ? data.likesCount 
          : (typeof data?.count === 'number' ? data.count : 0);
        
        try {
          localStorage.setItem(cacheKey, String(firestoreCount));
        } catch {}

        onCountChange(Math.max(0, baseLikes + firestoreCount));
      }
    }, (err) => {
      console.warn('[realtimeTrackLikes] Snapshot notice:', err.message);
    });
  } catch (e) {
    console.warn('[realtimeTrackLikes] Subscribe error:', e);
  }

  return {
    cleanup: () => {
      if (unsubscribe) {
        try { unsubscribe(); } catch {}
      }
    }
  };
}

/**
 * Atomically records or removes a like in Cloud Firestore and local storage.
 */
export async function toggleRealtimeTrackLike(track, willLike, user = null) {
  if (!track) return;
  const trackId = String(track.id || track.title || 'track').replace(/[\/\s#$[\]]/g, '_');
  const cacheKey = `musicly_likes_${trackId}`;
  const delta = willLike ? 1 : -1;

  // 1. Update local cache immediately
  let newDelta = delta;
  try {
    const cached = localStorage.getItem(cacheKey);
    const prev = cached !== null ? parseInt(cached, 10) || 0 : 0;
    newDelta = Math.max(0, prev + delta);
    localStorage.setItem(cacheKey, String(newDelta));
  } catch {}

  // 2. Persist to Cloud Firestore in real time
  if (firestore) {
    try {
      const docRef = doc(firestore, COLLECTION_NAME, trackId);
      await setDoc(docRef, {
        trackId,
        title: track.title || '',
        artist: track.artist || '',
        likesCount: increment(delta),
        updatedAt: Date.now(),
        lastActive: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('[realtimeTrackLikes] Firestore sync notice (saved locally):', e.message);
    }
  }
}
