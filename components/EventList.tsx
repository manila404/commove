
import React from 'react';
import type { EventType, DisplayEventType } from '../types';
import EventCard from './EventCard';

interface EventListProps {
  events: DisplayEventType[];
  onEventSelect: (event: EventType) => void;
  onToggleSave: (eventId: string) => void;
  category?: string;
  onExploreUpcoming?: () => void;
  onBrowse?: () => void;
}

const EventList: React.FC<EventListProps> = ({ events, onEventSelect, onToggleSave, category, onExploreUpcoming, onBrowse }) => {
  if (events.length === 0) {
    if (category === 'Happening Now') {
      return (
        <div className="text-center pt-2 pb-10 md:pt-4 md:pb-16 flex flex-col items-center">
          <img
            src="/noevents.png"
            alt="No live events"
            className="w-36 h-36 md:w-52 md:h-52 object-contain mb-3 md:mb-4 opacity-90"
          />
          <h2 className="text-base md:text-xl font-bold text-gray-800 dark:text-gray-200">
            The stage is quiet right now...
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-xs md:text-sm max-w-[260px] md:max-w-xs leading-relaxed">
            No live events right now. Browse categories or check what's coming up next.
          </p>
          {onExploreUpcoming && (
            <button
              onClick={onExploreUpcoming}
              className="mt-4 px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs md:text-sm transition-all active:scale-95 shadow-sm"
            >
              Explore Upcoming Events
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-10 flex flex-col items-center">
        <img
          src="/noeventsimage.png"
          alt="No events found"
          className="w-40 h-40 md:w-52 md:h-52 object-contain mb-4 opacity-90"
        />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Events Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs md:max-w-sm leading-relaxed">
          We couldn't find any events matching your current filter.<br className="hidden md:block" /> Try exploring a different category or check back later.
        </p>
        {onBrowse && (
          <button
            onClick={onBrowse}
            className="mt-5 px-5 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-all active:scale-95 shadow-sm"
          >
            Browse Events
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} onSelect={onEventSelect} onToggleSave={onToggleSave} />
      ))}
    </div>
  );
};

export default EventList;
