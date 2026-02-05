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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const filteredTeachers = teachers.filter(t => 
        (t.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.schoolName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const startEdit = (teacher: TeacherStats) => {
        setEditingId(teacher.uid);
        setEditForm({
            schoolName: teacher.schoolName || "",
            subscriptionStatus: teacher.subscriptionStatus || 'trial'
        });
    };

    const saveEdit = async (uid: string) => {
        try {
            await updateDoc(doc(db, "users", uid), {
                schoolName: editForm.schoolName,
                subscriptionStatus: editForm.subscriptionStatus
            });
            
            setTeachers(prev => prev.map(t => t.uid === uid ? { 
                ...t, 
                schoolName: editForm.schoolName, 
                subscriptionStatus: editForm.subscriptionStatus 
            } : t));
            
            setEditingId(null);
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save changes.");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                        <Shield className="text-red-500" size={40} /> Admin Command
                    </h1>
                    <p className="text-gray-400 mt-2">Oversee fleet commanders and subscription clearances.</p>
                </div>
                <button 
                    onClick={fetchAllData} 
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded uppercase text-xs font-bold tracking-widest transition"
                >
                    Refresh Data
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by Name, Email, or Classroom..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition"
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="animate-spin text-cyan-500" size={48} />
                </div>
            ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase tracking-widest">
                                <th className="p-4 font-bold">Commander / Email</th>
                                <th className="p-4 font-bold">Classroom Designation</th>
                                <th className="p-4 font-bold text-center">Cadets</th>
                                <th className="p-4 font-bold text-center">Clearance Status</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTeachers.map(teacher => (
                                <tr key={teacher.uid} className="hover:bg-white/5 transition group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-black border border-white/10 flex items-center justify-center text-cyan-500">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white max-w-[200px] truncate" title={teacher.displayName || ''}>{teacher.displayName || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{teacher.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4">
                                        {editingId === teacher.uid ? (
                                            <div className="flex items-center gap-2">
                                                <School size={16} className="text-gray-500 shrink-0" />
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={editForm.schoolName}
                                                    onChange={(e) => setEditForm({...editForm, schoolName: e.target.value})}
                                                    className="bg-black/50 border border-cyan-500/50 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                                                    placeholder="e.g. Mr. S 5th Grade"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <School size={16} className={teacher.schoolName ? "text-cyan-500" : "text-gray-600"} />
                                                {teacher.schoolName || <span className="text-gray-600 italic text-xs">No Designation</span>}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-lg font-bold text-white">{teacher.studentCount}</span>
                                            {teacher.subscriptionStatus === 'trial' && teacher.studentCount >= 5 && (
                                                <span className="text-[9px] bg-red-900/50 text-red-300 px-1.5 rounded uppercase font-bold tracking-tight">Cap Reached</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4 text-center">
                                        {editingId === teacher.uid ? (
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => setEditForm({...editForm, subscriptionStatus: 'trial'})}
                                                    className={`px-3 py-1 text-xs font-bold rounded border uppercase ${editForm.subscriptionStatus === 'trial' ? 'bg-gray-700 border-gray-500 text-white' : 'bg-transparent border-gray-700 text-gray-500'}`}
                                                >
                                                    Trial
                                                </button>
                                                <button 
                                                    onClick={() => setEditForm({...editForm, subscriptionStatus: 'active'})}
                                                    className={`px-3 py-1 text-xs font-bold rounded border uppercase ${editForm.subscriptionStatus === 'active' ? 'bg-green-900 border-green-500 text-green-300' : 'bg-transparent border-gray-700 text-gray-500'}`}
                                                >
                                                    Full
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider
                                                ${teacher.subscriptionStatus === 'active' 
                                                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}
                                            `}>
                                                {teacher.subscriptionStatus === 'active' ? <Gem size={12} /> : <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                                                {teacher.subscriptionStatus === 'active' ? 'Active' : 'Trial'}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-4 text-right">
                                        {editingId === teacher.uid ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => saveEdit(teacher.uid)} className="p-2 bg-green-900/50 hover:bg-green-900 text-green-400 rounded-lg transition">
                                                    <Check size={18} />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg transition">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => startEdit(teacher)}
                                                className="p-2 text-cyan-600 hover:text-cyan-400 hover:bg-cyan-900/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
