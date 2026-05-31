import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  ?? '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '';
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  ?? '';

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
    } catch (err) {
        console.error('[EmailJS] Failed to send OTP:', err);
        return false;
    }
};
