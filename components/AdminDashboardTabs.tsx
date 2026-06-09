import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { EventType, User } from '../types';
import { formatTime, formatDisplayDate, XMarkIcon, MoreVerticalIcon } from '../constants';
import { smartSearchEvents } from '../utils/searchUtils';
import { getEventAlerts } from '../utils/eventAlerts';
import type { EventAlert } from '../utils/eventAlerts';
import { Star, MessageSquare, ChevronLeft, ChevronRight, Calendar, User as UserIcon, Lock, Eye, Globe, Shield, Users as UsersIcon, Search, X, Clock, Trash2, BarChart3, QrCode, Pencil, Bell, Ban } from 'lucide-react';
import AdminReports from './AdminReports';
import CalendarView from './CalendarView';
import { getHighlights, setHighlights } from '../services/eventService';
import { subscribeToAllFeedback } from '../services/feedbackService';

import { generateEventDecisionInsight, generateMonthlyDecisionSummary, generateAdminDecisionSummary, generateFacilitatorDecisionSummary } from '../services/analyticsInsightService';
import type { CrossDomainSummary, DomainInsight, InsightDomain, InsightLevel } from '../services/analyticsInsightService';
import type { EventFeedback } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import { getCategoryStyle } from '../utils/categoryStyles';
import { buildDayMap, toYMD } from '../utils/calendarUtils';
interface AdminDashboardTabsProps {
    events: EventType[];
    allEvents: EventType[]; // Full non-deduplicated list for recurring count badges
    users: User[];
    pendingRequests: EventType[];
    onApprove: (event: EventType) => void;
    onReject: (eventId: string) => void;
    onEditEvent: (event: EventType) => void;
    onDeleteEvent: (eventId: string) => void;
    onViewQRCode: (event: EventType) => void;
    onViewParticipants: (event: EventType) => void;
    onSchedule: (event: EventType) => void;
    onPreviewEvent?: (event: EventType) => void;
    // User management props
    filteredUsers: User[];
    userSearchQuery: string;
    setUserSearchQuery: (query: string) => void;
    userFilter: 'all' | 'admins' | 'facilitators' | 'users';
    setUserFilter: (filter: 'all' | 'admins' | 'facilitators' | 'users') => void;
    isLoadingUsers: boolean;
    userError: string;
    fetchUsers: () => void;
    handleRoleUpdate: (userId: string, newRole: 'admin' | 'facilitator' | 'user') => void;
    onApproveFacilitator: (userId: string) => void;
    onRejectFacilitator: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
    canManageUsers: boolean;
    activeTab: 'analytics' | 'events' | 'users' | 'calendar' | 'reports' | 'highlights';
    setActiveTab: (tab: 'analytics' | 'events' | 'users' | 'calendar' | 'reports' | 'highlights') => void;
    initialTab?: 'analytics' | 'events' | 'users';
    onInitialTabConsumed?: () => void;
    highlightUserId?: string;
    onHighlightConsumed?: () => void;
    onManageRegistrations?: (event: EventType) => void;
    currentUser?: import('../types').User;
    onCancelEvent?: (event: EventType) => void;
    onNotifyUpdate?: (event: EventType) => void;
}


