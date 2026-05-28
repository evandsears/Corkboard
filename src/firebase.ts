import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

// Allow overriding Firebase config in local / Android builds via environment variables.
// If VITE_FIREBASE_API_KEY is not defined, we fallback to the default workspace-managed Firebase project.
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = metaEnv.VITE_FIREBASE_API_KEY ? {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || "(default)",
} : defaultFirebaseConfig;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence.
    console.warn('Firestore persistence failed: Browser not supported');
  } else {
    console.error('Firestore persistence error:', err);
  }
});
