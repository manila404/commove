const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS  = 5;

// ─── Session OTP-verification tracking ───────────────────────────────────────
// sessionStorage is cleared when the tab is closed, so every new browser
// session must go through OTP even if Firebase has a persisted auth token.

export const markOTPVerified    = (uid: string) => sessionStorage.setItem(`otp_ok_${uid}`, '1');
export const isOTPVerified      = (uid: string) => sessionStorage.getItem(`otp_ok_${uid}`) === '1';
export const setSignupInProgress  = ()           => sessionStorage.setItem('otp_signup', '1');
export const clearSignupInProgress = ()          => sessionStorage.removeItem('otp_signup');
export const isSignupInProgress   = ()           => sessionStorage.getItem('otp_signup') === '1';

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
