import React, { useMemo } from 'react';
import type { EventType } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../constants';
import { getCategoryStyle } from '../utils/categoryStyles';
import { buildDayMap, toYMD } from '../utils/calendarUtils';

interface CalendarViewProps {
  events: EventType[];
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  getEventIndicator?: (event: EventType) => { label: string; className: string } | null;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onDateSelect,
  currentMonth,
  setCurrentMonth,
  getEventIndicator,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + offset,
      1
    );
    setCurrentMonth(newMonth);
  };

  const goToToday = () => setCurrentMonth(new Date());

  const { gridStart, gridEnd } = useMemo(() => {
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    const gs = new Date(monthStart);
    gs.setDate(gs.getDate() - monthStart.getDay());
    gs.setHours(0, 0, 0, 0);
    const ge = new Date(monthEnd);
    ge.setDate(ge.getDate() + (6 - monthEnd.getDay()));
    ge.setHours(23, 59, 59, 999);
    return { gridStart: gs, gridEnd: ge };
  }, [currentMonth]);

  const dayMap = useMemo(
    () => buildDayMap(events, gridStart, gridEnd),
    [events, gridStart, gridEnd]
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between py-4 px-2 mb-2">
      <div className="flex items-center gap-2 md:gap-4">
        <span className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
          {currentMonth.toLocaleString('default', { month: 'long' })}{' '}
          <span className="text-gray-500 dark:text-gray-400">
            {currentMonth.getFullYear()}
          </span>
        </span>
        <button
          onClick={goToToday}
          className="text-xs font-medium px-3 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
        >
          Month
        </button>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const rows: React.ReactNode[] = [];
    let dayCells: React.ReactNode[] = [];
    const cur = new Date(gridStart);

    while (cur <= gridEnd) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(cur);
        const ymd = toYMD(cloneDay);
        const dayEntries = dayMap.get(ymd) || [];

        const isCurrentMonth = cloneDay.getMonth() === currentMonth.getMonth();
        const isToday = cloneDay.getTime() === today.getTime();
        const isPastDay = cloneDay < today && !isToday;

        dayCells.push(
          <div
            key={ymd}
            className={[
              'min-h-[80px] md:min-h-[120px] p-1 border-t border-l border-gray-100 dark:border-gray-800',
              'relative transition-colors duration-200 flex flex-col gap-1 group',
              isCurrentMonth
                ? 'bg-white dark:bg-gray-800'
                : 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-600',
              isCurrentMonth
                ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'
                : '',
              isPastDay && isCurrentMonth ? 'opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onDateSelect(cloneDay)}
          >
            <div className="flex justify-end p-1">
              <span
                className={[
                  'w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-xs md:text-sm font-medium',
                  isToday
                    ? 'text-white shadow-md'
                    : isPastDay && isCurrentMonth
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600',
                  !isCurrentMonth ? 'opacity-50' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isToday ? { backgroundColor: '#0052A3' } : undefined}
              >
                {cloneDay.getDate()}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              {dayEntries.slice(0, 3).map(({ event, label }) => {
                const categories = Array.isArray(event.category)
                  ? event.category
                  : [event.category];
                const indicator = getEventIndicator?.(event) ?? null;
                const displayText =
                  label === 'multi-day'
                    ? event.name
                    : label
                      ? `${label} · ${event.name}`
                      : event.name;

                const categoryStyle = getCategoryStyle(categories);

                return (
                  <div
                    key={`${event.id}-${ymd}`}
                    title={displayText}
                    className={`text-[9px] md:text-xs px-1 md:px-1.5 py-0.5 rounded truncate font-medium ${
                      isPastDay
                        ? 'bg-gray-200 text-gray-400 dark:bg-gray-750 dark:text-gray-500 line-through opacity-75'
                        : indicator
                          ? `${indicator.className} shadow-sm border`
                          : `bg-gradient-to-br ${categoryStyle.bg} text-white shadow-sm`
                    }`}
                  >
                    {indicator ? `${indicator.label} · ${displayText}` : displayText}
                  </div>
                );
              })}

              {dayEntries.length > 3 && (
                <div className="text-[9px] text-gray-500 dark:text-gray-400 font-medium pl-1">
                  +{dayEntries.length - 3} more
                </div>
              )}
            </div>
          </div>
        );

        cur.setDate(cur.getDate() + 1);
      }

      rows.push(
        <div
          key={cur.toString()}
          className="grid grid-cols-7 border-b border-r border-gray-100 dark:border-gray-800"
        >
          {dayCells}
        </div>
      );
      dayCells = [];
    }

    return (
      <div className="border-b border-r border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">
        {rows}
      </div>
    );
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
