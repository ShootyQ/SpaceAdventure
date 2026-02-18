import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { ProfessionalFooter, ProfessionalHeader } from "@/components/ProfessionalChrome";

export default function Support() {
  return (
    <div className="landing-theme flex min-h-screen flex-col bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60">
      <ProfessionalHeader />
      <div className="max-w-xl mx-auto w-full py-10 sm:py-12 px-4 sm:px-6 flex-1">
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-black/5 text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-6">Need Help?</h1>
          
          <p className="text-slate-600 mb-8 text-lg">
            We're here to help! If you have any questions, feedback, or need assistance with your account, please reach out to our support team.
          </p>

          <div className="bg-emerald-50 rounded-2xl p-6 mb-8 inline-block w-full">
            <Mail className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Email Support</h3>
            <a href="mailto:classcrave@gmail.com" className="text-emerald-700 font-bold hover:underline text-lg">
              classcrave@gmail.com
            </a>
            <p className="text-sm text-slate-500 mt-2">
              We typically respond within 24 hours.
            </p>
          </div>

          <div className="text-left bg-white border border-black/5 rounded-2xl p-5 mb-8">
            <h3 className="font-semibold text-slate-900 mb-3">Billing FAQ</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><strong className="text-slate-800">How do I cancel?</strong> Cancel anytime from your Billing settings.</li>
              <li><strong className="text-slate-800">Do I keep access after canceling?</strong> Yes, through your current paid period.</li>
              <li><strong className="text-slate-800">Can I use promo codes?</strong> Promo codes are limited by eligibility, plan, and billing cycle.</li>
              <li><strong className="text-slate-800">Are taxes included?</strong> Taxes may apply based on billing location.</li>
            </ul>
          </div>
          
          <div className="text-slate-500 text-sm">
             Check the <Link href="/about" className="text-emerald-600 hover:text-emerald-700 underline">Product page</Link> to see how it works.
          </div>

        </div>
      </div>
      <ProfessionalFooter />
    </div>
  );
}
