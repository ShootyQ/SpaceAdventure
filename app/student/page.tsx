"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Star } from 'lucide-react';
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

export default function StudentConsole() {
    const { userData } = useAuth();
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

    const selectedShipId = userData?.spaceship?.modelId || userData?.spaceship?.id || 'finalship';
    const selectedAvatarId = userData?.avatar?.avatarId || 'bunny';
    const selectedAvatar = AVATAR_OPTIONS.find((avatar) => avatar.id === selectedAvatarId) || AVATAR_OPTIONS[0];
    const selectedPetId = getResolvedSelectedPetId(userData);
    const selectedPet = getPetById(selectedPetId);

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
    <div className="h-[100dvh] w-full relative overflow-hidden text-cyan-400 font-mono bg-black">
        <main className="h-full w-full relative z-0">
            <div className="h-full w-full flex items-center justify-center p-2 md:p-3">
                <div className="relative w-full max-w-[calc(100dvh*1.7778)] aspect-[1536/864] rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/60 shadow-[0_30px_90px_rgba(8,145,178,0.2)]">
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

            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30">
                <Link href="/student/studentnavigation" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2">
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline font-bold">Back to Cockpit</span>
                </Link>
            </div>
                    </div>
       </main>
    </div>
  );
}
