
import React, { useState, useRef } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createUserProfile, getAdmins, isUsernameUnique } from '../services/userService';
import { createNotification } from '../services/notificationService';
import type { User } from '../types';
import { ChevronLeftIcon, EyeIcon, EyeSlashIcon, PREDEFINED_AVATARS } from '../constants';
import Spinner from './Spinner';
import Captcha, { CaptchaRef } from './Captcha';
import KYCVerification from './KYCVerification';

interface SignUpProps {
    onSwitchToSignIn: () => void;
    onAuthSuccess: () => void;
    onShowTermsAndConditions?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn, onAuthSuccess, onShowTermsAndConditions }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [birthday, setBirthday] = useState('');
    const [sex, setSex] = useState('');
    const [username, setUsername] = useState('');
    const [customSex, setCustomSex] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(PREDEFINED_AVATARS[0]);
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isFacilitator, setIsFacilitator] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const captchaRef = useRef<CaptchaRef>(null);

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    // Multi-step for facilitator KYC
    const [step, setStep] = useState(1);
    const [idImage, setIdImage] = useState<string | null>(null);
    const [faceImage, setFaceImage] = useState<string | null>(null);

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!username.trim()) {
            setError("Please choose a username.");
            setIsLoading(false);
            return;
        }

        const cleanUsername = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
        const isUnique = await isUsernameUnique(cleanUsername);
        if (!isUnique) {
            setError("This username is already taken. Please choose another.");
            setIsLoading(false);
            return;
        }

        if (!/^[A-Z]/.test(firstName.trim())) {
            setError("First name must start with a capital letter.");
            return;
        }

        if (!/^[A-Z]/.test(lastName.trim())) {
            setError("Last name must start with a capital letter.");
            return;
        }

        if (!email.includes('@')) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!email.trim().toLowerCase().endsWith('@gmail.com') && email.trim().toLowerCase() !== 'admin@commove.com') {
            setError("Email must be a @gmail.com address.");
            return;
        }

        if (!address.trim()) {
            setError("Please enter your address.");
            return;
        }

        if (!birthday) {
            setError("Please enter your birthday.");
            return;
        }

        if (!sex) {
            setError("Please select your gender.");
            return;
        }

        if (sex === 'Others' && !customSex.trim()) {
            setError("Please specify your gender.");
            return;
        }

        if (password.length < 8 || password.length > 64) {
            setError("Password must be between 8 and 64 characters long.");
            return;
        }

        if (!/[A-Z]/.test(password)) {
            setError("Password must contain at least one uppercase letter.");
            return;
        }

        if (!/[0-9]/.test(password)) {
            setError("Password must contain at least one number.");
            return;
        }

        if (!/[^A-Za-z0-9]/.test(password)) {
            setError("Password must contain at least one symbol.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (isFacilitator) {
            setStep(2);
        } else {
            submitForm();
        }
    };

    const submitForm = async (finalIdUrl?: string) => {
        setIsLoading(true);
        try {
            // Execute invisible reCAPTCHA
            const token = await captchaRef.current?.execute();
            if (!token) {
                setError('Captcha verification failed. Please try again.');
                setIsLoading(false);
                return;
            }

            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const displayName = `${firstName} ${lastName}`.trim();

            // 2. Update Firebase Auth profile
            await updateProfile(user, { displayName, photoURL: selectedAvatar });

            // 3. Create user profile in Firestore
            const newUserProfileData: Omit<User, 'uid'> = { 
                name: displayName, 
                email: user.email!,
                isAdmin: email === 'admin@commove.com', 
                role: 'user', 
                facilitatorRequestStatus: (isFacilitator || step === 2) ? 'pending' : undefined,
                idUrl: finalIdUrl || idImage || undefined,
                faceUrl: faceImage || undefined,
                birthday: birthday,
                address: address.trim(),
                contactNumber: contactNumber.trim(),
                sex: sex === 'Others' ? customSex.trim() : sex,
                username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
                avatarUrl: selectedAvatar,
                savedEventIds: [],
                reminders: {},
            };
            await createUserProfile(user.uid, newUserProfileData);
            
            // Notify Admins if it's a facilitator request
            if (isFacilitator) {
                try {
                    const admins = await getAdmins();
                    const notificationBody = `${displayName} has signed up as a facilitator and is awaiting approval.`;
                    
                    for (const admin of admins) {
                        await createNotification(
                            admin.uid,
                            'facilitator_request',
                            'New Facilitator Request',
                            notificationBody,
                            user.uid
                        );
                    }
                } catch (notiErr) {
                    console.error("Error sending admin notifications:", notiErr);
                    // Don't block sign up success if notification fails
                }
            }

            onAuthSuccess();

        } catch (err: any) {
            // Check for permission errors specifically
            if (err.code === 'auth/email-already-in-use' || (err.message && err.message.includes('auth/email-already-in-use'))) {
                setError('This email is already registered. Please sign in instead.');
            } else if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
                console.error("Permission error during signup:", err);
                setError('Database Permission Denied: You need to update your Firestore Security Rules to allow new users to create their profile document.');
            } else {
                console.error("Signup error:", err);
                setError(err.message || 'An unexpected error occurred during sign up.');
            }
            // Reset captcha on error
            captchaRef.current?.reset();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col min-h-0">
            <div className="relative flex items-center text-left mb-6 mt-0 flex-shrink-0">
                <button onClick={step === 1 ? onSwitchToSignIn : () => setStep(step - 1)} className="-ml-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors mr-1">
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {step === 1 ? 'Sign up' : 'Identity Verification'}
                </h1>
            </div>

            {step === 1 && (
                <div className="flex-1 pr-2 -mr-2 overflow-y-auto scrollbar-hide">
                    <form onSubmit={handleNextStep} className="space-y-2 md:space-y-4 pb-12 px-2">
                    <div className="mb-1">
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5 px-2 uppercase tracking-wider">Choose your avatar</label>
                        <div className="flex gap-2 overflow-x-auto py-1.5 px-2 scrollbar-hide -mx-2">
                            {PREDEFINED_AVATARS.map((avatar, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedAvatar(avatar)}
                                    className={`flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all ${
                                        selectedAvatar === avatar 
                                            ? 'border-primary-600 scale-110 shadow-md' 
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <img src={avatar || undefined} alt={`Avatar ${idx}`} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFirstName(val.charAt(0).toUpperCase() + val.slice(1));
                            }}
                            required
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLastName(val.charAt(0).toUpperCase() + val.slice(1));
                            }}
                            required
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                    </div>
                      <div className="mt-1">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            pattern=".*@gmail\.com$|^admin@commove\.com$"
                            title="Please enter a valid @gmail.com address or admin account"
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                    </div>

                    <div className="mt-1">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">@</span>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username.startsWith('@') ? username.slice(1) : username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full pl-8 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="tel"
                            placeholder="Contact Number (Optional)"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                    </div>

                    <div className="mt-1">
                        <input
                            type="text"
                            placeholder="Address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full relative">
                            <label className="absolute -top-2 left-4 bg-white dark:bg-[#111827] px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Birthday</label>
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                            />
                        </div>
                        <div className="w-full relative">
                            <label className="absolute -top-2 left-4 bg-white dark:bg-[#111827] px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                            <select
                                value={sex}
                                onChange={(e) => {
                                    setSex(e.target.value);
                                    if (e.target.value !== 'Others') setCustomSex('');
                                }}
                                required
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm appearance-none"
                            >
                                <option value="" disabled>Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Others">Others</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {sex === 'Others' && (
                        <div>
                            <input
                                type="text"
                                placeholder="Please specify your gender"
                                value={customSex}
                                onChange={(e) => setCustomSex(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                            />
                        </div>
                    )}
                   
                    <div className="relative">
                        <input
                            type={passwordVisible ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                            <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 dark:text-gray-500">
                            {passwordVisible ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={confirmPasswordVisible ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                        />
                        <button type="button" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 dark:text-gray-500">
                           {confirmPasswordVisible ? <EyeSlashIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 px-2 py-1">
                        <input 
                            type="checkbox" 
                            id="isFacilitator" 
                            checked={isFacilitator}
                            onChange={(e) => setIsFacilitator(e.target.checked)}
                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="isFacilitator" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Sign up as Facilitator (Requires Admin Approval)
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded-xl mt-4">
                            <p className="text-red-600 dark:text-red-300 text-xs text-center">{error}</p>
                        </div>
                    )}

                    <div className="pt-8">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mb-3">
                            By signing up, you agree to our{' '}
                            <button 
                                type="button" 
                                onClick={onShowTermsAndConditions} 
                                className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                            >
                                Terms and Conditions
                            </button>
                            {' '}and Data Privacy Policy.
                        </p>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center bg-primary-600 text-white font-bold py-3 px-4 rounded-full hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-base active:scale-95"
                        >
                            {isLoading ? (
                                <>
                                    <Spinner size="sm" />
                                    <span className="ml-2">Creating...</span>
                                </>
                            ) : isFacilitator ? 'Next Step' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <div className="text-center mt-6">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Already have an account? <button onClick={onSwitchToSignIn} className="font-bold text-gray-900 dark:text-white hover:underline">Sign In</button></p>
                </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in-up">
                    <KYCVerification 
                        onComplete={(idUrl) => {
                            setIdImage(idUrl);
                            submitForm(idUrl);
                        }} 
                        onBack={() => setStep(1)} 
                    />
                    
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded-xl mt-4">
                            <p className="text-red-600 dark:text-red-300 text-xs text-center font-bold">{error}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Invisible ReCAPTCHA must stay mounted across both steps */}
            <div className="hidden pointer-events-none opacity-0 h-0 overflow-hidden">
                <Captcha ref={captchaRef} />
            </div>
        </div>
    );
};

export default SignUp;
