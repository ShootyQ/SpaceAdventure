import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] py-12 px-6">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
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
          
          <div className="text-slate-500 text-sm">
             Check the <Link href="/about" className="text-emerald-600 hover:text-emerald-700 underline">Product page</Link> to see how it works.
          </div>

        </div>
      </div>
    </div>
  );
}
