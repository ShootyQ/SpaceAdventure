"use client";

import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";
import { ClassResourceDashboard } from "@/components/ClassResourceDashboard";

export default function TeacherResourcesPage() {
    const { user, userData } = useAuth();
    const { activeTeacherId, teacherOptions } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;
    const teacherLabel = teacherOptions.find((option) => option.uid === teacherScopeId)?.schoolName
        || teacherOptions.find((option) => option.uid === teacherScopeId)?.displayName
        || userData?.schoolName
        || userData?.displayName
        || "Current Class";

    return (
        <div className="min-h-screen bg-[#07111f] px-6 py-10 text-white">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/teacher/space" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-white transition-colors">
                            <ArrowLeft size={16} /> Back to Command Deck
                        </Link>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-200">
                                <Globe size={22} />
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Teacher View</div>
                                <h1 className="text-3xl font-bold text-white">{teacherLabel}</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <ClassResourceDashboard teacherId={teacherScopeId} />
            </div>
        </div>
    );
}