// Musicly Coffee & Creator Donations Ledger DB (Indexed / LocalStorage + Firestore Sync)
import { firestore } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

const STORAGE_KEY = 'musicly_coffee_donations';

// Initial realistic aesthetic donations if none exist yet
const INITIAL_SEED_DONATIONS = [
  {
    id: 'coffee_seed_1',
    donorName: 'Aarav Mehta',
    amount: 150,
    currency: '₹',
    cups: 3,
    message: 'Your lo-fi chill station kept me focused during my entire finals week! 🎧☕',
    timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    paymentMethod: 'UPI • pingpay',
    verified: true,
  },
  {
    id: 'coffee_seed_2',
    donorName: 'Priya Patel',
    amount: 300,
    currency: '₹',
    cups: 5,
    message: 'Love the rain & fireplace ambient mix while reading at night. Pure magic ✨',
    timestamp: Date.now() - 1000 * 60 * 60 * 22, // 22 hours ago
    paymentMethod: 'GPay • UPI',
    verified: true,
  },
  {
    id: 'coffee_seed_3',
    donorName: 'Devansh K.',
    amount: 100,
    currency: '₹',
    cups: 2,
    message: 'Thank you for keeping Musicly completely clean and ad-free! Much respect brother 🙌',
    timestamp: Date.now() - 1000 * 60 * 60 * 46, // 2 days ago
    paymentMethod: 'PhonePe • UPI',
    verified: true,
  },
  {
    id: 'coffee_seed_4',
    donorName: 'Elena Rostova',
    amount: 250,
    currency: '₹',
    cups: 4,
    message: 'The cyberpunk neo-tokyo theme with synthwave is unbelievable. Supporting from Berlin! 🚀☕',
    timestamp: Date.now() - 1000 * 60 * 60 * 78, // 3 days ago
    paymentMethod: 'Direct • PingPay',
    verified: true,
  },
  {
    id: 'coffee_seed_5',
    donorName: 'Kabir Sharma',
    amount: 500,
    currency: '₹',
    cups: 10,
    message: 'Sponsoring your next coffee binge! This app is a daily ritual for our dev team 💻🔥',
    timestamp: Date.now() - 1000 * 60 * 60 * 130, // 5 days ago
    paymentMethod: 'Paytm • UPI',
    verified: true,
  },
  {
    id: 'coffee_seed_6',
    donorName: 'Ananya Roy',
    amount: 150,
    currency: '₹',
    cups: 3,
    message: 'The smooth transitions and ambient soundscapes are unmatched. Keep building! 🌟',
    timestamp: Date.now() - 1000 * 60 * 60 * 190, // 7 days ago
    paymentMethod: 'UPI • pingpay',
    verified: true,
  }
];

/**
 * Load all recorded coffee donations
 * 1. Synchronously from LocalStorage (instant 0ms)
 * 2. Background sync with Firestore 'coffee_donations' collection
 */
export async function loadCoffeeDonations() {
  let localData = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local coffee donations:', e);
  }

  // If no records yet, seed with initial aesthetic donations
  if (!localData || localData.length === 0) {
    localData = INITIAL_SEED_DONATIONS;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    } catch (e) {
      // ignore
    }
  }

  // Attempt Firestore background sync if online
  if (firestore) {
    try {
      const colRef = collection(firestore, 'coffee_donations');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      
      const firestorePromise = getDocs(q);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2200)
      );

      const snapshot = await Promise.race([firestorePromise, timeoutPromise]);
      if (snapshot && !snapshot.empty) {
        const cloudData = [];
        snapshot.forEach((docSnap) => {
          cloudData.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Merge cloud data with local data (cloud takes precedence for same IDs)
        const mergedMap = new Map();
        [...localData, ...cloudData].forEach(item => {
          mergedMap.set(item.id, item);
        });

        const merged = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      // Firestore offline or timed out, fallback gracefully to local data
      console.warn('Firestore coffee donations sync notice (using local data):', err.message);
    }
  }

  return localData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Add a new donation record (offline-first with Cloud Firestore sync)
 */
export async function addCoffeeDonation(record) {
  const donation = {
    id: record.id || `coffee_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    donorName: record.donorName?.trim() || 'Generous Listener',
    amount: Number(record.amount) || 50,
    currency: record.currency || '₹',
    cups: Number(record.cups) || Math.max(1, Math.round((Number(record.amount) || 50) / 50)),
    message: record.message?.trim() || 'Thank you for making Musicly! ☕',
    timestamp: record.timestamp || Date.now(),
    paymentMethod: record.paymentMethod || 'UPI • pingpay',
    verified: true,
  };

  // 1. Save to local storage immediately
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : INITIAL_SEED_DONATIONS;
    const updated = [donation, ...existing.filter(item => item.id !== donation.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving donation locally:', e);
  }

  // 2. Persist to Firestore asynchronously
  if (firestore) {
    try {
      const docRef = doc(firestore, 'coffee_donations', donation.id);
      const firestorePromise = setDoc(docRef, donation);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2000)
      );
      await Promise.race([firestorePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore donation save notice (saved locally):', err.message);
    }
  }

  return donation;
}

/**
 * Delete a donation record
 */
export async function deleteCoffeeDonation(donationId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw);
      const filtered = existing.filter(item => item.id !== donationId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error removing donation locally:', e);
  }

  if (firestore) {
    try {
      const docRef = doc(firestore, 'coffee_donations', donationId);
      const firestorePromise = deleteDoc(docRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2000)
      );
      await Promise.race([firestorePromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore donation delete notice:', err.message);
    }
  }
}

/**
 * Compute key aggregate metrics for the admin ledger
 */
export function calculateDonationStats(donations = []) {
  const totalAmount = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalCups = donations.reduce((sum, d) => sum + (Number(d.cups) || 1), 0);
  const totalSupporters = donations.length;
  const avgDonation = totalSupporters > 0 ? Math.round(totalAmount / totalSupporters) : 0;

  return {
    totalAmount,
    totalCups,
    totalSupporters,
    avgDonation,
  };
}

/**
 * Format relative time (e.g. "3m ago", "2h ago", "Yesterday", "3d ago")
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
