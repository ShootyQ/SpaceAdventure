"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import SolarSystem from "@/components/SolarSystem";

export default function StudentMapPage() {
    return (
        <div className="min-h-screen relative overflow-hidden bg-black">
            <div className="absolute inset-0">
                <SolarSystem studentView />
            </div>

            <div className="absolute top-6 left-6 z-30">
                <Link href="/student/studentnavigation" className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl hover:bg-cyan-900/40 transition-colors flex items-center gap-2 text-cyan-400">
                    <Settings size={20} />
                    <span className="hidden md:inline font-bold">Back to Cockpit</span>
                </Link>
            </div>
        </div>
    );
}
