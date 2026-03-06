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
const trackMetricOrder: Record<string, number> = {
    pets_owned_excluding_starters: 1,
    ships_owned_excluding_starters: 2,
    avatars_owned_excluding_starters: 3,
    planets_landed_excluding_sun: 1,
    common_collectibles_owned: 1,
    uncommon_collectibles_owned: 2,
    rare_collectibles_owned: 3,
    extremely_rare_collectibles_owned: 4,
};

const stripTierSuffix = (title: string) => String(title || "").replace(/\s+\d+$/, "").trim();

const stripThresholdSuffix = (description: string) => String(description || "").replace(/\s*\(\d+\)\s*$/, "").trim();

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

    const categoryTracks = useMemo(() => {
        return categoryOrder.map((category) => {
            const cards = cardStates.filter((card) => card.category === category);
            const grouped = new Map<string, AchievementCardState[]>();

            cards.forEach((card) => {
                const key = `${card.category}:${card.metric}`;
                const existing = grouped.get(key) || [];
                existing.push(card);
                grouped.set(key, existing);
            });

            const tracks = Array.from(grouped.values())
                .map((cardsInTrack) => cardsInTrack.sort((a, b) => a.threshold - b.threshold))
                .sort((a, b) => {
                    const metricOrderA = trackMetricOrder[a[0].metric] || 99;
                    const metricOrderB = trackMetricOrder[b[0].metric] || 99;
                    if (metricOrderA !== metricOrderB) return metricOrderA - metricOrderB;
                    return a[0].title.localeCompare(b[0].title);
                });

            return { category, tracks };
        });
    }, [cardStates]);

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
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-3 md:p-4">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="border border-cyan-500/30 bg-black/40 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-600">Hidden Terminal</div>
                            <h1 className="mt-1 text-xl md:text-2xl font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                <Trophy size={22} className="text-amber-300" /> Achievements
                            </h1>
                            <p className="text-[11px] text-cyan-500 mt-2">Compact mission board: unlock tiers across collection, exploration, and rarity.</p>
                        </div>
                        <Link
                            href="/student/studentnavigation"
                            className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold"
                        >
                            Back
                        </Link>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-cyan-600">Earned</div>
                            <div className="text-xl font-bold text-white mt-1">{earnedCount}</div>
                        </div>
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-cyan-600">Total</div>
                            <div className="text-xl font-bold text-white mt-1">{cardStates.length}</div>
                        </div>
                        <div className="rounded-xl border border-cyan-900/40 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-cyan-600">Completion</div>
                            <div className="text-xl font-bold text-white mt-1">
                                {cardStates.length > 0 ? Math.round((earnedCount / cardStates.length) * 100) : 0}%
                            </div>
                        </div>
                    </div>

                    {saveError ? <p className="text-xs text-amber-300 mt-3">{saveError}</p> : null}
                </div>

                {categoryTracks.map(({ category, tracks }) => {
                    if (tracks.length === 0) return null;

                    return (
                        <section key={category} className="border border-cyan-500/20 bg-black/40 rounded-2xl p-4 md:p-5">
                            <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white mb-3">{getAchievementCategoryLabel(category)}</h2>
                            <div className="space-y-2.5">
                                {tracks.map((trackCards) => {
                                    const sample = trackCards[0];
                                    const trackLabel = stripTierSuffix(sample.title);
                                    const trackDescription = stripThresholdSuffix(sample.description);
                                    const currentValue = sample.currentValue;
                                    const maxThreshold = trackCards[trackCards.length - 1]?.threshold || 1;
                                    const completedTiers = trackCards.filter((card) => card.isEarned).length;
                                    return (
                                        <article
                                            key={`${category}-${sample.metric}`}
                                            className="rounded-xl border border-cyan-900/40 bg-black/25 px-3 py-3"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                                <div className="lg:w-56 xl:w-64 shrink-0">
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{trackLabel}</h3>
                                                    <p className="text-[11px] text-cyan-500 mt-0.5">{trackDescription}</p>
                                                    <p className="text-[11px] text-cyan-400 mt-1.5">
                                                        Progress {Math.min(currentValue, maxThreshold)} / {maxThreshold} - {completedTiers}/{trackCards.length} tiers
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                                                    {trackCards.map((card) => {
                                                        const locked = !card.isEarned;
                                                        const progressValue = Math.min(card.currentValue, card.threshold);
                                                        return (
                                                            <div
                                                                key={card.id}
                                                                className={`rounded-lg border p-2.5 ${locked ? "border-cyan-900/50 bg-black/35" : "border-emerald-400/40 bg-emerald-900/20"}`}
                                                            >
                                                                <div className={`relative rounded-lg border overflow-hidden ${locked ? "border-cyan-900/40 bg-black/45" : "border-emerald-400/40 bg-emerald-950/40"}`}>
                                                                    <div className="aspect-square w-full flex items-center justify-center p-2.5">
                                                                        {card.badgeImage ? (
                                                                            <img
                                                                                src={getAssetPath(card.badgeImage)}
                                                                                alt={card.title}
                                                                                className={`w-full h-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.35)] ${locked ? "opacity-80 saturate-75" : ""}`}
                                                                            />
                                                                        ) : (
                                                                            <Trophy size={28} className="text-amber-300" />
                                                                        )}
                                                                    </div>
                                                                    {card.isEarned ? (
                                                                        <CheckCircle2 size={16} className="absolute top-2 right-2 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]" />
                                                                    ) : (
                                                                        <Lock size={16} className="absolute top-2 right-2 text-cyan-700" />
                                                                    )}
                                                                    <div className="absolute left-2 bottom-2 text-[10px] font-bold uppercase tracking-wide text-white/90 bg-black/45 border border-cyan-900/40 rounded px-1.5 py-0.5">
                                                                        Tier {card.tier}
                                                                    </div>
                                                                </div>
                                                                <div className="text-[11px] text-cyan-500 mt-2">{progressValue} / {card.threshold}</div>
                                                                <progress
                                                                    value={progressValue}
                                                                    max={card.threshold}
                                                                    className="w-full h-1.5 mt-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-black [&::-webkit-progress-value]:bg-cyan-500"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
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
