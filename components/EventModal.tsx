import React, { useState } from 'react';
import { Image as ImageIcon, ArrowLeft, Share2, Heart, Phone, MessageCircle, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventType, Reminder, User } from '../types';
import { LocationIcon, CalendarIcon, ClockIcon, BookmarkIcon, BellIcon, StarIcon, ShieldCheckIcon, formatDisplayDate } from '../constants';
import InteractiveMap from './InteractiveMap';
import { useAlert } from '../contexts/AlertContext';
import { usePermissions } from '../contexts/PermissionContext';
import { updateUserParticipation } from '../services/userService';
import { submitRegistration, subscribeToEventDoc } from '../services/eventService';
import { createNotification } from '../services/notificationService';
import type { Registration } from '../types';
import Spinner from './Spinner';
import { motion, AnimatePresence } from 'motion/react';
import CustomTimePicker from './CustomTimePicker';

interface EventModalProps {
  event: EventType;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (eventId: string) => void;
  isLiked: boolean;
  onToggleLike: (eventId: string) => void;
  reminder: Reminder | undefined;
  onSetReminder: (eventId: string, reminderOffset: string) => void;
  onCancelReminder: (eventId: string) => void;
  currentUserLocation: { lat: number; lng: number; accuracy?: number };
  currentUser: User | null;
  isLocationLive?: boolean;
  onToggleParticipation: (eventId: string, type: 'interested' | 'registered' | 'checkedIn') => void;
}

