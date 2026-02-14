"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Plus, BookOpen, Video, Trash2, Loader2, ArrowLeft, Brain, CheckCircle2, Clock3, CircleDashed } from "lucide-react";

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
    type: 'read' | 'watch' | 'practice';
    contentUrl?: string; // For Youtube
    contentText?: string; // For reading
    questions: Question[];
    xpReward: number;
    createdAt: any;
}

interface StudentProgress {
    uid: string;
    displayName?: string | null;
    username?: string;
    completedMissions?: string[];
    missionProgress?: Record<string, { attempts: number; lastScore: number; passedEver: boolean }>;
}

export default function MissionsPage() {
    const { user } = useAuth();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [students, setStudents] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMissions = async () => {
            if (!user) return;
            try {
                // Fetch from teacher's subcollection
                const missionQuery = query(
                    collection(db, `users/${user.uid}/missions`), 
                    orderBy("createdAt", "desc")
                );
                const studentQuery = query(
                    collection(db, "users"),
                    where("role", "==", "student"),
                    where("teacherId", "==", user.uid)
                );

                const [missionSnapshot, studentSnapshot] = await Promise.all([
                    getDocs(missionQuery),
                    getDocs(studentQuery)
                ]);

                const missionData = missionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
                const studentData = studentSnapshot.docs.map((studentDoc) => ({
                    uid: studentDoc.id,
                    ...(studentDoc.data() as Omit<StudentProgress, 'uid'>),
                } as StudentProgress));

                setMissions(missionData);
                setStudents(studentData);
            } catch (error) {
                console.error("Error fetching missions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMissions();
    }, [user]);

    const missionStatsById = useMemo(() => {
        const totalStudents = students.length;
        const map: Record<string, { completed: number; attempted: number; notStarted: number; averageScore: number }> = {};

        missions.forEach((mission) => {
            let completed = 0;
            let attempted = 0;
            let scoreSum = 0;
            let scoreCount = 0;

            students.forEach((student) => {
                const progress = student.missionProgress?.[mission.id];
                const completedViaLegacy = student.completedMissions?.includes(mission.id) || false;

                if ((progress?.attempts || 0) > 0 || completedViaLegacy) attempted += 1;
                if (progress?.passedEver || completedViaLegacy) completed += 1;
                if (typeof progress?.lastScore === 'number') {
                    scoreSum += progress.lastScore;
                    scoreCount += 1;
                }
            });

            map[mission.id] = {
                completed,
                attempted,
                notStarted: Math.max(totalStudents - attempted, 0),
                averageScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
            };
        });

        return { totalStudents, map };
    }, [missions, students]);

    const missionTrackerById = useMemo(() => {
        const map: Record<string, { completed: string[]; notCompleted: string[] }> = {};

        missions.forEach((mission) => {
            const completed: string[] = [];
            const notCompleted: string[] = [];

            students.forEach((student, index) => {
                const progress = student.missionProgress?.[mission.id];
                const completedViaLegacy = student.completedMissions?.includes(mission.id) || false;
                const isCompleted = Boolean(progress?.passedEver || completedViaLegacy);
                const fallbackName = `Cadet ${index + 1}`;
                const studentName = (student.displayName || student.username || fallbackName).trim();

                if (isCompleted) {
                    completed.push(studentName);
                } else {
                    notCompleted.push(studentName);
                }
            });

            completed.sort((a, b) => a.localeCompare(b));
            notCompleted.sort((a, b) => a.localeCompare(b));

            map[mission.id] = { completed, notCompleted };
        });

        return map;
    }, [missions, students]);

    const totalCompleted = missions.reduce((sum, mission) => sum + (missionStatsById.map[mission.id]?.completed || 0), 0);
    const totalPossibleCompletions = missionStatsById.totalStudents * missions.length;
    const classCompletionPct = totalPossibleCompletions > 0
        ? Math.round((totalCompleted / totalPossibleCompletions) * 100)
        : 0;

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
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Assignments</h1>
                            <p className="text-cyan-600 text-sm mt-1">Track completion, attempts, and scores.</p>
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

                {!loading && (
                    <div className="rounded-xl border border-green-900/50 bg-black/30 p-4 mb-8">
                        <div className="text-xs uppercase text-green-500 tracking-wider">Class Completion</div>
                        <div className="text-2xl font-bold text-white mt-1">{totalCompleted}/{totalPossibleCompletions} ({classCompletionPct}%)</div>
                        <div className="text-xs text-cyan-600 mt-1">Across {missions.length} assignments and {missionStatsById.totalStudents} students.</div>
                    </div>
                )}

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
                                        <div className={`p-3 rounded-lg ${mission.type === 'watch' ? 'bg-purple-900/20 text-purple-400' : mission.type === 'practice' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                            {mission.type === 'watch' ? <Video size={24} /> : mission.type === 'practice' ? <Brain size={24} /> : <BookOpen size={24} />}
                                        </div>
                                        <span className="text-xs font-bold bg-cyan-950/50 text-cyan-300 px-2 py-1 rounded border border-cyan-900">{mission.xpReward} XP</span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{mission.title}</h3>
                                    <p className="text-cyan-600 text-sm mb-6 line-clamp-3 flex-grow">{mission.description}</p>

                                    {(() => {
                                        const stats = missionStatsById.map[mission.id] || { completed: 0, attempted: 0, notStarted: 0, averageScore: 0 };
                                        const tracker = missionTrackerById[mission.id] || { completed: [], notCompleted: [] };
                                        return (
                                            <>
                                                <div className="mb-4 rounded-lg border border-cyan-900/40 bg-black/30 p-3 text-xs">
                                                    <div className="grid grid-cols-2 gap-2 text-gray-300">
                                                        <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-400" /> Completed: <span className="text-white font-bold">{stats.completed}</span></div>
                                                        <div className="flex items-center gap-1"><Clock3 size={12} className="text-yellow-400" /> Attempted: <span className="text-white font-bold">{stats.attempted}</span></div>
                                                        <div className="flex items-center gap-1"><CircleDashed size={12} className="text-red-400" /> Not Started: <span className="text-white font-bold">{stats.notStarted}</span></div>
                                                        <div>Avg Score: <span className="text-white font-bold">{stats.averageScore}%</span></div>
                                                    </div>
                                                </div>

                                                <div className="mb-4 rounded-lg border border-cyan-900/40 bg-black/30 p-3 text-xs">
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <div className="text-green-400 uppercase tracking-wider mb-1">Completed ({tracker.completed.length})</div>
                                                            <div className="max-h-20 overflow-y-auto pr-1 text-gray-300 leading-relaxed">
                                                                {tracker.completed.length ? tracker.completed.join(', ') : 'None yet'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-red-400 uppercase tracking-wider mb-1">Not Completed ({tracker.notCompleted.length})</div>
                                                            <div className="max-h-20 overflow-y-auto pr-1 text-gray-300 leading-relaxed">
                                                                {tracker.notCompleted.length ? tracker.notCompleted.join(', ') : 'Everyone completed this mission'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    
                                    <div className="flex gap-2 mt-auto pt-4 border-t border-cyan-900/30">
                                        <Link href={`/teacher/missions/create?edit=${mission.id}`} className="flex-1">
                                            <span className="block w-full text-center py-2 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-sm transition-colors">
                                                EDIT
                                            </span>
                                        </Link>
                                        <button
                                            className="p-2 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors"
                                            aria-label="Delete mission"
                                            title="Delete mission"
                                        >
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
