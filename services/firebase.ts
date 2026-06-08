
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEKNCfxB7-vPjzIDgCLC1xlNXdBbrTNp8",
  authDomain: "commove-ad367.firebaseapp.com",
  projectId: "commove-ad367",
  storageBucket: "commove-ad367.appspot.com",
  messagingSenderId: "920145717652",
  appId: "1:920145717652:web:fbd0ecd6f065154f150781",
  measurementId: "G-TEHJMYVKQP"
};

// Guard against duplicate initialization during Vite HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with explicit local persistence and fallback
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Firebase Auth persistence error (falling back to memory):", error);
    setPersistence(auth, inMemoryPersistence);
});

// Use IndexedDB-backed persistent cache to prevent Firestore watch-stream assertion
// errors (INTERNAL ASSERTION FAILED: Unexpected state) in Firebase SDK 10–12.
// Falls back to the default in-memory instance if already initialized (HMR).
let db;
try {
    db = initializeFirestore(app, { 
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true
    });
} catch {
    db = getFirestore(app);
}

export { app, auth, db };
