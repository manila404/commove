import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePermissions } from '../contexts/PermissionContext';
import { CameraIcon, MapPinIcon, BellIcon, XMarkIcon } from '../constants';

interface PermissionManagerProps {
  onComplete: () => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ onComplete }) => {
  const { permissions, requestLocation, requestCamera, requestNotifications } = usePermissions();
  const [step, setStep] = useState(0);

  const steps = [
    {
      id: 'location',
      title: 'Location Access',
      description: 'Commove uses your location to show events near you and track your progress during activities.',
      icon: <MapPinIcon className="w-12 h-12 text-blue-500" />,
      status: permissions.location,
      request: requestLocation,
    },
    {
      id: 'camera',
      title: 'Camera Access',
      description: 'Needed for scanning QR codes at event check-points and completing challenges.',
      icon: <CameraIcon className="w-12 h-12 text-green-500" />,
      status: permissions.camera,
      request: requestCamera,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Get reminders for upcoming events and updates on your challenge status.',
      icon: <BellIcon className="w-12 h-12 text-purple-500" />,
      status: permissions.notifications,
      request: requestNotifications,
    },
  ];

  const currentStep = steps[step];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleRequest = async () => {
    const success = await currentStep.request();
    if (success) {
      handleNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gray-50 rounded-full">
              {currentStep.icon}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{currentStep.title}</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {currentStep.description}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleRequest}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
            >
              Allow Access
            </button>
            <button
              onClick={handleNext}
              className="w-full py-4 text-gray-500 font-medium hover:bg-gray-50 rounded-2xl transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>

        <div className="px-8 py-4 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-400">
            Step {step + 1} of {steps.length}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionManager;
