
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

interface EventDateTimePickerProps {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm (24h)
  endTime: string;    // HH:mm (24h)
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  required?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

const parseTimeStr = (val: string): { h24: number; min: number } => {
  if (!val) return { h24: 9, min: 0 };
  const [h, m] = val.split(':').map(Number);
  return { h24: h, min: m };
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

const formatTime = (val: string): string => {
  if (!val) return 'Set time';
  const { h24, min } = parseTimeStr(val);
  const { h12, period } = to12(h24);
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
};

const formatDate = (val: string): string => {
  if (!val) return 'Set date';
  const [y, m, d] = val.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ── Popover ───────────────────────────────────────────────────────────────────

interface PickerPopoverProps {
  label: string;
  date: string;
  time: string;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const PickerPopover: React.FC<PickerPopoverProps> = ({
  label, date, time, onDateChange, onTimeChange, onClose, anchorRef,
}) => {
  const popRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(date ? new Date(date + 'T00:00:00') : new Date());
  const [tab, setTab] = useState<'date' | 'time'>('date');

  const { h24, min } = parseTimeStr(time);
  const { h12, period } = to12(h24);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDaySelect = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
    setTab('time');
  };

  const updateTime = (newH12: number, newMin: number, newPeriod: 'AM' | 'PM') => {
    const h = to24(newH12, newPeriod);
    onTimeChange(`${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`);
  };

  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const total = daysInMonth(year, month);
    const start = firstDayOfMonth(year, month);
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < start; i++) cells.push(<div key={`e${i}`} className="h-9 w-9" />);

    for (let d = 1; d <= total; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = date === dStr;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      cells.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDaySelect(d)}
          className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all
            ${isSelected
              ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-500/30'
              : isToday
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border border-primary-200 dark:border-primary-800'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          {d}
        </button>
      );
    }

    const rows: React.ReactNode[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <div key={i} className="flex justify-between">
          {cells.slice(i, i + 7)}
        </div>
      );
    }
    return rows;
  };

  return (
    <motion.div
      ref={popRef}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="absolute z-[200] top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Tab header */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {(['date', 'time'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors
              ${tab === t
                ? 'text-[#8b5cf6] border-b-2 border-[#8b5cf6] -mb-px'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {t === 'date' ? <Calendar className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'date' ? (
          <motion.div
            key="date"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="p-4"
          >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="flex justify-between mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="w-9 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
              ))}
            </div>

            <div className="space-y-1">{renderCalendar()}</div>

            {/* Today shortcut */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  const y = t.getFullYear();
                  const mo = String(t.getMonth() + 1).padStart(2, '0');
                  const d = String(t.getDate()).padStart(2, '0');
                  onDateChange(`${y}-${mo}-${d}`);
                  setCurrentMonth(new Date());
                  setTab('time');
                }}
                className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-all"
              >
                Today
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="time"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="p-4"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{label} Time</p>
            <div className="flex gap-3">
              {/* Hours */}
              <div className="flex-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hour</p>
                {hours12.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => updateTime(h, min, period)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-center
                      ${h12 === h
                        ? 'bg-[#8b5cf6] text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* Minutes */}
              <div className="flex-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Min</p>
                {minuteOptions.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateTime(h12, m, period)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all text-center
                      ${min === m
                        ? 'bg-[#8b5cf6] text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* AM/PM */}
              <div className="flex flex-col gap-2 justify-center">
                {(['AM', 'PM'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateTime(h12, min, p)}
                    className={`py-3 px-3 rounded-xl text-sm font-bold transition-all
                      ${period === p
                        ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-purple-500/20"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const EventDateTimePicker: React.FC<EventDateTimePickerProps> = ({
  date, startTime, endTime,
  onDateChange, onStartTimeChange, onEndTimeChange,
}) => {
  const [active, setActive] = useState<'start' | 'end' | null>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl overflow-visible">
      {/* Start row */}
      <div ref={startRef} className="relative">
        <button
          type="button"
          onClick={() => setActive(active === 'start' ? null : 'start')}
          className={`w-full flex items-center px-4 py-3.5 rounded-t-xl transition-colors group
            ${active === 'start'
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/80'}`}
        >
          {/* Filled dot */}
          <span className={`w-2.5 h-2.5 rounded-full mr-3 shrink-0 transition-colors
            ${active === 'start' ? 'bg-[#8b5cf6]' : 'bg-gray-400 dark:bg-gray-500'}`}
          />
          <span className={`text-sm font-semibold w-10 text-left transition-colors
            ${active === 'start' ? 'text-[#8b5cf6]' : 'text-gray-500 dark:text-gray-400'}`}>
            Start
          </span>
          <span className="flex-1 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 ml-3">
            {formatDate(date)}
          </span>
          <span className={`text-sm font-semibold tabular-nums transition-colors
            ${startTime ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
            {formatTime(startTime)}
          </span>
        </button>

        <AnimatePresence>
          {active === 'start' && (
            <PickerPopover
              label="Start"
              date={date}
              time={startTime}
              onDateChange={onDateChange}
              onTimeChange={onStartTimeChange}
              onClose={() => setActive(null)}
              anchorRef={startRef}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-600 mx-4" />

      {/* End row */}
      <div ref={endRef} className="relative">
        <button
          type="button"
          onClick={() => setActive(active === 'end' ? null : 'end')}
          className={`w-full flex items-center px-4 py-3.5 rounded-b-xl transition-colors group
            ${active === 'end'
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/80'}`}
        >
          {/* Hollow dot */}
          <span className={`w-2.5 h-2.5 rounded-full border-2 mr-3 shrink-0 transition-colors
            ${active === 'end' ? 'border-[#8b5cf6]' : 'border-gray-400 dark:border-gray-500'}`}
          />
          <span className={`text-sm font-semibold w-10 text-left transition-colors
            ${active === 'end' ? 'text-[#8b5cf6]' : 'text-gray-500 dark:text-gray-400'}`}>
            End
          </span>
          <span className="flex-1 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 ml-3">
            {formatDate(date)}
          </span>
          <span className={`text-sm font-semibold tabular-nums transition-colors
            ${endTime ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
            {formatTime(endTime)}
          </span>
        </button>

        <AnimatePresence>
          {active === 'end' && (
            <PickerPopover
              label="End"
              date={date}
              time={endTime}
              onDateChange={onDateChange}
              onTimeChange={onEndTimeChange}
              onClose={() => setActive(null)}
              anchorRef={endRef}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventDateTimePicker;
