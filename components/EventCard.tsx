import React from 'react';
import type { DisplayEventType } from '../types';
import { LocationIcon, CalendarIcon, ClockIcon, StarIcon, BookmarkIcon, formatDisplayDate } from '../constants';

interface EventCardProps {
  event: DisplayEventType;
  onSelect: (event: DisplayEventType) => void;
  onToggleSave: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onSelect, onToggleSave }) => {
  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(event.id);
  }

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Concerts':
      case 'Cosplay':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      case 'Arts':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-200 dark:border-pink-800';
      case 'Gaming':
      case 'Technology':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800';
      case 'Business':
      case 'Conference':
      case 'Expo Events':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'Health':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'Competitions':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800';
      case 'Cafe':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl dark:shadow-black/20 border transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer group relative flex flex-col h-full ${event.isLive ? 'border-red-500/50 dark:border-red-500/50 ring-2 ring-red-500/20' : 'border-gray-200 dark:border-gray-700'}`}
      onClick={() => onSelect(event)}
    >
       <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
         {event.isLive && (
             <div className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center animate-pulse tracking-tighter">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 shadow-[0_0_8px_white]"></span>
                HAPPENING NOW
             </div>
         )}
        <div className="flex items-center gap-2">
            {event.isPreferred && (
            <div className="bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-md flex items-center justify-center" title="Matches your preferences">
                <StarIcon className="w-3 h-3" />
            </div>
            )}
            {event.isNearby && (
            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md" title="Happening near you">
                Nearby
            </span>
            )}
        </div>
      </div>

       <button
        onClick={handleToggleSave}
        className="absolute top-3 left-3 z-10 p-2 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors"
        aria-label={event.isSaved ? 'Unsave event' : 'Save event'}
      >
        <BookmarkIcon className="w-5 h-5" filled={event.isSaved} />
      </button>

      <div className="overflow-hidden h-48 flex-shrink-0 relative">
        <img src={event.imageUrl || undefined} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3 flex flex-wrap gap-1">
          {(Array.isArray(event.category) ? event.category : [event.category]).map((cat) => (
            <span key={cat} className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyles(cat)}`}>
              {cat}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-tight">
          {event.name}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
          {event.description}
        </p>
        
        <div className="space-y-2 text-gray-500 dark:text-gray-400 text-xs font-medium pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400 flex-shrink-0" />
              <span>{formatDisplayDate(event.date, event.endDate)}</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400 flex-shrink-0" />
              <span>{event.startTime}</span>
            </div>
            <div className="flex items-center">
              <LocationIcon className="w-4 h-4 mr-2 text-primary-500 dark:text-primary-400 flex-shrink-0" />
              <span className="truncate">
                {event.venue}
                {event.street ? `, ${event.street}` : ''}, {event.barangay}
              </span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
