
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, getDoc, writeBatch, increment, runTransaction, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { EventType, EventStatus, Registration, RegistrationStatus } from '../types';

const eventsCollectionRef = collection(db, 'events');
const registrationsCollectionRef = collection(db, 'registrations');

// Helper to remove undefined values because Firestore does not support them
const sanitizeData = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            cleaned[key] = data[key];
        } else {
            cleaned[key] = null; // Convert undefined to null
        }
    });
    return cleaned;
};

export type DeleteEventMode = 'single' | 'following' | 'series';

export interface DeleteEventOptions {
  mode?: DeleteEventMode;
  recurrenceGroupId?: string;
  fromDate?: string;
}

export const fetchEvents = async (): Promise<EventType[]> => {
  try {
    const data = await getDocs(eventsCollectionRef);
    const events = data.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as EventType[];
    return events;
  } catch (error) {
    throw error;
  }
};

export const subscribeToEvents = (
    callback: (events: EventType[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    return onSnapshot(
        eventsCollectionRef,
        snapshot => callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EventType))),
        error => { console.error('Events listener error:', error); onError?.(error); }
    );
};

export const fetchUserRequests = async (userId: string): Promise<EventType[]> => {
    try {
        const q = query(eventsCollectionRef, where("createdBy", "==", userId));
        const data = await getDocs(q);
        return data.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as EventType[];
    } catch (error) {
        console.error("Error fetching user requests:", error);
        return [];
    }
}

export const addEvent = async (eventData: Omit<EventType, 'id'>, recurrenceDates?: string[]): Promise<EventType> => {
    try {
        const cleanedData = sanitizeData(eventData);
        const normalizedStatus =
            cleanedData.status ||
            (cleanedData.createdByAdmin ? 'published' : 'pending');

        const finalData = {
            ...cleanedData,
            // Preserve the caller-selected workflow status instead of forcing
            // recurring facilitator events back to pending.
            status: normalizedStatus,
            submittedAt: Date.now(),
            // Ensure approvedCount starts at 0 for private events so slot math
            // is correct from the first approval without relying on Firestore
            // increment-from-undefined behavior.
            ...(cleanedData.isPrivate ? { approvedCount: cleanedData.approvedCount ?? 0 } : {}),
        };
        
        // Handle recurrence
        if (recurrenceDates && recurrenceDates.length > 1) {
            const batch = writeBatch(db);
            const groupId = crypto.randomUUID();
            const recurrenceRule = finalData.recurrenceRule
                ? {
                    ...finalData.recurrenceRule,
                    originalDate: finalData.recurrenceRule.originalDate || finalData.date,
                  }
                : null;
            
            // Create first event
            const mainDocRef = doc(collection(db, 'events'));
            const mainEvent = {
                ...finalData,
                id: mainDocRef.id,
                recurrenceGroupId: groupId,
                seriesId: groupId,
                isRecurrent: true,
                ...(recurrenceRule ? { recurrenceRule } : {}),
            };
            batch.set(mainDocRef, sanitizeData(mainEvent));

            // Create future instances
            const origStart = new Date(finalData.date + 'T00:00:00');
            const origEnd = finalData.endDate ? new Date(finalData.endDate + 'T00:00:00') : null;
            const durationMs = origEnd ? origEnd.getTime() - origStart.getTime() : 0;

            recurrenceDates.slice(1).forEach(dateStr => {
                const instanceRef = doc(collection(db, 'events'));
                const instanceStart = new Date(dateStr + 'T00:00:00');
                const instanceEndDate = durationMs > 0
                    ? new Date(instanceStart.getTime() + durationMs).toISOString().slice(0, 10)
                    : null;
                const instanceData = {
                  ...finalData,
                  id: instanceRef.id,
                  date: dateStr,
                  ...(instanceEndDate ? { endDate: instanceEndDate } : {}),
                  recurrenceGroupId: groupId,
                  seriesId: groupId,
                  isRecurrent: true,
                  ...(recurrenceRule ? { recurrenceRule } : {}),
                };
                batch.set(instanceRef, sanitizeData(instanceData));
            });

            await batch.commit();
            return mainEvent as EventType;
        }

        const docRef = await addDoc(eventsCollectionRef, finalData);
        const newEvent: EventType = {
            id: docRef.id,
            ...finalData
        };
        return newEvent;
    } catch (error) {
        console.error("Error adding event to Firestore:", error);
        throw new Error("Could not create event.");
    }
};

