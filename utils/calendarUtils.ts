import type { EventType } from '../types';

export type CalendarDayEntry = {
  event: EventType;
  label?: string;
};

export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function buildDayMap(
  events: EventType[],
  visibleStart: Date,
  visibleEnd: Date
): Map<string, CalendarDayEntry[]> {
  const map = new Map<string, CalendarDayEntry[]>();

  const addToDay = (ymd: string, event: EventType, label?: string) => {
    if (!map.has(ymd)) map.set(ymd, []);
    map.get(ymd)!.push({ event, label });
  };

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

  for (const ev of nonRecurring) {
    const start = new Date(ev.date + 'T00:00:00');
    const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;
    const loopStart = start < visibleStart ? new Date(visibleStart) : new Date(start);
    const loopEnd = end > visibleEnd ? new Date(visibleEnd) : new Date(end);

    const cur = new Date(loopStart);
    while (cur <= loopEnd) {
      const ymd = toYMD(cur);
      const isSpan = ev.endDate && ev.date !== ev.endDate;
      addToDay(ymd, ev, isSpan ? 'multi-day' : undefined);
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const [, occurrences] of recurringGroups) {
    if (occurrences.length === 0) continue;

    const freq = occurrences[0].recurrenceRule?.frequency;
    const label =
      freq === 'weekly'
        ? '↻ Weekly'
        : freq === 'monthly_date' || freq === 'monthly_day'
          ? '↻ Monthly'
          : '↻ Recurring';

    const inView = occurrences.filter(ev => {
      const start = new Date(ev.date + 'T00:00:00');
      const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;
      return end >= visibleStart && start <= visibleEnd;
    });

    for (const ev of inView) {
      const start = new Date(ev.date + 'T00:00:00');
      const end = ev.endDate ? new Date(ev.endDate + 'T00:00:00') : start;
      const loopStart = start < visibleStart ? new Date(visibleStart) : new Date(start);
      const loopEnd = end > visibleEnd ? new Date(visibleEnd) : new Date(end);

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
