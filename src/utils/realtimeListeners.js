import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = 'active_listeners';
const HEARTBEAT_INTERVAL_MS = 25000;
const STALE_THRESHOLD_MS = 60000;

let currentSessionId = null;

function getSessionId() {
  if (currentSessionId) return currentSessionId;
  try {
    let id = sessionStorage.getItem('musicly_presence_session_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('musicly_presence_session_id', id);
    }
    currentSessionId = id;
    return id;
  } catch {
    currentSessionId = 'usr_' + Math.random().toString(36).substring(2, 9);
    return currentSessionId;
  }
}

let isLocalPlaying = false;

/**
 * Updates the current user's playback status in the Firestore presence system immediately.
 */
export function updateRealtimePresencePlaying(isPlaying) {
  isLocalPlaying = !!isPlaying;
  if (!firestore) return;
  try {
    const sessionId = getSessionId();
    const docRef = doc(firestore, COLLECTION_NAME, sessionId);
    setDoc(docRef, {
      sessionId,
      isPlaying: isLocalPlaying,
      updatedAt: Date.now(),
      lastActive: serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch {}
}

/**
 * Subscribes to real-time active listener counts across all active users playing songs.
 * Returns a cleanup handle to unsubscribe and clear heartbeats.
 */
export function subscribeRealtimeListeners(initialIsPlaying, onCountChange) {
  isLocalPlaying = !!initialIsPlaying;
  const sessionId = getSessionId();
  let heartbeatTimer = null;
  let unsubscribeSnapshot = null;

  const sendHeartbeat = () => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, COLLECTION_NAME, sessionId);
      setDoc(docRef, {
        sessionId,
        isPlaying: isLocalPlaying,
        updatedAt: Date.now(),
        lastActive: serverTimestamp()
      }, { merge: true }).catch(() => {});
    } catch {}
  };

  // 1. Initial heartbeat
  sendHeartbeat();

  // 2. Periodic heartbeat
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // 3. Real-time Firestore snapshot listener
  if (firestore) {
    try {
      const colRef = collection(firestore, COLLECTION_NAME);
      unsubscribeSnapshot = onSnapshot(colRef, (snapshot) => {
        const now = Date.now();
        let realCount = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Count only active listeners whose heartbeat is fresh (< 60s) and currently playing songs
          const isFresh = data?.updatedAt && (now - data.updatedAt < STALE_THRESHOLD_MS);
          if (isFresh && data.isPlaying) {
            realCount++;
          }
        });

        // Ensure if current user is locally playing, they are counted
        if (isLocalPlaying && realCount === 0) {
          realCount = 1;
        }

        onCountChange(realCount);
      }, (err) => {
        console.warn('[RealtimeListeners] Snapshot notice:', err.message);
        onCountChange(isLocalPlaying ? 1 : 0);
      });
    } catch (e) {
      onCountChange(isLocalPlaying ? 1 : 0);
    }
  } else {
    onCountChange(isLocalPlaying ? 1 : 0);
  }

  // 4. Handle window beforeunload / tab close
  const handleUnload = () => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, COLLECTION_NAME, sessionId);
      deleteDoc(docRef).catch(() => {});
    } catch {}
  };

  window.addEventListener('beforeunload', handleUnload);

  return {
    cleanup: () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    }
  };
}
