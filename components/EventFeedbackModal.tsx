
import React, { useState } from 'react';
import { Star, X, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventType, User } from '../types';
import { submitFeedback } from '../services/feedbackService';
import { useAlert } from '../contexts/AlertContext';

interface EventFeedbackModalProps {
    event: EventType;
    user: User;
    onClose: () => void;
}

const EventFeedbackModal: React.FC<EventFeedbackModalProps> = ({ event, user, onClose }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { showAlert } = useAlert();

    const handleSubmit = async () => {
        if (rating === 0) {
            showAlert("Selection Required", "Please select a star rating before submitting.", "info");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitFeedback({
                eventId: event.id,
                userId: user.uid,
                userName: user.name || 'Anonymous',
                userAvatar: user.avatarUrl || null,
                rating,
                createdAt: Date.now()
            });
            setIsSubmitted(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            showAlert("Submission Error", "We couldn't save your feedback. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            >
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10"
                >
                    <X className="w-6 h-6 text-gray-400" />
                </button>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div 
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">How was the event?</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium italic">
                                        "{event.name}"
                                    </p>
                                </div>

                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            onClick={() => setRating(star)}
                                            className="p-1 transition-transform active:scale-90"
                                        >
                                            <Star 
                                                className={`w-10 h-10 transition-all duration-300 ${
                                                    (hoveredRating || rating) >= star 
                                                        ? 'text-yellow-400 fill-yellow-400 scale-110' 
                                                        : 'text-gray-200 dark:text-gray-700'
                                                }`} 
                                            />
                                        </button>
                                    ))}
                                </div>



                                <button 
                                    onClick={handleSubmit}
                                    disabled={rating === 0 || isSubmitting}
                                    className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-[2rem] shadow-xl shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Submit Feedback</span>
                                            <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 text-center space-y-4"
                            >
                                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Thank You!</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium px-4">
                                    Your rating helps us improve future events and recognize great organizers.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default EventFeedbackModal;
