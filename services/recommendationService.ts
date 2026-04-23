
import type { User, EventType, DisplayEventType } from '../types';
import { CATEGORIES } from '../constants';

// --- CONFIGURATION: THE "SECRET SAUCE" ---
// These weights determine the "personality" of the algorithm.
// TikTok style prioritizes interest match, but heavily factors in "Now" and "Near".
const WEIGHTS = {
    CATEGORY_MATCH: 0.45, // 45% - Do I like this topic?
    DISTANCE: 0.25,       // 25% - Is it close enough to go?
    RECENCY: 0.20,        // 20% - Is it happening soon?
    EXPLORATION: 0.10     // 10% - Random noise (Serendipity/Discovery)
};

/**
 * 1. DYNAMIC INTEREST GRAPH
 * Instead of simple tags, we build a weighted vector of user interests.
 * - Explicit Preference: +10 points
 * - Implicit Save: +20 points (High intent)
 * - Implicit View/Tap: +5 points (Medium intent)
 * 
 * This solves the "Cold Start" problem while allowing behavior to override stated preferences.
 */
const getUserCategoryAffinities = (user: User, allEvents: EventType[]): Record<string, number> => {
    const affinity: Record<string, number> = {};
    
    // Initialize all categories to 0
    CATEGORIES.forEach(cat => affinity[cat] = 0);

    // A. Explicit Preferences (Weak Signal)
    if (user.preferences) {
        user.preferences.forEach(cat => {
            affinity[cat] += 10; 
        });
    }

    // B. Implicit Actions (Saves - Strong Signal)
    // If a user saves a "Gaming" event, they want more Gaming.
    if (user.savedEventIds && user.savedEventIds.length > 0) {
        user.savedEventIds.forEach(savedId => {
            const event = allEvents.find(e => e.id === savedId);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    if (affinity[cat] !== undefined) affinity[cat] += 20;
                });
            }
        });
    }

    // B2. Implicit Actions (Likes/Heart - Strong Signal)
    if (user.likedEventIds && user.likedEventIds.length > 0) {
        user.likedEventIds.forEach(id => {
            const event = allEvents.find(e => e.id === id);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    if (affinity[cat] !== undefined) affinity[cat] += 20;
                });
            }
        });
    }

    // C. Implicit Actions (Views/Taps - Medium Signal)
    // If a user clicks to view details, they are interested.
    if (user.viewedEventIds && user.viewedEventIds.length > 0) {
        user.viewedEventIds.forEach(viewedId => {
            const event = allEvents.find(e => e.id === viewedId);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    if (affinity[cat] !== undefined) affinity[cat] += 5;
                });
            }
        });
    }

    // D. Implicit Actions (Interested/RSVP - Strong Signal)
    if (user.interestedEventIds && user.interestedEventIds.length > 0) {
        user.interestedEventIds.forEach(id => {
            const event = allEvents.find(e => e.id === id);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    if (affinity[cat] !== undefined) affinity[cat] += 20;
                });
            }
        });
    }

    // E. Implicit Actions (Checked In/Participated - Maximum Signal)
    // If a user actually attended an event, this is the strongest indicator of interest.
    if (user.checkedInEventIds && user.checkedInEventIds.length > 0) {
        user.checkedInEventIds.forEach(id => {
            const event = allEvents.find(e => e.id === id);
            if (event && event.category) {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                categories.forEach(cat => {
                    if (affinity[cat] !== undefined) affinity[cat] += 40;
                });
            }
        });
    }

    // F. Normalization
    // Squash values between 0 and 1 so they play nice with other metrics.
    const maxScore = Math.max(...Object.values(affinity), 1); 
    Object.keys(affinity).forEach(cat => {
        affinity[cat] = affinity[cat] / maxScore;
    });

    return affinity;
};

/**
 * 2. HYPER-LOCAL DECAY (Inverse Distance)
 * Events happening 500m away are exponentially more relevant than events 5km away.
 * Formula: 1 / (1 + distance_in_km)
 * - 0km = 1.0 score
 * - 2km = 0.33 score
 * - 10km = 0.09 score
 */
