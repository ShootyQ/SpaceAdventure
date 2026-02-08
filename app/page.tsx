"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Rocket, Sparkles, ArrowRight, BookOpen, User, Star, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [educatorCount, setEducatorCount] = useState(1);
  const [educatorInitials, setEducatorInitials] = useState("KC");

  useEffect(() => {
    const fetchEducators = async () => {
      try {
        // Fetch from server-side API to bypass Firestore client-side permission issues
        const res = await fetch('/api/educators/stats');
        if (res.ok) {
            const data = await res.json();
            setEducatorCount(data.count);
            setEducatorInitials(data.initials);
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
    "description": "Gamified classroom management platform that turns learning into an epic space adventure.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
  };

  return (
    <div className="flex min-h-screen flex-col font-sans bg-[#020617] text-slate-100 selection:bg-indigo-500/30 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Navigation */}
      <nav className="w-full border-b border-white/5 bg-[#020617]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl tracking-tight relative">
              <div className="relative w-64 h-24 md:w-80 md:h-32 -ml-2">
                <Image 
                    src="/images/logos/classcrave logo.png" 
                    alt="ClassCrave Logo" 
                    fill
                    className="object-contain object-left"
                    priority
                />
              </div>
           </div>
           
           {/* Desktop Nav */}
           <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400 items-center">
              <Link href="/about" className="hover:text-white transition-colors">How it Works</Link>
              <Link href="/educators" className="hover:text-white transition-colors">Educators</Link>
              <Link href="/space" className="px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-2">
                 <Rocket className="w-4 h-4" /> 
                 Launch Demo
              </Link>
           </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <div className="relative pt-20 pb-32 lg:pt-32 overflow-hidden">
           
           {/* Background decorative elements */}
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
           
           <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* Left Column: Text */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>The Classroom Management RPG</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-white leading-[1.1]">
                  What Journey Do You <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">CRAVE?</span>
                </h1>
                
                <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Transform your daily curriculum into an immersive campaign. Engage students with XP, ranks, and collaborative missions that make learning unforgettable.
                </p>

                <div className="mb-10 p-4 border border-yellow-500/30 bg-yellow-900/10 rounded-xl max-w-lg mx-auto lg:mx-0">
                    <p className="text-yellow-400 text-sm font-bold mb-1 uppercase tracking-wide">⚠ Under Development</p>
                    <p className="text-slate-400 text-xs leading-relaxed">System Launch Sequence initiated for <span className="text-white font-bold">February 2026</span>. For early access inquiries, contact <a href="mailto:classcrave@gmail.com" className="text-indigo-400 hover:underline">classcrave@gmail.com</a>.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                   <Link href="/start" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2">
                      Start Your Journey <ArrowRight className="w-5 h-5" />
                   </Link>
                   <Link href="/about" className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-700/50 rounded-xl font-bold transition-all backdrop-blur-sm flex items-center justify-center">
                      See Features
                   </Link>
                </div>
                
                <div className="mt-10 flex flex-col items-center lg:items-start gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-indigo-400">
                             <span className="text-xs">{educatorInitials}</span>
                         </div>
                         <div>
                             <p className="text-slate-300 italic mb-1">"It was excellent and the kids responded well to it"</p>
                             <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Joined by {educatorCount} Educator{educatorCount !== 1 ? 's' : ''}</p>
                         </div>
                    </div>
                </div>
              </motion.div>

              {/* Right Column: Dynamic Visuals */}
              <div className="relative h-[500px] w-full hidden lg:block perspective-[1000px]">
                  {/* Main Planet (Saturn-ish) */}
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]"
                  >
                     {/* Glow behind */}
                     <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
                     <Image
                        src="/images/planetpng/saturn.png"
                        alt="Planet Saturn"
                        fill
                        className="object-contain drop-shadow-2xl"
                     />
                  </motion.div>

                  {/* Secondary Planet (Mars) */}
                  <motion.div 
                    animate={{ y: [0, 15, 0], x: [0, 10, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-20 right-0 w-32 h-32"
                  >
                      <Image
                        src="/images/planetpng/mars.png"
                        alt="Planet Mars"
                        fill
                        className="object-contain opacity-80"
                     />
                  </motion.div>

                   {/* Floating Ship */}
                   <motion.div 
                    animate={{ x: [0, -10, 0], y: [0, 5, 0], rotate: [0, -2, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-20 left-10 w-48 h-48 z-20"
                  >
                      <Image
                        src="/images/ships/finalship.png" 
                        alt="Spaceship"
                        fill
                        className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                     />
                  </motion.div>

                  {/* UI Elements Floating */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="absolute top-40 -left-10 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl z-30 flex items-center gap-3"
                  >
                      <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><Star size={20} fill="currentColor" /></div>
                      <div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">XP Gained</div>
                          <div className="text-white font-bold">+500 XP</div>
                      </div>
                  </motion.div>
              </div>
           </div>
        </div>

        {/* Adventures Grid Section */}
        <div className="bg-[#0b0f1f]/50 py-24 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose Your Simulation</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">Start with our flagship Space Adventure, or prepare for upcoming worlds. Every simulation connects to the same student profiles.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    
                    {/* Active Space Adventure Card */}
                    <Link href="/space" className="group relative block aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-indigo-500/30 hover:border-indigo-400 transition-all hover:shadow-[0_0_40px_rgba(79,70,229,0.2)]">
                        {/* Background Image Layer */}
                        <div className="absolute inset-0 z-0">
                             <Image 
                                src="/images/planetpng/earth.png" 
                                alt="Space Background" 
                                width={600} 
                                height={600}
                                className="absolute -right-20 -bottom-20 opacity-60 group-hover:scale-110 transition-transform duration-700" 
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-indigo-950/20 to-transparent opacity-90" />
                             {/* Stars */}
                             <div className="absolute inset-0 bg-[url('/images/stars.png')] opacity-50" />
                        </div>
                        
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end z-10">
                             <div className="mb-auto">
                                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest border border-green-500/20">
                                    Live Now
                                </span>
                             </div>

                             <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                                <Rocket className="w-8 h-8" />
                             </div>
                             
                             <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">Space Adventure</h3>
                             <p className="text-slate-300 mb-6 leading-relaxed">
                                Command a starship, explore the solar system, and earn badges. Complete with interactive maps and customizable ships.
                             </p>
                             
                             <div className="flex items-center text-white font-bold tracking-wide group-hover:gap-2 transition-all">
                                Launch Simulation <ArrowRight className="w-5 h-5 ml-2" />
                             </div>
                        </div>
                    </Link>

                    {/* Future Plans Card */}
                    <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900/30 border border-white/5 p-8 md:p-12 flex flex-col">
                        <div className="flex justify-between items-start mb-auto">
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest border border-white/10">
                                Coming Soon
                            </span>
                            <Globe className="text-slate-700 w-24 h-24 absolute -top-4 -right-4 opacity-20 rotate-12" />
                        </div>

                        <h3 className="text-3xl font-bold text-white mb-8">Future Worlds</h3>
                        
                        <div className="space-y-4">
                            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-slate-600 transition-colors">
                                <div className="text-2xl bg-black/30 w-12 h-12 flex items-center justify-center rounded-lg">🤠</div>
                                <div>
                                    <div className="font-bold text-slate-200">Wild West Frontier</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Historical Sim</div>
                                </div>
                            </div>
                            
                            <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-slate-600 transition-colors">
                                <div className="p-3 bg-black/30 rounded-lg">
                                     <BookOpen className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-200">Fantasy Realms</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Creative Writing Focus</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

      </main>

      <footer className="border-t border-white/5 py-12 bg-[#020617]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
             <div className="mb-4 md:mb-0">
                <Image 
                    src="/images/logos/classcrave logo.png" 
                    alt="ClassCrave" 
                    width={120} 
                    height={30} 
                    className="opacity-50 grayscale hover:grayscale-0 transition-all mb-2"
                />
                <p>&copy; {new Date().getFullYear()} ClassCrave. Built for teachers, by teachers.</p>
             </div>
             <div className="flex gap-6">
                 <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                 <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                 <Link href="#" className="hover:text-white transition-colors">Support</Link>
             </div>
          </div>
      </footer>
    </div>
  );
}
