
import type { EventType, User, EventFeedback } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerformanceLevel = 'Excellent' | 'Good' | 'Needs Improvement' | 'Low Performing';

export interface EventDecisionInsight {
    performanceLevel: PerformanceLevel;
    engagementRate:   number;
    attendanceRate:   number;
    feedbackRate:     number;
    performanceScore: number;
    summary:          string;
    insights:         string[];
    recommendations:  string[];
    flags:            string[];
}

export interface MonthlyDecisionSummary {
    totalEvents:    number;
    totalViews:     number;
    totalInterested: number;
    totalCheckIns:  number;
    averageRating:  number;
    topCategory:    string | null;
    topLocation:    string | null;
    summary:        string;
    recommendations: string[];
    flags:          string[];
}

// ─── Safe Helpers ─────────────────────────────────────────────────────────────

export const safeNumber = (value: unknown): number => {
    const n = Number(value);
    return isFinite(n) && n >= 0 ? n : 0;
};

export const safePercentage = (numerator: number, denominator: number): number => {
    if (!denominator || !isFinite(denominator)) return 0;
    const r = (numerator / denominator) * 100;
    return isFinite(r) ? Math.min(r, 100) : 0;
};

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const formatRating = (value: unknown): string => {
    const n = safeNumber(value);
    return n > 0 ? n.toFixed(1) : '—';
};

// ─── Deterministic Template Picker ───────────────────────────────────────────
// Stable per event — never changes on re-render, no Math.random()

const pick = <T>(templates: T[], key: string): T => {
    let h = 5381;
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) & 0xffffffff;
    return templates[Math.abs(h) % templates.length];
};

// ─── Insight Sentence Templates ───────────────────────────────────────────────

const INSIGHT = {
    highEngagement: [
        (n: string, c: string) => `"${n}" generated strong engagement${c ? ` among residents interested in ${c} events` : ''}, indicating high community interest.`,
        (n: string, c: string) => `Residents responded positively to "${n}"${c ? `, reflecting growing demand for ${c}-type activities` : ''}.`,
        (n: string, c: string) => `"${n}" attracted significant attention${c ? ` in the ${c} category` : ''}, suggesting it aligned well with resident preferences.`,
    ],
    lowEngagement: [
        (n: string) => `Despite receiving views, "${n}" converted only a small fraction of viewers into active participants.`,
        (n: string) => `Many residents viewed "${n}" but did not proceed to express interest or attend.`,
        (n: string) => `"${n}" had limited conversion from viewers to engaged users, suggesting the content or presentation may need improvement.`,
    ],
    highInterestLowAttendance: [
        () => `There is a noticeable gap between residents who expressed interest and those who actually attended.`,
        () => `The event gained resident interest, but actual attendance was lower than expected.`,
        () => `Resident interest did not fully convert into attendance for this event.`,
    ],
    strongAttendance: [
        (r: string) => `A strong ${r} of interested residents followed through and checked in, indicating effective scheduling and accessibility.`,
        (r: string) => `Attendance conversion reached ${r}, suggesting that scheduling, location, and promotion were well-executed.`,
        (r: string) => `With ${r} of interested users attending, this event demonstrated strong community commitment.`,
    ],
    lowFeedback: [
        () => `A significant number of attendees did not submit post-event feedback.`,
        () => `Post-event feedback collection was lower than expected relative to the check-ins recorded.`,
        () => `Many attendees participated but did not leave a review, limiting data quality for future planning.`,
    ],
    highSatisfaction: [
        (r: string, c: string) => `Residents rated this event ${r}/5${c ? `, confirming high satisfaction with ${c}-type activities` : ''}.`,
        (r: string, c: string) => `An average rating of ${r}/5 was recorded${c ? ` — a strong signal that ${c} events are valued by the community` : ''}.`,
        (r: string, _c: string) => `With a ${r}/5 satisfaction score, this event format proved effective and well-received by the community.`,
    ],
    lowSatisfaction: [
        (r: string) => `The event received an average rating of ${r}/5, indicating that resident expectations were not fully met.`,
        (r: string) => `A ${r}/5 average rating suggests areas of the event experience that need improvement.`,
        (r: string) => `Satisfaction was below average at ${r}/5, pointing to concerns that should be addressed in future planning.`,
    ],
    lowVisibility: [
        (n: string) => `"${n}" had limited reach, with fewer than 10 views recorded during this period.`,
        (n: string) => `The event "${n}" was not widely seen by residents, suggesting it may need better promotion.`,
        (n: string) => `Low view count for "${n}" indicates the event may not have been surfaced effectively to the user base.`,
    ],
    privateHighInterest: [
        () => `This private event is receiving strong interest. CICRD should monitor the approval queue to avoid delays in participant onboarding.`,
        () => `Given the high interest in this private event, the registration approval process should be reviewed to ensure timely processing.`,
        () => `Strong interest in this private event signals that the approval workflow may need active management to serve all applicants promptly.`,
    ],
    publicLowCheckIn: [
        () => `For a public event, check-in numbers are relatively low. Encouraging attendees to use QR check-in may improve participation tracking.`,
        () => `Check-in data is limited for this public event. Promoting QR scanning at the entrance can help verify actual attendance.`,
        () => `QR check-in adoption appears low for this public event, which may undercount actual participation figures.`,
    ],
};

// ─── Recommendation Templates ─────────────────────────────────────────────────

const REC = {
    improvePromotion: [
        `Consider improving the event poster, description, or announcement channels to attract more residents.`,
        `Enhancing the event's online presence or refining the announcement timing may help increase visibility.`,
        `CICRD may explore additional promotion channels such as community bulletin boards or barangay announcements.`,
    ],
    improveReminders: [
        `Sending a reminder notification 24 hours before the event may help improve attendance rates.`,
        `Consider scheduling automated reminders for residents who marked interest but have not yet checked in.`,
        `Pre-event engagement through reminder messages may help reduce the interest-to-attendance gap.`,
    ],
    repeatFormat: [
        `This event format worked well — CICRD may consider scheduling similar events in the coming months.`,
        `Given the positive response, repeating this event type or making it recurring may benefit the community.`,
        `This event's success is a strong case for establishing it as a regular community activity.`,
    ],
    reviewFeedback: [
        `CICRD should review specific feedback comments to identify recurring concerns and improve future planning.`,
        `A detailed review of submitted feedback may reveal actionable improvements for the next similar event.`,
        `Examining aspects rated poorly can help prioritize improvements before the next edition.`,
    ],
    feedbackReminder: [
        `A post-event push notification prompting attendees to submit ratings can significantly improve feedback collection.`,
        `Sending a feedback reminder via the app after the event ends may increase the number of reviews received.`,
        `CICRD may consider highlighting the feedback step in the attendee journey to increase response rates.`,
    ],
    improveAccessibility: [
        `Reviewing the event schedule, venue location, or transportation options may help reduce attendance drop-off.`,
        `Ensuring the venue is accessible and timing is convenient for working residents may improve turnout.`,
        `Offering clearer directions to the venue or alternate attendance windows may close the interest-attendance gap.`,
    ],
    highlightEvent: [
        `Consider featuring this event in the highlighted or promoted section to increase resident awareness.`,
        `Pinning or featuring this event on the main discovery feed may significantly improve its visibility.`,
        `Admin may use the event highlight feature to boost this event's reach across the platform.`,
    ],
    monitorApprovals: [
        `The registration approval queue for this event should be monitored regularly to avoid delays.`,
        `With high interest in this private event, timely approval processing is recommended to maintain resident engagement.`,
        `CICRD should ensure the private event approval workflow is staffed and responsive to incoming requests.`,
    ],
    encourageQR: [
        `Encouraging attendees to use the QR check-in feature at the event may improve participation data accuracy.`,
        `Placing visible QR scanning instructions at the event entrance can help increase recorded check-in numbers.`,
        `Promoting the QR check-in process before and during the event will improve attendance data reliability.`,
    ],
};

// ─── Metric Calculation ───────────────────────────────────────────────────────

export const calculateEventMetrics = (event: EventType) => {
    const views       = safeNumber(event.viewCount);
    const saves       = safeNumber(event.saveCount);
    const interested  = safeNumber(event.interestedCount);
    const checkIns    = safeNumber(event.checkInCount);
    const feedbackCnt = safeNumber(event.feedbackCount);
    const avgRating   = safeNumber(event.averageRating);

    const engagementRate = safePercentage(saves + interested, views);
    const attendanceRate = safePercentage(checkIns, interested);
    const feedbackRate   = safePercentage(feedbackCnt, checkIns);
    const ratingPct      = safePercentage(avgRating, 5);

    const rawScore =
        engagementRate * 0.30 +
        attendanceRate * 0.35 +
        feedbackRate   * 0.15 +
        ratingPct      * 0.20;

    const performanceScore = Math.round(isFinite(rawScore) ? rawScore : 0);

    const performanceLevel: PerformanceLevel =
        performanceScore >= 80 ? 'Excellent' :
        performanceScore >= 60 ? 'Good' :
        performanceScore >= 40 ? 'Needs Improvement' : 'Low Performing';

    return { views, saves, interested, checkIns, feedbackCnt, avgRating, engagementRate, attendanceRate, feedbackRate, performanceScore, performanceLevel };
};

// ─── Per-Event Decision Insight ───────────────────────────────────────────────

