"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, X, User as UserIcon, Loader2, Plus, UserPlus, Pencil, Save, Fuel, MapPin, Trophy, Printer } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserData, PLANETS, STUDENT_GRADES, StudentGrade } from "@/types";

import { useAuth } from "@/context/AuthContext";
import { createStudentAuthAccount } from "@/lib/student-auth";
import { UserAvatar, PUBLIC_AVATAR_OPTIONS } from "@/components/UserAvatar";
import { getAssetPath, NAME_MAX_LENGTH, sanitizeName, truncateName } from "@/lib/utils";
import { getTeacherStudentLimit, isSubscriptionActive, isTeacherTrialActive } from "@/lib/subscription";
import { DEFAULT_PET_ID, PET_OPTIONS, STARTER_PET_IDS } from "@/lib/pets";
import { SHIP_OPTIONS, resolveShipAssetPath } from "@/lib/ships";
import { DEFAULT_UNLOCK_CONFIG, getXpUnlockRules, normalizeUnlockConfig } from "@/lib/unlocks";

const STARTER_PET_OPTIONS = PET_OPTIONS.filter((pet) => STARTER_PET_IDS.includes(pet.id));
const DEFAULT_STARTER_PET = STARTER_PET_OPTIONS[0]?.id || DEFAULT_PET_ID;

