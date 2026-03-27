"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Rank, FlagConfig, PlacedMachine, UserData } from "@/types";
import { doc, updateDoc, onSnapshot, increment, collection, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    ArrowLeft, Car, Palette, Zap, Save, Shield, Wrench, Flag, Loader2,
    Box, User, LayoutDashboard, Database, Crosshair, Star, Eye, Map, Sun, Award, Crown, Activity, Store
} from "lucide-react";

import { getAssetPath, NAME_MAX_LENGTH, sanitizeName, truncateName } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { SHIP_OPTIONS, resolveShipAssetPath } from "@/lib/ships";
import { DEFAULT_UNLOCK_CONFIG, getXpUnlockRules, normalizeUnlockConfig, resolveRuntimeUnlockId, type UnlockRule } from "@/lib/unlocks";
import { isXpUnlockEarned, normalizeXpUnlockProgressMap, syncXpUnlockProgressForRules, type XpUnlockProgressMap } from "@/lib/xp-unlock-progress";
import {
    getBoosterStats,
    canCraftMachine,
    canCraftShipUpgrade,
    getLanderStats,
    MACHINE_CATALOG,
    SHIP_UPGRADE_CATALOG,
    STARTER_MINER_ID,
    buildPlacedMachineId,
    formatMachineCostLabel,
    getAvailableMachineCount,
    getCurrentShipUpgrade,
    getCurrentCargoUsed,
    getHullTierStats,
    getMachineAccrualSnapshot,
    getMachineDefinition,
    getMachineUnitDurationMs,
    getNextShipUpgrade,
    getPlanetResources,
    getResourceDefinition,
    getTravelComputationBetweenPlanets,
} from "@/lib/resource-economy";

// Custom Icon for Ship
const Rocket = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src={getAssetPath("/images/collectibles/ships/starter/finalship.png")}
        alt="Rocket"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
    />
);
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

const SHIP_COLORS = [
    { name: "Nebula Blue", class: "text-blue-400", bg: "bg-blue-400" },
    { name: "Mars Red", class: "text-red-400", bg: "bg-red-400" },
    { name: "Emerald", class: "text-green-400", bg: "bg-green-400" },
    { name: "Starlight Gold", class: "text-yellow-400", bg: "bg-yellow-400" },
    { name: "Void Purple", class: "text-purple-400", bg: "bg-purple-400" },
    { name: "Ice Cyan", class: "text-cyan-400", bg: "bg-cyan-400" },
];

const getPurchasedShopShipIds = (purchasedShopItemIds?: string[]) => {
    return (purchasedShopItemIds || [])
        .filter((itemId) => String(itemId || "").toLowerCase().startsWith("ships/"))
        .map((itemId) => String(itemId || "").split("/").pop() || "")
        .filter(Boolean);
};

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const MACHINE_FAMILY_LABELS = {
    miner: "Ore Mining",
    extractor: "Gas Extraction",
    harvester: "Organic Harvest",
} as const;

const formatTravelDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
};

const readPlanetXpValue = (planetXP: Record<string, number> | undefined, planetId: string) => {
    const normalizedPlanetId = normalizePlanetId(planetId);
    if (!normalizedPlanetId) return 0;

    const exact = Number(planetXP?.[normalizedPlanetId] || 0);
    if (exact > 0) return exact;

    const fallbackEntry = Object.entries(planetXP || {}).find(([key]) => normalizePlanetId(key) === normalizedPlanetId);
    return Number(fallbackEntry?.[1] || 0);
};

const buildUnlockedShipIdSet = ({
    starterShipIds,
    shopUnlockedShipIds,
    purchasedShopItemIds,
    currentShipId,
    shipXpUnlockRules,
    planetShipUnlocks,
    planetShipUnlockConfiguredAt,
    xpUnlockProgress,
    planetXP,
    idAliases,
    shipCatalogIds,
}: {
    starterShipIds: string[];
    shopUnlockedShipIds?: string[];
    purchasedShopItemIds?: string[];
    currentShipId?: string;
    shipXpUnlockRules: UnlockRule[];
    planetShipUnlocks: Record<string, Record<string, number>>;
    planetShipUnlockConfiguredAt: Record<string, Record<string, number>>;
    xpUnlockProgress: XpUnlockProgressMap;
    planetXP?: Record<string, number>;
    idAliases?: Record<string, string>;
    shipCatalogIds: Set<string>;
}) => {
    const purchasedShopShipIds = getPurchasedShopShipIds(purchasedShopItemIds);
    const normalizedPurchasedShopShipIds = purchasedShopShipIds.map((id) =>
        resolveRuntimeUnlockId(id, idAliases, shipCatalogIds)
    );
    const normalizedShopShipIds = (shopUnlockedShipIds || []).map((id) =>
        resolveRuntimeUnlockId(id, idAliases, shipCatalogIds)
    );

    const unlocked = new Set<string>([
        ...starterShipIds,
        ...normalizedShopShipIds,
        ...normalizedPurchasedShopShipIds,
        String(currentShipId || "finalship"),
    ]);

    shipXpUnlockRules.forEach((rule) => {
        const normalizedPlanetId = normalizePlanetId(rule.planetId);
        const currentPlanetXP = readPlanetXpValue(planetXP, normalizedPlanetId);
        const requiredXP = Number(planetShipUnlocks?.[normalizedPlanetId]?.[rule.unlockKey] || 0);
        if (isXpUnlockEarned({
            progress: xpUnlockProgress,
            planetId: normalizedPlanetId,
            unlockKey: rule.unlockKey,
            domain: "ship",
            requiredXP,
            currentPlanetXP,
            configuredAt: Number(planetShipUnlockConfiguredAt?.[normalizedPlanetId]?.[rule.unlockKey] || 0),
        })) {
            unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, shipCatalogIds));
        }
    });

    return unlocked;
};

