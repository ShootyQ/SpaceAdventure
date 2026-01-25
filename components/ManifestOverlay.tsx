"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Check, Crown } from "lucide-react";
import { Ship, Rank, Behavior } from "@/types";
import { updateDoc, doc, runTransaction, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";

// Reuse TinyFlag - We should probably export this too, but for now I'll duplicate quickly or check if I can export it from SolarSystem (not easy).
// I will define it locally here or better yet make a shared component later. For now, local is fine to avoid circular deps.
// Actually, extracting TinyFlag to components/TinyFlag.tsx would be best.
// I'll assume I can just copy it for this step to save tool calls, or render a placeholder.
// Wait, I should make TinyFlag a component.

const TinyFlag = memo(({ config }: { config: any }) => {
    const getColor = (id: string) => {
        const colors: Record<string, string> = {
            red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
            purple: '#a855f7', black: '#171717', white: '#f8fafc', orange: '#f97316'
        };
        return colors[id] || '#3b82f6';
    };
    
    const poleColors: Record<string, string> = {
        silver: '#cbd5e1', gold: '#eab308', wood: '#854d0e', black: '#262626'
    };

    const c1 = getColor(config.primaryColor);
    const c2 = getColor(config.secondaryColor);
    // Deterministic ID logic
    const uniqueId = `mf-clip-${config.primaryColor}-${config.secondaryColor}-${config.pattern}-${config.shape}`.replace(/[^a-z0-9]/gi, '');

    return (
        <svg width="24" height="30" viewBox="0 0 24 30" className="drop-shadow-md">
            <rect x="2" y="2" width="2" height="28" rx="1" fill={poleColors[config.pole] || '#cbd5e1'} />
            <g transform="translate(4, 3)">
                <defs>
                   <clipPath id={uniqueId}>
                        {config.shape === 'rectangle' && <rect x="0" y="0" width="20" height="12" />}
                        {config.shape === 'pennant' && <polygon points="0,0 20,6 0,12" />}
                        {config.shape === 'triangle' && <polygon points="0,0 20,0 10,12 0,0" />} 
                        {config.shape === 'swallowtail' && <polygon points="0,0 20,0 20,12 10,6 0,12" />} 
                   </clipPath>
                </defs>
                <g clipPath={`url(#${uniqueId})`}>
                     {config.pattern === 'solid' && <rect x="0" y="0" width="20" height="12" fill={c1} />}
                     {config.pattern === 'stripe-h' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="0" y="6" width="20" height="6" fill={c2} /></>}
                     {config.pattern === 'stripe-v' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="10" y="0" width="10" height="12" fill={c2} /></>}
                     {config.pattern === 'cross' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="8" y="0" width="4" height="12" fill={c2} /><rect x="0" y="4" width="20" height="4" fill={c2} /></>}
                     {config.pattern === 'circle' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><circle cx="10" cy="6" r="4" fill={c2} /></>}
                     {config.pattern === 'checkered' && <><rect x="0" y="0" width="10" height="6" fill={c1} /><rect x="10" y="0" width="10" height="6" fill={c2} /><rect x="0" y="6" width="10" height="6" fill={c2} /><rect x="10" y="6" width="10" height="6" fill={c1} /></>}
                </g>
            </g>
        </svg>
    );
});

TinyFlag.displayName = "TinyFlag";

interface ManifestOverlayProps {
    isVisible: boolean;
    onClose: () => void;
    ships: Ship[];
    ranks: Rank[];
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    behaviors: Behavior[];
}

const ShipCard = memo(({ student, ranks, isSelected, onToggle }: { student: Ship, ranks: Rank[], isSelected: boolean, onToggle: () => void }) => {
    // Memoize rank reset per card to avoid array operations
    const rank = React.useMemo(() => ranks.find(r => student.xp >= r.minXP), [ranks, student.xp]);

    return (
        <div 
            onClick={onToggle}
            className={`relative group cursor-pointer transition-all hover:scale-105 p-4 rounded-2xl border flex flex-col items-center
                ${isSelected 
                    ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/50'
                }`}
        >
            {/* Selection Checkbox Visual */}
            <div className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-white/30 group-hover:border-cyan-400'}`}>
                {isSelected && <Check size={14} strokeWidth={4} />}
            </div>

            {/* XP Badge */}
            <div className="absolute top-2 right-2 flex flex-col items-end">
                <div className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    {student.xp} XP
                </div>
            </div>

            {/* Avatar */}
            <div className="relative w-32 h-32 mb-4">
                <img
                    src={getAssetPath("/images/ships/finalship.png")}
                    alt="Ship"
                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] relative z-20"
                />
                <div className="absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-visible flex items-center justify-center bg-cyan-900/20">
                    <div className="relative w-full h-full overflow-hidden rounded-full">
                         <div 
                            className="absolute inset-0 z-0"
                            style={{ 
                                backgroundColor: `hsl(${student?.avatar?.skinHue || 0}, 70%, 50%)`,
                                opacity: (student?.avatar?.skinHue || 0) === 0 ? 0 : 0.6,
                                maskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`,
                                WebkitMaskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`,
                                maskSize: 'cover',
                                WebkitMaskSize: 'cover'
                            }} 
                        />
                        <img 
                            src={getAssetPath("/images/avatar/spacebunny.png")} 
                            className="w-full h-full object-cover scale-[1.35] translate-y-1 relative z-10"
                            style={{ filter: `hue-rotate(${student?.avatar?.hue || 0}deg)` }} 
                        />
                    </div>
                    {student?.avatar?.activeHat && student.avatar.activeHat !== 'none' && (
                         <div className="absolute -top-[50%] left-0 right-0 z-40 flex justify-center pointer-events-none">
                             {(() => {
                                const h = student.avatar.activeHat;
                                let src = '';
                                if(h === 'hat1') src = '/images/hats/hat1.svg';
                                else if(h === 'hat2') src = '/images/hats/hat2.svg';
                                // Fallback for legacy ID (optional)
                                else return null; 
                                
                                return (
                                    <img 
                                        src={getAssetPath(src)} 
                                        alt="Hat"
                                        className="w-8 h-8 object-contain filter drop-shadow-md"
                                    />
                                );
                             })()}
                         </div>
                    )}
                </div>
                {student.flag && (
                    <div className="absolute -top-2 -left-2 z-40 transform -rotate-12 scale-110 drop-shadow-md">
                        <TinyFlag config={student.flag} />
                    </div>
                )}
            </div>

            {/* Name */}
            <div className="text-center w-full mb-4">
                <h3 className="text-white font-bold truncate w-full mb-1">{student.cadetName}</h3>
                <div className="flex flex-col items-center justify-center gap-1">
                    {rank?.image && <img src={rank.image} alt={rank.name} className="w-24 h-24 object-contain drop-shadow-md" />}
                    
                    {/* Dynamic Rank Styling */}
                    <div className={`text-xs uppercase tracking-wider font-bold ${
                        (rank?.minXP || 0) > 3000 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] text-sm' :
                        (rank?.minXP || 0) > 1000 ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' :
                        'text-cyan-400/70'
                    }`}>
                        {rank?.name || 'Recruit'}
                    </div>
                </div>
            </div>
            
            {/* Status Indicator */}
            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest bg-black/30 px-2 py-1 rounded">
                <div className={`w-2 h-2 rounded-full ${student.status === 'traveling' ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
                {student.status === 'traveling' ? 'In Transit' : 'Docked'}
            </div>
        </div>
    );
});
ShipCard.displayName = "ShipCard";

const ManifestOverlay = memo(({ isVisible, onClose, ships, ranks, selectedIds, setSelectedIds, behaviors }: ManifestOverlayProps) => {
    
    // 1. Optimize Ranks (Sort once)
    const sortedRanks = React.useMemo(() => ranks.slice().sort((a,b) => b.minXP - a.minXP), [ranks]);
    
    // 2. Optimize Ships List
    const visibleShips = React.useMemo(() => {
        return ships.filter(s => s.role !== 'teacher').sort((a,b) => b.xp - a.xp);
    }, [ships]);

    // Handler for toggling selection (memoized to prevent prop churn)
    const handleToggle = React.useCallback((id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    }, [selectedIds, setSelectedIds]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md p-10 overflow-y-auto"
            >
                <div className="max-w-7xl mx-auto pb-40">
                    <div className="flex items-center justify-between mb-8">
                         <h2 className="text-3xl font-bold text-white uppercase tracking-widest flex items-center gap-4">
                             <LayoutGrid className="text-cyan-400" />
                             Fleet Manifest
                         </h2>
                         <div className="flex gap-4">
                             <button onClick={() => { setSelectedIds(new Set()); onClose(); }} className="text-gray-400 hover:text-white px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition">
                                 CLOSE MANIFEST
                             </button>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {visibleShips.map(student => (
                            <ShipCard 
                                key={student.id}
                                student={student}
                                ranks={sortedRanks}
                                isSelected={selectedIds.has(student.id)}
                                onToggle={() => handleToggle(student.id)}
                            />
                        ))}
                    </div>
                    
                    {/* BULK ACTION FOOTER */}
                     <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div 
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                exit={{ y: 100 }}
                                className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-cyan-500/30 p-6 z-[60] flex items-center justify-center gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
                            >
                                <div className="text-white font-bold uppercase tracking-widest text-sm bg-cyan-900/30 px-4 py-2 rounded">
                                    {selectedIds.size} Cadets Selected
                                </div>
                                
                                <div className="h-8 w-px bg-white/20" />

                                <div className="flex items-center gap-2">
                                     {/* Behavior Selector */}
                                     <div className="relative group">
                                         <select 
                                            id="bulk-protocol"
                                            onChange={(e) => {
                                                const xpInput = document.getElementById('bulk-xp') as HTMLInputElement;
                                                const reasonInput = document.getElementById('bulk-reason') as HTMLInputElement;
                                                const selected = behaviors.find(b => b.id === e.target.value);
                                                
                                                if (selected && xpInput && reasonInput) {
                                                    xpInput.value = selected.xp.toString();
                                                    reasonInput.value = selected.label;
                                                }
                                            }}
                                            className="bg-black border border-white/20 text-white pl-4 pr-10 py-2 rounded w-48 focus:border-cyan-500 outline-none appearance-none cursor-pointer hover:border-cyan-500/50"
                                         >
                                             <option value="">Select Protocol...</option>
                                             {behaviors.map(b => (
                                                 <option key={b.id} value={b.id}>{b.label} ({b.xp > 0 ? '+' : ''}{b.xp} XP)</option>
                                             ))}
                                         </select>
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500">
                                              <Crown size={12} />
                                          </div>
                                     </div>

                                    <input type="number" id="bulk-xp" placeholder="XP" className="bg-black border border-white/20 text-white px-4 py-2 rounded w-24 text-center font-bold focus:border-cyan-500 outline-none" />
                                    <input type="text" id="bulk-reason" placeholder="Reason (Optional)" className="bg-black border border-white/20 text-white px-4 py-2 rounded w-64 focus:border-cyan-500 outline-none" />
                                </div>

                                <button 
                                    onClick={async () => {
                                        const xpInput = parseInt((document.getElementById('bulk-xp') as HTMLInputElement).value) || 0;
                                        const reasonInput = (document.getElementById('bulk-reason') as HTMLInputElement).value || "Command Award";
                                        
                                        if (xpInput === 0) return;

                                        // Apply to all selected using atomic transactions
                                        const promises = Array.from(selectedIds).map(async (id) => {
                                            const studentRef = doc(db, "users", id);
                                            
                                            try {
                                                await runTransaction(db, async (transaction) => {
                                                    const sfDoc = await transaction.get(studentRef);
                                                    if (!sfDoc.exists()) return; // Skip if user deleted
                                                    
                                                    const data = sfDoc.data();
                                                    
                                                    // 1. Calculate Fuel Logic
                                                    const fuelLevel = data.upgrades?.fuel || 0;
                                                    const maxFuel = 500 + (fuelLevel * 250);
                                                    const currentFuel = data.fuel !== undefined ? data.fuel : 500;
                                                    
                                                    let newFuel = currentFuel + xpInput;
                                                    if (newFuel > maxFuel) newFuel = maxFuel;
                                                    if (newFuel < 0) newFuel = 0;

                                                    // 2. Queue User Update
                                                    transaction.update(studentRef, {
                                                        xp: increment(xpInput),
                                                        fuel: newFuel,
                                                        lastAward: {
                                                            reason: reasonInput,
                                                            xpGained: xpInput,
                                                            timestamp: Date.now()
                                                        },
                                                        // Ensure legacy field is updated too for compatibility
                                                        lastXpReason: reasonInput
                                                    });

                                                    // 3. Queue Planet Update (Atomic)
                                                    const rawLocation = data.location;
                                                    if (rawLocation && xpInput > 0) {
                                                        const planetId = rawLocation.toLowerCase();
                                                        const planetRef = doc(db, "planets", planetId);
                                                        
                                                        transaction.set(planetRef, { 
                                                            currentXP: increment(xpInput),
                                                            id: planetId 
                                                        }, { merge: true });
                                                    }
                                                });
                                            } catch (e) {
                                                console.error(`Failed to update student ${id}:`, e);
                                            }
                                        });

                                        await Promise.all(promises);
                                        
                                        setSelectedIds(new Set());
                                        (document.getElementById('bulk-xp') as HTMLInputElement).value = '';
                                        (document.getElementById('bulk-reason') as HTMLInputElement).value = '';
                                        // (document.getElementById('bulk-protocol') as HTMLSelectElement).value = '';
                                    }}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-8 rounded uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all"
                                >
                                    Award XP
                                </button>

                                <button onClick={() => setSelectedIds(new Set())} className="text-red-400 hover:text-white text-sm uppercase font-bold tracking-wider ml-4">
                                    Clear Selection
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
});

ManifestOverlay.displayName = "ManifestOverlay";

export default ManifestOverlay;
 
// Update 1
