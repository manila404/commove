import React, { useState, useRef, useEffect, useCallback } from 'react';
import { verifyOTP, storeOTP, type OTPResult } from '../services/otpService';

interface OTPVerificationProps {
    email:       string;
    userName:    string;
    uid?:        string;
    onVerified:  () => void;
    onBack:      () => void;
}

const OTP_LENGTH      = 6;
const RESEND_COOLDOWN = 60;  // seconds before resend is allowed
const EXPIRY_SECONDS  = 600; // 10 minutes

const OTPVerification: React.FC<OTPVerificationProps> = ({
    email, userName, uid, onVerified, onBack,
}) => {
    const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [error, setError]             = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
    const [timeLeft, setTimeLeft]       = useState(EXPIRY_SECONDS);
    const [sent, setSent]               = useState(true); // first send happens before this mounts
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown for OTP expiry
    useEffect(() => {
        if (timeLeft <= 0) return;
        const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(id);
    }, [timeLeft]);

    // Countdown for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const id = setInterval(() => setResendCooldown(c => c - 1), 1000);
        return () => clearInterval(id);
    }, [resendCooldown]);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const focusIndex = (i: number) => inputRefs.current[i]?.focus();

    const handleChange = (index: number, value: string) => {
        // Allow only digits
        const digit = value.replace(/\D/g, '').slice(-1);
        const next  = [...digits];
        next[index] = digit;
        setDigits(next);
        setError('');

        if (digit && index < OTP_LENGTH - 1) focusIndex(index + 1);

        // Auto-submit when last digit filled
        if (digit && index === OTP_LENGTH - 1) {
            const code = [...next.slice(0, -1), digit].join('');
            if (code.length === OTP_LENGTH) handleVerify(code);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            } else if (index > 0) {
                focusIndex(index - 1);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusIndex(index - 1);
        } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            focusIndex(index + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (!pasted) return;
        const next = Array(OTP_LENGTH).fill('');
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        setError('');
        focusIndex(Math.min(pasted.length, OTP_LENGTH - 1));
        if (pasted.length === OTP_LENGTH) handleVerify(pasted);
    };

    const handleVerify = useCallback(async (code?: string) => {
        const entered = code ?? digits.join('');
        if (entered.length < OTP_LENGTH) {
            setError('Please enter all 6 digits.');
            return;
        }
        if (timeLeft <= 0) {
            setError('This code has expired. Please request a new one.');
            return;
        }

        setIsVerifying(true);
        setError('');

        const result: OTPResult = await verifyOTP(email, entered, uid);

        setIsVerifying(false);

        if (result === 'valid') {
            onVerified();
        } else if (result === 'expired') {
            setError('This code has expired. Please request a new one.');
            setDigits(Array(OTP_LENGTH).fill(''));
            focusIndex(0);
        } else if (result === 'too_many_attempts') {
            setError('Too many incorrect attempts. Please request a new code.');
            setDigits(Array(OTP_LENGTH).fill(''));
            focusIndex(0);
        } else {
            setError('Incorrect code. Please try again.');
            setDigits(Array(OTP_LENGTH).fill(''));
            focusIndex(0);
        }
    }, [digits, email, timeLeft, onVerified]);

    const handleResend = async () => {
        if (resendCooldown > 0 || isResending) return;
        setIsResending(true);
        setError('');

        const ok   = await storeOTP(email, userName, uid);

        setIsResending(false);

        if (ok) {
            setSent(true);
            setDigits(Array(OTP_LENGTH).fill(''));
            setTimeLeft(EXPIRY_SECONDS);
            setResendCooldown(RESEND_COOLDOWN);
            focusIndex(0);
        } else {
            setError('Failed to resend. Please try again.');
        }
    };

    const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2');

    return (
        <div className="w-full flex flex-col items-center">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1 text-center">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                We sent a 6-digit verification code to
            </p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center mb-6">{maskedEmail}</p>

            {/* Digit inputs */}
            <div className="flex gap-2.5 mb-4" onPaste={handlePaste}>
                {digits.map((d, i) => (
                    <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        autoFocus={i === 0}
                        onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className={`w-11 h-13 text-center text-xl font-extrabold rounded-xl border-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all
                            ${d ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'}
                            ${error ? 'border-red-400 dark:border-red-500' : ''}
                            focus:border-purple-500 dark:focus:border-purple-400 focus:bg-purple-50 dark:focus:bg-purple-900/20`}
                        style={{ width: '2.75rem', height: '3.25rem' }}
                    />
                ))}
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-500 dark:text-red-400 text-xs text-center mb-3">{error}</p>
            )}

            {/* Expiry timer */}
            <p className={`text-xs text-center mb-5 ${timeLeft <= 60 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                {timeLeft > 0 ? `Code expires in ${fmt(timeLeft)}` : 'Code has expired'}
            </p>

            {/* Verify button */}
            <button
                onClick={() => handleVerify()}
                disabled={isVerifying || digits.join('').length < OTP_LENGTH}
                className="w-full py-3 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold text-sm transition-all active:scale-[0.98] mb-4 flex items-center justify-center gap-2"
            >
                {isVerifying ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Verifying…
                    </>
                ) : 'Verify Code'}
            </button>

            {/* Resend */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                Didn't receive the code?{' '}
                <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    className="font-bold text-purple-600 dark:text-purple-400 disabled:text-gray-400 dark:disabled:text-gray-600 hover:underline transition-colors"
                >
                    {isResending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
            </p>

            {/* Back */}
            <button
                onClick={onBack}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1"
            >
                ← Use a different email
            </button>
        </div>
    );
};

export default OTPVerification;
