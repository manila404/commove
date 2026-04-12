import React, { useState, useEffect, useMemo } from 'react';
import type { AppNotification, EventType } from '../types';
import { BellIcon, CalendarIcon, MoreVerticalIcon, SlidersHorizontal, CheckCheck, Trash2, ChevronDown, ChevronUp, ExternalLink, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
    subscribeToNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
} from '../services/notificationService';
import { updateEventStatus } from '../services/eventService';
import { createNotification } from '../services/notificationService';

interface NotificationListProps {
    userId: string;
    events: EventType[];
    onEventSelect: (event: EventType, notifType: AppNotification['type']) => void;
    onNavigateToAdmin?: (event: EventType | undefined, tab?: 'requests' | 'list') => void;
    onEventUpdated?: (event: EventType) => void;
    isStaff?: boolean;
    isAdmin?: boolean;
}

type FilterStatus = 'all' | 'unread' | 'read';

const TypeIcon: React.FC<{ type: AppNotification['type']; isRead: boolean }> = ({ type, isRead }) => {
    const base = `w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'}`;

    if (type === 'event_approved') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        );
    }
    if (type === 'event_rejected') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        );
    }
    if (type === 'event_created') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </div>
        );
    }
    if (type === 'reminder' || type === 'event_upcoming' || type === 'event_tomorrow') {
        return <div className={base}><CalendarIcon className="w-5 h-5" /></div>;
    }
    return <div className={base}><BellIcon className="w-5 h-5" /></div>;
};

