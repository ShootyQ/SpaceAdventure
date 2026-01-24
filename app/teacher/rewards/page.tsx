"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, deleteDoc, orderBy, runTransaction, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getAssetPath } from "@/lib/utils";
import { UserData, Rank } from "@/types";
import { Star, Plus, Trash2, Save, X, Zap, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Custom Rocket Icon
const Rocket = ({ size = 24, className = "" }: { size?: number, className?: string }) => {
    return (
        <img 
            src={getAssetPath("/images/ships/finalship.png")}
            alt="Rocket"
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

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
    const [selectedStudent, setSelectedStudent] = useState<UserData | null>(null);
    const [isManagingProtocols, setIsManagingProtocols] = useState(false);
    
    // Forms
    const [newLabel, setNewLabel] = useState("");
    const [newXp, setNewXp] = useState(50);

    useEffect(() => {
        // 1. Fetch Students
        const qStudents = query(collection(db, "users"), where("role", "==", "student"), where("status", "==", "active"));
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
            setStudents(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
        });

        // 2. Fetch Behaviors
        const qBehaviors = query(collection(db, "behaviors"), orderBy("xp", "desc"));
        const unsubBehaviors = onSnapshot(qBehaviors, (snapshot) => {
            setBehaviors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Behavior)));
        });

        // 3. Fetch Ranks
        const unsubRanks = onSnapshot(doc(db, "game-config", "ranks"), (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            }
        });

        return () => {
            unsubStudents();
            unsubBehaviors();
            unsubRanks();
        };
    }, []);

    const handleAward = async (behavior: Behavior) => {
        if (!selectedStudent) return;

        // Play notification sound immediately (User Interaction)
        const audioElement = document.getElementById('notification-audio') as HTMLAudioElement;
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.volume = 0.5;
            audioElement.play().catch(e => console.error("Audio playback failed:", e));
        }

        try {
            const studentRef = doc(db, "users", selectedStudent.uid);
            
            // Transaction to handle Fuel Cap logic
            let studentData: any; // Store for post-transaction use

            await runTransaction(db, async (transaction) => {
                 const sfDoc = await transaction.get(studentRef);
                 if (!sfDoc.exists()) throw "Student document not found";
                 const data = sfDoc.data();
                 studentData = data; // Export for Planet Logic
                 
                 // Calc New Fuel
                 // Cap = 500 + (UpgradeLevel * 250)
                 const fuelLevel = data.upgrades?.fuel || 0;
                 const maxFuel = 500 + (fuelLevel * 250);
                 // Default to 500 if undefined (Migration logic)
                 const currentFuel = data.fuel !== undefined ? data.fuel : 500;
                 
                 // Calc New Fuel
                 // If XP is positive, add to fuel (capped). If negative (punishment), deduct?
                 // User said "XP fills fuel gauge". Usually punishment doesn't drain fuel, but logic implies xp/fuel parity.
                 let newFuel = currentFuel + behavior.xp;
                 
                 // Clamp
                 if (newFuel > maxFuel) newFuel = maxFuel;
                 // Don't let it go below 0? Maybe punishments don't drain fuel?
                 // "takes 1xp of fuel per 5 mins" -> usage.
                 // "fills their fuel gauge" -> XP gain.
                 // Punishments (negative XP) usually mean behavior correction. Draining fuel seems harsh but consistent.
                 // I'll ensure min 0.
                 if (newFuel < 0) newFuel = 0;

                 transaction.update(studentRef, {
                    xp: increment(behavior.xp),
                    fuel: newFuel,
                    lastXpReason: behavior.label
                 });

                 // PLANET CONTRIBUTION LOGIC
                 // If student is at a planet (and not 'earth' maybe? Or yes earth?), add to planet XP.
                 // We need to know if the locationId corresponds to a planet document.
                 // We will blindly increment if the locationId is valid.
                 // Note: 'earth' might not have a document yet if teacher hasn't visited the page, 
                 // but setDoc with merge in the management page handles initialization.
                 // Here we use update(), which fails if doc doesn't exist.
                 // So we should check or use set w/ merge. But we are in a transaction reading user only.
                 // We can't easily do a cross-document conditional update if we don't read the planet doc first.
                 // However, we can just fire-and-forget a separate update outside the user transaction 
                 // (since planet XP doesn't need to be perfectly atomic with user XP for this game).
            });

            // Handle Planet XP Contribution (Fire & Forget)
            const locationId = studentData?.location;
            if (locationId && behavior.xp > 0) {
                 console.log(`Attempting to add ${behavior.xp} XP to Planet ${locationId}`);
                 try {
                     const planetRef = doc(db, "planets", locationId);
                     await setDoc(planetRef, { 
                         currentXP: increment(behavior.xp),
                         id: locationId 
                     }, { merge: true });
                     console.log(`SUCCESS: Contributed ${behavior.xp} XP to Sector ${locationId}`);
                 } catch (err) {
                     console.error("FAILED to update planet XP:", err);
                     alert(`Error updating planet XP: ${err}`);
                 }
            } else {
                console.warn("Skipping Planet XP: Invalid Location or Zero XP", { locationId, xp: behavior.xp });
            }

            console.log(`Awarded XP to student`);
            
            setSelectedStudent(null); // Close modal
        } catch (error) {
            console.error("Error awarding XP:", error);
        }
    };

    const handleAddBehavior = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "behaviors"), {
                label: newLabel,
                xp: Number(newXp),
                color: Number(newXp) > 0 ? "bg-green-600" : "bg-red-600"
            });
            setNewLabel("");
            setNewXp(50);
        } catch (error) {
            console.error("Error adding behavior:", error);
            alert("Failed to add protocol. ensure you have permission.");
        }
    };

    const handleDeleteBehavior = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("Remove this behavior?")) return;
        try {
            await deleteDoc(doc(db, "behaviors", id));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="min-h-screen bg-space-950 p-4 font-mono text-cyan-400">
            {/* Hidden Audio Element */}
            <audio id="notification-audio" src={getAssetPath("/sounds/notification.m4a?v=1")} preload="auto" />

            <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
                
                {/* Header */}
                 <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                             <X size={20} />
                        </Link>
                        <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Rewards Command</h1>
                    </div>
                    <div className="flex gap-2">
                         <button
                            onClick={() => {
                                const audio = document.getElementById('notification-audio') as HTMLAudioElement;
                                if(audio) audio.play().then(() => alert("Sound Played")).catch(e => alert("Sound Error: " + e.message));
                            }}
                            className="px-4 py-2 rounded border border-yellow-500/30 text-yellow-500 hover:bg-yellow-900/20 text-xs font-bold uppercase tracking-wider"
                         >
                            Test Audio
                         </button>
                         <button 
                            onClick={() => setIsManagingProtocols(!isManagingProtocols)}
                            className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors `}
                        >
                            <Zap size={16} />
                            {isManagingProtocols ? 'DONE EDITING' : 'MANAGE PROTOCOLS'}
                        </button>
                    </div>
                 </div>

                {/* Main Content Area */}
                {/* Use flex instead of grid for the main layout to avoid column collapsing issues */}
                <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative">
                    
                    {/* LEFT: Manage Protocols (Slide-over or separate panel) */}
                    <AnimatePresence>
                        {isManagingProtocols && (
                             <motion.div 
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="bg-black/40 border-r border-cyan-900/50 p-4 rounded-l-2xl overflow-hidden flex flex-col shrink-0"
                             >
                                <div className="w-full min-w-[280px]">
                                    <h3 className="text-white font-bold mb-4">Edit Protocols</h3>
                                    <form onSubmit={handleAddBehavior} className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30 mb-4 space-y-3 shrink-0">
                                        <div>
                                            <label className="text-xs text-cyan-500 uppercase">Label</label>
                                            <input 
                                                value={newLabel}
                                                onChange={e => setNewLabel(e.target.value)}
                                                className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm"
                                                placeholder="e.g. Leadership"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-cyan-500 uppercase">XP Amount</label>
                                            <input 
                                                type="number"
                                                value={newXp}
                                                onChange={e => setNewXp(Number(e.target.value))}
                                                className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <button className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 rounded text-xs uppercase tracking-wider">
                                            Add Protocol
                                        </button>
                                    </form>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[400px] custom-scrollbar">
                                        {behaviors.map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-3 bg-cyan-900/20 rounded border border-cyan-800/50">
                                                <div>
                                                    <div className="text-white text-sm font-bold">{b.label}</div>
                                                    <div className={`text-xs `}>{b.xp > 0 ? '+' : ''}{b.xp} XP</div>
                                                </div>
                                                <button onClick={(e) => handleDeleteBehavior(b.id, e)} className="text-red-500 hover:text-white"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RIGHT: Cadet Grid */}
                    <div className="flex-1 bg-black/20 rounded-2xl p-4 overflow-hidden flex flex-col">
                         <div className="mb-4 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Active Fleet</h2>
                            <div className="text-xs text-cyan-600">{students.length} Cadets Online</div>
                         </div>

                         {students.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-cyan-800">
                                <div>
                                    <p className="mb-2">No active signals detected.</p>
                                    <p className="text-sm">Approve cadets in the Roster to see them here.</p>
                                </div>
                            </div>
                         ) : (
                             <div className="flex-1 overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr">
                                    {students.map(student => {
                                        const rank = ranks.slice().sort((a,b) => b.minXP - a.minXP).find(r => (student.xp || 0) >= r.minXP);
                                        return (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            key={student.uid}
                                            onClick={() => setSelectedStudent(student)}
                                            className="relative w-full aspect-square flex flex-col p-4 rounded-2xl border-2 border-cyan-900/50 bg-black/40 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all cursor-pointer group overflow-hidden"
                                        >
                                            {/* Corner Accents */}
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/5 rounded-tl-xl group-hover:border-cyan-400/50 transition-colors" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/5 rounded-br-xl group-hover:border-cyan-400/50 transition-colors" />

                                            {/* Rank Badge */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-700 group-hover:text-cyan-400">
                                                {rank?.name || 'Cadet'}
                                            </div>

                                            {/* XP Counter */}
                                            <div className="absolute top-3 right-3 text-xs font-mono font-bold text-cyan-600 group-hover:text-cyan-300">
                                                {student.xp || 0} XP
                                            </div>

                                            {/* Center Content */}
                                            <div className="flex-1 flex flex-col items-center justify-center w-full z-10 space-y-2 mt-4">
                                                <div className={`w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent group-hover:from-cyan-500/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/5 group-hover:border-cyan-400/30 overflow-hidden relative`}>
                                                    <img 
                                                        src={getAssetPath("/images/ships/finalship.png")}
                                                        className="w-full h-full object-contain relative z-20 scale-75"
                                                        alt="Rocket"
                                                    />
                                                    <div className="absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-hidden bg-cyan-900/20 scale-75 origin-center">
                                                        <img src={getAssetPath("/images/avatar/spacebunny.png")} className="w-full h-full object-cover scale-[1.35] translate-y-1" />
                                                    </div>
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="text-white font-bold text-lg truncate w-full px-2 tracking-wide">
                                                        {student.displayName}
                                                    </h3>
                                                    <p className="text-cyan-600 text-xs uppercase tracking-wider font-bold truncate">
                                                        {student.spaceship?.name || 'USS Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    )})}
                                </div>
                             </div>
                         )}
                    </div>
                </div>

                {/* AWARD MODAL */}
                <AnimatePresence>
                    {selectedStudent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-space-950 border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
                            >
                                <button 
                                    onClick={() => setSelectedStudent(null)}
                                    className="absolute top-4 right-4 text-cyan-700 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                                <div className="p-6 text-center border-b border-cyan-900/50 bg-black/20">
                                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3  bg-cyan-900/20 ring-1 ring-cyan-500/30`}>
                                        <Rocket size={40} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedStudent.displayName}</h2>
                                    <p className="text-cyan-600 text-xs uppercase font-bold tracking-widest mb-4">{selectedStudent.spaceship?.name || 'USS Unknown'}</p>
                                    <p className="text-cyan-400 text-sm border-t border-cyan-900/50 pt-4">Select Protocol to Issue Award</p>
                                </div>

                                <div className="p-4 max-h-[50vh] overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar">
                                    {behaviors.length === 0 && (
                                        <div className="text-center p-8 text-gray-500">
                                            <p>No protocols defined.</p>
                                            <p className="text-xs">Use "Manage Protocols" to add some.</p>
                                        </div>
                                    )}
                                    {behaviors.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => handleAward(b)}
                                            className={`r
                                                flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 group
                                                
                                            `}
                                        >
                                            <span className="font-bold group-hover:tracking-wider transition-all">{b.label}</span>
                                            <span className={`text-sm font-mono font-bold px-3 py-1 rounded bg-black/40 `}>
                                                {b.xp > 0 ? '+' : ''}{b.xp} XP
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                
                {/* Audio Element for Notifications */}
                <audio id="notification-audio" src={getAssetPath("/sounds/notification.m4a")} preload="auto" /> 

            </div>
        </div>
    );
}
// Force Update
