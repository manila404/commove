
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
}

const steps = [
    {
        title: "Discover Local Events",
        description: "Find exciting local events, workshops, and gatherings happening right in your neighborhood.",
        image: "/onboarding_illustration_1.png",
        bgColor: "bg-orange-50/50"
    },
    {
        title: "Seamless Registration",
        description: "Easily register for events with just one tap and manage your schedules effortlessly.",
        image: "/onboarding_illustration_2.png",
        bgColor: "bg-blue-50/50"
    },
    {
        title: "Stay Connected",
        description: "Get real-time updates and notifications about your favorite events and community news.",
        image: "/onboarding_illustration_3.png",
        bgColor: "bg-purple-50/50"
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);

    const goNext = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-white flex flex-col overflow-hidden">
            {/* Top bar — back button */}
            <div className="flex items-center px-4 pt-12 pb-2 h-16">
                {currentStep > 0 ? (
                    <button
                        onClick={goBack}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                ) : (
                    <div className="w-10" /> /* spacer to keep layout stable */
                )}
            </div>

            {/* Slide content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        initial={{ x: direction * 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * -300, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="flex flex-col items-center w-full max-w-sm"
                    >
                        <div className="relative w-full aspect-square flex items-center justify-center mb-10">
                            <div className={`absolute inset-0 rounded-full scale-75 opacity-20 blur-3xl ${steps[currentStep].bgColor}`} />
                            <img
                                src={steps[currentStep].image}
                                alt={steps[currentStep].title}
                                className="relative z-10 w-full h-full object-contain"
                            />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-3 tracking-tight">
                            {steps[currentStep].title}
                        </h2>
                        <p className="text-[15px] text-gray-500 text-center leading-relaxed">
                            {steps[currentStep].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom controls */}
            <div className="w-full px-6 pb-12 space-y-6">
                {/* Dots */}
                <div className="flex justify-center gap-2">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-[#8b5cf6]' : 'w-2 bg-gray-200'}`}
                        />
                    ))}
                </div>

                {/* Skip + Next */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={onComplete}
                        className="text-gray-400 font-semibold text-sm hover:text-gray-600 transition-colors"
                    >
                        Skip
                    </button>

                    <button
                        onClick={goNext}
                        className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-3 rounded-2xl font-semibold text-sm transition-colors active:scale-95"
                    >
                        {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
