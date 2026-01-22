"use client";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export default function PendingPage() {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 text-center">
            <div className="mb-8 animate-pulse">
                <img 
                    src="/images/ships/finalship.png"
                    alt="Pending"
                    className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] transform -rotate-45"
                />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">Transmission Received</h1>
            <p className="max-w-md text-gray-400 mb-8">
                Welcome, Cadet <strong>{user?.displayName}</strong>. Your application to join the fleet is currently in the queue. 
                Please wait for your Commanding Officer (Teacher) to approve your credentials.
            </p>

            <button 
                onClick={logout}
                className="flex items-center gap-2 px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
            >
                <LogOut size={20} />
                <span>Return to Base (Logout)</span>
            </button>
        </div>
    )
}
