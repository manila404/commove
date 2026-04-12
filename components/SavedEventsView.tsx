
import React from 'react';
import { ChevronLeftIcon, BookmarkIcon } from '../constants';
import EventList from './EventList';
import type { EventType, DisplayEventType } from '../types';

interface SavedEventsViewProps {
  events: DisplayEventType[];
  onBack: () => void;
  onEventSelect: (event: EventType) => void;
  onToggleSave: (eventId: string) => void;
}

const SavedEventsView: React.FC<SavedEventsViewProps> = ({ events, onBack, onEventSelect, onToggleSave }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up">
        {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
                    <BookmarkIcon className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Saved Events</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
                    Events you save will appear here. Browse the feed to find events you're interested in.
                </p>

            </div>
        ) : (
            <EventList 
                events={events} 
                onEventSelect={onEventSelect} 
                onToggleSave={onToggleSave} 
            />
        )}
      </main>
    </div>
  );
};

export default SavedEventsView;
