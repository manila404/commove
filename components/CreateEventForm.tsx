
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, MapPin, X, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { EventType, User } from '../types';
import InteractiveMap from './InteractiveMap';
import { addEvent, updateEvent } from '../services/eventService';
import { getAdmins } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { BACOOR_BARANGAYS, CATEGORIES, BARANGAY_COORDS, BACOOR_STREETS, BARANGAY_STREETS, RECOMMENDED_VENUES } from '../constants';
import { resizeImage } from '../services/imageUtils';
import { geocodeLocation, searchAddressGeoapify, reverseGeocode } from '../services/osmService';
import Spinner from './Spinner';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import EventDateTimePicker from './EventDateTimePicker';
import { useAlert } from '../contexts/AlertContext';

interface CreateEventFormProps {
  onSuccess: (event: EventType) => void;
  eventToEdit?: EventType | null;
  onCancelEdit?: () => void;
  onDelete?: (eventId: string) => void;
  currentUser: User;
  isReviewing?: boolean;
}

const SAMPLE_LOCATIONS = [
  { name: 'Bacoor', address: 'Cavite', type: 'city', lat: 14.4534, lng: 120.9442 },
  { name: 'Bacoor City Hall', address: 'Bacoor Blvd, Bacoor, Cavite, Philippines', type: 'poi', lat: 14.4312, lng: 120.9458 },
  { name: 'Bacoor Coliseum', address: 'Molino III, Bacoor, Cavite', type: 'poi', lat: 14.3980, lng: 120.9760 },
  { name: 'Bacoor National High School - Main', address: 'Molino Road, Molino I, Bacoor, Cavite', type: 'poi', lat: 14.4160, lng: 120.9630 },
  { name: 'SM City Bacoor', address: 'Tirona Hwy, Habay II, Bacoor, Cavite', type: 'poi', lat: 14.4442, lng: 120.9458 },
];

const initialFormData = {
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  province: '',
  city: '',
  barangay: '',
  street: '',
  venue: '',
  description: '',
  imageUrl: '',
  category: [CATEGORIES[0]],
  lat: 14.4534, // Default to Bacoor
  lng: 120.9442,
  maxParticipants: 100,
  isPrivate: false,
  priority: 'average' as 'urgent' | 'average' | 'less_prio',
  requestedPublishDate: '',
  instructions: '',
};

