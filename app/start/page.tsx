"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, Rocket, Shield, Users, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
    const { signInWithGoogle, user } = useAuth();
    const router = useRouter();

    const handleGoogleSignUp = async () => {
        await signInWithGoogle();
        // The AuthContext will redirect to /teacher automatically once status is active
    };

    return (
        <div className="min-h-screen bg-space-950 text-white font-mono selection:bg-cyan-500/30">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-300 mb-8 transition-colors">
                    <ArrowLeft size={20} /> Back to Launch
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    {/* Left: Pitch */}
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6 bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
                            Command Your Classroom
                        </h1>
                        <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                            Turn positive behavior into interstellar progress. Manage your fleet, award XP for real-world achievements, and watch your students blast off.
                        </p>
                        
                        <div className="space-y-6 mb-12">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                    <Trophy className="text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">Gamified Behavior Management</h3>
                                    <p className="text-sm text-gray-400">Award XP for protocols like "Helping Others" or "Focus".</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <Users className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">Interactive Class Roster</h3>
                                    <p className="text-sm text-gray-400">Visual fleet manifest. Students pick their ships and badges.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-900/30 border border-green-500/30 flex items-center justify-center shrink-0">
                                    <Shield className="text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">Safe & Secure</h3>
                                    <p className="text-sm text-gray-400">Teacher-controlled accounts. No student emails required.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-black border border-cyan-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Rocket size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="inline-block px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4">
                                Early Access
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Teacher License</h2>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-black text-white">$0</span>
                                <span className="text-gray-400">/ trial</span>
                            </div>
                            
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-gray-300">
                                    <Check className="text-cyan-500" size={18} />
                                    <span>Manage up to 5 Students (Trial)</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-300">
                                    <Check className="text-cyan-500" size={18} />
                                    <span>Unlimited Custom Behaviors</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-300">
                                    <Check className="text-cyan-500" size={18} />
                                    <span>Real-time Star Map</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-300">
                                    <Check className="text-cyan-500" size={18} />
                                    <span>Mission Control Dashboard</span>
                                </li>
                            </ul>

                            <button 
                                onClick={handleGoogleSignUp}
                                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />
                                Start Your Mission
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-4">
                                Unlocks full class capacity via admin upgrade.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}