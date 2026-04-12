
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Calendar, ChevronDown, X } from 'lucide-react';
import type { RecurrenceRule, RecurrenceFrequency } from '../services/recurrenceUtils';

interface RecurrenceSelectorProps {
  rule: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  startDate: string;
  startTime: string;
  endTime: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQ_OPTIONS: { value: RecurrenceFrequency; label: string; desc: string }[] = [
  { value: 'weekly',       label: 'Every Week',          desc: 'Repeats on the same weekday' },
  { value: 'monthly_date', label: 'Monthly by Date',     desc: `Repeats on the same date each month` },
  { value: 'monthly_day',  label: 'Monthly by Day',      desc: 'E.g., "2nd Tuesday" each month' },
];

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatTimeStr = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12) || 12;
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
};

const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  rule, onChange, startDate, startTime, endTime,
}) => {
  const isEnabled = !!rule;

  const toggle = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      // Detect starting weekday from startDate
      const dt = startDate ? new Date(startDate + 'T00:00:00') : new Date();
      onChange({ frequency: 'weekly', interval: 1, count: 12 });
    }
  };

  const update = (updates: Partial<RecurrenceRule>) => {
    if (rule) onChange({ ...rule, ...updates });
  };

  // Derived schedule metadata
  const dt = startDate ? new Date(startDate + 'T00:00:00') : null;
  const weekdayName  = dt ? WEEKDAYS[dt.getDay()] : 'selected day';
  const dayOfMonth   = dt ? dt.getDate() : 1;
  const weekIndex    = dt ? Math.ceil(dayOfMonth / 7) : 1;
  const nthText      = ordinal(weekIndex);

  const timeRange = (startTime && endTime) ? `${formatTimeStr(startTime)} – ${formatTimeStr(endTime)}` : '';

  const getPreviewText = () => {
    if (!rule) return '';
    const times = timeRange ? `, ${timeRange}` : '';
    const until = `for ${rule.count} occurrence${rule.count !== 1 ? 's' : ''}`;
    switch (rule.frequency) {
      case 'weekly':       return `Every ${weekdayName}${times} · ${until}`;
      case 'monthly_date': return `${ordinal(dayOfMonth)} of every month${times} · ${until}`;
      case 'monthly_day':  return `${nthText} ${weekdayName} of every month${times} · ${until}`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center gap-4 p-5 transition-colors text-left
          ${isEnabled ? 'bg-violet-50/60 dark:bg-violet-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
      >
        {/* Toggle pill */}
        <div className={`w-10 h-6 rounded-full relative shrink-0 transition-colors duration-200 ${isEnabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${isEnabled ? 'left-5' : 'left-1'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 transition-colors ${isEnabled ? 'text-violet-600' : 'text-gray-400'}`} />
            Recurring Event
          </span>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 truncate">
            {isEnabled && rule ? getPreviewText() : 'Auto-generate future occurrences from one rule'}
          </p>
        </div>
      </button>

      {/* Builder – expands only when enabled */}
      <AnimatePresence>
        {isEnabled && rule && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-5 border-t border-gray-100 dark:border-gray-700/50">
              <div className="pt-4 space-y-4">

                {/* Frequency */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Repeat</label>
                  <div className="grid grid-cols-1 gap-2">
                    {FREQ_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ frequency: opt.value })}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                          ${rule.frequency === opt.value
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
                            : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${rule.frequency === opt.value ? 'border-violet-600 bg-violet-600' : 'border-gray-300 dark:border-gray-500'}`}>
                          {rule.frequency === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold leading-none mb-0.5 ${rule.frequency === opt.value ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-200'}`}>{opt.label}</p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {opt.value === 'monthly_date' ? `On the ${ordinal(dayOfMonth)} of every month` :
                             opt.value === 'monthly_day'  ? `${nthText} ${weekdayName} of every month` :
                             `Every ${weekdayName}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                    Ends After
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                      <button type="button" onClick={() => update({ count: Math.max(2, rule.count - 1) })}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 transition-colors">−</button>
                      <input
                        type="number" min="2" max="52"
                        value={rule.count}
                        onChange={e => update({ count: Math.min(52, Math.max(2, parseInt(e.target.value) || 2)) })}
                        className="w-12 text-center bg-transparent font-bold text-gray-900 dark:text-white text-base outline-none"
                      />
                      <button type="button" onClick={() => update({ count: Math.min(52, rule.count + 1) })}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 transition-colors">+</button>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">occurrences</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 font-medium">Max 52 (approx. 1 year). Open-ended recurrence is not supported.</p>
                </div>

                {/* Preview summary */}
                <div className="flex items-start gap-3 p-3.5 bg-violet-50/70 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-900/20">
                  <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-violet-900 dark:text-violet-200 uppercase tracking-widest mb-0.5">Schedule Preview</p>
                    <p className="text-xs text-violet-700 dark:text-violet-300 font-medium leading-relaxed">{getPreviewText()}</p>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecurrenceSelector;
