import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Flame,
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
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 tracking-tight uppercase">
          <Clock size={14} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
          {event.startTime ? (
            <span className="flex items-center">
              {formatTime(event.startTime)}
              {event.endTime && <span className="mx-1 text-gray-300 dark:text-gray-600">—</span>}
              {event.endTime && formatTime(event.endTime)}
            </span>
          ) : 'All Day'}
        </div>

        <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white line-clamp-1 mb-1 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
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
              <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 bg-white rounded-full" /> Live
              </span>
            )}
            {(event.approvedCount || 0) > 10 && (
              <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter border border-primary-100 dark:border-primary-800/50">
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

const ViewAllPopularEvents: React.FC<ViewAllPopularEventsProps> = ({
  events,
  onBack,
  onEventSelect,
}) => {
  const [search, setSearch] = useState('');

  // Group events by date
  const groupedEvents = useMemo(() => {
    let filtered = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
      );
    }

    const groups: Record<string, DisplayEventType[]> = {};
    filtered.forEach(event => {
      if (!groups[event.date]) groups[event.date] = [];
      groups[event.date].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [events, search]);

  return (
    <div className="min-h-screen bg-[#FDFDFF] dark:bg-gray-950 transition-colors duration-300 pb-32">
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

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="w-full px-3 sm:px-4 md:px-6 pt-3 md:pt-4 mb-8">
        <div className="relative rounded-[15px] border border-gray-100/20 dark:border-white/5 overflow-hidden min-h-[280px] md:min-h-[320px] flex items-end max-w-[1600px] mx-auto group/hero">
          <img
            src="/bacoor_hero.jpg"
            alt="Bacoor City"
            className="absolute inset-0 w-full h-full object-cover object-center group-hover/hero:scale-105 transition-transform duration-[20s] ease-out"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 80%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 80%, transparent 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent z-[2]" />

          <div className="relative z-10 w-full px-8 md:px-14 pb-10 md:pb-12 pt-24 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/20 backdrop-blur-md rounded-full border border-primary-400/30 mb-4">
              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-primary-100 uppercase tracking-widest">Trending Now</span>
            </div>
            <h1 className="text-4xl md:text-6xl leading-[1] font-black mb-4 tracking-tighter text-white">
              Discover <br />
              <span className="bg-gradient-to-r from-primary-400 via-indigo-400 to-primary-300 bg-clip-text text-transparent">
                BACOOR
              </span>
            </h1>
            <p className="text-white/60 text-sm md:text-base max-w-md leading-relaxed font-semibold">
              Your gateway to the most anticipated <br className="hidden md:block" /> city gatherings and local festivities.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4">
        {/* ── TIMELINE ──────────────────────────────────────────────── */}
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              Events
            </h2>

            <div className="relative group/search">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-primary-500 transition-colors" />
              <input
                type="text"
                placeholder="Find an event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 w-full md:w-64 transition-all shadow-sm border outline-none"
              />
            </div>
          </div>

          {groupedEvents.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-400 font-black italic tracking-wide uppercase opacity-60">No events discovered yet</p>
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
