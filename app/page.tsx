"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowRight, CheckCircle2, GraduationCap, ShieldCheck, UserCircle2, Gamepad2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [showCoupon, setShowCoupon] = useState(false);
  
  useEffect(() => {
    // Show coupon popup after a short delay
    const timer = setTimeout(() => {
      setShowCoupon(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const [educatorCount, setEducatorCount] = useState(2);
  const [educatorInitialsList, setEducatorInitialsList] = useState<string[]>(["CD", "SK"]);
  const [activeStudents, setActiveStudents] = useState(24);
  const [weeklyMissions, setWeeklyMissions] = useState(5);
  const [focusPointsAwarded, setFocusPointsAwarded] = useState(320);
  const [awardEvents, setAwardEvents] = useState(12);
  const [studentsAwarded, setStudentsAwarded] = useState(6);
  const [isLandingStatsLoading, setIsLandingStatsLoading] = useState(true);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const [statsSource, setStatsSource] = useState<"live" | "fallback" | "unknown">("unknown");

  const statsFreshness = (() => {
    if (!statsUpdatedAt) return "just now";
    const diffMs = Date.now() - new Date(statsUpdatedAt).getTime();
    if (diffMs < 60_000) return "just now";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  })();

  useEffect(() => {
    const fetchEducators = async () => {
      try {
        const res = await fetch('/api/educators/stats', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (typeof data.count === 'number') setEducatorCount(data.count);
            if (Array.isArray(data.initialsList) && data.initialsList.length) {
              setEducatorInitialsList(data.initialsList);
            } else if (typeof data.initials === 'string' && data.initials) {
              setEducatorInitialsList([data.initials]);
            }
            if (typeof data.activeStudents === 'number') setActiveStudents(data.activeStudents);
            if (typeof data.weeklyMissions === 'number') setWeeklyMissions(data.weeklyMissions);
            if (typeof data.updatedAt === 'string') setStatsUpdatedAt(data.updatedAt);
            if (data.source === 'live' || data.source === 'fallback') setStatsSource(data.source);
        }
      } catch (error) {
        console.error("Error fetching educator stats:", error);
      } finally {
        setIsLandingStatsLoading(false);
      }
    };
    
    fetchEducators();

    const pollId = setInterval(fetchEducators, 60_000);
    return () => clearInterval(pollId);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "public-stats", "landing"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        if (typeof data.focusPointsAwarded === "number") setFocusPointsAwarded(data.focusPointsAwarded);
        if (typeof data.awardEvents === "number") setAwardEvents(data.awardEvents);
        if (typeof data.studentsAwarded === "number") setStudentsAwarded(data.studentsAwarded);
      },
      (error) => {
        // If rules/environments block reads, keep the static demo values.
        console.warn("Live snapshot stats unavailable:", error);
      }
    );

    return () => unsub();
  }, []);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ClassCrave",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Professional classroom gamification with clear routines, rewards, and multiple game experiences.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
  };

  return (
    <div className="landing-theme flex min-h-screen flex-col bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Navigation */}
      <nav className="w-full border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="relative w-[32rem] h-24">
            <Image
              src="/images/logos/croppedclasscravelogo.png"
              alt="ClassCrave Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Classroom Login</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Product</Link>
            <Link href="#games" className="hover:text-slate-900 transition-colors">Games</Link>
            <Link href="/educators" className="hover:text-slate-900 transition-colors">Educators</Link>
            <Link href="/login" className="px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <div className="relative pt-16 pb-20 lg:pt-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-20 w-[480px] h-[480px] bg-emerald-200/70 blur-[140px] rounded-full" />
            <div className="absolute bottom-0 -left-24 w-[520px] h-[520px] bg-amber-200/60 blur-[160px] rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-black/10 text-slate-700 text-sm font-medium mb-6">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Clear routines. Visible progress. Games that motivate.</span>
              </div>

              <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                Classroom management games that make routines stick.
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
                ClassCrave is a library of classroom management games (Space, Frontier, Fantasy and more) powered by one consistent system: expectations, XP, ranks, and rewards. Keep the structure teachers need—give students a world they want to show up for.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/login" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/about" className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:border-slate-400 hover:text-slate-900 transition-all text-center">
                  See How It Works
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-3 text-sm text-slate-600">
                <div className="flex items-center -space-x-2">
                  {educatorInitialsList.slice(0, 2).map((initials) => (
                    <div
                      key={initials}
                      className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold border-2 border-[#f7f4ef]"
                      title={initials}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-700">
                    Used by {educatorCount} educator{educatorCount !== 1 ? "s" : ""}
                    {educatorInitialsList.length ? ` (${educatorInitialsList.slice(0, 2).join(", ")})` : ""} building consistent routines.
                  </p>
                  <p className="text-xs text-slate-500">
                    {isLandingStatsLoading
                      ? "Refreshing live stats..."
                      : `Updated ${statsFreshness}${statsSource === "fallback" ? " (seed data)" : ""}.`}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:block"
            >
              <div className="flex flex-col gap-6">
                <Link href="/teacher" className="group bg-white/90 backdrop-blur-sm border border-black/10 rounded-3xl p-8 hover:border-emerald-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-200/50" />
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-bold text-slate-900">Teacher Portal</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">Launch missions, manage roster, and track behavior.</p>
                      <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-4 inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Enter Classroom <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
                
                <Link href="/student" className="group bg-white/90 backdrop-blur-sm border border-black/10 rounded-3xl p-8 hover:border-amber-300 hover:shadow-[0_20px_40px_rgba(245,158,11,0.1)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-amber-200/50" />
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <UserCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl font-bold text-slate-900">Student Portal</h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">Check your rank, view ship, and launch missions.</p>
                      <span className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-4 inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        Launch Mission <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>



        <section className="py-20 border-t border-black/5" id="games">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900">Multiple games. One student profile.</h2>
                <p className="text-slate-600 mt-2 max-w-xl">Same classroom expectations, same XP and ranks—different worlds to explore. Start with Space Adventure, then plug in new games as they launch.</p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 text-emerald-700 font-semibold">
                Play the current game <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/80 border border-black/10 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <Link href="/roadmap" className="text-xs uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors">Live Now</Link>
                  <Gamepad2 className="text-emerald-600" />
                </div>
                <h3 className="font-heading text-2xl font-semibold text-slate-900 mt-6">Space Adventure</h3>
                <p className="text-slate-600 mt-2">Students customize ships, earn XP, rank up, and travel to planets with teacher-set rewards.</p>
                <p className="text-slate-500 text-sm mt-3">Coming next: deeper RPG upgrades, new solar systems, and group challenges.</p>
              </div>

              <div className="bg-white/80 border border-black/10 rounded-3xl p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">Coming Soon</div>
                <h3 className="font-heading text-2xl font-semibold text-slate-900 mt-6">Frontier Trail</h3>
                <p className="text-slate-600 mt-2">Earn points and XP to travel west—customize your wagon, meet historical figures, and progress through the journey.</p>
              </div>

              <div className="bg-white/80 border border-black/10 rounded-3xl p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">Coming Soon</div>
                <h3 className="font-heading text-2xl font-semibold text-slate-900 mt-6">Arcane Academy</h3>
                <p className="text-slate-600 mt-2">Join an academy house, level up characters, and earn magical rewards—all tied to classroom expectations and lessons.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Set clear expectations",
                  copy: "Define behaviors and rewards once, then reuse them across classes and games.",
                },
                {
                  title: "Reward what matters",
                  copy: "Celebrate focus, collaboration, and progress with transparent points and ranks.",
                },
                {
                  title: "Track the story",
                  copy: "See patterns over time and keep students moving forward together.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white/80 border border-black/10 rounded-3xl p-6">
                  <h3 className="font-heading text-xl font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-3">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-12 bg-white/70">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
          <div className="mb-4 md:mb-0">
            <Image
              src="/images/logos/croppedclasscravelogo.png"
              alt="ClassCrave"
              width={120}
              height={30}
              className="opacity-70 mb-2"
            />
            <p>&copy; {new Date().getFullYear()} ClassCrave. Built for teachers, by teachers.</p>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
      
      <AnimatePresence>
        {showCoupon && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4"
          >
            <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-rose-100 p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
               
               <button 
                  onClick={() => setShowCoupon(false)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white rounded-full p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
               </button>

               <div className="relative z-10">
                 <div className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Launch Special
                 </div>
                 <h3 className="font-heading text-xl font-bold text-slate-900 mb-1">Get 50% Off</h3>
                 <p className="text-sm text-slate-600 mb-4">
                    Join the adventure during our launch week. Use code <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 rounded">LAUNCHSALE</span> at checkout.
                 </p>
                 <Link 
                   href="/teacher" 
                   className="block w-full text-center py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/10"
                 >
                    Claim Offer
                 </Link>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
