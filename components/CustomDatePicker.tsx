
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, required, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD local
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setCurrentMonth(new Date());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const weeks = [];
    let days = [];
    
    // Empty days for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }
    
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateSelect(d)}
          className={`h-10 w-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all
            ${isSelected ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 
              isToday ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border border-primary-200 dark:border-primary-800' : 
              'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
          `}
        >
          {d}
        </button>
      );
      
      if ((days.length) % 7 === 0 || d === totalDays) {
        weeks.push(<div key={`week-${weeks.length}`} className="flex justify-between">{days}</div>);
        days = [];
      }
    }
    
    return weeks;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label} {required && '*'}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 transition-all text-left"
      >
        <span className={value ? 'font-medium' : 'text-gray-400'}>{formatDate(value)}</span>
        <CalendarIcon className="w-5 h-5 text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl min-w-[320px] left-0 md:left-auto md:right-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
               <div className="flex items-center gap-2">
                 <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    {currentMonth.toLocaleString('default', { month: 'long' })} {currentMonth.getFullYear()}
                 </h4>
               </div>
               <div className="flex gap-1">
                 <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                    <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
            </div>

            {/* Weekdays */}
            <div className="flex justify-between mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="w-10 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              {renderCalendar()}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center px-1">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-all"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDatePicker;
