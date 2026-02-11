import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Quote, Users, Layers, Zap, Star, Rocket, Shield, Printer, Hammer, Map, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60">
      
      {/* Navigation */}
      <nav className="w-full border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Home
            </Link>
           <span className="font-heading font-bold text-xl tracking-tight text-emerald-800">About ClassCrave</span>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        
        {/* About Section */}
        <section className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-widest mb-6">
                <Users className="w-3 h-3" /> Our Mission
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">Fueling the Desire to Learn</h1>
            <p className="text-xl text-slate-600 leading-relaxed mb-6">
                ClassCrave was born from a simple observation: students learn best when they are emotionally invested in the outcome.
            </p>
            <p className="text-xl text-slate-600 leading-relaxed">
                We build immersive, gamified systems that wrap standard curriculum in engaging narratives. By transforming the classroom into a dynamic environment, we turn "assignments" into "milestones" and "grades" into "visible progress".
            </p>

            <div className="mt-12 p-8 bg-emerald-50 border border-emerald-100 rounded-3xl relative">
                <Quote className="absolute top-8 left-6 w-8 h-8 text-emerald-300" />
                <p className="text-lg text-emerald-900 italic leading-relaxed pl-8">
                    "I dreamed of creating something like this 12 years ago when I was a teacher. I wanted to create a classroom culture where students weren't just complying, but actively participating."
                </p>
                <div className="mt-4 pl-8 text-sm font-bold text-emerald-700 uppercase tracking-widest">
                     Founder's Note
                </div>
            </div>
        </section>

        {/* Current Features Section */}
        <section id="features" className="mb-20 pt-10 border-t border-black/5">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" /> System Capabilities
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-8">Current Features</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
                <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4"><Star className="w-5 h-5 text-amber-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Progress & Assignments</h3>
                    <p className="text-slate-600">Track academic progress and behavior through Experience Points (XP). Assignments become clear opportunities for growth with tangible rewards.</p>
                </div>
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4"><Shield className="w-5 h-5 text-indigo-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Level System</h3>
                    <p className="text-slate-600">Students advance through tiers based on effort and achievement. Unlock new privileges and responsibilities as they demonstrate mastery.</p>
                </div>
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4"><Rocket className="w-5 h-5 text-red-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Classroom Challenges</h3>
                    <p className="text-slate-600">Randomized events challenge the class to work together. Collaborative problem-solving is required to overcome obstacles.</p>
                </div>
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-4"><User className="w-5 h-5 text-cyan-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Student Profiles</h3>
                    <p className="text-slate-600">Every student customizes their own digital profile, creating a sense of ownership and identity within the classroom community.</p>
                </div>
            </div>
        </section>

        {/* How It Works (Process) */}
        <section id="how-it-works" className="mb-20">
            <h2 className="font-heading text-3xl font-bold text-slate-900 mb-8">How It Works</h2>
            <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-8">
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white">1</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Roster & Setup</h3>
                        <p className="text-slate-600">Add your students to the roster. They immediately get to access their profile, creating buy-in from Day 1.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white">2</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Define Expectations</h3>
                        <p className="text-slate-600">Set your classroom expectations (e.g., Kindness, Homework Completion). These standards make giving feedback fast and consistent.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white">3</div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">The Journey</h3>
                        <p className="text-slate-600">As students demonstrate progress, they unlock new content. You can set specific real-world rewards for milestones (e.g., Class Celebration).</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Printable Resources */}
        <section id="printables" className="mb-20">
            <div className="flex items-center gap-4 mb-6">
                 <Printer className="w-6 h-6 text-slate-700" />
                 <h2 className="font-heading text-3xl font-bold text-slate-900">Physical Resources</h2>
            </div>
            <p className="text-slate-600 text-lg mb-6">
                The experience extends beyond the screen. We provide printable assets to help you organize your classroom environment. 
            </p>
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                 <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                     <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Student Progress Cards</li>
                     <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Bulletin Board Trackers</li>
                     <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Assignment Review Templates</li>
                     <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Achievement Stickers</li>
                 </ul>
            </div>
        </section>

        {/* Future Plans */}
        <section id="future" className="mb-10">
            <div className="flex items-center gap-4 mb-6">
                 <Hammer className="w-6 h-6 text-slate-700" />
                 <h2 className="font-heading text-3xl font-bold text-slate-900">Future Plans</h2>
            </div>
             <p className="text-slate-600 text-lg mb-6">
                We are constantly expanding the platform. Upcoming updates include:
            </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm">
                    <div className="font-bold text-slate-900 mb-2">Advanced Customization</div>
                    <p className="text-sm text-slate-600">More options for student profiles and rewards.</p>
                 </div>
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm">
                    <div className="font-bold text-slate-900 mb-2">Skill Tracking</div>
                    <p className="text-sm text-slate-600">Detailed stats tied to specific subjects or standards.</p>
                 </div>
                 <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm">
                    <div className="font-bold text-slate-900 mb-2">New Themes</div>
                    <p className="text-sm text-slate-600">History, Fantasy, and Nature themes coming soon.</p>
                 </div>
             </div>
        </section>

      </main>

      <footer className="border-t border-black/5 py-12 bg-white/50 text-center text-slate-500 text-sm">
         &copy; {new Date().getFullYear()} ClassCrave.
      </footer>
    </div>
  );
}
