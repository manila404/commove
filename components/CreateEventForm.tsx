import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon, MapPin, X, Plus,
  Globe, Lock, ChevronDown, Clock,
  CheckCircle2, AlertCircle, Eye, Save, Share2, Link as LinkIcon, ExternalLink
} from 'lucide-react';
import type { EventType, User, EventStatus } from '../types';
import InteractiveMap from './InteractiveMap';
import { addEvent, updateEvent } from '../services/eventService';
import { getAdmins } from '../services/userService';
import { createNotification } from '../services/notificationService';
import { CATEGORIES } from '../constants';
import { resizeImage } from '../services/imageUtils';
import { searchAddressGeoapify } from '../services/osmService';
import Spinner from './Spinner';
import { DateTimeRow } from './EventDateTimePicker';
import { useAlert } from '../contexts/AlertContext';
import RecurrenceSelector from './RecurrenceSelector';
import { generateRecurringDates, type RecurrenceRule } from '../services/recurrenceUtils';
import EventCard from './EventCard';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateEventFormProps {
  onSuccess: (event: EventType) => void;
  eventToEdit?: EventType | null;
  onCancelEdit?: () => void;
  onDelete?: (eventId: string) => void;
  currentUser: User;
  isReviewing?: boolean;
}

const TIMEZONES = [
  { value: 'PHT', label: 'Philippines (PHT · UTC+8)' },
  { value: 'UTC', label: 'Universal (UTC)' },
  { value: 'EST', label: 'Eastern US (EST · UTC−5)' },
  { value: 'JST', label: 'Japan (JST · UTC+9)' },
  { value: 'SGT', label: 'Singapore (SGT · UTC+8)' },
];

const SAMPLE_LOCATIONS = [
  { name: 'Bacoor City Hall', address: 'Bacoor Blvd, Bacoor, Cavite', lat: 14.4312, lng: 120.9458 },
  { name: 'SM City Bacoor',   address: 'Tirona Hwy, Habay II, Bacoor, Cavite', lat: 14.4442, lng: 120.9458 },
  { name: 'Bacoor Coliseum',  address: 'Molino III, Bacoor, Cavite', lat: 14.3980, lng: 120.9760 },
];

const initialFormData = {
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  endDate: '',
  province: 'Cavite',
  city: 'Bacoor',
  street: '',
  venue: '',
  description: '',
  imageUrl: '',
  additionalImageUrls: ['', ''] as string[],
  category: [CATEGORIES[0]] as string[],
  lat: 14.4534,
  lng: 120.9442,
  maxParticipants: 100,
  isPrivate: false,
  priority: 'average' as 'urgent' | 'average' | 'less_prio',
  requestedPublishDate: '',
  instructions: '',
  timezone: 'PHT',
  subtitle: '',
};

// ─── Validation ───────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof typeof initialFormData | 'time', string>>;