const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSuccess, eventToEdit, onCancelEdit, onDelete, currentUser, isReviewing }) => {
  const { showAlert, showConfirm } = useAlert();
  const [formData, setFormData] = useState(initialFormData);
  const [isPublic, setIsPublic] = useState(!eventToEdit || !eventToEdit.maxParticipants);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'default' | 'success' | 'failed'>('default');
  const [error, setError] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>(SAMPLE_LOCATIONS);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'published' | 'pending' | 'scheduled'>('published');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const isAdmin = currentUser.role === 'admin';
  const isFacilitator = currentUser.role === 'facilitator';

  useEffect(() => {
      const debounceTimer = setTimeout(async () => {
          if (locationQuery.length >= 3) {
              setIsSearchingLocation(true);
              const sampleMatches = SAMPLE_LOCATIONS.filter(l => l.name.toLowerCase().includes(locationQuery.toLowerCase()) || l.address.toLowerCase().includes(locationQuery.toLowerCase()));
              
              const geoapifyResults = await searchAddressGeoapify(locationQuery);
              
              if (geoapifyResults.length > 0) {
                  setSearchResults([...sampleMatches, ...geoapifyResults]);
              } else {
                  setSearchResults(sampleMatches);
              }
              setIsSearchingLocation(false);
          } else if (locationQuery.length > 0) {
              setSearchResults(SAMPLE_LOCATIONS.filter(l => l.name.toLowerCase().includes(locationQuery.toLowerCase()) || l.address.toLowerCase().includes(locationQuery.toLowerCase())));
          } else {
              setSearchResults(SAMPLE_LOCATIONS);
          }
      }, 500);
      return () => clearTimeout(debounceTimer);
  }, [locationQuery]);

  useEffect(() => {
    if (eventToEdit) {
      const eventCats = Array.isArray(eventToEdit.category) ? eventToEdit.category : [eventToEdit.category];
      const customCats = eventCats.filter(cat => !CATEGORIES.includes(cat));
      setCustomCategories(customCats);

      setFormData({
        name: eventToEdit.name,
        date: eventToEdit.date,
        startTime: eventToEdit.startTime,
        endTime: eventToEdit.endTime,
        province: eventToEdit.province || 'Cavite',
        city: eventToEdit.city || 'Bacoor Cavite',
        barangay: eventToEdit.barangay,
        street: eventToEdit.street || '',
        venue: eventToEdit.venue,
        description: eventToEdit.description,
        imageUrl: eventToEdit.imageUrl,
        category: eventCats,
        lat: eventToEdit.lat,
        lng: eventToEdit.lng,
        maxParticipants: eventToEdit.maxParticipants || 100,
        isPrivate: eventToEdit.isPrivate || false,
        priority: eventToEdit.priority || 'average',
        requestedPublishDate: eventToEdit.requestedPublishDate || '',
        instructions: eventToEdit.instructions || '',
      });
      setIsPublic(!eventToEdit.maxParticipants);
      if (eventToEdit.instructions) setShowInstructions(true);
      setGeoStatus('success'); // Assume existing event has correct coords
    } else {
      setFormData(initialFormData);
      setIsPublic(true);
      setGeoStatus('default');
    }
  }, [eventToEdit]);

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => {
      const currentCategories = Array.isArray(prev.category) ? prev.category : [prev.category];
      if (currentCategories.includes(category)) {
        return { ...prev, category: currentCategories.filter(c => c !== category) };
      } else {
        return { ...prev, category: [...currentCategories, category] };
      }
    });
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const allCategories = [...CATEGORIES, ...customCategories];
    if (allCategories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      // Already exists — just select it
      handleCategoryToggle(allCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())!);
      setShowNewCategoryInput(false);
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    // Auto-select it in the form
    setFormData(prev => {
      const current = Array.isArray(prev.category) ? prev.category : [prev.category];
      return { ...prev, category: [...current, trimmed] };
    });
    setNewCategoryInput('');
    setShowNewCategoryInput(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'barangay') {
      const coords = BARANGAY_COORDS[value];
      setFormData(prev => ({
        ...prev,
        barangay: value,
        lat: coords?.lat || 0,
        lng: coords?.lng || 0,
        street: '', // Clear street when barangay changes
        venue: '', // Clear venue when barangay changes
      }));
      setGeoStatus('default');
    } else if (e.target.type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'isPrivate') {
        if (checked) setIsPublic(false);
        setFormData(prev => ({ ...prev, isPrivate: checked }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddressBlur = async () => {
      // Don't geocode if we don't have enough location info
      if (!formData.city && !formData.barangay) return;

      setIsGeocoding(true);
      setGeoStatus('default');

      // Construct search query
      const queryParts = [formData.venue, formData.street, formData.barangay, formData.city, formData.province, 'Philippines'];
      const query = queryParts.filter(part => part && part.trim() !== '').join(', ');

      if (query) {
          const result = await geocodeLocation(query);
          if (result) {
              setFormData(prev => ({
                  ...prev,
                  lat: result.lat,
                  lng: result.lng
              }));
              setGeoStatus('success');
          } else {
              setGeoStatus('failed');
          }
      }
      setIsGeocoding(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file, 1024, 0.7);
        setFormData(prev => ({
          ...prev,
          imageUrl: resizedBase64,
        }));
        setError(''); 
      } catch (err) {
        console.error("Image resize error:", err);
        setError("Failed to process image. Please try another file.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validation
    if (!formData.name || !formData.date || !formData.startTime || !formData.endTime || !formData.venue || !formData.description) {
        setError("Please fill out all required fields.");
        return;
    }

    if (!formData.imageUrl) {
      setError("Please upload an image for the event.");
      return;
    }

    if (!formData.category || formData.category.length === 0) {
      setError('Please select at least one category.');
      return;
    }

    if (isAdmin) {
       setSelectedStatus(eventToEdit?.status === 'scheduled' ? 'scheduled' : eventToEdit?.status === 'published' ? 'published' : 'pending');
       if (eventToEdit?.status === 'scheduled' && eventToEdit.publishAt) {
          const dateString = new Date(eventToEdit.publishAt).toISOString().slice(0, 16);
          setScheduleDateTime(dateString);
       } else {
          setScheduleDateTime('');
       }
       setShowStatusModal(true);
    } else {
       setSelectedStatus('pending');
       const actionText = eventToEdit ? 'Update' : 'Submit';
       const confirmTitle = `${actionText} Event?`;
       const confirmMessage = eventToEdit 
           ? "Are you sure you want to save changes to this event?"
           : "Your event proposal will be submitted for review. Continue?";
           
       showConfirm(confirmTitle, confirmMessage, () => {
           executeSubmit('pending');
       }, 'info');
    }
  };

  const processSubmit = () => {
    if (selectedStatus === 'scheduled' && !scheduleDateTime) {
       showAlert('Error', "Please select a valid date and time for scheduling.", 'error');
       return;
    }

    const publishAtMs = selectedStatus === 'scheduled' ? new Date(scheduleDateTime).getTime() : undefined;
    if (selectedStatus === 'scheduled' && (isNaN(publishAtMs as number) || publishAtMs! <= Date.now())) {
         showAlert('Error', "Scheduled time must be in the future.", 'error');
         return;
    }

    if (selectedStatus === 'published') {
        showConfirm(
            'Confirm Publication', 
            'This event will become publicly visible immediately. Are you sure you want to proceed?', 
            () => {
                setShowStatusModal(false);
                executeSubmit('published');
            }, 
            'warning'
        );
        return;
    }

    setShowStatusModal(false);
    executeSubmit(selectedStatus, publishAtMs);
  };

  const executeSubmit = async (finalStatus: string, publishAtMs?: number) => {
    setIsLoading(true);

    try {
        let status = finalStatus;
        
        const eventPayload = {
            ...formData,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
            maxParticipants: isPublic ? null : Number(formData.maxParticipants),
            isPrivate: formData.isPrivate,
            priority: formData.priority || 'average',
            requestedPublishDate: (formData as any).requestedPublishDate || null,
            instructions: (formData as any).instructions || null,
            status: status, 
            publishAt: publishAtMs,
            rejectionReason: status === 'pending' ? undefined : eventToEdit?.rejectionReason,
            createdByAdmin: eventToEdit ? eventToEdit.createdByAdmin : isAdmin,
            createdBy: eventToEdit ? eventToEdit.createdBy : currentUser.uid,
            organizer: eventToEdit ? eventToEdit.organizer : (formData.name ? currentUser.name : 'Facilitator') 
        };

        if (eventToEdit) {
            // @ts-ignore
            await updateEvent(eventToEdit.id, eventPayload);
            onSuccess({ ...eventToEdit, ...eventPayload } as EventType);
            showAlert('Success', 'Event updated successfully!', 'success');
        } else {
            // @ts-ignore
            const newEvent = await addEvent(eventPayload);
            onSuccess(newEvent);
            
            // Clear form
            setFormData(initialFormData); 
            if (formRef.current) formRef.current.reset();
            setGeoStatus('default');
            
            // ADMIN NOTIFICATION
            if (status === 'pending' || !isAdmin) {
                try {
                    const admins = await getAdmins();
                    admins.forEach(admin => {
                        createNotification(
                            admin.uid,
                            'event_created',
                            'New Event Approval Request',
                            `${currentUser.name} has submitted a new event "${formData.name}" for review.`,
                            newEvent.id
                        ).catch(e => console.error("Notification failed for admin", admin.uid, e));
                    });
                } catch (e) {
                    console.error("Failed to notify admins", e);
                }
            }
            
            const successMsg = status === 'published' 
                ? "Event published successfully!" 
                : status === 'scheduled' 
                  ? "Event scheduled successfully!" 
                  : "Event submitted as pending for review.";
            showAlert('Success', successMsg, 'success');
        }
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unexpected error occurred.');
        showAlert('Error', 'Failed to process event. Please try again.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      
      {/* Header / Title */}
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {eventToEdit ? (isReviewing ? 'Review & Edit Details' : 'Edit Event Details') : 'Event Details'}
          </h3>
          {onCancelEdit && (
              <button 
                  type="button" 
                  onClick={() => {
                      showConfirm('Discard Changes?', 'Are you sure you want to cancel? Any unsaved changes will be lost.', () => {
                          onCancelEdit();
                      }, 'warning');
                  }} 
                  className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  title="Cancel"
              >
                  <X className="w-5 h-5" />
              </button>
          )}
      </div>

      {error && (
        <div className="text-center p-3 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-5">
        
        {/* Event Name */}
        <div>
          <label htmlFor="name" className={labelClass}>Event Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass} style={{marginBottom: 0}}>Categories (Select multiple)</label>
            <button
              type="button"
              onClick={() => { setShowNewCategoryInput(true); setNewCategoryInput(''); }}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
              title="Add custom category"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          {/* Inline new-category input */}
          {showNewCategoryInput && (
            <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                autoFocus
                type="text"
                value={newCategoryInput}
                onChange={e => setNewCategoryInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory(); }
                  if (e.key === 'Escape') setShowNewCategoryInput(false);
                }}
                placeholder="e.g. Festival, Workshop…"
                maxLength={30}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {[...CATEGORIES, ...customCategories].map(cat => {
              const isSelected = Array.isArray(formData.category) ? formData.category.includes(cat) : formData.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryToggle(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    isSelected
                      ? 'bg-[#8b5cf6] text-white border-[#8b5cf6]'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {(!formData.category || formData.category.length === 0) && (
            <p className="text-red-500 text-xs mt-1">Please select at least one category.</p>
          )}
        </div>

        {/* Max Participants */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={isPublic}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsPublic(checked);
                    if (checked) {
                      setFormData(prev => ({ ...prev, isPrivate: false }));
                    }
                  }}
                  className="w-5 h-5 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div>
                  <label htmlFor="isPublic" className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer">
                      Public Event (No Limit)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Anyone can attend. No participant limit will be enforced.
                  </p>
              </div>
          </div>

          {!isPublic && (
            <div className="animate-fade-in-up">
              <label htmlFor="maxParticipants" className={labelClass}>Estimated Max Participants</label>
              <input
                type="number"
                name="maxParticipants"
                id="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                required
                min="1"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Private Event Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <div>
                <label htmlFor="isPrivate" className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer">
                    Private Event (Requires Registration)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Users must register and be approved by you to participate.
                </p>
            </div>
        </div>
        {/* Date & Time */}
        <div className="space-y-2 pt-2">
            <label className={labelClass}>Date &amp; Time</label>
            <EventDateTimePicker
                date={formData.date}
                startTime={formData.startTime}
                endTime={formData.endTime}
                onDateChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
                onStartTimeChange={(val) => {
                    // Auto-set end = start + 8 hours
                    const [h, m] = val.split(':').map(Number);
                    const endH = (h + 8) % 24;
                    const autoEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, startTime: val, endTime: autoEnd }));
                }}
                onEndTimeChange={(val) => setFormData(prev => ({ ...prev, endTime: val }))}
            />
        </div>

        {/* Publish Settings for Facilitators */}
        {!isAdmin && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Publish Settings</h3>
                
                <div>
                    <label className={labelClass}>Admin Priority (Urgency)</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {(['urgent', 'average', 'less_prio'] as const).map(prio => (
                            <button
                                key={prio}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, priority: prio }))}
                                className={`px-2 py-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                                    formData.priority === prio 
                                        ? prio === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600'
                                        : prio === 'average' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 text-orange-600'
                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-600'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                {prio.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="requestedPublishDate" className={labelClass}>Requested Publish Date (Optional)</label>
                    <input
                        type="datetime-local"
                        id="requestedPublishDate"
                        value={formData.requestedPublishDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedPublishDate: e.target.value }))}
                        className={inputClass}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to request immediate publish upon approval.</p>
                </div>
            </div>
        )}

        {/* Location Section */}
        <div className="pt-2">
            {formData.venue ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-gray-500" />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{formData.venue}</h4>
                      <p className="text-sm text-gray-500">{formData.street || `${formData.city}, ${formData.province}`}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormData(prev => ({...prev, venue: '', street: '', lat: 0, lng: 0}))} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative w-full aspect-[2/1] min-h-[300px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 group">
                  <InteractiveMap
                    userLocation={{ lat: formData.lat, lng: formData.lng }}
                    isLocationLive={false}
                    events={[{ 
                        ...formData, 
                        id: 'draft', 
                        status: 'published' // Force it to show as special/live
                    } as any]}
                    centerOnEvent={{ lat: formData.lat, lng: formData.lng }}
                    className="w-full h-full"
                    onMapClick={async (lat, lng) => {
                      setFormData(prev => ({ ...prev, lat, lng }));
                      const reverse = await reverseGeocode(lat, lng);
                      if (reverse) {
                        setFormData(prev => ({ 
                          ...prev, 
                          street: reverse.displayName,
                          venue: reverse.displayName.split(',')[0],
                          barangay: reverse.barangay,
                          city: reverse.city || 'Bacoor'
                        }));
                      }
                    }}
                  />
                  <div className="absolute top-4 left-4 z-[1001] bg-primary-600/90 dark:bg-primary-500/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-white shadow-xl pointer-events-none uppercase tracking-[0.1em] border border-white/20 animate-pulse">
                    Pin Location (Tap to drag/adjust)
                  </div>
                </div>
                {/* Instructions — separate from location, just attendee guidance */}
                <div className="mt-2">
                  {!showInstructions ? (
                    <button
                      type="button"
                      onClick={() => setShowInstructions(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-600 w-max hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Further Instructions
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Further Instructions</label>
                        <button
                          type="button"
                          onClick={() => { setShowInstructions(false); setFormData(prev => ({ ...prev, instructions: '' })); }}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                      <textarea
                        value={formData.instructions || ''}
                        onChange={e => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                        placeholder="e.g. Bring valid ID, wear comfortable shoes, parking available at Gate 2..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none text-sm"
                      />
                      <p className="text-xs text-gray-400">These instructions will be shown to attendees viewing the event. They do not affect the map or location.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
                <>
                    <button 
                        type="button" 
                        onClick={() => { setIsLocationSearchOpen(true); setLocationQuery(''); setSearchResults(SAMPLE_LOCATIONS); }}
                        className="w-full flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-300 transition-colors text-left group"
                    >
                        <MapPin className="w-6 h-6 text-gray-400 group-hover:text-primary-500 transition-colors" />
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">Add Event Location</p>
                            <p className="text-xs text-[#6b7280] mt-0.5">Offline location or virtual link</p>
                        </div>
                    </button>

                    {isLocationSearchOpen && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-start pt-16 px-4 pb-4 animate-in fade-in duration-200">
                            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300 border border-gray-100 dark:border-gray-700">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <input 
                                        autoFocus
                                        type="text"
                                        value={locationQuery}
                                        onChange={e => setLocationQuery(e.target.value)}
                                        placeholder="Search for an address or place..."
                                        className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-gray-900 dark:text-white font-semibold text-lg placeholder-gray-400 outline-none w-full"
                                    />
                                    <button type="button" onClick={() => setIsLocationSearchOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors flex-shrink-0">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="overflow-y-auto flex-1 bg-white dark:bg-gray-800 p-2">
                                    {isSearchingLocation ? (
                                        <div className="py-12 flex flex-col justify-center items-center gap-3">
                                            <Spinner size="md" />
                                            <p className="text-sm text-gray-500 font-medium tracking-wide">Searching the world...</p>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="space-y-1">
                                            {searchResults.map((loc, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={async () => {
                                                        if (loc.isError) return;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            venue: loc.name,
                                                            street: loc.address,
                                                            city: loc.city || 'Bacoor',
                                                            province: loc.province || 'Cavite',
                                                            barangay: '',
                                                            lat: loc.lat,
                                                            lng: loc.lng
                                                        }));
                                                        setIsLocationSearchOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-4 px-3 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors group"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-none border border-gray-100 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-[15px] leading-tight truncate">{loc.name}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{loc.address}</p>
                                                    </div>
                                                </button>
                                            ))}
                                            {locationQuery && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({...prev, venue: locationQuery, street: '', lat: 0, lng: 0}));
                                                        setIsLocationSearchOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-4 px-3 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors mt-2 border-t border-dashed border-gray-200 dark:border-gray-700"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-none border border-gray-100 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-[15px] leading-tight truncate">Use "{locationQuery}"</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Custom location</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center flex flex-col items-center">
                                            <MapPin className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
                                            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{locationQuery ? 'No locations found. Try another search.' : 'Type to search for an address'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

        {/* Image Upload */}
        <div>
            <label className={labelClass}>Event Image</label>
            <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
                <input 
                    type="file" 
                    id="imageUpload" 
                    onChange={handleImageChange} 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {formData.imageUrl ? (
                     <div className="relative w-full h-48">
                        <img src={formData.imageUrl || undefined} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                             <span className="text-white font-medium">Click to replace</span>
                         </div>
                    </div>
                ) : (
                    <>
                         <div className="w-16 h-16 mb-4 relative">
                            {/* Icon mimicry */}
                            <svg className="w-full h-full text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-gray-800">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                             </div>
                        </div>
                        <p className="text-primary-600 font-bold mb-1">Upload a file <span className="text-gray-400 font-normal">or drag and drop</span></p>
                        <p className="text-xs text-gray-400">PNG, JPG GIF (Automatically resized)</p>
                    </>
                )}
            </div>
        </div>

        {/* Description */}
        <div>
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                required
                className={inputClass}
            />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col gap-3">
            <button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center ${currentUser.role === 'admin' ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
            >
                {isLoading ? <Spinner size="sm" /> : (
                    eventToEdit 
                        ? (isReviewing ? 'Done (Save Changes)' : 'Update Event') 
                        : (currentUser.role === 'admin' ? 'Create & Publish' : 'Submit for Review')
                )}
            </button>
            
            {eventToEdit && onDelete && (
                 <button
                    type="button"
                    onClick={() => onDelete(eventToEdit.id)}
                    className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 rounded-xl transition-colors"
                >
                    Delete Event
                </button>
            )}
        </div>

      </div>

      {/* Status Selection Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowStatusModal(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col animate-fade-in-up overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Publication Status</h3>
                    <button type="button" onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please select the publishing option for this event.
                    </p>
                    
                    <div className="space-y-2">
                        {['pending', 'scheduled', 'published'].map(opt => (
                            <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedStatus === opt ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <input 
                                    type="radio" 
                                    name="eventStatusOption" 
                                    value={opt} 
                                    checked={selectedStatus === opt} 
                                    onChange={() => setSelectedStatus(opt as any)}
                                    className="w-4 h-4 text-primary-600 focus:ring-primary-500" 
                                />
                                <span className="text-sm font-bold capitalize text-gray-900 dark:text-white">{opt}</span>
                            </label>
                        ))}
                    </div>

                    {selectedStatus === 'scheduled' && (
                        <div className="animate-in fade-in pt-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Publish Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={scheduleDateTime}
                                onChange={(e) => setScheduleDateTime(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            />
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                    <button 
                        type="button"
                        onClick={() => setShowStatusModal(false)}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        onClick={processSubmit}
                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
      )}
    </form>
  );
};

export default CreateEventForm;
