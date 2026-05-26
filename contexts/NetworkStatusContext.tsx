import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

type NetworkStatus = 'online' | 'offline' | 'slow';

interface NetworkStatusContextType {
  status: NetworkStatus;
  isOnline: boolean;
  isSlow: boolean;
  retry: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

const PING_URL = 'https://www.google.com/generate_204';
const PING_INTERVAL = 30000; // Check every 30 seconds
const SLOW_THRESHOLD = 3000; // 3 seconds = slow

export const NetworkStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCallbacksRef = useRef<Set<() => void>>(new Set());

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SLOW_THRESHOLD + 1000);

      const start = performance.now();
      await fetch(PING_URL, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      const elapsed = performance.now() - start;
      clearTimeout(timeout);

      setStatus(elapsed > SLOW_THRESHOLD ? 'slow' : 'online');
    } catch {
      // If fetch fails entirely but navigator says online, it's likely slow/unstable
      setStatus(navigator.onLine ? 'slow' : 'offline');
    }
  }, []);

  // Browser online/offline events for instant detection
  useEffect(() => {
    const handleOnline = () => {
      checkConnection(); // Verify quality after going online
    };
    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnection();

    // Periodic ping
    pingTimerRef.current = setInterval(checkConnection, PING_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    };
  }, [checkConnection]);

  const retry = useCallback(() => {
    checkConnection();
    // Trigger all registered retry callbacks (e.g., reload events)
    retryCallbacksRef.current.forEach(cb => cb());
  }, [checkConnection]);

  return (
    <NetworkStatusContext.Provider value={{
      status,
      isOnline: status !== 'offline',
      isSlow: status === 'slow',
      retry,
    }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = (): NetworkStatusContextType => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};

// Hook for components to register a retry callback that fires when user taps "Retry"
export const useNetworkRetry = (callback: () => void) => {
  const context = useContext(NetworkStatusContext);
  useEffect(() => {
    if (!context) return;
    // Access the ref through a closure — the ref is stable across renders
    const ref = (context as any)._retryCallbacks as Set<() => void> | undefined;
    // Fallback: we use the retry mechanism via event
    const handler = () => callback();
    window.addEventListener('commove:network-retry', handler);
    return () => window.removeEventListener('commove:network-retry', handler);
  }, [callback, context]);
};
