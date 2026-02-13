"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Plus, BookOpen, Video, Trash2, Edit2, Loader2, ArrowLeft } from "lucide-react";

export interface Question {
    id: string;
    text: string;
    type: 'tf' | 'mc' | 'sort';
    options?: string[];
    correctAnswer: string | string[]; // 'true'/'false' or option string or sorted array
}

export interface Mission {
    id: string;
    title: string;
    description: string;
    type: 'read' | 'watch';
    contentUrl?: string; // For Youtube
    contentText?: string; // For reading
    questions: Question[];
    xpReward: number;
    createdAt: any;
}

export default function MissionsPage() {
    const { user } = useAuth();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMissions = async () => {
            if (!user) return;
            try {
                // Fetch from teacher's subcollection
                const q = query(
                    collection(db, `users/${user.uid}/missions`), 
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
                setMissions(data);
            } catch (error) {
                console.error("Error fetching missions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMissions();
    }, [user]);

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Mission Control</h1>
                            <p className="text-cyan-600 text-sm mt-1">Manage Cadet Assignments & Training Modules</p>
                        </div>
                    </div>
                    <Link 
                        href="/teacher/missions/create" 
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-3 rounded-lg transition-all"
                    >
                        <Plus size={20} />
                        CREATE MISSION
                    </Link>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="animate-spin text-cyan-500" size={48} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missions.length === 0 ? (
                            <div className="col-span-full text-center p-12 border border-dashed border-cyan-900/50 rounded-xl text-cyan-700">
                                <p className="text-lg mb-2">No Active Missions</p>
                                <p className="text-sm">Create a new training module to begin cadet instruction.</p>
                            </div>
                        ) : (
                            missions.map((mission) => (
                                <div key={mission.id} className="group bg-black/40 border border-cyan-900/50 hover:border-cyan-500/50 rounded-xl p-6 transition-all backdrop-blur-sm flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${mission.type === 'watch' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                            {mission.type === 'watch' ? <Video size={24} /> : <BookOpen size={24} />}
                                        </div>
                                        <span className="text-xs font-bold bg-cyan-950/50 text-cyan-300 px-2 py-1 rounded border border-cyan-900">{mission.xpReward} XP</span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{mission.title}</h3>
                                    <p className="text-cyan-600 text-sm mb-6 line-clamp-3 flex-grow">{mission.description}</p>
                                    
                                    <div className="flex gap-2 mt-auto pt-4 border-t border-cyan-900/30">
                                        <Link href={`/teacher/missions/create?edit=${mission.id}`} className="flex-1">
                                            <span className="block w-full text-center py-2 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-sm transition-colors">
                                                EDIT
                                            </span>
                                        </Link>
                                        <button className="p-2 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