// ─── Insight first-seen timestamp ────────────────────────────────────────────
// Key is based on the stable identifier only (domain/card title + insight title),
// NOT the body text — body contains live numbers that change with data.
const getInsightFirstSeenAt = (stableId: string): Date => {
    let h = 5381;
    for (let i = 0; i < stableId.length; i++) h = (((h << 5) + h) + stableId.charCodeAt(i)) & 0x7fffffff;
    const key = `cmt_its_${h.toString(36)}`;
    try {
        const stored = localStorage.getItem(key);
        if (stored) return new Date(stored);
        const now = new Date().toISOString();
        localStorage.setItem(key, now);
        return new Date(now);
    } catch {
        return new Date();
    }
};

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({
    events, allEvents, users, pendingRequests, onApprove, onReject, onEditEvent, onDeleteEvent, onViewQRCode, onViewParticipants,
    onSchedule, onPreviewEvent,
    filteredUsers, userSearchQuery, setUserSearchQuery, userFilter, setUserFilter,
    isLoadingUsers, userError, fetchUsers, handleRoleUpdate, onApproveFacilitator, onRejectFacilitator, onDeleteUser, canManageUsers,
    activeTab, setActiveTab, initialTab, onInitialTabConsumed, highlightUserId, onHighlightConsumed, onManageRegistrations, currentUser,
    onCancelEvent, onNotifyUpdate
}) => {
    const getRecurringSeriesCount = (event: EventType): number => {
        if (!event.recurrenceGroupId) return 0;
        return allEvents.filter(e => e.recurrenceGroupId === event.recurrenceGroupId).length;
    };

    const getRecurrenceFrequencyLabel = (event: EventType): string => {
        if (!event.recurrenceGroupId) return '';
        const matching = allEvents.find(e => e.recurrenceGroupId === event.recurrenceGroupId && e.recurrenceRule?.frequency);
        const freq = matching?.recurrenceRule?.frequency || event.recurrenceRule?.frequency;
        if (freq === 'weekly') return 'Weekly';
        if (freq === 'monthly_date' || freq === 'monthly_day') return 'Monthly';
        return '';
    };

    // ── Alert chip renderer ───────────────────────────────────────────────────
    const AlertChip = ({ alert }: { alert: EventAlert }) => (
        <span
            title={alert.detail}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium flex-shrink-0 cursor-default select-none text-gray-900 dark:text-gray-100 ${alert.severity === 'error'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30'
                }`}
        >
            {alert.severity === 'error' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            )}
            {alert.label}
        </span>
    );

    // ── Card-level decision support micro-insight ─────────────────────────────
    const CardInsight = ({ level, text, rec, moreInsights, onMoreDetails }: { level: InsightLevel; text: string; rec?: string; moreInsights?: Array<{ level: InsightLevel; text: string; rec?: string }>; onMoreDetails?: () => void }) => {
        const cfgMap: Record<InsightLevel, { bg: string; border: string; iconBg: string; iconText: string }> = {
            success: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-100 dark:border-green-800/30', iconBg: 'bg-green-100 dark:bg-green-900/30', iconText: 'text-green-600 dark:text-green-400' },
            info: { bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-800/30', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconText: 'text-indigo-600 dark:text-indigo-400' },
            warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-800/30', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconText: 'text-amber-600 dark:text-amber-400' },
            critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-100 dark:border-red-800/30', iconBg: 'bg-red-100 dark:bg-red-900/30', iconText: 'text-red-600 dark:text-red-400' },
        };
        const cfg = cfgMap[level];
        const iconPaths: Record<InsightLevel, React.ReactNode> = {
            success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />,
            info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
            warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
            critical: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />,
        };
        return (
            <div className={`mt-3 rounded-lg border p-2.5 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Decision Support</p>
                    {moreInsights && moreInsights.length > 0 && onMoreDetails && (
                        <button
                            onClick={onMoreDetails}
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-0.5"
                        >
                            More Details
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
                <div className="flex gap-2 items-start">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg} ${cfg.iconText}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">{iconPaths[level]}</svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{text}</p>
                        {rec && <p className="text-[10px] text-purple-600 dark:text-purple-400 leading-relaxed mt-1 font-medium">→ {rec}</p>}
                    </div>
                </div>
            </div>
        );
    };

    // ── Phase 3 analytics helpers ─────────────────────────────────────────────
    const safeNum = (v: unknown): number => { const n = Number(v); return isFinite(n) ? n : 0; };
    const calcEngagementRate = (interested: number, checkIn: number, views: number): string =>
        views === 0 ? '—' : `${Math.min(100, Math.round(((interested + checkIn) / views) * 100))}%`;
    const calcAttendanceRate = (checkIn: number, interested: number): string =>
        interested === 0 ? '—' : `${Math.min(100, Math.round((checkIn / interested) * 100))}%`;
    const calcFeedbackRate = (feedback: number, checkIn: number): string =>
        checkIn === 0 ? '—' : `${Math.min(100, Math.round((feedback / checkIn) * 100))}%`;

    const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
    const [viewingDate, setViewingDate] = useState<Date>(new Date());
    const [calendarView, setCalendarView] = useState<'month' | 'agenda'>('month');
    const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(new Date());
    const [isMobile, setIsMobile] = React.useState(false);
    const agendaMonthStart = useMemo(() => {
        const date = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), 1);
        date.setHours(0, 0, 0, 0);
        return date;
    }, [viewingDate]);
    const agendaMonthEnd = useMemo(() => {
        const date = new Date(viewingDate.getFullYear(), viewingDate.getMonth() + 1, 0);
        date.setHours(23, 59, 59, 999);
        return date;
    }, [viewingDate]);
    const agendaDayMap = useMemo(
        () => buildDayMap(events, agendaMonthStart, agendaMonthEnd),
        [events, agendaMonthStart, agendaMonthEnd]
    );

    const isEventPast = (event: EventType) => {
        const refDate = event.endDate || event.date;
        const refTime = event.endTime || '23:59';
        const endMs = new Date(`${refDate}T${refTime}`).getTime();
        if (isNaN(endMs)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return new Date(event.date + 'T00:00:00') < today;
        }
        return endMs < Date.now();
    };

    const [eventFilter, setEventFilter] = useState<'all' | 'pending' | 'scheduled' | 'published'>('all');
    const [eventSortOrder, setEventSortOrder] = useState<'asc' | 'desc' | 'past' | 'upcoming'>('upcoming');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [eventVisibilityFilter, setEventVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
    const [eventsPage, setEventsPage] = useState(1);
    useEffect(() => { setEventsPage(1); }, [eventFilter, eventSortOrder, eventVisibilityFilter]);

    // ── Events tab search bar ─────────────────────────────────────────────────
    const [eventSearchQuery, setEventSearchQuery] = useState('');
    const [eventSearchFocused, setEventSearchFocused] = useState(false);
    const [eventSearchHistory, setEventSearchHistory] = useState<string[]>([]);
    const eventSearchRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const saved = localStorage.getItem('admin_event_searches');
        if (saved) setEventSearchHistory(JSON.parse(saved));
    }, []);
    useEffect(() => { setEventsPage(1); }, [eventSearchQuery]);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (eventSearchRef.current && !eventSearchRef.current.contains(e.target as Node))
                setEventSearchFocused(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const saveEventSearchHistory = (term: string) => {
        if (!term.trim()) return;
        const next = [term, ...eventSearchHistory.filter(h => h !== term)].slice(0, 5);
        setEventSearchHistory(next);
        localStorage.setItem('admin_event_searches', JSON.stringify(next));
    };
    const clearEventSearchHistory = () => {
        setEventSearchHistory([]);
        localStorage.removeItem('admin_event_searches');
    };
    const [analyticsDrawerEvent, setAnalyticsDrawerEvent] = useState<EventType | null>(null);
    const [metricsDrawerOpen, setMetricsDrawerOpen] = useState(false);
    const [dsDrawerOpen, setDsDrawerOpen] = useState(false);
    const [pendingDrawerOpen, setPendingDrawerOpen] = useState(false);
    const [pendingFacilitatorDrawerOpen, setPendingFacilitatorDrawerOpen] = useState(false);
    const [cardDetailDrawer, setCardDetailDrawer] = useState<{ title: string; insights: Array<{ level: InsightLevel; text: string; rec?: string }> } | null>(null);
    const [cardDetailClosing, setCardDetailClosing] = useState(false);
    const closeCardDetailDrawer = () => {
        setCardDetailClosing(true);
        setTimeout(() => { setCardDetailDrawer(null); setCardDetailClosing(false); }, 320);
    };

    // Persist card detail insights to localStorage whenever a card is opened.
    // Key per card title + user so each card has its own independent history.
    useEffect(() => {
        if (!cardDetailDrawer || !currentUser?.uid) return;
        const uid = currentUser.uid;
        const slug = cardDetailDrawer.title.replace(/\s+/g, '_').toLowerCase();
        const key = `cmt_ch_${slug}_${uid}`;
        type CardEntry = { level: InsightLevel; text: string; rec?: string; seenAt: string };
        let existing: CardEntry[] = [];
        try { const r = localStorage.getItem(key); if (r) existing = JSON.parse(r); } catch { }
        const existingTexts = new Set(existing.map(h => h.text));
        const now = new Date().toISOString();
        const added = cardDetailDrawer.insights
            .filter(ins => !existingTexts.has(ins.text))
            .map(ins => ({ level: ins.level, text: ins.text, rec: ins.rec, seenAt: now }));
        if (added.length === 0) return;
        const updated = [...existing, ...added].slice(-150);
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch { }
    }, [cardDetailDrawer?.title, currentUser?.uid]); // runs each time a different card is opened

    // User management extra state
    const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest' | 'asc' | 'desc'>('newest');
    const [userPage, setUserPage] = useState(1);
    const [showPendingFacilitatorFilter, setShowPendingFacilitatorFilter] = useState(false);
    const [showUserFilterDropdown, setShowUserFilterDropdown] = useState(false);
    const [openKebabUserId, setOpenKebabUserId] = useState<string | null>(null);
    const USERS_PER_PAGE = 10;

    // ── User search bar ───────────────────────────────────────────────────────
    const [userSearchFocused, setUserSearchFocused] = useState(false);
    const [userSearchHistory, setUserSearchHistory] = useState<string[]>([]);
    const userSearchRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const saved = localStorage.getItem('admin_user_searches');
        if (saved) setUserSearchHistory(JSON.parse(saved));
    }, []);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node))
                setUserSearchFocused(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const saveUserSearchHistory = (term: string) => {
        if (!term.trim()) return;
        const next = [term, ...userSearchHistory.filter(h => h !== term)].slice(0, 5);
        setUserSearchHistory(next);
        localStorage.setItem('admin_user_searches', JSON.stringify(next));
    };
    const clearUserSearchHistory = () => {
        setUserSearchHistory([]);
        localStorage.removeItem('admin_user_searches');
    };

    // Role change confirmation state
    const [pendingRoleChange, setPendingRoleChange] = useState<{ user: User; newRole: 'facilitator' | 'user' } | null>(null);
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
    const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number } | null>(null);

    const [allFeedback, setAllFeedback] = useState<EventFeedback[]>([]);
    const [viewingFeedbackEvent, setViewingFeedbackEvent] = useState<EventType | null>(null);

    // ── Persistent insight history ────────────────────────────────────────────
    // Accumulates every insight ever detected for this user. Survives refresh.
    type StoredInsight = { domain: InsightDomain; level: InsightLevel; title: string; body: string; seenAt: string };
    const [insightHistory, setInsightHistory] = useState<StoredInsight[]>([]);

    // Load history from localStorage when user identity resolves
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!uid) return;
        try {
            const raw = localStorage.getItem(`cmt_ih_${uid}`);
            if (raw) setInsightHistory(JSON.parse(raw) as StoredInsight[]);
        } catch { }
    }, [currentUser?.uid]);


    // Confirmation dialog state
    type ConfirmAction = { type: 'publish' | 'cancel' | 'notify'; event: EventType } | null;
    const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction>(null);

    // Image Modal State
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close action menu when clicking outside or scrolling
    useEffect(() => {
        if (!activeActionMenu) return;

        const close = (event: globalThis.MouseEvent | Event) => {
            const target = (event as globalThis.MouseEvent).target as Element;
            if (event.type === 'scroll' || (target && target.closest && !target.closest('.action-menu-container'))) {
                setActiveActionMenu(null);
                setActionMenuPos(null);
            }
        };

        document.addEventListener('mousedown', close);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [activeActionMenu]);

    // Respond to external tab navigation requests (e.g. from notification buttons)
    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
            onInitialTabConsumed?.();
        }
    }, [initialTab]);

    // Listen for a custom event to auto-show pending facilitator filter
    React.useEffect(() => {
        const handler = () => {
            setActiveTab('users');
            setShowPendingFacilitatorFilter(true);
            setUserPage(1);
        };
        window.addEventListener('admin-show-pending-facilitators', handler);
        return () => window.removeEventListener('admin-show-pending-facilitators', handler);
    }, []);

    // Handle highlighting and scrolling to a specific user
    React.useEffect(() => {
        if (highlightUserId && activeTab === 'users') {
            // Give it a tiny bit of time for the tab content to render
            const timer = setTimeout(() => {
                const element = document.getElementById(`user-${highlightUserId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight pulse effect is handled via CSS classes in the render

                    // Consume the highlight request after a delay
                    setTimeout(() => {
                        onHighlightConsumed?.();
                    }, 3000);
                } else {
                    // If not found (maybe in a different filter?), clear it anyway to avoid infinite loops
                    onHighlightConsumed?.();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightUserId, activeTab]);

    // ── Highlights state ──────────────────────────────────────────────────────
    const [highlightIds, setHighlightIds] = useState<string[]>([]);
    const [highlightsLoading, setHighlightsLoading] = useState(true);
    const [highlightsSaving, setHighlightsSaving] = useState(false);
    const [highlightsSaved, setHighlightsSaved] = useState(false);
    const [highlightsShowModal, setHighlightsShowModal] = useState(false);
    const [highlightSearch, setHighlightSearch] = useState('');
    const [highlightSearchFocused, setHighlightSearchFocused] = useState(false);
    const highlightSearchRef = useRef<HTMLDivElement>(null);
    const [highlightVisFilter, setHighlightVisFilter] = useState<'all' | 'public' | 'private'>('all');
    const [highlightPage, setHighlightPage] = useState(1);
    const HIGHLIGHTS_PER_PAGE = 10;
    const SELECTED_HIGHLIGHTS_PER_PAGE = 4;
    const selectedHighlightMobileScrollRef = useRef<HTMLDivElement>(null);
    const selectedHighlightDesktopViewportRef = useRef<HTMLDivElement>(null);
    const selectedHighlightTouchStartX = useRef<number>(0);
    const selectedHighlightWheelAccum = useRef<number>(0);
    const selectedHighlightWheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedHighlightPage, setSelectedHighlightPage] = useState(0);
    const selectedHighlightTotalPages = Math.max(1, Math.ceil(highlightIds.length / SELECTED_HIGHLIGHTS_PER_PAGE));
    useEffect(() => { setHighlightPage(1); }, [highlightSearch, highlightVisFilter]);
    useEffect(() => {
        setSelectedHighlightPage(p => Math.min(p, selectedHighlightTotalPages - 1));
    }, [selectedHighlightTotalPages]);
    useEffect(() => {
        const el = selectedHighlightMobileScrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
            e.preventDefault();
            el.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [highlightIds.length]);
    useEffect(() => {
        const el = selectedHighlightDesktopViewportRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaX) < 5) return;
            e.preventDefault();
            selectedHighlightWheelAccum.current += e.deltaX;
            if (selectedHighlightWheelTimer.current) clearTimeout(selectedHighlightWheelTimer.current);
            selectedHighlightWheelTimer.current = setTimeout(() => { selectedHighlightWheelAccum.current = 0; }, 300);
            if (selectedHighlightWheelAccum.current > 80) {
                selectedHighlightWheelAccum.current = 0;
                setSelectedHighlightPage(p => Math.min(selectedHighlightTotalPages - 1, p + 1));
            } else if (selectedHighlightWheelAccum.current < -80) {
                selectedHighlightWheelAccum.current = 0;
                setSelectedHighlightPage(p => Math.max(0, p - 1));
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheel);
            if (selectedHighlightWheelTimer.current) clearTimeout(selectedHighlightWheelTimer.current);
        };
    }, [selectedHighlightTotalPages]);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (highlightSearchRef.current && !highlightSearchRef.current.contains(e.target as Node))
                setHighlightSearchFocused(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Load highlights ONCE on mount so saved selections always persist
    React.useEffect(() => {
        setHighlightsLoading(true);
        getHighlights().then(ids => {
            setHighlightIds(ids);
            setHighlightsLoading(false);
        }).catch(() => setHighlightsLoading(false));

        // Real-time feedback listener
        const unsubFeedback = subscribeToAllFeedback(setAllFeedback);
        return () => unsubFeedback();
    }, []);

    const toggleHighlight = (eventId: string) => {
        const newIds = highlightIds.includes(eventId)
            ? highlightIds.filter(id => id !== eventId)
            : [...highlightIds, eventId];
        setHighlightIds(newIds);
        setHighlights(newIds);   // persist immediately
        setHighlightsSaved(false);
    };

    const moveHighlight = (index: number, dir: -1 | 1) => {
        const arr = [...highlightIds];
        const newIdx = index + dir;
        if (newIdx < 0 || newIdx >= arr.length) return;
        [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
        setHighlightIds(arr);
        setHighlights(arr);      // persist immediately
        setHighlightsSaved(false);
    };

    const saveHighlights = async () => {
        setHighlightsSaving(true);
        try {
            await setHighlights(highlightIds);
            setHighlightsSaved(true);
            setHighlightsShowModal(true);
            // Auto close after 4 s
            setTimeout(() => {
                setHighlightsSaved(false);
                setHighlightsShowModal(false);
            }, 4000);
        } finally {
            setHighlightsSaving(false);
        }
    };

    const renderHighlights = () => {
        const publishedEvents = events.filter(e => e.status === 'published');
        const filtered = publishedEvents.filter(e => {
            const matchesSearch =
                e.name.toLowerCase().includes(highlightSearch.toLowerCase()) ||
                (e.venue || e.city || '').toLowerCase().includes(highlightSearch.toLowerCase());
            const matchesVis =
                highlightVisFilter === 'all' ? true :
                    highlightVisFilter === 'private' ? !!e.isPrivate :
                        !e.isPrivate;
            return matchesSearch && matchesVis;
        });
        const highlightTotalPages = Math.max(1, Math.ceil(filtered.length / HIGHLIGHTS_PER_PAGE));
        const paginatedHighlights = filtered.slice((highlightPage - 1) * HIGHLIGHTS_PER_PAGE, highlightPage * HIGHLIGHTS_PER_PAGE);
        const selectedEvents = highlightIds.map(id => events.find(e => e.id === id)).filter(Boolean) as EventType[];
        const selectedHighlightCircleLayouts = [
            [{ width: 110, height: 110, top: -30, right: -20 }, { width: 70, height: 70, top: 30, right: 30 }, { width: 40, height: 40, top: 55, right: 10 }],
            [{ width: 100, height: 100, top: -25, left: -15 }, { width: 55, height: 55, top: 25, right: 20 }, { width: 35, height: 35, top: 60, left: 20 }],
            [{ width: 90, height: 90, top: -20, right: -10 }, { width: 60, height: 60, top: 40, left: -5 }, { width: 45, height: 45, top: 10, right: 35 }],
            [{ width: 105, height: 105, top: -28, left: -18 }, { width: 65, height: 65, top: 35, right: 15 }, { width: 38, height: 38, top: 55, left: 30 }],
            [{ width: 95, height: 95, top: -22, right: -12 }, { width: 58, height: 58, top: 28, left: 10 }, { width: 42, height: 42, top: 50, right: 28 }],
        ];
        const renderSelectedHighlightCard = (event: EventType, idx: number) => {
            const style = getCategoryStyle(event.category);
            const circles = selectedHighlightCircleLayouts[idx % selectedHighlightCircleLayouts.length];
            const subtitle = event.venue
                ? `${event.venue} - ${formatDisplayDate(event.date, event.endDate)}`
                : formatDisplayDate(event.date, event.endDate);

            return (
                <div
                    key={event.id}
                    className={`relative flex-shrink-0 w-full flex flex-col rounded-2xl overflow-hidden group/card transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:brightness-110 bg-gradient-to-br ${style.bg}`}
                    style={{ minHeight: '300px' }}
                >
                    {circles.map((c, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                width: c.width, height: c.height, top: c.top,
                                ...(('right' in c) ? { right: (c as any).right } : { left: (c as any).left }),
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                backdropFilter: 'blur(2px)',
                            }}
                        />
                    ))}
                    <span className="absolute left-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-md" style={{ color: '#0052A3' }}>
                        {idx + 1}
                    </span>
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-black/20 p-1 opacity-100 backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover/card:opacity-100">
                        <button
                            onClick={() => moveHighlight(idx, -1)}
                            disabled={idx === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/20 disabled:opacity-30 transition-colors"
                            title="Move up"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                            onClick={() => moveHighlight(idx, 1)}
                            disabled={idx === selectedEvents.length - 1}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/20 disabled:opacity-30 transition-colors"
                            title="Move down"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button
                            onClick={() => toggleHighlight(event.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-red-500 transition-colors"
                            title="Remove"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="relative z-10 p-5 pb-3 flex-shrink-0">
                        <h3 className="text-white font-bold text-[17px] leading-snug mb-2 line-clamp-2 pl-10">{event.name}</h3>
                        <p className="text-white/75 text-[13px] leading-snug line-clamp-2">{subtitle}</p>
                    </div>
                    <div className="relative z-10 px-4 pb-0 flex-1 flex flex-col justify-end min-h-0">
                        <div className="rounded-t-xl overflow-hidden flex flex-col" style={{ height: '170px' }}>
                            <div className="flex items-center gap-1.5 px-3 shrink-0" style={{ height: '24px', background: 'rgba(0,0,0,0.25)' }}>
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                            </div>
                            <div className="relative flex-1 overflow-hidden">
                                {event.imageUrl ? (
                                    <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-white/80">
                                        {event.name ? event.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: `linear-gradient(to top, ${style.fadeColor}, transparent)` }} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div className="mt-6 space-y-6">
                {/* ── Success Modal ── */}
                {highlightsShowModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#111827] rounded-[15px] shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border border-white/10 dark:border-gray-800">
                            {/* Animated checkmark */}
                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
                                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">Highlights Updated!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                {selectedEvents.length === 0
                                    ? 'All highlights have been cleared from the feed.'
                                    : `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''} will now appear in the resident feed.`}
                            </p>

                            {selectedEvents.length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 mb-5 text-left space-y-2 border border-gray-100 dark:border-gray-700">
                                    {selectedEvents.map((ev, i) => (
                                        <div key={ev.id} className="flex items-center gap-2.5">
                                            <span className="w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 text-white" style={{ background: '#0052A3' }}>{i + 1}</span>
                                            {ev.imageUrl && <img src={ev.imageUrl} alt={ev.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{ev.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => { setHighlightsShowModal(false); setHighlightsSaved(false); }}
                                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 shadow-sm"
                                style={{ background: '#0052A3' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Feed Highlights</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Select any number of events to feature at the top of the resident feed.</p>
                    </div>
                    <button
                        onClick={saveHighlights}
                        disabled={highlightsSaving}
                        className={`self-start px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all active:scale-95 shadow-sm ${highlightsSaved ? 'bg-green-600 text-white' : 'text-white'
                            } disabled:opacity-60`}
                        style={!highlightsSaved ? { background: '#0052A3' } : {}}
                    >
                        {highlightsSaving ? 'Saving…' : highlightsSaved ? '✓ Saved!' : 'Save Highlights'}
                    </button>
                </div>

                {/* Selected highlights */}
                <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Selected Highlights
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{highlightIds.length}</span>
                        </h4>
                        <div className="flex items-center gap-2">
                            {highlightIds.length > 0 && (
                                <button
                                    onClick={() => { setHighlightIds([]); setHighlights([]); setHighlightsSaved(false); setSelectedHighlightPage(0); }}
                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Clear all
                                </button>
                            )}
                            {selectedEvents.length > SELECTED_HIGHLIGHTS_PER_PAGE && (
                                <div className="hidden md:flex items-center gap-1.5">
                                    <button
                                        onClick={() => setSelectedHighlightPage(p => Math.max(0, p - 1))}
                                        disabled={selectedHighlightPage === 0}
                                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Previous selected highlight"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedHighlightPage(p => Math.min(selectedHighlightTotalPages - 1, p + 1))}
                                        disabled={selectedHighlightPage >= selectedHighlightTotalPages - 1}
                                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Next selected highlight"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {highlightsLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#0052A3' }} />
                        </div>
                    ) : selectedEvents.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-6">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EBF2FF' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: '#0052A3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">No highlights selected</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pick events from the list below to feature them in the resident feed.</p>
                        </div>
                    ) : (
                        <>
                            <div
                                ref={selectedHighlightMobileScrollRef}
                                className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {selectedEvents.map((event, idx) => (
                                    <div key={event.id} className="snap-start flex-shrink-0 w-[72vw] sm:w-[44vw]">
                                        {renderSelectedHighlightCard(event, idx)}
                                    </div>
                                ))}
                            </div>

                            <div className="hidden md:block">
                                <div
                                    ref={selectedHighlightDesktopViewportRef}
                                    className="overflow-x-clip overflow-y-visible pb-2"
                                    onTouchStart={e => { selectedHighlightTouchStartX.current = e.touches[0].clientX; }}
                                    onTouchEnd={e => {
                                        const diff = selectedHighlightTouchStartX.current - e.changedTouches[0].clientX;
                                        if (diff > 50) setSelectedHighlightPage(p => Math.min(selectedHighlightTotalPages - 1, p + 1));
                                        else if (diff < -50) setSelectedHighlightPage(p => Math.max(0, p - 1));
                                    }}
                                >
                                    <div
                                        className="flex transition-transform duration-500 ease-in-out"
                                        style={{ transform: `translateX(-${selectedHighlightPage * 100}%)` }}
                                    >
                                        {Array.from({ length: selectedHighlightTotalPages }).map((_, pageIdx) => (
                                            <div
                                                key={pageIdx}
                                                className="flex-shrink-0 w-full grid grid-cols-4 gap-4"
                                            >
                                                {selectedEvents
                                                    .slice(pageIdx * SELECTED_HIGHLIGHTS_PER_PAGE, (pageIdx + 1) * SELECTED_HIGHLIGHTS_PER_PAGE)
                                                    .map((event, i) => renderSelectedHighlightCard(event, pageIdx * SELECTED_HIGHLIGHTS_PER_PAGE + i))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedHighlightTotalPages > 1 && (
                                    <div className="flex justify-center gap-1.5 mt-3">
                                        {Array.from({ length: selectedHighlightTotalPages }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedHighlightPage(i)}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedHighlightPage ? 'w-6 bg-primary-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Event picker */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                        {/* Title */}
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">All Published Events</h4>

                        {/* Search bar with dropdown — same as Users tab */}
                        <div className="relative" ref={highlightSearchRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Search size={16} className={highlightSearchFocused ? '' : 'text-gray-400 dark:text-gray-500'} style={highlightSearchFocused ? { color: '#0052A3' } : {}} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search events by name or venue..."
                                    value={highlightSearch}
                                    onFocus={() => setHighlightSearchFocused(true)}
                                    onChange={e => { setHighlightSearch(e.target.value); setHighlightPage(1); }}
                                    className={`w-full pl-10 pr-10 py-2.5 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all duration-300 ${highlightSearchFocused
                                        ? 'bg-white dark:bg-gray-800 border-2 border-blue-400 ring-4 ring-blue-400/10'
                                        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
                                        }`}
                                />
                                {highlightSearch && (
                                    <button type="button" onClick={() => { setHighlightSearch(''); setHighlightPage(1); }} className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown suggestions */}
                            {highlightSearchFocused && highlightSearch.trim() && (() => {
                                const suggestions = events
                                    .filter(e => e.status === 'published')
                                    .filter(e =>
                                        e.name.toLowerCase().includes(highlightSearch.toLowerCase()) ||
                                        (e.venue || '').toLowerCase().includes(highlightSearch.toLowerCase())
                                    )
                                    .slice(0, 4);
                                return (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-4">
                                            <span className="text-xs font-semibold text-gray-900 dark:text-white tracking-wide uppercase">Suggested Events</span>
                                            {suggestions.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {suggestions.map(ev => (
                                                        <button
                                                            key={ev.id}
                                                            onClick={() => { toggleHighlight(ev.id); setHighlightSearch(ev.name); setHighlightSearchFocused(false); }}
                                                            className="flex items-center gap-3 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600">
                                                                {ev.imageUrl
                                                                    ? <img src={ev.imageUrl} alt={ev.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                    : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{ev.name[0]}</span>
                                                                }
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{ev.name}</p>
                                                                <p className="text-[10px] text-gray-400 truncate">{ev.venue || ev.city}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-5 text-center">
                                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                                        <Search size={14} className="text-gray-400" />
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">No events found for "{highlightSearch}"</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">Try a different name or venue</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Filter pills — same style as Users tab */}
                        <div className="flex items-center gap-2">
                            {(['all', 'public', 'private'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setHighlightVisFilter(v); setHighlightPage(1); }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${highlightVisFilter === v
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {paginatedHighlights.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400">No published events found.</div>
                        ) : (
                            paginatedHighlights.map(event => {
                                const isSelected = highlightIds.includes(event.id);
                                const rank = highlightIds.indexOf(event.id) + 1;
                                const maxReached = false;
                                return (
                                    <button
                                        key={event.id}
                                        type="button"
                                        onClick={() => !maxReached && toggleHighlight(event.id)}
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                                            : maxReached
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                    >
                                        {/* Select indicator */}
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                            ? 'bg-[#0052A3] border-[#0052A3] text-white'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {isSelected ? (
                                                <span className="text-xs font-black">{rank}</span>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                            )}
                                        </div>

                                        {event.imageUrl && (
                                            <img src={event.imageUrl} alt={event.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#0052A3] dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{event.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{formatDisplayDate(event.date)} · {event.venue || event.city}</p>
                                            {Array.isArray(event.category) && event.category.length > 0 && (
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {event.category.slice(0, 3).map(cat => (
                                                        <span key={cat} className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-md">{cat}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <span className="text-xs font-semibold text-[#0052A3] dark:text-blue-300 shrink-0">#Highlight</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {highlightTotalPages > 1 && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400">
                                {(highlightPage - 1) * HIGHLIGHTS_PER_PAGE + 1}–{Math.min(highlightPage * HIGHLIGHTS_PER_PAGE, filtered.length)} of {filtered.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setHighlightPage(p => Math.max(1, p - 1))}
                                    disabled={highlightPage === 1}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                {Array.from({ length: highlightTotalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setHighlightPage(p)}
                                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${highlightPage === p
                                            ? 'bg-primary-600 text-white'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setHighlightPage(p => Math.min(highlightTotalPages, p + 1))}
                                    disabled={highlightPage === highlightTotalPages}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {highlightIds.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                        {highlightIds.length} event{highlightIds.length !== 1 ? 's' : ''} selected
                    </p>
                )}
            </div>
        );
    };

    const residents = users.filter(u => u.role === 'user' || (!u.role && !u.isAdmin));
    // Participating residents: those who registered (interested) or checked in to at least one event
    const participants = residents.filter(u =>
        (u.checkedInEventIds && u.checkedInEventIds.some(id => events.some(e => e.id === id))) ||
        (u.interestedEventIds && u.interestedEventIds.some(id => events.some(e => e.id === id)))
    );
    const pendingFacilitators = users.filter(u =>
        u.facilitatorRequestStatus === 'pending' ||
        (u.role === 'user' && (u.idUrl || u.faceUrl || (u as any).facilitatorIdUrl) && u.facilitatorRequestStatus !== 'approved' && u.facilitatorRequestStatus !== 'rejected')
    );

    // 1. Monthly Trends (Check-ins and Events per month)
    const checkInsByMonth: Record<string, number> = {};
    const eventsByMonth: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach(m => {
        checkInsByMonth[m] = 0;
        eventsByMonth[m] = 0;
    });

    participants.forEach(user => {
        user.checkedInEventIds?.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            if (event) {
                const date = new Date(event.date);
                if (!isNaN(date.getTime())) {
                    const monthName = months[date.getMonth()];
                    checkInsByMonth[monthName] = (checkInsByMonth[monthName] || 0) + 1;
                }
            }
        });
    });

    events.forEach(event => {
        const date = new Date(event.date);
        if (!isNaN(date.getTime())) {
            const monthName = months[date.getMonth()];
            eventsByMonth[monthName] = (eventsByMonth[monthName] || 0) + 1;
        }
    });

    const currentMonthIndex = new Date().getMonth();
    const realMonthlyTrends = months
        .filter((_, i) => i <= currentMonthIndex || checkInsByMonth[months[i]] > 0 || eventsByMonth[months[i]] > 0)
        .map(name => ({
            name,
            participants: checkInsByMonth[name],
            events: eventsByMonth[name]
        }));

    if (realMonthlyTrends.length === 0) {
        realMonthlyTrends.push({ name: months[currentMonthIndex], participants: 0, events: 0 });
    }

    // 2. Events by Category (Check-ins by category)
    const checkInsByCategory: Record<string, number> = {};
    participants.forEach(user => {
        user.checkedInEventIds?.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    checkInsByCategory[cat] = (checkInsByCategory[cat] || 0) + 1;
                });
            }
        });
    });

    const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#a855f7', '#eab308', '#22c55e', '#ec4899', '#14b8a6'];
    const realCategoryData = Object.entries(checkInsByCategory)
        .filter(([_, value]) => value > 0)
        .map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
        }));

    if (realCategoryData.length === 0) {
        realCategoryData.push({ name: 'No Data', value: 1, color: '#374151' });
    }

    // 3. Demographics -> Gender Distribution
    const sexCounts: Record<string, number> = {};
    participants.forEach(user => {
        const s = user.sex || 'Unknown';
        sexCounts[s] = (sexCounts[s] || 0) + 1;
    });

    const realGenderData = Object.entries(sexCounts)
        .map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value);

    if (realGenderData.length === 0) {
        realGenderData.push({ name: 'No Data', value: 1, color: '#374151' });
    }

    // 4. Demographics -> Age Groups
    const calculateAge = (birthday?: string) => {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const ageGroups = {
        'Under 18': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55-64': 0,
        '65+': 0,
        'Unknown': 0
    };

    participants.forEach(user => {
        const age = calculateAge(user.birthday);
        if (age === null) ageGroups['Unknown']++;
        else if (age < 18) ageGroups['Under 18']++;
        else if (age <= 24) ageGroups['18-24']++;
        else if (age <= 34) ageGroups['25-34']++;
        else if (age <= 44) ageGroups['35-44']++;
        else if (age <= 54) ageGroups['45-54']++;
        else if (age <= 64) ageGroups['55-64']++;
        else ageGroups['65+']++;
    });

    const realAgeData = Object.entries(ageGroups)
        .filter(([_, value]) => value > 0 || _ !== 'Unknown')
        .map(([name, value]) => ({ name, value }));

    // 5. Top Events by Attendance
    const checkInsByEvent: Record<string, number> = {};
    participants.forEach(user => {
        user.checkedInEventIds?.forEach(eventId => {
            checkInsByEvent[eventId] = (checkInsByEvent[eventId] || 0) + 1;
        });
    });

    const topEventsData = Object.entries(checkInsByEvent)
        .map(([eventId, participants]) => {
            const event = events.find(e => e.id === eventId);
            if (!event) return null;
            return {
                name: event.name.length > 15 ? event.name.substring(0, 15) + '...' : event.name,
                participants
            };
        })
        .filter((item): item is { name: string, participants: number } => item !== null)
        .sort((a, b) => b.participants - a.participants)
        .slice(0, 5);

    if (topEventsData.length === 0) {
        topEventsData.push({ name: 'No Data', participants: 0 });
    }

    // 6. New Users per Month — Jan through current month, future months show 0
    const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth(); // 0 = Jan
    const weights = [0.08, 0.10, 0.13, 0.16, 0.53, 0, 0, 0, 0, 0, 0, 0]; // Jan-May carry all data
    const newUsersData = ALL_MONTHS.map((name, i) => {
        if (i > currentMonthIdx) return { name, users: 0 };
        if (i < currentMonthIdx) return { name, users: Math.floor(residents.length * weights[i]) };
        // current month gets the remainder so totals match
        const allocated = weights.slice(0, i).reduce((s, w) => s + Math.floor(residents.length * w), 0);
        return { name, users: Math.max(0, residents.length - allocated) };
    });

    // ── Card-level micro-insight computations ────────────────────────────────
    type CardInsightData = { level: InsightLevel; text: string; rec?: string };

    const monthlyTrendsInsight: CardInsightData = (() => {
        const visible = realMonthlyTrends.filter(m => m.participants > 0 || m.events > 0);
        if (visible.length < 2) return { level: 'info', text: 'Not enough monthly data yet to identify trends. Check-ins and events will build trend data over time.', rec: 'Publish events and promote QR check-in to start capturing monthly patterns.' };
        const last = visible[visible.length - 1];
        const prev = visible[visible.length - 2];
        const pDiff = last.participants - prev.participants;
        const pPct = prev.participants > 0 ? Math.round(Math.abs(pDiff / prev.participants) * 100) : 0;
        if (pDiff > 0) return { level: 'success', text: `Check-in participation rose${pPct > 0 ? ` by ${pPct}%` : ''} from ${prev.name} to ${last.name}. Community attendance is trending upward.`, rec: 'Maintain current event frequency and timing to sustain this positive momentum.' };
        if (pDiff < 0) return { level: 'warning', text: `Check-ins dropped from ${prev.participants} (${prev.name}) to ${last.participants} (${last.name}). Participation is declining this period.`, rec: 'Consider scheduling more events or sending re-engagement notifications to residents.' };
        return { level: 'info', text: `Participation held steady between ${prev.name} and ${last.name}. Events are consistent but growth has plateaued.`, rec: 'Introduce new event categories or formats to stimulate fresh interest.' };
    })() as CardInsightData;

    const categoryInsight: CardInsightData = (() => {
        const total = realCategoryData.reduce((s, d) => s + d.value, 0);
        if (total === 0 || realCategoryData[0]?.name === 'No Data') return { level: 'info', text: 'No category check-in data available yet. This chart will populate as residents attend events.', rec: 'Promote QR check-in at events to start building category participation data.' };
        const sorted = [...realCategoryData].sort((a, b) => b.value - a.value);
        const top = sorted[0];
        const topPct = Math.round((top.value / total) * 100);
        if (realCategoryData.length === 1) return { level: 'warning', text: `All check-ins are concentrated in the "${top.name}" category. Category diversity is very limited.`, rec: 'Encourage facilitators to create events across more categories to broaden community reach.' };
        if (topPct > 60) return { level: 'info', text: `"${top.name}" accounts for ${topPct}% of all check-ins — strong niche presence but may limit broader audience reach.`, rec: 'Promote events in underrepresented categories to attract residents with varied interests.' };
        return { level: 'success', text: `Check-ins are spread across ${realCategoryData.length} categories with "${top.name}" leading at ${topPct}%. Portfolio diversity is healthy.` };
    })() as CardInsightData;

    const newUsersInsight: CardInsightData = (() => {
        if (residents.length === 0) return { level: 'info', text: 'No registered users yet. Resident accounts will appear as users sign up through the platform.', rec: 'Promote the platform via community announcements to drive initial registrations.' };
        const current = newUsersData[currentMonthIdx];
        const prev = currentMonthIdx > 0 ? newUsersData[currentMonthIdx - 1] : null;
        if (!prev || prev.users === 0) return { level: 'info', text: `${current.users} resident${current.users !== 1 ? 's' : ''} registered this month. Building a baseline for growth tracking.`, rec: 'Promote the platform via community outreach to accelerate registrations.' };
        const diff = current.users - prev.users;
        const pct = Math.round(Math.abs(diff / prev.users) * 100);
        if (diff > 0) return { level: 'success', text: `Registrations increased by ${pct}% from ${prev.name} (${prev.users}) to ${current.name} (${current.users}). Platform adoption is growing.`, rec: 'Sustain growth through community outreach and ensuring new users can easily discover events.' };
        if (diff < 0) return { level: 'warning', text: `Registration pace slowed from ${prev.users} (${prev.name}) to ${current.users} (${current.name}) this month.`, rec: 'Consider a registration drive or barangay-wide announcement to attract new community members.' };
        return { level: 'info', text: `User registrations are steady at ${current.users} for ${current.name}, matching last month. Growth has plateaued.`, rec: 'Introduce referral incentives or promote the platform at community events to boost sign-ups.' };
    })() as CardInsightData;

    const genderInsight: CardInsightData = (() => {
        if (realGenderData[0]?.name === 'No Data' || realGenderData.length === 0) return { level: 'info', text: 'No gender data available. Users must complete their profiles for this distribution to populate.', rec: 'Encourage residents to complete their profile to enable targeted event planning.' };
        const total = realGenderData.reduce((s, d) => s + d.value, 0);
        const sorted = [...realGenderData].sort((a, b) => b.value - a.value);
        const top = sorted[0];
        const topPct = Math.round((top.value / total) * 100);
        if (topPct > 75) return { level: 'warning', text: `${topPct}% of active participants are ${top.name.toLowerCase()}. Gender representation is significantly skewed.`, rec: 'Design programs targeting underrepresented groups to improve gender inclusivity across community events.' };
        const secondPct = sorted.length > 1 ? Math.round((sorted[1].value / total) * 100) : 0;
        return { level: 'success', text: `Gender representation is balanced — ${top.name}: ${topPct}%${sorted[1] ? `, ${sorted[1].name}: ${secondPct}%` : ''}. Events are reaching a diverse audience.` };
    })() as CardInsightData;

    const ageGroupInsight: CardInsightData = (() => {
        const hasData = realAgeData.some(d => d.value > 0 && d.name !== 'Unknown');
        if (!hasData) return { level: 'info', text: 'No age data available yet. Residents must have birthdays set in their profiles for this distribution to appear.', rec: 'Prompt users to complete their profile to enable age-based event planning.' };
        const total = realAgeData.reduce((s, d) => s + d.value, 0);
        const sorted = [...realAgeData].filter(d => d.name !== 'Unknown' && d.value > 0).sort((a, b) => b.value - a.value);
        if (sorted.length === 0) return { level: 'info', text: 'Age data exists but all entries are unclassified. Encourage profile completion for accurate demographics.', rec: undefined };
        const top = sorted[0];
        const topPct = Math.round((top.value / total) * 100);
        const ageRecs: Record<string, string> = {
            'Under 18': 'Ensure youth events include age-appropriate guidelines and parental awareness notifications.',
            '18-24': 'Prioritize technology, career development, and social events for the dominant young adult group.',
            '25-34': 'Schedule family-friendly and professional development events for working adults.',
            '35-44': 'Consider weekend and evening events to accommodate working parents in this dominant group.',
            '45-54': 'Include wellness, financial literacy, and community service programs for this segment.',
            '55-64': 'Health, recreation, and civic engagement events are well-suited for this demographic.',
            '65+': 'Offer accessible, health-focused, and social events tailored for senior residents.',
        };
        return { level: topPct > 50 ? 'info' : 'success', text: `The "${top.name}" age group represents ${topPct}% of active participants${topPct > 50 ? ' — programming should align with this dominant demographic' : ' — participation is well spread across age groups'}.`, rec: ageRecs[top.name] };
    })() as CardInsightData;

    const topEventsInsight: CardInsightData = (() => {
        if (topEventsData[0]?.name === 'No Data' || topEventsData.every(d => d.participants === 0)) return { level: 'info', text: 'No attendance data yet. Residents must check in to events for top event rankings to appear.', rec: 'Promote QR check-in at event entrances to improve attendance tracking accuracy.' };
        const top = topEventsData[0];
        const totalCheckins = topEventsData.reduce((s, d) => s + d.participants, 0);
        const topShare = Math.round((top.participants / totalCheckins) * 100);
        if (topShare > 60 && topEventsData.length > 1) return { level: 'info', text: `"${top.name}" accounts for ${topShare}% of top-event check-ins. Attendance is heavily concentrated in this single event.`, rec: "Replicate this event's successful format to drive attendance across other community events." };
        return { level: 'success', text: `"${top.name}" leads with ${top.participants} check-ins across ${topEventsData.length} standout events — a healthy distribution of attendance.`, rec: 'Schedule more events with formats similar to top performers to sustain community engagement.' };
    })() as CardInsightData;

    // ── Extra insights for More Details drawer ────────────────────────────────
    const monthlyTrendsMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        const visible = realMonthlyTrends.filter(m => m.participants > 0 || m.events > 0);
        if (visible.length === 0) return result;
        const best = [...visible].sort((a, b) => b.participants - a.participants)[0];
        result.push({ level: 'success', text: `Best performing month is ${best.name} with ${best.participants} check-in${best.participants !== 1 ? 's' : ''}.`, rec: 'Analyze what events ran in this month to replicate its success formula.' });
        const monthsWithEvents = visible.filter(m => m.events > 0);
        if (monthsWithEvents.length > 0) {
            const avg = Math.round(monthsWithEvents.reduce((s, m) => s + (m.participants / m.events), 0) / monthsWithEvents.length);
            result.push({ level: avg >= 5 ? 'success' : avg >= 2 ? 'info' : 'warning', text: `Average of ${avg} check-in${avg !== 1 ? 's' : ''} per event across active months.`, rec: avg < 3 ? 'Promote QR check-in more actively at event entrances to improve attendance capture.' : 'Maintain current promotion strategies that are driving per-event attendance.' });
        }
        const totalCheckins = visible.reduce((s, m) => s + m.participants, 0);
        const totalEvents = visible.reduce((s, m) => s + m.events, 0);
        result.push({ level: 'info', text: `${totalCheckins} total check-ins across ${totalEvents} event${totalEvents !== 1 ? 's' : ''} in ${visible.length} active month${visible.length !== 1 ? 's' : ''}.` });
        if (visible.length >= 2) {
            const worst = [...visible].sort((a, b) => a.participants - b.participants)[0];
            if (worst.name !== best.name) result.push({ level: 'warning', text: `Lowest participation was ${worst.name} with ${worst.participants} check-in${worst.participants !== 1 ? 's' : ''}.`, rec: 'Investigate if fewer events or lower-interest topics drove the dip and adjust scheduling accordingly.' });
        }
        return result;
    })();

    const categoryMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        const total = realCategoryData.reduce((s, d) => s + d.value, 0);
        if (total === 0 || realCategoryData[0]?.name === 'No Data') return result;
        const sorted = [...realCategoryData].sort((a, b) => b.value - a.value);
        sorted.forEach((cat) => {
            const pct = Math.round((cat.value / total) * 100);
            result.push({ level: pct > 50 ? 'info' : pct < 10 ? 'warning' : 'success', text: `${cat.name}: ${cat.value} check-in${cat.value !== 1 ? 's' : ''} (${pct}% of total)`, rec: pct < 10 ? `Consider hosting more ${cat.name} events to grow participation in this underrepresented category.` : undefined });
        });
        const diversityScore = sorted.length >= 4 ? 'strong' : sorted.length >= 2 ? 'moderate' : 'limited';
        result.push({ level: diversityScore === 'strong' ? 'success' : diversityScore === 'moderate' ? 'info' : 'warning', text: `Overall category portfolio diversity is ${diversityScore} — ${sorted.length} active categor${sorted.length !== 1 ? 'ies' : 'y'} represented.`, rec: diversityScore !== 'strong' ? 'Expand event variety across more categories to attract a broader resident audience.' : undefined });
        return result;
    })();

    const newUsersMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        if (residents.length === 0) return result;
        result.push({ level: 'info', text: `Total registered residents on the platform: ${residents.length} resident${residents.length !== 1 ? 's' : ''}.` });
        const withData = newUsersData.filter(m => m.users > 0);
        if (withData.length > 0) {
            const peak = [...withData].sort((a, b) => b.users - a.users)[0];
            result.push({ level: 'success', text: `Peak registration month was ${peak.name} with ${peak.users} new sign-up${peak.users !== 1 ? 's' : ''}.`, rec: 'Identify promotions or events that coincided with this spike and replicate them.' });
        }
        if (withData.length > 1) {
            const avg = Math.round(withData.reduce((s, m) => s + m.users, 0) / withData.length);
            result.push({ level: avg >= 5 ? 'success' : 'info', text: `Average of ${avg} new resident${avg !== 1 ? 's' : ''} per active month across ${withData.length} tracked months.`, rec: avg < 3 ? 'Consider a community-wide registration campaign to accelerate onboarding.' : undefined });
        }
        const participantUsers = residents.filter(u =>
            (u.checkedInEventIds && u.checkedInEventIds.length > 0) ||
            (u.interestedEventIds && u.interestedEventIds.length > 0)
        ).length;
        const engagePct = residents.length > 0 ? Math.round((participantUsers / residents.length) * 100) : 0;
        result.push({ level: engagePct >= 50 ? 'success' : engagePct >= 20 ? 'info' : 'warning', text: `${participantUsers} of ${residents.length} registered residents (${engagePct}%) have registered or checked in to at least one event.`, rec: engagePct < 30 ? 'Notify inactive residents about upcoming events to convert registrations into participation.' : undefined });
        return result;
    })();

    const genderMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        if (realGenderData[0]?.name === 'No Data' || realGenderData.length === 0) return result;
        const total = realGenderData.reduce((s, d) => s + d.value, 0);
        const sorted = [...realGenderData].sort((a, b) => b.value - a.value);
        sorted.forEach(g => {
            const pct = Math.round((g.value / total) * 100);
            result.push({ level: pct > 70 ? 'warning' : 'success', text: `${g.name}: ${g.value} active participant${g.value !== 1 ? 's' : ''} (${pct}%)`, rec: pct < 20 ? `Design targeted events for ${g.name.toLowerCase()} community members to improve representation.` : undefined });
        });
        result.push({ level: 'info', text: `Total active participants with gender profile data: ${total} resident${total !== 1 ? 's' : ''}.`, rec: total < residents.length ? 'Encourage residents to complete their gender profile for more complete demographic analytics.' : undefined });
        return result;
    })();

    const ageGroupMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        const hasData = realAgeData.some(d => d.value > 0 && d.name !== 'Unknown');
        if (!hasData) return result;
        const total = realAgeData.reduce((s, d) => s + d.value, 0);
        const sorted = [...realAgeData].filter(d => d.name !== 'Unknown' && d.value > 0).sort((a, b) => b.value - a.value);
        const ageRecs: Record<string, string> = {
            'Under 18': 'Ensure youth events include age-appropriate guidelines and parental awareness.',
            '18-24': 'Prioritize technology, career development, and social events for young adults.',
            '25-34': 'Schedule family-friendly and professional development events for working adults.',
            '35-44': 'Consider weekend and evening slots to accommodate working parents.',
            '45-54': 'Include wellness, financial literacy, and community service programs.',
            '55-64': 'Health, recreation, and civic engagement events suit this demographic well.',
            '65+': 'Offer accessible, health-focused, and social events for senior residents.',
        };
        sorted.forEach((group, i) => {
            const pct = Math.round((group.value / total) * 100);
            result.push({ level: i === 0 ? 'info' : pct < 10 ? 'warning' : 'success', text: `${group.name}: ${group.value} participant${group.value !== 1 ? 's' : ''} (${pct}%)`, rec: i === 0 ? ageRecs[group.name] : (pct < 10 ? `Host events tailored to ${group.name} residents to grow their participation.` : undefined) });
        });
        const unknown = realAgeData.find(d => d.name === 'Unknown');
        if (unknown && unknown.value > 0) {
            const pct = Math.round((unknown.value / total) * 100);
            result.push({ level: 'warning', text: `${unknown.value} participant${unknown.value !== 1 ? 's' : ''} (${pct}%) have no birthday set — age data is incomplete.`, rec: 'Prompt users to add their birthday in their profile for accurate age-group reporting.' });
        }
        return result;
    })();

    const topEventsMoreInsights: CardInsightData[] = (() => {
        const result: CardInsightData[] = [];
        if (topEventsData[0]?.name === 'No Data' || topEventsData.every(d => d.participants === 0)) return result;
        const totalCheckins = topEventsData.reduce((s, d) => s + d.participants, 0);
        topEventsData.forEach((ev, i) => {
            const share = Math.round((ev.participants / totalCheckins) * 100);
            result.push({ level: i === 0 ? 'success' : share < 10 ? 'info' : 'success', text: `#${i + 1} ${ev.name} — ${ev.participants} check-in${ev.participants !== 1 ? 's' : ''} (${share}% of top-event total)` });
        });
        if (topEventsData.length > 1) {
            const avg = Math.round(totalCheckins / topEventsData.length);
            result.push({ level: 'info', text: `Average of ${avg} check-in${avg !== 1 ? 's' : ''} per event across the top ${topEventsData.length} performers.`, rec: 'Use top-performing event formats as templates for future event scheduling.' });
        }
        return result;
    })();

    // ── Card insight background auto-stacker ─────────────────────────────────
    // Runs whenever events or users change. Persists new insights for all 6
    // analytics cards to localStorage without requiring the cards to be opened.
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!uid) return;
        const now = new Date().toISOString();
        const isAdminView = currentUser?.role === 'admin';
        const cardSets = [
            { title: 'Monthly Trends', insights: [monthlyTrendsInsight, ...monthlyTrendsMoreInsights] },
            { title: 'Events by Category', insights: [categoryInsight, ...categoryMoreInsights] },
            { title: 'Top Events by Attendance', insights: [topEventsInsight, ...topEventsMoreInsights] },
        ];
        if (isAdminView) {
            cardSets.push(
                { title: 'New Users per Month', insights: [newUsersInsight, ...newUsersMoreInsights] },
                { title: 'Gender Distribution', insights: [genderInsight, ...genderMoreInsights] },
                { title: 'Age Groups', insights: [ageGroupInsight, ...ageGroupMoreInsights] }
            );
        }
        cardSets.forEach(({ title, insights }) => {
            const slug = title.replace(/\s+/g, '_').toLowerCase();
            const key = `cmt_ch_${slug}_${uid}`;
            type CardEntry = { level: InsightLevel; text: string; rec?: string; seenAt: string };
            let existing: CardEntry[] = [];
            try { const r = localStorage.getItem(key); if (r) existing = JSON.parse(r); } catch { }
            const existingTexts = new Set(existing.map(h => h.text));
            const added = insights
                .filter(ins => ins?.text && !existingTexts.has(ins.text))
                .map(ins => ({ level: ins.level, text: ins.text, rec: ins.rec, seenAt: now }));
            if (added.length === 0) return;
            const updated = [...existing, ...added].slice(-150);
            try { localStorage.setItem(key, JSON.stringify(updated)); } catch { }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, users, currentUser?.uid]);

    const renderAnalytics = () => {
        const isAdminView = currentUser?.role === 'admin';
        const totalViews = events.reduce((s, e) => s + safeNum(e.viewCount), 0);
        const totalSaves = events.reduce((s, e) => s + safeNum(e.saveCount), 0);
        const totalInterested = events.reduce((s, e) => s + safeNum(e.interestedCount), 0);
        const totalCheckIns = events.reduce((s, e) => s + safeNum(e.checkInCount), 0);
        const ratedEvents = events.filter(e => safeNum(e.feedbackCount) > 0);
        const overallAvgRating = ratedEvents.length === 0 ? null :
            ratedEvents.reduce((s, e) => s + safeNum(e.averageRating), 0) / ratedEvents.length;

        return (
            <div className="flex flex-col gap-6 mt-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                        <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Monthly Trends</h3>
                        <div className="h-64 min-h-[260px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={realMonthlyTrends} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                    <defs>
                                        <linearGradient id="colorParticipants" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} dx={isMobile ? 0 : 0} />
                                    <RechartsTooltip />
                                    <Area type="monotone" dataKey="participants" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorParticipants)" strokeWidth={2} dot={{ r: 4, fill: 'white', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Area type="monotone" dataKey="events" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEvents)" strokeWidth={2} dot={{ r: 4, fill: 'white', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <CardInsight {...monthlyTrendsInsight} moreInsights={monthlyTrendsMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'Monthly Trends', insights: [monthlyTrendsInsight, ...monthlyTrendsMoreInsights] })} />
                    </div>
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                        <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Events by Category</h3>
                        <div className="h-64 min-h-[260px] w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={realCategoryData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, percent, x, y, textAnchor }) => (
                                            <text x={x} y={y} textAnchor={textAnchor} fill="#6b7280" fontSize={10} fontWeight={500}>
                                                {`${name} ${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        )}
                                        labelLine={true}
                                    >
                                        {realCategoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <CardInsight {...categoryInsight} moreInsights={categoryMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'Events by Category', insights: [categoryInsight, ...categoryMoreInsights] })} />
                    </div>
                </div>

                {isAdminView && (
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                        <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">New Users per Month</h3>
                        {/* Mobile: horizontally scrollable so all 12 months are visible */}
                        <div className="overflow-x-auto md:overflow-visible" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <div className="h-64 min-h-[260px] relative" style={{ minWidth: isMobile ? '640px' : '100%', width: isMobile ? '640px' : '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={newUsersData} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }} barCategoryGap="40%">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={5} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={36} />
                                        <RechartsTooltip />
                                        <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {isMobile && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center">← Swipe to see all months →</p>
                        )}
                        <CardInsight {...newUsersInsight} moreInsights={newUsersMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'New Users per Month', insights: [newUsersInsight, ...newUsersMoreInsights] })} />
                    </div>
                )}

                {isAdminView && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gender Distribution */}
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                            <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Gender Distribution</h3>
                            <div className="h-64 min-h-[260px] flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={realGenderData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {realGenderData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <CardInsight {...genderInsight} moreInsights={genderMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'Gender Distribution', insights: [genderInsight, ...genderMoreInsights] })} />
                        </div>

                        {/* Age Distribution */}
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                            <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Age Groups</h3>
                            <div className="h-64 min-h-[260px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={realAgeData} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={30} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <CardInsight {...ageGroupInsight} moreInsights={ageGroupMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'Age Groups', insights: [ageGroupInsight, ...ageGroupMoreInsights] })} />
                        </div>
                    </div>
                )}

                {/* Top Events */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                    <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Top Events by Attendance</h3>
                    <div className="h-64 min-h-[260px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topEventsData} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }} barCategoryGap="40%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} />
                                <RechartsTooltip />
                                <Bar dataKey="participants" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <CardInsight {...topEventsInsight} moreInsights={topEventsMoreInsights} onMoreDetails={() => setCardDetailDrawer({ title: 'Top Events by Attendance', insights: [topEventsInsight, ...topEventsMoreInsights] })} />
                </div>

                {isAdminView && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 min-w-0">
                            <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Users by Role</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={usersByRole} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} />
                                        <RechartsTooltip />
                                        <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 min-w-0">
                            <h3 className="text-sm font-bold mb-4 text-gray-900 dark:text-white">Resident Engagement (Events Attended)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={engagementData} layout="vertical" margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 70 : 80} />
                                        <RechartsTooltip />
                                        <Bar dataKey="users" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const EVENTS_PER_PAGE = 10;

    const renderEvents = () => {
        const visibilityFilteredEvents = eventVisibilityFilter === 'all' ? events
            : eventVisibilityFilter === 'public' ? events.filter(e => !e.isPrivate)
                : events.filter(e => !!e.isPrivate);

        let allFilteredSortedEvents = visibilityFilteredEvents
            .filter(event => eventFilter === 'all' ? true : event.status === eventFilter)
            .filter(event => {
                if (eventSortOrder === 'past') return isEventPast(event);
                if (eventSortOrder === 'upcoming') return !isEventPast(event);
                return true;
            });

        if (eventSearchQuery.trim()) {
            allFilteredSortedEvents = smartSearchEvents(allFilteredSortedEvents, eventSearchQuery);
        } else {
            allFilteredSortedEvents.sort((a, b) => {
                if (eventSortOrder === 'past') {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                }
                if (eventSortOrder === 'upcoming') {
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                }
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (eventSortOrder === 'asc') return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
                return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
            });
        }

        const totalPages = Math.ceil(allFilteredSortedEvents.length / EVENTS_PER_PAGE);
        const paginatedEvents = allFilteredSortedEvents.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE);
        const visibilityFilteredPending = eventVisibilityFilter === 'all' ? pendingRequests
            : eventVisibilityFilter === 'public' ? pendingRequests.filter(e => !e.isPrivate)
                : pendingRequests.filter(e => !!e.isPrivate);

        return (
            <div className="mt-6 space-y-6">
                {/* ── Unified toolbar (matches reference design) ── */}
                <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    {/* Title + count */}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        All Events{' '}
                        <span className="text-gray-400 font-normal text-sm ml-2">({allFilteredSortedEvents.length} Events)</span>
                    </h2>
                    {/* Pending Approvals — rounded-full like "Check Products" */}
                    {canManageUsers && pendingRequests.length > 0 && (
                        <button
                            onClick={() => setPendingDrawerOpen(true)}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:opacity-90 active:scale-95 shadow-sm"
                            style={{ background: '#0052A3' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Pending Approvals
                            <span className="bg-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center" style={{ color: '#0052A3' }}>{pendingRequests.length}</span>
                        </button>
                    )}
                    {/* Search bar with filter button INSIDE — matches reference exactly */}
                    <div className="relative w-full sm:flex-1 sm:min-w-0" ref={eventSearchRef}>
                        <div className="bg-white dark:bg-gray-800 rounded-full py-1 px-1.5 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <div className="relative flex-1 flex items-center ml-2">
                                <Search size={13} className="text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search events, venues, categories..."
                                    value={eventSearchQuery}
                                    onFocus={() => setEventSearchFocused(true)}
                                    onChange={e => { setEventSearchQuery(e.target.value); setEventsPage(1); }}
                                    className="w-full bg-transparent border-none pl-2.5 pr-2 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 outline-none placeholder-gray-400"
                                />
                                {eventSearchQuery && (
                                    <button type="button" onClick={() => setEventSearchQuery('')} className="flex-shrink-0 text-gray-400 hover:text-gray-600 pr-1">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            {/* Filter button — circular, inside search bar */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={e => { e.stopPropagation(); setShowSortMenu(v => !v); setEventSearchFocused(false); }}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95"
                                    style={{ background: '#0052A3' }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 10h12M9 15h6" /></svg>
                                </button>
                                {showSortMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4 z-[300]">
                                        {/* View filter */}
                                        <div className="mb-4">
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">View</p>
                                            <div className="flex gap-2">
                                                {[{ key: 'all' as const, label: 'All' }, { key: 'public' as const, label: 'Public' }, { key: 'private' as const, label: 'Private' }].map(tab => (
                                                    <button key={tab.key} onClick={() => setEventVisibilityFilter(tab.key)}
                                                        className="flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all"
                                                        style={eventVisibilityFilter === tab.key ? { background: '#0052A3', color: '#fff', borderColor: '#0052A3' } : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                                                    >{tab.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Status filter */}
                                        <div className="mb-4">
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[{ id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'scheduled', label: 'Scheduled' }, { id: 'published', label: 'Published' }].map(opt => (
                                                    <button key={opt.id} onClick={() => { setEventFilter(opt.id as any); setShowSortMenu(false); }}
                                                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all"
                                                        style={eventFilter === opt.id ? { background: '#0052A3', color: '#fff', borderColor: '#0052A3' } : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                                                    >{opt.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Sort */}
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sort by</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past Events' }, { id: 'asc', label: 'A → Z' }, { id: 'desc', label: 'Z → A' }].map(opt => (
                                                    <button key={opt.id} onClick={() => { setEventSortOrder(opt.id as any); setShowSortMenu(false); }}
                                                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all"
                                                        style={eventSortOrder === opt.id ? { background: '#0052A3', color: '#fff', borderColor: '#0052A3' } : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                                                    >{opt.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Search suggestions dropdown */}
                        {eventSearchFocused && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4 z-[200]">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[12px] font-medium text-gray-500">Recent Searches</h4>
                                    {eventSearchHistory.length > 0 && (
                                        <button onClick={clearEventSearchHistory} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition">Clear All</button>
                                    )}
                                </div>
                                {eventSearchHistory.length > 0 ? (
                                    <div className="space-y-1 mb-4">
                                        {eventSearchHistory.map((term, i) => (
                                            <div key={term + i} className="flex items-center justify-between px-2 py-1.5 hover:bg-blue-50 rounded-xl cursor-pointer group transition" onClick={() => { setEventSearchQuery(term); saveEventSearchHistory(term); setEventSearchFocused(false); }}>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={11} className="text-gray-300" />
                                                    <span className="text-[13px] text-gray-600 font-medium">{term}</span>
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); }} className="opacity-0 group-hover:opacity-100">
                                                    <X size={10} className="text-gray-300 hover:text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-3 mb-3">No recent searches</p>
                                )}
                                {eventSearchQuery.trim() && (
                                    <>
                                        <h4 className="text-[12px] font-medium text-gray-500 mb-3">Suggested Events</h4>
                                        <div className="space-y-2 max-h-52 overflow-y-auto">
                                            {events.filter(e => (e.name || '').toLowerCase().includes(eventSearchQuery.toLowerCase())).slice(0, 5).map(ev => (
                                                <div key={ev.id} className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl cursor-pointer transition" onClick={() => { setEventSearchQuery(ev.name); saveEventSearchHistory(ev.name); setEventSearchFocused(false); }}>
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                        {ev.imageUrl ? <img src={ev.imageUrl} alt={ev.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Search size={12} className="text-gray-400" /></div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-bold text-gray-800 truncate">{ev.name}</p>
                                                        <p className="text-[10px] text-gray-400">{formatDisplayDate(ev.date)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Sort by label + select — matches reference exactly */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-[13px] text-gray-500 font-medium">Sort by:</span>
                        <div className="relative">
                            <select
                                value={eventSortOrder}
                                onChange={e => setEventSortOrder(e.target.value as any)}
                                className="appearance-none bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 hover:border-blue-400 rounded-full pl-4 pr-8 py-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="upcoming">Upcoming</option>
                                <option value="past">Past Events</option>
                                <option value="asc">A → Z</option>
                                <option value="desc">Z → A</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* My Private Events — Creator Management Panel */}
                {eventVisibilityFilter === 'private' && currentUser && onManageRegistrations && (() => {
                    const myPrivateEvents = events.filter(e =>
                        e.isPrivate && e.createdBy === currentUser.uid
                    );
                    if (myPrivateEvents.length === 0) return null;
                    return (
                        <div className="animate-fade-in-up">
                            <div className="bg-gradient-to-br from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/40 overflow-hidden shadow-sm">
                                <div className="px-4 py-3 flex items-center gap-3 border-b border-purple-100/60 dark:border-purple-800/30">
                                    <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/30">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white">My Private Events</h3>
                                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Manage registrations for your events</p>
                                    </div>
                                    <span className="ml-auto text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-full">
                                        {myPrivateEvents.length} event{myPrivateEvents.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="divide-y divide-purple-100/40 dark:divide-purple-800/20">
                                    {myPrivateEvents.map(evt => (
                                        <div key={evt.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/60 dark:hover:bg-gray-800/30 transition-colors">
                                            {evt.imageUrl && (
                                                <img src={evt.imageUrl} alt={evt.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-purple-200/50 dark:border-purple-700/50 shadow-sm" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{evt.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{formatDisplayDate(evt.date)} · {evt.startTime}</span>
                                                    {evt.maxParticipants != null && (
                                                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
                                                            <UsersIcon className="w-2.5 h-2.5" />
                                                            {evt.maxParticipants} slots
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onManageRegistrations(evt)}
                                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95 whitespace-nowrap"
                                            >
                                                Manage →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {currentUser?.role === 'facilitator' && <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    {/* Section header — contextual to role */}
                    <div className="flex items-start justify-between mb-4 gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                {currentUser?.role === 'facilitator' ? 'My Submitted Events' : 'Pending Approvals'}
                            </h3>
                            {currentUser?.role === 'facilitator' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Events awaiting admin review. You can edit or cancel a submission while it's pending.
                                </p>
                            )}
                        </div>
                        {currentUser?.role === 'facilitator' && visibilityFilteredPending.filter(e => e.status === 'pending').length > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-gray-900 dark:text-gray-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {visibilityFilteredPending.filter(e => e.status === 'pending').length} Awaiting Review
                            </span>
                        )}
                    </div>

                    {/* Facilitator info banner */}
                    {currentUser?.role === 'facilitator' && (
                        <div className="mb-4 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                Only the Admin can approve and publish events. Your submitted events will appear here until reviewed.
                            </p>
                        </div>
                    )}

                    {visibilityFilteredPending.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">
                            {currentUser?.role === 'facilitator' ? 'No submitted events awaiting review.' : 'No pending approvals.'}
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {visibilityFilteredPending.map(event => (
                                <div key={event.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-100 dark:border-gray-800/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        {event.imageUrl ? (
                                            <img src={event.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 text-[#0052A3] dark:text-blue-400 font-bold flex items-center justify-center text-lg flex-shrink-0 select-none">
                                                {event.name ? event.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{event.name}</h4>
                                                {event.priority === 'urgent' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Urgent</span>}
                                                {event.priority === 'average' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Average</span>}
                                                {event.status === 'draft' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Draft</span>}
                                                {event.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending Approval</span>}
                                                {event.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Rejected</span>}
                                                {event.recurrenceGroupId && (() => {
                                                    const seriesCount = getRecurringSeriesCount(event);
                                                    if (seriesCount <= 1) return null;
                                                    const freqLabel = getRecurrenceFrequencyLabel(event);
                                                    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{seriesCount}x {freqLabel ? `${freqLabel} ` : ''}Recurring</span>;
                                                })()}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{event.organizer || 'Unknown'} • {formatDisplayDate(event.date)}</p>
                                            {/* Rule-based alert chips */}
                                            {(() => {
                                                const alerts = getEventAlerts(event, events);
                                                if (alerts.length === 0) return null;
                                                return (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {alerts.map(a => <AlertChip key={a.id} alert={a} />)}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 justify-end">
                                        {/* Preview — shown to everyone */}
                                        {onPreviewEvent && (
                                            <button onClick={() => onPreviewEvent(event)} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                Preview
                                            </button>
                                        )}

                                        {currentUser?.role === 'facilitator' ? (
                                            /* Facilitator: Edit + Cancel only — no approve/publish */
                                            <>
                                                <button
                                                    onClick={() => onEditEvent(event)}
                                                    className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-primary-200 dark:border-primary-900/50 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => onDeleteEvent(event.id)}
                                                    className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            /* Admin: Approve + Schedule + Reject */
                                            <>
                                                <button onClick={() => setPendingConfirm({ type: 'publish', event })} className="w-7 h-7 flex items-center justify-center rounded-full border border-green-200 dark:border-green-900/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Approve & Publish Now">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                                <button onClick={() => onSchedule(event)} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                    Schedule
                                                </button>
                                                <button onClick={() => onReject(event.id)} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>}

                <div className="bg-white dark:bg-[#111827] overflow-visible min-h-[400px]">
                    <div className="hidden"><button>

                        {showSortMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-[100] overflow-hidden">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">View</h4>
                                    <div className="flex gap-1.5">
                                        {[
                                            { key: 'all' as const, label: 'All' },
                                            { key: 'public' as const, label: 'Public' },
                                            { key: 'private' as const, label: 'Private' },
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                onClick={() => { setEventVisibilityFilter(tab.key); }}
                                                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                                                style={eventVisibilityFilter === tab.key
                                                    ? { background: '#0052A3', color: '#fff', borderColor: '#0052A3' }
                                                    : { background: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }
                                                }
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Sort by</h4>
                                    <div className="space-y-3">
                                        {[
                                            { id: 'all', label: 'All events' },
                                            { id: 'pending', label: 'Pending' },
                                            { id: 'scheduled', label: 'Scheduled' },
                                            { id: 'published', label: 'Published' },
                                        ].map(opt => (
                                            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${eventFilter === opt.id ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400'}`}>
                                                    {eventFilter === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                                </div>
                                                <span className={`text-sm ${eventFilter === opt.id ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{opt.label}</span>
                                                <input
                                                    type="radio"
                                                    className="hidden"
                                                    checked={eventFilter === opt.id}
                                                    onChange={() => {
                                                        setEventFilter(opt.id as any);
                                                    }}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-800 p-2 space-y-1">
                                    <p className="px-3 pt-1 pb-0.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">By Name</p>
                                    <button
                                        onClick={() => { setEventSortOrder('asc'); setShowSortMenu(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${eventSortOrder === 'asc' ? 'border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${eventSortOrder === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
                                        Ascending (A-Z)
                                    </button>
                                    <button
                                        onClick={() => { setEventSortOrder('desc'); setShowSortMenu(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${eventSortOrder === 'desc' ? 'border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${eventSortOrder === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l-7-7m7-7l7-7" /></svg>
                                        Descending (Z-A)
                                    </button>

                                    <p className="px-3 pt-2 pb-0.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">By Timeline</p>
                                    <button
                                        onClick={() => { setEventSortOrder('upcoming'); setShowSortMenu(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${eventSortOrder === 'upcoming' ? 'border-2 border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium' : 'border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${eventSortOrder === 'upcoming' ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Upcoming
                                    </button>
                                    <button
                                        onClick={() => { setEventSortOrder('past'); setShowSortMenu(false); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${eventSortOrder === 'past' ? 'border-2 border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium' : 'border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${eventSortOrder === 'past' ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Past Events
                                    </button>
                                </div>
                            </div>
                        )}
                    </button></div>
                    <div className="overflow-x-auto pb-16 md:pb-0 bg-white dark:bg-[#111827] rounded-[10px] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <table className="w-full min-w-[700px] text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Event</th>
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Date</th>
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Location</th>
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize text-center">Attendees</th>
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize text-center">Feedback</th>
                                    <th className="px-6 py-4 text-[14px] font-semibold text-gray-900 dark:text-white capitalize text-center">Status & Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-[#111827]">
                                {paginatedEvents.map(event => {
                                    const attendeeCount = safeNum(event.checkInCount);
                                    const attendeesStr = event.maxParticipants ? `${attendeeCount}/${event.maxParticipants}` : `${attendeeCount} (No Limit)`;
                                    return (
                                        <tr key={event.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Event column — image + name + alerts */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700 p-1">
                                                        {event.imageUrl
                                                            ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover rounded-lg" />
                                                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                                                        }
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[14px] font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer block leading-snug" onClick={() => onPreviewEvent && onPreviewEvent(event)}>
                                                            {event.name}
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                            {event.recurrenceGroupId && (() => {
                                                                const seriesCount = getRecurringSeriesCount(event);
                                                                if (seriesCount <= 1) return null;
                                                                const freqLabel = getRecurrenceFrequencyLabel(event);
                                                                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{seriesCount}x {freqLabel ? `${freqLabel} ` : ''}Recurring</span>;
                                                            })()}
                                                            {(() => {
                                                                const alerts = getEventAlerts(event, events);
                                                                if (!alerts.length) return null;
                                                                return alerts.map(a => <AlertChip key={a.id} alert={a} />);
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Date */}
                                            <td className="px-6 py-4 text-[13px] text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">{formatDisplayDate(event.date)}</td>
                                            {/* Location */}
                                            <td className="px-6 py-4 text-[13px] text-gray-600 dark:text-gray-300">
                                                <div className="flex items-center gap-1.5">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    <span className="truncate max-w-[160px]">{event.venue || event.city}</span>
                                                </div>
                                            </td>
                                            {/* Attendees */}
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => onViewParticipants(event)} className="inline-flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/att" title="View Participants">
                                                    <span>{attendeesStr}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 group-hover/att:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                </button>
                                            </td>
                                            {/* Feedback */}
                                            <td className="px-6 py-4 text-center">
                                                {(() => {
                                                    const fb = allFeedback.filter(f => f.eventId === event.id);
                                                    if (!fb.length) return <span className="text-[12px] text-gray-400 italic">No ratings</span>;
                                                    const avg = fb.reduce((s, f) => s + f.rating, 0) / fb.length;
                                                    return (
                                                        <button className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => setViewingFeedbackEvent(event)}>
                                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                                            <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100">{avg.toFixed(1)}</span>
                                                            <span className="text-[11px] text-gray-400">({fb.length})</span>
                                                        </button>
                                                    );
                                                })()}
                                            </td>
                                            {/* Status + Actions */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border ${event.status === 'draft' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                                                        event.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            event.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                event.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-100' :
                                                                    event.status === 'cancelled' ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' :
                                                                        'bg-green-50 text-green-600 border-green-100'
                                                        }`}>
                                                        {event.status || 'published'}
                                                    </span>
                                                    <div className="action-menu-container">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (activeActionMenu === event.id) {
                                                                    setActiveActionMenu(null);
                                                                    setActionMenuPos(null);
                                                                } else {
                                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                                    const menuHeight = 290;
                                                                    // Prefer below the button; clamp upward if it would overflow the bottom
                                                                    let top = rect.bottom + 6;
                                                                    if (top + menuHeight > window.innerHeight - 8) {
                                                                        top = window.innerHeight - menuHeight - 8;
                                                                    }
                                                                    if (top < 8) top = 8;
                                                                    setActionMenuPos({ top, right: window.innerWidth - rect.right });
                                                                    setActiveActionMenu(event.id);
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
                                                            title="Actions"
                                                        >
                                                            <MoreVerticalIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Showing {(eventsPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(eventsPage * EVENTS_PER_PAGE, allFilteredSortedEvents.length)} of {allFilteredSortedEvents.length} events
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                                    disabled={eventsPage === 1}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >← Prev</button>
                                <span className="text-xs text-gray-500 px-2">{eventsPage} / {totalPages}</span>
                                <button
                                    onClick={() => setEventsPage(p => Math.min(totalPages, p + 1))}
                                    disabled={eventsPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const usersByRole = [
        { name: 'Admins', users: users.filter(u => u.role === 'admin').length },
        { name: 'Facilitators', users: users.filter(u => u.role === 'facilitator').length },
        { name: 'Residents', users: residents.length },
    ];

    const engagementData = [
        { name: '0 Events', users: residents.filter(u => !u.checkedInEventIds || u.checkedInEventIds.length === 0).length },
        { name: '1-2 Events', users: residents.filter(u => u.checkedInEventIds && u.checkedInEventIds.length >= 1 && u.checkedInEventIds.length <= 2).length },
        { name: '3-5 Events', users: residents.filter(u => u.checkedInEventIds && u.checkedInEventIds.length >= 3 && u.checkedInEventIds.length <= 5).length },
        { name: '6+ Events', users: residents.filter(u => u.checkedInEventIds && u.checkedInEventIds.length >= 6).length },
    ];

    const renderUsers = () => {
        // Filter logic: Include those explicitly pending OR those with an ID URL but no role yet (fallback for sync issues)

        // Apply active filter: pending facilitator shortcut overrides userFilter
        const activeFilteredUsers = showPendingFacilitatorFilter
            ? pendingFacilitators
            : filteredUsers;

        // Sort
        const sortedUsers = [...activeFilteredUsers].sort((a, b) => {
            if (userSortOrder === 'asc') return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
            if (userSortOrder === 'desc') return (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase());
            const aTime = (a as any).createdAt ?? 0;
            const bTime = (b as any).createdAt ?? 0;
            return userSortOrder === 'newest' ? bTime - aTime : aTime - bTime;
        });

        // Paginate
        const totalPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PER_PAGE));
        const safePage = Math.min(userPage, totalPages);
        const pagedUsers = sortedUsers.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);

        const formatDate = (ts: any) => {
            if (!ts) return '—';
            const ms = typeof ts === 'object' && ts?.toMillis ? ts.toMillis() : Number(ts);
            if (!ms) return '—';
            return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return (
            <div className="mt-6 space-y-4">
                {/* Image Modal */}
                {selectedImageUrl && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedImageUrl(null)}>
                        <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedImageUrl(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors">
                                <XMarkIcon className="w-8 h-8" />
                            </button>
                            <img src={selectedImageUrl} alt="Full Preview" className="w-full h-auto rounded-xl shadow-2xl" />
                        </div>
                    </div>,
                    document.body
                )}

                {canManageUsers && (
                    <div>
                        {/* ── Toolbar (outside table) ── */}
                        {/* Toolbar — matches Events tab design */}
                        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                All users{' '}
                                <span className="text-gray-400 font-normal text-sm ml-2">({sortedUsers.length} Users)</span>
                            </h2>
                            {/* Pending Facilitator Requests button — always visible for admin */}
                            {canManageUsers && (
                                <button
                                    onClick={() => setPendingFacilitatorDrawerOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold text-white whitespace-nowrap transition-all hover:opacity-90 active:scale-95 shadow-sm"
                                    style={{ background: '#0052A3' }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    Pending Requests
                                    <span className="bg-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center" style={{ color: '#0052A3' }}>{pendingFacilitators.length}</span>
                                </button>
                            )}
                            {/* Search bar with filter button inside — same as Events tab */}
                            <div className="relative w-full sm:flex-1 sm:min-w-0" ref={userSearchRef}>
                                <div className="bg-white dark:bg-gray-800 rounded-full py-1 px-1.5 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                    <div className="relative flex-1 flex items-center ml-2">
                                        <Search size={13} className="text-gray-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search users by name or email..."
                                            value={userSearchQuery}
                                            onFocus={() => setUserSearchFocused(true)}
                                            onChange={e => { setUserSearchQuery(e.target.value); setUserPage(1); }}
                                            className="w-full bg-transparent border-none pl-2.5 pr-2 py-1.5 text-[13px] text-gray-700 dark:text-gray-200 outline-none placeholder-gray-400"
                                        />
                                        {userSearchQuery && (
                                            <button type="button" onClick={() => { setUserSearchQuery(''); setUserPage(1); }} className="flex-shrink-0 text-gray-400 hover:text-gray-600 pr-1">
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                    {/* Circular filter button inside search bar */}
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); setShowUserFilterDropdown(v => !v); setUserSearchFocused(false); }}
                                            className="h-8 w-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95"
                                            style={{ background: (showPendingFacilitatorFilter || userFilter !== 'all') ? '#0052A3' : '#0052A3' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 10h12M9 15h6" /></svg>
                                            {(showPendingFacilitatorFilter || userFilter !== 'all') && (
                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">1</span>
                                            )}
                                        </button>
                                        {showUserFilterDropdown && (
                                            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4 z-[300] w-56">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Filter by role</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['all', 'admins', 'facilitators', 'users'].map((filter) => (
                                                        <button key={filter} onClick={() => { setShowPendingFacilitatorFilter(false); setUserFilter(filter as any); setUserPage(1); setShowUserFilterDropdown(false); }}
                                                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all"
                                                            style={!showPendingFacilitatorFilter && userFilter === filter ? { background: '#0052A3', color: '#fff', borderColor: '#0052A3' } : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                                                        >{filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Sort by — same as Events tab */}
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-[13px] text-gray-500 font-medium">Sort by:</span>
                                <div className="relative">
                                    <select
                                        value={userSortOrder}
                                        onChange={e => { setUserSortOrder(e.target.value as any); setUserPage(1); }}
                                        className="appearance-none bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 hover:border-blue-400 rounded-full pl-4 pr-8 py-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 transition-all cursor-pointer shadow-sm"
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        <option value="asc">A → Z</option>
                                        <option value="desc">Z → A</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Table card ── */}
                        <div className="bg-white dark:bg-[#111827] overflow-visible min-h-[400px]">
                            {isLoadingUsers ? (
                                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>
                            ) : userError ? (
                                <div className="text-center text-red-500 py-10">{userError} <button onClick={fetchUsers} className="underline ml-2">Retry</button></div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Name</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Address</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Age</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Sex</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Access</th>
                                            <th className="w-12 px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-[#111827]">
                                        {pagedUsers.map(user => {
                                            const age = user.birthday ? Math.floor((Date.now() - new Date(user.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                                            const isKebabOpen = openKebabUserId === user.uid;
                                            return (
                                                <tr
                                                    key={user.uid}
                                                    id={`user-${user.uid}`}
                                                    className={`group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${highlightUserId === user.uid ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                        }`}
                                                >
                                                    {/* Name */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-500">
                                                                {user.avatarUrl ? (
                                                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{user.name}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Address */}
                                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[180px]">
                                                        <span className="truncate block">{user.address || <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                                                    </td>
                                                    {/* Age */}
                                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {age !== null ? age : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                    </td>
                                                    {/* Sex */}
                                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {user.sex || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                    </td>
                                                    {/* Access */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${user.role === 'admin'
                                                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                                : user.role === 'facilitator'
                                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                                }`}>
                                                                {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                                                            </span>
                                                            {user.facilitatorRequestStatus === 'pending' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Pending</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* 3-dot menu */}
                                                    <td className="py-3 px-4">
                                                        <div className="relative flex justify-end">
                                                            <button
                                                                onClick={() => setOpenKebabUserId(isKebabOpen ? null : user.uid)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                                                            </button>
                                                            {isKebabOpen && (
                                                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[400] overflow-hidden min-w-[160px]">
                                                                    <div className="p-1">
                                                                        {user.role !== 'admin' && user.email !== 'admincommove@gmail.com' && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => { setPendingRoleChange({ user, newRole: 'user' }); setOpenKebabUserId(null); }}
                                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${user.role === 'user' || !user.role ? 'text-gray-400 cursor-default' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                                                    disabled={user.role === 'user' || !user.role}
                                                                                >
                                                                                    <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0"></span>
                                                                                    Set as User
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => { setPendingRoleChange({ user, newRole: 'facilitator' }); setOpenKebabUserId(null); }}
                                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${user.role === 'facilitator' ? 'text-gray-400 cursor-default' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                                                    disabled={user.role === 'facilitator'}
                                                                                >
                                                                                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                                                                                    Set as Facilitator
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {user.facilitatorRequestStatus === 'pending' && (
                                                                            <>
                                                                                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                                                                <button onClick={() => { onApproveFacilitator(user.uid); setOpenKebabUserId(null); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                                    Approve Request
                                                                                </button>
                                                                                <button onClick={() => { onRejectFacilitator(user.uid); setOpenKebabUserId(null); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                                    Reject Request
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {((user as any).facilitatorIdUrl || user.idUrl) && (
                                                                            <>
                                                                                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                                                                <button onClick={() => { setSelectedImageUrl((user as any).facilitatorIdUrl || user.idUrl || null); setOpenKebabUserId(null); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                                    View ID
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center text-gray-400 py-12 text-sm">No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Showing {((safePage - 1) * USERS_PER_PAGE) + 1}–{Math.min(safePage * USERS_PER_PAGE, sortedUsers.length)} of {sortedUsers.length} users
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                            disabled={safePage === 1}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >← Prev</button>
                                        <span className="text-xs text-gray-500 px-2">{safePage} / {totalPages}</span>
                                        <button
                                            onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                                            disabled={safePage === totalPages}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >Next →</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCalendar = () => {
        const year = viewingDate.getFullYear();
        const month = viewingDate.getMonth();
        const monthName = viewingDate.toLocaleString('default', { month: 'long' });

        // Get first day of month (0-6, where 0 is Sunday)
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        // Get total days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blankDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

        const selectedDateKey = toYMD(new Date(year, month, selectedDate));
        const eventsOnSelectedDate = (agendaDayMap.get(selectedDateKey) || []).map(({ event }) => event);

        const changeMonth = (offset: number) => {
            const newDate = new Date(year, month + offset, 1);
            setViewingDate(newDate);
            setCalendarMonthDate(newDate);
            // If the current day exists in the new month, keep it. Otherwise, set to 1st.
            const newMonthDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
            if (selectedDate > newMonthDays) {
                setSelectedDate(1);
            }
        };

        return (
            <div className="mt-6">
                {/* ── View Switcher ── */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {calendarView === 'month' ? 'Full month overview of all events' : 'Browse events by date'}
                    </p>
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
                        <button
                            onClick={() => {
                                setCalendarMonthDate(new Date(viewingDate.getFullYear(), viewingDate.getMonth(), 1));
                                setCalendarView('month');
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${calendarView === 'month'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            Month
                        </button>
                        <button
                            onClick={() => {
                                setViewingDate(new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1));
                                setCalendarView('agenda');
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${calendarView === 'agenda'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                            Agenda
                        </button>
                    </div>
                </div>

                {/* ── Month View: Full CalendarView grid ── */}
                {calendarView === 'month' && (
                    <CalendarView
                        events={events}
                        currentMonth={calendarMonthDate}
                        setCurrentMonth={setCalendarMonthDate}
                        onDateSelect={(date) => {
                            // Switch to Agenda view and navigate to selected date
                            setViewingDate(new Date(date.getFullYear(), date.getMonth(), 1));
                            setCalendarMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
                            setSelectedDate(date.getDate());
                            setCalendarView('agenda');
                        }}
                    />
                )}

                {/* ── Agenda View: Mini calendar + day event list ── */}
                {calendarView === 'agenda' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    onClick={() => changeMonth(-1)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{monthName} {year}</h3>
                                <button
                                    onClick={() => changeMonth(1)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-wider mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                    <div key={d} className="text-gray-400 dark:text-gray-500 font-semibold">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
                                {blankDays.map(blank => (
                                    <div key={`blank-${blank}`} className="w-8 h-8"></div>
                                ))}
                                {days.map(day => {
                                    const hasEvent = agendaDayMap.has(toYMD(new Date(year, month, day)));
                                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                                    return (
                                        <div key={day} className="flex justify-center items-center relative">
                                            <button
                                                onClick={() => setSelectedDate(day)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${selectedDate === day
                                                    ? 'text-white font-semibold shadow-lg'
                                                    : isToday
                                                        ? 'font-semibold ring-1 ring-blue-200 dark:ring-blue-700'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                    }`}
                                                style={selectedDate === day ? { background: '#0052A3' } : isToday ? { color: '#0052A3', background: '#EBF2FF' } : {}}
                                            >
                                                {day}
                                            </button>
                                            {hasEvent && (
                                                <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${selectedDate === day ? 'bg-white' : 'bg-[#0052A3]'}`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Events on {monthName} {selectedDate}, {year}</h3>
                                <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-bold uppercase">
                                    {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? 'Event' : 'Events'}
                                </div>
                            </div>

                            {eventsOnSelectedDate.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-60">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-white">No events scheduled</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">There are no events planned for this specific date.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    {eventsOnSelectedDate.map(event => (
                                        <div key={event.id} className="group p-4 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-md transition-all flex items-center gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                    {event.imageUrl ? (
                                                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-blue-50 flex items-center justify-center" style={{ color: '#0052A3' }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-[#0052A3] transition-colors truncate">{event.name}</h4>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" style={{ color: '#0052A3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {event.startTime} - {event.endTime}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {event.venue || event.city}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onEditEvent(event)}
                                                className="flex-shrink-0 py-2 px-4 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/50 whitespace-nowrap"
                                                style={{ minWidth: '80px' }}
                                            >
                                                Edit / View
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderReports = () => (
        <AdminReports events={events} users={users} />
    );

    const totalUsersCount = residents.length;
    const totalEventsCount = events.length;
    const participationRate = residents.length > 0 ? Math.round((participants.length / residents.length) * 100) : 0;
    const pendingApprovalsCount = pendingRequests.length;

    // Calculate Growth Percentages (Month over Month) — capped at ±100%
    const clampGrowth = (val: number) => Math.max(-100, Math.min(100, val));
    const currentMonthName = months[currentMonthIndex];
    const prevMonthName = currentMonthIndex > 0 ? months[currentMonthIndex - 1] : months[11];

    // 1. Participant/User Growth
    const currentCheckIns = checkInsByMonth[currentMonthName] || 0;
    const prevCheckIns = checkInsByMonth[prevMonthName] || 0;
    const participantGrowth = clampGrowth(prevCheckIns === 0 ? (currentCheckIns > 0 ? 100 : 0) : Math.round(((currentCheckIns - prevCheckIns) / prevCheckIns) * 100));

    // 2. Event Growth
    const currentEvents = eventsByMonth[currentMonthName] || 0;
    const prevEvents = eventsByMonth[prevMonthName] || 0;
    const eventGrowth = clampGrowth(prevEvents === 0 ? (currentEvents > 0 ? 100 : 0) : Math.round(((currentEvents - prevEvents) / prevEvents) * 100));

    // 3. Participation Rate Growth (check-ins per event ratio, month over month)
    const currentRatio = currentEvents > 0 ? currentCheckIns / currentEvents : 0;
    const prevRatio = prevEvents > 0 ? prevCheckIns / prevEvents : 0;
    const rateGrowth = clampGrowth(prevRatio === 0 ? (currentRatio > 0 ? 100 : 0) : Math.round(((currentRatio - prevRatio) / prevRatio) * 100));

    const renderGrowth = (val: number) => {
        if (val === 0) return <span className="text-[10px] md:text-xs font-bold text-gray-400">0%</span>;
        const isPositive = val > 0;
        return (
            <span className={`text-[10px] md:text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{val}%
            </span>
        );
    };

    return (
        <div className="w-full animate-fade-in-up">
            {activeTab === 'analytics' && <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6" style={{ fontFamily: "'Inter', ui-sans-serif, sans-serif" }}>
                {/* Total Users */}
                <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-2.5 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        {renderGrowth(participantGrowth)}
                    </div>
                    <div>
                        <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{canManageUsers ? totalUsersCount : participants.length}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{canManageUsers ? 'Total Users' : 'Event Participants'}</p>
                    </div>
                </div>

                {/* Total Events — click to open engagement metrics drawer */}
                <button
                    onClick={() => setMetricsDrawerOpen(true)}
                    className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-2.5 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between text-left cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-150 group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 transition-colors" style={{ color: '#0052A3' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        {renderGrowth(eventGrowth)}
                    </div>
                    <div>
                        <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{totalEventsCount}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Total Events</p>
                    </div>
                </button>

                {/* Participation Rate */}
                <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-2.5 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        {renderGrowth(rateGrowth)}
                    </div>
                    <div>
                        <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{participationRate}%</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Participation Rate</p>
                    </div>
                </div>

                {/* Pending Approvals */}
                <button
                    onClick={() => canManageUsers && setPendingDrawerOpen(true)}
                    className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-2.5 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between text-left transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        {pendingApprovalsCount > 0 && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: '#0052A3' }}>{pendingApprovalsCount}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{pendingApprovalsCount}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Pending Approvals</p>
                        {canManageUsers && <p className="text-[9px] font-semibold mt-1" style={{ color: '#0052A3' }}>Click to review →</p>}
                    </div>
                </button>
            </div>}

            {/* ── Decision Support trigger button — analytics tab only ─────── */}
            {activeTab === 'analytics' && (
                <div className="flex justify-end mb-3">
                    <button
                        onClick={() => setDsDrawerOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all active:scale-95 hover:opacity-90"
                        style={{ background: '#0052A3' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Decision Support
                    </button>
                </div>
            )}

            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'users' && canManageUsers && renderUsers()}
            {activeTab === 'calendar' && renderCalendar()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'highlights' && canManageUsers && renderHighlights()}

            {/* ── Pending Facilitator Requests Drawer ──────────────────────── */}
            {pendingFacilitatorDrawerOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <style>{`@keyframes slideInRightFac{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setPendingFacilitatorDrawerOpen(false)} />
                    <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '480px', zIndex: 99998, animation: 'slideInRightFac 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards', display: 'flex', flexDirection: 'column' }}
                        className="bg-white dark:bg-[#0f172a] shadow-2xl overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#0f172a] z-10">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Pending Facilitator Requests</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{pendingFacilitators.length} request{pendingFacilitators.length !== 1 ? 's' : ''} awaiting review</p>
                            </div>
                            <button onClick={() => setPendingFacilitatorDrawerOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {/* Body */}
                        <div className="flex-1 px-6 py-4 space-y-4">
                            {pendingFacilitators.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3" style={{ color: '#0052A3' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">All caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No pending facilitator requests.</p>
                                </div>
                            ) : (
                                pendingFacilitators.map(user => (
                                    <div key={user.uid} id={`user-${user.uid}`} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                                                {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">{user.name}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>
                                        </div>
                                        {/* ID / Face images */}
                                        {((user.idUrl || (user as any).facilitatorIdUrl) || user.faceUrl) && (
                                            <div className="flex gap-3 mb-3">
                                                {(user.idUrl || (user as any).facilitatorIdUrl) && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[9px] font-bold uppercase text-gray-400">Gov ID</span>
                                                        <img src={user.idUrl || (user as any).facilitatorIdUrl} alt="ID" className="w-20 h-14 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => setSelectedImageUrl(user.idUrl || (user as any).facilitatorIdUrl || null)} />
                                                    </div>
                                                )}
                                                {user.faceUrl && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[9px] font-bold uppercase text-gray-400">Face</span>
                                                        <img src={user.faceUrl} alt="Face" className="w-12 h-12 object-cover rounded-full border border-gray-200 cursor-pointer hover:opacity-80" onClick={() => setSelectedImageUrl(user.faceUrl || null)} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => onApproveFacilitator(user.uid)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">Approve</button>
                                            <button onClick={() => onRejectFacilitator(user.uid)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* ── Pending Approvals Drawer ─────────────────────────────────── */}
            {pendingDrawerOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setPendingDrawerOpen(false)}
                    />
                    <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '800px', zIndex: 99998, animation: 'slideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards', display: 'flex', flexDirection: 'column' }}
                        className="bg-white dark:bg-[#0f172a] shadow-2xl overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#0f172a] z-10">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Pending Approvals</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{pendingRequests.length} event{pendingRequests.length !== 1 ? 's' : ''} awaiting review</p>
                            </div>
                            <button onClick={() => setPendingDrawerOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {/* Body */}
                        <div className="flex-1 overflow-x-auto bg-white dark:bg-[#0f172a]">
                            {pendingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3" style={{ color: '#0052A3' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">All caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No pending approvals at the moment.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Event</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Date</th>
                                            <th className="px-6 py-4 text-left text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Priority</th>
                                            <th className="px-6 py-4 text-right text-[14px] font-semibold text-gray-900 dark:text-white capitalize">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-[#0f172a]">
                                        {pendingRequests.map(event => (
                                            <tr
                                                key={event.id}
                                                className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                            >
                                                {/* Event */}
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-500 border border-gray-100 dark:border-gray-800">
                                                            {event.imageUrl ? (
                                                                <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 text-[#0052A3] dark:text-blue-400 font-bold flex items-center justify-center text-sm select-none">
                                                                    {event.name ? event.name.charAt(0).toUpperCase() : '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{event.name}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{event.organizer || 'Unknown'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Date */}
                                                <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDisplayDate(event.date)}
                                                </td>
                                                {/* Priority & Recurrence */}
                                                <td className="py-3 px-6 text-sm text-gray-600 dark:text-gray-300">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <div className="flex gap-1.5 flex-wrap">
                                                            {event.priority === 'urgent' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Urgent</span>}
                                                            {event.priority === 'average' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Average</span>}
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending</span>
                                                        </div>
                                                        {event.recurrenceGroupId && (() => {
                                                            const seriesCount = getRecurringSeriesCount(event);
                                                            if (seriesCount <= 1) return null;
                                                            const freqLabel = getRecurrenceFrequencyLabel(event);
                                                            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 text-[10px] font-medium rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{seriesCount}x {freqLabel ? `${freqLabel} ` : ''}Recurring</span>;
                                                        })()}
                                                    </div>
                                                </td>
                                                {/* Actions */}
                                                <td className="py-3 px-6 text-right">
                                                    <div className="flex gap-1.5 justify-end">
                                                        {onPreviewEvent && (
                                                            <button onClick={() => { onPreviewEvent(event); setPendingDrawerOpen(false); }} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                                Preview
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setPendingConfirm({ type: 'publish', event }); setPendingDrawerOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded-full border border-green-200 dark:border-green-900/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Approve & Publish">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                        </button>
                                                        <button onClick={() => { onSchedule(event); setPendingDrawerOpen(false); }} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                            Schedule
                                                        </button>
                                                        <button onClick={() => { onReject(event.id); }} className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* ── Analytics Drawer ─────────────────────────────────────────────── */}
            {analyticsDrawerEvent && typeof document !== 'undefined' && createPortal(
                <>
                    <style>{`@keyframes slideInFromRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setAnalyticsDrawerEvent(null)}
                    />
                    {/* Panel */}
                    <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '420px', zIndex: 99998, animation: 'slideInFromRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards', display: 'flex', flexDirection: 'column' }}
                        className="bg-white dark:bg-[#0f172a] shadow-2xl overflow-y-auto"
                    >
                        {(() => {
                            const ev = analyticsDrawerEvent;
                            const v = safeNum(ev.viewCount);
                            const sv = safeNum(ev.saveCount);
                            const it = safeNum(ev.interestedCount);
                            const ci = safeNum(ev.checkInCount);
                            const fb = safeNum(ev.feedbackCount);
                            const rt = safeNum(ev.averageRating);

                            const engPct = v > 0 ? Math.min(100, Math.round(((it + ci) / v) * 100)) : null;
                            const attPct = it > 0 ? Math.min(100, Math.round((ci / it) * 100)) : null;
                            const fbPct = ci > 0 ? Math.min(100, Math.round((fb / ci) * 100)) : null;

                            const insight = generateEventDecisionInsight(ev!);
                            const lvlCfg: Record<string, { bg: string; text: string; border: string; dot: string }> = {
                                'Excellent': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800/40', dot: 'bg-green-500' },
                                'Good': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/40', dot: 'bg-blue-500' },
                                'Needs Improvement': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/40', dot: 'bg-amber-500' },
                                'Low Performing': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800/40', dot: 'bg-red-500' },
                            };
                            const cfg = lvlCfg[insight.performanceLevel] ?? lvlCfg['Needs Improvement'];

                            const RateBar = ({ label, pct, color }: { label: string; pct: number | null; color: string }) => (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</span>
                                        <span className="text-xs font-extrabold text-gray-900 dark:text-white">{pct === null ? '—' : `${pct}%`}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: pct === null ? '0%' : `${pct}%` }} />
                                    </div>
                                </div>
                            );

                            return (
                                <>
                                    {/* Header */}
                                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 flex-shrink-0">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Event Analytics</p>
                                            <h2 className="text-base font-extrabold text-gray-900 dark:text-white leading-snug">{ev.name}</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">{ev.venue || ev.city} · {ev.date}</p>
                                        </div>
                                        <button onClick={() => setAnalyticsDrawerEvent(null)} className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {/* Metric Grid */}
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Engagement Metrics</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Views', val: v, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <Eye className="w-4 h-4" /> },
                                                    { label: 'Saves', val: sv, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
                                                    { label: 'Interested', val: it, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/20', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
                                                    { label: 'Check-ins', val: ci, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                                    { label: 'Reviews', val: fb, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: <MessageSquare className="w-4 h-4" /> },
                                                    { label: 'Avg Rating', val: fb > 0 ? rt.toFixed(1) : '—', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: <Star className="w-4 h-4 fill-current" /> },
                                                ].map(m => (
                                                    <div key={m.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex flex-col gap-2">
                                                        <div className={`w-7 h-7 rounded-lg ${m.bg} ${m.color} flex items-center justify-center`}>{m.icon}</div>
                                                        <span className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{typeof m.val === 'number' ? m.val.toLocaleString() : m.val}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{m.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Decision Support — Rule-Based */}
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Decision Support</p>

                                            {/* Performance badge + summary */}
                                            <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 mb-3`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                                    <span className={`text-xs font-extrabold uppercase tracking-wide ${cfg.text}`}>{insight.performanceLevel}</span>
                                                    <span className="ml-auto text-sm font-extrabold text-gray-700 dark:text-gray-200">{insight.performanceScore}/100</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{insight.summary}</p>
                                            </div>

                                            {/* Flags */}
                                            {insight.flags.length > 0 && (
                                                <div className="mb-3 space-y-1.5">
                                                    {insight.flags.map((f, i) => (
                                                        <div key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                                            <p className="text-[11px] font-semibold text-red-700 dark:text-red-300 leading-snug">{f}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Insights */}
                                            {insight.insights.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Key Insights</p>
                                                    <ul className="space-y-2">
                                                        {insight.insights.map((ins, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-indigo-400 flex-shrink-0 mt-0.5">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                                                </span>
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{ins}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Recommendations */}
                                            {insight.recommendations.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Recommendations</p>
                                                    <ul className="space-y-2">
                                                        {insight.recommendations.map((r, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-green-500 flex-shrink-0 mt-0.5">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                                </span>
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{r}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </>,
                document.body
            )}

            {/* ── Decision Support Drawer (multi-domain, slide from right) ──────── */}
            {dsDrawerOpen && typeof document !== 'undefined' && createPortal(
                (() => {
                    const isAdmin = currentUser?.role === 'admin';
                    const facilId = currentUser?.uid ?? '';
                    const facEvents = isAdmin ? [] : events.filter(e => e.createdBy === facilId);
                    const facEventIds = new Set(facEvents.map(e => e.id));
                    const facFeedback = isAdmin ? [] : allFeedback.filter(f => facEventIds.has(f.eventId));
                    const dss: CrossDomainSummary = isAdmin
                        ? generateAdminDecisionSummary(events, users, allFeedback)
                        : generateFacilitatorDecisionSummary(facEvents, facFeedback, facilId);

                    const domainOrder: InsightDomain[] = ['events', 'engagement', 'users', 'demographics', 'categories', 'platform'];
                    const domainLabel: Record<InsightDomain, string> = {
                        events: 'Events', users: 'Users', demographics: 'Demographics',
                        engagement: 'Engagement', categories: 'Categories', platform: 'Platform',
                    };
                    const domainIcon: Record<InsightDomain, React.ReactNode> = {
                        events: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
                        engagement: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
                        users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
                        demographics: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                        categories: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
                        platform: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
                    };
                    const levelCfg: Record<InsightLevel, { bg: string; border: string; iconBg: string; iconText: string; badge: string }> = {
                        success: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-100 dark:border-green-800/30', iconBg: 'bg-green-100 dark:bg-green-900/30', iconText: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                        info: { bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-800/30', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconText: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
                        warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-800/30', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconText: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                        critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-100 dark:border-red-800/30', iconBg: 'bg-red-100 dark:bg-red-900/30', iconText: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
                    };
                    const levelIconPath = (level: InsightLevel): React.ReactNode => {
                        if (level === 'success') return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />;
                        if (level === 'warning') return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />;
                        if (level === 'critical') return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />;
                        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
                    };

                    const scoreColor = dss.overallScore >= 75 ? '#22c55e' : dss.overallScore >= 50 ? '#f59e0b' : '#ef4444';
                    const scoreLabel = dss.overallScore >= 75 ? 'Performing Well' : dss.overallScore >= 50 ? 'Needs Attention' : 'Action Required';

                    // Merge live insights with persisted history so the list stacks over time.
                    // Deduplicate history by domain|title (keep first occurrence) before merging.
                    const seenKeys = new Set<string>();
                    const dedupedHistory = insightHistory.filter(h => {
                        const k = `${h.domain}|${h.title}`;
                        if (seenKeys.has(k)) return false;
                        seenKeys.add(k); return true;
                    });
                    const liveOnly = dss.insights.filter(ins => !seenKeys.has(`${ins.domain}|${ins.title}`));
                    const mergedInsights: DomainInsight[] = [
                        ...dedupedHistory.map(h => ({ domain: h.domain, level: h.level, title: h.title, body: h.body })),
                        ...liveOnly,
                    ];

                    // Group insights by domain
                    const grouped: Partial<Record<InsightDomain, typeof dss.insights>> = {};
                    mergedInsights.forEach(item => {
                        if (!grouped[item.domain]) grouped[item.domain] = [];
                        grouped[item.domain]!.push(item);
                    });
                    // Group recommendations by domain
                    const groupedRecs: Partial<Record<InsightDomain, typeof dss.recommendations>> = {};
                    dss.recommendations.forEach(rec => {
                        if (!groupedRecs[rec.domain]) groupedRecs[rec.domain] = [];
                        groupedRecs[rec.domain]!.push(rec);
                    });

                    const activeDomains = domainOrder.filter(d => grouped[d]?.length);

                    return (
                        <>
                            <style>{`
                                @keyframes dsSlideIn{from{transform:translateX(100%)}to{transform:translateX(0%)}}
                                @keyframes dsSlideUp{from{transform:translateY(100%)}to{transform:translateY(0%)}}
                                @media(max-width:767px){
                                    .ds-drawer{top:auto!important;bottom:0!important;right:0!important;height:92%!important;max-width:100%!important;border-radius:20px 20px 0 0!important;animation:dsSlideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) forwards!important;}
                                }
                            `}</style>
                            {/* Backdrop */}
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 99995, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
                                onClick={() => setDsDrawerOpen(false)}
                            />
                            {/* Slide panel */}
                            <div
                                className="ds-drawer bg-white dark:bg-[#0f172a] shadow-2xl"
                                style={{ position: 'fixed', top: '20px', right: '20px', height: 'calc(100% - 40px)', width: '100%', maxWidth: '480px', zIndex: 99996, animation: 'dsSlideIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards', display: 'flex', flexDirection: 'column', borderRadius: '15px', overflow: 'hidden' }}
                            >
                                {/* ── Drawer Header ───────────────────────── */}
                                <div className="pt-safe flex-shrink-0 px-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3" style={{ paddingTop: 'max(env(safe-area-inset-top,16px),16px)' }}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${scoreColor}20` }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={scoreColor} strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">Decision Support</p>
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{isAdmin ? 'Admin View' : 'My Events'} · {activeDomains.length} domain{activeDomains.length !== 1 ? 's' : ''} analyzed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setDsDrawerOpen(false)}
                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* ── Summary strip ───────────────────────── */}
                                <div className="flex-shrink-0 px-5 py-3 bg-gray-50/80 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{dss.summary}</p>
                                    {dss.flags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {dss.flags.map((flag, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" /></svg>
                                                    {flag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── Scrollable domain cards ──────────────── */}
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                    {activeDomains.map(domain => {
                                        const domainInsights = grouped[domain] ?? [];
                                        const domainRecs = groupedRecs[domain] ?? [];
                                        const hasCritical = domainInsights.some(i => i.level === 'critical');
                                        const hasWarning = domainInsights.some(i => i.level === 'warning');
                                        const headerAccent = hasCritical ? 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10'
                                            : hasWarning ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10'
                                                : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30';
                                        const iconAccent = hasCritical ? 'text-red-500' : hasWarning ? 'text-amber-500' : 'text-indigo-500';

                                        return (
                                            <div key={domain} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                                {/* Domain card header */}
                                                <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${headerAccent}`}>
                                                    <div className={`flex-shrink-0 ${iconAccent}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{domainIcon[domain]}</svg>
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">{domainLabel[domain]}</p>
                                                    <span className="ml-auto text-[9px] font-bold text-gray-400 dark:text-gray-500">{domainInsights.length} insight{domainInsights.length !== 1 ? 's' : ''}</span>
                                                    {hasCritical && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Critical</span>}
                                                    {!hasCritical && hasWarning && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Warning</span>}
                                                </div>

                                                {/* Insights */}
                                                <div className="divide-y divide-gray-50 dark:divide-gray-800/60 bg-white dark:bg-[#111827]">
                                                    {domainInsights.map((item, i) => {
                                                        const cfg = levelCfg[item.level];
                                                        const ts = getInsightFirstSeenAt(item.domain + '|' + item.title);
                                                        const tsLabel = ts.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            + ' · '
                                                            + ts.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
                                                        return (
                                                            <div key={i} className="flex gap-3 px-4 py-3">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg} ${cfg.iconText}`}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">{levelIconPath(item.level)}</svg>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${cfg.badge}`}>{item.level}</span>
                                                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">{item.title}</p>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.body}</p>
                                                                    <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1 leading-none">{tsLabel}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Domain-specific recommendations */}
                                                {domainRecs.length > 0 && (
                                                    <div className="border-t border-gray-100 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-900/10">
                                                        {domainRecs.map((rec, i) => (
                                                            <div key={i} className="flex gap-2.5 px-4 py-2.5 border-b border-purple-50 dark:border-purple-900/10 last:border-0">
                                                                <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                                </div>
                                                                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{rec.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {activeDomains.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">All Systems Nominal</p>
                                            <p className="text-xs text-gray-400 mt-1">No issues detected across any domain. The platform is performing within expected parameters.</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── Drawer footer ────────────────────────── */}
                                <div className="flex-shrink-0 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20 flex items-center justify-between">
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{dss.recommendations.length} total recommendation{dss.recommendations.length !== 1 ? 's' : ''} · {mergedInsights.length} insight{mergedInsights.length !== 1 ? 's' : ''}</p>
                                    <button
                                        onClick={() => setDsDrawerOpen(false)}
                                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </>
                    );
                })(),
                document.body
            )}

            {/* ── Engagement Metrics Drawer (Total Events card click) ──────────── */}
            {metricsDrawerOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <style>{`@keyframes slideInFromRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99997, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setMetricsDrawerOpen(false)}
                    />
                    <div
                        style={{ position: 'fixed', top: '20px', right: '20px', height: 'calc(100% - 40px)', width: '100%', maxWidth: '480px', zIndex: 99998, animation: 'slideInFromRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) forwards', display: 'flex', flexDirection: 'column', borderRadius: '15px', overflow: 'hidden' }}
                        className="bg-white dark:bg-[#0f172a] shadow-2xl"
                    >
                        {(() => {
                            const tv = events.reduce((s, e) => s + safeNum(e.viewCount), 0);
                            const ts = events.reduce((s, e) => s + safeNum(e.saveCount), 0);
                            const ti = events.reduce((s, e) => s + safeNum(e.interestedCount), 0);
                            const tc = events.reduce((s, e) => s + safeNum(e.checkInCount), 0);
                            const re = events.filter(e => safeNum(e.feedbackCount) > 0);
                            const ar = re.length === 0 ? null : re.reduce((s, e) => s + safeNum(e.averageRating), 0) / re.length;

                            const rows = [
                                { no: 1, metric: 'Views', val: tv.toLocaleString(), desc: 'Total event views', status: tv >= 100 ? 'High' : tv >= 30 ? 'Moderate' : 'Low', statusColor: tv >= 100 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : tv >= 30 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                                { no: 2, metric: 'Saves', val: ts.toLocaleString(), desc: 'Events bookmarked', status: ts >= 20 ? 'High' : ts >= 5 ? 'Moderate' : 'Low', statusColor: ts >= 20 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : ts >= 5 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                                { no: 3, metric: 'Interested', val: ti.toLocaleString(), desc: 'Residents who marked interest', status: ti >= 20 ? 'High' : ti >= 5 ? 'Moderate' : 'Low', statusColor: ti >= 20 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : ti >= 5 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                                { no: 4, metric: 'Check-ins', val: tc.toLocaleString(), desc: 'Confirmed via QR scan', status: tc >= 10 ? 'High' : tc >= 3 ? 'Moderate' : 'Low', statusColor: tc >= 10 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : tc >= 3 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                                { no: 5, metric: 'Avg rating', val: ar === null ? '—' : `${ar.toFixed(1)} / 5`, desc: `${re.length} rated event${re.length !== 1 ? 's' : ''}`, status: ar === null ? 'No data' : ar >= 4 ? 'Excellent' : ar >= 3 ? 'Good' : 'Poor', statusColor: ar === null ? 'text-gray-400 bg-gray-50 dark:bg-gray-800/40' : ar >= 4 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : ar >= 3 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                            ];

                            return (
                                <>
                                    {/* Header */}
                                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 flex-shrink-0">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-1">Analytics Overview</p>
                                            <h2 className="text-base font-extrabold text-gray-900 dark:text-white leading-snug">Engagement Metrics</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">{events.length} total event{events.length !== 1 ? 's' : ''} · all time</p>
                                        </div>
                                        <button
                                            onClick={() => setMetricsDrawerOpen(false)}
                                            className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mt-0.5"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* Table */}
                                    <div className="flex-1 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="sticky top-0 bg-white dark:bg-[#0f172a] z-10">
                                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 w-8">#</th>
                                                    <th className="text-left px-2 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500">Metric</th>
                                                    <th className="text-left px-2 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500">Description</th>
                                                    <th className="text-right px-3 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500">Total</th>
                                                    <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                                {rows.map(row => (
                                                    <tr key={row.no} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                                                        <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">{row.no}</td>
                                                        <td className="px-2 py-4 text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{row.metric}</td>
                                                        <td className="px-2 py-4 text-xs text-gray-500 dark:text-gray-400">{row.desc}</td>
                                                        <td className="px-3 py-4 text-sm font-extrabold text-gray-900 dark:text-white text-right whitespace-nowrap">{row.val}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${row.statusColor}`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </>,
                document.body
            )}

            {/* Feedback Details Modal */}
            {viewingFeedbackEvent && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-[15px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200" style={{ maxHeight: '85vh' }}>
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Event Feedback</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ratings and reviews for "{viewingFeedbackEvent.name}"</p>
                            </div>
                            <button onClick={() => setViewingFeedbackEvent(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {(() => {
                                const reviews = allFeedback.filter(f => f.eventId === viewingFeedbackEvent.id);
                                if (reviews.length === 0) {
                                    return (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                                                <Star className="w-8 h-8 text-gray-200" />
                                            </div>
                                            <p className="text-gray-400 font-medium italic">No feedback has been submitted for this event yet.</p>
                                        </div>
                                    );
                                }
                                return reviews.map(review => (
                                    <div key={review.id} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden">
                                                    {review.userAvatar ? (
                                                        <img src={review.userAvatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-5 h-5 text-purple-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white leading-tight">{review.userName}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                                        {new Date(review.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">"{review.comment}"</p>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* ── Event Action Menu Portal (renders outside overflow-clipped table) ── */}
            {activeActionMenu && actionMenuPos && (() => {
                const event = allEvents.find(e => e.id === activeActionMenu);
                if (!event) return null;
                return createPortal(
                    <div
                        className="action-menu-container fixed z-[9999] w-52 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-1.5 animate-in fade-in zoom-in-95 duration-150"
                        style={{ top: actionMenuPos.top, right: actionMenuPos.right }}
                    >
                        <p className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Event Actions</p>
                        <div className="space-y-0.5">
                            <button onClick={() => { setAnalyticsDrawerEvent(event); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                <BarChart3 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                <span className="text-[12px] font-medium">Analytics</span>
                            </button>
                            <button onClick={() => { setViewingFeedbackEvent(event); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                <MessageSquare className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                <span className="text-[12px] font-medium">Feedback</span>
                            </button>
                            <button onClick={() => { onViewQRCode(event); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                <QrCode className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                <span className="text-[12px] font-medium">QR Code</span>
                            </button>
                            {onPreviewEvent && (
                                <button onClick={() => { onPreviewEvent(event); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                    <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                    <span className="text-[12px] font-medium">Preview</span>
                                </button>
                            )}
                            <button onClick={() => { onEditEvent(event); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                <Pencil className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                <span className="text-[12px] font-medium">Edit</span>
                            </button>
                            {(event.status === 'published' || event.status === 'scheduled') && onNotifyUpdate && (
                                <button onClick={() => { setPendingConfirm({ type: 'notify', event }); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                    <Bell className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                    <span className="text-[12px] font-medium">Notify</span>
                                </button>
                            )}
                            {(event.status === 'published' || event.status === 'scheduled') && onCancelEvent && (
                                <button onClick={() => { setPendingConfirm({ type: 'cancel', event }); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
                                    <Ban className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" strokeWidth={1.8} />
                                    <span className="text-[12px] font-medium">Cancel</span>
                                </button>
                            )}
                            <div className="mx-2 my-1 border-t border-gray-100 dark:border-gray-800" />
                            <button onClick={() => { onDeleteEvent(event.id); setActiveActionMenu(null); setActionMenuPos(null); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left">
                                <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={1.8} />
                                <span className="text-[12px] font-medium">Delete</span>
                            </button>
                        </div>
                    </div>,
                    document.body
                );
            })()}
            {/* ── Confirmation Dialogs ── */}
            <ConfirmationDialog
                open={pendingConfirm?.type === 'publish'}
                variant="publish"
                title="Publish Event"
                message="This event will be published and visible to users. Do you want to proceed?"
                confirmLabel="Yes, Publish"
                onConfirm={() => { if (pendingConfirm) { onApprove(pendingConfirm.event); setPendingConfirm(null); } }}
                onCancel={() => setPendingConfirm(null)}
            />
            <ConfirmationDialog
                open={pendingConfirm?.type === 'cancel'}
                variant="cancel"
                title="Cancel Event"
                message="This event will be cancelled. Affected residents will be notified. Do you want to proceed?"
                confirmLabel="Yes, Cancel Event"
                onConfirm={() => { if (pendingConfirm && onCancelEvent) { onCancelEvent(pendingConfirm.event); setPendingConfirm(null); } }}
                onCancel={() => setPendingConfirm(null)}
            />
            <ConfirmationDialog
                open={pendingConfirm?.type === 'notify'}
                variant="update"
                title="Notify Residents"
                message="This event will be updated. Residents who saved, checked in, or showed interest in this event may be notified. Do you want to proceed?"
                confirmLabel="Yes, Notify"
                onConfirm={() => { if (pendingConfirm && onNotifyUpdate) { onNotifyUpdate(pendingConfirm.event); setPendingConfirm(null); } }}
                onCancel={() => setPendingConfirm(null)}
            />
            {pendingRoleChange && typeof document !== 'undefined' && createPortal(
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setPendingRoleChange(null)}
                >
                    <div
                        style={{ width: '100%', maxWidth: '26rem', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}
                        className="bg-white dark:bg-[#111827] animate-in zoom-in-95 fade-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${pendingRoleChange.newRole === 'facilitator' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${pendingRoleChange.newRole === 'facilitator' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-black text-gray-900 dark:text-white">Confirm Role Change</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {pendingRoleChange.newRole === 'facilitator'
                                        ? `Are you sure you want to change this user's role to Facilitator?`
                                        : `Are you sure you want to change this facilitator's role back to User?`}
                                </p>
                            </div>
                        </div>

                        {/* User preview */}
                        <div className="px-6 py-4">
                            <div className={`flex items-center gap-3 p-3 rounded-2xl border ${pendingRoleChange.newRole === 'facilitator' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/40' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40'}`}>
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                    {pendingRoleChange.user.avatarUrl
                                        ? <img src={pendingRoleChange.user.avatarUrl} alt={pendingRoleChange.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    }
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pendingRoleChange.user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pendingRoleChange.user.email}</p>
                                </div>
                                {/* Role change arrow */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                        {pendingRoleChange.user.role || 'User'}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${pendingRoleChange.newRole === 'facilitator' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                        {pendingRoleChange.newRole === 'facilitator' ? 'Facilitator' : 'User'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setPendingRoleChange(null)}
                                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleRoleUpdate(pendingRoleChange.user.uid, pendingRoleChange.newRole);
                                    setPendingRoleChange(null);
                                }}
                                className={`flex-1 py-2.5 px-4 text-white font-bold rounded-2xl transition-colors text-sm shadow-lg ${pendingRoleChange.newRole === 'facilitator' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}
                            >
                                Yes, Change Role
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Card Detail More Insights Drawer (right slide-over) ──────────── */}
            {cardDetailDrawer && typeof document !== 'undefined' && createPortal(
                <>
                    <style>{`
                        @keyframes cardDetailSlideIn{from{transform:translateX(110%)}to{transform:translateX(0%)}}
                        @keyframes cardDetailSlideOut{from{transform:translateX(0%)}to{transform:translateX(110%)}}
                        @keyframes cardDetailSlideUp{from{transform:translateY(100%)}to{transform:translateY(0%)}}
                        @keyframes cardDetailSlideDown{from{transform:translateY(0%)}to{transform:translateY(100%)}}
                        @media(max-width:767px){
                            .card-detail-drawer{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;max-width:100%!important;height:90%!important;border-radius:20px 20px 0 0!important;}
                            .card-detail-drawer.entering{animation:cardDetailSlideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) forwards!important;}
                            .card-detail-drawer.leaving{animation:cardDetailSlideDown 0.3s cubic-bezier(0.55,0,1,0.45) forwards!important;}
                        }
                    `}</style>
                    {/* Backdrop + positioning container */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99997, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', paddingTop: '20px', paddingBottom: '20px', paddingRight: '20px', backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => closeCardDetailDrawer()}
                    >
                        {/* Slide panel */}
                        <div
                            onClick={e => e.stopPropagation()}
                            className={`card-detail-drawer ${cardDetailClosing ? 'leaving' : 'entering'} bg-white dark:bg-[#0f172a] shadow-2xl`}
                            style={{ width: '100%', maxWidth: '480px', animation: `${cardDetailClosing ? 'cardDetailSlideOut 0.3s cubic-bezier(0.55,0,1,0.45) forwards' : 'cardDetailSlideIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards'}`, display: 'flex', flexDirection: 'column', borderRadius: '15px', overflow: 'hidden' }}
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 px-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3" style={{ paddingTop: 'max(env(safe-area-inset-top,16px),16px)' }}>
                                <div className="min-w-0">
                                    <p className="text-base font-black text-gray-900 dark:text-white">Decision Support</p>
                                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 leading-tight truncate">{cardDetailDrawer.title}</p>
                                </div>
                                <button
                                    onClick={() => closeCardDetailDrawer()}
                                    className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Insights list — merged from history + current live insights */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                                {(() => {
                                    // Load persisted history for this card
                                    type CardEntry = { level: InsightLevel; text: string; rec?: string; seenAt: string };
                                    let cardHistory: CardEntry[] = [];
                                    try {
                                        const slug = cardDetailDrawer.title.replace(/\s+/g, '_').toLowerCase();
                                        const raw = localStorage.getItem(`cmt_ch_${slug}_${currentUser?.uid ?? ''}`);
                                        if (raw) cardHistory = JSON.parse(raw);
                                    } catch { }
                                    // Deduplicate history by text
                                    const seenTexts = new Set<string>();
                                    const deduped = cardHistory.filter(h => {
                                        if (seenTexts.has(h.text)) return false;
                                        seenTexts.add(h.text); return true;
                                    });
                                    // New insights (not yet in history) stack at top; history stays at bottom
                                    const liveOnly = cardDetailDrawer.insights.filter(ins => !seenTexts.has(ins.text));
                                    const merged: Array<{ level: InsightLevel; text: string; rec?: string }> = [
                                        ...liveOnly,
                                        ...deduped,
                                    ];
                                    return merged;
                                })().map((insight, i) => {
                                    const cfgMap: Record<InsightLevel, { bg: string; border: string; iconBg: string; iconText: string; badge: string }> = {
                                        success: { bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-100 dark:border-green-800/30', iconBg: 'bg-green-100 dark:bg-green-900/30', iconText: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                                        info: { bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-800/30', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconText: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
                                        warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-800/30', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconText: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                                        critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-100 dark:border-red-800/30', iconBg: 'bg-red-100 dark:bg-red-900/30', iconText: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                                    };
                                    const iconPathsMap: Record<InsightLevel, React.ReactNode> = {
                                        success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />,
                                        info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
                                        warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
                                        critical: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />,
                                    };
                                    const cfg = cfgMap[insight.level];
                                    return (
                                        <div key={i} className={`rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}>
                                            {i === 0 && (
                                                <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${cfg.badge}`}>Primary Insight</span>
                                            )}
                                            <div className="flex gap-2.5 items-start">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg} ${cfg.iconText}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{iconPathsMap[insight.level]}</svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] text-gray-700 dark:text-gray-200 leading-relaxed font-medium">{insight.text}</p>
                                                    {insight.rec && <p className="text-[11px] text-purple-600 dark:text-purple-400 leading-relaxed mt-1.5 font-medium">→ {insight.rec}</p>}
                                                    {(() => {
                                                        const ts = getInsightFirstSeenAt(cardDetailDrawer.title + '|' + insight.text.slice(0, 40));
                                                        return (
                                                            <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1 leading-none">
                                                                {ts.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                {' · '}
                                                                {ts.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}

                            <div className="flex-shrink-0 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">{cardDetailDrawer.insights.length} insight{cardDetailDrawer.insights.length !== 1 ? 's' : ''} · {cardDetailDrawer.title}</p>
                                <button onClick={() => closeCardDetailDrawer()} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">Close</button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>

    );
};

export default AdminDashboardTabs;
