
import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, CalendarIcon, ClockIcon, UserIcon } from '../constants';
import { fetchUserRequests } from '../services/eventService';
import { auth } from '../services/firebase';
import type { EventType } from '../types';
import Spinner from './Spinner';

interface MyPermitApplicationsProps {
  onBack: () => void;
  onSelectRequest?: (request: EventType) => void;
  onManageRegistrations?: (request: EventType) => void;
}

const ClipboardIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const MyPermitApplications: React.FC<MyPermitApplicationsProps> = ({ onBack, onSelectRequest, onManageRegistrations }) => {
  const [applications, setApplications] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const loadRequests = async () => {
          if (!auth.currentUser) return;
          try {
              const data = await fetchUserRequests(auth.currentUser.uid);
              // Sort by date (newest first)
              const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setApplications(sorted);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
      loadRequests();
  }, []);

  const getStatusBadge = (status: string | undefined) => {
      let label = 'PENDING';
      let colorClass = 'bg-orange-100 text-orange-500';

      switch (status) {
          case 'published':
              label = 'APPROVED';
              colorClass = 'bg-green-100 text-green-600';
              break;
          case 'rejected':
              label = 'DISAPPROVED';
              colorClass = 'bg-red-100 text-red-500';
              break;
          case 'reviewed':
              label = 'IN REVIEW';
              colorClass = 'bg-blue-100 text-blue-500';
              break;
          default:
              label = 'PENDING';
              colorClass = 'bg-orange-100 text-orange-500';
              break;
      }

      return (
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap ${colorClass}`}>
              {label}
          </span>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 px-4 py-4 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">My Applications</h1>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-lg animate-fade-in-up">
        
        {isLoading ? (
            <div className="flex justify-center py-20"><Spinner /></div>
        ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
                    <ClipboardIcon className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Applications Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
                    You haven't submitted any event permit requests. Once you submit a request, you can track its status here.
                </p>
            </div>
        ) : (
            <div className="space-y-4">
                {applications.map(app => (
                    <div 
                        key={app.id} 
                        className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex gap-4">
                            <img 
                                src={app.imageUrl || undefined} 
                                alt="" 
                                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-gray-100 border border-gray-100 dark:border-gray-700" 
                                onClick={() => onSelectRequest && onSelectRequest(app)}
                            />
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight line-clamp-2">
                                        {app.name}
                                    </h3>
                                    {getStatusBadge(app.status)}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <UserIcon className="w-3.5 h-3.5" />
                                    <span className="truncate font-medium">{app.organizer || 'Me'}</span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        <span>{app.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        <span>{app.startTime}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div className="mt-4 flex gap-2">
                            <button 
                                onClick={() => onSelectRequest && onSelectRequest(app)}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold py-3 rounded-xl text-sm transition-colors"
                            >
                                View Status Details
                            </button>
                            {app.isPrivate && app.status === 'published' && (
                                <button 
                                    onClick={() => onManageRegistrations && onManageRegistrations(app)}
                                    className="flex-1 bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-400 font-bold py-3 rounded-xl text-sm transition-colors"
                                >
                                    Manage Registrations
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
};

export default MyPermitApplications;
