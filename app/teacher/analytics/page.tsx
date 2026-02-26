"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, CalendarDays, TrendingDown, TrendingUp, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";
import { UserData } from "@/types";

type ViewMode = "class" | "grade";
type SortMode = "net30" | "positive30" | "negative30" | "dailyAvg30";

type XPEvent = {
    id: string;
    teacherId: string;
    studentId: string;
    gradeLevel?: string;
    xpDelta: number;
    reason?: string;
    source?: string;
    timestamp: number;
};

type StudentSummary = {
    uid: string;
    displayName: string;
    grade: string;
    positive30: number;
    negative30: number;
    net30: number;
    dailyAvg30: number;
    eventCount30: number;
    latestReason?: string;
};

type GradeSummary = {
    grade: string;
    studentCount: number;
    positive30: number;
    negative30: number;
    net30: number;
    dailyAvgPerStudent: number;
    last7Net: number[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const getDayKey = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export default function TeacherAnalyticsPage() {
    const { user } = useAuth();
    const { activeTeacherId, teacherOptions, loadingTeacherOptions } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;

    const [students, setStudents] = useState<UserData[]>([]);
    const [xpEvents, setXpEvents] = useState<XPEvent[]>([]);

    const [viewMode, setViewMode] = useState<ViewMode>("class");
    const [gradeFilter, setGradeFilter] = useState<string>("all");
    const [sortMode, setSortMode] = useState<SortMode>("net30");
    const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
    const [eventsListenerError, setEventsListenerError] = useState<string | null>(null);

    useEffect(() => {
        if (!teacherScopeId) return;

        const studentsQuery = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("status", "==", "active"),
            where("teacherId", "==", teacherScopeId)
        );

        const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
            setStudents(snapshot.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() } as UserData)));
        });

        const eventsQuery = query(collection(db, "xpEvents"), where("teacherId", "==", teacherScopeId));
        const unsubEvents = onSnapshot(
            eventsQuery,
            (snapshot) => {
                setEventsListenerError(null);
                const events = snapshot.docs
                    .map((docSnap) => {
                        const data = docSnap.data() as any;
                        return {
                            id: docSnap.id,
                            teacherId: String(data.teacherId || ""),
                            studentId: String(data.studentId || ""),
                            gradeLevel: data.gradeLevel ? String(data.gradeLevel) : undefined,
                            xpDelta: toNumber(data.xpDelta),
                            reason: data.reason ? String(data.reason) : undefined,
                            source: data.source ? String(data.source) : undefined,
                            timestamp: toNumber(data.timestamp),
                        } satisfies XPEvent;
                    })
                    .filter((event) => event.studentId && event.timestamp > 0);

                setXpEvents(events);
            },
            (error) => {
                console.error("xpEvents listener error:", error);
                setEventsListenerError(error?.message || "Unknown listener error");
                setXpEvents([]);
            }
        );

        return () => {
            unsubStudents();
            unsubEvents();
        };
    }, [teacherScopeId]);

    const grades = useMemo(() => {
        const unique = new Set<string>();
        students.forEach((student) => {
            if (student.gradeLevel) unique.add(String(student.gradeLevel));
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [students]);

    const since30 = Date.now() - (30 * DAY_MS);

    const visibleStudents = useMemo(() => {
        if (viewMode === "class" || gradeFilter === "all") return students;
        return students.filter((student) => String(student.gradeLevel || "") === gradeFilter);
    }, [students, viewMode, gradeFilter]);

    const visibleStudentIds = useMemo(() => new Set(visibleStudents.map((student) => student.uid)), [visibleStudents]);

    const events30 = useMemo(() => {
        return xpEvents.filter((event) => event.timestamp >= since30 && visibleStudentIds.has(event.studentId));
    }, [xpEvents, since30, visibleStudentIds]);

    const fallbackEvents30 = useMemo<XPEvent[]>(() => {
        return visibleStudents
            .map((student): XPEvent | null => {
                const award = student.lastAward as any;
                const timestamp = toNumber(award?.timestamp);
                const xpDelta = toNumber(award?.xpGained);
                if (!timestamp || timestamp < since30 || xpDelta === 0) return null;

                return {
                    id: `fallback-${student.uid}-${timestamp}`,
                    teacherId: teacherScopeId || "",
                    studentId: student.uid,
                    gradeLevel: student.gradeLevel ? String(student.gradeLevel) : undefined,
                    xpDelta,
                    reason: typeof award?.reason === "string" ? award.reason : "Recent award",
                    source: "lastAward_fallback",
                    timestamp,
                } satisfies XPEvent;
            })
            .filter((event): event is XPEvent => event !== null);
    }, [visibleStudents, since30, teacherScopeId]);

    const usingFallbackEvents = events30.length === 0 && fallbackEvents30.length > 0;
    const effectiveEvents30 = usingFallbackEvents ? fallbackEvents30 : events30;

    const studentMap = useMemo(() => {
        const m = new Map<string, UserData>();
        students.forEach((student) => m.set(student.uid, student));
        return m;
    }, [students]);

    const studentSummaries = useMemo(() => {
        const byStudent = new Map<string, StudentSummary>();

        visibleStudents.forEach((student) => {
            byStudent.set(student.uid, {
                uid: student.uid,
                displayName: String(student.displayName || student.email || "Unknown Student"),
                grade: String(student.gradeLevel || "—"),
                positive30: 0,
                negative30: 0,
                net30: 0,
                dailyAvg30: 0,
                eventCount30: 0,
            });
        });

        effectiveEvents30.forEach((event) => {
            const summary = byStudent.get(event.studentId);
            if (!summary) return;

            if (event.xpDelta >= 0) {
                summary.positive30 += event.xpDelta;
            } else {
                summary.negative30 += Math.abs(event.xpDelta);
            }

            summary.net30 += event.xpDelta;
            summary.eventCount30 += 1;
            summary.latestReason = event.reason || summary.latestReason;
        });

        const rows = Array.from(byStudent.values()).map((summary) => ({
            ...summary,
            dailyAvg30: Math.round((summary.net30 / 30) * 10) / 10,
        }));

        rows.sort((a, b) => {
            if (sortMode === "positive30") return b.positive30 - a.positive30;
            if (sortMode === "negative30") return b.negative30 - a.negative30;
            if (sortMode === "dailyAvg30") return b.dailyAvg30 - a.dailyAvg30;
            return b.net30 - a.net30;
        });

        return rows;
    }, [effectiveEvents30, visibleStudents, sortMode]);

    const classMetrics = useMemo(() => {
        const totalPositive = studentSummaries.reduce((sum, row) => sum + row.positive30, 0);
        const totalNegative = studentSummaries.reduce((sum, row) => sum + row.negative30, 0);
        const totalNet = studentSummaries.reduce((sum, row) => sum + row.net30, 0);
        const studentsWithNegativeNet = studentSummaries.filter((row) => row.net30 < 0).length;
        const topGainer = studentSummaries[0];

        return {
            totalPositive,
            totalNegative,
            totalNet,
            studentsWithNegativeNet,
            topGainer,
        };
    }, [studentSummaries]);

    const topGainer = useMemo(() => {
        if (studentSummaries.length === 0) return null;
        return [...studentSummaries].sort((a, b) => b.net30 - a.net30)[0] || null;
    }, [studentSummaries]);

    const topDecliner = useMemo(() => {
        if (studentSummaries.length === 0) return null;
        const sorted = [...studentSummaries].sort((a, b) => a.net30 - b.net30);
        const candidate = sorted[0];
        return candidate && candidate.net30 < 0 ? candidate : null;
    }, [studentSummaries]);

    const interventionWatchlist = useMemo(() => {
        return studentSummaries
            .filter((row) => row.net30 < 0 || row.negative30 >= Math.max(20, row.positive30 * 0.45))
            .sort((a, b) => {
                const aRisk = a.negative30 - a.positive30;
                const bRisk = b.negative30 - b.positive30;
                return bRisk - aRisk;
            })
            .slice(0, 8);
    }, [studentSummaries]);

    const classDailyTrend = useMemo(() => {
        const dayMap = new Map<string, { positive: number; negative: number; net: number }>();

        for (let i = 29; i >= 0; i -= 1) {
            const dayStart = Date.now() - (i * DAY_MS);
            dayMap.set(getDayKey(dayStart), { positive: 0, negative: 0, net: 0 });
        }

        effectiveEvents30.forEach((event) => {
            const key = getDayKey(event.timestamp);
            const existing = dayMap.get(key);
            if (!existing) return;

            if (event.xpDelta >= 0) existing.positive += event.xpDelta;
            else existing.negative += Math.abs(event.xpDelta);
            existing.net += event.xpDelta;
        });

        return Array.from(dayMap.entries()).map(([day, stats]) => ({ day, ...stats }));
    }, [effectiveEvents30]);

    const selectedStudentTrend = useMemo(() => {
        if (selectedStudentId === "all") return classDailyTrend;

        const dayMap = new Map<string, { positive: number; negative: number; net: number }>();
        for (let i = 29; i >= 0; i -= 1) {
            const dayStart = Date.now() - (i * DAY_MS);
            dayMap.set(getDayKey(dayStart), { positive: 0, negative: 0, net: 0 });
        }

        effectiveEvents30
            .filter((event) => event.studentId === selectedStudentId)
            .forEach((event) => {
                const key = getDayKey(event.timestamp);
                const existing = dayMap.get(key);
                if (!existing) return;
                if (event.xpDelta >= 0) existing.positive += event.xpDelta;
                else existing.negative += Math.abs(event.xpDelta);
                existing.net += event.xpDelta;
            });

        return Array.from(dayMap.entries()).map(([day, stats]) => ({ day, ...stats }));
    }, [classDailyTrend, effectiveEvents30, selectedStudentId]);

    const maxTrendMagnitude = useMemo(() => {
        const maxAbs = selectedStudentTrend.reduce((max, item) => Math.max(max, Math.abs(item.net)), 0);
        return maxAbs > 0 ? maxAbs : 1;
    }, [selectedStudentTrend]);

    const selectedStudentName = selectedStudentId === "all"
        ? "Whole Class"
        : String(studentMap.get(selectedStudentId)?.displayName || "Selected Student");

    const gradeSummaries = useMemo(() => {
        const dayKeysLast7 = Array.from({ length: 7 }, (_, idx) => getDayKey(Date.now() - ((6 - idx) * DAY_MS)));
        const gradeStudentIds = new Map<string, Set<string>>();

        students.forEach((student) => {
            const grade = String(student.gradeLevel || "—");
            if (!gradeStudentIds.has(grade)) gradeStudentIds.set(grade, new Set<string>());
            gradeStudentIds.get(grade)?.add(student.uid);
        });

        const byGrade = new Map<string, GradeSummary>();
        gradeStudentIds.forEach((ids, grade) => {
            byGrade.set(grade, {
                grade,
                studentCount: ids.size,
                positive30: 0,
                negative30: 0,
                net30: 0,
                dailyAvgPerStudent: 0,
                last7Net: dayKeysLast7.map(() => 0),
            });
        });

        xpEvents
            .filter((event) => event.timestamp >= since30)
            .forEach((event) => {
                const student = studentMap.get(event.studentId);
                if (!student) return;
                const grade = String(student.gradeLevel || "—");
                const summary = byGrade.get(grade);
                if (!summary) return;

                if (event.xpDelta >= 0) summary.positive30 += event.xpDelta;
                else summary.negative30 += Math.abs(event.xpDelta);
                summary.net30 += event.xpDelta;

                const dayKey = getDayKey(event.timestamp);
                const dayIndex = dayKeysLast7.indexOf(dayKey);
                if (dayIndex >= 0) summary.last7Net[dayIndex] += event.xpDelta;
            });

        const rows = Array.from(byGrade.values()).map((summary) => ({
            ...summary,
            dailyAvgPerStudent: summary.studentCount > 0
                ? Math.round(((summary.net30 / 30) / summary.studentCount) * 10) / 10
                : 0,
        }));

        rows.sort((a, b) => b.net30 - a.net30);
        return rows;
    }, [students, xpEvents, since30, studentMap]);

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/30 transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white">Class Analytics</h1>
                            <p className="text-cyan-500 text-xs uppercase tracking-wider mt-1">30-Day XP trends, positives, negatives, and student rankings</p>
                        </div>
                    </div>
                    {!loadingTeacherOptions && teacherOptions.length > 1 && (
                        <div className="text-xs text-cyan-500 uppercase tracking-widest">Teacher scope active</div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard title="Positive XP (30d)" value={classMetrics.totalPositive.toLocaleString()} icon={<TrendingUp size={16} className="text-green-400" />} tone="green" />
                    <MetricCard title="Negative XP (30d)" value={classMetrics.totalNegative.toLocaleString()} icon={<TrendingDown size={16} className="text-rose-400" />} tone="rose" />
                    <MetricCard title="Net XP (30d)" value={classMetrics.totalNet.toLocaleString()} icon={<Activity size={16} className="text-cyan-300" />} tone="cyan" />
                    <MetricCard title="Students < 0 Net" value={classMetrics.studentsWithNegativeNet.toString()} icon={<User size={16} className="text-yellow-300" />} tone="amber" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
                    <div className="xl:col-span-2 border border-cyan-500/20 rounded-xl bg-black/40 p-4">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <button
                                onClick={() => setViewMode("class")}
                                className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded border ${viewMode === "class" ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-cyan-900 text-cyan-500"}`}
                            >
                                Whole Class
                            </button>
                            <button
                                onClick={() => setViewMode("grade")}
                                className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded border ${viewMode === "grade" ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-cyan-900 text-cyan-500"}`}
                            >
                                By Grade
                            </button>
                            <select
                                value={gradeFilter}
                                onChange={(event) => setGradeFilter(event.target.value)}
                                disabled={viewMode !== "grade"}
                                aria-label="Grade filter"
                                title="Filter by grade"
                                className="ml-auto bg-black border border-cyan-800 rounded px-3 py-1.5 text-xs text-cyan-300 disabled:opacity-40"
                            >
                                <option value="all">All Grades</option>
                                {grades.map((grade) => (
                                    <option key={grade} value={grade}>Grade {grade}</option>
                                ))}
                            </select>
                            <select
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value as SortMode)}
                                aria-label="Sort students"
                                title="Sort students"
                                className="bg-black border border-cyan-800 rounded px-3 py-1.5 text-xs text-cyan-300"
                            >
                                <option value="net30">Sort: Net XP</option>
                                <option value="positive30">Sort: Positive XP</option>
                                <option value="negative30">Sort: Negative XP</option>
                                <option value="dailyAvg30">Sort: Daily Avg</option>
                            </select>
                        </div>

                        <div className="overflow-auto rounded-lg border border-cyan-900/50">
                            <table className="min-w-full text-sm">
                                <thead className="bg-cyan-950/40 text-cyan-300 uppercase text-[11px] tracking-wider">
                                    <tr>
                                        <th className="text-left px-3 py-2">Student</th>
                                        <th className="text-left px-3 py-2">Grade</th>
                                        <th className="text-right px-3 py-2">+ XP</th>
                                        <th className="text-right px-3 py-2">- XP</th>
                                        <th className="text-right px-3 py-2">Net</th>
                                        <th className="text-right px-3 py-2">Daily Avg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentSummaries.map((row) => (
                                        <tr key={row.uid} className="border-t border-cyan-900/30 hover:bg-white/5">
                                            <td className="px-3 py-2 text-white">{row.displayName}</td>
                                            <td className="px-3 py-2 text-cyan-400">{row.grade}</td>
                                            <td className="px-3 py-2 text-right text-green-300">{row.positive30}</td>
                                            <td className="px-3 py-2 text-right text-rose-300">{row.negative30}</td>
                                            <td className={`px-3 py-2 text-right font-bold ${row.net30 >= 0 ? "text-cyan-200" : "text-rose-300"}`}>{row.net30}</td>
                                            <td className={`px-3 py-2 text-right ${row.dailyAvg30 >= 0 ? "text-cyan-300" : "text-rose-300"}`}>{row.dailyAvg30}</td>
                                        </tr>
                                    ))}
                                    {studentSummaries.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-6 text-center text-cyan-500">No students/events in this scope yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="border border-cyan-500/20 rounded-xl bg-black/40 p-4">
                        <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs mb-3">
                            <BarChart3 size={14} className="text-cyan-400" />
                            Trend View
                        </div>
                        <select
                            value={selectedStudentId}
                            onChange={(event) => setSelectedStudentId(event.target.value)}
                            aria-label="Student trend selection"
                            title="Select student trend"
                            className="w-full bg-black border border-cyan-800 rounded px-3 py-2 text-xs text-cyan-300 mb-3"
                        >
                            <option value="all">Whole Class</option>
                            {studentSummaries.map((row) => (
                                <option key={row.uid} value={row.uid}>{row.displayName}</option>
                            ))}
                        </select>

                        <div className="text-[11px] uppercase tracking-wider text-cyan-500 mb-2 flex items-center gap-2">
                            <CalendarDays size={12} />
                            {selectedStudentName} — Net XP (30d)
                        </div>

                        <div className="space-y-1.5 max-h-[420px] overflow-auto pr-1">
                            {selectedStudentTrend.map((point) => {
                                const filledUnits = Math.max(1, Math.round((Math.abs(point.net) / maxTrendMagnitude) * 20));
                                return (
                                    <div key={point.day} className="grid grid-cols-[72px_1fr_56px] items-center gap-2 text-[11px]">
                                        <span className="text-cyan-600">{point.day.slice(5)}</span>
                                        <div className="h-2 rounded bg-black/50 border border-cyan-900/40 overflow-hidden grid grid-cols-20 gap-px">
                                            {Array.from({ length: 20 }, (_, idx) => (
                                                <div
                                                    key={`${point.day}-${idx}`}
                                                    className={idx < filledUnits ? (point.net >= 0 ? "bg-green-500/70" : "bg-rose-500/70") : "bg-transparent"}
                                                />
                                            ))}
                                        </div>
                                        <span className={`text-right font-bold ${point.net >= 0 ? "text-green-300" : "text-rose-300"}`}>{point.net}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
                    <div className="border border-cyan-500/20 rounded-xl bg-black/40 p-4">
                        <div className="text-[11px] uppercase tracking-wider text-cyan-500 mb-3">Top Gainer (30d)</div>
                        {topGainer ? (
                            <>
                                <div className="text-white text-xl font-black truncate">{topGainer.displayName}</div>
                                <div className="text-xs text-cyan-500 uppercase tracking-widest mb-3">Grade {topGainer.grade}</div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded border border-green-500/20 bg-green-500/10 py-2">
                                        <div className="text-[10px] uppercase text-green-300">+XP</div>
                                        <div className="text-green-200 font-bold">{topGainer.positive30}</div>
                                    </div>
                                    <div className="rounded border border-rose-500/20 bg-rose-500/10 py-2">
                                        <div className="text-[10px] uppercase text-rose-300">-XP</div>
                                        <div className="text-rose-200 font-bold">{topGainer.negative30}</div>
                                    </div>
                                    <div className="rounded border border-cyan-500/20 bg-cyan-500/10 py-2">
                                        <div className="text-[10px] uppercase text-cyan-300">Net</div>
                                        <div className="text-cyan-100 font-bold">{topGainer.net30}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-cyan-500">No 30-day XP data yet.</div>
                        )}
                    </div>

                    <div className="border border-cyan-500/20 rounded-xl bg-black/40 p-4">
                        <div className="text-[11px] uppercase tracking-wider text-cyan-500 mb-3">Top Decliner (30d)</div>
                        {topDecliner ? (
                            <>
                                <div className="text-white text-xl font-black truncate">{topDecliner.displayName}</div>
                                <div className="text-xs text-cyan-500 uppercase tracking-widest mb-3">Grade {topDecliner.grade}</div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded border border-green-500/20 bg-green-500/10 py-2">
                                        <div className="text-[10px] uppercase text-green-300">+XP</div>
                                        <div className="text-green-200 font-bold">{topDecliner.positive30}</div>
                                    </div>
                                    <div className="rounded border border-rose-500/20 bg-rose-500/10 py-2">
                                        <div className="text-[10px] uppercase text-rose-300">-XP</div>
                                        <div className="text-rose-200 font-bold">{topDecliner.negative30}</div>
                                    </div>
                                    <div className="rounded border border-rose-500/20 bg-rose-500/10 py-2">
                                        <div className="text-[10px] uppercase text-rose-300">Net</div>
                                        <div className="text-rose-100 font-bold">{topDecliner.net30}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-cyan-500">No declining student in the current filter.</div>
                        )}
                    </div>

                    <div className="border border-amber-500/20 rounded-xl bg-black/40 p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-amber-300 mb-3">
                            <AlertTriangle size={12} />
                            Intervention Watchlist
                        </div>
                        <div className="space-y-2 max-h-[208px] overflow-auto pr-1">
                            {interventionWatchlist.length > 0 ? interventionWatchlist.map((row) => (
                                <div key={`watch-${row.uid}`} className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-white text-sm truncate">{row.displayName}</div>
                                        <div className={`text-xs font-bold ${row.net30 >= 0 ? "text-cyan-300" : "text-rose-300"}`}>{row.net30} net</div>
                                    </div>
                                    <div className="text-[10px] uppercase tracking-widest text-amber-200/80 mt-1">Grade {row.grade} • -XP {row.negative30} • +XP {row.positive30}</div>
                                </div>
                            )) : (
                                <div className="text-sm text-cyan-500">No high-risk trend detected in the current scope.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border border-cyan-500/20 rounded-xl bg-black/40 p-4 mb-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-[11px] uppercase tracking-wider text-cyan-500">Grade Comparison (In-Class, 30d)</div>
                        <div className="text-[10px] uppercase tracking-widest text-cyan-600">Last 7-day sparkline shown per grade</div>
                    </div>
                    <div className="overflow-auto rounded-lg border border-cyan-900/50">
                        <table className="min-w-full text-sm">
                            <thead className="bg-cyan-950/40 text-cyan-300 uppercase text-[11px] tracking-wider">
                                <tr>
                                    <th className="text-left px-3 py-2">Grade</th>
                                    <th className="text-right px-3 py-2">Students</th>
                                    <th className="text-right px-3 py-2">+ XP</th>
                                    <th className="text-right px-3 py-2">- XP</th>
                                    <th className="text-right px-3 py-2">Net</th>
                                    <th className="text-right px-3 py-2">Daily Avg / Student</th>
                                    <th className="text-left px-3 py-2">7d Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gradeSummaries.map((grade) => (
                                    <tr key={`grade-row-${grade.grade}`} className="border-t border-cyan-900/30 hover:bg-white/5">
                                        <td className="px-3 py-2 text-white">{grade.grade}</td>
                                        <td className="px-3 py-2 text-right text-cyan-300">{grade.studentCount}</td>
                                        <td className="px-3 py-2 text-right text-green-300">{grade.positive30}</td>
                                        <td className="px-3 py-2 text-right text-rose-300">{grade.negative30}</td>
                                        <td className={`px-3 py-2 text-right font-bold ${grade.net30 >= 0 ? "text-cyan-200" : "text-rose-300"}`}>{grade.net30}</td>
                                        <td className={`px-3 py-2 text-right ${grade.dailyAvgPerStudent >= 0 ? "text-cyan-300" : "text-rose-300"}`}>{grade.dailyAvgPerStudent}</td>
                                        <td className="px-3 py-2">
                                            <div className="grid grid-cols-7 gap-1 min-w-[120px]">
                                                {grade.last7Net.map((point, idx) => (
                                                    <div
                                                        key={`grade-${grade.grade}-spark-${idx}`}
                                                        className={`h-3 rounded-sm ${point > 0 ? "bg-green-500/70" : point < 0 ? "bg-rose-500/70" : "bg-cyan-900/50"}`}
                                                        title={`${point}`}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {gradeSummaries.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-6 text-center text-cyan-500">No grade trend data available yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="border border-cyan-500/20 rounded-xl bg-black/40 p-4 text-xs text-cyan-500">
                    Data notes: Trend window defaults to last 30 days. Positive and negative XP are shown separately. This dashboard uses `xpEvents` telemetry; legacy awards before event logging may not appear in trend history.
                </div>

                <div className="mt-4 text-[11px] text-cyan-600 uppercase tracking-wider">
                    Event source: {usingFallbackEvents ? "lastAward fallback" : "xpEvents"} • Loaded events: {effectiveEvents30.length}
                    {eventsListenerError ? ` • Listener error: ${eventsListenerError}` : ""}
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    icon,
    tone,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    tone: "green" | "rose" | "cyan" | "amber";
}) {
    const toneClass = tone === "green"
        ? "border-green-500/30"
        : tone === "rose"
            ? "border-rose-500/30"
            : tone === "amber"
                ? "border-amber-500/30"
                : "border-cyan-500/30";

    return (
        <div className={`rounded-xl border ${toneClass} bg-black/40 p-4`}>
            <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-cyan-500">{title}</div>
                {icon}
            </div>
            <div className="text-2xl font-black text-white tracking-wide">{value}</div>
        </div>
    );
}
