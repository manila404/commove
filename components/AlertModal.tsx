
import React from 'react';
import { ShieldCheckIcon } from '../constants';

interface AlertModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  type,
  variant,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Icon selection based on variant
  const renderIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default: // info
        return (
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 animate-fade-in-up border border-gray-100 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
      >
        {renderIcon()}
        
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors text-sm shadow-lg active:scale-95 ${
              variant === 'error' 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' 
                : variant === 'success'
                ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                : 'bg-primary-600 hover:bg-primary-700 shadow-purple-500/30'
            }`}
          >
            {type === 'confirm' ? 'Confirm' : 'Okay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