export const generateEventDecisionInsight = (event: EventType): EventDecisionInsight => {
    const m    = calculateEventMetrics(event);
    const name = event.name || 'This event';
    const cats = Array.isArray(event.category) ? event.category : (event.category ? [event.category] : []);
    const cat  = cats[0] ?? '';
    const key  = event.id || name;

    const insights: string[] = [];
    const recs:     string[] = [];
    const flags:    string[] = [];

    // A. High engagement
    if (m.engagementRate >= 50) {
        insights.push(pick(INSIGHT.highEngagement, key + 'A')(name, cat));
    }

    // B. Low engagement (enough views, poor conversion)
    if (m.views >= 20 && m.engagementRate < 20) {
        insights.push(pick(INSIGHT.lowEngagement, key + 'B')(name));
        recs.push(pick(REC.improvePromotion, key + 'B'));
    }

    // C. High interest, low attendance
    if (m.interested >= 10 && m.attendanceRate < 40) {
        insights.push(pick(INSIGHT.highInterestLowAttendance, key + 'C')());
        recs.push(pick(REC.improveReminders, key + 'C'));
        recs.push(pick(REC.improveAccessibility, key + 'C2'));
    }

    // D. Strong attendance conversion
    if (m.attendanceRate >= 70 && m.checkIns > 0) {
        insights.push(pick(INSIGHT.strongAttendance, key + 'D')(formatPercent(m.attendanceRate)));
        recs.push(pick(REC.repeatFormat, key + 'D'));
    }

    // E. Low feedback rate
    if (m.checkIns >= 10 && m.feedbackRate < 30) {
        insights.push(pick(INSIGHT.lowFeedback, key + 'E')());
        recs.push(pick(REC.feedbackReminder, key + 'E'));
    }

    // F. High satisfaction
    if (m.avgRating >= 4.5 && m.feedbackCnt >= 3) {
        insights.push(pick(INSIGHT.highSatisfaction, key + 'F')(formatRating(m.avgRating), cat));
        recs.push(pick(REC.repeatFormat, key + 'F'));
    }

    // G. Low satisfaction
    if (m.avgRating > 0 && m.avgRating < 3) {
        insights.push(pick(INSIGHT.lowSatisfaction, key + 'G')(formatRating(m.avgRating)));
        recs.push(pick(REC.reviewFeedback, key + 'G'));
        flags.push(`Low satisfaction rating: ${formatRating(m.avgRating)}/5`);
    }

    // H. Low visibility
    if (m.views < 10) {
        insights.push(pick(INSIGHT.lowVisibility, key + 'H')(name));
        recs.push(pick(REC.highlightEvent, key + 'H'));
        recs.push(pick(REC.improvePromotion, key + 'H2'));
        flags.push(`Low visibility: ${m.views} view${m.views !== 1 ? 's' : ''} recorded`);
    }

    // I. Access-type rules
    if (event.isPrivate && m.interested >= 5) {
        insights.push(pick(INSIGHT.privateHighInterest, key + 'I')());
        recs.push(pick(REC.monitorApprovals, key + 'I'));
    }
    if (!event.isPrivate && m.checkIns < 5 && m.interested >= 5) {
        insights.push(pick(INSIGHT.publicLowCheckIn, key + 'Ipub')());
        recs.push(pick(REC.encourageQR, key + 'Ipub'));
    }

    // Build summary
    const strongestMetric =
        m.engagementRate >= 50 ? 'strong community engagement' :
        m.attendanceRate >= 70 ? 'strong attendance conversion' :
        m.avgRating >= 4.5     ? 'high resident satisfaction'   : null;

    const mainConcern =
        m.views < 10                                  ? 'low event visibility' :
        m.interested >= 10 && m.attendanceRate < 40   ? 'a gap between interest and actual attendance' :
        m.avgRating > 0 && m.avgRating < 3            ? 'below-average satisfaction ratings' :
        m.checkIns >= 10 && m.feedbackRate < 30       ? 'low post-event feedback collection' : null;

    let summary = `"${name}" performed at a ${m.performanceLevel} level.`;
    if (strongestMetric) summary += ` It demonstrated ${strongestMetric}.`;
    if (mainConcern)     summary += ` The primary concern is ${mainConcern}.`;
    if (recs.length > 0) summary += ` CICRD may review the recommendations below for future planning.`;

    const uniq = <T>(arr: T[]) => [...new Set(arr)];

    return {
        performanceLevel: m.performanceLevel,
        engagementRate:   Math.round(m.engagementRate),
        attendanceRate:   Math.round(m.attendanceRate),
        feedbackRate:     Math.round(m.feedbackRate),
        performanceScore: m.performanceScore,
        summary,
        insights:        uniq(insights).slice(0, 5),
        recommendations: uniq(recs).slice(0, 5),
        flags,
    };
};

// ─── Monthly Decision Summary ─────────────────────────────────────────────────

export const generateMonthlyDecisionSummary = (events: EventType[]): MonthlyDecisionSummary => {
    if (events.length === 0) {
        return {
            totalEvents: 0, totalViews: 0, totalInterested: 0, totalCheckIns: 0,
            averageRating: 0, topCategory: null, topLocation: null,
            summary: 'No events are available for this period.',
            recommendations: [], flags: [],
        };
    }

    const totalViews      = events.reduce((s, e) => s + safeNumber(e.viewCount), 0);
    const totalInterested = events.reduce((s, e) => s + safeNumber(e.interestedCount), 0);
    const totalCheckIns   = events.reduce((s, e) => s + safeNumber(e.checkInCount), 0);

    // Weighted average rating by feedback count
    const ratedEvents      = events.filter(e => safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0);
    const totalFbWeight    = ratedEvents.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);
    const avgRating        = totalFbWeight === 0 ? 0 :
        ratedEvents.reduce((s, e) => s + safeNumber(e.averageRating) * safeNumber(e.feedbackCount), 0) / totalFbWeight;

    // Top category
    const catCounts: Record<string, number> = {};
    events.forEach(e => {
        const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
        cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
    });
    const topCategory = Object.keys(catCounts).length > 0
        ? Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0] : null;

    // Top location
    const locCounts: Record<string, number> = {};
    events.forEach(e => {
        const loc = e.venue || e.city;
        if (loc) locCounts[loc] = (locCounts[loc] || 0) + 1;
    });
    const topLocation = Object.keys(locCounts).length > 0
        ? Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0][0] : null;

    // Aggregate flags
    const overallAttRate = safePercentage(totalCheckIns, totalInterested);
    const lowAttCount    = events.filter(e => { const m = calculateEventMetrics(e); return m.interested >= 5 && m.attendanceRate < 40; }).length;
    const highSatCount   = events.filter(e => safeNumber(e.averageRating) >= 4.5 && safeNumber(e.feedbackCount) >= 3).length;
    const lowVisCount    = events.filter(e => safeNumber(e.viewCount) < 10).length;
    const lowFbCount     = events.filter(e => { const m = calculateEventMetrics(e); return m.checkIns >= 10 && m.feedbackRate < 30; }).length;

    const flags: string[] = [];
    const recs:  string[] = [];

    if (lowVisCount > Math.ceil(events.length * 0.4)) {
        flags.push(`${lowVisCount} of ${events.length} events have low visibility (fewer than 10 views).`);
        recs.push('CICRD may improve event promotion strategies to increase overall platform reach and resident awareness.');
    }
    if (lowAttCount > 0) {
        flags.push(`${lowAttCount} event${lowAttCount > 1 ? 's have' : ' has'} a significant gap between interest and actual attendance.`);
        recs.push('Scheduling advance reminders and reviewing venue accessibility may help improve overall attendance rates.');
    }
    if (lowFbCount > 0) {
        flags.push(`${lowFbCount} event${lowFbCount > 1 ? 's have' : ' has'} low post-event feedback despite significant attendance.`);
        recs.push('Implementing automated post-event feedback prompts can improve data collection and planning quality.');
    }
    if (highSatCount > 0) {
        recs.push(`${highSatCount} event${highSatCount > 1 ? 's' : ''} received high satisfaction ratings — CICRD may prioritize similar formats in future planning.`);
    }
    if (topCategory) {
        recs.push(`"${topCategory}" is the most active category this period. Maintaining or expanding high-quality programming in this area may yield strong community impact.`);
    }
    if (overallAttRate >= 60) {
        recs.push('Overall attendance conversion is strong. Sustaining current scheduling and promotion practices is recommended.');
    } else if (overallAttRate > 0 && overallAttRate < 40) {
        recs.push('Overall attendance conversion is below expectations. CICRD may explore systemic improvements to reminders and accessibility.');
    }

    const ratingLabel = avgRating >= 4 ? 'positively received' : avgRating >= 3 ? 'moderately received' : avgRating > 0 ? 'variably received' : 'not yet rated';
    let summary = `This period covers ${events.length} event${events.length !== 1 ? 's' : ''} with ${totalViews.toLocaleString()} total views and ${totalCheckIns.toLocaleString()} confirmed check-ins.`;
    if (topCategory) summary += ` The most active category is "${topCategory}".`;
    if (ratedEvents.length > 0) summary += ` Events were ${ratingLabel} with a weighted average of ${(Math.round(avgRating * 10) / 10).toFixed(1)}/5.`;
    if (lowAttCount > 0) summary += ` Attendance conversion remains an area for improvement.`;

    return {
        totalEvents: events.length,
        totalViews,
        totalInterested,
        totalCheckIns,
        averageRating: Math.round(avgRating * 10) / 10,
        topCategory,
        topLocation,
        summary,
        recommendations: recs,
        flags,
    };
};

// ─── Cross-Domain Decision Support ───────────────────────────────────────────

export type InsightLevel  = 'success' | 'warning' | 'critical' | 'info';
export type InsightDomain = 'events' | 'users' | 'demographics' | 'engagement' | 'categories' | 'platform';

export interface DomainInsight {
    domain: InsightDomain;
    level:  InsightLevel;
    title:  string;
    body:   string;
}

export interface CrossDomainSummary {
    role:         'admin' | 'facilitator';
    summary:      string;
    overallScore: number;
    topCategory:  string | null;
    topLocation:  string | null;
    insights:     DomainInsight[];
    flags:        string[];
    recommendations: { domain: InsightDomain; text: string }[];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const calcAge = (birthday: string): number => {
    const birth = new Date(birthday);
    const now   = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() ||
       (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
};

const topByCount = (map: Record<string, number>): string | null => {
    const keys = Object.keys(map);
    if (keys.length === 0) return null;
    return keys.sort((a, b) => map[b] - map[a])[0];
};

// ─── Admin cross-domain summary ───────────────────────────────────────────────

export const generateAdminDecisionSummary = (
    events: EventType[],
    users:  User[],
    allFeedback: EventFeedback[]
): CrossDomainSummary => {
    const insights: DomainInsight[] = [];
    const flags:    string[]        = [];
    const recs:     { domain: InsightDomain; text: string }[] = [];
    const now = new Date();

    // ── Event aggregates ──────────────────────────────────────────────────────
    const totalViews      = events.reduce((s, e) => s + safeNumber(e.viewCount), 0);
    const totalSaves      = events.reduce((s, e) => s + safeNumber(e.saveCount), 0);
    const totalInterested = events.reduce((s, e) => s + safeNumber(e.interestedCount), 0);
    const totalCheckIns   = events.reduce((s, e) => s + safeNumber(e.checkInCount), 0);
    const totalFeedback   = events.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);

    const ratedEvts    = events.filter(e => safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0);
    const totalFbWt    = ratedEvts.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);
    const avgRating    = totalFbWt === 0 ? 0 :
        ratedEvts.reduce((s, e) => s + safeNumber(e.averageRating) * safeNumber(e.feedbackCount), 0) / totalFbWt;

