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
          "text": "ClassCrave turns passive listeners into active crew members by calculating XP and assigning ranks based on participation and behavior."
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
            "text": "Yes, our automated XP (Experience Points) and HP (Health Points) systems provide a digital, gamified alternative to traditional behavior tracking methods."
         }
      }
    ]
  };

  return (
    <div className="flex min-h-screen flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
       <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
       {/* Navigation */}
       <nav className="w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Home
            </Link>
           <span className="font-bold text-xl tracking-tight text-indigo-400">For Educators</span>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-16">
        
        <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">Built by Teachers, <br/><span className="text-indigo-400">For Teachers</span></h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Managing a classroom is hard. CRAVE tools are designed to automate behavior tracking, gamify participation, and bring joy back to instruction.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <School className="w-6 h-6 text-indigo-500" />
                        Why use CRAVE?
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                            <span className="text-slate-300"><strong>Increase Engagement:</strong> Turn passive listeners into active crew members.</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                            <span className="text-slate-300"><strong>Automate Tracking:</strong> XP and HP systems replace complex behavior charts.</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                            <span className="text-slate-300"><strong>Flexible:</strong> Works with any subject, any grade level (best for 4th-9th).</span>
                        </li>
                         <li className="flex items-start gap-4">
                            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                            <span className="text-slate-300"><strong>Community:</strong> Join a network of educators sharing mission templates and resources.</span>
                        </li>
                    </ul>
                 </div>
            </div>
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-8 rounded-2xl border border-indigo-500/30">
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Launch?</h3>
                    <p className="text-indigo-200 mb-6">Start your free trial today. No credit card required.</p>
                    <Link href="/start" className="inline-block w-full text-center py-4 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                        Apply for Teacher Commission
                    </Link>
                </div>
                
                 <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center">
                    <p className="text-slate-400 mb-4">Already have a class?</p>
                    <Link href="/space" className="text-indigo-400 font-bold hover:text-white transition-colors">
                        Login to Space Adventure &rarr;
                    </Link>
                </div>
            </div>
        </div>

      </main>
       <footer className="border-t border-white/5 py-12 bg-slate-950 text-center text-slate-500 text-sm">
         &copy; {new Date().getFullYear()} Classroom Adventures.
      </footer>
    </div>
  );
}
