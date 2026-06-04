import React, { useState } from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';
import { Menu, X, Bot } from 'lucide-react';

const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.591 2.25l3.173 1.41m0 0a2.25 2.25 0 012.25 2.25V19.5m-18 0a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 19.5v-1.5M3 19.5v-1.5a2.25 2.25 0 012.25-2.25h.75" />
        <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
    </svg>
);

type AppTab = 'feed' | 'calendar' | 'chat' | 'nearby' | 'notifications';

interface SidebarProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onOpenScanner: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
    isStaff?: boolean;
}

const NAV_ITEMS = (isStaff: boolean) => [
    { tab: 'feed' as AppTab,          label: 'Feed',           icon: (cls: string) => <HomeIcon className={cls} /> },
    { tab: 'calendar' as AppTab,      label: 'Calendar',       icon: (cls: string) => <CalendarIcon className={cls} /> },
    ...(!isStaff ? [{ tab: 'chat' as AppTab, label: 'AI Assistant', icon: (cls: string) => <BotIcon className={cls} /> }] : []),
    { tab: 'notifications' as AppTab, label: 'Notifications',  icon: (cls: string) => <BellIcon className={cls} /> },
    { tab: 'nearby' as AppTab,        label: 'Nearby',         icon: (cls: string) => <LocationIcon className={cls} /> },
];

const Sidebar: React.FC<SidebarProps> = ({
    activeTab, onTabChange, onOpenScanner,
    pendingFacilitatorCount, unreadNotificationCount = 0, isStaff = false,
}) => {
    const [expanded, setExpanded] = useState(false);

    const activeStyle = { backgroundColor: '#EBF2FF', color: '#0052A3' };
    const items = NAV_ITEMS(isStaff);

    return (
        <div
            className={`hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 z-30 transition-all duration-300 ${expanded ? 'w-52' : 'w-20'}`}
        >
            {/* Menu toggle */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors mb-4 mx-auto"
                title={expanded ? 'Collapse menu' : 'Expand menu'}
            >
                {expanded ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Nav items */}
            <div className="flex flex-col gap-1 px-2 flex-1">
                {items.map(item => {
                    const isActive = activeTab === item.tab;
                    const hasBadge =
                        (item.tab === 'notifications' && pendingFacilitatorCount && pendingFacilitatorCount > 0) ||
                        (item.tab === 'notifications' && unreadNotificationCount > 0 && !pendingFacilitatorCount);

                    return (
                        <button
                            key={item.tab}
                            onClick={() => onTabChange(item.tab)}
                            title={item.label}
                            className={`relative flex items-center gap-3 rounded-2xl transition-all duration-200 ${
                                expanded ? 'px-3 py-2.5 w-full' : 'p-3 justify-center'
                            }`}
                            style={isActive ? activeStyle : {}}
                        >
                            {/* Icon */}
                            <div className={`flex-shrink-0 ${isActive ? '' : 'text-gray-500'}`}>
                                {item.icon('w-6 h-6')}
                            </div>

                            {/* Label — only when expanded */}
                            {expanded && (
                                <span
                                    className="text-sm font-semibold whitespace-nowrap overflow-hidden transition-all"
                                    style={{ color: isActive ? '#0052A3' : '#6b7280' }}
                                >
                                    {item.label}
                                </span>
                            )}

                            {/* Notification badge */}
                            {hasBadge && (
                                <span className={`absolute ${expanded ? 'right-2 top-2' : 'top-1.5 right-1.5'} w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
                                    pendingFacilitatorCount && pendingFacilitatorCount > 0
                                        ? 'bg-red-500 animate-pulse'
                                        : 'animate-bounce'
                                }`}
                                style={!pendingFacilitatorCount || pendingFacilitatorCount === 0 ? { backgroundColor: '#0052A3' } : {}}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Sidebar;
