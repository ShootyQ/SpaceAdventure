"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";
import { PLANETS } from "@/types";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowLeft, Save, Trophy, Lock, Sparkles, CheckCircle2 } from "lucide-react";

const TIER_LABELS = ["Pathfinder", "Trailblazer", "Legend"];

interface PlanetXPConfig {
    enabled: boolean;
    thresholds: number[];
}

interface AchievementSettings {
    enabled: boolean;
    planetXP: Record<string, PlanetXPConfig>;
}

interface FixedAchievement {
    id: string;
    title: string;
    description: string;
}

const FIXED_ACHIEVEMENTS: FixedAchievement[] = [
    {
        id: "explore-first-planet",
        title: "First Contact",
        description: "Awarded when a student explores their first new planet."
    },
    {
        id: "explore-all-planets",
        title: "Galaxy Cartographer",
        description: "Awarded when a student has explored every planet in the system."
    },
    {
        id: "collect-pets",
        title: "Pet Collector",
        description: "Awarded at fixed pet collection milestones."
    },
    {
        id: "collect-avatars",
        title: "Avatar Curator",
        description: "Awarded at fixed avatar collection milestones."
    },
    {
        id: "collect-items",
        title: "Cargo Curator",
        description: "Awarded at fixed inventory item milestones."
    },
    {
        id: "collect-ships",
        title: "Fleet Builder",
        description: "Awarded at fixed ship collection milestones."
    }
];

const PLANET_OPTIONS = PLANETS.filter((planet) => planet.id !== "sun");

function buildDefaultPlanetThresholds(baseXP: number): number[] {
    const tier1 = Math.max(100, Number(baseXP) || 100);
    const tier2 = tier1 + Math.max(200, Math.round(tier1 * 0.75));
    const tier3 = tier2 + Math.max(300, Math.round(tier1));
    return [tier1, tier2, tier3];
}

function buildDefaultSettings(): AchievementSettings {
    const planetXP: Record<string, PlanetXPConfig> = {};

    for (const planet of PLANET_OPTIONS) {
        planetXP[planet.id] = {
            enabled: true,
            thresholds: buildDefaultPlanetThresholds(planet.xpRequired)
        };
    }

    return {
        enabled: true,
        planetXP
    };
}

function normalizeSettings(raw: any): AchievementSettings {
    const defaults = buildDefaultSettings();
    const incoming = raw?.planetXP || {};

    const normalized: AchievementSettings = {
        enabled: raw?.enabled !== false,
        planetXP: {}
    };

    for (const planet of PLANET_OPTIONS) {
        const source = incoming[planet.id];
        const fallback = defaults.planetXP[planet.id];
        const candidate = Array.isArray(source?.thresholds) ? source.thresholds : fallback.thresholds;

        normalized.planetXP[planet.id] = {
            enabled: source?.enabled !== false,
            thresholds: [0, 1, 2].map((index) => {
                const value = Number(candidate[index]);
                return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback.thresholds[index];
            })
        };
    }

    return normalized;
}