const validateForm = (formData: typeof initialFormData): FormErrors => {
  const errors: FormErrors = {};
  if (!formData.name.trim() || formData.name.length < 3) errors.name = 'Event name is required (min 3 chars).';
  if (!formData.category || formData.category.length === 0) errors.category = 'Select at least one category.';
  if (!formData.date) errors.date = 'Start date is required.';
  if (!formData.startTime) errors.startTime = 'Start time is required.';
  if (!formData.endTime) errors.endTime = 'End time is required.';
  if (formData.startTime && formData.endTime) {
    const s = formData.startTime.split(':').map(Number);
    const e = formData.endTime.split(':').map(Number);
    const sDate = formData.date;
    const eDate = formData.endDate || formData.date;
    
    // Only check time sequence if it's the same day. 
    // If eDate > sDate, any time is valid.
    if (sDate === eDate) {
        if (e[0] * 60 + e[1] <= s[0] * 60 + s[1]) {
            errors.time = 'End time must be after start time.';
        }
    } else if (eDate < sDate) {
        errors.date = 'End date cannot be before start date.';
    }
  }
  if (!formData.venue) errors.venue = 'A venue is required.';
  if (!formData.description.trim()) errors.description = 'A description is required.';
  return errors;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const FieldError = ({ error }: { error?: string }) =>
  error ? (
    <motion.p
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-500"
    >
      <AlertCircle className="w-3.5 h-3.5" />{error}
    </motion.p>
  ) : null;

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="w-0.5 h-5 bg-violet-500 rounded-full" />
    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">{title}</h3>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onSuccess, eventToEdit, onCancelEdit, currentUser, isReviewing,
}) => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState(initialFormData);
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Modals
  const [showPreview, setShowPreview] = useState(false);
  const [successData, setSuccessData] = useState<{ type: 'one-time' | 'recurring' | 'draft' } | null>(null);

  // Location
  const [locationQuery, setLocationQuery] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>(SAMPLE_LOCATIONS);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Categories
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [showCatInput, setShowCatInput] = useState(false);
  const [catInputVal, setCatInputVal] = useState('');

  // Recurrence
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const isAdmin = currentUser.role === 'admin';

  // Populate form when editing
  useEffect(() => {
    if (eventToEdit) {
      const eventCats = Array.isArray(eventToEdit.category) ? eventToEdit.category : [eventToEdit.category];
      setCustomCats(eventCats.filter(c => !CATEGORIES.includes(c)));
      setFormData({
        ...initialFormData,
        ...eventToEdit,
        subtitle: (eventToEdit as any).subtitle || '',
        timezone: eventToEdit.timezone || 'PHT',
        maxParticipants: eventToEdit.maxParticipants || 100,
        province: eventToEdit.province || 'Cavite',
        city: eventToEdit.city || 'Bacoor',
        street: eventToEdit.street || '',
        instructions: eventToEdit.instructions || '',
        endDate: eventToEdit.endDate || eventToEdit.date || '',
        additionalImageUrls: eventToEdit.additionalImageUrls || ['', ''],
      });
      if (eventToEdit.street) {
        setLocationQuery(eventToEdit.street);
      }
      setIsPublic(!eventToEdit.maxParticipants);
      if (eventToEdit.status === 'scheduled' && eventToEdit.publishAt) {
          setIsScheduled(true);
          const d = new Date(eventToEdit.publishAt);
          setScheduleDate(d.toISOString().split('T')[0]);
          setScheduleTime(d.toTimeString().substring(0, 5));
      } else if (eventToEdit.requestedPublishDate) {
          setIsScheduled(true);
          const d = new Date(eventToEdit.requestedPublishDate);
          if (!isNaN(d.getTime())) {
              setScheduleDate(d.toISOString().split('T')[0]);
              setScheduleTime(d.toTimeString().substring(0, 5));
          }
      }
    }
  }, [eventToEdit]);

  // Debounced location search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (locationQuery.length >= 3) {
        setIsSearchingLoc(true);
        const local = SAMPLE_LOCATIONS.filter(l =>
          l.name.toLowerCase().includes(locationQuery.toLowerCase()) ||
          l.address.toLowerCase().includes(locationQuery.toLowerCase())
        );
        const remote = await searchAddressGeoapify(locationQuery);
        setSearchResults([...local, ...remote]);
        setIsSearchingLoc(false);
      } else if (locationQuery.length === 0) {
        setSearchResults(SAMPLE_LOCATIONS);
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Re-validate touched fields on change
  useEffect(() => {
    if (touched.size > 0) {
      const newErrors = validateForm(formData);
      const filteredErrors: FormErrors = {};
      touched.forEach(key => {
        if (newErrors[key as keyof FormErrors]) filteredErrors[key as keyof FormErrors] = newErrors[key as keyof FormErrors];
      });
      setFormErrors(filteredErrors);
    }
  }, [formData, touched]);

  const touch = (field: string) => setTouched(prev => new Set([...prev, field]));

  const setField = <K extends keyof typeof initialFormData>(key: K, value: (typeof initialFormData)[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    touch(key);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    touch(name);
  };

  const handleCatToggle = (cat: string) => {
    const cats = Array.isArray(formData.category) ? formData.category : [formData.category];
    const newCats = cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat];
    setField('category', newCats);
  };

  const handleAddCat = () => {
    const t = catInputVal.trim();
    if (!t) return;
    setCustomCats(prev => [...prev, t]);
    handleCatToggle(t);
    setCatInputVal('');
    setShowCatInput(false);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 1200, 0.8);
      if (index === 0) {
        setField('imageUrl', resized);
      } else {
        const newAdd = [...formData.additionalImageUrls];
        newAdd[index - 1] = resized;
        setField('additionalImageUrls', newAdd);
      }
    } catch { showAlert('Error', 'Failed to process image.', 'error'); }
  };

  const removeImage = (index: number) => {
    if (index === 0) {
      setField('imageUrl', '');
    } else {
      const newAdd = [...formData.additionalImageUrls];
      newAdd[index - 1] = '';
      setField('additionalImageUrls', newAdd);
    }
  };

  const submitAction = async (mode: 'draft' | 'publish') => {
    const allTouched = new Set(Object.keys(initialFormData));
    setTouched(allTouched);

    if (mode === 'publish') {
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        document.getElementById('event-form-top')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    } else {
      if (!formData.name.trim()) {
        setFormErrors({ name: 'Draft requires an event name.' });
        return;
      }
    }

    setIsLoading(true);
    try {
      const publishTimestamp = isScheduled && scheduleDate && scheduleTime 
         ? new Date(`${scheduleDate}T${scheduleTime}:00`).getTime() 
         : null;

      const payload = {
        ...formData,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        maxParticipants: isPublic ? null : Number(formData.maxParticipants),
        publishAt: publishTimestamp,
        requestedPublishDate: publishTimestamp ? new Date(publishTimestamp).toISOString() : null,
        creatorUsername: currentUser?.username || undefined,
        status: (mode === 'draft' ? 'draft' : (isAdmin ? (isScheduled ? 'scheduled' : 'published') : 'pending')) as EventStatus,
        createdByAdmin: isAdmin,
      };

      if (eventToEdit) {
        await updateEvent(eventToEdit.id, payload);
        onSuccess({ ...eventToEdit, ...payload } as EventType);
        if (!isAdmin && mode === 'publish') {
          try {
            const admins = await getAdmins();
            admins.forEach(a => createNotification(a.uid, 'event_created', 'Event Update Request', `${currentUser.name} updated an event for review.`, eventToEdit.id));
            // Notify Facilitator
            await createNotification(currentUser.uid, 'event_created', 'Event Submitted', 'Your event update has been submitted for review.', eventToEdit.id);
          } catch (e) { console.error(e); }
        } else if (isAdmin && mode === 'publish') {
           try {
             await createNotification(currentUser.uid, 'event_created', 'Event Published', 'You have published an event.', eventToEdit.id);
           } catch (e) { console.error(e); }
        }
      } else {
        const dates = recurrenceRule ? generateRecurringDates(formData.date, recurrenceRule) : undefined;
        const newEvent = await addEvent(payload, dates);
        onSuccess(newEvent);
        if (!isAdmin && mode === 'publish') {
          try {
            const admins = await getAdmins();
            admins.forEach(a => createNotification(a.uid, 'event_created', 'New Event Request', `${currentUser.name} submitted an event for review.`, newEvent.id));
            // Notify Facilitator
            await createNotification(currentUser.uid, 'event_created', 'Event Submitted', 'Your event has been submitted for review.', newEvent.id);
          } catch (e) { console.error(e); }
        } else if (isAdmin && mode === 'publish') {
           try {
             await createNotification(currentUser.uid, 'event_created', 'Event Published', 'You have published an event.', newEvent.id);
           } catch (e) { console.error(e); }
        }
      }

      setSuccessData({ type: mode === 'draft' ? 'draft' : recurrenceRule && !eventToEdit ? 'recurring' : 'one-time' });
    } catch (err: any) {
      showAlert('Error', err.message || 'Something went wrong.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = Object.keys(formErrors).length > 0;

  const venueMapEvent: any = {
    ...formData,
    id: 'draft',            // 'draft' id makes the pin draggable in InteractiveMap
    isLive: false,
    organizer: currentUser.name,
    category: Array.isArray(formData.category) ? formData.category : [formData.category],
    isSaved: false, isNearby: false, isPreferred: false,
  };

  // Shown in the right-column preview card (read-only)
  const previewEvent: any = { ...venueMapEvent, id: 'preview' };

  const [isGeocodingPin, setIsGeocodingPin] = useState(false);

  const handleVenuePinDrag = async (lat: number, lng: number) => {
    // Update coords immediately so the map re-centers smoothly
    setFormData(prev => ({ ...prev, lat, lng }));
    setIsGeocodingPin(true);
    try {
      const { reverseGeocode } = await import('../services/osmService');
      const result = await reverseGeocode(lat, lng);
      if (result?.displayName) {
        // Parse a short venue name from the full address
        // e.g. "SM City Bacoor, Tirona Highway, ..." → "SM City Bacoor"
        const parts = result.displayName.split(',');
        const venueName = parts[0]?.trim() || result.displayName;
        const streetAddress = parts.slice(1).join(',').trim();
        const finalStreet = streetAddress || result.displayName;
        setFormData(prev => ({
          ...prev,
          lat,
          lng,
          venue: venueName,
          street: finalStreet,
        }));
        setLocationQuery(finalStreet);
      }
    } catch (e) { /* silent — lat/lng already updated */ }
    finally { setIsGeocodingPin(false); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const card = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-6";
  const input = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500 transition-all";
  const label = "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

  return (
    <>
      {/* ── Page wrapper — actual max-width that fills the page ── */}
      <div id="event-form-top" className="w-full max-w-[1200px] mx-auto px-4 lg:px-8 pt-6 pb-32 animate-in fade-in duration-300" style={{scrollbarWidth:'none'}}>

        {/* ── Page title ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {eventToEdit ? (isReviewing ? 'Review Event' : 'Edit Event') : 'Create New Event'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Fill in the details below to schedule and publish an event for the community.
          </p>
        </div>

        {/* ── 3-column desktop grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px] gap-6 items-start">

          {/* ══ Column 1 — Identity ══ */}
          <div className="space-y-6">

            {/* Event name & subtitle */}
            <div className={card}>
              <SectionHeader title="Event Details" />
              <div className="space-y-4">
                <div>
                  <label className={label}>Event Name <span className="text-red-400">*</span></label>
                  <input
                    type="text" name="name" value={formData.name}
                    onChange={handleChange} onBlur={() => touch('name')}
                    placeholder="E.g. Bacoor Summer Concert 2026"
                    className={`${input} ${formErrors.name ? 'border-red-400 ring-2 ring-red-400/20' : ''}`}
                  />
                  <FieldError error={formErrors.name} />
                </div>
                <div>
                  <label className={label}>Subtitle <span className="text-gray-300">(optional)</span></label>
                  <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange}
                    placeholder="A short tagline or one-liner" className={input} />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-0.5 h-5 bg-violet-500 rounded-full" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">Categories</h3>
                </div>
                <button type="button" onClick={() => { setShowCatInput(true); setCatInputVal(''); }}
                  className="text-[10px] font-black text-violet-600 uppercase tracking-widest hover:bg-violet-50 dark:hover:bg-violet-900/20 px-3 py-1.5 rounded-lg transition-all">
                  + Custom
                </button>
              </div>

              <AnimatePresence>
                {showCatInput && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 mb-3 overflow-hidden">
                    <input autoFocus type="text" value={catInputVal} onChange={e => setCatInputVal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCat()}
                      placeholder="Tag name…" className={`${input} flex-1 py-2`} />
                    <button type="button" onClick={handleAddCat} className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">Add</button>
                    <button type="button" onClick={() => setShowCatInput(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-2">
                {[...CATEGORIES, ...customCats].map(cat => {
                  const sel = Array.isArray(formData.category) ? formData.category.includes(cat) : formData.category === cat;
                  return (
                    <button key={cat} type="button" onClick={() => handleCatToggle(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all
                        ${sel ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                               : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}
                    >{cat}</button>
                  );
                })}
              </div>
              <FieldError error={formErrors.category} />
            </div>

            {/* Access */}
            <div className={card}>
              <SectionHeader title="Event Access" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: 'Public', desc: 'Open to everyone. No registration required.', icon: Globe, priv: false },
                  { title: 'Private', desc: 'Attendees must register and receive approval.', icon: Lock, priv: true },
                ].map(opt => (
                  <button key={opt.title} type="button"
                    onClick={() => { setIsPublic(!opt.priv); setField('isPrivate', opt.priv); }}
                    className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left
                      ${formData.isPrivate === opt.priv
                        ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/10'
                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl mb-3 flex items-center justify-center transition-all ${formData.isPrivate === opt.priv ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      <opt.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-white">{opt.title}</span>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {!isPublic && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <label className={label}>Participant Limit</label>
                  <input type="number" name="maxParticipants" value={formData.maxParticipants} onChange={handleChange}
                    className={input} min="1" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className={card}>
              <SectionHeader title="Description" />
              <textarea name="description" value={formData.description}
                onChange={handleChange} onBlur={() => touch('description')}
                placeholder="Describe what attendees can expect, what to prepare, and any special instructions…"
                rows={7} className={`${input} resize-none pt-3 ${formErrors.description ? 'border-red-400 ring-2 ring-red-400/20' : ''}`}
              />
              <FieldError error={formErrors.description} />
            </div>

          </div>

          {/* ══ Column 2 — Schedule + Location ══ */}
          <div className="space-y-6">

            {/* Scheduling */}
            <div className={`${card} overflow-visible`}>
              <SectionHeader title="Date & Time" />
              <div className="space-y-4">
                <DateTimeRow
                  label="Start"
                  date={formData.date} time={formData.startTime}
                  onDateChange={d => { setField('date', d); touch('date'); }}
                  onTimeChange={t => { setField('startTime', t); touch('startTime'); }}
                  error={formErrors.date || formErrors.startTime}
                  indicator="filled"
                />

                {/* Connector line */}
                <div className="flex items-center gap-2 ml-[76px]">
                  <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 ml-1" />
                </div>

                <DateTimeRow
                  label="End"
                  date={formData.endDate || formData.date} time={formData.endTime}
                  onDateChange={d => { setField('endDate', d); touch('endDate'); }}
                  onTimeChange={t => { setField('endTime', t); touch('endTime'); }}
                  error={formErrors.endDate || formErrors.endTime || formErrors.time}
                  minDate={formData.date}
                  indicator="hollow"
                />
              </div>

              {/* Publish Schedule Toggle */}
              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Schedule Publish Date</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Delay when this event appears to residents.</p>
                  </div>
                  <button type="button" onClick={() => setIsScheduled(!isScheduled)}
                    className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${isScheduled ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${isScheduled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isScheduled && (
                    <motion.div initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                      <div className="bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl p-4 mt-2">
                        <DateTimeRow
                          label="Publish"
                          date={scheduleDate} time={scheduleTime}
                          onDateChange={d => setScheduleDate(d)}
                          onTimeChange={t => setScheduleTime(t)}
                        />
                        <p className="text-[10px] text-violet-600/80 dark:text-violet-400/80 mt-3 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3 h-3" />
                          Event will be hidden from residents until this scheduled time.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <label className={label}>Time Zone</label>
                  <div className="relative">
                    <select name="timezone" value={formData.timezone} onChange={handleChange}
                      className={`${input} appearance-none pr-10`}
                    >
                      {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

            {/* Recurrence */}
            {!eventToEdit && (
              <RecurrenceSelector
                rule={recurrenceRule}
                onChange={setRecurrenceRule}
                startDate={formData.date}
                startTime={formData.startTime}
                endTime={formData.endTime}
              />
            )}

            {/* Location / Venue */}
            <div className={`${card} ${formErrors.venue ? 'ring-2 ring-red-400/20 border-red-400/40' : ''}`}>
              <SectionHeader title="Location" />
              <div className="space-y-4">
                <div>
                  <label className={label}>Venue Name</label>
                  <input type="text" name="venue" value={formData.venue} onChange={handleChange} onBlur={() => touch('venue')}
                    placeholder="e.g. Activity Center" className={input} />
                </div>
                <div className="relative">
                  <label className={label}>Street Address</label>
                  <input type="text" name="street" value={locationQuery || formData.street} 
                    onChange={e => {
                        setLocationQuery(e.target.value);
                        setField('street', e.target.value);
                    }}
                    onFocus={() => setShowAddressDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
                    placeholder="e.g. Bacoor City Hall…" className={input} autoComplete="off" />

                  {/* Dropdown Suggestions */}
                  <AnimatePresence>
                    {showAddressDropdown && searchResults.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 top-[105%] left-0 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                      >
                        {isSearchingLoc ? (
                           <div className="flex justify-center items-center py-6"><Spinner size="md" /></div>
                        ) : (
                           searchResults.map((loc, i) => (
                              <button key={i} type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, venue: loc.name, street: loc.address, lat: loc.lat, lng: loc.lng }));
                                  setLocationQuery(loc.address);
                                  setShowAddressDropdown(false);
                                  touch('venue');
                                }}
                                className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors flex items-center gap-3 group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 flex items-center justify-center shrink-0 transition-colors">
                                  <MapPin className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{loc.name}</p>
                                  <p className="text-[11px] text-gray-400 truncate">{loc.address}</p>
                                </div>
                              </button>
                           ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className={label}>Location Instructions (Optional)</label>
                  <textarea name="instructions" value={formData.instructions} onChange={handleChange}
                    placeholder="e.g. Enter CICRD building, go left at the lobby..." rows={3} className={`${input} resize-none pt-3`} />
                </div>
                <button type="button" onClick={() => setLocationOpen(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-xl hover:border-violet-400 dark:hover:border-violet-600 group transition-all">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isGeocodingPin ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/20'}`}>
                    {isGeocodingPin
                      ? <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      : <MapPin className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors" />}
                  </div>
                  <div className="text-left flex-1 pl-1">
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-violet-600 transition-colors">
                      {isGeocodingPin ? 'Pinning map location…' : 'View Map / Edit Pin'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Coordinates: {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                    </p>
                  </div>
                </button>
              </div>
              <FieldError error={formErrors.venue} />
            </div>

          </div>

          {/* ══ Column 3 — Media + Live Preview ══ */}
          <div className="space-y-6 lg:sticky lg:top-6">

            {/* Photos (3 slots) */}
            <div className={`${card} border-dashed`}>
              <SectionHeader title="Event Photos" />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 font-medium uppercase tracking-wider">Upload up to 3 photos to showcase your event.</p>
              
              <div className="space-y-4">
                {/* Primary Slot */}
                <div className="relative group">
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" onChange={(e) => handleImage(e, 0)} className="hidden" />
                    {formData.imageUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 aspect-video">
                        <img src={formData.imageUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="Cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg border border-white/30 shadow-xl">Change Cover</span>
                        </div>
                        <button type="button" onClick={(e) => { e.preventDefault(); removeImage(0); }} className="absolute top-2 right-2 p-1.5 bg-red-500/80 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all bg-gray-50/30 dark:bg-gray-800 group">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/20 flex items-center justify-center mb-2.5 transition-colors">
                          <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 group-hover:text-violet-600 transition-colors">Primary Cover Photo</p>
                        <p className="text-[9px] text-gray-300 mt-1 uppercase font-black tracking-widest">Main Thumbnail</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Additional Slots */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map(idx => (
                    <div key={idx} className="relative group">
                      <label className="block cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => handleImage(e, idx)} className="hidden" />
                        {formData.additionalImageUrls[idx - 1] ? (
                          <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 aspect-square">
                            <img src={formData.additionalImageUrls[idx - 1]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt={`Photo ${idx+1}`} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                               <Plus className="w-5 h-5 text-white" />
                            </div>
                            <button type="button" onClick={(e) => { e.preventDefault(); removeImage(idx); }} className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 backdrop-blur-md text-white rounded-md opacity-0 group-hover:opacity-100 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all bg-gray-50/30 dark:bg-gray-800 group">
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors mb-1" />
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-violet-600 uppercase tracking-tighter transition-colors">Photo {idx + 1}</span>
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Real-time</span>
                </div>
              </div>
              <div className="border-2 border-violet-100 dark:border-violet-900/30 rounded-2xl overflow-hidden scale-[0.92] origin-top">
                <EventCard event={previewEvent} onSelect={() => {}} onToggleSave={() => {}} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Sticky Footer Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            {onCancelEdit && (
              <button type="button" onClick={onCancelEdit}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                Cancel
              </button>
            )}
            <button type="button" onClick={() => submitAction('draft')} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-900/30 transition-all">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {hasErrors && (
              <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-red-500">
                <AlertCircle className="w-3.5 h-3.5" />Fill required fields to publish
              </span>
            )}
            <button type="button" onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button type="button" onClick={() => submitAction('publish')} disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl transition-all
                ${hasErrors
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none'
                  : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/25 hover:-translate-y-0.5 active:scale-95'}`}
            >
              {isLoading ? (<Spinner size="sm" />) : (isScheduled ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />)}
              {isLoading ? 'Processing…' : (isScheduled ? 'Schedule Event' : (eventToEdit ? 'Save Changes' : 'Publish Event'))}
            </button>
          </div>
        </div>
      </div>

      {/* ── Location Map Overlay ── */}
      <AnimatePresence>
        {locationOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8"
            onClick={() => setLocationOpen(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-violet-500 shrink-0" /> Pin Event Location</h3>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[80%]">
                    Drag the venue pin on the map to accurately pinpoint the location. Form fields will auto-fill based on coordinates.
                  </p>
                </div>
                <button type="button" onClick={() => setLocationOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="w-full h-[50vh] min-h-[300px] bg-gray-100 dark:bg-gray-900 relative">
                {isGeocodingPin && (
                    <div className="absolute top-4 right-4 z-[9999] bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
                        <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-white tracking-widest uppercase">Geocoding...</span>
                    </div>
                )}
                <InteractiveMap
                  userLocation={{ lat: formData.lat, lng: formData.lng }}
                  isLocationLive={false}
                  events={[venueMapEvent]}
                  centerOnEvent={{ lat: formData.lat, lng: formData.lng }}
                  onMapClick={handleVenuePinDrag}
                  className="w-full h-full"
                />
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                 <button onClick={() => setLocationOpen(false)} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-600/25 transition-all">Confirm Location</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview modal ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative w-full max-w-sm pointer-events-none"
              onClick={e => e.stopPropagation()}
            >
              <button type="button" onClick={() => setShowPreview(false)} className="pointer-events-auto absolute -top-12 right-0 text-white/60 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors">
                Close <X className="w-4 h-4" />
              </button>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <EventCard event={previewEvent} onSelect={() => {}} onToggleSave={() => {}} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success modal ── */}
      <AnimatePresence>
        {successData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl text-center border border-gray-100 dark:border-gray-700"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}
                className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </motion.div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                {successData.type === 'draft' ? 'Draft Saved!' : successData.type === 'recurring' ? 'Series Published!' : 'Event Published!'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7">
                {successData.type === 'draft'
                  ? 'Your progress is saved. Resume editing anytime from your events list.'
                  : successData.type === 'recurring'
                    ? 'Your recurring event series is live. All upcoming sessions are now visible to attendees.'
                    : 'Your event is live and visible to attendees.'}
              </p>
              {successData.type !== 'draft' && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors">
                    <LinkIcon className="w-4 h-4" /> Copy Link
                  </button>
                  <button className="flex items-center justify-center gap-2 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 text-sm font-bold text-violet-700 dark:text-violet-300 transition-colors">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              )}
              <button onClick={() => { setSuccessData(null); onCancelEdit?.(); }}
                className="w-full py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/15">
                <ExternalLink className="w-4 h-4" /> View Dashboard
              </button>
              {successData.type === 'draft' && (
                <button onClick={() => setSuccessData(null)}
                  className="w-full mt-2 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Continue Editing
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </>
  );
};

export default CreateEventForm;
