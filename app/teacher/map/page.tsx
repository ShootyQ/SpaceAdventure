"use client";

import SolarSystem from '@/components/SolarSystem';

export default function ClassroomMapDisplay() {
  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
        
        {/* Full Screen Solar System with Award Overlays */}
        <div className="absolute inset-0 z-0">
            <SolarSystem />
        </div>
    </div>
  );
}
