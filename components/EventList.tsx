
import React from 'react';
import type { EventType, DisplayEventType } from '../types';
import EventCard from './EventCard';

interface EventListProps {
  events: DisplayEventType[];
  onEventSelect: (event: EventType) => void;
  onToggleSave: (eventId: string) => void;
}

const EventList: React.FC<EventListProps> = ({ events, onEventSelect, onToggleSave }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Events Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Try adjusting your search or category.</p>
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
