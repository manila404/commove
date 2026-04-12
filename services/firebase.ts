
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEKNCfxB7-vPjzIDgCLC1xlNXdBbrTNp8",
  authDomain: "commove-ad367.firebaseapp.com",
  projectId: "commove-ad367",
  storageBucket: "commove-ad367.appspot.com",
  messagingSenderId: "920145717652",
  appId: "1:920145717652:web:fbd0ecd6f065154f150781",
  measurementId: "G-TEHJMYVKQP"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with explicit local persistence and fallback
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Firebase Auth persistence error (falling back to memory):", error);
    setPersistence(auth, inMemoryPersistence);
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
