
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../types';
import { auth } from '../services/firebase';
import { 
    UserIcon, 
    ShieldCheckIcon, 
    ChevronRightIcon, 
    ArrowRightIcon, 
    SettingsIcon, 
    BookmarkIcon,
    HelpIcon,
    BellIcon,
    StarIcon,
    SunIcon,
    MoonIcon,
    PREDEFINED_AVATARS
} from '../constants';
import { updateUserAvatar, updateUserData, deleteUser } from '../services/userService';
import Spinner from './Spinner';

const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

interface ProfileViewProps {
    user: User | null;
    onLogout: () => void;
    onLogin: () => void;
    onShowAdminPanel?: () => void;
    onShowMyEvents: () => void;
    onEditPreferences: () => void;
    onShowPermitDashboard: () => void;
    onShowNotificationSettings: () => void;
    onShowHelpSupport: () => void;
    onShowTermsAndConditions: () => void;
    onFacilitatorLogin: () => void;
    theme: string;
    toggleTheme: () => void;
    onUserUpdate: (updatedUser: User) => void;
    onProfileCardClick?: () => void;
    onEditProfile?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
    user, 
    onLogout, 
    onLogin,
    onShowAdminPanel, 
    onShowMyEvents,
    onEditPreferences,
    onShowPermitDashboard,
    onShowNotificationSettings,
    onShowHelpSupport,
    onShowTermsAndConditions,
    onFacilitatorLogin,
    theme,
    toggleTheme,
    onUserUpdate,
    onProfileCardClick,
    onEditProfile,
}) => {
    const [isChangingAvatar, setIsChangingAvatar] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showManageAccountPanel, setShowManageAccountPanel] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState<null | 'deactivate' | 'delete'>(null);
    const [accountModalStep, setAccountModalStep] = useState<1 | 2>(1);
    const [isProcessingAccount, setIsProcessingAccount] = useState(false);
    const [accountError, setAccountError] = useState<string | null>(null);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [confirmUnderstood, setConfirmUnderstood] = useState(false);
    const [showAccountWarning, setShowAccountWarning] = useState<null | 'deactivate' | 'delete'>(null);
    const [otherReason, setOtherReason] = useState('');

    const DELETE_REASONS = [
        "I'm not using the app.",
        "I found a better alternative.",
        "The app contains too many ads.",
        "The app didn't have the features or functionality I was looking for.",
        "I'm not satisfied with the quality of content.",
        "The app was difficult to navigate.",
        "Other."
    ];

    const DEACTIVATE_REASONS = [
        "I need a break from the app.",
        "Privacy concerns.",
        "I'm switching to another account.",
        "The app doesn't meet my needs right now.",
        "Personal reasons.",
        "Other."
    ];

    const toggleReason = (reason: string) => {
        setSelectedReasons(prev =>
            prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
        );
    };

    const openAccountModal = (type: 'deactivate' | 'delete') => {
        setAccountError(null);
        setAccountModalStep(1);
        setSelectedReasons([]);
        setConfirmUnderstood(false);
        setShowAccountModal(type);
    };

    const closeAccountModal = () => {
        setShowAccountModal(null);
        setAccountModalStep(1);
        setSelectedReasons([]);
        setConfirmUnderstood(false);
        setAccountError(null);
        setOtherReason('');
    };

    // Step 1 "proceed" — just advances to feedback form, no deletion yet
    const handleProceedToFeedback = () => {
        setAccountModalStep(2);
    };

    // Step 2 "Done" — THIS is where the actual deletion/deactivation happens
    const handleFeedbackDone = async () => {
        if (!user) return;
        setIsProcessingAccount(true);
        setAccountError(null);
        try {
            if (showAccountModal === 'delete') {
                // Mark as pending deletion — actual Auth account removal happens if they
                // don't recover within 30 days (handled at next login via recovery prompt)
                await updateUserData(user.uid, {
                    pendingDeletion: true,
                    deletionScheduledAt: Date.now(),
                } as any);
                await auth.signOut();
            } else if (showAccountModal === 'deactivate') {
                await updateUserData(user.uid, { isDeactivated: true } as any);
                // Sign out directly — bypasses the logout confirmation modal
                await auth.signOut();
            }
            closeAccountModal();
            setShowManageAccountPanel(false); // Reset so App.tsx auth state drives guest screen
            // Do NOT call onLogout() — that would trigger the "Confirm Logout" modal.
            // Firebase's auth state change drives the guest screen transition.
        } catch (error: any) {
            console.error("Account action failed", error);
            if (error.code === 'auth/requires-recent-login') {
                setAccountError("For security, please sign out and sign back in, then try again.");
                setAccountModalStep(1);
            } else {
                setAccountError(error.message || "Failed. Please try again.");
                setAccountModalStep(1);
            }
            setIsProcessingAccount(false);
        }
    };

    const handleAvatarChange = async (url: string) => {
        if (!user) return;
        const oldAvatar = user.avatarUrl;
        
        // Optimistic Update: Change the avatar locally first
        onUserUpdate({ ...user, avatarUrl: url });
        setIsChangingAvatar(false);
        
        setIsUpdating(true);
        try {
            await updateUserAvatar(user.uid, url);
        } catch (error) {
            console.error("Failed to update avatar", error);
            // Rollback on failure if the backend update failed
            onUserUpdate({ ...user, avatarUrl: oldAvatar });
        } finally {
            setIsUpdating(false);
        }
    };

    // Determine access level
    const isGuest = !user;
    const isStaff = user?.role === 'admin' || user?.role === 'facilitator' || user?.isAdmin === true;
    const isAdminUser = user?.role === 'admin' || (user?.isAdmin === true && user?.role !== 'facilitator');
    const roleLabel = isGuest ? 'Guest' : (user?.role === 'facilitator' ? 'Facilitator' : (isAdminUser ? 'Administrator' : 'Resident'));
    const badgeColor = 'bg-white/20 text-white';
    const isPendingFacilitator = user?.facilitatorRequestStatus === 'pending';

    // Delete / Deactivate view — slides in over Manage Account panel
    if (showAccountModal !== null) {
        const isDelete = showAccountModal === 'delete';
        const reasons = isDelete ? DELETE_REASONS : DEACTIVATE_REASONS;
        return (
            <div className="flex flex-col md:-mt-5 md:min-h-[calc(100vh-120px)] animate-slide-from-right bg-white dark:bg-gray-900">
                <style>{`
                    @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                    .animate-slide-from-right { animation: slideInFromRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
                    .modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(156,163,175,0.4) transparent; }
                    .modal-scroll::-webkit-scrollbar { width: 3px; }
                    .modal-scroll::-webkit-scrollbar-track { background: transparent; }
                    .modal-scroll::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.4); border-radius: 9999px; }
                    .modal-scroll::-webkit-scrollbar-button { display: none; height: 0; width: 0; }
                `}</style>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 md:pt-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                    {accountModalStep === 1 ? (
                        <>
                            <button onClick={closeAccountModal} disabled={isProcessingAccount} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600">
                                <ArrowRightIcon className="w-5 h-5 rotate-180" />
                            </button>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                {isDelete ? 'Delete account' : 'Deactivate account'}
                            </span>
                            <div className="w-9" />
                        </>
                    ) : (
                        <>
                            <div className="w-9" />
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                {isDelete ? 'Request received' : 'Account deactivated'}
                            </span>
                            <button onClick={handleFeedbackDone} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* Step 1 — Confirmation */}
                {/* Step 1 — Warning + confirmation */}
                {accountModalStep === 1 && (
                    <div className="modal-scroll overflow-y-auto flex-1 px-5 pt-6 pb-8 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                            {isDelete ? 'Are you sure you want to delete your account?' : 'Are you sure you want to deactivate your account?'}
                        </h2>
                        {isDelete ? (
                            <>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                    Once you delete your account, it cannot be undone. All your data will be permanently erased from this app including your profile information, preferences, saved content, and any activity history.
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                    We're sad to see you go, but we understand that sometimes it's necessary. Please take a moment to consider the consequences before proceeding.
                                </p>
                                {/* 30-day recovery notice */}
                                <div className="flex items-start gap-2.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-3 mb-5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                                        <span className="font-semibold">You have 30 days to recover your account.</span> After submitting this request, simply log back in within 30 days to restore your account and data.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                    Deactivating your account will temporarily hide your profile and disable access. Your data — including preferences, saved events, and activity history — will be preserved.
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                                    You can reactivate your account at any time simply by logging back in.
                                </p>
                            </>
                        )}

                        {/* "I understand" confirmation checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer mb-5">
                            <div
                                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${confirmUnderstood ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}
                                onClick={() => setConfirmUnderstood(v => !v)}
                            >
                                {confirmUnderstood && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug" onClick={() => setConfirmUnderstood(v => !v)}>
                                {isDelete
                                    ? 'I understand that deleting my account is irreversible and I have 30 days to recover it.'
                                    : 'I understand that my account will be deactivated and I can reactivate it by logging back in.'
                                }
                            </span>
                        </label>

                        {accountError && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 mb-4">{accountError}</p>
                        )}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleProceedToFeedback}
                                disabled={!confirmUnderstood}
                                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 bg-primary-600 hover:bg-primary-700 active:bg-primary-800"
                            >
                                {isDelete ? 'Proceed to delete' : 'Proceed to deactivate'}
                            </button>
                            <button onClick={closeAccountModal} className="w-full py-3 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:text-gray-700 transition-colors">
                                Go back
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2 — Feedback (deletion/deactivation happens on Done) */}
                {accountModalStep === 2 && (
                    <div className="modal-scroll overflow-y-auto flex-1 px-5 pt-5 pb-8 flex flex-col">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                            {isDelete
                                ? 'Before we process your request, please let us know why you\'re leaving.'
                                : 'Before we deactivate your account, please let us know why.'
                            }
                        </p>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                            {isDelete ? 'Why did you decide to leave this app?' : 'Why are you deactivating your account?'}
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Please select at least one reason</p>
                        <div className="flex flex-col gap-1 mb-6">
                            {reasons.map(reason => (
                                <div key={reason} className="flex flex-col">
                                    <label className="flex items-start gap-3 py-2 cursor-pointer">
                                        <div
                                            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${selectedReasons.includes(reason) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}
                                            onClick={() => toggleReason(reason)}
                                        >
                                            {selectedReasons.includes(reason) && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug" onClick={() => toggleReason(reason)}>{reason}</span>
                                    </label>
                                    {reason === 'Other.' && selectedReasons.includes('Other.') && (
                                        <textarea
                                            value={otherReason}
                                            onChange={e => setOtherReason(e.target.value)}
                                            placeholder="Please tell us more..."
                                            rows={3}
                                            className="ml-8 mt-1 mb-1 w-[calc(100%-2rem)] text-sm border border-gray-200 dark:border-gray-600 rounded-xl p-3 resize-none bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-primary-400"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {accountError && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 mb-4">{accountError}</p>
                        )}
                        <button
                            onClick={handleFeedbackDone}
                            disabled={selectedReasons.length === 0 || isProcessingAccount}
                            className="w-full py-4 rounded-2xl font-bold text-base text-white bg-primary-600 hover:bg-primary-700 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {isProcessingAccount && <Spinner size="sm" />}
                            {isDelete ? 'Confirm & delete account' : 'Confirm & deactivate account'}
                        </button>
                        <button onClick={() => setAccountModalStep(1)} disabled={isProcessingAccount} className="w-full py-3 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:text-gray-700 transition-colors mt-1">
                            Go back
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Manage Account panel — replaces ProfileView content in the same container
    if (showManageAccountPanel) {
        return (
            <div className="flex flex-col md:-mt-5 md:min-h-[calc(100vh-120px)] animate-slide-from-right bg-white dark:bg-gray-900">
                <style>{`
                    @keyframes slideInFromRight {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .animate-slide-from-right {
                        animation: slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(156,163,175,0.4) transparent; }
                    .modal-scroll::-webkit-scrollbar { width: 3px; }
                    .modal-scroll::-webkit-scrollbar-track { background: transparent; }
                    .modal-scroll::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.4); border-radius: 9999px; }
                    .modal-scroll::-webkit-scrollbar-button { display: none; height: 0; width: 0; }
                `}</style>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 md:pt-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <button
                        onClick={() => setShowManageAccountPanel(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600"
                    >
                        <ArrowRightIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Manage Account</h2>
                </div>
                {/* Options */}
                <div className="flex-1 px-4 pt-5 pb-6 bg-white dark:bg-gray-900">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                        {onProfileCardClick && (
                            <button
                                onClick={() => { setShowManageAccountPanel(false); onProfileCardClick(); }}
                                className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Profile</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Name, avatar, contact info</p>
                                </div>
                            </button>
                        )}
                        <button
                            onClick={() => setShowAccountWarning('deactivate')}
                            className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Deactivate Account</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Temporarily hide your profile</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setShowAccountWarning('delete')}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Permanently remove your account</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Warning popup — rendered at document body via portal so overflow-hidden
                    parents and mobile viewport quirks cannot break centering */}
                {showAccountWarning && typeof document !== 'undefined' && createPortal(
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '24px',
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setShowAccountWarning(null)}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '360px' }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 text-center"
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${showAccountWarning === 'delete' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 ${showAccountWarning === 'delete' ? 'text-red-500' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {showAccountWarning === 'delete' ? 'Delete your account?' : 'Deactivate your account?'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                {showAccountWarning === 'delete'
                                    ? 'You are about to permanently delete your account. This is a serious action. Are you sure you want to continue?'
                                    : 'You are about to deactivate your account. Your data will be preserved and you can reactivate it later. Are you sure?'
                                }
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { openAccountModal(showAccountWarning); setShowAccountWarning(null); }}
                                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all"
                                >
                                    Yes, proceed
                                </button>
                                <button
                                    onClick={() => setShowAccountWarning(null)}
                                    className="w-full py-3 rounded-xl font-semibold text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div className="overflow-hidden relative flex flex-col">
            <style>{`
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in {
                    animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-from-right {
                    animation: slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Header Section */}
            <div className="bg-primary-600 dark:bg-primary-800 p-5 rounded-2xl relative z-20 mx-4 mt-4 md:!mt-0">
                <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-md overflow-hidden">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl || undefined} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <UserIcon className="w-7 h-7" />
                            )}
                        </div>
                        {!isGuest && (
                            <button
                                onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center text-primary-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <SettingsIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 className="text-base font-bold text-white truncate leading-tight">{isGuest ? 'Welcome, Guest' : (user?.name || auth.currentUser?.displayName || 'User')}</h2>
                        <p className="text-white/80 text-xs truncate mb-1.5 leading-tight mt-0.5">{isGuest ? 'Sign in to save events and more' : (user?.email || auth.currentUser?.email || 'No email')}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                                {isStaff && <ShieldCheckIcon className="w-2.5 h-2.5 mr-1" />}
                                {roleLabel}
                            </span>
                            {isPendingFacilitator && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-yellow-900">
                                    Pending Facilitator Approval
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Avatar Selection Panel */}
            {isChangingAvatar && !isGuest && (
                <div className="container mx-auto px-4 mt-4 animate-slide-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-primary-100 dark:border-primary-900/30">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:white uppercase tracking-wider">Select Avatar</h3>
                            <button onClick={() => setIsChangingAvatar(false)} className="text-gray-400 hover:text-gray-600">
                                <ArrowRightIcon className="w-4 h-4 rotate-180" />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {PREDEFINED_AVATARS.map((avatar, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAvatarChange(avatar)}
                                    disabled={isUpdating}
                                    className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                        user.avatarUrl === avatar 
                                            ? 'border-primary-600 scale-105 shadow-md' 
                                            : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                                    }`}
                                >
                                    <img src={avatar || undefined} alt={`Avatar ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    {isUpdating && user.avatarUrl === avatar && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <Spinner size="sm" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 mt-6 relative z-20 space-y-6 flex-grow w-full pb-6">
                 {/* Login Card for Guests */}
                 {isGuest && (
                    <button 
                        className="w-full bg-gray-900 dark:bg-black rounded-2xl p-4 shadow-xl flex items-center justify-between cursor-pointer animate-slide-in hover:scale-[1.02] transition-transform duration-200 text-left" 
                        onClick={onLogin}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary-400">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Sign In / Create Account</h3>
                                <p className="text-gray-400 text-xs text-left">Unlock all features</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-gray-400">
                            <ArrowRightIcon className="w-4 h-4" />
                        </div>
                    </button>
                )}




                {/* Settings Section */}
                <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
                    {!isGuest && (
                        isAdminUser && onEditProfile ? (
                            <button onClick={onEditProfile} className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Profile</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Name, avatar, contact info</p>
                                </div>
                            </button>
                        ) : (
                            <button onClick={() => setShowManageAccountPanel(true)} className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Manage Account</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Deactivate or delete account</p>
                                </div>
                            </button>
                        )
                    )}

                    <button onClick={toggleTheme} className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-orange-500">
                            {theme === 'dark' ? <MoonIcon className="w-[18px] h-[18px]" /> : <SunIcon className="w-[18px] h-[18px]" />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dark Mode</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}</p>
                        </div>
                        <div className={`w-10 h-5.5 h-[22px] w-[40px] rounded-full transition-colors duration-200 flex items-center px-0.5 shrink-0 ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {!isStaff && (
                    <button onClick={onShowMyEvents} className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                            <BookmarkIcon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Events</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Saved and attended events</p>
                        </div>
                    </button>
                    )}

                    <button onClick={onShowNotificationSettings} className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                            <BellIcon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notification Settings</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Alerts, reminders, sounds</p>
                        </div>
                    </button>

{/* Commented out Help & Support per user request
                        <button onClick={onShowHelpSupport} className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                                <HelpIcon className="w-[18px] h-[18px]" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Help & Support</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">FAQs, contact support</p>
                            </div>
                            </button>
                        */}

                    <button onClick={onShowTermsAndConditions} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300">
                            <ShieldCheckIcon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Terms & Conditions</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">Privacy policy, terms of use</p>
                        </div>
                    </button>
                </div>

                {!isGuest && (
                    <button onClick={onLogout} className="w-full bg-white dark:bg-gray-800 rounded-2xl flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors mt-4 mb-4">
                        <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 text-red-500">
                            <ArrowRightIcon className="w-[18px] h-[18px]" />
                        </div>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Logout</p>
                    </button>
                )}

            </div>
        </div>
    );
};

export default ProfileView;
