import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, ClipboardList, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { EventImage, formatDisplayDate } from '../constants';
import type { EventType } from '../types';
import { fetchRegistrationsForEvent } from '../services/eventService';
import Spinner from './Spinner';

interface EventCounts {
  pending: number;
  approved: number;
  rejected: number;
}

interface EventGroup {
  key: string;
  events: EventType[];
  isRecurring: boolean;
}

interface MyPrivateEventsProps {
  events: EventType[];
  currentUser: import('../types').User;
  onManageRegistrations: (event: EventType) => void;
}

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    approved:   { label: 'Active',    bg: '#dcfce7', text: '#15803d' },
    published:  { label: 'Published', bg: '#dcfce7', text: '#15803d' },
    pending:    { label: 'Pending',   bg: '#fef9c3', text: '#92400e' },
    rejected:   { label: 'Rejected',  bg: '#fee2e2', text: '#b91c1c' },
    cancelled:  { label: 'Cancelled', bg: '#f3f4f6', text: '#6b7280' },
  };
  const cfg = map[status ?? ''] ?? { label: status ?? 'Unknown', bg: '#f3f4f6', text: '#6b7280' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
};

const CountBubble: React.FC<{ value: number; colorOn: string; bgOn: string }> = ({ value, colorOn, bgOn }) => (
  <span
    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
    style={{ background: value > 0 ? bgOn : '#f3f4f6', color: value > 0 ? colorOn : '#9ca3af' }}
  >
    {value}
  </span>
);

const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_104px_76px_86px_62px_110px] gap-3 items-center px-5';

