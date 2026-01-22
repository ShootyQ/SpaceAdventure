"use client";

import SolarSystem from '@/components/SolarSystem';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ClassroomMapDisplay() {
  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
        {/* Full Screen Solar System with Award Overlays */}
        <div className="absolute inset-0 z-0">
            <SolarSystem />
        </div>

        {/* Minimal Overlay for "TV Mode" Branding */}
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-30">
            <h1 className="text-white font-mono text-xs tracking-widest uppercase">Classroom Sensor Feed // Live</h1>
        </div>

        {/* Back Button (Top Left Corner) */}
        <Link href="/teacher" className="absolute top-6 left-6 z-50 bg-black/20 hover:bg-black/80 border border-white/10 hover:border-cyan-500 text-white/50 hover:text-cyan-400 px-6 py-3 rounded-full backdrop-blur-sm flex items-center gap-3 transition-all group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold tracking-widest uppercase text-sm">Cockpit</span>
        </Link>
    </div>
  );
}
