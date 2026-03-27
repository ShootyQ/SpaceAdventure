"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ArrowLeft, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { ClassResourceDashboard } from "@/components/ClassResourceDashboard";

export default function AdminResourcesPage() {
    const { userData, loading } = useAuth();
    const router = useRouter();
    const [teachers, setTeachers] = useState<UserData[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

    useEffect(() => {
        if (loading) return;
        if (!userData) {
            router.replace("/login");
            return;
        }

        if (userData.role !== "admin") {
            router.replace("/admin");
        }
    }, [loading, router, userData]);

    useEffect(() => {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
            const nextTeachers = snapshot.docs.map((teacherDoc) => ({ ...(teacherDoc.data() as UserData), uid: teacherDoc.id }));
            nextTeachers.sort((left, right) => {
                const leftLabel = (left.schoolName || left.displayName || left.email || "").toLowerCase();
                const rightLabel = (right.schoolName || right.displayName || right.email || "").toLowerCase();
                return leftLabel.localeCompare(rightLabel);
            });
            setTeachers(nextTeachers);
            setSelectedTeacherId((current) => current || nextTeachers[0]?.uid || "");
        });

        return () => unsubscribe();
    }, []);

    const selectedTeacher = useMemo(
        () => teachers.find((teacher) => teacher.uid === selectedTeacherId) || null,
        [selectedTeacherId, teachers]
    );

    if (loading || !userData || userData.role !== "admin") {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
                Loading resource dashboard...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                            <ArrowLeft size={16} /> Back to Admin Console
                        </Link>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                                <Globe size={22} />
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin View</div>
                                <h1 className="text-3xl font-bold text-slate-900">Class Resource Dashboard</h1>
                            </div>
                        </div>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                        Teacher Scope
                        <select
                            value={selectedTeacherId}
                            onChange={(event) => setSelectedTeacherId(event.target.value)}
                            className="mt-2 w-full min-w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                        >
                            {teachers.map((teacher) => {
                                const label = teacher.schoolName || teacher.displayName || teacher.email || teacher.uid;
                                return (
                                    <option key={teacher.uid} value={teacher.uid}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                        {selectedTeacher ? (
                            <div className="mt-2 text-xs text-slate-500">Viewing discovery telemetry for {selectedTeacher.schoolName || selectedTeacher.displayName || selectedTeacher.email}.</div>
                        ) : null}
                    </label>
                </div>

                <ClassResourceDashboard
                    teacherId={selectedTeacherId || null}
                    title={selectedTeacher ? `${selectedTeacher.schoolName || selectedTeacher.displayName || selectedTeacher.email} Resource Dashboard` : "Class Resource Dashboard"}
                    subtitle="Admin readout for class discovery progress, field machines, and carried cargo."
                />
            </div>
        </div>
    );
}