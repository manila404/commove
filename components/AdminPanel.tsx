
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EventType, User, UserRole } from '../types';
import { UserIcon, ShieldCheckIcon, ChevronLeftIcon, CalendarIcon, EnvelopeOpenIcon, ClockIcon } from '../constants';
import CreateEventForm from './CreateEventForm';
import AdminDashboardTabs from './AdminDashboardTabs';
import EventModal from './EventModal';
import { getAllUsers, updateUserRole, getEventParticipants, rejectFacilitatorRequest, deleteUser } from '../services/userService';
import { updateEventStatus } from '../services/eventService';
import { createNotification } from '../services/notificationService';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';
import { QRCodeSVG } from 'qrcode.react';

// Local Icons
const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const QRIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
);

interface AdminPanelProps {
  currentUser: User;
  events: EventType[];
  onEventCreated: (event: EventType) => void;
  onEventUpdated: (event: EventType) => void;
  onEventDeleted: (eventId: string) => Promise<boolean>;
  onClose: () => void;
}

const PESO_REQUIREMENTS = [
    { key: 'letterOfIntentUrl', label: '1. Letter of Intent' },
    { key: 'companyLogoUrl', label: '2. Company Logo' },
    { key: 'companyProfileUrl', label: '3. Company Profile' },
    { key: 'businessPermitUrl', label: '4. Business Permit' },
    { key: 'birRegistrationUrl', label: '5. BIR Registration' },
    { key: 'secDtiUrl', label: '6. SEC/DTI/CDA/DOLE Certification' },
    { key: 'philJobNetUrl', label: '7. PhilJobNet Registration' },
    { key: 'agencyDocumentsUrl', label: '8. Agency Documents (Optional)' },
    { key: 'noPendingCaseUrl', label: '9. Cert. of No Pending Case' },
];

