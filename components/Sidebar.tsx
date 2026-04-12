import React from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';

const QrCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
);

interface SidebarProps {
    activeTab: 'feed' | 'calendar' | 'nearby' | 'notifications';
    onTabChange: (tab: 'feed' | 'calendar' | 'nearby' | 'notifications') => void;
    onOpenScanner: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onOpenScanner, pendingFacilitatorCount, unreadNotificationCount = 0 }) => {
    return (
        <div className="hidden md:flex flex-col w-20 h-[calc(100vh-64px)] sticky top-16 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-6 items-center gap-6 z-30">
            <button
                onClick={() => onTabChange('feed')}
                className={`p-3 rounded-2xl transition-all ${
                    activeTab === 'feed' 
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Feed"
            >
                <HomeIcon className="w-6 h-6" />
            </button>
            <button
                onClick={() => onTabChange('calendar')}
                className={`p-3 rounded-2xl transition-all ${
                    activeTab === 'calendar' 
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Calendar"
            >
                <CalendarIcon className="w-6 h-6" />
            </button>
            <button
                onClick={onOpenScanner}
                className="p-3 rounded-2xl transition-all text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Scan QR"
            >
                <QrCodeIcon className="w-6 h-6" />
            </button>
            <div className="relative">
                <button
                    onClick={() => onTabChange('notifications')}
                    className={`p-3 rounded-2xl transition-all ${
                        activeTab === 'notifications' 
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title="Notifications"
                >
                    <BellIcon className="w-6 h-6" />
                </button>
                {(pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] border-2 border-white dark:border-gray-900" title={`${pendingFacilitatorCount} pending requests`} />
                )}
                {(unreadNotificationCount > 0 && (!pendingFacilitatorCount || pendingFacilitatorCount === 0)) && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary-500 rounded-full animate-bounce shadow-sm border-2 border-white dark:border-gray-900" title={`${unreadNotificationCount} unread notifications`} />
                )}
            </div>
            <button
                onClick={() => onTabChange('nearby')}
                className={`p-3 rounded-2xl transition-all ${
                    activeTab === 'nearby' 
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Nearby"
            >
                <LocationIcon className="w-6 h-6" />
            </button>
        </div>
    );
};

export default Sidebar;
