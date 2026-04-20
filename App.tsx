import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { getUserProfile, updateUserPreferences, updateUserSavedEvents, updateUserReminders, updateUserRole, addUserViewedEvent, updateUserParticipation, getAllUsers } from './services/userService';
import { fetchEvents, deleteEvent, updateEvent, updateEventStatus, getHighlights } from './services/eventService';
import { getKNNRankedEvents } from './services/recommendationService'; // Import Recommendation Service
import { CATEGORIES, formatDisplayDate } from './constants';
import { Tag } from 'lucide-react';
import type { User, EventType, DisplayEventType, Reminder, AppNotification } from './types';
import { createNotification, subscribeToNotifications } from './services/notificationService';
import { useAlert } from './contexts/AlertContext';
import { usePermissions } from './contexts/PermissionContext';
import { toast } from 'sonner';

// Components
import Auth from './components/Auth';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import EventList from './components/EventList';
import EventModal from './components/EventModal';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import CalendarView from './components/CalendarView';
import ProfileView from './components/ProfileView';
import Preferences from './components/Preferences';
import AdminPanel from './components/AdminPanel';
import PermitDashboard from './components/PermitDashboard';
import Spinner from './components/Spinner';
import NearbyView from './components/NearbyView';
import SavedEventsView from './components/SavedEventsView';
import NotificationSettingsView from './components/NotificationSettingsView';
import NotificationList from './components/NotificationList';
import HelpSupportView from './components/HelpSupportView';
import TermsAndConditionsView from './components/TermsAndConditionsView';
import ManageRegistrations from './components/ManageRegistrations';
import FacilitatorAuthFlow from './components/FacilitatorAuthFlow';
import EditProfileModal from './components/EditProfileModal';
import HighlightsSlider from './components/HighlightsSlider';
import QRScannerModal from './components/QRScannerModal';
import PermissionManager from './components/PermissionManager';
import PopularEvents from './components/PopularEvents';
import DateEventsModal from './components/DateEventsModal';

import {
    Globe,
    Flame,
    Music,
    Mic,
    Palette,
    Gamepad2,
    Briefcase,
    VenetianMask,
    Trophy,
    Laptop,
    HeartPulse,
    Tent,
    Coffee,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin
} from 'lucide-react';

const CATEGORY_DATA: Record<string, { bg: string, subtitle: string, icon: React.ElementType }> = {
    'All': { bg: 'from-[#a78bfa] to-[#8b5cf6]', subtitle: 'Everything', icon: Globe },
    'Happening Now': { bg: 'from-[#f87171] to-[#ef4444]', subtitle: 'Live', icon: Flame },
    'Concerts': { bg: 'from-[#60a5fa] to-[#3b82f6]', subtitle: 'Music', icon: Music },
    'Conference': { bg: 'from-[#34d399] to-[#10b981]', subtitle: 'Learn', icon: Mic },
    'Arts': { bg: 'from-[#f472b6] to-[#ec4899]', subtitle: 'Creative', icon: Palette },
    'Gaming': { bg: 'from-[#c084fc] to-[#a855f7]', subtitle: 'Play', icon: Gamepad2 },
    'Business': { bg: 'from-[#fbbf24] to-[#f59e0b]', subtitle: 'Network', icon: Briefcase },
    'Cosplay': { bg: 'from-[#e879f9] to-[#d946ef]', subtitle: 'Costume', icon: VenetianMask },
    'Competitions': { bg: 'from-[#facc15] to-[#eab308]', subtitle: 'Win', icon: Trophy },
    'Technology': { bg: 'from-[#38bdf8] to-[#0ea5e9]', subtitle: 'Tech', icon: Laptop },
    'Health': { bg: 'from-[#4ade80] to-[#22c55e]', subtitle: 'Wellness', icon: HeartPulse },
    'Expo Events': { bg: 'from-[#818cf8] to-[#6366f1]', subtitle: 'Exhibits', icon: Tent },
    'Cafe': { bg: 'from-[#fb923c] to-[#f97316]', subtitle: 'Coffee', icon: Coffee },
};

// Palette of gradient colours cycled for custom categories
const CUSTOM_CATEGORY_GRADIENTS = [
    'from-[#f9a8d4] to-[#f472b6]',
    'from-[#6ee7b7] to-[#34d399]',
    'from-[#fcd34d] to-[#f59e0b]',
    'from-[#a5b4fc] to-[#818cf8]',
    'from-[#5eead4] to-[#14b8a6]',
    'from-[#fda4af] to-[#f43f5e]',
    'from-[#93c5fd] to-[#60a5fa]',
    'from-[#d9f99d] to-[#84cc16]',
];

