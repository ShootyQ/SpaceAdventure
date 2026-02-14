import Link from 'next/link';
import { ArrowLeft, CheckCircle, GraduationCap, School } from 'lucide-react';

export default function EducatorsPage() {
    
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does ClassCrave increase student engagement?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ClassCrave turns passive listeners into active participants by tracking progress and assigning milestones based on participation and behavior."
        }
      },
      {
        "@type": "Question",
        "name": "Is ClassCrave suitable for my grade level?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, ClassCrave is flexible and designed to work with any subject. It is optimized for 4th through 9th grade classrooms."
        }
      },
      {
         "@type": "Question",
         "name": "Does it replace behavior charts?",
         "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, our automated tracking systems provide a digital, streamlined alternative to traditional behavior tracking methods."
         }
      }
    ]
  };

  return (
    <div className="landing-theme flex min-h-screen flex-col font-sans bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60">
       <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
       {/* Navigation */}
       <nav className="w-full border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Home
            </Link>
           <span className="font-heading font-bold text-xl tracking-tight text-emerald-800">For Educators</span>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16">
        
        <div className="text-center mb-16">
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">Built by Teachers, <br/><span className="text-emerald-600">For Teachers</span></h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Managing a classroom is hard. ClassCrave tools are designed to automate behavior tracking, encourage participation, and bring joy back to instruction.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
                 <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                    <h3 className="font-heading text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <School className="w-6 h-6 text-emerald-600" />
                        Why use ClassCrave?
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span className="text-slate-600"><strong>Increase Engagement:</strong> Turn passive listeners into active participants.</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span className="text-slate-600"><strong>Automate Tracking:</strong> Digital systems replace complex manual behavior charts.</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span className="text-slate-600"><strong>Flexible:</strong> Works with any subject, any grade level (best for 4th-9th).</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span className="text-slate-600"><strong>Community:</strong> Join a network of educators sharing assignment templates and resources.</span>
                        </li>
                    </ul>
                 </div>
            </div>
            <div className="space-y-6">
                <div className="bg-emerald-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <h3 className="font-heading text-xl font-bold text-white mb-2 relative z-10">Ready to Launch?</h3>
                    <p className="text-emerald-100 mb-6 relative z-10">Start your free trial today. No credit card required.</p>
                    <Link href="/login" className="inline-block w-full text-center py-4 bg-white text-emerald-900 font-bold rounded-xl hover:bg-emerald-50 transition-colors relative z-10">
                        Create Teacher Account
                    </Link>
                </div>
                
                 <div className="bg-white p-8 rounded-3xl border border-black/5 text-center shadow-sm">
                    <p className="text-slate-600 mb-4">Already have a class?</p>
                    <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-800 transition-colors flex items-center justify-center gap-2">
                        Login to Dashboard &rarr;
                    </Link>
                </div>
            </div>
        </div>

      </main>
       <footer className="border-t border-black/5 py-12 bg-white/50 text-center text-slate-500 text-sm">
         &copy; {new Date().getFullYear()} ClassCrave.
      </footer>
    </div>
  );
}