export default function RosterPage() {
  const { user, userData } = useAuth();
    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

    const STARTER_SHIP_IDS: string[] = unlockConfig.starters?.ships?.length ? unlockConfig.starters.ships : ["finalship"];
    const STARTER_SHIP_OPTIONS = SHIP_OPTIONS.filter((ship) => STARTER_SHIP_IDS.includes(ship.id));
    const DEFAULT_STARTER_SHIP = STARTER_SHIP_OPTIONS[0] || SHIP_OPTIONS[0];
    const SHIP_XP_UNLOCK_RULES: Array<{ id: string; planetId: string; unlockKey: string }> = getXpUnlockRules(unlockConfig.ships);
  
  // Student Creation State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", username: "", password: "" });
    const [newStudentGrade, setNewStudentGrade] = useState<StudentGrade>("3");
    const [selectedAvatarId, setSelectedAvatarId] = useState(PUBLIC_AVATAR_OPTIONS[0].id);
    const [selectedShipId, setSelectedShipId] = useState("finalship");
        const [selectedPetId, setSelectedPetId] = useState(DEFAULT_STARTER_PET);
  const [creationError, setCreationError] = useState("");
  const [creationLoading, setCreationLoading] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserData>>({});
  const [showEditVisuals, setShowEditVisuals] = useState(false); // Toggle for full editor within row
    const [editPassword, setEditPassword] = useState("");
    const [passwordResetLoading, setPasswordResetLoading] = useState(false);
    const [teacherPlanetShipUnlocks, setTeacherPlanetShipUnlocks] = useState<Record<string, Record<string, number>>>({});

    const hasActiveSubscription = isSubscriptionActive(userData);
    const hasTrialAccess = isTeacherTrialActive(userData);
    const studentLimit = getTeacherStudentLimit(userData);
    const isOverStudentLimit = students.length > studentLimit;
    const isAtStudentLimit = students.length >= studentLimit;


  const fetchRoster = async () => {
    if (!user) return;
    setLoading(true);
    try {
        // Fetch only students belonging to this teacher
        const q = query(
            collection(db, "users"), 
            where("role", "==", "student"),
            where("teacherId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
        
        users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));

        setStudents(users);
    } catch (e: any) {
        console.error("Error fetching roster:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoster();
  }, [user]);

  useEffect(() => {
      const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
          setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
      });

      return () => unsub();
  }, []);

  useEffect(() => {
      if (!STARTER_SHIP_IDS.includes(selectedShipId)) {
          setSelectedShipId(DEFAULT_STARTER_SHIP.id);
      }
  }, [STARTER_SHIP_IDS, selectedShipId, DEFAULT_STARTER_SHIP.id]);

  useEffect(() => {
      if (!user) return;
      let cancelled = false;

      const fetchPlanetUnlocks = async () => {
          try {
              const snapshot = await getDocs(collection(db, `users/${user.uid}/planets`));
              const nextMap: Record<string, Record<string, number>> = {};

              snapshot.forEach((planetDoc) => {
                  const rawUnlocks = (planetDoc.data() as any)?.unlocks?.ships || {};
                  const normalized: Record<string, number> = {};

                  Object.keys(rawUnlocks).forEach((key) => {
                      const threshold = Number(rawUnlocks[key] || 0);
                      if (threshold > 0) normalized[key] = threshold;
                  });

                  nextMap[planetDoc.id] = normalized;
              });

              if (!cancelled) setTeacherPlanetShipUnlocks(nextMap);
          } catch (error) {
              console.error("Error fetching teacher planet ship unlocks:", error);
          }
      };

      fetchPlanetUnlocks();

      return () => {
          cancelled = true;
      };
  }, [user]);

  const getUnlockedShipIdsForStudent = (student?: UserData) => {
      const unlocked = new Set<string>(STARTER_SHIP_IDS);

      const currentShipId = student?.spaceship?.modelId || student?.spaceship?.id;
      if (currentShipId) unlocked.add(String(currentShipId));

      const planetXP = (student?.planetXP || {}) as Record<string, number>;
      SHIP_XP_UNLOCK_RULES.forEach((rule) => {
          const requiredXP = Number(teacherPlanetShipUnlocks?.[rule.planetId]?.[rule.unlockKey] || 0);
          const currentPlanetXP = Number(planetXP?.[rule.planetId] || 0);
          if (requiredXP > 0 && currentPlanetXP >= requiredXP) {
              unlocked.add(rule.id);
          }
      });

      return unlocked;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();

      if (isAtStudentLimit) {
          alert(`ROSTER LIMIT REACHED: Your current plan allows up to ${studentLimit} students.`);
          return;
      }

      if (!newStudentData.name || !newStudentData.username || !newStudentData.password) return;
      
      setCreationLoading(true);
      setCreationError("");
      
      try {
          // 1. Generate Email
          // Format: username.classCode@spaceadventure.local
          const cleanUsername = newStudentData.username.toLowerCase().replace(/[^a-z0-9]/g, '');
          const classCode = userData?.classCode || 'default';
          const email = `${cleanUsername}.${classCode}@spaceadventure.local`; 
          
          // 2. Create Auth User
          const uid = await createStudentAuthAccount(email, newStudentData.password);

          // Get the selected configs
          const selectedShip = STARTER_SHIP_OPTIONS.find(s => s.id === selectedShipId) || DEFAULT_STARTER_SHIP;
          
          // 3. Create Firestore Document
          const safeDisplayName = sanitizeName(newStudentData.name);
          const safeFirstName = sanitizeName(safeDisplayName.split(' ')[0] || 'Cadet');

          const newStudent: UserData = {
              uid: uid,
              email: email,
              displayName: safeDisplayName,
              photoURL: null,
              role: 'student',
              teacherId: user!.uid,
              gradeLevel: newStudentGrade,
              classCode: classCode,
              status: 'active',
              xp: 0,
              galacticCredits: 0,
              level: 1,
              location: 'earth',
              fuel: 500,
              travelStatus: 'idle',
              spaceship: {
                  name: sanitizeName(`SS ${safeFirstName}`),
                  color: 'text-blue-400',
                  type: selectedShip.type,
                  speed: 1,
                  modelId: selectedShip.id,
                  id: selectedShip.id
              },
              avatar: {
                 avatarId: selectedAvatarId,
                 hue: 0,
                 skinHue: 0,
                 bgHue: 240,
                 bgSat: 50,
                 bgLight: 20,
                 activeHat: 'none'
              },
                  selectedPetId,
                  unlockedPetIds: [...STARTER_PET_IDS],
              // Storing credentials for classroom management features (Print Cards)
              username: newStudentData.username,
              password: newStudentData.password
          };
          
          await setDoc(doc(db, "users", uid), newStudent);
          
          setStudents(prev => [...prev, newStudent]);
          setNewStudentData({ name: "", username: "", password: "" });
          setNewStudentGrade("3");
          setSelectedAvatarId(PUBLIC_AVATAR_OPTIONS[0].id);
          setSelectedShipId(DEFAULT_STARTER_SHIP.id);
          setSelectedPetId(DEFAULT_STARTER_PET);
          setIsAddingStudent(false);
      } catch (e: any) {
          console.error("Error creating student:", e);
          if (e.code === 'auth/email-already-in-use') {
              setCreationError("Username already taken. Try another.");
          } else {
              setCreationError("Failed to create student. " + e.message);
          }
      } finally {
          setCreationLoading(false);
      }
  };

  const startEdit = (student: UserData) => {
      setEditingId(student.uid);
      setEditForm({
          displayName: student.displayName,
          xp: student.xp || 0,
          fuel: student.fuel || 500,
          location: student.location || 'earth',
          gradeLevel: student.gradeLevel || '3',
          status: student.status,
          avatar: student.avatar,
          spaceship: student.spaceship,
          selectedPetId: student.selectedPetId || DEFAULT_PET_ID,
          unlockedPetIds: student.unlockedPetIds || [...STARTER_PET_IDS]
      });
      setShowEditVisuals(false); // default to closed
      setEditPassword("");
  };

  const resetStudentPassword = async (studentUid: string, newPassword: string) => {
      if (!user) throw new Error("You must be signed in.");

      const token = await user.getIdToken();
      const response = await fetch('/api/teacher/students/reset-password', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ studentUid, newPassword })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
          throw new Error(result?.error || 'Failed to reset student password.');
      }
  };

  const saveEdit = async () => {
      if (!editingId) return;
      try {
          const editingStudent = students.find((student) => student.uid === editingId);
          const unlockedShipIds = getUnlockedShipIdsForStudent(editingStudent);
          const currentShipId = editingStudent?.spaceship?.modelId || editingStudent?.spaceship?.id || DEFAULT_STARTER_SHIP.id;
          const requestedShipId = editForm.spaceship?.modelId || editForm.spaceship?.id || currentShipId;
          const safeShipId = unlockedShipIds.has(String(requestedShipId))
              ? String(requestedShipId)
              : unlockedShipIds.has(String(currentShipId))
                  ? String(currentShipId)
                  : DEFAULT_STARTER_SHIP.id;
          const safeShipOption = SHIP_OPTIONS.find((ship) => ship.id === safeShipId);

          const normalizedEditForm: Partial<UserData> = {
              ...editForm,
              displayName: sanitizeName(String(editForm.displayName || '')),
              spaceship: editForm.spaceship
                  ? {
                        ...editForm.spaceship,
                        name: sanitizeName(String(editForm.spaceship.name || '')),
                        id: safeShipId,
                        modelId: safeShipId,
                        type: safeShipOption?.type || editForm.spaceship.type
                    }
                  : editForm.spaceship
          };

          if (editPassword.trim()) {
              setPasswordResetLoading(true);
              await resetStudentPassword(editingId, editPassword.trim());
              normalizedEditForm.password = editPassword.trim();
          }

          await updateDoc(doc(db, "users", editingId), normalizedEditForm);
          setStudents(prev => prev.map(s => s.uid === editingId ? { ...s, ...normalizedEditForm } : s));
          setEditingId(null);
          setShowEditVisuals(false);
          setEditPassword("");
      } catch (e) {
          console.error("Error saving student:", e);
          const errorMessage = e instanceof Error ? e.message : "Failed to save changes.";
          alert(errorMessage);
      } finally {
          setPasswordResetLoading(false);
      }
  };

  const handleUpdateAvatar = (avatarId: string) => {
      if (!editForm.avatar) return;
      setEditForm(prev => ({
          ...prev,
          avatar: { ...prev.avatar, avatarId }
      }));
  };

  const handleUpdateShip = (shipId: string) => {
      if (!editForm.spaceship) return;
      const nextShip = SHIP_OPTIONS.find((ship) => ship.id === shipId);
      if (!nextShip) return;
      setEditForm(prev => ({
          ...prev,
          spaceship: { ...prev.spaceship!, id: shipId, modelId: shipId, type: nextShip.type }
      }));
  };

  const handleUpdatePet = (petId: string) => {
      const unlockedPetIds = new Set([...(editForm.unlockedPetIds || []), ...STARTER_PET_IDS]);
      if (!unlockedPetIds.has(petId)) return;
      setEditForm(prev => ({
          ...prev,
          selectedPetId: petId,
          unlockedPetIds: Array.from(unlockedPetIds)
      }));
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

    const editingStudent = editingId ? students.find((student) => student.uid === editingId) : undefined;
    const editableShipIds = getUnlockedShipIdsForStudent(editingStudent);
    const editableShipOptions = SHIP_OPTIONS.filter((ship) => editableShipIds.has(ship.id));

  return (
    <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-4">
                     <Link href="/teacher/space" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                        <ArrowLeft size={20} />
                     </Link>
                     <div>
                        <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Cadet Roster</h1>
                        {userData?.classCode && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-cyan-600">CLASS CODE:</span>
                                <span className="text-lg font-bold text-yellow-400 font-mono tracking-widest">{userData.classCode}</span>
                            </div>
                        )}
                     </div>
                 </div>
                 
                 <div className="flex gap-2">
                     <Link 
                        href="/teacher/roster/print"
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold uppercase rounded-lg transition-colors border border-white/20"
                     >
                        <Printer size={18} />
                        <span className="hidden md:inline">Print Cards</span>
                     </Link>

                     <button 
                        onClick={() => setIsAddingStudent(true)} 
                        disabled={isAtStudentLimit}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-600"
                     >
                        <UserPlus size={18} />
                        <span className="hidden md:inline">Add Student</span>
                     </button>
                 </div>
            </div>

            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${isOverStudentLimit ? 'bg-amber-900/20 border-amber-500/50 text-amber-200' : 'bg-cyan-950/30 border-cyan-500/20 text-cyan-300'}`}>
                {hasActiveSubscription ? (
                    <span>Active subscription: {students.length}/{studentLimit} students used.</span>
                ) : hasTrialAccess ? (
                    <span>Free trial (full access): {students.length}/{studentLimit} students used.</span>
                ) : (
                    <span>
                        Access paused: {students.length}/{studentLimit} students used.
                        {isOverStudentLimit ? ' Existing students stay enrolled, but new students are disabled until billing is active again.' : ''}
                    </span>
                )}
            </div>

            {/* New Student Modal */}
            {isAddingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleAddStudent} className="w-full max-w-md bg-slate-900 border border-cyan-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.1)] relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button 
                            type="button" 
                            onClick={() => setIsAddingStudent(false)}
                            className="absolute top-4 right-4 text-cyan-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                        
                        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-cyan-900 pb-2">New Cadet Profile</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Display Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newStudentData.name}
                                    onChange={(e) => setNewStudentData({...newStudentData, name: e.target.value.slice(0, NAME_MAX_LENGTH)})}
                                    maxLength={NAME_MAX_LENGTH}
                                    className="w-full bg-black/50 border border-cyan-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-cyan-400 outline-none"
                                    placeholder="e.g. Cadet Tom"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Username</label>
                                <input 
                                    type="text" 
                                    value={newStudentData.username}
                                    onChange={(e) => setNewStudentData({...newStudentData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                                    className="w-full bg-black/50 border border-cyan-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-cyan-400 outline-none"
                                    placeholder="tom99"
                                />
                                <p className="text-[10px] text-cyan-600/80 mt-1 uppercase">Login ID (No Spaces)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Password</label>
                                <input 
                                    type="text" 
                                    value={newStudentData.password}
                                    onChange={(e) => setNewStudentData({...newStudentData, password: e.target.value})}
                                    className="w-full bg-black/50 border border-cyan-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-cyan-400 outline-none"
                                    placeholder="Set Password"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">Grade Level</label>
                                <select
                                    value={newStudentGrade}
                                    onChange={(e) => setNewStudentGrade(e.target.value as StudentGrade)}
                                    className="w-full bg-black/50 border border-cyan-800 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-cyan-400 outline-none"
                                >
                                    {STUDENT_GRADES.map((grade) => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Avatar Selection */}
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Select Identity</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PUBLIC_AVATAR_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button" 
                                            onClick={() => setSelectedAvatarId(opt.id)}
                                            className={`
                                                relative aspect-square rounded-lg border-2 overflow-hidden bg-black/50 transition-all
                                                ${selectedAvatarId === opt.id ? 'border-cyan-400 ring-2 ring-cyan-500/20 scale-105' : 'border-white/10 hover:border-white/30'}
                                            `}
                                        >
                                            <UserAvatar 
                                                hue={0}
                                                skinHue={0}
                                                bgHue={240}
                                                bgSat={50}
                                                bgLight={20}
                                                hat='none'
                                                avatarId={opt.id}
                                                className="w-full h-full"
                                            />
                                        </button>
                                    ))}
                                </div>
                                <div className="text-center mt-1 text-xs text-cyan-300 font-bold uppercase tracking-widest">
                                    {PUBLIC_AVATAR_OPTIONS.find(p => p.id === selectedAvatarId)?.name}
                                </div>
                            </div>

                            {/* Ship Selection */}
                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Select Vessel</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {STARTER_SHIP_OPTIONS.map((ship) => (
                                        <button
                                            key={ship.id}
                                            type="button"
                                            onClick={() => setSelectedShipId(ship.id)}
                                            className={`
                                                relative p-2 rounded-lg border-2 flex flex-col items-center gap-1 bg-black/50 transition-all
                                                ${selectedShipId === ship.id ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-900/10' : 'border-white/10 hover:border-white/30'}
                                            `}
                                        >
                                            <div className="w-12 h-12 relative flex items-center justify-center">
                                                <img 
                                                    src={getAssetPath(resolveShipAssetPath(ship.id))} 
                                                    alt={ship.name}
                                                    className="object-contain max-w-full max-h-full"
                                                />
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-center leading-tight text-gray-300">
                                                {ship.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Select Pet</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {STARTER_PET_OPTIONS.map((pet) => (
                                        <button
                                            key={pet.id}
                                            type="button"
                                            onClick={() => setSelectedPetId(pet.id)}
                                            className={`relative p-2 rounded-lg border-2 flex flex-col items-center gap-1 bg-black/50 transition-all ${selectedPetId === pet.id ? 'border-cyan-400 ring-2 ring-cyan-500/20 bg-cyan-900/10' : 'border-white/10 hover:border-white/30'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-black/60 border border-cyan-700/40 flex items-center justify-center text-xl overflow-hidden">
                                                {pet.imageSrc ? (
                                                    <img src={getAssetPath(pet.imageSrc)} alt={pet.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <>{pet.emoji}</>
                                                )}
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-center leading-tight text-gray-300">{pet.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {creationError && <div className="mt-4 p-2 bg-red-900/20 border border-red-500/30 text-red-400 text-xs rounded uppercase tracking-wider">{creationError}</div>}

                        <div className="flex gap-3 mt-8">
                            <button 
                                type="button"
                                onClick={() => setIsAddingStudent(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white py-3 rounded-lg font-bold transition-colors uppercase tracking-wider text-xs"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={creationLoading}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(8,145,178,0.4)]"
                            >
                                {creationLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Register
                            </button>
                        </div>
                    </form>
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
                                <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                                         <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setShowEditVisuals(!showEditVisuals)}
                                                className="w-10 h-10 rounded-full border-2 border-cyan-500 overflow-hidden relative shrink-0 hover:scale-110 transition-transform bg-cyan-900/30"
                                                title="Configure Visuals"
                                            >
                                                <UserAvatar userData={{ avatar: editForm.avatar }} className="w-full h-full" />
                                            </button>
                                            <input 
                                                value={editForm.displayName || ""} 
                                                onChange={e => setEditForm({...editForm, displayName: e.target.value.slice(0, NAME_MAX_LENGTH)})}
                                                maxLength={NAME_MAX_LENGTH}
                                                className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white"
                                            />
                                         </div>
                                         <button 
                                             onClick={() => setShowEditVisuals(!showEditVisuals)}
                                             className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider hover:text-white text-left px-1"
                                         >
                                             {showEditVisuals ? "- Close Visuals" : "+ Change Avatar / Ship / Pet"}
                                         </button>
                                    </div>

                                    {/* Visual Editor Expanded Area */}
                                    {showEditVisuals && (
                                        <div className="col-span-12 bg-black/60 border border-cyan-500/30 rounded-xl p-4 mb-2">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <h4 className="text-xs text-white uppercase font-bold mb-2">Avatar</h4>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {PUBLIC_AVATAR_OPTIONS.map(opt => (
                                                             <button
                                                                key={opt.id}
                                                                onClick={() => handleUpdateAvatar(opt.id)}
                                                                className={`aspect-square rounded border overflow-hidden ${editForm.avatar?.avatarId === opt.id ? 'border-cyan-400 ring-1 ring-cyan-500' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                                             >
                                                                 <UserAvatar 
                                                                    hue={0} skinHue={0} bgHue={240} bgSat={50} bgLight={20}
                                                                    hat="none" avatarId={opt.id} className="w-full h-full" 
                                                                 />
                                                             </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs text-white uppercase font-bold mb-2">Spaceship</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {editableShipOptions.map(ship => (
                                                             <button
                                                                key={ship.id}
                                                                onClick={() => handleUpdateShip(ship.id)}
                                                                className={`p-1 rounded border flex flex-col items-center justify-center ${ (editForm.spaceship?.modelId || editForm.spaceship?.id) === ship.id ? 'border-cyan-400 bg-cyan-900/20' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                                             >
                                                                 <img src={getAssetPath(resolveShipAssetPath(ship.id))} className="w-8 h-8 object-contain" />
                                                                 <span className="text-[8px] uppercase mt-1 text-center">{ship.name}</span>
                                                             </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs text-white uppercase font-bold mb-2">Pet</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {PET_OPTIONS.filter((pet) => new Set([...(editForm.unlockedPetIds || []), ...STARTER_PET_IDS]).has(pet.id)).map((pet) => (
                                                            <button
                                                                key={pet.id}
                                                                onClick={() => handleUpdatePet(pet.id)}
                                                                className={`p-2 rounded border flex items-center gap-2 ${editForm.selectedPetId === pet.id ? 'border-cyan-400 bg-cyan-900/20' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-black/60 border border-cyan-700/40 flex items-center justify-center text-lg overflow-hidden">
                                                                    {pet.imageSrc ? (
                                                                        <img src={getAssetPath(pet.imageSrc)} alt={pet.name} className="w-full h-full object-contain" />
                                                                    ) : (
                                                                        <>{pet.emoji}</>
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] uppercase text-left font-bold leading-tight">{pet.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!showEditVisuals && (
                                        <>
                                            <div className="col-span-12 md:col-span-2">
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
                                            <div className="col-span-12 md:col-span-2">
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
                                            <div className="col-span-12 md:col-span-2">
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
                                            <div className="col-span-12 md:col-span-2">
                                                <div className="space-y-1">
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
                                                    <select
                                                        value={String(editForm.gradeLevel || '3')}
                                                        onChange={e => setEditForm({ ...editForm, gradeLevel: e.target.value as StudentGrade })}
                                                        className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white text-xs"
                                                    >
                                                        {STUDENT_GRADES.map((grade) => (
                                                            <option key={grade} value={grade}>Grade {grade}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={editPassword}
                                                        onChange={(e) => setEditPassword(e.target.value)}
                                                        className="w-full bg-black border border-cyan-500 px-2 py-1 rounded text-white text-xs"
                                                        placeholder="New password (optional)"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    <div className="col-span-12 md:col-span-1 flex justify-end gap-2">
                                        <button disabled={passwordResetLoading} onClick={saveEdit} className="p-2 bg-green-600 rounded text-white hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                            {passwordResetLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        </button>
                                        <button onClick={() => { setEditingId(null); setShowEditVisuals(false); setEditPassword(""); }} className="p-2 bg-red-600 rounded text-white hover:bg-red-500"><X size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Display Mode */}

                                    <div className="col-span-12 md:col-span-3 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border ${student.status === 'pending_approval' ? 'bg-yellow-900 border-yellow-500' : 'bg-cyan-900/30 border-cyan-500/30'}`}>
                                            <UserAvatar userData={student} className="w-full h-full" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-lg md:text-base">{truncateName(student.displayName || "Cadet")}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                {student.email || <span className="text-gray-600 italic">Offline Account</span>}
                                            </div>
                                            {student.gradeLevel && (
                                                <div className="text-[10px] text-cyan-500 uppercase tracking-wider mt-1">Grade {student.gradeLevel}</div>
                                            )}
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
