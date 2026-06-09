import React, { useState } from 'react';
import InteractiveMap from './InteractiveMap';
import EventList from './EventList';
import type { EventType, DisplayEventType } from '../types';
import { Navigation, Layers, List, X, MapPin, Bookmark, SlidersHorizontal, Heart, Calendar, History, Sparkles, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventImage } from '../constants';

interface NearbyViewProps {
    userLocation: { lat: number; lng: number; accuracy?: number };
    events: EventType[];
    isLocationLive: boolean;
    onOpenScanner: () => void;
    onEventSelect: (event: EventType) => void;
    onToggleSave: (eventId: string) => void;
    savedEventIds: string[];
    likedEventIds?: string[];
    interestedEventIds?: string[];
    focusLocation?: { lat: number; lng: number } | null;
    onFocusConsumed?: () => void;
}

const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // radius of Earth in metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
        days.push(new Date(year, month, day));
    }
    return days;
};

const NearbyView: React.FC<NearbyViewProps> = ({ 
    userLocation, 
    events, 
    isLocationLive, 
    onEventSelect, 
    onToggleSave, 
    onOpenScanner, 
    savedEventIds, 
    likedEventIds = [], 
    interestedEventIds = [], 
    focusLocation, 
    onFocusConsumed 
}) => {
    const [showEventList, setShowEventList] = useState(false);
    const [mapFilter, setMapFilter] = useState<'all' | 'today' | 'tomorrow' | 'date' | 'liked' | 'interested' | 'ended'>('all');
    const [filterDate, setFilterDate] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
    const [isPickingDate, setIsPickingDate] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    React.useEffect(() => {
        if (focusLocation && onFocusConsumed) {
            const timer = setTimeout(onFocusConsumed, 2000);
            return () => clearTimeout(timer);
        }
    }, [focusLocation, onFocusConsumed]);

    // 1. Prepare FILTERED events for the Map
    const now = new Date();
    const allMapEvents: DisplayEventType[] = events
        .filter(e => {
            // A. Base publish validation
            const isPublished = e.status === 'published' || e.status === 'reviewed' || !e.status;
            const isScheduled = e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now();
            if (!isPublished && !isScheduled) return false;

            // B. Check if ended
            // For recurring instances, endDate may be inherited from the original occurrence
            // and could be earlier than the instance's own date — fall back to e.date in that case.
            const endDateStr = (e.endDate && e.endDate >= e.date) ? e.endDate : e.date;
            const endTimeStr = e.endTime || '23:59';
            const eventEnd = new Date(`${endDateStr}T${endTimeStr}`);
            const hasEnded = eventEnd < now;

            // Apply 'ended' vs active events filter
            if (mapFilter === 'ended') {
                if (!hasEnded) return false;
            } else {
                if (hasEnded) return false;
            }

            // C. Apply specific filter criteria
            if (mapFilter === 'today') {
                const todayStr = formatDateString(now);
                return e.date === todayStr;
            }

            if (mapFilter === 'tomorrow') {
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                const tomorrowStr = formatDateString(tomorrow);
                return e.date === tomorrowStr;
            }

            if (mapFilter === 'date' && filterDate) {
                return e.date === filterDate;
            }

            if (mapFilter === 'liked') {
                return likedEventIds.includes(e.id);
            }

            if (mapFilter === 'interested') {
                return interestedEventIds.includes(e.id);
            }

            return true;
        })
        .map(e => ({
            ...e,
            isNearby: false, 
            isPreferred: false,
            isSaved: savedEventIds.includes(e.id),
            isLive: false
        }));

    // 2. Prepare FILTERED events for the List & Badge
    const listEvents = allMapEvents.filter(e => {
        if (userLocation?.lat && userLocation?.lng && e.lat && e.lng) {
            const distance = getDistanceInMeters(userLocation.lat, userLocation.lng, e.lat, e.lng);
            const searchRadius = 5000; // Fixed 5KM Basis
            return distance <= searchRadius;
        }
        return false;
    }).map(e => ({ ...e, isNearby: true }));

    return (
        <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <InteractiveMap
                    userLocation={userLocation}
                    events={allMapEvents}
                    isLocationLive={isLocationLive}
                    className="w-full h-full"
                    filterPastEvents={mapFilter !== 'ended'}
                    onEventSelect={onEventSelect}
                    centerOnEvent={focusLocation ?? undefined}
                />
            </div>

            {/* Floating Controls (Right Side) */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 z-10">

                <button 
                    onClick={() => setShowEventList(true)}
                    className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-[#00B14F] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 border border-gray-100 dark:border-gray-700 relative"
                >
                    <List className="w-6 h-6" />
                    {listEvents.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5.5 h-5.5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 shadow-sm animate-bounce-subtle">
                            {listEvents.length}
                        </span>
                    )}
                </button>

                {/* Event Filters Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => {
                            if (!showFilterMenu) {
                                setIsPickingDate(mapFilter === 'date');
                            }
                            setShowFilterMenu(!showFilterMenu);
                        }}
                        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 border relative ${
                            mapFilter !== 'all' 
                                ? 'bg-primary-600 text-white border-primary-500' 
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700'
                        }`}
                        title="Filter Map Events"
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                        {mapFilter !== 'all' && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showFilterMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl shadow-xl p-4 z-50 space-y-3"
                            >
                                {!isPickingDate ? (
                                    <>
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Filter Events</span>
                                            {mapFilter !== 'all' && (
                                                <button 
                                                    onClick={() => {
                                                        setMapFilter('all');
                                                        setFilterDate('');
                                                        setShowFilterMenu(false);
                                                    }}
                                                    className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {[
                                                { id: 'all', label: 'All Upcoming Events', icon: <Sparkles className="w-4 h-4 text-amber-500 shrink-0" /> },
                                                { id: 'today', label: 'Today\'s Events', icon: <Calendar className="w-4 h-4 text-indigo-500 shrink-0" /> },
                                                { id: 'tomorrow', label: 'Tomorrow\'s Events', icon: <Calendar className="w-4 h-4 text-blue-500 shrink-0" /> },
                                                { id: 'date', label: 'Pick Specific Date', icon: <Clock className="w-4 h-4 text-purple-500 shrink-0" /> },
                                                { id: 'liked', label: 'Liked Events', icon: <Heart className="w-4 h-4 text-red-500 fill-current shrink-0" /> },
                                                { id: 'interested', label: 'Interested Events', icon: <Bookmark className="w-4 h-4 text-green-500 fill-current shrink-0" /> },
                                                { id: 'ended', label: 'Ended (Past) Events', icon: <History className="w-4 h-4 text-gray-500 shrink-0" /> }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        if (opt.id !== 'date') {
                                                            setMapFilter(opt.id as any);
                                                            setFilterDate('');
                                                            setShowFilterMenu(false);
                                                        } else {
                                                            setIsPickingDate(true);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                                        mapFilter === opt.id 
                                                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        {opt.icon}
                                                        <span>{opt.label}</span>
                                                    </div>
                                                    {mapFilter === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="animate-in fade-in duration-200 space-y-3">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsPickingDate(false);
                                                }}
                                                className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 uppercase tracking-wider"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" /> Back
                                            </button>
                                            <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Select Date
                                            </span>
                                        </div>

                                        {/* Custom calendar component inline */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
                                                    }}
                                                    className="p-1 hover:bg-gray-250 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <span className="text-[11px] font-bold text-gray-705 dark:text-gray-200">
                                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
                                                    }}
                                                    className="p-1 hover:bg-gray-250 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300 transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Day initials */}
                                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                                    <span key={d} className="text-[9px] font-bold text-gray-400">
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Days grid */}
                                            <div className="grid grid-cols-7 gap-1">
                                                {getDaysInMonth(currentMonth).map((day, idx) => {
                                                    if (!day) {
                                                        return <div key={`empty-${idx}`} />;
                                                    }
                                                    const dateStr = formatDateString(day);
                                                    const isSelected = filterDate === dateStr;
                                                    const isToday = formatDateString(new Date()) === dateStr;

                                                    return (
                                                        <button
                                                            key={dateStr}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFilterDate(dateStr);
                                                                setMapFilter('date');
                                                                setShowFilterMenu(false);
                                                            }}
                                                            className={`w-7 h-7 text-[10px] font-semibold flex items-center justify-center rounded-lg transition-all ${
                                                                isSelected
                                                                    ? 'bg-primary-600 text-white font-bold shadow-sm'
                                                                    : isToday
                                                                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-800'
                                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {day.getDate()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Event List Overlay */}
            <AnimatePresence>
                {showEventList && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute bottom-0 left-0 right-0 md:bottom-6 md:top-6 md:left-6 md:right-auto md:w-[420px] z-20 bg-white dark:bg-gray-900 rounded-t-[32px] md:rounded-[15px] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] md:shadow-2xl flex flex-col h-[60vh] md:h-auto md:max-h-[calc(100vh-80px)] border-t md:border border-gray-100 dark:border-gray-800"
                    >
                    <div className="p-5 pb-3 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-t-[32px] md:rounded-t-[15px] z-10">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white tracking-tight leading-none mb-1">Nearby Events</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold tracking-tight italic">
                                {listEvents.length} live events found around you
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowEventList(false)} 
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                    
                    <div className="p-4 pb-28 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                        {listEvents.length > 0 ? (
                            listEvents.map((event) => (
                                <div 
                                    key={event.id}
                                    className="relative flex gap-4 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    {/* Left Accent Bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-600 rounded-r-full" />
                                    
                                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                        <EventImage src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight truncate group-hover:text-primary-600 transition-colors">
                                                {event.name}
                                            </h4>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleSave(event.id);
                                                }}
                                                className="absolute top-3 right-3 text-gray-300 hover:text-primary-500 transition-colors"
                                            >
                                                <Bookmark size={16} fill={event.isSaved ? 'currentColor' : 'none'} className={event.isSaved ? 'text-primary-500' : ''} />
                                            </button>
                                        </div>
                                        
                                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 truncate uppercase">
                                            {event.venue}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {Array.isArray(event.category) ? event.category.slice(0, 2).map((cat, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[9px] font-semibold rounded-full border border-primary-100 dark:border-primary-800/50">
                                                    {cat}
                                                </span>
                                            )) : (
                                                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[9px] font-semibold rounded-full border border-primary-100 dark:border-primary-800/50">
                                                    {event.category}
                                                </span>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => onEventSelect(event as any)}
                                            className="mt-3 w-full py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-semibold rounded-full shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            View Event
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <MapPin size={40} className="opacity-10 mb-2" />
                                <p className="text-xs font-semibold italic tracking-tight">Watching the horizon... no events yet.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default NearbyView;
