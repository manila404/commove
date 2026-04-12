
import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import Spinner from './Spinner';

interface PreferencesProps {
  onSave: (categories: string[]) => Promise<void>;
  onSkip: () => void;
  initialPreferences?: string[];
}

const Preferences: React.FC<PreferencesProps> = ({ onSave, onSkip, initialPreferences = [] }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(selectedCategories);
    setIsSaving(false);
  };

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl relative animate-fade-in-up">
      {/* Close Button */}
      <button 
        onClick={onSkip}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Tell us what you like</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Select your interests to get personalized event recommendations.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {CATEGORIES.map(category => {
            const isSelected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                disabled={isSaving}
                className={`
                  px-5 py-2 rounded-full font-semibold border-2 transition-all duration-200
                  ${isSelected
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleSave}
            disabled={selectedCategories.length === 0 || isSaving}
            className="w-full max-w-xs mx-auto bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
                <>
                    <Spinner size="sm" />
                    <span className="ml-2">Saving...</span>
                </>
            ) : 'Save Preferences'}
          </button>
           <button
            onClick={onSkip}
            disabled={isSaving}
            className="mt-4 text-sm text-gray-500 hover:underline disabled:text-gray-400"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
