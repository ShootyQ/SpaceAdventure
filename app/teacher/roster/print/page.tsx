"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTeacherScope } from "@/context/TeacherScopeContext";
import { UserData } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { getAssetPath } from "@/lib/utils";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrintRosterPage() {
    const { user, userData } = useAuth();
    const { activeTeacherId, teacherOptions } = useTeacherScope();
    const teacherScopeId = activeTeacherId || user?.uid || null;
    const activeTeacherProfile = teacherOptions.find((teacher) => teacher.uid === teacherScopeId) || null;
    const [students, setStudents] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchRoster = async () => {
            if (!teacherScopeId) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, "users"), 
                    where("role", "==", "student"),
                    where("teacherId", "==", teacherScopeId)
                );
                const snapshot = await getDocs(q);
                const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
                users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                setStudents(users);
            } catch (e) {
                console.error("Error fetching roster:", e);
            }
            setLoading(false);
        };
        fetchRoster();
    }, [teacherScopeId]);

    if (loading) return <div className="p-10 text-white">Loading credentials...</div>;

    // chunk students into groups of 4 for page breaks
    const chunks = [];
    for (let i = 0; i < students.length; i += 4) {
        chunks.push(students.slice(i, i + 4));
    }

    return (
        <div className="min-h-screen bg-white text-black p-8 print:p-0 font-mono">
            {/* No-Print Header */}
            <div className="print:hidden mb-8 flex justify-between items-center bg-gray-100 p-4 rounded-lg border border-gray-300">
                <div className="flex items-center gap-4">
                    <Link href="/teacher/roster" className="flex items-center gap-2 text-gray-600 hover:text-black">
                        <ArrowLeft size={20} /> Back to Roster
                    </Link>
                    <h1 className="text-xl font-bold">Printable Credentials</h1>
                </div>
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors"
                >
                    <Printer size={20} /> Print Cards
                </button>
            </div>

            {/* Print Layout */}
            {chunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className="credential-page break-after-page page-break-always mb-8 print:mb-0">
                    <div className="grid grid-cols-2 grid-rows-2 gap-4 print:gap-3 h-[10.2in] print:h-[10.2in] content-start">
                        {chunk.map((student) => (
                            <div key={student.uid} className="credential-card border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-6 flex flex-col relative h-full break-inside-avoid">
                                {/* Header / Class Code */}
                                <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-3">
                                     <div>
                                         <h2 className="text-sm text-gray-500 uppercase tracking-widest font-bold">Class ID</h2>
                                         <div className="text-2xl font-black text-gray-800">{student.classCode || activeTeacherProfile?.classCode || userData?.classCode || "N/A"}</div>
                                     </div>
                                     <img src={getAssetPath("/images/logos/croppedclasscravelogo.png")} alt="Logo" className="h-8 opacity-70" />
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                     {/* Avatar Container */}
                                     <div className="w-28 h-28 rounded-full border-4 border-gray-100 overflow-hidden relative bg-gray-50">
                                         <UserAvatar 
                                            userData={student} 
                                            className="w-full h-full scale-110 translate-y-2"
                                         />
                                     </div>

                                     <div className="text-center w-full space-y-3">
                                         <div>
                                             <div className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">Cadet Name</div>
                                             <div className="text-3xl font-bold leading-tight">{student.displayName}</div>
                                         </div>
                                         
                                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-left space-y-2 w-full max-w-xs mx-auto">
                                             <div>
                                                 <span className="text-xs text-gray-400 uppercase font-bold block">Username</span>
                                                 <span className="font-mono font-bold text-3xl leading-none tracking-tight">{student.username || student.email?.split('@')[0] || "_______"}</span>
                                             </div>
                                             <div>
                                                 <span className="text-xs text-gray-400 uppercase font-bold block">Password</span>
                                                 <span className="font-mono font-bold text-3xl leading-none tracking-tight">{student.password || "______________"}</span>
                                             </div>
                                         </div>
                                     </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-auto pt-4 text-center text-[10px] text-gray-400 uppercase tracking-widest border-t border-gray-100">
                                    Official Space Adventure Credentials
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <style jsx global>{`
                @media print {
                    @page { margin: 0.35in; size: portrait; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .page-break-always { page-break-after: always; }
                    .break-after-page { break-after: page; }
                    .credential-page:last-child { page-break-after: auto; break-after: auto; }
                    .credential-card { break-inside: avoid; page-break-inside: avoid; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
