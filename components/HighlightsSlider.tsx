import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatDisplayDate } from '../constants';

interface HighlightsSliderProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

const CATEGORY_STYLES: Record<string, { gradient: string; fadeColor: string }> = {
  'Conference':           { gradient: 'from-[#60a5fa] to-[#3b82f6]', fadeColor: '#3b82f6' },
  'Sports':               { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
  'Business':             { gradient: 'from-[#64748b] to-[#475569]', fadeColor: '#475569' },
  'Social Welfare':       { gradient: 'from-[#38bdf8] to-[#0ea5e9]', fadeColor: '#0ea5e9' },
  'Health and Wellness':  { gradient: 'from-[#c084fc] to-[#a855f7]', fadeColor: '#a855f7' },
  'Concerts':             { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
  'Workshop':             { gradient: 'from-[#fb923c] to-[#f97316]', fadeColor: '#f97316' },
  'Government Services':  { gradient: 'from-[#fbbf24] to-[#f59e0b]', fadeColor: '#f59e0b' },
  'Civil Registry':       { gradient: 'from-[#f87171] to-[#ef4444]', fadeColor: '#ef4444' },
  'Community Services':   { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
  'Recreation':           { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
};

const FALLBACK_STYLES = [
  { gradient: 'from-[#60a5fa] to-[#3b82f6]', fadeColor: '#3b82f6' },
  { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
  { gradient: 'from-[#818cf8] to-[#6366f1]', fadeColor: '#6366f1' },
  { gradient: 'from-[#fb923c] to-[#f97316]', fadeColor: '#f97316' },
  { gradient: 'from-[#c084fc] to-[#a855f7]', fadeColor: '#a855f7' },
];

const CIRCLE_LAYOUTS = [
  [
    { width: 110, height: 110, top: -30, right: -20 },
    { width:  70, height:  70, top:  30, right:  30 },
    { width:  40, height:  40, top:  55, right:  10 },
  ],
  [
    { width: 100, height: 100, top: -25, left: -15 },
    { width:  55, height:  55, top:  25, right:  20 },
    { width:  35, height:  35, top:  60, left:  20 },
  ],
  [
    { width:  90, height:  90, top: -20, right: -10 },
    { width:  60, height:  60, top:  40, left:  -5 },
    { width:  45, height:  45, top:  10, right:  35 },
  ],
  [
    { width: 105, height: 105, top: -28, left: -18 },
    { width:  65, height:  65, top:  35, right:  15 },
    { width:  38, height:  38, top:  55, left:  30 },
  ],
  [
    { width:  95, height:  95, top: -22, right: -12 },
    { width:  58, height:  58, top:  28, left:  10 },
    { width:  42, height:  42, top:  50, right:  28 },
  ],
];

const PER_PAGE = 4;

const EventCard: React.FC<{
  event: DisplayEventType;
  index: number;
  onEventSelect: (e: DisplayEventType) => void;
}> = ({ event, index, onEventSelect }) => {
  const firstCategory = Array.isArray(event.category) ? event.category[0] : event.category;
  const style = CATEGORY_STYLES[firstCategory] ?? FALLBACK_STYLES[index % FALLBACK_STYLES.length];
  const circles = CIRCLE_LAYOUTS[index % CIRCLE_LAYOUTS.length];
  const subtitle = event.venue
    ? `${event.venue} • ${formatDisplayDate(event.date, event.endDate)}`
    : formatDisplayDate(event.date, event.endDate);

  return (
    <div
      className={`relative flex-shrink-0 w-full flex flex-col rounded-2xl overflow-hidden cursor-pointer group/card transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:brightness-110 bg-gradient-to-br ${style.gradient}`}
      style={{ minHeight: '300px' }}
      onClick={() => onEventSelect(event)}
    >
      {circles.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: c.width, height: c.height, top: c.top,
            ...(('right' in c) ? { right: (c as any).right } : { left: (c as any).left }),
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(2px)',
          }}
        />
      ))}
      <div className="relative z-10 p-5 pb-3 flex-shrink-0">
        <h3 className="text-white font-bold text-[17px] leading-snug mb-2 line-clamp-2">{event.name}</h3>
        <p className="text-white/75 text-[13px] leading-snug line-clamp-2">{subtitle}</p>
      </div>
      <div className="relative z-10 px-4 pb-0 flex-1 flex flex-col justify-end min-h-0">
        <div className="rounded-t-xl overflow-hidden flex flex-col" style={{ height: '170px' }}>
          <div className="flex items-center gap-1.5 px-3 shrink-0" style={{ height: '24px', background: 'rgba(0,0,0,0.25)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
          </div>
          <div className="relative flex-1 overflow-hidden">
            <img src={event.imageUrl || undefined} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" referrerPolicy="no-referrer" />
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: `linear-gradient(to top, ${style.fadeColor}, transparent)` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const HighlightsSlider: React.FC<HighlightsSliderProps> = ({ events, onEventSelect }) => {
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopViewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const wheelAccum = useRef<number>(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(0);

  const highlights = events.filter(e => e.imageUrl);
  const totalPages = Math.ceil(highlights.length / PER_PAGE);

  // Reset page if highlights change
  useEffect(() => { setPage(0); }, [highlights.length]);

  // Mobile: vertical wheel → horizontal scroll
  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Desktop: laptop touchpad horizontal swipe (deltaX wheel events) → page change
  useEffect(() => {
    const el = desktopViewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 5) return; // ignore vertical-only scrolls
      e.preventDefault();
      wheelAccum.current += e.deltaX;
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => { wheelAccum.current = 0; }, 300);
      if (wheelAccum.current > 80) {
        wheelAccum.current = 0;
        setPage(p => Math.min(totalPages - 1, p + 1));
      } else if (wheelAccum.current < -80) {
        wheelAccum.current = 0;
        setPage(p => Math.max(0, p - 1));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, [totalPages]);

  if (highlights.length === 0) return null;

  return (
    <div className="w-full">
      {/* Section header — title left, arrows right (desktop only) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-semibold md:font-bold text-gray-900 dark:text-white">
          Highlights
        </h2>
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── MOBILE: horizontal scroll ── */}
      <div
        ref={mobileScrollRef}
        className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {highlights.map((event, index) => (
          <div key={event.id || index} className="snap-start flex-shrink-0 w-[72vw] sm:w-[44vw]">
            <EventCard event={event} index={index} onEventSelect={onEventSelect} />
          </div>
        ))}
      </div>

      {/* ── DESKTOP: paginated 4-per-page grid with slide ── */}
      <div className="hidden md:block">

        {/* Slide viewport — touchpad swipe + touch swipe + buttons */}
        <div
          ref={desktopViewportRef}
          className="overflow-x-clip overflow-y-visible pb-2"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (diff > 50) setPage(p => Math.min(totalPages - 1, p + 1));
            else if (diff < -50) setPage(p => Math.max(0, p - 1));
          }}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {/* Each "page" is exactly 100% of the viewport width */}
            {Array.from({ length: totalPages }).map((_, pageIdx) => (
              <div
                key={pageIdx}
                className="flex-shrink-0 w-full grid grid-cols-4 gap-4"
              >
                {highlights
                  .slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE)
                  .map((event, i) => (
                    <EventCard
                      key={event.id || i}
                      event={event}
                      index={pageIdx * PER_PAGE + i}
                      onEventSelect={onEventSelect}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-primary-600' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HighlightsSlider;
