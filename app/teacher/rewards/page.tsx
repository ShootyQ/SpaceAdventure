"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, deleteDoc, orderBy, runTransaction, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getAssetPath } from "@/lib/utils";
import { UserData, Rank } from "@/types";
import { UserAvatar } from '@/components/UserAvatar';
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
    const { user } = useAuth();
    
    // Mobile check roughly (can be done with CSS mostly, but logic helps for panel)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!user) return;

        // 1. Fetch Students
        const qStudents = query(
            collection(db, "users"), 
            where("role", "==", "student"), 
            where("status", "==", "active"),
            where("teacherId", "==", user.uid)
        );
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
            setStudents(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
        });

        // 2. Fetch Behaviors
        const qBehaviors = query(
            collection(db, "behaviors"), 
            where("teacherId", "==", user.uid)
        );
        const unsubBehaviors = onSnapshot(qBehaviors, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Behavior));
            items.sort((a, b) => b.xp - a.xp); // Client-side sort
            setBehaviors(items);
        });

        // 3. Fetch Ranks
        const unsubRanks = onSnapshot(doc(db, "game-config", `ranks_${user.uid}`), async (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            } else {
                const g = await getDoc(doc(db, "game-config", "ranks"));
                if (g && g.exists() && g.data().list) setRanks(g.data().list);
            }
        });

        return () => {
            unsubStudents();
            unsubBehaviors();
            unsubRanks();
        };
    }, [user]);

    const handleAward = async (behavior: Behavior) => {
        if (!selectedStudent || !user) return;
        
        // Ensure atomic number handling
        const xpAmount = Number(behavior.xp);

        // Play notification sound immediately (User Interaction)
        const audioElement = document.getElementById('notification-audio') as HTMLAudioElement;
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.volume = 0.5;
            audioElement.play().catch(e => console.error("Audio playback failed:", e));
        }

        try {
            const studentRef = doc(db, "users", selectedStudent.uid);
            
            // ATOMIC TRANSACTION: User + Planet
            await runTransaction(db, async (transaction) => {
                 // 1. Read Student Data
                 const sfDoc = await transaction.get(studentRef);
                 if (!sfDoc.exists()) throw "Student document not found";
                 const data = sfDoc.data();
                 
                 // 2. Calculate User Updates (Fuel Logic)
                 const fuelLevel = data.upgrades?.fuel || 0;
                 const maxFuel = 500 + (fuelLevel * 250);
                 const currentFuel = data.fuel !== undefined ? data.fuel : 500;
                 
                 let newFuel = currentFuel + xpAmount;
                 if (newFuel > maxFuel) newFuel = maxFuel;
                 if (newFuel < 0) newFuel = 0;

                 // 3. Queue User Update
                 transaction.update(studentRef, {
                    xp: increment(xpAmount),
                    fuel: newFuel,
                    lastXpReason: behavior.label
                 });

                 // 4. Queue Planet Update (Atomic)
                 const rawLocation = data.location;
                 
                 if (rawLocation && xpAmount > 0) {
                     const planetId = rawLocation.toLowerCase();
                     // Use composite key for Planet Progress: teacherId_planetName
                     const planetDocId = `${user.uid}_${planetId}`;
                     const planetRef = doc(db, "planets", planetDocId);
                     
                     // Use set with merge to ensure doc exists and update safely
                     transaction.set(planetRef, { 
                         currentXP: increment(xpAmount),
                         id: planetId,
                         teacherId: user.uid
                     }, { merge: true });
                 }
            });

            console.log(`SUCCESS: Awarded ${xpAmount} XP to student and updated local sector.`);
            
            setSelectedStudent(null); // Close modal
        } catch (error) {
            console.error("Error awarding XP:", error);
            alert(`Award Transaction Failed!\n\n${error}`);
        }
    };

    const handleAddBehavior = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            await addDoc(collection(db, "behaviors"), {
                label: newLabel,
                xp: Number(newXp),
                color: Number(newXp) > 0 ? "bg-green-600" : "bg-red-600",
                teacherId: user.uid
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
        <div className="min-h-screen bg-space-950 p-2 md:p-4 font-mono text-cyan-400">
            {/* Hidden Audio Element */}
            <audio id="notification-audio" src={getAssetPath("/sounds/notification.m4a?v=1")} preload="auto" />

            <div className="max-w-7xl mx-auto h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] flex flex-col">
                
                {/* Header */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                             <X size={20} />
                        </Link>
                        <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white">Rewards Command</h1>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                         <button 
                            onClick={() => setIsManagingProtocols(!isManagingProtocols)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded border transition-colors ${isManagingProtocols ? 'bg-cyan-900/40 border-cyan-400 text-white' : 'border-cyan-800 text-cyan-500 hover:border-cyan-500'}`}
                        >
                            <Zap size={16} />
                            {isManagingProtocols ? 'DONE' : 'PROTOCOLS'}
                        </button>
                    </div>
                 </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 overflow-hidden relative">
                    
                    {/* LEFT: Manage Protocols */}
                    <AnimatePresence>
                        {isManagingProtocols && (
                             <motion.div 
                                initial={{ height: 0, opacity: 0, width: "100%" }}
                                animate={{ 
                                    height: isMobile ? "auto" : "100%", 
                                    width: isMobile ? "100%" : 320,
                                    opacity: 1 
                                }}
                                exit={{ height: 0, opacity: 0, width: isMobile ? "100%" : 0 }}
                                className="bg-black/40 border md:border-r border-cyan-900/50 p-4 rounded-xl md:rounded-l-2xl overflow-hidden flex flex-col shrink-0 order-first"
                             >
                                <div className="w-full md:min-w-[280px]">
                                    <h3 className="text-white font-bold mb-4">Edit Protocols</h3>
                                    <form onSubmit={handleAddBehavior} className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30 mb-4 space-y-3">
                                        <div>
                                            <label className="text-xs text-cyan-500 uppercase">Label</label>
                                            <input 
                                                value={newLabel}
                                                onChange={e => setNewLabel(e.target.value)}
                                                className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none"
                                                placeholder="e.g. Leadership"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-cyan-500 uppercase">XP Amount</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number"
                                                    value={newXp}
                                                    onChange={e => setNewXp(Number(e.target.value))}
                                                    className="w-full bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none"
                                                    required
                                                />
                                                <div className="flex gap-1">
                                                     <button type="button" onClick={() => setNewXp(50)} className="px-2 bg-cyan-900/40 rounded border border-cyan-800 text-xs hover:bg-cyan-800">+50</button>
                                                     <button type="button" onClick={() => setNewXp(-50)} className="px-2 bg-red-900/40 rounded border border-red-800 text-xs hover:bg-red-800 text-red-300">-50</button>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 md:py-2 rounded text-xs uppercase tracking-wider shadow-lg">
                                            Add Protocol
                                        </button>
                                    </form>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[300px] md:max-h-[calc(100vh-350px)] custom-scrollbar">
                                        {behaviors.map(b => (
                                            <div key={b.id} className="flex items-center justify-between p-3 bg-cyan-900/20 rounded border border-cyan-800/50">
                                                <div>
                                                    <div className="text-white text-sm font-bold">{b.label}</div>
                                                    <div className={`text-xs ${b.xp > 0 ? 'text-green-400' : 'text-red-400'}`}>{b.xp > 0 ? '+' : ''}{b.xp} XP</div>
                                                </div>
                                                <button onClick={(e) => handleDeleteBehavior(b.id, e)} className="p-2 text-red-500 hover:text-white hover:bg-red-500/20 rounded"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RIGHT: Cadet Grid */}
                    <div className="flex-1 bg-black/20 rounded-2xl p-2 md:p-4 overflow-hidden flex flex-col border border-white/5">
                         <div className="mb-4 flex items-center justify-between shrink-0 px-2">
                            <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Award className="text-cyan-400" size={20} />
                                <span className="hidden md:inline">Active Fleet</span>
                                <span className="md:hidden">Fleet</span>
                            </h2>
                            <div className="text-xs text-cyan-600 font-bold bg-cyan-950/50 px-3 py-1 rounded-full">{students.length} Cadets</div>
                         </div>

                         {students.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-cyan-800">
                                <div>
                                    <p className="mb-2">No active signals detected.</p>
                                    <p className="text-sm">Approve cadets in the Roster to see them here.</p>
                                </div>
                            </div>
                         ) : (
                             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 auto-rows-fr pb-20 md:pb-0">
                                    {students.map(student => {
                                        const rank = ranks.slice().sort((a,b) => b.minXP - a.minXP).find(r => (student.xp || 0) >= r.minXP);
                                        return (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            key={student.uid}
                                            onClick={() => setSelectedStudent(student)}
                                            className="relative w-full aspect-square flex flex-col p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-cyan-900/50 bg-black/40 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all cursor-pointer group overflow-hidden"
                                        >
                                            {/* Corner Accents */}
                                            <div className="absolute top-0 left-0 w-6 h-6 md:w-8 md:h-8 border-t-2 border-l-2 border-white/5 rounded-tl-xl group-hover:border-cyan-400/50 transition-colors" />
                                            <div className="absolute bottom-0 right-0 w-6 h-6 md:w-8 md:h-8 border-b-2 border-r-2 border-white/5 rounded-br-xl group-hover:border-cyan-400/50 transition-colors" />

                                            {/* Rank Badge */}
                                            <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 text-[9px] md:text-[10px] uppercase font-bold text-cyan-700 group-hover:text-cyan-400">
                                                {rank?.name || 'Cadet'}
                                            </div>

                                            {/* XP Counter */}
                                            <div className="absolute top-2 right-2 md:top-3 md:right-3 text-[10px] md:text-xs font-mono font-bold text-cyan-600 group-hover:text-cyan-300">
                                                {student.xp || 0} XP
                                            </div>

                                            {/* Center Content */}
                                            <div className="flex-1 flex flex-col items-center justify-center w-full z-10 space-y-1 md:space-y-2 mt-4">
                                                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent group-hover:from-cyan-500/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/5 group-hover:border-cyan-400/30 overflow-hidden relative`}>
                                                    <img 
                                                        src={getAssetPath("/images/ships/finalship.png")}
                                                        className="w-full h-full object-contain relative z-20 scale-75"
                                                        alt="Rocket"
                                                    />
                                                    <div className="absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-hidden bg-cyan-900/20 scale-75 origin-center">
                                                        <UserAvatar userData={student} className="w-full h-full scale-[1.35] translate-y-1" />
                                                    </div>
                                                </div>
                                                <div className="text-center w-full">
                                                    <h3 className="text-white font-bold text-sm md:text-lg truncate w-full px-1 tracking-wide">
                                                        {student.displayName}
                                                    </h3>
                                                    <p className="text-cyan-600 text-[10px] md:text-xs uppercase tracking-wider font-bold truncate">
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
                        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div 
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                className="bg-space-950 border border-cyan-500/30 rounded-t-2xl md:rounded-2xl w-full max-w-sm md:max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
                            >
                                <button 
                                    onClick={() => setSelectedStudent(null)}
                                    className="absolute top-4 right-4 text-cyan-700 hover:text-white bg-black/50 p-2 rounded-full z-20"
                                >
                                    <X size={24} />
                                </button>

                                <div className="p-6 text-center border-b border-cyan-900/50 bg-black/20 shrink-0">
                                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3 bg-cyan-900/20 ring-1 ring-cyan-500/30 overflow-hidden relative`}>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-50"><Rocket size={50} /></div>
                                        <UserAvatar userData={selectedStudent} className="w-full h-full relative z-10" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedStudent.displayName}</h2>
                                    <p className="text-cyan-600 text-xs uppercase font-bold tracking-widest mb-4">{selectedStudent.spaceship?.name || 'Vessel'}</p>
                                </div>

                                <div className="p-4 overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar bg-black/60">
                                    <p className="text-cyan-400 text-xs uppercase tracking-widest font-bold text-center mb-2 opacity-50">Select Protocol</p>
                                    {behaviors.length === 0 && (
                                        <div className="text-center p-8 text-gray-500">
                                            <p>No protocols defined.</p>
                                            <p className="text-xs">Tap "PROTOCOLS" to add some.</p>
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
                
                {/* Audio Element for Notifications */}
                <audio id="notification-audio" src={getAssetPath("/sounds/notification.m4a")} preload="auto" /> 

            </div>
        </div>
    );
}
// Force Update
