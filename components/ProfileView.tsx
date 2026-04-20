
import React, { useState } from 'react';
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
import { updateUserAvatar } from '../services/userService';
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
    onShowSaved: () => void;
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
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
    user, 
    onLogout, 
    onLogin,
    onShowAdminPanel, 
    onShowSaved,
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
}) => {
    const [isChangingAvatar, setIsChangingAvatar] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleAvatarChange = async (url: string) => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await updateUserAvatar(user.uid, url);
            onUserUpdate({ ...user, avatarUrl: url });
            setIsChangingAvatar(false);
        } catch (error) {
            console.error("Failed to update avatar", error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Determine access level
    const isGuest = !user;
    const isStaff = user?.role === 'admin' || user?.role === 'facilitator';
    const roleLabel = isGuest ? 'Guest' : (user.role === 'admin' ? 'Administrator' : (user.role === 'facilitator' ? 'Facilitator' : 'Resident'));
    const badgeColor = 'bg-white/20 text-white';
    const isPendingFacilitator = user?.facilitatorRequestStatus === 'pending';

    return (
        <div className="overflow-x-hidden relative flex flex-col">
            <style>{`
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in {
                    animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Header Section */}
            <div 
                className={`bg-primary-600 dark:bg-primary-800 p-5 rounded-2xl shadow-lg relative z-20 mx-4 mt-2 ${onProfileCardClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (onProfileCardClick) onProfileCardClick();
                }}
            >
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




                {/* Settings Section (Always Visible) */}
                <div className="shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
                    <div>
                        <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="text-orange-500">
                                    {theme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                                </div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Dark Mode
                                </span>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </button>

                        <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="text-gray-400"><BookmarkIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Saved Events</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </button>
                        
                        <button onClick={onShowNotificationSettings} className="w-full flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="text-gray-400"><BellIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notification Settings</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </button>

{/* Commented out Help & Support per user request
                        <button onClick={onShowHelpSupport} className="w-full flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="text-gray-400"><HelpIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Help & Support</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </button>
                        */}

                        <button onClick={onShowTermsAndConditions} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="text-gray-400"><ShieldCheckIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Terms & Conditions</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                {!isGuest && (
                    <button onClick={onLogout} className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-red-600 dark:text-red-400 mt-6 mb-4">
                        <span className="font-bold text-sm ml-2">Logout</span>
                        <ArrowRightIcon className="w-5 h-5 mr-2" />
                    </button>
                )}

            </div>
        </div>
    );
};

export default ProfileView;
