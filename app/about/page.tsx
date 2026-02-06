import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Quote, Users, Layers, Zap } from 'lucide-react';

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
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mb-20 pt-10 border-t border-slate-800">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" /> System Mechanics
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">How It Works</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-4"><Layers className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">The Simulation Layer</h3>
                    <p className="text-slate-400">Teachers project the "Main Screen" (e.g., the ship's bridge) at the front of the room. This visualizes class progress, random events, and collective goals.</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mb-4"><User className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Student Roles</h3>
                    <p className="text-slate-400">Every student has a specific job (e.g., Navigator, Engineer). Their behavior and academic performance directly impact the simulation's success.</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center mb-4"><BookOpen className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Curriculum Integration</h3>
                    <p className="text-slate-400">Missions are tied to your existing lessons. A math worksheet becomes a "Navigation Calculation" to jump to hyperspace.</p>
                </div>
                 <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mb-4"><Quote className="w-5 h-5 text-white" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Feedback Loops</h3>
                    <p className="text-slate-400">Instant feedback via XP and Health points keeps engagement high. Negative behaviors have in-game consequences, fostering self-regulation.</p>
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
