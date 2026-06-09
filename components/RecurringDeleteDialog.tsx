import React from 'react';
import { CalendarRange, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventType } from '../types';

interface RecurringDeleteDialogProps {
  open: boolean;
  event: EventType | null;
  onDeleteSingle: () => void;
  onDeleteFollowing: () => void;
  onCancel: () => void;
}

const RecurringDeleteDialog: React.FC<RecurringDeleteDialogProps> = ({
  open,
  event,
  onDeleteSingle,
  onDeleteFollowing,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {open && event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#111827]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Cancel Recurring Event</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose how you want to delete <span className="font-semibold text-gray-700 dark:text-gray-200">{event.name}</span>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onDeleteSingle}
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Cancel this event only</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Only the {event.date} occurrence will be removed.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onDeleteFollowing}
                className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <CalendarRange className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Cancel this and following events</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">This occurrence and all future dates in the series will be removed.</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={onCancel}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecurringDeleteDialog;
