"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isTeacherAccessRestricted } from "@/lib/subscription";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const restricted = isTeacherAccessRestricted(userData);
  const isSettingsRoute = pathname === "/teacher/settings";

  useEffect(() => {
    if (loading) return;

    if (!userData) {
      router.replace("/login");
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

  return <>{children}</>;
}

