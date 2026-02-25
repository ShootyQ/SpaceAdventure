"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TeacherScopeProvider, useTeacherScope } from "@/context/TeacherScopeContext";
import Link from "next/link";
import { getTeacherTrialInfo, isTeacherAccessRestricted, isTeacherTrialActive } from "@/lib/subscription";

function TeacherClassScopeBar() {
  const { userData } = useAuth();
  const { activeTeacherId, setActiveTeacherId, teacherOptions, loadingTeacherOptions } = useTeacherScope();

  if (!userData || userData.role !== "teacher") return null;
  if (loadingTeacherOptions) return null;
  if (teacherOptions.length <= 1) return null;

  return (
    <div className="sticky top-0 z-[55] border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Class</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">Viewing:</span>
          <select
            value={activeTeacherId || userData.uid}
            onChange={(event) => setActiveTeacherId(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800"
          >
            {teacherOptions.map((option) => {
              const label = option.schoolName || option.displayName || option.email || "Class";
              return (
                <option key={option.uid} value={option.uid}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    </div>
  );
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const restricted = isTeacherAccessRestricted(userData);
  const trialInfo = getTeacherTrialInfo(userData);
  const trialActive = isTeacherTrialActive(userData);
  const isSettingsRoute = pathname === "/teacher/settings";
  const trialDaysRemaining = trialInfo?.trialDaysRemaining ?? null;

  const showTrialNudge = trialActive && trialDaysRemaining !== null && trialDaysRemaining <= 7;
  const urgentTrialNudge = showTrialNudge && trialDaysRemaining <= 2;

  useEffect(() => {
    if (loading) return;

    if (!userData) {
      router.replace(`/login?role=teacher&redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (userData.status === "pending_approval") {
      router.replace("/pending");
      return;
    }

    if (userData.role === "student") {
      router.replace("/student");
      return;
    }

    if (userData.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (restricted && !isSettingsRoute) {
      router.replace("/teacher/settings?mode=billing&restricted=1");
    }
  }, [loading, userData, restricted, isSettingsRoute, router]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        Loading teacher portal...
      </div>
    );
  }

  if (userData.role !== "teacher") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 px-6 text-center">
        Redirecting to your dashboard...
      </div>
    );
  }

  if (restricted && !isSettingsRoute) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 px-6 text-center">
        Subscription inactive. Redirecting to billing...
      </div>
    );
  }

  return (
    <TeacherScopeProvider>
      {showTrialNudge && (
        <div className={`sticky top-0 z-[60] border-b px-4 py-3 text-sm ${urgentTrialNudge ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-blue-50 border-blue-200 text-blue-900"}`}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="font-medium">
              {urgentTrialNudge
                ? `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"}. Access will pause unless billing is active.`
                : `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"}. Add billing to keep uninterrupted access.`}
            </p>
            <Link
              href="/teacher/settings?mode=billing"
              className="inline-flex items-center justify-center rounded-lg border border-current/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/50 transition-colors"
            >
              Open Billing
            </Link>
          </div>
        </div>
      )}
      <TeacherClassScopeBar />
      {children}
    </TeacherScopeProvider>
  );
}

