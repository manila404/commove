
import React from 'react';
import { ChevronLeftIcon, ClockIcon, LocationIcon } from '../constants';
import type { EventType } from '../types';

interface RequestDetailsProps {
  request: EventType;
  onBack: () => void;
}

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

const InformationCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ChatBubbleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
);

const PushPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.82 2.18a.75.75 0 00-1.06 1.06l.47.47-1.03 1.03-4.5-4.5a.75.75 0 00-1.06 1.06l4.5 4.5-1.03 1.03-.47-.47a.75.75 0 00-1.06 1.06l3.75 3.75zM14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434 1.279l-2.25 2.25.879 2.64c.123.37.05.789-.188 1.089l-2.035 2.564 3.525 3.525a.75.75 0 01-1.06 1.06l-3.526-3.526-2.564 2.035c-.3.238-.719.311-1.089.188l-2.64-.879 2.25-2.25a5.23 5.23 0 00-1.28-3.434l4.5-4.5zm-5.094 2.032l-2.25 2.25a5.23 5.23 0 00-1.28 3.434 9.768 9.768 0 016.963-6.963 5.23 5.23 0 00-3.434-1.28l-4.5 4.5z" />
        <path d="M.75 20.25a.75.75 0 001.06 1.06l9.975-9.975a.75.75 0 00-1.06-1.06L.75 20.25z" />
    </svg>
);

