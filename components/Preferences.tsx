
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
    <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">Tell us what you like</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select interests for personalised recommendations.</p>
        </div>
        <button
          onClick={onSkip}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-3 flex-shrink-0"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Categories grid — scrollable */}
      <div className="overflow-y-auto px-5 pb-3 flex-1">
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(category => {
            const isSelected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                disabled={isSaving}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all duration-150 leading-tight text-center
                  ${isSelected
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                `}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700 shrink-0 space-y-2">
        <button
          onClick={handleSave}
          disabled={selectedCategories.length === 0 || isSaving}
          className="w-full bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-primary-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-sm"
        >
          {isSaving ? (
            <><Spinner size="sm" /><span className="ml-2">Saving...</span></>
          ) : `Save Preferences${selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}`}
        </button>
        <button
          onClick={onSkip}
          disabled={isSaving}
          className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1 disabled:opacity-40"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default Preferences;
