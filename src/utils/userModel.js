import { firestore } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// List of authorized admin emails (only tripambiswas007@gmail.com is authorized)
export const DEFAULT_ADMIN_EMAILS = [
  'tripambiswas007@gmail.com'
];

// Admin claim secret code for instant owner authorization during dev/testing
export const ADMIN_CLAIM_CODE = 'musicly-admin-2026';

/**
 * Get cached user role from localStorage for 0ms UI reactivity
 */
export function getCachedUserRole(userId) {
  if (!userId || userId.startsWith('guest_')) return 'user';
  try {
    const cached = localStorage.getItem(`musicly_user_role_${userId}`);
    return cached === 'admin' ? 'admin' : 'user';
  } catch (e) {
    return 'user';
  }
}

/**
 * Set cached user role
 */
export function setCachedUserRole(userId, role) {
  if (!userId || userId.startsWith('guest_')) return;
  try {
    localStorage.setItem(`musicly_user_role_${userId}`, role);
  } catch (e) {}
}

/**
 * Fast synchronous admin check using user object
 * Only tripambiswas007@gmail.com is authorized as admin; all other logins remain normal users
 */
export function checkIsAdmin(user) {
  if (!user || user.isAnonymous) return false;
  
  if (user.email) {
    const lowerEmail = user.email.toLowerCase().trim();
    return DEFAULT_ADMIN_EMAILS.some(ae => ae.toLowerCase().trim() === lowerEmail);
  }

  return false;
}

/**
 * Sync user profile to Firestore /users/{uid} and fetch definitive role
 */
export async function syncUserProfile(user) {
  if (!user || user.isAnonymous) {
    return { role: 'user', isAdmin: false };
  }

  const userId = user.uid;
  const isAuthorizedEmail = !!(user.email && DEFAULT_ADMIN_EMAILS.some(ae => ae.toLowerCase().trim() === user.email.toLowerCase().trim()));
  const role = isAuthorizedEmail ? 'admin' : 'user';

  if (firestore) {
    try {
      const userDocRef = doc(firestore, 'users', userId);
      const docSnap = await Promise.race([
        getDoc(userDocRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore getDoc timeout')), 2000))
      ]);

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        if (isAuthorizedEmail && data.role !== 'admin') {
          updateDoc(userDocRef, { role: 'admin', updatedAt: Date.now() }).catch(() => {});
        } else if (!isAuthorizedEmail && data.role === 'admin') {
          updateDoc(userDocRef, { role: 'user', updatedAt: Date.now() }).catch(() => {});
        }
      } else {
        // Create initial user document
        const newProfile = {
          uid: userId,
          email: user.email || null,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || null,
          role: role,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setDoc(userDocRef, newProfile).catch(() => {});
      }
    } catch (err) {
      console.warn("Firestore user profile sync warning:", err);
    }
  }

  setCachedUserRole(userId, role);
  return {
    role,
    isAdmin: isAuthorizedEmail
  };
}

/**
 * Allow authorized admin verification using secret code
 */
export async function claimAdminRole(user, secretCode) {
  if (!user || user.isAnonymous) {
    throw new Error("Must be logged in to verify admin role");
  }

  const isAuthorized = user.email && DEFAULT_ADMIN_EMAILS.some(ae => ae.toLowerCase().trim() === user.email.toLowerCase().trim());
  if (!isAuthorized) {
    throw new Error("Only the designated admin account (tripambiswas007@gmail.com) can be verified as admin.");
  }

  if (secretCode !== ADMIN_CLAIM_CODE) {
    throw new Error("Invalid admin verification code");
  }

  const userId = user.uid;
  setCachedUserRole(userId, 'admin');

  if (firestore) {
    try {
      const userDocRef = doc(firestore, 'users', userId);
      setDoc(userDocRef, {
        uid: userId,
        email: user.email || null,
        displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
        photoURL: user.photoURL || null,
        role: 'admin',
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn("Firestore admin role update notice:", e);
    }
  }

  return true;
}
