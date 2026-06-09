import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface CaptchaProps {
    onValidate?: (isValid: boolean) => void;
}

export interface CaptchaRef {
    reset: () => void;
    execute: () => Promise<string | null>;
}

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(({ onValidate }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY || '';
    const isDarkMode = document.documentElement.classList.contains('dark');

    // If no site key is configured, bypass reCAPTCHA entirely to avoid
    // timeout errors from the Google test key in production.
    const isBypassed = !siteKey;

    useImperativeHandle(ref, () => ({
        reset: () => {
            if (!isBypassed) {
                recaptchaRef.current?.reset();
            }
            onValidate?.(false);
        },
        execute: async () => {
            if (isBypassed) {
                console.info('[Captcha] No VITE_RECAPTCHA_SITE_KEY configured — bypassing reCAPTCHA.');
                onValidate?.(true);
                return 'bypassed';
            }
            try {
                const token = await recaptchaRef.current?.executeAsync() || null;
                return token;
            } catch (error) {
                console.error("reCAPTCHA execution error:", error);
                return null;
            }
        }
    }));

    const onChange = (value: string | null) => {
        console.log("Captcha onChange value:", value);
        onValidate?.(!!value);
    };

    if (isBypassed) {
        // Render nothing when reCAPTCHA is not configured
        return null;
    }

    return (
        <div className="flex justify-center py-0 h-0 overflow-hidden">
            <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey}
                onChange={onChange}
                size="invisible"
                theme={isDarkMode ? "dark" : "light"}
            />
        </div>
    );
});

Captcha.displayName = 'Captcha';

export default Captcha;
