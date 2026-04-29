
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { 
  UserIcon, 
  LogoutIcon, 
  BookmarkIcon, 
  AdminIcon, 
  SettingsIcon, 
  ShieldCheckIcon, 
  ChevronRightIcon, 
  SunIcon, 
  MoonIcon, 
  BellIcon, 
  HelpIcon 
} from '../constants';

interface ProfileDropdownProps {
  user: User;
  onLogout: () => void;
  onShowMyEvents: () => void;
  onShowAdminPanel: () => void;
  onShowNotificationSettings?: () => void;
  onShowHelpSupport?: () => void;
  onShowTermsAndConditions?: () => void;
  theme?: string;
  toggleTheme?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
  user, 
  onLogout, 
  onShowMyEvents, 
  onShowAdminPanel,
  onShowNotificationSettings,
  onShowHelpSupport,
  onShowTermsAndConditions,
  theme,
  toggleTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action?: () => void) => {
    if (action) action();
    setIsOpen(false);
  };

  const isStaff = user.role === 'admin' || user.role === 'facilitator';
  const roleLabel = user.role === 'admin' ? 'Administrator' : (user.role === 'facilitator' ? 'Facilitator' : 'Resident');
  const dashboardTitle = user.role === 'admin' ? 'Admin Analytics' : 'Facilitator Dashboard';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors overflow-hidden"
        aria-label="Toggle profile menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl || undefined} alt={user.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm">
              {user.name.charAt(0)}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 origin-top-right transition-transform transition-opacity duration-150 ease-out flex flex-col gap-2 p-2"
          style={{ transform: 'scale(1)', opacity: 1 }}
        >
          {/* User Info Card */}
          <div className="bg-primary-600 dark:bg-primary-800 p-3 rounded-lg shadow-sm relative z-20">
              <div className="flex items-center gap-2.5">
                  <div className="relative group shrink-0">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-md overflow-hidden">
                          {user?.avatarUrl ? (
                              <img src={user.avatarUrl || undefined} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                              <UserIcon className="w-5 h-5" />
                          )}
                      </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h2 className="text-sm font-bold text-white truncate leading-tight">{user?.name || 'User'}</h2>
                      <p className="text-white/80 text-[10px] truncate mb-1 leading-tight mt-0.5">{user?.email || 'No email'}</p>
                      <div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white/20 text-white`}>
                              {isStaff && <ShieldCheckIcon className="w-2 h-2 mr-1" />}
                              {roleLabel}
                          </span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Admin Dashboard Card */}
          {isStaff && (
              <div 
                  className="bg-gray-900 dark:bg-black p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors shadow-sm" 
                  onClick={() => handleAction(onShowAdminPanel)}
              >
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                          <ShieldCheckIcon className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="text-white font-bold text-sm">{dashboardTitle}</h3>
                          <p className="text-gray-400 text-xs">Manage events & approvals</p>
                      </div>
                  </div>
                  <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-gray-400">
                      <ChevronRightIcon className="w-3 h-3" />
                  </div>
              </div>
          )}

          {/* Links List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              {toggleTheme && (
                <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="text-orange-500">
                            {theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Dark Mode
                        </span>
                    </div>
                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-1 ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </button>
              )}

              <button onClick={() => handleAction(onShowMyEvents)} className="w-full flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="text-gray-400"><BookmarkIcon className="w-4 h-4" /></div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">My Events</span>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </button>
              
              {onShowNotificationSettings && (
                <button onClick={() => handleAction(onShowNotificationSettings)} className="w-full flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="text-gray-400"><BellIcon className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notification Settings</span>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {onShowHelpSupport && (
                <button onClick={() => handleAction(onShowHelpSupport)} className="w-full flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="text-gray-400"><HelpIcon className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Help & Support</span>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {onShowTermsAndConditions && (
                <button onClick={() => handleAction(onShowTermsAndConditions)} className="w-full flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="text-gray-400"><ShieldCheckIcon className="w-4 h-4" /></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Terms & Conditions</span>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}

              <button onClick={() => handleAction(onLogout)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-red-600 dark:text-red-400">
                  <div className="flex items-center gap-3">
                      <div className="text-red-400"><LogoutIcon className="w-4 h-4" /></div>
                      <span className="text-sm font-semibold">Log Out</span>
                  </div>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
