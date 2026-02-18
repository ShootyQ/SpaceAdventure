"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { isTeacherAccessRestricted } from "@/lib/subscription";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [teacherAccessLoading, setTeacherAccessLoading] = useState(true);
  const [teacherRestricted, setTeacherRestricted] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!userData) {
      router.replace("/login?role=student");
      return;
    }

    if (userData.role === "teacher") {
      router.replace("/teacher");
      return;
    }

    if (userData.role === "admin") {
      router.replace("/admin");
      return;
    }
  }, [loading, userData, router, pathname]);

  useEffect(() => {
    if (loading) return;

    if (!userData || userData.role !== "student") {
      setTeacherAccessLoading(false);
      setTeacherRestricted(false);
      return;
    }

    if (!userData.teacherId) {
      setTeacherAccessLoading(false);
      setTeacherRestricted(false);
      return;
    }

    setTeacherAccessLoading(true);
    const teacherRef = doc(db, "users", userData.teacherId);

    const unsubscribe = onSnapshot(
      teacherRef,
      (teacherSnap) => {
        if (!teacherSnap.exists()) {
          setTeacherRestricted(false);
          setTeacherAccessLoading(false);
          return;
        }

        const teacherData = { uid: teacherSnap.id, ...teacherSnap.data() } as UserData;
        setTeacherRestricted(isTeacherAccessRestricted(teacherData));
        setTeacherAccessLoading(false);
      },
      () => {
        setTeacherRestricted(false);
        setTeacherAccessLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loading, userData]);

  if (loading || (userData?.role === "student" && teacherAccessLoading)) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
        Loading cadet systems...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
        Redirecting to login...
      </div>
    );
  }

  if (userData.role !== "student") {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center text-cyan-300 font-mono">
        Redirecting to your dashboard...
      </div>
    );
  }

  if (teacherRestricted) {
    return (
      <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-300 flex items-center justify-center">
        <div className="max-w-xl w-full bg-black/50 border border-yellow-500/30 rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Class Access Paused</h1>
          <p className="text-cyan-200/80 text-sm leading-relaxed">
            Your teacher&apos;s subscription is currently inactive, so student gameplay is temporarily paused.
            Your progress is safe and will be available again once billing is reactivated.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg uppercase tracking-wider text-xs font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
