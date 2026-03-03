"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import {
    ACHIEVEMENT_DEFINITIONS,
    evaluateAchievements,
    getAchievementCategoryLabel,
    resolveAchievementMetrics,
    type AchievementCardState,
    type PlanetUnlockMap,
} from "@/lib/achievements";
import { DEFAULT_UNLOCK_CONFIG, normalizeUnlockConfig } from "@/lib/unlocks";

const categoryOrder = ["collection", "exploration", "rarity"] as const;

export default function StudentAchievementsPage() {
    const { user, userData, loading } = useAuth();
    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
    const [planetShipUnlocks, setPlanetShipUnlocks] = useState<PlanetUnlockMap>({});
    const [planetAvatarUnlocks, setPlanetAvatarUnlocks] = useState<PlanetUnlockMap>({});
    const [saveError, setSaveError] = useState<string>("");
    const pendingPersistRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
            setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const teacherId = userData?.role === "student" ? userData?.teacherId : userData?.uid;
        if (!teacherId) {
            setPlanetShipUnlocks({});
            setPlanetAvatarUnlocks({});
            return;
        }

        const unsub = onSnapshot(collection(db, `users/${teacherId}/planets`), (snapshot) => {
            const nextShipUnlocks: PlanetUnlockMap = {};
            const nextAvatarUnlocks: PlanetUnlockMap = {};

            snapshot.forEach((planetDoc) => {
                const planetId = String(planetDoc.id || "").trim().toLowerCase();
                if (!planetId) return;

                const data = (planetDoc.data() as any) || {};
                const rawShipUnlocks = (data?.unlocks?.ships || {}) as Record<string, unknown>;
                const rawAvatarUnlocks = (data?.unlocks?.avatars || {}) as Record<string, unknown>;

                const normalizedShipUnlocks: Record<string, number> = {};
                Object.entries(rawShipUnlocks).forEach(([key, value]) => {
                    const threshold = Number(value || 0);
                    if (threshold > 0) normalizedShipUnlocks[key] = threshold;
                });

                const normalizedAvatarUnlocks: Record<string, number> = {};
                Object.entries(rawAvatarUnlocks).forEach(([key, value]) => {
                    const threshold = Number(value || 0);
                    if (threshold > 0) normalizedAvatarUnlocks[key] = threshold;
                });

                nextShipUnlocks[planetId] = normalizedShipUnlocks;
                nextAvatarUnlocks[planetId] = normalizedAvatarUnlocks;
            });

            setPlanetShipUnlocks(nextShipUnlocks);
            setPlanetAvatarUnlocks(nextAvatarUnlocks);
        });

        return () => unsub();
    }, [userData?.role, userData?.teacherId, userData?.uid]);

    const metrics = useMemo(() => {
        if (!userData || userData.role !== "student") return null;
        return resolveAchievementMetrics({
            userData,
            unlockConfig,
            planetShipUnlocks,
            planetAvatarUnlocks,
        });
    }, [planetAvatarUnlocks, planetShipUnlocks, unlockConfig, userData]);

    const cardStates = useMemo(() => {
        if (!metrics) return [] as AchievementCardState[];
        return evaluateAchievements({
            definitions: ACHIEVEMENT_DEFINITIONS,
            metrics,
            earnedMap: userData?.achievementsEarned,
        });
    }, [metrics, userData?.achievementsEarned]);

    const earnedCount = useMemo(() => cardStates.filter((card) => card.isEarned).length, [cardStates]);

    const newlyEarnedIds = useMemo(() => {
        if (!userData) return [] as string[];
        const earnedMap = userData.achievementsEarned || {};
        return cardStates
            .filter((card) => card.currentValue >= card.threshold)
            .filter((card) => !earnedMap[card.id])
            .map((card) => card.id);
    }, [cardStates, userData]);

    useEffect(() => {
        if (!user || !userData || userData.role !== "student" || newlyEarnedIds.length === 0) return;

        const queuedIds = newlyEarnedIds.filter((achievementId) => !pendingPersistRef.current.has(achievementId));
        if (queuedIds.length === 0) return;

        queuedIds.forEach((achievementId) => pendingPersistRef.current.add(achievementId));

        const nowMs = Date.now();
        const updatePayload: Record<string, any> = {};
        queuedIds.forEach((achievementId) => {
            updatePayload[`achievementsEarned.${achievementId}`] = { earnedAt: nowMs };
        });

        updateDoc(doc(db, "users", user.uid), updatePayload)
            .then(() => {
                setSaveError("");
            })
            .catch((error) => {
                console.error("Failed to persist achievements:", error);
                setSaveError("Could not save achievements yet. Your progress still appears here.");
            })
            .finally(() => {
                queuedIds.forEach((achievementId) => pendingPersistRef.current.delete(achievementId));
            });
    }, [newlyEarnedIds, user, userData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
                Loading achievements...
            </div>
        );
    }

    if (!userData || userData.role !== "student") {
        return (
            <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
                Redirecting...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="border border-cyan-500/30 bg-black/40 rounded-2xl p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-600">Hidden Terminal</div>
                            <h1 className="mt-1 text-2xl md:text-3xl font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                <Trophy size={24} className="text-amber-300" /> Achievements
                            </h1>
                            <p className="text-xs text-cyan-500 mt-2">Earn badges by collecting, exploring, and finding rarity tiers.</p>
                        </div>
                        <Link
                            href="/student/studentnavigation"
                            className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold"
                        >
                            Back
                        </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-4">
                            <div className="text-xs uppercase tracking-wider text-cyan-600">Earned</div>
                            <div className="text-2xl font-bold text-white mt-1">{earnedCount}</div>
                        </div>
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-4">
                            <div className="text-xs uppercase tracking-wider text-cyan-600">Total</div>
                            <div className="text-2xl font-bold text-white mt-1">{cardStates.length}</div>
                        </div>
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-4">
                            <div className="text-xs uppercase tracking-wider text-cyan-600">Completion</div>
                            <div className="text-2xl font-bold text-white mt-1">
                                {cardStates.length > 0 ? Math.round((earnedCount / cardStates.length) * 100) : 0}%
                            </div>
                        </div>
                    </div>

                    {saveError ? <p className="text-xs text-amber-300 mt-3">{saveError}</p> : null}
                </div>

                {categoryOrder.map((category) => {
                    const categoryCards = cardStates.filter((card) => card.category === category);
                    if (categoryCards.length === 0) return null;

                    return (
                        <section key={category} className="border border-cyan-500/20 bg-black/40 rounded-2xl p-5">
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white mb-4">{getAchievementCategoryLabel(category)}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {categoryCards.map((card) => {
                                    const isLocked = !card.isEarned;
                                    return (
                                        <article
                                            key={card.id}
                                            className={`rounded-xl border p-4 transition-colors ${isLocked ? "border-cyan-900/40 bg-black/30" : "border-green-500/40 bg-green-900/20"}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-14 h-14 rounded-lg border border-cyan-800/40 bg-black/40 flex items-center justify-center overflow-hidden">
                                                    {card.badgeImage ? (
                                                        <img src={getAssetPath(card.badgeImage)} alt={card.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Trophy size={20} className="text-amber-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">{card.title}</h3>
                                                    <p className="text-xs text-cyan-500 mt-1">{card.description}</p>
                                                </div>
                                                {card.isEarned ? (
                                                    <CheckCircle2 size={16} className="text-green-300 shrink-0" />
                                                ) : (
                                                    <Lock size={16} className="text-cyan-700 shrink-0" />
                                                )}
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-[11px] text-cyan-500">
                                                    <span>Progress</span>
                                                    <span>{Math.min(card.currentValue, card.threshold)} / {card.threshold}</span>
                                                </div>
                                                <progress
                                                    value={Math.min(card.currentValue, card.threshold)}
                                                    max={card.threshold}
                                                    className="w-full h-2 mt-1 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-black [&::-webkit-progress-value]:bg-cyan-500"
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
