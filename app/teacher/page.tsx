"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Users, Map, Target, Award, Settings, Power, Shield, Activity, Radio, ExternalLink, SlidersHorizontal, Zap, Globe, Edit2, Save, X, Rocket, LayoutGrid, CreditCard, AlertTriangle, UserPlus, FileText, Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAssetPath } from '@/lib/utils';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardTutorial from './DashboardTutorial';

interface ClassBonusConfig {
    current: number;
    target: number;
    reward: string;
}

export default function TeacherConsole() {
  const { logout, user, userData } = useAuth();
  const pathname = usePathname();

  // Class Bonus State
  const [bonusConfig, setBonusConfig] = useState<ClassBonusConfig>({ current: 0, target: 10000, reward: "Class Reward" });
  const [isEditingBonus, setIsEditingBonus] = useState(false);
  const [editBonusForm, setEditBonusForm] = useState<ClassBonusConfig>({ current: 0, target: 10000, reward: "" });

  useEffect(() => {
        if (!user) return;
        const bonusRef = doc(db, `users/${user.uid}/settings`, "classBonus");
        const unsubBonus = onSnapshot(bonusRef, (doc) => {
            if (doc.exists()) {
                setBonusConfig(doc.data() as ClassBonusConfig);
            } else {
                setDoc(bonusRef, { current: 0, target: 10000, reward: "Class Reward" });
            }
        });
        return () => unsubBonus();
  }, [user]);

  const handleSaveBonus = async () => {
        if (!user) return;
        try {
            await setDoc(doc(db, `users/${user.uid}/settings`, "classBonus"), {
                ...editBonusForm,
                current: Number(editBonusForm.current),
                target: Number(editBonusForm.target)
            });
            setIsEditingBonus(false);
        } catch (e) {
            console.error("Error saving bonus:", e);
        }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col text-cyan-400 font-mono">
       
       <DashboardTutorial />

       {/* Background Image & Overlay */}
       <div className="absolute inset-0 z-0 pointer-events-none">
           <img 
               src={getAssetPath("/images/teacherbackground.png?v=2")}
               alt="" 
               className="absolute inset-0 w-full h-full object-cover opacity-80" 
           />
           <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-black/80" />
       </div>

       {/* Top HUD Bar */}
       <header className="z-10 flex flex-col md:flex-row justify-between items-center p-4 border-b border-cyan-500/30 bg-black/40 backdrop-blur-md gap-4">
          <div className="flex items-center gap-4">
             <div className="animate-pulse bg-cyan-500/20 p-2 rounded-full border border-cyan-400">
                <Activity size={20} />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-widest uppercase flex items-center gap-3">
                    Command Deck // Teacher
                    {userData?.subscriptionStatus === 'active' ? (
                        <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-0.5 rounded uppercase tracking-widest font-normal">
                            Subscribed
                        </span>
                    ) : (
                        <Link href="/teacher/settings?mode=billing" className="text-[10px] bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded uppercase tracking-widest font-normal flex items-center gap-1 transition-colors">
                            Trial Version <span className="hidden sm:inline">- Upgrade</span>
                        </Link>
                    )}
                </h1>
                {/* Optional Expiry Date Display (Mocked for layout as requested) */}
                {userData?.subscriptionStatus === 'active' && (
                    <div className="text-[10px] text-cyan-500/60 uppercase tracking-widest ml-1">
                        Active until: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                )}
             </div>
          </div>
          <div className="flex gap-4 text-xs tracking-wider">
             <div className="flex flex-col items-end">
                 <span className="text-cyan-600">STATUS</span>
                 <span className="text-green-400">ONLINE</span>
             </div>
          </div>
       </header>

       {/* Main Viewport (The Window to Space) */}
       <main className="flex-1 relative z-10 p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">

          {/* Top Panel - Solar System & Bonus */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* Solar System MAP (Primary Action) */}
                 <div id="tile-map" className="lg:col-span-2 border border-cyan-500/30 rounded-2xl bg-black/80 backdrop-blur-sm relative overflow-hidden flex flex-col min-h-[220px] group transition-all hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    {/* Background Preview */}
                    <div className="absolute inset-0 z-0">
                         <div className="absolute inset-0 bg-[url('/images/teacherbackground.png')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 p-8 flex flex-col justify-center h-full items-start">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/50 text-cyan-300">
                                 <Globe size={24} />
                             </div>
                             <span className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Main Display</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-cyan-100 transition-colors">Solar System Map</h2>
                        <p className="text-cyan-300/60 text-base max-w-md mb-6">
                            Launch the primary classroom display. View student ships, current mission status, and planetary progress.
                        </p>
                        
                        <Link 
                            href="/teacher/map"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/40 transition-all active:scale-95 border border-cyan-400/20"
                        >
                            <Target className="animate-pulse" size={18} />
                            Launch Big Screen
                        </Link>
                    </div>

                    {/* Decorative Data Lines */}
                    <div className="absolute top-8 right-8 flex flex-col gap-2 items-end opacity-50">
                        <div className="flex items-center gap-2 text-[10px] text-cyan-500 uppercase">
                            <span>Orbit Sync</span>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <div className="w-32 h-px bg-gradient-to-l from-cyan-500/50 to-transparent" />
                        <div className="w-20 h-px bg-gradient-to-l from-cyan-500/30 to-transparent" />
                    </div>
                 </div>

                 {/* Class Bonus Control - Prominent placement */}
                 <div className="lg:col-span-1 border border-cyan-500/30 bg-black/60 rounded-xl p-6 relative group flex flex-col justify-center">
                    <button 
                        onClick={() => {
                            setEditBonusForm(bonusConfig);
                            setIsEditingBonus(true);
                        }}
                        className="absolute top-2 right-2 p-2 text-cyan-600 hover:text-cyan-400 opacity-50 hover:opacity-100 transition-opacity z-20"
                    >
                        <Edit2 size={14} />
                    </button>

                    {isEditingBonus ? (
                        <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                     <label className="text-[10px] uppercase text-cyan-600">Current</label>
                                     <input 
                                         type="number" 
                                         value={editBonusForm.current} 
                                         onChange={e => setEditBonusForm({...editBonusForm, current: Number(e.target.value)})}
                                         className="w-full bg-black border border-cyan-800 rounded p-1 text-sm outline-none focus:border-cyan-400 text-white"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[10px] uppercase text-cyan-600">Target</label>
                                     <input 
                                         type="number" 
                                         value={editBonusForm.target} 
                                         onChange={e => setEditBonusForm({...editBonusForm, target: Number(e.target.value)})}
                                         className="w-full bg-black border border-cyan-800 rounded p-1 text-sm outline-none focus:border-cyan-400 text-white"
                                     />
                                 </div>
                             </div>
                             <div>
                                 <label className="text-[10px] uppercase text-cyan-600">Reward</label>
                                 <input 
                                     type="text" 
                                     value={editBonusForm.reward} 
                                     onChange={e => setEditBonusForm({...editBonusForm, reward: e.target.value})}
                                     className="w-full bg-black border border-cyan-800 rounded p-1 text-sm outline-none focus:border-cyan-400 text-white"
                                 />
                             </div>
                             <div className="flex justify-end gap-2">
                                 <button onClick={() => setIsEditingBonus(false)} className="p-1 text-red-500 hover:bg-white/10 rounded"><X size={16} /></button>
                                 <button onClick={handleSaveBonus} className="p-1 text-green-500 hover:bg-white/10 rounded"><Save size={16} /></button>
                             </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4 text-cyan-300">
                                <div className="flex items-center gap-2">
                                    <Zap size={24} className="text-yellow-400" />
                                    <span className="text-base font-bold uppercase tracking-wider">Class Bonus</span>
                                </div>
                                <span className="text-sm text-yellow-400 font-bold">{bonusConfig.current.toLocaleString()} / {bonusConfig.target.toLocaleString()}</span>
                            </div>
                            
                            <div className="w-full bg-gray-900 rounded-full h-6 mb-4 border border-cyan-500/20 relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>
                                <div 
                                    className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                                    style={{ width: `${Math.min((bonusConfig.current / bonusConfig.target) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-yellow-400/90 italic truncate font-bold">{bonusConfig.reward}</div>
                                <div className="text-[10px] text-cyan-500/60 uppercase tracking-widest">Shields Charging...</div>
                            </div>

                            <div className="mt-2 text-[10px] text-cyan-500/40 leading-tight">
                                Earn XP together to unlock this reward. When the bar is full, you win!
                            </div>
                        </>
                    )}
                 </div>
             </div>

             {/* Row 2: Quick Command Modules */}
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                <div id="tile-roster">
                    <QuickAction 
                        title="Student Roster" 
                        icon={<Users size={28} />} 
                        desc="Manage Students"
                        href="/teacher/roster"
                        color="text-blue-400"
                        borderColor="border-blue-500/30"
                    />
                </div>
                <div id="tile-ranks">
                     <QuickAction 
                        title="Rank Thresholds" 
                        icon={<Shield size={28} />} 
                        desc="Edit XP Levels"
                        href="/teacher/settings?mode=ranks"
                        color="text-purple-400"
                        borderColor="border-purple-500/30"
                    />
                </div>
                <div id="tile-rewards">
                    <QuickAction 
                        title="Behavior Settings" 
                        icon={<Zap size={28} />} 
                        desc="Edit Protocols"
                        href="/teacher/rewards"
                        color="text-white"
                        borderColor="border-yellow-500/30"
                    />
                </div>
                <div id="tile-avatar">
                    <QuickAction 
                        title="My Teacher Avatar"
                        icon={<Settings size={28} />}
                        desc="Personal Config"
                        href="/teacher/settings"
                        color="text-cyan-400"
                        borderColor="border-cyan-500/30"
                    />
                </div>

                <div id="tile-lessons">
                    <QuickAction 
                        title="Lesson Plans" 
                        icon={<Target size={28} />} 
                        desc="Assign Missions"
                        href="/teacher/missions"
                        color="text-red-400"
                        borderColor="border-red-500/30"
                    />
                </div>
                {/* Classroom Display moved to top banner */}
                <div id="tile-planets">
                     <QuickAction 
                        title="Planet Rewards" 
                        icon={<Award size={28} />} 
                        desc="Edit Milestones"
                        href="/teacher/planets"
                        color="text-teal-400"
                        borderColor="border-teal-500/30"
                    />
                </div>
                <div id="tile-asteroids">
                    <QuickAction 
                        title="Asteroid Event" 
                        icon={<AlertTriangle size={28} />} 
                        desc="Launch Challenge"
                        href="/teacher/settings?mode=asteroids"
                        color="text-orange-400"
                        borderColor="border-orange-500/30"
                    />
                </div>
                
                <div id="tile-billing">
                     <QuickAction 
                        title="Subscriptions" 
                        icon={<CreditCard size={28} />} 
                        desc="Billing"
                        href="/teacher/settings?mode=billing"
                        color="text-emerald-400"
                        borderColor="border-emerald-500/30"
                    />
                </div>
                <div id="tile-team">
                    <QuickAction 
                        title="Manage Team" 
                        icon={<UserPlus size={28} />} 
                        desc="Co-Teachers"
                        href="/teacher/settings?mode=team"
                        color="text-indigo-400"
                        borderColor="border-indigo-500/30"
                    />
                </div>
                <div id="tile-print">
                    <QuickAction 
                        title="Print Center"
                        icon={<Printer size={28} />}
                        desc="Badges & Cards"
                        href="/teacher/printables"
                        color="text-pink-400"
                        borderColor="border-pink-500/30"
                    />
                </div>
                <div id="tile-award">
                    <QuickAction 
                        title="Award Points" 
                        icon={<Zap size={28} />} 
                        desc="Mobile Tool"
                        href="/teacher/rewards"
                        color="text-yellow-400"
                        borderColor="border-yellow-500/30"
                    />
                </div>
             </div>
             
             {/* Row 3: Auxiliary / Status removed as requested for simplified UI */}

       </main>
    </div>
  );
}

function NavButton({ icon, label, href, isActive = false }: any) {
    return (
        <Link href={href} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${isActive ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/50'}`}>
            <div className={`${isActive ? 'text-cyan-200' : 'text-cyan-500 group-hover:text-cyan-300'}`}>
                {icon}
            </div>
            <span className="font-bold tracking-wider">{label}</span>
        </Link>
    )
}

function QuickAction({ title, icon, desc, href, color, borderColor }: any) {
    return (
        <Link href={href} className={`flex flex-col gap-3 p-6 rounded-xl border ${borderColor} bg-black/40 hover:bg-white/5 transition-all group relative overflow-hidden`}>
            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            
            <div className={`p-3 rounded-lg bg-white/5 w-fit ${color} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div>
                <h3 className={`font-bold text-lg text-white group-hover:text-cyan-300 transition-colors`}>{title}</h3>
                <p className="text-xs text-cyan-400/50 group-hover:text-cyan-400/80">{desc}</p>
            </div>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                <ExternalLink size={14} className="text-cyan-500" />
            </div>
        </Link>
    )
}
