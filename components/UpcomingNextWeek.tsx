
import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

import type { DisplayEventType } from '../types';

interface UpcomingNextWeekProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
  onViewAll?: () => void;
}

const UpcomingNextWeek: React.FC<UpcomingNextWeekProps> = ({ events, onEventSelect, onViewAll }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rolling 14-day window: today → today + 14 days (includes live events)
  const getRollingWindow = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today); // include today so live events stay visible
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const { start, end } = getRollingWindow();

  const nextWeekEvents = events.filter(event => {
    if (!event.date) return false;
    const d = new Date(event.date + 'T00:00:00');
    return d >= start && d <= end;
  });

  // Horizontal wheel scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (nextWeekEvents.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const formatDay = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
          Upcoming Events
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-all active:scale-95"
          >
            Show all
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Scrollable row */}
      <div className="relative group">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-[45%] -translate-y-1/2 -translate-x-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {nextWeekEvents.map(event => (
            <button
              key={event.id}
              onClick={() => onEventSelect(event)}
              className="flex-shrink-0 w-[148px] md:w-[168px] text-left group/card active:scale-95 transition-transform"
            >
              {/* Square image */}
              <div className={`w-full h-[148px] md:h-[168px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2 shadow-sm ${event.isLive ? 'border-2 border-red-500/50 ring-2 ring-red-500/20' : ''}`}>
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <ImageIcon size={36} />
                  </div>
                )}
              </div>
              {/* Title */}
              <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 leading-tight group-hover/card:text-primary-600 dark:group-hover/card:text-primary-400 transition-colors">
                {event.name}
              </p>
              {/* Day */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {formatDay(event.date)}
              </p>
            </button>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-[45%] -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpcomingNextWeek;