export const updateEvent = async (eventId: string, eventData: Partial<EventType>): Promise<void> => {
    try {
        const cleanedData = sanitizeData(eventData);
        
        // Fail-safe: If a facilitator is updating, ensure it goes back to pending/draft
        if (cleanedData.status && !cleanedData.createdByAdmin) {
            if (cleanedData.status !== 'draft') {
                cleanedData.status = 'pending';
            }
        }
        
        const eventDocRef = doc(db, 'events', eventId);
        await updateDoc(eventDocRef, cleanedData);
    } catch (error) {
        console.error("Error updating event in Firestore:", error);
        throw new Error("Could not update event.");
    }
};

export const updateEventStatus = async (eventId: string, status: EventStatus, rejectionReason?: string, publishAt?: number | null, recurrenceGroupId?: string): Promise<void> => {
    try {
        const updateData: any = { status };
        if (status === 'rejected') {
            updateData.rejectionReason = rejectionReason || 'No reason provided';
        }
        if (status === 'published' || status === 'pending' || status === 'scheduled') {
            updateData.rejectionReason = null; // Clear reason
        }
        if (publishAt !== undefined) {
            updateData.publishAt = publishAt;
        }

        // Batch-update all events in the recurrence group
        if (recurrenceGroupId) {
            const q = query(eventsCollectionRef, where("recurrenceGroupId", "==", recurrenceGroupId));
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.docs.forEach(d => {
                batch.update(d.ref, updateData);
            });
            await batch.commit();
        } else {
            const eventDocRef = doc(db, 'events', eventId);
            await updateDoc(eventDocRef, updateData);
        }
    } catch (error) {
        console.error("Error updating event status:", error);
        throw error;
    }
};

