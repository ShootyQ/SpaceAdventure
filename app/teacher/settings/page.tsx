"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Car, Palette, Zap, Save, Shield, Wrench } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

// Custom Rocket Icon
const Rocket = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <img 
        src="/images/ships/finalship.png" 
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

const SHIP_TYPES = [
    { id: 'scout', name: 'Nano Scout', desc: 'Fast, agile, weak hull.', icon: Rocket },
    { id: 'fighter', name: 'Star Fighter', desc: 'Balanced combat specs.', icon: Zap },
    { id: 'cargo', name: 'Heavy Hauler', desc: 'Slow, massive storage.', icon: Shield },
];

export default function SettingsPage() {
    const { userData, user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [shipName, setShipName] = useState("");
    const [selectedColor, setSelectedColor] = useState(SHIP_COLORS[0]);
    const [selectedType, setSelectedType] = useState('scout');

    useEffect(() => {
        if (userData?.spaceship) {
            setShipName(userData.spaceship.name);
            const col = SHIP_COLORS.find(c => c.class === userData.spaceship?.color) || SHIP_COLORS[0];
            setSelectedColor(col);
            setSelectedType(userData.spaceship.type);
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
                "spaceship.type": selectedType
            });
            alert("Ship specifications updated, Commander.");
        } catch (e) {
            console.error(e);
            alert("Error updating ship specs.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                     <Link href="/teacher" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500 transition-colors">
                        <ArrowLeft size={20} />
                     </Link>
                     <h1 className="text-3xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                        <Wrench size={32} /> Hangar Bay // Configuration
                     </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column: Visualizer */}
                    <div className="bg-black/50 border border-cyan-900/50 rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[400px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 to-transparent pointer-events-none" />
                        
                        {/* The Ship */}
                        <motion.div 
                            className={`relative z-10 ${selectedColor.class}`}
                            animate={{ 
                                y: [-10, 10, -10],
                                rotate: [0, 2, -2, 0]
                            }}
                            transition={{ 
                                clean: false,
                                duration: 4, 
                                repeat: Infinity,
                                ease: "easeInOut" 
                            }}
                        >
                            <Rocket size={180} strokeWidth={1} className="drop-shadow-[0_0_15px_currentColor]" />
                        </motion.div>

                        <div className="mt-12 text-center z-10">
                            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">{shipName || "Unknown Vessel"}</h2>
                            <div className="text-sm text-cyan-600 mt-2 uppercase tracking-widest">
                                Class: {SHIP_TYPES.find(t => t.id === selectedType)?.name}
                            </div>
                        </div>

                        {/* Decoration */}
                        <div className="absolute top-4 left-4 text-xs text-cyan-800">
                            HULL INTEGRITY: 100%<br/>
                            SHIELDS: ONLINE
                        </div>
                    </div>

                    {/* Right Column: Controls */}
                    <div className="space-y-6">
                        
                        {/* Name Input */}
                        <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                            <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-2">Vessel Identification</label>
                            <input 
                                type="text" 
                                value={shipName}
                                onChange={(e) => setShipName(e.target.value)}
                                className="w-full bg-black/50 border border-cyan-700 rounded p-3 text-white focus:outline-none focus:border-cyan-400 placeholder-cyan-800 transition-colors"
                                placeholder="Enter Ship Name"
                            />
                        </div>

                        {/* Color Picker */}
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

                        {/* Ship Type */}
                        <div className="bg-cyan-950/20 p-6 rounded-xl border border-cyan-500/20">
                            <label className="block text-sm uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                                <Car size={16} /> Chassis Configuration
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {SHIP_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`p-4 rounded border flex items-center gap-4 text-left transition-all ${selectedType === type.id ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/40 border-cyan-900 hover:border-cyan-700'}`}
                                    >
                                        <div className={`p-2 rounded bg-cyan-900/30 ${selectedType === type.id ? 'text-white' : 'text-gray-500'}`}>
                                            <type.icon size={24} />
                                        </div>
                                        <div>
                                            <div className={`text-sm font-bold uppercase ${selectedType === type.id ? 'text-white' : 'text-gray-400'}`}>{type.name}</div>
                                            <div className="text-xs text-gray-500">{type.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
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
            </div>
        </div>
    );
}