const EventModal: React.FC<EventModalProps> = ({ 
  event, 
  onClose, 
  isSaved, 
  onToggleSave, 
  isLiked,
  onToggleLike,
  reminder, 
  onSetReminder, 
  onCancelReminder, 
  currentUserLocation, 
  currentUser,
  isLocationLive = true,
  onToggleParticipation,
}) => {
  const { showAlert } = useAlert();
  const { permissions, requestNotifications } = usePermissions();
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(reminder?.reminderOffset.startsWith('specific:') ? 'specific-time' : (reminder?.reminderOffset || '1-hour'));
  const [specificTime, setSpecificTime] = useState(reminder?.reminderOffset.startsWith('specific:') ? reminder.reminderOffset.split(':')[1] : '09:00');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({ 
    name: currentUser?.name || '', 
    email: currentUser?.email || '', 
    phoneNumber: '' 
  });
  const [userReg, setUserReg] = useState<Registration | null>(null);
  const [isLoadingReg, setIsLoadingReg] = useState(false);
  const [liveApprovedCount, setLiveApprovedCount] = useState<number>(event.approvedCount ?? 0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const allPhotos = [event.imageUrl, ...(event.additionalImageUrls || [])].filter(Boolean);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subscribe to the live event document to get real-time approvedCount
  React.useEffect(() => {
    if (event.isPrivate) {
      const unsubscribe = subscribeToEventDoc(event.id, (liveEvent) => {
        if (liveEvent) setLiveApprovedCount(liveEvent.approvedCount ?? 0);
      });
      return () => unsubscribe();
    }
  }, [event.id, event.isPrivate]);

  // Derive the user's registration status directly from currentUser.registrationStatuses.
  // This requires NO Firestore collection queries — the data comes from the user document
  // which is already loaded in app state and updates in real-time via App.tsx's user subscription.
  React.useEffect(() => {
    if (!event.isPrivate || !currentUser) {
      setUserReg(null);
      return;
    }

    const saved = currentUser.registrationStatuses?.[event.id];
    if (saved) {
      // Build a minimal Registration object so the existing JSX works unchanged
      setUserReg({
        id: saved.registrationId,
        eventId: event.id,
        userId: currentUser.uid,
        name: currentUser.name || '',
        email: currentUser.email || '',
        status: saved.status,
        submittedAt: 0,
      });
    } else {
      setUserReg(null);
    }
  }, [event.id, event.isPrivate, currentUser?.uid, currentUser?.registrationStatuses]);

  const isInterested = currentUser?.interestedEventIds?.includes(event.id);
  const isCheckedIn = currentUser?.checkedInEventIds?.includes(event.id);
  const isResident = currentUser?.role === 'user';
  const isFacilitatorOrAdmin = currentUser?.role === 'facilitator' || currentUser?.role === 'admin';
  // True when all slots are filled with APPROVED participants — blocks new registration submissions
  const approvedCount = liveApprovedCount;
  const isEventFull = event.maxParticipants != null && approvedCount >= event.maxParticipants;

  const reminderOptions = [
      { value: '1-minute', label: '1 minute before (Test)' },
      { value: '30-minutes', label: '30 minutes before' },
      { value: '1-hour', label: '1 hour before' },
      { value: '2-hours', label: '2 hours before' },
      { value: '1-day', label: '1 day before' },
      { value: 'specific-time', label: 'At a preferred time...' },
  ];

  const handleSetReminderClick = async () => {
      let hasNativePermission = permissions.notifications === 'granted';
      
      if (permissions.notifications !== 'granted') {
          const success = await requestNotifications();
          if (success) {
              hasNativePermission = true;
          }
      }
      
      const offsetValue = reminderOffset === 'specific-time' ? `specific:${specificTime}` : reminderOffset;
      onSetReminder(event.id, offsetValue);
      setShowReminderModal(false);
      
      if (!hasNativePermission) {
          showAlert('In-App Reminder Set', 'Browser notifications are blocked, but you will still see this reminder in the app.', 'info');
      }
  };

  const handleOpenReminderModal = () => {
      setShowReminderModal(true);
  };

  const handleCancelReminderClick = () => {
      onCancelReminder(event.id);
      setShowReminderModal(false);
  };

  const handleCheckIn = async () => {
    if (!currentUser) return;
    if (isCheckedIn) return;
    
    if (event.isPrivate && (!userReg || userReg.status !== 'approved')) {
        showAlert("Check-in Failed", "You must be approved to check in to this private event.", "error");
        return;
    }

    try {
        const newCheckedInIds = [...(currentUser.checkedInEventIds || []), event.id];
        await updateUserParticipation(currentUser.uid, 'checkedIn', newCheckedInIds);
        onToggleParticipation(event.id, 'checkedIn'); // Update local state
        showAlert("Success", "You have successfully checked in!", "success");
    } catch (error) {
        showAlert("Error", "Failed to check in.", "error");
    }
  };

  const handleGetDirections = () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`;
      window.open(url, '_blank');
  };

  const checkIsLive = (date: string, startTime: string, endTime: string) => {
    if (!date || !startTime) return false;
    const now = new Date();
    const eventStart = new Date(`${date}T${startTime}`);
    
    // If end time is earlier than start time (e.g. 9PM to 1AM), it means the event ends the next day.
    let eventEnd = endTime ? new Date(`${date}T${endTime}`) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
    if (eventEnd < eventStart) {
        eventEnd.setDate(eventEnd.getDate() + 1);
    }
    
    return now >= eventStart && now <= eventEnd;
  };

  const isLive = checkIsLive(event.date, event.startTime, event.endTime);
  
  const getExistingReminderLabel = () => {
    if (!reminder) return null;
    if (reminder.reminderOffset.startsWith('specific:')) {
      const parts = reminder.reminderOffset.split(':');
      const h = parts[1];
      const m = parts[2];
      let hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `Reminder: ${hours}:${m} ${ampm}`;
    }
    const opt = reminderOptions.find(o => o.value === reminder.reminderOffset);
    return opt ? `Reminder: ${opt.label}` : 'Reminder Set';
  };

  const existingReminderLabel = getExistingReminderLabel();

  const renderDesktopContent = () => (
    <div className="p-1 space-y-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      {/* Header Image Carousel */}
      <div className="relative rounded-[10px] overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 aspect-video md:aspect-auto md:h-96 group">
        <AnimatePresence mode="wait">
          <motion.img
            key={activePhotoIndex}
            src={allPhotos[activePhotoIndex] || undefined}
            alt={`${event.name} - ${activePhotoIndex + 1}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>

        {allPhotos.length > 1 && (
          <>
            <button
              onClick={() => setActivePhotoIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setActivePhotoIndex(prev => (prev + 1) % allPhotos.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {allPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhotoIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activePhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}

        {!allPhotos.length && (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {isLive && (
          <div className="absolute bottom-0 left-0 w-full bg-red-600/90 text-white px-4 py-3 flex items-center justify-center animate-pulse backdrop-blur-sm z-10">
            <span className="w-2.5 h-2.5 bg-white rounded-full mr-2 shadow-[0_0_8px_white]"></span>
            <span className="font-black tracking-[0.2em] text-sm uppercase">Happening Now</span>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 space-y-8">
        {/* Category & Title */}
        <div className="space-y-2">
          <div className="mb-4">
            {(Array.isArray(event.category) ? event.category : [event.category]).map(cat => (
              <span key={cat} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-full shadow-md">
                {cat}
              </span>
            ))}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Event Details</p>
          <h2 className="text-4xl font-extrabold text-purple-600 dark:text-purple-400 leading-tight">{event.name}</h2>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-100 dark:border-purple-800/50">
                 <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                 <p className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                     Lead Office: <span className="text-purple-900 dark:text-purple-100">{event.organizer || 'Admin'}</span>
                 </p>
              </div>

              {isFacilitatorOrAdmin && event.priority && (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                      event.priority === 'urgent' ? 'bg-red-50 dark:bg-red-900/30 border-red-100 text-red-700' :
                      event.priority === 'average' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 text-orange-700' :
                      'bg-green-50 dark:bg-green-900/30 border-green-100 text-green-700'
                  }`}>
                      <p className="text-sm font-bold uppercase tracking-wider">
                          Priority: {event.priority}
                      </p>
                  </div>
              )}

              {isFacilitatorOrAdmin && event.requestedPublishDate && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                          Requested Publish: <span className="text-blue-900 dark:text-blue-100">{new Date(event.requestedPublishDate).toLocaleString()}</span>
                      </p>
                  </div>
              )}
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400">{formatDisplayDate(event.date, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <ClockIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400">{event.startTime} - {event.endTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <LocationIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-500 dark:text-gray-400">{event.city} City Hall</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Description</h3>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-sm md:text-base">
            {event.description}
          </p>
          {event.creatorUsername && (
            <p className="pt-4 text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em]">
              Lead Office: {event.creatorUsername.replace(/^@/, '').toUpperCase()}
            </p>
          )}
        </div>

        {/* Further Instructions */}
        {event.instructions && (
          <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Attendee Instructions</h4>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed whitespace-pre-line">{event.instructions}</p>
          </div>
        )}

        {/* Participation Block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Participation</h3>
            <p className={`text-xs font-black uppercase tracking-widest ${event.isPrivate ? 'text-orange-500' : 'text-purple-600'}`}>
              {event.isPrivate ? 'Private Event • Registration Required' : 'Public Event • Anyone Can Attend'}
            </p>
          </div>

          {event.isPrivate && event.maxParticipants !== undefined && event.maxParticipants !== null && (
            <div className={`p-3 rounded-xl border ${event.maxParticipants - approvedCount <= 0 ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'} text-center shadow-sm`}>
              <p className="font-bold text-sm">
                {event.maxParticipants - approvedCount <= 0 
                  ? 'Event is Full' 
                  : `${event.maxParticipants - approvedCount} slot${event.maxParticipants - approvedCount !== 1 ? 's' : ''} available out of ${event.maxParticipants}`}
              </p>
            </div>
          )}

          {isResident ? (
            // RESIDENT VIEW
            event.isPrivate ? (
              <div className="p-8 bg-purple-50 dark:bg-purple-900/20 rounded-[20px] border-2 border-dashed border-purple-200 dark:border-purple-800/50">
                {isLoadingReg ? (
                  <div className="flex justify-center p-4"><Spinner /></div>
                ) : userReg ? (
                  // User already has a registration — show their status
                  <div className={`p-6 rounded-2xl text-center shadow-sm border-2 ${
                    userReg.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' :
                    userReg.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' :
                    'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300'
                  }`}>
                    {userReg.status === 'pending' && (
                      <>
                        <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${isEventFull ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40'} flex items-center justify-center`}>
                          {isEventFull ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-base font-black mb-1 tracking-tight">{isEventFull ? 'Event is Full' : 'Request Pending'}</p>
                        <p className="text-sm font-medium opacity-80">
                          {isEventFull ? 'Unfortunately, all slots for this event have been filled.' : 'Your request is pending approval. The organizer will review it shortly.'}
                        </p>
                      </>
                    )}
                    {userReg.status === 'approved' && (
                      <>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-black mb-1 tracking-tight">You are already registered!</p>
                        <p className="text-sm font-medium opacity-80 mb-3">A slot has been assigned to you for this event.</p>
                        <button 
                          onClick={handleCheckIn}
                          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95"
                        >
                          {isCheckedIn ? '✓ Already Checked-In' : 'Check-In to Event'}
                        </button>
                      </>
                    )}
                    {userReg.status === 'rejected' && (
                      <>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-black mb-1 tracking-tight">Registration Not Approved</p>
                        <p className="text-sm font-medium opacity-80">Your registration for this event was not approved at this time.</p>
                      </>
                    )}
                  </div>
                ) : isEventFull ? (
                  // Event is full — no more registrations accepted
                  <div className="p-6 rounded-2xl text-center bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-base font-black text-gray-700 dark:text-gray-300 mb-1">Event is Full</p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All available slots have been filled. Registration is now closed.</p>
                  </div>
                ) : (
                  // No existing registration and slots available — show the form
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-purple-900 dark:text-purple-100 font-bold text-lg mb-1">Request to Join</p>
                      <p className="text-purple-600/60 dark:text-purple-400/60 text-xs font-medium uppercase tracking-tighter">Fill in your details below to register</p>
                    </div>
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" placeholder="Full Name" required
                          value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})}
                          className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:border-purple-500 outline-none transition-all"
                        />
                        <input 
                          type="tel" placeholder="Phone Number (Optional)"
                          value={regData.phoneNumber} onChange={e => setRegData({...regData, phoneNumber: e.target.value})}
                          className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:border-purple-500 outline-none transition-all"
                        />
                      </div>
                      <input 
                        type="email" placeholder="Email Address" required readOnly
                        value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:border-purple-500 outline-none transition-all cursor-not-allowed opacity-70"
                      />
                      <button 
                        type="submit" disabled={isRegistering || !currentUser}
                        className="w-full py-4 bg-purple-600 text-white font-black rounded-2xl shadow-xl shadow-purple-500/30 hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {isRegistering ? 'Submitting Request...' : 'Submit Registration Request'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              // Public Event - No Registration for Residents
              <div className="flex flex-col gap-4">
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-[20px] border border-gray-100 dark:border-gray-700 text-center">
                   <p className="text-gray-900 dark:text-white font-bold mb-1 italic opacity-70">"Anyone is welcome to attend this public event!"</p>
                </div>
                <button 
                  onClick={() => onToggleParticipation(event.id, 'interested')}
                  className={`w-full py-4 rounded-2xl border-2 font-black transition-all ${isInterested ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'}`}
                >
                  {isInterested ? '✓ Highlighted as Interested' : 'I am Interested In This Event'}
                </button>
              </div>
            )
          ) : (
            // ADMIN / FACILITATOR / GUEST VIEW
            <div className="flex gap-4">
              <button 
                onClick={handleCheckIn}
                className="flex-1 py-3.5 bg-purple-600 text-white font-bold rounded-[10px] shadow-lg hover:bg-purple-700 transition-all active:scale-95"
              >
                {isCheckedIn ? 'Checked-in' : 'Check-In Now (Staff)'}
              </button>
              <button 
                onClick={() => onToggleParticipation(event.id, 'interested')}
                className={`flex-1 py-3.5 rounded-[10px] border-2 font-bold transition-all ${isInterested ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-purple-600 text-purple-600 hover:bg-purple-700 hover:text-white'}`}
              >
                {isInterested ? 'Interested' : 'Interested?'}
              </button>
            </div>
          )}
        </div>

        {/* Location at a Glance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Location at a Glance</h3>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-[10px]">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live GPS</span>
               <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-[10px] shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Online</span>
               </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {event.venue}, {event.street}, {event.city}, {event.province || 'Philippines'}
          </p>
          <div className="rounded-[10px] overflow-hidden h-96 shadow-inner border border-gray-100 dark:border-gray-700">
            <InteractiveMap
              userLocation={currentUserLocation}
              events={[event]}
              isLocationLive={isLocationLive}
              centerOnEvent={{ lat: event.lat, lng: event.lng }}
            />
          </div>
        </div>

        {/* Get Directions & Actions */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Get Directions</p>
          <div className="flex gap-4">
            <button 
              onClick={handleGetDirections}
              className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-[10px] shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              Google Maps
            </button>
            <button 
              onClick={() => onToggleSave(event.id)}
              className="flex-1 py-3.5 bg-purple-600 text-white font-bold rounded-[10px] shadow-lg hover:bg-purple-700 transition-all"
            >
              {isSaved ? 'Unsave Event' : 'Save Event'}
            </button>
            <button 
              onClick={handleOpenReminderModal}
              className={`flex-1 py-3.5 rounded-[10px] border-2 font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                existingReminderLabel 
                  ? 'bg-green-600 border-green-600 text-white shadow-green-500/20 hover:bg-green-700' 
                  : 'bg-white border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-600'
              }`}
            >
              {existingReminderLabel ? (
                <>
                  <ShieldCheckIcon className="w-4 h-4 fill-white" />
                  <span>{existingReminderLabel}</span>
                </>
              ) : (
                <>
                  <BellIcon className="w-4 h-4" />
                  <span>Set Reminder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Removed inline reminder dropdown */}
      </div>
    </div>
  );

  const calculateAge = (birthday: string) => {
    const birthDate = new Date(birthday);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsRegistering(true);
    try {
      let age;
      if (currentUser.birthday) {
          age = calculateAge(currentUser.birthday);
      }
      
      const newReg = await submitRegistration({
        eventId: event.id,
        userId: currentUser.uid,
        name: regData.name,
        email: regData.email,
        phoneNumber: regData.phoneNumber,
        status: 'pending',
        age: age,
        gender: currentUser.sex || 'Not specified'
      });
      setUserReg(newReg);
      showAlert("Registration Submitted", "Your registration is pending approval.", "success");
      
      // Notify the event creator
      if (event.createdBy) {
        await createNotification(
          event.createdBy,
          'event_registration',
          'New Event Registration',
          `${currentUser.name} has registered for "${event.name}". Please review the application.`,
          event.id
        );
      }
    } catch (error: any) {
      showAlert("Registration Failed", error.message || "Could not submit registration.", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  const renderContent = () => (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Category & Title */}
      <div className="space-y-1.5">
        <div className="mb-3 flex flex-wrap gap-2">
          {(Array.isArray(event.category) ? event.category : [event.category]).map(cat => (
            <span key={cat} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md">
              {cat}
            </span>
          ))}
        </div>
        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Event Details</p>
        <h2 className="text-2xl md:text-4xl font-extrabold text-[#2A2A2A] dark:text-white leading-tight">{event.name}</h2>
      </div>

      {/* Meta Info Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight mb-0.5">Date</span>
            <span className="text-sm md:text-base font-semibold md:font-bold text-[#2A2A2A] dark:text-white leading-tight">{event.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
            <ClockIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight mb-0.5">Time</span>
            <span className="text-sm md:text-base font-semibold md:font-bold text-[#2A2A2A] dark:text-white leading-tight">{event.startTime} - {event.endTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
            <LocationIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight mb-0.5">Location</span>
            <span className="text-sm md:text-base font-semibold md:font-bold text-[#2A2A2A] dark:text-white leading-tight">{event.city} City Hall</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Description</h3>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-sm md:text-base">
          {event.description}
        </p>
        {event.creatorUsername && (
          <p className="pt-2 text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
            Lead Office: {event.creatorUsername.replace(/^@/, '').toUpperCase()}
          </p>
        )}
      </div>

      {/* Further Instructions */}
      {event.instructions && (
        <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Attendee Instructions</h4>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed whitespace-pre-line">{event.instructions}</p>
        </div>
      )}

      {/* Participation Block */}
      <div className="space-y-3">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Participation</h3>
        <p className={`text-xs font-bold uppercase tracking-widest ${event.isPrivate ? 'text-orange-500' : 'text-purple-600'}`}>
          {event.isPrivate ? 'Private Event • Registration Required' : 'Public Event • Anyone Can Attend'}
        </p>

        {event.isPrivate && event.maxParticipants !== undefined && event.maxParticipants !== null && (
          <div className={`p-2.5 rounded-xl border ${event.maxParticipants - approvedCount <= 0 ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'} text-center shadow-sm`}>
            <p className="font-bold text-sm">
              {event.maxParticipants - approvedCount <= 0 
                ? 'Event is Full' 
                : `${event.maxParticipants - approvedCount} slot${event.maxParticipants - approvedCount !== 1 ? 's' : ''} available out of ${event.maxParticipants}`}
            </p>
          </div>
        )}
        
        {isResident ? (
          // RESIDENT VIEW
          event.isPrivate ? (
            <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800">
              {isLoadingReg ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : userReg ? (
                // User already has a registration — show their current status
                <div className={`p-4 rounded-2xl text-center shadow-sm border ${
                  userReg.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' :
                  userReg.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' :
                  'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300'
                }`}>
                  {userReg.status === 'pending' && (
                    <>
                      <p className="font-black mb-1">{isEventFull ? 'Event is Full' : 'Request Pending'}</p>
                      <p className="text-xs font-medium opacity-80">
                        {isEventFull ? 'Unfortunately, all slots have been filled.' : 'Your request is pending approval from the organizer.'}
                      </p>
                    </>
                  )}
                  {userReg.status === 'approved' && (
                    <>
                      <p className="font-black mb-1">You are already registered!</p>
                      <p className="text-xs font-medium opacity-80 mb-3">A slot has been assigned to you for this event.</p>
                      <button 
                        onClick={handleCheckIn}
                        className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all active:scale-95"
                      >
                        {isCheckedIn ? '✓ Checked-In' : 'Check-In Now'}
                      </button>
                    </>
                  )}
                  {userReg.status === 'rejected' && (
                    <>
                      <p className="font-black mb-1">Registration Not Approved</p>
                      <p className="text-xs font-medium opacity-80">Your registration was not approved at this time.</p>
                    </>
                  )}
                </div>
              ) : isEventFull ? (
                // Event is full — block new registrations
                <div className="p-4 rounded-2xl text-center bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="font-black text-gray-700 dark:text-gray-300 text-sm mb-1">Event is Full</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">All available slots have been filled. Registration is now closed.</p>
                </div>
              ) : (
                // No registration yet and slots available — show the form
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <p className="text-center text-sm font-bold text-purple-800 dark:text-purple-200 mb-1">Request to Attend</p>
                  <input 
                    type="text" placeholder="Full Name" required
                    value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})}
                    className="w-full p-3 text-sm border-2 border-white dark:border-gray-800 rounded-xl dark:bg-gray-800 shadow-sm focus:border-purple-500 outline-none transition-all"
                  />
                  <input 
                    type="email" placeholder="Email Address" required readOnly
                    value={regData.email}
                    className="w-full p-3 text-sm border-2 border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm outline-none cursor-not-allowed opacity-70"
                  />
                  <input 
                    type="tel" placeholder="Phone Number (Optional)"
                    value={regData.phoneNumber} onChange={e => setRegData({...regData, phoneNumber: e.target.value})}
                    className="w-full p-3 text-sm border-2 border-white dark:border-gray-800 rounded-xl dark:bg-gray-800 shadow-sm focus:border-purple-500 outline-none transition-all"
                  />
                  <button 
                    type="submit" disabled={isRegistering || !currentUser}
                    className="w-full py-3 bg-purple-600 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isRegistering ? 'Submitting Request...' : 'Request to Attend'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            // Public Event - Mobile Resident View
            <div className="flex flex-col gap-2.5">
               <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-gray-900 dark:text-white font-bold text-sm italic opacity-70">Registration not required for public events.</p>
               </div>
               <button 
                onClick={() => onToggleParticipation(event.id, 'interested')}
                className={`w-full py-3 md:py-4 rounded-2xl border-2 font-black transition-all ${isInterested ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 border-purple-600 text-purple-600 hover:bg-purple-700 hover:text-white'}`}
              >
                {isInterested ? '✓ I am Interested' : 'Express Interest'}
              </button>
            </div>
          )
        ) : (
          // ADMIN / FACILITATOR / GUEST MOBILE VIEW
          <div className="flex flex-col gap-2.5">
            <button 
              onClick={handleCheckIn}
              className="w-full py-2.5 md:py-3.5 bg-purple-600 text-white text-sm md:text-base font-bold rounded-2xl shadow-lg hover:bg-purple-700 transition-all active:scale-95"
            >
              {isCheckedIn ? '✓ Checked-in (Staff)' : 'Check-In Now (Staff)'}
            </button>
            <button 
              onClick={() => onToggleParticipation(event.id, 'interested')}
              className={`w-full py-2.5 md:py-3.5 rounded-2xl border-2 text-sm md:text-base font-bold transition-all ${isInterested ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-purple-600 text-purple-600 hover:bg-purple-700 hover:text-white'}`}
            >
              {isInterested ? 'Interested' : 'Interested?'}
            </button>
          </div>
        )}
      </div>

      {/* Location at a Glance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Location at a Glance</h3>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 md:px-3 md:py-1.5 rounded-xl">
             <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live GPS</span>
             <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300">Online</span>
             </div>
          </div>
        </div>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
          {event.venue}, {event.street}, {event.city}, {event.province || 'Philippines'}
        </p>
        <div className="rounded-2xl md:rounded-[2rem] overflow-hidden h-48 md:h-64 shadow-inner border border-gray-100 dark:border-gray-700">
          <InteractiveMap
            userLocation={currentUserLocation}
            events={[event]}
            isLocationLive={isLocationLive}
            centerOnEvent={{ lat: event.lat, lng: event.lng }}
          />
        </div>
      </div>

      {/* Get Directions & Actions */}
      <div className="space-y-2.5">
        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Get Directions</p>
        <div className="flex flex-col gap-2.5">
          <button 
            onClick={handleGetDirections}
            className="w-full py-2.5 md:py-3.5 bg-green-600 text-white text-sm md:text-base font-bold rounded-2xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            Google Maps
          </button>
          <button 
            onClick={() => onToggleSave(event.id)}
            className="w-full py-2.5 md:py-3.5 bg-purple-600 text-white text-sm md:text-base font-bold rounded-2xl shadow-lg hover:bg-purple-700 transition-all"
          >
            {isSaved ? 'Unsave Event' : 'Save Event'}
          </button>
          <button 
            onClick={handleOpenReminderModal}
            className={`w-full py-2.5 md:py-3.5 rounded-2xl border-2 text-sm md:text-base font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
              existingReminderLabel 
                ? 'bg-green-600 border-green-600 text-white shadow-green-500/20' 
                : 'bg-white border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-600'
            }`}
          >
            {existingReminderLabel ? (
              <>
                <ShieldCheckIcon className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                <span>{existingReminderLabel}</span>
              </>
            ) : (
              <>
                <BellIcon className="w-4 h-4 md:w-5 md:h-5" />
                <span>Set Reminder</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Removed inline reminder dropdown */}
    </div>
  );

  const renderReminderModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[7000] flex items-center justify-center p-4"
      onClick={() => setShowReminderModal(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600">
                <BellIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {reminder ? 'Manage Reminder' : 'Set Reminder'}
              </h3>
            </div>
            <button 
              onClick={() => setShowReminderModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Reminder Time</label>
              <div className="relative group">
                <select 
                  value={reminderOffset}
                  onChange={(e) => setReminderOffset(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-gray-700 dark:text-gray-200 outline-none transition-all appearance-none"
                >
                  {reminderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {reminderOffset === 'specific-time' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                <CustomTimePicker
                  value={specificTime}
                  onChange={setSpecificTime}
                  label="Select exact time"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={handleSetReminderClick}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {reminder ? 'Update Reminder' : 'Set Reminder'}
            </button>
            
            {reminder && (
              <button 
                onClick={handleCancelReminderClick}
                className="w-full py-4 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Cancel Reminder
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  if (!isMobile) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[6000] p-4 md:p-20"
        onClick={onClose}
      >
        <div className="relative w-full max-w-4xl">
          <button 
            onClick={onClose}
            className="absolute top-0 -right-14 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all z-[7000] shadow-lg border border-white/5"
          >
            <X className="h-6 w-6" />
          </button>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-[10px] shadow-2xl w-full max-h-[90vh] overflow-y-auto relative custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {renderDesktopContent()}
          </motion.div>
        </div>

        <AnimatePresence>
          {showReminderModal && renderReminderModal()}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-white dark:bg-gray-900 z-[6000] overflow-y-auto flex flex-col"
      >
        {/* Header Image Section */}
        <div className="relative w-full h-[45vh] flex-shrink-0 group">
          <AnimatePresence mode="wait">
            <motion.img
              key={activePhotoIndex}
              src={allPhotos[activePhotoIndex] || undefined}
              alt={`${event.name} - ${activePhotoIndex + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {allPhotos.length > 1 && (
            <>
              {/* Left/Right controls for mobile/overlay */}
              <button
                onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(prev => (prev + 1) % allPhotos.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {allPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activePhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {!allPhotos.length && (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-400" />
            </div>
          )}
          
          {/* Top Actions */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
            
            <div className="flex gap-2">
              <button className="hidden md:flex w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full items-center justify-center shadow-lg hover:bg-white transition-colors">
                <Share2 className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
              <button 
                onClick={() => onToggleLike(event.id)}
                className="w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white'}`} />
              </button>
            </div>
          </div>

          {/* Teaser Video Overlay */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-gray-900 border-b-[6px] border-b-transparent ml-1" />
              </div>
              <span className="text-white font-medium text-sm">Teaser Video</span>
            </div>
          </div>

          {isLive && (
            <div className="absolute bottom-12 left-0 w-full bg-red-600/90 text-white px-4 py-2 flex items-center justify-center animate-pulse backdrop-blur-sm z-10">
              <span className="w-2.5 h-2.5 bg-white rounded-full mr-2"></span>
              <span className="font-bold tracking-wider text-sm">HAPPENING NOW</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="relative -mt-10 flex-1 bg-white dark:bg-gray-900 rounded-t-[40px] shadow-2xl p-6">
          {/* Pull Indicator */}
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />
          
          {renderContent()}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="hidden md:flex fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 items-center justify-between z-[6001]">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total Price</p>
            <p className="text-2xl font-bold text-orange-500">$30.00 <span className="text-gray-400 text-sm font-normal">/person</span></p>
          </div>
          <button 
            onClick={event.isPrivate ? undefined : handleCheckIn}
            className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-3xl shadow-xl shadow-orange-500/20 transition-all active:scale-95"
          >
            Book Now
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showReminderModal && renderReminderModal()}
      </AnimatePresence>
    </>
  );
};

export default EventModal;
