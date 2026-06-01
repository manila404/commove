import React from 'react';
import type { DisplayEventType } from '../types';
import { formatDisplayDate } from '../constants';

interface HighlightsSliderProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

const CARD_STYLES = [
  { bg: '#0d9488', shadow: 'rgba(13,148,136,0.4)' },
  { bg: '#be185d', shadow: 'rgba(190,24,93,0.4)' },
  { bg: '#d97706', shadow: 'rgba(217,119,6,0.4)' },
  { bg: '#1d4ed8', shadow: 'rgba(29,78,216,0.4)' },
  { bg: '#7c3aed', shadow: 'rgba(124,58,237,0.4)' },
];

const HighlightsSlider: React.FC<HighlightsSliderProps> = ({ events, onEventSelect }) => {
  const highlights = events.filter(e => e.imageUrl).slice(0, 5);

  if (highlights.length === 0) return null;

  return (
    <div className="w-full">
      {/* Mobile: horizontal scroll | Desktop: grid */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:snap-none">
        {highlights.map((event, index) => {
          const style = CARD_STYLES[index % CARD_STYLES.length];
          const subtitle = event.venue
            ? `${event.venue} • ${formatDisplayDate(event.date, event.endDate)}`
            : formatDisplayDate(event.date, event.endDate);

          return (
            <div
              key={event.id || index}
              className="snap-start flex-shrink-0 w-[72vw] sm:w-[44vw] md:w-auto flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: style.bg,
                boxShadow: `0 8px 24px ${style.shadow}`,
                minHeight: '300px',
              }}
              onClick={() => onEventSelect(event)}
            >
              {/* Title & subtitle */}
              <div className="p-5 pb-3 flex-shrink-0">
                <h3 className="text-white font-bold text-[17px] leading-snug mb-2 line-clamp-2">
                  {event.name}
                </h3>
                <p className="text-white/75 text-[13px] leading-snug line-clamp-2">
                  {subtitle}
                </p>
              </div>

              {/* Cover photo frame */}
              <div className="px-4 pb-0 flex-1 flex flex-col justify-end min-h-0">
                <div
                  className="rounded-t-xl overflow-hidden relative"
                  style={{ height: '170px', background: 'rgba(0,0,0,0.2)' }}
                >
                  {/* Browser dots */}
                  <div className="absolute top-2 left-3 flex gap-1 z-10">
                    <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
                  </div>
                  <img
                    src={event.imageUrl || undefined}
                    alt={event.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
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
