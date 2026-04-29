
export type UserRole = 'admin' | 'facilitator' | 'user';
export type EventStatus = 'published' | 'pending' | 'reviewed' | 'rejected' | 'scheduled' | 'draft' | 'cancelled';

export interface EventType {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  city: string;
  venue: string;
  description: string;
  imageUrl: string;
  additionalImageUrls?: string[];
  lat: number;
  lng: number;
  category: string[];
  createdByAdmin?: boolean;
  province?: string;
  street?: string;
  
  // New fields for workflow
  status?: EventStatus;
  rejectionReason?: string;
  createdBy?: string; // User UID
  organizer?: string;
  submittedAt?: number; // Timestamp of submission
  maxParticipants?: number | null; // New: Capacity limit
  approvedCount?: number; // New: Count of approved participants to avoid querying registrations
  isPrivate?: boolean; // New: Private events require registration and approval
  publishAt?: number | null; // New: Schedule when to be in public
  priority?: 'urgent' | 'average' | 'less_prio'; // Admin urgency indicator
  requestedPublishDate?: string | null; // Facilitator's requested specific timeframe form string
  instructions?: string | null; // Optional attendee guidance/instructions shown in event detail
  timezone?: string; // New field for regional time tracking
  
  // Recurrence Fields
  isRecurrent?: boolean;
  recurrenceGroupId?: string;
  recurrenceRule?: {
    frequency: 'weekly' | 'monthly_date' | 'monthly_day';
    interval: number;
    count: number;
    originalDate: string;
  };

  // Permit Request Specifics
  department?: string;
  letterOfIntentUrl?: string;
  validIdUrl?: string;
  businessPermitUrl?: string;

  // PESO Specific Requirements
  companyLogoUrl?: string;
  companyProfileUrl?: string;
  birRegistrationUrl?: string;
  secDtiUrl?: string;
  philJobNetUrl?: string;
  agencyDocumentsUrl?: string;
  noPendingCaseUrl?: string;
  creatorUsername?: string; // Cache creator's username for branding
}

export interface DisplayEventType extends EventType {
  isNearby: boolean;
  isPreferred: boolean;
  isSaved: boolean;
  isLive: boolean;
  distance?: number;
  relevanceScore?: number; // Added for KNN Ranking
}

export interface User {
  uid: string;
  name: string;
  email: string;
  isAdmin?: boolean; // Kept for backward compat
  role?: UserRole;   // New role field
  facilitatorRequestStatus?: 'pending' | 'approved' | 'rejected'; // New: Facilitator approval workflow
  facilitatorRejectionReason?: string;
  idUrl?: string;    // New: Government ID for facilitator verification
  faceUrl?: string;  // New: Face verification for facilitator
  birthday?: string; // YYYY-MM-DD format
  sex?: string;      // 'Male', 'Female', or custom string
  username?: string; // @username
  address?: string;
  avatarUrl?: string;
  homeLat?: number;
  homeLng?: number;
  savedEventIds?: string[];
  likedEventIds?: string[];
  interestedEventIds?: string[]; // New: Participation
  checkedInEventIds?: string[];  // New: Participation
  viewedEventIds?: string[]; // New: Track tapped events for algorithm
  reminders?: Record<string, Reminder>;
  preferences?: string[];
  registrationStatuses?: Record<string, { status: 'pending' | 'approved' | 'rejected'; registrationId: string }>;
  notificationSettings?: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    upcomingReminders: boolean;
    newEvents: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    emailFrequency?: 'instant' | 'daily' | 'weekly';
    vibrationEnabled?: boolean;
  };
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  status: RegistrationStatus;
  submittedAt: number;
  age?: number;
  gender?: string;
}

export interface Reminder {
  eventId: string;
  remindAt: number; // timestamp
  reminderOffset: string; // '30-minutes', '1-hour', etc.
}

export type NotificationType =
  | 'reminder'       // user-set reminder for an event
  | 'event_upcoming' // auto: 1 hour before a saved event
  | 'event_tomorrow' // auto: 24 hours before a saved event
  | 'event_approved' // admin approved a permit request
  | 'event_rejected' // admin rejected a permit request
  | 'event_registration' // user registered for an event
  | 'event_created'      // facilitator created an event (notifies admin)
  | 'event_feedback'     // request for feedback after event ends
  | 'event_updated'      // admin updated an event's schedule/details
  | 'event_cancelled'    // admin cancelled a published event
  | 'facilitator_request' // user applied to be a facilitator
  | 'system';        // generic system message

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string;   // linked event (optional)
  isRead: boolean;
  createdAt: number;  // Unix timestamp (ms)
}

export interface EventFeedback {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
}
