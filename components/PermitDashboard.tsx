
import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, LocationIcon, ShieldCheckIcon } from '../constants';
import NewPermitRequest from './NewPermitRequest';
import MyPermitApplications from './MyPermitApplications';
import RequestDetails from './RequestDetails';
import type { EventType } from '../types';

interface PermitDashboardProps {
  onBack: () => void;
  onManageRegistrations?: (event: EventType) => void;
}

const DocumentIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

const PermitDashboard: React.FC<PermitDashboardProps> = ({ onBack, onManageRegistrations }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'department-select' | 'new-request' | 'my-applications' | 'request-details'>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<EventType | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const handleStartNewRequest = () => {
    try {
        window.history.pushState({ view: 'permit', subView: 'dept-select' }, '');
    } catch (e) {}
    setCurrentView('department-select');
  };

  const handleDepartmentSelect = (dept: string) => {
      setSelectedDepartment(dept);
      try {
        window.history.pushState({ view: 'permit', subView: 'new' }, '');
      } catch (e) {}
      setCurrentView('new-request');
  };

  const handleMyApplications = () => {
    try {
        window.history.pushState({ view: 'permit', subView: 'my-apps' }, '');
    } catch (e) {}
    setCurrentView('my-applications');
  };

  const handleOpenRequestDetails = (request: EventType) => {
      setSelectedRequest(request);
      try {
        window.history.pushState({ view: 'permit', subView: 'details', requestId: request.id }, '');
      } catch (e) {}
      setCurrentView('request-details');
  };

  // Listen for browser back button to handle internal navigation
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
        const state = event.state;
        if (state?.view === 'permit') {
            if (state.subView === 'dept-select') {
                setCurrentView('department-select');
            } else if (state.subView === 'new') {
                setCurrentView('new-request');
            } else if (state.subView === 'my-apps') {
                setCurrentView('my-applications');
            } else if (state.subView === 'details') {
                if (selectedRequest) setCurrentView('request-details');
                else setCurrentView('my-applications'); 
            } else {
                setCurrentView('dashboard');
            }
        }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [selectedRequest]);

  if (currentView === 'new-request') {
      return (
        <NewPermitRequest 
            onBack={() => {
                // Use history.back() to pop the 'new' state and return to 'dept-select' state
                // The popstate listener will update currentView automatically
                window.history.back();
            }} 
            initialDepartment={selectedDepartment}
        />
      );
  }

  if (currentView === 'my-applications') {
      return <MyPermitApplications onBack={() => window.history.back()} onSelectRequest={handleOpenRequestDetails} onManageRegistrations={onManageRegistrations} />;
  }

  if (currentView === 'request-details' && selectedRequest) {
      return <RequestDetails request={selectedRequest} onBack={() => window.history.back()} />;
  }

  // --- Department Selection View ---
  if (currentView === 'department-select') {
      const departments = [
          { name: 'Tourism Department', icon: '📸', desc: 'Fairs, Exhibits, Cultural Events', color: 'bg-purple-100 text-purple-600' },
          { name: 'PESO Department', icon: '💼', desc: 'Job Fairs, Seminars, Career Events', color: 'bg-blue-100 text-blue-600' },
          { name: 'Sports Department', icon: '🏀', desc: 'Leagues, Tournaments, Fun Runs', color: 'bg-orange-100 text-orange-600' },
      ];

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
            <main className="container mx-auto p-6 max-w-lg animate-fade-in-up">
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm text-center">
                    Please choose the category relevant to your event proposal.
                </p>
                <div className="space-y-4">
                    {departments.map((dept) => (
                        <button
                            key={dept.name}
                            onClick={() => handleDepartmentSelect(dept.name)}
                            className="w-full bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-5 hover:scale-[1.02] hover:shadow-md transition-all group"
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${dept.color}`}>
                                {dept.icon}
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{dept.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dept.desc}</p>
                            </div>
                            <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                        </button>
                    ))}
                </div>
            </main>
        </div>
      );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <main className="container mx-auto p-4 md:p-6 max-w-lg animate-fade-in-up">
        
        {/* Hero Card */}
        <div className="bg-[#7c3aed] rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden text-white min-h-[180px] flex items-center">
            <div className="relative z-10 max-w-[65%]">
                <h2 className="text-2xl font-extrabold mb-2">Event Permits</h2>
                <p className="text-xs text-white/90 leading-relaxed mb-4 font-medium">
                    Planning an event in Bacoor? Apply for necessary permits directly through the app.
                </p>
                <div className="inline-flex items-center bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <ClockIcon className="w-3 h-3 mr-1.5 text-white" />
                    <span className="text-[10px] font-bold">Processing time: 3-5 days</span>
                </div>
            </div>

            {/* Illustration */}
            <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-32 h-32">
                <div className="relative w-full h-full transform rotate-12">
                     <div className="absolute top-0 right-4 w-10 h-12 bg-green-400 rounded-b-full shadow-lg z-20 flex items-center justify-center border-2 border-white/20">
                         <ShieldCheckIcon className="w-6 h-6 text-white" />
                     </div>
                     <div className="absolute top-4 right-0 w-24 h-28 bg-white rounded-xl shadow-2xl transform -rotate-6 flex flex-col items-center pt-3 border-b-4 border-blue-200">
                         <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-2"></div>
                         <div className="w-16 h-1 bg-gray-100 rounded-full mb-1"></div>
                         <div className="w-12 h-1 bg-gray-100 rounded-full mb-1"></div>
                         <div className="w-16 h-1 bg-gray-100 rounded-full mb-3"></div>
                         <div className="w-8 h-8 rounded-full border-2 border-green-400 mt-auto mb-2 flex items-center justify-center text-green-500 text-[10px]">✔</div>
                     </div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
            <button 
                onClick={handleStartNewRequest}
                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-shadow"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <DocumentIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white">New Application</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Submit a new event proposal.</p>
                    </div>
                </div>
                <div className="text-gray-400 group-hover:text-primary-600 transition-colors">
                    <ChevronRightIcon className="w-5 h-5" />
                </div>
            </button>

             <button 
                onClick={handleMyApplications}
                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-shadow"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                        <ClockIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white">My Applications</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Check status of existing requests</p>
                    </div>
                </div>
                <div className="text-gray-400 group-hover:text-primary-600 transition-colors">
                    <ChevronRightIcon className="w-5 h-5" />
                </div>
            </button>
        </div>

        {/* Requirements Info */}
        <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">General Requirements</h3>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="w-6 h-6 flex items-center justify-center text-[#7c3aed]"><LocationIcon className="w-5 h-5" /></div>
                         <span className="text-sm text-gray-600 dark:text-gray-300">Location: Bacoor Government Center</span>
                    </div>
                     <div className="flex items-center gap-3">
                         <div className="w-6 h-6 flex items-center justify-center text-green-500"><CheckCircleIcon className="w-5 h-5" /></div>
                         <span className="text-sm text-gray-600 dark:text-gray-300">Letter of Intent addressed to Mayor</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="w-6 h-6 flex items-center justify-center text-green-500"><CheckCircleIcon className="w-5 h-5" /></div>
                         <span className="text-sm text-gray-600 dark:text-gray-300">Organizer's Valid ID</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="w-6 h-6 flex items-center justify-center text-green-500"><CheckCircleIcon className="w-5 h-5" /></div>
                         <span className="text-sm text-gray-600 dark:text-gray-300">Business Permit</span>
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
};

export default PermitDashboard;
