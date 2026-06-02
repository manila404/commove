import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

interface PermissionContextType {
  permissions: {
    location: PermissionStatus;
    camera: PermissionStatus;
    notifications: PermissionStatus;
  };
  requestLocation: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// WebView Bridge Helpers
export const isInWebView = (): boolean =>
  typeof window !== 'undefined' &&
  !!(window as any).ReactNativeWebView;

export const postToNative = (message: object) => {
  if (isInWebView()) {
    (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
  }
};

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<{
    location: PermissionStatus;
    camera: PermissionStatus;
    notifications: PermissionStatus;
  }>({
    location: 'prompt',
    camera: 'prompt',
    notifications: 'prompt',
  });

  const pendingNotifResolverRef = React.useRef<((granted: boolean) => void) | null>(null);

  useEffect(() => {
    const handleNativeMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'NOTIFICATION_PERMISSION_RESULT') {
          const granted: boolean = !!data.granted;
          setPermissions(prev => ({ ...prev, notifications: granted ? 'granted' : 'denied' }));
          if (pendingNotifResolverRef.current) {
            pendingNotifResolverRef.current(granted);
            pendingNotifResolverRef.current = null;
          }
          if (!granted) toast.error('Notification access denied. Please enable it in your device settings.');
        }
        if (data?.type === 'INITIAL_NOTIFICATION_STATUS') {
          const status: PermissionStatus = data.status ?? 'prompt';
          setPermissions(prev => ({ ...prev, notifications: status }));
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handleNativeMessage);
    return () => window.removeEventListener('message', handleNativeMessage);
  }, []);

  useEffect(() => {
    if (isInWebView()) postToNative({ type: 'GET_NOTIFICATION_STATUS' });
  }, []);

  const checkPermissions = useCallback(async () => {
    const newStatus = { ...permissions };
    if ('geolocation' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        newStatus.location = result.state as PermissionStatus;
        result.onchange = () => setPermissions(prev => ({ ...prev, location: result.state as PermissionStatus }));
      } catch { newStatus.location = 'prompt'; }
    } else { newStatus.location = 'unsupported'; }

    if (isInWebView()) {
      // Native layer handles this via INITIAL_NOTIFICATION_STATUS
    } else if ('Notification' in window) {
      const status = Notification.permission;
      newStatus.notifications = (status === 'default' ? 'prompt' : status) as PermissionStatus;
    } else { newStatus.notifications = 'unsupported'; }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      newStatus.camera = result.state as PermissionStatus;
      result.onchange = () => setPermissions(prev => ({ ...prev, camera: result.state as PermissionStatus }));
    } catch { newStatus.camera = 'prompt'; }

    setPermissions(newStatus);
  }, [permissions]);

  useEffect(() => { checkPermissions(); }, []);

  const requestLocation = async () => {
    return new Promise<boolean>((resolve) => {
      if (!('geolocation' in navigator)) { toast.error('Geolocation is not supported by your browser'); resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        () => { setPermissions(prev => ({ ...prev, location: 'granted' })); resolve(true); },
        (error) => { console.error('Location error:', error); setPermissions(prev => ({ ...prev, location: 'denied' })); toast.error('Location access denied. Please enable it in settings.'); resolve(false); }
      );
    });
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
      toast.error('Camera access denied. Please enable it in settings.');
      return false;
    }
  };

  const requestNotifications = async (): Promise<boolean> => {
    if (isInWebView()) {
      return new Promise<boolean>((resolve) => {
        pendingNotifResolverRef.current = resolve;
        postToNative({ type: 'REQUEST_NOTIFICATION_PERMISSION' });
        setTimeout(() => {
          if (pendingNotifResolverRef.current) {
            pendingNotifResolverRef.current = null;
            toast.error('Permission request timed out. Please try again.');
            resolve(false);
          }
        }, 15000);
      });
    }
    if (!('Notification' in window)) { toast.error('Notifications are not supported by your browser'); return false; }
    const permission = await Notification.requestPermission();
    setPermissions(prev => ({ ...prev, notifications: permission as PermissionStatus }));
    if (permission === 'granted') return true;
    toast.error('Notification access denied.');
    return false;
  };

  return (
    <PermissionContext.Provider value={{ permissions, requestLocation, requestCamera, requestNotifications, checkPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) throw new Error('usePermissions must be used within a PermissionProvider');
  return context;
};
