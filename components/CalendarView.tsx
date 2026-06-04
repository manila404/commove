
import React, { useMemo } from 'react';
import type { EventType } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../constants';
import { getCategoryStyle } from '../utils/categoryStyles';

interface CalendarViewProps {
  events: EventType[];
  onDateSelect: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return "YYYY-MM-DD" for a Date object without timezone shift */
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Build the set of calendar events that should appear on each visible day.
 *
 * Rules
 * ─────
 * 1. Multi-day events  → appear on every day from `date` through `endDate`.
 * 2. Recurring events  → for each recurrenceGroupId, only ONE occurrence is
 *    shown per calendar month:
 *      • the occurrence whose `date` falls inside the visible month, OR
 *      • if none exist in the visible month, nothing is shown
 *    This avoids flooding the calendar with all future weekly/monthly copies.
 * 3. Non-recurring, single-day events → appear only on their `date`.
 */
function buildDayMap(
  events: EventType[],
  visibleStart: Date,
  visibleEnd: Date
): Map<string, { event: EventType; label?: string }[]> {
  const map = new Map<string, { event: EventType; label?: string }[]>();

  const addToDay = (ymd: string, event: EventType, label?: string) => {
    if (!map.has(ymd)) map.set(ymd, []);
    map.get(ymd)!.push({ event, label });
  };

  // ── Step 1: Separate recurring from non-recurring ──
  const recurringGroups = new Map<string, EventType[]>();
  const nonRecurring: EventType[] = [];

  for (const ev of events) {
    if (ev.recurrenceGroupId) {
      if (!recurringGroups.has(ev.recurrenceGroupId)) {
        recurringGroups.set(ev.recurrenceGroupId, []);
      }
      recurringGroups.get(ev.recurrenceGroupId)!.push(ev);
    } else {
      nonRecurring.push(ev);
    }
  }

  // ── Step 2: Non-recurring events ──
  for (const ev of nonRecurring) {
    const start = new Date(ev.date + 'T00:00:00');
    const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;

    // Clamp to visible range
    const loopStart = start < visibleStart ? new Date(visibleStart) : new Date(start);
    const loopEnd = end > visibleEnd ? new Date(visibleEnd) : new Date(end);

    // Multi-day: span all days
    const cur = new Date(loopStart);
    while (cur <= loopEnd) {
      const ymd = toYMD(cur);
      const isSpan = ev.endDate && ev.date !== ev.endDate;
      addToDay(ymd, ev, isSpan ? 'multi-day' : undefined);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // ── Step 3: Recurring events — show all occurrences ──
  for (const [, occurrences] of recurringGroups) {
    if (occurrences.length === 0) continue;

    const freq = occurrences[0].recurrenceRule?.frequency;
    const label =
      freq === 'weekly' ? '↻ Weekly'
      : freq === 'monthly_date' || freq === 'monthly_day' ? '↻ Monthly'
      : '↻ Recurring';

    // Find occurrences that fall inside or overlap the visible grid range
    const inView = occurrences.filter(ev => {
      const start = new Date(ev.date + 'T00:00:00');
      const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;
      return end >= visibleStart && start <= visibleEnd;
    });

    for (const ev of inView) {
      const start = new Date(ev.date + 'T00:00:00');
      const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;

      // Clamp to visible range
      const loopStart = start < visibleStart ? new Date(visibleStart) : new Date(start);
      const loopEnd = end > visibleEnd ? new Date(visibleEnd) : new Date(end);

      // Span all days of the occurrence
      const cur = new Date(loopStart);
      while (cur <= loopEnd) {
        const ymd = toYMD(cur);
        addToDay(ymd, ev, label);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onDateSelect,
  currentMonth,
  setCurrentMonth,
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

  // Visible grid bounds (Sun before month-start … Sat after month-end)
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

  // Pre-compute the event map for the visible grid
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
            {/* Date number */}
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

            {/* Event pills */}
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              {dayEntries.slice(0, 3).map(({ event, label }) => {
                const categories = Array.isArray(event.category)
                  ? event.category
                  : [event.category];
                // Build display text: prepend label if recurring/multi-day
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
                        : `bg-gradient-to-br ${categoryStyle.bg} text-white shadow-sm`
                    }`}
                  >
                    {displayText}
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
