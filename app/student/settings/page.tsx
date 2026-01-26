"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Rank, FlagConfig } from "@/types";
import { doc, updateDoc, onSnapshot, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    ArrowLeft, Car, Palette, Zap, Save, Shield, Wrench, Flag, Loader2,
    Box, User, LayoutDashboard, Database, Crosshair, Sparkles, Star, Eye, Map, Sun, Award, Crown, Activity
} from "lucide-react";

import { getAssetPath } from "@/lib/utils";
import { UserAvatar, HAT_OPTIONS } from "@/components/UserAvatar";

// Custom Icon for Ship
const Rocket = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img
        src={getAssetPath("/images/ships/finalship.png")}
        alt="Rocket"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
    />
);
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const SHIP_COLORS = [
    { name: "Nebula Blue", class: "text-blue-400", bg: "bg-blue-400" },
    { name: "Mars Red", class: "text-red-400", bg: "bg-red-400" },
    { name: "Emerald", class: "text-green-400", bg: "bg-green-400" },
    { name: "Starlight Gold", class: "text-yellow-400", bg: "bg-yellow-400" },
    { name: "Void Purple", class: "text-purple-400", bg: "bg-purple-400" },
    { name: "Ice Cyan", class: "text-cyan-400", bg: "bg-cyan-400" },
];

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
        { id: 'avatar', title: 'Pilot Profile', icon: User, color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-950/30' },
        { id: 'flag', title: 'Flag Designer', icon: Flag, color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-950/30' },
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
                                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Access System</p>
                            </div>
                            
                            {/* Decorative Corner */}
                            <div className={`absolute top-0 right-0 w-8 h-8 ${item.color.replace('text', 'bg').replace('400', '500')}/10 rounded-bl-3xl`} />
                        </motion.button>
                    ))}
                    
                    {/* Mission Log Link */}
                    <Link href="/student/missions" className="md:col-span-2">
                        <motion.div
                             whileHover={{ scale: 1.01 }}
                             className="border border-green-500/30 bg-green-950/20 rounded-2xl p-6 flex items-center gap-6 hover:bg-green-900/10 transition-colors group cursor-pointer"
                        >
                             <div className="p-4 rounded-xl bg-black/50 border border-green-500 text-green-400">
                                <Activity size={32} />
                             </div>
                             <div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-green-400">Mission Log</h3>
                                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">View Active Assignments</p>
                             </div>
                        </motion.div>
                    </Link>

                    {/* Placeholder for future Solar Map Link */}
                    <Link href="/student" className="md:col-span-2">
                        <motion.div
                             whileHover={{ scale: 1.01 }}
                             className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl p-6 flex items-center gap-6 hover:bg-cyan-900/10 transition-colors group cursor-pointer"
                        >
                             <div className="p-4 rounded-xl bg-black/50 border border-cyan-500 text-cyan-400">
                                <Crosshair size={32} className="animate-spin-slow" />
                             </div>
                             <div>
                                <h3 className="text-xl font-bold uppercase tracking-wider text-cyan-400">Launch Solar Map</h3>
                                <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest">Initiate Flight Sequence</p>
                             </div>
                        </motion.div>
                    </Link>
                </div>
            </div>

            {/* Right Side: Pilot Status */}
            <div className="bg-black/40 border-l border-white/10 p-6 flex flex-col gap-8 rounded-r-3xl relative backdrop-blur-sm lg:min-h-[500px]">
                 {/* ID Card Header */}
                 <div className="border-b border-white/10 pb-4 text-center pb-6">
                     <h2 className="text-white/70 uppercase tracking-[0.3em] text-xs font-bold mb-1">Active Personnel</h2>
                     <div className="text-2xl font-bold text-white tracking-widest truncate mb-2">{userData?.displayName || "Unknown Pilot"}</div>
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
                                <Rocket size={56} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
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
                             <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mt-2">{nextRank ? 'To Next Promotion' : 'Maximum Rank Achieved'}</p>
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
            </div>
        </div>
    );
}