const UpgradeSlot = ({ icon: Icon, label, level = 0, active = false }: { icon: any, label: string, level?: number, active?: boolean }) => (
    <div className={`aspect-square rounded-xl flex flex-col items-center justify-center p-4 border transition-all cursor-pointer ${active ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/40 border-cyan-900/40 hover:border-cyan-500/50 hover:bg-cyan-900/20'}`}>
        <Icon size={24} className={`mb-2 ${active ? 'text-cyan-300' : 'text-cyan-700'}`} />
        <div className={`text-[10px] uppercase font-bold text-center tracking-wider ${active ? 'text-cyan-100' : 'text-cyan-800'}`}>{label}</div>
        <div className="flex gap-1 mt-2">
            {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < level ? 'bg-cyan-400 shadow-[0_0_5px_currentColor]' : 'bg-cyan-950'}`} />
            ))}
        </div>
    </div>
);

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
    // Simple unique ID for clipPath to avoid conflicts between multiple flags on page
    const uniqueId = `clip-${config.primaryColor}-${config.secondaryColor}-${config.pattern}-${config.shape}`.replace(/[^a-z0-9]/gi, '');

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
}



// --- Subviews ---

function CockpitView({ onNavigate, ranks }: { onNavigate: (view: string) => void, ranks: Rank[] }) {
    const { userData } = useAuth();
    const MENU_ITEMS = [
        { id: 'ship', title: 'Hangar Bay', icon: Rocket, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-950/30' },
        { id: 'inventory', title: 'Cargo Hold', icon: Box, color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/30' },
        { id: 'avatar', title: 'Pilot Profile', icon: User, color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-950/30', href: '/student/avatar' },
        { id: 'flag', title: 'Flag Designer', icon: Flag, color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-950/30' },
        { id: 'missions', title: 'Mission Log', icon: Activity, color: 'text-green-400', border: 'border-green-500', bg: 'bg-green-950/20', href: '/student/missions' },
        { id: 'interior', title: 'Spaceship Interior', icon: LayoutDashboard, color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/30', href: '/student' },
        { id: 'shop', title: 'Intergalactic Shop', icon: Store, color: 'text-amber-300', border: 'border-amber-500', bg: 'bg-amber-950/20', href: '/student/shop' },
        { id: 'solar', title: 'Solar System', icon: Map, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-950/20', href: '/student/map' },
    ];

    // Determine Rank
    const currentXP = userData?.xp || 0;
    const sortedRanks = [...ranks].sort((a,b) => a.minXP - b.minXP);
    // Find highest rank with minXP <= currentXP
    const currentRank = sortedRanks.slice().reverse().find(r => currentXP >= r.minXP) || sortedRanks[0] || { name: 'Recruit', minXP: 0 };
    // Find next rank
    const nextRank = sortedRanks.find(r => r.minXP > currentXP);
    
    const progress = nextRank 
        ? ((currentXP - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100 
        : 100;

    // Avatar Colors
    const hue = userData?.avatar?.hue || 0;
    const skinHue = userData?.avatar?.skinHue || 0;
    const bgHue = userData?.avatar?.bgHue !== undefined ? userData.avatar.bgHue : 260;
    const bgSat = userData?.avatar?.bgSat !== undefined ? userData.avatar.bgSat : 50;
    const bgLight = userData?.avatar?.bgLight !== undefined ? userData.avatar.bgLight : 20;

    const shipColor = userData?.spaceship?.color || "text-cyan-400";
    const selectedShipId = userData?.spaceship?.modelId || userData?.spaceship?.id || "finalship";
    // Extract tailwind color class prefix for glowing effects (e.g. text-blue-400 -> blue)
    const glowColor = shipColor.includes('-') ? shipColor.split('-')[1] : 'cyan';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mt-8">
            {/* Left Side: Navigation Systems */}
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-xl text-cyan-500 uppercase tracking-[0.2em] font-bold border-b border-cyan-500/30 pb-2 mb-6 flex items-center gap-3">
                    <Activity size={20} /> Navigation Systems
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MENU_ITEMS.map((item, index) => (
                        <motion.button
                            key={item.id}
                            onClick={() => {
                                if ((item as any).href) {
                                    window.location.href = (item as any).href;
                                } else {
                                    onNavigate(item.id);
                                }
                            }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                ${item.bg} ${item.border} border rounded-2xl p-6
                                flex items-center gap-6 text-left
                                backdrop-blur-sm group relative overflow-hidden transition-all duration-300
                                hover:bg-black/60
                            `}
                        >
                            <div className={`p-4 rounded-xl bg-black/50 border ${item.border} ${item.color} shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300 overflow-hidden relative flex items-center justify-center`}>
                                {item.id === 'avatar' ? (
                                   <UserAvatar userData={userData} className="w-8 h-8 rounded-full border border-white/20" />
                                ) : item.id === 'flag' && userData?.flag ? (
                                   <div className="scale-125"><TinyFlag config={userData.flag} /></div>
                                ) : (
                                   <item.icon size={32} />
                                )}
                            </div>
                            <div className="z-10">
                                <h3 className={`text-xl font-bold uppercase tracking-wider ${item.color} drop-shadow-md`}>
                                    {item.title}
                                </h3>
                                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                                    {item.id === 'missions' ? 'View Active Assignments' : item.id === 'interior' ? 'Enter Cabin View' : item.id === 'solar' ? 'Open Star Map' : 'Access System'}
                                </p>
                            </div>
                            
                            {/* Decorative Corner */}
                            <div className={`absolute top-0 right-0 w-8 h-8 ${item.color.replace('text', 'bg').replace('400', '500')}/10 rounded-bl-3xl`} />
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Right Side: Pilot Status */}
            <div className="bg-black/40 border-l border-white/10 p-6 flex flex-col gap-8 rounded-r-3xl relative backdrop-blur-sm lg:min-h-[500px]">
                 {/* ID Card Header */}
                 <div className="border-b border-white/10 pb-4 text-center pb-6">
                     <h2 className="text-white/70 uppercase tracking-[0.3em] text-xs font-bold mb-1">Active Personnel</h2>
                     <div className="text-2xl font-bold text-white tracking-widest truncate mb-2">{truncateName(userData?.displayName || "Unknown Pilot")}</div>
                     <div className="flex justify-center gap-4 text-[10px] uppercase font-bold tracking-widest text-cyan-400/80">
                        <span>{currentRank.name}</span>
                        <span className="text-white/30"> | </span>
                        <span>{currentXP} XP</span>
                     </div>
                 </div>

                 {/* Visuals: Avatar & Ship */}
                 <div className="relative h-48 flex items-center justify-center">
                      {/* Avatar Bubble */}
                      <div className="absolute left-0 w-24 h-24 rounded-full border-2 border-purple-500/50 overflow-hidden bg-black shadow-[0_0_20px_rgba(168,85,247,0.3)] z-20">
                           <UserAvatar userData={userData} className="w-full h-full" />
                      </div>

                      {/* Connection Line */}
                      <div className="absolute h-px bg-gradient-to-r from-purple-500/50 to-cyan-500/50 w-full top-1/2 -z-0" />

                      {/* Ship Bubble */}
                      <div className="absolute right-0 w-24 h-24 rounded-full border-2 border-cyan-500/50 overflow-hidden bg-black flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] z-20">
                           <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity }}>
                                <img
                                    src={getAssetPath(resolveShipAssetPath(selectedShipId))}
                                    alt="Selected ship"
                                    className="w-14 h-14 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = getAssetPath("/images/collectibles/ships/starter/finalship.png");
                                    }}
                                />
                           </motion.div>
                      </div>
                 </div>

                 {/* Rank Section */}
                 <div className="flex-1 bg-white/5 rounded-xl p-6 border border-white/5 relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <div className="text-xs text-yellow-500 uppercase tracking-widest font-bold mb-1">Current Rank</div>
                                  <div className="text-xl font-bold text-white uppercase tracking-wider">{currentRank.name}</div>
                              </div>
                              {currentRank.image && (
                                <img src={getAssetPath(currentRank.image)} alt="Rank Badge" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
                              )}
                          </div>

                          {/* XP Progress */}
                          <div className="space-y-2">
                             <div className="flex justify-between text-xs font-mono text-gray-400">
                                 <span>{currentXP} XP</span>
                                 <span>{nextRank ? nextRank.minXP : "MAX"} XP</span>
                             </div>
                             <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                                 />
                             </div>
                             <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mt-2">{nextRank ? 'To Next Promotion' : 'Maximum Rank Achieved'}</p>
                          </div>
                      </div>

                      {/* Badge Display */}
                       <div className="mt-6 aspect-square w-full flex flex-col items-center justify-center relative overflow-hidden rounded-lg bg-black/20 border border-white/5">
                           {currentRank.image ? (
                                <div className="relative z-10 w-full h-full p-6 pb-8">
                                    <img src={getAssetPath(currentRank.image)} alt="Badge" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                                </div>
                           ) : (
                                <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white/20">
                                    <Award size={24} />
                                </div>
                           )}
                           <span className="absolute bottom-2 text-[10px] text-yellow-500/50 uppercase tracking-widest font-bold z-10">Current Designation</span>
                       </div>
                 </div>
            </div>
        </div>
    );
}

