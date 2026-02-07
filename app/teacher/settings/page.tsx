"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { Rank, FlagConfig } from "@/types";
import { doc, updateDoc, onSnapshot, setDoc, collection, getDocs, query, where, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import {
    ArrowLeft, Car, Palette, Zap, Save, Shield, Wrench, Flag, Check, Trash2, LogOut, Edit2,
    Box, User, LayoutDashboard, Database, Crosshair, Sparkles, Star, Eye, Map, Sun, Award, Crown, Activity, AlertTriangle, CreditCard, Users
} from "lucide-react";
import { UserAvatar, HAT_OPTIONS, AVATAR_PRESETS } from "@/components/UserAvatar";
import RankEditor from "@/components/RankEditor";
import { AsteroidEvent } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Custom Icon for Ship
const Rocket = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src={getAssetPath("/images/ships/finalship.png")}
        alt="Rocket"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
    />
);

const SHIP_COLORS = [
    { name: "Nebula Blue", class: "text-blue-400", bg: "bg-blue-400" },
    { name: "Mars Red", class: "text-red-400", bg: "bg-red-400" },
    { name: "Emerald", class: "text-green-400", bg: "bg-green-400" },
    { name: "Starlight Gold", class: "text-yellow-400", bg: "bg-yellow-400" },
    { name: "Void Purple", class: "text-purple-400", bg: "bg-purple-400" },
    { name: "Ice Cyan", class: "text-cyan-400", bg: "bg-cyan-400" },
];

const UpgradeSlot = ({ icon: Icon, label, level = 0, active = false }: { icon: any, label: string, level?: number, active?: boolean }) => (
    <div className={`aspect-square rounded-xl flex flex-col items-center justify-center p-4 border transition-all cursor-pointer ${active ? "bg-cyan-500/20 border-cyan-400" : "bg-black/40 border-cyan-900/40 hover:border-cyan-500/50 hover:bg-cyan-900/20"}`}>
        <Icon size={24} className={`mb-2 ${active ? "text-cyan-300" : "text-cyan-700"}`} />
        <div className={`text-[10px] uppercase font-bold text-center tracking-wider ${active ? "text-cyan-100" : "text-cyan-800"}`}>{label}</div>
        <div className="flex gap-1 mt-2">
            {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < level ? "bg-cyan-400 shadow-[0_0_5px_currentColor]" : "bg-cyan-950"}`} />
            ))}
        </div>
    </div>
);

const TinyFlag = ({ config }: { config: FlagConfig }) => {
    const getColor = (id: string) => {
        const colors: Record<string, string> = {
            red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
            purple: "#a855f7", black: "#171717", white: "#f8fafc", orange: "#f97316"
        };
        return colors[id] || "#3b82f6";
    };
    
    const poleColors: Record<string, string> = {
        silver: "#cbd5e1", gold: "#eab308", wood: "#854d0e", black: "#262626"
    };

    const c1 = getColor(config.primaryColor);
    const c2 = getColor(config.secondaryColor);
    // Simple unique ID for clipPath to avoid conflicts between multiple flags on page
    const uniqueId = `clip-${config.primaryColor}-${config.secondaryColor}-${config.pattern}-${config.shape}`.replace(/[^a-z0-9]/gi, "");

    return (
        <svg width="24" height="30" viewBox="0 0 24 30" className="drop-shadow-md">
            <rect x="2" y="2" width="2" height="28" rx="1" fill={poleColors[config.pole] || "#cbd5e1"} />
            <g transform="translate(4, 3)">
                <defs>
                   <clipPath id={uniqueId}>
                        {config.shape === "rectangle" && <rect x="0" y="0" width="20" height="12" />}
                        {config.shape === "pennant" && <polygon points="0,0 20,6 0,12" />}
                        {config.shape === "triangle" && <polygon points="0,0 20,0 10,12 0,0" />} 
                        {config.shape === "swallowtail" && <polygon points="0,0 20,0 20,12 10,6 0,12" />} 
                   </clipPath>
                </defs>
                <g clipPath={`url(#${uniqueId})`}>
                     {config.pattern === "solid" && <rect x="0" y="0" width="20" height="12" fill={c1} />}
                     {config.pattern === "stripe-h" && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="0" y="6" width="20" height="6" fill={c2} /></>}
                     {config.pattern === "stripe-v" && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="10" y="0" width="10" height="12" fill={c2} /></>}
                     {config.pattern === "cross" && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="8" y="0" width="4" height="12" fill={c2} /><rect x="0" y="4" width="20" height="4" fill={c2} /></>}
                     {config.pattern === "circle" && <><rect x="0" y="0" width="20" height="12" fill={c1} /><circle cx="10" cy="6" r="4" fill={c2} /></>}
                     {config.pattern === "checkered" && <><rect x="0" y="0" width="10" height="6" fill={c1} /><rect x="10" y="0" width="10" height="6" fill={c2} /><rect x="0" y="6" width="10" height="6" fill={c2} /><rect x="10" y="6" width="10" height="6" fill={c1} /></>}
                </g>
            </g>
        </svg>
    );
}

// UserAvatar replaced by import from "@/components/UserAvatar"

// --- Subviews ---

