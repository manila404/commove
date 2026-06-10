import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalStyles, setPortalStyles] = useState<React.CSSProperties>({});

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

  // Dynamic window position tracking logic
  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const isMobile = window.innerWidth < 768;

    let left = rect.left + scrollX;
    if (!isMobile) {
      // Align the right side of the menu box with the right edge of the text field button
      left = rect.right + scrollX - 280;
    }

    // Horizontal protection guards for viewports
    if (left + 280 > window.innerWidth) {
      left = window.innerWidth - 296;
    }
    if (left < 16) {
      left = 16;
    }

    setPortalStyles({
      position: 'absolute',
      top: `${rect.bottom + scrollY + 8}px`, // includes an 8px margin spacer
      left: `${left}px`,
      width: '280px',
      zIndex: 9999,
    });
  };

  // Keep dropdown anchored during window adjustment behaviors
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen]);

  // Handle clicking outside container or floating portal scope safely
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 transition-all text-left"
      >
        <span className={value ? 'font-medium' : 'text-gray-400'}>{formatDisplayTime(value)}</span>
        <Clock className="w-5 h-5 text-gray-400" />
      </button>

      {/* Render menu layout tree straight directly to document.body root overlay layer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              style={portalStyles}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl"
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
        </AnimatePresence>,
        document.body
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default CustomTimePicker;