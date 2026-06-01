import React from 'react';
import type { DisplayEventType } from '../types';
import { formatDisplayDate } from '../constants';

interface HighlightsSliderProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

// Each entry stores the Tailwind gradient class + the "to" hex used for the bottom fade overlay
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

// Different circle layouts per card slot so each card looks distinct
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

const HighlightsSlider: React.FC<HighlightsSliderProps> = ({ events, onEventSelect }) => {
  const highlights = events.filter(e => e.imageUrl).slice(0, 5);

  if (highlights.length === 0) return null;

  return (
    <div className="w-full">
      {/* Mobile: horizontal scroll | Desktop: grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:overflow-visible md:snap-none">
        {highlights.map((event, index) => {
          const firstCategory = Array.isArray(event.category) ? event.category[0] : event.category;
          const style = CATEGORY_STYLES[firstCategory] ?? FALLBACK_STYLES[index % FALLBACK_STYLES.length];
          const circles = CIRCLE_LAYOUTS[index % CIRCLE_LAYOUTS.length];
          const subtitle = event.venue
            ? `${event.venue} • ${formatDisplayDate(event.date, event.endDate)}`
            : formatDisplayDate(event.date, event.endDate);

          return (
            <div
              key={event.id || index}
              className={`relative snap-start flex-shrink-0 w-[72vw] sm:w-[44vw] md:flex-1 md:min-w-0 md:w-auto flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${style.gradient}`}
              style={{ minHeight: '300px' }}
              onClick={() => onEventSelect(event)}
            >
              {/* Glassy circle decorations */}
              {circles.map((c, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: c.width,
                    height: c.height,
                    top: c.top,
                    ...(('right' in c) ? { right: (c as any).right } : { left: (c as any).left }),
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(2px)',
                  }}
                />
              ))}

              {/* Title & subtitle */}
              <div className="relative z-10 p-5 pb-3 flex-shrink-0">
                <h3 className="text-white font-bold text-[17px] leading-snug mb-2 line-clamp-2">
                  {event.name}
                </h3>
                <p className="text-white/75 text-[13px] leading-snug line-clamp-2">
                  {subtitle}
                </p>
              </div>

              {/* Cover photo frame */}
              <div className="relative z-10 px-4 pb-0 flex-1 flex flex-col justify-end min-h-0">
                <div className="rounded-t-xl overflow-hidden flex flex-col" style={{ height: '170px' }}>
                  {/* Window chrome bar */}
                  <div
                    className="flex items-center gap-1.5 px-3 shrink-0"
                    style={{ height: '24px', background: 'rgba(0,0,0,0.25)' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                  </div>

                  {/* Image */}
                  <div className="relative flex-1 overflow-hidden">
                    <img
                      src={event.imageUrl || undefined}
                      alt={event.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Bottom gradient fade — matches the card's color */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                      style={{ background: `linear-gradient(to top, ${style.fadeColor}, transparent)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HighlightsSlider;
