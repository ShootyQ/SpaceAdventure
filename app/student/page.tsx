"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Map, Settings, Power, Shield, Activity, Star } from 'lucide-react';
import SolarSystem from '@/components/SolarSystem';
import { getAssetPath } from '@/lib/utils';

// Custom Icon
const Rocket = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <img 
        src={getAssetPath("/images/ships/finalship.png")}
        alt="Rocket"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
    />
);

export default function StudentConsole() {
  const { user, userData, logout } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col text-cyan-400 font-mono bg-black">
       {/* Background is handled by SolarSystem component usually, but here we can reuse it or just show dashboard */}
       
       {/* Top HUD Bar */}
       <header className="z-10 flex justify-between items-center p-4 border-b border-cyan-500/30 bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="bg-cyan-500/20 p-2 rounded-full border border-cyan-400">
                <Rocket size={20} />
             </div>
             <div>
                 <h1 className="text-xl font-bold tracking-widest uppercase">Cadet Terminal</h1>
                 <div className="text-xs text-cyan-600">ID: {user?.uid.slice(0,8)}</div>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 px-4 py-2 border border-yellow-500/30 bg-yellow-900/10 rounded-full">
                 <Star size={16} className="text-yellow-400" />
                 <span className="font-bold text-yellow-100">rank 1</span>
             </div>
             
             <button 
                onClick={logout}
                className="p-2 hover:bg-red-900/20 text-red-400 rounded transition-colors"
                title="Logout"
             >
                <Power size={20} />
             </button>
          </div>
       </header>

       {/* Main Viewport */}
       <main className="flex-1 relative z-0">
          {/* We show the map directly as the main view for students */}
          <SolarSystem />
          
          {/* Overlay Controls for Student */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              <Link href="/student/settings" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2">
                  <Settings size={20} />
                  <span className="hidden md:inline font-bold">Ship Config</span>
              </Link>
          </div>
       </main>

       {/* Bottom HUD - Stats */}
       <div className="z-10 border-t border-cyan-500/30 bg-black/80 backdrop-blur-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="flex flex-col">
               <span className="text-xs text-gray-500 uppercase">Current Mission</span>
               <span className="text-white font-bold">Explore the System</span>
           </div>
           <div className="flex flex-col">
               <span className="text-xs text-gray-500 uppercase">XP Progress</span>
               <div className="w-full bg-gray-800 h-2 rounded-full mt-1">
                   <div className="bg-yellow-500 h-2 rounded-full w-[15%]"></div>
               </div>
           </div>
       </div>
    </div>
  );
}
