import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, LocationIcon, CalendarIcon, ClockIcon } from '../constants';
import { auth } from '../services/firebase';
import { addEvent, fetchUserRequests } from '../services/eventService';
import { BACOOR_BARANGAYS, BARANGAY_COORDS, CATEGORIES, BACOOR_STREETS, BARANGAY_STREETS, RECOMMENDED_VENUES } from '../constants';
import { resizeImage } from '../services/imageUtils';
import { geocodeLocation } from '../services/osmService';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';
import { QRCodeSVG } from 'qrcode.react';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

interface NewPermitRequestProps {
  onBack: () => void;
  initialDepartment?: string;
}

const NewPermitRequest: React.FC<NewPermitRequestProps> = ({ onBack, initialDepartment }) => {
  const { showAlert } = useAlert();
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Requirements, Step 2: Details, Step 3: Success & QR
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    department: initialDepartment || 'Tourism Department',
    date: '',
    startTime: '',
    endTime: '',
    province: 'Cavite',
    city: 'Bacoor Cavite',
    barangay: BACOOR_BARANGAYS[0],
    street: '',
    venue: '', // Specific Location
    description: '',
    imageUrl: '',
    
    // Default Docs
    letterOfIntentUrl: '',
    validIdUrl: '',
    businessPermitUrl: '',

    // PESO Specific Docs
    companyLogoUrl: '',
    companyProfileUrl: '',
    birRegistrationUrl: '',
    secDtiUrl: '',
    philJobNetUrl: '',
    agencyDocumentsUrl: '',
    noPendingCaseUrl: '',

    lat: BARANGAY_COORDS[BACOOR_BARANGAYS[0]].lat,
    lng: BARANGAY_COORDS[BACOOR_BARANGAYS[0]].lng,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
      if (initialDepartment) {
          setFormData(prev => ({ ...prev, department: initialDepartment }));
      }
  }, [initialDepartment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'barangay') {
        const coords = BARANGAY_COORDS[value];
        setFormData(prev => ({
            ...prev,
            barangay: value,
            lat: coords?.lat || prev.lat,
            lng: coords?.lng || prev.lng,
            street: '', // Clear street when barangay changes to avoid mismatch
            venue: '', // Clear venue when barangay changes
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddressBlur = async () => {
      // Don't geocode if we just have the default barangay and no specific details
      if (!formData.street && !formData.venue) return;

      setIsGeocoding(true);

      // Construct search query. Prioritize Venue + Street, fallback to Street + Barangay
      let query = '';
      if (formData.venue && formData.street) {
          query = `${formData.venue}, ${formData.street}, ${formData.barangay}`;
      } else if (formData.street) {
          query = `${formData.street}, ${formData.barangay}`;
      } else if (formData.venue) {
           query = `${formData.venue}, ${formData.barangay}`;
      }

      if (query) {
          const result = await geocodeLocation(query);
          if (result) {
              setFormData(prev => ({
                  ...prev,
                  lat: result.lat,
                  lng: result.lng
              }));
          } else {
              // Fallback: if specific geocode fails, ensure we at least have the barangay center
              if (formData.barangay && BARANGAY_COORDS[formData.barangay]) {
                  setFormData(prev => ({
                      ...prev,
                      lat: BARANGAY_COORDS[formData.barangay].lat,
                      lng: BARANGAY_COORDS[formData.barangay].lng
                  }));
              }
          }
      }
      setIsGeocoding(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file, 1024, 0.7);
        setFormData(prev => ({ ...prev, [fieldName]: resizedBase64 }));
      } catch (err) {
        console.error("Image resize error:", err);
        showAlert("Error", "Failed to process image.", "error");
      }
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (formData.department === 'PESO Department') {
          if (
              !formData.letterOfIntentUrl || 
              !formData.companyLogoUrl || 
              !formData.companyProfileUrl || 
              !formData.businessPermitUrl ||
              !formData.birRegistrationUrl ||
              !formData.secDtiUrl ||
              !formData.philJobNetUrl ||
              !formData.noPendingCaseUrl
          ) {
              showAlert("Incomplete Requirements", "Please upload all required PESO accreditation documents.", "warning");
              return;
          }
      } else {
          if (!formData.letterOfIntentUrl || !formData.validIdUrl || !formData.businessPermitUrl) {
              showAlert("Incomplete Requirements", "Please upload all verification documents (Letter of Intent, Valid ID, and Business Permit) before proceeding.", "warning");
              return;
          }
      }
      
      setStep(2);
      window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!formData.imageUrl) {
        showAlert("Missing Event Poster", "Please upload an event poster/image.", "warning");
        return;
    }

    setIsSubmitting(true);
    try {
        // --- RATE LIMIT CHECK ---
        const userRequests = await fetchUserRequests(auth.currentUser.uid);
        
        // Count requests submitted today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        const submittedTodayCount = userRequests.filter(req => {
            if (!req.submittedAt) return false;
            const reqDate = new Date(req.submittedAt);
            reqDate.setHours(0, 0, 0, 0);
            return reqDate.getTime() === today.getTime();
        }).length;

        if (submittedTodayCount >= 3) {
            showAlert("Daily Limit Reached", "You have reached the limit of 3 permit requests per day. Please try again tomorrow.", "warning");
            setIsSubmitting(false);
            return;
        }
        // ------------------------

        const newEvent = await addEvent({
            name: formData.title,
            organizer: formData.organizer,
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            venue: formData.venue, // Specific Location
            description: formData.description,
            city: formData.city,
            barangay: formData.barangay,
            province: formData.province,
            street: formData.street,
            category: [CATEGORIES[0]], // Default category
            
            // New Fields
            department: formData.department,
            imageUrl: formData.imageUrl,
            
            // Requirements (conditionally filled based on department, but passing all logic is handled by service cleaning or just empty strings are fine for optional)
            letterOfIntentUrl: formData.letterOfIntentUrl,
            validIdUrl: formData.validIdUrl,
            businessPermitUrl: formData.businessPermitUrl,
            
            // PESO Specifics
            companyLogoUrl: formData.companyLogoUrl,
            companyProfileUrl: formData.companyProfileUrl,
            birRegistrationUrl: formData.birRegistrationUrl,
            secDtiUrl: formData.secDtiUrl,
            philJobNetUrl: formData.philJobNetUrl,
            agencyDocumentsUrl: formData.agencyDocumentsUrl,
            noPendingCaseUrl: formData.noPendingCaseUrl,

            lat: formData.lat,
            lng: formData.lng,
            status: 'pending', 
            createdBy: auth.currentUser.uid,
            createdByAdmin: false
        });

        setCreatedEventId(newEvent.id);
        setStep(3);
        window.scrollTo(0, 0);
    } catch (error) {
        console.error(error);
        showAlert("Error", "Failed to submit request. Please try again.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const downloadQRCode = () => {
      const svg = document.getElementById('event-qr-code');
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
              downloadLink.download = `QR_${formData.title.replace(/\s+/g, '_')}.png`;
              downloadLink.href = `${pngFile}`;
              downloadLink.click();
          }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const inputClass = "w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm";
  const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2";
  
  const uploadBoxClass = "relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer overflow-hidden group";

  const renderUploadField = (label: string, fieldName: string, value: string, required: boolean = true, helperText?: string) => (
      <div className="flex flex-col h-full animate-fade-in-up">
          <label className={labelClass}>
              {label} {required && <span className="text-red-500">*</span>}
          </label>
          {helperText && <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 -mt-1">{helperText}</p>}
          <div className={uploadBoxClass}>
              <input 
                  type="file" 
                  onChange={(e) => handleFileChange(e, fieldName)} 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              
              {value ? (
                  <>
                    <img src={value || undefined} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Change</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm z-10">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center p-4 text-center">
                      <div className="w-10 h-10 mb-2 text-primary-500 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                      </div>
                      <span className="text-[#7c3aed] text-xs font-bold">Upload Document</span>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 px-4 py-4 flex items-center">
        {step !== 3 && (
            <button onClick={step === 1 ? onBack : () => setStep(1)} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ChevronLeftIcon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
            </button>
        )}
        <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {step === 1 ? 'Upload Requirements' : step === 2 ? 'Event Proposal' : 'Success'}
            </h1>
            {step !== 3 && (
                <span className="text-xs text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider">
                    Step {step} of 2 • {formData.department}
                </span>
            )}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-lg animate-fade-in-up">
        
        <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-6">
            
            {/* STEP 1: REQUIREMENTS */}
            {step === 1 && (
                <div className="animate-fade-in-up">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex gap-4 mb-8">
                        <div className="text-blue-600 dark:text-blue-400 flex-shrink-0 pt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                            Please upload all required verification documents for the <strong>{formData.department}</strong>. You must complete this step before filling out event details.
                        </p>
                    </div>

                    {formData.department === 'PESO Department' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    {renderUploadField("Letter of Intent", "letterOfIntentUrl", formData.letterOfIntentUrl, true, "Addressed to Hon. STRIKE B. REVILLA (City Mayor) Thru: DR. ABRAHAM D. DE CASTRO (PESO Manager)")}
                                </div>
                                {renderUploadField("Company Logo (.png)", "companyLogoUrl", formData.companyLogoUrl)}
                                {renderUploadField("Company Profile", "companyProfileUrl", formData.companyProfileUrl)}
                                {renderUploadField("Business Permit", "businessPermitUrl", formData.businessPermitUrl)}
                                {renderUploadField("BIR Registration", "birRegistrationUrl", formData.birRegistrationUrl)}
                                {renderUploadField("SEC/DTI/CDA/DOLE Cert", "secDtiUrl", formData.secDtiUrl)}
                                {renderUploadField("PhilJobNet Registration", "philJobNetUrl", formData.philJobNetUrl)}
                                {renderUploadField("Cert. of No Pending Case", "noPendingCaseUrl", formData.noPendingCaseUrl)}
                                <div className="col-span-2">
                                    {renderUploadField("Additional Agency Docs (Optional)", "agencyDocumentsUrl", formData.agencyDocumentsUrl, false, "PRPA, D.O.-174, or PCAB (if applicable)")}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {renderUploadField("Letter of Intent", "letterOfIntentUrl", formData.letterOfIntentUrl)}
                            {renderUploadField("Valid ID", "validIdUrl", formData.validIdUrl)}
                            <div className="col-span-2">
                                {renderUploadField("Business Permit", "businessPermitUrl", formData.businessPermitUrl)}
                            </div>
                        </div>
                    )}

                    <div className="pt-8">
                        <button 
                            type="submit"
                            className="w-full bg-[#7c3aed] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:bg-[#6d28d9] transition-colors active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>Next: Event Proposal</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: PROPOSAL FORM */}
            {step === 2 && (
                <div className="animate-fade-in-up space-y-6">
                    {/* Event Title */}
                    <div>
                        <label className={labelClass}>Event Title</label>
                        <input 
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Community Bazaar"
                            className={inputClass}
                            required
                        />
                    </div>

                    {/* Organizer */}
                    <div>
                        <label className={labelClass}>Organizer / Organization</label>
                        <input 
                            type="text"
                            name="organizer"
                            value={formData.organizer}
                            onChange={handleChange}
                            placeholder="Full Name or Group Name"
                            className={inputClass}
                            required
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-4 pt-2">
                        <CustomDatePicker
                          value={formData.date}
                          onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
                          label="Proposed Date"
                          required
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <CustomTimePicker
                            value={formData.startTime}
                            onChange={(val) => setFormData(prev => ({ ...prev, startTime: val }))}
                            label="Start Time"
                            required
                          />
                          <CustomTimePicker
                            value={formData.endTime}
                            onChange={(val) => setFormData(prev => ({ ...prev, endTime: val }))}
                            label="End Time"
                            required
                          />
                        </div>
                    </div>

                    {/* Detailed Location Address Section */}
                    <div className="space-y-4 pt-2">
                        {/* Baranggay */}
                        <div>
                            <label htmlFor="barangay" className={labelClass}>Baranggay</label>
                            <div className="relative">
                                <select
                                    name="barangay"
                                    id="barangay"
                                    value={formData.barangay}
                                    onChange={handleChange}
                                    required
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    {BACOOR_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Street/Road */}
                        <div>
                            <label htmlFor="street" className={labelClass}>Street/Road</label>
                            <div className="relative">
                                <select
                                    name="street"
                                    id="street"
                                    value={formData.street}
                                    onChange={(e) => {
                                        handleChange(e);
                                        setFormData(prev => ({...prev, venue: ''}));
                                    }}
                                    onBlur={handleAddressBlur}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="">Select a street...</option>
                                    {(BARANGAY_STREETS[formData.barangay] || BACOOR_STREETS).map(street => (
                                        <option key={street} value={street}>{street}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Specific Location */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="venue" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Specific Location / Venue Name</label>
                                {isGeocoding && <span className="text-xs text-primary-500 animate-pulse flex items-center"><Spinner size="sm" /> <span className="ml-1">Locating...</span></span>}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="venue"
                                    id="venue"
                                    list="venues-list-permit"
                                    placeholder="e.g., SM City Event Center, 2nd Floor ...."
                                    value={formData.venue}
                                    onChange={handleChange}
                                    onBlur={handleAddressBlur}
                                    required
                                    className={inputClass}
                                    autoComplete="off"
                                />
                                <datalist id="venues-list-permit">
                                    {(RECOMMENDED_VENUES[formData.barangay] || []).map(venue => (
                                        <option key={venue} value={venue} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelClass}>Description & Purpose</label>
                        <textarea 
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Describe the nature of your event..."
                            className={inputClass}
                            required
                        />
                    </div>

                    {/* Event Poster Upload - Separate Section */}
                    <div>
                        <label className={labelClass}>Event Poster / Banner <span className="text-red-500">*</span></label>
                        <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
                            <input 
                                type="file" 
                                onChange={(e) => handleFileChange(e, 'imageUrl')} 
                                accept="image/*" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            
                            {formData.imageUrl ? (
                                <div className="relative w-full h-40">
                                    <img src={formData.imageUrl || undefined} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                                        <span className="text-white font-medium text-sm">Click to replace</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 mb-3 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Upload Event Poster</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-[#7c3aed] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:bg-[#6d28d9] transition-colors active:scale-95 flex items-center justify-center"
                        >
                            {isSubmitting ? <Spinner size="sm" /> : 'Submit Application'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SUCCESS & QR CODE */}
            {step === 3 && createdEventId && (
                <div className="animate-fade-in-up flex flex-col items-center text-center py-8">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Application Submitted!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                        Your event proposal is now pending review. Here is the unique QR code for your event. You can use this for check-ins once approved.
                    </p>
                    
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-6 flex flex-col items-center">
                        <QRCodeSVG 
                            id="event-qr-code"
                            value={`commove://event/${createdEventId}`} 
                            size={200} 
                            level="H"
                            includeMargin={true}
                        />
                        <p className="text-xs text-gray-400 mt-4 font-mono">{createdEventId}</p>
                    </div>

                    <div className="w-full space-y-3">
                        <button 
                            type="button"
                            onClick={downloadQRCode}
                            className="w-full bg-[#7c3aed] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:bg-[#6d28d9] transition-colors active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download QR Code
                        </button>
                        <button 
                            type="button"
                            onClick={() => window.history.go(-2)}
                            className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}

        </form>

      </main>
    </div>
  );
};

export default NewPermitRequest;
