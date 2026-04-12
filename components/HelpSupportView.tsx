
import React, { useState } from 'react';
import { ChevronLeftIcon, HelpIcon, EnvelopeOpenIcon } from '../constants';

interface HelpSupportViewProps {
  onBack: () => void;
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 text-left flex justify-between items-center focus:outline-none"
            >
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{question}</span>
                <ChevronLeftIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-180'}`} />
            </button>
            {isOpen && (
                <div className="pb-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed animate-fade-in">
                    {answer}
                </div>
            )}
        </div>
    );
};

const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up pb-20">
        
        {/* Contact Support Card */}
        <div className="bg-[#7c3aed] rounded-2xl p-6 shadow-lg text-white mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2">Need help?</h2>
                <p className="text-white/80 text-sm mb-4">Our support team is available to assist you with any issues or questions.</p>
                <button className="bg-white text-[#7c3aed] px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-gray-50 transition-colors">
                    Contact Support
                </button>
            </div>
            <div className="absolute -right-6 -bottom-6 text-white/10">
                <HelpIcon className="w-32 h-32" />
            </div>
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h3>
            
            <FAQItem 
                question="How do I submit an event permit?" 
                answer="Go to your Profile dashboard and click on 'Submit Request'. Follow the 2-step process to upload your requirements and event details. Our facilitators will review your submission." 
            />
            <FAQItem 
                question="Why was my event disapproved?" 
                answer="Events may be disapproved due to incomplete requirements, conflicting schedules, or inappropriate content. Check the rejection reason in your application details for specifics." 
            />
            <FAQItem 
                question="How does the AI recommendation work?" 
                answer="Commove uses a local algorithm that learns from your preferences, saved events, and viewed items to suggest events you might like. It prioritizes events happening now and nearby." 
            />
            <FAQItem 
                question="Can I change my account details?" 
                answer="Currently, basic profile details are pulled from your initial registration. To update sensitive information, please contact support or re-register." 
            />
        </div>

        {/* Contact Info */}
        <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">Contact Us</p>
            <div className="flex flex-col gap-3">
                <a href="mailto:support@commove.com" className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <EnvelopeOpenIcon className="w-5 h-5 text-primary-500" />
                    <span className="font-medium text-sm">support@commove.com</span>
                </a>
            </div>
            <p className="text-xs text-gray-400 mt-8">
                App Version 1.0.5 <br/>
                © 2024 Commove Bacoor
            </p>
        </div>

      </main>
    </div>
  );
};

export default HelpSupportView;
