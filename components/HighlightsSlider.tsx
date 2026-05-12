import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DisplayEventType } from '../types';
import { formatDisplayDate } from '../constants';

interface HighlightsSliderProps {
  events: DisplayEventType[];
  onEventSelect: (event: DisplayEventType) => void;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Concerts': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'Arts': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'Competitions': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Technology': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'Gaming': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    'Conference': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'Business': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'Health': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    'Expo Events': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'Cafe': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    'Cosplay': 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  };
  return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
};

const HighlightsSlider: React.FC<HighlightsSliderProps> = ({ events, onEventSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const highlights = events.filter(e => e.imageUrl).slice(0, 5);

  useEffect(() => {
    if (highlights.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [highlights.length]);

  if (highlights.length === 0) return null;

  const total = highlights.length;
  const safeIndex = currentIndex % total;

  return (
    <div className="relative w-full pb-8 flex flex-col items-center overflow-hidden">
      <div className="relative w-full h-52 md:h-[480px] flex items-center justify-center">
        <AnimatePresence initial={false}>
          {highlights.map((highlight, index) => {
            let offset = (index - safeIndex) % total;
            if (offset < 0) offset += total;
            
            let isCenter = offset === 0;
            let isRight = offset === 1;
            let isLeft = offset === total - 1;
            
            if (total === 1) {
              isCenter = true; isRight = false; isLeft = false;
            } else if (total === 2) {
              isRight = offset === 1;
              isLeft = false;
            }

            let x = "0%";
            let scale = 1;
            let zIndex = 10;
            let opacity = 1;
            
            if (isCenter) {
              x = "0%";
              scale = 1;
              zIndex = 10;
              opacity = 1;
            } else if (isRight) {
              x = isMobile ? "94%" : "95%";
              scale = 0.82;
              zIndex = 5;
              opacity = 1;
            } else if (isLeft) {
              x = isMobile ? "-94%" : "-95%";
              scale = 0.82;
              zIndex = 5;
              opacity = 1;
            } else {
              x = offset > total / 2 ? "200%" : "-200%";
              scale = 0.8;
              zIndex = 1;
              opacity = 0;
            }

            return (
              <motion.div
                key={highlight.id || index}
                initial={false}
                animate={{ x, scale, zIndex, opacity }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className={`absolute ${isMobile ? 'w-[80%]' : 'w-[85%]'} max-w-[1000px] h-full rounded-[15px] overflow-hidden cursor-pointer ${
                  isCenter ? 'pointer-events-auto' : 'pointer-events-auto'
                }`}
                onClick={() => {
                  if (isCenter) {
                    onEventSelect(highlight);
                  } else {
                    setCurrentIndex(index);
                  }
                }}
              >
                <img 
                  src={highlight.imageUrl || undefined} 
                  alt={highlight.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <motion.div 
                  initial={false}
                  animate={{ opacity: isCenter ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-between p-6 md:p-10"
                >
                  {/* Category Capsules */}
                  <div className="flex flex-wrap gap-2 self-start">
                    {(Array.isArray(highlight.category) ? highlight.category : [highlight.category || "Event"]).map((cat, i) => (
                      <div 
                        key={i} 
                        className={isMobile 
                          ? "text-gray-200 text-xs font-medium" 
                          : `px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${getCategoryColor(cat)}`
                        }
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                  
                  {/* Text content */}
                  <div className="mb-2 max-w-3xl">
                    <h3 className={`text-white ${isMobile ? 'text-lg mb-1' : 'text-2xl md:text-[32px] mb-3'} font-extrabold font-sans leading-[1.3] line-clamp-3`}>
                      {highlight.name}
                    </h3>
                    <p className="text-gray-300 text-sm md:text-base font-medium font-sans">
                      {highlight.venue} • {formatDisplayDate(highlight.date, highlight.endDate)}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex space-x-2 mt-8">
        {highlights.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === safeIndex ? 'w-8 bg-primary-600' : 'w-2.5 bg-gray-200 dark:bg-gray-700'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HighlightsSlider;
