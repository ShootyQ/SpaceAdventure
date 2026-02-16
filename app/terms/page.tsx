import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-black/5">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-slate max-w-none text-slate-600">
            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Agreement to Terms</h3>
            <p className="mb-4">
              By accessing and using ClassCrave, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Use License</h3>
            <p className="mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on ClassCrave's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
              <li>Attempt to decompile or reverse engineer any software contained on ClassCrave's website;</li>
              <li>Remove any copyright or other proprietary notations from the materials; or</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Disclaimer</h3>
            <p className="mb-4">
              The materials on ClassCrave's website are provided on an 'as is' basis. ClassCrave makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Limitations</h3>
            <p className="mb-4">
              In no event shall ClassCrave or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ClassCrave's website, even if ClassCrave or a ClassCrave authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Content Liability</h3>
            <p className="mb-4">
              We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website. No link(s) should appear on any Website that may be interpreted as libelous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other violation of, any third party rights.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Governing Law</h3>
            <p className="mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of Delaware and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-4">Contact Us</h3>
            <p>
              If you have any questions about our Terms of Service, please contact us at <a href="mailto:classcrave@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">classcrave@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
