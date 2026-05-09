
import React from 'react';
import { ChevronRight, Calendar, MapPin, Flame, Clock } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatTime } from '../constants';

interface PopularEventsProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
  onViewAll?: () => void;
}

const PopularEvents: React.FC<PopularEventsProps> = ({ events, onEventSelect, onViewAll }) => {
  // Sort by approvedCount desc, then recency
  const sortedEvents = [...events].sort((a, b) => {
    const aCount = a.approvedCount || 0;
    const bCount = b.approvedCount || 0;
    if (bCount !== aCount) return bCount - aCount;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Max 6 events — 3 columns × 2 rows
  const popularEvents = sortedEvents.slice(0, 6);

  if (popularEvents.length === 0) return null;

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Popular Events</h2>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">Bacoor</p>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-all active:scale-95">
          View All
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── MOBILE: horizontal swipe, 2 rows per page ── */}
      <div className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
           style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {Array.from({ length: Math.ceil(popularEvents.length / 2) }, (_, pageIdx) => {
          const pair = popularEvents.slice(pageIdx * 2, pageIdx * 2 + 2);
          return (
            <div key={pageIdx} className="snap-start flex-shrink-0 w-[85vw] flex flex-col gap-3">
              {pair.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="flex items-center gap-3 text-left w-full active:scale-95 transition-transform group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 group-hover:scale-105 transition-transform">
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-400">
                        <Calendar size={24} />
                      </div>
                    )}
                    {(event.approvedCount || 0) > 0 && (
                      <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Flame size={8} className="text-orange-400" />
                        {event.approvedCount}
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-1">
                      <Calendar size={10} className="text-primary-500" />
                      {formatShortDate(event.date)}
                      {event.startTime && (
                        <span className="flex items-center gap-0.5 ml-1">
                          <Clock size={10} className="text-primary-500" />
                          {formatTime(event.startTime)}
                        </span>
                      )}
                    </p>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors">
                      {event.name}
                    </h3>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate font-medium">
                      <MapPin size={11} className="text-red-500 flex-shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: 3-col × 2-row grid ── */}
      <div className="hidden md:grid grid-cols-3 gap-x-6 gap-y-0">
        {popularEvents.map((event, idx) => (
          <button
            key={event.id}
            onClick={() => onEventSelect(event)}
            className={`flex items-center gap-3 text-left w-full py-4 transition-all group
              ${idx < popularEvents.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
          >
            {/* Thumbnail */}
            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 border border-gray-50 dark:border-gray-600 group-hover:scale-105 transition-transform">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                  <Calendar size={24} />
                </div>
              )}
              {(event.approvedCount || 0) > 0 && (
                <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                  <Flame size={8} className="text-orange-400" />
                  {event.approvedCount}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1">
                <Calendar size={11} className="text-primary-500" />
                <span>{formatShortDate(event.date)}</span>
              </div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors leading-snug">
                {event.name}
              </h3>
              <div className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 font-medium">
                <MapPin size={11} className="flex-shrink-0 text-red-500" />
                <span className="truncate">{event.venue}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PopularEvents;
