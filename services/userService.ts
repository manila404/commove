
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayUnion, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { updateProfile } from 'firebase/auth';
import type { User, Reminder, UserRole } from '../types';
import { createNotification } from './notificationService';

const usersCollectionRef = 'users';

// Helper to remove undefined values because Firestore does not support them
const sanitizeUserData = (data: any) => {
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

export const isUsernameUnique = async (username: string): Promise<boolean> => {
    if (!username) return true;
    try {
        const usersRef = collection(db, usersCollectionRef);
        const q = query(usersRef, where("username", "==", username), limit(1));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    } catch (error) {
        console.error("Error checking username uniqueness:", error);
        return true; // Default to true to not block if there's a permission error reading all usernames
    }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.email === 'admin@commove.com') {
                return { uid: userDoc.id, ...userData, role: 'admin' as UserRole, isAdmin: true } as User;
            }
            return { uid: userDoc.id, ...userData } as User;
        }
        return null;
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
            return null;
        }
        console.error("Error fetching user profile:", error);
        return null;
    }
};

/** Real-time subscription to the current user's Firestore document.
 *  Keeps currentUser in App.tsx in sync whenever any field changes
 *  (including registrationStatuses written by submitRegistration / updateRegistrationStatus). */
export const subscribeToUserProfile = (uid: string, callback: (user: User | null) => void) => {
    const userDocRef = doc(db, usersCollectionRef, uid);
    return onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data() as User;
            if (data.email === 'admin@commove.com') {
                callback({ uid: snap.id, ...data, role: 'admin' as UserRole, isAdmin: true });
            } else {
                callback({ uid: snap.id, ...data });
            }
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error subscribing to user profile:', error);
    });
};

export const createUserProfile = async (uid: string, data: Omit<User, 'uid'>): Promise<void> => {
    try {
        const role: UserRole = data.email === 'admin@commove.com' ? 'admin' : (data.email === 'facilitator@commove.com' ? 'facilitator' : 'user');

        const dataWithRole = {
            ...data,
            role: data.role || role,
            isAdmin: (data.role || role) === 'admin', 
            viewedEventIds: []
        };

        const cleanedData = sanitizeUserData(dataWithRole);
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, cleanedData, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
            console.debug("Profile creation blocked by security rules. Proceeding locally.");
            return; 
        }
        console.error("Error creating user profile:", error);
        throw error;
    }
};

export const updateUserData = async (uid: string, data: Partial<User>): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        const cleanedData = sanitizeUserData(data);
        await setDoc(userDocRef, cleanedData, { merge: true });
    } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
    }
};

export const updateUserAvatar = async (uid: string, avatarUrl: string): Promise<void> => {
    try {
        // 1. Update Firestore
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, { avatarUrl }, { merge: true });

        // 2. Synchronize with Firebase Auth if this is the current user
        if (auth.currentUser && auth.currentUser.uid === uid) {
            await updateProfile(auth.currentUser, { photoURL: avatarUrl });
        }
    } catch (error: any) {
        console.error("Error updating avatar:", error);
        throw error;
    }
};

export const approveFacilitatorRequest = async (uid: string): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        await updateDoc(userDocRef, {
            role: 'facilitator',
            isAdmin: true,
            facilitatorRequestStatus: 'approved'
        });
    } catch (error) {
        console.error("Error approving facilitator request:", error);
        throw error;
    }
};

export const rejectFacilitatorRequest = async (uid: string, reason: string): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        await updateDoc(userDocRef, {
            facilitatorRequestStatus: 'rejected',
            facilitatorRejectionReason: reason
        });
    } catch (error) {
        console.error("Error rejecting facilitator request:", error);
        throw error;
    }
};

export const submitFacilitatorRequest = async (uid: string, idUrl: string): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        const userDoc = await getDoc(userDocRef);
        const userName = userDoc.exists() ? userDoc.data().name : 'A user';

        await setDoc(userDocRef, {
            facilitatorRequestStatus: 'pending',
            idUrl: idUrl, // Consistent field name
            facilitatorIdUrl: idUrl, // Backward compatibility
            facilitatorRejectionReason: null,
            role: 'user' // Keep as user until approved
        }, { merge: true });

        // Notify Admins
        const admins = await getAdmins();
        for (const admin of admins) {
            await createNotification(
                admin.uid,
                'facilitator_request',
                'New Facilitator Request',
                `${userName} has requested to become a facilitator.`,
                uid
            );
        }
    } catch (error) {
        console.error("Error submitting facilitator request:", error);
        throw error;
    }
};

export const deleteUser = async (uid: string): Promise<void> => {
    try {
        const { deleteDoc } = await import('firebase/firestore');
        const userDocRef = doc(db, usersCollectionRef, uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().email === 'admin@commove.com') {
            throw new Error("Cannot delete the Root Administrator account.");
        }
        
        await deleteDoc(userDocRef);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};

export const updateUserSavedEvents = async (uid: string, eventIds: Set<string>): Promise<void> => {
    try {
        if (!uid) throw new Error("User ID is required to update saved events");
        
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, {
            savedEventIds: Array.from(eventIds)
        }, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
             console.debug("Update saved events blocked by security rules.");
            return;
        }
        console.error("Error updating saved events:", error);
    }
};

