import React, { useState, useEffect } from 'react';
import { UserIcon, formatDisplayDate, EventImage } from '../constants';
import { Mail, Phone, CheckCircle, XCircle, Clock, Users, Calendar, RefreshCw, MapPin } from 'lucide-react';
import type { EventType, Registration } from '../types';
import { fetchRegistrationsForEvent, updateRegistrationStatus, syncEventApprovedCount } from '../services/eventService';
import { createNotification } from '../services/notificationService';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';

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
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
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
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;
  const remainingSlots = event.maxParticipants != null ? event.maxParticipants - approvedCount : null;

  const loadRegs = async () => {
    setIsLoading(true);
    const data = await fetchRegistrationsForEvent(event.id);

    const statusPriority: Record<string, number> = { approved: 0, pending: 1, rejected: 2 };
    const byUser = new Map<string, Registration>();
    for (const reg of data) {
      const existing = byUser.get(reg.userId);
      if (!existing) {
        byUser.set(reg.userId, reg);
      } else {
        const existP = statusPriority[existing.status] ?? 3;
        const newP = statusPriority[reg.status] ?? 3;
        if (newP < existP || (newP === existP && reg.submittedAt > existing.submittedAt)) {
          byUser.set(reg.userId, reg);
        }
      }
    }

    const deduped = Array.from(byUser.values());
    deduped.sort((a, b) => {
      const order = { pending: 0, approved: 1, rejected: 2 };
      return order[a.status] - order[b.status];
    });
    setRegistrations(deduped);
    setIsLoading(false);
    await syncEventApprovedCount(event.id, deduped);
  };

  useEffect(() => {
    loadRegs();
  }, [event.id]);

  const handleUpdateStatus = async (reg: Registration, status: 'approved' | 'rejected') => {
    if (status === 'approved' && remainingSlots !== null && remainingSlots <= 0) {
      showAlert('Event Full', 'There are no remaining slots available for this event.', 'error');
      return;
    }

    setProcessingId(reg.id);
    try {
      await updateRegistrationStatus(reg.id, status);

      setRegistrations(prev =>
        prev.map(r => r.id === reg.id ? { ...r, status } : r)
          .sort((a, b) => {
            const order = { pending: 0, approved: 1, rejected: 2 };
            return order[a.status] - order[b.status];
          })
      );

      if (status === 'approved') {
        await createNotification(
          reg.userId,
          'event_approved',
          'Registration Approved!',
          `Your registration for "${event.name}" has been approved. You are now a confirmed participant!`,
          event.id
        );

        const hoursUntil = (new Date(event.date + 'T00:00:00').getTime() - Date.now()) / 3_600_000;
        if (hoursUntil >= -2 && hoursUntil <= 48) {
          const timeLabel = hoursUntil < 0 ? 'is currently happening'
            : hoursUntil < 2 ? 'is starting very soon'
            : hoursUntil < 24 ? 'is happening today'
            : 'is happening tomorrow';
          createNotification(
            reg.userId,
            'reminder',
            `Reminder: ${event.name}`,
            `Your approved event "${event.name}" ${timeLabel}! Venue: ${event.venue}.`,
            event.id
          );
        }

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
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 space-y-6">

        {/* ── Event Hero Card ────────────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden">

          <div className="p-5 md:p-6">
            <div className="flex items-start gap-4">
              <button
                onClick={loadRegs}
                disabled={isLoading}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <EventImage
                src={event.imageUrl}
                alt={event.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Private Event</span>
                  {event.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(90deg, #0052A3 0%, #3b82f6 100%)' }}>
                      {event.category}
                    </span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white leading-tight mb-2">{event.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formatDisplayDate(event.date)} · {event.startTime} – {event.endTime}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs">{event.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-4 gap-3">
              {/* Pending */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-3 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{pendingCount}</h3>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Pending</p>
                </div>
              </div>

              {/* Approved */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-3 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                    <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{approvedCount}</h3>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Approved</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-3 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                    <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">{rejectedCount}</h3>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">Rejected</p>
                </div>
              </div>

              {/* Remaining slots */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-[#111827] dark:via-blue-900/20 dark:to-blue-800/30 p-3 md:p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" style={{ color: '#0052A3' }}>
                    <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">
                    {remainingSlots === null ? '∞' : remainingSlots <= 0 ? '0' : remainingSlots}
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                    {remainingSlots === null ? 'Unlimited' : remainingSlots <= 0 ? 'No Slots Left' : `of ${event.maxParticipants} Slots`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Registrations Table ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : registrations.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Registrations Yet</h3>
            <p className="text-sm text-gray-400 font-medium">When participants request to join this event, they will appear here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Table header row */}
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {registrations.length} Application{registrations.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Pending
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block ml-2" /> Approved
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-2" /> Rejected
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/60 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Age</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sex</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Submitted</th>
                    <th className="px-5 py-3.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {registrations.map(reg => (
                    <tr
                      key={reg.id}
                      className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30 ${reg.status === 'rejected' ? 'opacity-60' : ''}`}
                    >
                      {/* Applicant */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                            {reg.avatarUrl ? (
                              <img src={reg.avatarUrl} alt={reg.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{reg.name}</p>
                            <a
                              href={`mailto:${reg.email}`}
                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors truncate"
                            >
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{reg.email}</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Age */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {reg.age !== undefined ? reg.age : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </td>

                      {/* Sex */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {reg.gender && reg.gender !== 'Not specified' ? reg.gender : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        {reg.phoneNumber ? (
                          <a
                            href={`tel:${reg.phoneNumber}`}
                            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors whitespace-nowrap"
                          >
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {reg.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={reg.status} />
                      </td>

                      {/* Date Submitted */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <Clock className="w-3 h-3 flex-shrink-0 text-gray-300" />
                          {new Date(reg.submittedAt).toLocaleString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {reg.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={processingId === reg.id || (remainingSlots !== null && remainingSlots <= 0)}
                              onClick={() => handleUpdateStatus(reg, 'approved')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
                            >
                              {processingId === reg.id ? <Spinner /> : <><CheckCircle className="w-3.5 h-3.5" />{remainingSlots !== null && remainingSlots <= 0 ? 'Full' : 'Approve'}</>}
                            </button>
                            <button
                              disabled={processingId === reg.id}
                              onClick={() => handleUpdateStatus(reg, 'rejected')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 text-red-600 dark:text-red-400 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-800/50 transition-all active:scale-95"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : reg.status === 'approved' ? (
                          <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] font-semibold whitespace-nowrap">Slot assigned</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-gray-400">
                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[11px] font-semibold whitespace-nowrap">Rejected</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageRegistrations;
