"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, GraduationCap, ShieldCheck, UserCircle2, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [educatorCount, setEducatorCount] = useState(1);
  const [educatorInitials, setEducatorInitials] = useState("KC");
  const [activeStudents, setActiveStudents] = useState(24);
  const [weeklyMissions, setWeeklyMissions] = useState(5);

  useEffect(() => {
    const fetchEducators = async () => {
      try {
        // Fetch from server-side API to bypass Firestore client-side permission issues
        const res = await fetch('/api/educators/stats');
        if (res.ok) {
            const data = await res.json();
            setEducatorCount(data.count);
            setEducatorInitials(data.initials);
            if (data.activeStudents) setActiveStudents(data.activeStudents);
            if (data.weeklyMissions) setWeeklyMissions(data.weeklyMissions);
        }
      } catch (error) {
        console.error("Error fetching educator stats:", error);
      }
    };
    
    fetchEducators();
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
    <div className="flex min-h-screen flex-col bg-[#f7f4ef] text-slate-900 selection:bg-emerald-200/60 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Navigation */}
      <nav className="w-full border-b border-black/10 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link href="/" className="relative w-80 h-20">
            <Image
              src="/images/logos/classcrave logo.png"
              alt="ClassCrave Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
            <Link href="/space" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Classroom Login</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">Product</Link>
            <Link href="#games" className="hover:text-slate-900 transition-colors">Games</Link>
            <Link href="/educators" className="hover:text-slate-900 transition-colors">Educators</Link>
            <Link href="/start" className="px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center gap-2">
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
                Classroom management that feels organized, not chaotic.
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
                ClassCrave is a multi-game platform for educators who want clarity, consistency, and student buy-in. Set expectations, reward progress, and run the same system across every game.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/start" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/about" className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:border-slate-400 hover:text-slate-900 transition-all text-center">
                  See How It Works
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-3 text-sm text-slate-600">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {educatorInitials}
                </div>
                <div>
                  <p className="text-slate-700">Used by {educatorCount} educator{educatorCount !== 1 ? "s" : ""} building consistent routines.</p>
                  <p className="text-xs text-slate-500">Early access enrollment for 2026 launches.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:block"
            >
              <Link href="/space" className="block group cursor-pointer">
                <div className="bg-white/80 border border-black/10 rounded-3xl p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] transition-transform group-hover:scale-[1.02]">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Demo</p>
                      <h2 className="font-heading text-2xl font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">Classroom Snapshot</h2>
                    </div>
                    <div className="text-xs text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1 group-hover:bg-emerald-200 transition-colors">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Now
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs text-slate-500 uppercase">Active Students</p>
                      <p className="text-3xl font-semibold text-slate-900 mt-2">{activeStudents}</p>
                      <p className="text-xs text-slate-500 mt-2">On-task rate: 91%</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs text-slate-500 uppercase">Weekly Missions</p>
                      <p className="text-3xl font-semibold text-slate-900 mt-2">{weeklyMissions}</p>
                      <p className="text-xs text-slate-500 mt-2">Completion: 84%</p>
                    </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 col-span-2">
                    <p className="text-xs text-slate-500 uppercase">Teacher Actions</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">Awarded Focus Points</span>
                        <span className="text-slate-900 font-semibold">+320</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">Behavior Trends Logged</span>
                        <span className="text-slate-900 font-semibold">12</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">Families Notified</span>
                        <span className="text-slate-900 font-semibold">6</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            </motion.div>
          </div>
        </div>

        <section className="py-20" id="roles">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900">Pick the path that matches you</h2>
              <p className="text-slate-600 mt-3">Clear entry points for teachers, students, and administrators.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/teacher" className="group bg-white/80 border border-black/10 rounded-3xl p-6 hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-slate-900">Teachers</h3>
                <p className="text-sm text-slate-600 mt-2">Set routines, reward progress, and run missions with clarity.</p>
                <span className="text-sm text-emerald-700 font-semibold mt-4 inline-flex items-center gap-2">Open teacher tools <ArrowRight className="w-4 h-4" /></span>
              </Link>
              <Link href="/student" className="group bg-white/80 border border-black/10 rounded-3xl p-6 hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-slate-900">Students</h3>
                <p className="text-sm text-slate-600 mt-2">Track goals, earn ranks, and explore game worlds safely.</p>
                <span className="text-sm text-amber-700 font-semibold mt-4 inline-flex items-center gap-2">Enter student hub <ArrowRight className="w-4 h-4" /></span>
              </Link>
              <Link href="/admin" className="group bg-white/80 border border-black/10 rounded-3xl p-6 hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-slate-900">Admins</h3>
                <p className="text-sm text-slate-600 mt-2">Support teachers with consistent expectations and reporting.</p>
                <span className="text-sm text-slate-700 font-semibold mt-4 inline-flex items-center gap-2">View admin space <ArrowRight className="w-4 h-4" /></span>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-black/5" id="games">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900">Multiple games. One student profile.</h2>
                <p className="text-slate-600 mt-2 max-w-xl">ClassCrave is built for a growing library. Start with our live game, then expand without changing your routines.</p>
              </div>
              <Link href="/space" className="inline-flex items-center gap-2 text-emerald-700 font-semibold">
                Play the current game <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/80 border border-black/10 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">Live Now</div>
                  <Gamepad2 className="text-emerald-600" />
                </div>
                <h3 className="font-heading text-2xl font-semibold text-slate-900 mt-6">Space Adventure</h3>
                <p className="text-slate-600 mt-2">Explore missions, award XP, and guide students through collaborative goals.</p>
              </div>
              <div className="bg-white/80 border border-black/10 rounded-3xl p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">Coming Soon</div>
                <h3 className="font-heading text-2xl font-semibold text-slate-900 mt-6">Next Worlds</h3>
                <p className="text-slate-600 mt-2">New experiences will plug into the same student accounts, rewards, and routines.</p>
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
              src="/images/logos/classcrave logo.png"
              alt="ClassCrave"
              width={120}
              height={30}
              className="opacity-70 mb-2"
            />
            <p>&copy; {new Date().getFullYear()} ClassCrave. Built for teachers, by teachers.</p>
          </div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
