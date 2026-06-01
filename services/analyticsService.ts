
import { doc, increment, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

// ─── Utility helpers ────────────────────────────────────────────────────────

/** Converts any value to a finite number, returning 0 for null/undefined/NaN. */
export const safeNumber = (value: unknown): number => {
    const n = Number(value);
    return isFinite(n) ? n : 0;
};

/** Prevents a counter display from rendering negative. Use at read/display time. */
export const clampToZero = (value: number): number => Math.max(0, value);

/**
 * Calculates the new running average when one NEW rating is added.
 *   newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)
 */
export const calculateNewAverageRating = (
    previousAverage: number,
    previousCount: number,
    newRating: number
): number => {
    const oldAvg = safeNumber(previousAverage);
    const oldCount = safeNumber(previousCount);
    const rating = safeNumber(newRating);
    const newCount = oldCount + 1;
    return (oldAvg * oldCount + rating) / newCount;
};

// ─── Counter updates ─────────────────────────────────────────────────────────

/**
 * Atomically increments or decrements a single engagement counter on an event
 * document.  Uses Firestore's server-side increment() so concurrent writes
 * never race.  Failures are swallowed — analytics must never crash the app.
 *
 * @param eventId  Firestore event document ID
 * @param field    The counter field to update
 * @param amount   +1 to increment, -1 to decrement
 */
export const incrementEventCounter = async (
    eventId: string,
    field: 'viewCount' | 'saveCount' | 'likeCount' | 'interestedCount' | 'checkInCount',
    amount: 1 | -1 = 1
): Promise<void> => {
    try {
        const eventDocRef = doc(db, 'events', eventId);
        await updateDoc(eventDocRef, {
            [field]: increment(amount)
        });
    } catch (error) {
        console.warn(`[analytics] Failed to update ${field} on event ${eventId}:`, error);
    }
};

/**
 * Atomically updates feedbackCount and recalculates averageRating on an event
 * document inside a transaction.  Call this only once per new feedback
 * submission — the EventFeedbackModal already guards against duplicates.
 *
 * @param eventId    Firestore event document ID
 * @param newRating  The rating value (1–5) just submitted
 */
export const updateEventFeedbackStats = async (
    eventId: string,
    newRating: number
): Promise<void> => {
    try {
        const eventDocRef = doc(db, 'events', eventId);

        await runTransaction(db, async (tx) => {
            const snap = await tx.get(eventDocRef);
            const data = snap.exists() ? snap.data() : {};

            const currentCount = safeNumber(data?.feedbackCount);
            const currentAvg   = safeNumber(data?.averageRating);
            const newCount      = currentCount + 1;
            const newAvg        = calculateNewAverageRating(currentAvg, currentCount, newRating);

            tx.update(eventDocRef, {
                feedbackCount: newCount,
                // Round to one decimal place for clean display
                averageRating: Math.round(newAvg * 10) / 10,
            });
        });
    } catch (error) {
        console.warn(`[analytics] Failed to update feedback stats on event ${eventId}:`, error);
    }
};
