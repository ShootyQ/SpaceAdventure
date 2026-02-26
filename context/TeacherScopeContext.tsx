"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserData } from "@/types";

interface TeacherScopeContextType {
  activeTeacherId: string | null;
  setActiveTeacherId: (teacherId: string) => void;
  teacherOptions: UserData[];
  loadingTeacherOptions: boolean;
}

const TeacherScopeContext = createContext<TeacherScopeContextType>({
  activeTeacherId: null,
  setActiveTeacherId: () => {},
  teacherOptions: [],
  loadingTeacherOptions: false,
});

const normalizeEmail = (email?: string | null) => String(email || "").trim().toLowerCase();

export function TeacherScopeProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [activeTeacherId, setActiveTeacherIdState] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<UserData[]>([]);
  const [loadingTeacherOptions, setLoadingTeacherOptions] = useState(true);

  const storageKey = useMemo(() => {
    if (!user?.uid) return null;
    return `spaceadventure_active_teacher_scope_${user.uid}`;
  }, [user?.uid]);

  useEffect(() => {
    const loadTeacherOptions = async () => {
      if (!user || !userData || userData.role !== "teacher") {
        setTeacherOptions([]);
        setActiveTeacherIdState(null);
        setLoadingTeacherOptions(false);
        return;
      }

      setLoadingTeacherOptions(true);
      const currentEmail = normalizeEmail(user.email);
      const rawEmail = String(user.email || "").trim();

      try {
        const ownTeacher: UserData = { ...userData, uid: user.uid };
        const optionsMap = new Map<string, UserData>([[ownTeacher.uid, ownTeacher]]);

        const emailCandidates = Array.from(new Set([rawEmail, currentEmail].filter(Boolean)));
        for (const emailCandidate of emailCandidates) {
          const sharedTeachersSnap = await getDocs(
            query(collection(db, "users"), where("coTeacherEmails", "array-contains", emailCandidate))
          );

          sharedTeachersSnap.forEach((teacherDoc) => {
            const data = teacherDoc.data() as UserData;
            if (data?.role !== "teacher") return;
            optionsMap.set(teacherDoc.id, { ...data, uid: teacherDoc.id });
          });
        }

        const options = Array.from(optionsMap.values()).sort((a, b) => {
          const aName = (a.displayName || a.schoolName || "").toLowerCase();
          const bName = (b.displayName || b.schoolName || "").toLowerCase();
          return aName.localeCompare(bName);
        });

        setTeacherOptions(options);

        const storedSelection = storageKey ? localStorage.getItem(storageKey) : null;
        const hasStoredSelection = !!storedSelection && options.some((option) => option.uid === storedSelection);

        if (hasStoredSelection && storedSelection) {
          setActiveTeacherIdState(storedSelection);
        } else {
          setActiveTeacherIdState(ownTeacher.uid);
        }
      } catch (error) {
        console.error("Failed loading shared teacher scopes:", error);
        setTeacherOptions([{ ...userData, uid: user.uid }]);
        setActiveTeacherIdState(user.uid);
      } finally {
        setLoadingTeacherOptions(false);
      }
    };

    loadTeacherOptions();
  }, [user, userData, storageKey]);

  const setActiveTeacherId = (teacherId: string) => {
    setActiveTeacherIdState(teacherId);
    if (storageKey) {
      localStorage.setItem(storageKey, teacherId);
    }
  };

  return (
    <TeacherScopeContext.Provider
      value={{ activeTeacherId, setActiveTeacherId, teacherOptions, loadingTeacherOptions }}
    >
      {children}
    </TeacherScopeContext.Provider>
  );
}

export function useTeacherScope() {
  return useContext(TeacherScopeContext);
}
