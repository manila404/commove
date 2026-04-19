import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DisplayEventType } from '../types';
import { formatDisplayDate } from '../constants';

interface HighlightsSliderProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

const HighlightsSlider: React.FC<HighlightsSliderProps> = ({ events, onEventSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Filter for events with images and take top 5
  const highlights = events.filter(e => e.imageUrl).slice(0, 5);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % highlights.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
  };

  if (highlights.length === 0) return null;

  // Ensure currentIndex is within bounds if highlights array changes
  const safeIndex = currentIndex >= highlights.length ? 0 : currentIndex;
  const currentHighlight = highlights[safeIndex];

  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-2xl mb-8 group shadow-lg">
      <AnimatePresence mode="wait">
        <motion.div
          key={safeIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => onEventSelect(currentHighlight)}
        >
          <img 
            src={currentHighlight.imageUrl || undefined} 
            alt={currentHighlight.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
            <h3 className="text-white text-2xl font-bold">{currentHighlight.name}</h3>
            <p className="text-gray-200 text-sm">{currentHighlight.venue} • {formatDisplayDate(currentHighlight.date, currentHighlight.endDate)}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
        <ChevronLeft />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-2 rounded-full text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
        <ChevronRight />
      </button>
    </div>
  );
};

export default HighlightsSlider;
