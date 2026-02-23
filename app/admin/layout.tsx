"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ADMIN_EMAILS = ['andrewpcarlson85@gmail.com'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
                router.push('/');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-screen bg-slate-100 flex items-center justify-center text-slate-600">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }
    
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) return null;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="mx-auto max-w-7xl px-6 pt-6">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    <AdminTab href="/admin" label="Admin" active={pathname === "/admin"} />
                    <AdminTab href="/admin/payments" label="Payments" active={pathname === "/admin/payments"} />
                    <AdminTab href="/admin/collectibles" label="Collectibles" active={pathname === "/admin/collectibles"} />
                    <AdminTab href="/admin/shop" label="Shop" active={pathname === "/admin/shop"} />
                    <AdminTab href="/admin/analytics" label="Analytics" active={pathname === "/admin/analytics"} />
                </div>
            </div>
            {children}
        </div>
    );
}

function AdminTab({ href, label, active }: { href: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
            }`}
        >
            {label}
        </Link>
    );
}