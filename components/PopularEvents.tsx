
import React from 'react';
import { ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatTime } from '../constants';

interface PopularEventsProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
  onViewAll?: () => void;
}

const safeNum = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };

const popularityScore = (e: DisplayEventType): number =>
  safeNum(e.likeCount)       * 3   +
  safeNum(e.saveCount)       * 2.5 +
  safeNum(e.interestedCount) * 2   +
  safeNum(e.checkInCount)    * 1.5 +
  safeNum(e.approvedCount)   * 1   +
  safeNum(e.viewCount)       * 0.1;

const PopularEvents: React.FC<PopularEventsProps> = ({ events, onEventSelect, onViewAll }) => {
  const scored = events
    .map(e => ({ e, score: popularityScore(e) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const popularEvents = scored.slice(0, 6).map(({ e }) => e);

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Popular Events</h2>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">Bacoor</p>
        </div>
        {popularEvents.length > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-all active:scale-95">
            View All <ChevronRight size={14} />
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

      {/* ── MOBILE: horizontal swipe, 2 rows per page ── */}
      {popularEvents.length > 0 && (
        <div className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {Array.from({ length: Math.ceil(popularEvents.length / 2) }, (_, pageIdx) => {
            const pair = popularEvents.slice(pageIdx * 2, pageIdx * 2 + 2);
            return (
              <div key={pageIdx} className="snap-start flex-shrink-0 w-[85vw] flex flex-col gap-3">
                {pair.map(event => (
                  <button key={event.id} onClick={() => onEventSelect(event)}
                    className="flex items-center gap-3 text-left w-full active:scale-95 transition-transform group">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 group-hover:scale-105 transition-transform">
                      {event.imageUrl
                        ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-full h-full flex items-center justify-center text-primary-400"><Calendar size={24} /></div>}
                      {event.isLive && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {event.isLive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-wide mb-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Happening Now
                        </span>
                      ) : (
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                          {formatShortDate(event.date)}{event.startTime && <span className="ml-1">{formatTime(event.startTime)}</span>}
                        </p>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-primary-600 transition-colors">{event.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">{event.venue}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DESKTOP: 3-col × 2-row grid ── */}
      {popularEvents.length > 0 && (
        <div className="hidden md:grid grid-cols-3 gap-x-6 gap-y-0">
          {popularEvents.map((event, idx) => (
            <button key={event.id} onClick={() => onEventSelect(event)}
              className={`flex items-center gap-3 text-left w-full py-4 transition-all group ${idx < popularEvents.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 border border-gray-50 dark:border-gray-600 group-hover:scale-105 transition-transform">
                {event.imageUrl
                  ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center bg-primary-50 dark:bg-primary-900/20 text-primary-500"><Calendar size={24} /></div>}
                {event.isLive && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {event.isLive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-wide mb-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Happening Now
                  </span>
                ) : (
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{formatShortDate(event.date)}</p>
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors leading-snug">{event.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{event.venue}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularEvents;
