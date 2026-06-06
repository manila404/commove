
import React from 'react';
import { Home, Calendar, Bell, MapPin, QrCode } from 'lucide-react';

type AppTab = 'feed' | 'calendar' | 'nearby' | 'notifications';

interface BottomNavProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onOpenScanner: () => void;
    onNotificationClick: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
    isStaff?: boolean;
    isGuest?: boolean;
}

const ActiveNavIcon: React.FC<{ tab: AppTab }> = ({ tab }) => {
    const className = "w-[24px] h-[24px] pointer-events-none transition-all";

    if (tab === 'feed') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.55 10.58 12 3.32l8.45 7.26a1.55 1.55 0 0 1 .55 1.18v7.64A1.6 1.6 0 0 1 19.4 21h-4.15v-5.15a3.25 3.25 0 0 0-6.5 0V21H4.6A1.6 1.6 0 0 1 3 19.4v-7.64c0-.45.2-.88.55-1.18ZM10.75 21v-5.15a1.25 1.25 0 0 1 2.5 0V21h-2.5Z"
                />
            </svg>
        );
    }

    if (tab === 'calendar') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="16" rx="3" fill="currentColor" />
                <path d="M3.5 10h17" stroke="var(--nav-cutout)" strokeWidth="1.8" />
                <path d="M8 3.5v3.25M16 3.5v3.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="7" y="13" width="3" height="3" rx=".7" fill="var(--nav-cutout)" />
                <rect x="14" y="13" width="3" height="3" rx=".7" fill="var(--nav-cutout)" />
            </svg>
        );
    }

    if (tab === 'notifications') {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 22a2.35 2.35 0 0 0 2.26-1.7H9.74A2.35 2.35 0 0 0 12 22Z" />
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3.2a6.15 6.15 0 0 0-6.15 6.15v2.48c0 1.07-.37 2.1-1.05 2.92l-.85 1.02A1.35 1.35 0 0 0 4.99 18h14.02a1.35 1.35 0 0 0 1.04-2.23l-.85-1.02a4.55 4.55 0 0 1-1.05-2.92V9.35A6.15 6.15 0 0 0 12 3.2Zm-2.9 3.95a4.2 4.2 0 0 0-1.25 3v1.55c0 .42-.34.75-.75.75s-.75-.33-.75-.75v-1.55a5.7 5.7 0 0 1 1.7-4.07.75.75 0 0 1 1.05 1.07Z"
                />
            </svg>
        );
    }

    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2.75a7.1 7.1 0 0 0-7.1 7.1c0 5.25 6.15 10.85 6.42 11.09a1.02 1.02 0 0 0 1.36 0c.27-.24 6.42-5.84 6.42-11.09A7.1 7.1 0 0 0 12 2.75Zm0 9.85a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
            />
        </svg>
    );
};

const BottomNav: React.FC<BottomNavProps> = React.memo(({
    activeTab, onTabChange, onOpenScanner, onNotificationClick,
    pendingFacilitatorCount, unreadNotificationCount = 0, isStaff = false,
    isGuest = false,
}) => {
    const inactiveColor = 'var(--bottom-nav-inactive)';

    const navBtn = (tab: AppTab | null, Icon: React.ElementType, label: string, onClick: () => void) => {
        const isActive = tab !== null && activeTab === tab;
        return (
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center flex-1 min-w-0 h-full appearance-none focus:outline-none focus:ring-0 touch-manipulation relative py-1.5"
            >
                {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-full" style={{ background: '#0052A3' }} />
                )}
                <div className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                    style={isActive ? { color: '#0052A3' } : { color: inactiveColor }}>
                    {isActive && tab ? (
                        <ActiveNavIcon tab={tab} />
                    ) : (
                        <Icon
                            className="w-[21px] h-[21px] pointer-events-none transition-all"
                            strokeWidth={1.8}
                        />
                    )}
                </div>
                <span className="text-[9px] font-semibold mt-0.5 transition-colors leading-none truncate max-w-full px-0.5"
                    style={isActive ? { color: '#0052A3' } : { color: inactiveColor }}>
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe z-[5000] will-change-transform">
            <div className={`grid ${isStaff ? 'grid-cols-4' : (isGuest ? 'grid-cols-4' : 'grid-cols-5')} h-[68px] max-w-lg mx-auto [--nav-cutout:#fff] [--bottom-nav-inactive:#374151] dark:[--nav-cutout:#111827] dark:[--bottom-nav-inactive:#d1d5db]`}>

                {navBtn('feed', Home, 'Feed', () => onTabChange('feed'))}
                {navBtn('calendar', Calendar, 'Calendar', () => onTabChange('calendar'))}

                {/* Center QR Scanner button — hidden for staff, replaced with 4-item layout */}
                {!isStaff && (
                    <div className="flex items-center justify-center min-w-0">
                        <button
                            onClick={onOpenScanner}
                            className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg appearance-none focus:outline-none focus:ring-0 touch-manipulation active:scale-95 transition-transform overflow-hidden"
                            style={{ background: 'radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6 55%, #1e40af 100%)' }}
                        >
                            <QrCode className="w-[21px] h-[21px] text-white pointer-events-none relative z-10" />
                            {/* Highlight */}
                            <div className="absolute top-2 left-2.5 w-5 h-3 rounded-full bg-white opacity-25 pointer-events-none" style={{ filter: 'blur(4px)' }} />
                        </button>
                    </div>
                )}

                {!isGuest && (
                    <div className="relative min-w-0 h-full flex">
                        {navBtn('notifications', Bell, 'Notif', onNotificationClick)}
                        {pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0 && (
                            <div className="absolute top-3 right-[28%] w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900 pointer-events-none" />
                        )}
                        {unreadNotificationCount > 0 && (!pendingFacilitatorCount || pendingFacilitatorCount === 0) && (
                            <div className="absolute top-3 right-[28%] w-2.5 h-2.5 rounded-full animate-bounce border-2 border-white dark:border-gray-900 pointer-events-none" style={{ background: '#0052A3' }} />
                        )}
                    </div>
                )}

                {navBtn('nearby', MapPin, 'Nearby', () => onTabChange('nearby'))}
            </div>
        </div>
    );
});

export default BottomNav;
