import React, { useState } from 'react';
import InteractiveMap from './InteractiveMap';
import EventList from './EventList';
import type { EventType, DisplayEventType } from '../types';
import { Navigation, Layers, List, X, MapPin, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NearbyViewProps {
    userLocation: { lat: number; lng: number; accuracy?: number };
    events: EventType[];
    isLocationLive: boolean;
    onOpenScanner: () => void;
    onEventSelect: (event: EventType) => void;
    onToggleSave: (eventId: string) => void;
}

const NearbyView: React.FC<NearbyViewProps> = ({ userLocation, events, isLocationLive, onEventSelect, onToggleSave, onOpenScanner }) => {
    const [showEventList, setShowEventList] = useState(false);

    // Map events to DisplayEventType and filter for nearby
    const nearbyEvents: DisplayEventType[] = events
        .filter(e => {
            const isPublished = e.status === 'published' || !e.status;
            const isScheduled = e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now();
            return isPublished || isScheduled;
        })
        .map(e => ({
            ...e,
            isNearby: true, // We'll treat them as nearby for this view
            isPreferred: false,
            isSaved: false,
            isLive: false
        }));

    return (
        <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <InteractiveMap 
                    userLocation={userLocation} 
                    events={nearbyEvents} 
                    isLocationLive={isLocationLive} 
                    className="w-full h-full" 
                    filterPastEvents={true} 
                />
            </div>

            {/* Floating Controls (Right Side) */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 z-10">

                <button 
                    onClick={() => setShowEventList(true)}
                    className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-[#00B14F] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105 active:scale-95 border border-gray-100 dark:border-gray-700 relative"
                >
                    <List className="w-6 h-6" />
                    {nearbyEvents.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5.5 h-5.5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 shadow-sm animate-bounce-subtle">
                            {nearbyEvents.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Event List Overlay */}
            <AnimatePresence>
                {showEventList && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute bottom-0 left-0 right-0 md:bottom-6 md:top-6 md:left-6 md:right-auto md:w-[420px] z-20 bg-white dark:bg-gray-900 rounded-t-[32px] md:rounded-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] md:shadow-2xl flex flex-col h-[60vh] md:h-auto md:max-h-[calc(100vh-80px)] border-t md:border border-gray-100 dark:border-gray-800"
                    >
                    <div className="p-5 pb-3 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-t-[32px] md:rounded-t-3xl z-10">
                        <div>
                            <h3 className="font-black text-lg text-gray-900 dark:text-white tracking-tight leading-none mb-1">Nearby Events</h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-extrabold tracking-tight italic">
                                {nearbyEvents.length} live events found around you
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowEventList(false)} 
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                        {nearbyEvents.length > 0 ? (
                            nearbyEvents.map((event) => (
                                <div 
                                    key={event.id}
                                    className="relative flex gap-4 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    {/* Left Accent Bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-600 rounded-r-full" />
                                    
                                    {/* Event Image */}
                                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                        {event.imageUrl ? (
                                            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <MapPin size={24} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight truncate group-hover:text-primary-600 transition-colors">
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
                                        
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 truncate uppercase">
                                            {event.venue}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {Array.isArray(event.category) ? event.category.slice(0, 2).map((cat, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[9px] font-black rounded-full border border-primary-100 dark:border-primary-800/50">
                                                    {cat}
                                                </span>
                                            )) : (
                                                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[9px] font-black rounded-full border border-primary-100 dark:border-primary-800/50">
                                                    {event.category}
                                                </span>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => onEventSelect(event as any)}
                                            className="mt-3 w-full py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black rounded-full shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                        >
                                            View Event
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <MapPin size={40} className="opacity-10 mb-2" />
                                <p className="text-xs font-bold italic tracking-tight">Watching the horizon... no events yet.</p>
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
