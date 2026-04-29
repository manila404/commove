import React, { useState, useEffect, useMemo } from 'react';
import type { AppNotification, EventType } from '../types';
import { ShieldCheckIcon } from '../constants';
import { BellIcon, CalendarIcon, MoreVerticalIcon, SlidersHorizontal, CheckCheck, Trash2, ChevronDown, ChevronUp, ExternalLink, Eye, CheckCircle, XCircle, Clock, Star, Zap } from 'lucide-react';
import {
    subscribeToNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
} from '../services/notificationService';
import { updateEventStatus } from '../services/eventService';
import { createNotification } from '../services/notificationService';
import { getUserProfile } from '../services/userService';
import type { User } from '../types';

interface NotificationListProps {
    userId: string;
    events: EventType[];
    onEventSelect: (event: EventType, notifType: AppNotification['type']) => void;
    onNavigateToAdmin?: (event: EventType | undefined, tab?: 'requests' | 'list' | 'users', targetId?: string) => void;
    onEventUpdated?: (event: EventType) => void;
    onManageRegistrations?: (event: EventType) => void;
    isStaff?: boolean;
    isAdmin?: boolean;
    savedEventIds?: string[];
    interestedEventIds?: string[];
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
    if (type === 'facilitator_request') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </div>
        );
    }
    if (type === 'event_registration') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </div>
        );
    }
    if (type === 'reminder' || type === 'event_upcoming' || type === 'event_tomorrow') {
        return <div className={base}><CalendarIcon className="w-5 h-5" /></div>;
    }
    if (type === 'event_updated') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            </div>
        );
    }
    if (type === 'event_cancelled') {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </div>
        );
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
    onGoToAdmin: (tab: 'requests' | 'list' | 'users', targetId?: string) => void;
    onClose: () => void;
    onInlineApprove: (event: EventType, action: 'approve_review' | 'approve_publish' | 'reject', rejectReason?: string) => Promise<void>;
    isReviewedInSession?: boolean;
    onManageRegistrations?: (event: EventType) => void;
}> = ({ notif, event, isStaff, isAdmin, onViewEvent, onGoToAdmin, onClose, onInlineApprove, isReviewedInSession, onManageRegistrations }) => {
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

            {/* Quick action for facilitator requests */}
            {isAdmin && notif.type === 'facilitator_request' && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Quick Actions</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                onGoToAdmin('users', notif.eventId);
                            }} 
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            Manage Users
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

                    {/* Registration Management — event creator can approve/reject directly */}
                    {isStaff && notif.type === 'event_registration' && event && onManageRegistrations && (
                        <button
                            onClick={() => {
                                onManageRegistrations(event);
                                onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            Manage Registrations
                        </button>
                    )}

                    {/* Also show View Event for registration notifications so creator can see the event */}
                    {isStaff && notif.type === 'event_registration' && event && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Event
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

                    {notif.type === 'event_feedback' && event && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                            <Star className="w-3.5 h-3.5" />
                            Rate Event
                        </button>
                    )}

                    {/* Event updated — resident can view the event for updated details */}
                    {notif.type === 'event_updated' && event && (
                        <button
                            onClick={() => onViewEvent()}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Updated Event
                        </button>
                    )}

                    {/* Event cancelled — just a dismiss action */}
                    {notif.type === 'event_cancelled' && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg transition-colors"
                        >
                            Dismiss
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
                    {event && !['event_created', 'event_approved', 'event_rejected', 'event_registration', 'reminder', 'event_upcoming', 'event_tomorrow', 'event_feedback', 'event_updated', 'event_cancelled', 'system'].includes(notif.type) && (
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

const NotificationList: React.FC<NotificationListProps> = ({ userId, events, onEventSelect, onNavigateToAdmin, onEventUpdated, onManageRegistrations, isStaff = false, isAdmin = false, savedEventIds = [], interestedEventIds = [] }) => {
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
        let result = notifications;
        if (filter === 'unread') result = result.filter(n => !n.isRead);
        if (filter === 'read') result = result.filter(n => n.isRead);
        return result;
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
        // Virtual facilitator notifications are not in Firestore, skip markRead
        if (!notif.id.startsWith('pending-facilitator-') && !notif.isRead) {
            await markNotificationRead(notif.id);
        }
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
                const nextStatus = (event.publishAt && event.publishAt > Date.now()) ? 'scheduled' : 'published';
                await updateEventStatus(event.id, nextStatus);
                if (event.createdBy) {
                    await createNotification(
                        event.createdBy,
                        'event_approved',
                        nextStatus === 'scheduled' ? 'Event Scheduled' : 'Event Approved',
                        nextStatus === 'scheduled' 
                            ? `Your event "${event.name}" has been approved by the admin and scheduled for publication.`
                            : `Your created event "${event.name}" has been approved by the admin.`,
                        event.id
                    );
                }
                // Notify Admin
                await createNotification(userId, 'event_approved', nextStatus === 'scheduled' ? 'Event Scheduled' : 'Event Published', nextStatus === 'scheduled' ? 'You have scheduled a facilitator event.' : 'You have published an facilitator event.', event.id);
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

    // Check if any events are currently ongoing so we can show them even with zero notifications
    const userEventIds = new Set([...savedEventIds, ...interestedEventIds]);
    const hasOngoingEvents = events.some(e => {
        if (!userEventIds.has(e.id)) return false; // only events user saved or is interested in
        if (e.status !== 'published' && e.status !== 'scheduled') return false;
        try {
            const now = Date.now();
            const start = new Date(`${e.date}T${e.startTime}`).getTime();
            const end   = new Date(`${e.endDate || e.date}T${e.endTime || '23:59'}`).getTime();
            return start <= now && now <= end;
        } catch { return false; }
    });

    if (notifications.length === 0 && !hasOngoingEvents) {
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

            {/* ── Ongoing Events ───────────────────────────────────────────── */}
            {(() => {
                const now = Date.now();
                const ongoingEvents = events.filter(e => {
                    // Only show events this user saved or marked as interested
                    if (!userEventIds.has(e.id)) return false;
                    if (e.status !== 'published' && e.status !== 'scheduled') return false;
                    try {
                        const start = new Date(`${e.date}T${e.startTime}`).getTime();
                        const end   = new Date(`${e.endDate || e.date}T${e.endTime || '23:59'}`).getTime();
                        return start <= now && now <= end;
                    } catch { return false; }
                });

                if (ongoingEvents.length === 0) return null;

                const fmt12 = (t: string) => {
                    try {
                        const [h, m] = t.split(':').map(Number);
                        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                    } catch { return t; }
                };

                return (
                    <div className="space-y-3">
                        {/* Section Header */}
                        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                                Ongoing
                            </span>
                            <div className="h-[2px] flex-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-full" />
                        </h3>

                        {ongoingEvents.map(event => (
                            <div
                                key={event.id}
                                className="relative rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
                            >
                                {/* Live gradient background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40" />

                                <div className="relative flex items-center gap-4 p-4">
                                    {/* Cover image or icon */}
                                    {event.imageUrl ? (
                                        <img src={event.imageUrl} alt={event.name}
                                            className="w-14 h-14 rounded-xl object-cover shrink-0 border-2 border-emerald-200 dark:border-emerald-700 shadow-sm" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 border-2 border-emerald-200 dark:border-emerald-700">
                                            <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                                                LIVE NOW
                                            </span>
                                        </div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{event.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {fmt12(event.startTime)} – {fmt12(event.endTime || '23:59')}
                                        </p>
                                        {event.venue && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">📍 {event.venue}</p>
                                        )}
                                    </div>

                                    {/* View button */}
                                    <button
                                        onClick={() => onEventSelect(event, 'reminder')}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}

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
                                                {/* Hide 3-dot menu for virtual facilitator notifications */}
                                                {!notif.id.startsWith('pending-facilitator-') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === notif.id ? null : notif.id); }}
                                                    className="p-1.5 text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <MoreVerticalIcon className="w-4 h-4" />
                                                </button>
                                                )}
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

                                        {/* Always-visible Quick Actions for facilitator requests */}
                                        {notif.type === 'facilitator_request' && isAdmin && (
                                            <NotificationActionPanel
                                                notif={notif}
                                                event={linkedEvent}
                                                isStaff={isStaff}
                                                isAdmin={isAdmin}
                                                isReviewedInSession={false}
                                                onViewEvent={() => {}}
                                                onGoToAdmin={(tab, targetId) => {
                                                    setExpandedId(null);
                                                    if (onNavigateToAdmin) onNavigateToAdmin(linkedEvent, tab, targetId);
                                                }}
                                                onInlineApprove={handleInlineApprove}
                                                onClose={() => {}}
                                                onManageRegistrations={onManageRegistrations}
                                            />
                                        )}

                                        {/* Expanded Action Panel for other types */}
                                        {isExpanded && notif.type !== 'facilitator_request' && (
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
                                                onGoToAdmin={(tab, targetId) => {
                                                    setExpandedId(null);
                                                    if (onNavigateToAdmin) onNavigateToAdmin(linkedEvent, tab, targetId);
                                                }}
                                                onInlineApprove={handleInlineApprove}
                                                onClose={() => setExpandedId(null)}
                                                onManageRegistrations={onManageRegistrations}
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