export const updateUserLikes = async (uid: string, eventIds: Set<string>): Promise<void> => {
    try {
        if (!uid) throw new Error("User ID is required to update liked events");
        
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, {
            likedEventIds: Array.from(eventIds)
        }, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
             console.debug("Update liked events blocked by security rules.");
            return;
        }
        console.error("Error updating liked events:", error);
    }
};

export const updateUserParticipation = async (
    uid: string, 
    type: 'interested' | 'checkedIn', 
    eventIds: string[]
): Promise<void> => {
    try {
        if (!uid) return;
        const userDocRef = doc(db, usersCollectionRef, uid);
        const field = `${type}EventIds`;
        await setDoc(userDocRef, {
            [field]: eventIds
        }, { merge: true });
    } catch (error: any) {
        console.error(`Error updating ${type} events:`, error);
    }
};

export const addUserViewedEvent = async (uid: string, eventId: string): Promise<void> => {
    try {
        if (!uid) return;
        const userDocRef = doc(db, usersCollectionRef, uid);
        // Use arrayUnion to efficiently add the ID only if it doesn't exist
        await updateDoc(userDocRef, {
            viewedEventIds: arrayUnion(eventId)
        });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
             console.debug("Update viewed events blocked by security rules.");
            return;
        }
        // Silent fail is acceptable for analytics/tracking data
        console.warn("Error updating viewed events:", error);
    }
};

export const getPendingFacilitators = async (): Promise<User[]> => {
    try {
        const q = query(
            collection(db, usersCollectionRef),
            where('facilitatorRequestStatus', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
    } catch (error) {
        console.error("Error fetching pending facilitators:", error);
        return [];
    }
};

export const updateUserReminders = async (uid: string, reminders: Record<string, Reminder>): Promise<void> => {
    try {
        if (!uid) throw new Error("User ID is required to update reminders");

        const cleanedReminders = sanitizeUserData(reminders);
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, {
            reminders: cleanedReminders
        }, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
             console.debug("Update reminders blocked by security rules.");
            return;
        }
        console.error("Error updating reminders:", error);
    }
};

export const updateUserPreferences = async (uid: string, preferences: string[]): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, {
            preferences
        }, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
            console.debug("Preferences update blocked by security rules. Continuing locally.");
            return;
        }
        console.error("Error updating preferences:", error);
        throw error;
    }
};

export const updateUserNotificationSettings = async (uid: string, settings: User['notificationSettings']): Promise<void> => {
    try {
        if (!uid) throw new Error("User ID is required to update notification settings");

        const userDocRef = doc(db, usersCollectionRef, uid);
        await setDoc(userDocRef, {
            notificationSettings: settings
        }, { merge: true });
    } catch (error: any) {
        console.error("Error updating notification settings:", error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, usersCollectionRef);
        const snapshot = await getDocs(usersRef);
        return snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
            console.debug("Fetching all users blocked by security rules.");
            return [];
        }
        throw error;
    }
};

export const getAdmins = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, usersCollectionRef);
        // Query by role
        const q = query(usersRef, where("role", "==", "admin"));
        const snapshot = await getDocs(q);
        const admins = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));

        // Always ensure root admin is included (even if their role field isn't set yet)
        const ROOT_ADMIN_EMAIL = 'admin@commove.com';
        const hasRootAdmin = admins.some(a => a.email === ROOT_ADMIN_EMAIL);
        if (!hasRootAdmin) {
            const allUsersSnap = await getDocs(query(usersRef, where("email", "==", ROOT_ADMIN_EMAIL), limit(1)));
            if (!allUsersSnap.empty) {
                admins.push({ uid: allUsersSnap.docs[0].id, ...allUsersSnap.docs[0].data() } as User);
            }
        }

        return admins;
    } catch (error: any) {
        console.error("Error fetching admins:", error);
        return [];
    }
};

export const getEventParticipants = async (eventId: string): Promise<{ user: User, type: 'interested' | 'checkedIn' }[]> => {
    try {
        const usersRef = collection(db, usersCollectionRef);
        const snapshot = await getDocs(usersRef);
        const participants: { user: User, type: 'interested' | 'checkedIn' }[] = [];
        
        snapshot.docs.forEach(doc => {
            const userData = doc.data() as User;
            const user = { uid: doc.id, ...userData };
            
            if (userData.checkedInEventIds?.includes(eventId)) {
                participants.push({ user, type: 'checkedIn' });
            } else if (userData.interestedEventIds?.includes(eventId)) {
                participants.push({ user, type: 'interested' });
            }
        });
        
        return participants;
    } catch (error: any) {
        console.error("Error fetching event participants:", error);
        return [];
    }
};

export const setUserAdminStatus = async (uid: string, isAdmin: boolean): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        // If revoking admin/facilitator status via this method, default back to 'user'
        const role: UserRole = isAdmin ? 'admin' : 'user';
        await setDoc(userDocRef, { isAdmin, role }, { merge: true });
    } catch (error) {
        throw error;
    }
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
    try {
        const userDocRef = doc(db, usersCollectionRef, uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().email === 'admin@commove.com') {
            console.warn("Attempted to change role of Root Admin. Action blocked.");
            return;
        }

        const updateData: any = { 
            role, 
            isAdmin: role === 'admin' || role === 'facilitator' // Maintain backward compat
        };
        
        if (role === 'facilitator') {
            updateData.facilitatorRequestStatus = 'approved';
        }

        await setDoc(userDocRef, updateData, { merge: true });
    } catch (error) {
        console.error("Error updating user role:", error);
    }
};
