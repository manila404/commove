import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import Onboarding from './Onboarding';
import { CommoveLogo } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthProps {
    onAuthSuccess: (isNewUser: boolean) => void;
    onGuestAccess: () => void;
    onShowTermsAndConditions?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, onGuestAccess, onShowTermsAndConditions }) => {
    const [isSigningUp, setIsSigningUp] = useState(false);

    // Onboarding: only show on mobile, once per session
    const [showOnboarding, setShowOnboarding] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return !sessionStorage.getItem('commove_onboarding_seen');
        }
        return false;
    });

    const handleOnboardingComplete = () => {
        sessionStorage.setItem('commove_onboarding_seen', 'true');
        setShowOnboarding(false);
    };

    const switchToSignUp = () => setIsSigningUp(true);
    const switchToSignIn = () => setIsSigningUp(false);

    const handleSignInSuccess = () => onAuthSuccess(false);
    const handleSignUpSuccess = () => onAuthSuccess(true);

    // Show onboarding before login on mobile
    if (showOnboarding) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }


    return (
        <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200, mass: 1 }}
            className="w-full h-full md:h-auto max-w-4xl bg-white dark:bg-[#111827] rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
        >
            {/* Close Button */}
            <button
                onClick={onGuestAccess}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white md:text-gray-400 md:hover:text-gray-600 dark:text-white/60 dark:hover:text-white transition-colors z-30"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Left Side (Desktop) / Top Side (Mobile): Branding with Primary Purple on Mobile */}
            <div className="flex md:w-[55%] bg-primary-600 md:bg-white md:dark:bg-[#111827] p-4 pt-safe md:p-12 flex-col justify-start md:justify-between border-b md:border-b-0 md:border-r border-primary-500 md:border-gray-100 dark:md:border-gray-800 relative z-0 min-h-[45vh] max-h-[50vh] md:max-h-none md:min-h-0">
                <div className="flex flex-col items-center md:items-start text-center md:text-left mt-2 md:mt-10">
                    <div className="flex items-center select-none text-3xl tracking-tighter" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
                        <div className="relative inline-flex items-center justify-center text-white md:text-gray-900 dark:md:text-white mr-[-0.08em]">
                            <svg style={{ width: '0.65em', height: '0.65em', transform: 'translateY(0.06em)' }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="20">
                                <path d="M 82 26 A 40 40 0 1 0 82 74" />
                                <circle cx="48" cy="50" r="14" fill="currentColor" stroke="none" className="text-white/40 md:text-primary-700 dark:md:text-primary-500" />
                            </svg>
                        </div>
                        <span className="text-white md:text-gray-900 dark:md:text-white font-semibold">om</span>
                        <span className="text-white/90 md:text-primary-700 dark:md:text-primary-500 font-normal">move</span>
                    </div>
                    {/* Subtitle hidden on mobile */}
                    <p className="hidden md:block mt-3 text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                        Discover events and connect with your community.
                    </p>
                </div>
                <div className="flex items-center justify-center pt-1 md:flex-1 md:pt-10 md:pb-0 z-0 overflow-visible h-12 md:h-auto">
                    {/* Use the specific purple background version on mobile */}
                    <img
                        src="/event_illustration_purple.png"
                        alt="Event Illustration Mobile"
                        className="md:hidden w-full max-w-[310px] md:max-w-none object-contain transform translate-y-50 md:translate-y-50 scale-125 md:scale-110"
                    />
                    <img
                        src="/event_illustration.jpg"
                        alt="Event Illustration"
                        className="hidden md:block md:max-w-[380px] object-contain dark:md:hidden"
                    />
                    <img
                        src="/event_illustration_dark.png"
                        alt="Event Illustration Dark"
                        className="hidden md:dark:block md:max-w-[380px] object-contain"
                    />
                </div>
            </div>

            {/* Right Side (Desktop) / Bottom Side (Mobile): Forms with Draggable Sheet logic */}
            <motion.div 
                drag={false}
                dragConstraints={{ top: -450, bottom: 0 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 150) {
                        onGuestAccess();
                    }
                }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full md:w-[45%] p-6 pt-10 md:p-8 bg-white dark:bg-[#111827] flex flex-col flex-1 min-h-0 pb-10 md:pb-8 md:max-h-none overflow-y-auto rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 relative z-10 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] md:shadow-none"
            >
                {/* Drag Handle (Mobile only - only shown for draggable Sign Up) */}
                {isSigningUp && (
                    <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 dark:bg-gray-700/50 rounded-full" />
                )}

                {/* Removed the duplicate mobile logo as it has been moved to the top container */}

                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        {isSigningUp ? (
                            <motion.div
                                key="signup-form"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -40, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-full h-full flex flex-col"
                            >
                                <SignUp onSwitchToSignIn={switchToSignIn} onAuthSuccess={handleSignUpSuccess} onShowTermsAndConditions={onShowTermsAndConditions} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="signin-form"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -40, opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-full"
                            >
                                <SignIn onSwitchToSignUp={switchToSignUp} onAuthSuccess={handleSignInSuccess} onGuestAccess={onGuestAccess} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Auth;