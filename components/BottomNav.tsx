
import React from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';

const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
);

interface BottomNavProps {
    activeTab: 'feed' | 'calendar' | 'nearby' | 'notifications';
    onTabChange: (tab: 'feed' | 'calendar' | 'nearby' | 'notifications') => void;
    onOpenScanner: () => void;
    onNotificationClick: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, onTabChange, onOpenScanner, onNotificationClick, pendingFacilitatorCount, unreadNotificationCount = 0 }) => {
    const navBtn = (tab: typeof activeTab | null, icon: React.ReactNode, label: string, onClick: () => void) => {
        const isActive = tab !== null && activeTab === tab;
        return (
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center w-14 h-16 appearance-none focus:outline-none focus:ring-0 touch-manipulation relative"
            >
                {/* Active indicator top bar */}
                {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: '#0052A3' }} />
                )}
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${isActive ? '' : ''}`}
                    style={isActive ? { background: '#EBF2FF', color: '#0052A3' } : { color: '#6b7280' }}
                >
                    {icon}
                </div>
                <span className="text-[9px] font-semibold mt-0.5 transition-colors"
                    style={isActive ? { color: '#0052A3' } : { color: '#6b7280' }}
                >{label}</span>
            </button>
        );
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe z-[5000] will-change-transform">
            <div className="flex justify-between items-center h-16 max-w-lg mx-auto px-2">
                {navBtn('feed', <HomeIcon className="w-5 h-5 pointer-events-none" />, 'Feed', () => onTabChange('feed'))}
                {navBtn('calendar', <CalendarIcon className="w-5 h-5 pointer-events-none" />, 'Calendar', () => onTabChange('calendar'))}

                {/* Floating Scan Button */}
                <button
                    onClick={onOpenScanner}
                    className="flex items-center justify-center w-12 h-12 text-white rounded-full shadow-lg appearance-none focus:outline-none focus:ring-0 touch-manipulation active:scale-95 transition-transform"
                    style={{ background: '#0052A3' }}
                >
                    <QrCodeIcon className="w-5 h-5 pointer-events-none" />
                </button>

                <div className="relative">
                    {navBtn('notifications', <BellIcon className="w-5 h-5 pointer-events-none" />, 'Notif', onNotificationClick)}
                    {(pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) && (
                        <div className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900 pointer-events-none" />
                    )}
                    {(unreadNotificationCount > 0 && (!pendingFacilitatorCount || pendingFacilitatorCount === 0)) && (
                        <div className="absolute top-2 right-3 w-2 h-2 rounded-full animate-bounce border-2 border-white dark:border-gray-900 pointer-events-none" style={{ background: '#0052A3' }} />
                    )}
                </div>

                {navBtn('nearby', <LocationIcon className="w-5 h-5 pointer-events-none" />, 'Nearby', () => onTabChange('nearby'))}
            </div>
        </div>
    );
});
export default BottomNav;
