"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Gift, Database, Star, RotateCcw } from "lucide-react";
import { PLANETS } from "@/types"; // Using types instead of redeclaring
import { AVATAR_OPTIONS, UserAvatar } from "@/components/UserAvatar";
import { SHIP_OPTIONS, resolveShipAssetPath } from "@/lib/ships";
import { DEFAULT_UNLOCK_CONFIG, getXpUnlockRules, normalizeUnlockConfig, resolveRuntimeUnlockId, UnlockRule } from "@/lib/unlocks";

// Interface for dynamic data stored in DB
interface PlanetData {
    id: string;
    xpGoal: number;
    currentXP: number;
    rewardName?: string;
    rewardDescription?: string;
    unlocks?: {
        ships?: Record<string, number>;
        avatars?: Record<string, number>;
    };
}

// Merge of Static + Dynamic
interface PlanetState extends PlanetData {
    name: string;
    color: string;
}

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const toIntMin = (value: unknown, minimum: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return minimum;
    return Math.max(Math.floor(numeric), minimum);
};

export default function PlanetManagementPage() {
    const { user } = useAuth();
    const [planets, setPlanets] = useState<PlanetState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saveStatusByPlanet, setSaveStatusByPlanet] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
    const shipCatalogIds = useMemo(() => new Set<string>(SHIP_OPTIONS.map((ship) => ship.id)), []);
    const avatarCatalogIds = useMemo(() => new Set<string>(AVATAR_OPTIONS.map((avatar) => avatar.id)), []);

    const AVATAR_UNLOCK_RULES: UnlockRule[] = getXpUnlockRules(unlockConfig.avatars);
    const SHIP_UNLOCK_RULES: UnlockRule[] = getXpUnlockRules(unlockConfig.ships);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
            setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
        });

        return () => unsub();
    }, []);

    // Initial Load & Subscription
    useEffect(() => {
        if (!user) return;
        // Use subcollection
        const q = collection(db, `users/${user.uid}/planets`);
        
        const unsub = onSnapshot(q, (snapshot) => {
             const dynamicMap = new Map<string, PlanetData>();
             snapshot.forEach(d => {
                 const data = d.data() as Partial<PlanetData>;
                 // Ensure ID is set (if not in data, use doc ID)
                 const normalizedPlanetId = normalizePlanetId(d.id);
                 dynamicMap.set(normalizedPlanetId, {
                     id: normalizedPlanetId,
                     xpGoal: toIntMin(data.xpGoal, 1),
                     currentXP: toIntMin(data.currentXP, 0),
                     rewardName: String(data.rewardName || ""),
                     rewardDescription: String(data.rewardDescription || ""),
                     unlocks: {
                         ships: { ...(data.unlocks?.ships || {}) },
                         avatars: { ...(data.unlocks?.avatars || {}) },
                     },
                 });
             });

             const merged = PLANETS.map(staticPlanet => {
                 const dynamic = dynamicMap.get(staticPlanet.id) || {
                     id: staticPlanet.id,
                     xpGoal: 1000,
                     currentXP: 0,
                     rewardName: "",
                     rewardDescription: "",
                     unlocks: { ships: {}, avatars: {} }
                 };
                 return {
                     ...dynamic, // Dynamic overrides defaults
                     name: staticPlanet.name,
                     color: staticPlanet.color
                 };
             });
             
             setPlanets(merged);
             setLoading(false);
        });
        return () => unsub();
    }, [user]); // Add user dependency

    const handleChange = (id: string, field: keyof PlanetData, value: any) => {
        setPlanets(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleNumberChange = (planetId: string, field: "xpGoal" | "currentXP", value: string, minValue: number) => {
        setPlanets(prev => prev.map((p) => {
            if (p.id !== planetId) return p;
            if (value.trim() === "") return { ...p, [field]: minValue };
            return { ...p, [field]: toIntMin(value, minValue) };
        }));
    };

    const handleAvatarUnlockChange = (planetId: string, avatarKey: string, value: string) => {
        const numeric = Number(value);
        setPlanets(prev => prev.map(p => {
            if (p.id !== planetId) return p;
            const unlocks = {
                ships: { ...(p.unlocks?.ships || {}) },
                avatars: { ...(p.unlocks?.avatars || {}) },
            };
            unlocks.avatars[avatarKey] = Number.isFinite(numeric) ? numeric : 0;
            return { ...p, unlocks };
        }));
    };

    const handleShipUnlockChange = (planetId: string, shipKey: string, value: string) => {
        const numeric = Number(value);
        setPlanets(prev => prev.map(p => {
            if (p.id !== planetId) return p;
            const unlocks = {
                ships: { ...(p.unlocks?.ships || {}) },
                avatars: { ...(p.unlocks?.avatars || {}) },
            };
            unlocks.ships[shipKey] = Number.isFinite(numeric) ? numeric : 0;
            return { ...p, unlocks };
        }));
    };

    const handleSave = async (planet: PlanetState) => {
        if (!user) {
            setSaveStatusByPlanet((prev) => ({
                ...prev,
                [planet.id]: { type: "error", message: "You are not signed in." },
            }));
            return;
        }
        setSaving(planet.id);
        setSaveStatusByPlanet((prev) => {
            const next = { ...prev };
            delete next[planet.id];
            return next;
        });
        try {
            const planetRef = doc(db, `users/${user.uid}/planets`, planet.id);
            const previousSnapshot = await getDoc(planetRef);
            const previousData = previousSnapshot.exists() ? previousSnapshot.data() : {};
            const previousUnlocks = {
                ships: (previousData as any)?.unlocks?.ships || {},
                avatars: (previousData as any)?.unlocks?.avatars || {},
            } as { ships: Record<string, number>; avatars: Record<string, number> };
            const previousConfiguredAt = {
                ships: (previousData as any)?.unlockConfiguredAt?.ships || {},
                avatars: (previousData as any)?.unlockConfiguredAt?.avatars || {},
            } as { ships: Record<string, number>; avatars: Record<string, number> };
            const now = Date.now();

            const avatarUnlocks: Record<string, number> = {};
            const avatarConfiguredAt: Record<string, number> = {};
            Object.entries(planet.unlocks?.avatars || {}).forEach(([key, value]) => {
                const threshold = toIntMin(value, 1);
                if (threshold > 0) {
                    avatarUnlocks[key] = threshold;
                    const previousThreshold = toIntMin(previousUnlocks.avatars?.[key], 0);
                    const previousTimestamp = Math.floor(Number(previousConfiguredAt.avatars?.[key] || 0));
                    avatarConfiguredAt[key] = previousThreshold === threshold && previousTimestamp > 0 ? previousTimestamp : now;
                }
            });
            const shipUnlocks: Record<string, number> = {};
            const shipConfiguredAt: Record<string, number> = {};
            Object.entries(planet.unlocks?.ships || {}).forEach(([key, value]) => {
                const threshold = toIntMin(value, 1);
                if (threshold > 0) {
                    shipUnlocks[key] = threshold;
                    const previousThreshold = toIntMin(previousUnlocks.ships?.[key], 0);
                    const previousTimestamp = Math.floor(Number(previousConfiguredAt.ships?.[key] || 0));
                    shipConfiguredAt[key] = previousThreshold === threshold && previousTimestamp > 0 ? previousTimestamp : now;
                }
            });
            const unlocksToSave = { ships: shipUnlocks, avatars: avatarUnlocks };
            const unlockConfiguredAtToSave = { ships: shipConfiguredAt, avatars: avatarConfiguredAt };

            // Save to subcollection
            await setDoc(planetRef, {
                id: planet.id,
                xpGoal: toIntMin(planet.xpGoal, 1),
                currentXP: toIntMin(planet.currentXP, 0),
                rewardName: String(planet.rewardName || ""),
                rewardDescription: String(planet.rewardDescription || ""),
                unlocks: unlocksToSave,
                unlockConfiguredAt: unlockConfiguredAtToSave,
                teacherId: user.uid
            }, { merge: true });

            setSaveStatusByPlanet((prev) => ({
                ...prev,
                [planet.id]: { type: "success", message: "Saved." },
            }));
        } catch (e) {
            console.error("Error saving planet:", e);
            const message = e instanceof Error ? e.message : "Save failed.";
            setSaveStatusByPlanet((prev) => ({
                ...prev,
                [planet.id]: { type: "error", message },
            }));
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Planetary Systems</h1>
                            <p className="text-cyan-600 text-sm mt-1">Manage colony goals and rewards</p>
                        </div>
                    </div>
                 </div>

                 {loading ? (
                     <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {planets.map(planet => (
                             <div key={planet.id} className="bg-black/40 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden group">
                                 {/* Decorative Color Glow */}
                                 <div className={`absolute top-0 right-0 w-32 h-32 ${planet.color.replace('bg-', 'bg-').replace('text-', '')} opacity-10 rounded-bl-full pointer-events-none`} />
                                 
                                 <div className="flex items-center gap-4 mb-6">
                                     <div className="w-16 h-16 flex items-center justify-center relative">
                                        <div className={`absolute inset-0 ${planet.color} blur-xl opacity-30 rounded-full`} />
                                        <img 
                                            src={getAssetPath(`/images/planetpng/${planet.id}.png`)}
                                            alt={planet.name}
                                            className="w-full h-full object-contain relative z-10 drop-shadow-md"
                                        />
                                     </div>
                                     <div>
                                         <h3 className="text-xl font-bold text-white uppercase tracking-wider">{planet.name}</h3>
                                         <div className="text-xs text-cyan-600 uppercase">Sector {planet.id}</div>
                                     </div>
                                 </div>

                                 {/* Stats */}
                                 <div className="mb-6 p-4 bg-cyan-950/20 rounded-lg border border-cyan-900/30">
                                     <div className="flex justify-between items-end mb-2">
                                         <label className="text-xs text-cyan-500 uppercase font-bold flex items-center gap-2">
                                             <Database size={14} /> Colony Progress
                                         </label>
                                         <span className="text-white font-mono font-bold">{planet.currentXP} / {planet.xpGoal} XP</span>
                                     </div>
                                     <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10">
                                         <div 
                                            className="h-full bg-cyan-500 transition-all duration-1000"
                                            style={{ width: `${Math.min((planet.currentXP / planet.xpGoal) * 100, 100)}%` }} 
                                         />
                                     </div>
                                 </div>

                                 {/* Edit Form */}
                                 <div className="space-y-4">
                                     <div>
                                         <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-1">XP Goal</label>
                                         <input 
                                            type="number"
                                            value={planet.xpGoal}
                                                          min={1}
                                                          step={1}
                                                          title="XP goal"
                                                          aria-label={`XP goal for ${planet.name}`}
                                                          onChange={(e) => handleNumberChange(planet.id, "xpGoal", e.target.value, 1)}
                                                          className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                         />
                                     </div>

                                                 <div>
                                                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-1">Current XP</label>
                                                      <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                value={planet.currentXP}
                                                                min={0}
                                                                step={1}
                                                                title="Current XP"
                                                                aria-label={`Current XP for ${planet.name}`}
                                                                onChange={(e) => handleNumberChange(planet.id, "currentXP", e.target.value, 0)}
                                                                className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleChange(planet.id, "currentXP", 0)}
                                                                className="px-3 bg-black/50 border border-cyan-800 rounded text-cyan-300 hover:border-cyan-500 hover:text-cyan-200 transition-colors"
                                                                aria-label={`Reset ${planet.name} current XP`}
                                                                title="Reset current XP"
                                                            >
                                                                <RotateCcw size={14} />
                                                            </button>
                                                      </div>
                                                 </div>
                                     
                                     <div className="border-t border-cyan-900/30 pt-4 mt-4">
                                         <label className="block text-xs uppercase tracking-wider text-yellow-500 mb-2 flex items-center gap-2">
                                             <Gift size={14} /> Completion Reward
                                         </label>
                                         <input 
                                            type="text"
                                            placeholder="Reward Title (e.g. Pizza Party)"
                                            value={planet.rewardName}
                                            onChange={(e) => handleChange(planet.id, 'rewardName', e.target.value)}
                                            className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm mb-2 focus:border-yellow-500/50 outline-none transition-colors"
                                         />
                                         <textarea 
                                            placeholder="Description or details..."
                                            value={planet.rewardDescription}
                                            onChange={(e) => handleChange(planet.id, 'rewardDescription', e.target.value)}
                                            className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-xs h-20 resize-none focus:border-yellow-500/50 outline-none transition-colors"
                                         />
                                     </div>

                                     <div className="border-t border-cyan-900/30 pt-4">
                                         <label className="block text-xs uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-2">
                                             <Star size={14} /> Cosmetic Unlocks
                                         </label>
                                         {(() => {
                                                          const normalizedPlanetId = normalizePlanetId(planet.id);
                                                          const avatarRules = AVATAR_UNLOCK_RULES.filter((rule) => normalizePlanetId(rule.planetId) === normalizedPlanetId);
                                                          const shipRules = SHIP_UNLOCK_RULES.filter((rule) => normalizePlanetId(rule.planetId) === normalizedPlanetId);
                                            const hasUnlocks = avatarRules.length > 0 || shipRules.length > 0;

                                            if (!hasUnlocks) {
                                                return <p className="text-[10px] text-gray-500">No cosmetic unlock configured for this planet yet.</p>;
                                            }

                                            return (
                                                <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                                                    <div className="space-y-3">
                                                        {avatarRules.map((rule) => {
                                                            const runtimeAvatarId = resolveRuntimeUnlockId(rule.id, unlockConfig.idAliases, avatarCatalogIds);
                                                            return (
                                                                <div key={`avatar-${rule.unlockKey}`} className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden">
                                                                        <UserAvatar avatarId={runtimeAvatarId} hat="none" className="w-full h-full" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs text-white font-bold">{rule.name}</div>
                                                                        <div className="text-[10px] text-gray-500 uppercase">+XP needed from now on {planet.name}</div>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={planet.unlocks?.avatars?.[rule.unlockKey] ?? ""}
                                                                        onChange={(e) => handleAvatarUnlockChange(planet.id, rule.unlockKey, e.target.value)}
                                                                        min={1}
                                                                        step={1}
                                                                        title="Avatar unlock XP threshold"
                                                                        aria-label={`${rule.name} avatar unlock XP`}
                                                                        className="w-24 bg-black/50 border border-cyan-900/60 rounded p-2 text-white text-xs focus:border-cyan-400 outline-none transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                            );
                                                        })}

                                                        {shipRules.map((rule) => {
                                                            const runtimeShipId = resolveRuntimeUnlockId(rule.id, unlockConfig.idAliases, shipCatalogIds);
                                                            return (
                                                                <div key={`ship-${rule.unlockKey}`} className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center">
                                                                        <img src={getAssetPath(resolveShipAssetPath(runtimeShipId))} alt={rule.name} className="w-10 h-10 object-contain" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs text-white font-bold">{rule.name}</div>
                                                                        <div className="text-[10px] text-gray-500 uppercase">+XP needed from now on {planet.name}</div>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={planet.unlocks?.ships?.[rule.unlockKey] ?? ""}
                                                                        onChange={(e) => handleShipUnlockChange(planet.id, rule.unlockKey, e.target.value)}
                                                                        min={1}
                                                                        step={1}
                                                                        title="Ship unlock XP threshold"
                                                                        aria-label={`${rule.name} ship unlock XP`}
                                                                        className="w-24 bg-black/50 border border-cyan-900/60 rounded p-2 text-white text-xs focus:border-cyan-400 outline-none transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="1"
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                         })()}
                                     </div>

                                     <button 
                                                     type="button"
                                        onClick={() => handleSave(planet)}
                                        disabled={saving === planet.id}
                                        className="w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700 hover:border-cyan-500 text-cyan-300 rounded uppercase text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all mt-2"
                                     >
                                        {saving === planet.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Configuration
                                     </button>
                                                 {saveStatusByPlanet[planet.id] ? (
                                                     <p className={`mt-2 text-[11px] ${saveStatusByPlanet[planet.id].type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                                                          {saveStatusByPlanet[planet.id].message}
                                                     </p>
                                                 ) : null}
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        </div>
    );
}
