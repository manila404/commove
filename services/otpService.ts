const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS  = 5;

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

interface OTPRecord {
    code:      string;
    expiresAt: number;
    attempts:  number;
}

const toKey = (email: string) =>
    `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

export const generateOTP = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

export const storeOTP = async (email: string, otp: string): Promise<void> => {
    const record: OTPRecord = {
        code:      otp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts:  0,
    };
    sessionStorage.setItem(toKey(email), JSON.stringify(record));
    // DEV: log so you can verify the code matches the email
    console.info(`[OTP] Stored code for ${email}: ${otp}`);
};

export type OTPResult = 'valid' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found';

export const verifyOTP = async (email: string, entered: string): Promise<OTPResult> => {
    const raw = sessionStorage.getItem(toKey(email));
    if (!raw) return 'not_found';

    const record: OTPRecord = JSON.parse(raw);

    if (record.attempts >= MAX_ATTEMPTS) return 'too_many_attempts';
    if (Date.now() > record.expiresAt)   return 'expired';

    record.attempts++;
    sessionStorage.setItem(toKey(email), JSON.stringify(record));

    if (record.code !== entered.trim()) return 'invalid';

    sessionStorage.removeItem(toKey(email)); // invalidate after successful use
    return 'valid';
};
