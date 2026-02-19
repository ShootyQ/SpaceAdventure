"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Coins, PawPrint, Rocket, UserCircle2, Flag, LayoutDashboard, Sparkles } from "lucide-react";

export default function StudentShopPage() {
    const { userData } = useAuth();
    const [creditsPerAward, setCreditsPerAward] = useState(1);

    useEffect(() => {
        const teacherId = userData?.teacherId;
        if (!teacherId) return;

        const unsub = onSnapshot(doc(db, `users/${teacherId}/settings`, "economy"), (snapshot) => {
            const raw = Number((snapshot.data() as any)?.creditsPerAward || 1);
            setCreditsPerAward(Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 1);
        });

        return () => unsub();
    }, [userData?.teacherId]);

    const galacticCredits = Number(userData?.galacticCredits || 0);

    const categories = [
        { id: "pets", title: "Pets", icon: PawPrint, status: "Coming Soon" },
        { id: "ships", title: "Ships", icon: Rocket, status: "Coming Soon" },
        { id: "avatars", title: "Avatars", icon: UserCircle2, status: "Coming Soon" },
        { id: "flags", title: "Flags", icon: Flag, status: "Coming Soon" },
    ];

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/student/settings" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Intergalactic Shop</h1>
                            <p className="text-cyan-600 text-sm">Spend Galactic Credits on cosmetics and upgrades.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 border border-amber-500/30 bg-amber-900/10 rounded-full">
                        <Coins size={16} className="text-amber-300" />
                        <span className="font-bold text-amber-100">{galacticCredits} GC</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/student" className="border border-emerald-500/30 bg-emerald-950/20 rounded-xl p-4 hover:border-emerald-400 transition-colors">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase tracking-wider text-sm"><LayoutDashboard size={16} /> Spaceship Interior</div>
                        <div className="text-xs text-emerald-200/70 mt-1">Visit your interior and view your current setup.</div>
                    </Link>
                    <Link href="/student/settings" className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-4 hover:border-purple-400 transition-colors">
                        <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-sm"><Sparkles size={16} /> DNA Sequencer</div>
                        <div className="text-xs text-purple-200/70 mt-1">Open pilot customization and identity controls.</div>
                    </Link>
                    <Link href="/student/map" className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-4 hover:border-cyan-400 transition-colors">
                        <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider text-sm"><Rocket size={16} /> Navigation</div>
                        <div className="text-xs text-cyan-200/70 mt-1">Return to map and continue your mission path.</div>
                    </Link>
                </div>

                <div className="border border-cyan-500/20 bg-black/40 rounded-2xl p-5">
                    <p className="text-sm text-cyan-200">
                        You currently earn <span className="text-amber-300 font-bold">{creditsPerAward} Galactic Credit{creditsPerAward === 1 ? "" : "s"}</span> each time your teacher awards XP.
                        Keep stacking rewards and spend your balance on the cosmetics you want most.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.map((category) => (
                        <div key={category.id} className="border border-cyan-800/50 bg-black/40 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm">
                                <category.icon size={16} className="text-cyan-400" />
                                {category.title}
                            </div>
                            <div className="mt-2 text-xs text-cyan-600 uppercase tracking-wider">{category.status}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
