import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Search,
  X,
  TrendingUp,
  Mail,
  Navigation,
} from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatTime } from '../constants';
import { smartSearchEvents } from '../utils/searchUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ViewAllPopularEventsProps {
  events: DisplayEventType[];
  onBack: () => void;
  onEventSelect: (event: DisplayEventType) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateHeader = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return { label: 'Today', day: date.toLocaleDateString('en-US', { weekday: 'long' }) };
  if (date.toDateString() === tomorrow.toDateString()) return { label: 'Tomorrow', day: date.toLocaleDateString('en-US', { weekday: 'long' }) };

  return {
    label: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    day: date.toLocaleDateString('en-US', { weekday: 'long' })
  };
};

// ─── Horizontal Event Card ───────────────────────────────────────────────────

const HorizontalEventCard: React.FC<{
  event: DisplayEventType;
  onSelect: (e: DisplayEventType) => void;
}> = ({ event, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(event)}
      className="group w-full text-left bg-white/80 dark:bg-gray-800/60 backdrop-blur-md rounded-[15px] p-3 md:p-4 border border-gray-100 dark:border-gray-700/50 hover:border-primary-400 dark:hover:border-primary-500/50 transition-all duration-500 flex gap-4 items-center relative overflow-hidden"
    >
      {/* Dynamic accent background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content Side */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 tracking-tight uppercase">
          <Clock size={14} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
          {event.startTime ? (
            <span className="flex items-center">
              {formatTime(event.startTime)}
              {event.endTime && <span className="mx-1 text-gray-300 dark:text-gray-600">—</span>}
              {event.endTime && formatTime(event.endTime)}
            </span>
          ) : 'All Day'}
        </div>

        <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
          {event.name}
        </h3>

        <div className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400 font-medium opacity-80">
          <MapPin size={12} className="text-red-500" strokeWidth={2.5} />
          <span className="truncate">{event.venue}</span>
        </div>

        {/* Badges */}
        {(event.isLive || (event.approvedCount || 0) > 10) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {event.isLive && (
              <span className="bg-red-500 text-white text-[8px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-tighter animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 bg-white rounded-full" /> Live
              </span>
            )}
            {(event.approvedCount || 0) > 10 && (
              <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[8px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-tighter border border-primary-100 dark:border-primary-800/50">
                Trending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Image Side */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 relative z-10 transition-shadow">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Calendar size={24} />
          </div>
        )}
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const safeNum = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };
const popularityScore = (e: DisplayEventType): number =>
  safeNum(e.likeCount)       * 3   +
  safeNum(e.saveCount)       * 2.5 +
  safeNum(e.interestedCount) * 2   +
  safeNum(e.checkInCount)    * 1.5 +
  safeNum(e.approvedCount)   * 1   +
  safeNum(e.viewCount)       * 0.1;

const ViewAllPopularEvents: React.FC<ViewAllPopularEventsProps> = ({
  events,
  onBack,
  onEventSelect,
}) => {
  const [search, setSearch] = useState('');

  // Only show events with real engagement, sorted by popularity within each day
  const groupedEvents = useMemo(() => {
    const popular = events.filter(e => popularityScore(e) > 0);

    let filtered = [...popular].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (search.trim()) {
      filtered = smartSearchEvents(filtered, search);
    }

    const groups: Record<string, DisplayEventType[]> = {};
    filtered.forEach(event => {
      if (!groups[event.date]) groups[event.date] = [];
      groups[event.date].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [events, search]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 pb-32 pt-4">
      <style>{`
        @keyframes timelinePulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        .date-marker-pulse {
          animation: timelinePulse 2.5s infinite;
        }
      `}</style>


      {/* ── Glassy Banner ── */}
      <div className="px-3 sm:px-4 md:px-6 mb-8 max-w-[1600px] mx-auto">
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
            <h2 className="text-xl md:text-2xl font-semibold text-white leading-tight">
              Popular Events
            </h2>
            <p className="text-white/80 text-sm mt-1 max-w-md">
              The most liked, saved, and talked-about events in Bacoor — curated by the community.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* ── TIMELINE ──────────────────────────────────────────────── */}
        <div className="relative">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Events
            </h2>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Find an event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-primary-400 dark:focus:border-primary-600 rounded-full text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none w-56 md:w-72 transition-all"
              />
            </div>
          </div>

          {groupedEvents.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-400 font-semibold italic tracking-wide uppercase opacity-60">No events discovered yet</p>
            </div>
          ) : (
            <div className="space-y-6 relative">
              {/* Enhanced Glowing Timeline Line */}
              <div className="absolute left-[8px] top-8 bottom-8 w-[4px] bg-gray-100 dark:bg-gray-800/50 rounded-full" />
              <div className="absolute left-[8px] top-8 bottom-8 w-[4px] bg-gradient-to-b from-primary-600 via-primary-400/50 to-transparent rounded-full opacity-30 shadow-[0_0_15px_rgba(139,92,246,0.3)]" />

              {groupedEvents.map(([date, events]) => {
                const header = formatDateHeader(date);
                return (
                  <div key={date} className="relative pl-12">
                    {/* Enhanced Pulsing Date Marker */}
                    <div className="absolute left-[-2px] top-1.5 w-5 h-5 bg-primary-600 border-[5px] border-white dark:border-gray-950 rounded-full z-10 shadow-xl date-marker-pulse" />

                    <div className="flex flex-col mb-2 group/header">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-medium text-gray-900 dark:text-white group-hover/header:text-primary-600 transition-colors">{header.label}</span>
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{header.day}</span>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-gray-100 dark:from-gray-800 to-transparent opacity-50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {events.map(event => (
                        <HorizontalEventCard key={event.id} event={event} onSelect={onEventSelect} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAllPopularEvents;
