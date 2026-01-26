"use client";

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Users, Map, Target, Award, Settings, Power, Shield, Activity, Radio, ExternalLink, SlidersHorizontal, Zap, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RankEditor from '@/components/RankEditor';
import { getAssetPath } from '@/lib/utils';

export default function TeacherConsole() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isRankEditorOpen, setIsRankEditorOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col text-cyan-400 font-mono">
       <RankEditor isOpen={isRankEditorOpen} onClose={() => setIsRankEditorOpen(false)} />
       
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
             <NavButton icon={<Users />} label="Roster" href="/teacher/roster" isActive={pathname === '/teacher/roster'} />
             <NavButton icon={<Target />} label="Missions" href="/teacher/missions" isActive={pathname === '/teacher/missions'} />
             <NavButton icon={<Map />} label="Star Map" href="/teacher/map" isActive={pathname === '/teacher/map'} />
             <NavButton icon={<Globe />} label="Planets" href="/teacher/planets" isActive={pathname === '/teacher/planets'} />
             <NavButton icon={<Award />} label="Rewards" href="/teacher/rewards" isActive={pathname === '/teacher/rewards'} />
             <div className="mt-auto">
                <NavButton icon={<Settings />} label="Config" href="/teacher/settings" isActive={pathname === '/teacher/settings'} />
                {/* Asteroid Quick Launch */}
                <Link href="/teacher/settings?mode=asteroids" className="mt-2 flex items-center justify-center p-3 rounded-xl border border-orange-500/50 bg-orange-950/30 text-orange-400 hover:bg-orange-900/50 hover:text-orange-200 transition-all text-sm font-bold uppercase tracking-wider group">
                    <Shield size={18} className="mr-2 group-hover:animate-pulse" />
                    Reset Shields
                </Link>

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
             <div className="flex-1 border border-cyan-500/30 rounded-2xl bg-black/50 backdrop-blur-sm p-8 relative overflow-hidden group flex flex-col">
                <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
                
                {/* Decorative HUD lines */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg" />

                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome Back, Commander.</h2>
                    <p className="text-cyan-300/80">Classroom systems functional. Warp drive ready.</p>
                </div>

                {/* Comms Feed (Moved from Right) */}
                <div className="flex-1 flex flex-col border border-cyan-500/20 bg-black/40 rounded-xl p-6 overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 text-cyan-300 border-b border-cyan-500/20 pb-4">
                        <Radio size={20} />
                        <span className="text-sm font-bold tracking-widest uppercase">Comms Feed</span>
                    </div>
                    <div className="space-y-4 text-sm text-cyan-200/80 font-mono overflow-y-auto pr-2 custom-scrollbar">
                        <p className="flex gap-3"><span className="text-cyan-500 opacity-50">10:42</span> <span>{'>'} Student A reached Rank 3</span></p>
                        <p className="flex gap-3"><span className="text-cyan-500 opacity-50">10:35</span> <span>{'>'} Mission "Homework" issued</span></p>
                        <p className="flex gap-3"><span className="text-cyan-500 opacity-50">09:15</span> <span>{'>'} System check complete...</span></p>
                        <p className="flex gap-3 animate-pulse"><span className="text-cyan-500 opacity-50">NOW</span> <span>{'>'} Awaiting input_</span></p>
                    </div>
                </div>
             </div>
          </div>

          {/* Right Panel - Sensors / Stats */}
          <div className="col-span-1 md:col-span-12 lg:col-span-3 flex flex-col gap-4">
             {/* Class Bonus / Shields */}
             <div className="border border-cyan-500/30 bg-black/60 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2 text-cyan-300">
                    <div className="flex items-center gap-2">
                        <Zap size={18} className="text-yellow-400" />
                        <span className="text-sm font-bold uppercase tracking-wider">Class Bonus</span>
                    </div>
                    <span className="text-xs text-yellow-400 font-bold">7,500 / 10,000</span>
                </div>
                
                <div className="w-full bg-gray-900 rounded-full h-4 mb-2 border border-cyan-500/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>
                    <div 
                        className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full w-[75%] shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000"
                    ></div>
                </div>
                <div className="text-right text-xs text-cyan-500/60 uppercase tracking-widest">Shields Charging...</div>
             </div>

             {/* Placeholder for future sidebar items (since Comms moved) */}
             <div className="border border-cyan-500/30 bg-black/60 rounded-xl p-4 min-h-[200px] flex items-center justify-center text-cyan-500/30 text-xs uppercase tracking-widest border-dashed">
                 Auxiliary Systems
             </div>
          </div>

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