    const publishedEvts  = events.filter(e => e.status === 'published');
    const pendingEvts    = events.filter(e => e.status === 'pending');
    const cancelledEvts  = events.filter(e => e.status === 'cancelled');
    const upcomingEvts   = publishedEvts.filter(e => e.date && new Date(e.date) >= now);
    const pastEvts       = publishedEvts.filter(e => { const d = e.endDate || e.date; return d && new Date(d) < now; });

    const lowVisCnt    = events.filter(e => safeNumber(e.viewCount) < 10).length;
    const highRatCnt   = events.filter(e => safeNumber(e.averageRating) >= 4.5 && safeNumber(e.feedbackCount) >= 3).length;
    const lowRatCnt    = events.filter(e => safeNumber(e.averageRating) > 0 && safeNumber(e.averageRating) < 3).length;
    const noFbPastCnt  = pastEvts.filter(e => safeNumber(e.checkInCount) >= 5 && safeNumber(e.feedbackCount) === 0).length;
    const lowAttEvts   = events.filter(e => { const m = calculateEventMetrics(e); return m.interested >= 5 && m.attendanceRate < 40; }).length;

    const engRate         = safePercentage(totalSaves + totalInterested, totalViews);
    const attRate         = safePercentage(totalCheckIns, totalInterested);
    const fbRate          = safePercentage(totalFeedback, totalCheckIns);
    const saveToAttRate   = safePercentage(totalCheckIns, totalSaves);

    // Engagement funnel — find the stage with the biggest gap below its benchmark
    const funnelBottleneck = (() => {
        const stages = [
            { label: 'Views → Saves',          rate: safePercentage(totalSaves, totalViews),      bench: 20 },
            { label: 'Views → Interest',        rate: safePercentage(totalInterested, totalViews), bench: 20 },
            { label: 'Interest → Attendance',   rate: attRate,                                     bench: 30 },
            { label: 'Attendance → Feedback',   rate: fbRate,                                      bench: 15 },
        ].filter(() => totalViews > 0);
        return stages.sort((a, b) => (a.rate - a.bench) - (b.rate - b.bench))[0] ?? null;
    })();

    // Capacity analysis
    const cappedEvts   = publishedEvts.filter(e => safeNumber(e.maxParticipants) > 0);
    const nearCapacity = cappedEvts.filter(e => {
        const cap = safeNumber(e.maxParticipants!);
        return cap > 0 && safeNumber(e.checkInCount) / cap >= 0.8;
    });
    const overSubbed   = cappedEvts.filter(e => {
        const cap = safeNumber(e.maxParticipants!);
        return cap > 0 && safeNumber(e.interestedCount) > cap;
    });

    // Performance ranking
    const scoredEvts = events.map(e => ({ e, m: calculateEventMetrics(e) })).sort((a, b) => b.m.performanceScore - a.m.performanceScore);
    const topEvt     = scoredEvts.find(s => s.m.performanceScore >= 60) ?? null;
    const bottomEvt  = scoredEvts.length > 2 ? scoredEvts[scoredEvts.length - 1] : null;

    // Recurrent vs one-time performance
    const recurrentEvts      = events.filter(e => e.isRecurrent || e.recurrenceGroupId);
    const singleEvts         = events.filter(e => !e.isRecurrent && !e.recurrenceGroupId);
    const recAvgCI           = recurrentEvts.length > 0 ? recurrentEvts.reduce((s, e) => s + safeNumber(e.checkInCount), 0) / recurrentEvts.length : 0;
    const singleAvgCI        = singleEvts.length > 0 ? singleEvts.reduce((s, e) => s + safeNumber(e.checkInCount), 0) / singleEvts.length : 0;

    // ── Category analysis ─────────────────────────────────────────────────────
    const catCounts: Record<string, number> = {};
    const catRating: Record<string, { sum: number; wt: number }> = {};
    const catAtt:    Record<string, { interested: number; checkIns: number }> = {};
    events.forEach(e => {
        const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
        cats.forEach(c => {
            catCounts[c] = (catCounts[c] || 0) + 1;
            if (!catAtt[c]) catAtt[c] = { interested: 0, checkIns: 0 };
            catAtt[c].interested += safeNumber(e.interestedCount);
            catAtt[c].checkIns   += safeNumber(e.checkInCount);
            if (safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0) {
                if (!catRating[c]) catRating[c] = { sum: 0, wt: 0 };
                catRating[c].sum += safeNumber(e.averageRating) * safeNumber(e.feedbackCount);
                catRating[c].wt  += safeNumber(e.feedbackCount);
            }
        });
    });
    const topCategory   = topByCount(catCounts);
    const categoryCount = Object.keys(catCounts).length;
    const catAvgs = Object.entries(catRating)
        .filter(([, v]) => v.wt > 0)
        .map(([cat, v]) => ({ cat, avg: v.sum / v.wt }))
        .sort((a, b) => b.avg - a.avg);
    const bestCat  = catAvgs[0]  ?? null;
    const worstCat = catAvgs.length > 1 ? catAvgs[catAvgs.length - 1] : null;

    // Category with best attendance conversion (min 3 interested)
    const catAttRates = Object.entries(catAtt)
        .filter(([, v]) => v.interested >= 3)
        .map(([cat, v]) => ({ cat, rate: safePercentage(v.checkIns, v.interested) }))
        .sort((a, b) => b.rate - a.rate);
    const bestAttCat = catAttRates[0] ?? null;

    // ── Location analysis ─────────────────────────────────────────────────────
    const locCounts:  Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    events.forEach(e => {
        const l = e.venue || e.city;
        if (l) locCounts[l] = (locCounts[l] || 0) + 1;
        if (e.city) cityCounts[e.city] = (cityCounts[e.city] || 0) + 1;
    });
    const topLocation  = topByCount(locCounts);
    const uniqueCities = Object.keys(cityCounts).length;
    const topCity      = topByCount(cityCounts);
    const topCityPct   = topCity ? Math.round(safePercentage(cityCounts[topCity], events.length)) : 0;

    // ── User analysis — residents only (facilitators and admins excluded) ────────
    const residentUsers    = users.filter(u => u.role !== 'admin' && u.role !== 'facilitator' && !u.isAdmin);
    const totalUsers       = residentUsers.length;
    const facilitators     = users.filter(u => u.role === 'facilitator').length;
    const regularUsers     = residentUsers.length;
    const pendingFacReqs   = users.filter(u => u.facilitatorRequestStatus === 'pending').length;
    const pendingDeletions = residentUsers.filter(u => u.pendingDeletion).length;

    // Participating residents: those who have at least one registration or check-in record
    const participatingResidents = residentUsers.filter(u =>
        (u.checkedInEventIds?.length ?? 0) > 0 || (u.interestedEventIds?.length ?? 0) > 0
    );

    const activeUsers  = participatingResidents.length;
    const powerUsers   = participatingResidents.filter(u => (u.checkedInEventIds?.length ?? 0) >= 3).length;
    const savedUsers   = participatingResidents.filter(u => (u.savedEventIds?.length ?? 0) > 0);
    const savedNoAttend = savedUsers.filter(u => (u.checkedInEventIds?.length ?? 0) === 0).length;
    const savedNoAttendRate = safePercentage(savedNoAttend, savedUsers.length);

    // Profile completion — among participating residents only
    const profileComplete = participatingResidents.filter(u => u.birthday && u.sex).length;

    // ── Demographics — participating residents only ───────────────────────────
    const gMap: Record<string, number> = {};
    participatingResidents.forEach(u => { if (u.sex) gMap[u.sex] = (gMap[u.sex] || 0) + 1; });
    const maleCount   = (gMap['Male'] || 0)   + (gMap['male'] || 0);
    const femaleCount = (gMap['Female'] || 0) + (gMap['female'] || 0);
    const gTotal      = maleCount + femaleCount;

    const ageGroups = { youth: 0, youngAdult: 0, adult: 0, senior: 0 };
    participatingResidents.filter(u => u.birthday).forEach(u => {
        const age = calcAge(u.birthday!);
        if (age < 18)      ageGroups.youth++;
        else if (age < 25) ageGroups.youngAdult++;
        else if (age < 60) ageGroups.adult++;
        else               ageGroups.senior++;
    });
    const usersWithBday = participatingResidents.filter(u => u.birthday).length;

    // Preference analysis — participating residents only
    const prefCounts: Record<string, number> = {};
    participatingResidents.forEach(u => (u.preferences ?? []).forEach(p => { prefCounts[p] = (prefCounts[p] || 0) + 1; }));
    const topPref             = topByCount(prefCounts);
    const topPrefHasNoEvents  = topPref !== null && catCounts[topPref] === undefined;
    const topPrefUnderserved  = topPref !== null && !topPrefHasNoEvents && safePercentage(catCounts[topPref] ?? 0, events.length) < 10 && (prefCounts[topPref] ?? 0) > 3;

    // ── Overall score (6-factor) ───────────────────────────────────────────────
    const visScore    = events.length === 0 ? 50 : Math.round((1 - lowVisCnt / events.length) * 100);
    const divScore    = categoryCount >= 6 ? 100 : categoryCount >= 4 ? 75 : categoryCount >= 3 ? 55 : categoryCount >= 2 ? 35 : 15;
    const overallScore = Math.round(
        visScore                         * 0.15 +
        Math.min(engRate * 2, 100)       * 0.20 +
        attRate                          * 0.25 +
        Math.min(fbRate * 2, 100)        * 0.10 +
        safePercentage(avgRating, 5)     * 0.20 +
        divScore                         * 0.10
    );

