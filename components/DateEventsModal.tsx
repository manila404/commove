import React from 'react';
import type { EventType } from '../types';
import { X, Bookmark, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EventImage } from '../constants';

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
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: "spring", damping: 28, stiffness: 240, mass: 0.9 }}
          className="bg-white dark:bg-gray-900 rounded-t-[32px] md:rounded-3xl w-full max-w-2xl h-[84vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="px-6 pt-7 pb-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-2xl font-semibold md:font-bold text-gray-900 dark:text-white leading-tight">
                Events on {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <p className="text-xs md:text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
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
          <div className="flex-1 overflow-y-auto px-5 py-5 md:p-6 space-y-3 md:space-y-4 pb-[calc(env(safe-area-inset-bottom,20px)+5.5rem)] md:pb-6">
            {events.map(event => {
              const isSaved = savedEventIds.includes(event.id);
              const categories = Array.isArray(event.category) ? event.category : [event.category];
              
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEventClick(event);
                    }
                  }}
                  className="w-full text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[18px] p-3 md:p-4 flex gap-3 md:gap-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] group relative overflow-hidden"
                >
                  <div className="w-[82px] h-[82px] md:w-24 md:h-24 flex-shrink-0 rounded-[12px] overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <EventImage 
                      src={event.imageUrl} 
                      alt={event.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="text-[13px] md:text-lg font-semibold md:font-bold text-[#1f2937] dark:text-white truncate pr-16 md:pr-20 leading-snug">
                        {event.name}
                      </h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSave(event.id);
                        }}
                        className={`absolute top-3 md:top-4 right-10 md:right-12 p-1 rounded-full transition-colors ${
                          isSaved 
                            ? 'text-primary-600' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                      <ChevronRight className="absolute top-3.5 md:top-5 right-3 md:right-4 w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>

                    <p className="text-[11px] md:text-xs font-normal text-gray-500 dark:text-gray-400 line-clamp-1 md:line-clamp-2 mb-2 leading-tight pr-16 md:pr-20">
                      {event.description}
                    </p>

                    {/* Recurrence / multi-day badge */}
                    {(event.recurrenceGroupId || (event.endDate && event.endDate !== event.date)) && (
                      <div className="mb-1.5">
                        {event.recurrenceGroupId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] md:text-[10px] font-semibold md:font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {event.recurrenceRule?.frequency === 'weekly'
                              ? 'Every Week'
                              : event.recurrenceRule?.frequency === 'monthly_date' || event.recurrenceRule?.frequency === 'monthly_day'
                              ? 'Monthly'
                              : 'Recurring'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] md:text-[10px] font-semibold md:font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' – '}
                            {new Date(event.endDate! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 gap-1 md:gap-2 overflow-hidden">
                        {categories.slice(0, 2).map((cat, idx) => {
                          const colors = [
                            'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                            'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
                            'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
                          ];
                          return (
                            <span 
                              key={cat}
                              className={`shrink-0 max-w-[120px] truncate px-2 py-0.5 ${colors[idx % colors.length]} text-[10px] md:text-[10px] font-semibold rounded-full`}
                            >
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="hidden md:inline-flex px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap"
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
