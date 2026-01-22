"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Users, Map, Target, Award, Settings, Power, Shield, Activity, Radio, ExternalLink, SlidersHorizontal } from 'lucide-react';  
import { useAuth } from '@/context/AuthContext';
import RankEditor from '@/components/RankEditor';

export default function TeacherConsole() {
  const { logout } = useAuth();
  const [isRankEditorOpen, setIsRankEditorOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col text-cyan-400 font-mono">
       <RankEditor isOpen={isRankEditorOpen} onClose={() => setIsRankEditorOpen(false)} />
       {/* Background is handled by globals.css stars, but we add a subtle overlay for UI contrast */}
       <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-black/80 pointer-events-none z-0" />

       {/* Top HUD Bar */}
       <header className="z-10 flex justify-between items-center p-4 border-b border-cyan-500/30 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="animate-pulse bg-cyan-500/20 p-2 rounded-full border border-cyan-400">
                <Activity size={20} />
             </div>
             <h1 className="text-xl font-bold tracking-widest uppercase">Command Deck // Teacher</h1>
          </div>
          <div className="flex gap-4 text-xs tracking-wider">
             <div className="flex flex-col items-end">
                 <span className="text-cyan-600">STATUS</span>
                 <span className="text-green-400">ONLINE</span>
             </div>
          </div>
       </header>

       {/* Main Viewport (The Window to Space) */}
       <main className="flex-1 relative z-10 p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Panel - Navigation */}
          <nav className="col-span-1 md:col-span-3 lg:col-span-2 flex flex-col gap-4">
             <NavButton icon={<Users />} label="Roster" href="/teacher/roster" active />
             <NavButton icon={<Target />} label="Missions" href="/teacher/missions" />
             <NavButton icon={<Map />} label="Star Map" href="/teacher/map" />
             <NavButton icon={<Award />} label="Rewards" href="/teacher/rewards" />
             <div className="mt-auto">
                <NavButton icon={<Settings />} label="Config" href="/teacher/settings" />
                <button 
                    onClick={logout}
                    className="w-full mt-4 flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-900/10 hover:bg-red-900/30 text-red-400 transition-all hover:scale-105 group text-left"
                >
                    <Power size={24} />
                    <span className="font-bold tracking-wider">LOGOUT</span>
                </button>
             </div>
          </nav>

          {/* Center Panel - Main Dashboard Area */}
          <div className="col-span-1 md:col-span-9 lg:col-span-7 flex flex-col gap-6">
             {/* Big Greeting / Quick Actions */}
             <div className="flex-1 border border-cyan-500/30 rounded-2xl bg-black/50 backdrop-blur-sm p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
                
                {/* Decorative HUD lines */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg" />

                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back, Commander.</h2>
                <p className="text-cyan-300/80 mb-8">Classroom systems functional. Warp drive ready.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/teacher/rewards">
                        <DashboardCard title="Quick Award" value="Select Cadet" icon={<ExternalLink size={16} />} />
                    </Link>
                    <Link href="/teacher/missions">
                        <DashboardCard title="Active Missions" value="Mission Control" icon={<ExternalLink size={16} />} />
                    </Link>
                    <Link href="/teacher/map" target="_blank">
                        <DashboardCard title="Display Mode" value="Open Galaxy Map" icon={<Map size={16} />} />
                    </Link>
                    <div onClick={() => setIsRankEditorOpen(true)}>
                        <DashboardCard title="Config" value="Rank Protocols" icon={<SlidersHorizontal size={16} />} />
                    </div>
                </div>
             </div>
          </div>

          {/* Right Panel - Sensors / Stats */}
          <div className="col-span-1 md:col-span-12 lg:col-span-3 flex flex-col gap-4">
             <div className="border border-cyan-500/30 bg-black/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 text-cyan-300 border-b border-cyan-500/20 pb-2">
                    <Shield size={18} />
                    <span className="text-sm font-bold">HULL INTEGRITY</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                    <div className="bg-green-500 h-2 rounded-full w-[92%] shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
                <div className="text-right text-xs text-green-400">92%</div>
             </div>

             <div className="border border-cyan-500/30 bg-black/60 rounded-xl p-4 flex-1">
                <div className="flex items-center gap-2 mb-4 text-cyan-300 border-b border-cyan-500/20 pb-2">
                    <Radio size={18} />
                    <span className="text-sm font-bold">COMMS FEED</span>
                </div>
                <div className="space-y-3 text-xs text-cyan-200/60 font-mono">
                    <p>{'>'} Student A reached Rank 3</p>
                    <p>{'>'} Mission "Homework" issued</p>
                    <p>{'>'} System check complete...</p>
                    <p className="animate-pulse">{'>'} Awaiting input_</p>
                </div>
             </div>
          </div>

       </main>
    </div>
  );
}

function NavButton({ icon, label, href, active = false }: any) {
    return (
        <Link href={href} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${active ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/50'}`}>
            <div className={`${active ? 'text-cyan-200' : 'text-cyan-500 group-hover:text-cyan-300'}`}>
                {icon}
            </div>
            <span className="font-bold tracking-wider">{label}</span>
        </Link>
    )
}

function DashboardCard({ title, value, icon }: any) {
    return (
        <div className="p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/30 transition-colors cursor-pointer group h-full">
            <div className="flex justify-between items-start mb-1">
                 <h3 className="text-sm text-cyan-400 uppercase tracking-widest group-hover:text-cyan-200">{title}</h3>
                 {icon && <span className="text-cyan-500/50 group-hover:text-cyan-400">{icon}</span>}
            </div>
            <p className="text-2xl text-white font-bold">{value}</p>
        </div>
    )
}
