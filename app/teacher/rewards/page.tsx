"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, increment, runTransaction, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";
import { UserData, Rank } from "@/types";
import { UserAvatar } from '@/components/UserAvatar';
import { Star, X, Zap, Award, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Behavior {
    id: string;
    label: string;
    xp: number; // Can be negative
    color: string;
}

export default function RewardsPage() {
    const [students, setStudents] = useState<UserData[]>([]);
    const [behaviors, setBehaviors] = useState<Behavior[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    
    // UI State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAwarding, setIsAwarding] = useState(false);
    const [isOneTapMode, setIsOneTapMode] = useState(false);
    const [oneTapBehaviorId, setOneTapBehaviorId] = useState<string | null>(null);
    
    const [creditsPerAward, setCreditsPerAward] = useState(1);
    const { user } = useAuth();
    const { activeTeacherId } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;

    // Helper for Multi-Select
    const toggleSelection = (uid: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(uid)) {
            newSet.delete(uid);
        } else {
            newSet.add(uid);
        }
        setSelectedIds(newSet);
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setIsAwarding(false);
    };
    
    const selectAll = () => {
        if (selectedIds.size === students.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map(s => s.uid)));
        }
    };
    
    useEffect(() => {
        if (!teacherScopeId || !user) return;

        // 1. Fetch Students
        const qStudents = query(
            collection(db, "users"), 
            where("role", "==", "student"), 
            where("status", "==", "active"),
            where("teacherId", "==", teacherScopeId)
        );
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
            setStudents(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
        });

        // 2. Fetch Behaviors (Subcollection)
        if (!teacherScopeId) return;
        
        const qBehaviors = query(
            collection(db, `users/${teacherScopeId}/behaviors`)
        );
        const unsubBehaviors = onSnapshot(qBehaviors, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Behavior));
            items.sort((a, b) => b.xp - a.xp); // Client-side sort
            setBehaviors(items);
        });

        // 3. Fetch Ranks
        const unsubRanks = onSnapshot(doc(db, `users/${teacherScopeId}/settings`, "ranks"), async (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            } else {
                const g = await getDoc(doc(db, "game-config", "ranks"));
                if (g && g.exists() && g.data().list) setRanks(g.data().list);
            }
        });

        const economyRef = doc(db, `users/${teacherScopeId}/settings`, "economy");
        const unsubEconomy = onSnapshot(economyRef, async (snapshot) => {
            if (!snapshot.exists()) {
                await setDoc(economyRef, { creditsPerAward: 1, teacherId: teacherScopeId, updatedAt: serverTimestamp() }, { merge: true });
                setCreditsPerAward(1);
                return;
            }

            const value = Number((snapshot.data() as any)?.creditsPerAward || 1);
            setCreditsPerAward(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 1);
        });

        return () => {
            unsubStudents();
            unsubBehaviors();
            unsubRanks();
            unsubEconomy();
        };
    }, [teacherScopeId, user]);

    useEffect(() => {
        if (behaviors.length === 0) {
            setOneTapBehaviorId(null);
            return;
        }
        if (!oneTapBehaviorId || !behaviors.some((b) => b.id === oneTapBehaviorId)) {
            setOneTapBehaviorId(behaviors[0].id);
        }
    }, [behaviors, oneTapBehaviorId]);

    const oneTapBehavior = behaviors.find((b) => b.id === oneTapBehaviorId) || null;

    const awardStudents = async (behavior: Behavior, targetIds: string[], clearAfter = false) => {
        if (targetIds.length === 0 || !user || !teacherScopeId) return;
        
        // Ensure atomic number handling
        const xpAmount = Number(behavior.xp);
        const awardedStudents = targetIds.length;
        const totalAwardedPoints = xpAmount * awardedStudents;
        const creditsAwardValue = Math.max(0, Math.round(Number(creditsPerAward) || 0));

        try {
            // Process all selected students
            const promises = targetIds.map(async (uid) => {
                const studentRef = doc(db, "users", uid);
                
                // ATOMIC TRANSACTION: User + Planet
                await runTransaction(db, async (transaction) => {
                     // 1. Read Student Data
                     const sfDoc = await transaction.get(studentRef);
                     if (!sfDoc.exists()) throw "Student document not found";
                     const data = sfDoc.data();
                     const awardTimestamp = Date.now();
                     const dayKey = new Date(awardTimestamp).toISOString().slice(0, 10);
                     const positiveDelta = Math.max(0, xpAmount);
                     const negativeDelta = Math.max(0, Math.abs(Math.min(0, xpAmount)));
                     
                     // 2. Calculate User Updates (Fuel Logic)
                     const fuelLevel = data.upgrades?.fuel || 0;
                     const maxFuel = 500 + (fuelLevel * 250);
                     const currentFuel = data.fuel !== undefined ? data.fuel : 500;
                     
                     let newFuel = currentFuel + xpAmount;
                     if (newFuel > maxFuel) newFuel = maxFuel;
                     if (newFuel < 0) newFuel = 0;

                     if (xpAmount > 0) {
                         const classBonusRef = doc(db, `users/${data.teacherId || user.uid}/settings`, "classBonus");
                         transaction.set(classBonusRef, {
                             current: increment(xpAmount)
                         }, { merge: true });
                     }

                            // 3. Queue User Update
                            const userUpdates: Record<string, any> = {
                                xp: increment(xpAmount),
                                fuel: newFuel,
                                lastAward: {
                                    reason: behavior.label,
                                    xpGained: xpAmount,
                                    timestamp: awardTimestamp,
                                },
                                lastXpReason: behavior.label,
                                [`xpDaily.${dayKey}.net`]: increment(xpAmount),
                                ...(positiveDelta > 0 ? { [`xpDaily.${dayKey}.positive`]: increment(positiveDelta) } : {}),
                                ...(negativeDelta > 0 ? { [`xpDaily.${dayKey}.negative`]: increment(negativeDelta) } : {}),
                            };

                     if (xpAmount > 0 && creditsAwardValue > 0) {
                         userUpdates.galacticCredits = increment(creditsAwardValue);
                     }

                     // 4. Queue Planet Update (Atomic)
                     const rawLocation = data.location;
                     const isTraveling = data.travelStatus === 'traveling';
                     
                     if (rawLocation && xpAmount > 0 && !isTraveling) {
                         const planetId = rawLocation.toLowerCase();

                         // Track per-student planet XP for unlocks
                         userUpdates[`planetXP.${planetId}`] = increment(xpAmount);

                         // Use subcollection for Planet Progress
                         const planetRef = doc(db, `users/${teacherScopeId}/planets`, planetId);
                         
                         // Use set with merge to ensure doc exists and update safely
                         transaction.set(planetRef, { 
                             currentXP: increment(xpAmount),
                             id: planetId,
                             teacherId: teacherScopeId
                         }, { merge: true });
                     }

                     const xpEventRef = doc(collection(db, "xpEvents"));
                     transaction.set(xpEventRef, {
                         teacherId: teacherScopeId,
                         studentId: uid,
                         gradeLevel: data.gradeLevel || null,
                         xpDelta: xpAmount,
                         reason: behavior.label,
                         source: "teacher_rewards",
                         timestamp: awardTimestamp,
                     });

                     transaction.update(studentRef, userUpdates);
                });
            });

            await Promise.all(promises);

                        // Update public live-demo stats (non-sensitive aggregate only)
                        if (totalAwardedPoints > 0) {
                            await setDoc(
                                doc(db, "public-stats", "landing"),
                                {
                                    focusPointsAwarded: increment(totalAwardedPoints),
                                    awardEvents: increment(1),
                                    studentsAwarded: increment(awardedStudents),
                                    updatedAt: serverTimestamp(),
                                },
                                { merge: true }
                            );
                        }

            console.log(`SUCCESS: Awarded ${xpAmount} XP to ${targetIds.length} students.`);
            if (clearAfter) {
                setIsAwarding(false);
                setSelectedIds(new Set());
            }
            
        } catch (error) {
            console.error("Error awarding XP:", error);
            alert(`Award Transaction Failed!\n\n${error}`);
        }
    };

    const handleAward = async (behavior: Behavior) => {
        if (selectedIds.size === 0) return;
        await awardStudents(behavior, Array.from(selectedIds), true);
    };

    const handleCadetTap = async (uid: string) => {
        if (isOneTapMode) {
            if (!oneTapBehavior) {
                alert("Choose a protocol first for One Tap Mode.");
                return;
            }
            await awardStudents(oneTapBehavior, [uid], false);
            return;
        }

        toggleSelection(uid);
    };

    const handleSaveCreditsPerAward = async () => {
        if (!teacherScopeId) return;
        const normalized = Math.max(0, Math.round(Number(creditsPerAward) || 0));
        try {
            await setDoc(
                doc(db, `users/${teacherScopeId}/settings`, "economy"),
                {
                    creditsPerAward: normalized,
                    teacherId: teacherScopeId,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            setCreditsPerAward(normalized);
        } catch (error) {
            console.error("Failed to save economy settings:", error);
            alert("Could not save credits settings.");
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-2 md:p-4 font-mono text-cyan-400">
            <div className="max-w-7xl mx-auto min-h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] flex flex-col">
                
                {/* Header */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                             <X size={20} />
                        </Link>
                        <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white">Rewards Command</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 border border-cyan-800 rounded px-2 py-1 bg-black/30 w-full sm:w-auto">
                            <label htmlFor="credits-per-award" className="text-[10px] uppercase tracking-wider text-cyan-500">Credits / Award</label>
                            <input
                                id="credits-per-award"
                                type="number"
                                min={0}
                                value={creditsPerAward}
                                onChange={(e) => setCreditsPerAward(Math.max(0, Number(e.target.value) || 0))}
                                title="Credits awarded per positive XP action"
                                className="w-16 bg-black/50 border border-cyan-800 rounded px-2 py-1 text-white text-xs focus:border-cyan-400 outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleSaveCreditsPerAward}
                                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-cyan-700 text-cyan-300 hover:border-cyan-500"
                            >
                                Save
                            </button>
                        </div>
                         <button 
                            onClick={() => {
                                setIsOneTapMode((prev) => !prev);
                                setIsAwarding(false);
                                setSelectedIds(new Set());
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded border transition-colors ${isOneTapMode ? 'bg-emerald-900/40 border-emerald-400 text-white' : 'border-emerald-800 text-emerald-500 hover:border-emerald-500'}`}
                        >
                            <Star size={16} className={isOneTapMode ? 'fill-emerald-300 text-emerald-300' : ''} />
                            {isOneTapMode ? 'ONE TAP ON' : 'ONE TAP OFF'}
                        </button>
                        <Link
                            href="/teacher/protocols"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded border border-cyan-800 text-cyan-500 hover:border-cyan-500 transition-colors"
                        >
                            <Zap size={16} />
                            PROTOCOLS
                        </Link>
                    </div>
                 </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0 overflow-hidden relative">
                    {/* RIGHT: Cadet Grid */}
                    <div className="flex-1 bg-black/20 rounded-2xl p-2 md:p-4 overflow-hidden flex flex-col border border-white/5 relative">
                        {isOneTapMode && (
                            <div className="mb-3 p-2 md:p-3 rounded-xl border border-emerald-500/30 bg-emerald-900/20 shrink-0">
                                <div className="text-[10px] md:text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">One Tap Protocol</div>
                                <div className="flex flex-wrap gap-2">
                                    {behaviors.map((b) => (
                                        <button
                                            key={b.id}
                                            onClick={() => setOneTapBehaviorId(b.id)}
                                            className={`px-3 py-2 text-xs font-bold rounded border transition-colors ${oneTapBehaviorId === b.id ? 'bg-emerald-500/30 border-emerald-300 text-white' : 'bg-black/30 border-emerald-800 text-emerald-400 hover:border-emerald-500'}`}
                                        >
                                            {b.label} ({b.xp > 0 ? '+' : ''}{b.xp})
                                        </button>
                                    ))}
                                </div>
                                {behaviors.length === 0 && (
                                    <p className="text-xs text-emerald-500/80 mt-2">Add at least one protocol to use One Tap Mode.</p>
                                )}
                            </div>
                        )}
                         <div className="mb-4 flex items-center justify-between shrink-0 px-2">
                            <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Award className="text-cyan-400" size={20} />
                                <span className="hidden md:inline">Active Fleet</span>
                                <span className="md:hidden">Fleet</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={selectAll}
                                    className="text-xs font-bold text-cyan-400 bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-800 px-3 py-1.5 rounded uppercase tracking-wider transition-colors"
                                >
                                    {selectedIds.size === students.length && students.length > 0 ? 'Deselect All' : 'Select All'}
                                </button>
                                <div className="text-xs text-cyan-600 font-bold bg-cyan-950/50 px-3 py-1 rounded-full">{students.length} Cadets</div>
                            </div>
                         </div>

                         {students.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-cyan-800">
                                <div>
                                    <p className="mb-2">No active signals detected.</p>
                                    <p className="text-sm">Approve cadets in the Roster to see them here.</p>
                                </div>
                            </div>
                         ) : (
                             <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar pb-24">
                                {/* Density adjustments for mobile: grid-cols-4, smaller gap */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4 auto-rows-fr">
                                    {students.map(student => {
                                        const rank = ranks.slice().sort((a,b) => b.minXP - a.minXP).find(r => (student.xp || 0) >= r.minXP);
                                        const isSelected = selectedIds.has(student.uid);
                                        return (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            key={student.uid}
                                            onClick={() => handleCadetTap(student.uid)}
                                            className={`
                                                relative w-full min-h-[92px] md:min-h-[136px] flex flex-col p-2 md:p-3 rounded-md md:rounded-2xl border transition-all cursor-pointer group overflow-hidden
                                                ${isSelected 
                                                    ? 'bg-cyan-900/60 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                                                    : 'bg-black/40 border-cyan-900/50 hover:bg-cyan-900/40 hover:border-cyan-400'}
                                                ${isOneTapMode ? 'ring-1 ring-emerald-500/30 hover:ring-emerald-400/60' : ''}
                                            `}
                                        >
                                            {/* CHECKMARK for Selection */}
                                                <div className={`absolute top-1 left-1 md:top-2 md:left-2 z-20 w-3.5 h-3.5 md:w-6 md:h-6 rounded-full border md:border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500 scale-100' : 'border-white/20 scale-75 opacity-50'}`}>
                                                    {isSelected && <Check size={10} className="text-black stroke-[4] block md:hidden" />}
                                                 {isSelected && <Check size={14} className="text-black stroke-[4] hidden md:block" />}
                                            </div>

                                            {/* (Desktop Only) Corner Accents */}
                                            <div className="hidden md:block absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/5 rounded-tl-xl group-hover:border-cyan-400/50 transition-colors" />
                                            <div className="hidden md:block absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/5 rounded-br-xl group-hover:border-cyan-400/50 transition-colors" />

                                            {/* (Desktop Only) Rank Badge */}
                                            <div className="hidden md:flex absolute top-3 left-10 items-center gap-1 text-[10px] uppercase font-bold text-cyan-700 group-hover:text-cyan-400">
                                                {rank?.name || 'Cadet'}
                                            </div>

                                            {/* (Desktop Only) XP Counter */}
                                            <div className="hidden md:block absolute top-3 right-3 text-xs font-mono font-bold text-cyan-600 group-hover:text-cyan-300">
                                                {student.xp || 0} XP
                                            </div>

                                            {/* Content Container */}
                                            <div className="flex-1 flex flex-col items-center md:items-start justify-center w-full z-10 gap-1 md:gap-2">
                                                <div className="text-center md:text-left w-full flex flex-col justify-center">
                                                    <h3 className="text-white font-bold text-[11px] sm:text-xs md:text-base leading-tight w-full px-0.5 break-words md:truncate">
                                                        {student.displayName || 'Cadet'}
                                                    </h3>
                                                    <p className="text-cyan-600 text-[10px] md:text-xs uppercase tracking-wider font-bold truncate">
                                                        {rank?.name || 'Space Cadet'} • {student.xp || 0} XP
                                                    </p>
                                                    {isOneTapMode && oneTapBehavior && (
                                                        <p className="text-[9px] md:text-[10px] text-emerald-300 font-bold uppercase tracking-wide mt-0.5 md:mt-1">
                                                            Tap: {oneTapBehavior.xp > 0 ? '+' : ''}{oneTapBehavior.xp}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    )})}
                                </div>
                             </div>
                         )}
                         
                         {/* FLOATING ACTION BAR FOR SELECTION */}
                         <AnimatePresence>
                             {selectedIds.size > 0 && !isOneTapMode && (
                                 <motion.div 
                                    initial={{ y: 200 }}
                                    animate={{ y: 0 }}
                                    exit={{ y: 200 }}
                                    className="fixed bottom-4 left-4 right-4 md:absolute md:bottom-4 md:left-4 md:right-4 bg-cyan-900/90 backdrop-blur-md border border-cyan-500/50 p-4 rounded-xl flex items-center justify-between shadow-2xl z-50 md:z-40"
                                 >
                                     <div className="flex items-center gap-4">
                                         <div className="hidden md:flex -space-x-2">
                                             {Array.from(selectedIds).slice(0, 3).map(uid => {
                                                 const s = students.find(st => st.uid === uid);
                                                 return (
                                                     <div key={uid} className="w-8 h-8 rounded-full bg-black border border-cyan-500 overflow-hidden">
                                                         {s && <UserAvatar userData={s} className="w-full h-full" />}
                                                     </div>
                                                 );
                                             })}
                                             {selectedIds.size > 3 && (
                                                 <div className="w-8 h-8 rounded-full bg-cyan-800 border border-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                     +{selectedIds.size - 3}
                                                 </div>
                                             )}
                                         </div>
                                         <div className="text-white font-bold">
                                             {selectedIds.size} Cadet{selectedIds.size !== 1 ? 's' : ''} Selected
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <button onClick={clearSelection} className="px-4 py-2 text-cyan-300 hover:text-white text-sm font-bold uppercase">Cancel</button>
                                         <button 
                                            onClick={() => setIsAwarding(true)}
                                            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2"
                                         >
                                             <Star size={18} className="fill-black" />
                                             Award XP
                                         </button>
                                     </div>
                                 </motion.div>
                             )}
                         </AnimatePresence>
                    </div>
                </div>

                {/* AWARD MODAL */}
                <AnimatePresence>
                    {isAwarding && !isOneTapMode && (
                        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div 
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                className="bg-space-950 border border-cyan-500/30 rounded-t-2xl md:rounded-2xl w-full max-w-sm md:max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
                            >
                                <button 
                                    onClick={() => setIsAwarding(false)}
                                    title="Close award modal"
                                    aria-label="Close award modal"
                                    className="absolute top-4 right-4 text-cyan-700 hover:text-white bg-black/50 p-2 rounded-full z-20"
                                >
                                    <X size={24} />
                                </button>

                                <div className="p-6 text-center border-b border-cyan-900/50 bg-black/20 shrink-0">
                                    <div className="flex justify-center -space-x-4 mb-4">
                                        {Array.from(selectedIds).slice(0, 5).map(uid => {
                                            const s = students.find(st => st.uid === uid);
                                            return (
                                                <div key={uid} className="w-12 h-12 rounded-full bg-black border-2 border-cyan-900 overflow-hidden relative ring-2 ring-black">
                                                    {s && <UserAvatar userData={s} className="w-full h-full" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        Awarding {selectedIds.size} Cadet{selectedIds.size !== 1 ? 's' : ''}
                                    </h2>
                                    <p className="text-cyan-600 text-xs uppercase font-bold tracking-widest mb-0">Select protocol to transmit</p>
                                </div>

                                <div className="p-4 overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar bg-black/60">
                                    <p className="text-cyan-400 text-xs uppercase tracking-widest font-bold text-center mb-2 opacity-50">Select Protocol</p>
                                    {behaviors.length === 0 && (
                                        <div className="text-center p-8 text-gray-500">
                                            <p>No protocols defined.</p>
                                            <Link href="/teacher/protocols" className="text-xs text-cyan-400 hover:text-cyan-300 underline">
                                                Open Protocol Editor
                                            </Link>
                                        </div>
                                    )}
                                    {behaviors.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => handleAward(b)}
                                            className={`
                                                flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] group
                                                ${b.xp > 0 
                                                    ? 'bg-gradient-to-r from-green-900/10 to-transparent border-green-500/20 hover:border-green-400 hover:bg-green-900/20' 
                                                    : 'bg-gradient-to-r from-red-900/10 to-transparent border-red-500/20 hover:border-red-400 hover:bg-red-900/20'}
                                            `}
                                        >
                                            <span className="font-bold text-white group-hover:tracking-wider transition-all">{b.label}</span>
                                            <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${b.xp > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} `}>
                                                {b.xp > 0 ? '+' : ''}{b.xp} XP
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                
            </div>
        </div>
    );
}
// Force Update
