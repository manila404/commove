
import React from 'react';
import type { EventType } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../constants';

interface CalendarViewProps {
  events: EventType[];
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onDateSelect, currentMonth, setCurrentMonth }) => {
  const today = new Date();

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between py-4 px-2 mb-2">
        <div className="flex items-center gap-2 md:gap-4">
             <span className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
              {currentMonth.toLocaleString('default', { month: 'long' })} <span className="text-gray-500 dark:text-gray-400">{currentMonth.getFullYear()}</span>
            </span>
            <button 
                onClick={goToToday}
                className="text-xs font-medium px-3 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
                Today
            </button>
        </div>
       
        <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dayString = cloneDay.toDateString();
        
        // Find events for this specific day
        const dayEvents = events.filter(event => 
            new Date(event.date).toDateString() === dayString
        );

        const isCurrentMonth = cloneDay.getMonth() === currentMonth.getMonth();
        const isToday = dayString === today.toDateString();

        days.push(
          <div
            className={`
                min-h-[80px] md:min-h-[120px] p-1 border-t border-l border-gray-100 dark:border-gray-800 relative transition-colors duration-200 flex flex-col gap-1 group
                ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-600'}
                ${isCurrentMonth && 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'}
            `}
            key={day.toString()}
            onClick={() => onDateSelect(cloneDay)}
          >
            {/* Date Number */}
            <div className="flex justify-end p-1">
                <span className={`
                    w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-xs md:text-sm font-medium
                    ${isToday 
                        ? 'bg-primary-600 text-white shadow-md' 
                        : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                `}>
                  {cloneDay.getDate()}
                </span>
            </div>

            {/* Event List (Desktop) / Dots (Mobile) */}
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(event => {
                    const categories = Array.isArray(event.category) ? event.category : [event.category];
                    return (
                    <div 
                        key={event.id}
                        className={`
                            text-[9px] md:text-xs px-1 md:px-1.5 py-0.5 rounded truncate font-medium
                            ${categories.includes('Concerts') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' : ''}
                            ${categories.includes('Cafe') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' : ''}
                            ${!categories.includes('Concerts') && !categories.includes('Cafe') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' : ''}
                        `}
                        title={event.name}
                    >
                        {event.name}
                    </div>
                )})}
                
                {dayEvents.length > 3 && (
                    <div className="text-[9px] text-gray-500 dark:text-gray-400 font-medium pl-1">
                        +{dayEvents.length - 3} more
                    </div>
                )}
            </div>
          </div>
        );
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div className="grid grid-cols-7 border-b border-r border-gray-100 dark:border-gray-800" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-b border-r border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">{rows}</div>;
  };


  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-2 md:p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default CalendarView;
