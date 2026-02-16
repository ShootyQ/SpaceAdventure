"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Compass, Lock, Rocket, Power, CreditCard, ChevronRight, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function TeacherAdventurePortal() {
  const { userData, loading, logout } = useAuth();
  const router = useRouter();
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!userData) {
      router.push("/login");
      return;
    }

    if (userData.status === "pending_approval") {
      router.push("/pending");
      return;
    }

    if (userData.role === "student") {
      router.push("/student");
      return;
    }

    if (userData.role === "admin") {
      router.push("/admin");
      return;
    }
  }, [loading, userData, router]);

  const handleManageSubscription = async () => {
    if (!userData) return;
    
    // If active, go to portal
    if (userData.subscriptionStatus === 'active') {
       if (openingPortal) return;
       setOpeningPortal(true);
         try {
           const res = await fetch('/api/stripe/checkout', { 
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
               intent: 'portal',
                   customerId: userData.stripeCustomerId,
                   email: userData.email 
               })
           });
           
           if (!res.ok) throw new Error("Portal request failed");
           
           const data = await res.json();
           if (data.url) {
             window.location.href = data.url;
           } else {
             alert("Could not open billing portal.");
             setOpeningPortal(false);
           }
       } catch (e) {
           console.error(e);
           alert("Error opening billing portal.");
           setOpeningPortal(false);
       }
    } else {
        router.push('/teacher/settings');
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        Loading teacher portal...
      </div>
    );
  }

  if (userData.role !== "teacher") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600 px-6 text-center">
        Redirecting to your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900 px-6 py-10">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-20 w-[560px] h-[560px] bg-emerald-200/40 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 -left-24 w-[560px] h-[560px] bg-amber-200/40 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Teacher Portal</p>
            <h1 className="text-4xl font-bold tracking-tight">Choose your game</h1>
            <p className="text-slate-600 mt-2">One class roster, one XP system, multiple game worlds.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white/90 hover:bg-white transition-colors"
          >
            <Power className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="relative z-10 grid md:grid-cols-3 gap-6">
          <Link
            href="/teacher/space"
            className="group rounded-2xl border border-emerald-300 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] hover:shadow-[0_30px_70px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Space Adventure</h2>
            <p className="text-slate-600">Launch classroom control, missions, rewards, and the live map.</p>
            <p className="mt-5 text-sm font-semibold text-emerald-700">Enter game →</p>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-75">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                <Lock className="w-3 h-3" /> Soon
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Frontier Trail</h2>
            <p className="text-slate-600">Adventure selection will unlock here when this world launches.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-75">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                <Lock className="w-3 h-3" /> Soon
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Arcane Academy</h2>
            <p className="text-slate-600">Adventure selection will unlock here when this world launches.</p>
          </div>
        </div>

        {/* Account Section */}
        <div id="billing" className="relative z-10 mt-12 pt-10 border-t border-black/5">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Power className="w-5 h-5 text-slate-400" />
                Account & Billing
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Subscription Tile */}
                 <div 
                    onClick={handleManageSubscription} 
                    className="cursor-pointer group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden"
                 >
                    <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userData.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${userData.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {userData.subscriptionStatus === 'active' ? 'Active' : 'Trial'}
                        </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900">Manage Subscription</h3>
                    
                    {userData.subscriptionStatus === 'active' ? (
                        <>
                            <p className="text-sm text-slate-500 mt-1">
                                {userData.stripeSubscriptionInterval === 'year' ? 'Yearly' : 'Monthly'} Plan
                            </p>
                            {userData.stripeCurrentPeriodEnd && (
                                <p className="text-xs text-slate-400 mt-4">
                                    Renews: {new Date((userData.stripeCurrentPeriodEnd as any).seconds * 1000).toLocaleDateString()}
                                </p>
                            )}
                            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-700 group-hover:gap-2 transition-all">
                                {openingPortal ? 'Loading portal...' : 'Update billing'} <ChevronRight className="w-4 h-4" />
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleManageSubscription();
                              }}
                              className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                            >
                              Manage or cancel in Stripe
                            </button>
                            <p className="mt-2 text-xs text-slate-500">No lock-in. You can cancel anytime from the Stripe portal.</p>
                        </>
                    ) : (
                        <>
                             <p className="text-sm text-slate-500 mt-1">
                                Upgrade to unlock full access.
                            </p>
                            <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-amber-700 group-hover:gap-2 transition-all">
                                View plans <ChevronRight className="w-4 h-4" />
                            </div>
                        </>
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}
