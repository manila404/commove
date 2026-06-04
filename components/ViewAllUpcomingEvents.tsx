import React, { useState, useMemo } from 'react';
import { Search, Image as ImageIcon, CalendarDays } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { smartSearchEvents } from '../utils/searchUtils';

interface ViewAllUpcomingEventsProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
  onToggleSave: (eventId: string) => void;
}

const formatDay = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const ViewAllUpcomingEvents: React.FC<ViewAllUpcomingEventsProps> = ({
  events,
  onEventSelect,
}) => {
  const [search, setSearch] = useState('');

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today); // include today so live events stay visible
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    end.setHours(23, 59, 59, 999);

    let filtered = events.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T00:00:00');
      return d >= start && d <= end;
    });

    if (search.trim()) {
      filtered = smartSearchEvents(filtered, search);
    } else {
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return filtered;
  }, [events, search]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-24">

      {/* ── Hero Banner ── */}
      <div className="px-4 md:px-8 pt-4 pb-2 max-w-[1400px] mx-auto">
        <div
          className="relative rounded-2xl overflow-hidden px-8 py-7"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #facc15 75%, #fef08a 100%)' }}
        >
          {/* Glassy floating circles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-40 h-40 rounded-full top-[-30px] left-[30%]"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }} />
            <div className="absolute w-24 h-24 rounded-full top-[10px] left-[48%]"
              style={{ background: 'rgba(167,139,250,0.35)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }} />
            <div className="absolute w-52 h-52 rounded-full top-[-40px] right-[-20px]"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }} />
            <div className="absolute w-20 h-20 rounded-full bottom-[-15px] right-[18%]"
              style={{ background: 'rgba(196,181,253,0.4)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }} />
            <div className="absolute w-14 h-14 rounded-full top-[20px] right-[35%]"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }} />
          </div>

          {/* Text */}
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
              Upcoming Events
            </h2>
            <p className="text-white/80 text-sm mt-1 max-w-md">
              Stay ahead — browse events happening in the next 14 days and never miss a moment in Bacoor.
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 md:px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Next 14 days · {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-primary-400 dark:focus:border-primary-600 rounded-xl outline-none w-full sm:w-56 text-gray-800 dark:text-white placeholder-gray-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6">
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-base font-semibold text-gray-500 dark:text-gray-400">
              {search ? 'No events match your search' : 'No upcoming events in the next 14 days'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {upcomingEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onEventSelect(event)}
                className="flex-shrink-0 text-left group/card active:scale-95 transition-transform"
              >
                {/* Square image — identical to strip */}
                <div className={`w-full h-0 pb-[100%] relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2 shadow-sm ${event.isLive ? 'border-2 border-red-500/50 ring-2 ring-red-500/20' : ''}`}>
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <ImageIcon size={36} />
                    </div>
                  )}
                </div>
                {/* Title */}
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover/card:text-primary-600 dark:group-hover/card:text-primary-400 transition-colors">
                  {event.name}
                </p>
                {/* Date */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {formatDay(event.date)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllUpcomingEvents;
