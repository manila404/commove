import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { useNetworkStatus } from '../contexts/NetworkStatusContext';

const NetworkStatusBanner: React.FC = () => {
  const { status, retry } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  // Re-show whenever status changes
  useEffect(() => {
    setDismissed(false);
  }, [status]);

  const isVisible = (status === 'offline' || status === 'slow') && !dismissed;

  const handleRetry = () => {
    retry();
    window.dispatchEvent(new CustomEvent('commove:network-retry'));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-auto"
          role="alert"
          aria-live="assertive"
        >
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md ${
            status === 'offline'
              ? 'bg-red-600/95 text-white'
              : 'bg-amber-500/95 text-white'
          }`}>
            {/* Icon */}
            {status === 'offline'
              ? <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
              : <Wifi className="w-4 h-4 flex-shrink-0 animate-pulse" />
            }

            {/* Text */}
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight whitespace-nowrap">
                {status === 'offline' ? 'You are offline' : 'Slow connection'}
              </p>
              <p className="text-[10px] opacity-85 leading-tight whitespace-nowrap">
                {status === 'offline'
                  ? 'Check your internet and try again.'
                  : 'Some features may not load properly.'}
              </p>
            </div>

            {/* Retry */}
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30 transition-all active:scale-95 flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all active:scale-95 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusBanner;
