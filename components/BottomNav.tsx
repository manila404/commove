
import React from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';

// Local QR Icon
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
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe z-[5000] will-change-transform">
            <div className="flex justify-between items-center h-16 max-w-lg mx-auto px-4">
                <button
                    onClick={() => onTabChange('feed')}
                    className={`flex flex-col items-center justify-center w-14 h-16 appearance-none focus:outline-none focus:bg-transparent focus:ring-0 touch-manipulation active:scale-100 active:translate-y-0 active:translate-x-0 active:border-0 active:ring-0 ${activeTab === 'feed' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <HomeIcon className="w-6 h-6 pointer-events-none" />
                    <span className="text-[10px] font-medium pointer-events-none">Feed</span>
                </button>
                
                <button
                    onClick={() => onTabChange('calendar')}
                    className={`flex flex-col items-center justify-center w-14 h-16 appearance-none focus:outline-none focus:bg-transparent focus:ring-0 touch-manipulation active:scale-100 active:translate-y-0 active:translate-x-0 active:border-0 active:ring-0 ${activeTab === 'calendar' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <CalendarIcon className="w-6 h-6 pointer-events-none" />
                    <span className="text-[10px] font-medium pointer-events-none">Calendar</span>
                </button>

                {/* Floating Scan Button */}
                <button
                    onClick={onOpenScanner}
                    className="flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-500/40 hover:bg-primary-700 appearance-none focus:outline-none focus:bg-primary-600 focus:ring-0 touch-manipulation active:scale-100 active:translate-y-0 active:translate-x-0 active:border-0 active:ring-0"
                >
                    <QrCodeIcon className="w-6 h-6 pointer-events-none" />
                </button>

                <div className="relative">
                    <button
                        onClick={onNotificationClick}
                        className={`flex flex-col items-center justify-center w-14 h-16 appearance-none focus:outline-none focus:bg-transparent focus:ring-0 touch-manipulation active:scale-100 active:translate-y-0 active:translate-x-0 active:border-0 active:ring-0 ${activeTab === 'notifications' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                    >
                        <BellIcon className="w-6 h-6 pointer-events-none" />
                        <span className="text-[10px] font-medium pointer-events-none">Notif</span>
                    </button>
                    {(pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) && (
                        <div className="absolute top-2 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] border-2 border-white dark:border-gray-800 pointer-events-none" />
                    )}
                    {(unreadNotificationCount > 0 && (!pendingFacilitatorCount || pendingFacilitatorCount === 0)) && (
                        <div className="absolute top-2 right-4 w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce shadow-sm border-2 border-white dark:border-gray-800 pointer-events-none" />
                    )}
                </div>

                <button
                    onClick={() => onTabChange('nearby')}
                    className={`flex flex-col items-center justify-center w-14 h-16 appearance-none focus:outline-none focus:bg-transparent focus:ring-0 touch-manipulation active:scale-100 active:translate-y-0 active:translate-x-0 active:border-0 active:ring-0 ${activeTab === 'nearby' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    <LocationIcon className="w-6 h-6 pointer-events-none" />
                    <span className="text-[10px] font-medium pointer-events-none">Nearby</span>
                </button>
            </div>
        </div>
    );
});
export default BottomNav;
