import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Home,
    Calendar,
    Bell,
    MapPin,
    BarChart3,
    ListTodo,
    CalendarDays,
    Users,
    FileText,
    Star,
    Plus,
    RefreshCw
} from 'lucide-react';

type AppTab = 'feed' | 'calendar' | 'nearby' | 'notifications';
type AdminTab = 'analytics' | 'events' | 'users' | 'calendar' | 'reports' | 'highlights';

interface SidebarProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onOpenScanner: () => void;
    pendingFacilitatorCount?: number;
    unreadNotificationCount?: number;
    isStaff?: boolean;
    isGuest?: boolean;
    adminActiveTab?: AdminTab;
    onAdminTabChange?: (tab: AdminTab) => void;
    canManageUsers?: boolean;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

const ADMIN_TABS: { tab: AdminTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { tab: 'events', label: 'Events', icon: <ListTodo className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { tab: 'users', label: 'Users', icon: <Users className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { tab: 'reports', label: 'Reports', icon: <FileText className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { tab: 'highlights', label: 'Highlights', icon: <Star className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
];

const NAV_ITEMS = [
    { tab: 'feed' as AppTab, label: 'Feed', icon: (cls: string) => <Home className={cls} strokeWidth={1.8} /> },
    { tab: 'calendar' as AppTab, label: 'Calendar', icon: (cls: string) => <Calendar className={cls} strokeWidth={1.8} /> },
    { tab: 'notifications' as AppTab, label: 'Notifications', icon: (cls: string) => <Bell className={cls} strokeWidth={1.8} /> },
    { tab: 'nearby' as AppTab, label: 'Nearby', icon: (cls: string) => <MapPin className={cls} strokeWidth={1.8} /> },
];

const Sidebar: React.FC<SidebarProps> = ({
    activeTab, onTabChange, onOpenScanner,
    pendingFacilitatorCount, unreadNotificationCount = 0, isStaff = false,
    isGuest = false,
    adminActiveTab, onAdminTabChange, canManageUsers = false,
    expanded: controlledExpanded,
    onExpandedChange,
}) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded = controlledExpanded ?? internalExpanded;
    const navItems = isGuest ? NAV_ITEMS.filter(item => item.tab !== 'notifications') : NAV_ITEMS;
    const toggleExpanded = () => {
        const nextExpanded = !expanded;
        if (controlledExpanded === undefined) setInternalExpanded(nextExpanded);
        onExpandedChange?.(nextExpanded);
    };

    const adminTabs = ADMIN_TABS.filter(t =>
        t.tab !== 'users' && t.tab !== 'highlights' ? true : canManageUsers
    );

    const renderNavBtn = (
        tab: AppTab | null,
        icon: React.ReactNode,
        label: string,
        onClick: () => void,
        hasBadge = false,
        badgeRed = false,
        forceActive = false
    ) => {
        const isActive = forceActive || (tab !== null && activeTab === tab);
        return (
            <button
                key={tab ?? label}
                onClick={onClick}
                title={expanded ? label : undefined}
                className={`group relative flex items-center gap-3 rounded-full transition-all duration-200 ${expanded ? 'w-full px-4 py-2' : 'w-10 h-10 mx-auto justify-center'
                    } ${isActive
                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    }`}
            >
                <div className={`flex-shrink-0 ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {icon}
                </div>
                {expanded && (
                    <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden">
                        {label}
                    </span>
                )}
                {hasBadge && (
                    <span className={`absolute ${expanded ? 'right-3 top-2.5' : 'top-1.5 right-1.5'} w-2 h-2 rounded-full border border-white dark:border-gray-900 ${badgeRed ? 'bg-red-500 animate-pulse' : 'animate-bounce'}`}
                        style={!badgeRed ? { backgroundColor: '#0052A3' } : {}} />
                )}
                {!expanded && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center">
                        <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-black" />
                        <div className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
                            {label}
                        </div>
                    </div>
                )}
            </button>
        );
    };

    return (
        <>
            <div className={`hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 z-30 transition-all duration-300 relative ${expanded ? 'w-52' : 'w-20'}`}>

                {/* ── Floating toggle — sticks out from right edge at top ── */}
                <button
                    onClick={toggleExpanded}
                    title={expanded ? 'Collapse' : 'Expand'}
                    className="absolute -right-3.5 top-5 z-40 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 transition-all"
                >
                    {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* ── Sidebar items container ── */}
                <div className="flex flex-col gap-1 px-2 flex-1">
                    {/* ── Admin Quick Actions — Staff Only ── */}
                    {isStaff && (
                        <div className="flex flex-col gap-1 mb-2">
                            {/* Create Event */}
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('admin-create-event'))}
                                title={expanded ? "Create Event" : undefined}
                                className={`group relative flex items-center gap-3 rounded-full transition-all duration-200 text-white bg-[#0052A3] hover:opacity-90 active:scale-95 ${expanded ? 'w-full px-4 py-2 justify-center' : 'w-10 h-10 mx-auto justify-center'
                                    }`}
                            >
                                <Plus className="w-[18px] h-[18px]" strokeWidth={1.8} />
                                {expanded && <span className="text-[13px] font-medium whitespace-nowrap">Create Event</span>}

                                {!expanded && (
                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center">
                                        <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-black" />
                                        <div className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
                                            Create Event
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Divider */}
                            <div className={`my-1 border-t border-gray-100 dark:border-gray-800 ${expanded ? 'mx-2' : 'mx-3'}`} />
                        </div>
                    )}

                    {/* Regular Nav Items */}
                    {navItems.map(item => {
                        const isNotif = item.tab === 'notifications';
                        const isCalendar = item.tab === 'calendar';
                        const hasBadge = isNotif && (
                            (pendingFacilitatorCount !== undefined && pendingFacilitatorCount > 0) ||
                            unreadNotificationCount > 0
                        );
                        const badgeRed = isNotif && !!pendingFacilitatorCount && pendingFacilitatorCount > 0;

                        // For staff, clicking Calendar opens the dashboard Calendar tab instead
                        const handleClick = isCalendar && isStaff
                            ? () => onAdminTabChange?.('calendar')
                            : () => onTabChange(item.tab);

                        // For staff, Calendar is active when dashboard Calendar tab is open
                        const forceActive = isCalendar && isStaff
                            ? activeTab === 'feed' && adminActiveTab === 'calendar'
                            : false;

                        return renderNavBtn(
                            isCalendar && isStaff ? null : item.tab,
                            item.icon('w-[18px] h-[18px]'),
                            item.label,
                            handleClick,
                            hasBadge,
                            badgeRed,
                            forceActive
                        );
                    })}

                    {/* ── Admin tabs — staff only ── */}
                    {isStaff && (
                        <>
                            {/* Divider */}
                            <div className={`my-2 border-t border-gray-100 dark:border-gray-800 ${expanded ? 'mx-2' : 'mx-3'}`} />

                            {expanded && (
                                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 px-3 mb-1">Dashboard</p>
                            )}

                            {adminTabs.map(item => {
                                const isActive = adminActiveTab === item.tab && activeTab === 'feed';
                                return (
                                    <button
                                        key={item.tab}
                                        onClick={() => onAdminTabChange?.(item.tab)}
                                        title={expanded ? item.label : undefined}
                                        className={`group relative flex items-center gap-3 rounded-full transition-all duration-200 ${expanded ? 'w-full px-4 py-2' : 'w-10 h-10 mx-auto justify-center'
                                            } ${isActive
                                                ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                            }`}
                                    >
                                        <div className={`flex-shrink-0 ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {item.icon}
                                        </div>
                                        {expanded && (
                                            <span className="text-[13px] font-medium whitespace-nowrap">
                                                {item.label}
                                            </span>
                                        )}
                                        {!expanded && (
                                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50 flex items-center">
                                                <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-black" />
                                                <div className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
                                                    {item.label}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}

                        </>
                    )}
                </div>

            </div>
        </>
    );
};

export default Sidebar;
