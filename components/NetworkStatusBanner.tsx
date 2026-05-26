import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../contexts/NetworkStatusContext';

const NetworkStatusBanner: React.FC = () => {
  const { status, retry } = useNetworkStatus();

  const isVisible = status === 'offline' || status === 'slow';

  const handleRetry = () => {
    retry();
    // Dispatch custom event so App.tsx can re-fetch data
    window.dispatchEvent(new CustomEvent('commove:network-retry'));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[10000] px-4 py-3 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md ${
            status === 'offline'
              ? 'bg-red-600/95 text-white'
              : 'bg-amber-500/95 text-white'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3 min-w-0">
            {status === 'offline' ? (
              <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
            ) : (
              <Wifi className="w-5 h-5 flex-shrink-0 animate-pulse" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">
                {status === 'offline'
                  ? 'You are offline'
                  : 'Slow connection detected'}
              </p>
              <p className="text-xs opacity-90 leading-tight mt-0.5">
                {status === 'offline'
                  ? 'Please check your internet connection and try again.'
                  : 'Your internet is slow. Some features may not load properly.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleRetry}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${
              status === 'offline'
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white/25 hover:bg-white/35 text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatusBanner;
