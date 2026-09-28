// Musicly Song Request Database (LocalStorage + Firestore Cloud Sync)
import { firestore } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { extractYouTubeId } from './youtubePlayer';

const STORAGE_KEY = 'musicly_song_requests';

/**
 * Submit a song request from a user
 */
export async function submitSongRequest({
  title,
  artist,
  audioUrl = '',
  sections = [],
  language = 'English',
  note = '',
  user = null
}) {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = (title || '').trim();
  const cleanArtist = (artist || '').trim();
  const cleanUrl = (audioUrl || '').trim();
  const ytId = extractYouTubeId(cleanUrl);

  const requestRecord = {
    id: reqId,
    title: cleanTitle,
    artist: cleanArtist,
    audioUrl: cleanUrl,
    youtubeId: ytId || null,
    isYouTube: !!ytId,
    sections: Array.isArray(sections) && sections.length > 0 ? sections : ['Lo-Fi'],
    genre: (Array.isArray(sections) && sections.length > 0 ? sections : ['Lo-Fi']).join(', '),
    language: language || 'English',
    note: (note || '').trim(),
    adminNote: '',
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    userId: user?.uid || null,
    userEmail: user?.email || null,
    userName: user?.displayName || user?.email?.split('@')[0] || 'Musicly Listener',
    createdAt: Date.now(),
    createdDate: new Date().toISOString()
  };

  // 1. Save locally (offline-first, 0ms)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [requestRecord, ...existing.filter(r => r.id !== reqId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Notice saving song request locally:', err);
  }

  // 2. Persist to Firestore if available
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', reqId);
      const firestorePromise = setDoc(docRef, requestRecord);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      await Promise.race([firestorePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore song request sync notice (saved locally):', err.message);
    }
  }

  return { success: true, record: requestRecord };
}

/**
 * Load all song requests for Admin review
 */
export async function loadSongRequests() {
  let localRequests = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localRequests = JSON.parse(raw);
  } catch (e) {
    localRequests = [];
  }

  if (!firestore) return localRequests;

  try {
    const colRef = collection(firestore, 'song_requests');
    const firestorePromise = getDocs(colRef);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 2500)
    );
    const snapshot = await Promise.race([firestorePromise, timeoutPromise]);

    if (snapshot && !snapshot.empty) {
      const remote = [];
      snapshot.forEach(docSnap => {
        remote.push({ ...docSnap.data(), id: docSnap.id });
      });

      // Merge remote with local by ID, remote takes precedence
      const map = new Map();
      localRequests.forEach(item => map.set(item.id, item));
      remote.forEach(item => map.set(item.id, item));
      const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}

      return merged;
    }
  } catch (err) {
    console.warn('Notice fetching cloud song requests:', err.message);
  }

  return localRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Update the status of a song request (approved or rejected)
 */
export async function updateSongRequestStatus(requestId, status, publicTrackId = null) {
  // Update locally
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.id === requestId) {
          return { ...item, status, publicTrackId, reviewedAt: Date.now() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // Update in Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', requestId);
      const updatePromise = updateDoc(docRef, { status, publicTrackId, reviewedAt: Date.now() });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore update timeout')), 2000)
      );
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Notice updating request status in cloud:', e.message);
    }
  }
}

/**
 * Delete a song request permanently
 */
export async function deleteSongRequest(requestId) {
  // Delete locally
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.filter(item => item.id !== requestId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // Delete in Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', requestId);
      const deletePromise = deleteDoc(docRef);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore delete timeout')), 2000)
      );
      await Promise.race([deletePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Notice deleting request from cloud:', e.message);
    }
  }
}

/**
 * Update Admin Notes on a song request
 */
export async function updateSongRequestAdminNote(requestId, adminNote) {
  // Update locally
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.id === requestId) {
          return { ...item, adminNote, adminNoteUpdatedAt: Date.now() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // Update in Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', requestId);
      const updatePromise = updateDoc(docRef, { adminNote, adminNoteUpdatedAt: Date.now() });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore admin note timeout')), 2000)
      );
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Notice updating admin note in cloud:', e.message);
    }
  }
}

/**
 * Update audio source (URL / YouTube) on a song request
 */
export async function updateSongRequestAudio(requestId, audioUrl, extraData = {}) {
  // Update locally
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.id === requestId) {
          return { ...item, audioUrl, ...extraData, audioUpdatedAt: Date.now() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // Update in Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', requestId);
      const updatePromise = updateDoc(docRef, { audioUrl, ...extraData, audioUpdatedAt: Date.now() });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore audio update timeout')), 2000)
      );
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Notice updating song request audio in cloud:', e.message);
    }
  }
}

/**
 * Update editable song details (title, artist, sections, language) on a song request
 */
export async function updateSongRequestDetails(requestId, fields = {}) {
  // Update locally
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.id === requestId) {
          return { ...item, ...fields, updatedAt: Date.now() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  // Update in Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'song_requests', requestId);
      const updatePromise = updateDoc(docRef, { ...fields, updatedAt: Date.now() });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore update details timeout')), 2000)
      );
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Notice updating song request details in cloud:', e.message);
    }
  }
}
