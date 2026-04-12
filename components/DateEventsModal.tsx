import React from 'react';
import type { EventType } from '../types';
import { X, Bookmark, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DateEventsModalProps {
  date: Date;
  events: EventType[];
  onClose: () => void;
  onEventClick: (event: EventType) => void;
  onToggleSave: (eventId: string) => void;
  savedEventIds: string[];
}

const DateEventsModal: React.FC<DateEventsModalProps> = ({ 
  date, 
  events, 
  onClose, 
  onEventClick,
  onToggleSave,
  savedEventIds
}) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4 bg-black/60 backdrop-blur-sm pt-safe">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 200, mass: 1 }}
          className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[85vh] md:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Events on {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {events.map(event => {
              const isSaved = savedEventIds.includes(event.id);
              const categories = Array.isArray(event.category) ? event.category : [event.category];
              
              return (
                <div 
                  key={event.id}
                  className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[15px] p-3 md:p-4 flex gap-3 md:gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  {/* Left Line Effect */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    categories.includes('Concerts') ? 'bg-purple-500' : 
                    categories.includes('Cafe') ? 'bg-orange-500' : 'bg-teal-500'
                  }`} />

                  {/* Image */}
                  <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[10px] overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {event.imageUrl ? (
                      <img 
                        src={event.imageUrl || undefined} 
                        alt={event.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="text-sm md:text-lg font-bold text-[#1f2937] dark:text-white truncate pr-8">
                        {event.name}
                      </h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(event.id);
                        }}
                        className={`absolute top-3 md:top-4 right-3 md:right-4 p-1 rounded-full transition-colors ${
                          isSaved 
                            ? 'text-primary-600' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 line-clamp-1 md:line-clamp-2 mb-2 leading-tight">
                      {event.description}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        {categories.slice(0, 2).map((cat, idx) => {
                          const colors = [
                            'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                            'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
                            'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
                          ];
                          return (
                            <span 
                              key={cat}
                              className={`px-2 py-0.5 ${colors[idx % colors.length]} text-[9px] md:text-[10px] font-semibold rounded-full`}
                            >
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                      
                      <button 
                        onClick={() => onEventClick(event)}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] md:text-xs font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap"
                      >
                        View Event
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DateEventsModal;