export default function TeacherAchievementsSetupPage() {
    const { user, userData, loading } = useAuth();
    const { activeTeacherId } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;
    const [settings, setSettings] = useState<AchievementSettings>(buildDefaultSettings());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

    useEffect(() => {
        if (!teacherScopeId) {
            setIsLoading(false);
            return;
        }

        const ref = doc(db, `users/${teacherScopeId}/settings`, "achievements");
        const unsub = onSnapshot(ref, async (snapshot) => {
            if (!snapshot.exists()) {
                const defaults = buildDefaultSettings();
                setSettings(defaults);
                setIsLoading(false);

                await setDoc(
                    ref,
                    {
                        ...defaults,
                        teacherId: teacherScopeId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        fixedCatalogVersion: 1
                    },
                    { merge: true }
                );
                return;
            }

            setSettings(normalizeSettings(snapshot.data()));
            setIsLoading(false);
        });

        return () => unsub();
    }, [teacherScopeId]);

    const validationErrors = useMemo(() => {
        const errors: Record<string, string> = {};

        for (const planet of PLANET_OPTIONS) {
            const config = settings.planetXP[planet.id];
            if (!config || !config.enabled) continue;

            const [tier1, tier2, tier3] = config.thresholds;
            if (!(tier1 < tier2 && tier2 < tier3)) {
                errors[planet.id] = "Tier 1 must be lower than Tier 2, and Tier 2 must be lower than Tier 3.";
            }
        }

        return errors;
    }, [settings]);

    const hasValidationErrors = Object.keys(validationErrors).length > 0;

    const updateThreshold = (planetId: string, index: number, value: string) => {
        const numeric = Number(value);
        const safeValue = Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : 0;

        setSettings((prev) => {
            const current = prev.planetXP[planetId] || { enabled: true, thresholds: [100, 300, 600] };
            const thresholds = [...current.thresholds];
            thresholds[index] = safeValue;

            return {
                ...prev,
                planetXP: {
                    ...prev.planetXP,
                    [planetId]: {
                        ...current,
                        thresholds
                    }
                }
            };
        });
        setSaveStatus("idle");
    };

    const togglePlanetXP = (planetId: string) => {
        setSettings((prev) => {
            const current = prev.planetXP[planetId] || { enabled: true, thresholds: [100, 300, 600] };

            return {
                ...prev,
                planetXP: {
                    ...prev.planetXP,
                    [planetId]: {
                        ...current,
                        enabled: !current.enabled
                    }
                }
            };
        });
        setSaveStatus("idle");
    };

    const handleSave = async () => {
        if (!teacherScopeId || hasValidationErrors) return;

        setIsSaving(true);
        setSaveStatus("idle");

        try {
            const ref = doc(db, `users/${teacherScopeId}/settings`, "achievements");
            await setDoc(
                ref,
                {
                    ...settings,
                    teacherId: teacherScopeId,
                    updatedAt: serverTimestamp(),
                    fixedCatalogVersion: 1
                },
                { merge: true }
            );

            setSaveStatus("saved");
        } catch (error) {
            console.error("Error saving achievements settings:", error);
            setSaveStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
                Loading achievements setup...
            </div>
        );
    }

    if (!userData || userData.role !== "teacher") {
        return (
            <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
                Redirecting...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-cyan-500/30 rounded-2xl bg-black/50 p-5">
                    <div className="flex items-start gap-4">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500 mt-1">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-500">Teacher Setup</div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-widest mt-1 flex items-center gap-3">
                                <Trophy size={24} className="text-amber-300" /> Achievements
                            </h1>
                            <p className="text-sm text-cyan-500 mt-2">
                                Setup-only page: configure badge requirements now, earning logic comes later.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || hasValidationErrors}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save Setup"}
                    </button>
                </div>

                <div className="border border-cyan-500/30 rounded-2xl bg-black/50 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Feature Access</h2>
                            <p className="text-xs text-cyan-500 mt-1">Per-account toggle is ready. Leave ON for now while badges are being designed.</p>
                        </div>
                        <button
                            onClick={() => {
                                setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
                                setSaveStatus("idle");
                            }}
                            className={`px-4 py-2 rounded-lg border text-xs uppercase tracking-widest font-bold transition-colors ${settings.enabled ? "border-green-500/40 bg-green-900/30 text-green-300" : "border-red-500/40 bg-red-900/20 text-red-300"}`}
                        >
                            {settings.enabled ? "Enabled" : "Disabled"}
                        </button>
                    </div>
                </div>

                <div className="border border-cyan-500/30 rounded-2xl bg-black/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Lock size={16} className="text-cyan-500" />
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Fixed (Not Editable)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {FIXED_ACHIEVEMENTS.map((achievement) => (
                            <div key={achievement.id} className="rounded-xl border border-cyan-900/40 bg-black/30 p-4">
                                <div className="text-white font-bold text-sm uppercase tracking-wide">{achievement.title}</div>
                                <p className="text-xs text-cyan-500 mt-2">{achievement.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border border-cyan-500/30 rounded-2xl bg-black/50 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-amber-300" />
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Editable Planet XP Badges</h2>
                    </div>
                    <p className="text-xs text-cyan-500 mb-5">
                        Each planet has 3 badge tiers. Tier order is enforced so students progress from lower to higher goals.
                    </p>

                    <div className="space-y-4">
                        {PLANET_OPTIONS.map((planet) => {
                            const config = settings.planetXP[planet.id] || {
                                enabled: true,
                                thresholds: buildDefaultPlanetThresholds(planet.xpRequired)
                            };

                            return (
                                <div key={planet.id} className="rounded-xl border border-cyan-900/40 bg-black/30 p-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                                        <div>
                                            <h3 className="text-white font-bold uppercase tracking-wider">{planet.name}</h3>
                                            <p className="text-[11px] text-cyan-500">Badge path: {planet.name} {TIER_LABELS[0]} → {planet.name} {TIER_LABELS[1]} → {planet.name} {TIER_LABELS[2]}</p>
                                        </div>
                                        <button
                                            onClick={() => togglePlanetXP(planet.id)}
                                            className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase tracking-widest font-bold transition-colors ${config.enabled ? "border-green-500/40 bg-green-900/20 text-green-300" : "border-slate-600 bg-slate-900/30 text-slate-300"}`}
                                        >
                                            {config.enabled ? "Enabled" : "Disabled"}
                                        </button>
                                    </div>

                                    <div className="grid sm:grid-cols-3 gap-3">
                                        {TIER_LABELS.map((tierLabel, index) => (
                                            <label key={tierLabel} className="block rounded-lg border border-cyan-900/40 bg-black/40 p-3">
                                                <div className="text-[10px] uppercase tracking-wider text-cyan-500 mb-1">{tierLabel}</div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={config.thresholds[index] ?? 0}
                                                    onChange={(event) => updateThreshold(planet.id, index, event.target.value)}
                                                    disabled={!config.enabled}
                                                    className="w-full bg-black border border-cyan-800 rounded p-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-40"
                                                />
                                                <div className="text-[10px] text-cyan-600 mt-1">XP needed</div>
                                            </label>
                                        ))}
                                    </div>

                                    {validationErrors[planet.id] && (
                                        <p className="text-[11px] text-red-400 mt-3">{validationErrors[planet.id]}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
                    <div className="text-cyan-500">
                        {saveStatus === "saved" && <span className="text-green-400 inline-flex items-center gap-1"><CheckCircle2 size={14} /> Saved successfully.</span>}
                        {saveStatus === "error" && <span className="text-red-400">Could not save. Try again.</span>}
                        {saveStatus === "idle" && <span>Changes are local until you click Save Setup.</span>}
                    </div>
                    <div className="text-cyan-600">Achievement earning is intentionally not active yet.</div>
                </div>
            </div>
        </div>
    );
}
