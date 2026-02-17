"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, deleteField, doc, getDocs, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { Download, Edit3, Loader2, RefreshCw, Save, Trash2, X } from "lucide-react";

interface PaymentUser extends UserData {
  uid: string;
}

const DEFAULT_MONTHLY_PRICE = 10;
const DEFAULT_YEARLY_PRICE = 80;
const STRIPE_PERCENT_FEE = 0.029;
const STRIPE_FIXED_FEE = 0.3;

type BillingRow = {
  uid: string;
  name: string;
  email: string;
  schoolName: string;
  status: "trial" | "active";
  interval: "month" | "year" | "";
  priceId: string;
  subscriptionId: string;
  customerId: string;
  activatedAt: any;
  periodEnd: any;
  paymentAt: any;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  discountAmount: number;
  promoCode: string;
  cancelAtPeriodEnd: boolean;
};

type WebhookHealth = {
  stripeMode: "live" | "test" | "unknown";
  hasWebhookSecret: boolean;
  stripeInitialized: boolean;
  lastReceivedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  recentFailureCount: number;
  recentDuplicateCount: number;
};

export default function AdminPaymentsPage() {
  const [users, setUsers] = useState<PaymentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [webhookHealth, setWebhookHealth] = useState<WebhookHealth | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: "trial" as "trial" | "active",
    interval: "" as "" | "month" | "year",
    priceId: "",
    subscriptionId: "",
    customerId: "",
    activatedAt: "",
    periodEnd: "",
    paymentAt: "",
    grossAmount: "",
  });

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

  const fetchWebhookHealth = async () => {
    try {
      setHealthLoading(true);
      const response = await fetch("/api/webhooks/stripe", { method: "GET" });
      if (!response.ok) {
        setWebhookHealth(null);
        return;
      }

      const payload = await response.json();
      setWebhookHealth({
        stripeMode: payload?.stripeMode || "unknown",
        hasWebhookSecret: Boolean(payload?.hasWebhookSecret),
        stripeInitialized: Boolean(payload?.stripeInitialized),
        lastReceivedAt: payload?.health?.lastReceivedAt || null,
        lastSuccessAt: payload?.health?.lastSuccessAt || null,
        lastFailureAt: payload?.health?.lastFailureAt || null,
        recentFailureCount: Number(payload?.health?.recentFailureCount || 0),
        recentDuplicateCount: Number(payload?.health?.recentDuplicateCount || 0),
      });
    } catch {
      setWebhookHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookHealth();
  }, []);

  const billingRows = useMemo<BillingRow[]>(() => {
    const teachers = users.filter((u) => u.role === "teacher");

    return teachers
      .map((user) => {
        const interval = user.stripeSubscriptionInterval || inferIntervalFromPriceId(user.stripePriceId);
        const inferredAmount = inferAmount(user, interval);
        const grossAmount = inferredAmount > 0 ? inferredAmount : 0;
        const feeAmount = grossAmount > 0 ? calculateStripeFee(grossAmount) : 0;
        const netAmount = Math.max(grossAmount - feeAmount, 0);
        const discountAmount = typeof user.stripeLastDiscountAmount === "number" ? user.stripeLastDiscountAmount : 0;

        return {
          uid: user.uid,
          name: user.displayName || "(No name)",
          email: user.email || "No email",
          schoolName: user.schoolName || "-",
          status: (user.subscriptionStatus || "trial") as "trial" | "active",
          interval,
          priceId: user.stripePriceId || "",
          subscriptionId: user.stripeSubscriptionId || "",
          customerId: user.stripeCustomerId || "",
          activatedAt: user.subscriptionActivatedAt || user.stripeCurrentPeriodStart,
          periodEnd: user.stripeCurrentPeriodEnd,
          paymentAt: user.stripeLastPaymentAt,
          grossAmount,
          feeAmount,
          netAmount,
          discountAmount,
          promoCode: user.stripeLastPromoCode || "",
          cancelAtPeriodEnd: Boolean(user.stripeCancelAtPeriodEnd),
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [users]);

  const metrics = useMemo(() => {
    const subscribers = billingRows.filter((t) => t.status === "active");
    const trialCount = billingRows.filter((t) => t.status === "trial").length;

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
    let netRevenueDay = 0;
    let netRevenueMonth = 0;
    let netRevenueYear = 0;
    let mrrEstimate = 0;
    let mrrEstimateNet = 0;
    const couponMap = new Map<string, { redemptions: number; gross: number; discount: number; net: number }>();

    for (const user of subscribers) {
      const activatedAt = parseDate(user.activatedAt);
      if (activatedAt) {
        if (activatedAt >= dayStart) newDaily += 1;
        if (activatedAt >= monthStart) newMonthly += 1;
        if (activatedAt >= yearStart) newYearly += 1;
      }

      const paid = user.grossAmount;
      const paidNet = user.netAmount;
      const interval = user.interval;
      const paidAt = parseDate(user.paymentAt);

      if (paidAt) {
        if (paidAt >= dayStart) revenueDay += paid;
        if (paidAt >= monthStart) revenueMonth += paid;
        if (paidAt >= yearStart) revenueYear += paid;

        if (paidAt >= dayStart) netRevenueDay += paidNet;
        if (paidAt >= monthStart) netRevenueMonth += paidNet;
        if (paidAt >= yearStart) netRevenueYear += paidNet;
      }

      if (user.discountAmount > 0 || user.promoCode) {
        const couponKey = (user.promoCode || "discounted-unknown").toUpperCase();
        const current = couponMap.get(couponKey) || { redemptions: 0, gross: 0, discount: 0, net: 0 };
        current.redemptions += 1;
        current.gross += paid;
        current.discount += user.discountAmount;
        current.net += paidNet;
        couponMap.set(couponKey, current);
      }

      if (interval === "month") {
        const gross = paid || DEFAULT_MONTHLY_PRICE;
        mrrEstimate += gross;
        mrrEstimateNet += Math.max(gross - calculateStripeFee(gross), 0);
      } else if (interval === "year") {
        const gross = paid || DEFAULT_YEARLY_PRICE;
        const grossMonthly = gross / 12;
        mrrEstimate += grossMonthly;
        mrrEstimateNet += Math.max(grossMonthly - calculateStripeFee(grossMonthly), 0);
      }
    }

    return {
      teacherCount: billingRows.length,
      activeSubscriberCount: subscribers.length,
      trialCount,
      newDaily,
      newMonthly,
      newYearly,
      revenueDay,
      revenueMonth,
      revenueYear,
      netRevenueDay,
      netRevenueMonth,
      netRevenueYear,
      mrrEstimate,
      mrrEstimateNet,
      couponRows: Array.from(couponMap.entries())
        .map(([code, values]) => ({
          code,
          ...values,
        }))
        .sort((a, b) => b.redemptions - a.redemptions),
      churnRows: subscribers
        .filter((row) => row.cancelAtPeriodEnd)
        .sort((a, b) => {
          const aEnd = parseDate(a.periodEnd)?.getTime() || Number.MAX_SAFE_INTEGER;
          const bEnd = parseDate(b.periodEnd)?.getTime() || Number.MAX_SAFE_INTEGER;
          return aEnd - bEnd;
        }),
    };
  }, [billingRows]);

  const exportCsv = () => {
    const rows = billingRows.map((user) => ({
      name: user.name,
      email: user.email,
      schoolName: user.schoolName,
      status: user.status,
      interval: user.interval,
      stripePriceId: user.priceId,
      stripeSubscriptionId: user.subscriptionId,
      stripeCustomerId: user.customerId,
      activatedAt: formatDate(user.activatedAt),
      currentPeriodEnd: formatDate(user.periodEnd),
      lastPaymentAt: formatDate(user.paymentAt),
      grossAmount: user.grossAmount.toFixed(2),
      stripeFee: user.feeAmount.toFixed(2),
      netAmount: user.netAmount.toFixed(2),
    }));

    const headers = [
      "name",
      "email",
      "schoolName",
      "status",
      "interval",
      "stripePriceId",
      "stripeSubscriptionId",
      "stripeCustomerId",
      "activatedAt",
      "currentPeriodEnd",
      "lastPaymentAt",
      "grossAmount",
      "stripeFee",
      "netAmount",
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

  const startEdit = (row: BillingRow) => {
    setEditingId(row.uid);
    setEditForm({
      status: row.status,
      interval: row.interval,
      priceId: row.priceId,
      subscriptionId: row.subscriptionId,
      customerId: row.customerId,
      activatedAt: toInputDate(row.activatedAt),
      periodEnd: toInputDate(row.periodEnd),
      paymentAt: toInputDate(row.paymentAt),
      grossAmount: row.grossAmount > 0 ? row.grossAmount.toFixed(2) : "",
    });
  };

  const saveEdit = async (uid: string) => {
    try {
      setSavingId(uid);

      const parsedAmount = Number(editForm.grossAmount);
      const payload: Record<string, any> = {
        subscriptionStatus: editForm.status,
        stripeSubscriptionInterval: editForm.interval || deleteField(),
        stripePriceId: editForm.priceId.trim() || deleteField(),
        stripeSubscriptionId: editForm.subscriptionId.trim() || deleteField(),
        stripeCustomerId: editForm.customerId.trim() || deleteField(),
        subscriptionActivatedAt: parseInputDate(editForm.activatedAt),
        stripeCurrentPeriodEnd: parseInputDate(editForm.periodEnd),
        stripeLastPaymentAt: parseInputDate(editForm.paymentAt),
        stripeLastPaymentAmount: Number.isFinite(parsedAmount) && parsedAmount >= 0 ? parsedAmount : deleteField(),
      };

      await updateDoc(doc(db, "users", uid), payload);

      await fetchData(false);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save billing edit:", error);
      alert("Failed to save billing changes.");
    } finally {
      setSavingId(null);
    }
  };

  const clearBillingRecord = async (uid: string) => {
    const confirmed = window.confirm("Clear Stripe billing fields for this user? This is intended for sandbox cleanup.");
    if (!confirmed) return;

    try {
      setClearingId(uid);
      await updateDoc(doc(db, "users", uid), {
        subscriptionStatus: "trial",
        subscriptionLifecycleStatus: deleteField(),
        stripeSubscriptionId: deleteField(),
        stripeCustomerId: deleteField(),
        stripePriceId: deleteField(),
        stripeSubscriptionInterval: deleteField(),
        stripeCancelAtPeriodEnd: deleteField(),
        subscriptionActivatedAt: deleteField(),
        stripeCurrentPeriodStart: deleteField(),
        stripeCurrentPeriodEnd: deleteField(),
        stripeLastPaymentAt: deleteField(),
        stripeLastPaymentAmount: deleteField(),
        stripeCurrency: deleteField(),
      });

      await fetchData(false);
      if (editingId === uid) setEditingId(null);
    } catch (error) {
      console.error("Failed to clear billing record:", error);
      alert("Failed to clear billing record.");
    } finally {
      setClearingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Payments Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Subscription growth, collections, and downloadable report rows.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await fetchData(false);
              await fetchWebhookHealth();
            }}
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
            <MetricCard label="Gross Today" value={formatMoney(metrics.revenueDay)} />
            <MetricCard label="Net Today" value={formatMoney(metrics.netRevenueDay)} />
            <MetricCard label="Gross This Month" value={formatMoney(metrics.revenueMonth)} />
            <MetricCard label="Net This Month" value={formatMoney(metrics.netRevenueMonth)} />
            <MetricCard label="Gross This Year" value={formatMoney(metrics.revenueYear)} />
            <MetricCard label="Net This Year" value={formatMoney(metrics.netRevenueYear)} />
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Estimated Recurring Run Rate</h2>
            <p className="text-2xl font-semibold text-slate-900">Gross {formatMoney(metrics.mrrEstimate)} / month</p>
            <p className="text-xl font-semibold text-slate-800">Net {formatMoney(metrics.mrrEstimateNet)} / month</p>
            <p className="mt-1 text-xs text-slate-500">
              Net subtracts Stripe Domestic fees at 2.9% + $0.30 per payment. This dashboard uses Firestore billing fields as
              editable operational data; Stripe Dashboard remains source of truth.
            </p>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Stripe Webhook Health</h2>
              {healthLoading ? (
                <p className="mt-3 text-sm text-slate-500">Checking webhook health...</p>
              ) : !webhookHealth ? (
                <p className="mt-3 text-sm text-rose-600">Unable to read webhook diagnostics right now.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MiniStat label="Mode" value={webhookHealth.stripeMode.toUpperCase()} />
                  <MiniStat label="Webhook Secret" value={webhookHealth.hasWebhookSecret ? "Configured" : "Missing"} />
                  <MiniStat label="Stripe Init" value={webhookHealth.stripeInitialized ? "Ready" : "Failed"} />
                  <MiniStat label="Recent Failures" value={String(webhookHealth.recentFailureCount)} />
                  <MiniStat label="Recent Duplicates" value={String(webhookHealth.recentDuplicateCount)} />
                  <MiniStat label="Last Success" value={formatDateTime(webhookHealth.lastSuccessAt)} />
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Churn Watchlist</h2>
              <p className="mt-1 text-xs text-slate-500">Active subscriptions with cancel-at-period-end turned on.</p>
              <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
                {metrics.churnRows.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No pending cancellations right now.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {metrics.churnRows.map((row) => (
                      <li key={`churn-${row.uid}`} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.email}</p>
                        </div>
                        <span className="text-xs font-medium text-amber-700">Ends {formatDate(row.periodEnd)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Coupon Performance</h2>
              <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Uses</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">Discount</th>
                      <th className="px-3 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.couponRows.map((row) => (
                      <tr key={`coupon-${row.code}`} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{row.code}</td>
                        <td className="px-3 py-2">{row.redemptions}</td>
                        <td className="px-3 py-2">{formatMoney(row.gross)}</td>
                        <td className="px-3 py-2">{formatMoney(row.discount)}</td>
                        <td className="px-3 py-2">{formatMoney(row.net)}</td>
                      </tr>
                    ))}
                    {metrics.couponRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                          No tracked discount usage yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Billing Ops Playbook</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>Refunds and credits are issued in Stripe Dashboard, then mirrored here by editing the user billing row.</li>
                <li>For sandbox cleanup, use the row trash action to clear Stripe fields and reset plan to trial.</li>
                <li>If a paid user still shows trial, click Refresh and check Webhook Health for recent failures.</li>
                <li>For cancel-at-period-end accounts, retain access until period end and trigger retention outreach.</li>
              </ul>
            </section>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">School</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Interval</th>
                    <th className="px-3 py-2">Price ID</th>
                    <th className="px-3 py-2">Subscription ID</th>
                    <th className="px-3 py-2">Activated</th>
                    <th className="px-3 py-2">Current Period End</th>
                    <th className="px-3 py-2">Last Payment</th>
                    <th className="px-3 py-2">Gross</th>
                    <th className="px-3 py-2">Discount</th>
                    <th className="px-3 py-2">Promo</th>
                    <th className="px-3 py-2">Fee</th>
                    <th className="px-3 py-2">Net</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billingRows.map((user) => (
                    <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">{user.schoolName}</td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <select
                            aria-label="Edit subscription status"
                            value={editForm.status}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as "trial" | "active" }))}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                          >
                            <option value="trial">trial</option>
                            <option value="active">active</option>
                          </select>
                        ) : (
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${user.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                            {user.status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <select
                            aria-label="Edit interval"
                            value={editForm.interval}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, interval: e.target.value as "" | "month" | "year" }))}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
                          >
                            <option value="">unset</option>
                            <option value="month">month</option>
                            <option value="year">year</option>
                          </select>
                        ) : (
                          user.interval || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit price id"
                            value={editForm.priceId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, priceId: e.target.value }))}
                            className="w-44 rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{user.priceId || "-"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit subscription id"
                            value={editForm.subscriptionId}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, subscriptionId: e.target.value }))}
                            className="w-44 rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{user.subscriptionId || "-"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit activated date"
                            type="date"
                            value={editForm.activatedAt}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, activatedAt: e.target.value }))}
                            className="rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          formatDate(user.activatedAt)
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit period end date"
                            type="date"
                            value={editForm.periodEnd}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                            className="rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          formatDate(user.periodEnd)
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit last payment date"
                            type="date"
                            value={editForm.paymentAt}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, paymentAt: e.target.value }))}
                            className="rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          formatDate(user.paymentAt)
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === user.uid ? (
                          <input
                            aria-label="Edit gross amount"
                            type="number"
                            min={0}
                            step="0.01"
                            value={editForm.grossAmount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, grossAmount: e.target.value }))}
                            className="w-28 rounded border border-slate-300 px-2 py-1 text-xs outline-none"
                          />
                        ) : (
                          formatMoney(user.grossAmount)
                        )}
                      </td>
                      <td className="px-3 py-2">{formatMoney(user.discountAmount)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-medium text-slate-600">{user.promoCode || "-"}</span>
                      </td>
                      <td className="px-3 py-2">{formatMoney(user.feeAmount)}</td>
                      <td className="px-3 py-2">{formatMoney(user.netAmount)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === user.uid ? (
                            <>
                              <button
                                onClick={() => saveEdit(user.uid)}
                                disabled={savingId === user.uid}
                                className="rounded border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Save billing row"
                              >
                                {savingId === user.uid ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                                title="Cancel edit"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="rounded border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                              title="Edit billing row"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => clearBillingRecord(user.uid)}
                            disabled={clearingId === user.uid}
                            className="rounded border border-rose-300 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Clear billing fields (sandbox cleanup)"
                          >
                            {clearingId === user.uid ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {billingRows.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-3 py-8 text-center text-sm text-slate-500">
                        No teacher billing rows found yet.
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
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

function formatDateTime(value: any): string {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "Not available";
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

function calculateStripeFee(grossAmount: number) {
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) return 0;
  return grossAmount * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE;
}

function toInputDate(value: any): string {
  const parsed = parseDate(value);
  if (!parsed) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseInputDate(value: string) {
  if (!value) return deleteField();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return deleteField();
  return parsed;
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
