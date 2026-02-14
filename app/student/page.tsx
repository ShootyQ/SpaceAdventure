"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Map, Settings, Power, Shield, Activity, Star } from 'lucide-react';
import SolarSystem from '@/components/SolarSystem';
import { getAssetPath } from '@/lib/utils';
import { Rank } from '@/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const DEFAULT_RANKS: Rank[] = [
    { id: '1', name: "Space Cadet", minXP: 0, image: "/images/badges/cadet.png" },
    { id: '2', name: "Rookie Pilot", minXP: 100, image: "/images/badges/RookiePilot.png" },
    { id: '3', name: "Star Scout", minXP: 300, image: "/images/badges/StarScout.png" },
    { id: '4', name: "Nebula Navigator", minXP: 600, image: "/images/badges/NebulaNavigator.png" },
    { id: '5', name: "Solar Specialist", minXP: 1000, image: "/images/badges/SolarSpecialist.png" },
    { id: '6', name: "Comet Captain", minXP: 1500, image: "/images/badges/CometCaptain.png" },
    { id: '7', name: "Galaxy Guardian", minXP: 2200, image: "/images/badges/GalaxyGuardian.png" },
    { id: '8', name: "Cosmic Commander", minXP: 3000, image: "/images/badges/CosmicCommander.png" },
    { id: '9', name: "Void Admiral", minXP: 4000, image: "/images/badges/VoidAdmiral.png" },
    { id: '10', name: "Grand Star Admiral", minXP: 5000, image: "/images/badges/GrandStarAdmiral.png" }
];

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
  const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "ranks"), (doc) => {
        if (doc.exists() && doc.data().list) {
            setRanks(doc.data().list);
        }
    });
    return () => unsub();
  }, []);

  const currentXP = userData?.xp || 0;
    const sortedRanksAsc = [...ranks].sort((a, b) => a.minXP - b.minXP);
    const sortedRanksDesc = [...ranks].sort((a, b) => b.minXP - a.minXP);
    const currentRank = sortedRanksDesc.find(r => currentXP >= r.minXP) || sortedRanksAsc[0];
    const currentRankIndex = sortedRanksAsc.findIndex((rank) => rank.id === currentRank?.id);
    const nextRank = currentRankIndex >= 0 ? (sortedRanksAsc[currentRankIndex + 1] || null) : null;

    const currentRankFloor = currentRank?.minXP || 0;
    const xpEarnedInRank = Math.max(currentXP - currentRankFloor, 0);
    const xpNeededForNext = nextRank ? Math.max(nextRank.minXP - currentXP, 0) : 0;
    const rankSpan = nextRank ? Math.max(nextRank.minXP - currentRankFloor, 1) : 1;
    const xpProgressPercent = nextRank
            ? Math.min(100, Math.max(0, (xpEarnedInRank / rankSpan) * 100))
            : 100;

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
                 {currentRank.image ? (
                     <img src={getAssetPath(currentRank.image)} alt="Badge" className="w-6 h-6 object-contain" />
                 ) : (
                     <Star size={16} className="text-yellow-400" />
                 )}
                 <span className="font-bold text-yellow-100">{currentRank.name}</span>
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
         <main className="flex-1 relative z-0 min-h-0">
             {/* We show the map directly as the main view for students */}
             <div className="absolute inset-0">
                <SolarSystem studentView />
             </div>
          
          {/* Overlay Controls for Student */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              <Link href="/student/settings" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2">
                  <Settings size={20} />
                  <span className="hidden md:inline font-bold">Cockpit</span>
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
                   <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${xpProgressPercent}%` }}></div>
               </div>
               <span className="text-xs text-cyan-500 mt-1">
                   {nextRank
                       ? `Earned: ${xpEarnedInRank} XP • Left: ${xpNeededForNext} XP to ${nextRank.name}`
                       : `Earned: ${currentXP} XP • Max Rank Reached`}
               </span>
           </div>
       </div>
    </div>
  );
}