function CockpitView({ onNavigate, ranks, onOpenRankEditor }: { onNavigate: (view: string) => void, ranks: Rank[], onOpenRankEditor: () => void }) {
    const { userData, logout } = useAuth();
    const [className, setClassName] = useState(userData?.schoolName || "");
    const [isEditingName, setIsEditingName] = useState(false);

    const handleSaveClassName = async () => {
        if (!userData?.uid) return;
        try {
            await updateDoc(doc(db, "users", userData.uid), {
                schoolName: className
            });
            setIsEditingName(false);
        } catch (e) {
            console.error("Error saving class name:", e);
        }
    };

    const MENU_ITEMS = [
        { id: "ship", title: "Hangar Bay", icon: Rocket, color: "text-cyan-400", border: "border-cyan-500", bg: "bg-cyan-950/30" },
        { id: "inventory", title: "Cargo Hold", icon: Box, color: "text-amber-400", border: "border-amber-500", bg: "bg-amber-950/30" },
        { id: "avatar", title: "Pilot Profile", icon: User, color: "text-purple-400", border: "border-purple-500", bg: "bg-purple-950/30" },
        { id: "flag", title: "Flag Designer", icon: Flag, color: "text-red-400", border: "border-red-500", bg: "bg-red-950/30" },
    ];

    // Determine Rank
    const currentXP = userData?.xp || 0;
    const sortedRanks = [...ranks].sort((a,b) => a.minXP - b.minXP);
    // Find highest rank with minXP <= currentXP
    const currentRank = sortedRanks.slice().reverse().find(r => currentXP >= r.minXP) || sortedRanks[0] || { name: "Recruit", minXP: 0 };
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
    // Extract tailwind color class prefix for glowing effects (e.g. text-blue-400 -> blue)
    const glowColor = shipColor.includes("-") ? shipColor.split("-")[1] : "cyan";

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
                            /* ...existing code... */
                            onClick={() => onNavigate(item.id)}
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
                                {item.id === "avatar" ? (
                                   <UserAvatar userData={userData} className="w-8 h-8 rounded-full border border-white/20" />
                                ) : item.id === "flag" && userData?.flag ? (
                                   <div className="scale-125"><TinyFlag config={userData.flag} /></div>
                                ) : (
                                   <item.icon size={32} />
                                )}
                            </div>
                            <div className="z-10">
                                <h3 className={`text-xl font-bold uppercase tracking-wider ${item.color} drop-shadow-md`}>
                                    {item.title}
                                </h3>
                                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Access System</p>
                            </div>
                            
                            {/* Decorative Corner */}
                            <div className={`absolute top-0 right-0 w-8 h-8 ${item.color.replace("text", "bg").replace("400", "500")}/10 rounded-bl-3xl`} />
                        </motion.button>
                    ))}

                </div>
            </div>

            {/* Right Side: Pilot Status */}
            <div className="bg-black/40 border-l border-white/10 p-6 flex flex-col gap-8 rounded-r-3xl relative backdrop-blur-sm lg:min-h-[500px]">
                 {/* ID Card Header */}
                 <div className="border-b border-white/10 pb-4 text-center pb-6">
                     <h2 className="text-white/70 uppercase tracking-[0.3em] text-xs font-bold mb-1">Active Personnel</h2>
                     <div className="text-2xl font-bold text-white tracking-widest truncate mb-2">{userData?.displayName || "Unknown Commander"}</div>
                     
                     {/* Class Name Editor */}
                     <div className="flex justify-center items-center gap-2 mb-3">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                                <input 
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    className="bg-transparent border-none text-cyan-400 text-sm font-bold uppercase tracking-wider w-32 text-center focus:outline-none"
                                    placeholder="CLASS NAME"
                                />
                                <button onClick={handleSaveClassName} className="p-1 hover:bg-green-500/20 text-green-400 rounded"><Check size={14} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group" onClick={() => setIsEditingName(true)}>
                                <span className="text-sm font-bold uppercase tracking-widest">{userData?.schoolName || "Set Class Name"}</span>
                                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                     </div>

                     <div className="flex justify-center gap-4 text-[10px] uppercase font-bold tracking-widest text-cyan-400/80">
                        <span>{currentRank.name}</span>
                        <span className="text-white/30"></span>
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
                                <Rocket size={56} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                           </motion.div>
                      </div>
                 </div>

                 {/* Rank Section */}
                 <div className="flex-1 bg-white/5 rounded-xl p-6 border border-white/5 relative overflow-hidden">
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <div className="text-xs text-yellow-500 uppercase tracking-widest font-bold mb-1">Current Designaton</div>
                                  <div className="text-xl font-bold text-white uppercase tracking-wider">{currentRank.name}</div>
                              </div>
                              {currentRank.image && (
                                <img src={currentRank.image} alt="Rank Badge" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
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
                             <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mt-2">{nextRank ? "To Next Promotion" : "Maximum Rank Achieved"}</p>
                          </div>
                      </div>

                      {/* Badge Display */}
                       <div className="mt-6 aspect-square w-full flex flex-col items-center justify-center relative overflow-hidden rounded-lg bg-black/20 border border-white/5">
                           {currentRank.image ? (
                                <div className="relative z-10 w-full h-full p-6 pb-8">
                                    <img src={currentRank.image} alt="Badge" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                                </div>
                           ) : (
                                <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white/20">
                                    <Award size={24} />
                                </div>
                           )}
                           <span className="absolute bottom-2 text-[10px] text-yellow-500/50 uppercase tracking-widest font-bold z-10">Current Designation</span>
                       </div>
                 </div>

                 {/* Logout Button */}
                 <button 
                    onClick={logout}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all uppercase tracking-widest text-xs font-bold"
                 >
                    <LogOut size={16} />
                    System Logout
                 </button>

            </div>
        </div>
    );
}

