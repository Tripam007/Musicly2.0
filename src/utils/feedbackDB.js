// Musicly Feedback & Review DB (LocalStorage + Cloud Firestore Sync)
import { firestore } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';

const STORAGE_KEY = 'musicly_user_feedback';

/**
 * Submit user review / feedback
 * Works for both logged-in users and anonymous/guest users.
 * Persists to LocalStorage and Firestore with safety timeout.
 */
export async function submitFeedback({ rating, comments, user, guestName, guestEmail }) {
  const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  
  const record = {
    id: feedbackId,
    rating: Number(rating) || 5,
    comments: (comments || '').trim(),
    userId: user?.uid || null,
    userEmail: user?.email || (guestEmail || '').trim() || null,
    userName: user?.displayName || (guestName || '').trim() || (user ? 'Musicly Member' : 'Anonymous Listener'),
    isAnonymous: !user || !!user.isAnonymous,
    createdAt: Date.now(),
    createdDate: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
  };

  // 1. Save to LocalStorage immediately (0ms, offline-first)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [record, ...existing.filter(item => item.id !== record.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Notice saving feedback to localStorage:', err);
  }

  // 2. Persist to Firestore if online
  if (firestore) {
    try {
      const docRef = doc(firestore, 'feedback', record.id);
      const firestorePromise = setDoc(docRef, record);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      await Promise.race([firestorePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore feedback sync notice (saved locally):', err.message);
    }
  }

  return { success: true, record };
}

/**
 * Load saved feedback (from local storage + Firestore)
 */
export async function loadSavedFeedback() {
  let localData = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {
    console.warn('Notice reading local feedback:', e);
  }

  if (firestore) {
    try {
      const colRef = collection(firestore, 'feedback');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
      const firestorePromise = getDocs(q);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2200)
      );
      const snapshot = await Promise.race([firestorePromise, timeoutPromise]);
      if (snapshot && !snapshot.empty) {
        const cloudData = [];
        snapshot.forEach(docSnap => cloudData.push({ id: docSnap.id, ...docSnap.data() }));
        const mergedMap = new Map();
        [...localData, ...cloudData].forEach(item => mergedMap.set(item.id, item));
        const merged = Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    } catch (e) {
      // Graceful fallback to localData
    }
  }

  return localData;
}

/**
 * Delete a feedback entry (local storage + Firestore)
 */
export async function deleteFeedback(feedbackId) {
  // 1. Remove from LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw);
      const updated = existing.filter(item => item.id !== feedbackId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Notice deleting feedback locally:', err);
  }

  // 2. Remove from Firestore
  if (firestore) {
    try {
      const docRef = doc(firestore, 'feedback', feedbackId);
      const firestorePromise = deleteDoc(docRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      await Promise.race([firestorePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Notice deleting feedback from cloud:', err);
    }
  }

  return true;
}
