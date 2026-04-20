
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-white flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="flex-1 flex flex-col items-center justify-center w-full max-w-sm"
                >
                    <div className={`relative w-full aspect-square flex items-center justify-center mb-12`}>
                        {/* Background Blob */}
                        <div className={`absolute inset-0 rounded-full scale-75 opacity-20 blur-3xl ${steps[currentStep].bgColor}`} />
                        <img 
                            src={steps[currentStep].image} 
                            alt={steps[currentStep].title} 
                            className="relative z-10 w-full h-full object-contain"
                        />
                    </div>

                    <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-4 tracking-tight">
                        {steps[currentStep].title}
                    </h2>
                    <p className="text-[15px] text-gray-500 text-center leading-relaxed">
                        {steps[currentStep].description}
                    </p>
                </motion.div>
            </AnimatePresence>

            {/* Bottom Controls */}
            <div className="w-full max-w-sm space-y-8">
                {/* Dots indicator */}
                <div className="flex justify-center gap-2">
                    {steps.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-[#8b5cf6]' : 'w-2 bg-gray-200'}`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <button 
                        onClick={handleSkip}
                        className="text-gray-400 font-bold text-sm tracking-wide hover:text-gray-600 transition-colors"
                    >
                        Skip
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-8 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                    >
                        {currentStep === steps.length - 1 ? "Start!" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
