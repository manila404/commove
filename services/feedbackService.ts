
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { EventFeedback } from '../types';

const feedbackCollectionRef = collection(db, 'eventFeedback');

export const submitFeedback = async (feedbackData: Omit<EventFeedback, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(feedbackCollectionRef, {
            ...feedbackData,
            createdAt: Date.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error submitting feedback:", error);
        throw error;
    }
};

export const fetchEventFeedback = async (eventId: string): Promise<EventFeedback[]> => {
    try {
        const q = query(feedbackCollectionRef, where("eventId", "==", eventId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EventFeedback));
    } catch (error) {
        console.error("Error fetching event feedback:", error);
        return [];
    }
};

export const fetchUserFeedbackForEvent = async (userId: string, eventId: string): Promise<EventFeedback | null> => {
    try {
        const q = query(feedbackCollectionRef, where("userId", "==", userId), where("eventId", "==", eventId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as EventFeedback;
    } catch (error) {
        console.error("Error fetching user feedback:", error);
        return null;
    }
};

export const fetchAllFeedback = async (): Promise<EventFeedback[]> => {
    try {
        const snapshot = await getDocs(feedbackCollectionRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EventFeedback));
    } catch (error) {
        console.error("Error fetching all feedback:", error);
        return [];
    }
};
