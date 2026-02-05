"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ADMIN_EMAILS = ['andrewpcarlson85@gmail.com'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
                router.push('/');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center text-cyan-500">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }
    
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) return null;

    return (
        <div className="min-h-screen bg-space-950 text-white font-mono">
            {children}
        </div>
    );
}