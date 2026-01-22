"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    User 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

import { UserData, SpaceshipConfig, FlagConfig, Rank } from "@/types";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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
                if (isAdminEmail && data.role !== 'teacher') {
                    console.log("Fixing Admin Role for Legacy User");
                    data.role = 'teacher';
                    // Try to write, but if it fails (permissions), we still set local state to teacher
                    // so the UI works!
                    try {
                        await setDoc(userRef, { role: 'teacher' }, { merge: true });
                    } catch (e) {
                        console.warn("Could not update role in DB, but forcing local admin state", e);
                    }
                }
                
                setUserData(data);
            } else {
                // New user logic
                const isSuperAdmin = currentUser.email === "andrewpcarlson85@gmail.com";

                const newUserData: UserData = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    role: isSuperAdmin ? 'teacher' : 'student',
                    xp: 0,
                    level: 1,
                    status: isSuperAdmin ? 'active' : 'pending_approval',
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

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
