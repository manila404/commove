
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { isUsernameUnique, updateUserData } from '../services/userService';
import { X, User as UserIcon, Calendar, Info, CheckCircle, MapPin } from 'lucide-react';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';
import { searchAddressGeoapify } from '../services/osmService';

interface EditProfileModalProps {
    user: User | null;
    onClose: () => void;
    onUserUpdate: (updatedUser: User) => void;
}

const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    let local = digits;
    if (local.startsWith('63')) local = local.slice(2);
    if (local.startsWith('0')) local = local.slice(1);
    local = local.slice(0, 10);
    if (!local) return '';
    if (local.length <= 3) return `+63 ${local}`;
    if (local.length <= 6) return `+63 ${local.slice(0,3)} - ${local.slice(3)}`;
    return `+63 ${local.slice(0,3)} - ${local.slice(3,6)} - ${local.slice(6)}`;
};

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

// Parse "YYYY-MM-DD" → { year, month, day }
const parseBirthday = (val: string) => {
    if (!val) return { year: '', month: '', day: '' };
    const [y, m, d] = val.split('-');
    return { year: y || '', month: m ? String(parseInt(m)) : '', day: d ? String(parseInt(d)) : '' };
};

// Combine → "YYYY-MM-DD"
const buildBirthday = (year: string, month: string, day: string) => {
    if (!year || !month || !day) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Split stored address "Blk X, Street Y" → { blockHouse, street }
const parseAddress = (addr: string) => {
    const idx = addr.indexOf(', ');
    if (idx === -1) return { blockHouse: '', street: addr };
    return { blockHouse: addr.slice(0, idx), street: addr.slice(idx + 2) };
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onUserUpdate }) => {
    const { showAlert } = useAlert();
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');

    // Birthday as 3 separate selects
    const initial = parseBirthday(user?.birthday || '');
    const [birthYear, setBirthYear] = useState(initial.year);
    const [birthMonth, setBirthMonth] = useState(initial.month);
    const [birthDay, setBirthDay] = useState(initial.day);

    // Address split
    const initAddr = parseAddress(user?.address || '');
    const [blockHouse, setBlockHouse] = useState(initAddr.blockHouse);
    const [streetQuery, setStreetQuery] = useState(initAddr.street);
    const [streetSuggestions, setStreetSuggestions] = useState<any[]>([]);
    const [showStreetDrop, setShowStreetDrop] = useState(false);
    const streetRef = useRef<HTMLDivElement>(null);

    const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
    const [sex, setSex] = useState(user?.sex || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Sync fields when user prop changes
    useEffect(() => {
        if (user) {
            setName(user.name);
            setUsername(user.username || '');
            setContactNumber(user.contactNumber || '');
            setSex(user.sex || '');
            const b = parseBirthday(user.birthday || '');
            setBirthYear(b.year); setBirthMonth(b.month); setBirthDay(b.day);
            const a = parseAddress(user.address || '');
            setBlockHouse(a.blockHouse);
            setStreetQuery(a.street);
        }
    }, [user]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (streetRef.current && !streetRef.current.contains(e.target as Node))
                setShowStreetDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Real-time address search
    useEffect(() => {
        if (streetQuery.length < 3) { setStreetSuggestions([]); return; }
        const t = setTimeout(async () => {
            const results = await searchAddressGeoapify(streetQuery);
            setStreetSuggestions(results.slice(0, 5));
        }, 350);
        return () => clearTimeout(t);
    }, [streetQuery]);

    // Day options (accounts for month length)
    const daysInMonth = birthMonth && birthYear
        ? new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate()
        : 31;
    const yearOptions = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        setError('');
        try {
            if (!name.trim()) throw new Error('Name is required.');
            if (!username.trim()) throw new Error('Username is required.');
            if (!streetQuery.trim()) throw new Error('Street address is required.');

            const cleanUsername = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
            const isUnique = await isUsernameUnique(cleanUsername);
            if (!isUnique && cleanUsername !== user.username) throw new Error('Username is already taken.');

            const fullAddress = blockHouse.trim()
                ? `${blockHouse.trim()}, ${streetQuery.trim()}`
                : streetQuery.trim();

            const updatedData: Partial<User> = {
                name: name.trim(),
                username: cleanUsername,
                contactNumber: contactNumber.trim(),
                address: fullAddress,
                birthday: buildBirthday(birthYear, birthMonth, birthDay),
                sex
            };

            await updateUserData(user.uid, updatedData as any);
            onUserUpdate({ ...user, ...updatedData });
            showAlert('Success', 'Profile updated successfully!', 'success');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    const inputCls = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all placeholder:font-normal placeholder:text-gray-400";
    const selectCls = `${inputCls} appearance-none`;
    const labelCls = "text-xs font-bold text-gray-400 uppercase tracking-wider ml-1";

    return (
        <div className="fixed inset-0 z-[8000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Profile</h2>
                            <p className="text-xs text-gray-400">Update your personal information</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                            className={inputCls} placeholder="e.g. Juan dela Cruz" required />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Username</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                            <input type="text"
                                value={username.startsWith('@') ? username.slice(1) : username}
                                onChange={e => setUsername(e.target.value)}
                                className={`${inputCls} pl-8`}
                                placeholder="e.g. juandelacruz" required />
                        </div>
                    </div>

                    {/* Contact Number */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Contact Number (Optional)</label>
                        <input type="tel" value={contactNumber} onChange={e => setContactNumber(formatPhone(e.target.value))}
                            className={inputCls} placeholder="+63 970 - 520 - 1284" />
                    </div>

                    {/* Address — split fields */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Block / House / Room No. (Optional)</label>
                        <input type="text" value={blockHouse} onChange={e => setBlockHouse(e.target.value)}
                            className={`${inputCls} ${blockHouse.trim() && !/\d/.test(blockHouse) ? 'border-red-400' : ''}`}
                            placeholder="e.g. Blk 3, Lot 5 or Room 201" />
                        {blockHouse.trim() && !/\d/.test(blockHouse) && (
                            <p className="text-xs text-red-500 pl-1 flex items-center gap-1">
                                <span>⚠</span> Format: Blk [#] Lot [#], Room [#], House [#], or Unit [#]
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5" ref={streetRef}>
                        <label className={labelCls}>Street Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={streetQuery}
                                onChange={e => { setStreetQuery(e.target.value); setShowStreetDrop(true); }}
                                onFocus={() => setShowStreetDrop(true)}
                                className={`${inputCls} pl-9`}
                                placeholder="e.g. Tirona Highway, Bacoor City" required />
                            {/* Suggestions dropdown */}
                            {showStreetDrop && streetSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                                    {streetSuggestions.map((s, i) => (
                                        <button key={i} type="button"
                                            onClick={() => { setStreetQuery(s.address || s.formatted || s.displayName || ''); setShowStreetDrop(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors">
                                            <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                                    {s.name || s.formatted?.split(',')[0]}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">{s.address || s.formatted}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Birthday — 3 selects */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Birthday</label>
                        <div className="grid grid-cols-3 gap-2">
                            <select value={birthMonth} onChange={e => { setBirthMonth(e.target.value); setBirthDay(''); }}
                                className={selectCls}>
                                <option value="">Month</option>
                                {MONTHS.map((m, i) => (
                                    <option key={m} value={String(i + 1)}>{m}</option>
                                ))}
                            </select>
                            <select value={birthDay} onChange={e => setBirthDay(e.target.value)}
                                className={selectCls}>
                                <option value="">Day</option>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={String(d)}>{d}</option>
                                ))}
                            </select>
                            <select value={birthYear} onChange={e => setBirthYear(e.target.value)}
                                className={selectCls}>
                                <option value="">Year</option>
                                {yearOptions.map(y => (
                                    <option key={y} value={String(y)}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sex */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Gender</label>
                        <select value={sex} onChange={e => setSex(e.target.value)}
                            className={selectCls} required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                            <Info className="w-4 h-4 shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmitting ? <Spinner size="sm" /> : <CheckCircle className="w-5 h-5" />}
                            <span>{isSubmitting ? 'Updating...' : 'Update Profile'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
