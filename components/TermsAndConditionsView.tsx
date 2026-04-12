import React from 'react';

interface TermsAndConditionsViewProps {
  onBack?: () => void;
}

const TermsAndConditionsView: React.FC<TermsAndConditionsViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 pb-20">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms and Conditions</h1>
          
          <div className="prose dark:prose-invert max-w-none text-sm md:text-base text-gray-600 dark:text-gray-300 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Commove application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. User Accounts</h2>
              <p>
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Event Participation and Browsing</h2>
              <p>
                Resident users may browse and participate in events.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Prohibited Conduct</h2>
              <p>
                You agree not to use the App to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Violate any local, state, national, or international law.</li>
                <li>Submit false, misleading, or fraudulent information.</li>
                <li>Interfere with or disrupt the operation of the App or servers.</li>
                <li>Attempt to gain unauthorized access to any part of the App.</li>
              </ul>
            </section>

            <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

            <section className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-xl border border-primary-100 dark:border-primary-800/30">
              <h2 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Data Privacy Disclaimer
              </h2>
              <div className="space-y-4 text-primary-800 dark:text-primary-200">
                <p>
                  <strong>Data Collection:</strong> We collect personal information that you provide directly to us, including your name, email address, location data, and any documents uploaded for permit applications.
                </p>
                <p>
                  <strong>Data Usage:</strong> Your data is used exclusively to provide, maintain, and improve our services, process event permits, and communicate with you regarding your account or events.
                </p>
                <p>
                  <strong>Data Protection:</strong> We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p>
                  <strong>Third-Party Sharing:</strong> We do not sell your personal data. Information may be shared with authorized local government units (LGUs) and facilitators strictly for the purpose of processing and managing event permits.
                </p>
                <p className="text-xs mt-4 opacity-80">
                  By continuing to use Commove, you acknowledge that you have read and understood this Data Privacy Disclaimer and consent to the collection and use of your data as described.
                </p>
              </div>
            </section>

            <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of the App following such modifications constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">6. Contact Information</h2>
              <p>
                If you have any questions about these Terms or our Privacy practices, please contact our support team through the Help & Support section of the App.
              </p>
            </section>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditionsView;
