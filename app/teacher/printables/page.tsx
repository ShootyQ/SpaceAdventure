"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserData, Rank } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { getAssetPath } from "@/lib/utils";
import { Printer, ArrowLeft, Award, User, Layers, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Default ranks if none loaded
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

export default function PrintablesPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<UserData[]>([]);
    const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<"avatars" | "badges" | "reference">("avatars");
    const [selectedBadge, setSelectedBadge] = useState<Rank | null>(null);

    // Fetch Data
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        // 1. Fetch Students
        const fetchStudents = async () => {
            const q = query(
                collection(db, "users"), 
                where("role", "==", "student"),
                where("teacherId", "==", user.uid)
            );
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
            users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
            setStudents(users);
        };

        // 2. Fetch Ranks (Realtime)
        const unsubRanks = onSnapshot(doc(db, "game-config", "ranks"), (d) => {
            if (d.exists() && d.data().list) {
                setRanks(d.data().list);
            }
        });

        Promise.all([fetchStudents()]).then(() => setLoading(false));

        return () => unsubRanks();
    }, [user]);

    // Badge Sheet Helper (Repeats one badge 12 times or whatever fits)
    const renderBadgeSheet = (rank: Rank) => {
        return (
            <div className="grid grid-cols-3 gap-8 content-start h-[9.5in] p-8">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="border border-gray-300 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 break-inside-avoid h-[2.8in]">
                        <img src={rank.image} alt={rank.name} className="w-32 h-32 object-contain drop-shadow-lg" />
                        <div className="text-center">
                            <h3 className="text-xl font-bold uppercase tracking-widest text-black">{rank.name}</h3>
                            <p className="text-sm text-gray-500 font-mono tracking-wider">OFFICIAL RANK ACCREDITATION</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Avatar Sheet Helper
    const chunkStudents = (arr: UserData[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    if (loading) return <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center font-mono">Loading Print Systems...</div>;

    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans">
            
            {/* NO-PRINT: Control Panel */}
            <div className="print:hidden bg-space-950 text-white p-6 border-b border-cyan-900 sticky top-0 z-50 shadow-xl">
                 <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher" className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-3">
                                <Printer className="text-cyan-400" /> 
                                Print Visuals
                            </h1>
                            <p className="text-cyan-500/50 text-xs uppercase tracking-wider">System Ready</p>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
                        <button 
                            onClick={() => { setMode("avatars"); setSelectedBadge(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${mode === "avatars" ? "bg-cyan-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            <User size={16} /> Student Cards
                        </button>
                        <div className="w-px bg-white/10 my-2 mx-1"/>
                        <button 
                            onClick={() => { setMode("badges"); setSelectedBadge(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${(mode === "badges" || mode === "reference") ? "bg-yellow-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                        >
                            <Award size={16} /> Rank Badges
                        </button>
                    </div>

                    <button 
                        onClick={() => window.print()}
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center gap-2"
                    >
                        <Printer size={18} /> Print Now
                    </button>
                 </div>
            </div>

            {/* PRINT AREA */}
            <div className="max-w-[8.5in] mx-auto bg-white min-h-screen shadow-2xl print:shadow-none print:w-full">
                
                {mode === "avatars" && (
                    <div className="p-8">
                        {/* If no students */}
                        {students.length === 0 && <div className="text-center p-10 text-gray-400">No students found. Add students to your roster first.</div>}

                        {chunkStudents(students, 6).map((chunk, i) => (
                            <div key={i} className="break-after-page page-break-always grid grid-cols-2 gap-4 auto-rows-fr">
                                {chunk.map(student => (
                                    <div key={student.uid} className="border-4 border-gray-900 rounded-2xl p-6 flex items-center gap-6 break-inside-avoid relative overflow-hidden h-[3.5in]">
                                        {/* Background Decoration */}
                                        <div className="absolute -right-10 -bottom-10 text-gray-100 opacity-50"><Shield size={200} /></div>

                                        {/* Avatar */}
                                        <div className="w-32 h-32 shrink-0 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-50 relative z-10">
                                            <UserAvatar userData={student} className="w-full h-full" />
                                        </div>

                                        {/* Info */}
                                        <div className="z-10 flex-1">
                                            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Cadet Name</div>
                                            <h2 className="text-2xl font-black text-black uppercase tracking-tight leading-none mb-4">{student.displayName}</h2>
                                            
                                            {/* Badge Placeholder */}
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex items-center gap-2 bg-gray-50/50">
                                                <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-200">
                                                    <Award size={20} />
                                                </div>
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                                    Current Rank<br/>Badge Holder
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}


                {(mode === "badges" || mode === "reference") && (
                    <div className="p-8">
                        {/* Selector (Only show on screen) */}
                        <div className="print:hidden mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                            {ranks.map(rank => (
                                <button 
                                    key={rank.id}
                                    onClick={() => setSelectedBadge(rank)}
                                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedBadge?.id === rank.id ? "bg-yellow-50 border-yellow-500 ring-2 ring-yellow-500/20" : "bg-white border-gray-200 hover:border-gray-400"}`}
                                >
                                    <img src={rank.image} alt={rank.name} className="w-12 h-12 object-contain" />
                                    <span className="text-xs uppercase font-bold text-gray-600">{rank.name}</span>
                                </button>
                            ))}
                        </div>

                        {selectedBadge ? (
                            // Render single rank repeated
                            renderBadgeSheet(selectedBadge)
                        ) : (
                            // Render Ref Sheet if nothing selected
                             <div className="text-center p-10 border-2 border-dashed border-gray-200 rounded-xl">
                                <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-bold text-gray-400">Select a Rank Badge above to generate a full printable sheet.</h3>
                                <p className="text-gray-400 mt-2">Print these sheets on cardstock or sticker paper for your students.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Print CSS Fixes */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .page-break-always { page-break-after: always; }
                    .break-inside-avoid { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}

const RankBadge = ({ rank }: { rank: Rank }) => (
    <div className="flex flex-col items-center gap-2">
        <img src={rank.image} alt={rank.name} className="w-16 h-16 object-contain" />
        <span className="text-xs font-bold uppercase">{rank.name}</span>
    </div>
);
