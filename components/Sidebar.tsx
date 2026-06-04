import React, { useState } from 'react';
import { HomeIcon, CalendarIcon, BellIcon, LocationIcon } from '../constants';
import { ChevronLeft, ChevronRight, BarChart2, Users, FileText, Star, CalendarDays, ListChecks, Plus, RefreshCw } from 'lucide-react';

const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.591 2.25l3.173 1.41m0 0a2.25 2.25 0 012.25 2.25V19.5m-18 0a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 19.5v-1.5M3 19.5v-1.5a2.25 2.25 0 012.25-2.25h.75" />
        <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8" />
    </svg>
);

type AppTab = 'feed' | 'calendar' | 'nearby' | 'notifications';
type AdminTab = 'analytics' | 'events' | 'users' | 'calendar' | 'reports' | 'highlights';

interface SidebarProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onOpenScanner: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
    isStaff?: boolean;
    adminActiveTab?: AdminTab;
    onAdminTabChange?: (tab: AdminTab) => void;
    canManageUsers?: boolean;
}

const ADMIN_TABS: { tab: AdminTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'analytics',  label: 'Analytics',      icon: <BarChart2 className="w-5 h-5" /> },
    { tab: 'events',     label: 'Events',          icon: <ListChecks className="w-5 h-5" /> },
    { tab: 'calendar',   label: 'Calendar',        icon: <CalendarDays className="w-5 h-5" /> },
    { tab: 'users',      label: 'Users',           icon: <Users className="w-5 h-5" /> },
    { tab: 'reports',    label: 'Reports',         icon: <FileText className="w-5 h-5" /> },
    { tab: 'highlights', label: 'Highlights',      icon: <Star className="w-5 h-5" /> },
];

const NAV_ITEMS = (isStaff: boolean) => [
    { tab: 'feed' as AppTab,          label: 'Feed',           icon: (cls: string) => <HomeIcon className={cls} /> },
    { tab: 'calendar' as AppTab,      label: 'Calendar',       icon: (cls: string) => <CalendarIcon className={cls} /> },
    { tab: 'notifications' as AppTab, label: 'Notifications',  icon: (cls: string) => <BellIcon className={cls} /> },
    { tab: 'nearby' as AppTab,        label: 'Nearby',         icon: (cls: string) => <LocationIcon className={cls} /> },
];

const Sidebar: React.FC<SidebarProps> = ({
    activeTab, onTabChange, onOpenScanner,
    pendingFacilitatorCount, unreadNotificationCount = 0, isStaff = false,
    adminActiveTab, onAdminTabChange, canManageUsers = false,
}) => {
    const [expanded, setExpanded] = useState(false);

    const activeStyle = { backgroundColor: '#EBF2FF', color: '#0052A3' };
    const navItems = NAV_ITEMS(isStaff);

    const adminTabs = ADMIN_TABS.filter(t =>
        t.tab !== 'users' && t.tab !== 'highlights' ? true : canManageUsers
    );

    const renderNavBtn = (
        tab: AppTab | null,
        icon: React.ReactNode,
        label: string,
        onClick: () => void,
        hasBadge = false,
        badgeRed = false
    ) => {
        const isActive = tab !== null && activeTab === tab;
        return (
            <button
                key={tab ?? label}
                onClick={onClick}
                title={label}
                className={`relative flex items-center gap-3 rounded-2xl transition-all duration-200 w-full ${
                    expanded ? 'px-3 py-2.5' : 'p-3 justify-center'
                }`}
                style={isActive ? activeStyle : {}}
            >
                <div className={`flex-shrink-0 ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    {icon}
                </div>
                {expanded && (
                    <span className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                        style={{ color: isActive ? '#0052A3' : '#6b7280' }}>
                        {label}
                    </span>
                )}
                {hasBadge && (
                    <span className={`absolute ${expanded ? 'right-2 top-2' : 'top-1.5 right-1.5'} w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${badgeRed ? 'bg-red-500 animate-pulse' : 'animate-bounce'}`}
                        style={!badgeRed ? { backgroundColor: '#0052A3' } : {}} />
                )}
            </button>
        );
    };

    return (
    <>
        <div className={`hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 z-30 transition-all duration-300 relative ${expanded ? 'w-52' : 'w-20'}`}>

            {/* ── Floating toggle — sticks out from right edge at top ── */}
            <button
                onClick={() => setExpanded(v => !v)}
                title={expanded ? 'Collapse' : 'Expand'}
                className="absolute -right-3.5 top-5 z-40 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 transition-all"
            >
                {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* ── Regular nav items ── */}
            <div className="flex flex-col gap-1 px-2 flex-1">
                {navItems.map(item => {
                    const isNotif = item.tab === 'notifications';
                    const hasBadge = isNotif && (
                        (pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) ||
                        unreadNotificationCount > 0
                    );
                    const badgeRed = isNotif && !!pendingFacilitatorCount && pendingFacilitatorCount > 0;

                    return renderNavBtn(
                        item.tab,
                        item.icon('w-6 h-6'),
                        item.label,
                        () => onTabChange(item.tab),
                        hasBadge,
                        badgeRed
                    );
                })}

                {/* ── Admin tabs — staff only ── */}
                {isStaff && (
                    <>
                        {/* Divider */}
                        <div className={`my-2 border-t border-gray-100 dark:border-gray-800 ${expanded ? 'mx-2' : 'mx-3'}`} />

                        {expanded && (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">Dashboard</p>
                        )}

                        {adminTabs.map(item => {
                            const isActive = adminActiveTab === item.tab && activeTab === 'feed';
                            return (
                                <button
                                    key={item.tab}
                                    onClick={() => onAdminTabChange?.(item.tab)}
                                    title={item.label}
                                    className={`relative flex items-center gap-3 rounded-2xl transition-all duration-200 w-full ${
                                        expanded ? 'px-3 py-2.5' : 'p-3 justify-center'
                                    }`}
                                    style={isActive ? activeStyle : {}}
                                >
                                    <div className={`flex-shrink-0 ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {item.icon}
                                    </div>
                                    {expanded && (
                                        <span className="text-sm font-semibold whitespace-nowrap"
                                            style={{ color: isActive ? '#0052A3' : '#6b7280' }}>
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                    </>
                )}
            </div>

        </div>

        {/* ── Floating admin action buttons — top right ── */}
        {isStaff && (
            <div className="hidden md:flex items-center gap-2 fixed top-[72px] right-4 z-[100]">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('admin-refresh'))}
                    title="Refresh Data"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('admin-create-event'))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all active:scale-95 hover:opacity-90"
                    style={{ background: '#0052A3' }}
                >
                    <Plus className="w-4 h-4" />
                    Create Event
                </button>
            </div>
        )}
    </>
    );
};

export default Sidebar;