function ShipSettings({ userData, user }: { userData: any, user: any }) {
    const [loading, setLoading] = useState(false);
    const [shipName, setShipName] = useState("");
    const [selectedColor, setSelectedColor] = useState(SHIP_COLORS[0]);
    // const [selectedType, setSelectedType] = useState('scout'); // Removed Chassis Logic

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
                        <UpgradeSlot icon={Zap} label="Boosters" level={userData?.upgrades?.boosters || 0} active={(userData?.upgrades?.boosters || 0) > 0} />
                        <UpgradeSlot icon={Database} label="Fuel Tank" level={userData?.upgrades?.fuel || 0} active={(userData?.upgrades?.fuel || 0) > 0} />
                        <UpgradeSlot icon={Map} label="Landers" level={userData?.upgrades?.landers || 0} active={(userData?.upgrades?.landers || 0) > 0} />
                        <UpgradeSlot icon={Shield} label="Hull Plating" level={userData?.upgrades?.hull || 0} active={(userData?.upgrades?.hull || 0) > 0} />
                    </div>
                </div>

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
    const { userData, user } = useAuth();
    const [hue, setHue] = useState(0);
    const [skinHue, setSkinHue] = useState(0);
    const [bgHue, setBgHue] = useState(260); // Default purple
    const [bgSat, setBgSat] = useState(50);
    const [bgLight, setBgLight] = useState(20);
    const [activeHat, setActiveHat] = useState<string>('none');
    const [activeCategory, setActiveCategory] = useState<'hats' | 'capes' | 'suits' | 'glasses'>('hats');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userData?.avatar) {
            if (userData.avatar.hue !== undefined) setHue(userData.avatar.hue);
            if (userData.avatar.skinHue !== undefined) setSkinHue(userData.avatar.skinHue);
            if (userData.avatar.bgHue !== undefined) setBgHue(userData.avatar.bgHue);
            if (userData.avatar.bgSat !== undefined) setBgSat(userData.avatar.bgSat);
            if (userData.avatar.bgLight !== undefined) setBgLight(userData.avatar.bgLight);
            if (userData.avatar.activeHat !== undefined) setActiveHat(userData.avatar.activeHat === 'hat1' ? 'helmet1' : userData.avatar.activeHat);
        }
    }, [userData]);

    const handleSelectHat = async (hatId: string) => {
        if (!user) return;
        setLoading(true);
        setActiveHat(hatId);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "avatar.activeHat": hatId
            });
        } catch (e) {
            console.error("Error setting hat", e);
        }
        setLoading(false);
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
                "avatar.activeHat": activeHat
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
                        className="w-full h-full rounded-full"
                    />
                 </div>

                 <div className="mt-8 text-center">
                    <h3 className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-1">Preview</h3>
                    <p className="text-purple-300/60 text-sm font-mono">{activeHat !== 'none' ? HAT_OPTIONS.find(h => h.id === activeHat)?.name : 'Standard Uniform'}</p>
                 </div>
            </div>

            <div className="space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-purple-950/20 p-6 rounded-xl border border-purple-500/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Palette size={20} className="text-purple-400" />
                        <span className="uppercase tracking-wider">Appearance</span>
                    </h3>

                    <div className="space-y-6">
                         {/* Background Slider */}
                         <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Background Tint
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={bgHue}
                                onChange={(e) => setBgHue(parseInt(e.target.value))}
                                className="w-full accent-blue-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                         <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Background Saturation
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={bgSat}
                                onChange={(e) => setBgSat(parseInt(e.target.value))}
                                className="w-full accent-blue-400 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                         <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Background Lightness
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={bgLight}
                                onChange={(e) => setBgLight(parseInt(e.target.value))}
                                className="w-full accent-blue-200 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Skin Slider */}
                        <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Suit / Skin Tone
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={skinHue}
                                onChange={(e) => setSkinHue(parseInt(e.target.value))}
                                className="w-full accent-pink-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Aura Slider */}
                        <div className="space-y-2">
                            <label className="block text-sm text-purple-400 uppercase tracking-wide">
                                Suit Outline / Visor
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={hue}
                                onChange={(e) => setHue(parseInt(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-purple-950/20 p-6 rounded-xl border border-purple-500/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Crown size={20} className="text-yellow-400" />
                            <span className="uppercase tracking-wider">Accessory Vendor</span>
                        </h3>
                    </div>
                    
                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                       {['hats', 'capes', 'suits', 'glasses'].map(cat => (
                           <button 
                               key={cat}
                               onClick={() => setActiveCategory(cat as any)}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                                   activeCategory === cat 
                                   ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                                   : 'bg-black/40 text-purple-400 border-purple-500/20 hover:bg-purple-900/20'
                               }`}
                           >
                              {cat === 'hats' ? 'Hats & Helms' : cat}
                           </button>
                       ))}
                    </div>

                    {activeCategory === 'hats' ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {HAT_OPTIONS.map(h => {
                                 const isActive = activeHat === h.id;

                                 return (
                                    <button 
                                        key={h.id}
                                        onClick={() => handleSelectHat(h.id)}
                                        className={`relative p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                                            isActive
                                            ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                                            : 'bg-black/60 border-white/10 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {h.src ? (
                                            <img src={getAssetPath(h.src)} alt={h.name} className="w-12 h-12 object-contain" />
                                        ) : (
                                           <div className="text-4xl text-gray-500">??</div>
                                        )}
                                        <div className="text-[10px] font-bold uppercase text-center w-full truncate">{h.name}</div>
                                        
                                        {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_currentColor]" />}
                                    </button>
                                 );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center border-2 border-dashed border-purple-500/20 rounded-xl bg-black/20">
                             <div className="text-purple-400 font-bold mb-2 uppercase tracking-widest text-xs">Out of Stock</div>
                             <p className="text-[10px] text-purple-500/60 uppercase tracking-widest font-mono">Shipment Arriving Soon</p>
                        </div>
                    )}
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
                        {loading ? "Saving..." : "Save Look"}
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
    const rawHat = userData?.avatar?.hat;
    const hat = rawHat === 'hat1' ? 'helmet1' : rawHat;

    // Rank Logic
    const currentXP = userData?.xp || 0;
    const sortedRanks = [...(ranks || [])].sort((a,b) => a.minXP - b.minXP);
    const currentRank = sortedRanks.slice().reverse().find(r => currentXP >= r.minXP) || { name: 'Recruit', minXP: 0 };

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
                         bgHue={bgHue} 
                         bgSat={bgSat} 
                         bgLight={bgLight} 
                         skinHue={skinHue} 
                         hue={hue} 
                         hat={hat}
                         className="w-full h-full"
                    />
                    
                    {/* Scan effect overlay */}
                    <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none" />
                </div>
                <button
                    onClick={() => onNavigate('avatar-config')}
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
                        <button onClick={() => setIsEditingName(false)} className="p-2 bg-red-600 rounded-lg hover:bg-red-500 text-white">?</button>
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

            <p className="text-purple-400 font-mono text-sm tracking-wider mb-8 uppercase">{currentRank.name}  |  NO FACTION</p>
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
    { id: '1', name: "Space Cadet", minXP: 0, image: getAssetPath("/images/badges/cadet.png") },
    { id: '2', name: "Rookie Pilot", minXP: 100, image: getAssetPath("/images/badges/RookiePilot.png") },
    { id: '3', name: "Star Scout", minXP: 300, image: getAssetPath("/images/badges/StarScout.png") },
    { id: '4', name: "Nebula Navigator", minXP: 600, image: getAssetPath("/images/badges/NebulaNavigator.png") },
    { id: '5', name: "Solar Specialist", minXP: 1000, image: getAssetPath("/images/badges/SolarSpecialist.png") },
    { id: '6', name: "Comet Captain", minXP: 1500, image: getAssetPath("/images/badges/CometCaptain.png") },
    { id: '7', name: "Galaxy Guardian", minXP: 2200, image: getAssetPath("/images/badges/GalaxyGuardian.png") },
    { id: '8', name: "Cosmic Commander", minXP: 3000, image: getAssetPath("/images/badges/CosmicCommander.png") },
    { id: '9', name: "Void Admiral", minXP: 4000, image: getAssetPath("/images/badges/VoidAdmiral.png") },
    { id: '10', name: "Grand Star Admiral", minXP: 5000, image: getAssetPath("/images/badges/GrandStarAdmiral.png") }
];

