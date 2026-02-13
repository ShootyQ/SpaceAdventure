"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Globe, Gift, Database, Star } from "lucide-react";
import { PLANETS } from "@/types"; // Using types instead of redeclaring
import { UserAvatar } from "@/components/UserAvatar";

// Interface for dynamic data stored in DB
interface PlanetData {
    id: string;
    xpGoal: number;
    currentXP: number;
    rewardName: string;
    rewardDescription: string;
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

export default function PlanetManagementPage() {
    const { user } = useAuth();
    const [planets, setPlanets] = useState<PlanetState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Initial Load & Subscription
    useEffect(() => {
        if (!user) return;
        // Use subcollection
        const q = collection(db, `users/${user.uid}/planets`);
        
        const unsub = onSnapshot(q, (snapshot) => {
             const dynamicMap = new Map<string, PlanetData>();
             snapshot.forEach(d => {
                 const data = d.data() as PlanetData;
                 // Ensure ID is set (if not in data, use doc ID)
                 dynamicMap.set(d.id, { ...data, id: d.id });
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

    const handleJoviUnlockChange = (planetId: string, value: string) => {
        const numeric = Number(value);
        setPlanets(prev => prev.map(p => {
            if (p.id !== planetId) return p;
            const unlocks = {
                ships: { ...(p.unlocks?.ships || {}) },
                avatars: { ...(p.unlocks?.avatars || {}) },
            };
            unlocks.avatars.jovi = Number.isFinite(numeric) ? numeric : 0;
            return { ...p, unlocks };
        }));
    };

    const handleSave = async (planet: PlanetState) => {
        if (!user) return;
        setSaving(planet.id);
        try {
            const isJupiter = planet.id === "jupiter";
            const joviXP = Number(planet.unlocks?.avatars?.jovi || 0);
            const unlocksToSave = isJupiter && joviXP > 0
                ? { ships: {}, avatars: { jovi: joviXP } }
                : { ships: {}, avatars: {} };

            // Save to subcollection
            await setDoc(doc(db, `users/${user.uid}/planets`, planet.id), {
                id: planet.id,
                xpGoal: Number(planet.xpGoal),
                rewardName: planet.rewardName,
                rewardDescription: planet.rewardDescription,
                unlocks: unlocksToSave,
                teacherId: user.uid
            }, { merge: true });
            setSaving(null);
        } catch (e) {
            console.error("Error saving planet:", e);
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
                                            onChange={(e) => handleChange(planet.id, 'xpGoal', e.target.value)}
                                            className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none transition-colors"
                                         />
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
                                         {planet.id === "jupiter" ? (
                                            <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden">
                                                        <UserAvatar avatarId="jovi" hat="none" className="w-full h-full" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs text-white font-bold">Jovi Avatar</div>
                                                        <div className="text-[10px] text-gray-500 uppercase">Unlock XP on Jupiter</div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={planet.unlocks?.avatars?.jovi ?? ""}
                                                        onChange={(e) => handleJoviUnlockChange(planet.id, e.target.value)}
                                                        className="w-24 bg-black/50 border border-cyan-900/60 rounded p-2 text-white text-xs focus:border-cyan-400 outline-none transition-colors text-center"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                         ) : (
                                            <p className="text-[10px] text-gray-500">No cosmetic unlock configured for this planet yet.</p>
                                         )}
                                     </div>

                                     <button 
                                        onClick={() => handleSave(planet)}
                                        disabled={saving === planet.id}
                                        className="w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700 hover:border-cyan-500 text-cyan-300 rounded uppercase text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all mt-2"
                                     >
                                        {saving === planet.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Configuration
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        </div>
    );
}