function ShipSettings({ userData, user }: { userData: any, user: any }) {
    const [loading, setLoading] = useState(false);
    const [shipName, setShipName] = useState("");
    const [selectedColor, setSelectedColor] = useState(SHIP_COLORS[0]);
    // const [selectedType, setSelectedType] = useState("scout"); // Removed Chassis Logic

    useEffect(() => {
        if (userData?.spaceship) {
            setShipName(userData.spaceship.name);
            const col = SHIP_COLORS.find(c => c.class === userData.spaceship?.color) || SHIP_COLORS[0];
            setSelectedColor(col);
            // setSelectedType(userData.spaceship.type);
        }
    }, [userData]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "spaceship.name": shipName,
                "spaceship.color": selectedColor.class,
                // "spaceship.type": selectedType
            });
            alert("Ship specifications updated, Commander.");
        } catch (e) {
            console.error(e);
            alert("Error updating ship specs.");
        }
        setLoading(false);
    };

    // Fuel Mechanics
    // Base 500. Each level of "Fuel" upgrade adds 250 capacity.
    const fuelUpgradeLevel = userData?.upgrades?.fuel || 0;
    const maxFuel = 500 + (fuelUpgradeLevel * 250);
    const currentFuel = userData?.fuel !== undefined ? userData.fuel : 500; // Default to Max/500 if not set (Migration)
    const fuelPercentage = Math.min((currentFuel / maxFuel) * 100, 100);

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
                        src={getAssetPath("/images/ships/finalship.png")}
                        alt="Ship"
                        className="w-[280px] h-[280px] object-contain drop-shadow-[0_0_25px_currentColor]"
                    />
                </motion.div>

                <div className="mt-12 text-center z-10 w-full max-w-md">
                    <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-6">{shipName || "Unknown Vessel"}</h2>
                    
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
                        <div className="text-[10px] text-cyan-700/60 mt-1 font-mono text-center">FUEL CELLS ONLINE  POWERED BY XP</div>
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
                    <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-2">Vessel Identification</label>
                    <input
                        type="text"
                        value={shipName}
                        onChange={(e) => setShipName(e.target.value)}
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
                                className={`p-3 rounded border flex items-center gap-3 transition-all ${selectedColor.name === color.name ? "bg-cyan-500/20 border-cyan-400 scale-105" : "bg-black/40 border-cyan-900 hover:border-cyan-700"}`}
                            >
                                <div className={`w-4 h-4 rounded-full ${color.bg} shadow-[0_0_5px_currentColor]`} />
                                <span className={`text-xs uppercase font-bold ${selectedColor.name === color.name ? "text-white" : "text-gray-500"}`}>{color.name}</span>
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
                        <UpgradeSlot icon={Zap} label="Boosters" level={userData?.upgrades?.boosters || 0} active={(userData?.upgrades?.boosters || 0) > 0} />
                        <UpgradeSlot icon={Database} label="Fuel Tank" level={userData?.upgrades?.fuel || 0} active={(userData?.upgrades?.fuel || 0) > 0} />
                        <UpgradeSlot icon={Map} label="Landers" level={userData?.upgrades?.landers || 0} active={(userData?.upgrades?.landers || 0) > 0} />
                        <UpgradeSlot icon={Shield} label="Hull Plating" level={userData?.upgrades?.hull || 0} active={(userData?.upgrades?.hull || 0) > 0} />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${loading ? "bg-gray-700 text-gray-400 cursor-wait" : "bg-cyan-600 hover:bg-cyan-500 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(8,145,178,0.4)]"}`}
                >
                    <Save size={20} />
                    {loading ? "Calibrating..." : "Save Configuration"}
                </button>
            </div>
        </div>
    );
}

function InventoryView() {
    return (
        <div className="max-w-4xl mx-auto border border-amber-500/30 bg-black/40 rounded-3xl p-8 min-h-[500px]">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-amber-500/30">
                <Database className="text-amber-400" size={32} />
                <h2 className="text-2xl font-bold text-amber-400 uppercase tracking-widest">Cargo Hold</h2>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {[...Array(24)].map((_, i) => (
                    <div key={i} className="aspect-square bg-amber-950/20 border border-amber-900/50 rounded-lg flex items-center justify-center hover:bg-amber-900/30 hover:border-amber-500/50 transition-colors cursor-pointer group">
                        <div className="text-amber-900/40 text-xs font-mono group-hover:text-amber-500/60">EMPTY</div>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center text-amber-500/50 font-mono text-sm">
                0 / 24 SLOTS OCCUPIED
            </div>
        </div>
    );
}

function AvatarConfigView({ onBack }: { onBack: () => void }) {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);

    // State for visual properties
    const [hue, setHue] = useState(userData?.avatar?.hue || 0);
    const [skinHue, setSkinHue] = useState(userData?.avatar?.skinHue || 0);
    const [bgHue, setBgHue] = useState(userData?.avatar?.bgHue !== undefined ? userData.avatar.bgHue : 240);
    const [bgSat, setBgSat] = useState(userData?.avatar?.bgSat !== undefined ? userData.avatar.bgSat : 50);
    const [bgLight, setBgLight] = useState(userData?.avatar?.bgLight !== undefined ? userData.avatar.bgLight : 20);
    const [activeHat, setActiveHat] = useState(userData?.avatar?.activeHat || "none");
    const [avatarId, setAvatarId] = useState(userData?.avatar?.avatarId || "bunny");

    const handleSelectPreset = (presetId: string) => {
        const preset = AVATAR_PRESETS.find(p => p.id === presetId);
        if (preset) {
            setHue(preset.config.hue);
            setSkinHue(preset.config.skinHue);
            setBgHue(preset.config.bgHue);
            setBgSat(preset.config.bgSat);
            setBgLight(preset.config.bgLight);
            setActiveHat(preset.config.activeHat);
            setAvatarId(preset.config.avatarId);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "avatar.hue": hue,
                "avatar.skinHue": skinHue,
                "avatar.bgHue": bgHue,
                "avatar.bgSat": bgSat,
                "avatar.bgLight": bgLight,
                "avatar.activeHat": activeHat,
                "avatar.avatarId": avatarId
            });
            onBack();
        } catch (e) {
            console.error(e);
            alert("Error saving DNA sequence.");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-purple-500/30 bg-black/40 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 to-transparent pointer-events-none" />
                 
                 <div className="relative w-64 h-64 rounded-full border-4 border-purple-500/50 overflow-visible flex items-center justify-center transition-colors duration-300 ring-4 ring-purple-900/30 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                    <UserAvatar
                        hue={hue}
                        skinHue={skinHue}
                        bgHue={bgHue}
                        bgSat={bgSat}
                        bgLight={bgLight}
                        hat={activeHat}
                        avatarId={avatarId}
                        className="w-full h-full rounded-full"
                    />
                 </div>

                 <div className="mt-8 text-center">
                    <h3 className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-1">Preview</h3>
                    <p className="text-purple-300/60 text-sm font-mono">{activeHat !== "none" ? HAT_OPTIONS.find(h => h.id === activeHat)?.name : "Standard Uniform"}</p>
                 </div>
            </div>

            <div className="space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-purple-950/20 p-6 rounded-xl border border-purple-500/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={20} className="text-purple-400" />
                        <span className="uppercase tracking-wider">Select Identity</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        {AVATAR_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => handleSelectPreset(preset.id)}
                                className="group relative p-4 rounded-xl border border-white/10 bg-black/40 hover:bg-purple-900/20 hover:border-purple-500/50 transition-all flex flex-col items-center gap-3"
                            >
                                <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden relative group-hover:scale-110 transition-transform">
                                    <UserAvatar
                                        hue={preset.config.hue}
                                        skinHue={preset.config.skinHue}
                                        bgHue={preset.config.bgHue}
                                        bgSat={preset.config.bgSat}
                                        bgLight={preset.config.bgLight}
                                        hat={preset.config.activeHat}
                                        avatarId={preset.config.avatarId}
                                        className="w-full h-full"
                                    />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 group-hover:text-white">{preset.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onBack}
                        disabled={loading}
                        className="flex-1 py-4 rounded-xl border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 uppercase tracking-widest font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-black uppercase tracking-widest font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                    >
                        {loading ? "Saving..." : "Confirm Identity"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AvatarView({ onNavigate, ranks }: { onNavigate: (path: string) => void, ranks: Rank[] }) {
    const { userData, user } = useAuth(); // Added user to update name
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState("");

    const hue = userData?.avatar?.hue || 0;
    const skinHue = userData?.avatar?.skinHue || 0;
    const bgHue = userData?.avatar?.bgHue !== undefined ? userData.avatar.bgHue : 260;
    const bgSat = userData?.avatar?.bgSat !== undefined ? userData.avatar.bgSat : 50;
    const bgLight = userData?.avatar?.bgLight !== undefined ? userData.avatar.bgLight : 20;

    // Rank Logic
    const currentXP = userData?.xp || 0;
    const sortedRanks = [...(ranks || [])].sort((a,b) => a.minXP - b.minXP);
    const currentRank = sortedRanks.slice().reverse().find(r => currentXP >= r.minXP) || { name: "Recruit", minXP: 0 };

    useEffect(() => {
        if (userData?.displayName) setNewName(userData.displayName);
    }, [userData]);

    const handleSaveName = async () => {
        if (!user || !newName.trim()) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { displayName: newName });
            setIsEditingName(false);
        } catch (e) {
            console.error(e);
            alert("Failed to update identification.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto border border-purple-500/30 bg-black/40 rounded-3xl p-8 min-h-[500px] flex flex-col items-center justify-center">
            <div className="relative mb-8 group">
                <div className="w-48 h-48 rounded-full border-4 border-purple-500/50 overflow-hidden flex items-center justify-center relative transition-colors duration-300">
                    <UserAvatar 
                        userData={userData}
                        className="w-full h-full" 
                    />
                    
                    {/* Scan effect overlay */}
                    <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none" />
                </div>
                <button
                    onClick={() => onNavigate("avatar-config")}
                    className="absolute bottom-0 right-0 p-3 bg-purple-500 rounded-full text-black hover:bg-purple-400 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)] z-30"
                >
                    <Wrench size={20} />
                </button>
            </div>
            
            {/* Editable Name Field */}
            <div className="flex items-center gap-3 mb-2 relative">
                {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-black/50 border border-purple-500 text-white font-bold text-2xl px-2 py-1 rounded w-64 text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                        />
                        <button onClick={handleSaveName} className="p-2 bg-green-600 rounded-lg hover:bg-green-500 text-white"><Save size={16} /></button>
                        <button onClick={() => setIsEditingName(false)} className="p-2 bg-red-600 rounded-lg hover:bg-red-500 text-white"></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 group/edit">
                        <h2 className="text-2xl font-bold text-white cursor-pointer" onClick={() => setIsEditingName(true)}>
                            {userData?.displayName || "Cadet Pilot"}
                        </h2>
                        <button 
                            onClick={() => setIsEditingName(true)} 
                            className="text-purple-500 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 hover:bg-purple-500/20 rounded"
                        >
                            <Wrench size={14} />
                        </button>
                    </div>
                )}
            </div>

            <p className="text-purple-400 font-mono text-sm tracking-wider mb-8 uppercase">{currentRank.name}  NO FACTION</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                 <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-500/20 text-center">
                    <div className="text-2xl font-bold text-white">{currentXP} XP</div>
                    <div className="text-xs text-purple-400 uppercase tracking-wider">Experience</div>
                 </div>
                 <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-500/20 text-center">
                    <div className="text-2xl font-bold text-white">{currentXP}</div>
                    <div className="text-xs text-purple-400 uppercase tracking-wider">Current XP</div>
                 </div>
            </div>
        </div>
    );
}

// --- Flag Designer ---

const FLAG_POLES = [
    { id: "silver", name: "Titanium", color: "#cbd5e1" },
    { id: "gold", name: "Gold Ultima", color: "#eab308" },
    { id: "wood", name: "Ancient Oak", color: "#854d0e" },
    { id: "black", name: "Carbon Fiber", color: "#262626" },
];

const FLAG_PATTERNS = [
    { id: "solid", name: "Solid Standard" },
    { id: "stripe-h", name: "Horizon Stripe" },
    { id: "stripe-v", name: "Vertical Split" },
    { id: "cross", name: "Solar Cross" },
    { id: "checkered", name: "Battle Checker" },
    { id: "circle", name: "Core Sun" },
];

const FLAG_COLORS = [
    { id: "red", hex: "#ef4444" },
    { id: "blue", hex: "#3b82f6" },
    { id: "green", hex: "#22c55e" },
    { id: "yellow", hex: "#eab308" },
    { id: "purple", hex: "#a855f7" },
    { id: "black", hex: "#171717" },
    { id: "white", hex: "#f8fafc" },
    { id: "orange", hex: "#f97316" },
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

    const getColor = (id: string) => FLAG_COLORS.find(c => c.id === id)?.hex || "#3b82f6";

    const renderFlagContent = () => {
        const c1 = getColor(primaryColor);
        const c2 = getColor(secondaryColor);

        switch (pattern) {
            case "solid": return <rect x="0" y="0" width="200" height="120" fill={c1} />;
            case "stripe-h": return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="0" y="40" width="200" height="40" fill={c2} />
                </>
            );
            case "stripe-v": return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="66" y="0" width="66" height="120" fill={c2} />
                </>
            );
            case "cross": return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <rect x="50" y="0" width="30" height="120" fill={c2} />
                    <rect x="0" y="45" width="200" height="30" fill={c2} />
                </>
            );
            case "circle": return (
                <>
                    <rect x="0" y="0" width="200" height="120" fill={c1} />
                    <circle cx="100" cy="60" r="35" fill={c2} />
                </>
            );
            case "checkered": return (
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
                                    {shape === "rectangle" && <rect x="0" y="0" width="200" height="120" />}
                                    {shape === "pennant" && <polygon points="0,0 200,60 0,120" />}
                                    {shape === "triangle" && <polygon points="0,0 200,0 100,120 0,0" />} 
                                    {shape === "swallowtail" && <polygon points="0,0 200,0 200,120 100,60 0,120" />} 
                                </clipPath>
                             </defs>
                             
                             <g clipPath="url(#flagShape)">
                                 {renderFlagContent()}
                                 {/* Fabric Ripple Effect */}
                                 <rect x="0" y="0" width="200" height="120" fill="url(#ripple)" opacity="0.3" style={{ mixBlendMode: "multiply" }} />
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
                                    className={`flex-1 p-2 rounded text-xs uppercase font-bold border transition-all ${pole === p.id ? "bg-red-500 text-black border-red-400" : "bg-black/40 border-red-900/50 text-gray-500 hover:text-red-400"}`}
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
                                     className={`h-10 rounded border transition-all ${primaryColor === c.id ? "scale-110 border-white ring-2 ring-red-500 ring-offset-2 ring-offset-black" : "border-transparent opacity-70 hover:opacity-100"}`}
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
                                     className={`h-10 rounded border transition-all ${secondaryColor === c.id ? "scale-110 border-white ring-2 ring-red-500 ring-offset-2 ring-offset-black" : "border-transparent opacity-70 hover:opacity-100"}`}
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
                                    className={`p-3 rounded border text-left text-xs uppercase font-bold transition-all ${pattern === p.id ? "bg-red-500/20 border-red-400 text-white" : "bg-black/30 border-red-900/30 text-gray-500 hover:bg-red-900/20"}`}
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
                             {["rectangle", "pennant", "check", "swallowtail"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setShape(s)}
                                    className={`flex-1 p-2 rounded border text-[10px] uppercase font-bold transition-all ${shape === s ? "bg-white text-black" : "bg-black/50 border-white/20 text-gray-400 hover:bg-white/10"}`}
                                >
                                    {s === "swallowtail" ? "Tail" : s}
                                </button>
                             ))}
                        </div>
                     </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${loading ? "bg-gray-700 text-gray-400 cursor-wait" : "bg-red-600 hover:bg-red-500 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(220,38,38,0.4)]"}`}
                >
                    <Save size={20} />
                    {loading ? "Forging..." : "Fabricate Flag"}
                </button>
            </div>
        </div>
    );
}

