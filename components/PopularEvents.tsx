
import React from 'react';
import { ChevronRight, Calendar, MapPin } from 'lucide-react';
import type { DisplayEventType } from '../types';

interface PopularEventsProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

const PopularEvents: React.FC<PopularEventsProps> = ({ events, onEventSelect }) => {
  // Get Sibuyas and Camp Sawi specifically to control order for user request
  const sibuyas = events.find(e => e.name.toLowerCase().includes('sibuyas'));
  const campSawi = events.find(e => e.name.toLowerCase().includes('camp sawi'));
  
  // Reorder: Sibuyas (0), others (1-3), Camp Sawi (at the end/right)
  let middleEvents = events.filter(e => e.id !== sibuyas?.id && e.id !== campSawi?.id).slice(0, 1);
  let popularEvents: DisplayEventType[] = [];
  
  if (sibuyas) popularEvents.push(sibuyas);
  popularEvents.push(...middleEvents);
  if (campSawi) popularEvents.push(campSawi);

  if (popularEvents.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Popular Events</h2>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Bacoor</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-all active:scale-95">
          View All
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x -mx-1 px-1">
        {popularEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventSelect(event)}
            className="flex-shrink-0 w-[350px] flex items-center gap-4 transition-all text-left snap-start group"
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 border border-gray-50 dark:border-gray-600 group-hover:scale-105 transition-transform">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                   <Calendar size={24} />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                <Calendar size={11} className="text-primary-500" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {event.startTime}</span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white truncate mb-1 group-hover:text-primary-600 transition-colors">
                {event.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                <MapPin size={12} className="flex-shrink-0 text-red-500" />
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
