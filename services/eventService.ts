
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
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
        // Default status is 'published' only if createdByAdmin is true AND no status is provided.
        // If it's a user request, status will be 'pending' as passed from component.
        const finalData = {
            ...cleanedData,
            // Force 'pending' for non-admin submissions, unless it's a draft
            status: cleanedData.status === 'draft' ? 'draft' : (cleanedData.createdByAdmin ? (cleanedData.status || 'published') : 'pending'),
            submittedAt: Date.now() // Add creation timestamp
        };
        
        // Handle recurrence
        if (recurrenceDates && recurrenceDates.length > 1) {
            const batch = writeBatch(db);
            const groupId = crypto.randomUUID();
            
            // Create first event
            const mainDocRef = doc(collection(db, 'events'));
            const mainEvent = { ...finalData, id: mainDocRef.id, recurrenceGroupId: groupId, isRecurrent: true };
            batch.set(mainDocRef, sanitizeData(mainEvent));

            // Create future instances
            recurrenceDates.slice(1).forEach(dateStr => {
                const instanceRef = doc(collection(db, 'events'));
                const instanceData = { 
                  ...finalData, 
                  id: instanceRef.id, 
                  date: dateStr, 
                  recurrenceGroupId: groupId,
                  isRecurrent: true 
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

export const updateEventStatus = async (eventId: string, status: EventStatus, rejectionReason?: string, publishAt?: number | null): Promise<void> => {
    try {
        const eventDocRef = doc(db, 'events', eventId);
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
        await updateDoc(eventDocRef, updateData);
    } catch (error) {
        console.error("Error updating event status:", error);
        throw error;
    }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
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
      where("recurrenceGroupId", "==", groupId),
      where("date", ">=", afterDate)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
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
    try {
        const sanitizedData = sanitizeData(registrationData);
        
        // Prevent duplicate registrations
        const q = query(registrationsCollectionRef, where("eventId", "==", sanitizedData.eventId), where("userId", "==", sanitizedData.userId));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error("You have already registered for this event.");
        }
        
        const submittedAt = Date.now();
        const docRef = await addDoc(registrationsCollectionRef, {
            ...sanitizedData,
            submittedAt
        });
        return {
            id: docRef.id,
            ...sanitizedData,
            submittedAt
        } as Registration;
    } catch (error) {
        console.error("Error submitting registration:", error);
        throw error;
    }
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

import { onSnapshot } from 'firebase/firestore';

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
    try {
        const regDocRef = doc(db, 'registrations', registrationId);
        await updateDoc(regDocRef, { status });
    } catch (error) {
        console.error("Error updating registration status:", error);
        throw error;
    }
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

export const getHighlights = async (): Promise<string[]> => {
    // 1. Always check localStorage first (instant, always available)
    try {
        const local = localStorage.getItem(HIGHLIGHTS_KEY);
        if (local) {
            const parsed = JSON.parse(local) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) { /* ignore */ }

    // 2. Fallback: try Firestore (may be blocked by security rules)
    try {
        const snap = await getDoc(highlightsDocRef());
        if (snap.exists()) {
            const ids = (snap.data().eventIds as string[]) || [];
            // Sync back to localStorage for future fast reads
            if (ids.length > 0) {
                try { localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
            }
            return ids;
        }
    } catch (e) {
        console.warn('Firestore highlights read failed (may be rules-blocked), using localStorage only:', e);
    }

    return [];
};

export const setHighlights = async (eventIds: string[]): Promise<void> => {
    const ids = eventIds.slice(0, 5);

    // 1. Save to localStorage immediately — always succeeds
    try {
        localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(ids));
    } catch (e) {
        console.error('Failed to save highlights to localStorage:', e);
        throw new Error('Could not save highlights locally.');
    }

    // 2. Attempt Firestore sync in background (don't block or throw)
    setDoc(highlightsDocRef(), { eventIds: ids }, { merge: true })
        .catch(e => console.warn('Firestore highlights sync failed (non-critical):', e));
};

