
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { isUsernameUnique, updateUserData } from '../services/userService';
import { X, User as UserIcon, Calendar, Info, CheckCircle } from 'lucide-react';
import Spinner from './Spinner';
import { useAlert } from '../contexts/AlertContext';

interface EditProfileModalProps {
    user: User | null;
    onClose: () => void;
    onUserUpdate: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onUserUpdate }) => {
    const { showAlert } = useAlert();
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [birthday, setBirthday] = useState(user?.birthday || '');
    const [address, setAddress] = useState(user?.address || '');
    const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
    const [sex, setSex] = useState(user?.sex || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setUsername(user.username || '');
            setAddress(user.address || '');
            setContactNumber(user.contactNumber || '');
            setBirthday(user.birthday || '');
            setSex(user.sex || '');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        setError('');

        try {
            // Validation
            if (!name.trim()) throw new Error("Name is required.");
            if (!username.trim()) throw new Error("Username is required.");
            if (!address.trim()) throw new Error("Address is required.");

            const cleanUsername = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
            
            // Uniqueness check only if username changed
            if (cleanUsername !== user.username) {
                const isUnique = await isUsernameUnique(cleanUsername);
                if (!isUnique) throw new Error("This username is already taken.");
            }

            const updatedData: Partial<User> = {
                name: name.trim(),
                username: cleanUsername,
                contactNumber: contactNumber.trim(),
                address: address.trim(),
                birthday,
                sex
            };

            await updateUserData(user.uid, updatedData);
            onUserUpdate({ ...user, ...updatedData });
            showAlert("Success", "Profile updated successfully!", "success");
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update profile.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all"
                            placeholder="Full Name"
                            required
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                            <input
                                type="text"
                                value={username.startsWith('@') ? username.slice(1) : username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all"
                                placeholder="username"
                                required
                            />
                        </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Contact Number (Optional)</label>
                        <input
                            type="tel"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all"
                            placeholder="Contact Number"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all"
                            placeholder="Address"
                            required
                        />
                    </div>

                    {/* Birthday & Sex */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Birthday</label>
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sex</label>
                            <select
                                value={sex}
                                onChange={(e) => setSex(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary-500 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 outline-none transition-all appearance-none"
                                required
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
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