const App: React.FC = () => {
    // Theme State
    const [theme, setTheme] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem('theme') || 'light';
            }
        } catch (e) {
            console.warn("localStorage access failed", e);
        }
        return 'light';
    });

    const { showAlert } = useAlert();
    const { permissions, requestLocation, requestNotifications, checkPermissions } = usePermissions();

    const categoryScrollRef = useRef<HTMLDivElement>(null);

    const scrollCategories = (direction: 'left' | 'right') => {
        if (categoryScrollRef.current) {
            const scrollAmount = 250;
            categoryScrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Auth & User State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState<'preferences' | 'auth' | 'completed'>(() => {
        try {
            if (typeof window !== 'undefined') {
                const completed = localStorage.getItem('hasCompletedOnboarding');
                return completed === 'true' ? 'completed' : 'auth';
            }
        } catch (e) {
            console.warn("localStorage access failed", e);
        }
        return 'auth';
    });
    const [showPreferences, setShowPreferences] = useState(false);

    const [events, setEvents] = useState<EventType[]>([]);
    const [areEventsLoading, setAreEventsLoading] = useState(false);
    const [highlightIds, setHighlightIds] = useState<string[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('customCategories') || '[]'); } catch { return []; }
    });
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute to keep "Happening Now" accurate
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // UI State - Managed via History
    const [activeTab, setActiveTab] = useState<'feed' | 'calendar' | 'nearby' | 'notifications'>('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null); // New state for Calendar filter
    const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
    const [pendingFacilitatorCount, setPendingFacilitatorCount] = useState(0);

    // Overlay Views
    const [showPermitDashboard, setShowPermitDashboard] = useState(false);
    const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);

    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showCalendarEventsPopup, setShowCalendarEventsPopup] = useState(false);
    const [calendarPopupDate, setCalendarPopupDate] = useState<Date | null>(null);

    // New Profile Views
    const [showSavedEvents, setShowSavedEvents] = useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    const [showHelpSupport, setShowHelpSupport] = useState(false);
    const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
    const [showFacilitatorAuth, setShowFacilitatorAuth] = useState(false);
    const [facilitatorAuthInitialStep, setFacilitatorAuthInitialStep] = useState<'question' | 'request'>('question');
    const [managingEventRegistrations, setManagingEventRegistrations] = useState<EventType | null>(null);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [showPermissionManager, setShowPermissionManager] = useState(false);

    // Location State
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number }>({
        lat: 14.4445, // Default Bacoor center
        lng: 120.9526
    });
    const [isLocationLive, setIsLocationLive] = useState(false);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Notification Refs
    const notifiedUpcomingEvents = useRef<Set<string>>(new Set());
    const notifiedTomorrowEvents = useRef<Set<string>>(new Set());
    const notifiedStartedEvents = useRef<Set<string>>(new Set());
    const notifiedCustomReminders = useRef<Set<string>>(new Set());


    const safeParseDate = (date: string, time: string) => {
        if (!date || !time) return new Date(0);

        // Handle AM/PM format if present (e.g. "09:00 PM")
        if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
            const match = time.match(/(\d+):(\d+)\s*(am|pm)/i);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const modifier = match[3].toLowerCase();

                if (modifier === 'pm' && hours < 12) hours += 12;
                if (modifier === 'am' && hours === 12) hours = 0;

                const paddedH = hours.toString().padStart(2, '0');
                const paddedM = minutes.toString().padStart(2, '0');
                return new Date(`${date}T${paddedH}:${paddedM}`);
            }
        }

        // Handle standard 24h format (e.g. "21:00")
        return new Date(`${date}T${time}`);
    };

    // --- Effects ---

    // 0. One-time Fix for Event Location Accuracy
    useEffect(() => {
        const fixEventLocation = async () => {
            // Only admins or facilitators should attempt to fix data in Firestore
            if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'facilitator')) {
                return;
            }

            try {
                // Find the event mentioned by the user (Bazaar)
                const targetEvent = events.find(e => e.name.toLowerCase().includes("bazaar") || e.name.toLowerCase().includes("valentine"));
                if (targetEvent && (targetEvent.lat !== 14.4446 || targetEvent.lng !== 120.9444)) {
                    console.log("Fixing event location for:", targetEvent.name);
                    await updateEvent(targetEvent.id, {
                        lat: 14.4446,
                        lng: 120.9444,
                        venue: "Bacoor Government Center",
                        street: "NoMo Avenue",
                        barangay: "San Nicolas II"
                    });
                    // Update local state immediately for better UX
                    handleEventUpdated({
                        ...targetEvent,
                        lat: 14.4446,
                        lng: 120.9444,
                        venue: "Bacoor Government Center",
                        street: "NoMo Avenue",
                        barangay: "San Nicolas II"
                    });
                }
            } catch (e) {
                console.error("Failed to fix event location:", e);
            }
        };
        if (events.length > 0 && currentUser) {
            fixEventLocation();
        }
    }, [events, currentUser]);

    // 1. Theme
    useEffect(() => {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#111827');
        } else {
            document.documentElement.classList.remove('dark');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#ffffff');
        }
        try {
            localStorage.setItem('theme', theme);
        } catch (e) { }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // 2. Auth Listener with Strict Role Enforcement & Self-Healing
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {

                    // Reset Navigation on Login
                    setActiveTab('feed');
                    setShowPermitDashboard(false);
                    setShowSavedEvents(false);
                    setShowNotificationSettings(false);
                    setShowHelpSupport(false);
                    setManagingEventRegistrations(null);
                    setSelectedEvent(null);

                    let profile = await getUserProfile(firebaseUser.uid);

                    // Self-Healing: Create profile if missing
                    if (!profile) {
                        console.log("Profile missing, creating default profile...");
                        try {
                            await updateUserRole(firebaseUser.uid, 'user');
                        } catch (e) { console.warn("Self-healing failed", e); }

                        // Re-fetch or manually construct
                        profile = {
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email || '',
                            role: 'user',
                            savedEventIds: [],
                            viewedEventIds: [],
                            reminders: {}
                        };
                    } else {
                        // Ensure name and email are present even if missing in DB
                        if (!profile.name) profile.name = firebaseUser.displayName || 'User';
                        if (!profile.email) profile.email = firebaseUser.email || '';
                    }

                    // Strict Role Enforcement
                    if (firebaseUser.email === 'admin@commove.com' && profile.role !== 'admin') {
                        await updateUserRole(firebaseUser.uid, 'admin');
                        profile.role = 'admin';
                        profile.isAdmin = true;
                    } else if (firebaseUser.email === 'facilitator@commove.com' && profile.role !== 'facilitator') {
                        await updateUserRole(firebaseUser.uid, 'facilitator');
                        profile.role = 'facilitator';
                        profile.isAdmin = true; // Facilitators count as staff
                    }

                    if (profile.role === 'admin' || profile.role === 'facilitator') {
                        setActiveTab('feed');
                    }

                    setCurrentUser(profile);
                    setOnboardingStep('completed');
                    setIsGuest(false);

                } catch (error) {
                    console.error("Error loading user profile:", error);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 3. Location Check
    useEffect(() => {
        if (permissions.location === 'granted' && currentUser) {
            startLocationWatch();
        } else if (permissions.location === 'prompt' && currentUser && !showPreferences && onboardingStep === 'completed') {
            // If location is prompt and user is logged in, show permission manager
            setShowPermissionManager(true);
        }
    }, [currentUser, showPreferences, permissions.location, onboardingStep]);

    // Fetch pending facilitators if Admin
    useEffect(() => {
        const fetchPending = async () => {
            if (currentUser?.role === 'admin') {
                try {
                    const allUsers = await getAllUsers();
                    const pendingCount = allUsers.filter(u => u.facilitatorRequestStatus === 'pending').length;
                    setPendingFacilitatorCount(pendingCount);
                } catch (e) { console.error(e); }
            } else {
                setPendingFacilitatorCount(0);
            }
        };
        fetchPending();
    }, [currentUser?.role, activeTab]); // Re-fetch occasionally when tab changes

    // 3.5 Global Notification Subscription
    useEffect(() => {
        if (!currentUser) return;
        const unsub = subscribeToNotifications(currentUser.uid, (notifs) => {
            setUnreadNotificationCount(notifs.filter(n => !n.isRead).length);
        });
        return () => unsub();
    }, [currentUser]);

    // 3b. Listen for custom categories added from CreateEventForm
    useEffect(() => {
        const handleCustomCatUpdate = () => {
            try {
                const saved = JSON.parse(localStorage.getItem('customCategories') || '[]');
                setCustomCategories(saved);
            } catch { /* noop */ }
        };
        window.addEventListener('customCategoriesUpdated', handleCustomCatUpdate);
        return () => window.removeEventListener('customCategoriesUpdated', handleCustomCatUpdate);
    }, []);

    // 4. Fetch Events
    const loadEvents = useCallback(async () => {
        setAreEventsLoading(true);
        try {
            const [fetchedEvents, ids] = await Promise.all([fetchEvents(), getHighlights()]);
            setEvents(fetchedEvents);
            setHighlightIds(ids);
        } catch (error) {
            console.error("Failed to load events", error);
        } finally {
            setAreEventsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser || isGuest) {
            loadEvents();
        }
    }, [currentUser, isGuest, loadEvents]);

    // 5. Notifications & Reminders Loop
    useEffect(() => {
        if (!currentUser || !events.length) return;

        const checkReminders = () => {
            const now = Date.now();

            // 0. Central Event Reaper: Auto-publish scheduled events
            // Gate: only admin clients act as reapers — no backend cron needed
            if (currentUser.role === 'admin') {
                events.forEach(event => {
                    // Only fire once per session per event using the ref as a guard
                    if (
                        event.status === 'scheduled' &&
                        event.publishAt &&
                        now >= event.publishAt &&
                        !notifiedCustomReminders.current.has(`reaped_${event.id}`)
                    ) {
                        // Mark immediately so subsequent interval ticks don't re-fire
                        notifiedCustomReminders.current.add(`reaped_${event.id}`);

                        updateEventStatus(event.id, 'published')
                            .then(() => {
                                // Update local state immutably — never mutate event.status directly
                                setEvents(prev =>
                                    prev.map(e =>
                                        e.id === event.id ? { ...e, status: 'published' as const, publishAt: null } : e
                                    )
                                );

                                // Notify admin
                                createNotification(
                                    currentUser.uid,
                                    'event_approved',
                                    '📢 Scheduled Event Published',
                                    `"${event.name}" has been automatically published and is now visible to residents.`,
                                    event.id
                                ).catch(console.error);

                                // Notify the facilitator who created it (if different from admin)
                                if (event.createdBy && event.createdBy !== currentUser.uid) {
                                    createNotification(
                                        event.createdBy,
                                        'event_approved',
                                        '🎉 Your Event is Now Live!',
                                        `Your scheduled event "${event.name}" has been published and is now visible to all residents.`,
                                        event.id
                                    ).catch(console.error);
                                }

                                // Browser push notification for the admin
                                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                    try {
                                        new Notification('Scheduled Event Published', {
                                            body: `"${event.name}" is now live!`,
                                            icon: '/logo192.png',
                                        });
                                    } catch (e) { console.warn('Push notification error', e); }
                                }

                                toast.success(`"${event.name}" is now live!`, {
                                    description: 'The scheduled event has been automatically published.'
                                });
                            })
                            .catch(err => {
                                // Remove the guard so it can retry next tick
                                notifiedCustomReminders.current.delete(`reaped_${event.id}`);
                                console.error('Failed to auto-publish event', event.id, err);
                            });
                    }
                });
            }

            const settings = currentUser.notificationSettings || {
                pushEnabled: true,
                emailEnabled: true,
                upcomingReminders: true,
                newEvents: true,
                vibrationEnabled: true
            };

            // Quiet Hours Check
            if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
                const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
                const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

                if (!isNaN(startH) && !isNaN(startM) && !isNaN(endH) && !isNaN(endM)) {
                    const nowTime = new Date();
                    const startTime = new Date(); startTime.setHours(startH, startM, 0);
                    const endTime = new Date(); endTime.setHours(endH, endM, 0);

                    let isQuiet = false;
                    if (startTime < endTime) {
                        isQuiet = nowTime >= startTime && nowTime <= endTime;
                    } else { // Overnight
                        isQuiet = nowTime >= startTime || nowTime <= endTime;
                    }
                    if (isQuiet) return; // Mute notifications
                }
            }

            // 1. Check User Reminders (Custom set by user)
            if (settings.pushEnabled !== false && currentUser.reminders) {
                Object.values(currentUser.reminders).forEach((reminder: any) => {
                    if (reminder && reminder.remindAt <= now && reminder.remindAt > now - 60000 && !notifiedCustomReminders.current.has(reminder.eventId)) { // Trigger within last minute
                        const event = events.find(e => e.id === reminder.eventId);
                        if (event) {
                            notifiedCustomReminders.current.add(reminder.eventId);
                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                try {
                                    new Notification(`Reminder: ${event.name}`, {
                                        body: `Starting soon at ${event.venue}`,
                                        icon: '/logo192.png',
                                        vibrate: (settings as any).vibrationEnabled ? [200, 100, 200] : undefined
                                    } as any);
                                } catch (e) {
                                    console.warn("Notification error:", e);
                                }
                            }

                            // 2. Create actual record in Firestore collection
                            createNotification(
                                currentUser.uid,
                                'reminder',
                                `Reminder: ${event.name}`,
                                `The event is starting soon at ${event.venue}.`,
                                event.id
                            );

                            toast.info(`Reminder: ${event.name}`, { description: `Starting soon at ${event.venue}` });
                        }
                    }
                });
            }

            // 2. Check Saved Events (Auto logic: 1hr before, Tomorrow)
            if (settings.pushEnabled !== false && settings.upcomingReminders !== false && currentUser.savedEventIds && Array.isArray(currentUser.savedEventIds)) {
                currentUser.savedEventIds.forEach(savedId => {
                    const event = events.find(e => e.id === savedId);
                    if (!event) return;

                    const start = safeParseDate(event.date, event.startTime);
                    const timeDiff = start.getTime() - now;

                    // 1 Hour Before
                    if (timeDiff > 0 && timeDiff <= 60 * 60 * 1000 && !notifiedUpcomingEvents.current.has(event.id)) {
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            try {
                                new Notification(`Upcoming Event: ${event.name}`, {
                                    body: `Starts in 1 hour at ${event.venue}`,
                                    icon: '/logo192.png',
                                    vibrate: (settings as any).vibrationEnabled ? [200, 100, 200] : undefined
                                } as any);
                            } catch (e) { console.warn("Notification error", e); }
                        }

                        // Create actual record in Firestore collection
                        createNotification(
                            currentUser.uid,
                            'event_upcoming',
                            `Upcoming Event: ${event.name}`,
                            `Your saved event starts in only 1 hour at ${event.venue}.`,
                            event.id
                        );

                        toast.info(`Upcoming Event: ${event.name}`, { description: `Starts in 1 hour at ${event.venue}` });
                        notifiedUpcomingEvents.current.add(event.id);
                    }

                    // Just Started (Notifications within first 5 mins of start)
                    if (timeDiff <= 0 && timeDiff >= -5 * 60 * 1000 && !notifiedStartedEvents.current.has(event.id)) {
                        createNotification(
                            currentUser.uid,
                            'reminder',
                            `Event Starting Now: ${event.name}`,
                            `${event.name} has just started at ${event.venue}! Enjoy the event.`,
                            event.id
                        );
                        toast.info(`Starting Now: ${event.name}`, { description: `Event has started at ${event.venue}` });
                        notifiedStartedEvents.current.add(event.id);
                    }

                    // Tomorrow
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const isTomorrow = new Date(event.date).toDateString() === tomorrow.toDateString();

                    if (isTomorrow && !notifiedTomorrowEvents.current.has(event.id)) {
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            try {
                                new Notification(`Happening Tomorrow: ${event.name}`, {
                                    body: `Don't forget! ${event.name} is tomorrow.`,
                                    icon: '/logo192.png',
                                    vibrate: (settings as any).vibrationEnabled ? [200, 100, 200] : undefined
                                } as any);
                            } catch (e) { console.warn("Notification error", e); }
                        }

                        // Create actual record in Firestore collection
                        createNotification(
                            currentUser.uid,
                            'event_tomorrow',
                            `Happening Tomorrow: ${event.name}`,
                            `${event.name} is occurring tomorrow. Be sure to check the details!`,
                            event.id
                        );

                        toast.info(`Happening Tomorrow: ${event.name}`, { description: `Don't forget! ${event.name} is tomorrow.` });
                        notifiedTomorrowEvents.current.add(event.id);
                    }
                });
            }
        };

        const interval = setInterval(checkReminders, 30000); // Check every 30 seconds for faster response
        checkReminders(); // Run immediately on mount

        return () => clearInterval(interval);
    }, [currentUser, events]);

    // 6. History Management (Back Button Support)
    useEffect(() => {
        try {
            // Initial state
            window.history.replaceState({ view: 'feed' }, '');
        } catch (e) { console.warn("History replaceState failed", e); }

        const handlePopState = (event: PopStateEvent) => {
            const state = event.state;

            // Reset overlays first
            setSelectedEvent(null);
            setShowPermitDashboard(false);
            setShowPreferences(false);
            setShowSavedEvents(false);
            setShowNotificationSettings(false);
            setShowHelpSupport(false);
            setShowQRScanner(false);

            if (!state) {
                setActiveTab('feed');
                return;
            }

            // Handle Views
            if (state.view === 'event-details') {
                // Usually handled by modal state
            } else if (state.view === 'permit') {
                setShowPermitDashboard(true);
            } else if (state.view === 'preferences') {
                setShowPreferences(true);
            } else if (state.view === 'saved-events') {
                setShowSavedEvents(true);
            } else if (state.view === 'notifications') {
                setShowNotificationSettings(true);
            } else if (state.view === 'help') {
                setShowHelpSupport(true);
            } else if (state.view === 'scanner') {
                setShowQRScanner(true);
            } else if (['feed', 'calendar', 'profile'].includes(state.view)) {
                setActiveTab(state.view);
            } else {
                setActiveTab('feed');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // --- Navigation Handlers ---

    const handleTabChange = useCallback((tab: 'feed' | 'calendar' | 'nearby' | 'notifications') => {
        setShowProfilePanel(false);

        if (activeTab === tab) {
            // Refresh logic: If user clicks "Feed" while on Feed, refresh events
            if (tab === 'feed') {
                loadEvents();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        try {
            window.history.pushState({ view: tab }, '');
        } catch (e) {
            console.warn("History pushState failed", e);
        }

        setActiveTab(tab);
        setShowPermitDashboard(false);
        setShowSavedEvents(false);
        setShowNotificationSettings(false);
        setShowHelpSupport(false);
        setShowTermsAndConditions(false);
        setManagingEventRegistrations(null);
        setSelectedEvent(null);
    }, [activeTab, loadEvents]);

    const handleDateSelect = (date: Date) => {
        setCalendarPopupDate(date);
        setShowCalendarEventsPopup(true);
    };

    const clearDateFilter = () => {
        setSelectedDateFilter(null);
    };

    const handleOpenEvent = (event: EventType, notifType?: string) => {
        const isStaffUser = currentUser?.role === 'admin' || currentUser?.role === 'facilitator';

        // For admin/facilitator: route approval-type notifications to Admin Panel
        if (isStaffUser && (notifType === 'event_created' || notifType === 'event_approved' || notifType === 'event_rejected')) {
            setActiveTab('feed');
            // Give AdminPanel a moment to mount, then dispatch the preview event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('admin-preview-event', { detail: event }));
            }, 150);
            return;
        }

        // Default: open EventModal
        try {
            window.history.pushState({ view: 'event-details', eventId: event.id }, '');
        } catch (e) { }
        setSelectedEvent(event);

        // --- TRACKING FOR ALGORITHM ---
        if (currentUser) {
            const alreadyViewed = currentUser.viewedEventIds?.includes(event.id);
            if (!alreadyViewed) {
                const updatedViewed = [...(currentUser.viewedEventIds || []), event.id];
                setCurrentUser({ ...currentUser, viewedEventIds: updatedViewed });
                addUserViewedEvent(currentUser.uid, event.id);
            }
        }
    };

    const handleCloseAllModals = useCallback(() => {
        // 1. Clear UI states immediately
        setSelectedEvent(null);
        setShowPermitDashboard(false);
        setShowSavedEvents(false);
        setShowNotificationSettings(false);
        setShowHelpSupport(false);
        setShowTermsAndConditions(false);
        setManagingEventRegistrations(null);
        setShowQRScanner(false);
        setShowCalendarEventsPopup(false);
        setShowPreferences(false);
        setShowFacilitatorAuth(false);
        setShowLogoutConfirm(false);

        // 2. Safely synchronize the URL/History WITHOUT using history.back()
        // history.back() is dangerous because it can exit the app entirely if the user refreshed
        try {
            const currentPath = window.location.pathname;
            // Clean the state to 'feed' and update URL to root
            window.history.replaceState({ view: 'feed' }, '', currentPath);
        } catch (e) {
            console.warn("Failed to update history state", e);
        }
    }, []);

    const handleOpenPermitDashboard = () => {
        try {
            window.history.pushState({ view: 'permit' }, '');
        } catch (e) { }
        setShowPermitDashboard(true);
    };

    const handleOpenPreferences = () => {
        try {
            window.history.pushState({ view: 'preferences' }, '');
        } catch (e) { }
        setShowPreferences(true);
    };

    const handleOpenSavedEvents = () => {
        if (isGuest) {
            setIsGuest(false);
            return;
        }
        try {
            window.history.pushState({ view: 'saved-events' }, '');
        } catch (e) { }
        setShowSavedEvents(true);
    };

    const handleOpenNotificationSettings = () => {
        if (isGuest) {
            setIsGuest(false);
            return;
        }
        try {
            window.history.pushState({ view: 'notifications' }, '');
        } catch (e) { }
        setShowNotificationSettings(true);
    };

    const handleOpenHelpSupport = () => {
        if (isGuest) {
            setIsGuest(false);
            return;
        }
        try {
            window.history.pushState({ view: 'help' }, '');
        } catch (e) { }
        setShowHelpSupport(true);
    };

    const handleOpenTermsAndConditions = () => {
        if (isGuest) {
            setIsGuest(false);
            return;
        }
        try {
            window.history.pushState({ view: 'terms' }, '');
        } catch (e) { }
        setShowTermsAndConditions(true);
    };

    const handleOpenScanner = useCallback(() => {
        setShowProfilePanel(false);
        if (!currentUser) {
            setIsGuest(false);
            return;
        }
        try {
            window.history.pushState({ view: 'scanner' }, '');
        } catch (e) { }
        setShowQRScanner(true);
    }, [currentUser]);

    const handleOpenProfile = useCallback(() => {
        setShowProfilePanel(prev => !prev);
    }, []);
    const handleOpenNotifications = useCallback(() => handleTabChange('notifications'), [handleTabChange]);

    const handleScanSuccess = async (eventId: string) => {
        handleCloseAllModals();

        const event = events.find(e => e.id === eventId);
        if (!event) {
            showAlert("Event Not Found", "The scanned QR code does not match any active event.", "error");
            return;
        }

        if (currentUser) {
            const currentCheckedIn = currentUser.checkedInEventIds || [];
            if (currentCheckedIn.includes(eventId)) {
                showAlert("Already Checked In", `You are already a participant of ${event.name}.`, "info");
                return;
            }

            const newCheckedIn = [...currentCheckedIn, eventId];
            setCurrentUser({ ...currentUser, checkedInEventIds: newCheckedIn });
            await updateUserParticipation(currentUser.uid, 'checkedIn', newCheckedIn);
            showAlert("Success!", `You have successfully joined ${event.name} as a participant.`, "success");
        }
    };

    const handleManageRegistrations = (event: EventType) => {
        setManagingEventRegistrations(event);
        try {
            window.history.pushState({ view: 'manageRegistrations', eventId: event.id }, '');
        } catch (e) { }
    };

    // --- Other Handlers ---

    const startLocationWatch = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                    setIsLocationLive(true);
                },
                (error) => {
                    console.warn("Location error:", error);
                    setIsLocationLive(false);
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
            );
        }
    };

    const handleAuthSuccess = async (isNewUser: boolean) => {
        if (auth.currentUser) {
            const profile = await getUserProfile(auth.currentUser.uid);
            setCurrentUser(profile);
            setOnboardingStep('completed');
            setIsGuest(false);
            try {
                localStorage.setItem('hasCompletedOnboarding', 'true');
            } catch (e) { }
            if (isNewUser) {
                // Send welcome notification
                createNotification(
                    auth.currentUser.uid,
                    'system',
                    'Welcome to Commove!',
                    'We are glad you are here! Start exploring local events in Bacoor right now.'
                );
                handleOpenPreferences();
            }
        }
    };

    const handleGuestAccess = () => {
        setIsGuest(true);
        setOnboardingStep('completed');
        try {
            localStorage.setItem('hasCompletedOnboarding', 'true');
        } catch (e) { }
    };

    const handleOnboardingNext = () => {
        if (onboardingStep === 'auth') {
            setOnboardingStep('preferences');
        } else if (onboardingStep === 'preferences') {
            setShowPermissionManager(true);
            setOnboardingStep('completed');
            try { localStorage.setItem('hasCompletedOnboarding', 'true'); } catch (e) { }
        }
    };

    const handleOnboardingSkip = () => {
        setOnboardingStep('completed');
        setIsGuest(true);
        setActiveTab('feed');
        try {
            localStorage.setItem('hasCompletedOnboarding', 'true');
        } catch (e) { }
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        await signOut(auth);
        setCurrentUser(null);
        try {
            window.history.replaceState({ view: 'feed' }, '');
        } catch (e) { }
        setActiveTab('feed');
        setShowPermitDashboard(false);
        setShowSavedEvents(false);
        setShowNotificationSettings(false);
        setShowHelpSupport(false);
        setShowLogoutConfirm(false);
    };

    const handleSavePreferences = async (categories: string[]) => {
        if (auth.currentUser) {
            await updateUserPreferences(auth.currentUser.uid, categories);
            setCurrentUser(prev => prev ? { ...prev, preferences: categories } : null);
            window.history.back();
        }
    };

    const handleToggleSaveEvent = async (eventId: string) => {
        if (!currentUser) {
            setIsGuest(false);
            return;
        }
        const currentSaved = new Set<string>(currentUser.savedEventIds || []);
        const isSaving = !currentSaved.has(eventId);
        if (currentSaved.has(eventId)) {
            currentSaved.delete(eventId);
        } else {
            currentSaved.add(eventId);
        }
        const newSavedArray = Array.from(currentSaved);
        setCurrentUser({ ...currentUser, savedEventIds: newSavedArray });
        await updateUserSavedEvents(currentUser.uid, currentSaved);

        const event = events.find(e => e.id === eventId);
        if (isSaving) {
            toast.success("Event Saved", { description: `${event?.name || 'Event'} has been added to your saved events.` });
        } else {
            toast.info("Event Removed", { description: `${event?.name || 'Event'} has been removed from your saved events.` });
        }
    };

    const handleSetReminder = async (eventId: string, reminderOffset: string) => {
        if (!currentUser) {
            setIsGuest(false);
            return;
        }
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        const eventDate = new Date(`${event.date}T${event.startTime}`);
        let remindAt = eventDate.getTime();

        switch (reminderOffset) {
            case '1-minute': remindAt -= 60 * 1000; break;
            case '30-minutes': remindAt -= 30 * 60 * 1000; break;
            case '1-hour': remindAt -= 60 * 60 * 1000; break;
            case '2-hours': remindAt -= 2 * 60 * 60 * 1000; break;
            case '3-hours': remindAt -= 3 * 60 * 60 * 1000; break;
            case '1-day': remindAt -= 24 * 60 * 60 * 1000; break;
            default:
                // If it's a specific time (HH:mm) on event day
                if (reminderOffset.startsWith('specific:')) {
                    const timeStr = reminderOffset.split('specific:')[1];
                    const [h, m] = timeStr.split(':').map(Number);
                    const specificDate = new Date(event.date);
                    specificDate.setHours(h, m, 0, 0);
                    remindAt = specificDate.getTime();
                }
                // If it's a custom date string (ISO format from datetime-local)
                else if (reminderOffset.includes('T')) {
                    remindAt = new Date(reminderOffset).getTime();
                }
        }

        if (remindAt < Date.now()) {
            showAlert("Invalid Time", "This reminder time has already passed.", "warning");
            return;
        }

        const newReminder: Reminder = { eventId, remindAt, reminderOffset };
        const updatedReminders = { ...currentUser.reminders, [eventId]: newReminder };
        setCurrentUser({ ...currentUser, reminders: updatedReminders });
        await updateUserReminders(currentUser.uid, updatedReminders);

        const getReminderLabel = (offset: string) => {
            if (offset.startsWith('specific:')) {
                const timeStr = offset.split('specific:')[1];
                const [h24, m] = timeStr.split(':').map(Number);
                const period = h24 >= 12 ? 'PM' : 'AM';
                let h12 = h24 % 12;
                if (h12 === 0) h12 = 12;
                return `at ${h12}:${String(m).padStart(2, '0')} ${period}`;
            }
            if (offset.includes('T')) {
                return `at ${new Date(offset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `in ${offset.replace('-', ' ')}`;
        };

        const reminderLabel = getReminderLabel(reminderOffset);

        const timeUntil = remindAt - Date.now();
        setTimeout(() => {
            if (!notifiedCustomReminders.current.has(eventId)) {
                notifiedCustomReminders.current.add(eventId);
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    try {
                        new Notification(`Reminder: ${event.name}`, {
                            body: `Starting ${reminderLabel} at ${event.venue}`,
                            icon: '/logo192.png'
                        });
                    } catch (e) { console.warn("Notification error", e); }
                }

                // Write to Firestore collection
                createNotification(
                    currentUser.uid,
                    'reminder',
                    `Reminder: ${event.name}`,
                    `Your scheduled reminder for ${event.name} is starting ${reminderLabel} at ${event.venue}.`,
                    event.id
                );

                toast.info(`Reminder: ${event.name}`, { description: `Starting ${reminderLabel} at ${event.venue}` });
            }
        }, timeUntil);

        toast.success("Reminder Set", { description: "You will be notified before the event." });
    };

    const handleCancelReminder = async (eventId: string) => {
        if (!currentUser) return;
        const updatedReminders = { ...currentUser.reminders };
        delete updatedReminders[eventId];
        setCurrentUser({ ...currentUser, reminders: updatedReminders });
        await updateUserReminders(currentUser.uid, updatedReminders);
        notifiedCustomReminders.current.delete(eventId);
    };

    const handleToggleParticipation = async (eventId: string, type: 'interested' | 'checkedIn') => {
        if (!currentUser) {
            setIsGuest(false);
            return;
        }

        const field = `${type}EventIds` as keyof User;
        const currentIds = (currentUser[field] as string[]) || [];

        let newIds: string[];
        const isAlreadyIn = currentIds.includes(eventId);

        if (isAlreadyIn) {
            newIds = currentIds.filter(id => id !== eventId);
        } else {
            newIds = [...currentIds, eventId];
        }

        const updatedUser = { ...currentUser, [field]: newIds };
        setCurrentUser(updatedUser);
        await updateUserParticipation(currentUser.uid, type, newIds);

        const labels = {
            interested: isAlreadyIn ? "Removed from Interested" : "Marked as Interested",
            checkedIn: isAlreadyIn ? "Checked-out" : "Checked-in Successfully"
        };

        if (isAlreadyIn) {
            toast.info(labels[type]);
        } else {
            toast.success(labels[type]);
        }
    };

    const handleEventCreated = (newEvent: EventType) => {
        setEvents(prev => [...prev, newEvent]);
        toast.success("Event Created", { description: `${newEvent.name} has been added.` });
    };

    const handleEventUpdated = (updatedEvent: EventType) => {
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        toast.success("Event Updated", { description: `${updatedEvent.name} has been updated.` });
    };

    const handleEventDeleted = async (eventId: string) => {
        try {
            await deleteEvent(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            return true;
        } catch (e) {
            showAlert("Error", "Failed to delete event", "error");
            return false;
        }
    };

    // --- Filtering Logic with KNN ---
    const getDisplayEvents = useMemo(() => {
        let baseEvents = events.filter(e => {
            const isPublished = e.status === 'published';
            const isScheduled = e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now();
            return isPublished || isScheduled;
        });

        // 2. Search Filter
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            baseEvents = baseEvents.filter(event => {
                const categories = Array.isArray(event.category) ? event.category : [event.category];
                return (event.name || '').toLowerCase().includes(lowercasedQuery) ||
                    categories.some(cat => (cat || '').toLowerCase().includes(lowercasedQuery)) ||
                    (event.street || '').toLowerCase().includes(lowercasedQuery) ||
                    (event.barangay || '').toLowerCase().includes(lowercasedQuery) ||
                    (event.venue || '').toLowerCase().includes(lowercasedQuery) ||
                    (event.city || '').toLowerCase().includes(lowercasedQuery) ||
                    (event.description || '').toLowerCase().includes(lowercasedQuery);
            });
        }

        // 4. Date Filter (Calendar)
        if (selectedDateFilter) {
            baseEvents = baseEvents.filter(e => e.date === selectedDateFilter);
        }

        // 5. Pre-compute basic properties
        let processedEvents = baseEvents.map(event => {
            const R = 6371e3;
            const φ1 = userLocation.lat * Math.PI / 180;
            const φ2 = event.lat * Math.PI / 180;
            const Δφ = (event.lat - userLocation.lat) * Math.PI / 180;
            const Δλ = (event.lng - userLocation.lng) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;

            const now = currentTime;
            const start = safeParseDate(event.date, event.startTime);
            let end = safeParseDate(event.date, event.endTime);

            if (end < start) {
                end.setDate(end.getDate() + 1);
            }

            const isLive = now >= start && now <= end;

            const categories = Array.isArray(event.category) ? event.category : [event.category];
            return {
                ...event,
                isNearby: d <= 3000,
                distance: d,
                isSaved: currentUser?.savedEventIds?.includes(event.id) || false,
                isPreferred: categories.some(cat => currentUser?.preferences?.includes(cat)) || false,
                isLive
            } as DisplayEventType;
        });

        // 6. Apply Category Filtering OR KNN Ranking
        if (selectedCategory === 'Happening Now') {
            return processedEvents.filter(e => e.isLive);
        } else if (selectedCategory !== 'All') {
            return processedEvents.filter(e => {
                const categories = Array.isArray(e.category) ? e.category : [e.category];
                return categories.includes(selectedCategory);
            });
        } else {
            // "All" Category selected: Apply KNN Ranking
            if (currentUser) {
                return getKNNRankedEvents(currentUser, processedEvents, userLocation);
            }

            return processedEvents.sort((a, b) => {
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                if (a.isNearby && !b.isNearby) return -1;
                if (!a.isNearby && b.isNearby) return 1;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
        }
    }, [events, searchQuery, currentUser, userLocation, selectedCategory, selectedDateFilter, currentTime]);

    // 7. Stable Order Management: Pin the sort order only when necessary
    useEffect(() => {
        if (getDisplayEvents.length > 0) {
            setPinnedEventIds(getDisplayEvents.map(e => e.id));
        } else {
            setPinnedEventIds([]);
        }
    }, [getDisplayEvents.length, searchQuery, selectedCategory, selectedDateFilter, selectedDateFilter]);

    // 8. Final Display: Map reactive events to the pinned order
    const finalDisplayEvents = useMemo(() => {
        if (!pinnedEventIds.length) return getDisplayEvents;

        const eventMap = new Map(getDisplayEvents.map(e => [e.id, e]));
        const ordered = pinnedEventIds
            .map(id => eventMap.get(id))
            .filter((e): e is DisplayEventType => !!e);

        const pinnedSet = new Set(pinnedEventIds);
        const newEvents = getDisplayEvents.filter(e => !pinnedSet.has(e.id));

        return [...ordered, ...newEvents];
    }, [pinnedEventIds, getDisplayEvents]);

    // Derived saved events list for the SavedEventsView
    const savedEvents = useMemo(() => {
        if (!currentUser || !currentUser.savedEventIds) return [];
        // Re-use logic to create display events but only for saved IDs, ignoring current filters/search
        return events
            .filter(e => currentUser.savedEventIds?.includes(e.id))
            .map(event => {
                const now = new Date();
                const start = new Date(`${event.date}T${event.startTime}`);
                const end = new Date(`${event.date}T${event.endTime}`);
                const isLive = now >= start && now <= end;

                const categories = Array.isArray(event.category) ? event.category : [event.category];
                return {
                    ...event,
                    isSaved: true,
                    isLive,
                    isPreferred: categories.some(cat => currentUser.preferences?.includes(cat)) || false,
                    isNearby: false, // Calc distance if needed, but not strictly required for saved list view
                } as DisplayEventType;
            });
    }, [events, currentUser]);

    // Admin-curated highlights: maintains order from highlightIds
    const highlightedDisplayEvents = useMemo(() => {
        if (!highlightIds.length) return [];
        return highlightIds
            .map(id => getDisplayEvents.find(e => e.id === id))
            .filter((e): e is DisplayEventType => !!e && !!e.imageUrl);
    }, [highlightIds, getDisplayEvents]);


    // --- Render ---

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900"><Spinner size="lg" /></div>;
    }

    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'facilitator';



    if (showPermitDashboard) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Permit Dashboard"
                />
                <PermitDashboard onBack={handleCloseAllModals} onManageRegistrations={handleManageRegistrations} />
            </div>
        );
    }

    if (managingEventRegistrations) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Manage Registrations"
                />
                <ManageRegistrations event={managingEventRegistrations} onBack={handleCloseAllModals} />
            </div>
        );
    }

    if (showSavedEvents) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Saved Events"
                />
                <SavedEventsView
                    events={savedEvents}
                    onBack={handleCloseAllModals}
                    onEventSelect={handleOpenEvent}
                    onToggleSave={handleToggleSaveEvent}
                />
            </div>
        );
    }

    if (showNotificationSettings) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Notification Settings"
                />
                <NotificationSettingsView
                    currentUser={currentUser}
                    onBack={handleCloseAllModals}
                />
            </div>
        );
    }

    if (showHelpSupport) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Help & Support"
                />
                <HelpSupportView onBack={handleCloseAllModals} />
            </div>
        );
    }

    if (showTermsAndConditions) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900">
                <Header
                    currentUser={currentUser}
                    reminders={currentUser?.reminders || {}}
                    events={events}
                    onBack={handleCloseAllModals}
                    onProfileClick={handleOpenProfile}
                    title="Terms & Conditions"
                />
                <TermsAndConditionsView onBack={handleCloseAllModals} />
            </div>
        );
    }

    return (
        <div className={`h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300 font-sans ${activeTab === 'nearby' ? 'overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
            <Header
                currentUser={currentUser}
                reminders={currentUser?.reminders || {}}
                events={events}
                theme={theme}
                toggleTheme={toggleTheme}
                onProfileClick={handleOpenProfile}
            />

            <div className={`flex flex-1 ${activeTab === 'nearby' ? 'overflow-hidden' : ''}`}>
                <Sidebar
                    activeTab={activeTab as 'feed' | 'calendar' | 'nearby' | 'notifications'}
                    onTabChange={handleTabChange}
                    onOpenScanner={handleOpenScanner}
                    pendingFacilitatorCount={pendingFacilitatorCount}
                    unreadNotificationCount={unreadNotificationCount}
                />
                <main className={`flex-1 transition-all duration-300 ${activeTab === 'nearby'
                    ? 'h-full overflow-hidden'
                    : 'w-full px-0'
                    } ${activeTab === 'feed' ? 'pb-24' : ''} overflow-x-hidden`}>
                    {activeTab === 'feed' && !isStaff && (
                        <div className="space-y-4 animate-fade-in-up pt-8 md:pt-10">
                            {currentUser?.facilitatorRequestStatus === 'rejected' && (
                                <div className="mx-4 md:mx-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h3 className="text-red-800 dark:text-red-400 font-bold text-sm">Facilitator Request Rejected</h3>
                                            <p className="text-red-600 dark:text-red-300 text-xs">{currentUser.facilitatorRejectionReason || "Your ID may have been blurry or invalid."}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFacilitatorAuthInitialStep('request');
                                                setShowFacilitatorAuth(true);
                                            }}
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors border-none"
                                        >
                                            Resubmit ID
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="px-4 md:px-8 space-y-4">
                                <div className="space-y-1 mb-5 animate-fade-in-up">
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Discover Events</h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm md:max-w-none leading-relaxed">
                                        Explore popular events near you, browse by category, or check out some of the great community calendars.
                                    </p>
                                </div>


                                <SearchBar onSearch={setSearchQuery} events={events} onEventSelect={handleOpenEvent} />

                                {/* Quick Filters (All & Happening Now) */}
                                <div className="flex gap-2.5 animate-fade-in-up">
                                    <button
                                        onClick={() => setSelectedCategory('All')}
                                        className={`px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${selectedCategory === 'All' ? 'bg-primary-600 text-white shadow-primary-200' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setSelectedCategory('Happening Now')}
                                        className={`px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${selectedCategory === 'Happening Now' ? 'bg-primary-600 text-white shadow-primary-200' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${selectedCategory === 'Happening Now' ? 'bg-white' : 'bg-red-500'} animate-pulse`}></span>
                                        Happening Now
                                    </button>
                                </div>

                                {/* 3. Popular Events Section */}
                                {selectedCategory === 'All' && !searchQuery && !selectedDateFilter && (
                                    <div className="space-y-5 pt-2 animate-fade-in-up">
                                        <div className="flex items-center justify-between px-1">
                                            <div>
                                                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Popular Events</h2>
                                                <p className="text-xs font-semibold text-gray-400 mt-0.5">Bacoor</p>
                                            </div>
                                            <button className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-primary-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-all active:scale-95">
                                                View All
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 px-1">
                                            {[
                                                getDisplayEvents.find(e => e.name.toLowerCase().includes('sibuyas')),
                                                getDisplayEvents.find(e => e.name.toLowerCase().includes('camp sawi'))
                                            ].filter(Boolean).map((event: any) => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => handleOpenEvent(event)}
                                                    className="flex items-center gap-4 transition-all text-left group"
                                                >
                                                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 border border-gray-50 dark:border-gray-600 group-hover:scale-105 transition-transform">
                                                        {event.imageUrl ? (
                                                            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                                                                <Calendar size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1">
                                                            <Calendar size={11} className="text-primary-500" />
                                                            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {event.startTime}</span>
                                                        </div>
                                                        <h3 className="text-sm md:text-base font-extrabold text-gray-900 dark:text-white truncate mb-1 group-hover:text-primary-600 transition-colors">
                                                            {event.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1 text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                                            <MapPin size={10} className="flex-shrink-0 text-red-500 md:w-3 md:h-3" />
                                                            <span className="truncate">{event.venue}, {event.barangay}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Active Date Filter Indicator */}
                                {selectedDateFilter && (
                                    <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 p-3 rounded-xl animate-fade-in-up">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary-100 dark:bg-primary-800 rounded-lg text-primary-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                                                Events on {formatDisplayDate(selectedDateFilter)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={clearDateFilter}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}

                                {/* 3. Category Cards */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Categories</h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => scrollCategories('left')}
                                                className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                aria-label="Scroll left"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button
                                                onClick={() => scrollCategories('right')}
                                                className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                aria-label="Scroll right"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        ref={categoryScrollRef}
                                        className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x"
                                    >
                                        {CATEGORIES.map((cat, idx) => {
                                            const predefined = CATEGORY_DATA[cat];
                                            const customGradient = CUSTOM_CATEGORY_GRADIENTS[Math.max(0, idx - CATEGORIES.length) % CUSTOM_CATEGORY_GRADIENTS.length];
                                            const data = predefined || { bg: customGradient, subtitle: 'Custom', icon: Tag };
                                            const isSelected = selectedCategory === cat;
                                            const Icon = data.icon;

                                            return (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`relative min-w-[150px] md:min-w-[220px] h-[68px] md:h-[75px] rounded-[15px] p-3 text-left overflow-hidden transition-all transform active:scale-95 shadow-sm snap-start ${isSelected ? 'shadow-md opacity-100' : 'opacity-90 hover:opacity-100'} bg-gradient-to-br ${data.bg}`}
                                                >
                                                    {/* Background Pattern */}
                                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10"></div>
                                                        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10"></div>
                                                    </div>

                                                    <div className="relative z-10">
                                                        <h3 className="text-[14px] font-bold text-white leading-tight flex items-center gap-1">
                                                            {cat}
                                                        </h3>
                                                        <p className="text-[10px] text-white/80 mt-0.5 font-medium">{data.subtitle}</p>
                                                    </div>

                                                    <div className="absolute bottom-1.5 right-1.5 text-white z-10 drop-shadow-lg">
                                                        <Icon size={32} strokeWidth={2} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 4. Trending Heading */}
                                <div className="space-y-4">
                                    {selectedCategory === 'All' && !searchQuery && !selectedDateFilter && highlightedDisplayEvents.length > 0 && (
                                        <div className="mb-2">
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Highlights</h2>
                                            <HighlightsSlider events={highlightedDisplayEvents} onEventSelect={handleOpenEvent} />
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white pt-1">
                                        {selectedDateFilter ? `Events on ${formatDisplayDate(selectedDateFilter)}` :
                                            selectedCategory === 'All' ? 'Recommended for You' : selectedCategory}
                                    </h2>

                                    {/* 5. Event List */}
                                    {areEventsLoading ? (
                                        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
                                    ) : (
                                        <EventList events={finalDisplayEvents} onEventSelect={handleOpenEvent} onToggleSave={handleToggleSaveEvent} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'feed' && isStaff && (
                        <div className="animate-fade-in-up h-full flex flex-col pt-4 md:pt-6 px-2 md:px-6">
                            <AdminPanel
                                currentUser={currentUser!}
                                events={events}
                                onEventCreated={handleEventCreated}
                                onEventUpdated={handleEventUpdated}
                                onEventDeleted={handleEventDeleted}
                                onClose={handleCloseAllModals}
                            />
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="px-4 md:px-8 pt-8 md:pt-10 animate-fade-in-up">
                            <CalendarView
                                events={events.filter(e => {
                                    if (isStaff) {
                                        if (currentUser?.role === 'admin') return true;
                                        if (currentUser?.role === 'facilitator') return e.createdBy === currentUser.uid;
                                    }
                                    const isPublished = e.status === 'published';
                                    const isScheduled = e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now();
                                    return isPublished || isScheduled;
                                })}
                                currentMonth={currentMonth}
                                setCurrentMonth={setCurrentMonth}
                                onDateSelect={handleDateSelect}
                            />
                        </div>
                    )}

                    {/* Calendar Events Popup */}
                    {showCalendarEventsPopup && calendarPopupDate && (
                        <DateEventsModal
                            date={calendarPopupDate}
                            events={events.filter(e => {
                                let isVisible = false;
                                if (isStaff) {
                                    if (currentUser?.role === 'admin') isVisible = true;
                                    else if (currentUser?.role === 'facilitator') isVisible = e.createdBy === currentUser.uid;
                                } else {
                                    const isPublished = e.status === 'published';
                                    const isScheduled = e.status === 'scheduled' && e.publishAt && e.publishAt <= Date.now();
                                    isVisible = isPublished || isScheduled;
                                }
                                return isVisible && new Date(e.date).toDateString() === calendarPopupDate.toDateString();
                            })}
                            onClose={handleCloseAllModals}
                            onEventClick={(event) => {
                                setShowCalendarEventsPopup(false);
                                handleOpenEvent(event);
                            }}
                            onToggleSave={handleToggleSaveEvent}
                            savedEventIds={currentUser?.savedEventIds || []}
                        />
                    )}

                    {activeTab === 'notifications' && (
                        <div className="px-4 md:px-8 pt-8 md:pt-10 animate-fade-in-up">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notifications</h2>
                            {currentUser ? (
                                <NotificationList
                                    userId={currentUser.uid}
                                    events={events}
                                    isStaff={currentUser.role === 'admin' || currentUser.role === 'facilitator'}
                                    isAdmin={currentUser.role === 'admin'}
                                    onEventSelect={(event, notifType) => handleOpenEvent(event, notifType)}
                                    onEventUpdated={handleEventUpdated}
                                    onNavigateToAdmin={(event, tab) => {
                                        setActiveTab('feed');
                                        setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent('admin-navigate', { detail: { event, tab } }));
                                        }, 300);
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sign In Required</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-4">
                                        Sign in to receive notifications and set reminders for your favourite events.
                                    </p>
                                    <button
                                        onClick={() => setIsGuest(false)}
                                        className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-full text-sm hover:bg-primary-700 transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'nearby' && (
                        <NearbyView
                            userLocation={userLocation}
                            isLocationLive={isLocationLive}
                            events={finalDisplayEvents}
                            onEventSelect={handleOpenEvent}
                            onToggleSave={handleToggleSaveEvent}
                            savedEventIds={currentUser?.savedEventIds || []}
                            onOpenScanner={() => setShowQRScanner(true)}
                        />
                    )}

                    {/* Removed activeTab === 'profile' rendering */}
                </main>
            </div>

            {/* Profile Panel */}
            {showProfilePanel && (
                <>
                    <div
                        className="hidden md:block fixed inset-0 z-[5005]"
                        onClick={() => setShowProfilePanel(false)}
                    />
                    <div className="fixed inset-0 pt-nav-safe pb-16 bg-white dark:bg-gray-900 z-[35] md:z-[5010] md:!pt-5 md:pb-0 md:top-[60px] md:right-4 md:bottom-auto md:left-auto md:w-80 md:max-h-[calc(100vh-140px)] md:shadow-2xl md:bg-white md:dark:bg-gray-900 md:rounded-2xl md:border border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <ProfileView
                            user={currentUser}
                            onLogout={handleLogout}
                            onLogin={() => setIsGuest(false)}
                            onShowSaved={handleOpenSavedEvents}
                            onEditPreferences={handleOpenPreferences}
                            onShowPermitDashboard={handleOpenPermitDashboard}
                            onShowNotificationSettings={handleOpenNotificationSettings}
                            onShowHelpSupport={handleOpenHelpSupport}
                            onShowTermsAndConditions={handleOpenTermsAndConditions}
                            onFacilitatorLogin={() => setShowFacilitatorAuth(true)}
                            theme={theme}
                            toggleTheme={toggleTheme}
                            onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
                            onProfileCardClick={() => {
                                setShowProfilePanel(false);
                                setShowEditProfileModal(true);
                            }}
                        />
                    </div>
                </>
            )}

            {showEditProfileModal && (
                <EditProfileModal
                    user={currentUser}
                    onClose={() => setShowEditProfileModal(false)}
                    onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
                />
            )}

            <BottomNav
                activeTab={activeTab as 'feed' | 'calendar' | 'nearby' | 'notifications'}
                onTabChange={handleTabChange}
                onOpenScanner={handleOpenScanner}
                onNotificationClick={handleOpenNotifications}
                pendingFacilitatorCount={pendingFacilitatorCount}
                unreadNotificationCount={unreadNotificationCount}
            />

            {/* Modals & Overlays */}
            {showFacilitatorAuth && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <FacilitatorAuthFlow
                        currentUser={currentUser}
                        onAuthSuccess={() => handleAuthSuccess(false)}
                        onClose={() => {
                            setShowFacilitatorAuth(false);
                            setFacilitatorAuthInitialStep('question');
                        }}
                        initialStep={facilitatorAuthInitialStep}
                    />
                </div>
            )}

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={handleCloseAllModals}
                    isSaved={currentUser?.savedEventIds?.includes(selectedEvent.id) || false}
                    onToggleSave={handleToggleSaveEvent}
                    reminder={currentUser?.reminders?.[selectedEvent.id]}
                    onSetReminder={handleSetReminder}
                    onCancelReminder={handleCancelReminder}
                    currentUserLocation={userLocation}
                    currentUser={currentUser}
                    isLocationLive={isLocationLive}
                    onToggleParticipation={handleToggleParticipation}
                />
            )}

            {/* Onboarding Modals */}
            <AnimatePresence>
                {!currentUser && !isGuest && (
                    <motion.div
                        key="onboarding-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm"
                    >
                        {onboardingStep === 'auth' || onboardingStep === 'completed' ? (
                            <Auth key="auth-component" onAuthSuccess={handleAuthSuccess} onGuestAccess={onboardingStep === 'completed' ? () => setIsGuest(true) : handleOnboardingSkip} onShowTermsAndConditions={handleOpenTermsAndConditions} />
                        ) : onboardingStep === 'preferences' ? (
                            <Preferences key="prefs-component" onSave={async (cats) => { handleOnboardingNext(); }} onSkip={handleOnboardingSkip} />
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manual Preference Modal */}
            {showPreferences && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Preferences onSave={handleSavePreferences} onSkip={handleCloseAllModals} initialPreferences={currentUser?.preferences} />
                </div>
            )}

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <QRScannerModal
                    onClose={handleCloseAllModals}
                    onScanSuccess={handleScanSuccess}
                />
            )}

            {/* Permission Manager */}
            {showPermissionManager && (
                <PermissionManager onComplete={() => setShowPermissionManager(false)} />
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl animate-fade-in-up">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Logout</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to log out of your account?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
