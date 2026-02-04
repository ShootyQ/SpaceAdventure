"use client";
import { useState, useEffect } from 'react';
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

  const handleStudentLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setStudentLoading(true);
      try {
          const email = `${studentCreds.username}.${studentCreds.classCode}@spaceadventure.local`;
          await signInStudent(email, studentCreds.password);
      } catch (err) {
          console.error(err);
          setError('Invalid login credentials.');
      } finally {
          setStudentLoading(false);
      }
  };


  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden bg-slate-950 text-white">
      
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
                                <span className="text-lg">Teacher Access</span>
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
                    </div>
                ) : (
                    <form onSubmit={handleStudentLogin} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                             <h2 className="text-xl font-semibold text-white">Student Login</h2>
                             <button type="button" onClick={() => setLoginMode('selection')} className="text-slate-400 hover:text-white transition-colors">
                                 <ArrowLeft className="w-5 h-5" />
                             </button>
                        </div>
                         className="flex gap-4">
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
                            </div   placeholder="cadet@class.local"
                            />
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

    </main>
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
