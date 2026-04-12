
/**
 * Utility for generating recurring event dates based on an initial date and rule.
 */

export type RecurrenceFrequency = 'weekly' | 'monthly_date' | 'monthly_day';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g., every 1 week, every 2 months
  count: number;    // number of occurrences to generate
}

/**
 * Gets the Nth occurrence of a day in a month (e.g., 1st Wednesday)
 */
function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, index: number): Date | null {
  // index: 1-first, 2-second, 3-third, 4-fourth, 5-fifth (or last if 5 doesn't exist)
  const firstDayOfMonth = new Date(year, month, 1);
  let firstOccurrence = firstDayOfMonth.getDay();
  
  // Calculate first occurrence of that day of week
  let dayOffset = (dayOfWeek - firstOccurrence + 7) % 7;
  let targetDate = 1 + dayOffset + (index - 1) * 7;
  
  // Verify targetDate is in the correct month
  let result = new Date(year, month, targetDate);
  if (result.getMonth() !== month) {
      if (index >= 4) {
          // If we looking for 5th or 4th and it overflowed, get the previous week (last occurrence)
          result = new Date(year, month, targetDate - 7);
      } else {
          return null;
      }
  }
  return result;
}

/**
 * Generates an array of date strings (YYYY-MM-DD) for a recurring series
 */
export function generateRecurringDates(startDateStr: string, rule: RecurrenceRule): string[] {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  
  // Start date is always first instance
  dates.push(startDateStr);
  
  for (let i = 1; i < rule.count; i++) {
    let nextDate: Date | null = null;

    if (rule.frequency === 'weekly') {
      nextDate = new Date(start);
      nextDate.setDate(start.getDate() + (i * rule.interval * 7));
    } 
    else if (rule.frequency === 'monthly_date') {
      nextDate = new Date(start.getFullYear(), start.getMonth() + (i * rule.interval), start.getDate());
      // Adjust if month has fewer days (e.g., Jan 31 -> Feb 28)
      if (nextDate.getDate() !== start.getDate()) {
          nextDate = new Date(start.getFullYear(), start.getMonth() + (i * rule.interval) + 1, 0);
      }
    } 
    else if (rule.frequency === 'monthly_day') {
      // Logic for "Nth [DayOfWeek] of every [Interval] month"
      const dayOfWeek = start.getDay();
      const n = Math.ceil(start.getDate() / 7); // What index is this? (1st, 2nd, etc)
      
      const targetMonth = start.getMonth() + (i * rule.interval);
      const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
      const targetMonthIndex = targetMonth % 12;
      
      nextDate = getNthDayOfMonth(targetYear, targetMonthIndex, dayOfWeek, n);
    }

    if (nextDate) {
      dates.push(nextDate.toISOString().split('T')[0]);
    }
  }

  return dates;
}
