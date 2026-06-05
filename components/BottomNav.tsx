
import React from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';
import { QrCode } from 'lucide-react';

type AppTab = 'feed' | 'calendar' | 'nearby' | 'notifications';

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

                {/* Center QR Scanner button — hidden for staff, replaced with 4-item layout */}
                {!isStaff && (
                    <div className="flex items-center justify-center flex-1">
                        <button
                            onClick={onOpenScanner}
                            className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg appearance-none focus:outline-none focus:ring-0 touch-manipulation active:scale-95 transition-transform overflow-hidden"
                            style={{ background: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e40af 100%)' }}
                        >
                            <QrCode className="w-6 h-6 text-white pointer-events-none relative z-10" />
                            {/* Highlight */}
                            <div className="absolute top-2 left-2.5 w-5 h-3 rounded-full bg-white opacity-25 pointer-events-none" style={{ filter: 'blur(4px)' }} />
                        </button>
                    </div>
                )}

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