function ShipSettings({ userData, user, unlockedShipIds }: { userData: any, user: any, unlockedShipIds: Set<string> }) {
    const [loading, setLoading] = useState(false);
    const [liveUserData, setLiveUserData] = useState<UserData | null>(userData || null);
    const [shipName, setShipName] = useState("");
    const [selectedColor, setSelectedColor] = useState(SHIP_COLORS[0]);
    const [selectedShipId, setSelectedShipId] = useState("finalship");
    // const [selectedType, setSelectedType] = useState('scout'); // Removed Chassis Logic

    useEffect(() => {
        setLiveUserData(userData || null);
    }, [userData]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            setLiveUserData(snapshot.data() as UserData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const effectiveUserData = liveUserData || userData || null;

    useEffect(() => {
        if (effectiveUserData?.spaceship) {
            setShipName(sanitizeName(effectiveUserData.spaceship.name));
            setSelectedShipId(effectiveUserData.spaceship.id || effectiveUserData.spaceship.modelId || "finalship");
            const col = SHIP_COLORS.find(c => c.class === effectiveUserData.spaceship?.color) || SHIP_COLORS[0];
            setSelectedColor(col);
            // setSelectedType(userData.spaceship.type);
        }
    }, [effectiveUserData?.spaceship?.color, effectiveUserData?.spaceship?.id, effectiveUserData?.spaceship?.modelId, effectiveUserData?.spaceship?.name]);

    const visibleShipOptions = useMemo(() => {
        const builtInUnlocked = SHIP_OPTIONS.filter((option) => unlockedShipIds.has(option.id));
        const builtInIds = new Set<string>(builtInUnlocked.map((option) => option.id));
        const dynamicShopIds = Array.from(unlockedShipIds).filter((id) => !builtInIds.has(id));

        const toLabel = (shipId: string) =>
            String(shipId || "")
                .replace(/[-_]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, (char) => char.toUpperCase()) || "Ship";

        const dynamicOptions = dynamicShopIds.map((id) => ({
            id,
            name: toLabel(id),
            type: "scout" as const,
            assetPath: resolveShipAssetPath(id),
        }));

        return [...builtInUnlocked, ...dynamicOptions];
    }, [unlockedShipIds]);

    useEffect(() => {
        const currentShipId = effectiveUserData?.spaceship?.id || effectiveUserData?.spaceship?.modelId || "finalship";
        if (!unlockedShipIds.has(selectedShipId)) {
            if (unlockedShipIds.has(currentShipId)) {
                setSelectedShipId(currentShipId);
            } else if (unlockedShipIds.size > 0) {
                const firstUnlocked = visibleShipOptions[0];
                if (firstUnlocked) setSelectedShipId(firstUnlocked.id);
            } else {
                setSelectedShipId("finalship");
            }
        }
    }, [effectiveUserData?.spaceship?.id, effectiveUserData?.spaceship?.modelId, selectedShipId, unlockedShipIds, visibleShipOptions]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            const safeShipName = sanitizeName(shipName);
            const currentShipId = effectiveUserData?.spaceship?.id || effectiveUserData?.spaceship?.modelId || "finalship";
            const fallbackShipId = unlockedShipIds.has(currentShipId)
                ? currentShipId
                : (visibleShipOptions[0]?.id || "finalship");
            const safeShipId = unlockedShipIds.has(selectedShipId) ? selectedShipId : fallbackShipId;
            await updateDoc(userRef, {
                "spaceship.name": safeShipName,
                "spaceship.color": selectedColor.class,
                "spaceship.id": safeShipId,
                "spaceship.modelId": safeShipId,
                // "spaceship.type": selectedType
            });
            setShipName(safeShipName);
            alert("Ship specifications updated, Commander.");
        } catch (e) {
            console.error(e);
            alert("Error updating ship specs.");
        }
        setLoading(false);
    };

    // Fuel Mechanics
    // Base 500. Each level of "Fuel" upgrade adds 250 capacity.
    const fuelUpgradeLevel = effectiveUserData?.upgrades?.fuel || 0;
    const maxFuel = 500 + (fuelUpgradeLevel * 250);
    const currentFuel = effectiveUserData?.fuel !== undefined ? effectiveUserData.fuel : 500; // Default to Max/500 if not set (Migration)
    const fuelPercentage = Math.min((currentFuel / maxFuel) * 100, 100);
    const currentPlanetId = normalizePlanetId(effectiveUserData?.location || "earth") || "earth";
    const longRangeDestinationId = currentPlanetId === "neptune" ? "earth" : "neptune";
    const boosterLevel = Number(effectiveUserData?.upgrades?.boosters || 0);
    const hullLevel = Number(effectiveUserData?.upgrades?.hull || 0);
    const landerLevel = Number(effectiveUserData?.upgrades?.landers || 0);
    const boosterStats = getBoosterStats(boosterLevel);
    const landerStats = getLanderStats(landerLevel);
    const hullStats = getHullTierStats(hullLevel);
    const cargoUsed = getCurrentCargoUsed(effectiveUserData?.resources || {});
    const routePreview = getTravelComputationBetweenPlanets(currentPlanetId, longRangeDestinationId, boosterLevel);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
             {/* Left Column: Visualizer */}
             <div className="bg-black/50 border border-cyan-900/50 rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[500px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 to-transparent pointer-events-none" />
                <motion.div
                    className={`relative z-10 ${selectedColor.class}`}
                    animate={{ y: [-15, 15, -15], rotate: [0, 1, -1, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                    <img 
                        src={getAssetPath(resolveShipAssetPath(selectedShipId))}
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = getAssetPath('/images/collectibles/ships/starter/finalship.png');
                        }}
                        alt="Ship"
                        className="w-[320px] h-[320px] md:w-[560px] md:h-[560px] object-contain drop-shadow-[0_0_25px_currentColor]"
                    />
                </motion.div>

                <div className="mt-12 text-center z-10 w-full max-w-md">
                    <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-6">{truncateName(shipName || "Unknown Vessel")}</h2>
                    
                    {/* Fuel Gauge */}
                    <div className="bg-black/60 border border-cyan-900/50 rounded-xl p-4 w-full">
                        <div className="flex justify-between items-center text-xs uppercase font-bold tracking-widest mb-2">
                            <span className="text-cyan-500">Hyperfuel Reserves</span>
                            <span className="text-white">{Math.floor(currentFuel)} / {maxFuel} Units</span>
                        </div>
                        <div className="relative h-4 bg-cyan-950/50 rounded-full overflow-hidden border border-cyan-900">
                             <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out"
                                style={{ width: `${fuelPercentage}%` }}
                             />
                             {/* Ticks */}
                             <div className="absolute inset-0 flex justify-between px-2">
                                <div className="w-px h-full bg-black/20" />
                                <div className="w-px h-full bg-black/20" />
                                <div className="w-px h-full bg-black/20" />
                                <div className="w-px h-full bg-black/20" />
                             </div>
                        </div>
                        <div className="text-[10px] text-cyan-700/60 mt-1 font-mono text-center">FUEL CELLS ONLINE  |  POWERED BY XP</div>
                    </div>
                </div>

                <div className="absolute top-4 left-4 text-xs text-cyan-800 font-mono">
                    HULL INTEGRITY: 100%<br/>
                    SHIELDS: ONLINE
                </div>
            </div>

            {/* Right Column: Controls */}
            <div className="space-y-6">
                <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                    <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                        <Shield size={16} /> Ship Models
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {visibleShipOptions.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setSelectedShipId(opt.id)}
                                className={`p-3 rounded border flex items-center gap-3 transition-all ${selectedShipId === opt.id ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/40 border-cyan-900 hover:border-cyan-700'}`}
                            >
                                <img src={getAssetPath(resolveShipAssetPath(opt.id))} alt={opt.name} className="w-20 h-20 object-contain shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <span className={`block text-xs uppercase font-bold ${selectedShipId === opt.id ? 'text-white' : 'text-gray-500'}`}>{opt.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                    <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-2">Vessel Identification</label>
                    <input
                        type="text"
                        value={shipName}
                        onChange={(e) => setShipName(e.target.value.slice(0, NAME_MAX_LENGTH))}
                        maxLength={NAME_MAX_LENGTH}
                        className="w-full bg-black/50 border border-cyan-700 rounded p-3 text-white focus:outline-none focus:border-cyan-400 placeholder-cyan-800 transition-colors font-mono"
                        placeholder="Enter Ship Name"
                    />
                </div>

                <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                    <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                        <Palette size={16} /> Hull Nanocoating
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {SHIP_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => setSelectedColor(color)}
                                className={`p-3 rounded border flex items-center gap-3 transition-all ${selectedColor.name === color.name ? 'bg-cyan-500/20 border-cyan-400 scale-105' : 'bg-black/40 border-cyan-900 hover:border-cyan-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${color.bg} shadow-[0_0_5px_currentColor]`} />
                                <span className={`text-xs uppercase font-bold ${selectedColor.name === color.name ? 'text-white' : 'text-gray-500'}`}>{color.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* New Upgrades Section */}
                <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                    <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                        <Wrench size={16} /> System Upgrades
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <UpgradeSlot icon={Zap} label="Boosters" level={boosterLevel} active={boosterLevel > 0} />
                        <UpgradeSlot icon={Database} label="Fuel Tank" level={fuelUpgradeLevel} active={fuelUpgradeLevel > 0} />
                        <UpgradeSlot icon={Map} label="Landers" level={landerLevel} active={landerLevel > 0} />
                        <UpgradeSlot icon={Shield} label="Hull Plating" level={hullLevel} active={hullLevel > 0} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-cyan-900/50 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Travel Profile</div>
                            <div className="mt-2 text-sm font-bold text-white">{boosterStats.label}</div>
                            <div className="mt-1 text-xs text-cyan-300">{boosterStats.travelReductionPercent}% faster than baseline</div>
                            {routePreview ? (
                                <div className="mt-2 text-[11px] text-cyan-200/80">
                                    {currentPlanetId.toUpperCase()} to {longRangeDestinationId.toUpperCase()}: {formatTravelDuration(routePreview.adjustedMinutes)}
                                </div>
                            ) : null}
                        </div>
                        <div className="rounded-2xl border border-cyan-900/50 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Cargo Capacity</div>
                            <div className="mt-2 text-sm font-bold text-white">{cargoUsed} / {hullStats.cargoCapacity}</div>
                            <div className="mt-1 text-xs text-cyan-300">{hullStats.activeMachineLimit} active machines allowed</div>
                        </div>
                        <div className="rounded-2xl border border-cyan-900/50 bg-black/30 p-3">
                            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Surface Operations</div>
                            <div className="mt-2 text-sm font-bold text-white">{landerStats.label}</div>
                            <div className="mt-1 text-xs text-cyan-300">Landing {landerStats.landingTimeReductionPercent}% faster</div>
                            <div className="mt-1 text-[11px] text-cyan-200/80">Manual gather bonus +{landerStats.manualGatherBonus}</div>
                        </div>
                    </div>
                </div>

                <ShipUpgradeBlueprints userData={effectiveUserData} />

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${loading ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-cyan-600 hover:bg-cyan-500 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(8,145,178,0.4)]'}`}
                >
                    <Save size={20} />
                    {loading ? "Calibrating..." : "Save Configuration"}
                </button>
            </div>
        </div>
    );
}

function ShipUpgradeBlueprints({ userData }: { userData?: UserData | null }) {
    const { user } = useAuth();
    const [liveUserData, setLiveUserData] = useState<UserData | null>(userData || null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");

    useEffect(() => {
        setLiveUserData(userData || null);
    }, [userData]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            setLiveUserData(snapshot.data() as UserData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const effectiveUserData = liveUserData || userData || null;
    const resources = effectiveUserData?.resources || {};
    const cargoUsed = getCurrentCargoUsed(resources);
    const upgradeLevels = {
        boosters: Number(effectiveUserData?.upgrades?.boosters || 0),
        hull: Number(effectiveUserData?.upgrades?.hull || 0),
        landers: Number(effectiveUserData?.upgrades?.landers || 0),
    } as const;
    const currentHullStats = getHullTierStats(upgradeLevels.hull);
    const currentBoosterRoute = getTravelComputationBetweenPlanets("earth", "neptune", upgradeLevels.boosters);
    const currentLanderStats = getLanderStats(upgradeLevels.landers);

    const nextUpgradeRows = ["boosters", "hull", "landers"].map((family) => ({
        family,
        currentUpgrade: getCurrentShipUpgrade(family as "boosters" | "hull" | "landers", upgradeLevels[family as keyof typeof upgradeLevels]),
        nextUpgrade: getNextShipUpgrade(family as "boosters" | "hull" | "landers", upgradeLevels[family as keyof typeof upgradeLevels]),
        availability: canCraftShipUpgrade(family as "boosters" | "hull" | "landers", upgradeLevels[family as keyof typeof upgradeLevels], resources),
    }));

    const handleCraftUpgrade = async (family: "boosters" | "hull" | "landers") => {
        if (!user?.uid) {
            setNotice("You must be signed in to craft ship upgrades.");
            return;
        }

        setPendingAction(family);
        setNotice("");

        try {
            const userRef = doc(db, "users", user.uid);
            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const currentLevel = Number(latestUserData.upgrades?.[family] || 0);
                const nextUpgrade = getNextShipUpgrade(family, currentLevel);
                const availability = canCraftShipUpgrade(family, currentLevel, latestUserData.resources || {});

                if (!nextUpgrade) {
                    throw new Error("Upgrade family already maxed.");
                }

                if (!availability.ok) {
                    throw new Error(availability.reason || "Missing required materials.");
                }

                const nextResources = { ...(latestUserData.resources || {}) };
                nextUpgrade.costs.forEach((cost) => {
                    nextResources[cost.resourceId] = Math.max(0, Number(nextResources[cost.resourceId] || 0) - cost.quantity);
                    if (nextResources[cost.resourceId] <= 0) {
                        delete nextResources[cost.resourceId];
                    }
                });

                transaction.update(userRef, {
                    resources: nextResources,
                    [`upgrades.${family}`]: currentLevel + 1,
                });
            });

            const craftedUpgrade = getNextShipUpgrade(family, upgradeLevels[family]);
            setNotice(`${craftedUpgrade?.name || "Upgrade"} installed.`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Upgrade craft failed.");
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
            <div className="flex items-center justify-between gap-3 mb-4">
                <label className="block text-sm uppercase tracking-wider text-cyan-500 flex items-center gap-2">
                    <Wrench size={16} /> Upgrade Blueprints
                </label>
                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-700">Fabricator Online</span>
            </div>

            {notice ? (
                <div className="mb-4 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100">
                    {notice}
                </div>
            ) : null}

            <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-cyan-900/40 bg-black/25 p-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Current Travel</div>
                    <div className="mt-2 text-sm font-bold text-white">{currentBoosterRoute ? formatTravelDuration(currentBoosterRoute.adjustedMinutes) : "Unavailable"}</div>
                    <div className="mt-1 text-xs text-cyan-300">Earth to Neptune benchmark</div>
                </div>
                <div className="rounded-2xl border border-cyan-900/40 bg-black/25 p-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Current Cargo</div>
                    <div className="mt-2 text-sm font-bold text-white">{cargoUsed} / {currentHullStats.cargoCapacity}</div>
                    <div className="mt-1 text-xs text-cyan-300">{currentHullStats.activeMachineLimit} machines active</div>
                </div>
                <div className="rounded-2xl border border-cyan-900/40 bg-black/25 p-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-600">Current Lander</div>
                    <div className="mt-2 text-sm font-bold text-white">-{currentLanderStats.landingTimeReductionPercent}% landing time</div>
                    <div className="mt-1 text-xs text-cyan-300">Manual gather +{currentLanderStats.manualGatherBonus}</div>
                </div>
            </div>

            <div className="space-y-3">
                {nextUpgradeRows.map(({ family, currentUpgrade, nextUpgrade, availability }) => (
                    <div key={family} className="rounded-2xl border border-cyan-900/60 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-xs uppercase tracking-[0.25em] text-cyan-600">{family}</div>
                                <div className="text-white font-bold uppercase tracking-wide mt-1">{currentUpgrade?.name || "Offline"}</div>
                                <div className="text-xs text-cyan-700 mt-1">{currentUpgrade?.effect || "No blueprint loaded."}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-700">Next Tier</div>
                                <div className="text-sm font-bold text-cyan-200 mt-1">{nextUpgrade?.name || "Maxed"}</div>
                            </div>
                        </div>

                        {nextUpgrade ? (
                            <div className="mt-3 grid gap-2 md:grid-cols-[1.1fr,1fr]">
                                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-3 text-xs text-cyan-200">
                                    <div className="uppercase tracking-[0.25em] text-cyan-600 mb-1">Effect</div>
                                    {nextUpgrade.effect}
                                </div>
                                <div className="rounded-xl border border-cyan-900/40 bg-black/40 p-3 text-xs text-cyan-300">
                                    <div className="uppercase tracking-[0.25em] text-cyan-600 mb-1">Required Materials</div>
                                    {formatMachineCostLabel(nextUpgrade.costs)}
                                </div>
                            </div>
                        ) : null}

                        {nextUpgrade ? (
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {family === "boosters" ? (() => {
                                    const currentTravel = getTravelComputationBetweenPlanets("earth", "neptune", upgradeLevels.boosters);
                                    const nextTravel = getTravelComputationBetweenPlanets("earth", "neptune", upgradeLevels.boosters + 1);
                                    const currentBooster = getBoosterStats(upgradeLevels.boosters);
                                    const nextBooster = getBoosterStats(upgradeLevels.boosters + 1);
                                    return (
                                        <>
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Before vs After</div>
                                                <div>Earth to Neptune: {currentTravel ? formatTravelDuration(currentTravel.adjustedMinutes) : "N/A"} -> {nextTravel ? formatTravelDuration(nextTravel.adjustedMinutes) : "N/A"}</div>
                                            </div>
                                            <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Speed Gain</div>
                                                <div>{currentBooster.speedMultiplier.toFixed(2)}x -> {nextBooster.speedMultiplier.toFixed(2)}x</div>
                                            </div>
                                        </>
                                    );
                                })() : null}

                                {family === "hull" ? (() => {
                                    const nextHullStats = getHullTierStats(upgradeLevels.hull + 1);
                                    return (
                                        <>
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Cargo Capacity</div>
                                                <div>{currentHullStats.cargoCapacity} -> {nextHullStats.cargoCapacity}</div>
                                            </div>
                                            <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Machine Limit</div>
                                                <div>{currentHullStats.activeMachineLimit} -> {nextHullStats.activeMachineLimit}</div>
                                            </div>
                                        </>
                                    );
                                })() : null}

                                {family === "landers" ? (() => {
                                    const nextLanderStats = getLanderStats(upgradeLevels.landers + 1);
                                    return (
                                        <>
                                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Landing Speed</div>
                                                <div>-{currentLanderStats.landingTimeReductionPercent}% -> -{nextLanderStats.landingTimeReductionPercent}%</div>
                                            </div>
                                            <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-3 text-xs text-emerald-100">
                                                <div className="uppercase tracking-[0.25em] text-emerald-300/80 mb-1">Manual Gather</div>
                                                <div>+{currentLanderStats.manualGatherBonus} -> +{nextLanderStats.manualGatherBonus}</div>
                                            </div>
                                        </>
                                    );
                                })() : null}
                            </div>
                        ) : null}

                        {nextUpgrade ? (
                            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-xs text-cyan-300/80">
                                    {availability.ok ? "Materials ready for install." : availability.reason}
                                </div>
                                <button
                                    onClick={() => handleCraftUpgrade(family as "boosters" | "hull" | "landers")}
                                    disabled={!availability.ok || Boolean(pendingAction)}
                                    className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                >
                                    {pendingAction === family ? "Installing..." : "Craft Upgrade"}
                                </button>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function InventoryView({ userData, user }: { userData?: UserData | null; user?: any | null }) {
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");
    const [liveUserData, setLiveUserData] = useState<UserData | null>(userData || null);

    useEffect(() => {
        setLiveUserData(userData || null);
    }, [userData]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            setLiveUserData(snapshot.data() as UserData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const effectiveUserData = liveUserData || userData || null;
    const currentPlanetId = normalizePlanetId(effectiveUserData?.location || "earth") || "earth";
    const currentPlanetResources = useMemo(() => getPlanetResources(currentPlanetId), [currentPlanetId]);
    const hullStats = useMemo(() => getHullTierStats(effectiveUserData?.upgrades?.hull), [effectiveUserData?.upgrades?.hull]);
    const resources = effectiveUserData?.resources || {};
    const cargoUsed = useMemo(() => getCurrentCargoUsed(resources), [resources]);
    const cargoRemaining = Math.max(0, hullStats.cargoCapacity - cargoUsed);
    const placedMachines = useMemo(() => Object.values(effectiveUserData?.placedMachines || {}), [effectiveUserData?.placedMachines]);
    const activeMachineCount = placedMachines.length;
    const ownedMachines = effectiveUserData?.ownedMachines || {};
    const starterMiner = getMachineDefinition(STARTER_MINER_ID);
    const basicMachineRows = useMemo(() => (
        MACHINE_CATALOG
            .filter((machine) => machine.tier === 1)
            .map((machine) => {
                const totalOwned = Number(ownedMachines[machine.id] || 0);
                const deployedCount = placedMachines.filter((placedMachine) => placedMachine.machineId === machine.id).length;
                const availableCount = getAvailableMachineCount(machine.id, ownedMachines, effectiveUserData?.placedMachines);
                const targetResource = currentPlanetResources.find((resource) => resource.machineFamily === machine.family);

                return {
                    machine,
                    totalOwned,
                    deployedCount,
                    availableCount,
                    targetResource,
                };
            })
    ), [currentPlanetResources, effectiveUserData?.placedMachines, ownedMachines, placedMachines]);
    const craftableMachineRows = useMemo(() => (
        MACHINE_CATALOG
            .filter((machine) => machine.id !== STARTER_MINER_ID)
            .map((machine) => ({
                machine,
                totalOwned: Number(ownedMachines[machine.id] || 0),
                availability: canCraftMachine(machine.id, resources, ownedMachines, effectiveUserData?.placedMachines),
                previousMachine: machine.previousMachineId ? getMachineDefinition(machine.previousMachineId) : null,
            }))
    ), [effectiveUserData?.placedMachines, ownedMachines, resources]);
    const displayedResources = useMemo(() => {
        const interestingResourceIds = Array.from(new Set([
            ...Object.keys(resources),
            ...currentPlanetResources.map((resource) => resource.resourceId),
        ]));

        return interestingResourceIds
            .map((resourceId) => {
                const definition = getResourceDefinition(resourceId);
                return {
                    resourceId,
                    definition,
                    quantity: Number(resources[resourceId] || 0),
                };
            })
            .filter((entry) => Boolean(entry.definition))
            .sort((left, right) => right.quantity - left.quantity);
    }, [currentPlanetResources, resources]);
    const placedMachineSnapshots = useMemo(() => {
        return placedMachines
            .map((placedMachine) => ({
                placedMachine,
                accrual: getMachineAccrualSnapshot(placedMachine),
                targetResource: getResourceDefinition(placedMachine.resourceId),
            }))
            .sort((left, right) => right.placedMachine.placedAt - left.placedMachine.placedAt);
    }, [placedMachines]);

    const runWithFeedback = async (actionKey: string, action: () => Promise<string>) => {
        setPendingAction(actionKey);
        setNotice("");
        try {
            const nextNotice = await action();
            setNotice(nextNotice);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Action failed.";
            setNotice(message);
        } finally {
            setPendingAction(null);
        }
    };

    const handleStarterMinerPurchase = async () => {
        if (!user?.uid || !starterMiner?.starterPriceCredits) {
            throw new Error("Starter miner store is offline.");
        }

        await runWithFeedback("buy-starter-miner", async () => {
            const userRef = doc(db, "users", user.uid);

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const currentCredits = Number(latestUserData.galacticCredits || 0);
                if (currentCredits < starterMiner.starterPriceCredits) {
                    throw new Error(`You need ${starterMiner.starterPriceCredits} credits for the first miner.`);
                }

                const nextOwnedMachines = {
                    ...(latestUserData.ownedMachines || {}),
                    [STARTER_MINER_ID]: Number(latestUserData.ownedMachines?.[STARTER_MINER_ID] || 0) + 1,
                };

                transaction.update(userRef, {
                    galacticCredits: increment(-starterMiner.starterPriceCredits),
                    ownedMachines: nextOwnedMachines,
                });
            });

            return "Starter miner acquired. Deploy it to the current planet when ready.";
        });
    };

    const handleCraftMachine = async (machineId: string) => {
        if (!user?.uid) {
            throw new Error("You must be signed in to craft a machine.");
        }

        await runWithFeedback(`craft-${machineId}`, async () => {
            const machine = getMachineDefinition(machineId);
            if (!machine) {
                throw new Error("Machine blueprint not found.");
            }

            const userRef = doc(db, "users", user.uid);

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const nextResources = { ...(latestUserData.resources || {}) };
                const nextOwnedMachines = { ...(latestUserData.ownedMachines || {}) };
                const availability = canCraftMachine(machineId, nextResources, nextOwnedMachines, latestUserData.placedMachines);

                if (!availability.ok) {
                    throw new Error(availability.reason || "Missing fabrication requirements.");
                }

                machine.costs.forEach((cost) => {
                    nextResources[cost.resourceId] = Math.max(0, Number(nextResources[cost.resourceId] || 0) - cost.quantity);
                    if (nextResources[cost.resourceId] <= 0) {
                        delete nextResources[cost.resourceId];
                    }
                });

                if (machine.previousMachineId) {
                    nextOwnedMachines[machine.previousMachineId] = Math.max(0, Number(nextOwnedMachines[machine.previousMachineId] || 0) - 1);
                    if (nextOwnedMachines[machine.previousMachineId] <= 0) {
                        delete nextOwnedMachines[machine.previousMachineId];
                    }
                }

                nextOwnedMachines[machine.id] = Number(nextOwnedMachines[machine.id] || 0) + 1;

                transaction.update(userRef, {
                    resources: nextResources,
                    ownedMachines: nextOwnedMachines,
                });
            });

            return `${machine.name} fabricated and added to cargo.`;
        });
    };

    const handleDeployMachine = async (machineId: string) => {
        if (!user?.uid) {
            throw new Error("You must be signed in to deploy a machine.");
        }

        await runWithFeedback(`deploy-${machineId}`, async () => {
            const definition = getMachineDefinition(machineId);
            if (!definition) {
                throw new Error("Machine blueprint not found.");
            }

            const userRef = doc(db, "users", user.uid);
            let deployedResourceName = "";
            let deployedPlanetName = currentPlanetId;

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const latestPlanetId = normalizePlanetId(latestUserData.location || "earth") || "earth";
                const nextHullStats = getHullTierStats(latestUserData.upgrades?.hull);
                const nextPlacedMachines = { ...(latestUserData.placedMachines || {}) };
                const nextOwnedMachines = latestUserData.ownedMachines || {};
                const deployedCount = Object.values(nextPlacedMachines).filter((placedMachine) => placedMachine.machineId === machineId).length;
                const ownedCount = Number(nextOwnedMachines[machineId] || 0);

                if (Object.keys(nextPlacedMachines).length >= nextHullStats.activeMachineLimit) {
                    throw new Error(`Hull limit reached. Upgrade hull plating for more than ${nextHullStats.activeMachineLimit} active machines.`);
                }

                if (ownedCount - deployedCount <= 0) {
                    throw new Error("No spare machine of that type is available to deploy.");
                }

                const targetResource = getPlanetResources(latestPlanetId).find((resource) => resource.machineFamily === definition.family);
                if (!targetResource) {
                    throw new Error("This planet does not support that machine family.");
                }

                const placedAt = Date.now();
                const placedMachineId = buildPlacedMachineId(machineId, latestPlanetId, targetResource.resourceId);
                nextPlacedMachines[placedMachineId] = {
                    id: placedMachineId,
                    machineId,
                    family: definition.family,
                    tier: definition.tier,
                    planetId: latestPlanetId,
                    resourceId: targetResource.resourceId,
                    category: targetResource.category,
                    placedAt,
                    lastCollectedAt: placedAt,
                } satisfies PlacedMachine;

                deployedResourceName = targetResource.resourceName;
                deployedPlanetName = latestPlanetId;
                transaction.update(userRef, { placedMachines: nextPlacedMachines });
            });

            return `${definition.name} deployed to ${deployedPlanetName} for ${deployedResourceName}.`;
        });
    };

    const handlePackMachine = async (placedMachineId: string) => {
        if (!user?.uid) {
            throw new Error("You must be signed in to pack up a machine.");
        }

        await runWithFeedback(`pack-${placedMachineId}`, async () => {
            const userRef = doc(db, "users", user.uid);
            let machineName = "Machine";

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const nextPlacedMachines = { ...(latestUserData.placedMachines || {}) };
                const targetMachine = nextPlacedMachines[placedMachineId];
                if (!targetMachine) {
                    throw new Error("Machine is no longer deployed.");
                }

                machineName = getMachineDefinition(targetMachine.machineId)?.name || machineName;
                delete nextPlacedMachines[placedMachineId];
                transaction.update(userRef, { placedMachines: nextPlacedMachines });
            });

            return `${machineName} packed back into cargo.`;
        });
    };

    const handleCollectMachine = async (placedMachineId: string) => {
        if (!user?.uid) {
            throw new Error("You must be signed in to collect resources.");
        }

        await runWithFeedback(`collect-${placedMachineId}`, async () => {
            const userRef = doc(db, "users", user.uid);
            let collectedUnits = 0;
            let resourceLabel = "resource";

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) {
                    throw new Error("Student profile not found.");
                }

                const latestUserData = snapshot.data() as UserData;
                const nextPlacedMachines = { ...(latestUserData.placedMachines || {}) };
                const nextResources = { ...(latestUserData.resources || {}) };
                const targetMachine = nextPlacedMachines[placedMachineId];
                if (!targetMachine) {
                    throw new Error("Machine is no longer deployed.");
                }

                const accrual = getMachineAccrualSnapshot(targetMachine);
                if (!accrual || accrual.unitsReady <= 0) {
                    throw new Error("No collected output is ready yet.");
                }

                const nextHullStats = getHullTierStats(latestUserData.upgrades?.hull);
                const usedCapacity = getCurrentCargoUsed(nextResources);
                const remainingCapacity = Math.max(0, nextHullStats.cargoCapacity - usedCapacity);
                if (remainingCapacity <= 0) {
                    throw new Error("Cargo hold is full. Upgrade hull plating before collecting more output.");
                }

                collectedUnits = Math.min(accrual.unitsReady, remainingCapacity);
                resourceLabel = getResourceDefinition(targetMachine.resourceId)?.name || targetMachine.resourceId;
                nextResources[targetMachine.resourceId] = Number(nextResources[targetMachine.resourceId] || 0) + collectedUnits;

                const lastCollectedAt = Math.max(targetMachine.lastCollectedAt || targetMachine.placedAt, targetMachine.placedAt);
                nextPlacedMachines[placedMachineId] = {
                    ...targetMachine,
                    lastCollectedAt: lastCollectedAt + Math.floor(getMachineUnitDurationMs(targetMachine.machineId) * collectedUnits),
                };

                transaction.update(userRef, {
                    resources: nextResources,
                    placedMachines: nextPlacedMachines,
                });
            });

            return `Collected ${collectedUnits} ${resourceLabel}.`;
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="border border-amber-500/30 bg-black/40 rounded-3xl p-8">
                <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-amber-500/30 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Database className="text-amber-400" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-amber-400 uppercase tracking-widest">Cargo Hold</h2>
                            <p className="text-xs text-amber-200/70 uppercase tracking-[0.3em] mt-1">Automation, storage, and shipyard prep</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Current Planet</div>
                        <div className="text-lg font-bold text-white uppercase">{currentPlanetId}</div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-amber-900/60 bg-amber-950/15 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-amber-600">Cargo Capacity</div>
                        <div className="mt-2 text-3xl font-bold text-white">{cargoUsed} / {hullStats.cargoCapacity}</div>
                        <progress
                            value={Math.min(100, (cargoUsed / Math.max(hullStats.cargoCapacity, 1)) * 100)}
                            max={100}
                            className="mt-3 h-3 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-black/50 [&::-webkit-progress-value]:bg-amber-400"
                        />
                        <div className="mt-3 text-xs text-amber-200/70">Remaining capacity: {cargoRemaining} units</div>
                    </div>

                    <div className="rounded-2xl border border-cyan-900/60 bg-cyan-950/15 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-600">Hull Machine Limit</div>
                        <div className="mt-2 text-3xl font-bold text-white">{activeMachineCount} / {hullStats.activeMachineLimit}</div>
                        <div className="mt-3 text-xs text-cyan-200/70">{hullStats.label} supports {hullStats.upgradeSlots} ship upgrade slot(s).</div>
                    </div>

                    <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/15 p-4">
                        <div className="text-xs uppercase tracking-[0.3em] text-emerald-600">Credits Available</div>
                        <div className="mt-2 text-3xl font-bold text-white">{Number(effectiveUserData?.galacticCredits || 0)}</div>
                        <div className="mt-3 text-xs text-emerald-200/70">Starter miner store price: {starterMiner?.starterPriceCredits || 0} credits</div>
                    </div>
                </div>

                {notice ? (
                    <div className="mt-4 rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                        {notice}
                    </div>
                ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                <div className="space-y-6">
                    <div className="border border-cyan-900/40 bg-black/40 rounded-3xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-bold text-cyan-200 uppercase tracking-widest">Planet Resource Scan</h3>
                                <p className="text-xs text-cyan-700 uppercase tracking-[0.25em] mt-1">Current location target list</p>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-700">Future class discovery hook</span>
                        </div>

                        <div className="grid md:grid-cols-3 gap-3">
                            {currentPlanetResources.map((resource) => {
                                const definition = getResourceDefinition(resource.resourceId);
                                return (
                                    <div key={resource.resourceId} className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-4">
                                        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-700">{resource.category}</div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <div>
                                                <div className={`text-lg font-bold ${definition?.accentClass || "text-white"}`}>{resource.resourceName}</div>
                                                <div className="text-xs text-cyan-500 mt-1">{MACHINE_FAMILY_LABELS[resource.machineFamily]}</div>
                                            </div>
                                            <div className="rounded-xl border border-cyan-800/60 px-3 py-2 text-xs font-bold text-cyan-100 bg-black/30">
                                                {definition?.symbol || "--"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border border-amber-900/40 bg-black/40 rounded-3xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-bold text-amber-200 uppercase tracking-widest">Machine Bay</h3>
                                <p className="text-xs text-amber-700 uppercase tracking-[0.25em] mt-1">Buy the first miner, then deploy what you own</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {basicMachineRows.map(({ machine, totalOwned, deployedCount, availableCount, targetResource }) => {
                                const isStarterMiner = machine.id === STARTER_MINER_ID;
                                const deployDisabled = availableCount <= 0 || !targetResource || activeMachineCount >= hullStats.activeMachineLimit || Boolean(pendingAction);
                                return (
                                    <div key={machine.id} className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-4">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-lg border border-amber-800/60 px-2 py-1 text-xs font-bold text-amber-100 bg-black/30">{machine.symbol}</span>
                                                    <h4 className="text-base font-bold text-white uppercase tracking-wide">{machine.name}</h4>
                                                </div>
                                                <div className="text-xs text-amber-500 mt-2">{machine.description}</div>
                                                <div className="text-xs text-amber-200/80 mt-2">Output: {machine.dailyOutput} unit(s) per day</div>
                                                <div className="text-xs text-amber-200/80 mt-1">Owned: {totalOwned} | Deployed: {deployedCount} | Ready to deploy: {availableCount}</div>
                                                <div className="text-xs text-amber-300/70 mt-1">Craft costs: {formatMachineCostLabel(machine.costs)}</div>
                                            </div>

                                            <div className="flex flex-col gap-2 min-w-[180px]">
                                                {isStarterMiner && totalOwned === 0 ? (
                                                    <button
                                                        onClick={handleStarterMinerPurchase}
                                                        disabled={Boolean(pendingAction)}
                                                        className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                                    >
                                                        {pendingAction === "buy-starter-miner" ? "Acquiring..." : `Buy First Miner (${machine.starterPriceCredits} cr)`}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeployMachine(machine.id)}
                                                        disabled={deployDisabled}
                                                        className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-amber-400 text-black hover:bg-amber-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                                    >
                                                        {pendingAction === `deploy-${machine.id}` ? "Deploying..." : "Deploy To Current Planet"}
                                                    </button>
                                                )}

                                                <div className="rounded-xl border border-amber-900/50 bg-black/30 px-3 py-2 text-xs text-amber-200/80">
                                                    {targetResource
                                                        ? `Target: ${targetResource.resourceName}`
                                                        : "This planet has no matching resource for this machine."}
                                                </div>

                                                {!isStarterMiner ? (
                                                    <div className="text-[10px] uppercase tracking-[0.25em] text-amber-700">Crafting unlock comes next</div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border border-purple-900/40 bg-black/40 rounded-3xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                            <div>
                                <h3 className="text-lg font-bold text-purple-200 uppercase tracking-widest">Machine Fabricator</h3>
                                <p className="text-xs text-purple-700 uppercase tracking-[0.25em] mt-1">Craft extractor, harvester, and advanced machine tiers</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {craftableMachineRows.map(({ machine, totalOwned, availability, previousMachine }) => (
                                <div key={`craft-${machine.id}`} className="rounded-2xl border border-purple-900/50 bg-purple-950/10 p-4">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-lg border border-purple-800/60 px-2 py-1 text-xs font-bold text-purple-100 bg-black/30">{machine.symbol}</span>
                                                <h4 className="text-base font-bold text-white uppercase tracking-wide">{machine.name}</h4>
                                            </div>
                                            <div className="text-xs text-purple-500 mt-2">{machine.description}</div>
                                            <div className="text-xs text-purple-200/80 mt-2">Output: {machine.dailyOutput} unit(s) per day</div>
                                            <div className="text-xs text-purple-200/80 mt-1">Owned in cargo: {totalOwned}</div>
                                            <div className="text-xs text-purple-300/80 mt-1">Resource costs: {formatMachineCostLabel(machine.costs)}</div>
                                            {previousMachine ? (
                                                <div className="text-xs text-purple-300/80 mt-1">Consumes one spare {previousMachine.name}</div>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-col gap-2 min-w-[220px]">
                                            <button
                                                onClick={() => handleCraftMachine(machine.id)}
                                                disabled={!availability.ok || Boolean(pendingAction)}
                                                className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-purple-400 text-black hover:bg-purple-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                            >
                                                {pendingAction === `craft-${machine.id}` ? "Fabricating..." : "Craft Machine"}
                                            </button>
                                            <div className="rounded-xl border border-purple-900/50 bg-black/30 px-3 py-2 text-xs text-purple-200/80">
                                                {availability.ok ? "Ready to fabricate." : availability.reason}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border border-cyan-900/40 bg-black/40 rounded-3xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-cyan-200 uppercase tracking-widest">Active Placements</h3>
                                <p className="text-xs text-cyan-700 uppercase tracking-[0.25em] mt-1">Collect output or pack machines up</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {placedMachineSnapshots.length === 0 ? (
                                <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-4 text-sm text-cyan-500">
                                    No machines deployed yet. Buy the starter miner and send it to work.
                                </div>
                            ) : placedMachineSnapshots.map(({ placedMachine, accrual, targetResource }) => {
                                const definition = getMachineDefinition(placedMachine.machineId);
                                const progressPercent = accrual?.nextUnitProgressPercent || 0;
                                const collectDisabled = !accrual || accrual.unitsReady <= 0 || Boolean(pendingAction);
                                return (
                                    <div key={placedMachine.id} className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-white uppercase tracking-wide">{definition?.name || placedMachine.machineId}</div>
                                                <div className="text-xs text-cyan-500 mt-1">{placedMachine.planetId} | {targetResource?.name || placedMachine.resourceId}</div>
                                                <div className="text-xs text-cyan-300/80 mt-2">Ready output: {accrual?.unitsReady || 0} unit(s)</div>
                                            </div>
                                            <div className="rounded-xl border border-cyan-800/50 px-3 py-2 text-xs text-cyan-100 bg-black/30">
                                                {definition?.symbol || "--"}
                                            </div>
                                        </div>

                                        <progress
                                            value={progressPercent}
                                            max={100}
                                            className="mt-3 h-2 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-black/40 [&::-webkit-progress-value]:bg-cyan-400"
                                        />

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => handleCollectMachine(placedMachine.id)}
                                                disabled={collectDisabled}
                                                className="flex-1 rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                            >
                                                {pendingAction === `collect-${placedMachine.id}` ? "Collecting..." : "Collect"}
                                            </button>
                                            <button
                                                onClick={() => handlePackMachine(placedMachine.id)}
                                                disabled={Boolean(pendingAction)}
                                                className="flex-1 rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide border border-cyan-700/50 text-cyan-200 hover:bg-cyan-900/30 disabled:bg-gray-900 disabled:text-gray-500 transition-colors"
                                            >
                                                {pendingAction === `pack-${placedMachine.id}` ? "Packing..." : "Pack Up"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border border-emerald-900/40 bg-black/40 rounded-3xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-emerald-200 uppercase tracking-widest">Resource Ledger</h3>
                                <p className="text-xs text-emerald-700 uppercase tracking-[0.25em] mt-1">Stored cargo and current planet targets</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {displayedResources.length === 0 ? (
                                <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-4 text-sm text-emerald-500">
                                    No stored resources yet. Deploy a machine and come back to collect.
                                </div>
                            ) : displayedResources.map(({ resourceId, definition, quantity }) => (
                                <div key={resourceId} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 px-4 py-3">
                                    <div>
                                        <div className={`font-bold ${definition?.accentClass || "text-white"}`}>{definition?.name || resourceId}</div>
                                        <div className="text-xs text-emerald-600 uppercase tracking-[0.25em] mt-1">{definition?.category || "unknown"}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">{quantity}</div>
                                        <div className="text-xs text-emerald-600 uppercase tracking-[0.25em]">{definition?.symbol || "--"}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Flag Designer ---

const FLAG_POLES = [
    { id: 'silver', name: 'Titanium', color: '#cbd5e1' },
    { id: 'gold', name: 'Gold Ultima', color: '#eab308' },
    { id: 'wood', name: 'Ancient Oak', color: '#854d0e' },
    { id: 'black', name: 'Carbon Fiber', color: '#262626' },
];

const FLAG_PATTERNS = [
    { id: 'solid', name: 'Solid Standard' },
    { id: 'stripe-h', name: 'Horizon Stripe' },
    { id: 'stripe-v', name: 'Vertical Split' },
    { id: 'cross', name: 'Solar Cross' },
    { id: 'checkered', name: 'Battle Checker' },
    { id: 'circle', name: 'Core Sun' },
];

const FLAG_COLORS = [
    { id: 'red', hex: '#ef4444' },
    { id: 'blue', hex: '#3b82f6' },
    { id: 'green', hex: '#22c55e' },
    { id: 'yellow', hex: '#eab308' },
    { id: 'purple', hex: '#a855f7' },
    { id: 'black', hex: '#171717' },
    { id: 'white', hex: '#f8fafc' },
    { id: 'orange', hex: '#f97316' },
];

function FlagDesigner() {
    const { userData, user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    const [pole, setPole] = useState("silver");
    const [pattern, setPattern] = useState("solid");
    const [primaryColor, setPrimaryColor] = useState("blue");
    const [secondaryColor, setSecondaryColor] = useState("white");
    const [shape, setShape] = useState("rectangle");

    useEffect(() => {
        if (userData?.flag) {
            setPole(userData.flag.pole || "silver");
            setPattern(userData.flag.pattern || "solid");
            setPrimaryColor(userData.flag.primaryColor || "blue");
            setSecondaryColor(userData.flag.secondaryColor || "white");
            setShape(userData.flag.shape || "rectangle");
        }
    }, [userData]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                flag: { pole, pattern, primaryColor, secondaryColor, shape }
            });
            alert("Flag constructed successfully!");
        } catch (e) {
            console.error(e);
            alert("Error saving flag.");
        }
        setLoading(false);
    };

    const getColor = (id: string) => FLAG_COLORS.find(c => c.id === id)?.hex || '#3b82f6';

    const renderFlagContent = () => {
        const c1 = getColor(primaryColor);
        const c2 = getColor(secondaryColor);

        switch (pattern) {
            case 'solid': return <rect x="0" y="0" width="200" height="120" fill={c1} />;
            case 'stripe-h': return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="0" y="40" width="200" height="40" fill={c2} />
                </>
            );
            case 'stripe-v': return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="66" y="0" width="66" height="120" fill={c2} />
                </>
            );
            case 'cross': return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="50" y="0" width="30" height="120" fill={c2} />
                    <rect x="0" y="45" width="200" height="30" fill={c2} />
                </>
            );
            case 'circle': return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <circle cx="100" cy="60" r="35" fill={c2} />
                </>
            );
            case 'checkered': return (
                <>
                    <rect x="0" y="0" width="100" height="60" fill={c1} />
                    <rect x="100" y="0" width="100" height="60" fill={c2} />
                    <rect x="0" y="60" width="100" height="60" fill={c2} />
                    <rect x="100" y="60" width="100" height="60" fill={c1} />
                </>
            );
            default: return <rect x="0" y="0" width="200" height="120" fill={c1} />;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Visualizer */}
            <div className="bg-black/50 border border-red-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 to-transparent pointer-events-none" />
                 
                 <div className="relative z-10 scale-150">
                    <svg width="220" height="300" viewBox="0 0 220 300">
                        {/* Pole */}
                        <rect x="10" y="20" width="10" height="280" rx="5" fill={FLAG_POLES.find(p => p.id === pole)?.color} />
                        
                        {/* Flag Clip Path Container */}
                        <g transform="translate(20, 30)">
                             {/* Shadows/Waves overlay */}
                             <defs>
                                <clipPath id="flagShape">
                                    {shape === 'rectangle' && <rect x="0" y="0" width="200" height="120" />}
                                    {shape === 'pennant' && <polygon points="0,0 200,60 0,120" />}
                                    {shape === 'triangle' && <polygon points="0,0 200,0 100,120 0,0" />} 
                                    {shape === 'swallowtail' && <polygon points="0,0 200,0 200,120 100,60 0,120" />} 
                                </clipPath>
                             </defs>
                             
                             <g clipPath="url(#flagShape)">
                                 {renderFlagContent()}
                                 {/* Fabric Ripple Effect */}
                                 <rect x="0" y="0" width="200" height="120" fill="url(#ripple)" opacity="0.3" style={{ mixBlendMode: 'multiply' }} />
                             </g>
                        </g>

                        {/* Top Knob */}
                        <circle cx="15" cy="20" r="8" fill={FLAG_POLES.find(p => p.id === pole)?.color} stroke="#000" strokeWidth="2" />
                    </svg>
                 </div>

                 <div className="mt-12 text-center z-10">
                    <h2 className="text-xl font-bold text-red-500 tracking-widest uppercase">Planetary Beacon</h2>
                 </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
                <div className="bg-red-950/20 p-6 rounded-xl border border-red-500/20 max-h-[600px] overflow-y-auto custom-scrollbar">
                     <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        <Flag size={20} className="text-red-500" /> Fabricator
                     </h3>

                     {/* Pole Selector */}
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Pole Material</label>
                        <div className="flex gap-2">
                             {FLAG_POLES.map(p => (
                                 <button
                                    key={p.id}
                                    onClick={() => setPole(p.id)}
                                    className={`flex-1 p-2 rounded text-xs uppercase font-bold border transition-all ${pole === p.id ? 'bg-red-500 text-black border-red-400' : 'bg-black/40 border-red-900/50 text-gray-500 hover:text-red-400'}`}
                                 >
                                    {p.name}
                                 </button>
                             ))}
                        </div>
                     </div>

                     {/* Main Color */}
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Primary Color</label>
                        <div className="grid grid-cols-4 gap-2">
                             {FLAG_COLORS.map(c => (
                                 <button
                                     key={`p-${c.id}`}
                                     onClick={() => setPrimaryColor(c.id)}
                                     className={`h-10 rounded border transition-all ${primaryColor === c.id ? 'scale-110 border-white ring-2 ring-red-500 ring-offset-2 ring-offset-black' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                     style={{ backgroundColor: c.hex }}
                                 />
                             ))}
                        </div>
                     </div>

                     {/* Secondary Color */}
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Secondary Color</label>
                        <div className="grid grid-cols-4 gap-2">
                             {FLAG_COLORS.map(c => (
                                 <button
                                     key={`s-${c.id}`}
                                     onClick={() => setSecondaryColor(c.id)}
                                     className={`h-10 rounded border transition-all ${secondaryColor === c.id ? 'scale-110 border-white ring-2 ring-red-500 ring-offset-2 ring-offset-black' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                     style={{ backgroundColor: c.hex }}
                                 />
                             ))}
                        </div>
                     </div>

                     {/* Pattern */}
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Pattern</label>
                        <div className="grid grid-cols-2 gap-2">
                             {FLAG_PATTERNS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPattern(p.id)}
                                    className={`p-3 rounded border text-left text-xs uppercase font-bold transition-all ${pattern === p.id ? 'bg-red-500/20 border-red-400 text-white' : 'bg-black/30 border-red-900/30 text-gray-500 hover:bg-red-900/20'}`}
                                >
                                    {p.name}
                                </button>
                             ))}
                        </div>
                     </div>

                     {/* Shape */}
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Banner Shape</label>
                        <div className="flex gap-2">
                             {['rectangle', 'pennant', 'check', 'swallowtail'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setShape(s)}
                                    className={`flex-1 p-2 rounded border text-[10px] uppercase font-bold transition-all ${shape === s ? 'bg-white text-black' : 'bg-black/50 border-white/20 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {s === 'swallowtail' ? 'Tail' : s}
                                </button>
                             ))}
                        </div>
                     </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${loading ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-500 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(220,38,38,0.4)]'}`}
                >
                    <Save size={20} />
                    {loading ? "Forging..." : "Fabricate Flag"}
                </button>
            </div>
        </div>
    );
}

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

// --- Main Component ---

export default function SettingsPage() {
    const { userData, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [view, setView] = useState<'cockpit' | 'ship' | 'inventory' | 'flag'>('cockpit');
    const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);
    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
    const SHIP_XP_UNLOCK_RULES = useMemo(() => getXpUnlockRules(unlockConfig.ships), [unlockConfig.ships]);
    const shipCatalogIds = useMemo(() => new Set<string>(SHIP_OPTIONS.map((ship) => ship.id)), []);
    const STARTER_SHIP_IDS = useMemo(() => {
        const starters = unlockConfig.starters?.ships?.length ? unlockConfig.starters.ships : ["finalship"];
        const resolved = starters.map((id) => resolveRuntimeUnlockId(id, unlockConfig.idAliases, shipCatalogIds));
        return Array.from(new Set<string>(resolved.filter(Boolean)));
    }, [unlockConfig.starters?.ships, unlockConfig.idAliases, shipCatalogIds]);
    const [planetShipUnlocks, setPlanetShipUnlocks] = useState<Record<string, Record<string, number>>>({});
    const [planetShipUnlockConfiguredAt, setPlanetShipUnlockConfiguredAt] = useState<Record<string, Record<string, number>>>({});
    const [xpUnlockProgress, setXpUnlockProgress] = useState<XpUnlockProgressMap>(() => normalizeXpUnlockProgressMap(userData?.xpUnlockProgress || {}));
    const [unlockedShipIds, setUnlockedShipIds] = useState<Set<string>>(new Set(STARTER_SHIP_IDS));

    useEffect(() => {
        setXpUnlockProgress(normalizeXpUnlockProgressMap(userData?.xpUnlockProgress || {}));
    }, [userData?.xpUnlockProgress]);

    useEffect(() => {
        const requestedView = String(searchParams?.get("view") || "").toLowerCase();
        if (requestedView === "avatar") {
            router.replace("/student/avatar");
            return;
        }
        if (requestedView === "avatar-config") {
            router.replace("/student/pets");
            return;
        }
        if (requestedView === "ship" || requestedView === "inventory" || requestedView === "flag" || requestedView === "cockpit") {
            setView(requestedView as typeof view);
        }
    }, [router, searchParams]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
            setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        if (!userData) return;
        const teacherId = userData.role === 'student' ? userData.teacherId : userData.uid;
        
        // Default to global
        let ref = doc(db, "game-config", "ranks");
        
        // If teacher is associated, try to load their ranks
        if (teacherId) {
             ref = doc(db, `users/${teacherId}/settings`, "ranks");
        }

        const unsub = onSnapshot(ref, (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            }
        });
        return () => unsub();
    }, [userData]);

    useEffect(() => {
        const teacherId = userData?.teacherId;
        if (!teacherId) {
            setPlanetShipUnlocks({});
            setPlanetShipUnlockConfiguredAt({});
            return;
        }

        const unsub = onSnapshot(collection(db, `users/${teacherId}/planets`), (snap) => {
            const shipMap: Record<string, Record<string, number>> = {};
            const shipConfiguredAtMap: Record<string, Record<string, number>> = {};
            snap.forEach((d) => {
                const data = d.data() as any;
                const rawShipUnlocks = data?.unlocks?.ships || {};
                const rawShipConfiguredAt = data?.unlockConfiguredAt?.ships || {};
                const normalizedShips: Record<string, number> = {};
                const normalizedShipConfiguredAt: Record<string, number> = {};

                Object.keys(rawShipUnlocks).forEach((key) => {
                    const threshold = Number(rawShipUnlocks[key] || 0);
                    if (threshold > 0) normalizedShips[key] = threshold;
                });

                Object.keys(rawShipConfiguredAt).forEach((key) => {
                    const timestamp = Math.floor(Number(rawShipConfiguredAt[key] || 0));
                    if (timestamp > 0) normalizedShipConfiguredAt[key] = timestamp;
                });

                const normalizedPlanetId = normalizePlanetId(d.id);
                shipMap[normalizedPlanetId] = normalizedShips;
                shipConfiguredAtMap[normalizedPlanetId] = normalizedShipConfiguredAt;
            });

            setPlanetShipUnlocks(shipMap);
            setPlanetShipUnlockConfiguredAt(shipConfiguredAtMap);
        });

        return () => unsub();
    }, [userData?.teacherId]);

    useEffect(() => {
        const unlocked = buildUnlockedShipIdSet({
            starterShipIds: STARTER_SHIP_IDS,
            shopUnlockedShipIds: userData?.shopUnlockedShipIds,
            purchasedShopItemIds: userData?.purchasedShopItemIds,
            currentShipId: userData?.spaceship?.id || userData?.spaceship?.modelId || "finalship",
            shipXpUnlockRules: SHIP_XP_UNLOCK_RULES,
            planetShipUnlocks,
            planetShipUnlockConfiguredAt,
            xpUnlockProgress,
            planetXP: userData?.planetXP as Record<string, number> | undefined,
            idAliases: unlockConfig.idAliases,
            shipCatalogIds,
        });

        setUnlockedShipIds(unlocked);
    }, [planetShipUnlockConfiguredAt, planetShipUnlocks, userData?.planetXP, userData?.spaceship?.id, userData?.spaceship?.modelId, userData?.shopUnlockedShipIds, userData?.purchasedShopItemIds, unlockConfig.idAliases, shipCatalogIds, xpUnlockProgress]);

    useEffect(() => {
        if (!user?.uid) return;

        const shipSync = syncXpUnlockProgressForRules({
            progress: xpUnlockProgress,
            rules: SHIP_XP_UNLOCK_RULES,
            unlockThresholds: planetShipUnlocks,
            domain: "ship",
            planetXP: userData?.planetXP as Record<string, number> | undefined,
            unlockConfiguredAt: planetShipUnlockConfiguredAt,
            readPlanetXpValue,
        });

        if (!shipSync.changed) return;

        setXpUnlockProgress(shipSync.nextProgress);
        updateDoc(doc(db, "users", user.uid), { xpUnlockProgress: shipSync.nextProgress }).catch((error) => {
            console.error("Failed to sync ship XP unlock progress:", error);
        });
    }, [SHIP_XP_UNLOCK_RULES, planetShipUnlockConfiguredAt, planetShipUnlocks, user?.uid, userData?.planetXP, xpUnlockProgress]);

    // Breadcrumb / Title Logic
    const getTitle = () => {
        switch(view) {
            case 'ship': return 'Hangar Bay';
            case 'inventory': return 'Cargo Hold';
            case 'flag': return 'Flag Fabricator';
            default: return 'Main Cockpit';
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono pb-20 overflow-x-hidden">
            {/* Background Grid Animation */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10">

                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    {view === 'cockpit' ? (
                        <Link href="/student/studentnavigation" className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                            <ArrowLeft size={20} />
                            <span className="sr-only">Exit Cockpit</span>
                        </Link>
                    ) : (
                        <Link href="/student/studentnavigation" className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                            <LayoutDashboard size={20} />
                        </Link>
                    )}

                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                            <Crosshair className="text-cyan-500 animate-spin-slow" />
                            {getTitle()}
                        </h1>
                        <div className="text-xs text-cyan-500/50 uppercase tracking-[0.3em]">
                            System Status: Normal
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3 }}
                    >
                        {view === 'cockpit' && <CockpitView onNavigate={(v) => setView(v as any)} ranks={ranks} />}
                        {view === 'ship' && <ShipSettings userData={userData} user={user} unlockedShipIds={unlockedShipIds} />}
                        {view === 'inventory' && <InventoryView userData={userData} user={user} />}
                        {view === 'flag' && <FlagDesigner />}
                    </motion.div>
                </AnimatePresence>

            </div>
        </div>
    );
}





