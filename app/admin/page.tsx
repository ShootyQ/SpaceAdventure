"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import {
  DEFAULT_PET_UNLOCK_CHANCE_CONFIG,
  getPetUnlockHint,
  normalizePetUnlockChanceConfig,
  PET_OPTIONS,
  PetUnlockChanceConfig,
  RollablePetRarity,
} from "@/lib/pets";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Edit3,
  GraduationCap,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AdminUserRow extends UserData {
  studentCount: number;
  teacherName: string;
}

const RARITY_ORDER: RollablePetRarity[] = ["common", "uncommon", "rare", "extremely-rare"];

export default function AdminPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserData["role"]>("teacher");
  const [statusFilter, setStatusFilter] = useState<"all" | UserData["status"]>("all");
  const [subFilter, setSubFilter] = useState<"all" | "trial" | "active" | "none">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extendDateInput, setExtendDateInput] = useState("");
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<{
    displayName: string;
    schoolName: string;
    status: UserData["status"];
    subscriptionStatus: "trial" | "active";
  }>({
    displayName: "",
    schoolName: "",
    status: "active",
    subscriptionStatus: "trial",
  });

  const [collectiblesConfig, setCollectiblesConfig] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
  const [collectiblesDraft, setCollectiblesDraft] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
  const [collectiblesLoading, setCollectiblesLoading] = useState(true);
  const [collectiblesSaving, setCollectiblesSaving] = useState(false);

  const loadCollectiblesConfig = async () => {
    setCollectiblesLoading(true);
    try {
      const configSnap = await getDoc(doc(db, "game-config", "collectibles"));
      const normalized = normalizePetUnlockChanceConfig((configSnap.data() as any)?.petUnlockChances || null);
      setCollectiblesConfig(normalized);
      setCollectiblesDraft(normalized);
    } catch (error) {
      console.error("Failed to load collectibles config:", error);
      setCollectiblesConfig(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
      setCollectiblesDraft(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
    } finally {
      setCollectiblesLoading(false);
    }
  };

  const fetchAllData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    try {
      const snapshot = await getDocs(query(collection(db, "users")));
      const allUsers = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserData));

      const teacherList = allUsers.filter((u) => u.role === "teacher");
      const studentList = allUsers.filter((u) => u.role === "student");
      const teacherNameMap = new Map(teacherList.map((t) => [t.uid, t.displayName || t.email || t.uid]));

      const normalized: AdminUserRow[] = allUsers.map((u) => {
        const studentCount = u.role === "teacher" ? studentList.filter((s) => s.teacherId === u.uid).length : 0;

        return {
          ...u,
          status: u.status || "active",
          schoolName: u.schoolName || "",
          subscriptionStatus: u.subscriptionStatus,
          studentCount,
          teacherName: u.teacherId ? teacherNameMap.get(u.teacherId) || "Unknown teacher" : "-",
        };
      });

      normalized.sort((a, b) => {
        const aName = (a.displayName || a.email || "").toLowerCase();
        const bName = (b.displayName || b.email || "").toLowerCase();
        return aName.localeCompare(bName);
      });

      setUsers(normalized);
      if (!selectedId && normalized.length > 0) {
        const firstTeacher = normalized.find((u) => u.role === "teacher");
        setSelectedId((firstTeacher || normalized[0]).uid);
      }
    } catch (error) {
      console.error("Admin Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData(true);
  }, []);

  useEffect(() => {
    loadCollectiblesConfig();
  }, []);

  const summary = useMemo(() => {
    const total = users.length;
    const teachers = users.filter((u) => u.role === "teacher").length;
    const students = users.filter((u) => u.role === "student").length;
    const activeSubs = users.filter((u) => u.subscriptionStatus === "active").length;
    const pending = users.filter((u) => u.status === "pending_approval").length;
    return { total, teachers, students, activeSubs, pending };
  }, [users]);

  const collectiblesSummary = useMemo(() => {
    const total = PET_OPTIONS.length;
    const starter = PET_OPTIONS.filter((pet) => pet.starter).length;

    const byRarity = PET_OPTIONS.reduce<Record<string, number>>((acc, pet) => {
      const key = pet.rarity;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { total, starter, byRarity };
  }, []);

  const updateCollectibleChance = (scope: "planet" | "anyPlanet", rarity: RollablePetRarity, value: string) => {
    const numeric = Math.max(1, Math.round(Number(value) || 1));
    setCollectiblesDraft((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [rarity]: numeric,
      },
    }));
  };

  const updateCollectibleEnabled = (scope: "planet" | "anyPlanet", rarity: RollablePetRarity, enabled: boolean) => {
    setCollectiblesDraft((prev) => ({
      ...prev,
      enabled: {
        ...prev.enabled,
        [scope]: {
          ...prev.enabled[scope],
          [rarity]: enabled,
        },
      },
    }));
  };

  const updateTestingChance = (value: string) => {
    const numeric = Math.max(1, Math.round(Number(value) || 1));
    setCollectiblesDraft((prev) => ({ ...prev, testing: numeric }));
  };

  const updateTestingEnabled = (enabled: boolean) => {
    setCollectiblesDraft((prev) => ({
      ...prev,
      enabled: {
        ...prev.enabled,
        testing: enabled,
      },
    }));
  };

  const resetCollectiblesDraft = () => {
    setCollectiblesDraft(normalizePetUnlockChanceConfig(DEFAULT_PET_UNLOCK_CHANCE_CONFIG));
  };

  const saveCollectiblesConfig = async () => {
    try {
      setCollectiblesSaving(true);
      const normalizedDraft = normalizePetUnlockChanceConfig(collectiblesDraft);

      await setDoc(
        doc(db, "game-config", "collectibles"),
        {
          petUnlockChances: normalizedDraft,
          updatedAt: Date.now(),
          updatedBy: currentUser?.email || null,
        },
        { merge: true }
      );

      setCollectiblesConfig(normalizedDraft);
      setCollectiblesDraft(normalizedDraft);
      alert("Collectibles config saved.");
    } catch (error) {
      console.error("Failed to save collectibles config:", error);
      alert("Failed to save collectibles config.");
    } finally {
      setCollectiblesSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !term ||
        [u.displayName || "", u.email || "", u.schoolName || "", u.teacherName || "", u.uid || ""].some((value) =>
          value.toLowerCase().includes(term)
        );

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      const userSub = u.subscriptionStatus || "none";
      const matchesSub = subFilter === "all" || userSub === subFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesSub;
    });
  }, [users, searchTerm, roleFilter, statusFilter, subFilter]);

  const selectedUser = users.find((u) => u.uid === selectedId) || null;
  const selectedTeacher = useMemo(() => {
    if (!selectedUser) return null;
    if (selectedUser.role === "teacher") return selectedUser;
    if (selectedUser.teacherId) return users.find((u) => u.uid === selectedUser.teacherId) || null;
    return null;
  }, [selectedUser, users]);

  const teacherStudents = useMemo(() => {
    if (!selectedTeacher) return [];
    return users.filter((u) => u.role === "student" && u.teacherId === selectedTeacher.uid);
  }, [selectedTeacher, users]);

  useEffect(() => {
    if (!selectedUser) {
      setExtendDateInput("");
      return;
    }

    const currentEnd = parseDateValue((selectedUser as any).stripeCurrentPeriodEnd);
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);

    const suggested = currentEnd && !Number.isNaN(currentEnd.getTime())
      ? new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000)
      : fallback;

    setExtendDateInput(suggested.toISOString().slice(0, 10));
  }, [selectedUser?.uid]);

  const teacherDrilldown = useMemo(() => {
    if (!selectedTeacher) return null;

    const totalXP = teacherStudents.reduce((sum, student) => sum + (student.xp || 0), 0);
    const avgXP = teacherStudents.length ? Math.round(totalXP / teacherStudents.length) : 0;

    let totalCompletedMissions = 0;
    let totalPassed = 0;

    for (const student of teacherStudents) {
      const progress = student.missionProgress || {};
      const entries = Object.values(progress);
      totalCompletedMissions += entries.filter((entry) => entry?.completedAt).length;
      totalPassed += entries.filter((entry) => entry?.passedEver).length;
    }

    return {
      studentCount: teacherStudents.length,
      avgXP,
      totalXP,
      totalCompletedMissions,
      totalPassed,
    };
  }, [selectedTeacher, teacherStudents]);

  const startEdit = (target: AdminUserRow) => {
    setEditingId(target.uid);
    setEditForm({
      displayName: target.displayName || "",
      schoolName: target.schoolName || "",
      status: target.status || "active",
      subscriptionStatus: target.subscriptionStatus || "trial",
    });
  };

  const saveEdit = async (uid: string) => {
    try {
      setSavingId(uid);

      await updateDoc(doc(db, "users", uid), {
        displayName: editForm.displayName.trim(),
        schoolName: editForm.schoolName,
        status: editForm.status,
        subscriptionStatus: editForm.subscriptionStatus,
      });

      setUsers((prev) =>
        prev.map((target) =>
          target.uid === uid
            ? {
                ...target,
                displayName: editForm.displayName.trim(),
                schoolName: editForm.schoolName,
                status: editForm.status,
                subscriptionStatus: editForm.subscriptionStatus,
              }
            : target
        )
      );

      setEditingId(null);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save changes.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (target: AdminUserRow) => {
    if (target.uid === currentUser?.uid) {
      alert("You cannot delete your own admin account from this panel.");
      return;
    }

    if (target.role === "teacher" && target.studentCount > 0) {
      alert("This teacher still has assigned students. Reassign or remove those students before deleting.");
      return;
    }

    const confirmed = window.confirm(`Delete user ${target.displayName || target.email || target.uid}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(target.uid);
      await deleteDoc(doc(db, "users", target.uid));
      setUsers((prev) => prev.filter((u) => u.uid !== target.uid));
      if (selectedId === target.uid) setSelectedId(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const extendSubscriptionEndDate = async () => {
    if (!selectedUser) return;
    if (selectedUser.role !== "teacher") {
      alert("End-date extension is only available for teacher accounts.");
      return;
    }
    if (!extendDateInput) {
      alert("Choose a new end date first.");
      return;
    }

    const proposedEnd = new Date(`${extendDateInput}T23:59:59.999Z`);
    if (Number.isNaN(proposedEnd.getTime())) {
      alert("Invalid date.");
      return;
    }

    const currentEnd = parseDateValue((selectedUser as any).stripeCurrentPeriodEnd);
    if (currentEnd && proposedEnd.getTime() <= currentEnd.getTime()) {
      alert("New end date must be later than the current end date. Shortening is blocked.");
      return;
    }

    try {
      setExtendingId(selectedUser.uid);

      await updateDoc(doc(db, "users", selectedUser.uid), {
        subscriptionStatus: "active",
        stripeCurrentPeriodEnd: proposedEnd,
      });

      setUsers((prev) =>
        prev.map((target) =>
          target.uid === selectedUser.uid
            ? {
                ...target,
                subscriptionStatus: "active",
                stripeCurrentPeriodEnd: proposedEnd,
              }
            : target
        )
      );

      alert("Subscription end date extended.");
    } catch (error) {
      console.error("Extend subscription failed:", error);
      alert("Failed to extend subscription end date.");
    } finally {
      setExtendingId(null);
    }
  };

  const badgeClass = (value: string) => {
    if (value === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (value === "trial") return "bg-amber-100 text-amber-700 border-amber-200";
    if (value === "pending_approval") return "bg-slate-200 text-slate-700 border-slate-300";
    if (value === "rejected") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-600">User management, teacher drilldowns, and classroom visibility.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 size={16} />
            Payments
          </Link>
          <button
            onClick={() => fetchAllData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Users" value={summary.total} />
        <StatCard label="Teachers" value={summary.teachers} />
        <StatCard label="Students" value={summary.students} />
        <StatCard label="Active Subscriptions" value={summary.activeSubs} />
        <StatCard label="Pending Approval" value={summary.pending} />
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Collectibles Control Center</h2>
            <p className="text-sm text-slate-600">Manage unlock odds and review every configured pet in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCollectiblesConfig}
              disabled={collectiblesLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={collectiblesLoading ? "animate-spin" : ""} />
              Reload
            </button>
            <button
              onClick={resetCollectiblesDraft}
              disabled={collectiblesSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck size={14} />
              Reset Defaults
            </button>
            <button
              onClick={saveCollectiblesConfig}
              disabled={collectiblesSaving || collectiblesLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {collectiblesSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Collectibles
            </button>
          </div>
        </div>

        {collectiblesLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-500">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard label="Total Pets" value={collectiblesSummary.total} />
              <StatCard label="Starter Pets" value={collectiblesSummary.starter} />
              <StatCard label="Common" value={collectiblesSummary.byRarity.common || 0} />
              <StatCard label="Uncommon" value={collectiblesSummary.byRarity.uncommon || 0} />
              <StatCard label="Rare" value={collectiblesSummary.byRarity.rare || 0} />
              <StatCard label="Extremely Rare" value={collectiblesSummary.byRarity["extremely-rare"] || 0} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <SlidersHorizontal size={14} />
                  Planet-specific odds
                </div>
                <div className="space-y-2">
                  {RARITY_ORDER.map((rarity) => (
                    <div key={`planet-${rarity}`} className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{rarity}</span>
                      <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                        <span className="text-xs text-slate-500">1 /</span>
                        <input
                          type="number"
                          min={1}
                          value={collectiblesDraft.planet[rarity]}
                          onChange={(e) => updateCollectibleChance("planet", rarity, e.target.value)}
                          className="w-full py-1 text-sm outline-none"
                        />
                      </div>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={collectiblesDraft.enabled.planet[rarity]}
                          onChange={(e) => updateCollectibleEnabled("planet", rarity, e.target.checked)}
                        />
                        On
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Sparkles size={14} />
                  Any-planet odds
                </div>
                <div className="space-y-2">
                  {RARITY_ORDER.map((rarity) => (
                    <div key={`any-${rarity}`} className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{rarity}</span>
                      <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                        <span className="text-xs text-slate-500">1 /</span>
                        <input
                          type="number"
                          min={1}
                          value={collectiblesDraft.anyPlanet[rarity]}
                          onChange={(e) => updateCollectibleChance("anyPlanet", rarity, e.target.value)}
                          className="w-full py-1 text-sm outline-none"
                        />
                      </div>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={collectiblesDraft.enabled.anyPlanet[rarity]}
                          onChange={(e) => updateCollectibleEnabled("anyPlanet", rarity, e.target.checked)}
                        />
                        On
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-800">Testing drops</div>
                <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-600">testing</span>
                  <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                    <span className="text-xs text-slate-500">1 /</span>
                    <input
                      type="number"
                      min={1}
                      value={collectiblesDraft.testing}
                      onChange={(e) => updateTestingChance(e.target.value)}
                      className="w-full py-1 text-sm outline-none"
                    />
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={collectiblesDraft.enabled.testing}
                      onChange={(e) => updateTestingEnabled(e.target.checked)}
                    />
                    On
                  </label>
                </div>

                <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                  Live config in map right now:
                  <div className="mt-1 font-mono text-[10px] text-slate-700">
                    common 1/{collectiblesConfig.planet.common} • uncommon 1/{collectiblesConfig.planet.uncommon} • rare 1/{collectiblesConfig.planet.rare} • x-rare 1/{collectiblesConfig.planet["extremely-rare"]}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Pet inventory map
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Pet</th>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Rarity</th>
                      <th className="px-3 py-2">Scope</th>
                      <th className="px-3 py-2">Starter</th>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Hint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PET_OPTIONS.map((pet) => (
                      <tr key={pet.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-medium text-slate-900">{pet.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{pet.id}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{pet.rarity}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{pet.unlockPlanetId ? `Planet: ${pet.unlockPlanetId}` : "Any planet"}</td>
                        <td className="px-3 py-2 text-slate-700">{pet.starter ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all">{pet.imageSrc || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{getPetUnlockHint(pet, collectiblesDraft) || "Starter"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search name, email, school, uid..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserData["role"])}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
          <option value="pending">Pending</option>
        </select>

        <select
          aria-label="Filter by account status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | UserData["status"])}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="all">All account states</option>
          <option value="active">Active</option>
          <option value="pending_approval">Pending approval</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          aria-label="Filter by subscription status"
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value as "all" | "trial" | "active" | "none")}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="all">All subscription states</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="none">Not set</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-20">
          <Loader2 className="animate-spin text-slate-500" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">School / Teacher</th>
                    <th className="px-4 py-3 font-semibold">Students</th>
                    <th className="px-4 py-3 font-semibold">Subscription</th>
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((target) => (
                    <tr
                      key={target.uid}
                      className={`border-b border-slate-100 ${selectedId === target.uid ? "bg-slate-50" : "hover:bg-slate-50/70"}`}
                    >
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedId(target.uid)}>
                        {editingId === target.uid ? (
                          <input
                            value={editForm.displayName}
                            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
                            placeholder="Display name"
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-slate-900">{target.displayName || "(No name)"}</p>
                            <p className="text-xs text-slate-500">{target.email || "No email"}</p>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">{target.role}</span>
                      </td>

                      <td className="px-4 py-3">
                        {editingId === target.uid ? (
                          <input
                            value={editForm.schoolName}
                            onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
                            placeholder="School / Class name"
                          />
                        ) : (
                          <div>
                            {target.role === "student" ? (
                              <>
                                <p className="text-slate-900">{target.schoolName || "-"}</p>
                                <p className="text-xs text-slate-500">Teacher: {target.teacherName}</p>
                              </>
                            ) : (
                              <p className="text-slate-900">{target.schoolName || "-"}</p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Users size={14} />
                          {target.studentCount}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {editingId === target.uid ? (
                          <select
                            aria-label="Edit subscription status"
                            value={editForm.subscriptionStatus}
                            onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value as "trial" | "active" })}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                          </select>
                        ) : (
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium capitalize ${badgeClass(target.subscriptionStatus || "none")}`}>
                            {target.subscriptionStatus || "none"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editingId === target.uid ? (
                          <select
                            aria-label="Edit account status"
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserData["status"] })}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                          >
                            <option value="active">Active</option>
                            <option value="pending_approval">Pending approval</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : (
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium capitalize ${badgeClass(target.status)}`}>
                            {target.status.replace("_", " ")}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === target.uid ? (
                            <>
                              <button
                                onClick={() => saveEdit(target.uid)}
                                disabled={savingId === target.uid}
                                className="rounded border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Save"
                              >
                                {savingId === target.uid ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                                title="Cancel"
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedId(target.uid);
                                  startEdit(target);
                                }}
                                className="rounded border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => deleteUser(target)}
                                disabled={deletingId === target.uid}
                                className="rounded border border-rose-300 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete"
                              >
                                {deletingId === target.uid ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        No users match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <aside className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Selected User</h2>

              {!selectedUser ? (
                <p className="text-sm text-slate-500">Select a row to inspect account details.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <DetailRow label="Name" value={selectedUser.displayName || "(No name)"} />
                  <DetailRow label="Email" value={selectedUser.email || "(No email)"} breakWord />
                  <DetailRow label="UID" value={selectedUser.uid} mono breakWord />
                  <DetailRow label="Role" value={selectedUser.role} />
                  <DetailRow label="Status" value={selectedUser.status.replace("_", " ")} />
                  <DetailRow label="Subscription" value={selectedUser.subscriptionStatus || "none"} />
                  <DetailRow label="Sign Up Date" value={formatDate((selectedUser as any).createdAt)} />
                  <DetailRow label="Sub Started" value={formatDate((selectedUser as any).subscriptionActivatedAt || (selectedUser as any).stripeCurrentPeriodStart)} />
                  <DetailRow label="Sub Ends" value={formatDate((selectedUser as any).stripeCurrentPeriodEnd)} />
                  <DetailRow label="School / Classroom" value={selectedUser.schoolName || "-"} />
                  <DetailRow label="Teacher Link" value={selectedUser.teacherName} />
                  <DetailRow label="Grade" value={selectedUser.gradeLevel || "-"} />
                  <DetailRow label="XP" value={String(selectedUser.xp || 0)} />

                  {selectedUser.role === "teacher" && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Extend Subscription End Date</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={extendDateInput}
                          onChange={(e) => setExtendDateInput(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                        />
                        <button
                          onClick={extendSubscriptionEndDate}
                          disabled={extendingId === selectedUser.uid}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {extendingId === selectedUser.uid ? <Loader2 size={12} className="animate-spin" /> : null}
                          Save End Date
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">Only later dates are allowed. This tool cannot shorten access.</p>
                    </div>
                  )}

                  {selectedUser.role === "teacher" && selectedUser.studentCount > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <div className="mb-1 inline-flex items-center gap-1 font-medium">
                        <AlertTriangle size={12} />
                        Delete blocked
                      </div>
                      <p>This teacher has active students. Reassign or remove students before deleting this record.</p>
                    </div>
                  )}
                </div>
              )}
            </aside>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Teacher Drilldown</h2>
                {selectedTeacher && (
                  <button
                    onClick={() => setSelectedId(selectedTeacher.uid)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Focus Teacher
                  </button>
                )}
              </div>

              {!selectedTeacher ? (
                <p className="text-sm text-slate-500">Select a teacher (or a student with a linked teacher) to view class drilldown.</p>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-slate-800">
                      <GraduationCap size={16} />
                      <p className="font-medium">{selectedTeacher.displayName || selectedTeacher.email || "Teacher"}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric label="Students" value={String(teacherDrilldown?.studentCount || 0)} />
                      <Metric label="Total XP" value={String(teacherDrilldown?.totalXP || 0)} />
                      <Metric label="Average XP" value={String(teacherDrilldown?.avgXP || 0)} />
                      <Metric label="Passed Missions" value={String(teacherDrilldown?.totalPassed || 0)} />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">Students and Performance</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Student</th>
                            <th className="px-3 py-2">Grade</th>
                            <th className="px-3 py-2">XP</th>
                            <th className="px-3 py-2">Level</th>
                            <th className="px-3 py-2">Completed Missions</th>
                            <th className="px-3 py-2">Passes</th>
                            <th className="px-3 py-2">Sign Up</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherStudents.map((student) => {
                            const progressEntries = Object.values(student.missionProgress || {});
                            const completed = progressEntries.filter((entry) => entry?.completedAt).length;
                            const passed = progressEntries.filter((entry) => entry?.passedEver).length;

                            return (
                              <tr key={student.uid} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => setSelectedId(student.uid)}
                                    className="text-left text-slate-800 hover:underline"
                                  >
                                    {student.displayName || student.email || student.uid}
                                  </button>
                                </td>
                                <td className="px-3 py-2">{student.gradeLevel || "-"}</td>
                                <td className="px-3 py-2">{student.xp || 0}</td>
                                <td className="px-3 py-2">{student.level || 1}</td>
                                <td className="px-3 py-2">{completed}</td>
                                <td className="px-3 py-2">{passed}</td>
                                <td className="px-3 py-2">{formatDate((student as any).createdAt)}</td>
                              </tr>
                            );
                          })}

                          {teacherStudents.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                                This teacher has no linked students.
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
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  breakWord = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  breakWord?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`${mono ? "font-mono text-xs" : ""} ${breakWord ? "break-all" : ""} text-slate-900`}>{value}</p>
    </div>
  );
}

function parseDateValue(value: any): Date | null {
  if (!value) return null;

  try {
    if (value?.toDate) {
      const converted = value.toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    }
    if (value?.seconds) {
      const converted = new Date(value.seconds * 1000);
      return Number.isNaN(converted.getTime()) ? null : converted;
    }
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  } catch {
    return null;
  }
}

function formatDate(value: any): string {
  if (!value) return "Not available";

  try {
    if (value?.toDate) return value.toDate().toLocaleDateString();
    if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Not available";
    return date.toLocaleDateString();
  } catch {
    return "Not available";
  }
}
