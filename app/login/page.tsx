"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GraduationCap, School } from "lucide-react";
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-white border border-slate-200 rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,0.12)] overflow-hidden">
        <div className="p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">ClassCrave</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Welcome back</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Sign in to continue to your classroom tools.
          </p>
        </div>

        <div className="p-10 lg:p-12">
          {loading ? (
            <div className="text-slate-500 animate-pulse">Checking session...</div>
          ) : userData ? (
            <div className="text-emerald-600 font-semibold">Signed in. Redirecting...</div>
          ) : loginMode === "selection" ? (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Choose sign in type</h2>

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
                <h2 className="text-xl font-semibold text-slate-900">Student Login</h2>
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
                    onChange={(e) =>
                      setStudentCreds({ ...studentCreds, classCode: e.target.value.toUpperCase() })
                    }
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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>
              )}

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
  );
}
