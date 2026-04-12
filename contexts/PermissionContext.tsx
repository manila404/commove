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

  const checkPermissions = useCallback(async () => {
    const newStatus = { ...permissions };

    // Check Geolocation
    if ('geolocation' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        newStatus.location = result.state as PermissionStatus;
        result.onchange = () => {
          setPermissions(prev => ({ ...prev, location: result.state as PermissionStatus }));
        };
      } catch (e) {
        newStatus.location = 'prompt';
      }
    } else {
      newStatus.location = 'unsupported';
    }

    // Check Notifications
    const isMobileApp = typeof window !== 'undefined' && (
      (window as any).ReactNativeWebView || 
      /Android|iPhone|iPad|iPod|Expo/i.test(navigator.userAgent) ||
      (window as any).standalone === true
    );

    if (isMobileApp) {
      newStatus.notifications = 'granted';
    } else if ('Notification' in window) {
      const status = Notification.permission;
      newStatus.notifications = (status === 'default' ? 'prompt' : status) as PermissionStatus;
    } else {
      newStatus.notifications = 'unsupported';
    }

    // Camera is harder to check without requesting, but we can try permissions API
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      newStatus.camera = result.state as PermissionStatus;
      result.onchange = () => {
        setPermissions(prev => ({ ...prev, camera: result.state as PermissionStatus }));
      };
    } catch (e) {
      // Fallback if camera query is not supported
      newStatus.camera = 'prompt';
    }

    setPermissions(newStatus);
  }, [permissions]);

  useEffect(() => {
    checkPermissions();
  }, []);

  const requestLocation = async () => {
    return new Promise<boolean>((resolve) => {
      if (!('geolocation' in navigator)) {
        toast.error('Geolocation is not supported by your browser');
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissions(prev => ({ ...prev, location: 'granted' }));
          resolve(true);
        },
        (error) => {
          console.error('Location error:', error);
          setPermissions(prev => ({ ...prev, location: 'denied' }));
          toast.error('Location access denied. Please enable it in settings.');
          resolve(false);
        }
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

  const requestNotifications = async () => {
    // Detect if we are in the Mobile App wrapper
    const isMobileApp = typeof window !== 'undefined' && (
      (window as any).ReactNativeWebView || 
      /Android|iPhone|iPad|iPod|Expo/i.test(navigator.userAgent) ||
      (window as any).standalone === true
    );

    if (isMobileApp) {
        // Mobile always uses internal Firestore notifications, so we treat as granted immediately
        setPermissions(prev => ({ ...prev, notifications: 'granted' }));
        return true;
    }

    if (!('Notification' in window)) {
      toast.error('Notifications are not supported by your browser');
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermissions(prev => ({ ...prev, notifications: permission as PermissionStatus }));
    
    if (permission === 'granted') {
      return true;
    } else {
      toast.error('Notification access denied.');
      return false;
    }
  };

  return (
    <PermissionContext.Provider value={{ permissions, requestLocation, requestCamera, requestNotifications, checkPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
