import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, UserIcon } from '../constants';
import { Mail, Phone, CheckCircle, XCircle, Clock, Users, Lock, Calendar, RefreshCw } from 'lucide-react';
import type { EventType, Registration } from '../types';
import { fetchRegistrationsForEvent, updateRegistrationStatus, syncEventApprovedCount } from '../services/eventService';
import { createNotification } from '../services/notificationService';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';
import { motion, AnimatePresence } from 'motion/react';

interface ManageRegistrationsProps {
  event: EventType;
  onBack: () => void;
}

const StatusBadge: React.FC<{ status: Registration['status'] }> = ({ status }) => {
  const cfg = {
    approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', label: 'Approved' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', label: 'Rejected' },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Pending' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const ManageRegistrations: React.FC<ManageRegistrationsProps> = ({ event, onBack }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const remainingSlots = event.maxParticipants != null ? event.maxParticipants - approvedCount : null;

  const loadRegs = async () => {
    setIsLoading(true);
    const data = await fetchRegistrationsForEvent(event.id);
    // Sort: pending first, then approved, then rejected
    data.sort((a, b) => {
      const order = { pending: 0, approved: 1, rejected: 2 };
      return order[a.status] - order[b.status];
    });
    setRegistrations(data);
    setIsLoading(false);
    // Sync approvedCount on the event document so old events get the correct count
    await syncEventApprovedCount(event.id, data);
  };

  useEffect(() => {
    loadRegs();
  }, [event.id]);

  const handleUpdateStatus = async (reg: Registration, status: 'approved' | 'rejected') => {
    // Guard: don't approve if event is full
    if (status === 'approved' && remainingSlots !== null && remainingSlots <= 0) {
      showAlert('Event Full', 'There are no remaining slots available for this event.', 'error');
      return;
    }

    setProcessingId(reg.id);
    try {
      await updateRegistrationStatus(reg.id, status);

      // Update local state
      setRegistrations(prev =>
        prev.map(r => r.id === reg.id ? { ...r, status } : r)
          .sort((a, b) => {
            const order = { pending: 0, approved: 1, rejected: 2 };
            return order[a.status] - order[b.status];
          })
      );

      // Notify the applicant
      if (status === 'approved') {
        await createNotification(
          reg.userId,
          'event_approved',
          '🎉 Registration Approved!',
          `Your registration for "${event.name}" has been approved. You are now a confirmed participant!`,
          event.id
        );
        showAlert('Approved', `${reg.name}'s registration has been approved and they have been notified.`, 'success');
      } else {
        await createNotification(
          reg.userId,
          'event_rejected',
          'Registration Update',
          `Unfortunately, your registration for "${event.name}" was not approved at this time.`,
          event.id
        );
        showAlert('Rejected', `${reg.name}'s registration has been rejected and they have been notified.`, 'success');
      }
    } catch (error) {
      showAlert('Error', 'Failed to update registration status. Please try again.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 dark:text-white truncate">Manage Registrations</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{event.name}</p>
          </div>
          <button
            onClick={loadRegs}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        {/* Event Summary Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            {event.imageUrl && (
              <img src={event.imageUrl} alt={event.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">Private Event</span>
              </div>
              <h2 className="font-black text-gray-900 dark:text-white truncate">{event.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <Calendar className="w-3 h-3" />
                <span>{event.date} · {event.startTime} – {event.endTime}</span>
              </div>
            </div>
          </div>

          {/* Slot Overview */}
          <div className="border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="p-3 text-center">
              <p className="text-xl font-black text-gray-900 dark:text-white">{pendingCount}</p>
              <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mt-0.5">Pending</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-xl font-black text-green-600">{approvedCount}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">Approved</p>
            </div>
            <div className="p-3 text-center">
              {remainingSlots !== null ? (
                <>
                  <p className={`text-xl font-black ${remainingSlots <= 0 ? 'text-red-500' : 'text-purple-600'}`}>
                    {remainingSlots <= 0 ? 'Full' : remainingSlots}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                    {remainingSlots <= 0 ? 'No Slots Left' : `of ${event.maxParticipants} Slots`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-black text-gray-400">∞</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Unlimited</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Registrations List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Registrations Yet</h3>
            <p className="text-sm text-gray-400 font-medium">When participants request to join this event, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
              {registrations.length} Application{registrations.length !== 1 ? 's' : ''}
            </p>
            <AnimatePresence initial={false}>
              {registrations.map((reg, idx) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    reg.status === 'pending'
                      ? 'border-yellow-200 dark:border-yellow-800/40'
                      : reg.status === 'approved'
                      ? 'border-green-200 dark:border-green-800/40'
                      : 'border-gray-100 dark:border-gray-800 opacity-70'
                  }`}
                >
                  {/* Applicant Info */}
                  <div className="flex items-start gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
                      {reg.avatarUrl ? (
                        <img src={reg.avatarUrl} alt={reg.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-black text-gray-900 dark:text-white">{reg.name}</p>
                        <StatusBadge status={reg.status} />
                      </div>

                      {/* Demographic pill */}
                      {(reg.age !== undefined || reg.gender) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/30 mb-2">
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                            {[
                              reg.age !== undefined ? `${reg.age} yrs old` : null,
                              reg.gender && reg.gender !== 'Not specified' ? reg.gender : null,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}

                      {/* Contact info */}
                      <div className="space-y-1">
                        <a
                          href={`mailto:${reg.email}`}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                        >
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{reg.email}</span>
                        </a>
                        {reg.phoneNumber && (
                          <a
                            href={`tel:${reg.phoneNumber}`}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                          >
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{reg.phoneNumber}</span>
                          </a>
                        )}
                      </div>

                      {/* Submitted time */}
                      <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                        Submitted: {new Date(reg.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Row — only for pending */}
                  {reg.status === 'pending' && (
                    <div className="border-t border-gray-50 dark:border-gray-800 p-3 flex gap-2 bg-gray-50/50 dark:bg-gray-800/30">
                      <button
                        disabled={processingId === reg.id || (remainingSlots !== null && remainingSlots <= 0)}
                        onClick={() => handleUpdateStatus(reg, 'approved')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md shadow-green-500/20 transition-all active:scale-95"
                      >
                        {processingId === reg.id ? (
                          <Spinner />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {remainingSlots !== null && remainingSlots <= 0 ? 'Event Full' : 'Approve & Assign Slot'}
                          </>
                        )}
                      </button>
                      <button
                        disabled={processingId === reg.id}
                        onClick={() => handleUpdateStatus(reg, 'rejected')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 text-red-600 dark:text-red-400 text-xs font-black rounded-xl border border-red-200 dark:border-red-800/50 transition-all active:scale-95"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Approved state note */}
                  {reg.status === 'approved' && (
                    <div className="border-t border-green-100 dark:border-green-800/30 px-4 py-2.5 bg-green-50/50 dark:bg-green-900/10 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400">Participant confirmed — slot assigned</p>
                    </div>
                  )}

                  {/* Rejected state note */}
                  {reg.status === 'rejected' && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/20 flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">Registration rejected — applicant notified</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageRegistrations;