const getDistanceScore = (distanceMeters: number): number => {
    const distKm = distanceMeters / 1000;
    // We multiply distKm by 0.5 to make the decay slightly less aggressive for a city scale
    return 1 / (1 + (distKm * 0.5)); 
};

/**
 * 3. FRESHNESS FACTOR (Time Decay)
 * TikTok relies on "Now". Old content dies. Future content is okay, but "Live" is king.
 */
const getTimeScore = (dateStr: string, startTime: string, isLive: boolean): number => {
    // Immediate Priority: If it's happening right now, max score.
    if (isLive) return 1.0; 

    // Handle AM/PM format if present by normalizing to a simple Date object
    let eventDate: Date;
    try {
        // Try to parse the date and time. StartTime might be "HH:mm" or "h:mm AM"
        // We'll try to build a string that Date can understand.
        const datePart = dateStr.includes('T') ? dateStr : `${dateStr}T${startTime}`;
        eventDate = new Date(datePart);
        
        // If it's still invalid (e.g. AM/PM caused failure), fallback to just the date
        if (isNaN(eventDate.getTime())) {
            eventDate = new Date(dateStr);
        }
    } catch (e) {
        eventDate = new Date(dateStr);
    }
    
    const now = new Date();
    
    // Calculate difference in days
    const diffTime = eventDate.getTime() - now.getTime();
    if (isNaN(diffTime)) return 0; // Final safeguard
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Filter out past events immediately (sanity check, though UI likely filters them too)
    if (diffDays < 0) return 0; 

    // Linear Decay Horizon: 30 Days.
    // Event tomorrow (1 day) = 0.96 score
    // Event in 2 weeks (14 days) = 0.53 score
    // Event in a month (30 days) = 0.0 score
    const horizon = 30; 
    const score = Math.max(0, (horizon - diffDays) / horizon);
    
    return score;
};

/**
 * MAIN ALGORITHM: K-Nearest Neighbors (Conceptually)
 * 
 * We treat the User and the Events as points in a multi-dimensional space.
 * We calculate the "distance" (similarity) between the User's Ideal Event and the Actual Event.
 */
export const getKNNRankedEvents = (
    user: User, 
    events: DisplayEventType[],
    userLocation: { lat: number; lng: number }
): DisplayEventType[] => {
    
    // Step 1: Build User Profile Vector
    const categoryAffinity = getUserCategoryAffinities(user, events);

    const scoredEvents = events.map(event => {
        // --- COMPONENT 1: INTEREST (Collaborative/Content Filtering) ---
        const categories = Array.isArray(event.category) ? event.category : [event.category];
        // Take the maximum affinity score among all categories the event belongs to
        const interestScore = Math.max(...categories.map(cat => categoryAffinity[cat] || 0), 0);

        // --- COMPONENT 2: GEOSPATIAL (Context Awareness) ---
        // Distance is usually pre-calculated in App.tsx, but we safeguard here.
        const distanceScore = getDistanceScore(event.distance || 0);

        // --- COMPONENT 3: TEMPORAL (Trending/Freshness) ---
        const timeScore = getTimeScore(event.date, event.startTime, event.isLive);

        // --- COMPONENT 4: SERENDIPITY (The "Discovery" Engine) ---
        // We use a deterministic pseudo-random value based on the event ID 
        // to ensure the noise stays consistent for the same event until a fresh session.
        const hashId = (id: string) => {
            let hash = 0;
            for (let i = 0; i < id.length; i++) {
                hash = ((hash << 5) - hash) + id.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash % 1000) / 1000;
        };
        const noise = hashId(event.id); 

        // --- FINAL WEIGHTED SUM ---
        const finalScore = 
            (interestScore * WEIGHTS.CATEGORY_MATCH) +
            (distanceScore * WEIGHTS.DISTANCE) +
            (timeScore * WEIGHTS.RECENCY) +
            (noise * WEIGHTS.EXPLORATION);

        return {
            ...event,
            relevanceScore: finalScore
        };
    });

    // Sort by Score Descending (Highest relevance first)
    return scoredEvents.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};
