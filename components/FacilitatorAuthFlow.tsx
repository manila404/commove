
import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import KYCVerification from './KYCVerification';
import { CommoveLogo, ShieldCheckIcon, ChevronLeftIcon } from '../constants';

interface FacilitatorAuthFlowProps {
    currentUser: any;
    onAuthSuccess: () => void;
    onClose: () => void;
    initialStep?: 'question' | 'login' | 'request' | 'success' | 'signup';
}

import { submitFacilitatorRequest, getAdmins } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { useAlert } from '../contexts/AlertContext';

const FacilitatorAuthFlow: React.FC<FacilitatorAuthFlowProps> = ({ currentUser, onAuthSuccess, onClose, initialStep = 'question' }) => {
    const [step, setStep] = useState<'question' | 'login' | 'request' | 'success' | 'signup'>(initialStep);
    const { showAlert } = useAlert();

    const handleLGUResponse = (isLGU: boolean) => {
        if (isLGU) {
            setStep('login');
        } else {
            onClose();
        }
    };

    return (
        <div className="w-full max-w-[360px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 relative animate-fade-in-up">
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-30"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mb-4">
                    <ShieldCheckIcon className="w-8 h-8" />
                </div>

                {step === 'question' && (
                    <div className="text-center w-full">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Facilitator Access</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Are you a Local Government Unit (LGU) representative?</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => handleLGUResponse(true)}
                                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Yes
                            </button>
                            <button 
                                onClick={() => handleLGUResponse(false)}
                                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}

                {step === 'login' && (
                    <div className="w-full">
                        <div className="relative text-center mb-4">
                            <button 
                                onClick={() => setStep('question')}
                                className="absolute left-0 top-1 text-gray-400 hover:text-gray-600"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">LGU Login</h2>
                        </div>
                        
                        <SignIn 
                            onSwitchToSignUp={() => setStep('request')} 
                            onAuthSuccess={onAuthSuccess} 
                            hideSignUp={true}
                        />
                        
                        <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-700 pt-6">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                New Facilitator? <br/>
                                <button 
                                    onClick={() => setStep('signup')}
                                    className="text-primary-600 font-black hover:text-primary-700 mt-2 uppercase tracking-widest text-[10px]"
                                >
                                    Sign Up Now
                                </button>
                            </p>
                        </div>
                    </div>
                )}

                {step === 'request' && (
                    <div className="text-center w-full">
                        <div className="relative text-center mb-6">
                            <button 
                                onClick={() => setStep('login')}
                                className="absolute left-0 top-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Account Registration</h2>
                        </div>
                        
                        <KYCVerification 
                            onComplete={async (idUrl) => {
                                if (!currentUser) {
                                    showAlert("Identity Required", "Please sign in to your regular account first before submitting your LGU ID.", "info");
                                    setStep('login');
                                    return;
                                }

                                try {
                                    await submitFacilitatorRequest(currentUser.uid, idUrl);
                                    
                                    // Notify Admins
                                    const admins = await getAdmins();
                                    
                                    for (const admin of admins) {
                                        await createNotification(
                                            admin.uid,
                                            'system',
                                            'New Facilitator Request',
                                            `${currentUser.name || currentUser.email} has submitted a Bacoor LGU ID for review.`,
                                            undefined
                                        );
                                    }

                                    setStep('success');
                                } catch (e) {
                                    showAlert("Error", "Failed to submit request. Please try again.", "error");
                                }
                            }} 
                            onBack={() => setStep('login')} 
                        />
                    </div>
                )}

                {step === 'signup' && (
                    <div className="w-full">
                        <SignUp 
                            onSwitchToSignIn={() => setStep('login')} 
                            onAuthSuccess={() => {
                                setStep('success');
                                onAuthSuccess();
                            }} 
                        />
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center w-full space-y-6 py-4 animate-fade-in-up">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto shadow-inner border border-green-200 dark:border-green-800">
                            <ShieldCheckIcon className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Registration Submitted</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Your <span className="font-bold text-gray-900 dark:text-white">Bacoor LGU ID</span> has been successfully submitted. Our team will review your credentials within <span className="font-bold text-primary-600">24-48 hours</span>.
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-sm shadow-xl shadow-gray-200 dark:shadow-none"
                        >
                            Complete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacilitatorAuthFlow;
