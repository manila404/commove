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

export const storeOTP = async (email: string, userName: string, uid?: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, userName, uid }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${response.status}`);
        }
        const data = await response.json();
        return !!data.success;
    } catch (err) {
        console.error("Failed to send OTP:", err);
        return false;
    }
};

export type OTPResult = 'valid' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found';

export const verifyOTP = async (email: string, entered: string, uid?: string): Promise<OTPResult> => {
    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, enteredCode: entered, uid }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${response.status}`);
        }
        const data = await response.json();
        return data.result as OTPResult;
    } catch (err) {
        console.error("Failed to verify OTP:", err);
        return 'not_found';
    }
};
