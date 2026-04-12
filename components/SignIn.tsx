
import React, { useState, useRef } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { EyeIcon, EyeSlashIcon, ChevronLeftIcon, CommoveLogo } from '../constants';
import Captcha, { CaptchaRef } from './Captcha';

interface SignInProps {
    onSwitchToSignUp: () => void;
    onAuthSuccess: () => void;
    onGuestAccess?: () => void;
    hideSignUp?: boolean;
}

const SignIn: React.FC<SignInProps> = ({ onSwitchToSignUp, onAuthSuccess, onGuestAccess, hideSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const captchaRef = useRef<CaptchaRef>(null);
    
    const [rememberMe, setRememberMe] = useState(() => {
        try {
            return localStorage.getItem('rememberMe') === 'true';
        } catch (e) { return false; }
    });
    
    // Load saved email if rememberMe is true
    React.useEffect(() => {
        if (rememberMe) {
            try {
                const savedEmail = localStorage.getItem('savedEmail');
                if (savedEmail) setEmail(savedEmail);
            } catch (e) {}
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);

        try {
            // Execute invisible reCAPTCHA
            const token = await captchaRef.current?.execute();
            if (!token) {
                setError('Captcha verification failed. Please try again.');
                setIsLoading(false);
                return;
            }

            await signInWithEmailAndPassword(auth, email, password);
            
            // Save email if rememberMe is checked
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('savedEmail');
                localStorage.setItem('rememberMe', 'false');
            }
            
            onAuthSuccess();
        } catch (error: any) {
            // Improved error handling
            const errorCode = error.code;
            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                setError('Invalid email or password. Please check your credentials.');
            } else if (errorCode === 'auth/too-many-requests') {
                setError('Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or try again later.');
            } else {
                // Only log unexpected errors
                console.error("Sign in error", error);
                setError('Failed to sign in. Please try again.');
            }
            // Reset captcha on error
            captchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        if (!email) {
            setError('Please enter your email address.');
            setIsLoading(false);
            return;
        }

        try {
            // Removed actionCodeSettings to avoid "Domain not allowlisted" errors.
            // This will use the default Firebase password reset flow.
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage('If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.');
        } catch (error: any) {
            console.error("Password reset error:", error);
            if (error.code === 'auth/user-not-found') {
                setError('No account found with this email.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else {
                setError(error.message || 'Failed to send reset email. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isResettingPassword) {
        return (
            <div className="w-full">
                <div className="relative text-left mb-6">
                     <button 
                        type="button"
                        onClick={() => { setIsResettingPassword(false); setError(''); setSuccessMessage(''); }} 
                        className="absolute -left-2 -top-8 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
                </div>
                
                 <p className="text-gray-600 dark:text-gray-400 mb-6 text-left text-sm">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                     <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                    </div>
                    
                     {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                     {successMessage && <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl"><p className="text-green-600 dark:text-green-400 text-xs text-center">{successMessage}</p></div>}

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-full hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:bg-gray-400 text-base active:scale-95"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="text-left mb-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sign in</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                    />
                </div>
                <div className="relative">
                    <input
                        type={passwordVisible ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 dark:text-gray-500">
                       {passwordVisible ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                    </button>
                </div>
                
                <div className="py-2">
                    <Captcha ref={captchaRef} />
                </div>
                
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                <div className="flex justify-end px-2">
                    <button 
                        type="button"
                        onClick={() => setIsResettingPassword(true)} 
                        className="text-xs font-bold text-gray-900 dark:text-white hover:underline"
                    >
                        Forget Password ?
                    </button>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-primary-600 dark:bg-[#7c3aed] text-white font-bold py-3 px-4 rounded-full hover:bg-primary-700 dark:hover:bg-[#6d28d9] transition-all shadow-lg shadow-primary-500/20 disabled:bg-gray-400 text-base active:scale-95"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="text-center mt-6 space-y-4">
                {!hideSignUp && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Don't have account ? <button onClick={onSwitchToSignUp} className="font-bold text-gray-900 dark:text-white hover:underline">Sign Up</button>
                    </p>
                )}
                
                {onGuestAccess && (
                    <div>
                        <button 
                            onClick={onGuestAccess}
                            className="text-primary-600 dark:text-[#a78bfa] font-bold hover:underline text-base"
                        >
                            Browse as Guest
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignIn;
