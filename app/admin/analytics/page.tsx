"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";

type AnalyticsUser = UserData & { uid: string };

type TeacherHealthRow = {
  uid: string;
  name: string;
  email: string;
  schoolName: string;
  studentCount: number;
  activeStudents7d: number;
  avgXP: number;
  completedMissions: number;
  passRate: number;
  atRisk: boolean;
};

const DEFAULT_MONTHLY_PRICE = 10;
const DEFAULT_YEARLY_PRICE = 80;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

export default function AdminAnalyticsPage() {
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    try {
      const snapshot = await getDocs(query(collection(db, "users")));
      const allUsers = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as AnalyticsUser));
      setUsers(allUsers);
    } catch (error) {
      console.error("Analytics fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const analytics = useMemo(() => {
    const now = Date.now();
    const day7Start = now - 7 * MILLISECONDS_IN_DAY;
    const day30Start = now - 30 * MILLISECONDS_IN_DAY;

    const teachers = users.filter((u) => u.role === "teacher");
    const students = users.filter((u) => u.role === "student");

    const studentsByTeacher = new Map<string, AnalyticsUser[]>();
    for (const student of students) {
      if (!student.teacherId) continue;
      const list = studentsByTeacher.get(student.teacherId) || [];
      list.push(student);
      studentsByTeacher.set(student.teacherId, list);
    }

    let studentActive7d = 0;
    let studentActive30d = 0;
    let totalAttemptedEntries = 0;
    let totalCompletedEntries = 0;
    let totalPassedEntries = 0;
    let totalStudentXP = 0;

    for (const student of students) {
      totalStudentXP += student.xp || 0;
      const progressEntries = Object.values(student.missionProgress || {});
      const has7dActivity = progressEntries.some((entry) => {
        const attemptAt = toTimestamp(entry?.lastAttemptAt);
        return attemptAt !== null && attemptAt >= day7Start;
      });
      const has30dActivity = progressEntries.some((entry) => {
        const attemptAt = toTimestamp(entry?.lastAttemptAt);
        return attemptAt !== null && attemptAt >= day30Start;
      });

      if (has7dActivity) studentActive7d += 1;
      if (has30dActivity) studentActive30d += 1;

      for (const entry of progressEntries) {
        if (!entry) continue;
        const attempts = Number(entry.attempts || 0);
        if (attempts > 0) totalAttemptedEntries += 1;
        if (entry.completedAt) totalCompletedEntries += 1;
        if (entry.passedEver) totalPassedEntries += 1;
      }
    }

    const teacherRows: TeacherHealthRow[] = teachers.map((teacher) => {
      const roster = studentsByTeacher.get(teacher.uid) || [];
      const studentCount = roster.length;

      let activeStudents7d = 0;
      let xpTotal = 0;
      let completedMissions = 0;
      let attempted = 0;
      let passed = 0;
      let hasRecentXpAward = false;

      for (const student of roster) {
        xpTotal += student.xp || 0;

        const lastAwardAt = toTimestamp(student.lastAward?.timestamp);
        const lastAwardXp = Number(student.lastAward?.xpGained || 0);
        if (lastAwardXp > 0 && lastAwardAt !== null && lastAwardAt >= day7Start) {
          hasRecentXpAward = true;
        }

        const entries = Object.values(student.missionProgress || {});
        let studentRecent = false;

        for (const entry of entries) {
          if (!entry) continue;

          if (entry.completedAt) completedMissions += 1;
          if (entry.passedEver) passed += 1;
          if ((entry.attempts || 0) > 0) attempted += 1;

          const attemptAt = toTimestamp(entry.lastAttemptAt);
          if (attemptAt !== null && attemptAt >= day7Start) {
            studentRecent = true;
          }
        }

        if (studentRecent) activeStudents7d += 1;
      }

      return {
        uid: teacher.uid,
        name: teacher.displayName || "(No name)",
        email: teacher.email || "",
        schoolName: teacher.schoolName || "-",
        studentCount,
        activeStudents7d,
        avgXP: studentCount ? Math.round(xpTotal / studentCount) : 0,
        completedMissions,
        passRate: attempted ? Math.round((passed / attempted) * 100) : 0,
        atRisk: studentCount === 0 || !hasRecentXpAward,
      };
    });

    teacherRows.sort((a, b) => {
      if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
      return b.studentCount - a.studentCount;
    });

    const subscribers = teachers.filter((t) => t.subscriptionStatus === "active");
    const churnRisk = subscribers.filter((t) => Boolean(t.stripeCancelAtPeriodEnd)).length;

    let mrrEstimate = 0;
    let yearlySubscribers = 0;
    let monthlySubscribers = 0;

    for (const teacher of subscribers) {
      const interval = teacher.stripeSubscriptionInterval || inferIntervalFromPriceId(teacher.stripePriceId);
      const paid = typeof teacher.stripeLastPaymentAmount === "number" ? teacher.stripeLastPaymentAmount : null;

      if (interval === "year") {
        yearlySubscribers += 1;
        mrrEstimate += (paid || DEFAULT_YEARLY_PRICE) / 12;
      } else {
        monthlySubscribers += 1;
        mrrEstimate += paid || DEFAULT_MONTHLY_PRICE;
      }
    }

    const teacherApproved = teachers.filter((t) => t.status === "active").length;
    const teacherWithClass = teachers.filter((t) => (studentsByTeacher.get(t.uid) || []).length > 0).length;
    const teacherWithActiveClass = teachers.filter((t) => {
      const roster = studentsByTeacher.get(t.uid) || [];
      return roster.some((student) =>
        Object.values(student.missionProgress || {}).some((entry) => {
          const attemptAt = toTimestamp(entry?.lastAttemptAt);
          return attemptAt !== null && attemptAt >= day7Start;
        })
      );
    }).length;

    const cohorts = new Map<string, { total: number; paid: number }>();

    for (const teacher of teachers) {
      const created = toDate(teacher.createdAt);
      if (!created) continue;
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const current = cohorts.get(key) || { total: 0, paid: 0 };
      current.total += 1;
      if (teacher.subscriptionStatus === "active") current.paid += 1;
      cohorts.set(key, current);
    }

    const cohortRows = Array.from(cohorts.entries())
      .map(([month, values]) => ({
        month,
        totalTeachers: values.total,
        paidTeachers: values.paid,
        conversionRate: values.total > 0 ? Math.round((values.paid / values.total) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .reverse();

    return {
      totals: {
        users: users.length,
        teachers: teachers.length,
        students: students.length,
        pendingApproval: users.filter((u) => u.status === "pending_approval").length,
      },
      funnel: {
        teacherSignedUp: teachers.length,
        teacherApproved,
        teacherWithClass,
        teacherWithActiveClass,
        teacherPaid: subscribers.length,
      },
      studentEngagement: {
        active7d: studentActive7d,
        active30d: studentActive30d,
        active7dRate: students.length ? Math.round((studentActive7d / students.length) * 100) : 0,
        active30dRate: students.length ? Math.round((studentActive30d / students.length) * 100) : 0,
        avgXP: students.length ? Math.round(totalStudentXP / students.length) : 0,
        completionRate: totalAttemptedEntries ? Math.round((totalCompletedEntries / totalAttemptedEntries) * 100) : 0,
        passRate: totalAttemptedEntries ? Math.round((totalPassedEntries / totalAttemptedEntries) * 100) : 0,
      },
      revenue: {
        activeSubscribers: subscribers.length,
        monthlySubscribers,
        yearlySubscribers,
        trialTeachers: teachers.filter((t) => (t.subscriptionStatus || "trial") === "trial").length,
        churnRisk,
        mrrEstimate,
      },
      cohorts: cohortRows,
      teacherHealth: teacherRows,
    };
  }, [users]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Growth, engagement, conversion, and classroom health from live user data.</p>
        </div>
        <button
          onClick={() => fetchData(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-20">
          <Loader2 className="animate-spin text-slate-500" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Users" value={String(analytics.totals.users)} />
            <MetricCard label="Teachers" value={String(analytics.totals.teachers)} />
            <MetricCard label="Students" value={String(analytics.totals.students)} />
            <MetricCard label="Pending Approval" value={String(analytics.totals.pendingApproval)} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Teacher Funnel</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Signed Up" value={String(analytics.funnel.teacherSignedUp)} compact />
              <MetricCard label="Approved" value={String(analytics.funnel.teacherApproved)} compact />
              <MetricCard label="With Class" value={String(analytics.funnel.teacherWithClass)} compact />
              <MetricCard label="Active Class (7d)" value={String(analytics.funnel.teacherWithActiveClass)} compact />
              <MetricCard label="Paid" value={String(analytics.funnel.teacherPaid)} compact />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Student Engagement</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Active 7d" value={`${analytics.studentEngagement.active7d} (${analytics.studentEngagement.active7dRate}%)`} compact />
                <MetricCard label="Active 30d" value={`${analytics.studentEngagement.active30d} (${analytics.studentEngagement.active30dRate}%)`} compact />
                <MetricCard label="Avg Student XP" value={String(analytics.studentEngagement.avgXP)} compact />
                <MetricCard label="Completion Rate" value={`${analytics.studentEngagement.completionRate}%`} compact />
                <MetricCard label="Pass Rate" value={`${analytics.studentEngagement.passRate}%`} compact />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Revenue & Subscription</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Active Subscribers" value={String(analytics.revenue.activeSubscribers)} compact />
                <MetricCard label="Monthly Subs" value={String(analytics.revenue.monthlySubscribers)} compact />
                <MetricCard label="Yearly Subs" value={String(analytics.revenue.yearlySubscribers)} compact />
                <MetricCard label="Trial Teachers" value={String(analytics.revenue.trialTeachers)} compact />
                <MetricCard label="Churn Risk" value={String(analytics.revenue.churnRisk)} compact />
                <MetricCard label="MRR Estimate" value={formatMoney(analytics.revenue.mrrEstimate)} compact />
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Teacher Cohorts (Last 12 Months)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Cohort</th>
                    <th className="px-3 py-2">Teachers</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.cohorts.map((cohort) => (
                    <tr key={cohort.month} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{cohort.month}</td>
                      <td className="px-3 py-2">{cohort.totalTeachers}</td>
                      <td className="px-3 py-2">{cohort.paidTeachers}</td>
                      <td className="px-3 py-2">{cohort.conversionRate}%</td>
                    </tr>
                  ))}
                  {analytics.cohorts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                        No cohort data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Teacher Health</h2>
            <p className="mt-1 text-xs text-slate-500">At-risk indicates no student XP awarded in the last 7 days or no roster.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">School</th>
                    <th className="px-3 py-2">Students</th>
                    <th className="px-3 py-2">Active 7d</th>
                    <th className="px-3 py-2">Avg XP</th>
                    <th className="px-3 py-2">Completed Missions</th>
                    <th className="px-3 py-2">Pass Rate</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.teacherHealth.map((row) => (
                    <tr key={row.uid} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.email || "No email"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">{row.schoolName}</td>
                      <td className="px-3 py-2">{row.studentCount}</td>
                      <td className="px-3 py-2">{row.activeStudents7d}</td>
                      <td className="px-3 py-2">{row.avgXP}</td>
                      <td className="px-3 py-2">{row.completedMissions}</td>
                      <td className="px-3 py-2">{row.passRate}%</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${
                            row.atRisk
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {row.atRisk ? "At Risk" : "Healthy"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {analytics.teacherHealth.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                        No teacher data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-semibold text-slate-900`}>{value}</p>
    </div>
  );
}

function toDate(value: any): Date | null {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const parsed = value.toDate();
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) return parsed;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function toTimestamp(value: any): number | null {
  const parsed = toDate(value);
  return parsed ? parsed.getTime() : null;
}

function inferIntervalFromPriceId(priceId?: string | null): "month" | "year" | null {
  if (!priceId) return null;
  const lowered = priceId.toLowerCase();
  if (lowered.includes("year") || lowered.includes("annual")) return "year";
  if (lowered.includes("month")) return "month";
  return null;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
