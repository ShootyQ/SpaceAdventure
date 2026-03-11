"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award } from "lucide-react";
import { resolveShipAssetPath } from "@/lib/ships";
import { getAssetPath } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { AwardEvent, Rank, FlagConfig } from "@/types";
import { getPetById } from "@/lib/pets";

// TinyFlag inlined here to avoid circular deps with SolarSystem
const TinyFlag = ({ config }: { config: FlagConfig }) => {
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
    const uniqueId = `clip-ao-${config.primaryColor}-${config.secondaryColor}-${config.pattern}-${config.shape}`.replace(/[^a-z0-9]/gi, '');

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
};

interface AwardOverlayProps {
    awards: AwardEvent[];
    activeUnlockReveal: AwardEvent | null;
    ranks: Rank[];
    onDismiss: () => void;
}

export default function AwardOverlay({ awards, activeUnlockReveal, ranks, onDismiss }: AwardOverlayProps) {
    return (
        <div
            key="award-overlay"
            className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-auto cursor-pointer"
            onClick={onDismiss}
        >
            {/* Visual Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />

            <button
                type="button"
                aria-label="Close reward overlay"
                className="absolute right-4 top-4 z-[390] rounded-full border border-white/40 bg-black/60 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-black/80"
                onClick={(event) => {
                    event.stopPropagation();
                    onDismiss();
                }}
            >
                Close
            </button>

            {/* Awards Grid */}
            {!activeUnlockReveal && (() => {
                const awardCount = awards.length;
                const isSuperDense = awardCount > 16;
                const isUltraDense = awardCount > 10;
                const isDense = awardCount > 6;
                const isMedium = awardCount >= 3 && awardCount <= 6;
                const cols = awardCount > 16 ? 6 : awardCount > 10 ? 5 : awardCount > 6 ? 4 : undefined;

                return (
                    <div
                        className={`${cols ? 'grid' : 'flex flex-wrap'} items-center justify-center ${isSuperDense ? 'gap-1 p-1' : isUltraDense ? 'gap-1.5 p-1.5' : isDense ? 'gap-2 p-2' : isMedium ? 'gap-3 p-4' : 'gap-6 p-8'} max-h-[100dvh] overflow-hidden cursor-default justify-items-center content-center`}
                        style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {awards.map((award) => {
                            const isSingleAward = awardCount === 1;
                            const isDualAward = awardCount === 2;
                            const isMediumAward = isMedium;
                            const isCompactAward = awardCount > 2;
                            const isDenseAward = isDense;
                            const isUltraDenseAward = isUltraDense;
                            const useLightAnimation = isDense;
                            const selectedPet = getPetById(award.ship.selectedPetId);
                            return (
                                <motion.div
                                    key={award.id}
                                    initial={{ scale: 0, rotate: -10, y: 50 }}
                                    animate={{ scale: 1, rotate: 0, y: 0 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        type: useLightAnimation ? "tween" : "spring",
                                        stiffness: useLightAnimation ? undefined : 200,
                                        damping: useLightAnimation ? undefined : 20,
                                        duration: useLightAnimation ? 0.16 : undefined,
                                        delay: 0
                                    }}
                                    className={`relative z-50 bg-black/90 border border-cyan-500 rounded-3xl p-6 flex flex-col items-center shadow-[0_0_60px_rgba(6,182,212,0.6)] text-center pointer-events-auto overflow-hidden
                                        ${isSuperDense ? 'w-[136px] p-2 rounded-xl' : isUltraDenseAward ? 'w-[156px] p-2.5 rounded-xl' : isDenseAward ? 'w-[185px] p-3 rounded-2xl' : isMediumAward ? 'w-[220px] p-3 rounded-2xl' : isSingleAward ? 'w-[95vw] max-w-[980px] max-h-[92dvh] overflow-hidden p-6 sm:w-[90vw] sm:p-8 lg:p-10' : isDualAward ? 'w-[400px] aspect-auto p-8' : 'w-[420px] aspect-square p-8'}
                                    `}
                                >
                                    {/* Background Shine */}
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-transparent to-transparent" />

                                    <h2 className={`${isSuperDense ? 'text-[9px]' : isUltraDenseAward ? 'text-[10px]' : isDenseAward ? 'text-xs' : isMediumAward ? 'text-xs' : isCompactAward ? 'text-sm' : isSingleAward ? 'text-xl sm:text-2xl lg:text-[2rem]' : 'text-xl'} text-cyan-300 font-mono tracking-widest ${isSuperDense ? 'mb-1.5' : isSingleAward ? 'mb-3' : 'mb-2'} uppercase relative z-10`}>Training Milestone</h2>

                                    {/* Avatar + Ship + Pet */}
                                    <motion.div
                                        animate={isDenseAward ? undefined : {
                                            y: [0, -10, 0],
                                            rotate: [0, -5, 5, 0]
                                        }}
                                        transition={isDenseAward ? undefined : {
                                            repeat: Infinity,
                                            duration: 4,
                                            ease: "easeInOut"
                                        }}
                                        className={`relative z-10 ${isSuperDense ? 'mb-0.5' : isUltraDenseAward ? 'mb-1' : isCompactAward ? 'mb-2' : isSingleAward ? 'mb-4' : 'mb-4'}`}
                                    >
                                        <div className={`relative flex items-center justify-center ${isSuperDense ? 'w-32 h-12' : isUltraDenseAward ? 'w-40 h-16' : isDenseAward ? 'w-48 h-20' : isMediumAward ? 'w-52 h-[5.5rem]' : isCompactAward ? 'w-56 h-24' : isSingleAward ? 'w-[18rem] h-[10rem] sm:w-[24rem] sm:h-[14rem] lg:w-[26rem] lg:h-[14rem]' : 'w-80 h-36'}`}>
                                            {award.ship.flag && (
                                                <div className={`absolute z-40 ${isCompactAward ? '-top-2 right-[35%] scale-75' : isSingleAward ? '-top-3 right-[41%] scale-95 sm:scale-110' : '-top-3 right-[38%] scale-95'}`}>
                                                    <TinyFlag config={award.ship.flag} />
                                                </div>
                                            )}

                                            <div className={`absolute left-1 z-30 flex items-center justify-center ${isMediumAward ? 'w-[52px] h-[52px] top-[60%] -translate-y-1/2' : isCompactAward ? 'w-[58px] h-[58px] top-[60%] -translate-y-1/2' : isSingleAward ? 'w-[90px] h-[90px] top-[62%] -translate-y-1/2 sm:w-[112px] sm:h-[112px] lg:w-[112px] lg:h-[112px]' : 'w-[84px] h-[84px] top-[58%] -translate-y-1/2'}`}>
                                                <UserAvatar userData={award.ship as any} transparentBg className="w-full h-full" />
                                            </div>

                                            <div className={`relative z-20 ${isMediumAward ? 'w-20 h-20' : isCompactAward ? 'w-24 h-24' : isSingleAward ? 'w-44 h-44 sm:w-56 sm:h-56 lg:w-52 lg:h-52' : 'w-40 h-40'}`}>
                                                <img
                                                    src={getAssetPath(resolveShipAssetPath(award.ship.shipId || 'finalship'))}
                                                    onError={(event) => {
                                                        event.currentTarget.onerror = null;
                                                        event.currentTarget.src = getAssetPath('/images/collectibles/ships/starter/finalship.png');
                                                    }}
                                                    alt="Award Ship"
                                                    className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                                                />
                                            </div>

                                            <div className={`absolute right-1 z-30 flex items-center justify-center ${isMediumAward ? 'w-[46px] h-[46px] top-[60%] -translate-y-1/2' : isCompactAward ? 'w-[52px] h-[52px] top-[60%] -translate-y-1/2' : isSingleAward ? 'w-[82px] h-[82px] top-[62%] -translate-y-1/2 sm:w-[98px] sm:h-[98px] lg:w-[100px] lg:h-[100px]' : 'w-[76px] h-[76px] top-[58%] -translate-y-1/2'}`}>
                                                {selectedPet.imageSrc ? (
                                                    <img
                                                        src={getAssetPath(selectedPet.imageSrc)}
                                                        alt={selectedPet.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className={`${isCompactAward ? 'text-xl' : isSingleAward ? 'text-3xl sm:text-4xl' : 'text-2xl'} leading-none`}>{selectedPet.emoji}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>

                                    <div className={`${isSuperDense ? 'text-base mb-1' : isUltraDenseAward ? 'text-lg' : isDenseAward ? 'text-xl' : isMediumAward ? 'text-xl mb-1' : isCompactAward ? 'text-2xl' : isSingleAward ? 'text-[2.55rem] sm:text-5xl lg:text-5xl mb-3' : isDualAward ? 'text-3xl mb-2' : 'text-4xl'} font-bold text-white font-sans relative z-10 ${isSingleAward || isDualAward ? 'w-full px-3 whitespace-normal break-words leading-tight' : 'truncate w-full'}`}>
                                        {award.ship.cadetName}
                                    </div>

                                    {award.reason && (
                                        <div className={`text-cyan-400/80 ${isSuperDense ? 'text-[8px]' : isUltraDenseAward ? 'text-[9px]' : isDenseAward ? 'text-[10px]' : isMediumAward ? 'text-[11px]' : isCompactAward ? 'text-xs' : isSingleAward ? 'text-base sm:text-lg' : 'text-sm'} font-bold uppercase tracking-widest ${isSuperDense ? 'mb-1' : isUltraDenseAward ? 'mb-1.5' : isSingleAward ? 'mb-4' : 'mb-3'} relative z-10`}>
                                            {award.reason}
                                        </div>
                                    )}

                                    {!award.reason && <div className={isSuperDense ? 'mb-1' : isUltraDenseAward ? 'mb-1.5' : isSingleAward ? 'mb-4' : 'mb-3'} />}

                                    <div className={`flex items-center justify-center ${isSuperDense ? 'gap-2' : 'gap-4'} w-full relative z-10`}>
                                        <div className={`flex-1 bg-green-500/10 ${isSuperDense ? 'p-1.5 rounded-lg' : isSingleAward ? 'p-4 sm:p-5 rounded-2xl' : 'p-3 rounded-xl'} border border-green-500/30`}>
                                            <span className={`block text-green-400 ${isSuperDense ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider mb-1`}>XP Gained</span>
                                            <span className={`${isUltraDenseAward ? 'text-lg' : isSingleAward ? 'text-4xl sm:text-5xl' : 'text-2xl'} block font-black text-green-300`}>+{award.xpGained}</span>
                                        </div>

                                        {award.newRank && (
                                            <div
                                                className={`flex-1 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 ${isSingleAward ? 'p-3 sm:p-4 rounded-2xl max-h-32' : 'p-2 rounded-xl'} border border-yellow-500/50 flex flex-col items-center gap-1 shadow-[0_0_30px_rgba(234,179,8,0.4)] relative overflow-hidden`}
                                            >
                                                <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                                                <span className={`block text-yellow-300 ${isSingleAward ? 'text-xs sm:text-sm' : 'text-[10px]'} font-black uppercase tracking-widest relative z-10`}>PROMOTION!</span>
                                                {(() => {
                                                    const r = ranks.find(rk => rk.name === award.newRank);
                                                    return r?.image && (
                                                        <motion.img
                                                            initial={{ scale: 0, rotate: 180 }}
                                                            animate={{ scale: [1, 1.15, 1], rotate: 0 }}
                                                            transition={{ type: "spring", bounce: 0.6, scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }}
                                                            src={getAssetPath(r.image)}
                                                            alt="Rank Badge"
                                                            className={`${isSingleAward ? 'w-16 h-16 sm:w-20 sm:h-20' : isDenseAward ? 'w-10 h-10' : 'w-14 h-14'} object-contain drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] relative z-10`}
                                                        />
                                                    );
                                                })()}
                                                <span className={`${isSingleAward ? 'text-sm sm:text-base' : 'text-xs'} block font-black text-yellow-100 truncate w-full text-center relative z-10`}>{award.newRank}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Unlock Reveal */}
            <AnimatePresence>
                {activeUnlockReveal && (
                    <motion.div
                        key={`unlock-reveal-${activeUnlockReveal.id}`}
                        initial={{ opacity: 0, scale: 0.8, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ type: "spring", stiffness: 220, damping: 18 }}
                        className="absolute inset-0 z-[380] flex items-center justify-center pointer-events-auto"
                    >
                        <div className="relative w-[760px] max-w-[92vw] bg-black/95 border-2 border-fuchsia-400 rounded-3xl shadow-[0_0_80px_rgba(217,70,239,0.7)] p-8 overflow-hidden" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                aria-label="Close unlock reveal"
                                className="absolute right-3 top-3 z-20 rounded-full border border-fuchsia-200/70 bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-100 hover:bg-black/80"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDismiss();
                                }}
                            >
                                Close
                            </button>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-fuchsia-700/40 via-purple-800/10 to-transparent" />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative z-10"
                            >
                                <div className="text-center mb-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/40 text-fuchsia-100 text-xs font-black uppercase tracking-[0.25em]">
                                        <Award size={14} />
                                        New Discovery
                                    </div>
                                    <div className="mt-3 text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                                        {activeUnlockReveal.ship.cadetName}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start justify-items-center">
                                    {(activeUnlockReveal.unlocks?.ships || []).map((id) => (
                                        <div key={`reveal-ship-${id}`} className="w-full bg-fuchsia-500/10 border border-fuchsia-300/30 rounded-2xl p-3 flex flex-col items-center gap-2">
                                            <img
                                                src={getAssetPath(resolveShipAssetPath(id))}
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = getAssetPath('/images/collectibles/ships/starter/finalship.png');
                                                }}
                                                alt={id}
                                                className="w-16 h-16 object-contain drop-shadow-md"
                                            />
                                            <div className="text-[10px] text-fuchsia-100 uppercase font-black tracking-widest">New Ship</div>
                                        </div>
                                    ))}
                                    {(activeUnlockReveal.unlocks?.avatars || []).map((id) => (
                                        <div key={`reveal-avatar-${id}`} className="w-full bg-fuchsia-500/10 border border-fuchsia-300/30 rounded-2xl p-3 flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 rounded-full border border-fuchsia-300/40 overflow-hidden">
                                                <UserAvatar avatarId={id} hat="none" className="w-full h-full" />
                                            </div>
                                            <div className="text-[10px] text-fuchsia-100 uppercase font-black tracking-widest">New Avatar</div>
                                        </div>
                                    ))}
                                    {(activeUnlockReveal.unlocks?.pets || []).map((id) => {
                                        const pet = getPetById(id);
                                        return (
                                            <div key={`reveal-pet-${id}`} className="w-full bg-fuchsia-500/10 border border-fuchsia-300/30 rounded-2xl p-3 flex flex-col items-center gap-2">
                                                <div className="w-16 h-16 rounded-full border border-fuchsia-300/40 overflow-hidden bg-black/40 flex items-center justify-center text-3xl">
                                                    {pet.imageSrc ? (
                                                        <img src={getAssetPath(pet.imageSrc)} alt={pet.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <>{pet.emoji}</>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-fuchsia-100 uppercase font-black tracking-widest">New Pet</div>
                                            </div>
                                        );
                                    })}
                                    {(activeUnlockReveal.unlocks?.objects || []).map((id) => (
                                        <div key={`reveal-object-${id}`} className="w-full bg-fuchsia-500/10 border border-fuchsia-300/30 rounded-2xl p-3 flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 rounded-xl border border-fuchsia-300/40 bg-black/40 flex items-center justify-center text-xs text-fuchsia-100 font-bold px-2 text-center leading-tight">
                                                {id}
                                            </div>
                                            <div className="text-[10px] text-fuchsia-100 uppercase font-black tracking-widest">New Object</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