    // ── EVENTS domain rules ───────────────────────────────────────────────────
    if (events.length === 0) {
        insights.push({ domain: 'events', level: 'info', title: 'No Events Yet', body: 'No events have been created. Start by publishing the first community event to begin platform engagement.' });
    } else {
        // Visibility gap
        if (lowVisCnt === events.length) {
            insights.push({ domain: 'events', level: 'critical', title: 'All Events Have Zero Reach', body: `Every event on the platform has fewer than 10 views. No event is currently reaching residents — immediate platform-wide promotion is required.` });
            flags.push(`${lowVisCnt}/${events.length} events critically underperforming in visibility.`);
            recs.push({ domain: 'events', text: 'Launch a platform-wide promotion campaign (barangay announcements, social media) to improve event discovery across all listings.' });
        } else if (lowVisCnt > Math.ceil(events.length * 0.5)) {
            insights.push({ domain: 'events', level: 'critical', title: 'Critical Visibility Gap', body: `${lowVisCnt} of ${events.length} events have fewer than 10 views. Most events are not reaching residents — a platform-wide promotion strategy is urgently needed.` });
            flags.push(`${lowVisCnt}/${events.length} events critically underperforming in visibility.`);
            recs.push({ domain: 'events', text: 'Launch a platform-wide promotion campaign (barangay announcements, social media) to improve event discovery across all listings.' });
        } else if (lowVisCnt > Math.ceil(events.length * 0.25)) {
            insights.push({ domain: 'events', level: 'warning', title: 'Promotion Gaps Detected', body: `${lowVisCnt} events have low visibility (under 10 views). Use the Highlights feature or additional channels to surface these events.` });
            recs.push({ domain: 'events', text: 'Use the Highlights feature to boost visibility of low-traffic events and increase resident discovery.' });
        }

        // Top performer spotlight
        if (topEvt) {
            const topMetric = topEvt.m.attendanceRate > 50
                ? `${Math.round(topEvt.m.attendanceRate)}% attendance rate`
                : topEvt.m.avgRating >= 4.0
                    ? `${topEvt.m.avgRating.toFixed(1)}/5 satisfaction`
                    : `${Math.round(topEvt.m.engagementRate)}% engagement rate`;
            insights.push({ domain: 'events', level: 'success', title: 'Standout Event', body: `"${topEvt.e.name}" is the top-performing event (score ${topEvt.m.performanceScore}/100, ${topMetric}). Study this format and replicate it.` });
            recs.push({ domain: 'events', text: `Use "${topEvt.e.name}" as a template — analyze its timing, description, and promotion to replicate its success in future events.` });
        }

        // Bottom performer with specific issue
        if (bottomEvt && bottomEvt.m.performanceScore < 20) {
            const issue = bottomEvt.m.views < 10 ? `only ${bottomEvt.m.views} views` :
                          bottomEvt.m.attendanceRate < 20 ? `${Math.round(bottomEvt.m.attendanceRate)}% attendance` :
                          `${bottomEvt.m.avgRating.toFixed(1)}/5 satisfaction`;
            insights.push({ domain: 'events', level: 'warning', title: 'Lowest Performing Event', body: `"${bottomEvt.e.name}" scored ${bottomEvt.m.performanceScore}/100 — the main issue was ${issue}. Address this before scheduling a repeat.` });
            recs.push({ domain: 'events', text: `Review "${bottomEvt.e.name}" to understand what drove its poor results. Investigate venue, timing, description, or promotion gaps.` });
        }

        // High-rated events
        if (highRatCnt >= 2) {
            insights.push({ domain: 'events', level: 'success', title: 'High-Quality Events', body: `${highRatCnt} events have achieved excellent satisfaction (4.5+/5). These formats are strong candidates for recurring programs.` });
            recs.push({ domain: 'events', text: 'Schedule recurring editions of your top-rated events to sustain community satisfaction.' });
        } else if (highRatCnt === 1) {
            const hre = ratedEvts.find(e => safeNumber(e.averageRating) >= 4.5 && safeNumber(e.feedbackCount) >= 3);
            if (hre) insights.push({ domain: 'events', level: 'success', title: 'Standout Quality Event', body: `"${hre.name}" earned ${safeNumber(hre.averageRating).toFixed(1)}/5 — the platform's highest-rated event. Expand this format for broader community impact.` });
        }

        // Low-rated events with specifics
        if (lowRatCnt > 0) {
            const worst = [...events].filter(e => safeNumber(e.averageRating) > 0 && safeNumber(e.averageRating) < 3)
                .sort((a, b) => safeNumber(a.averageRating) - safeNumber(b.averageRating))[0];
            const detail = lowRatCnt === 1 && worst ? ` — "${worst.name}" rated ${safeNumber(worst.averageRating).toFixed(1)}/5` : '';
            insights.push({ domain: 'events', level: 'warning', title: 'Low Satisfaction Events', body: `${lowRatCnt} event${lowRatCnt > 1 ? 's are' : ' is'} rated below 3/5${detail}. CICRD should review feedback before repeating these formats.` });
            flags.push(`${lowRatCnt} event${lowRatCnt > 1 ? 's' : ''} rated below 3/5 — quality review recommended.`);
            recs.push({ domain: 'events', text: 'Conduct a post-mortem review of low-rated events and address venue, timing, or content concerns before the next edition.' });
        }

        // Pending queue
        if (pendingEvts.length > 5) {
            insights.push({ domain: 'events', level: 'warning', title: 'Review Queue Building Up', body: `${pendingEvts.length} events are awaiting approval. A growing queue delays resident awareness and may frustrate facilitators.` });
            flags.push(`${pendingEvts.length} events pending approval — review queue is backing up.`);
            recs.push({ domain: 'events', text: 'Assign a dedicated reviewer to clear the pending event queue and prevent submission delays.' });
        } else if (pendingEvts.length > 0) {
            insights.push({ domain: 'events', level: 'info', title: 'Events Awaiting Review', body: `${pendingEvts.length} event${pendingEvts.length > 1 ? 's are' : ' is'} pending approval. Timely review prevents delays in resident awareness.` });
        }

        // Cancellation rate
        if (cancelledEvts.length > 0 && safePercentage(cancelledEvts.length, events.length) > 15) {
            const cr = Math.round(safePercentage(cancelledEvts.length, events.length));
            insights.push({ domain: 'events', level: 'warning', title: 'High Cancellation Rate', body: `${cr}% of events have been cancelled. Frequent cancellations erode resident trust and reduce platform reliability.` });
            flags.push(`${cr}% event cancellation rate detected.`);
            recs.push({ domain: 'events', text: 'Implement pre-approval checklists (venue confirmation, organizer commitment) to reduce preventable cancellations.' });
        }

        // Platform-wide interest-attendance gap
        if (lowAttEvts > Math.ceil(events.length * 0.3)) {
            insights.push({ domain: 'events', level: 'warning', title: 'Widespread Interest-Attendance Gap', body: `${lowAttEvts} events show significant drop-off between interest and actual check-ins. Systemic reminder improvements are needed.` });
            recs.push({ domain: 'events', text: 'Implement automated 24-hour pre-event reminders for all residents who marked interest to reduce no-shows platform-wide.' });
        }

        // Capacity pressure
        if (overSubbed.length > 0) {
            insights.push({ domain: 'events', level: 'warning', title: 'Demand Exceeds Capacity', body: `${overSubbed.length} event${overSubbed.length > 1 ? 's have' : ' has'} more interested residents than available seats. Residents risk missing out, which can cause frustration.` });
            flags.push(`${overSubbed.length} event${overSubbed.length > 1 ? 's' : ''} with demand exceeding capacity.`);
            recs.push({ domain: 'events', text: 'Expand capacity or create waitlists for oversubscribed events to capture excess demand without disappointing residents.' });
        } else if (nearCapacity.length > 0) {
            insights.push({ domain: 'events', level: 'info', title: `${nearCapacity.length} Event${nearCapacity.length > 1 ? 's' : ''} Near Capacity`, body: `${nearCapacity.length} event${nearCapacity.length > 1 ? 's are' : ' is'} at 80%+ of maximum participants. Consider expanding seats or scheduling additional sessions.` });
        }

        // Recurrent events outperforming
        if (recurrentEvts.length >= 2 && recAvgCI > singleAvgCI * 1.4) {
            insights.push({ domain: 'events', level: 'success', title: 'Recurring Events Outperform', body: `Recurring events average ${recAvgCI.toFixed(1)} check-ins vs ${singleAvgCI.toFixed(1)} for one-time events — repetition builds stronger community habits.` });
            recs.push({ domain: 'events', text: 'Convert your highest-performing one-time events into recurring programs to leverage the attendance lift that repetition provides.' });
        }

        // No upcoming events
        if (upcomingEvts.length === 0) {
            insights.push({ domain: 'events', level: 'warning', title: 'No Upcoming Events Scheduled', body: 'There are no published events with future dates. Without upcoming events, resident engagement and app visits will decline.' });
            flags.push('No upcoming events — platform may go dormant.');
            recs.push({ domain: 'events', text: 'Publish at least 2–3 upcoming events to maintain resident engagement and give users a reason to return to the platform.' });
        }

        // Past events with no feedback despite attendance
        if (noFbPastCnt > 0) {
            insights.push({ domain: 'events', level: 'info', title: 'Missed Feedback Opportunities', body: `${noFbPastCnt} completed event${noFbPastCnt > 1 ? 's have' : ' has'} 5+ check-ins but zero feedback. These are missed quality data points that could inform future programming.` });
            recs.push({ domain: 'events', text: 'Send a retrospective feedback prompt to attendees of completed events with no ratings — some residents may still respond.' });
        }
    }

