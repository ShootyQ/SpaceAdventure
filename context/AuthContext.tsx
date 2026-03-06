"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
    signInWithPopup, 
    signInWithEmailAndPassword,
    signOut, 
    onAuthStateChanged, 
    User 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, limit, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { generateClassCode, sanitizeName } from "@/lib/utils";
import { DEFAULT_PET_ID, STARTER_PET_IDS } from "@/lib/pets";
import { isTeacherAccessRestricted, TEACHER_TRIAL_DAYS } from "@/lib/subscription";

import { UserData, SpaceshipConfig, FlagConfig, Rank } from "@/types";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInStudent: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const TRIAL_DURATION_MS = TEACHER_TRIAL_DAYS * 24 * 60 * 60 * 1000;
const ADMIN_EMAIL = "andrewpcarlson85@gmail.com";
const SAVANNAH_EMAIL = "savannahbcarlson@gmail.com";

const normalizeEmail = (email?: string | null) => String(email || "").trim().toLowerCase();

function toMillis(value: any): number | null {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value?.toDate === "function") {
    const parsed = value.toDate()?.getTime?.();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.seconds === "number") {
    const nanos = typeof value?.nanoseconds === "number" ? value.nanoseconds : 0;
    return value.seconds * 1000 + Math.floor(nanos / 1_000_000);
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
            // Fetch extra user data from Firestore
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                let data = userSnap.data() as UserData;
                
                // Auto-correct Admin Role
              const normalizedEmail = normalizeEmail(currentUser.email);
              const isAdminEmail = normalizedEmail === ADMIN_EMAIL;
              const isSavannahEmail = normalizedEmail === SAVANNAH_EMAIL;
                let updates: Partial<UserData> = {};

                if (isAdminEmail && data.role !== 'teacher') {
                    console.log("Fixing Admin Role for Legacy User");
                    data.role = 'teacher';
                    updates.role = 'teacher';
                }

              if (isSavannahEmail) {
                if (data.displayName !== "Savannah") {
                  data.displayName = "Savannah";
                  updates.displayName = "Savannah";
                }

                if (data.role !== "teacher") {
                  data.role = "teacher";
                  updates.role = "teacher";
                }

                if (data.status !== "active") {
                  data.status = "active";
                  updates.status = "active";
                }
              }

                if (data.role === 'teacher' && !data.classCode) {
                    console.log("Generating Class Code for existing teacher");
                    const newCode = generateClassCode();
                    data.classCode = newCode;
                    updates.classCode = newCode;
                }

                if (data.role === 'teacher') {
                  const createdAtMs = toMillis(data.createdAt) ?? Date.now();

                  if (!data.trialStartedAt) {
                    const trialStart = new Date(createdAtMs);
                    data.trialStartedAt = trialStart as any;
                    updates.trialStartedAt = trialStart as any;
                  }

                  if (!data.trialEndsAt) {
                    const trialEnd = new Date(createdAtMs + TRIAL_DURATION_MS);
                    data.trialEndsAt = trialEnd as any;
                    updates.trialEndsAt = trialEnd as any;
                  }
                }

                if (!data.createdAt) {
                  updates.createdAt = serverTimestamp() as any;
                }

                if (!Array.isArray(data.unlockedPetIds) || data.unlockedPetIds.length === 0) {
                    data.unlockedPetIds = [...STARTER_PET_IDS];
                    updates.unlockedPetIds = [...STARTER_PET_IDS];
                }

                if (!data.selectedPetId) {
                    data.selectedPetId = DEFAULT_PET_ID;
                    updates.selectedPetId = DEFAULT_PET_ID;
                }

                if (Object.keys(updates).length > 0) {
                     try {
                        await setDoc(userRef, updates, { merge: true });
                    } catch (e) {
                        console.warn("Could not update user profile in DB", e);
                    }
                }

                if (data.role === "teacher" && isTeacherAccessRestricted(data)) {
                  try {
                    await setDoc(userRef, { trialAccessLockedAt: serverTimestamp() as any }, { merge: true });
                  } catch (e) {
                    console.warn("Could not store trial lock timestamp", e);
                  }

                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("spaceadventure_login_error", "trial-expired");
                  }

                  await signOut(auth);
                  router.replace("/login?role=teacher&error=trial-expired");
                  return;
                }
                
                setUserData(data);
            } else {
                // If the user signed in with Google, we assume they are a potential Teacher signing up.
                // Students should have been pre-created by teachers and signing in via Email/Pass,  
                // so they would already exist in DB.
                
                const normalizedEmail = normalizeEmail(currentUser.email);
                const isSuperAdmin = normalizedEmail === ADMIN_EMAIL;
                const isSavannahEmail = normalizedEmail === SAVANNAH_EMAIL;
                const safeDisplayName = isSavannahEmail ? "Savannah" : sanitizeName(currentUser.displayName || 'Commander');
                const baseShipWord = safeDisplayName.split(' ')[0] || 'Voyager';
                const newUserData: UserData = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                  displayName: safeDisplayName,
                    photoURL: currentUser.photoURL,
                    role: 'teacher', // Default new Google signups to Teacher
                    classCode: generateClassCode(),
                    status: 'active', // Auto-activate new teachers
                    subscriptionStatus: 'trial', // Start on Trial
                    createdAt: serverTimestamp() as any,
                    trialStartedAt: serverTimestamp() as any,
                    trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS) as any,
                    schoolName: '',
                    location: 'earth',
                    spaceship: {
                      name: sanitizeName(`SS ${baseShipWord}`),
                        color: 'text-blue-400',
                        type: 'scout',
                        speed: 1
                    },
                    selectedPetId: DEFAULT_PET_ID,
                    unlockedPetIds: [...STARTER_PET_IDS]
                };
                
                await setDoc(userRef, newUserData);
                setUserData(newUserData);
            }
        } catch (error) {
            console.error("Error fetching user data", error);
            // Fallback for Admin if DB is locked
             if (normalizeEmail(currentUser.email) === ADMIN_EMAIL) {
                  console.log("Using Fallback Admin Profile due to DB error");
                  setUserData({
                      uid: currentUser.uid,
                      email: currentUser.email,
                      displayName: currentUser.displayName,
                      photoURL: currentUser.photoURL,
                      role: 'teacher', // FORCE TEACHER
                      status: 'active',
                      location: 'earth',
                      xp: 9999,
                      spaceship: {
                          name: 'SS Command (Fallback)',
                          color: 'text-yellow-400',
                          type: 'fighter',
                          speed: 2
                      }
                  });
             }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Auth state listener handles the rest
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const signInStudent = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
       console.error("Student Login Failed", error);
       throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signInStudent, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
