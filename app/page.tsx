"use client";
import Link from 'next/link';
import { Rocket, Sparkles, ArrowRight, BookOpen, Compass } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Navigation */}
      <nav className="w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <Compass className="w-6 h-6 text-indigo-400" />
              <span>CRAVE</span>
           </div>
           <div className="flex gap-6 text-sm font-medium text-slate-400">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/educators" className="hover:text-white transition-colors">Educators</Link>
              <Link href="/space" className="hover:text-white transition-colors flex items-center gap-1 text-indigo-400"><Rocket className="w-4 h-4" /> Space Adventure</Link>
           </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <div className="relative py-24 lg:py-32 px-4 overflow-hidden">
           {/* Background decorative blobs */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/20 rounded-[100%] blur-[100px] opacity-30 pointer-events-none" />
           
           <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="mb-6 flex flex-col items-center animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 tracking-wide backdrop-blur-sm shadow-lg shadow-indigo-500/10 transition-all hover:bg-indigo-500/20 hover:scale-105 cursor-default">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-lg md:text-xl font-light">
                    <b className="text-indigo-400 font-bold">C</b>lass<b className="text-indigo-400 font-bold">r</b>oom <b className="text-indigo-400 font-bold">A</b>dventures, <b className="text-indigo-400 font-bold">V</b>oyages, & <b className="text-indigo-400 font-bold">E</b>xploration
                  </span>
                </div>
                <p className="mt-4 text-lg md:text-xl text-indigo-300/80 font-medium italic tracking-wide">
                  "What journey do you <span className="font-bold text-indigo-400">CRAVE</span>?"
                </p>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white">
                Turn your classroom into an <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Epic Journey</span>.
              </h1>
              
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Gamify your curriculum with immersive simulations. Engage students with narratives, XP systems, and collaborative missions that make learning unforgettable.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Link href="/start" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all hover:scale-105 shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                    Get Started Free <ArrowRight className="w-5 h-5" />
                 </Link>
                 <Link href="/about" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full font-bold transition-all">
                    How it Works
                 </Link>
              </div>
           </div>
        </div>

        {/* Adventures Grid */}
        <div className="max-w-7xl mx-auto px-4 py-20 w-full">
            <h2 className="text-2xl font-bold mb-10 text-center text-slate-200">Available Simulations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Space Adventure Card */}
                <Link href="/space" className="group relative block h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-black border border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/20">
                    <div className="absolute inset-0 bg-indigo-950/30 opacity-50 group-hover:opacity-70 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8 w-full">
                         <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                            <Rocket className="w-6 h-6" />
                         </div>
                         <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Space Adventure</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Command a starship, explore the galaxy, and master the cosmos. Perfect for science, math, and general classroom management.
                         </p>
                         <div className="flex items-center text-blue-400 text-sm font-bold uppercase tracking-wider">
                            Enter Simulation <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                         </div>
                    </div>
                </Link>

                {/* Future Plans */}
                <div className="relative h-80 rounded-2xl overflow-hidden bg-slate-900/20 border border-slate-800/50 flex flex-col p-8">
                    <div className="mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                            Future Plans
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Expansion Pack</h3>
                        <p className="text-slate-400 text-sm">New worlds are constantly being charted.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 opacity-60">
                            <span className="text-xl"></span>
                            <div>
                                <div className="font-bold text-slate-300">Wild West Frontier</div>
                                <div className="text-xs text-slate-500">In Development</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800 opacity-60">
                             <BookOpen className="w-6 h-6 text-slate-600" />
                            <div>
                                <div className="font-bold text-slate-300">Fantasy Realms</div>
                                <div className="text-xs text-slate-500">Planned</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

      </main>

      <footer className="border-t border-white/5 py-12 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
             <p>&copy; {new Date().getFullYear()} Classroom Adventures. Built for teachers, by teachers.</p>
          </div>
      </footer>
    </div>
  );
}
