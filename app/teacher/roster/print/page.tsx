"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserData } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { getAssetPath } from "@/lib/utils";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrintRosterPage() {
    const { user, userData } = useAuth();
    const [students, setStudents] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchRoster = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, "users"), 
                    where("role", "==", "student"),
                    where("teacherId", "==", user.uid)
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
    }, [user]);

    if (loading) return <div className="p-10 text-white">Loading credentials...</div>;

    // chunk students into groups of 4 for page breaks
    const chunks = [];
    for (let i = 0; i < students.length; i += 4) {
        chunks.push(students.slice(i, i + 4));
    }

    return (
        <div className="min-h-screen bg-white text-black p-8 font-mono">
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
                <div key={pageIndex} className="break-after-page page-break-always mb-8 last:mb-0">
                    <div className="grid grid-cols-2 gap-8 h-[9.5in] content-start">
                        {chunk.map((student) => (
                            <div key={student.uid} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col relative h-[4.5in] break-inside-avoid">
                                {/* Header / Class Code */}
                                <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                                     <div>
                                         <h2 className="text-sm text-gray-500 uppercase tracking-widest font-bold">Class ID</h2>
                                         <div className="text-2xl font-black text-gray-800">{student.classCode || userData?.classCode || "N/A"}</div>
                                     </div>
                                     <img src={getAssetPath("/images/logo.png")} alt="Logo" className="h-8 opacity-50" />
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                     {/* Avatar Container */}
                                     <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden relative bg-gray-50">
                                         <UserAvatar 
                                            userData={student} 
                                            className="w-full h-full scale-110 translate-y-2"
                                         />
                                     </div>

                                     <div className="text-center w-full space-y-4">
                                         <div>
                                             <div className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">Cadet Name</div>
                                             <div className="text-xl font-bold">{student.displayName}</div>
                                         </div>
                                         
                                         <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left space-y-3 w-full max-w-xs mx-auto">
                                             <div>
                                                 <span className="text-xs text-gray-400 uppercase font-bold block">Username</span>
                                                 <span className="font-mono font-bold text-lg">{student.username || student.email?.split('@')[0] || "_______"}</span>
                                             </div>
                                             <div>
                                                 <span className="text-xs text-gray-400 uppercase font-bold block">Password</span>
                                                 <span className="font-mono font-bold text-lg">{student.password || "______________"}</span>
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
                    @page { margin: 0.5in; size: portrait; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .page-break-always { page-break-after: always; }
                    .break-after-page { break-after: page; }
                }
            `}</style>
        </div>
    );
}