const DEFAULT_REQUIREMENTS = [
    { key: 'letterOfIntentUrl', label: 'Letter of Intent' },
    { key: 'validIdUrl', label: 'Valid ID' },
    { key: 'businessPermitUrl', label: 'Business Permit' },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, events, onEventCreated, onEventUpdated, onEventDeleted, onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'create' | 'users' | 'requests'>('dashboard');
  const [requestedDashboardTab, setRequestedDashboardTab] = useState<'analytics' | 'events' | 'users' | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  // Track where the edit came from to handle "Back" correctly
  const [editSource, setEditSource] = useState<'list' | 'requests'>('list');

  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admins' | 'facilitators' | 'users'>('all');
  const [requestDepartmentFilter, setRequestDepartmentFilter] = useState('All');
  
  const [viewingDocument, setViewingDocument] = useState<{ url: string, label: string } | null>(null);
  const [viewingQRCode, setViewingQRCode] = useState<EventType | null>(null);
  const [newEventQRCode, setNewEventQRCode] = useState<EventType | null>(null); // One-time QR after facilitator creates event
  const [verifyingEvent, setVerifyingEvent] = useState<EventType | null>(null);
  const [viewingParticipantsEvent, setViewingParticipantsEvent] = useState<EventType | null>(null);
  const [previewingEvent, setPreviewingEvent] = useState<EventType | null>(null);
  const [participants, setParticipants] = useState<{ user: User, type: 'interested' | 'registered' | 'checkedIn' }[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  const formTopRef = useRef<HTMLDivElement>(null);

  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [schedulingEvent, setSchedulingEvent] = useState<EventType | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  useEffect(() => {
     const handleNavigate = (e: any) => {
         const { event, tab } = e.detail as { event: EventType; tab?: 'requests' | 'list' };
         if (tab === 'list') {
             // Navigate to dashboard and open the Events sub-tab
             setActiveTab('dashboard');
             setRequestedDashboardTab('events');
         } else {
             // Navigate to dashboard and open the Events sub-tab (requests panel is inside Events)
             setActiveTab('dashboard');
             setRequestedDashboardTab('events');
             // Also open the event preview modal
             if (event) {
                 setTimeout(() => setPreviewingEvent(event), 100);
             }
         }
     };
     // Support legacy event name too
     const handleLegacyPreview = (e: any) => {
         setActiveTab('dashboard');
         setRequestedDashboardTab('events');
         setTimeout(() => setPreviewingEvent(e.detail), 100);
     };
     window.addEventListener('admin-navigate', handleNavigate);
     window.addEventListener('admin-preview-event', handleLegacyPreview);
     return () => {
         window.removeEventListener('admin-navigate', handleNavigate);
         window.removeEventListener('admin-preview-event', handleLegacyPreview);
     };
  }, []);

  const canManageUsers = currentUser.role === 'admin';
  const isFacilitator = currentUser.role === 'facilitator';
  const dashboardTitle = currentUser.role === 'admin' ? 'Admin Analytics' : 'Facilitator Dashboard';

  const publishedEvents = events.filter(event => {
      const isPublished = event.status === 'published' || event.status === 'scheduled' || !event.status;
      if (currentUser.role === 'facilitator') {
          return isPublished && event.createdBy === currentUser.uid;
      }
      return isPublished;
  });
  
  // Filter Logic
  let baseRequests: EventType[] = [];
  if (currentUser.role === 'facilitator') {
      // Facilitators see their own pending/rejected/draft events so they can track or resubmit them
      baseRequests = events.filter(e => (e.status === 'pending' || e.status === 'rejected' || e.status === 'draft') && e.createdBy === currentUser.uid);
  } else if (currentUser.role === 'admin') {
      // Admins see all pending events to approve them, PLUS their own local drafts
      baseRequests = events.filter(e => e.status === 'pending' || (e.status === 'draft' && e.createdBy === currentUser.uid));
  }

  // Filter Requests based on Department and Search
  const filteredRequests = baseRequests.filter(event => {
      const matchesSearch = (event.name || '').toLowerCase().includes(eventSearchQuery.toLowerCase()) || 
                            (event.organizer || '').toLowerCase().includes(eventSearchQuery.toLowerCase());
      const matchesDepartment = requestDepartmentFilter === 'All' || event.department === requestDepartmentFilter;
      return matchesSearch && matchesDepartment;
  });

  const pendingCount = baseRequests.length;
  const [stats, setStats] = useState({ events: 0, users: 0, pending: 0 });

  // History sync for internal tabs
  const switchTab = (tab: 'dashboard' | 'list' | 'create' | 'users' | 'requests') => {
      if (tab !== activeTab) {
          try {
            window.history.pushState({ view: 'admin', tab: tab }, '');
          } catch (e) {
            console.warn("History push failed", e);
          }
          setActiveTab(tab);
          // Reset filters when switching
          if (tab === 'requests') {
              setEventSearchQuery('');
              setRequestDepartmentFilter('All');
          }
      }
  };

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
        const state = event.state;
        if (state?.view === 'admin') {
            setActiveTab(state.tab || 'dashboard');
            // FIX: Ensure editing state is cleared when navigating away from create/edit tab via back button
            if (state.tab !== 'create') {
                setEditingEvent(null);
            }
        }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleBack = () => {
    if (activeTab !== 'dashboard') {
        // Just go back to dashboard tab without using browser history back
        setActiveTab('dashboard');
    } else {
        // Exit the Admin Panel (this calls handleCloseAllModals in App.tsx)
        onClose();
    }
  };

  const fetchUsers = useCallback(async () => {
      // Both admins and facilitators need users for analytics calculations
      setIsLoadingUsers(true);
      setUserError('');
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (err: any) {
          console.error("Failed to fetch users:", err);
          setUserError('Failed to load users. Please check your connection.');
      } finally {
        setIsLoadingUsers(false);
      }
  }, []);

  useEffect(() => {
    const published = publishedEvents.length;
    const initData = async () => {
        // Both admins and facilitators need user data for analytics
        try {
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers);
            setStats({
                events: published,
                users: fetchedUsers.length,
                pending: pendingCount
            });
        } catch (err) {
            setStats(prev => ({ ...prev, events: published, pending: pendingCount }));
        }
    };
    initData();
  }, [events, pendingCount]);

  useEffect(() => {
      if (activeTab === 'users' && canManageUsers) {
          fetchUsers();
      } else if (activeTab === 'dashboard') {
          fetchUsers(); // Ensure analytics have latest data
      }
  }, [activeTab, canManageUsers, fetchUsers]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
      if (!canManageUsers) return;
      const originalUsers = [...users];
      const updatedUsers = users.map(u => 
          u.uid === userId ? { ...u, role: newRole, isAdmin: newRole === 'admin', facilitatorRequestStatus: newRole === 'facilitator' ? 'approved' : u.facilitatorRequestStatus } : u
      );
      setUsers(updatedUsers);
      try {
          await updateUserRole(userId, newRole);
      } catch (error: any) {
          setUsers(originalUsers); 
          setUserError("Failed to update user role.");
      }
  };

  const handleApproveFacilitator = async (userId: string) => {
      await handleRoleUpdate(userId, 'facilitator');
      const user = users.find(u => u.uid === userId);
      if (user) {
          await createNotification(
              userId,
              'system',
              'Facilitator Access Approved',
              'Congratulations! Your request for facilitator access has been approved. You can now access the LGU Dashboard.',
              undefined
          ).catch(console.error);
      }
      showAlert('Approved', "User is now a facilitator.", 'success');
  };

  const handleRejectFacilitator = async (userId: string) => {
      const reason = window.prompt("Enter rejection reason (e.g. Blurry ID, Invalid Document):");
      if (reason === null) return; // User cancelled
      
      const originalUsers = [...users];
      const updatedUsers = users.map(u => 
          u.uid === userId ? { ...u, facilitatorRequestStatus: 'rejected' as const, facilitatorRejectionReason: reason } : u
      );
      setUsers(updatedUsers);
      try {
          await rejectFacilitatorRequest(userId, reason);
          const user = users.find(u => u.uid === userId);
          if (user) {
              await createNotification(
                  userId,
                  'event_rejected',
                  'Facilitator Access Rejected',
                  `Your request for facilitator access was not approved at this time. Reason: ${reason}`,
                  undefined
              ).catch(console.error);
          }
          showAlert('Rejected', "Facilitator request rejected.", 'info');
      } catch (error) {
          setUsers(originalUsers);
          showAlert('Error', "Failed to reject request.", 'error');
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (!canManageUsers) return;
      showConfirm(
          "Delete User",
          "Are you sure you want to delete this user? This action cannot be undone.",
          async () => {
              const originalUsers = [...users];
              setUsers(users.filter(u => u.uid !== userId));
              try {
                  await deleteUser(userId);
                  showAlert('Deleted', "User has been deleted successfully.", 'success');
              } catch (error) {
                  setUsers(originalUsers);
                  showAlert('Error', "Failed to delete user.", 'error');
              }
          }
      );
  };

  const handleSuccess = (event: EventType) => {
    if (editingEvent) {
        onEventUpdated(event);
        setEditingEvent(null);
        switchTab(editSource); 
    } else {
        onEventCreated(event);
        // Facilitators get a one-time QR download modal after creating an event.
        // Admins do NOT get this popup (they can access QR codes from the Events table at any time).
        if (currentUser.role === 'facilitator') {
            setNewEventQRCode(event);
        }
    }
  };

  const handleEditEvent = (event: EventType, source: 'list' | 'requests') => {
      setEditingEvent(event);
      setEditSource(source);
      switchTab('create');
      setTimeout(() => {
          if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleCancelEdit = () => {
      if (editingEvent) {
          switchTab(editSource);
      } else {
          switchTab('dashboard');
      }
      setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    showConfirm('Delete Event?', 'This action cannot be undone.', async () => {
      const success = await onEventDeleted(eventId);
      if (success && editingEvent?.id === eventId) {
          switchTab(editSource);
          setEditingEvent(null);
      }
    }, 'error');
  };

  const handleApprove = async (event: EventType) => {
      try {
          const nextStatus = currentUser.role === 'admin' ? 'published' : 'reviewed';
          const msg = currentUser.role === 'admin' ? "Event Published!" : "Event Forwarded to Admin!";
          
          await updateEventStatus(event.id, nextStatus);
          onEventUpdated({ ...event, status: nextStatus, rejectionReason: undefined });
          
          if (event.createdBy) {
              const isApproved = nextStatus === 'published';
              const statusLabel = isApproved ? 'Approved & Published' : 'Reviewed';
              const body = isApproved 
                  ? `Your created event "${event.name}" has been approved by the admin.`
                  : `Your request for ${event.name} has been reviewed by the Facilitator and forwarded to the Admin.`;
                  
              createNotification(
                  event.createdBy,
                  'event_approved',
                  `Event ${statusLabel}`,
                  body,
                  event.id
              ).catch(e => console.error("Could not notify creator on approval", e));

              if (isApproved) {
                  // Notify Admin
                  createNotification(
                      currentUser.uid,
                      'event_approved',
                      'Event Published',
                      'You have published an facilitator event.',
                      event.id
                  ).catch(e => console.error("Could not notify admin on approval", e));
              }
          }
          
          showAlert('Success', `${msg}: ${event.name}`, 'success');
      } catch (e) {
          showAlert('Error', "Failed to update event status.", 'error');
      }
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingEvent || !scheduledDateTime) return;
    try {
        const publishAt = new Date(scheduledDateTime).getTime();
        if (isNaN(publishAt)) {
            showAlert('Error', 'Invalid date/time selected.', 'error');
            return;
        }

        await updateEventStatus(schedulingEvent.id, 'scheduled', undefined, publishAt);
        onEventUpdated({ ...schedulingEvent, status: 'scheduled', publishAt });

        if (schedulingEvent.createdBy) {
            createNotification(
                schedulingEvent.createdBy,
                'event_approved',
                'Event Scheduled',
                `Your event "${schedulingEvent.name}" has been reviewed and scheduled to go public on ${new Date(publishAt).toLocaleString()}.`,
                schedulingEvent.id
            ).catch(e => console.error("Could not notify creator on scheduling", e));
        }

        setSchedulingEvent(null);
        setScheduledDateTime('');
        showAlert('Scheduled', `Event scheduled for ${new Date(publishAt).toLocaleString()}`, 'success');
    } catch (e) {
        console.error(e);
        showAlert('Error', "Failed to schedule event.", 'error');
    }
  };

  const handleRejectClick = (eventId: string) => {
      setRejectingEventId(eventId);
      setRejectionReason('');
  };

  const handleConfirmReject = async () => {
      if (!rejectingEventId) return;
      try {
          await updateEventStatus(rejectingEventId, 'rejected', rejectionReason);
          const event = events.find(e => e.id === rejectingEventId);
          if (event) {
              onEventUpdated({ ...event, status: 'rejected', rejectionReason });
              
              if (event.createdBy) {
                  createNotification(
                      event.createdBy,
                      'event_rejected',
                      'Event Rejected',
                      `Your request for ${event.name} was rejected. Reason: ${rejectionReason || 'No reason provided.'}`,
                      event.id
                  ).catch(e => console.error("Could not notify creator on rejection", e));
              }
          }
          setRejectingEventId(null);
          showAlert('Disapproved', "Event has been disapproved.", 'info');
      } catch (e) {
          showAlert('Error', "Failed to reject event.", 'error');
      }
  };

  const handleViewParticipants = async (event: EventType) => {
      setViewingParticipantsEvent(event);
      setIsLoadingParticipants(true);
      try {
          const data = await getEventParticipants(event.id);
          setParticipants(data);
      } catch (e) {
          showAlert('Error', "Failed to load participants.", 'error');
      } finally {
          setIsLoadingParticipants(false);
      }
  };

  const downloadQRCode = (eventForQR?: EventType | null, svgId?: string) => {
      const targetEvent = eventForQR ?? viewingQRCode;
      const targetSvgId = svgId ?? 'admin-event-qr-code';
      if (!targetEvent) return;
      const svg = document.getElementById(targetSvgId);
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const pngFile = canvas.toDataURL('image/png');
              const downloadLink = document.createElement('a');
              const safeName = targetEvent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              downloadLink.download = `QR_${safeName}.png`;
              downloadLink.href = pngFile;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
          }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const filteredEvents = publishedEvents.filter(event => {
      const categories = Array.isArray(event.category) ? event.category.join(' ') : (event.category || '');
      return ((event.name || '') + (event.venue || '') + categories).toLowerCase().includes(eventSearchQuery.toLowerCase());
  });

  const filteredUsers = users.filter(user => {
      const userName = user.name || '';
      const userEmail = user.email || '';
      const searchMatch = (userName + userEmail).toLowerCase().includes(userSearchQuery.toLowerCase());
      
      if (userFilter === 'admins') return searchMatch && user.role === 'admin';
      if (userFilter === 'facilitators') return searchMatch && user.role === 'facilitator';
      if (userFilter === 'users') return searchMatch && (!user.role || user.role === 'user');
      return searchMatch;
  });

  const renderChecklist = (event: EventType) => {
      const reqs = event.department === 'PESO Department' ? PESO_REQUIREMENTS : DEFAULT_REQUIREMENTS;
      
      return reqs.map((req) => {
          // @ts-ignore
          const url = event[req.key] as string;
          const isUploaded = !!url;
          
          return (
              <div key={req.key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isUploaded ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                          {isUploaded ? <CheckIcon className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>}
                      </div>
                      <div>
                          <p className={`text-sm font-medium ${isUploaded ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{req.label}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{isUploaded ? 'Uploaded' : 'Missing'}</p>
                      </div>
                  </div>
                  {isUploaded && (
                      <button 
                          onClick={() => setViewingDocument({ url, label: req.label })}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                      >
                          <EyeIcon className="w-3.5 h-3.5" />
                          View
                      </button>
                  )}
              </div>
          );
      });
  };

  const accessibleEvents = events.filter(event => {
      if (currentUser.role === 'facilitator') {
          return event.createdBy === currentUser.uid;
      }
      return true; // Admins see everything
  });

  const renderDashboard = () => (
      <div className="p-4 md:p-8 w-full max-w-5xl mx-auto animate-fade-in-up pb-24">
          <div className="mb-8 flex justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 tracking-tight">
                    Hello, {currentUser.name.split(' ')[0]}
                </h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Full overview of Commove analytics
                </p>
            </div>
            <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-full border-2 border-purple-200 overflow-hidden bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shadow-sm">
                    {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl || undefined} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <span>{currentUser.name.charAt(0)}</span>
                    )}
                </div>
                <div className="hidden md:flex gap-2 w-auto items-center">
                {(canManageUsers || isFacilitator) && (
                    <button 
                        onClick={fetchUsers}
                            disabled={isLoadingUsers}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-gray-500 hover:text-primary-600 transition-all active:scale-95 disabled:opacity-50"
                            title="Refresh Data"
                        >
                            {isLoadingUsers ? (
                                <div className="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                            ) : (
                                <RefreshIcon className="w-5 h-5" />
                            )}
                        </button>
                    )}
                    <button 
                        onClick={() => { setEditingEvent(null); switchTab('create'); }} 
                        className="w-auto justify-center bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all transform active:scale-[0.98] shadow-sm text-sm font-bold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Event
                    </button>
                </div>
            </div>
          </div>
          <div className="flex md:hidden gap-2 w-full items-center mb-6">
              <button 
                  onClick={() => { setEditingEvent(null); switchTab('create'); }} 
                  className="w-full justify-center bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all transform active:scale-[0.98] shadow-sm text-sm font-bold"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Event
              </button>
          </div>

        <AdminDashboardTabs 
            events={accessibleEvents} 
            users={users} 
            pendingRequests={filteredRequests} 
            onApprove={handleApprove} 
            onReject={handleRejectClick} 
            onEditEvent={(e) => handleEditEvent(e, 'list')} 
            onDeleteEvent={handleDeleteEvent} 
            onViewQRCode={(e) => setViewingQRCode(e)}
            onViewParticipants={handleViewParticipants}
            filteredUsers={filteredUsers}
            userSearchQuery={userSearchQuery}
            setUserSearchQuery={setUserSearchQuery}
            userFilter={userFilter}
            setUserFilter={setUserFilter}
            isLoadingUsers={isLoadingUsers}
            userError={userError}
            fetchUsers={fetchUsers}
            handleRoleUpdate={handleRoleUpdate}
            onApproveFacilitator={handleApproveFacilitator}
            onRejectFacilitator={handleRejectFacilitator}
            onDeleteUser={handleDeleteUser}
            canManageUsers={canManageUsers}
            onSchedule={(e) => {
                setSchedulingEvent(e);
                // Default to tomorrow same time
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                setScheduledDateTime(tomorrow.toISOString().slice(0, 16));
            }}
            onPreviewEvent={(e) => setPreviewingEvent(e)}
            initialTab={requestedDashboardTab}
            onInitialTabConsumed={() => setRequestedDashboardTab(undefined)}
        />
      </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300 flex flex-col">
      <main className="flex-1 w-full relative">
        {activeTab === 'dashboard' && renderDashboard()}

        <div className={`transition-all duration-300 h-full ${activeTab === 'dashboard' ? 'hidden' : 'block'}`}>
            {activeTab === 'create' && (
                <div className="w-full h-full animate-fade-in-up">
                    <div ref={formTopRef} />
                     <CreateEventForm 
                        onSuccess={handleSuccess} 
                        eventToEdit={editingEvent} 
                        onCancelEdit={handleCancelEdit} 
                        onDelete={handleDeleteEvent}
                        currentUser={currentUser}
                        isReviewing={editSource === 'requests'}
                    />
                </div>
            )}
        </div>
        
        {/* Verification Checklist Modal */}
        {verifyingEvent && (
            <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-3xl">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verification Checklist</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{verifyingEvent.department}</p>
                        </div>
                        <button onClick={() => setVerifyingEvent(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <XMarkIcon className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto">
                        <div className="space-y-3">
                            {renderChecklist(verifyingEvent)}
                        </div>
                    </div>
                    
                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl">
                        <button onClick={() => setVerifyingEvent(null)} className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            Close Checklist
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Scheduling Modal */}
        {schedulingEvent && (
            <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col animate-fade-in-up overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Publication</h3>
                        <button onClick={() => setSchedulingEvent(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <XMarkIcon className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Select when "{schedulingEvent.name}" should become visible to all residents.
                        </p>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Publish Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                        <button 
                            onClick={() => setSchedulingEvent(null)}
                            className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmSchedule}
                            disabled={!scheduledDateTime}
                            className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Document Viewer Modal */}
        {viewingDocument && (
            <div className="fixed inset-0 z-[6000] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setViewingDocument(null)}>
                <button 
                    className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => setViewingDocument(null)}
                >
                    <XMarkIcon className="w-8 h-8" />
                </button>
                
                <h3 className="text-white/90 font-bold text-lg mb-4 tracking-wide uppercase">{viewingDocument.label}</h3>
                
                <div 
                    className="relative max-w-full max-h-[85vh] overflow-auto flex items-center justify-center"
                    onClick={e => e.stopPropagation()}
                >
                    <img 
                        src={viewingDocument.url || undefined} 
                        alt={viewingDocument.label} 
                        className="max-w-full max-h-[80vh] object-contain rounded-md shadow-2xl" 
                    />
                </div>
                
                <p className="mt-4 text-white/50 text-xs">Tap anywhere outside to close</p>
            </div>
        )}

        {/* Preview Event Modal */}
        {previewingEvent && (
            <div className="fixed inset-0 z-[6000] flex animate-fade-in">
                <EventModal 
                    event={previewingEvent}
                    onClose={() => setPreviewingEvent(null)}
                    isSaved={false}
                    onToggleSave={() => {}}
                    reminder={undefined}
                    onSetReminder={() => {}}
                    onCancelReminder={() => {}}
                    currentUserLocation={{ lat: previewingEvent.lat, lng: previewingEvent.lng }}
                    currentUser={currentUser}
                    isLocationLive={false}
                    onToggleParticipation={() => {}}
                />
            </div>
        )}

        {/* Reject Event Modal */}
        {rejectingEventId && (
            <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setRejectingEventId(null)}>
                <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-fade-in-up">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reject Event</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please provide a reason for disapproval.</p>
                    <textarea
                        placeholder="e.g., Incomplete description..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 min-h-[100px] mb-4 text-gray-900 dark:text-white"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setRejectingEventId(null)} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleConfirmReject} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-colors">Reject Event</button>
                    </div>
                </div>
            </div>
        )}

        {/* QR Code Modal (Admin: view any event's QR from Events table) */}
        {viewingQRCode && (
            <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingQRCode(null)}>
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col items-center p-8 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setViewingQRCode(null)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">{viewingQRCode.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 text-center font-medium">Event QR Code</p>
                    
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <QRCodeSVG 
                            id="admin-event-qr-code"
                            value={`commove://event/${viewingQRCode.id}`} 
                            size={200} 
                            level="H"
                            includeMargin={true}
                        />
                    </div>
                    
                    <button 
                        onClick={() => downloadQRCode(viewingQRCode, 'admin-event-qr-code')}
                        className="w-full bg-[#7c3aed] text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:bg-[#6d28d9] transition-colors active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download QR Code
                    </button>
                </div>
            </div>
        )}

        {/* One-time QR Modal for Facilitators — shown immediately after creating an event */}
        {newEventQRCode && (
            <div className="fixed inset-0 z-[7000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col items-center p-8 animate-fade-in-up relative">
                    {/* Close */}
                    <button 
                        onClick={() => setNewEventQRCode(null)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    {/* Success badge */}
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">{newEventQRCode.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center font-medium">Event Created Successfully!</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-6 text-center leading-relaxed">Download your event's QR code now. You won't be able to access it from your dashboard.</p>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                        <QRCodeSVG 
                            id="facilitator-new-event-qr-code"
                            value={`commove://event/${newEventQRCode.id}`} 
                            size={200} 
                            level="H"
                            includeMargin={true}
                        />
                    </div>
                    
                    <button 
                        onClick={() => downloadQRCode(newEventQRCode, 'facilitator-new-event-qr-code')}
                        className="w-full bg-[#7c3aed] text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:bg-[#6d28d9] transition-colors active:scale-95 flex items-center justify-center gap-2 mb-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download QR Code
                    </button>
                    <button
                        onClick={() => setNewEventQRCode(null)}
                        className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Close (QR will not be saved here)
                    </button>
                </div>
            </div>
        )}

        {/* Participants Modal */}
        {viewingParticipantsEvent && (
            <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-3xl">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Event Participants</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{viewingParticipantsEvent.name}</p>
                        </div>
                        <button onClick={() => setViewingParticipantsEvent(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <XMarkIcon className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto flex-1">
                        {isLoadingParticipants ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Spinner />
                                <p className="text-sm text-gray-500">Loading participants...</p>
                            </div>
                        ) : participants.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No participants yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {participants.map((p, idx) => (
                                    <div key={p.user.uid || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden">
                                                {p.user.avatarUrl ? (
                                                    <img src={p.user.avatarUrl || undefined} alt={p.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <UserIcon className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{p.user.name}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.user.email}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                                            p.type === 'checkedIn' ? 'bg-emerald-100 text-emerald-600' :
                                            'bg-amber-100 text-amber-600'
                                        }`}>
                                            {p.type === 'checkedIn' ? 'Checked-In' : 'Interested'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl">
                        <button onClick={() => setViewingParticipantsEvent(null)} className="w-full py-3 bg-[#7c3aed] text-white font-bold rounded-xl hover:bg-[#6d28d9] transition-colors shadow-lg shadow-purple-500/20">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default AdminPanel;