function BillingView({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");

    const PRICE_IDS = {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || "", 
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || "price_1SxvZNRt6vQIRlSNVgvCKL89" 
    };

    const handleSubscribe = async () => {
        if (!userData?.uid) return;
        setLoading(true);
        try {
            const priceId = cycle === "monthly" ? PRICE_IDS.monthly : PRICE_IDS.yearly;
            
            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    priceId,
                    userId: userData.uid,
                    email: userData.email
                })
            });

            if (!response.ok) throw new Error("Network response was not ok");
            
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("No Checkout URL returned");
            }
        } catch (e) {
            console.error(e);
            alert("Checkout initialization failed. Check console.");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto border border-green-500/30 bg-black/40 rounded-3xl p-8 flex flex-col gap-6">
             <div className="flex items-center gap-4 border-b border-green-500/30 pb-4">
                 <div className="p-3 bg-green-500/20 rounded-xl border border-green-500 text-green-400">
                     <CreditCard size={24} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Subscription Management</h2>
                     <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">Plan Status: <span className={userData?.subscriptionStatus === "active" ? "text-green-400 font-bold" : "text-yellow-400 font-bold"}>{userData?.subscriptionStatus || "TRIAL"}</span></p>
                 </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-8">
                 <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col">
                     <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
                        <p className="text-gray-400 text-sm mb-4">Perfect for small groups or testing the waters.</p>
                        <ul className="space-y-3 text-sm text-gray-300 mb-8">
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Up to 5 Students</li>
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Explore All Features</li>
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Unlimited Duration</li>
                        </ul>
                     </div>
                     {/* Free Trial Badge - Not a button */}
                     {userData?.subscriptionStatus !== "active" && (
                        <div className="w-full py-3 rounded-xl bg-white/5 text-white/40 font-bold border border-white/10 text-center uppercase tracking-wider text-xs">
                            Current Status
                        </div>
                     )}
                 </div>

                 <div className="bg-gradient-to-br from-green-900/20 to-black rounded-2xl p-6 border border-green-500/50 flex flex-col relative overflow-hidden">
                     <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Recommended</div>
                     <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-400 mb-4">Full Access</h3>
                        
                        {/* Toggle */}
                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 w-fit mb-6">
                            <button 
                                onClick={() => setCycle("monthly")}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${cycle === "monthly" ? "bg-green-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                            >
                                Monthly
                            </button>
                            <button 
                                onClick={() => setCycle("yearly")}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${cycle === "yearly" ? "bg-green-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                            >
                                Yearly
                            </button>
                        </div>

                        {cycle === "yearly" ? (
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-bold text-white">$100</span>
                                <span className="text-sm text-gray-400">/year</span>
                                <span className="text-xs text-green-400 ml-2 font-bold bg-green-900/30 px-2 py-1 rounded">SAVE $20</span>
                            </div>
                        ) : (
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-bold text-white">$10</span>
                                <span className="text-sm text-gray-400">/month</span>
                            </div>
                        )}

                        <ul className="space-y-3 text-sm text-gray-300 mb-8">
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Up to 30 Students</li>
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Custom Missions & Planets</li>
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Priority Support</li>
                            <li className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Full Analytic Dashboard</li>
                        </ul>
                     </div>
                     {userData?.subscriptionStatus === "active" ? (
                         <div className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-bold border border-green-500/50 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                             <Check size={18} /> Plan Active
                         </div>
                     ) : (
                         <button 
                            onClick={handleSubscribe} 
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold transition-all border shadow-[0_0_20px_rgba(22,163,74,0.3)]
                                ${loading 
                                    ? "bg-gray-700 text-gray-400 border-gray-600 cursor-wait" 
                                    : "bg-green-600 hover:bg-green-500 text-white border-green-400 active:scale-95"
                                }
                            `}
                        >
                            {loading ? "Initializing..." : `Upgrade (${cycle})`}
                         </button>
                     )}
                 </div>
             </div>
             
             <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/30 rounded-xl flex items-start gap-4">
                 <Sparkles className="text-blue-400 shrink-0 mt-1" />
                 <div>
                     <h4 className="text-blue-300 font-bold text-sm uppercase tracking-wider mb-1">Teacher Guarantee</h4>
                     <p className="text-gray-400 text-xs leading-relaxed">We believe in this tool. If you don"t see an increase in student engagement within the first 30 days, we"ll refund your subscription in full. No questions asked.</p>
                 </div>
             </div>
        </div>
    );
}

function TeamView({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { userData } = useAuth();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !userData?.uid) return;
        setLoading(true);
        setError(null);
        try {
            await updateDoc(doc(db, "users", userData.uid), {
                coTeacherEmails: arrayUnion(email.trim())
            });
            setEmail("");
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleRemove = async (emailToRemove: string) => {
        if (!userData?.uid) return;
        if (!confirm(`Revoke access for ${emailToRemove}?`)) return;
        try {
            await updateDoc(doc(db, "users", userData.uid), {
                coTeacherEmails: arrayRemove(emailToRemove)
            });
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto border border-blue-500/30 bg-black/40 rounded-3xl p-8 flex flex-col gap-6">
             <div className="flex items-center gap-4 border-b border-blue-500/30 pb-4">
                 <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500 text-blue-400">
                     <Users size={24} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Command Team</h2>
                     <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">Grant access to other educators</p>
                 </div>
             </div>
             
             <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                 <h3 className="text-lg font-bold text-white mb-4">Authorized Officers</h3>
                 {(!userData?.coTeacherEmails || userData.coTeacherEmails.length === 0) ? (
                     <p className="text-gray-500 italic text-sm">No co-teachers assigned.</p>
                 ) : (
                     <div className="space-y-3">
                         {userData.coTeacherEmails.map((email: string) => (
                             <div key={email} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                                         {email[0].toUpperCase()}
                                     </div>
                                     <span className="text-gray-200 font-mono">{email}</span>
                                 </div>
                                 <button onClick={() => handleRemove(email)} className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors" title="Revoke Access">
                                     <Trash2 size={18} />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
             </div>

            <form onSubmit={handleAdd} className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-blue-300 mb-4">Add Officer</h3>
                <div className="flex gap-4">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@school.edu"
                        className="flex-1 bg-black/50 border border-blue-500/30 rounded-xl px-4 py-3 text-white placeholder-blue-500/30 focus:outline-none focus:border-blue-400"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-400 text-black font-bold uppercase tracking-wider px-6 rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Grant"}
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                <p className="text-blue-400/50 text-[10px] uppercase tracking-widest mt-4">
                    Note: The user must log in with this Google Email to access your class data.
                </p>
            </form>
        </div>
    );
}



function AsteroidControlView({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { userData } = useAuth();
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [xpTarget, setXpTarget] = useState(1000); // Increased default target
    const [reward, setReward] = useState("5 Minutes of Extra Recess");
    const [penalty, setPenalty] = useState("No Penalty");
    const [status, setStatus] = useState<"idle" | "active" | "success" | "failed">("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeEventData, setActiveEventData] = useState<AsteroidEvent | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!userData?.uid) return;
        const eventId = `asteroidEvent_${userData.uid}`; // Teacher-specific event
        
        const unsub = onSnapshot(doc(db, "game-config", eventId), (d) => {
            if (d.exists()) {
                const data = d.data() as AsteroidEvent;
                setStatus(data.active ? "active" : data.status);
                setActiveEventData(data);
                if(data.active && data.startTime) {
                    const end = data.startTime + (data.duration * 1000);
                    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                    setTimeLeft(left);
                }
            } else {
                // If doc doesn"t exist yet, we are idle
                setStatus("idle");
                setActiveEventData(null);
            }
        });
        return () => unsub();
    }, [userData]);

    // Timer Interval
    useEffect(() => {
        if(status !== "active") return;
        const interval = setInterval(() => {
             if(activeEventData?.startTime) {
                 const end = activeEventData.startTime + (activeEventData.duration * 1000);
                 const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                 setTimeLeft(left);
             }
        }, 1000);
        return () => clearInterval(interval);
    }, [status, activeEventData]);

    const launchEvent = async () => {
        if (!userData?.uid) return;
        setLoading(true);
        setError(null);
        try {
           // Fetch current total XP of class to set baseline
           const usersRef = collection(db, "users");
           
           // Filter for THIS teacher"s students only
           const q = query(usersRef, where("teacherId", "==", userData.uid));
           const snapshot = await getDocs(q);
           
           let startTotal = 0;
           snapshot.forEach(doc => {
               const data = doc.data();
               startTotal += (data.xp || 0);
           });

           // Also include the teacher if they play? usually not.
           
           // Duration in seconds
           const durationSeconds = durationMinutes * 60;
           
           const eventId = `asteroidEvent_${userData.uid}`;

           await setDoc(doc(db, "game-config", eventId), {
               active: true,
               startTime: Date.now(),
               duration: durationSeconds,
               targetXP: xpTarget,
               startClassXP: startTotal, 
               reward,
               penalty,
               status: "active"
           });
           setStatus("active");
        } catch(e: any) { 
            console.error(e); 
            setError("Launch Failed: " + e.message);
        }
        setLoading(false);
    };

    const stopEvent = async () => {
        if (!userData?.uid) return;
        setLoading(true);
        const eventId = `asteroidEvent_${userData.uid}`;
        try {
            await updateDoc(doc(db, "game-config", eventId), { active: false, status: "failed" }); 
        } catch(e: any) { setError(e.message); }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto border border-orange-500/30 bg-black/40 rounded-3xl p-8 flex flex-col gap-6">
             <div className="flex items-center gap-4 border-b border-orange-500/30 pb-4">
                 <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500 text-orange-400">
                     <AlertTriangle size={32} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Planetary Defense</h2>
                     <p className="text-orange-400 text-xs font-mono uppercase">Emergency Override System</p>
                 </div>
             </div>

             {error && (
                 <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-xl font-bold flex items-center gap-2">
                     <AlertTriangle size={20} />
                     {error}
                 </div>
             )}

             {status === "active" ? (
                 <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl text-center flex flex-col items-center">
                     <div className="animate-pulse mb-6 p-4 bg-red-500/20 rounded-full border border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                        <AlertTriangle size={64} className="text-red-500" />
                     </div>
                     <h3 className="text-3xl font-bold text-red-500 uppercase tracking-widest mb-2">Event in Progress</h3>
                     <div className="text-4xl font-mono text-white mb-6 font-bold tabular-nums tracking-widest">
                         {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                     </div>
                     <p className="text-white/60 mb-8 max-w-md">The class is currently defending against the asteroid. Monitor student XP gains on the dashboard.</p>
                     
                     <button onClick={stopEvent} disabled={loading} className="bg-red-600 px-8 py-4 rounded-xl text-black font-bold uppercase tracking-wider hover:bg-red-500 transition-all hover:scale-105 shadow-lg">
                         {loading ? "Aborting..." : "Abort Mission"}
                     </button>
                 </div>
             ) : (
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                         <div>
                             <label className="text-orange-400 text-xs font-bold uppercase mb-2 block">Event Duration (Minutes)</label>
                             <div className="flex gap-2">
                                 <input 
                                    type="number" 
                                    min="1"
                                    max="120"
                                    value={durationMinutes} 
                                    onChange={e => setDurationMinutes(Math.max(1, Number(e.target.value)))} 
                                    className="w-full bg-black border border-orange-500/30 rounded p-3 text-white" 
                                 />
                             </div>
                         </div>
                         <div>
                             <label className="text-orange-400 text-xs font-bold uppercase mb-2 block">XP Target (Incremental)</label>
                             <input type="number" value={xpTarget} onChange={e => setXpTarget(Number(e.target.value))} className="w-full bg-black border border-orange-500/30 rounded p-3 text-white" />
                             <p className="text-[10px] text-orange-500/60 mt-1">Amount of NEW XP the class must earn collectively.</p>
                         </div>
                     </div>
                     <div className="space-y-4">
                         <div>
                             <label className="text-orange-400 text-xs font-bold uppercase mb-2 block">Victory Reward</label>
                             <input type="text" value={reward} onChange={e => setReward(e.target.value)} className="w-full bg-black border border-orange-500/30 rounded p-3 text-white" />
                         </div>
                         <button onClick={launchEvent} disabled={loading} className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-xl text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all">
                              {loading ? "Initializing Sensors..." : " Initiate Alert"}
                         </button>
                     </div>
                 </div>
             )}
        </div>
    );
}

const DEFAULT_RANKS: Rank[] = [
    { id: "1", name: "Space Cadet", minXP: 0, image: getAssetPath("/images/badges/cadet.png") },
    { id: "2", name: "Rookie Pilot", minXP: 100, image: getAssetPath("/images/badges/RookiePilot.png") },
    { id: "3", name: "Star Scout", minXP: 300, image: getAssetPath("/images/badges/StarScout.png") },
    { id: "4", name: "Nebula Navigator", minXP: 600, image: getAssetPath("/images/badges/NebulaNavigator.png") },
    { id: "5", name: "Solar Specialist", minXP: 1000, image: getAssetPath("/images/badges/SolarSpecialist.png") },
    { id: "6", name: "Comet Captain", minXP: 1500, image: getAssetPath("/images/badges/CometCaptain.png") },
    { id: "7", name: "Galaxy Guardian", minXP: 2200, image: getAssetPath("/images/badges/GalaxyGuardian.png") },
    { id: "8", name: "Cosmic Commander", minXP: 3000, image: getAssetPath("/images/badges/CosmicCommander.png") },
    { id: "9", name: "Void Admiral", minXP: 4000, image: getAssetPath("/images/badges/VoidAdmiral.png") },
    { id: "10", name: "Grand Star Admiral", minXP: 5000, image: getAssetPath("/images/badges/GrandStarAdmiral.png") }
];

// --- Main Component ---

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-500">Loading Systems...</div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { userData, user } = useAuth();
    const searchParams = useSearchParams();
    
    type SettingsView = "cockpit" | "ship" | "inventory" | "avatar" | "avatar-config" | "flag" | "asteroids" | "billing" | "team";
    const [view, setView] = useState<SettingsView>("cockpit");

    const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);
    const [isRankEditorOpen, setIsRankEditorOpen] = useState(false);

    useEffect(() => {
        const mode = searchParams.get("mode");
        const success = searchParams.get("success");
        const canceled = searchParams.get("canceled");

        if (success) {
            setView("billing");
            // clear params to prevent re-alerting? Next.js navigation replacement is complex here without router.
            // visual feedback is handled by subscription status update usually
        }
        
        if (canceled) {
            setView("billing");
        }

        if (mode === "asteroids") {
            setView("asteroids");
        } else if (mode === "team") {
            setView("team");
        } else if (mode === "billing") {
            setView("billing");
        } else if (mode === "ranks") {
            setView("cockpit");
            // Small timeout to allow render if needed, or just set it
             setTimeout(() => setIsRankEditorOpen(true), 100);
        }
    }, [searchParams]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "ranks"), (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            }
        });
        return () => unsub();
    }, []);

    // Breadcrumb / Title Logic
    const getTitle = () => {
        switch(view) {
            case "ship": return "Hangar Bay";
            case "inventory": return "Cargo Hold";
            case "avatar": return "Pilot Profile";
            case "avatar-config": return "DNA Sequencer";
            case "flag": return "Flag Fabricator";
            case "asteroids": return "Defense Systems";
            default: return "Main Cockpit";
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono pb-20 overflow-x-hidden">
            {/* Background Grid Animation */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10">

                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    {view === "cockpit" ? (
                        <Link href="/teacher" className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                            <ArrowLeft size={20} />
                            <span className="sr-only">Exit Cockpit</span>
                        </Link>
                    ) : (
                        <button onClick={() => setView(view === "avatar-config" ? "avatar" : "cockpit")} className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                            <LayoutDashboard size={20} />
                        </button>
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
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.3 }}
                    >
                        {view === "cockpit" && <CockpitView onNavigate={(v) => setView(v as any)} ranks={ranks} onOpenRankEditor={() => setIsRankEditorOpen(true)} />}
                        {view === "ship" && <ShipSettings userData={userData} user={user} />}
                        {view === "inventory" && <InventoryView />}
                        {view === "avatar" && <AvatarView onNavigate={(v) => setView(v as any)} ranks={ranks} />}
                        {view === "avatar-config" && <AvatarConfigView onBack={() => setView("avatar")} />}
                        {view === "flag" && <FlagDesigner />}
                        {view === "asteroids" && <AsteroidControlView onNavigate={(v) => setView(v as any)} />}
                        {view === "billing" && <BillingView onNavigate={(v) => setView(v as any)} />}
                        {view === "team" && <TeamView onNavigate={(v) => setView(v as any)} />}
                    </motion.div>
                </AnimatePresence>
                
                <RankEditor isOpen={isRankEditorOpen} onClose={() => setIsRankEditorOpen(false)} />

            </div>
        </div>
    );
}
