"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Check, Pencil, Star, X } from 'lucide-react';
import { getAssetPath } from '@/lib/utils';
import { resolveShipAssetPath } from '@/lib/ships';
import { Rank } from '@/types';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AVATAR_OPTIONS } from '@/components/UserAvatar';
import interiorZones from '@/data/interior-zones/defaultinterior.zones.json';
import { getPetById, getResolvedSelectedPetId } from '@/lib/pets';
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements';

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
    const { user, userData } = useAuth();
  const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);
    const [editingAchievementZoneId, setEditingAchievementZoneId] = useState<string | null>(null);
    const [savingAchievementZoneId, setSavingAchievementZoneId] = useState<string | null>(null);
    const [achievementNotice, setAchievementNotice] = useState('');

    const findZone = (zoneId: string) => interiorZones.zones.find((zone) => zone.id === zoneId);
    const badgeZone = findZone('zone_currentBadge');
    const avatarZone = findZone('zone_playerAvatar');
    const shipZone = findZone('zone_player_currentShip');
    const petZone = findZone('zone_playerPet');
    const achievementZones = useMemo(
        () => interiorZones.zones.filter((zone) => zone.kind === 'achievement' || zone.id === 'zone_explorerBadge'),
        []
    );

    const earnedAchievementIds = useMemo(
        () => Object.keys(userData?.achievementsEarned || {}).filter(Boolean),
        [userData?.achievementsEarned]
    );

    const earnedAchievements = useMemo(
        () => ACHIEVEMENT_DEFINITIONS.filter((achievement) => earnedAchievementIds.includes(achievement.id)),
        [earnedAchievementIds]
    );

    const selectedAchievementByZoneId = useMemo(() => {
        const assignments = userData?.interiorAchievementSlots || {};
        const byId = new Map(ACHIEVEMENT_DEFINITIONS.map((achievement) => [achievement.id, achievement]));
        const selected = new Map<string, typeof ACHIEVEMENT_DEFINITIONS[number]>();

        Object.entries(assignments).forEach(([zoneId, achievementId]) => {
            const normalizedAchievementId = String(achievementId || '').trim();
            if (!normalizedAchievementId) return;
            const achievement = byId.get(normalizedAchievementId);
            if (achievement) selected.set(zoneId, achievement);
        });

        return selected;
    }, [userData?.interiorAchievementSlots]);

    const activeEditingAchievement = useMemo(() => {
        if (!editingAchievementZoneId) return null;
        return selectedAchievementByZoneId.get(editingAchievementZoneId) || null;
    }, [editingAchievementZoneId, selectedAchievementByZoneId]);

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

    const handleSelectAchievementForZone = async (zoneId: string, achievementId: string) => {
        if (!user) return;
        setSavingAchievementZoneId(zoneId);
        setAchievementNotice('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                [`interiorAchievementSlots.${zoneId}`]: achievementId,
            });
            setEditingAchievementZoneId(null);
        } catch (error) {
            console.error('Failed to save interior achievement slot:', error);
            setAchievementNotice('Could not save achievement slot. Please try again.');
        } finally {
            setSavingAchievementZoneId(null);
        }
    };

    const handleClearAchievementForZone = async (zoneId: string) => {
        if (!user) return;
        setSavingAchievementZoneId(zoneId);
        setAchievementNotice('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                [`interiorAchievementSlots.${zoneId}`]: '',
            });
            setEditingAchievementZoneId(null);
        } catch (error) {
            console.error('Failed to clear interior achievement slot:', error);
            setAchievementNotice('Could not clear achievement slot. Please try again.');
        } finally {
            setSavingAchievementZoneId(null);
        }
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

                        {achievementZones.map((zone) => {
                            const selectedAchievement = selectedAchievementByZoneId.get(zone.id);
                            const isEditing = editingAchievementZoneId === zone.id;
                            const isSaving = savingAchievementZoneId === zone.id;

                            return (
                                <div key={zone.id} className="absolute p-1" style={zoneStyle(zone)}>
                                    <div className={`relative w-full h-full rounded-md border ${isEditing ? 'border-cyan-300/80 bg-cyan-900/30' : 'border-cyan-500/35 bg-black/30'} transition-colors`}>
                                        {selectedAchievement?.badgeImage ? (
                                            <img
                                                src={getAssetPath(selectedAchievement.badgeImage)}
                                                alt={selectedAchievement.title}
                                                className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.28)]"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-cyan-300/80">
                                                <Star size={18} />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setEditingAchievementZoneId(zone.id)}
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/85 border border-cyan-500/60 text-cyan-200 hover:bg-cyan-900/60 flex items-center justify-center"
                                            title="Edit achievement slot"
                                            aria-label={`Edit achievement slot ${zone.label}`}
                                        >
                                            <Pencil size={10} />
                                        </button>
                                        {isSaving ? (
                                            <div className="absolute inset-0 bg-black/55 rounded-md flex items-center justify-center text-[10px] uppercase tracking-wider text-cyan-200">
                                                Saving...
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30">
                    <Link href="/student/studentnavigation" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2">
                        <ArrowLeft size={18} />
                        <span className="hidden md:inline font-bold">Back to Cockpit</span>
                    </Link>
                </div>

                {editingAchievementZoneId ? (
                    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl max-h-[86dvh] overflow-hidden rounded-2xl border border-cyan-500/35 bg-black/90 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                            <div className="p-4 border-b border-cyan-900/60 flex items-center justify-between">
                                <div>
                                    <h2 className="text-white font-bold uppercase tracking-widest text-sm">Select Achievement Badge</h2>
                                    <p className="text-cyan-500 text-xs mt-1">Choose an earned badge for this interior slot.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingAchievementZoneId(null)}
                                    className="w-8 h-8 rounded-lg border border-cyan-800 text-cyan-300 hover:border-cyan-500 hover:text-white flex items-center justify-center"
                                    aria-label="Close achievement picker"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto max-h-[calc(86dvh-88px)]">
                                {earnedAchievements.length === 0 ? (
                                    <p className="text-cyan-400/90 text-sm">No earned achievements yet. Earn badges first, then place them here.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {earnedAchievements.map((achievement) => {
                                            const isSelected = activeEditingAchievement?.id === achievement.id;
                                            return (
                                                <button
                                                    key={achievement.id}
                                                    type="button"
                                                    onClick={() => handleSelectAchievementForZone(editingAchievementZoneId, achievement.id)}
                                                    className={`text-left rounded-xl border p-3 transition-colors ${isSelected ? 'border-cyan-300 bg-cyan-900/30' : 'border-cyan-900/60 bg-black/40 hover:border-cyan-600'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg border border-cyan-800/60 bg-black/40 flex items-center justify-center overflow-hidden">
                                                            {achievement.badgeImage ? (
                                                                <img src={getAssetPath(achievement.badgeImage)} alt={achievement.title} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Star size={18} className="text-cyan-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-white text-xs font-bold uppercase tracking-wide truncate">{achievement.title}</div>
                                                            <div className="text-cyan-500 text-[11px] mt-1 line-clamp-2">{achievement.description}</div>
                                                        </div>
                                                        {isSelected ? <Check size={14} className="text-cyan-200" /> : null}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-4 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleClearAchievementForZone(editingAchievementZoneId)}
                                        disabled={!activeEditingAchievement}
                                        className="px-3 py-2 rounded-lg border border-rose-900/70 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-rose-500/60 text-xs uppercase tracking-wider"
                                    >
                                        Clear Slot
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingAchievementZoneId(null)}
                                        className="px-3 py-2 rounded-lg border border-cyan-800 text-cyan-300 hover:border-cyan-500 text-xs uppercase tracking-wider"
                                    >
                                        Done
                                    </button>
                                </div>

                                {achievementNotice ? <p className="text-xs text-amber-300 mt-3">{achievementNotice}</p> : null}
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
