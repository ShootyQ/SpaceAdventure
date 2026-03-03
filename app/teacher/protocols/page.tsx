"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { ArrowLeft, Trash2, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";

interface Behavior {
    id: string;
    label: string;
    xp: number;
    color: string;
}

export default function TeacherProtocolsPage() {
    const { user } = useAuth();
    const { activeTeacherId } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;

    const [behaviors, setBehaviors] = useState<Behavior[]>([]);
    const [newLabel, setNewLabel] = useState("");
    const [newXpInput, setNewXpInput] = useState("50");

    useEffect(() => {
        if (!teacherScopeId) return;

        const behaviorQuery = query(collection(db, `users/${teacherScopeId}/behaviors`));
        const unsub = onSnapshot(behaviorQuery, (snapshot) => {
            const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Behavior));
            items.sort((a, b) => b.xp - a.xp);
            setBehaviors(items);
        });

        return () => unsub();
    }, [teacherScopeId]);

    const groupedCount = useMemo(() => ({
        positive: behaviors.filter((b) => b.xp > 0).length,
        negative: behaviors.filter((b) => b.xp < 0).length,
        neutral: behaviors.filter((b) => b.xp === 0).length,
    }), [behaviors]);

    const handleAddBehavior = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherScopeId) return;

        const parsedXp = Number(newXpInput);
        if (!newLabel.trim()) return;
        if (!Number.isInteger(parsedXp) || parsedXp < -1000 || parsedXp > 1000) {
            alert("XP must be an integer between -1000 and 1000.");
            return;
        }

        try {
            await addDoc(collection(db, `users/${teacherScopeId}/behaviors`), {
                label: newLabel.trim(),
                xp: parsedXp,
                color: parsedXp > 0 ? "bg-green-600" : "bg-red-600",
                teacherId: teacherScopeId,
            });
            setNewLabel("");
            setNewXpInput("50");
        } catch (error) {
            console.error("Error adding protocol:", error);
            alert("Failed to add protocol.");
        }
    };

    const handleDeleteBehavior = async (id: string) => {
        if (!teacherScopeId || !confirm("Remove this protocol?")) return;
        try {
            await deleteDoc(doc(db, `users/${teacherScopeId}/behaviors`, id));
        } catch (error) {
            console.error("Error removing protocol:", error);
            alert("Failed to remove protocol.");
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-3 md:p-6 font-mono text-cyan-400">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
                    <div className="flex items-center gap-3">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest text-white">Protocol Editor</h1>
                            <p className="text-[11px] md:text-xs text-cyan-600 uppercase tracking-wider mt-1">Manage behavior protocols separate from rewards</p>
                        </div>
                    </div>
                    <Link
                        href="/teacher/rewards"
                        className="px-3 py-2 text-xs uppercase tracking-wider rounded border border-cyan-700 text-cyan-300 hover:border-cyan-500"
                    >
                        Open Rewards
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="lg:col-span-1 bg-black/40 border border-cyan-900/50 rounded-2xl p-4 md:p-5 h-fit">
                        <h2 className="text-white font-bold uppercase tracking-wider text-sm mb-4">Add Protocol</h2>
                        <form onSubmit={handleAddBehavior} className="space-y-3">
                            <div>
                                <label className="text-xs text-cyan-500 uppercase tracking-wider">Label</label>
                                <input
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    className="w-full mt-1 bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none"
                                    placeholder="e.g. Leadership"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-cyan-500 uppercase tracking-wider">XP Amount</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={newXpInput}
                                    onChange={(e) => {
                                        const next = e.target.value.trim();
                                        if (/^-?\d*$/.test(next)) setNewXpInput(next);
                                    }}
                                    className="w-full mt-1 bg-black/50 border border-cyan-800 rounded p-2 text-white text-sm focus:border-cyan-400 outline-none"
                                    placeholder="-1000 to 1000"
                                    required
                                />
                            </div>
                            <button className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider shadow-lg">
                                Add Protocol
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-black/30 border border-white/5 rounded-2xl p-4 md:p-5 min-h-[360px]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                <Zap size={16} className="text-cyan-400" />
                                Existing Protocols
                            </h2>
                            <div className="text-[10px] md:text-xs text-cyan-600 uppercase tracking-wider">
                                +{groupedCount.positive} / -{groupedCount.negative} / 0:{groupedCount.neutral}
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                            {behaviors.length === 0 ? (
                                <div className="text-cyan-700 text-sm border border-cyan-900/50 rounded-xl p-4">
                                    No protocols yet. Add your first one on the left.
                                </div>
                            ) : (
                                behaviors.map((behavior) => (
                                    <div key={behavior.id} className="flex items-center justify-between p-3 bg-cyan-900/20 rounded-xl border border-cyan-800/50">
                                        <div>
                                            <div className="text-white text-sm md:text-base font-bold">{behavior.label}</div>
                                            <div className={`text-xs ${behavior.xp > 0 ? 'text-green-400' : behavior.xp < 0 ? 'text-red-400' : 'text-cyan-300'}`}>
                                                {behavior.xp > 0 ? '+' : ''}{behavior.xp} XP
                                            </div>
                                        </div>
                                        <button
                                            title="Delete protocol"
                                            aria-label="Delete protocol"
                                            onClick={() => handleDeleteBehavior(behavior.id)}
                                            className="p-2 text-red-500 hover:text-white hover:bg-red-500/20 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}