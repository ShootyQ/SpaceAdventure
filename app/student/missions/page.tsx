"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, arrayUnion, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowLeft, BookOpen, Video, Brain, CheckCircle, XCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from 'canvas-confetti';

interface Question {
    id: string;
    text: string;
    type: 'tf' | 'mc' | 'sort';
    options?: string[];
    correctAnswer: string | string[];
}

interface Mission {
    id: string;
    title: string;
    description: string;
    type: 'read' | 'watch';
    contentUrl?: string; 
    contentText?: string;
    questions: Question[];
    xpReward: number;
}

export default function StudentMissions() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [completedMissions, setCompletedMissions] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{correct: boolean, score: number} | null>(null);

    // Fetch Missions
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                // Get Missions
                const q = query(collection(db, "missions"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const missionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
                setMissions(missionData);

                // Get User Completions (if stored on user doc)
                // Casting userData as any to access custom fields not yet in strict types
                const userCompletions: string[] = (userData as any)?.completedMissions || [];
                setCompletedMissions(userCompletions);
            } catch (e) {
                console.error("Error loading missions:", e);
            }
            setLoading(false);
        };
        fetchData();
    }, [user, userData]);

    const handleStartMission = (mission: Mission) => {
        setActiveMission(mission);
        setAnswers({});
        setFeedback(null);
        window.scrollTo(0,0);
    };

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const submitMission = async () => {
        if (!activeMission || !user) return;
        setSubmitting(true);

        try {
            // Grading
            let correctCount = 0;
            const totalQuestions = activeMission.questions.length;

            activeMission.questions.forEach(q => {
                const answer = answers[q.id];
                // Simple checking for string based answers (MC/TF)
                // Arrays (like sorting) would need more complex logic, handling string equality for now
                if (answer === q.correctAnswer) {
                    correctCount++;
                }
            });

            const score = Math.round((correctCount / totalQuestions) * 100);
            const passed = score >= 70; // 70% passing grade

            setFeedback({ correct: passed, score });

            if (passed) {
                // Update User
                const userRef = doc(db, "users", user.uid);
                
                // Only award XP if not already completed
                if (!completedMissions.includes(activeMission.id)) {
                    await updateDoc(userRef, {
                        completedMissions: arrayUnion(activeMission.id),
                        xp: increment(activeMission.xpReward)
                    });
                    
                    // Trigger confetti
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });

                    setCompletedMissions(prev => [...prev, activeMission.id]);
                }
            }

        } catch (e) {
            console.error("Error submitting mission:", e);
            alert("Error submitting mission. Please try again.");
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
             <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500">
                <Loader2 size={40} className="animate-spin" />
             </div>
        );
    }

    // Active Mission View
    if (activeMission) {
        const isCompleted = completedMissions.includes(activeMission.id);

        return (
            <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
                <div className="max-w-4xl mx-auto pb-20">
                    <button 
                        onClick={() => setActiveMission(null)}
                        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-400 mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Mission Log
                    </button>

                    <div className="bg-black/80 border border-cyan-500/30 rounded-2xl overflow-hidden backdrop-blur-sm">
                        {/* Mission Header */}
                        <div className="p-8 border-b border-cyan-900/50 bg-gradient-to-r from-cyan-950/50 to-transparent">
                            <div className="flex justify-between items-start mb-4">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-300 rounded text-xs font-bold uppercase tracking-wider border border-cyan-500/20">
                                    {activeMission.type === 'watch' ? <Video size={14} /> : <BookOpen size={14} />}
                                    {activeMission.type === 'watch' ? 'Video Log' : 'Intel Report'}
                                </span>
                                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                                    <Trophy size={18} />
                                    <span>{activeMission.xpReward} XP</span>
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">{activeMission.title}</h1>
                            <p className="text-cyan-200/80">{activeMission.description}</p>
                        </div>

                        {/* Mission Content */}
                        <div className="p-8">
                            {activeMission.type === 'watch' && activeMission.contentUrl && (
                                <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-cyan-900 mb-8">
                                    <iframe 
                                        src={activeMission.contentUrl.replace("watch?v=", "embed/")} 
                                        className="w-full h-full" 
                                        allowFullScreen
                                        title="Mission Briefing"
                                    />
                                </div>
                            )}

                            {activeMission.type === 'read' && activeMission.contentText && (
                                <div className="prose prose-invert prose-cyan max-w-none mb-8 p-6 bg-cyan-950/20 rounded-xl border border-cyan-900/30">
                                    <div className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-lg">
                                        {activeMission.contentText}
                                    </div>
                                </div>
                            )}

                            {/* Quiz Section */}
                            <div className="mt-12">
                                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-6 pb-2 border-b border-cyan-900">
                                    <Brain className="text-purple-400" />
                                    Knowledge Check
                                </h3>

                                <div className="space-y-8">
                                    {activeMission.questions.map((q, idx) => (
                                        <div key={q.id} className="p-6 bg-black/40 rounded-xl border border-cyan-900/30">
                                            <p className="font-bold text-white mb-4 text-lg">
                                                <span className="text-cyan-600 mr-2">{idx + 1}.</span>
                                                {q.text}
                                            </p>
                                            
                                            <div className="space-y-3">
                                                {q.type === 'tf' && (
                                                    <div className="flex gap-4">
                                                        {['true', 'false'].map((opt) => (
                                                            <label key={opt} className={`
                                                                flex-1 cursor-pointer p-4 rounded-lg border transition-all
                                                                ${answers[q.id] === opt 
                                                                    ? 'bg-cyan-900/40 border-cyan-500 text-white' 
                                                                    : 'bg-black/20 border-white/10 hover:bg-white/5 text-gray-400'}
                                                            `}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={q.id} 
                                                                    value={opt} 
                                                                    checked={answers[q.id] === opt}
                                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                    className="hidden"
                                                                />
                                                                <span className="capitalize font-bold text-center block">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'mc' && q.options?.map((opt) => (
                                                    <label key={opt} className={`
                                                        block cursor-pointer p-4 rounded-lg border transition-all
                                                        ${answers[q.id] === opt 
                                                            ? 'bg-cyan-900/40 border-cyan-500 text-white' 
                                                            : 'bg-black/20 border-white/10 hover:bg-white/5 text-gray-400'}
                                                    `}>
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            value={opt} 
                                                            checked={answers[q.id] === opt}
                                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                            className="hidden"
                                                        />
                                                        <span className="md:text-lg">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Area */}
                            {feedback && (
                                <div className={`mt-8 p-6 rounded-xl text-center border-2 animate-in zoom-in duration-300 ${feedback.correct ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                                    {feedback.correct ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle className="text-green-500 w-16 h-16 mb-2" />
                                            <h2 className="text-2xl font-bold text-white">Mission Accomplished!</h2>
                                            <p className="text-green-300">Score: {feedback.score}% - You have earned {activeMission.xpReward} XP.</p>
                                            <button onClick={() => setActiveMission(null)} className="mt-4 px-6 py-2 bg-green-600 rounded-full font-bold text-white hover:bg-green-500">Return to Base</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <XCircle className="text-red-500 w-16 h-16 mb-2" />
                                            <h2 className="text-2xl font-bold text-white">Mission Failed</h2>
                                            <p className="text-red-300">Score: {feedback.score}% - Minimum 70% required.</p>
                                            <button onClick={() => setFeedback(null)} className="mt-4 px-6 py-2 bg-red-900/50 rounded-full font-bold text-red-200 hover:bg-red-900 border border-red-500/30">Review Intel & Try Again</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit Button */}
                            {!feedback && (
                                <button 
                                    onClick={submitMission}
                                    disabled={submitting || Object.keys(answers).length < activeMission.questions.length}
                                    className={`
                                        w-full mt-8 py-4 rounded-xl font-bold text-xl uppercase tracking-widest transition-all
                                        ${Object.keys(answers).length < activeMission.questions.length
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/50'}
                                    `}
                                >
                                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Transmit Mission Data'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Mission List
    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
             <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                     <Link href="/student" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                        <ArrowLeft size={20} />
                     </Link>
                     <div>
                         <h1 className="text-3xl font-bold uppercase tracking-widest text-white">Mission Log</h1>
                         <p className="text-cyan-600">Active Directives & Available Contracts</p>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {missions.map(mission => {
                        const isCompleted = completedMissions.includes(mission.id);
                        return (
                            <div 
                                key={mission.id} 
                                onClick={() => handleStartMission(mission)}
                                className={`
                                    relative group p-6 rounded-xl border transition-all cursor-pointer overflow-hidden
                                    ${isCompleted 
                                        ? 'bg-green-950/10 border-green-500/30 hover:border-green-500' 
                                        : 'bg-black/60 border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                     <div className={`p-3 rounded-lg ${mission.type === 'watch' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                        {mission.type === 'watch' ? <Video size={24} /> : <BookOpen size={24} />}
                                     </div>
                                     {isCompleted ? (
                                         <span className="flex items-center gap-1 text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-full border border-green-500/30 text-xs uppercase">
                                             <CheckCircle size={14} /> Completed
                                         </span>
                                     ) : (
                                         <span className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-500/30 text-xs uppercase">
                                             <Trophy size={14} /> {mission.xpReward} XP
                                         </span>
                                     )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                                    {mission.title}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-2 mb-4">{mission.description}</p>
                                
                                <div className="text-xs text-cyan-700 font-bold uppercase tracking-wider flex items-center gap-2">
                                    {isCompleted ? 'Review Data' : 'Click to Initiate'}
                                    <ArrowLeft className="rotate-180" size={12} />
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
        </div>
    );
}