const MyPrivateEvents: React.FC<MyPrivateEventsProps> = ({ events, currentUser, onManageRegistrations }) => {
  const myEvents = events.filter(
    e => e.isPrivate && (
      e.createdBy === currentUser.uid ||
      (currentUser.department && e.leadOffice === currentUser.department)
    )
  );

  const [counts, setCounts] = useState<Record<string, EventCounts>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group by recurrenceGroupId, fall back to event id for non-recurring
  const groups: EventGroup[] = (() => {
    const map = new Map<string, EventType[]>();
    for (const evt of myEvents) {
      const key = evt.recurrenceGroupId || evt.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return Array.from(map.entries()).map(([key, evts]) => ({
      key,
      events: [...evts].sort((a, b) => a.date.localeCompare(b.date)),
      isRecurring: evts.length > 1,
    }));
  })();

  useEffect(() => {
    if (myEvents.length === 0) { setLoading(false); return; }
    let cancelled = false;
    const fetchAll = async () => {
      const results: Record<string, EventCounts> = {};
      await Promise.all(
        myEvents.map(async (evt) => {
          const regs = await fetchRegistrationsForEvent(evt.id);
          results[evt.id] = {
            pending:  regs.filter(r => r.status === 'pending').length,
            approved: regs.filter(r => r.status === 'approved').length,
            rejected: regs.filter(r => r.status === 'rejected').length,
          };
        })
      );
      if (!cancelled) { setCounts(results); setLoading(false); }
    };
    fetchAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-950 min-h-full">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Private Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage registrations for each of your private events</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : groups.length === 0 ? (
          <div className="rounded-[10px] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No private events</p>
            <p className="text-xs text-gray-500 mt-1">You have not created any private events yet.</p>
          </div>
        ) : (
          <div className="rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Table header */}
            <div className={`${GRID} py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800`}>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Event</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Venue</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block text-center">Pending</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block text-center">Approved</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block text-center">Slots</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {groups.map((group) => {
                const rep = group.events[0]; // representative (earliest date)
                const isExpanded = expandedGroups.has(group.key);

                if (!group.isRecurring) {
                  // ── Single event row ──────────────────────────────────────
                  const c = counts[rep.id] ?? { pending: 0, approved: 0, rejected: 0 };
                  const slots = rep.maxParticipants != null ? rep.maxParticipants - c.approved : null;
                  return (
                    <div key={group.key} className={`${GRID} py-3.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors`}>
                      <EventCell evt={rep} />
                      <DateCell date={rep.date} />
                      <VenueCell evt={rep} />
                      <div><StatusBadge status={rep.status} /></div>
                      <div className="text-center"><CountBubble value={c.pending} bgOn="#fef9c3" colorOn="#92400e" /></div>
                      <div className="text-center"><CountBubble value={c.approved} bgOn="#dcfce7" colorOn="#15803d" /></div>
                      <SlotCell slots={slots} />
                      <div>
                        <ManageButton onClick={() => onManageRegistrations(rep)} />
                      </div>
                    </div>
                  );
                }

                // ── Recurring group ───────────────────────────────────────
                const totalPending  = group.events.reduce((s, e) => s + (counts[e.id]?.pending  ?? 0), 0);
                const totalApproved = group.events.reduce((s, e) => s + (counts[e.id]?.approved ?? 0), 0);

                return (
                  <React.Fragment key={group.key}>
                    {/* Group header row */}
                    <div
                      className={`${GRID} py-3.5 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                      onClick={() => toggleGroup(group.key)}
                    >
                      {/* Event col */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                          {rep.imageUrl ? (
                            <EventImage src={rep.imageUrl} alt={rep.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rep.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <RefreshCw className="w-3 h-3 flex-shrink-0" style={{ color: '#0052A3' }} />
                            <span className="text-[11px] font-medium" style={{ color: '#0052A3' }}>
                              {group.events.length} occurrences
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Date col: show range */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">Series</span>
                      </div>

                      {/* Venue */}
                      <VenueCell evt={rep} />

                      {/* Status */}
                      <div><StatusBadge status={rep.status} /></div>

                      {/* Pending total */}
                      <div className="text-center"><CountBubble value={totalPending} bgOn="#fef9c3" colorOn="#92400e" /></div>

                      {/* Approved total */}
                      <div className="text-center"><CountBubble value={totalApproved} bgOn="#dcfce7" colorOn="#15803d" /></div>

                      {/* Slots — ambiguous for series */}
                      <div className="text-center"><span className="text-xs text-gray-400">—</span></div>

                      {/* Actions: expand toggle */}
                      <div className="flex items-center justify-start">
                        <div
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: '#f0f5ff', color: '#0052A3' }}
                        >
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />
                          }
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </div>
                      </div>
                    </div>

                    {/* Expanded sub-rows */}
                    {isExpanded && group.events.map((evt, idx) => {
                      const c = counts[evt.id] ?? { pending: 0, approved: 0, rejected: 0 };
                      const slots = evt.maxParticipants != null ? evt.maxParticipants - c.approved : null;
                      return (
                        <div
                          key={evt.id}
                          className={`${GRID} py-3 bg-gray-50/60 dark:bg-gray-900/30 border-t border-dashed border-gray-100 dark:border-gray-800/60 hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors`}
                        >
                          {/* Occurrence label */}
                          <div className="flex items-center gap-3 min-w-0 pl-14">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Occurrence {idx + 1}</p>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{formatDisplayDate(evt.date)}</p>
                            </div>
                          </div>

                          <DateCell date={evt.date} />
                          <VenueCell evt={evt} />
                          <div><StatusBadge status={evt.status} /></div>
                          <div className="text-center"><CountBubble value={c.pending} bgOn="#fef9c3" colorOn="#92400e" /></div>
                          <div className="text-center"><CountBubble value={c.approved} bgOn="#dcfce7" colorOn="#15803d" /></div>
                          <SlotCell slots={slots} />
                          <div>
                            <ManageButton onClick={() => onManageRegistrations(evt)} />
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Small sub-components ──────────────────────────────────────────────────────

const EventCell: React.FC<{ evt: EventType }> = ({ evt }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
      {evt.imageUrl ? (
        <EventImage src={evt.imageUrl} alt={evt.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{evt.name}</p>
      <p className="text-[11px] text-gray-500 truncate">{evt.city}</p>
    </div>
  </div>
);

const DateCell: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
    <span className="truncate">{formatDisplayDate(date)}</span>
  </div>
);

const VenueCell: React.FC<{ evt: EventType }> = ({ evt }) => (
  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 min-w-0">
    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
    <span className="truncate">{evt.venue || evt.city}</span>
  </div>
);

const SlotCell: React.FC<{ slots: number | null }> = ({ slots }) => (
  <div className="text-center">
    {slots !== null ? (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ background: slots > 0 ? '#dbeafe' : '#fee2e2', color: slots > 0 ? '#1d4ed8' : '#b91c1c' }}
      >
        {slots}
      </span>
    ) : (
      <span className="text-xs text-gray-400">—</span>
    )}
  </div>
);

const ManageButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
    style={{ background: '#0052A3' }}
  >
    <ClipboardList className="w-3.5 h-3.5" />
    Manage
  </button>
);

export default MyPrivateEvents;
