import React, { useState, useEffect, useRef } from 'react';
import type { EventType, DisplayEventType } from '../types';
import { LocationIcon, CalendarIcon, ClockIcon, BookmarkIcon } from '../constants';

interface TikTokEventFeedProps {
    events: DisplayEventType[];
    onEventSelect: (event: EventType) => void;
    onToggleSave: (eventId: string) => void;
    userLocation: { lat: number; lng: number; accuracy?: number };
}

const TikTokEventFeed: React.FC<TikTokEventFeedProps> = ({ events, onEventSelect, onToggleSave, userLocation }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                const scrollPosition = containerRef.current.scrollTop;
                const windowHeight = window.innerHeight;
                const newIndex = Math.round(scrollPosition / windowHeight);
                if (newIndex !== activeIndex) {
                    setActiveIndex(newIndex);
                }
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [activeIndex]);

    if (events.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-black text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">No Events Found</h2>
                    <p className="text-gray-400">Check back later for more events.</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="h-[calc(100vh-64px)] w-full overflow-y-scroll snap-y snap-mandatory bg-black"
            style={{ scrollBehavior: 'smooth' }}
        >
            {events.map((event, index) => (
                <div 
                    key={event.id} 
                    className="h-[calc(100vh-64px)] w-full snap-start relative flex flex-col"
                >
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={event.imageUrl || undefined} 
                            alt={event.name} 
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
                    </div>

                    {/* Content Overlay */}
                    <div className="relative z-10 flex flex-col justify-end h-full p-6 pb-20 text-white">
                        {event.isLive && (
                            <div className="mb-4 inline-flex items-center bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse self-start backdrop-blur-sm">
                                <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                                Happening Now
                            </div>
                        )}
                        
                        <h2 className="text-3xl md:text-4xl font-bold mb-2 text-shadow-lg">{event.name}</h2>
                        
                        <div className="flex items-center gap-2 mb-4 text-sm md:text-base text-gray-200">
                            <LocationIcon className="w-4 h-4" />
                            <span className="truncate">{event.venue}, {event.city}</span>
                            {event.distance && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm">
                                    {(event.distance / 1000).toFixed(1)} km
                                </span>
                            )}
                        </div>

                        <p className="text-sm md:text-base text-gray-300 line-clamp-3 mb-6">
                            {event.description}
                        </p>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => onEventSelect(event)}
                                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg"
                            >
                                View Details
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSave(event.id);
                                }}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors"
                            >
                                <BookmarkIcon className="w-6 h-6" filled={event.isSaved} />
                            </button>
                        </div>
                    </div>

                    {/* Right Side Actions (TikTok style) */}
                    <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-6 items-center">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave(event.id);
                            }}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
                                <BookmarkIcon className="w-6 h-6 text-white" filled={event.isSaved} />
                            </div>
                            <span className="text-xs text-white font-medium drop-shadow-md">Save</span>
                        </button>
                        
                        <button 
                            onClick={() => onEventSelect(event)}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
                                <CalendarIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs text-white font-medium drop-shadow-md">Details</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TikTokEventFeed;