export const deleteEvent = async (eventId: string, options?: DeleteEventOptions): Promise<void> => {
  try {
    if (options?.mode === 'series' && options.recurrenceGroupId) {
      const q = query(
        eventsCollectionRef,
        where("recurrenceGroupId", "==", options.recurrenceGroupId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      return;
    }

    if (options?.mode === 'following' && options.recurrenceGroupId && options.fromDate) {
      await deleteEventSeries(options.recurrenceGroupId, options.fromDate);
      return;
    }

    const eventDocRef = doc(db, 'events', eventId);
    await deleteDoc(eventDocRef);
  } catch (error) {
    console.error("Error deleting event from Firestore:", error);
    throw error;
  }
};

export const deleteEventSeries = async (groupId: string, afterDate: string): Promise<void> => {
  try {
    const q = query(
      eventsCollectionRef,
      where("recurrenceGroupId", "==", groupId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      const data = d.data() as EventType;
      if (data.date >= afterDate) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (error) {
    console.error("Error deleting event series:", error);
    throw error;
  }
};

/**
 * Updates all future events in a series
 */
export const updateEventSeries = async (groupId: string, fromDate: string, updatedData: Partial<EventType>): Promise<void> => {
  try {
    const q = query(
      eventsCollectionRef, 
      where("recurrenceGroupId", "==", groupId),
      where("date", ">=", fromDate)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    
    // We omit ID and date from the batch update as they must remain unique/correct per doc
    const { id, date, ...pureUpdate } = updatedData as any;
    const sanitizedUpdate = sanitizeData(pureUpdate);

    snap.docs.forEach(d => {
      batch.update(d.ref, sanitizedUpdate);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error updating event series:", error);
    throw error;
  }
};

export const submitRegistration = async (registrationData: Omit<Registration, 'id' | 'submittedAt'>): Promise<Registration> => {
    const firebaseUid = auth.currentUser?.uid;
    if (!firebaseUid) {
        throw new Error('You must be logged in to register for events.');
    }

    const sanitizedData = sanitizeData({ ...registrationData, userId: firebaseUid });
    const submittedAt = Date.now();

    // Deterministic doc ID: one registration per resident per event, forever.
    // Using setDoc instead of addDoc means the same user can never accidentally
    // create two registration documents for the same event.
    const registrationId = `${sanitizedData.eventId}_${firebaseUid}`;
    const registrationDocRef = doc(db, 'registrations', registrationId);

    // Step 1 — idempotent create (critical)
    try {
        const existing = await getDoc(registrationDocRef);
        if (existing.exists()) {
            // Already registered — return the existing record so the caller can
            // update the UI without creating a duplicate document.
            return { id: existing.id, ...existing.data() } as Registration;
        }
        await setDoc(registrationDocRef, { ...sanitizedData, submittedAt });
    } catch (error) {
        console.error('Error submitting registration:', error);
        throw error;
    }

    // Step 2 — cache status on user doc for instant UI updates (best-effort).
    // IMPORTANT: data must use a nested object, NOT a dotted string key.
    // setDoc does not interpret dotted keys as field paths (only updateDoc does);
    // using a dotted key causes a "field in mask but missing from data" SDK error.
    try {
        const userDocRef = doc(db, 'users', firebaseUid);
        await setDoc(userDocRef, {
            registrationStatuses: {
                [sanitizedData.eventId]: {
                    status: 'pending',
                    registrationId,
                },
            }
        }, { mergeFields: [`registrationStatuses.${sanitizedData.eventId}`] });
    } catch {
        // Best-effort cache update — registration is already committed above.
    }

    return { id: registrationId, ...sanitizedData, submittedAt } as Registration;
};

export const fetchRegistrationsForEvent = async (eventId: string): Promise<Registration[]> => {
    try {
        const q = query(registrationsCollectionRef, where("eventId", "==", eventId));
        const data = await getDocs(q);
        return data.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as Registration[];
    } catch (error: any) {
        console.error("Error fetching registrations for event:", eventId, error);
        return [];
    }
};

export const subscribeToEventDoc = (eventId: string, callback: (event: EventType | null) => void) => {
    const eventDocRef = doc(db, 'events', eventId);
    return onSnapshot(eventDocRef, (snap) => {
        if (snap.exists()) {
            callback({ ...snap.data(), id: snap.id } as EventType);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error subscribing to event doc:', error);
        callback(null);
    });
};

// Subscribe to the resident's own registration document using the deterministic ID
// `${eventId}_${userId}`. Fires immediately with null when the doc doesn't exist,
// and fires again with Registration data once the resident submits (or the facilitator
// approves/rejects). This is the primary real-time source for EventModal's userReg state.
export const subscribeToRegistrationDoc = (
    eventId: string,
    userId: string,
    callback: (reg: Registration | null) => void
) => {
    const registrationRef = doc(db, 'registrations', `${eventId}_${userId}`);
    return onSnapshot(registrationRef, (snap) => {
        if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() } as Registration);
        } else {
            callback(null);
        }
    }, (error) => {
        console.warn('subscribeToRegistrationDoc error:', error);
        callback(null);
    });
};

/** Staff-only: recalculates approvedCount and writes it to the event document.
 *  Call this from ManageRegistrations on load to fix old events that pre-date
 *  the approvedCount field. */
export const syncEventApprovedCount = async (eventId: string, registrations: Registration[]): Promise<void> => {
    try {
        const count = registrations.filter(r => r.status === 'approved').length;
        await updateDoc(doc(db, 'events', eventId), { approvedCount: count });
    } catch (error) {
        console.error('Error syncing approvedCount:', error);
    }
};

export const subscribeToEventRegistrations = (eventId: string, callback: (regs: Registration[]) => void) => {
    const q = query(registrationsCollectionRef, where("eventId", "==", eventId));
    return onSnapshot(q, (snapshot) => {
        const regs = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as Registration[];
        callback(regs);
    }, (error) => {
        console.error("Error subscribing to event registrations:", error);
        callback([]);
    });
};

export const updateRegistrationStatus = async (registrationId: string, status: RegistrationStatus): Promise<void> => {
    const regDocRef = doc(db, 'registrations', registrationId);
    let cachedEventId = '';
    let cachedUserId = '';

    try {
        await runTransaction(db, async (transaction) => {
            const regDoc = await transaction.get(regDocRef);
            if (!regDoc.exists()) throw new Error("Registration does not exist!");

            const data = regDoc.data() as Registration;
            if (data.status === status) return;

            cachedEventId = data.eventId;
            cachedUserId = data.userId;

            transaction.update(regDocRef, { status });

            if (status === 'approved' || data.status === 'approved') {
                const eventDocRef = doc(db, 'events', data.eventId);
                transaction.update(eventDocRef, { approvedCount: increment(status === 'approved' ? 1 : -1) });
            }
            // User-doc cache is updated OUTSIDE the transaction (see below) to avoid the
            // "allow create: isOwner" block when the resident's user doc doesn't yet exist.
        });
    } catch (error) {
        console.error("Error updating registration status:", error);
        throw error;
    }

    // Best-effort: mirror the new status on the resident's user doc so
    // subscribeToUserProfile reflects it immediately. updateDoc is used (not
    // setDoc+mergeFields) because we only write when the doc already exists —
    // creation is the resident's own responsibility. updateDoc with a dotted-key
    // correctly targets the nested registrationStatuses.<eventId> field path.
    if (cachedEventId && cachedUserId) {
        try {
            const userDocRef = doc(db, 'users', cachedUserId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                await updateDoc(userDocRef, {
                    [`registrationStatuses.${cachedEventId}`]: { status, registrationId },
                });
            }
        } catch {
            // Non-critical — EventModal's onSnapshot subscription to the registration
            // doc provides real-time status updates even if this cache write fails.
        }
    }
};

export const subscribeToUserEventRegistration = (eventId: string, userId: string, callback: (reg: Registration | null) => void) => {
    // Query only by userId — this uses the default single-field index and satisfies
    // the Firestore rule (resource.data.userId == request.auth.uid).
    // We then filter by eventId client-side to find the correct registration.
    const q = query(
        registrationsCollectionRef, 
        where("userId", "==", userId)
    );
    return onSnapshot(q, (snapshot) => {
        const match = snapshot.docs.find(d => d.data().eventId === eventId);
        if (!match) {
            callback(null);
            return;
        }
        callback({ ...match.data(), id: match.id } as Registration);
    }, (error) => {
        console.error("Error subscribing to user registration:", error);
        callback(null);
    });
};


export const fetchUserRegistrations = async (userId: string): Promise<Registration[]> => {
    try {
        const q = query(registrationsCollectionRef, where("userId", "==", userId));
        const data = await getDocs(q);
        return data.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })) as Registration[];
    } catch (error: any) {
        console.error("Error fetching user registrations for user:", userId, error);
        return [];
    }
};

// ── Highlights (admin curated events shown at top of feed) ────────────────────

const HIGHLIGHTS_KEY = 'admin_highlights';
const highlightsDocRef = () => doc(db, 'config', 'highlights');

const getLocalHighlights = (): string[] => {
    try {
        const local = localStorage.getItem(HIGHLIGHTS_KEY);
        if (local) {
            const parsed = JSON.parse(local) as string[];
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { /* ignore */ }
    return [];
};

export const getHighlights = async (): Promise<string[]> => {
    try {
        const snap = await getDoc(highlightsDocRef());
        if (snap.exists()) {
            const ids = (snap.data().eventIds as string[]) || [];
            try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
            return ids;
        }
    } catch (e) {
        console.warn('Firestore highlights read failed, using localStorage:', e);
    }
    return getLocalHighlights();
};

// Real-time listener — localStorage immediately + same-tab custom event + Firestore
export const subscribeToHighlights = (callback: (ids: string[]) => void): (() => void) => {
    // Fire localStorage value immediately so feed is never blank on load
    const local = getLocalHighlights();
    if (local.length > 0) callback(local);

    // Same-tab instant update when admin saves (custom event from setHighlights)
    const onCustomEvent = (e: Event) => {
        const ids = (e as CustomEvent<string[]>).detail;
        if (Array.isArray(ids)) callback(ids);
    };
    window.addEventListener('highlights-updated', onCustomEvent);

    // Firestore listener for cross-device updates
    const unsub = onSnapshot(
        highlightsDocRef(),
        snap => {
            const ids = snap.exists() ? (snap.data().eventIds as string[]) || [] : [];
            if (ids.length > 0 || local.length === 0) {
                try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
                callback(ids);
            }
        },
        err => console.warn('Highlights Firestore listener error:', err)
    );

    return () => {
        window.removeEventListener('highlights-updated', onCustomEvent);
        unsub();
    };
};

export const setHighlights = async (eventIds: string[]): Promise<void> => {
    // 1. Save to localStorage immediately — always works
    try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(eventIds)); } catch { /* ignore */ }

    // 2. Notify same-tab listeners immediately (doesn't wait for Firestore)
    try { window.dispatchEvent(new CustomEvent('highlights-updated', { detail: eventIds })); } catch { /* ignore */ }

    // 3. Sync to Firestore for cross-device updates (non-blocking)
    setDoc(highlightsDocRef(), { eventIds }, { merge: true })
        .catch(e => console.warn('Firestore highlights sync failed (highlights saved locally):', e));
};

