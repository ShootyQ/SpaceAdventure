"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Check, Crown } from "lucide-react";
import { Ship, Rank, Behavior } from "@/types";
import { updateDoc, doc, runTransaction, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";

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
    const uniqueId = "mf-clip-" + config.primaryColor + "-" + config.secondaryColor + "-" + config.pattern + "-" + config.shape;

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
                <g clipPath={"url(#" + uniqueId + ")"}>
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
    const rank = React.useMemo(() => ranks.find(r => student.xp >= r.minXP), [ranks, student.xp]);

    return (
        <div 
            onClick={onToggle}
            className={"relative group cursor-pointer transition-all hover:scale-105 p-4 rounded-2xl border flex flex-col items-center " + (isSelected ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/50')}
        >
            <div className={"absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors " + (isSelected ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-white/30 group-hover:border-cyan-400')}>
                {isSelected && <Check size={14} strokeWidth={4} />}
            </div>

            <div className="absolute top-2 right-2 flex flex-col items-end">
                <div className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    {student.xp} XP
                </div>
            </div>

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
                                backgroundColor: "hsl(" + (student?.avatar?.skinHue || 0) + ", 70%, 50%)",
                                opacity: (student?.avatar?.skinHue || 0) === 0 ? 0 : 0.6,
                                maskImage: "url(" + getAssetPath('/images/avatar/spacebunny.png') + ")",
                                WebkitMaskImage: "url(" + getAssetPath('/images/avatar/spacebunny.png') + ")",
                                maskSize: 'cover',
                                WebkitMaskSize: 'cover'
                            }} 
                        />
                        <img 
                            src={getAssetPath("/images/avatar/spacebunny.png")} 
                            className="w-full h-full object-cover scale-[1.35] translate-y-1 relative z-10"
                            style={{ filter: "hue-rotate(" + (student?.avatar?.hue || 0) + "deg)" }} 
                        />
                    </div>
                    {student?.avatar?.activeHat && student.avatar.activeHat !== 'none' && (
                         <div className="absolute -top-[50%] left-0 right-0 z-40 flex justify-center pointer-events-none">
                             {(() => {
                                const h = student.avatar.activeHat;
                                let src = '';
                                if(h === 'hat1') src = '/images/hats/hat1.png';
                                else if(h === 'hat2') src = '/images/hats/hat2.png';
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

            <div className="text-center w-full mb-4">
                <h3 className="text-white font-bold truncate w-full mb-1">{student.cadetName}</h3>
                <div className="flex flex-col items-center justify-center gap-1">
                    {rank?.image && <img src={rank.image} alt={rank.name} className="w-24 h-24 object-contain drop-shadow-md" />}
                    
                    <div className={"text-xs uppercase tracking-wider font-bold " + ((rank?.minXP || 0) > 3000 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] text-sm' : (rank?.minXP || 0) > 1000 ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-cyan-400/70')}>
                        {rank?.name || 'Recruit'}
                    </div>
                </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest bg-black/30 px-2 py-1 rounded">
                <div className={"w-2 h-2 rounded-full " + (student.status === 'traveling' ? 'bg-orange-400 animate-pulse' : 'bg-green-400')} />
                {student.status === 'traveling' ? 'In Transit' : 'Docked'}
            </div>
        </div>
    );
});
ShipCard.displayName = "ShipCard";

const ManifestOverlay = memo(({ isVisible, onClose, ships, ranks, selectedIds, setSelectedIds, behaviors }: ManifestOverlayProps) => {
    
    const sortedRanks = React.useMemo(() => ranks.slice().sort((a,b) => b.minXP - a.minXP), [ranks]);
    
    const visibleShips = React.useMemo(() => {
        return ships.filter(s => s.role !== 'teacher').sort((a,b) => b.xp - a.xp);
    }, [ships]);

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
                </div>
            </motion.div>
        </AnimatePresence>
    );
});

ManifestOverlay.displayName = "ManifestOverlay";
export default ManifestOverlay;
