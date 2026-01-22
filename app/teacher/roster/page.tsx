"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, X, User as UserIcon, Loader2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PendingUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  status: string;
  role: string;
}

export default function RosterPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingGhost, setIsAddingGhost] = useState(false);
  const [newGhostName, setNewGhostName] = useState("");

  const fetchPending = async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "users"), where("status", "==", "pending_approval"));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as PendingUser));
        setPendingUsers(users);
    } catch (e: any) {
        console.error("Error fetching pending users:", e);
        if (e.code === 'permission-denied') {
            alert("Warning: Permission Denied. Ensure your account is set as 'teacher' in Firestore.");
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleCreateGhost = async () => {
      if (!newGhostName.trim()) return;
      try {
          const ghostId = `ghost_${Date.now()}`;
          await setDoc(doc(db, "users", ghostId), {
              displayName: newGhostName.trim(),
              role: 'student',
              status: 'active',
              xp: 0,
              location: 'earth',
              travelStatus: 'idle',
              isGhost: true,
              email: null,
              createdAt: Date.now()
          });
          setNewGhostName("");
          setIsAddingGhost(false);
          alert("Offline Cadet Added!");
          // Does not appear in pending list because status is active
      } catch (e) {
          console.error("Error adding ghost user:", e);
          alert("Failed to create offline user.");
      }
  };

  const handleApprove = async (uid: string) => {
      try {
          await updateDoc(doc(db, "users", uid), {
              status: "active",
              role: "student" // Ensure they are a student
          });
          // Refresh list
          setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (e) {
          console.error("Error approving:", e);
      }
  };

  const handleDeny = async (uid: string) => {
      if(!confirm("Are you sure you want to reject this account?")) return;
      try {
          await deleteDoc(doc(db, "users", uid));
          // Refresh list
          setPendingUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (e) {
          console.error("Error rejecting:", e);
      }
  };

  return (
    <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-4">
                     <Link href="/teacher" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                        <ArrowLeft size={20} />
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
