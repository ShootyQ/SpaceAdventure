"use client";
import Link from 'next/link';
import { Star, Map, Trophy, Users, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getAssetPath } from "@/lib/utils";

export default function Home() {
  const { user, userData, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  // Redirect based on role if logged in
  useEffect(() => {
    if (!loading && userData) {
        if (userData.status === 'pending_approval') {
            router.push('/pending');
        } else if (userData.role === 'teacher') {
            router.push('/teacher');
        } else if (userData.role === 'student') {
            router.push('/student');
        }
    }
  }, [userData, loading, router]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden">
      
      {/* Background Star Layers (CSS based) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div id="stars" className="stars"></div>
        <div id="stars2" className="stars2"></div>
        <div id="stars3" className="stars3"></div>
      </div>

      {/* Hero Section */}
      <div className="z-10 flex flex-col items-center justify-center w-full min-h-screen text-center px-4">
        
        <div className="animate-float mb-8">
            <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-blue-500 opacity-25 blur-xl animate-pulse"></div>
                <img 
                  src={getAssetPath("/images/ships/finalship.png")} 
                  alt="Space Adventure" 
                  className="w-24 h-24 object-contain relative z-10 transform -rotate-45" 
                />
            </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-blue-200 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          The Classroom Space Adventure
        </h1>
        
        <p className="text-blue-100 text-xl md:text-2xl max-w-2xl mb-12">
          Your classroom, gamified. Explore the cosmos, earn ranks, and master your mission.
        </p>

        {loading ? (
            <div className="text-blue-300 animate-pulse">Scanning Bio-metrics...</div>
        ) : !user ? (
            <div className="flex flex-col gap-4 w-full max-w-md">
                <button 
                    onClick={signInWithGoogle}
                    className="flex items-center justify-center gap-3 w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
                >
                    <div className="w-6 h-6 relative">
                        {/* Simple Google G Icon replacement for now */}
                        <svg viewBox="0 0 24 24" className="w-full h-full"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    </div>
                    <span>Sign in with Google</span>
                </button>
            </div>
        ) : (
             <div className="text-xl text-green-400 font-mono">
                 Files loaded. Redirecting...
             </div>
        )}
      </div>

      {/* Features Grid Teaser (Below Fold) */}

      <div className="z-10 w-full max-w-6xl px-4 py-20 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <h3 className="text-3xl font-bold text-center text-white mb-16">System Features</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
                icon={<Map />}
                title="Cosmos Map"
                description="Visualize class progress as you travel from planet to planet."
            />
            <FeatureCard 
                icon={<Star />}
                title="XP & Ranks"
                description="Earn XP for behavior and assignments to rank up locally."
            />
             <FeatureCard 
                icon={<Trophy />}
                title="Loot & Rewards"
                description="Unlock ship parts and earn real classroom rewards."
            />
        </div>
      </div>
      
      <footer className="z-10 w-full py-6 text-center text-blue-500/40 text-sm">
        Mission Control Systems &copy; {new Date().getFullYear()}
      </footer>

    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="mb-4 text-yellow-400 p-3 bg-yellow-400/10 rounded-full">
                {icon}
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
            <p className="text-gray-400">{description}</p>
        </div>
    )
}
