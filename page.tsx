import Link from 'next/link';
import { Rocket, Star, Map, Trophy, Users } from 'lucide-react';

export default function Home() {
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
                    src="/images/ships/finalship.png" 
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {/* Student Portal Card */}
            <Link href="/student" className="group">
                <div className="border border-blue-500/30 bg-blue-900/20 backdrop-blur-sm p-8 rounded-2xl transition-all duration-300 hover:bg-blue-900/40 hover:border-blue-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] flex flex-col items-center cursor-pointer">
                    <div className="bg-blue-600/20 p-4 rounded-full mb-4 group-hover:bg-blue-600/40 transition-colors">
                         <img src="/images/ships/finalship.png" className="w-8 h-8 object-contain" alt="Rocket" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Student Portal</h2>
                    <p className="text-blue-200/80">Check your rank, view missions, and customize your ship.</p>
                </div>
            </Link>

            {/* Teacher Console Card */}
            <Link href="/teacher" className="group">
                <div className="border border-purple-500/30 bg-purple-900/20 backdrop-blur-sm p-8 rounded-2xl transition-all duration-300 hover:bg-purple-900/40 hover:border-purple-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] flex flex-col items-center cursor-pointer">
                    <div className="bg-purple-600/20 p-4 rounded-full mb-4 group-hover:bg-purple-600/40 transition-colors">
                        <Users className="w-8 h-8 text-purple-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Teacher Console</h2>
                    <p className="text-purple-200/80">Award XP, manage the map, and track class progress.</p>
                </div>
            </Link>
        </div>
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
