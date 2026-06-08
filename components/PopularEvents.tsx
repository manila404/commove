
import React from 'react';
import { ChevronRight, TrendingUp, Flame } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatTime, EventImage } from '../constants';

interface PopularEventsProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
  onViewAll?: () => void;
  /** When true (inside the side-by-side panel) only shows top 3 in a list */
  compact?: boolean;
}

const safeNum = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };

const popularityScore = (e: DisplayEventType): number =>
  safeNum(e.likeCount)       * 3   +
  safeNum(e.saveCount)       * 2.5 +
  safeNum(e.interestedCount) * 2   +
  safeNum(e.checkInCount)    * 1.5 +
  safeNum(e.approvedCount)   * 1   +
  safeNum(e.viewCount)       * 0.1;

const RANK_COLORS = [
  'from-amber-400 to-orange-500',   // 🥇
  'from-slate-400 to-slate-500',    // 🥈
  'from-amber-700 to-amber-800',    // 🥉
];

const PopularEvents: React.FC<PopularEventsProps> = ({ events, onEventSelect, onViewAll }) => {
  const scored = events
    .map(e => ({ e, score: popularityScore(e) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Always show top 3 in this component (used in the side-by-side layout)
  const popularEvents = scored.slice(0, 3).map(({ e }) => e);

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Flame size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white tracking-tight leading-none">
              Popular Events
            </h2>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Trending in Bacoor</p>
          </div>
        </div>
        {popularEvents.length > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
          >
            See All <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Empty state */}
      {popularEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">No popular events yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Events residents like and save will appear here.</p>
          </div>
        </div>
      )}

      {/* Top-3 list — same clean design for both mobile and desktop */}
      {popularEvents.length > 0 && (
        <div className="space-y-1">
          {popularEvents.map((event, idx) => (
            <button
              key={event.id}
              onClick={() => onEventSelect(event)}
              className="flex items-center gap-3 text-left w-full p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.98] transition-all group"
            >
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${RANK_COLORS[idx]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <span className="text-white text-[11px] font-black">{idx + 1}</span>
              </div>

              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 group-hover:scale-105 transition-transform">
                <EventImage src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {event.isLive && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {event.isLive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-wide mb-0.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Live Now
                  </span>
                ) : (
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-0.5 truncate">
                    {formatShortDate(event.date)}{event.startTime && <span className="ml-1">{formatTime(event.startTime)}</span>}
                  </p>
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
                  {event.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-medium mt-0.5">{event.venue}</p>
              </div>

              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-primary-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Divider hint if exactly 3 shown */}
      {popularEvents.length === 3 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
        >
          View all popular events →
        </button>
      )}
    </div>
  );
};

export default PopularEvents;
