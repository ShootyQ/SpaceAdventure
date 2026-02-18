import React from "react";
import { ProfessionalFooter, ProfessionalHeader } from "@/components/ProfessionalChrome";

export default function PrivacyPolicy() {
  return (
    <div className="landing-theme flex min-h-screen flex-col bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60">
      <ProfessionalHeader />
      <div className="max-w-3xl mx-auto w-full py-10 sm:py-12 px-4 sm:px-6 flex-1">
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-black/5">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-slate max-w-none text-slate-600">
            <p className="lead">
              At ClassCrave, we prioritize the privacy and security of our users, especially students. This Privacy Policy outlines how we collect, use, and protect your information.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Student Data Collection</h3>
            <p className="mb-4">
              <strong>We do not collect any personal student data.</strong> 
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Student accounts does not require real names. Teachers and students may use any pseudonym, nickname, or identifier they wish.</li>
              <li>We do not require or request student email addresses, phone numbers, or physical addresses.</li>
              <li>We do not track student browsing behavior outside of the application.</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Teacher and Educator Data</h3>
            <p className="mb-4">
              For educators creating an account, we collect only the basic information required for authentication and account management through our secure providers (Google and Microsoft):
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Name and email address provided by your authentication provider (Google or Microsoft).</li>
              <li>Profile picture URL (if available).</li>
            </ul>
            <p>
              This information is used solely to maintain your account, save your classroom progress, and communicate important updates regarding the platform.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Data Security</h3>
            <p className="mb-4">
              We presume all data to be sensitive and treat it with industry-standard security measures. Your data is stored securely using Firebase and is accessible only to you. We do not sell, trade, or rent your personal identification information to others.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Changes to This Policy</h3>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Contact Us</h3>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:classcrave@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">classcrave@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
      <ProfessionalFooter />
    </div>
  );
}