    // ── USERS domain rules ────────────────────────────────────────────────────
    if (totalUsers === 0) {
        insights.push({ domain: 'users', level: 'info', title: 'No Registered Users', body: 'No users are registered yet. Resident onboarding is a critical first step for platform adoption.' });
    } else {
        const facRatio   = safePercentage(facilitators, totalUsers);
        const activeRate = safePercentage(activeUsers, regularUsers > 0 ? regularUsers : totalUsers);

        if (facilitators === 0) {
            insights.push({ domain: 'users', level: 'warning', title: 'No Active Facilitators', body: 'There are no approved facilitators. Facilitators are essential for creating diverse community events beyond admin-created content.' });
            recs.push({ domain: 'users', text: 'Recruit and onboard at least 3–5 community facilitators to diversify event creation across barangays.' });
        } else if (facRatio < 5) {
            insights.push({ domain: 'users', level: 'info', title: 'Low Facilitator Ratio', body: `Only ${facilitators} facilitator${facilitators > 1 ? 's' : ''} (${Math.round(facRatio)}% of users). A larger pool increases event diversity and volume.` });
            recs.push({ domain: 'users', text: 'Promote the facilitator application process to engaged residents to grow the event creation pipeline.' });
        } else {
            insights.push({ domain: 'users', level: 'success', title: 'Healthy Facilitator Network', body: `${facilitators} approved facilitator${facilitators > 1 ? 's represent' : ' represents'} ${Math.round(facRatio)}% of users — a solid foundation for community-driven event creation.` });
        }

        if (pendingFacReqs > 3) {
            insights.push({ domain: 'users', level: 'warning', title: 'Facilitator Applications Backlog', body: `${pendingFacReqs} facilitator applications are awaiting review. Delays reduce applicant motivation and slow content pipeline growth.` });
            flags.push(`${pendingFacReqs} facilitator applications pending review.`);
            recs.push({ domain: 'users', text: 'Review and process pending facilitator applications to maintain community trust and applicant motivation.' });
        } else if (pendingFacReqs > 0) {
            insights.push({ domain: 'users', level: 'info', title: 'Facilitator Applications Pending', body: `${pendingFacReqs} application${pendingFacReqs > 1 ? 's are' : ' is'} awaiting approval. Timely processing keeps applicants engaged.` });
        }

        const profileRate = Math.round(safePercentage(profileComplete, participatingResidents.length > 0 ? participatingResidents.length : 1));
        if (participatingResidents.length > 0 && profileRate < 40) {
            insights.push({ domain: 'users', level: 'info', title: 'Low Profile Completion', body: `Only ${profileRate}% of actively participating residents have complete profiles (birthday + gender). This limits demographic analytics accuracy for planning decisions.` });
            recs.push({ domain: 'users', text: 'Encourage profile completion through in-app prompts to improve demographic data quality and personalization accuracy.' });
        }

        if (totalUsers >= 10) {
            if (activeRate < 20) {
                insights.push({ domain: 'users', level: 'warning', title: 'Low User Activity Rate', body: `Only ${Math.round(activeRate)}% of residents have interacted with events. Most registered users remain passive — they registered but haven't engaged.` });
                recs.push({ domain: 'users', text: 'Send periodic push notifications to re-engage passive users with upcoming events near their location.' });
            } else if (activeRate >= 50) {
                insights.push({ domain: 'users', level: 'success', title: 'High User Activity', body: `${Math.round(activeRate)}% of residents actively engage with events — a strong indicator of platform adoption and community trust.` });
            }

            if (powerUsers >= 3) {
                const powerPct = Math.round(safePercentage(powerUsers, totalUsers));
                insights.push({ domain: 'users', level: 'success', title: 'Loyal Core Community', body: `${powerUsers} resident${powerUsers > 1 ? 's have' : ' has'} attended 3+ events (${powerPct}% of users). This loyal core signals real community value and platform stickiness.` });
                recs.push({ domain: 'users', text: 'Recognize top attendees — priority access or exclusive event invitations can reinforce loyalty and word-of-mouth growth.' });
            }

            if (savedNoAttendRate > 60 && savedNoAttend >= 3) {
                insights.push({ domain: 'users', level: 'warning', title: 'High Save-Without-Attending Rate', body: `${Math.round(savedNoAttendRate)}% of residents who bookmark events never check in. Intent exists but barriers — reminders, venue access, or scheduling — are preventing follow-through.` });
                recs.push({ domain: 'users', text: 'Address barriers for residents who save events but don\'t attend — improve reminders, add venue directions, and clarify event instructions.' });
            }
        }

        if (pendingDeletions > 0) {
            insights.push({ domain: 'users', level: 'info', title: 'Account Deletion Requests', body: `${pendingDeletions} user${pendingDeletions > 1 ? 's have' : ' has'} requested account deletion. Monitor whether this reflects platform dissatisfaction or routine attrition.` });
        }
    }

    // ── DEMOGRAPHICS domain rules ─────────────────────────────────────────────
    if (usersWithBday < 5 && gTotal < 5) {
        insights.push({ domain: 'demographics', level: 'info', title: 'Limited Demographic Data', body: 'Insufficient birthday or gender data for demographic analysis. Encourage users to complete their profiles to enable better event planning.' });
    } else {
        if (gTotal >= 10) {
            const mPct = safePercentage(maleCount, gTotal);
            const fPct = safePercentage(femaleCount, gTotal);
            if (mPct > 75) {
                insights.push({ domain: 'demographics', level: 'warning', title: 'Gender Reach Imbalance', body: `${Math.round(mPct)}% of users are male. Events and promotion need to better target female residents for broader community reach.` });
                recs.push({ domain: 'demographics', text: 'Design family-oriented, wellness, or skills-based programs for women to improve gender inclusivity across the platform.' });
            } else if (fPct > 75) {
                insights.push({ domain: 'demographics', level: 'warning', title: 'Gender Reach Imbalance', body: `${Math.round(fPct)}% of users are female. Include sports, career, or technology events to attract male residents and balance platform reach.` });
                recs.push({ domain: 'demographics', text: 'Include events in categories typically preferred by male residents (sports, technology, livelihood) to balance gender reach.' });
            } else {
                insights.push({ domain: 'demographics', level: 'success', title: 'Balanced Gender Reach', body: `Male (${Math.round(mPct)}%) and female (${Math.round(fPct)}%) users are well-balanced — the platform has broad gender representation across the community.` });
            }
        }

        if (usersWithBday >= 5) {
            const dominant = Object.entries(ageGroups).sort((a, b) => b[1] - a[1])[0];
            const domPct   = safePercentage(dominant[1], usersWithBday);
            const labels: Record<string, string> = { youth: 'Under 18', youngAdult: '18–24', adult: '25–59', senior: '60+' };
            if (domPct > 55) {
                insights.push({ domain: 'demographics', level: 'info', title: `${labels[dominant[0]]} Dominant User Base`, body: `${Math.round(domPct)}% of users with known ages are in the ${labels[dominant[0]]} group. Align event programming with this demographic's interests to maximize participation.` });
                if (dominant[0] === 'youngAdult') recs.push({ domain: 'demographics', text: 'Prioritize technology, career development, and social events to match the dominant 18–24 demographic.' });
                if (dominant[0] === 'adult')      recs.push({ domain: 'demographics', text: 'Schedule events on weekends and evenings to accommodate the working adult demographic that dominates the platform.' });
                if (dominant[0] === 'youth')      recs.push({ domain: 'demographics', text: 'Ensure youth-oriented events comply with age-appropriate guidelines and send parental awareness notifications.' });
                if (dominant[0] === 'senior')     recs.push({ domain: 'demographics', text: 'Prioritize accessible venues, daytime scheduling, and health/wellness events for the senior-dominant user base.' });
            }
            if (ageGroups.senior > 0 && safePercentage(ageGroups.senior, usersWithBday) >= 20) {
                const sPct = Math.round(safePercentage(ageGroups.senior, usersWithBday));
                insights.push({ domain: 'demographics', level: 'info', title: 'Significant Senior Presence', body: `${sPct}% of known-age users are 60+. Ensure events are physically accessible and the app experience accommodates varying digital literacy levels.` });
            }
        }

        // Preference gap: top resident preference has no or few matching events
        if (topPref && topPrefHasNoEvents) {
            insights.push({ domain: 'demographics', level: 'warning', title: 'Top Preference Has No Events', body: `"${topPref}" is the most common resident preference but has zero events in this category. This unmet demand reduces platform relevance for this user group.` });
            recs.push({ domain: 'demographics', text: `Create or commission events in the "${topPref}" category to directly serve the most common resident preference on the platform.` });
        } else if (topPref && topPrefUnderserved) {
            insights.push({ domain: 'demographics', level: 'info', title: 'Underserved Top Preference', body: `"${topPref}" is a top resident preference but represents under 10% of all events. Expanding programming here could meaningfully boost engagement.` });
            recs.push({ domain: 'demographics', text: `Increase events in "${topPref}" to better serve residents who have explicitly listed this as a preference — this directly drives engagement.` });
        }
    }