// --- Main Component ---

export default function SettingsPage() {
    const { userData, user } = useAuth();
    const [view, setView] = useState<'cockpit' | 'ship' | 'inventory' | 'avatar' | 'avatar-config' | 'flag'>('cockpit');
    const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);

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
            case 'ship': return 'Hangar Bay';
            case 'inventory': return 'Cargo Hold';
            case 'avatar': return 'Pilot Profile';
            case 'avatar-config': return 'DNA Sequencer';
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
                        <Link href="/student" className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                            <ArrowLeft size={20} />
                            <span className="sr-only">Exit Cockpit</span>
                        </Link>
                    ) : (
                        <button onClick={() => setView(view === 'avatar-config' ? 'avatar' : 'cockpit')} className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
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
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                        transition={{ duration: 0.3 }}
                    >
                        {view === 'cockpit' && <CockpitView onNavigate={(v) => setView(v as any)} ranks={ranks} />}
                        {view === 'ship' && <ShipSettings userData={userData} user={user} />}
                        {view === 'inventory' && <InventoryView />}
                        {view === 'avatar' && <AvatarView onNavigate={(v) => setView(v as any)} ranks={ranks} />}
                        {view === 'avatar-config' && <AvatarConfigView onBack={() => setView('avatar')} />}
                        {view === 'flag' && <FlagDesigner />}
                    </motion.div>
                </AnimatePresence>

            </div>
        </div>
    );
}





