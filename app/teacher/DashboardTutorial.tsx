"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type TutorialStep = {
    title: string;
    description: React.ReactNode;
    targetId?: string; // If we were using a real anchor system, but simplified for now
};

export default function DashboardTutorial() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

    useEffect(() => {
        if (!user) return;
        const checkTutorial = async () => {
            const userSettingsRef = doc(db, `users/${user.uid}/settings/tutorial`);
            const snap = await getDoc(userSettingsRef);
            if (!snap.exists() || !snap.data().hasSeenDashboard) {
                setTimeout(() => setIsOpen(true), 1000); // Delay for effect
            }
        };
        checkTutorial();
    }, [user]);

    const completeTutorial = async () => {
        if (!user) return;
        setIsOpen(false);
        try {
            await setDoc(doc(db, `users/${user.uid}/settings/tutorial`), { hasSeenDashboard: true }, { merge: true });
        } catch (e) {
            console.error("Error saving tutorial state:", e);
        }
    };

    const STEPS: TutorialStep[] = [
        {
            title: "Welcome to ClassCrave",
            description: "Let's get your classroom set up for adventure. This quick guide will show you how to manage your students, rewards, and lessons."
        },
        {
            title: "1. Manage Roster",
            description: "Start here to add your students. You'll generate their unique login codes and assign them to your class fleet."
        },
        {
            title: "2. Rank Protocols",
            description: (
                <div className="space-y-2">
                    <p>Customize how much XP is needed for each rank.</p>
                    <div className="bg-blue-50/10 p-2 rounded border border-blue-500/30 text-xs">
                        <strong>Pro Tip:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                            <li><strong>Younger Grades (K-3):</strong> Keep thresholds low (e.g., 100 XP per rank). Award frequent, small amounts (1-5 XP).</li>
                            <li><strong>Older Grades (4+):</strong> Use higher thresholds (e.g., 1000 XP). Making rankings feel more significant.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "3. Behavior Settings",
            description: (
                <div className="space-y-2">
                    <p>Define what earns XP in your classroom.</p>
                    <div className="bg-yellow-50/10 p-2 rounded border border-yellow-500/30 text-xs text-yellow-200">
                        <strong>Math Check:</strong> Ideally, a student should rank up every 1-2 weeks. <br/>
                        If a rank requires <strong>500 XP</strong>, and you give <strong>50 XP</strong> daily, they'll rank up in 10 days. Ensure your protocols match your pacing!
                    </div>
                </div>
            )
        },
        {
            title: "4. Co-Teachers",
            description: "Invite other educators to your classroom command deck. They'll have permission to award points and help manage missions."
        },
        {
            title: "5. Planet Rewards",
            description: "Each planet serves as a major milestone. You can customize what real-world reward (like a pizza party or extra recess) is unlocked when the class reaches a new planet."
        },
        {
            title: "6. Asteroid Event",
            description: "Need a quick engagement boost? Launch an asteroid event! Students must earn XP quickly to destroy the asteroid before it hits."
        },
        {
            title: "7. Award Points (Mobile)",
            description: "Use this tile on your phone or tablet to walk around the room and award points instantly without being tied to your desk."
        }
    ];

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            completeTutorial();
        }
    };

    return (
        <>
            {/* Re-open Trigger */}
            <button 
                onClick={() => { setCurrentStep(0); setIsOpen(true); }}
                className="fixed bottom-4 right-4 z-40 bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 text-xs rounded-full backdrop-blur-sm transition-all border border-white/5"
            >
                Help Guide
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backyard Overlay */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Modal */}
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden z-50"
                        >
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-6 pb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <div className="w-24 h-24 rounded-full border-4 border-white dashed spin-slow" />
                                </div>
                                <h2 className="text-xl font-bold">{STEPS[currentStep].title}</h2>
                                <div className="flex gap-1 mt-4">
                                    {STEPS.map((_, i) => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? "bg-cyan-400" : "bg-white/20"}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="min-h-[120px] text-slate-600 leading-relaxed text-sm">
                                    {STEPS[currentStep].description}
                                </div>

                                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                                    <button 
                                        onClick={() => completeTutorial()}
                                        className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider"
                                    >
                                        Skip Guide
                                    </button>

                                    <button 
                                        onClick={nextStep}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-transform active:scale-95 shadow-lg"
                                    >
                                        {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                                        {currentStep === STEPS.length - 1 ? <Check size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

