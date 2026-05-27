
import type { EventType } from '../types';

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
