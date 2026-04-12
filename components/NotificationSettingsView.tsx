
import React, { useState } from 'react';
import { ChevronLeftIcon, BellIcon } from '../constants';
import { User } from '../types';
import { updateUserNotificationSettings } from '../services/userService';
import { usePermissions } from '../contexts/PermissionContext';
import { toast } from 'sonner';

interface NotificationSettingsViewProps {
  onBack: () => void;
  currentUser: User | null;
}

const ToggleSwitch = ({ label, description, checked, onChange }: { label: string, description?: string, checked: boolean, onChange: () => void }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="flex-1 pr-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{label}</h4>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
        <button 
            onClick={onChange}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({ currentUser, onBack }) => {
  const { permissions, requestNotifications } = usePermissions();
  const [settings, setSettings] = useState(currentUser?.notificationSettings || {
      pushEnabled: true,
      emailEnabled: false,
      upcomingReminders: true,
      newEvents: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      emailFrequency: 'instant',
      vibrationEnabled: true
  });
  const [isTesting, setIsTesting] = useState(false);

  const handleRequestPermission = async () => {
      const status = await requestNotifications();
      return status;
  };

  const updateSettings = async (newSettings: any) => {
      setSettings(newSettings);
      if (currentUser) {
          try {
              await updateUserNotificationSettings(currentUser.uid, newSettings);
          } catch (error) {
              console.error("Failed to update notification settings", error);
          }
      }
  };

  const toggle = async (key: string) => {
      // If enabling push notifications and permission is not granted, request it
      if (key === 'pushEnabled' && !settings[key as keyof typeof settings] && permissions.notifications !== 'granted') {
          const success = await requestNotifications();
          if (!success) return;
      }

      const newSettings = { ...settings, [key]: !settings[key as keyof typeof settings] };
      updateSettings(newSettings);
  };

  const handleInputChange = (key: string, value: any) => {
      const newSettings = { ...settings, [key]: value };
      updateSettings(newSettings);
  };

  const handleSendTestNotification = async () => {
      if (permissions.notifications !== 'granted') {
          const success = await requestNotifications();
          if (!success) return;
      }

      setIsTesting(true);
      
      setTimeout(() => {
          if ('Notification' in window && permissions.notifications === 'granted') {
              try {
                  new Notification('Commove Test Notification', {
                      body: 'This is a test notification from Commove. Your settings are working correctly!',
                  });
              } catch (e) {
                  console.warn("Native notification failed:", e);
              }
          }
          toast.success('Commove Test Notification', { description: 'This is a test notification from Commove. Your settings are working correctly!' });
          setIsTesting(false);
      }, 1000);
  };

  const handleResetToDefaults = () => {
      const defaults = {
          pushEnabled: true,
          emailEnabled: false,
          upcomingReminders: true,
          newEvents: false,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          emailFrequency: 'instant' as const,
          vibrationEnabled: true
      };
      updateSettings(defaults);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 pb-20">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up">
        
        <div className="flex items-center justify-end mb-6">
            <button 
                onClick={handleResetToDefaults}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
                Reset Defaults
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600">
                    <BellIcon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">General Preferences</h2>
            </div>
            
            <ToggleSwitch 
                label="Push Notifications" 
                description="Receive alerts on this device"
                checked={settings.pushEnabled} 
                onChange={() => toggle('pushEnabled')} 
            />
            
            {settings.pushEnabled && (
                <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 mb-4">
                    <ToggleSwitch 
                        label="Vibration" 
                        description="Haptic feedback for alerts"
                        checked={settings.vibrationEnabled || false} 
                        onChange={() => toggle('vibrationEnabled')} 
                    />
                    <button 
                        onClick={handleSendTestNotification}
                        disabled={isTesting}
                        className="mt-2 text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2 hover:underline disabled:opacity-50"
                    >
                        {isTesting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                Sending Test...
                            </>
                        ) : (
                            'Send Test Notification'
                        )}
                    </button>
                </div>
            )}

            <ToggleSwitch 
                label="Email Notifications" 
                description="Receive digests and updates via email"
                checked={settings.emailEnabled} 
                onChange={() => toggle('emailEnabled')} 
            />

            {settings.emailEnabled && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email Frequency</label>
                    <select 
                        value={settings.emailFrequency}
                        onChange={(e) => handleInputChange('emailFrequency', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="instant">Instant Alerts</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Summary</option>
                    </select>
                </div>
            )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quiet Hours</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Mute all notifications during a specific time range each day.</p>
            
            <ToggleSwitch 
                label="Enable Quiet Hours" 
                checked={settings.quietHoursEnabled || false} 
                onChange={() => toggle('quietHoursEnabled')} 
            />

            {settings.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                        <input 
                            type="time" 
                            value={settings.quietHoursStart}
                            onChange={(e) => handleInputChange('quietHoursStart', e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Time</label>
                        <input 
                            type="time" 
                            value={settings.quietHoursEnd}
                            onChange={(e) => handleInputChange('quietHoursEnd', e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Alert Types</h2>
            
            <ToggleSwitch 
                label="Upcoming Reminders" 
                description="Get notified before saved events"
                checked={settings.upcomingReminders} 
                onChange={() => toggle('upcomingReminders')} 
            />
            <ToggleSwitch 
                label="New Events in Bacoor" 
                description="Alerts when new events are published"
                checked={settings.newEvents} 
                onChange={() => toggle('newEvents')} 
            />
        </div>

        <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                Commove Notification Engine v2.1
            </p>
        </div>

      </main>
    </div>
  );
};

export default NotificationSettingsView;
