
import React, { useState, useRef, useEffect } from 'react';
import { BellIcon } from '../constants';
import type { Reminder } from '../types';

interface NotificationButtonProps {
    reminders: Record<string, Reminder>;
    events: any[]; 
}

const NotificationButton: React.FC<NotificationButtonProps> = ({ reminders, events }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const reminderList: Reminder[] = Object.values(reminders);
    const hasNotifications = reminderList.length > 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getEventName = (eventId: string) => {
        return events.find(e => e.id === eventId)?.name || 'Unknown Event';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Notifications"
            >
                <BellIcon className="w-6 h-6" />
                {hasNotifications && (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden origin-top-right">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Active Reminders</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {reminderList.length > 0 ? (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {reminderList.map((rem) => (
                                    <li key={rem.eventId} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{getEventName(rem.eventId)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                            Reminding at {new Date(rem.remindAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-6 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No active reminders.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default NotificationButton;
