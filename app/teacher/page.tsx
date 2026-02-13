"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Compass, Lock, Rocket, Power } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function TeacherAdventurePortal() {
  const { userData, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!userData) {
      router.push("/login");
      return;
    }

    if (userData.status === "pending_approval") {
      router.push("/pending");
      return;
    }

    if (userData.role === "student") {
      router.push("/student");
    }
  }, [loading, userData, router]);

  if (loading || !userData || userData.role !== "teacher") {
    return <div className="min-h-screen bg-slate-100" />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Teacher Portal</p>
            <h1 className="text-4xl font-bold tracking-tight">Choose your adventure</h1>
            <p className="text-slate-600 mt-2">One class roster, one XP system, multiple game worlds.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
          >
            <Power className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/teacher/space"
            className="group rounded-2xl border border-emerald-300 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Space Adventure</h2>
            <p className="text-slate-600">Launch classroom control, missions, rewards, and the live map.</p>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-75">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                <Lock className="w-3 h-3" /> Soon
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Frontier Trail</h2>
            <p className="text-slate-600">Adventure selection will unlock here when this world launches.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-75">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                <Lock className="w-3 h-3" /> Soon
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Arcane Academy</h2>
            <p className="text-slate-600">Adventure selection will unlock here when this world launches.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
