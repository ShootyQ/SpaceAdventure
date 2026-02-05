"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
    signInWithPopup, 
    signInWithEmailAndPassword,
    signOut, 
    onAuthStateChanged, 
    User 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { generateClassCode } from "@/lib/utils";

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
                const isAdminEmail = currentUser.email === "andrewpcarlson85@gmail.com";
                let updates: Partial<UserData> = {};

                if (isAdminEmail && data.role !== 'teacher') {
                    console.log("Fixing Admin Role for Legacy User");
                    data.role = 'teacher';
                    updates.role = 'teacher';
                }

                if (data.role === 'teacher' && !data.classCode) {
                    console.log("Generating Class Code for existing teacher");
                    const newCode = generateClassCode();
                    data.classCode = newCode;
                    updates.classCode = newCode;
                }

                if (Object.keys(updates).length > 0) {
                     try {
                        await setDoc(userRef, updates, { merge: true });
                    } catch (e) {
                        console.warn("Could not update user profile in DB", e);
                    }
                }
                
                setUserData(data);
            } else {
                // If the user signed in with Google, we assume they are a potential Teacher signing up.
                // Students should have been pre-created by teachers and signing in via Email/Pass,  
                // so they would already exist in DB.
                
                const isSuperAdmin = currentUser.email === "andrewpcarlson85@gmail.com";
                const newUserData: UserData = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    role: 'teacher', // Default new Google signups to Teacher
                    classCode: generateClassCode(),
                    status: 'active', // Auto-activate new teachers
                    subscriptionStatus: 'trial', // Start on Trial
                    schoolName: '',
                    location: 'earth',
                    spaceship: {
                        name: 'SS ' + (currentUser.displayName?.split(' ')[0] || 'Voyager'),
                        color: 'text-blue-400',
                        type: 'scout',
                        speed: 1
                    }
                };
                
                await setDoc(userRef, newUserData);
                setUserData(newUserData);
            }
        } catch (error) {
            console.error("Error fetching user data", error);
            // Fallback for Admin if DB is locked
             if (currentUser.email === "andrewpcarlson85@gmail.com") {
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
