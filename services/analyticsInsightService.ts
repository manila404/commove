
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

    const lowVisCnt    = events.filter(e => safeNumber(e.viewCount) < 10).length;
    const highRatCnt   = events.filter(e => safeNumber(e.averageRating) >= 4.5 && safeNumber(e.feedbackCount) >= 3).length;
    const lowRatCnt    = events.filter(e => safeNumber(e.averageRating) > 0 && safeNumber(e.averageRating) < 3).length;
    const pendingEvts  = events.filter(e => e.status === 'pending');
    const cancelledEvts = events.filter(e => e.status === 'cancelled');
    const lowAttEvts   = events.filter(e => { const m = calculateEventMetrics(e); return m.interested >= 5 && m.attendanceRate < 40; }).length;

    const engRate = safePercentage(totalSaves + totalInterested, totalViews);
    const attRate = safePercentage(totalCheckIns, totalInterested);
    const fbRate  = safePercentage(totalFeedback, totalCheckIns);

    // ── Category analysis ─────────────────────────────────────────────────────
    const catCounts: Record<string, number> = {};
    const catRating: Record<string, { sum: number; wt: number }> = {};
    events.forEach(e => {
        const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
        cats.forEach(c => {
            catCounts[c] = (catCounts[c] || 0) + 1;
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
    const worstCat = catAvgs[catAvgs.length - 1] ?? null;

    // ── Location analysis ─────────────────────────────────────────────────────
    const locCounts: Record<string, number> = {};
    events.forEach(e => { const l = e.venue || e.city; if (l) locCounts[l] = (locCounts[l] || 0) + 1; });
    const topLocation = topByCount(locCounts);

    // ── User analysis ─────────────────────────────────────────────────────────
    const totalUsers       = users.length;
    const facilitators     = users.filter(u => u.role === 'facilitator').length;
    const regularUsers     = users.filter(u => !u.role || u.role === 'user').length;
    const pendingFacReqs   = users.filter(u => u.facilitatorRequestStatus === 'pending').length;
    const profileComplete  = users.filter(u => u.birthday && u.sex).length;

    // ── Demographics ──────────────────────────────────────────────────────────
    const gMap: Record<string, number> = {};
    users.forEach(u => { if (u.sex) gMap[u.sex] = (gMap[u.sex] || 0) + 1; });
    const maleCount   = (gMap['Male'] || 0)   + (gMap['male'] || 0);
    const femaleCount = (gMap['Female'] || 0) + (gMap['female'] || 0);
    const gTotal      = maleCount + femaleCount;

    const ageGroups = { youth: 0, youngAdult: 0, adult: 0, senior: 0 };
    users.filter(u => u.birthday).forEach(u => {
        const age = calcAge(u.birthday!);
        if (age < 18)      ageGroups.youth++;
        else if (age < 25) ageGroups.youngAdult++;
        else if (age < 60) ageGroups.adult++;
        else               ageGroups.senior++;
    });

    // ── Overall score ─────────────────────────────────────────────────────────
    const visScore = events.length === 0 ? 50 : Math.round((1 - lowVisCnt / events.length) * 100);
    const overallScore = Math.round(
        visScore  * 0.20 +
        Math.min(engRate * 2, 100) * 0.20 +
        attRate   * 0.30 +
        safePercentage(avgRating, 5) * 0.30
    );

    // ── EVENTS domain rules ───────────────────────────────────────────────────
    if (events.length === 0) {
        insights.push({ domain: 'events', level: 'info', title: 'No Events Yet', body: 'No events have been created. Start by publishing the first community event to begin platform engagement.' });
    } else {
        if (lowVisCnt > Math.ceil(events.length * 0.5)) {
            insights.push({ domain: 'events', level: 'critical', title: 'Critical Visibility Gap', body: `${lowVisCnt} of ${events.length} events have fewer than 10 views. Most events are not reaching residents — a platform-wide promotion strategy is urgently needed.` });
            flags.push(`${lowVisCnt}/${events.length} events critically underperforming in visibility.`);
            recs.push({ domain: 'events', text: 'Launch a platform-wide promotion campaign (barangay announcements, social media) to improve event discovery across all listings.' });
        } else if (lowVisCnt > Math.ceil(events.length * 0.25)) {
            insights.push({ domain: 'events', level: 'warning', title: 'Promotion Gaps Detected', body: `${lowVisCnt} events have low visibility (under 10 views). Use the Highlights feature or additional promotion channels to surface these events.` });
            recs.push({ domain: 'events', text: 'Use the Highlights feature to boost visibility of low-traffic events and increase resident discovery.' });
        }
        if (highRatCnt >= 2) {
            insights.push({ domain: 'events', level: 'success', title: 'High-Quality Events', body: `${highRatCnt} event${highRatCnt > 1 ? 's have' : ' has'} achieved excellent satisfaction (4.5+/5). These formats are strong candidates for recurring programs.` });
            recs.push({ domain: 'events', text: `Schedule recurring editions of your top-rated events to sustain community satisfaction.` });
        }
        if (lowRatCnt > 0) {
            insights.push({ domain: 'events', level: 'warning', title: 'Low Satisfaction Events', body: `${lowRatCnt} event${lowRatCnt > 1 ? 's are' : ' is'} rated below 3/5. CICRD should review feedback to identify recurring issues before repeating these formats.` });
            flags.push(`${lowRatCnt} event${lowRatCnt > 1 ? 's' : ''} rated below 3/5 — quality review recommended.`);
            recs.push({ domain: 'events', text: 'Conduct a post-mortem review of low-rated events and address venue, timing, or content concerns before the next edition.' });
        }
        if (pendingEvts.length > 5) {
            insights.push({ domain: 'events', level: 'warning', title: 'Review Queue Building Up', body: `${pendingEvts.length} events are awaiting approval. A growing queue may delay resident awareness and planning.` });
            flags.push(`${pendingEvts.length} events pending approval — review queue is backing up.`);
            recs.push({ domain: 'events', text: 'Assign a dedicated reviewer to clear the pending event queue and prevent submission delays.' });
        } else if (pendingEvts.length > 0) {
            insights.push({ domain: 'events', level: 'info', title: 'Events Awaiting Review', body: `${pendingEvts.length} event${pendingEvts.length > 1 ? 's are' : ' is'} pending approval. Timely review prevents delays in resident awareness.` });
        }
        if (cancelledEvts.length > 0 && safePercentage(cancelledEvts.length, events.length) > 15) {
            const cr = Math.round(safePercentage(cancelledEvts.length, events.length));
            insights.push({ domain: 'events', level: 'warning', title: 'High Cancellation Rate', body: `${cr}% of events have been cancelled. Frequent cancellations can erode resident trust in the platform.` });
            flags.push(`${cr}% event cancellation rate detected.`);
            recs.push({ domain: 'events', text: 'Implement pre-approval checklists (venue confirmation, organizer commitment) to reduce preventable cancellations.' });
        }
        if (lowAttEvts > Math.ceil(events.length * 0.3)) {
            insights.push({ domain: 'events', level: 'warning', title: 'Widespread Interest-Attendance Gap', body: `${lowAttEvts} events show significant drop-off between interest and actual check-ins. Systemic improvements to reminders may help.` });
            recs.push({ domain: 'events', text: 'Implement automated 24-hour pre-event reminders for all residents who marked interest to reduce no-shows platform-wide.' });
        }
    }

    // ── USERS domain rules ────────────────────────────────────────────────────
    if (totalUsers === 0) {
        insights.push({ domain: 'users', level: 'info', title: 'No Registered Users', body: 'No users are registered yet. Resident onboarding is a critical first step for platform adoption.' });
    } else {
        const facRatio = safePercentage(facilitators, totalUsers);
        if (facilitators === 0) {
            insights.push({ domain: 'users', level: 'warning', title: 'No Active Facilitators', body: 'There are no approved facilitators. Facilitators are essential for creating diverse community events beyond admin-created content.' });
            recs.push({ domain: 'users', text: 'Recruit and onboard at least 3–5 community facilitators to diversify event creation across barangays.' });
        } else if (facRatio < 5) {
            insights.push({ domain: 'users', level: 'info', title: 'Low Facilitator Ratio', body: `Only ${facilitators} facilitator${facilitators > 1 ? 's' : ''} (${Math.round(facRatio)}% of users). A larger facilitator pool increases event diversity and volume.` });
            recs.push({ domain: 'users', text: 'Promote the facilitator application process to engaged residents to grow the event creation pipeline.' });
        }
        if (pendingFacReqs > 3) {
            insights.push({ domain: 'users', level: 'warning', title: 'Facilitator Applications Backlog', body: `${pendingFacReqs} facilitator applications are awaiting review. Delayed processing reduces applicant engagement.` });
            flags.push(`${pendingFacReqs} facilitator applications pending review.`);
            recs.push({ domain: 'users', text: 'Review and process pending facilitator applications to maintain community trust and applicant motivation.' });
        } else if (pendingFacReqs > 0) {
            insights.push({ domain: 'users', level: 'info', title: 'Facilitator Applications Pending', body: `${pendingFacReqs} application${pendingFacReqs > 1 ? 's are' : ' is'} awaiting facilitator approval. Timely processing keeps applicants engaged.` });
        }
        if (safePercentage(profileComplete, totalUsers) < 40) {
            const pr = Math.round(safePercentage(profileComplete, totalUsers));
            insights.push({ domain: 'users', level: 'info', title: 'Low Profile Completion', body: `Only ${pr}% of users have complete profiles (birthday + gender). This limits demographic analytics accuracy for planning decisions.` });
            recs.push({ domain: 'users', text: 'Encourage profile completion through in-app prompts to improve demographic data quality and personalization accuracy.' });
        }
        if (regularUsers > 30 && events.length > 0) {
            const active = users.filter(u => (u.checkedInEventIds?.length ?? 0) > 0 || (u.interestedEventIds?.length ?? 0) > 0).length;
            const activeRate = safePercentage(active, regularUsers);
            if (activeRate < 20) {
                insights.push({ domain: 'users', level: 'warning', title: 'Low User Activity Rate', body: `Only ${Math.round(activeRate)}% of residents have interacted with events. Most registered users remain passive on the platform.` });
                recs.push({ domain: 'users', text: 'Send periodic push notifications to re-engage passive users with upcoming events near their location.' });
            } else if (activeRate >= 50) {
                insights.push({ domain: 'users', level: 'success', title: 'High User Activity', body: `${Math.round(activeRate)}% of residents are actively engaging with events — a strong indicator of platform adoption and community interest.` });
            }
        }
    }

    // ── DEMOGRAPHICS domain rules ─────────────────────────────────────────────
    const usersWithBday = users.filter(u => u.birthday).length;
    if (usersWithBday < 5 && gTotal < 5) {
        insights.push({ domain: 'demographics', level: 'info', title: 'Limited Demographic Data', body: 'Insufficient birthday or gender data for demographic analysis. Encourage users to complete their profiles to enable better event planning.' });
    } else {
        if (gTotal >= 10) {
            const mPct = safePercentage(maleCount, gTotal);
            const fPct = safePercentage(femaleCount, gTotal);
            if (mPct > 75) {
                insights.push({ domain: 'demographics', level: 'warning', title: 'Gender Reach Imbalance', body: `${Math.round(mPct)}% of users are male. Events and promotion may need to better target female residents for broader community reach.` });
                recs.push({ domain: 'demographics', text: 'Design family-oriented or skills-based programs for women to improve gender inclusivity across the platform.' });
            } else if (fPct > 75) {
                insights.push({ domain: 'demographics', level: 'warning', title: 'Gender Reach Imbalance', body: `${Math.round(fPct)}% of users are female. Include sports, career, or technology events to attract male residents and balance platform reach.` });
                recs.push({ domain: 'demographics', text: 'Include events in categories typically preferred by male residents (sports, technology, gaming) to balance gender reach.' });
            } else {
                insights.push({ domain: 'demographics', level: 'success', title: 'Balanced Gender Reach', body: `Male (${Math.round(mPct)}%) and female (${Math.round(fPct)}%) users are well-balanced — the platform has broad gender representation across the community.` });
            }
        }
        if (usersWithBday >= 5) {
            const dominant = Object.entries(ageGroups).sort((a, b) => b[1] - a[1])[0];
            const domPct   = safePercentage(dominant[1], usersWithBday);
            const labels: Record<string, string> = { youth: 'Under 18', youngAdult: '18–24', adult: '25–59', senior: '60+' };
            if (domPct > 55) {
                insights.push({ domain: 'demographics', level: 'info', title: `${labels[dominant[0]]} Dominant User Base`, body: `${Math.round(domPct)}% of users with known ages are ${labels[dominant[0]]}. Align event programming with this demographic's interests to maximize participation.` });
                if (dominant[0] === 'youngAdult') recs.push({ domain: 'demographics', text: 'Prioritize technology, career development, and social events to match the dominant 18–24 demographic.' });
                if (dominant[0] === 'adult')      recs.push({ domain: 'demographics', text: 'Schedule events on weekends and evenings to accommodate the working adult demographic that dominates the platform.' });
                if (dominant[0] === 'youth')      recs.push({ domain: 'demographics', text: 'Ensure youth-oriented events comply with age-appropriate guidelines and require parental awareness notifications.' });
            }
        }
    }

    // ── ENGAGEMENT domain rules ───────────────────────────────────────────────
    if (totalViews === 0 && events.length > 0) {
        insights.push({ domain: 'engagement', level: 'critical', title: 'No Event Views Recorded', body: 'Events are not being viewed by residents. Verify that events are published and accessible on the discovery feed.' });
        flags.push('Zero event views recorded — platform engagement has not started.');
    } else if (totalViews > 0) {
        if (engRate >= 40) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Strong Engagement Conversion', body: `${Math.round(engRate)}% of event views convert to saves or interest — residents are actively engaging, not just browsing.` });
        } else if (engRate < 15 && totalViews >= 20) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Low Engagement Conversion', body: `Only ${Math.round(engRate)}% of views convert to engagement. Event descriptions, visuals, or relevance may need improvement.` });
            recs.push({ domain: 'engagement', text: 'Improve event descriptions with clear benefits and compelling visuals to convert more viewers into interested participants.' });
        }
        if (totalInterested >= 10) {
            if (attRate >= 60) {
                insights.push({ domain: 'engagement', level: 'success', title: 'Strong Attendance Conversion', body: `${Math.round(attRate)}% of interested residents checked in — effective scheduling and promotion practices are working.` });
            } else if (attRate < 30) {
                insights.push({ domain: 'engagement', level: 'warning', title: 'Attendance Conversion Below Target', body: `Only ${Math.round(attRate)}% of interested residents followed through and attended. A systemic drop-off between interest and attendance is occurring.` });
                flags.push(`${Math.round(attRate)}% overall attendance conversion — below the 30% benchmark.`);
                recs.push({ domain: 'engagement', text: 'Deploy automated pre-event push notifications 24h and 1h before events to significantly reduce no-shows.' });
            }
        }
        if (totalCheckIns >= 10) {
            if (fbRate < 15) {
                insights.push({ domain: 'engagement', level: 'info', title: 'Feedback Collection Gap', body: `Only ${Math.round(fbRate)}% of attendees submit post-event feedback. Automated prompts after check-out may substantially improve this rate.` });
                recs.push({ domain: 'engagement', text: 'Add an automated in-app feedback prompt 1 hour after event end to capture more resident ratings while experience is fresh.' });
            } else if (fbRate >= 40) {
                insights.push({ domain: 'engagement', level: 'success', title: 'Active Feedback Culture', body: `${Math.round(fbRate)}% of attendees submit post-event feedback — providing valuable data for continuous improvement.` });
            }
        }
        if (avgRating >= 4.0) {
            insights.push({ domain: 'engagement', level: 'success', title: 'High Overall Satisfaction', body: `Platform-wide average rating is ${avgRating.toFixed(1)}/5 — residents are broadly satisfied with community event quality.` });
        } else if (avgRating > 0 && avgRating < 3.0) {
            insights.push({ domain: 'engagement', level: 'critical', title: 'Low Platform Satisfaction', body: `Platform average of ${avgRating.toFixed(1)}/5 is below acceptable levels. Quality improvements across event planning and execution are a priority.` });
            flags.push(`Platform satisfaction at ${avgRating.toFixed(1)}/5 — below the 3.0 minimum threshold.`);
            recs.push({ domain: 'engagement', text: 'Establish minimum event quality standards and conduct organizer training to improve overall resident satisfaction scores.' });
        }
    }

    // ── CATEGORIES domain rules ───────────────────────────────────────────────
    if (categoryCount <= 2 && events.length >= 5) {
        insights.push({ domain: 'categories', level: 'warning', title: 'Limited Category Diversity', body: `Events are concentrated in only ${categoryCount} categor${categoryCount > 1 ? 'ies' : 'y'}. A narrow portfolio may limit the audience CICRD can reach.` });
        recs.push({ domain: 'categories', text: 'Invite facilitators to create events across more categories to diversify the community event portfolio and attract different resident groups.' });
    } else if (categoryCount >= 5) {
        insights.push({ domain: 'categories', level: 'success', title: 'Diverse Event Portfolio', body: `Events span ${categoryCount} categories — providing a wide range of options that can attract residents with varied interests.` });
    }
    if (topCategory) {
        const tPct = Math.round(safePercentage(catCounts[topCategory], events.length));
        if (tPct > 60) {
            insights.push({ domain: 'categories', level: 'info', title: `"${topCategory}" Category Dominates`, body: `${tPct}% of all events are in the "${topCategory}" category. Strong niche presence, but broader programming may improve platform-wide reach.` });
        }
    }
    if (bestCat && bestCat.avg >= 4.0) {
        insights.push({ domain: 'categories', level: 'success', title: `Best Category: "${bestCat.cat}"`, body: `"${bestCat.cat}" events average ${bestCat.avg.toFixed(1)}/5 — consistent high quality in this category. Prioritize it in upcoming programming cycles.` });
        recs.push({ domain: 'categories', text: `Prioritize "${bestCat.cat}" events in the upcoming quarter based on consistent high resident satisfaction scores.` });
    }
    if (worstCat && worstCat !== bestCat && worstCat.avg < 3.0) {
        insights.push({ domain: 'categories', level: 'warning', title: `Underperforming Category: "${worstCat.cat}"`, body: `"${worstCat.cat}" events average ${worstCat.avg.toFixed(1)}/5. Investigate what's driving dissatisfaction before scheduling more events in this category.` });
        recs.push({ domain: 'categories', text: `Review and redesign "${worstCat.cat}" events based on resident feedback before scheduling additional editions.` });
    }

    // ── PLATFORM domain rules ─────────────────────────────────────────────────
    if (events.length > 0) {
        const privateCount = events.filter(e => e.isPrivate).length;
        const privateRatio = safePercentage(privateCount, events.length);
        if (privateRatio > 60) {
            insights.push({ domain: 'platform', level: 'warning', title: 'High Private Event Ratio', body: `${Math.round(privateRatio)}% of events require approval to join. This limits open community access and may suppress overall platform engagement.` });
            recs.push({ domain: 'platform', text: 'Encourage facilitators to create more open (public) events to maximize community-wide access and reduce participation barriers.' });
        }
        const pubInterested = events.filter(e => !e.isPrivate).reduce((s, e) => s + safeNumber(e.interestedCount), 0);
        const pubCheckIns   = events.filter(e => !e.isPrivate).reduce((s, e) => s + safeNumber(e.checkInCount), 0);
        const qrRate = safePercentage(pubCheckIns, pubInterested);
        if (pubInterested >= 10 && qrRate < 20) {
            insights.push({ domain: 'platform', level: 'info', title: 'Low QR Check-In Adoption', body: `Only ${Math.round(qrRate)}% of interested residents use QR check-in at public events. Actual attendance may be significantly undercounted.` });
            recs.push({ domain: 'platform', text: 'Promote QR check-in at event entrances and educate attendees through the app to improve attendance data accuracy.' });
        }
        const facilEvtCount = events.filter(e => !e.createdByAdmin && e.createdBy).length;
        const facEvtPct     = safePercentage(facilEvtCount, events.length);
        if (facilitators > 0 && facEvtPct < 20) {
            insights.push({ domain: 'platform', level: 'info', title: 'Low Facilitator Event Contribution', body: `Only ${Math.round(facEvtPct)}% of events are facilitator-created. The platform relies heavily on admin-generated content.` });
            recs.push({ domain: 'platform', text: 'Provide facilitators with event templates and submission guidelines to encourage more community-driven event creation.' });
        } else if (facEvtPct >= 40) {
            insights.push({ domain: 'platform', level: 'success', title: 'Strong Facilitator Contribution', body: `${Math.round(facEvtPct)}% of events are facilitator-created — a healthy, community-driven content pipeline that reduces admin workload.` });
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const ratingLabel = avgRating >= 4.0 ? 'positively' : avgRating >= 3.0 ? 'moderately' : avgRating > 0 ? 'below expectations' : 'not yet';
    let summary = `CICRD overview: ${events.length} event${events.length !== 1 ? 's' : ''} across ${categoryCount} categor${categoryCount !== 1 ? 'ies' : 'y'}, ${totalUsers} registered resident${totalUsers !== 1 ? 's' : ''}, and ${totalViews.toLocaleString()} total views.`;
    if (avgRating > 0) summary += ` Community satisfaction is ${ratingLabel} at ${avgRating.toFixed(1)}/5.`;
    summary += flags.length > 0 ? ` ${flags.length} area${flags.length > 1 ? 's require' : ' requires'} attention.` : ' Platform is performing within expected parameters.';

    return {
        role: 'admin',
        summary,
        overallScore,
        topCategory,
        topLocation,
        insights: insights.slice(0, 12),
        flags,
        recommendations: recs.slice(0, 8),
    };
};

// ─── Facilitator scoped summary ───────────────────────────────────────────────

export const generateFacilitatorDecisionSummary = (
    myEvents:     EventType[],
    myFeedback:   EventFeedback[],
    facilitatorId: string
): CrossDomainSummary => {
    const insights: DomainInsight[] = [];
    const flags:    string[]        = [];
    const recs:     { domain: InsightDomain; text: string }[] = [];

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
    const totalFeedback   = myEvents.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);

    const ratedEvts = myEvents.filter(e => safeNumber(e.feedbackCount) > 0 && safeNumber(e.averageRating) > 0);
    const totalFbWt = ratedEvts.reduce((s, e) => s + safeNumber(e.feedbackCount), 0);
    const avgRating = totalFbWt === 0 ? 0 :
        ratedEvts.reduce((s, e) => s + safeNumber(e.averageRating) * safeNumber(e.feedbackCount), 0) / totalFbWt;

    const engRate = safePercentage(totalSaves + totalInterested, totalViews);
    const attRate = safePercentage(totalCheckIns, totalInterested);
    const fbRate  = safePercentage(totalFeedback, totalCheckIns);

    const lowVisCnt     = myEvents.filter(e => safeNumber(e.viewCount) < 10).length;
    const pendingEvts   = myEvents.filter(e => e.status === 'pending');
    const publishedEvts = myEvents.filter(e => e.status === 'published');

    // Scored events for best/worst
    const scored = myEvents
        .map(e => ({ e, m: calculateEventMetrics(e) }))
        .sort((a, b) => b.m.performanceScore - a.m.performanceScore);
    const best  = scored[0]  ?? null;
    const worst = scored[scored.length - 1] ?? null;

    // Category analysis
    const catCounts: Record<string, number> = {};
    myEvents.forEach(e => {
        const cats = Array.isArray(e.category) ? e.category : (e.category ? [e.category] : []);
        cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
    });
    const topCategory = topByCount(catCounts);

    // Score
    const visScore    = myEvents.length === 0 ? 50 : Math.round((1 - lowVisCnt / myEvents.length) * 100);
    const overallScore = Math.round(
        visScore * 0.20 +
        Math.min(engRate * 2, 100) * 0.20 +
        attRate  * 0.35 +
        safePercentage(avgRating, 5) * 0.25
    );

    // ── EVENTS domain ─────────────────────────────────────────────────────────
    if (best && best.m.performanceScore >= 70) {
        insights.push({ domain: 'events', level: 'success', title: 'Your Best Event', body: `"${best.e.name}" is your top-performing event (score ${best.m.performanceScore}/100). This format resonates well — consider scheduling a follow-up edition.` });
        recs.push({ domain: 'events', text: `Plan a follow-up edition of "${best.e.name}" — your community responded positively to this format.` });
    }
    if (worst && worst.m.performanceScore < 40 && myEvents.length > 1) {
        insights.push({ domain: 'events', level: 'warning', title: 'Lowest Performing Event', body: `"${worst.e.name}" scored ${worst.m.performanceScore}/100. Review what limited its engagement — timing, promotion, or format may need adjustment.` });
        recs.push({ domain: 'events', text: `Revisit the "${worst.e.name}" format: check if the venue, schedule, or description discouraged participation.` });
    }
    if (lowVisCnt > 0) {
        const lvl = lowVisCnt > myEvents.length * 0.5 ? 'warning' : 'info';
        insights.push({ domain: 'events', level: lvl, title: 'Low-Visibility Events', body: `${lowVisCnt} of your events have fewer than 10 views. Better titles, descriptions, and requesting highlights from admin can improve reach.` });
        recs.push({ domain: 'events', text: 'Ask the admin to highlight your low-visibility events, and improve your event titles to be more searchable and descriptive.' });
    }
    if (pendingEvts.length > 0) {
        insights.push({ domain: 'events', level: 'info', title: 'Events Awaiting Approval', body: `${pendingEvts.length} of your event${pendingEvts.length > 1 ? 's are' : ' is'} pending admin review. Allow 24–48 hours for processing.` });
    }
    if (publishedEvts.length === 0 && myEvents.length > 0) {
        insights.push({ domain: 'events', level: 'warning', title: 'No Published Events', body: 'None of your events are currently live. Work with the admin to get events approved and visible to residents.' });
    }

    // ── ENGAGEMENT domain ─────────────────────────────────────────────────────
    if (totalViews > 0) {
        if (engRate >= 40) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Strong Resident Interest', body: `${Math.round(engRate)}% of people viewing your events take action (save or mark interest). Your events are compelling and well-presented.` });
        } else if (engRate < 15 && totalViews >= 15) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Low Interest Conversion', body: `Only ${Math.round(engRate)}% of views lead to saves or interest. Stronger descriptions, clearer benefits, and better cover images may improve conversion.` });
            recs.push({ domain: 'engagement', text: 'Rewrite event descriptions to clearly state what attendees will experience and gain — add specific activities and outcomes.' });
        }
    }
    if (totalInterested >= 5) {
        if (attRate >= 60) {
            insights.push({ domain: 'engagement', level: 'success', title: 'Excellent Attendance Rate', body: `${Math.round(attRate)}% of interested residents checked in at your events — well above average. Your scheduling and venue choices are effective.` });
        } else if (attRate < 30) {
            insights.push({ domain: 'engagement', level: 'warning', title: 'Interest-to-Attendance Drop-Off', body: `Only ${Math.round(attRate)}% of residents who showed interest attended. Personal reminders or venue improvements may close this gap.` });
            flags.push(`${Math.round(attRate)}% attendance rate — below the 30% expected threshold.`);
            recs.push({ domain: 'engagement', text: 'Message interested participants personally 24 hours before your event to confirm attendance and share exact location details.' });
        }
    }
    if (totalCheckIns >= 5 && fbRate < 20) {
        insights.push({ domain: 'engagement', level: 'info', title: 'Low Post-Event Feedback', body: `Only ${Math.round(fbRate)}% of attendees leave ratings. Verbally remind attendees to rate your event in the app before they leave.` });
        recs.push({ domain: 'engagement', text: 'At the end of each event, verbally remind attendees to open the app and submit a rating — this significantly boosts feedback response rates.' });
    }
    if (avgRating >= 4.5 && ratedEvts.length >= 2) {
        insights.push({ domain: 'engagement', level: 'success', title: 'Excellent Satisfaction Score', body: `Your events average ${avgRating.toFixed(1)}/5 from residents — you're consistently delivering high-quality community programming.` });
    } else if (avgRating > 0 && avgRating < 3.0) {
        insights.push({ domain: 'engagement', level: 'critical', title: 'Satisfaction Below Expectations', body: `Your events average ${avgRating.toFixed(1)}/5. Read the feedback comments carefully to identify the specific issues residents encountered.` });
        flags.push(`Average satisfaction of ${avgRating.toFixed(1)}/5 requires immediate attention.`);
        recs.push({ domain: 'engagement', text: 'Read each feedback comment from your events and identify the top 3 recurring complaints — directly address these in your next event plan.' });
    }

    // ── CATEGORIES domain ─────────────────────────────────────────────────────
    if (topCategory) {
        const tPct = Math.round(safePercentage(catCounts[topCategory], myEvents.length));
        if (tPct > 70 && myEvents.length >= 3) {
            insights.push({ domain: 'categories', level: 'info', title: `Specializing in "${topCategory}"`, body: `${tPct}% of your events are in the ${topCategory} category. You're building expertise here — consider branching into adjacent categories for broader appeal.` });
            recs.push({ domain: 'categories', text: `Branch out by creating 1–2 events in a new category to attract a wider resident audience beyond your "${topCategory}" base.` });
        }
    }

    // ── PLATFORM domain (facilitator-specific) ────────────────────────────────
    const privateRatio = safePercentage(myEvents.filter(e => e.isPrivate).length, myEvents.length);
    if (privateRatio > 70 && myEvents.length >= 3) {
        insights.push({ domain: 'platform', level: 'info', title: 'Mostly Private Events', body: `${Math.round(privateRatio)}% of your events are private (approval required). Creating more public events can significantly expand your community reach.` });
        recs.push({ domain: 'platform', text: 'Try creating at least one public event to measure community interest without the barrier of an approval process.' });
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const label = overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'moderate' : 'low';
    let summary = `Your ${myEvents.length} event${myEvents.length > 1 ? 's have' : ' has'} generated ${totalViews.toLocaleString()} view${totalViews !== 1 ? 's' : ''} and ${totalCheckIns} check-in${totalCheckIns !== 1 ? 's' : ''}.`;
    if (avgRating > 0) summary += ` Resident satisfaction averages ${avgRating.toFixed(1)}/5.`;
    summary += ` Your overall performance is ${label} (${overallScore}/100).`;
    if (flags.length > 0) summary += ` ${flags.length} area${flags.length > 1 ? 's need' : ' needs'} attention.`;

    return {
        role: 'facilitator',
        summary,
        overallScore,
        topCategory,
        topLocation: null,
        insights: insights.slice(0, 10),
        flags,
        recommendations: recs.slice(0, 6),
    };
};
