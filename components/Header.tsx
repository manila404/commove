
import React from 'react';
import type { User, Reminder } from '../types';
import { CommoveLogo, ChevronLeftIcon, SunIcon, MoonIcon, UserIcon } from '../constants';

interface HeaderProps {
    currentUser: User | null;
    reminders: Record<string, Reminder>;
    events: any[];
    onBack?: () => void;
    onProfileClick?: () => void;
    renderProfileDropdown?: () => React.ReactNode;
    title?: string;
    subtitle?: string;
    theme?: string;
    toggleTheme?: () => void;
    isProfileOpen?: boolean;
}

const LiveClock = () => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dayName = time.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
        <div className="hidden sm:flex flex-col items-end justify-center mr-4">
            <div className="text-sm md:text-base font-semibold text-gray-900 dark:text-white tabular-nums tracking-tight leading-none mb-1">
                {formattedTime}
            </div>
            <div className="text-[10px] md:text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-tight leading-none">
                {dayName}, {formattedDate}
            </div>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({
    currentUser, reminders, events, onBack, onProfileClick, renderProfileDropdown,
    title, subtitle, theme, toggleTheme, isProfileOpen = false
}) => {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 pt-safe">
      <div className="w-full px-3 md:px-4 py-3 md:py-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
              {onBack ? (
                <button 
                    onClick={onBack} 
                    className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                </button>
              ) : (
                <div className="flex items-center select-none text-xl md:text-2xl tracking-tighter mr-2" style={{ fontFamily: "'Inter', ui-sans-serif, sans-serif", letterSpacing: '-0.02em' }}>
                    {/* Stylized 'C' SVG */}
                    <div className="relative inline-flex items-center justify-center mr-[-0.08em] text-gray-900 dark:text-white">
                        <svg
                            style={{ width: '0.65em', height: '0.65em', transform: 'translateY(0.06em)' }}
                            viewBox="0 0 100 100"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="20"
                        >
                            {/* The outer arc of the 'C' */}
                            <path d="M 82 26 A 40 40 0 1 0 82 74" />
                            {/* The inner dot/circle */}
                            <circle cx="48" cy="50" r="14" fill="#0052A3" stroke="none" />
                        </svg>
                    </div>

                    {/* The rest of the logo text */}
                    {!title && (
                        <>
                            <span className="font-semibold text-gray-900 dark:text-white">om</span>
                            <span className="font-normal text-[#0052A3] dark:text-[#5BA4F5]">move</span>
                        </>
                    )}
                </div>
              )}
              {title && (
                  <div className="flex flex-col ml-2">
                      <span className="text-sm md:text-base font-semibold text-gray-800 dark:text-white leading-tight">{title}</span>
                      {subtitle && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium leading-tight truncate max-w-[200px] md:max-w-xs">{subtitle}</span>
                      )}
                  </div>
              )}
            </div>

            <div className="flex items-center gap-1 md:gap-3">
                <LiveClock />
                
                {toggleTheme && (
                    <button 
                        onClick={toggleTheme}
                        disabled={isProfileOpen}
                        className={`flex items-center justify-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-300 overflow-hidden ${
                            isProfileOpen 
                                ? 'opacity-0 scale-75 pointer-events-none w-0 h-0 p-0' 
                                : 'opacity-100 scale-100 w-10 h-10 p-2'
                        }`}
                    >
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            {theme === 'dark' ? <MoonIcon className="w-6 h-6 text-gray-100" /> : <SunIcon className="w-6 h-6 text-gray-800" />}
                        </div>
                    </button>
                )}
                {renderProfileDropdown ? (
                    renderProfileDropdown()
                ) : onProfileClick ? (
                    <button 
                        onClick={onProfileClick}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors overflow-hidden"
                    >
                        {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl || undefined} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : currentUser ? (
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
                                {(currentUser.name || 'U').charAt(0)}
                            </div>
                        ) : (
                            // Guest: show generic user icon
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <UserIcon className="w-5 h-5" />
                            </div>
                        )}
                    </button>
                ) : null}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