const RequestDetails: React.FC<RequestDetailsProps> = ({ request, onBack }) => {
  const isRejected = request.status === 'rejected';
  const isApproved = request.status === 'published';

  // --- REJECTED VIEW ---
  if (isRejected) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 font-sans">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 px-4 py-4 flex items-center">
                <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                </button>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Request Details</h1>
            </header>

            <main className="container mx-auto p-6 max-w-md animate-fade-in-up">
                {/* Status Hero - Rejected */}
                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 shadow-inner mb-3 border-4 border-white dark:border-gray-800">
                        <InformationCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Application Declined</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                        Ref ID: #{request.id.slice(-6).toUpperCase()}
                    </p>
                </div>

                {/* Main Content Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-red-100 dark:border-red-900/30 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <InformationCircleIcon className="w-5 h-5 text-red-700" />
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Why it is not approved</span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Request Disapproved</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        The facilitator has reviewed your application and provided the following remarks.
                    </p>

                    <div className="bg-red-100 dark:bg-red-900/20 p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-red-800 dark:text-red-200">
                            <ChatBubbleIcon className="w-5 h-5" />
                            <span className="font-bold text-sm">Facilitator Remarks</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
                            "{request.rejectionReason || 'No specific reason provided.'}"
                        </p>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Event Title</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{request.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{request.date}</p>
                    </div>
                </div>
            </main>
        </div>
      );
  }

  // --- APPROVED VIEW ---
  if (isApproved) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 font-sans">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 px-4 py-4 flex items-center">
                <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                </button>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Request Details</h1>
            </header>

            <main className="container mx-auto p-6 max-w-md animate-fade-in-up">
                {/* Status Hero - Approved */}
                <div className="flex flex-col items-center mb-8 pt-4">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 shadow-inner mb-3 border-4 border-white dark:border-gray-800">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Application Approved</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                        Ref ID: #{request.id.slice(-6).toUpperCase()}
                    </p>
                </div>

                {/* Ready for Pickup Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-green-100 dark:border-green-900/30 mb-6">
                    
                    <div className="flex items-center gap-2 mb-4">
                        <PushPinIcon className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">READY FOR PICKUP</span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Physical Permit Required</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        Your application has been approved! Please visit the Bacoor Government Center to claim your official hard copy permit.
                    </p>

                    {/* Requirements Box */}
                    <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl mb-4">
                        <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase mb-3 tracking-wider">CLAIMING REQUIREMENTS:</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200 font-medium">
                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Valid Government ID
                            </li>
                            <li className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200 font-medium">
                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Reference ID: #{request.id.slice(-6).toUpperCase()}
                            </li>
                            <li className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200 font-medium">
                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span> Original copies of attached documents
                            </li>
                        </ul>
                    </div>

                    {/* Location Box */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl flex items-start gap-3">
                        <div className="text-purple-600 dark:text-purple-400 mt-0.5">
                            <LocationIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">Bacoor Government Center</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Bacoor Blvd, Bacoor, Cavite</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Mon-Fri • 8:00 AM - 5:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Button */}
                <div className="w-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-green-200 dark:border-green-800">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Approved for Release</span>
                </div>

            </main>
        </div>
      );
  }

  // --- DEFAULT (PENDING/REVIEWED) VIEW ---
  
  const isDeptReviewDone = request.status === 'reviewed' || request.status === 'published';
  const isDeptReviewActive = request.status === 'pending';
  const isFinalApprovalDone = request.status === 'published';
  const isFinalApprovalActive = request.status === 'reviewed';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 font-sans">
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 px-4 py-4 flex items-center">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Request Details</h1>
      </header>

      <main className="container mx-auto p-6 max-w-md animate-fade-in-up">
        
        {/* Status Hero */}
        <div className="flex flex-col items-center mb-8 pt-4">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-500 shadow-inner mb-3 border-4 border-white dark:border-gray-800">
                <ClockIcon className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {request.status === 'reviewed' ? 'Pending Final Approval' : 'Under Review'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                Ref ID: #{request.id.slice(-6).toUpperCase()}
            </p>
        </div>

        {/* Timeline Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <h3 className="font-bold text-base mb-6 text-gray-900 dark:text-white">Application Progress</h3>
            
            <div className="relative pl-2">
                {/* Vertical Line */}
                <div className="absolute top-2 left-[11px] h-[80%] w-0.5 bg-gray-100 dark:bg-gray-700 -z-0"></div>

                {/* Step 1: Application Submitted */}
                <div className="flex gap-4 mb-8 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                         <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                             <CheckCircleIcon className="w-4 h-4" />
                         </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-green-600">Application Submitted</p>
                        <p className="text-[10px] text-gray-400 font-medium">{request.date}</p>
                    </div>
                </div>

                {/* Step 2: Department Review */}
                <div className="flex gap-4 mb-8 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                         {isDeptReviewDone ? (
                             <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                                <CheckCircleIcon className="w-4 h-4" />
                             </div>
                         ) : (
                             <div className={`w-4 h-4 rounded-full ${isDeptReviewActive ? 'bg-[#7c3aed] ring-4 ring-purple-100 dark:ring-purple-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                         )}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${isDeptReviewDone ? 'text-green-600' : (isDeptReviewActive ? 'text-gray-900 dark:text-white' : 'text-gray-400')}`}>Department Review</p>
                        {isDeptReviewActive && (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">Currently being reviewed by the Facilitator</p>
                                <p className="text-[10px] font-bold text-[#7c3aed] mt-1">ETA: 2 DAYS</p>
                            </>
                        )}
                        {isDeptReviewDone && <p className="text-[10px] text-gray-400 font-medium">Completed</p>}
                    </div>
                </div>

                {/* Step 3: Final Approval */}
                <div className="flex gap-4 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                         {isFinalApprovalDone ? (
                             <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                                <CheckCircleIcon className="w-4 h-4" />
                             </div>
                         ) : (
                             <div className={`w-4 h-4 rounded-full ${isFinalApprovalActive ? 'bg-[#7c3aed] ring-4 ring-purple-100 dark:ring-purple-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                         )}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${isFinalApprovalDone ? 'text-green-600' : (isFinalApprovalActive ? 'text-gray-900 dark:text-white' : 'text-gray-400')}`}>Final Approval</p>
                        <p className="text-xs text-gray-400 mt-1">Pending previous steps</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Warning Box */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex gap-3 items-start">
            <div className="text-orange-500 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <p className="text-[10px] text-orange-800 dark:text-orange-200 font-medium leading-relaxed">
                Prepare all original hard copies of submitted documents for final validation upon approval.
            </p>
        </div>

      </main>
    </div>
  );
};

export default RequestDetails;
