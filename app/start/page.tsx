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
        <div className="landing-theme min-h-screen bg-[#f7f4ef] text-slate-900 font-sans selection:bg-emerald-200/60 overflow-x-hidden flex flex-col">
            
            {/* Background Orbs (Consistent with Landing) */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-32 -right-20 w-[600px] h-[600px] bg-emerald-200/40 blur-[140px] rounded-full" />
                <div className="absolute bottom-0 -left-24 w-[600px] h-[600px] bg-amber-200/40 blur-[160px] rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12 relative z-10 w-full flex-1 flex flex-col justify-center">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-12 transition-colors font-medium">
                    <ArrowLeft size={20} /> Back to Launch
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    
                    {/* Left: Pitch */}
                    <div>
                        <h1 className="font-heading text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
                            Command your<br/>classroom.
                        </h1>
                        <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                            Turn positive behavior into progress. Manage your fleet, award XP for real-world achievements, and watch your students blast off.
                        </p>
                        
                        <div className="space-y-8 mb-12">
                            <div className="flex gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Gamified Behavior Management</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">Award XP for protocols like "Helping Others", "Focus", or "Teamwork".</p>
                                </div>
                            </div>
                            <div className="flex gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Interactive Class Roster</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">Visual fleet manifest. Students pick their ships, colors, and badges.</p>
                                </div>
                            </div>
                            <div className="flex gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Safe & Secure</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">Teacher-controlled accounts. No student emails required anywhere.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing Card - PROFESSIONAL REDESIGN */}
                    <div className="bg-white border border-black/5 rounded-[2rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
                        {/* Decorative Background Element */}
                        <div className="absolute -top-20 -right-20 opacity-[0.03]">
                            <Rocket size={300} />
                        </div>

                        <div className="relative z-10 text-center">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-widest mb-6">
                                Early Access
                            </div>
                            <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-3">Teacher License</h2>
                            <div className="flex items-baseline justify-center gap-2 mb-10">
                                <span className="text-6xl font-bold text-slate-900">$0</span>
                                <span className="text-slate-500 font-medium">/ forever</span>
                            </div>
                            
                            <div className="space-y-4 mb-10 text-left max-w-xs mx-auto">
                                <li className="flex items-start gap-3 text-slate-600 group">
                                    <Check className="mt-0.5 w-5 h-5 text-emerald-600 stroke-[3]" />
                                    <span>Manage up to <span className="font-bold text-slate-900">30 Students</span></span>
                                </li>
                                <li className="flex items-start gap-3 text-slate-600">
                                    <Check className="mt-0.5 w-5 h-5 text-emerald-600 stroke-[3]" />
                                    <span>Unlimited Custom Behaviors</span>
                                </li>
                                <li className="flex items-start gap-3 text-slate-600">
                                    <Check className="mt-0.5 w-5 h-5 text-emerald-600 stroke-[3]" />
                                    <span>Real-time <span className="font-bold text-slate-900">Star Map</span> Display</span>
                                </li>
                                <li className="flex items-start gap-3 text-slate-600">
                                    <Check className="mt-0.5 w-5 h-5 text-emerald-600 stroke-[3]" />
                                    <span>Mission Control Dashboard</span>
                                </li>
                            </div>

                            <button 
                                onClick={handleGoogleSignUp}
                                className="w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />
                                <span>Start Your Mission</span>
                                <ArrowLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all rotate-180" />
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-6 max-w-xs mx-auto leading-relaxed">
                                Join 150+ early adopters. No credit card required. Cancel anytime.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}