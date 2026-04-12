
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from 'lucide-react';

interface SinglePickerProps {
  label: string;
  value: string;
  type: 'date' | 'time';
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  className?: string;
  error?: string;
  minDate?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

const parseTimeStr = (val: string): { h24: number; min: number } => {
  if (!val) return { h24: 9, min: 0 };
  const [h, m] = val.split(':').map(Number);
  return { h24: h, min: isNaN(m) ? 0 : m };
};

const to12 = (h24: number): { h12: number; period: 'AM' | 'PM' } => {
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, period };
};

const to24 = (h12: number, period: 'AM' | 'PM'): number => {
  let h = h12 % 12;
  if (period === 'PM') h += 12;
  return h;
};

export const formatTime = (val: string): string => {
  if (!val) return 'Set time';
  const { h24, min } = parseTimeStr(val);
  const { h12, period } = to12(h24);
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
};

export const formatDate = (val: string): string => {
  if (!val) return 'Pick date';
  const [y, m, d] = val.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ─── Calendar Panel ────────────────────────────────────────────────────────────

interface CalendarPanelProps {
  selectedDate: string;
  onDateChange: (d: string) => void;
  minDate?: string;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({ selectedDate, onDateChange, minDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const total = daysInMonth(year, month);
  const start = firstDayOfMonth(year, month);

  const handleDaySelect = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onDateChange(`${year}-${m}-${d}`);
  };

  const today = new Date();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < start; i++) cells.push(<div key={`e${i}`} className="h-9 w-9" />);
  for (let d = 1; d <= total; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = selectedDate === dStr;
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const isPast = minDate ? dStr < minDate : false;
    cells.push(
      <button
        key={d} type="button"
        disabled={isPast}
        onClick={() => handleDaySelect(d)}
        className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all
          ${isPast ? 'opacity-25 cursor-not-allowed text-gray-400' :
            isSelected ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' :
            isToday ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 border border-violet-200 dark:border-violet-800 font-bold' :
            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
      >
        {d}
      </button>
    );
  }

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(<div key={i} className="flex justify-between">{cells.slice(i, i + 7)}</div>);
  }

  return (
    <div className="p-4 w-full">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button type="button"
          onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {currentMonth.toLocaleString('default', { month: 'long' })} {year}
        </span>
        <button type="button"
          onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* Day headers */}
      <div className="flex justify-between mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="w-9 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
        ))}
      </div>
      <div className="space-y-0.5">{rows}</div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button type="button"
          onClick={() => {
            const t = new Date();
            onDateChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`);
            setCurrentMonth(new Date());
          }}
          className="w-full py-1.5 text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
};

// ─── Time Panel ────────────────────────────────────────────────────────────────

interface TimePanelProps {
  value: string;
  onChange: (t: string) => void;
}

const TimePanel: React.FC<TimePanelProps> = ({ value, onChange }) => {
  const { h24, min } = parseTimeStr(value);
  const { h12, period } = to12(h24);

  const update = (newH12: number, newMin: number, newPeriod: 'AM' | 'PM') => {
    const h = to24(newH12, newPeriod);
    onChange(`${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`);
  };

  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Select Time</p>
      <div className="flex gap-2">
        {/* Hours */}
        <div className="flex-1">
          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1.5">Hr</p>
          <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto pr-0.5 scrollbar-hide">
            {hours12.map(h => (
              <button key={h} type="button" onClick={() => update(h, min, period)}
                className={`py-1.5 px-2 rounded-lg text-sm font-semibold transition-all text-center
                  ${h12 === h ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >{String(h).padStart(2,'0')}</button>
            ))}
          </div>
        </div>
        {/* Minutes */}
        <div className="flex-1">
          <p className="text-[9px] font-bold text-gray-400 uppercase mb-1.5">Min</p>
          <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto pr-0.5 scrollbar-hide">
            {minuteOptions.map(m => (
              <button key={m} type="button" onClick={() => update(h12, m, period)}
                className={`py-1.5 px-2 rounded-lg text-sm font-semibold transition-all text-center
                  ${min === m ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >{String(m).padStart(2,'0')}</button>
            ))}
          </div>
        </div>
        {/* AM/PM */}
        <div className="flex flex-col gap-2 justify-center pt-6">
          {(['AM', 'PM'] as const).map(p => (
            <button key={p} type="button" onClick={() => update(h12, min, p)}
              className={`py-3 px-3 rounded-xl text-sm font-bold transition-all
                ${period === p ? 'bg-violet-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >{p}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Inline DateTime Row (used in CreateEventForm) ────────────────────────────

interface DateTimeRowProps {
  label: string;
  date: string;
  time: string;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  error?: string;
  minDate?: string;
  indicator?: 'filled' | 'hollow';
}

export const DateTimeRow: React.FC<DateTimeRowProps> = ({
  label, date, time, onDateChange, onTimeChange, error, minDate, indicator = 'filled'
}) => {
  const [openPanel, setOpenPanel] = useState<'date' | 'time' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenPanel(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2">
        {/* Dot indicator */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 w-5 pt-1">
          {indicator === 'filled'
            ? <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            : <div className="w-2.5 h-2.5 rounded-full border-2 border-violet-600" />}
        </div>

        {/* Row label */}
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-12 shrink-0">{label}</span>

        {/* Date trigger */}
        <button type="button"
          onClick={() => setOpenPanel(openPanel === 'date' ? null : 'date')}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1
            ${openPanel === 'date'
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
              : date ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:border-violet-400'
              : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:border-violet-400'}`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{date ? formatDate(date) : 'Select date'}</span>
        </button>

        {/* Time trigger */}
        <button type="button"
          onClick={() => setOpenPanel(openPanel === 'time' ? null : 'time')}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all w-36 shrink-0
            ${openPanel === 'time'
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
              : time ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:border-violet-400'
              : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:border-violet-400'}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span>{time ? formatTime(time) : 'Set time'}</span>
        </button>
      </div>

      {error && (
        <p className="ml-[76px] mt-1 text-xs font-semibold text-red-500">{error}</p>
      )}

      {/* Inline Popover — opens BELOW the row, inside its own container */}
      <AnimatePresence>
        {openPanel && (
          <motion.div
            key={openPanel}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[300] left-[76px] top-[calc(100%+8px)] w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {openPanel === 'date' ? `${label} Date` : `${label} Time`}
              </span>
              <button type="button" onClick={() => setOpenPanel(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            {openPanel === 'date'
              ? <CalendarPanel selectedDate={date} onDateChange={(d) => { onDateChange(d); setOpenPanel('time'); }} minDate={minDate} />
              : <TimePanel value={time} onChange={(t) => { onTimeChange(t); setOpenPanel(null); }} />
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Legacy SingleDateTimePicker (used elsewhere, keep for compatibility) ──────

export const SingleDateTimePicker: React.FC<SinglePickerProps> = ({
  label, value, type, onDateChange, onTimeChange, className,
}) => {
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setActive(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = type === 'date' ? formatDate(value) : formatTime(value);

  return (
    <div ref={rootRef} className={`relative flex-1 ${className}`}>
      <button type="button" onClick={() => setActive(!active)}
        className={`w-full flex items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all hover:border-violet-400
          ${active ? 'ring-2 ring-violet-500/20 border-violet-500' : ''}`}
      >
        {type === 'date' ? <Calendar className="w-4 h-4 mr-3 text-gray-400" /> : <Clock className="w-4 h-4 mr-3 text-gray-400" />}
        <div className="flex flex-col items-start overflow-hidden">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate w-full">{displayValue}</span>
        </div>
      </button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[300] top-full mt-2 left-0 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{type === 'date' ? 'Select Date' : 'Select Time'}</span>
              <button type="button" onClick={() => setActive(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            {type === 'date'
              ? <CalendarPanel selectedDate={value} onDateChange={(d) => { onDateChange(d); setActive(false); }} />
              : <TimePanel value={value} onChange={(t) => { onTimeChange(t); setActive(false); }} />
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Legacy default export (still required) ────────────────────────────────────

interface EventDateTimePickerProps {
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

const EventDateTimePicker: React.FC<EventDateTimePickerProps> = ({
  date, startTime, endTime, onDateChange, onStartTimeChange, onEndTimeChange,
}) => (
  <div className="space-y-3">
    <DateTimeRow label="Start" date={date} time={startTime} onDateChange={onDateChange} onTimeChange={onStartTimeChange} indicator="filled" />
    <DateTimeRow label="End"   date={date} time={endTime}   onDateChange={onDateChange} onTimeChange={onEndTimeChange}   indicator="hollow" />
  </div>
);

export default EventDateTimePicker;

/* scrollbar hide utility */
// Injected via style tag where needed
