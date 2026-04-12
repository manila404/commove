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
    const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Default test key
    const isDarkMode = document.documentElement.classList.contains('dark');

    useImperativeHandle(ref, () => ({
        reset: () => {
            recaptchaRef.current?.reset();
            onValidate?.(false);
        },
        execute: async () => {
            try {
                return await recaptchaRef.current?.executeAsync() || null;
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
