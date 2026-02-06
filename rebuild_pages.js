const fs = require('fs');
const path = require('path');

const files = {
  'app/page.tsx': `"use client";
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
                            <span className="text-xl">🤠</span>
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
`,
  'app/space/page.tsx': `"use client";
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Star, Map, Trophy, Users, LogIn, School, GraduationCap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { getAssetPath } from "@/lib/utils";

export default function Home() {
  const { user, userData, signInWithGoogle, signInStudent, loading } = useAuth();
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<'selection' | 'student'>('selection');
  const [studentCreds, setStudentCreds] = useState({ username: '', classCode: '', password: '' });
  const [error, setError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // Redirect based on role if logged in
  useEffect(() => {
    if (!loading && userData) {
        if (userData.status === 'pending_approval') {
            router.push('/pending');
        } else if (userData.role === 'teacher') {
            router.push('/teacher');
        } else if (userData.role === 'student') {
            router.push('/student');
        }
    }
  }, [userData, loading, router]);

  const handleStudentLogin = async (e: FormEvent) => {
      e.preventDefault();
      setError('');
      setStudentLoading(true);
      try {
          const email = \`\${studentCreds.username}.\${studentCreds.classCode}@spaceadventure.local\`;
          await signInStudent(email, studentCreds.password);
      } catch (err) {
          console.error(err);
          setError('Invalid login credentials.');
      } finally {
          setStudentLoading(false);
      }
  };

  // Rendering the main entry point
  return (
    <div className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden bg-slate-950 text-white">
      
      {/* Background Star Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div id="stars" className="stars"></div>
        <div id="stars2" className="stars2"></div>
        <div id="stars3" className="stars3"></div>
      </div>

      {/* Hero Section */}
      <div className="z-10 flex flex-col items-center justify-center w-full min-h-screen text-center px-4 py-12">
        
        <div className="animate-float mb-8">
            <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-25 blur-xl animate-pulse"></div>
                <img 
                  src={getAssetPath("/images/ships/finalship.png")} 
                  alt="Space Adventure" 
                  className="w-32 h-32 object-contain relative z-10 transform -rotate-45" 
                />
            </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-blue-200 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          Space Adventure
        </h1>
        
        <p className="text-blue-100 text-xl md:text-2xl max-w-2xl mb-12">
          Your classroom, gamified. Explore the cosmos, earn ranks, and master your mission.
        </p>

        {loading ? (
            <div className="text-blue-300 animate-pulse text-lg">Initializing Navigation Systems...</div>
        ) : userData ? (
             <div className="text-xl text-green-400 font-mono animate-pulse">
                 Credentials Verified. Launching...
             </div>
        ) : (
            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl transition-all">
                
                {loginMode === 'selection' ? (
                    <div className="space-y-6">
                        <div className="text-left mb-2">
                             <h3 className="text-lg font-semibold text-slate-200">Identify Yourself</h3>
                        </div>
                        
                        <button 
                            onClick={signInWithGoogle}
                            className="w-full group relative flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white p-4 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/25"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg"><School className="w-5 h-5" /></div>
                                <span className="text-lg">Teacher Login</span>
                            </div>
                            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </button>

                        <div className="relative py-2">
                             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                             <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-2 bg-slate-900 text-slate-500">or</span></div>
                        </div>

                        <button 
                            onClick={() => setLoginMode('student')}
                            className="w-full group relative flex items-center justify-between bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-semibold transition-all hover:scale-[1.02] border border-slate-700 hover:border-slate-600"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-700 group-hover:bg-slate-600 rounded-lg"><GraduationCap className="w-5 h-5 text-green-400" /></div>
                                <span className="text-lg">Student Access</span>
                            </div>
                            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                        </button>

                        <div className="pt-4 border-t border-white/10 text-center">
                            <p className="text-sm text-slate-400 mb-3">New to Command?</p>
                            <Link 
                                href="/start"
                                className="inline-block px-6 py-2 rounded-full border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50 hover:text-white transition-all text-sm font-bold uppercase tracking-wider"
                            >
                                Application for Commission
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleStudentLogin} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                             <h2 className="text-xl font-semibold text-white">Student Login</h2>
                             <button type="button" onClick={() => setLoginMode('selection')} className="text-slate-400 hover:text-white transition-colors">
                                 <ArrowLeft className="w-5 h-5" />
                             </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs uppercase tracking-wider font-medium text-slate-400 mb-1.5">Class Code</label>
                                <input 
                                    type="text"
                                    required
                                    value={studentCreds.classCode}
                                    onChange={(e) => setStudentCreds({...studentCreds, classCode: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 font-mono transition-all"
                                    placeholder="ABCD12"
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex-[2]">
                                <label className="block text-xs uppercase tracking-wider font-medium text-slate-400 mb-1.5">Username</label>
                                <input 
                                    type="text"
                                    required
                                    value={studentCreds.username}
                                    onChange={(e) => setStudentCreds({...studentCreds, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all"
                                    placeholder="cadet"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wider font-medium text-slate-400 mb-1.5">Password</label>
                            <input 
                                type="password" 
                                required
                                value={studentCreds.password}
                                onChange={(e) => setStudentCreds({...studentCreds, password: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center animate-shake">{error}</div>}

                        <button 
                            type="submit"
                            disabled={studentLoading}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl font-bold transition-all mt-4 hover:shadow-lg hover:shadow-green-500/20 text-lg"
                        >
                            {studentLoading ? 'Authenticating...' : 'Launch Mission'}
                        </button>
                    </form>
                )}

            </div>
        )}
      </div>

      {/* Features Grid Teaser (Below Fold) */}

      <div className="z-10 w-full max-w-6xl px-4 py-20 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <h3 className="text-3xl font-bold text-center text-white mb-16">System Features</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
                icon={<Map />}
                title="Cosmos Map"
                description="Visualize class progress as you travel from planet to planet."
            />
            <FeatureCard 
                icon={<Star />}
                title="XP & Ranks"
                description="Earn XP for behavior and assignments to rank up locally."
            />
             <FeatureCard 
                icon={<Trophy />}
                title="Loot & Rewards"
                description="Unlock ship parts and earn real classroom rewards."
            />
        </div>
      </div>
      
      <footer className="z-10 w-full py-6 text-center text-blue-500/40 text-sm">
        Mission Control Systems &copy; {new Date().getFullYear()}
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="mb-4 text-yellow-400 p-3 bg-yellow-400/10 rounded-full">
                {icon}
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
            <p className="text-gray-400">{description}</p>
        </div>
    )
}
`,
  'app/about/page.tsx': `import Link from 'next/link';
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
`,
  'app/educators/page.tsx': `import Link from 'next/link';
import { ArrowLeft, CheckCircle, GraduationCap, School } from 'lucide-react';

export default function EducatorsPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
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
`
};

for (const [relativePath, content] of Object.entries(files)) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(\`Created directory: \${dir}\`);
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(\`Wrote file: \${fullPath}\`);
}
