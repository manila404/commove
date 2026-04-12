import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AppNotification, NotificationType } from '../types';

const COLLECTION = 'notifications';
const notificationsRef = collection(db, COLLECTION);

// ─────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────

/**
 * Write a new notification document to Firestore.
 * Returns the created notification (with its generated Firestore id).
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    eventId?: string
): Promise<AppNotification> => {
    const data: Omit<AppNotification, 'id'> = {
        userId,
        type,
        title,
        body,
        eventId: eventId ?? null as any,
        isRead: false,
        createdAt: Date.now(),
    };

    try {
        const docRef = await addDoc(notificationsRef, data);
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────────
// Read (one-time fetch)
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch all notifications for a user, newest first.
 */
export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
    try {
        const q = query(
            notificationsRef,
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
        // Client-side sort: newest first
        return notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error: any) {
        if (error.code === 'permission-denied') return [];
        console.error('Error fetching notifications:', error);
        return [];
    }
};

// ─────────────────────────────────────────────────────────────────
// Read (real-time listener)
// ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to live updates of all notifications for a user.
 * Returns an unsubscribe function – call it on component unmount.
 *
 * Usage:
 *   const unsub = subscribeToNotifications(uid, (notifs) => setNotifications(notifs));
 *   return () => unsub();
 */
export const subscribeToNotifications = (
    userId: string,
    callback: (notifications: AppNotification[]) => void
): Unsubscribe => {
    // We remove the server-side orderBy to avoid the need for a composite index immediately.
    // Index creation can take minutes and causes the query to fail (returning [] in my error handler) until ready.
    const q = query(
        notificationsRef,
        where('userId', '==', userId)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
            // Sort client-side: Newest first
            const sortedNotifs = notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            callback(sortedNotifs);
        },
        (error) => {
            console.error('Notification listener error:', error);
            // Don't call callback([]) here to avoid wiping the UI if it's just a temporary glitch
        }
    );
};

// ─────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, notificationId);
        await updateDoc(docRef, { isRead: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

/**
 * Mark ALL of a user's notifications as read in one batch.
 */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
    try {
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { isRead: true }));
        await batch.commit();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
};

// ─────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────

/**
 * Delete a single notification by its Firestore document id.
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION, notificationId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

/**
 * Delete ALL notifications for a user (e.g. "Clear all").
 */
export const deleteAllNotifications = async (userId: string): Promise<void> => {
    try {
        const q = query(notificationsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        throw error;
    }
};
