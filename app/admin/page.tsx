"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import { Loader2, Search, Save, X, Check, Shield, School, User, Gem, Pencil } from "lucide-react";

interface TeacherStats extends UserData {
    studentCount: number;
}

export default function AdminPage() {
    const [teachers, setTeachers] = useState<TeacherStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ schoolName: string; subscriptionStatus: 'trial' | 'active' }>({ schoolName: "", subscriptionStatus: 'trial' });

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. Fetch All Users (This is heavy but necessary for admin stats for now)
            // Optimization: In real prod, use server-side counting or separate collection
            const q = query(collection(db, "users"));
            const snapshot = await getDocs(q);
            const allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData));

            const teacherList = allUsers.filter(u => u.role === 'teacher');
            const studentList = allUsers.filter(u => u.role === 'student');

            const stats = teacherList.map(t => {
                const count = studentList.filter(s => s.teacherId === t.uid).length;
                return {
                    ...t,
                    studentCount: count,
                    subscriptionStatus: t.subscriptionStatus || 'trial', // Default to trial
                    schoolName: t.schoolName || ''
                };
            });

            setTeachers(stats);
        } catch (e) {
            console.error("Admin Fetch Error:", e);
        } finally {
            import { useEffect, useMemo, useState } from "react";
            import { collection, deleteDoc, doc, getDocs, query, updateDoc } from "firebase/firestore";
    };

            import {
                AlertTriangle,
                Check,
                ChevronRight,
                Edit3,
                Loader2,
                RefreshCw,
                Search,
                Trash2,
                Users,
                X,
            } from "lucide-react";
            import { useAuth } from "@/context/AuthContext";
        fetchAllData();
            interface AdminUserRow extends UserData {

                teacherName: string;
    const filteredTeachers = teachers.filter(t => 
        (t.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                const { user: currentUser } = useAuth();
                const [users, setUsers] = useState<AdminUserRow[]>([]);
        )
                const [refreshing, setRefreshing] = useState(false);
    );
                const [roleFilter, setRoleFilter] = useState<"all" | UserData["role"]>("all");
                const [statusFilter, setStatusFilter] = useState<"all" | UserData["status"]>("all");
                const [subFilter, setSubFilter] = useState<"all" | "trial" | "active" | "none">("all");

                const [selectedId, setSelectedId] = useState<string | null>(null);

                const [savingId, setSavingId] = useState<string | null>(null);
                const [deletingId, setDeletingId] = useState<string | null>(null);
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
        setEditingId(teacher.uid);
                const fetchAllData = async (showLoader = false) => {
                    if (showLoader) setLoading(true);
                    setRefreshing(true);
            subscriptionStatus: teacher.subscriptionStatus || 'trial'

    const saveEdit = async (uid: string) => {
        try {
            await updateDoc(doc(db, "users", uid), {
                        const teacherList = allUsers.filter(u => u.role === "teacher");
                        const studentList = allUsers.filter(u => u.role === "student");
                        const teacherNameMap = new Map(teacherList.map(t => [t.uid, t.displayName || t.email || t.uid]));
            });
                        const normalized: AdminUserRow[] = allUsers.map(u => {
                            const studentCount = u.role === "teacher"
                                ? studentList.filter(s => s.teacherId === u.uid).length
                                : 0;

                            return {
                                ...u,
                                status: u.status || "active",
                                schoolName: u.schoolName || "",
                                subscriptionStatus: u.subscriptionStatus,
                                studentCount,
                                teacherName: u.teacherId ? (teacherNameMap.get(u.teacherId) || "Unknown teacher") : "-",
                            };
        } catch (e) {
            console.error("Save failed:", e);
                        normalized.sort((a, b) => {
                            const aName = (a.displayName || a.email || "").toLowerCase();
                            const bName = (b.displayName || b.email || "").toLowerCase();
                            return aName.localeCompare(bName);
                        });

                        setUsers(normalized);
        }
    };

    return (
                        setRefreshing(false);
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                    fetchAllData(true);
                    </h1>
                    <p className="text-gray-400 mt-2">Oversee fleet commanders and subscription clearances.</p>
                const summary = useMemo(() => {
                    const total = users.length;
                    const teachers = users.filter(u => u.role === "teacher").length;
                    const students = users.filter(u => u.role === "student").length;
                    const activeSubs = users.filter(u => u.subscriptionStatus === "active").length;
                    const pending = users.filter(u => u.status === "pending_approval").length;
                    return { total, teachers, students, activeSubs, pending };
                }, [users]);

                const filteredUsers = useMemo(() => {
                    const term = searchTerm.trim().toLowerCase();
                    return users.filter(u => {
                        const matchesSearch = !term || [
                            u.displayName || "",
                            u.email || "",
                            u.schoolName || "",
                            u.teacherName || "",
                            u.uid || "",
                        ].some(v => v.toLowerCase().includes(term));

                        const matchesRole = roleFilter === "all" || u.role === roleFilter;
                        const matchesStatus = statusFilter === "all" || u.status === statusFilter;
                        const userSub = u.subscriptionStatus || "none";
                        const matchesSub = subFilter === "all" || userSub === subFilter;

                        return matchesSearch && matchesRole && matchesStatus && matchesSub;
                    });
                }, [users, searchTerm, roleFilter, statusFilter, subFilter]);
                </button>
                const selectedUser = users.find(u => u.uid === selectedId) || null;

                const startEdit = (target: AdminUserRow) => {
                    setEditingId(target.uid);
            {/* Search */}
                        displayName: target.displayName || "",
                        schoolName: target.schoolName || "",
                        status: target.status || "active",
                        subscriptionStatus: target.subscriptionStatus || "trial",
                <input 
                    type="text" 
                    placeholder="Search by Name, Email, or Classroom..." 
                const saveEdit = async (uid: string) => {
                    onChange={(e) => setSearchTerm(e.target.value)}
                        setSavingId(uid);
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition"
                            displayName: editForm.displayName.trim(),
                />
                            status: editForm.status,
                            subscriptionStatus: editForm.subscriptionStatus,


                        setUsers(prev => prev.map(target => target.uid === uid
                            ? {
                                ...target,
                                displayName: editForm.displayName.trim(),
                                schoolName: editForm.schoolName,
                                status: editForm.status,
                                subscriptionStatus: editForm.subscriptionStatus,
                            }
                            : target
                        ));

                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-widest">
                                <th className="p-4 font-bold">Commander / Email</th>
                                <th className="p-4 font-bold">Classroom Designation</th>
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
                        setUsers(prev => prev.filter(u => u.uid !== target.uid));
                        if (selectedId === target.uid) setSelectedId(null);
                    } catch (e) {
                        console.error("Delete failed:", e);
                        alert("Failed to delete user.");
                    } finally {
                        setDeletingId(null);
                                <th className="p-4 font-bold text-center">Cadets</th>
                                <th className="p-4 font-bold text-center">Clearance Status</th>

                const badgeClass = (value: string) => {
                    if (value === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
                    if (value === "trial") return "bg-amber-100 text-amber-700 border-amber-200";
                    if (value === "pending_approval") return "bg-slate-200 text-slate-700 border-slate-300";
                    if (value === "rejected") return "bg-rose-100 text-rose-700 border-rose-200";
                    return "bg-gray-100 text-gray-700 border-gray-200";
                };
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight">Admin Console</h1>
                                <p className="mt-1 text-sm text-slate-600">Manage users, subscriptions, classroom records, and account status.</p>
                            </div>
                            <button
                                onClick={() => fetchAllData(false)}
                                disabled={refreshing}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                                Refresh
                            </button>
                                    </td>
                                    
                        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Users</p>
                                <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Teachers</p>
                                <p className="mt-2 text-2xl font-semibold">{summary.teachers}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Students</p>
                                <p className="mt-2 text-2xl font-semibold">{summary.students}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Subscriptions</p>
                                <p className="mt-2 text-2xl font-semibold">{summary.activeSubs}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending Approval</p>
                                <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
                            </div>
                        </div>

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
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            >
                                <option value="all">All roles</option>
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                                <option value="pending">Pending</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                            >
                                <option value="all">All account states</option>
                                <option value="active">Active</option>
                                <option value="pending_approval">Pending approval</option>
                                <option value="rejected">Rejected</option>
                            </select>

                            <select
                                value={subFilter}
                                onChange={(e) => setSubFilter(e.target.value as any)}
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
                            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                                                {filteredUsers.map(target => (
                                                    <tr
                                                        key={target.uid}
                                                        className={`border-b border-slate-100 ${selectedId === target.uid ? "bg-slate-50" : "hover:bg-slate-50/70"}`}
                                                    >
                                                        <td className="px-4 py-3">
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
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                                                                {target.role}
                                                            </span>
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
                                                                        <button
                                                                            onClick={() => setSelectedId(target.uid)}
                                                                            className="rounded border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100"
                                                                            title="View details"
                                                                        >
                                                                            <ChevronRight size={15} />
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

                                <aside className="rounded-xl border border-slate-200 bg-white p-4">
                                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">User Details</h2>

                                    {!selectedUser ? (
                                        <p className="text-sm text-slate-500">Select a row to inspect full account details.</p>
                                    ) : (
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Name</p>
                                                <p className="text-slate-900">{selectedUser.displayName || "(No name)"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Email</p>
                                                <p className="text-slate-900 break-all">{selectedUser.email || "(No email)"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-500">UID</p>
                                                <p className="font-mono text-xs break-all text-slate-800">{selectedUser.uid}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Role</p>
                                                    <p className="capitalize text-slate-900">{selectedUser.role}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Status</p>
                                                    <p className="capitalize text-slate-900">{selectedUser.status.replace("_", " ")}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Subscription</p>
                                                    <p className="capitalize text-slate-900">{selectedUser.subscriptionStatus || "none"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Students</p>
                                                    <p className="text-slate-900">{selectedUser.studentCount}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-slate-500">School / Classroom</p>
                                                <p className="text-slate-900">{selectedUser.schoolName || "-"}</p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-slate-500">Teacher Link</p>
                                                <p className="text-slate-900">{selectedUser.teacherName}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">Grade</p>
                                                    <p className="text-slate-900">{selectedUser.gradeLevel || "-"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500">XP</p>
                                                    <p className="text-slate-900">{selectedUser.xp || 0}</p>
                                                </div>
                                            </div>

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
                            </div>
                                                    type="text" 
