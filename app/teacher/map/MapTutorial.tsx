"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, Check, Award, LayoutGrid, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type TutorialStep = {
    title: string;
    description: React.ReactNode;
    targetId?: string;
};

export default function MapTutorial() {
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
            if (!snap.exists() || !snap.data().hasSeenMap) {
                setTimeout(() => setIsOpen(true), 1500); // 1.5s delay to let map load
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
                setTimeout(updatePosition, 500); 
            }
        } else {
            setTargetRect(null);
        }

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [currentStep, isOpen]);

    const completeTutorial = async () => {
        if (!user) return;
        setIsOpen(false);
        try {
            await setDoc(doc(db, `users/${user.uid}/settings/tutorial`), { hasSeenMap: true }, { merge: true });
        } catch (e) {
            console.error("Error saving tutorial state:", e);
        }
    };

    const STEPS: TutorialStep[] = [
        {
            title: "Live Classroom Display",
            description: "Welcome to mission control. This screen is designed to be projected on your classroom TV or smartboard. It shows realtime ship positions and mission status."
        },
        {
            title: "Realtime Awards",
            description: (
                <div className="space-y-3">
                    <p>Put this on the big screen and keep it running!</p>
                    <div className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-cyan-500/30">
                        <Award size={24} className="text-yellow-400 mt-1 shrink-0" />
                        <p className="text-xs text-cyan-200">
                            When you award points from your mobile phone or tablet, a <strong>giant animated notification</strong> will instantly pop up right here for the whole class to applaud.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: "Fleet Grid View",
            description: (
                <div className="space-y-2">
                     <p>Want to see everyone at once?</p>
                     <p>Click this toggle to switch to a <strong>Manifest Grid</strong> view. It shows every student's rank, fuel, and current location in a clean list.</p>
                </div>
            ),
            targetId: "map-btn-grid"
        },
        {
            title: "Manual Override",
            description: (
                <div className="space-y-2">
                     <p>Need to move a ship manually?</p>
                     <p>Use the <strong>Fleet Command</strong> tool to take control of any student's ship and warp them to a specific planet if they get stuck or need help.</p>
                </div>
            ),
            targetId: "map-btn-command"
        }
    ];

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            completeTutorial();
        }
    };

    // Calculate tooltip position (Robust & Responsive) - COPIED FROM DASHBOARD TUTORIAL
    const getTooltipCurrentStyle = () => {
        if (!targetRect) return {}; 

        const isMobile = window.innerWidth < 768; 
        const CARD_WIDTH = 384; 

        if (isMobile) {
            return {
                position: 'fixed' as 'fixed',
                left: '50%',
                bottom: '24px',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)',
                maxWidth: '400px',
                margin: 0,
                zIndex: 200
            };
        }

        const isTopHalf = targetRect.top < window.innerHeight / 2;
        let left = targetRect.left + (targetRect.width / 2) - (CARD_WIDTH / 2);
        const margin = 20;
        const maxLeft = window.innerWidth - CARD_WIDTH - margin;
        left = Math.max(margin, Math.min(left, maxLeft));

        const spaceBelow = window.innerHeight - (targetRect.bottom + 24) - margin;
        const spaceAbove = (targetRect.top - 24) - margin;

        let maxHeight = 0;
        let top: number | string = 'auto';
        let bottom: number | string = 'auto';

        if (isTopHalf) {
            top = targetRect.bottom + 24;
            maxHeight = spaceBelow;
        } else {
             bottom = (window.innerHeight - targetRect.top) + 24;
             maxHeight = spaceAbove;
        }

        if (maxHeight < 250) {
             if (isTopHalf && spaceAbove > spaceBelow) {
                 top = 'auto';
                 bottom = (window.innerHeight - targetRect.top) + 24;
                 maxHeight = spaceAbove;
             } else if (!isTopHalf && spaceBelow > spaceAbove) {
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
            maxHeight: `${Math.max(200, maxHeight)}px`,
            transform: 'none', 
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column' as 'column'
        };
    };

    return (
        <>
            {/* Re-open Trigger */}
            <button 
                onClick={() => { setCurrentStep(0); setIsOpen(true); }}
                className="absolute bottom-4 left-4 z-[40] bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 px-4 text-xs rounded-full backdrop-blur-sm transition-all border border-white/5 font-bold uppercase tracking-wider"
            >
                Map Guide
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
                        
                        {/* 1. Backdrop / Spotlight */}
                        {targetRect ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[190]"
                                style={{ pointerEvents: 'auto' }}
                            >
                                <div 
                                    className="absolute transition-all duration-75 ease-out box-content border-black/80"
                                    style={{
                                        top: targetRect.top,
                                        left: targetRect.left,
                                        width: targetRect.width,
                                        height: targetRect.height,
                                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                        borderRadius: '12px'
                                    }}
                                />
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
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[190]"
                                onClick={() => setIsOpen(false)}
                                style={{ pointerEvents: 'auto' }}
                            />
                        )}

                        {/* 2. The Card */}
                        <div className="absolute inset-0 flex items-center justify-center z-[200] pointer-events-none">
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