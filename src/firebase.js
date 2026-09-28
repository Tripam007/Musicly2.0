import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAmclRRhtzmSmeSsPPzSKLzzbYssCtuvz0",
  authDomain: "musicly-9fb78.firebaseapp.com",
  projectId: "musicly-9fb78",
  storageBucket: "musicly-9fb78.firebasestorage.app",
  messagingSenderId: "301488054253",
  appId: "1:301488054253:web:6c0bcea14da890ec85d1e4",
  measurementId: "G-LHGH87FTLE"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getStoredFirebaseConfig() {
  return firebaseConfig;
}

export function isFirebaseConfigured() {
  return true;
}

export function initFirebase(customConfig = null) {
  return { app, auth, googleProvider, isLive: true };
}

export { 
  app, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
};
