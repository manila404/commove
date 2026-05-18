import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, XCircle, Clock, X } from 'lucide-react';

export type ConfirmationVariant = 'publish' | 'update' | 'cancel' | 'schedule' | 'danger';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<ConfirmationVariant, {
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  confirmShadow: string;
  accentBorder: string;
}> = {
  publish: {
    icon: CheckCircle2,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    confirmBg: 'bg-green-600',
    confirmHover: 'hover:bg-green-700',
    confirmShadow: 'shadow-green-600/25',
    accentBorder: 'border-t-4 border-t-green-500',
  },
  update: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBg: 'bg-amber-600',
    confirmHover: 'hover:bg-amber-700',
    confirmShadow: 'shadow-amber-600/25',
    accentBorder: 'border-t-4 border-t-amber-500',
  },
  cancel: {
    icon: XCircle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBg: 'bg-red-600',
    confirmHover: 'hover:bg-red-700',
    confirmShadow: 'shadow-red-600/25',
    accentBorder: 'border-t-4 border-t-red-500',
  },
  schedule: {
    icon: Clock,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBg: 'bg-blue-600',
    confirmHover: 'hover:bg-blue-700',
    confirmShadow: 'shadow-blue-600/25',
    accentBorder: 'border-t-4 border-t-blue-500',
  },
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBg: 'bg-red-600',
    confirmHover: 'hover:bg-red-700',
    confirmShadow: 'shadow-red-600/25',
    accentBorder: 'border-t-4 border-t-red-500',
  },
};

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'publish',
  onConfirm,
  onCancel,
}) => {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`relative w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${cfg.accentBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 text-center">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${cfg.iconBg} flex items-center justify-center mx-auto mb-5 shadow-sm`}>
                <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-sm mx-auto">
                {message}
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 px-5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-3 px-5 rounded-xl text-sm font-bold text-white ${cfg.confirmBg} ${cfg.confirmHover} shadow-lg ${cfg.confirmShadow} transition-all active:scale-95 hover:-translate-y-0.5`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;
