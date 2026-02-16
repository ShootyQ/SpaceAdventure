import React from "react";
import Link from "next/link";
import { ArrowLeft, Rocket, Hammer, Gamepad2, Zap, Palette } from "lucide-react";

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-[#f7f4ef] py-12 px-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-2xl mb-6">
            <Rocket className="w-8 h-8" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-slate-900 mb-6">Development Roadmap</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Our mission is to build the ultimate classroom management RPG. Here is the flight plan for Space Adventure and beyond.
          </p>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-8 before:w-0.5 before:-translate-x-1/2 before:bg-slate-200 md:before:mx-auto md:before:translate-x-0">
          
          {/* Phase 1: Immediate Updates */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group md:ml-0 ml-12">
            
            {/* Timeline Dot */}
            <div className="absolute top-0 left-0 md:bg-[#f7f4ef] md:static md:w-1/2 md:flex md:justify-center md:items-start -translate-x-1/2 md:translate-x-0 md:group-odd:translate-x-0">
                <div className="w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#f7f4ef] shadow-sm z-10 shrink-0 md:mt-8 absolute -left-[2.05rem] md:static md:left-auto" />
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-100 w-full md:w-[45%] relative">
               <span className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">In Progress</span>
               
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Palette className="w-5 h-5"/></div>
                 <h3 className="font-heading text-xl font-bold text-slate-900">Immediate Updates</h3>
               </div>
               
               <ul className="space-y-3">
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                    <span><strong>More Avatars:</strong> Expanded character customization options for students.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                    <span><strong>Pets:</strong> Collectible companions that accompany your avatar.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                    <span><strong>Refined Lessons:</strong> Improved UI for teachers to assign and track academic behaviors.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                    <span><strong>Bug Fixes:</strong> Stability improvements and UI polish.</span>
                 </li>
               </ul>
            </div>
          </div>


          {/* Phase 2: Core Loop & Economy */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group md:ml-0 ml-12">
            <div className="absolute top-0 left-0 md:bg-[#f7f4ef] md:static md:w-1/2 md:flex md:justify-center md:items-start -translate-x-1/2 md:translate-x-0">
                 <div className="w-4 h-4 bg-slate-300 rounded-full border-4 border-[#f7f4ef] shadow-sm z-10 shrink-0 md:mt-8 absolute -left-[2.05rem] md:static md:left-auto" />
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 w-full md:w-[45%]">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Hammer className="w-5 h-5"/></div>
                 <h3 className="font-heading text-xl font-bold text-slate-900">Resource Economy & Crafting</h3>
               </div>
               <p className="text-sm text-slate-500 mb-4">Transforming meaningless points into a thriving economy.</p>
               <ul className="space-y-3">
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Passive Mining:</strong> Expeditions now continue while you're offline. 1-2 day mining yields based on rig quality.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Refining & Crafting:</strong> Return, collect loot, refine raw materials into components.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Flagship Program:</strong> Massive, collaborative class projects constructed over weeks.</span>
                 </li>
               </ul>
            </div>
          </div>

          {/* Phase 3: Deep Progression */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group md:ml-0 ml-12">
            <div className="absolute top-0 left-0 md:bg-[#f7f4ef] md:static md:w-1/2 md:flex md:justify-center md:items-start -translate-x-1/2 md:translate-x-0">
                 <div className="w-4 h-4 bg-slate-300 rounded-full border-4 border-[#f7f4ef] shadow-sm z-10 shrink-0 md:mt-8 absolute -left-[2.05rem] md:static md:left-auto" />
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 w-full md:w-[45%]">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Zap className="w-5 h-5"/></div>
                 <h3 className="font-heading text-xl font-bold text-slate-900">Deep Progression</h3>
               </div>
               <p className="text-sm text-slate-500 mb-4">A complete overhaul of how students level up.</p>
               <ul className="space-y-3">
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>XP Model:</strong> 80-90% of XP comes directly from academic performance and behavior.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Expanded Ranks:</strong> 10 distinct Ranks plus infinite "Command Levels" for post-cap play.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Stat System:</strong> Invest points into Warp Control, Scanning, Mining Lasers, and more.</span>
                 </li>
               </ul>
            </div>
          </div>

          {/* Phase 4: Advanced Strategy */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group md:ml-0 ml-12">
            <div className="absolute top-0 left-0 md:bg-[#f7f4ef] md:static md:w-1/2 md:flex md:justify-center md:items-start -translate-x-1/2 md:translate-x-0">
                 <div className="w-4 h-4 bg-slate-300 rounded-full border-4 border-[#f7f4ef] shadow-sm z-10 shrink-0 md:mt-8 absolute -left-[2.05rem] md:static md:left-auto" />
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 w-full md:w-[45%]">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Rocket className="w-5 h-5"/></div>
                 <h3 className="font-heading text-xl font-bold text-slate-900">Advanced Exploration</h3>
               </div>
               <p className="text-sm text-slate-500 mb-4">Strategic choices that matter.</p>
               <ul className="space-y-3">
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Non-Linear Galaxy:</strong> Unlock new planets and regions via secret routes or relic keys.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Risk Modes:</strong> Choose between Safe (stable yield) or Aggressive (high risk/reward) expeditions.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Mission Boosters:</strong> Equip strategic modules before dispatch to alter mission outcomes.</span>
                 </li>
               </ul>
            </div>
          </div>

          {/* Phase 5: Future Worlds */}
          <div className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group md:ml-0 ml-12">
           <div className="absolute top-0 left-0 md:bg-[#f7f4ef] md:static md:w-1/2 md:flex md:justify-center md:items-start -translate-x-1/2 md:translate-x-0">
                 <div className="w-4 h-4 bg-slate-300 rounded-full border-4 border-[#f7f4ef] shadow-sm z-10 shrink-0 md:mt-8 absolute -left-[2.05rem] md:static md:left-auto" />
            </div>
            <div className="bg-white/50 border-2 border-dashed border-slate-300 rounded-3xl p-8 w-full md:w-[45%]">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Gamepad2 className="w-5 h-5"/></div>
                 <h3 className="font-heading text-xl font-bold text-slate-500">New Frontiers</h3>
               </div>
               <p className="text-slate-500 mb-4">Beyond the stars.</p>
               <ul className="space-y-3">
                 <li className="flex items-start gap-3 text-slate-500">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Frontier Trail:</strong> A history-themed Oregon Trail survival experience.</span>
                 </li>
                 <li className="flex items-start gap-3 text-slate-500">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
                    <span><strong>Arcane Academy:</strong> A fantasy RPG focused on magic, houses, and spells.</span>
                 </li>
               </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
