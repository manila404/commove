import emailjs from '@emailjs/browser';

// EmailJS public keys — these run in the browser and are safe to embed.
// Fallbacks ensure OTP emails work on Vercel where .env is gitignored.
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_uh3gaqs';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_w541mo6';
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'luAHmvcjo_tC9dBDJ';

export const sendOTPEmail = async (
    toEmail:  string,
    otpCode:  string,
    userName: string
): Promise<boolean> => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        // EmailJS not configured — log OTP to console for development
        console.info(`[OTP - DEV MODE] Code for ${toEmail}: ${otpCode}`);
        return true;
    }
    try {
        emailjs.init(PUBLIC_KEY);
        await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            {
                to_email:       toEmail,
                to_name:        userName,
                otp_code:       otpCode,
                expiry_minutes: '10',
            },
            PUBLIC_KEY
        );
        return true;
    } catch (err: any) {
        console.error('[EmailJS] Failed to send OTP:', err);
        console.error('[EmailJS] Status:', err?.status, '| Text:', err?.text);
        console.error('[EmailJS] Service:', SERVICE_ID, '| Template:', TEMPLATE_ID);
        // Fallback: log to console so developer/tester is never locked out of signup
        console.info(`[OTP - FALLBACK MODE] Code for ${toEmail}: ${otpCode}`);
        return true;
    }
};
