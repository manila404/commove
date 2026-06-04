
import React from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';

// 4-pointed sparkle stars — two sizes arranged like the reference image
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        {/* Large star — center-left */}
        <path d="M9 2 C9 2 9.6 5.4 11 6.8 C12.4 8.2 15 9 15 9 C15 9 12.4 9.8 11 11.2 C9.6 12.6 9 16 9 16 C9 16 8.4 12.6 7 11.2 C5.6 9.8 3 9 3 9 C3 9 5.6 8.2 7 6.8 C8.4 5.4 9 2 9 2 Z" />
        {/* Small star — top-right */}
        <path d="M18 1 C18 1 18.4 3.2 19.3 4.1 C20.2 5 22 5.5 22 5.5 C22 5.5 20.2 6 19.3 6.9 C18.4 7.8 18 10 18 10 C18 10 17.6 7.8 16.7 6.9 C15.8 6 14 5.5 14 5.5 C14 5.5 15.8 5 16.7 4.1 C17.6 3.2 18 1 18 1 Z" />
        {/* Tiny star — bottom-right */}
        <path d="M17 14 C17 14 17.3 15.6 17.9 16.2 C18.5 16.8 20 17 20 17 C20 17 18.5 17.2 17.9 17.8 C17.3 18.4 17 20 17 20 C17 20 16.7 18.4 16.1 17.8 C15.5 17.2 14 17 14 17 C14 17 15.5 16.8 16.1 16.2 C16.7 15.6 17 14 17 14 Z" />
    </svg>
);

type AppTab = 'feed' | 'calendar' | 'chat' | 'nearby' | 'notifications';

interface BottomNavProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onOpenScanner: () => void;
    onNotificationClick: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
    isStaff?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({
    activeTab, onTabChange, onOpenScanner, onNotificationClick,
    pendingFacilitatorCount, unreadNotificationCount = 0, isStaff = false,
}) => {
    const navBtn = (tab: AppTab | null, icon: React.ReactNode, label: string, onClick: () => void) => {
        const isActive = tab !== null && activeTab === tab;
        return (
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center flex-1 h-full appearance-none focus:outline-none focus:ring-0 touch-manipulation relative py-2"
            >
                {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: '#0052A3' }} />
                )}
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl transition-all"
                    style={isActive ? { background: '#EBF2FF', color: '#0052A3' } : { color: '#6b7280' }}>
                    {icon}
                </div>
                <span className="text-[10px] font-semibold mt-0.5 transition-colors leading-none"
                    style={isActive ? { color: '#0052A3' } : { color: '#6b7280' }}>
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe z-[5000] will-change-transform">
            <div className="flex items-stretch h-[68px] max-w-lg mx-auto">

                {navBtn('feed', <HomeIcon className="w-6 h-6 pointer-events-none" />, 'Feed', () => onTabChange('feed'))}
                {navBtn('calendar', <CalendarIcon className="w-6 h-6 pointer-events-none" />, 'Calendar', () => onTabChange('calendar'))}

                {/* Center AI Assistant button */}
                <div className="flex items-center justify-center flex-1">
                    {!isStaff ? (
                        <button
                            onClick={() => onTabChange('chat')}
                            className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg appearance-none focus:outline-none focus:ring-0 touch-manipulation active:scale-95 transition-transform overflow-hidden"
                            style={{ background: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e40af 100%)' }}
                        >
                            <SparklesIcon className="w-6 h-6 text-white pointer-events-none relative z-10" />
                            {/* Highlight */}
                            <div className="absolute top-2 left-2.5 w-5 h-3 rounded-full bg-white opacity-25 pointer-events-none" style={{ filter: 'blur(4px)' }} />
                        </button>
                    ) : (
                        <div className="w-14 h-14" />
                    )}
                </div>

                <div className="relative flex-1">
                    {navBtn('notifications', <BellIcon className="w-6 h-6 pointer-events-none" />, 'Notif', onNotificationClick)}
                    {(pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) && (
                        <div className="absolute top-3 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900 pointer-events-none" />
                    )}
                    {(unreadNotificationCount > 0 && (!pendingFacilitatorCount || pendingFacilitatorCount === 0)) && (
                        <div className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full animate-bounce border-2 border-white dark:border-gray-900 pointer-events-none" style={{ background: '#0052A3' }} />
                    )}
                </div>

                {navBtn('nearby', <LocationIcon className="w-6 h-6 pointer-events-none" />, 'Nearby', () => onTabChange('nearby'))}
            </div>
        </div>
    );
});

export default BottomNav;
