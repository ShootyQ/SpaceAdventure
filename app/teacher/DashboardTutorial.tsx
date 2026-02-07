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
    targetId?: string;
};

export default function DashboardTutorial() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Initial Check
    useEffect(() => {
        if (!user) return;
        const checkTutorial = async () => {
            const userSettingsRef = doc(db, `users/${user.uid}/settings/tutorial`);
            const snap = await getDoc(userSettingsRef);
            if (!snap.exists() || !snap.data().hasSeenDashboard) {
                setTimeout(() => setIsOpen(true), 1000);
            }
        };
        checkTutorial();
    }, [user]);

    // Step Positioning Logic
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            const step = STEPS[currentStep];
            if (step.targetId) {
                const el = document.getElementById(step.targetId);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    setTargetRect(rect);
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        // Scroll to target when step changes
        const step = STEPS[currentStep];
        if (step.targetId) {
            const el = document.getElementById(step.targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Give a small delay for scroll to settle before grabbing rec, though live scroll update handles it mostly
                setTimeout(updatePosition, 500); 
            }
        } else {
            setTargetRect(null);
        }

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture phase to handle all scrolls
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [currentStep, isOpen]);

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
            description: "Start here to add your students. You'll generate their unique login codes and assign them to your class fleet.",
            targetId: "tile-roster"
        },
        {
            title: "2. Rank Protocols",
            description: (
                <div className="space-y-2">
                    <p>Customize how much XP is needed for each rank.</p>
                    <div className="bg-blue-50/10 p-2 rounded border border-blue-500/30 text-xs text-blue-200">
                        <strong>Pro Tip:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                            <li><strong>Younger Grades (K-3):</strong> Keep thresholds low (e.g., 100 XP per rank). Award frequent, small amounts (1-5 XP).</li>
                            <li><strong>Older Grades (4+):</strong> Use higher thresholds (e.g., 1000 XP). Making rankings feel more significant.</li>
                        </ul>
                    </div>
                </div>
            ),
            targetId: "tile-ranks"
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
            ),
            targetId: "tile-rewards"
        },
        {
            title: "4. Co-Teachers",
            description: "Invite other educators to your classroom command deck. They'll have permission to award points and help manage missions.",
            targetId: "tile-team"
        },
        {
            title: "5. Planet Rewards",
            description: "Each planet serves as a major milestone. You can customize what real-world reward (like a pizza party or extra recess) is unlocked when the class reaches a new planet.",
            targetId: "tile-planets"
        },
        {
            title: "6. Asteroid Event",
            description: "Need a quick engagement boost? Launch an asteroid event! Students must earn XP quickly to destroy the asteroid before it hits.",
            targetId: "tile-asteroids"
        }
    ];

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            completeTutorial();
        }
    };

    // Calculate tooltip position (Robust & Responsive)
    const getTooltipCurrentStyle = () => {
        if (!targetRect) return {}; // Centered default handled by CSS classes

        const isMobile = window.innerWidth < 768; // Standard md breakpoint check
        const CARD_WIDTH = 384; // max-w-sm is roughly 384px

        // Mobile Strategy: Fixed Bottom Sheet
        if (isMobile) {
            return {
                position: 'fixed' as 'fixed',
                left: '50%',
                bottom: '24px',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)', // Full width minus padding
                maxWidth: '400px',
                margin: 0,
                zIndex: 60
            };
        }

        // Desktop Strategy: Smart Anchoring
        // If target is in top half, show tooltip below. Else above.
        const isTopHalf = targetRect.top < window.innerHeight / 2;
        
        // Horizontal Center Calculation with Clamping
        // Start centered on the target
        let left = targetRect.left + (targetRect.width / 2) - (CARD_WIDTH / 2);
        
        // Clamp so it doesn't go off-screen (20px safety margin)
        const margin = 20;
        const maxLeft = window.innerWidth - CARD_WIDTH - margin;
        left = Math.max(margin, Math.min(left, maxLeft));

        // Calculate available vertical space to assign nice Max Height limits
        const spaceBelow = window.innerHeight - (targetRect.bottom + 24) - margin;
        const spaceAbove = (targetRect.top - 24) - margin;

        let maxHeight = 0;
        let top: number | string = 'auto';
        let bottom: number | string = 'auto';

        if (isTopHalf) {
            // PLACING BELOW
            top = targetRect.bottom + 24;
            maxHeight = spaceBelow;
        } else {
             // PLACING ABOVE
             bottom = (window.innerHeight - targetRect.top) + 24;
             maxHeight = spaceAbove;
        }

        // Failsafe: If assigned space is too small (< 250px), try flipping
        if (maxHeight < 250) {
             if (isTopHalf && spaceAbove > spaceBelow) {
                 // Flip to above
                 top = 'auto';
                 bottom = (window.innerHeight - targetRect.top) + 24;
                 maxHeight = spaceAbove;
             } else if (!isTopHalf && spaceBelow > spaceAbove) {
                 // Flip to below
                 bottom = 'auto';
                 top = targetRect.bottom + 24;
                 maxHeight = spaceBelow;
             }
        }

        return {
            position: 'absolute' as 'absolute',
            left: left,
            top: top,
            bottom: bottom,
            width: `${CARD_WIDTH}px`,
            maxHeight: `${Math.max(200, maxHeight)}px`, // Enforce strict bounds
            transform: 'none', 
            zIndex: 60,
            display: 'flex', // Ensure flex layout for inner scrolling
            flexDirection: 'column' as 'column'
        };
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
                    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
                        
                        {/* 1. Backdrop / Spotlight */}
                        {targetRect ? (
                            // Spotlight Mode: Dark overlay with a "hole" for the target
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-40"
                                style={{ pointerEvents: 'auto' }} // Catch clicks outside
                            >
                                {/* We compose the spotlight using borders on four sides or a ClipPath. 
                                    ClipPath is cleanest but 'box-shadow' is easiest for border-radius support. */}
                                <div 
                                    className="absolute transition-all duration-75 ease-out box-content border-black/80"
                                    style={{
                                        top: targetRect.top,
                                        left: targetRect.left,
                                        width: targetRect.width,
                                        height: targetRect.height,
                                        // Improved visibility: Lower opacity (0.7) to see context
                                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                        borderRadius: '12px'
                                    }}
                                />
                                {/* Pulsing Border around target */}
                                <div 
                                    className="absolute border-2 border-cyan-400 rounded-xl animate-pulse transition-all duration-75 ease-out"
                                    style={{
                                        top: targetRect.top - 4,
                                        left: targetRect.left - 4,
                                        width: targetRect.width + 8,
                                        height: targetRect.height + 8,
                                    }}
                                />
                            </motion.div>
                        ) : (
                            // Standard Modal Mode: Full dark backdrop
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40"
                                onClick={() => setIsOpen(false)}
                                style={{ pointerEvents: 'auto' }}
                            />
                        )}

                        {/* 2. The Card */}
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ 
                                    scale: 1, 
                                    opacity: 1, 
                                    y: 0,
                                    ...getTooltipCurrentStyle()
                                }}
                                transition={{ type: "spring", duration: 0.5 }}
                                className="bg-slate-900 text-slate-100 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 relative overflow-hidden pointer-events-auto mx-4 flex flex-col"
                                style={targetRect ? { margin: 0 } : {}}
                            >
                                {/* Card Header */}
                                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                                    <h3 className="font-bold text-cyan-400 uppercase tracking-widest text-sm">
                                        {currentStep + 1} / {STEPS.length}
                                    </h3>
                                    <button onClick={() => completeTutorial()} className="text-slate-500 hover:text-white"><X size={16}/></button>
                                </div>

                                {/* Content */}
                                <div className="p-6 overflow-y-auto custom-scrollbar">
                                    <h2 className="text-xl font-bold mb-4 text-white">{STEPS[currentStep].title}</h2>
                                    <div className="text-slate-400 text-sm leading-relaxed mb-6">
                                        {STEPS[currentStep].description}
                                    </div>

                                    <div className="flex justify-between items-center pt-4">
                                        <button 
                                            onClick={() => {
                                                if(currentStep > 0) setCurrentStep(c => c - 1);
                                            }}
                                            className={`text-slate-500 hover:text-white text-sm ${currentStep === 0 ? 'invisible' : ''}`}
                                        >
                                            Back
                                        </button>

                                        <button 
                                            onClick={nextStep}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/20"
                                        >
                                            {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                                            {currentStep === STEPS.length - 1 ? <Check size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

