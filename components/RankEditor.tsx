"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Save, Trash2, Plus } from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Rank } from "@/context/AuthContext";

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

export default function RankEditor({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [draftRanks, setDraftRanks] = useState<Rank[]>(DEFAULT_RANKS);

    useEffect(() => {
        if (isOpen) {
            // Load current config when opened
            const unsub = onSnapshot(doc(db, "game-config", "ranks"), (d) => {
                if (d.exists() && d.data().list) {
                    setDraftRanks(d.data().list);
                }
            });
            return () => unsub();
        }
    }, [isOpen]);

    const handleSaveRanks = async () => {
        try {
            await setDoc(doc(db, "game-config", "ranks"), {
                list: draftRanks
            });
            onClose();
        } catch (e) {
            console.error("Error saving ranks:", e);
            alert("Failed to update protocols.");
        }
    };

    return (
       <AnimatePresence>
         {isOpen && (
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl p-10 overflow-auto flex justify-center"
            >
               <div className="max-w-4xl w-full">
                   <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10 sticky top-0 bg-black/95 z-10 pt-4">
                       <div>
                           <h2 className="text-3xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                               <ShieldCheck className="text-cyan-400" /> Rank Protocols
                           </h2>
                           <p className="text-gray-400 mt-2">Adjust experience thresholds and insignias.</p>
                       </div>
                       <div className="flex gap-4">
                           <button onClick={handleSaveRanks} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg uppercase tracking-wider flex items-center gap-2">
                               <Save size={18} /> Save Protocols
                           </button>
                           <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg uppercase tracking-wider">
                               Cancel
                           </button>
                       </div>
                   </div>

                   <div className="grid gap-4 pb-10">
                       {draftRanks.sort((a,b) => a.minXP - b.minXP).map((rank, idx) => (
                           <div key={rank.id || idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-6">
                               <div className="w-16 h-16 bg-black/50 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden flex-shrink-0">
                                   {rank.image ? (
                                       <img src={rank.image} alt="Rank" className="w-12 h-12 object-contain" />
                                   ) : (
                                       <div className="text-xs text-gray-500">No Img</div>
                                   )}
                               </div>
                               
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   <div>
                                       <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Rank Title</label>
                                       <input 
                                           type="text" 
                                           value={rank.name}
                                           onChange={(e) => {
                                               const newRanks = [...draftRanks];
                                               const index = newRanks.findIndex(r => (r.id === rank.id));
                                               newRanks[index] = { ...newRanks[index], name: e.target.value };
                                               setDraftRanks(newRanks);
                                           }}
                                           className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white/90 text-sm focus:border-cyan-500 focus:outline-none"
                                       />
                                   </div>
                                   <div>
                                       <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Min XP Required</label>
                                       <input 
                                           type="number" 
                                           value={rank.minXP}
                                            onChange={(e) => {
                                               const newRanks = [...draftRanks];
                                               const index = newRanks.findIndex(r => (r.id === rank.id));
                                               newRanks[index] = { ...newRanks[index], minXP: parseInt(e.target.value) || 0 };
                                               setDraftRanks(newRanks);
                                           }}
                                           className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white/90 text-sm focus:border-cyan-500 focus:outline-none font-mono"
                                       />
                                   </div>
                                    <div className="hidden lg:block">
                                       <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Image Path</label>
                                       <input 
                                           type="text" 
                                           value={rank.image}
                                            onChange={(e) => {
                                               const newRanks = [...draftRanks];
                                               const index = newRanks.findIndex(r => (r.id === rank.id));
                                               newRanks[index] = { ...newRanks[index], image: e.target.value };
                                               setDraftRanks(newRanks);
                                           }}
                                           className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-gray-400 text-xs focus:border-cyan-500 focus:outline-none font-mono"
                                       />
                                   </div>
                               </div>

                               <button 
                                   onClick={() => {
                                       setDraftRanks(prev => prev.filter(r => r.id !== rank.id));
                                   }}
                                   className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                               >
                                   <Trash2 size={20} />
                               </button>
                           </div>
                       ))}
                   </div>
                   
                   <button 
                       onClick={() => {
                           const newId = Date.now().toString();
                           setDraftRanks([...draftRanks, { id: newId, name: "New Rank", minXP: 99999, image: "/images/badges/cadet.png" }]);
                       }}
                       className="w-full py-4 mt-6 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/50 hover:bg-white/5 transition flex items-center justify-center gap-2 uppercase font-bold tracking-wider"
                   >
                       <Plus size={20} /> Add New Rank Clearance
                   </button>
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    );
}