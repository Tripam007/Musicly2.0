// Musicly Coffee & Creator Donations Ledger DB (Real-time Cloud Firestore + Offline Cache)
import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

const STORAGE_KEY = 'musicly_coffee_donations';
const SETTING_DOC_PATH = ['public_settings', 'coffee_donations'];

const FAKE_DONOR_NAMES = new Set([
  'Aarav Mehta',
  'Priya Patel',
  'Devansh K.',
  'Elena Rostova',
  'Kabir Sharma',
  'Ananya Roy'
]);

/**
 * Filter out any mock / fake / seeded donations
 */
export function purgeFakeSeedDonations(list = []) {
  if (!Array.isArray(list)) return [];
  return list.filter(item => {
    if (!item) return false;
    if (typeof item.id === 'string' && item.id.startsWith('coffee_seed_')) return false;
    if (item.donorName && FAKE_DONOR_NAMES.has(item.donorName.trim())) return false;
    return true;
  });
}

/**
 * 0ms Synchronous Local Storage Reader
 * Strictly returns only authentic donations (purges any legacy fake seeds).
 */
export function getLocalCoffeeDonations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const clean = purgeFakeSeedDonations(parsed);
        if (clean.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
        return clean.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    }
  } catch (e) {
    console.warn('Error reading local coffee donations:', e);
  }
  return [];
}

/**
 * Save authentic donations to local storage
 */
export function saveLocalCoffeeDonations(donations = []) {
  try {
    const clean = purgeFakeSeedDonations(donations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Error saving local coffee donations:', e);
  }
}

/**
 * Load all authentic coffee donations from Cloud Firestore with local cache fallback
 */
export async function loadCoffeeDonations() {
  const localData = getLocalCoffeeDonations();

  if (firestore) {
    try {
      const docRef = doc(firestore, ...SETTING_DOC_PATH);
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);

      if (snap && snap.exists()) {
        const cloudData = snap.data();
        const rawDonations = Array.isArray(cloudData?.donations) ? cloudData.donations : [];
        const clean = purgeFakeSeedDonations(rawDonations).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        saveLocalCoffeeDonations(clean);
        return clean;
      }
    } catch (err) {
      console.warn('Firestore coffee ledger fetch notice (using local data):', err.message);
    }
  }

  return localData;
}

/**
 * Real-time listener for creator coffee donations.
 * Synchronizes new contributions, edits, and deletions instantly across all devices.
 */
export function subscribeCoffeeDonations(callback) {
  if (typeof callback !== 'function') return () => {};

  let unsubFirestore = null;

  // 1. Subscribe to Cloud Firestore in real time
  if (firestore) {
    try {
      const docRef = doc(firestore, ...SETTING_DOC_PATH);
      unsubFirestore = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          const rawDonations = Array.isArray(cloudData?.donations) ? cloudData.donations : [];
          const clean = purgeFakeSeedDonations(rawDonations).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          saveLocalCoffeeDonations(clean);
          callback(clean);
        } else {
          // Empty or uninitialized
          const local = getLocalCoffeeDonations();
          callback(local);
        }
      }, (err) => {
        console.warn('Firestore real-time coffee ledger subscription notice:', err.message);
      });
    } catch (err) {
      console.warn('Failed to attach Firestore coffee listener:', err);
    }
  }

  // 2. Also listen for same-device local window broadcasts for instant 0ms optimistic UI
  const handleLocalEvent = (e) => {
    const updated = e?.detail?.donations || getLocalCoffeeDonations();
    callback(updated);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('musicly_coffee_donations_changed', handleLocalEvent);
  }

  return () => {
    if (unsubFirestore) {
      try { unsubFirestore(); } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('musicly_coffee_donations_changed', handleLocalEvent);
    }
  };
}

/**
 * Add a new donation record (instantly persisted to Cloud Firestore in real time)
 */
export async function addCoffeeDonation(record) {
  const donation = {
    id: record.id || `coffee_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    donorName: record.donorName?.trim() || 'Generous Listener',
    amount: Number(record.amount) || 50,
    currency: record.currency || '₹',
    cups: Number(record.cups) || Math.max(1, Math.round((Number(record.amount) || 50) / 50)),
    message: record.message?.trim() || 'A coffee for the music! ☕',
    timestamp: record.timestamp || Date.now(),
    paymentMethod: record.paymentMethod || 'UPI • pingpay',
    verified: true,
  };

  // 1. Optimistic local update
  const currentLocal = getLocalCoffeeDonations();
  const updatedList = [donation, ...currentLocal.filter(d => d.id !== donation.id)]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  saveLocalCoffeeDonations(updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_coffee_donations_changed', { 
      detail: { donations: updatedList, newDonation: donation } 
    }));
  }

  // 2. Persist to Cloud Firestore in real time
  if (firestore) {
    try {
      const docRef = doc(firestore, ...SETTING_DOC_PATH);
      const snap = await getDoc(docRef).catch(() => null);
      let existingCloud = [];
      if (snap && snap.exists()) {
        existingCloud = Array.isArray(snap.data()?.donations) ? snap.data().donations : [];
      } else {
        existingCloud = currentLocal;
      }

      const merged = purgeFakeSeedDonations([
        donation, 
        ...existingCloud.filter(d => d.id !== donation.id)
      ]).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      await setDoc(docRef, {
        donations: merged,
        updatedAt: Date.now()
      }, { merge: true });

      // Also mirror to coffee_donations collection for secondary index/backup
      try {
        const colDocRef = doc(firestore, 'coffee_donations', donation.id);
        setDoc(colDocRef, donation).catch(() => {});
      } catch (_) {}

    } catch (err) {
      console.warn('Firestore donation save notice (saved locally):', err.message);
    }
  }

  return donation;
}

/**
 * Delete a donation record from Cloud Firestore and local cache
 */
export async function deleteCoffeeDonation(donationId) {
  // 1. Optimistic local update
  const currentLocal = getLocalCoffeeDonations();
  const updatedList = currentLocal.filter(d => d.id !== donationId);
  saveLocalCoffeeDonations(updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('musicly_coffee_donations_changed', { 
      detail: { donations: updatedList, deletedId: donationId } 
    }));
  }

  // 2. Persist deletion to Cloud Firestore in real time
  if (firestore) {
    try {
      const docRef = doc(firestore, ...SETTING_DOC_PATH);
      const snap = await getDoc(docRef).catch(() => null);
      if (snap && snap.exists()) {
        const cloudDonations = Array.isArray(snap.data()?.donations) ? snap.data().donations : [];
        const filtered = cloudDonations.filter(d => d.id !== donationId);
        await setDoc(docRef, {
          donations: filtered,
          updatedAt: Date.now()
        }, { merge: true });
      }

      // Also remove from collection if present
      try {
        const colDocRef = doc(firestore, 'coffee_donations', donationId);
        deleteDoc(colDocRef).catch(() => {});
      } catch (_) {}

    } catch (err) {
      console.warn('Firestore donation delete notice:', err.message);
    }
  }
}

/**
 * Compute key aggregate metrics for the admin ledger
 */
export function calculateDonationStats(donations = []) {
  const clean = purgeFakeSeedDonations(donations);
  const totalAmount = clean.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalCups = clean.reduce((sum, d) => sum + (Number(d.cups) || 1), 0);
  const totalSupporters = clean.length;
  const avgDonation = totalSupporters > 0 ? Math.round(totalAmount / totalSupporters) : 0;

  return {
    totalAmount,
    totalCups,
    totalSupporters,
    avgDonation,
  };
}

/**
 * Format relative time (e.g. "3m ago", "2h ago", "Yesterday", "3d ago", "23d ago")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}
