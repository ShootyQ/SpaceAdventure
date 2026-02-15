"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";

interface PaymentUser extends UserData {
  uid: string;
}

const DEFAULT_MONTHLY_PRICE = 10;
const DEFAULT_YEARLY_PRICE = 80;

export default function AdminPaymentsPage() {
  const [users, setUsers] = useState<PaymentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    try {
      const snapshot = await getDocs(query(collection(db, "users")));
      const allUsers = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as PaymentUser));
      setUsers(allUsers);
    } catch (error) {
      console.error("Payments fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const metrics = useMemo(() => {
    const teachers = users.filter((u) => u.role === "teacher");
    const subscribers = teachers.filter((t) => t.subscriptionStatus === "active");

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let newDaily = 0;
    let newMonthly = 0;
    let newYearly = 0;
    let revenueDay = 0;
    let revenueMonth = 0;
    let revenueYear = 0;
    let mrrEstimate = 0;

    for (const user of subscribers) {
      const activatedAt = parseDate(user.subscriptionActivatedAt || user.stripeCurrentPeriodStart);
      if (activatedAt) {
        if (activatedAt >= dayStart) newDaily += 1;
        if (activatedAt >= monthStart) newMonthly += 1;
        if (activatedAt >= yearStart) newYearly += 1;
      }

      const interval = user.stripeSubscriptionInterval || inferIntervalFromPriceId(user.stripePriceId);
      const paid = typeof user.stripeLastPaymentAmount === "number" ? user.stripeLastPaymentAmount : inferAmount(user, interval);
      const paidAt = parseDate(user.stripeLastPaymentAt);

      if (paidAt) {
        if (paidAt >= dayStart) revenueDay += paid;
        if (paidAt >= monthStart) revenueMonth += paid;
        if (paidAt >= yearStart) revenueYear += paid;
      }

      if (interval === "month") {
        mrrEstimate += paid || DEFAULT_MONTHLY_PRICE;
      } else if (interval === "year") {
        mrrEstimate += (paid || DEFAULT_YEARLY_PRICE) / 12;
      }
    }

    return {
      teacherCount: teachers.length,
      activeSubscriberCount: subscribers.length,
      trialCount: teachers.filter((t) => (t.subscriptionStatus || "trial") === "trial").length,
      newDaily,
      newMonthly,
      newYearly,
      revenueDay,
      revenueMonth,
      revenueYear,
      mrrEstimate,
      subscribers,
    };
  }, [users]);

  const exportCsv = () => {
    const rows = metrics.subscribers.map((user) => {
      const interval = user.stripeSubscriptionInterval || inferIntervalFromPriceId(user.stripePriceId);
      return {
        name: user.displayName || "",
        email: user.email || "",
        schoolName: user.schoolName || "",
        status: user.subscriptionStatus || "",
        interval,
        stripePriceId: user.stripePriceId || "",
        activatedAt: formatDate(user.subscriptionActivatedAt || user.stripeCurrentPeriodStart),
        currentPeriodEnd: formatDate(user.stripeCurrentPeriodEnd),
        lastPaymentAt: formatDate(user.stripeLastPaymentAt),
        lastPaymentAmount: typeof user.stripeLastPaymentAmount === "number" ? user.stripeLastPaymentAmount.toFixed(2) : "",
      };
    });

    const headers = [
      "name",
      "email",
      "schoolName",
      "status",
      "interval",
      "stripePriceId",
      "activatedAt",
      "currentPeriodEnd",
      "lastPaymentAt",
      "lastPaymentAmount",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCsv(String((row as any)[h] || ""))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payments-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payments Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Subscription growth, collections, and downloadable report rows.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to Admin
          </Link>
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-20">
          <Loader2 className="animate-spin text-slate-500" size={32} />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Active Subscriptions" value={String(metrics.activeSubscriberCount)} />
            <MetricCard label="Trial Teachers" value={String(metrics.trialCount)} />
            <MetricCard label="New Today" value={String(metrics.newDaily)} />
            <MetricCard label="New This Month" value={String(metrics.newMonthly)} />
            <MetricCard label="New This Year" value={String(metrics.newYearly)} />
            <MetricCard label="Revenue Today" value={formatMoney(metrics.revenueDay)} />
            <MetricCard label="Revenue This Month" value={formatMoney(metrics.revenueMonth)} />
            <MetricCard label="Revenue This Year" value={formatMoney(metrics.revenueYear)} />
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Estimated Recurring Run Rate</h2>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(metrics.mrrEstimate)} / month</p>
            <p className="mt-1 text-xs text-slate-500">
              Estimate uses last payment amount when available; otherwise defaults to ${DEFAULT_MONTHLY_PRICE}/month and
              ${DEFAULT_YEARLY_PRICE}/year.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">School</th>
                    <th className="px-3 py-2">Interval</th>
                    <th className="px-3 py-2">Price ID</th>
                    <th className="px-3 py-2">Activated</th>
                    <th className="px-3 py-2">Current Period End</th>
                    <th className="px-3 py-2">Last Payment</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.subscribers.map((user) => (
                    <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-900">{user.displayName || "(No name)"}</p>
                          <p className="text-xs text-slate-500">{user.email || "No email"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">{user.schoolName || "-"}</td>
                      <td className="px-3 py-2">{user.stripeSubscriptionInterval || inferIntervalFromPriceId(user.stripePriceId) || "unknown"}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{user.stripePriceId || "-"}</td>
                      <td className="px-3 py-2">{formatDate(user.subscriptionActivatedAt || user.stripeCurrentPeriodStart)}</td>
                      <td className="px-3 py-2">{formatDate(user.stripeCurrentPeriodEnd)}</td>
                      <td className="px-3 py-2">{formatDate(user.stripeLastPaymentAt)}</td>
                      <td className="px-3 py-2">{typeof user.stripeLastPaymentAmount === "number" ? formatMoney(user.stripeLastPaymentAmount) : "-"}</td>
                    </tr>
                  ))}

                  {metrics.subscribers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                        No active subscriptions found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  try {
    if (value?.toDate) return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function formatDate(value: any): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : "Not available";
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function inferIntervalFromPriceId(priceId?: string): "month" | "year" | "" {
  if (!priceId) return "";
  const lower = priceId.toLowerCase();
  if (lower.includes("month")) return "month";
  if (lower.includes("year")) return "year";
  return "";
}

function inferAmount(user: PaymentUser, interval: "month" | "year" | "") {
  if (typeof user.stripeLastPaymentAmount === "number") return user.stripeLastPaymentAmount;
  if (interval === "month") return DEFAULT_MONTHLY_PRICE;
  if (interval === "year") return DEFAULT_YEARLY_PRICE;
  return 0;
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
