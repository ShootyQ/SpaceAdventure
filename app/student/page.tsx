"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Settings, Power, Star, Coins } from 'lucide-react';
import { getAssetPath } from '@/lib/utils';
import { resolveShipAssetPath } from '@/lib/ships';
import { Rank } from '@/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AVATAR_OPTIONS } from '@/components/UserAvatar';
import interiorZones from '@/data/interior-zones/defaultinterior.zones.json';
import { getPetById, getResolvedSelectedPetId } from '@/lib/pets';

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
        src={getAssetPath("/images/collectibles/ships/starter/finalship.png")}
        alt="Rocket"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
    />
);

export default function StudentConsole() {
  const { user, userData, logout } = useAuth();
  const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);

    const findZone = (zoneId: string) => interiorZones.zones.find((zone) => zone.id === zoneId);
    const badgeZone = findZone('zone_currentBadge');
    const avatarZone = findZone('zone_playerAvatar');
    const shipZone = findZone('zone_player_currentShip');
    const petZone = findZone('zone_playerPet');

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

    const selectedShipId = userData?.spaceship?.modelId || userData?.spaceship?.id || 'finalship';
    const selectedAvatarId = userData?.avatar?.avatarId || 'bunny';
    const selectedAvatar = AVATAR_OPTIONS.find((avatar) => avatar.id === selectedAvatarId) || AVATAR_OPTIONS[0];
    const selectedPetId = getResolvedSelectedPetId(userData);
    const selectedPet = getPetById(selectedPetId);
    const galacticCredits = Number(userData?.galacticCredits || 0);

    const zoneStyle = (zone?: { x: number; y: number; w: number; h: number; z?: number }) => {
        if (!zone) return undefined;
        return {
            left: `${zone.x * 100}%`,
            top: `${zone.y * 100}%`,
            width: `${zone.w * 100}%`,
            height: `${zone.h * 100}%`,
            zIndex: zone.z || 10,
        } as React.CSSProperties;
    };

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

             <div className="flex items-center gap-2 px-4 py-2 border border-amber-500/30 bg-amber-900/10 rounded-full">
                 <Coins size={16} className="text-amber-300" />
                 <span className="font-bold text-amber-100">{galacticCredits} GC</span>
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
                 <main className="flex-1 relative z-0 min-h-0 p-4">
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="relative w-full max-w-6xl aspect-[1536/864] rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/60 shadow-[0_30px_90px_rgba(8,145,178,0.2)]">
                            <img
                                src={getAssetPath(interiorZones.image)}
                                alt="Spaceship Interior"
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {badgeZone && (
                                <div className="absolute p-1" style={zoneStyle(badgeZone)}>
                                    {currentRank.image ? (
                                        <img
                                            src={getAssetPath(currentRank.image)}
                                            alt={currentRank.name}
                                            className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-md bg-black/30 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                                            <Star size={18} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {avatarZone && (
                                <div className="absolute p-1" style={zoneStyle(avatarZone)}>
                                    <img
                                        src={getAssetPath(selectedAvatar.src)}
                                        alt={selectedAvatar.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            {shipZone && (
                                <div className="absolute p-1" style={zoneStyle(shipZone)}>
                                    <img
                                        src={getAssetPath(resolveShipAssetPath(selectedShipId))}
                                        onError={(event) => {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.src = getAssetPath('/images/collectibles/ships/starter/finalship.png');
                                        }}
                                        alt="Current Ship"
                                        className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                                    />
                                </div>
                            )}

                            {petZone && (
                                <div className="absolute p-1" style={zoneStyle(petZone)}>
                                    {selectedPet.imageSrc ? (
                                        <img
                                            src={getAssetPath(selectedPet.imageSrc)}
                                            alt={selectedPet.name}
                                            className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(167,139,250,0.35)]"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-xl bg-black/35 border border-purple-400/40 flex flex-col items-center justify-center">
                                            <div className="text-3xl md:text-4xl leading-none">{selectedPet.emoji}</div>
                                            <div className="mt-1 text-[10px] md:text-xs uppercase tracking-widest text-purple-200 text-center px-1">
                                                {selectedPet.name}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Overlay Controls for Student */}
                    <div className="absolute top-6 left-6 z-30">
                        <Link href="/student/studentnavigation" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2">
                            <Settings size={20} />
                            <span className="hidden md:inline font-bold">Back to Cockpit</span>
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
