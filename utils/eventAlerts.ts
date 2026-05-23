import type { EventType } from '../types';

export type AlertSeverity = 'error' | 'warning';

export interface EventAlert {
    id: string;
    severity: AlertSeverity;
    label: string;
    detail: string;
}

const timeToMinutes = (t: string): number => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const REQUIRED_DOCS_DEFAULT = ['letterOfIntentUrl', 'validIdUrl', 'businessPermitUrl'];
const REQUIRED_DOCS_PESO = [
    'letterOfIntentUrl', 'companyLogoUrl', 'companyProfileUrl', 'businessPermitUrl',
    'birRegistrationUrl', 'secDtiUrl', 'philJobNetUrl', 'noPendingCaseUrl',
];

const LOW_REGISTRATION_THRESHOLD = 10;
const LOW_REGISTRATION_DAYS_WINDOW = 7;
const SHORT_LEAD_TIME_DAYS = 3;
const VAGUE_DESCRIPTION_MIN_CHARS = 50;

export const getEventAlerts = (event: EventType, allEvents: EventType[]): EventAlert[] => {
    const alerts: EventAlert[] = [];
    const now = new Date();
    const eventDate = new Date(event.date + 'T00:00:00');
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // ── Alerts for PENDING events (shown to admin before approval) ────────────
    if (event.status === 'pending') {

        // 1a. Vague description
        if (!event.description || event.description.trim().length < VAGUE_DESCRIPTION_MIN_CHARS) {
            alerts.push({
                id: 'vague-description',
                severity: 'warning',
                label: 'Vague Description',
                detail: `Description is ${event.description?.trim().length ?? 0} chars — minimum ${VAGUE_DESCRIPTION_MIN_CHARS} recommended.`,
            });
        }

        // 1b. Short lead time
        if (daysUntil >= 0 && daysUntil <= SHORT_LEAD_TIME_DAYS) {
            alerts.push({
                id: 'short-lead-time',
                severity: 'error',
                label: daysUntil === 0 ? 'Event is Today' : `${daysUntil}d Lead Time`,
                detail: `Event is ${daysUntil === 0 ? 'today' : `only ${daysUntil} day${daysUntil === 1 ? '' : 's'} away`} — very short lead time for approval.`,
            });
        }

        // 1c. Missing required documents
        const requiredDocs = (event as any).department === 'PESO Department'
            ? REQUIRED_DOCS_PESO
            : REQUIRED_DOCS_DEFAULT;
        const missingCount = requiredDocs.filter(key => !(event as any)[key]).length;
        if (missingCount > 0) {
            alerts.push({
                id: 'missing-docs',
                severity: 'warning',
                label: `${missingCount} Doc${missingCount > 1 ? 's' : ''} Missing`,
                detail: `${missingCount} required document${missingCount > 1 ? 's are' : ' is'} not uploaded yet.`,
            });
        }

        // 2 & 3. Duplicate detection + Venue conflict
        // Same published/scheduled event at same venue on same date
        const publishedAtVenue = allEvents.filter(e =>
            e.id !== event.id &&
            (e.status === 'published' || e.status === 'scheduled') &&
            e.venue?.toLowerCase().trim() === event.venue?.toLowerCase().trim() &&
            e.date === event.date
        );

        if (publishedAtVenue.length > 0) {
            // Check for actual time overlap (venue conflict)
            const conflicting = publishedAtVenue.find(e => {
                const aStart = timeToMinutes(event.startTime);
                const aEnd   = timeToMinutes(event.endTime || '23:59');
                const bStart = timeToMinutes(e.startTime);
                const bEnd   = timeToMinutes(e.endTime || '23:59');
                return aStart < bEnd && bStart < aEnd;
            });

            if (conflicting) {
                alerts.push({
                    id: 'venue-conflict',
                    severity: 'error',
                    label: 'Venue Conflict',
                    detail: `"${conflicting.name}" is at this venue from ${conflicting.startTime}–${conflicting.endTime || 'end'} on the same day.`,
                });
            } else {
                // Same venue + date but no time overlap — flag as possible duplicate
                alerts.push({
                    id: 'duplicate',
                    severity: 'warning',
                    label: 'Possible Duplicate',
                    detail: `"${publishedAtVenue[0].name}" is already published at this venue on this date.`,
                });
            }
        }
    }

    // ── Low registration alert for PUBLISHED events close to their date ───────
    if ((event.status === 'published' || event.status === 'scheduled') &&
        daysUntil >= 0 && daysUntil <= LOW_REGISTRATION_DAYS_WINDOW) {
        const count = event.approvedCount ?? 0;
        if (count < LOW_REGISTRATION_THRESHOLD) {
            alerts.push({
                id: 'low-registration',
                severity: 'warning',
                label: 'Low Registration',
                detail: `Only ${count} registration${count === 1 ? '' : 's'} with ${daysUntil === 0 ? 'event today' : `${daysUntil} day${daysUntil === 1 ? '' : 's'} left`}.`,
            });
        }
    }

    return alerts;
};
