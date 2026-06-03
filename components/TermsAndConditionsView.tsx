import React from 'react';

interface TermsAndConditionsViewProps {
  onBack?: () => void;
}

const TermsAndConditionsView: React.FC<TermsAndConditionsViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 pb-20">
      <main className="container mx-auto p-4 md:p-6 animate-fade-in-up">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms and Conditions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last updated: June 3, 2025</p>

          <div className="prose dark:prose-invert max-w-none text-sm md:text-base text-gray-600 dark:text-gray-300 space-y-6">

            {/* 1. Acceptance */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Commove application ("App"), you agree to be bound by these Terms and Conditions and all applicable laws and regulations of the Republic of the Philippines. If you do not agree with any part of these terms, you must not use our services. These Terms constitute a legally binding agreement between you and the Commove development team operating in partnership with local government units (LGUs) of the City of Bacoor, Cavite.
              </p>
            </section>

            {/* 2. User Accounts */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. User Accounts</h2>
              <p>
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration, including your full name, email address, contact number, and residential address. Providing false or misleading information may result in suspension or termination of your account.
              </p>
            </section>

            {/* 3. User Roles */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. User Roles and Responsibilities</h2>
              <p>The App recognizes three types of users, each with distinct rights and responsibilities:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Residents</strong> — may browse, save, and participate in community events. Residents are responsible for ensuring their registration details are accurate.</li>
                <li><strong>Facilitators</strong> — LGU-accredited organizers who may create and manage events. Facilitators must undergo identity verification (KYC) before gaining access. They are responsible for the accuracy and legality of the event information they submit.</li>
                <li><strong>Administrators</strong> — system managers who oversee event approvals, user management, and platform integrity. Admins are bound by the data governance obligations of their LGU.</li>
              </ul>
            </section>

            {/* 4. Event Participation */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Event Participation and Browsing</h2>
              <p>
                Resident users may browse, save, register for, and check in to community events. By registering for or checking in to an event, you consent to your participation data being recorded for attendance, reporting, and government program evaluation purposes. Event organizers may collect additional personal information during registration, which shall be governed by this Policy.
              </p>
            </section>

            {/* 5. Prohibited Conduct */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Prohibited Conduct</h2>
              <p>You agree not to use the App to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Violate any local, national, or international law, including the Data Privacy Act of 2012 (RA 10173).</li>
                <li>Submit false, misleading, or fraudulent information including fake government IDs during facilitator verification.</li>
                <li>Collect or harvest personal data of other users without their consent.</li>
                <li>Interfere with or disrupt the operation of the App, its servers, or associated databases.</li>
                <li>Attempt to gain unauthorized access to any part of the App or to other users' accounts.</li>
                <li>Use the App for any commercial solicitation not authorized by the platform administrators.</li>
                <li>Upload malicious content, spam, or any material that infringes on intellectual property rights.</li>
              </ul>
            </section>

            {/* DIVIDER */}
            <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

            {/* DATA PRIVACY ACT BANNER */}
            <section className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800/40">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Republic Act No. 10173 — Data Privacy Act of 2012
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Commove is fully committed to complying with the <strong>Data Privacy Act of 2012 (RA 10173)</strong> of the Republic of the Philippines and its Implementing Rules and Regulations (IRR) as enforced by the <strong>National Privacy Commission (NPC)</strong>.
              </p>
              <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>What the Law Requires:</strong> RA 10173 mandates that all personal data collected, processed, and stored must be done lawfully, fairly, and transparently. Data must be collected for specified, explicit, and legitimate purposes and must not be processed in a manner incompatible with those purposes.
                </p>
                <p>
                  <strong>Principles We Follow Under RA 10173:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Transparency</strong> — You are informed of what data is collected and why.</li>
                  <li><strong>Legitimate Purpose</strong> — Data is collected only for lawful and declared community service purposes.</li>
                  <li><strong>Proportionality</strong> — Only the minimum data necessary for the stated purpose is collected.</li>
                </ul>
                <p>
                  <strong>Your Rights as a Data Subject (Section 16, RA 10173):</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Right to be Informed</strong> — You have the right to know what personal data is being collected, how it is used, and with whom it is shared.</li>
                  <li><strong>Right to Access</strong> — You may request a copy of your personal data held by the system at any time.</li>
                  <li><strong>Right to Object</strong> — You may object to the processing of your personal data for purposes not directly related to the service.</li>
                  <li><strong>Right to Erasure or Blocking</strong> — You may request the deletion or suspension of your personal data if it is no longer necessary for the purpose it was collected.</li>
                  <li><strong>Right to Rectification</strong> — You may request correction of inaccurate or incomplete personal data.</li>
                  <li><strong>Right to Data Portability</strong> — You may request a copy of your data in a structured, commonly used, and machine-readable format.</li>
                  <li><strong>Right to Damages</strong> — You are entitled to compensation for any damages sustained due to inaccurate, incomplete, outdated, or unlawfully obtained personal data.</li>
                  <li><strong>Right to File a Complaint</strong> — You may lodge a complaint with the National Privacy Commission (NPC) at <span className="underline">www.privacy.gov.ph</span> if you believe your data rights have been violated.</li>
                </ul>
              </div>
            </section>

            {/* DIVIDER */}
            <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

            {/* DATA PRIVACY DISCLAIMER */}
            <section className="bg-primary-50 dark:bg-primary-900/20 p-6 rounded-xl border border-primary-100 dark:border-primary-800/30">
              <h2 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Data Privacy Policy
              </h2>
              <div className="space-y-4 text-primary-800 dark:text-primary-200">

                <div>
                  <p className="font-semibold mb-1">6.1 Data We Collect</p>
                  <p>We collect the following categories of personal information:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                    <li><strong>Account Information</strong> — Full name, email address, contact number, residential address (barangay, street, block/house number), and profile photo.</li>
                    <li><strong>Event Participation Data</strong> — Events you saved, liked, registered for, checked into, or submitted feedback for.</li>
                    <li><strong>Location Data</strong> — Your approximate location when using location-based features such as Nearby Events, if you grant permission.</li>
                    <li><strong>Verification Documents</strong> — Government-issued ID and face photo submitted by facilitator applicants for KYC verification.</li>
                    <li><strong>Device and Usage Data</strong> — Device type, browser type, app version, and usage patterns for performance monitoring and improvement.</li>
                    <li><strong>Demographic Information</strong> — Age group and sex, used for aggregate LGU program reporting.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.2 How We Use Your Data</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                    <li>To create and manage your account and provide access to the platform.</li>
                    <li>To process event registrations, check-ins, and facilitate event management.</li>
                    <li>To verify facilitator identity and prevent fraudulent accreditation.</li>
                    <li>To generate anonymized demographic and participation reports for LGU program evaluation.</li>
                    <li>To send event reminders, approval notifications, and system updates relevant to your account.</li>
                    <li>To improve platform performance and user experience through anonymized analytics.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.3 Legal Basis for Processing</p>
                  <p className="text-sm">
                    Your personal data is processed on the following legal bases under RA 10173: (a) your <strong>consent</strong> given upon account registration and use of the App; (b) the <strong>performance of a contract</strong> or service you have requested; (c) <strong>compliance with a legal obligation</strong> imposed on the LGU or its authorized partners; and (d) the <strong>legitimate interests</strong> of delivering and improving community services.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.4 Data Sharing and Disclosure</p>
                  <p className="text-sm">
                    We do not sell your personal data to third parties. Your data may be shared only in the following circumstances:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                    <li>With <strong>authorized LGU offices and facilitators</strong> strictly for the purpose of managing and processing community events you have registered for.</li>
                    <li>With <strong>Firebase (Google Cloud)</strong> as our cloud infrastructure provider, which processes data solely as a data processor under a data processing agreement.</li>
                    <li>With <strong>law enforcement or government agencies</strong> when required by law, court order, or in response to a lawful request.</li>
                    <li>In <strong>anonymized or aggregated form</strong> for public reporting on community program outcomes — no individual will be identifiable from such reports.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.5 Data Retention</p>
                  <p className="text-sm">
                    Your personal data is retained for as long as your account is active and for a reasonable period thereafter to comply with legal obligations. Verification documents submitted by facilitator applicants are retained only for the duration of the accreditation review and deleted once a decision is made. You may request deletion of your account and associated personal data at any time through the Help & Support section.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.6 Data Security</p>
                  <p className="text-sm">
                    We implement appropriate technical and organizational security measures to protect your personal data, including encrypted data transmission (HTTPS/TLS), secure cloud storage through Firebase, role-based access controls limiting data access to authorized personnel only, and regular security assessments. In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the National Privacy Commission and affected individuals in accordance with NPC Circular 16-03.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.7 Cookies and Local Storage</p>
                  <p className="text-sm">
                    The App uses browser local storage and session storage to maintain your login session and remember your preferences such as dark mode and notification settings. No personal data is shared with advertising networks through these mechanisms.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.8 Children's Privacy</p>
                  <p className="text-sm">
                    The App is not directed to children under the age of 13. We do not knowingly collect personal data from children. If you are a parent or guardian and believe your child has provided personal information through the App, please contact us immediately so we can take appropriate action.
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">6.9 Exercising Your Rights</p>
                  <p className="text-sm">
                    To exercise any of your rights as a data subject under RA 10173 — including the right to access, correct, delete, or object to the processing of your personal data — please contact our Data Protection Officer through the Help & Support section of the App. We will respond to all requests within fifteen (15) working days in accordance with NPC guidelines.
                  </p>
                </div>

                <p className="text-xs mt-4 opacity-80 border-t border-primary-200 dark:border-primary-700 pt-4">
                  By registering for and continuing to use Commove, you acknowledge that you have read, understood, and consent to the collection and processing of your personal data as described in this Policy, consistent with the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.
                </p>
              </div>
            </section>

            {/* DIVIDER */}
            <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

            {/* 7. Modifications */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">7. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms and Conditions and Privacy Policy at any time. We will notify users of any material changes through in-app notifications or email. Your continued use of the App following the effective date of such modifications constitutes your acceptance of the revised Terms. If you do not agree with the changes, you must discontinue use of the App and may request deletion of your account.
              </p>
            </section>

            {/* 8. Limitation of Liability */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">8. Limitation of Liability</h2>
              <p>
                Commove and its affiliated LGU partners shall not be liable for any indirect, incidental, or consequential damages arising from your use of or inability to use the App, including but not limited to loss of data, event cancellations, or service interruptions. Our total liability for any claim shall not exceed the amount, if any, paid by you to access the service.
              </p>
            </section>

            {/* 9. Governing Law */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">9. Governing Law and Jurisdiction</h2>
              <p>
                These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including but not limited to the Data Privacy Act of 2012 (RA 10173), the Cybercrime Prevention Act of 2012 (RA 10175), and the Electronic Commerce Act of 2000 (RA 8792). Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the appropriate courts of the City of Bacoor, Cavite, Philippines.
              </p>
            </section>

            {/* 10. Contact */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">10. Contact Information</h2>
              <p>
                If you have any questions about these Terms, our Privacy Policy, or wish to exercise your rights as a data subject, please contact our support team through the <strong>Help & Support</strong> section of the App. For data privacy concerns specifically, you may reach our designated Data Protection Officer (DPO) through the same channel. You also have the right to file a complaint directly with the <strong>National Privacy Commission (NPC)</strong> at <span className="underline">www.privacy.gov.ph</span>.
              </p>
            </section>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              Last updated: June 3, 2025 &nbsp;·&nbsp; Commove — City of Bacoor Community Events Platform
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditionsView;
