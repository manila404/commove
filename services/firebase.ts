
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAW0FmkuGN8qB2FeClympNiK6FrKQixdVU",
  authDomain: "commove-2a2ab.firebaseapp.com",
  projectId: "commove-2a2ab",
  storageBucket: "commove-2a2ab.firebasestorage.app",
  messagingSenderId: "925656900043",
  appId: "1:925656900043:web:c4639781f9320d138e164e"
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

// Connect to Firebase local emulators in development mode (localhost)
if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("🔥 Connected to Firebase Local Emulators (Auth: 9099, Firestore: 8080)");
    } catch (error) {
        console.warn("⚠️ Firebase local emulators already connected or connection failed:", error);
    }
}

export { app, auth, db };

