
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // 24h format HH:mm
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange, label, required, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parseTime = (val: string): { hour: number; minute: number; period: 'AM' | 'PM' } => {
    if (!val) return { hour: 9, minute: 0, period: 'AM' };
    const [h24, m] = val.split(':').map(Number);
    const period = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, minute: m, period };
  };

  const { hour, minute, period } = parseTime(value);

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

  const updateTime = (newH12: number, newM: number, newP: 'AM' | 'PM') => {
    let h24 = newH12 % 12;
    if (newP === 'PM') h24 += 12;
    const timeStr = `${String(h24).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    onChange(timeStr);
  };

  const formatDisplayTime = (val: string) => {
    if (!val) return 'Select time';
    const { hour, minute, period } = parseTime(val);
    return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute intervals

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label} {required && '*'}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 transition-all text-left"
      >
        <span className={value ? 'font-medium' : 'text-gray-400'}>{formatDisplayTime(value)}</span>
        <Clock className="w-5 h-5 text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl min-w-[280px] left-0 md:left-auto md:right-0"
          >
            <div className="flex gap-4">
               {/* Hours */}
               <div className="flex-1 flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Hour</p>
                 {hours.map(h => (
                   <button
                     key={h}
                     type="button"
                     onClick={() => updateTime(h, minute, period)}
                     className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${hour === h ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                   >
                     {h}
                   </button>
                 ))}
               </div>

               {/* Minutes */}
               <div className="flex-1 flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Min</p>
                 {minutes.map(m => (
                   <button
                     key={m}
                     type="button"
                     onClick={() => updateTime(hour, m, period)}
                     className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${minute === m ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                   >
                     {String(m).padStart(2, '0')}
                   </button>
                 ))}
               </div>

               {/* AM/PM */}
               <div className="flex flex-col gap-2 justify-center">
                 {['AM', 'PM'].map(p => (
                   <button
                     key={p}
                     type="button"
                     onClick={() => updateTime(hour, minute, p as 'AM' | 'PM')}
                     className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                   >
                     {p}
                   </button>
                 ))}
               </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
               <button
                 type="button"
                 onClick={() => setIsOpen(false)}
                 className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest"
               >
                 Done
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default CustomTimePicker;
