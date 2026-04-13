import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { EventType, User } from '../types';
import { XMarkIcon } from '../constants';
import AdminReports from './AdminReports';
import { getHighlights, setHighlights } from '../services/eventService';

interface AdminDashboardTabsProps {
    events: EventType[];
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
    initialTab?: 'analytics' | 'events' | 'users';
    onInitialTabConsumed?: () => void;
}

const AdminDashboardTabs: React.FC<AdminDashboardTabsProps> = ({ 
    events, users, pendingRequests, onApprove, onReject, onEditEvent, onDeleteEvent, onViewQRCode, onViewParticipants,
    onSchedule, onPreviewEvent,
    filteredUsers, userSearchQuery, setUserSearchQuery, userFilter, setUserFilter,
    isLoadingUsers, userError, fetchUsers, handleRoleUpdate, onApproveFacilitator, onRejectFacilitator, onDeleteUser, canManageUsers,
    initialTab, onInitialTabConsumed
}) => {
    const [activeTab, setActiveTab] = useState<'analytics' | 'demographics' | 'events' | 'users' | 'calendar' | 'reports' | 'highlights'>('analytics');
    const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
    const [viewingDate, setViewingDate] = useState<Date>(new Date());
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Respond to external tab navigation requests (e.g. from notification buttons)
    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
            onInitialTabConsumed?.();
        }
    }, [initialTab]);

    // ── Highlights state ──────────────────────────────────────────────────────
    const [highlightIds, setHighlightIds] = useState<string[]>([]);
    const [highlightsLoading, setHighlightsLoading] = useState(true);
    const [highlightsSaving, setHighlightsSaving] = useState(false);
    const [highlightsSaved, setHighlightsSaved] = useState(false);
    const [highlightsShowModal, setHighlightsShowModal] = useState(false);
    const [highlightSearch, setHighlightSearch] = useState('');

    // Load highlights ONCE on mount so saved selections always persist
    React.useEffect(() => {
        setHighlightsLoading(true);
        getHighlights().then(ids => {
            setHighlightIds(ids);
            setHighlightsLoading(false);
        }).catch(() => setHighlightsLoading(false));
    }, []);

    const toggleHighlight = (eventId: string) => {
        setHighlightIds(prev => {
            if (prev.includes(eventId)) return prev.filter(id => id !== eventId);
            if (prev.length >= 5) return prev; // max 5
            return [...prev, eventId];
        });
        setHighlightsSaved(false);
    };

    const moveHighlight = (index: number, dir: -1 | 1) => {
        setHighlightIds(prev => {
            const arr = [...prev];
            const newIdx = index + dir;
            if (newIdx < 0 || newIdx >= arr.length) return arr;
            [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
            return arr;
        });
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
        const filtered = publishedEvents.filter(e =>
            e.name.toLowerCase().includes(highlightSearch.toLowerCase()) ||
            (e.venue || e.city || '').toLowerCase().includes(highlightSearch.toLowerCase())
        );
        const selectedEvents = highlightIds.map(id => events.find(e => e.id === id)).filter(Boolean) as EventType[];

        return (
            <div className="mt-6 space-y-6">
                {/* ── Success Modal ── */}
                {highlightsShowModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300 border border-white/10 dark:border-gray-800">
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
                                            <span className="w-5 h-5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                            {ev.imageUrl && <img src={ev.imageUrl} alt={ev.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{ev.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => { setHighlightsShowModal(false); setHighlightsSaved(false); }}
                                className="w-full py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Feed Highlights</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Select up to 5 events to feature at the top of the resident feed.</p>
                    </div>
                    <button
                        onClick={saveHighlights}
                        disabled={highlightsSaving}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                            highlightsSaved
                                ? 'bg-green-600 text-white shadow-green-500/20'
                                : 'bg-[#8b5cf6] text-white shadow-purple-500/20 hover:bg-[#7c3aed] active:scale-95'
                        } disabled:opacity-60`}
                    >
                        {highlightsSaving ? 'Saving…' : highlightsSaved ? '✓ Saved!' : 'Save Highlights'}
                    </button>
                </div>

                {/* Selected highlights — ordered list */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Selected Highlights
                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                                highlightIds.length === 5
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }`}>{highlightIds.length}/5</span>
                        </h4>
                        {highlightIds.length > 0 && (
                            <button
                                onClick={() => { setHighlightIds([]); setHighlightsSaved(false); }}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {highlightsLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
                        </div>
                    ) : selectedEvents.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-6">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">No highlights selected</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pick events from the list below to feature them in the resident feed.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {selectedEvents.map((event, idx) => (
                                <div key={event.id} className="flex items-center gap-3 px-5 py-3.5 group">
                                    <span className="w-6 h-6 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                    {event.imageUrl && (
                                        <img src={event.imageUrl} alt={event.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{event.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{event.date} · {event.venue || event.city}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveHighlight(idx, -1)}
                                            disabled={idx === 0}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                                            title="Move up"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => moveHighlight(idx, 1)}
                                            disabled={idx === selectedEvents.length - 1}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                                            title="Move down"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => toggleHighlight(event.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Event picker */}
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">All Published Events</h4>
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search events…"
                                value={highlightSearch}
                                onChange={e => setHighlightSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400">No published events found.</div>
                        ) : (
                            filtered.map(event => {
                                const isSelected = highlightIds.includes(event.id);
                                const rank = highlightIds.indexOf(event.id) + 1;
                                const maxReached = highlightIds.length >= 5 && !isSelected;
                                return (
                                    <button
                                        key={event.id}
                                        type="button"
                                        onClick={() => !maxReached && toggleHighlight(event.id)}
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                                            isSelected
                                                ? 'bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                                                : maxReached
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        {/* Select indicator */}
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                            isSelected
                                                ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
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
                                            <p className={`text-sm font-bold truncate ${ isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-gray-900 dark:text-white'}`}>{event.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{event.date} · {event.venue || event.city}</p>
                                            {Array.isArray(event.category) && event.category.length > 0 && (
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {event.category.slice(0, 3).map(cat => (
                                                        <span key={cat} className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-md">{cat}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <span className="text-xs font-black text-[#8b5cf6] shrink-0">#Highlight</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {highlightIds.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                        {5 - highlightIds.length > 0
                            ? `${5 - highlightIds.length} more slot${5 - highlightIds.length !== 1 ? 's' : ''} available`
                            : 'Maximum 5 highlights selected. Remove one to add another.'}
                    </p>
                )}
            </div>
        );
    };;

    const residents = users.filter(u => u.role === 'user' || (!u.role && !u.isAdmin));
    // Correctly calculate participants who joined at least one event in the provided events list
    const participants = residents.filter(u => 
        u.checkedInEventIds && u.checkedInEventIds.some(id => events.some(e => e.id === id))
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

    // 6. New Users per Month
    const newUsersData = [
        { name: 'Oct', users: Math.floor(users.length * 0.1) },
        { name: 'Nov', users: Math.floor(users.length * 0.15) },
        { name: 'Dec', users: Math.floor(users.length * 0.08) },
        { name: 'Jan', users: Math.floor(users.length * 0.2) },
        { name: 'Feb', users: Math.floor(users.length * 0.25) },
        { name: 'Mar', users: users.length - Math.floor(users.length * 0.1) - Math.floor(users.length * 0.15) - Math.floor(users.length * 0.08) - Math.floor(users.length * 0.2) - Math.floor(users.length * 0.25) }
    ];

    const renderAnalytics = () => (
        <div className="flex flex-col gap-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Monthly Trends</h3>
                    <div className="h-64 min-h-[256px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={realMonthlyTrends} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                <defs>
                                    <linearGradient id="colorParticipants" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                </div>
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Events by Category</h3>
                    <div className="h-64 min-h-[256px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={realCategoryData} 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                </div>
            </div>
            
            <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">New Users per Month</h3>
                <div className="h-64 min-h-[256px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={newUsersData} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} dx={isMobile ? 0 : 0} />
                            <RechartsTooltip />
                            <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderDemographics = () => (
        <div className="flex flex-col gap-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Gender Distribution</h3>
                    <div className="h-64 flex items-center justify-center">
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
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Age Distribution */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Age Groups</h3>
                    <div className="h-64">
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
                </div>
            </div>

            {/* Top Events */}
            <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Top Events by Attendance</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEventsData} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} dx={isMobile ? 0 : 0} />
                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="participants" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderEvents = () => (
        <div className="mt-6 space-y-6">
            <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Pending Approvals</h3>
                {pendingRequests.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No pending approvals.</p>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.map(event => (
                            <div key={event.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800/60 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-4">
                                    <img src={event.imageUrl || undefined} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{event.name}</h4>
                                            {event.priority === 'urgent' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-lg">Urgent</span>}
                                            {event.priority === 'average' && <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase rounded-lg">Average</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{event.organizer || 'Unknown'} • {event.date}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {onPreviewEvent && (
                                        <button onClick={() => onPreviewEvent(event)} className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Preview Event">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                    )}
                                    <button onClick={() => onApprove(event)} className="w-10 h-10 flex items-center justify-center rounded-full border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Approve & Publish Now">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                    <button onClick={() => onSchedule(event)} className="w-10 h-10 flex items-center justify-center rounded-full border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Schedule Publication">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                    <button onClick={() => onReject(event.id)} className="w-10 h-10 flex items-center justify-center rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Disapprove">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 overflow-x-auto">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">All Events</h3>
                <table className="w-full min-w-[600px] text-left">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                            <th className="pb-3 font-medium">Event</th>
                            <th className="pb-3 font-medium">Date</th>
                            <th className="pb-3 font-medium">Location</th>
                            <th className="pb-3 font-medium">Attendees</th>
                            <th className="pb-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                                {events.map(event => {
                            // Calculate real attendee count from the users list
                            const attendeeCount = users.filter(u => u.checkedInEventIds?.includes(event.id)).length;
                            const attendeesStr = event.maxParticipants ? `${attendeeCount}/${event.maxParticipants}` : `${attendeeCount} (No Limit)`;
                            return (
                                <tr key={event.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="py-4 font-medium text-gray-900 dark:text-white">{event.name}</td>
                                    <td className="py-4 text-gray-500 dark:text-gray-400">{event.date}</td>
                                    <td className="py-4 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {event.venue || event.city}
                                    </td>
                                    <td className="py-4 text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <span>{attendeesStr}</span>
                                            <button 
                                                onClick={() => onViewParticipants(event)}
                                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors group relative"
                                                title="View Attendees"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">View Participants</span>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                                event.status === 'draft' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 outline outline-1 outline-gray-200 dark:outline-gray-700' :
                                                event.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                                                event.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' : 
                                                event.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                                                'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                                            }`}>
                                                {event.status === 'scheduled' && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                )}
                                                {event.status || 'approved'}
                                            </span>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onViewQRCode(event)}
                                                    className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                    title="View QR Code"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3.5M12 12h.01M16 12h.01M12 16h.01M16 16h.01M7 8h2v2H7V8zm0 0V6a2 2 0 114 0v2H7zm0 0h4m-4 4h2v2H7v-2zm0 0V10a2 2 0 114 0v2H7zm0 0h4m-4 4h2v2H7v-2zm0 0V14a2 2 0 114 0v2H7zm0 0h4m-4 4h2v2H7v-2zm0 0V18a2 2 0 114 0v2H7zm0 0h4" /></svg>
                                                </button>
                                                {onPreviewEvent && (event.status === 'pending' || event.status === 'rejected' || event.status === 'draft' || event.status === 'scheduled') && (
                                                    <button 
                                                        onClick={() => onPreviewEvent(event)}
                                                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                        title="Preview Event"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => onEditEvent(event)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Edit Event"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteEvent(event.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete Event"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        </div>
    );

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
        const pendingFacilitators = users.filter(u => u.facilitatorRequestStatus === 'pending');

        return (
            <div className="mt-6 space-y-6">
                {pendingFacilitators.length > 0 && (
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Facilitator Requests</h3>
                        <div className="space-y-4">
                            {pendingFacilitators.map(user => (
                                <div key={user.uid} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-blue-50 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{user.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 items-center">
                                        {user.idUrl && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Gov ID</span>
                                                <img src={user.idUrl} alt="ID" className="w-16 h-10 object-cover rounded border border-gray-200 dark:border-gray-700" />
                                            </div>
                                        )}
                                        {user.faceUrl && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Face Scan</span>
                                                <img src={user.faceUrl} alt="Face" className="w-10 h-10 object-cover rounded-full border border-gray-200 dark:border-gray-700" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => onApproveFacilitator(user.uid)} className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
                                            Approve
                                        </button>
                                        <button onClick={() => onRejectFacilitator(user.uid)} className="px-4 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Users by Role</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usersByRole} margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 32 : 40} dx={isMobile ? 0 : 0} />
                                <RechartsTooltip />
                                <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Resident Engagement (Events Attended)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={engagementData} layout="vertical" margin={{ left: 0, bottom: isMobile ? 5 : 0, top: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} dy={isMobile ? 5 : 0} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 70 : 80} dx={isMobile ? 0 : 0} />
                                <RechartsTooltip />
                                <Bar dataKey="users" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {canManageUsers && (
                <div className="bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Manage Users</h3>
                    <div className="mb-6 relative">
                         <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-9 md:pl-11 pr-4 py-2.5 md:py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[15px] md:rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                    
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                        {['all', 'admins', 'facilitators', 'users'].map((filter) => (
                             <button 
                                key={filter}
                                onClick={() => setUserFilter(filter as any)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap border transition-all ${
                                    userFilter === filter
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    {isLoadingUsers ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : userError ? (
                         <div className="text-center text-red-500 py-8">{userError} <button onClick={fetchUsers} className="underline ml-2">Retry</button></div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map(user => (
                <div key={user.uid} className="bg-white dark:bg-gray-800/50 p-4 md:p-4 rounded-[15px] md:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 overflow-hidden">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl || undefined} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                                                    user.role === 'facilitator' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {user.role || 'User'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2 pt-3 md:pt-0 mt-1 md:mt-0 border-t border-gray-50 md:border-none">
                                        {user.facilitatorRequestStatus === 'pending' && (
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => onApproveFacilitator(user.uid)}
                                                    className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                                    title="Approve Facilitator Request"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                                {((user as any).facilitatorIdUrl || user.idUrl) && (
                                                    <button 
                                                        onClick={() => window.open((user as any).facilitatorIdUrl || user.idUrl, '_blank')}
                                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                        title="View Submitted ID"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => onRejectFacilitator(user.uid)}
                                                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                    title="Reject Facilitator Request"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2 items-center ml-auto">
                                            <select 
                                                value={user.role || 'user'}
                                                onChange={(e) => handleRoleUpdate(user.uid, e.target.value as 'admin' | 'facilitator' | 'user')}
                                                disabled={user.email === 'admin@commove.com'} 
                                                className="text-xs md:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                            >
                                                <option value="user">User</option>
                                                <option value="facilitator">Facilitator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button
                                                onClick={() => onDeleteUser(user.uid)}
                                                disabled={user.email === 'admin@commove.com'}
                                                className={`p-1.5 rounded-lg transition-colors border border-transparent ${user.email === 'admin@commove.com' ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:border-red-100'}`}
                                                title="Delete User"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && <p className="text-center text-gray-500 mt-8">No users found.</p>}
                        </div>
                    )}
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

        const eventsOnSelectedDate = events.filter(e => {
            const date = new Date(e.date);
            return date.getDate() === selectedDate && date.getMonth() === month && date.getFullYear() === year;
        });

        const changeMonth = (offset: number) => {
            const newDate = new Date(year, month + offset, 1);
            setViewingDate(newDate);
            // If the current day exists in the new month, keep it. Otherwise, set to 1st.
            const newMonthDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
            if (selectedDate > newMonthDays) {
                setSelectedDate(1);
            }
        };

        return (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <h3 className="font-bold text-gray-900 dark:text-white">{monthName} {year}</h3>
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
                            <div key={d} className="text-gray-400 dark:text-gray-500 font-bold">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
                        {blankDays.map(blank => (
                            <div key={`blank-${blank}`} className="w-8 h-8"></div>
                        ))}
                        {days.map(day => {
                            const hasEvent = events.some(e => {
                                const date = new Date(e.date);
                                return date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
                            });
                            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                            
                            return (
                                <div key={day} className="flex justify-center items-center relative">
                                    <button 
                                        onClick={() => setSelectedDate(day)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                            selectedDate === day 
                                            ? 'bg-[#8b5cf6] text-white font-bold shadow-lg shadow-purple-500/30' 
                                            : isToday 
                                            ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-700' 
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                    {hasEvent && (
                                        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${selectedDate === day ? 'bg-white' : 'bg-purple-600'}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-[#111827] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Events on {monthName} {selectedDate}, {year}</h3>
                        <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-bold uppercase">
                            {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? 'Event' : 'Events'}
                        </div>
                    </div>
                    
                    {eventsOnSelectedDate.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-60">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">No events scheduled</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">There are no events planned for this specific date.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                            {eventsOnSelectedDate.map(event => (
                                <div key={event.id} className="group p-4 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:border-purple-200 dark:hover:border-purple-900 hover:shadow-md transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            {event.imageUrl ? (
                                                <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors truncate">{event.name}</h4>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {event.startTime} - {event.endTime}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {event.venue || event.city}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onEditEvent(event)}
                                        className="py-2 px-4 bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-purple-100 dark:hover:border-purple-900/50"
                                    >
                                        Edit / View
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <AdminReports events={events} users={users} />
    );

    const availableTabs = ['analytics', 'demographics', 'events', 'calendar', 'reports'];
    if (canManageUsers) {
        // Admins can also see users and highlights tabs
        if (!availableTabs.includes('users')) {
            availableTabs.splice(3, 0, 'users');
        }
        if (!availableTabs.includes('highlights')) {
            availableTabs.push('highlights');
        }
    }

    const totalUsersCount = users.length;
    const totalEventsCount = events.length;
    const participationRate = residents.length > 0 ? Math.round((participants.length / residents.length) * 100) : 0;
    const pendingApprovalsCount = pendingRequests.length;

    // Calculate Growth Percentages (Month over Month)
    const currentMonthName = months[currentMonthIndex];
    const prevMonthName = currentMonthIndex > 0 ? months[currentMonthIndex - 1] : months[11];
    
    // 1. Participant/User Growth
    const currentCheckIns = checkInsByMonth[currentMonthName] || 0;
    const prevCheckIns = checkInsByMonth[prevMonthName] || 0;
    const participantGrowth = prevCheckIns === 0 ? (currentCheckIns > 0 ? 100 : 0) : Math.round(((currentCheckIns - prevCheckIns) / prevCheckIns) * 100);

    // 2. Event Growth
    const currentEvents = eventsByMonth[currentMonthName] || 0;
    const prevEvents = eventsByMonth[prevMonthName] || 0;
    const eventGrowth = prevEvents === 0 ? (currentEvents > 0 ? 100 : 0) : Math.round(((currentEvents - prevEvents) / prevEvents) * 100);

    // 3. Participation Rate Growth (Mocked trend based on check-ins vs events ratio changes)
    const currentRatio = currentEvents > 0 ? currentCheckIns / currentEvents : 0;
    const prevRatio = prevEvents > 0 ? prevCheckIns / prevEvents : 0;
    const rateGrowth = prevRatio === 0 ? (currentRatio > 0 ? 5 : 0) : Math.round(((currentRatio - prevRatio) / prevRatio) * 100);

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                {/* Total Users */}
                <div className="bg-white dark:bg-[#111827] p-3 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        {renderGrowth(participantGrowth)}
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white">{canManageUsers ? totalUsersCount : participants.length}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{canManageUsers ? 'Total Users' : 'Event Participants'}</p>
                    </div>
                </div>

                {/* Total Events */}
                <div className="bg-white dark:bg-[#111827] p-3 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        {renderGrowth(eventGrowth)}
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white">{totalEventsCount}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Total Events</p>
                    </div>
                </div>

                {/* Participation Rate */}
                <div className="bg-white dark:bg-[#111827] p-3 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        {renderGrowth(rateGrowth)}
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white">{participationRate}%</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Participation Rate</p>
                    </div>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white dark:bg-[#111827] p-3 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white">{pendingApprovalsCount}</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Pending Approvals</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-xl w-full md:w-fit">
                {availableTabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                            activeTab === tab
                            ? 'bg-white dark:bg-primary-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'demographics' && renderDemographics()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'users' && canManageUsers && renderUsers()}
            {activeTab === 'calendar' && renderCalendar()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'highlights' && canManageUsers && renderHighlights()}
        </div>
    );
};

export default AdminDashboardTabs;