// Expanded action panel — shown when a notification is clicked
const NotificationActionPanel: React.FC<{
    notif: AppNotification;
    event: EventType | undefined;
    isStaff: boolean;
    isAdmin: boolean;
    onViewEvent: () => void;
    onGoToAdmin: (tab: 'requests' | 'list') => void;
    onClose: () => void;
    onInlineApprove: (event: EventType, action: 'approve_review' | 'approve_publish' | 'reject', rejectReason?: string) => Promise<void>;
    isReviewedInSession?: boolean;
}> = ({ notif, event, isStaff, isAdmin, onViewEvent, onGoToAdmin, onClose, onInlineApprove, isReviewedInSession }) => {
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isActioning, setIsActioning] = useState(false);

    const statusColor = event?.status === 'published' ? 'text-green-600' : event?.status === 'pending' ? 'text-orange-500' : event?.status === 'rejected' ? 'text-red-500' : 'text-gray-500';
    const statusBg = event?.status === 'published' ? 'bg-green-100 dark:bg-green-900/20' : event?.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/20' : event?.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100';

    const handleInlineAction = async (action: 'approve_review' | 'approve_publish' | 'reject') => {
        if (!event) return;
        setIsActioning(true);
        try {
            await onInlineApprove(event, action);
        } finally {
            setIsActioning(false);
        }
    };

    return (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Event summary card */}
            {event && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    {event.imageUrl && (
                        <img src={event.imageUrl} alt={event.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{event.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{event.date} · {event.startTime}</p>
                        <span className={`inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBg} ${statusColor}`}>
                            {event.status || 'published'}
                        </span>
                    </div>
                </div>
            )}

            {/* Inline quick-action for admin on new requests */}
            {isAdmin && notif.type === 'event_created' && event?.status === 'pending' && !showRejectInput && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Quick Actions</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            disabled={isActioning}
                            onClick={() => handleInlineAction('approve_publish')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve & Publish
                        </button>
                        <button
                            disabled={isActioning || (event && isReviewedInSession)}
                            onClick={() => handleInlineAction('approve_review')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-white text-xs font-bold rounded-lg transition-colors ${
                                isReviewedInSession 
                                ? 'bg-blue-300 dark:bg-blue-900/40 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isReviewedInSession ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {isReviewedInSession ? 'Reviewed' : 'Mark as Reviewed'}
                        </button>
                        <button
                            disabled={isActioning}
                            onClick={() => setShowRejectInput(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 disabled:opacity-50 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                        </button>
                        <button
                            onClick={() => onGoToAdmin('requests')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Full Review
                        </button>
                    </div>
                </div>
            )}

            {/* Rejection reason input */}
            {showRejectInput && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs font-bold text-red-600">Rejection Reason</p>
                    <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            disabled={isActioning || !rejectReason.trim()}
                            onClick={async () => {
                                if (!event || !rejectReason.trim()) return;
                                setIsActioning(true);
                                try {
                                    await onInlineApprove(event, 'reject', rejectReason.trim());
                                    setShowRejectInput(false);
                                    setRejectReason('');
                                    onClose();
                                } finally {
                                    setIsActioning(false);
                                }
                            }}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            {isActioning ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                        <button
                            onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Non-admin / non-pending actions */}
            {!showRejectInput && (
                <div className="flex flex-wrap gap-2">
                    {/* Admin actions for non-pending */}
                    {isAdmin && notif.type === 'event_created' && event?.status !== 'pending' && (
                        <button
                            onClick={() => onGoToAdmin('requests')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View in Admin Panel
                        </button>
                    )}

                    {isStaff && notif.type === 'event_approved' && (
                        <>
                            <button
                                onClick={() => onViewEvent()}
                                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                View Published Event
                            </button>
                            <button
                                onClick={() => onGoToAdmin('list')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Go to Events List
                            </button>
                        </>
                    )}

                    {isStaff && notif.type === 'event_rejected' && (
                        <button
                            onClick={() => onGoToAdmin('requests')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View in Admin Panel
                        </button>
                    )}

                    {/* Resident-specific actions */}
                    {!isStaff && notif.type === 'event_approved' && event && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Event
                        </button>
                    )}

                    {!isStaff && notif.type === 'event_rejected' && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                    )}

                    {/* Reminder / upcoming events */}
                    {(notif.type === 'reminder' || notif.type === 'event_upcoming' || notif.type === 'event_tomorrow') && event && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            View Event
                        </button>
                    )}

                    {/* System / generic */}
                    {notif.type === 'system' && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                    )}

                    {/* Generic fallback if event exists but no specific handler */}
                    {event && !['event_created', 'event_approved', 'event_rejected', 'reminder', 'event_upcoming', 'event_tomorrow', 'system'].includes(notif.type) && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Event
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const NotificationList: React.FC<NotificationListProps> = ({ userId, events, onEventSelect, onNavigateToAdmin, onEventUpdated, isStaff = false, isAdmin = false }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const [reviewedEventIds, setReviewedEventIds] = useState<string[]>([]);

    useEffect(() => {
        if (!userId) return;
        const unsub = subscribeToNotifications(userId, setNotifications);
        return () => unsub();
    }, [userId]);

    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') return notifications.filter(n => !n.isRead);
        if (filter === 'read') return notifications.filter(n => n.isRead);
        return notifications;
    }, [notifications, filter]);

    const groupedNotifications = useMemo(() => {
        const groups: Record<string, AppNotification[]> = {};
        filteredNotifications.forEach(notif => {
            const date = new Date(notif.createdAt);
            const today = new Date();
            const yesterday = new Date(); 
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey = 'Older';
            if (date.toDateString() === today.toDateString()) groupKey = 'Today';
            else if (date.toDateString() === yesterday.toDateString()) groupKey = 'Yesterday';
            else {
                groupKey = date.toLocaleDateString([], { month: 'long', day: 'numeric' });
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(notif);
        });
        return groups;
    }, [filteredNotifications]);

    // Click on notification row → expand/collapse action panel
    const handleClick = async (notif: AppNotification) => {
        setOpenMenuId(null);
        if (!notif.isRead) await markNotificationRead(notif.id);
        setExpandedId(prev => prev === notif.id ? null : notif.id);
    };

    const handleDelete = async (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        setOpenMenuId(null);
        if (expandedId === notifId) setExpandedId(null);
        await deleteNotification(notifId);
    };

    const handleMarkRead = async (e: React.MouseEvent, notif: AppNotification) => {
        e.stopPropagation();
        setOpenMenuId(null);
        await markNotificationRead(notif.id);
    };

    const handleClearAll = async () => {
        if (confirm('Are you sure you want to delete all notifications?')) {
            setIsClearing(true);
            try { await deleteAllNotifications(userId); } finally { setIsClearing(false); }
        }
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead(userId);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleInlineApprove = async (event: EventType, action: 'approve_review' | 'approve_publish' | 'reject', rejectReason?: string) => {
        try {
            if (action === 'approve_publish') {
                await updateEventStatus(event.id, 'published');
                if (event.createdBy) {
                    await createNotification(
                        event.createdBy,
                        'event_approved',
                        'Event Approved',
                        `Congratulations! Your event "${event.name}" has been approved and is now live.`,
                        event.id
                    );
                }
            } else if (action === 'approve_review') {
                // Reverted: No longer updates database status to 'reviewed'
                // keeping it pending but restricting the button locally
                setReviewedEventIds(prev => [...prev, event.id]);
                
                if (event.createdBy) {
                    await createNotification(
                        event.createdBy,
                        'event_created', // Use event_created for review status updates
                        'Review in Progress',
                        `Your event "${event.name}" is currently being reviewed by an admin. We'll notify you once it's approved.`,
                        event.id
                    );
                }
            } else if (action === 'reject' && rejectReason) {
                await updateEventStatus(event.id, 'rejected', rejectReason);
                if (event.createdBy) {
                    await createNotification(
                        event.createdBy,
                        'event_rejected',
                        'Event Rejected',
                        `Your event "${event.name}" was rejected. Reason: ${rejectReason}`,
                        event.id
                    );
                }
            }
            
            // Refresh global events state
            if (onEventUpdated) {
                // We pass the partial event info to trigger the update
                onEventUpdated({ 
                    ...event, 
                    status: action === 'approve_publish' ? 'published' : action === 'reject' ? 'rejected' : event.status 
                });
            }
        } catch (error) {
            console.error("Error in handleInlineApprove:", error);
            throw error; // Let the panel handle the actioning state
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
                    <BellIcon className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h3>
                <p className="text-gray-400 text-sm">No notifications here yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4" onClick={() => setOpenMenuId(null)}>
            {/* Header with Counters & Filters */}
            <div className="bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400 font-medium">
                            You have <span className="text-primary-600 font-black">{unreadCount} Notifications</span> today.
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-full transition-all ${showFilters ? 'bg-primary-50 text-primary-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter Controls */}
                {showFilters && (
                    <div className="flex items-center justify-between mt-4 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-1">
                            {(['all', 'unread', 'read'] as FilterStatus[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 pr-2 border-l border-gray-200 dark:border-gray-700 ml-2 pl-2">
                            <button onClick={handleMarkAllRead} className="text-gray-400 hover:text-primary-600 transition-colors" title="Mark all read">
                                <CheckCheck className="w-4 h-4" />
                            </button>
                            <button onClick={handleClearAll} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* List with Date Groups */}
            <div className="space-y-8">
                {Object.entries(groupedNotifications).map(([group, list]) => (
                    <div key={group} className="space-y-3">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {group}
                            <div className="h-[2px] flex-1 bg-gray-100 dark:bg-gray-800 rounded-full" />
                        </h3>
                        
                        <div className="space-y-3">
                            {list.map(notif => {
                                const createdDate = new Date(notif.createdAt);
                                const timeLabel = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const dateLabel = createdDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                const linkedEvent = notif.eventId ? events.find(e => e.id === notif.eventId) : undefined;
                                const isExpanded = expandedId === notif.id;

                                return (
                                    <div
                                        key={notif.id}
                                        className={`group relative rounded-2xl p-4 shadow-sm border transition-all ${
                                            isExpanded
                                                ? 'border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 ring-2 ring-primary-500/10'
                                                : notif.isRead
                                                    ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-80'
                                                    : 'bg-white dark:bg-gray-900 border-primary-100/50 dark:border-primary-900/20 ring-1 ring-primary-500/5'
                                        }`}
                                    >
                                        {/* Click target row */}
                                        <div
                                            className="flex gap-4 cursor-pointer"
                                            onClick={() => handleClick(notif)}
                                        >
                                            {!notif.isRead && (
                                                <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-primary-600" />
                                            )}

                                            <TypeIcon type={notif.type} isRead={notif.isRead} />

                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2 font-medium">
                                                    {notif.body}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    <span>{dateLabel}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span>{timeLabel}</span>
                                                    {notif.eventId && (
                                                        <>
                                                            <span className="opacity-30">•</span>
                                                            <span className="text-primary-500">{isExpanded ? 'Click to close' : 'Click to see actions'}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-1 shrink-0">
                                                {notif.eventId && (
                                                    <span className="p-1.5 text-gray-300 hover:text-primary-500 transition-colors">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === notif.id ? null : notif.id); }}
                                                    className="p-1.5 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <MoreVerticalIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {openMenuId === notif.id && (
                                                <div className="absolute top-12 right-4 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-150">
                                                    {!notif.isRead && (
                                                        <button
                                                            onClick={(e) => handleMarkRead(e, notif)}
                                                            className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                        >
                                                            Mark as Read
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDelete(e, notif.id)}
                                                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded Action Panel */}
                                        {isExpanded && (
                                            <NotificationActionPanel
                                                notif={notif}
                                                event={linkedEvent}
                                                isStaff={isStaff}
                                                isAdmin={isAdmin}
                                                isReviewedInSession={linkedEvent ? reviewedEventIds.includes(linkedEvent.id) : false}
                                                onViewEvent={() => {
                                                    setExpandedId(null);
                                                    if (linkedEvent) onEventSelect(linkedEvent, notif.type);
                                                }}
                                                onGoToAdmin={(tab) => {
                                                    setExpandedId(null);
                                                    if (onNavigateToAdmin) onNavigateToAdmin(linkedEvent, tab);
                                                }}
                                                onInlineApprove={handleInlineApprove}
                                                onClose={() => setExpandedId(null)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NotificationList;