    // ── ENGAGEMENT domain rules ───────────────────────────────────────────────
    if (totalViews === 0 && events.length > 0) {
        insights.push({ domain: 'engagement', level: 'critical', title: 'No Event Views Recorded', body: 'Events are not being viewed by residents. Verify that events are published and accessible on the discovery feed.' });
        flags.push('Zero event views recorded — platform engagement has not started.');
    } else if (totalViews > 0) {
        // Funnel bottleneck
        if (funnelBottleneck && funnelBottleneck.rate < funnelBottleneck.bench && totalViews >= 10) {
            const explainers: Record<string, string> = {
                'Views → Saves':        'Residents browse but aren\'t bookmarking — event content or imagery may not create enough desire to save.',
                'Views → Interest':     'Viewers aren\'t marking interest — event descriptions may lack clarity, urgency, or compelling benefits.',
                'Interest → Attendance':'Interested residents aren\'t showing up — pre-event reminders and accessibility need attention.',
                'Attendance → Feedback':'Attendees aren\'t submitting feedback — automated post-event prompts should be deployed.',
            };
            const note = explainers[funnelBottleneck.label] ?? 'A conversion gap exists in the engagement funnel.';
            insights.push({ domain: 'engagement', level: 'info', title: `Funnel Bottleneck: ${funnelBottleneck.label}`, body: `The biggest drop-off in your funnel is at ${funnelBottleneck.label} (${Math.round(funnelBottleneck.rate)}% vs ${funnelBottleneck.bench}% benchmark). ${note}` });
        }

        if (engRate >= 40) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Strong Engagement Conversion', body: `${Math.round(engRate)}% of event views convert to saves or interest — residents are actively engaging, not just browsing.` });
        } else if (engRate >= 20) {
            insights.push({ domain: 'engagement', level: 'info', title: 'Moderate Engagement Rate', body: `${Math.round(engRate)}% of views lead to engagement — approaching the 40% benchmark. Improving event visuals and description clarity could close the gap.` });
        } else if (engRate < 15 && totalViews >= 20) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Low Engagement Conversion', body: `Only ${Math.round(engRate)}% of views convert to engagement. Event descriptions, visuals, or relevance need improvement.` });
            flags.push(`${Math.round(engRate)}% engagement conversion — below the 15% threshold.`);
            recs.push({ domain: 'engagement', text: 'Improve event descriptions with clear benefits, specific activities, and compelling cover images to convert more viewers into participants.' });
        }

        if (totalInterested >= 10) {
            if (attRate >= 60) {
                insights.push({ domain: 'engagement', level: 'success', title: 'Strong Attendance Conversion', body: `${Math.round(attRate)}% of interested residents checked in — effective scheduling and promotion practices are working well.` });
            } else if (attRate >= 30) {
                insights.push({ domain: 'engagement', level: 'info', title: 'Attendance Rate On Target', body: `${Math.round(attRate)}% of interested residents attended — meeting the 30% benchmark. Automated reminders could push this higher.` });
            } else {
                insights.push({ domain: 'engagement', level: 'warning', title: 'Attendance Conversion Below Target', body: `Only ${Math.round(attRate)}% of interested residents followed through and attended. A systemic drop-off between interest and attendance is occurring.` });
                flags.push(`${Math.round(attRate)}% overall attendance conversion — below the 30% benchmark.`);
                recs.push({ domain: 'engagement', text: 'Deploy automated pre-event push notifications 24h and 1h before events to significantly reduce no-shows platform-wide.' });
            }
        }

        // Save-to-attend gap
        if (totalSaves >= 5 && saveToAttRate < 20) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'High Save-to-No-Show Rate', body: `Only ${Math.round(saveToAttRate)}% of residents who bookmarked events actually checked in. Saved events represent committed intent — better follow-up can convert them.` });
            recs.push({ domain: 'engagement', text: 'Send targeted reminders to users who saved an event but haven\'t checked in — a well-timed nudge often converts saved interest to attendance.' });
        }

        if (totalCheckIns >= 10) {
            if (fbRate < 15) {
                insights.push({ domain: 'engagement', level: 'info', title: 'Feedback Collection Gap', body: `Only ${Math.round(fbRate)}% of attendees submit post-event feedback. Automated prompts after check-out could substantially improve this rate.` });
                recs.push({ domain: 'engagement', text: 'Add an automated in-app feedback prompt 1 hour after event end to capture resident ratings while the experience is still fresh.' });
            } else if (fbRate >= 40) {
                insights.push({ domain: 'engagement', level: 'success', title: 'Active Feedback Culture', body: `${Math.round(fbRate)}% of attendees submit post-event feedback — providing valuable, consistent data for continuous improvement.` });
            }
        }

        if (avgRating >= 4.5) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Excellent Platform Satisfaction', body: `Platform-wide average rating is ${avgRating.toFixed(1)}/5 — residents are highly satisfied with event quality across the board.` });
        } else if (avgRating >= 4.0) {
            insights.push({ domain: 'engagement', level: 'success', title: 'High Overall Satisfaction', body: `Platform-wide average rating is ${avgRating.toFixed(1)}/5 — residents are broadly satisfied with community event quality.` });
        } else if (avgRating >= 3.0) {
            insights.push({ domain: 'engagement', level: 'info', title: 'Moderate Satisfaction Score', body: `Platform average of ${avgRating.toFixed(1)}/5 is acceptable but below the 4.0 target. Addressing feedback from lower-rated events could lift this meaningfully.` });
        } else if (avgRating > 0) {
            insights.push({ domain: 'engagement', level: 'critical', title: 'Low Platform Satisfaction', body: `Platform average of ${avgRating.toFixed(1)}/5 is below acceptable levels. Quality improvements across event planning and execution are a priority.` });
            flags.push(`Platform satisfaction at ${avgRating.toFixed(1)}/5 — below the 3.0 minimum threshold.`);
            recs.push({ domain: 'engagement', text: 'Establish minimum event quality standards and conduct organizer briefings to lift overall resident satisfaction scores.' });
        }

        // Category with best attendance rate
        if (bestAttCat && bestAttCat.rate >= 50) {
            insights.push({ domain: 'engagement', level: 'success', title: `"${bestAttCat.cat}" Drives Best Attendance`, body: `"${bestAttCat.cat}" events convert ${Math.round(bestAttCat.rate)}% of interested residents to attendees — the strongest attendance rate across all categories.` });
            recs.push({ domain: 'engagement', text: `Prioritize "${bestAttCat.cat}" programming — this category consistently converts interest to attendance at the highest rate on the platform.` });
        }
    }

    // ── CATEGORIES domain rules ───────────────────────────────────────────────
    if (categoryCount <= 2 && events.length >= 5) {
        insights.push({ domain: 'categories', level: 'warning', title: 'Limited Category Diversity', body: `Events are concentrated in only ${categoryCount} categor${categoryCount > 1 ? 'ies' : 'y'}. A narrow portfolio limits the resident audience CICRD can reach.` });
        recs.push({ domain: 'categories', text: 'Invite facilitators to create events across more categories to diversify the portfolio and attract different resident groups.' });
    } else if (categoryCount >= 3 && categoryCount <= 4) {
        insights.push({ domain: 'categories', level: 'info', title: 'Growing Category Diversity', body: `Events span ${categoryCount} categories — a moderate range. Expanding to 5+ categories would give residents more varied programming to engage with.` });
    } else if (categoryCount >= 5) {
        insights.push({ domain: 'categories', level: 'success', title: 'Diverse Event Portfolio', body: `Events span ${categoryCount} categories — a wide range that can attract residents with varied interests across the community.` });
    }

    if (topCategory) {
        const tPct = Math.round(safePercentage(catCounts[topCategory], events.length));
        if (tPct > 70) {
            insights.push({ domain: 'categories', level: 'warning', title: `Over-Reliance on "${topCategory}"`, body: `${tPct}% of all events are in "${topCategory}". Residents interested in other topics are largely underserved, limiting platform-wide reach.` });
            recs.push({ domain: 'categories', text: `Diversify beyond "${topCategory}" — commission or invite events in 2–3 new categories to reduce concentration and broaden community appeal.` });
        } else if (tPct > 50) {
            insights.push({ domain: 'categories', level: 'info', title: `"${topCategory}" Category Leads`, body: `${tPct}% of events are in "${topCategory}" — a strong niche presence. Other categories need more representation for balanced resident reach.` });
        }
    }

    if (bestCat && bestCat.avg >= 4.5) {
        insights.push({ domain: 'categories', level: 'success', title: `Top Rated: "${bestCat.cat}"`, body: `"${bestCat.cat}" events average ${bestCat.avg.toFixed(1)}/5 — the highest-rated category on the platform. Prioritize it in upcoming programming cycles.` });
        recs.push({ domain: 'categories', text: `Expand "${bestCat.cat}" programming in the upcoming quarter — consistent high satisfaction scores make it the safest investment.` });
    } else if (bestCat && bestCat.avg >= 4.0) {
        insights.push({ domain: 'categories', level: 'success', title: `Best Category: "${bestCat.cat}"`, body: `"${bestCat.cat}" events average ${bestCat.avg.toFixed(1)}/5 — consistent quality supports continued programming investment in this area.` });
    }

    if (worstCat && worstCat.cat !== bestCat?.cat && worstCat.avg < 3.0) {
        insights.push({ domain: 'categories', level: 'warning', title: `Underperforming: "${worstCat.cat}"`, body: `"${worstCat.cat}" events average ${worstCat.avg.toFixed(1)}/5. Investigate what's driving dissatisfaction before scheduling more events in this category.` });
        recs.push({ domain: 'categories', text: `Pause and redesign "${worstCat.cat}" events based on resident feedback before scheduling additional editions.` });
    }

    // ── PLATFORM domain rules ─────────────────────────────────────────────────
    if (events.length > 0) {
        const privateCount  = events.filter(e => e.isPrivate).length;
        const privateRatio  = safePercentage(privateCount, events.length);
        const facilEvtCount = events.filter(e => !e.createdByAdmin && e.createdBy).length;
        const facEvtPct     = safePercentage(facilEvtCount, events.length);
        const pubInterested = events.filter(e => !e.isPrivate).reduce((s, e) => s + safeNumber(e.interestedCount), 0);
        const pubCheckIns   = events.filter(e => !e.isPrivate).reduce((s, e) => s + safeNumber(e.checkInCount), 0);
        const qrRate        = safePercentage(pubCheckIns, pubInterested);

        if (privateRatio > 60) {
            insights.push({ domain: 'platform', level: 'warning', title: 'High Private Event Ratio', body: `${Math.round(privateRatio)}% of events require approval to join. This limits open community access and suppresses platform engagement.` });
            recs.push({ domain: 'platform', text: 'Encourage facilitators to create more open (public) events to maximize community access and reduce participation barriers.' });
        } else if (privateRatio >= 30) {
            insights.push({ domain: 'platform', level: 'info', title: 'Mixed Public-Private Balance', body: `${Math.round(privateRatio)}% of events are private. Ensure public events are well-promoted to drive discovery for residents not in the approval pipeline.` });
        }

        if (pubInterested >= 10 && qrRate < 20) {
            insights.push({ domain: 'platform', level: 'info', title: 'Low QR Check-In Adoption', body: `Only ${Math.round(qrRate)}% of interested public event residents use QR check-in. Actual attendance may be significantly undercounted.` });
            recs.push({ domain: 'platform', text: 'Promote QR check-in at event entrances and educate attendees through the app to improve attendance data accuracy.' });
        } else if (pubInterested >= 10 && qrRate >= 50) {
            insights.push({ domain: 'platform', level: 'success', title: 'Strong QR Check-In Adoption', body: `${Math.round(qrRate)}% of interested public-event residents use QR check-in — excellent attendance data accuracy across the platform.` });
        }

        if (facilitators > 0 && facEvtPct < 20) {
            insights.push({ domain: 'platform', level: 'info', title: 'Low Facilitator Event Contribution', body: `Only ${Math.round(facEvtPct)}% of events are facilitator-created. The platform relies heavily on admin-generated content.` });
            recs.push({ domain: 'platform', text: 'Provide facilitators with event templates and submission guidelines to encourage more community-driven event creation.' });
        } else if (facEvtPct >= 40) {
            insights.push({ domain: 'platform', level: 'success', title: 'Strong Facilitator Contribution', body: `${Math.round(facEvtPct)}% of events are facilitator-created — a healthy, community-driven content pipeline that reduces admin workload.` });
        }

        if (uniqueCities === 1 && events.length >= 5) {
            insights.push({ domain: 'platform', level: 'info', title: 'Single-City Coverage', body: `All events are concentrated in ${topCity ?? 'one city'}. Expanding to neighboring areas could grow the resident base and platform impact.` });
        } else if (uniqueCities >= 3) {
            insights.push({ domain: 'platform', level: 'success', title: 'Multi-City Reach', body: `Events span ${uniqueCities} cities or areas — good geographic distribution for broader community impact across the region.` });
        } else if (topCityPct > 80 && uniqueCities > 1) {
            insights.push({ domain: 'platform', level: 'info', title: 'Geographic Concentration', body: `${topCityPct}% of events are in ${topCity}. Other registered areas receive minimal programming — consider expanding event coverage.` });
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const ratingLabel  = avgRating >= 4.0 ? 'positively' : avgRating >= 3.0 ? 'moderately' : avgRating > 0 ? 'below expectations' : 'not yet';
    const scoreLabel   = overallScore >= 80 ? 'performing well' : overallScore >= 60 ? 'on track' : overallScore >= 40 ? 'needs attention' : 'critically underperforming';
    let summary = `CICRD overview: ${events.length} event${events.length !== 1 ? 's' : ''} across ${categoryCount} categor${categoryCount !== 1 ? 'ies' : 'y'}, ${totalUsers} registered resident${totalUsers !== 1 ? 's' : ''}, and ${totalViews.toLocaleString()} total views.`;
    if (avgRating > 0) summary += ` Community satisfaction is ${ratingLabel} at ${avgRating.toFixed(1)}/5.`;
    if (upcomingEvts.length > 0) summary += ` ${upcomingEvts.length} upcoming event${upcomingEvts.length > 1 ? 's' : ''} scheduled.`;
    summary += flags.length > 0 ? ` ${flags.length} area${flags.length > 1 ? 's require' : ' requires'} attention.` : ` Platform is ${scoreLabel}.`;

    return {
        role: 'admin',
        summary,
        overallScore,
        topCategory,
        topLocation,
        insights: insights.slice(0, 14),
        flags,
        recommendations: recs.slice(0, 10),
    };
};

// ─── Facilitator scoped summary ───────────────────────────────────────────────

export const generateFacilitatorDecisionSummary = (
    rawEvents:     EventType[],
    rawFeedback:   EventFeedback[],
    facilitatorId: string
): CrossDomainSummary => {
    // ── Defensive isolation — only analyze this facilitator's own data ─────────
    const myEvents   = facilitatorId
        ? rawEvents.filter(e => e.createdBy === facilitatorId)
        : rawEvents;
    const myEventIds = new Set(myEvents.map(e => e.id));
    const myFeedback = rawFeedback.filter(f => myEventIds.has(f.eventId));

    const insights: DomainInsight[] = [];
    const flags:    string[]        = [];
    const recs:     { domain: InsightDomain; text: string }[] = [];
    const now = new Date();

    if (myEvents.length === 0) {
        return {
            role: 'facilitator',
            summary: 'You have not created any events yet. Submit your first event to start engaging with the community.',
            overallScore: 0,
            topCategory: null,
            topLocation: null,
            insights: [{ domain: 'events', level: 'info', title: 'No Events Created Yet', body: 'Submit your first event for admin review. Once published, you will see engagement analytics and recommendations here.' }],
            flags: [],
            recommendations: [{ domain: 'events', text: 'Create and submit your first event to begin building your community programming portfolio.' }],
        };
    }

    // ── Aggregates ────────────────────────────────────────────────────────────
    const totalViews      = myEvents.reduce((s, e) => s + safeNumber(e.viewCount), 0);
    const totalSaves      = myEvents.reduce((s, e) => s + safeNumber(e.saveCount), 0);
    const totalInterested = myEvents.reduce((s, e) => s + safeNumber(e.interestedCount), 0);
    const totalCheckIns   = myEvents.reduce((s, e) => s + safeNumber(e.checkInCount), 0);
    // Use actual feedback documents for the count — more accurate than denormalized field
    const totalFeedback   = myFeedback.length || myEvents.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);

    // Avg rating: prefer actual feedback documents over denormalized event fields
    const avgRating = (() => {
        if (myFeedback.length > 0) {
            const sum = myFeedback.reduce((s, f) => s + safeNumber(f.rating), 0);
            return sum / myFeedback.length;
        }
        const ratedEvts = myEvents.filter(e => safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0);
        const wt = ratedEvts.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);
        return wt === 0 ? 0 : ratedEvts.reduce((s, e) => s + safeNumber(e.averageRating) * safeNumber(e.feedbackCount), 0) / wt;
    })();
    // Events with at least one real review
    const ratedEvts = myFeedback.length > 0
        ? myEvents.filter(e => myFeedback.some(f => f.eventId === e.id))
        : myEvents.filter(e => safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0);

    const engRate = safePercentage(totalSaves + totalInterested, totalViews);
    const attRate = safePercentage(totalCheckIns, totalInterested);
    const fbRate  = safePercentage(totalFeedback, totalCheckIns);

    const lowVisCnt     = myEvents.filter(e => safeNumber(e.viewCount) < 10).length;
    const pendingEvts   = myEvents.filter(e => e.status === 'pending');
    const publishedEvts = myEvents.filter(e => e.status === 'published');
    const rejectedEvts  = myEvents.filter(e => e.status === 'rejected');
    const upcomingEvts  = publishedEvts.filter(e => e.date && new Date(e.date) >= now);

    // Scored events
    const scored = myEvents.map(e => ({ e, m: calculateEventMetrics(e) })).sort((a, b) => b.m.performanceScore - a.m.performanceScore);
    const best   = scored[0] ?? null;
    const worst  = scored.length > 1 ? scored[scored.length - 1] : null;

    // Performance trend: compare older half vs newer half (by event date)
    const byDate     = [...myEvents].sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0));
    const mid        = Math.floor(byDate.length / 2);
    const olderScore = mid > 0 ? byDate.slice(0, mid).reduce((s, e) => s + calculateEventMetrics(e).performanceScore, 0) / mid : 0;
    const newerScore = byDate.slice(mid).length > 0 ? byDate.slice(mid).reduce((s, e) => s + calculateEventMetrics(e).performanceScore, 0) / byDate.slice(mid).length : 0;
    const improving  = myEvents.length >= 4 && newerScore > olderScore * 1.2;
    const declining  = myEvents.length >= 4 && newerScore < olderScore * 0.8;

    // Category analysis
    const catCounts: Record<string, number> = {};
    const catPerf:   Record<string, { score: number; count: number; checkIns: number; interested: number }> = {};
    myEvents.forEach(e => {
        const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
        const m    = calculateEventMetrics(e);
        cats.forEach(c => {
            catCounts[c] = (catCounts[c] || 0) + 1;
            if (!catPerf[c]) catPerf[c] = { score: 0, count: 0, checkIns: 0, interested: 0 };
            catPerf[c].score      += m.performanceScore;
            catPerf[c].count      += 1;
            catPerf[c].checkIns   += m.checkIns;
            catPerf[c].interested += m.interested;
        });
    });
    const topCategory  = topByCount(catCounts);
    const catRanked    = Object.entries(catPerf)
        .map(([cat, v]) => ({ cat, avgScore: v.score / v.count, attRate: safePercentage(v.checkIns, v.interested) }))
        .sort((a, b) => b.avgScore - a.avgScore);
    const bestCat = catRanked[0] ?? null;

    // Capacity analysis
    const cappedEvts   = publishedEvts.filter(e => safeNumber(e.maxParticipants) > 0);
    const nearCapacity = cappedEvts.filter(e => {
        const cap = safeNumber(e.maxParticipants!);
        return cap > 0 && safeNumber(e.checkInCount) / cap >= 0.8;
    });

    // Score (5-factor)
    const visScore    = Math.round((1 - lowVisCnt / myEvents.length) * 100);
    const overallScore = Math.round(
        visScore                         * 0.15 +
        Math.min(engRate * 2, 100)       * 0.20 +
        attRate                          * 0.30 +
        Math.min(fbRate * 2, 100)        * 0.10 +
        safePercentage(avgRating, 5)     * 0.25
    );

    // ── EVENTS domain ─────────────────────────────────────────────────────────

    // Performance trend
    if (improving) {
        insights.push({ domain: 'events', level: 'success', title: 'Performance Improving', body: `Your recent events are outperforming earlier ones (avg score: ${Math.round(newerScore)} vs ${Math.round(olderScore)}). You're applying what works and improving your community programming.` });
    } else if (declining) {
        insights.push({ domain: 'events', level: 'warning', title: 'Performance Declining', body: `Recent events score lower than earlier ones (avg: ${Math.round(newerScore)} vs ${Math.round(olderScore)}). Review what changed in format, timing, venue, or promotion.` });
        recs.push({ domain: 'events', text: 'Compare your best and worst recent events — identify the specific differences in format, timing, and promotion that drove the performance gap.' });
    }

    // Best event spotlight with key metric
    if (best && best.m.performanceScore >= 60) {
        const metric = best.m.attendanceRate > 50 ? `${Math.round(best.m.attendanceRate)}% attendance`
                     : best.m.avgRating >= 4.0    ? `${best.m.avgRating.toFixed(1)}/5 rating`
                     :                               `${Math.round(best.m.engagementRate)}% engagement`;
        insights.push({ domain: 'events', level: 'success', title: 'Your Best Event', body: `"${best.e.name}" is your top performer (score ${best.m.performanceScore}/100, ${metric}). This format resonates strongly — plan a follow-up.` });
        recs.push({ domain: 'events', text: `Schedule a follow-up edition of "${best.e.name}" — replicate the same format, timing, and promotion that made it successful.` });
    }

    // Worst event with specific bottleneck
    if (worst && worst.m.performanceScore < 30 && myEvents.length > 1) {
        const issue = worst.m.views < 10 ? `only ${worst.m.views} views`
                    : worst.m.attendanceRate < 20 ? `${Math.round(worst.m.attendanceRate)}% of interested residents attended`
                    : worst.m.avgRating > 0 ? `${worst.m.avgRating.toFixed(1)}/5 satisfaction`
                    : 'very low overall engagement';
        insights.push({ domain: 'events', level: 'warning', title: 'Lowest Performing Event', body: `"${worst.e.name}" scored ${worst.m.performanceScore}/100 — the main issue was ${issue}. Address this before scheduling a repeat.` });
        recs.push({ domain: 'events', text: `Review "${worst.e.name}" carefully — investigate venue suitability, scheduling, description clarity, and promotion reach before resubmitting.` });
    }

    // Visibility
    if (lowVisCnt > 0) {
        const lvl: InsightLevel = lowVisCnt > myEvents.length * 0.5 ? 'warning' : 'info';
        const named = myEvents.filter(e => safeNumber(e.viewCount) < 10).slice(0, 2).map(e => `"${e.name}"`).join(' and ');
        insights.push({ domain: 'events', level: lvl, title: 'Low-Visibility Events', body: `${lowVisCnt} of your events have fewer than 10 views${lowVisCnt <= 2 ? ` (${named})` : ''}. Stronger titles, richer descriptions, and admin highlights can improve reach.` });
        recs.push({ domain: 'events', text: 'Request admin highlights for your low-visibility events and rewrite titles to be more searchable and benefit-focused.' });
    }

    if (pendingEvts.length > 0) {
        insights.push({ domain: 'events', level: 'info', title: 'Events Awaiting Approval', body: `${pendingEvts.length} of your event${pendingEvts.length > 1 ? 's are' : ' is'} pending admin review. Allow 24–48 hours for processing.` });
    }

    if (rejectedEvts.length > 0) {
        insights.push({ domain: 'events', level: 'warning', title: `${rejectedEvts.length} Event${rejectedEvts.length > 1 ? 's' : ''} Rejected`, body: `${rejectedEvts.length} submission${rejectedEvts.length > 1 ? 's were' : ' was'} rejected. Review the rejection reasons and resubmit with the required corrections.` });
        flags.push(`${rejectedEvts.length} event${rejectedEvts.length > 1 ? 's' : ''} rejected — needs resubmission.`);
        recs.push({ domain: 'events', text: 'Check rejection reasons for declined submissions, update the flagged details, and resubmit promptly to avoid losing community momentum.' });
    }

    if (publishedEvts.length === 0 && myEvents.length > 0) {
        insights.push({ domain: 'events', level: 'warning', title: 'No Published Events', body: 'None of your events are currently live. Coordinate with the admin to get events approved and visible to residents.' });
    }

    if (upcomingEvts.length === 0 && publishedEvts.length > 0) {
        insights.push({ domain: 'events', level: 'info', title: 'No Upcoming Events', body: 'You have no scheduled upcoming events. Keeping a forward calendar maintains your audience and prevents community interest from fading.' });
        recs.push({ domain: 'events', text: 'Submit your next event soon — a regular cadence of events builds your facilitator reputation and keeps residents returning to the platform.' });
    }

    if (nearCapacity.length > 0) {
        const names = nearCapacity.slice(0, 2).map(e => `"${e.name}"`).join(' and ');
        insights.push({ domain: 'events', level: 'info', title: 'Events Near Capacity', body: `${nearCapacity.length <= 2 ? names : `${nearCapacity.length} events are`} at 80%+ of maximum participants. Consider requesting a capacity increase or planning a follow-up session.` });
        recs.push({ domain: 'events', text: 'Request a capacity increase for events nearing full capacity — or plan a follow-up session to serve all interested residents.' });
    }

    // ── ENGAGEMENT domain ─────────────────────────────────────────────────────
    if (totalViews > 0) {
        if (engRate >= 40) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Strong Resident Interest', body: `${Math.round(engRate)}% of people viewing your events take action (save or mark interest) — your events are compelling and well-presented.` });
        } else if (engRate >= 20) {
            insights.push({ domain: 'engagement', level: 'info', title: 'Moderate Engagement Rate', body: `${Math.round(engRate)}% of viewers engage further with your events. Clearer benefit statements and better cover images could push this above 40%.` });
        } else if (engRate < 15 && totalViews >= 15) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Low Interest Conversion', body: `Only ${Math.round(engRate)}% of views lead to saves or interest. Your event content or presentation may not be compelling enough to drive action.` });
            flags.push(`${Math.round(engRate)}% engagement rate — below the 15% target.`);
            recs.push({ domain: 'engagement', text: 'Rewrite your event descriptions to clearly state what attendees will experience, what to bring, and what they\'ll gain — specific details convert viewers to participants.' });
        }
    }

    if (totalInterested >= 5) {
        if (attRate >= 60) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Excellent Attendance Rate', body: `${Math.round(attRate)}% of interested residents checked in — well above average. Your scheduling, venue choices, and pre-event communication are effective.` });
        } else if (attRate >= 30) {
            insights.push({ domain: 'engagement', level: 'info', title: 'Attendance Rate On Target', body: `${Math.round(attRate)}% of interested residents attended — meeting the 30% benchmark. Personal reminders 24h before events could push this higher.` });
        } else {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Interest-to-Attendance Drop-Off', body: `Only ${Math.round(attRate)}% of residents who showed interest attended. Barriers around timing, venue access, or awareness may be causing drop-off.` });
            flags.push(`${Math.round(attRate)}% attendance rate — below the 30% expected threshold.`);
            recs.push({ domain: 'engagement', text: 'Message interested participants directly 24 hours before your event — confirm attendance, share exact location, and tell them what to expect.' });
        }
    }

    if (totalCheckIns >= 5) {
        if (fbRate >= 40) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Strong Feedback Collection', body: `${Math.round(fbRate)}% of attendees rate your events — above average. This data helps you continuously improve your programming.` });
        } else if (fbRate < 20) {
            insights.push({ domain: 'engagement', level: 'info', title: 'Low Post-Event Feedback', body: `Only ${Math.round(fbRate)}% of attendees leave ratings. A verbal reminder at the end of the event is the single most effective way to improve this.` });
            recs.push({ domain: 'engagement', text: 'At event close, announce: "Please take 30 seconds to rate today\'s event in the app." This simple ask reliably doubles feedback submission rates.' });
        }
    }

    if (avgRating >= 4.5 && ratedEvts.length >= 2) {
        insights.push({ domain: 'engagement', level: 'success', title: 'Excellent Satisfaction Score', body: `Your events average ${avgRating.toFixed(1)}/5 — you're consistently delivering high-quality, well-received community programming.` });
    } else if (avgRating >= 4.0 && ratedEvts.length >= 1) {
        insights.push({ domain: 'engagement', level: 'success', title: 'High Satisfaction Score', body: `Your events average ${avgRating.toFixed(1)}/5 — residents are satisfied with your event quality. Keep applying what's working.` });
    } else if (avgRating > 0 && avgRating < 3.0) {
        insights.push({ domain: 'engagement', level: 'critical', title: 'Satisfaction Below Expectations', body: `Your events average ${avgRating.toFixed(1)}/5. Read the feedback comments carefully to identify the specific issues residents encountered.` });
        flags.push(`Average satisfaction of ${avgRating.toFixed(1)}/5 requires immediate attention.`);
        recs.push({ domain: 'engagement', text: 'Read every feedback comment and list the top 3 recurring complaints. Address each one directly in your next event plan before submitting.' });
    }

    // ── CATEGORIES domain ─────────────────────────────────────────────────────
    if (bestCat && catRanked.length >= 2) {
        insights.push({ domain: 'categories', level: 'success', title: `Strongest Category: "${bestCat.cat}"`, body: `Your "${bestCat.cat}" events score an avg of ${Math.round(bestCat.avgScore)}/100 — your best-performing category. Investing more here maximizes your community impact.` });
        recs.push({ domain: 'categories', text: `Prioritize more "${bestCat.cat}" events — your track record in this category is your strongest driver of resident engagement and satisfaction.` });
    }

    if (topCategory) {
        const tPct = Math.round(safePercentage(catCounts[topCategory], myEvents.length));
        if (tPct > 70 && myEvents.length >= 3) {
            insights.push({ domain: 'categories', level: 'info', title: `Specializing in "${topCategory}"`, body: `${tPct}% of your events are in "${topCategory}". Deep specialization builds your reputation — branching out can attract new audience segments.` });
            recs.push({ domain: 'categories', text: `Create 1–2 events in a new category to attract residents outside your "${topCategory}" audience and test what else the community values.` });
        }
    }

    // ── PLATFORM domain ───────────────────────────────────────────────────────
    const privateRatio = safePercentage(myEvents.filter(e => e.isPrivate).length, myEvents.length);
    if (privateRatio > 70 && myEvents.length >= 3) {
        insights.push({ domain: 'platform', level: 'info', title: 'Mostly Private Events', body: `${Math.round(privateRatio)}% of your events are private (approval required). Public events remove the registration barrier and can significantly expand your reach.` });
        recs.push({ domain: 'platform', text: 'Create at least one public event to reach residents who won\'t go through an approval process but would attend an open, accessible event.' });
    }

    // Consistency check across events
    if (myEvents.length >= 3) {
        const scores = scored.map(s => s.m.performanceScore);
        const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
        const stdDev = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length);
        if (stdDev < 10 && avg >= 50) {
            insights.push({ domain: 'platform', level: 'success', title: 'Consistent Performance', body: `Your events score between ${Math.round(Math.min(...scores))} and ${Math.round(Math.max(...scores))}/100 — a tight range showing you reliably deliver quality programming.` });
        } else if (stdDev > 25) {
            insights.push({ domain: 'platform', level: 'info', title: 'Inconsistent Results', body: `Your event scores range from ${Math.round(Math.min(...scores))} to ${Math.round(Math.max(...scores))}/100 — wide variance means some formats work much better than others for your audience.` });
            recs.push({ domain: 'platform', text: 'Compare your highest and lowest scoring events side by side — identify what specifically differs in format, promotion, venue, or timing and standardize what works.' });
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const label     = overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'moderate' : 'low';
    const trendNote = improving ? ' Your performance is trending upward.' : declining ? ' Recent events show a declining trend.' : '';
    let summary = `Your ${myEvents.length} event${myEvents.length > 1 ? 's have' : ' has'} generated ${totalViews.toLocaleString()} view${totalViews !== 1 ? 's' : ''} and ${totalCheckIns} check-in${totalCheckIns !== 1 ? 's' : ''}.`;
    if (avgRating > 0) summary += ` Resident satisfaction averages ${avgRating.toFixed(1)}/5.`;
    summary += ` Overall performance is ${label} (${overallScore}/100).${trendNote}`;
    if (flags.length > 0) summary += ` ${flags.length} area${flags.length > 1 ? 's need' : ' needs'} attention.`;

    return {
        role: 'facilitator',
        summary,
        overallScore,
        topCategory,
        topLocation: null,
        insights: insights.slice(0, 12),
        flags,
        recommendations: recs.slice(0, 8),
    };
};
