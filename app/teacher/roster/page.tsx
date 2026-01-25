"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, X, User as UserIcon, Loader2, Plus, UserPlus, Pencil, Save, Fuel, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserData, PLANETS } from "@/types";

export default function RosterPage() {
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Ghost User State
  const [isAddingGhost, setIsAddingGhost] = useState(false);
  const [newGhostName, setNewGhostName] = useState("");

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});

  const fetchRoster = async () => {
    setLoading(true);
    try {
        // Fetch students and pending users
        const q = query(collection(db, "users"), where("role", "in", ["student", "pending"]));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
        
        // Sort: Active Students first, then Pending
        users.sort((a, b) => {
            if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
            if (a.status !== 'pending_approval' && b.status === 'pending_approval') return 1;
            return (a.displayName || "").localeCompare(b.displayName || "");
        });

        setStudents(users);
    } catch (e: any) {
        console.error("Error fetching roster:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleCreateGhost = async () => {
      if (!newGhostName.trim()) return;
      try {
          const ghostId = `ghost_${Date.now()}`;
          const newStudent: any = {
              displayName: newGhostName.trim(),
              role: 'student',
              status: 'active',
              xp: 0,
              location: 'earth',
              fuel: 500,
              travelStatus: 'idle',
              isGhost: true,
              email: null,
              createdAt: Date.now()
          };
          
          await setDoc(doc(db, "users", ghostId), newStudent);
          
          setStudents(prev => [...prev, { uid: ghostId, ...newStudent }]);
          setNewGhostName("");
          setIsAddingGhost(false);
      } catch (e) {
          console.error("Error adding ghost user:", e);
          alert("Failed to create offline user.");
      }
  };

  const startEdit = (student: UserData) => {
      setEditingId(student.uid);
      setEditForm({
          displayName: student.displayName,
          xp: student.xp || 0,
          fuel: student.fuel || 500,
          location: student.location || 'earth',
          status: student.status
      });
  };

  const saveEdit = async () => {
      if (!editingId) return;
      try {
          await updateDoc(doc(db, "users", editingId), editForm);
          setStudents(prev => prev.map(s => s.uid === editingId ? { ...s, ...editForm } : s));
          setEditingId(null);
      } catch (e) {
          console.error("Error saving student:", e);
          alert("Failed to save changes.");
      }
  };

  const handleDelete = async (uid: string) => {
      if(!confirm("Are you sure you want to remove this cadet from the roster? This cannot be undone.")) return;
      try {
          await deleteDoc(doc(db, "users", uid));
          setStudents(prev => prev.filter(u => u.uid !== uid));
      } catch (e) {
          console.error("Error removing student:", e);
      }
  };

  const handleApprove = async (uid: string) => {
      try {
          await updateDoc(doc(db, "users", uid), {
              status: "active",
              role: "student",
              xp: 0,
              fuel: 500,
              location: 'earth'
          });
          setStudents(prev => prev.map(s => s.uid === uid ? { ...s, status: 'active', role: 'student', xp: 0, fuel: 500, location: 'earth' } : s));
      } catch (e) {
          console.error("Error approving:", e);
      }
  };

  return (
    <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-4">
                     <Link href="/teacher" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                        <ArrowLeft size={20} />
                     </Link>
                     <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Cadet Roster</h1>
                 </div>
                 
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setIsAddingGhost(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase rounded-lg transition-colors"
                     >
                        <UserPlus size={18} />
                        <span className="hidden md:inline">Add Offline Cadet</span>
                     </button>
                 </div>
            </div>

            {/* Ghost User Input */}
            {isAddingGhost && (
                <div className="mb-8 bg-cyan-900/10 border border-cyan-500/30 p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">New Cadet Registration</h3>
                    <div className="flex gap-4">
                        <input 
                            type="text" 
                            placeholder="Cadet Name" 
                            className="bg-black/50 border border-cyan-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-cyan-400 flex-1"
                            value={newGhostName}
                            onChange={(e) => setNewGhostName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateGhost()}
                        />
                        <button onClick={handleCreateGhost} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg uppercase">Register</button>
                        <button onClick={() => setIsAddingGhost(false)} className="px-6 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 font-bold rounded-lg uppercase">Cancel</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-cyan-500" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-cyan-950/30 border-b border-cyan-500/20 text-cyan-500 uppercase text-xs font-bold tracking-wider">
                        <div className="col-span-3">Cadet Identity</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-center">Experience</div>
                        <div className="col-span-2 text-center">Reserves</div>
                        <div className="col-span-2 text-center">Location</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {students.map((student) => (
                        <div key={student.uid} className={`
                            relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 md:p-4 rounded-xl border transition-all
                            ${student.status === 'pending_approval' ? 'bg-yellow-900/10 border-yellow-500/30' : 'bg-black/40 border-cyan-900/30 hover:border-cyan-500/30'}
                        `}>
                            {/* Editing Overlay */}
                            {editingId === student.uid ? (
                                <>
                                    <div className="col-span-3">
                                        <input 
                                            value={editForm.displayName || ""} 
                                            onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                                            className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            value={editForm.status}
                                            onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                                            className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white text-xs"
                                        >
                                            <option value="active">Active</option>
                                            <option value="pending_approval">Pending</option>
                                            <option value="rejected">Suspended</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1">
                                            <Trophy size={14} className="text-yellow-500" />
                                            <input 
                                                type="number"
                                                value={editForm.xp} 
                                                onChange={e => setEditForm({...editForm, xp: parseInt(e.target.value) || 0})}
                                                className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1">
                                            <Fuel size={14} className="text-orange-500" />
                                            <input 
                                                type="number"
                                                value={editForm.fuel} 
                                                onChange={e => setEditForm({...editForm, fuel: parseInt(e.target.value) || 0})}
                                                className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            value={editForm.location}
                                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                                            className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white text-xs uppercase"
                                        >
                                            <option value="earth">Earth</option>
                                            {PLANETS.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-end gap-2">
                                        <button onClick={saveEdit} className="p-2 bg-green-600 rounded text-white hover:bg-green-500"><Save size={16} /></button>
                                        <button onClick={() => setEditingId(null)} className="p-2 bg-red-600 rounded text-white hover:bg-red-500"><X size={16} /></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Display Mode */}
                                    <div className="col-span-12 md:col-span-3 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${student.status === 'pending_approval' ? 'bg-yellow-900 text-yellow-500' : 'bg-cyan-900/30 text-cyan-400'}`}>
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg md:text-base">{student.displayName}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                {student.email || <span className="text-gray-600 italic">Offline Account</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-6 md:col-span-2 flex md:justify-center items-center gap-2">
                                         {student.status === 'pending_approval' ? (
                                             <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 text-xs uppercase font-bold rounded border border-yellow-500/50">Details Pending</span>
                                         ) : (
                                             <span className="px-2 py-1 bg-green-500/20 text-green-200 text-xs uppercase font-bold rounded border border-green-500/50">Active Duty</span>
                                         )}
                                    </div>

                                    <div className="col-span-6 md:col-span-2 flex md:justify-center items-center gap-2 text-yellow-400">
                                        <Trophy size={16} />
                                        <span className="font-bold">{student.xp || 0} XP</span>
                                    </div>

                                    <div className="col-span-6 md:col-span-2 flex md:justify-center items-center gap-2 text-orange-400">
                                        <Fuel size={16} />
                                        <span className="font-bold">{student.fuel || 500}</span>
                                    </div>

                                    <div className="col-span-6 md:col-span-2 flex md:justify-center items-center gap-2 text-cyan-300 uppercase text-xs font-bold">
                                        <MapPin size={16} />
                                        <span>{PLANETS.find(p => p.id === student.location)?.name || "Earth"}</span>
                                    </div>

                                    <div className="col-span-12 md:col-span-1 flex justify-end gap-2 border-t md:border-t-0 border-white/10 pt-4 md:pt-0 mt-2 md:mt-0">
                                        {student.status === 'pending_approval' ? (
                                            <>
                                                <button onClick={() => handleApprove(student.uid)} title="Approve" className="p-2 bg-green-900/50 text-green-400 rounded-lg hover:bg-green-900 border border-green-500/30">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(student.uid)} title="Reject" className="p-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 border border-red-500/30">
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(student)} title="Edit Cadet" className="p-2 hover:bg-cyan-900/50 text-cyan-400 rounded-lg transition-colors">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(student.uid)} title="Remove Cadet" className="p-2 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors opacity-50 hover:opacity-100">
                                                    <X size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {!loading && students.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            No cadets found. Add some to begin the mission.
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
                     </Link>
                     <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Cadet Roster</h1>
                 </div>
                 
                 <button 
                    onClick={() => setIsAddingGhost(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold uppercase tracking-wider"
                 >
                    <UserPlus size={18} />
                    Add Offline Student
                 </button>
            </div>

            {isAddingGhost && (
                <div className="mb-8 p-6 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-4">Register Offline Cadet</h3>
                    <div className="flex gap-4">
                        <input 
                            type="text" 
                            placeholder="Cadet Name" 
                            value={newGhostName}
                            onChange={(e) => setNewGhostName(e.target.value)}
                            className="flex-1 bg-black border border-purple-500/50 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                        />
                        <button onClick={handleCreateGhost} className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-500">
                            Create
                        </button>
                        <button onClick={() => setIsAddingGhost(false)} className="text-gray-400 px-4 hover:text-white">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <h2 className="text-xl text-yellow-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                 <Loader2 className="animate-spin" size={20} /> Approval Queue
            </h2>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-cyan-500" size={48} />
                </div>
            ) : (
                <div className="bg-black/40 border border-cyan-900 rounded-xl overflow-hidden backdrop-blur-sm">
                    {pendingUsers.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>No pending signals found.</p>
                            <p className="text-sm">All cadets are accounted for.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-cyan-950/30 text-cyan-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="p-4">Cadet Identity</th>
                                    <th className="p-4">Email Channel</th>
                                    <th className="p-4 text-right">Clearance Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cyan-900/30">
                                {pendingUsers.map(user => (
                                    <tr key={user.uid} className="hover:bg-cyan-900/10 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-cyan-500/30" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-cyan-900 flex items-center justify-center border border-cyan-500/30">
                                                        <UserIcon size={20} />
                                                    </div>
                                                )}
                                                <span className="font-bold text-white">{user.displayName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400">{user.email}</td>
                                        <td className="p-4 text-right gap-2">
                                            <button 
                                                onClick={() => handleApprove(user.uid)}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/20 text-green-400 border border-green-500/30 rounded hover:bg-green-900/40 mr-2 transition-colors"
                                            >
                                                <Check size={16} /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleDeny(user.uid)}
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/20 text-red-400 border border-red-500/30 rounded hover:bg-red-900/40 transition-colors"
                                            >
                                                <X size={16} /> Deny
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
