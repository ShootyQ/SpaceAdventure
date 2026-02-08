import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Quote, Users, Layers, Zap, Star, Rocket, Shield, Printer, Hammer, Map } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Home
            </Link>
           <span className="font-bold text-xl tracking-tight text-indigo-400">About CRAVE</span>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16">
        
        {/* About Section */}
        <section className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
                <Users className="w-3 h-3" /> Our Mission
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8">Fueling the Desire to Learn</h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-6">
                CRAVE (Classroom Resources: Adventures, Voyages, & Exploration) was born from a simple observation: students learn best when they are emotionally invested in the outcome.
            </p>
            <p className="text-xl text-slate-400 leading-relaxed">
                We build immersive, gamified simulations that wrap standard curriculum in epic narratives. By transforming the classroom into a spaceship, a frontier town, or a magical kingdom, we turn "assignments" into "missions" and "grades" into "experience points".
            </p>

            <div className="mt-12 p-8 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl relative">
                <Quote className="absolute top-8 left-6 w-8 h-8 text-indigo-500/20" />
                <p className="text-lg text-indigo-200 italic leading-relaxed pl-8">
                    "I dreamed of creating something like this 12 years ago when I was a teacher. I wanted to 'gamify' my room and had written pages on it, imagining a world where students weren't just learning, but exploring."
                </p>
                <div className="mt-4 pl-8 text-sm font-bold text-indigo-400 uppercase tracking-widest">
                    — Founder's Note
                </div>
            </div>
        </section>

        {/* Current Features Section */}
        <section id="features" className="mb-20 pt-10 border-t border-slate-800">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" /> System Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Current Features</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mb-4"><Star className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">XP & Assignments</h3>
                    <p className="text-slate-400">Track academic progress and behavior through Experience Points. Assignments become Missions with tangible rewards.</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4"><Shield className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Rank System</h3>
                    <p className="text-slate-400">Students level up from "Space Cadet" to "Grand Admiral". Unlock new badges and privileges as they grow.</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mb-4"><Rocket className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Asteroid Events</h3>
                    <p className="text-slate-400">Random classroom challenges appear as asteroids. The class must work together to defeat them before impact!</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center mb-4"><User className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Custom Identities</h3>
                    <p className="text-slate-400">Every student designs their own Cadet Avatar and customizes their personal Starship.</p>
                </div>
            </div>
        </section>

        {/* How It Works (Process) */}
        <section id="how-it-works" className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
            <div className="bg-slate-900/30 rounded-2xl p-8 border border-white/5 space-y-8">
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">1</div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Roster & Customization</h3>
                        <p className="text-slate-400">Add your students to the roster. They immediately get to choose their Avatar and Spaceship design, creating ownership from Day 1.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">2</div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Define Protocols</h3>
                        <p className="text-slate-400">Set your classroom expectations (e.g., Kindness +50 XP, Homework Complete +100 XP). These "Protocols" make giving feedback fast and consistent.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">3</div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">The Journey</h3>
                        <p className="text-slate-400">As students earn XP, they travel to new planets. You can set specific real-world rewards for each planetary arrival (e.g., Pizza Party on Mars).</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Printable Resources */}
        <section id="printables" className="mb-20">
            <div className="flex items-center gap-4 mb-6">
                 <Printer className="w-6 h-6 text-cyan-400" />
                 <h2 className="text-3xl font-bold text-white">Physical Classroom Resources</h2>
            </div>
            <p className="text-slate-400 text-lg mb-6">
                The simulation extends beyond the screen. We provide printable assets to help you decorate your "Command Center" (classroom). 
            </p>
            <div className="bg-cyan-950/30 border border-cyan-500/20 p-6 rounded-xl">
                 <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-cyan-200">
                     <li className="flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> Physical Rank Cards for students</li>
                     <li className="flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> Bulletin Board Rank Progress trackers</li>
                     <li className="flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> Mission debrief templates</li>
                     <li className="flex items-center gap-2"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> Avatar stickers and badges</li>
                 </ul>
            </div>
        </section>

        {/* Future Plans */}
        <section id="future" className="mb-10">
            <div className="flex items-center gap-4 mb-6">
                 <Hammer className="w-6 h-6 text-purple-400" />
                 <h2 className="text-3xl font-bold text-white">Future Plans</h2>
            </div>
             <p className="text-slate-400 text-lg mb-6">
                We are constantly expanding the universe. Upcoming updates include:
            </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-xl">
                    <div className="font-bold text-purple-300 mb-2">Ship Custom Parts</div>
                    <p className="text-sm text-slate-400">Unlockable engines, wings, and trails.</p>
                 </div>
                 <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-xl">
                    <div className="font-bold text-purple-300 mb-2">RPG Elements</div>
                    <p className="text-sm text-slate-400">Stats like "Wisdom" and "Agility" tied to subjects.</p>
                 </div>
                 <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-xl">
                    <div className="font-bold text-purple-300 mb-2">New Worlds</div>
                    <p className="text-sm text-slate-400">Western Frontier and Fantasy Kingdom simulations.</p>
                 </div>
             </div>
        </section>

      </main>

      <footer className="border-t border-white/5 py-12 bg-slate-950 text-center text-slate-500 text-sm">
         &copy; {new Date().getFullYear()} Classroom Adventures.
      </footer>
    </div>
  );
}
