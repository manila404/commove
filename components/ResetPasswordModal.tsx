
import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { CommoveLogo, EyeIcon, EyeSlashIcon } from '../constants';

interface ResetPasswordModalProps {
    oobCode: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ oobCode, onClose, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');
    const [codeValid, setCodeValid] = useState<boolean | null>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);

    useEffect(() => {
        verifyPasswordResetCode(auth, oobCode)
            .then((verifiedEmail) => {
                setEmail(verifiedEmail);
                setCodeValid(true);
            })
            .catch(() => {
                setCodeValid(false);
                setError('This password reset link is invalid or has expired. Please request a new one.');
            });
    }, [oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
            // Clean up URL params
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('oobCode');
            url.searchParams.delete('apiKey');
            url.searchParams.delete('lang');
            window.history.replaceState({}, '', url.toString());
            setTimeout(onSuccess, 2000);
        } catch (err: any) {
            if (err.code === 'auth/expired-action-code') {
                setError('This link has expired. Please request a new password reset email.');
            } else if (err.code === 'auth/invalid-action-code') {
                setError('This link is invalid or already used. Please request a new one.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters.');
            } else {
                setError('Failed to reset password. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-8">
                <div className="flex items-center gap-2 mb-6">
                    <CommoveLogo className="w-8 h-8" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white">Commove</span>
                </div>

                {codeValid === null && (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {success && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Your password has been changed. Redirecting to sign in...</p>
                    </div>
                )}

                {codeValid === false && !success && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link Expired</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-full hover:bg-primary-700 transition-all"
                        >
                            Request New Reset Link
                        </button>
                    </div>
                )}

                {codeValid === true && !success && (
                    <>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Set New Password</h2>
                        {email && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
                                Resetting for <span className="font-medium text-gray-800 dark:text-gray-200">{email}</span>
                            </p>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                                />
                                <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400">
                                    {passwordVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={confirmVisible ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-gray-400"
                                />
                                <button type="button" onClick={() => setConfirmVisible(!confirmVisible)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400">
                                    {confirmVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>

                            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-full hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:bg-gray-400 text-base active:scale-95"
                            >
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordModal;
