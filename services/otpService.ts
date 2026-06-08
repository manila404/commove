// ─── Persistent OTP-verification tracking ────────────────────────────────────
// localStorage persists across app restarts / WebView backgrounding so the
// user stays logged in when they minimize and reopen the app on Android.

export const markOTPVerified  = (uid: string) => localStorage.setItem(`otp_ok_${uid}`, '1');
export const isOTPVerified    = (uid: string) => localStorage.getItem(`otp_ok_${uid}`) === '1';
export const clearOTPVerified = (uid: string) => localStorage.removeItem(`otp_ok_${uid}`);

// Signup in progress — set before createUserWithEmailAndPassword so the
// auth gate doesn't sign the new user out before we can set the verified flag.
export const setSignupInProgress  = ()            => sessionStorage.setItem('otp_signup', '1');
export const clearSignupInProgress = ()           => sessionStorage.removeItem('otp_signup');
export const isSignupInProgress   = ()            => sessionStorage.getItem('otp_signup') === '1';

// Login in progress — set before signInWithEmailAndPassword so the
// auth gate doesn't sign the user out while they're on the OTP screen.
export const setLoginInProgress   = ()            => sessionStorage.setItem('otp_login', '1');
export const clearLoginInProgress = ()            => sessionStorage.removeItem('otp_login');
export const isLoginInProgress    = ()            => sessionStorage.getItem('otp_login') === '1';

// ─── Client-side OTP logic (no serverless functions required) ─────────────────
// Stores OTP in Firestore via the Firebase client SDK and sends email via EmailJS.
// This avoids the need for Firebase Admin SDK credentials in Vercel environment variables.

import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { sendOTPEmail } from './emailService';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS  = 5;

export type OTPResult = 'valid' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found';

export const storeOTP = async (email: string, userName: string, uid?: string): Promise<boolean> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const docId = uid || `otp_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

        // 1. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Store OTP in Firestore using the client SDK
        const otpRef = doc(db, 'otpCodes', docId);
        await setDoc(otpRef, {
            userId:    uid || docId,
            email:     cleanEmail,
            code:      otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts:  0,
        });

        console.info(`[OTP] Stored code securely in Firestore for ${cleanEmail}`);

        // 3. Send email via EmailJS from the browser
        const sent = await sendOTPEmail(cleanEmail, otp, userName || 'User');
        return sent;
    } catch (err) {
        console.error('Failed to send OTP:', err);
        return false;
    }
};

export const verifyOTP = async (email: string, entered: string, uid?: string): Promise<OTPResult> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const docId = uid || `otp_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

        const otpRef  = doc(db, 'otpCodes', docId);
        const snapshot = await getDoc(otpRef);

        if (!snapshot.exists()) return 'not_found';

        const record = snapshot.data();
        if (!record) return 'not_found';

        if (record.attempts >= MAX_ATTEMPTS) return 'too_many_attempts';

        if (Date.now() > record.expiresAt) return 'expired';

        if (record.code !== entered.trim()) {
            await updateDoc(otpRef, { attempts: increment(1) });
            return 'invalid';
        }

        // Success: delete the OTP record so it can't be reused
        await deleteDoc(otpRef);
        return 'valid';
    } catch (err) {
        console.error('Failed to verify OTP:', err);
        return 'not_found';
    }
};
