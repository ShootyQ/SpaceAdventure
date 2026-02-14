"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GraduationCap, School, ShieldCheck, Trophy, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { userData, signInWithGoogle, signInStudent, loading } = useAuth();
  const router = useRouter();

  const [loginMode, setLoginMode] = useState<"selection" | "student">("selection");
  const [studentCreds, setStudentCreds] = useState({ username: "", classCode: "", password: "" });
  const [error, setError] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (!loading && userData) {
      if (userData.status === "pending_approval") {
        router.push("/pending");
      } else if (userData.role === "teacher") {
        router.push("/teacher");
      } else if (userData.role === "student") {
        router.push("/student");
      }
    }
  }, [userData, loading, router]);

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStudentLoading(true);

    try {
      const email = `${studentCreds.username}.${studentCreds.classCode}@spaceadventure.local`;
      await signInStudent(email, studentCreds.password);
    } catch (err) {
      console.error(err);
      setError("Invalid login credentials.");
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <div className="landing-theme min-h-screen bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60 overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-20 w-[600px] h-[600px] bg-emerald-200/40 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 -left-24 w-[600px] h-[600px] bg-amber-200/40 blur-[160px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10 w-full flex-1 flex flex-col justify-center">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-10 transition-colors font-medium">
          <ArrowLeft size={18} /> Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          <div className="rounded-[2rem] border border-black/5 bg-white/80 backdrop-blur p-8 lg:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Classroom Access</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">Sign in to ClassCrave</h1>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              One login system for teachers and students. Professional tools, clear routines, and consistent classroom progress.
            </p>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Shared XP and rewards</h3>
                  <p className="text-sm text-slate-600">Keep one behavior system across every game world.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Teacher + student access</h3>
                  <p className="text-sm text-slate-600">Teacher Google login and student class-code credentials.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Safe by design</h3>
                  <p className="text-sm text-slate-600">Student accounts are teacher-controlled with no personal email required.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-8 lg:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
            {loading ? (
              <div className="text-slate-500 animate-pulse">Checking session...</div>
            ) : userData ? (
              <div className="text-emerald-700 font-semibold">Signed in. Redirecting...</div>
            ) : loginMode === "selection" ? (
              <div className="space-y-5">
                <h2 className="text-2xl font-semibold text-slate-900">Choose sign in type</h2>

                <button
                  onClick={signInWithGoogle}
                  className="w-full group flex items-center justify-between bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-semibold transition-all"
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 bg-white/20 rounded-lg">
                      <School className="w-5 h-5" />
                    </span>
                    Teacher Login
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest text-slate-400">
                    <span className="px-2 bg-white">or</span>
                  </div>
                </div>

                <button
                  onClick={() => setLoginMode("student")}
                  className="w-full group flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl font-semibold transition-all"
                >
                  <span className="flex items-center gap-3">
                    <span className="p-2 bg-white/15 rounded-lg">
                      <GraduationCap className="w-5 h-5" />
                    </span>
                    Student Login
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-semibold text-slate-900">Student Login</h2>
                  <button
                    type="button"
                    onClick={() => setLoginMode("selection")}
                    className="text-slate-500 hover:text-slate-900"
                    aria-label="Back to sign in type selection"
                    title="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Class Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={studentCreds.classCode}
                      onChange={(e) => setStudentCreds({ ...studentCreds, classCode: e.target.value.toUpperCase() })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="ABCD12"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={studentCreds.username}
                      onChange={(e) =>
                        setStudentCreds({
                          ...studentCreds,
                          username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        })
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="cadet"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="student-password" className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Password</label>
                  <input
                    id="student-password"
                    type="password"
                    required
                    value={studentCreds.password}
                    onChange={(e) => setStudentCreds({ ...studentCreds, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Student password"
                  />
                </div>

                {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl py-3 font-semibold"
                >
                  {studentLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
