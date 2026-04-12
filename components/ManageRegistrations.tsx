import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, UserIcon } from '../constants';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import type { EventType, Registration } from '../types';
import { fetchRegistrationsForEvent, updateRegistrationStatus } from '../services/eventService';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';

interface ManageRegistrationsProps {
  event: EventType;
  onBack: () => void;
}

const ManageRegistrations: React.FC<ManageRegistrationsProps> = ({ event, onBack }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useAlert();

  useEffect(() => {
    const loadRegs = async () => {
      setIsLoading(true);
      const data = await fetchRegistrationsForEvent(event.id);
      setRegistrations(data);
      setIsLoading(false);
    };
    loadRegs();
  }, [event.id]);

  const handleUpdateStatus = async (regId: string, status: 'approved' | 'rejected') => {
    try {
      await updateRegistrationStatus(regId, status);
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status } : r));
      showAlert("Success", `Registration ${status}.`, "success");
    } catch (error) {
      showAlert("Error", "Failed to update registration.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <main className="container mx-auto p-4 md:p-6 max-w-2xl animate-fade-in-up">
        {isLoading ? (
            <div className="flex justify-center py-20"><Spinner /></div>
        ) : registrations.length === 0 ? (
            <div className="text-center py-20">
                <p className="text-gray-500">No registrations yet.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {registrations.map(reg => (
                    <div key={reg.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 overflow-hidden flex-shrink-0">
                                {reg.avatarUrl ? (
                                    <img src={reg.avatarUrl || undefined} alt={reg.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <UserIcon className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white leading-tight">{reg.name}</p>
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 group">
                                        <Mail className="w-3 h-3 transition-colors group-hover:text-primary-500" />
                                        <span>{reg.email}</span>
                                    </div>
                                    {reg.phoneNumber && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 group">
                                            <Phone className="w-3 h-3 transition-colors group-hover:text-primary-500" />
                                            <span>{reg.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`inline-block mt-3 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                                    reg.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    reg.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                    {reg.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <div className="flex gap-2">
                                <a 
                                    href={`mailto:${reg.email}`}
                                    className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all border border-gray-100 dark:border-gray-600 shadow-sm"
                                    title="Email Participant"
                                >
                                    <Mail className="w-5 h-5" />
                                </a>
                                {reg.phoneNumber && (
                                    <a 
                                        href={`tel:${reg.phoneNumber}`}
                                        className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all border border-gray-100 dark:border-gray-600 shadow-sm"
                                        title="Call Participant"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                            
                            {reg.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleUpdateStatus(reg.id, 'approved')}
                                        className="flex-1 px-4 py-2.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus(reg.id, 'rejected')}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                    >
                                        Reject
                                    </button>
                                </div>
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

export default ManageRegistrations;
