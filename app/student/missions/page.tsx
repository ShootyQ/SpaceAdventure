"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, arrayUnion, increment, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowLeft, BookOpen, Video, Brain, CheckCircle, XCircle, Trophy } from "lucide-react";
import Link from "next/link";
import confetti from 'canvas-confetti';
import { createPracticeQuestions, PracticeAssignmentConfig, PracticeQuestion, getPracticeTemplatesForGrade } from "@/lib/practice";
import { StudentGrade } from "@/types";

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
    type: 'read' | 'watch' | 'practice';
    contentUrl?: string; 
    contentText?: string;
    questions: Question[];
    targetGrades?: Array<StudentGrade | 'all'>;
    practiceConfig?: PracticeAssignmentConfig;
    xpReward: number;
}

interface MissionProgress {
    attempts: number;
    lastScore: number;
    passedEver: boolean;
    completedAt?: number;
    lastAttemptAt?: number;
}

interface GraphPoint {
    x: number;
    y: number;
}

export default function StudentMissions() {
    const { user, userData } = useAuth();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [completedMissions, setCompletedMissions] = useState<string[]>([]);
    const [missionProgress, setMissionProgress] = useState<Record<string, MissionProgress>>({});
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{correct: boolean, score: number, newRank?: string} | null>(null);
    const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
    const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
    const [practiceGraphPoints, setPracticeGraphPoints] = useState<Record<string, GraphPoint[]>>({});
    const [showFinished, setShowFinished] = useState(false);

    const DEFAULT_PRACTICE_CONFIG: PracticeAssignmentConfig = {
        templateId: 'math-multiplication-facts',
        subject: 'math',
        gradeLevel: 3,
        questionCount: 24,
        numberRangeMin: 1,
        numberRangeMax: 100,
        tableMin: 1,
        tableMax: 12,
        multiplicandMin: 1,
        multiplicandMax: 12,
        denominatorMin: 2,
        denominatorMax: 12,
        decimalPlaces: 2,
        attemptPolicy: 'once',
    };

    const inferPracticeFromLegacy = (mission: Mission) => {
        const title = String(mission.title || '').toLowerCase();
        const desc = String(mission.description || '').toLowerCase();
        const templateId = String(mission.practiceConfig?.templateId || '');
        const hasPracticeConfig = !!mission.practiceConfig;
        const hasNoQuestions = !Array.isArray(mission.questions) || mission.questions.length === 0;
        const looksLikePractice = title.includes('multiplication') || desc.includes('multiplication') || title.includes('math') || title.includes('fraction') || title.includes('decimal');
        const legacyTemplate = templateId === 'math-multiplication-1-12';
        return mission.type === 'practice' || hasPracticeConfig || legacyTemplate || (hasNoQuestions && looksLikePractice);
    };

    const normalizePracticeAnswer = (value: string) => String(value || '').trim().toLowerCase();

    const parseSlopeInterceptEquation = (value: string): { slope: number; intercept: number } | null => {
        const compact = String(value || '').toLowerCase().replace(/\s+/g, '');
        if (!compact.startsWith('y=')) return null;

        const rhs = compact.slice(2);
        const xIndex = rhs.indexOf('x');
        if (xIndex < 0) return null;

        const slopeRaw = rhs.slice(0, xIndex);
        const interceptRaw = rhs.slice(xIndex + 1);

        let slope = 0;
        if (slopeRaw === '' || slopeRaw === '+') slope = 1;
        else if (slopeRaw === '-') slope = -1;
        else slope = Number(slopeRaw);
        if (!Number.isFinite(slope)) return null;

        let intercept = 0;
        if (interceptRaw) {
            intercept = Number(interceptRaw);
            if (!Number.isFinite(intercept)) return null;
        }

        return { slope, intercept };
    };

    const parseGraphPointsAnswer = (value: string): GraphPoint[] => {
        try {
            const parsed = JSON.parse(value || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
                .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        } catch {
            return [];
        }
    };

    const isPracticeAnswerCorrect = (question: PracticeQuestion, submittedRaw: string) => {
        if (question.inputMode === 'equation' && question.graph) {
            const parsed = parseSlopeInterceptEquation(submittedRaw);
            if (!parsed) return false;
            return parsed.slope === question.graph.line.slope && parsed.intercept === question.graph.line.intercept;
        }

        if (question.inputMode === 'graph-two-points' && question.graph) {
            const points = parseGraphPointsAnswer(submittedRaw);
            if (points.length !== 2) return false;

            const [first, second] = points;
            if (first.x === second.x && first.y === second.y) return false;

            const expectedYFirst = (question.graph.line.slope * first.x) + question.graph.line.intercept;
            const expectedYSecond = (question.graph.line.slope * second.x) + question.graph.line.intercept;
            return Math.abs(first.y - expectedYFirst) < 0.0001 && Math.abs(second.y - expectedYSecond) < 0.0001;
        }

        const submitted = normalizePracticeAnswer(submittedRaw);
        if (!submitted) return false;

        const accepted = [question.answer, ...(question.acceptedAnswers || [])].map(normalizePracticeAnswer);
        if (accepted.includes(submitted)) return true;

        const submittedNumber = Number(submitted);
        if (Number.isNaN(submittedNumber)) return false;

        return accepted.some((expected) => {
            const expectedNumber = Number(expected);
            if (Number.isNaN(expectedNumber)) return false;
            return Math.abs(expectedNumber - submittedNumber) < 0.001;
        });
    };

    const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

    const normalizePracticeConfig = (config?: PracticeAssignmentConfig): PracticeAssignmentConfig => {
        const templates = getPracticeTemplatesForGrade('all');
        const defaultTemplateId = DEFAULT_PRACTICE_CONFIG.templateId;
        const requestedTemplate = String(config?.templateId || defaultTemplateId);
        const templateExists = templates.some((template) => template.id === requestedTemplate);

        return {
            ...DEFAULT_PRACTICE_CONFIG,
            ...(config || {}),
            templateId: (templateExists ? requestedTemplate : defaultTemplateId) as PracticeAssignmentConfig['templateId'],
            questionCount: Math.min(Math.max(Number(config?.questionCount ?? DEFAULT_PRACTICE_CONFIG.questionCount), 5), 60),
        };
    };

    const isMissionAssignedToStudentGrade = (mission: Mission, studentGrade?: StudentGrade) => {
        const targets = Array.isArray(mission.targetGrades) && mission.targetGrades.length > 0
            ? mission.targetGrades.map((grade) => String(grade))
            : ['all'];
        if (targets.includes('all')) return true;
        if (!studentGrade) return true;
        return targets.includes(String(studentGrade));
    };

    const shuffleOptions = (values: string[]) => {
        const arr = [...values];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const DEFAULT_RANKS = [
        { name: "Space Cadet", minXP: 0 },
        { name: "Rookie Pilot", minXP: 100 },
        { name: "Star Scout", minXP: 300 },
        { name: "Nebula Navigator", minXP: 600 },
        { name: "Solar Specialist", minXP: 1000 },
        { name: "Comet Captain", minXP: 1500 },
        { name: "Galaxy Guardian", minXP: 2200 },
        { name: "Cosmic Commander", minXP: 3000 },
        { name: "Void Admiral", minXP: 4000 },
        { name: "Grand Star Admiral", minXP: 5000 },
    ];

    // Fetch Missions
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !userData) return;
            try {
                // Get Missions from Teacher's Subcollection
                // Filter by teacher if student has a teacher
                let q;
                
                if (userData.teacherId) {
                    // Correct: Read from the teacher's 'missions' subcollection
                    q = query(collection(db, `users/${userData.teacherId}/missions`), orderBy("createdAt", "desc"));
                } else {
                     // Fallback check global missions? Or just empty.
                     // For now, let's look at root missions as a fallback just in case no teacherId
                     q = query(collection(db, "missions"), orderBy("createdAt", "desc"));
                }

                const snapshot = await getDocs(q);
                const missionData = snapshot.docs.map((docSnap) => {
                    const raw = { id: docSnap.id, ...docSnap.data() } as Mission;
                    const inferredPractice = inferPracticeFromLegacy(raw);
                    const normalizedPracticeConfig = raw.practiceConfig
                        ? {
                            ...normalizePracticeConfig(raw.practiceConfig),
                            templateId: String(raw.practiceConfig.templateId || '') === 'math-multiplication-1-12'
                                ? 'math-multiplication-facts'
                                : normalizePracticeConfig(raw.practiceConfig).templateId,
                        }
                        : undefined;
                    return {
                        ...raw,
                        type: inferredPractice ? 'practice' : (raw.type || 'read'),
                        practiceConfig: inferredPractice ? (normalizedPracticeConfig || DEFAULT_PRACTICE_CONFIG) : normalizedPracticeConfig,
                        questions: Array.isArray(raw.questions) ? raw.questions : [],
                    } as Mission;
                });

                // Get fresh user progress (context can be stale)
                const userSnap = await getDoc(doc(db, "users", user.uid));
                const userRecord = userSnap.exists() ? userSnap.data() as any : (userData as any);
                const userCompletions: string[] = userRecord?.completedMissions || [];
                const progressMap: Record<string, MissionProgress> = userRecord?.missionProgress || {};
                const studentGrade = userRecord?.gradeLevel as StudentGrade | undefined;
                const filteredMissions = missionData.filter((mission) => isMissionAssignedToStudentGrade(mission, studentGrade));
                setMissions(filteredMissions);
                setCompletedMissions(userCompletions);
                setMissionProgress(progressMap);
            } catch (e) {
                console.error("Error loading missions:", e);
            }
            setLoading(false);
        };
        fetchData();
    }, [user, userData]);

    const handleStartMission = (mission: Mission) => {
        const isPracticeMission = inferPracticeFromLegacy(mission);
        const practiceConfig = normalizePracticeConfig(mission.practiceConfig || DEFAULT_PRACTICE_CONFIG);
        const missionState = missionProgress[mission.id];
        if (isPracticeMission && practiceConfig.attemptPolicy === 'once' && (missionState?.attempts || 0) > 0) {
            alert("This assignment is set to one attempt.");
            return;
        }

        setActiveMission(mission);
        const initialAnswers: Record<string, string | string[]> = {};
        mission.questions.forEach((q) => {
            if (q.type === 'sort') {
                const source = (q.options || []).map((opt) => String(opt || '').trim()).filter(Boolean);
                initialAnswers[q.id] = shuffleOptions(source);
            }
        });
        setAnswers(initialAnswers);
        if (isPracticeMission) {
            const seed = `${user?.uid || 'cadet'}:${mission.id}:${Date.now()}`;
            const generated = createPracticeQuestions(practiceConfig, seed);
            if (generated.length > 0) {
                setPracticeQuestions(generated);
            } else {
                const fallbackGenerated = createPracticeQuestions(DEFAULT_PRACTICE_CONFIG, `${seed}:fallback`);
                setPracticeQuestions(fallbackGenerated);
            }
            setPracticeAnswers({});
            setPracticeGraphPoints({});
        } else {
            setPracticeQuestions([]);
            setPracticeAnswers({});
            setPracticeGraphPoints({});
        }
        setFeedback(null);
        window.scrollTo(0,0);
    };

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handlePracticeAnswerChange = (questionId: string, value: string) => {
        setPracticeAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handlePracticeGraphToggle = (questionId: string, point: GraphPoint) => {
        setPracticeGraphPoints((prev) => {
            const current = prev[questionId] || [];
            const exists = current.some((item) => item.x === point.x && item.y === point.y);
            const nextPoints = exists
                ? current.filter((item) => !(item.x === point.x && item.y === point.y))
                : [...current.slice(-1), point];

            setPracticeAnswers((prevAnswers) => ({
                ...prevAnswers,
                [questionId]: JSON.stringify(nextPoints),
            }));

            return {
                ...prev,
                [questionId]: nextPoints,
            };
        });
    };

    const isPracticeQuestionIncomplete = (question: PracticeQuestion) => {
        if (question.inputMode === 'graph-two-points') {
            return (practiceGraphPoints[question.id] || []).length !== 2;
        }
        return !String(practiceAnswers[question.id] || '').trim();
    };

    const moveSortItem = (questionId: string, fromIndex: number, delta: number) => {
        setAnswers(prev => {
            const current = prev[questionId];
            if (!Array.isArray(current)) return prev;
            const targetIndex = fromIndex + delta;
            if (targetIndex < 0 || targetIndex >= current.length) return prev;
            const reordered = [...current];
            [reordered[fromIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[fromIndex]];
            return { ...prev, [questionId]: reordered };
        });
    };

    const submitMission = async () => {
        if (!activeMission || !user) return;
        setSubmitting(true);

        try {
            const isPracticeMission = inferPracticeFromLegacy(activeMission);
            // Grading
            let correctCount = 0;
            let totalQuestions = 0;

            if (isPracticeMission) {
                totalQuestions = practiceQuestions.length;
                practiceQuestions.forEach((question) => {
                    const raw = practiceAnswers[question.id];
                    if (isPracticeAnswerCorrect(question, String(raw || ''))) {
                        correctCount += 1;
                    }
                });
            } else {
                totalQuestions = activeMission.questions.length;
                activeMission.questions.forEach(q => {
                    const answer = answers[q.id];
                    if (q.type === 'sort') {
                        const submittedOrder = Array.isArray(answer)
                            ? answer.map(normalizeText)
                            : [];
                        const expectedOrder = Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.map(normalizeText)
                            : (q.options || []).map(normalizeText);
                        const isCorrectSort = submittedOrder.length === expectedOrder.length
                            && submittedOrder.every((item, index) => item === expectedOrder[index]);
                        if (isCorrectSort) {
                            correctCount++;
                        }
                        return;
                    }

                    const submitted = normalizeText(answer);
                    const expected = normalizeText(q.correctAnswer);
                    if (submitted && submitted === expected) {
                        correctCount++;
                    }
                });
            }

            const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
            const passed = score >= 70; // 70% passing grade

            let newRankName: string | undefined;
            const userRef = doc(db, "users", user.uid);
            const currentProgress = missionProgress[activeMission.id] || { attempts: 0, lastScore: 0, passedEver: false };
            const nextAttempts = (currentProgress.attempts || 0) + 1;
            const now = Date.now();
            const progressPayload: Record<string, any> = {
                [`missionProgress.${activeMission.id}.attempts`]: nextAttempts,
                [`missionProgress.${activeMission.id}.lastScore`]: score,
                [`missionProgress.${activeMission.id}.lastAttemptAt`]: now,
                [`missionProgress.${activeMission.id}.passedEver`]: currentProgress.passedEver || passed,
            };

            if (passed) {
                progressPayload[`missionProgress.${activeMission.id}.completedAt`] = now;
                
                // Only award XP if not already completed
                if (!completedMissions.includes(activeMission.id)) {
                    const locationId = (userData?.location || "").toLowerCase();
                    const planetXpKey = locationId ? `planetXP.${locationId}` : null;
                    const previousXP = Number(userData?.xp || 0);
                    const nextXP = previousXP + Number(activeMission.xpReward || 0);
                    const sortedRanks = [...DEFAULT_RANKS].sort((a, b) => b.minXP - a.minXP);
                    const oldRank = sortedRanks.find((rank) => previousXP >= rank.minXP);
                    const newRank = sortedRanks.find((rank) => nextXP >= rank.minXP);
                    const promoted = !!oldRank && !!newRank && newRank.minXP > oldRank.minXP;
                    if (promoted) {
                        newRankName = newRank?.name;
                    }

                    await updateDoc(userRef, {
                        completedMissions: arrayUnion(activeMission.id),
                        xp: increment(activeMission.xpReward),
                        ...(planetXpKey ? { [planetXpKey]: increment(activeMission.xpReward) } : {}),
                        lastXpReason: `Mission completed: ${activeMission.title}`,
                        ...progressPayload,
                    });

                    if (activeMission.xpReward > 0) {
                        try {
                            await setDoc(
                                doc(db, "public-stats", "landing"),
                                {
                                    focusPointsAwarded: increment(activeMission.xpReward),
                                    awardEvents: increment(1),
                                    studentsAwarded: increment(1),
                                    updatedAt: serverTimestamp(),
                                },
                                { merge: true }
                            );
                        } catch (statsError) {
                            console.warn("Public stats update skipped:", statsError);
                        }
                    }
                    
                    // Trigger confetti
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });

                    setCompletedMissions(prev => [...prev, activeMission.id]);
                    setMissionProgress((prev) => ({
                        ...prev,
                        [activeMission.id]: {
                            attempts: nextAttempts,
                            lastScore: score,
                            passedEver: true,
                            completedAt: now,
                            lastAttemptAt: now,
                        }
                    }));
                } else {
                    await updateDoc(userRef, progressPayload);
                    setMissionProgress((prev) => ({
                        ...prev,
                        [activeMission.id]: {
                            attempts: nextAttempts,
                            lastScore: score,
                            passedEver: currentProgress.passedEver || passed,
                            completedAt: currentProgress.completedAt || now,
                            lastAttemptAt: now,
                        }
                    }));
                }
            } else {
                await updateDoc(userRef, progressPayload);
                setMissionProgress((prev) => ({
                    ...prev,
                    [activeMission.id]: {
                        attempts: nextAttempts,
                        lastScore: score,
                        passedEver: currentProgress.passedEver,
                        completedAt: currentProgress.completedAt,
                        lastAttemptAt: now,
                    }
                }));
            }

            setFeedback({ correct: passed, score, newRank: newRankName });

        } catch (e) {
            console.error("Error submitting mission:", e);
            alert("Error submitting mission. Please try again.");
        }
        setSubmitting(false);
    };

    const missionCards = useMemo(() => {
        return missions.map((mission) => {
            const isPracticeMission = inferPracticeFromLegacy(mission);
            const progress = missionProgress[mission.id];
            const isCompleted = completedMissions.includes(mission.id);
            const missionPracticeConfig = mission.practiceConfig || DEFAULT_PRACTICE_CONFIG;
            const isOneTime = isPracticeMission && missionPracticeConfig.attemptPolicy === 'once';
            const attemptsUsed = progress?.attempts || 0;
            const isLocked = isOneTime && attemptsUsed > 0 && !isCompleted;

            return {
                mission,
                isPracticeMission,
                isCompleted,
                progress,
                isOneTime,
                isLocked,
            };
        });
    }, [missions, missionProgress, completedMissions]);

    const oneTimeMissions = missionCards.filter((card) => card.isOneTime && !card.isCompleted);
    const repeatableMissions = missionCards.filter((card) => !card.isOneTime && !card.isCompleted);
    const finishedMissions = missionCards.filter((card) => card.isCompleted);

    const renderMissionSection = (
        title: string,
        items: typeof missionCards,
        emptyText: string,
        showTitle = true,
    ) => (
        <section className="mb-10">
            {showTitle && <h2 className="text-xl font-bold text-white mb-4 tracking-wide">{title}</h2>}
            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cyan-900/50 p-5 text-sm text-cyan-700">{emptyText}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(({ mission, isPracticeMission, isCompleted, progress, isLocked }) => {
                        const isUnavailable = isLocked;
                        return (
                            <div
                                key={mission.id}
                                onClick={() => {
                                    if (!isUnavailable) handleStartMission(mission);
                                }}
                                className={`
                                    relative group p-6 rounded-xl border transition-all overflow-hidden
                                    ${isUnavailable
                                        ? 'bg-gray-900/30 border-gray-700/40 opacity-60 cursor-not-allowed'
                                        : isCompleted
                                            ? 'bg-green-950/10 border-green-500/30 hover:border-green-500 cursor-pointer'
                                            : 'bg-black/60 border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] cursor-pointer'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg ${mission.type === 'watch' && !isPracticeMission ? 'bg-purple-900/20 text-purple-400' : isPracticeMission ? 'bg-emerald-900/20 text-emerald-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                        {mission.type === 'watch' && !isPracticeMission ? <Video size={24} /> : isPracticeMission ? <Brain size={24} /> : <BookOpen size={24} />}
                                    </div>
                                    {isCompleted ? (
                                        <span className="flex items-center gap-1 text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-full border border-green-500/30 text-xs uppercase">
                                            <CheckCircle size={14} /> Finished
                                        </span>
                                    ) : isUnavailable ? (
                                        <span className="flex items-center gap-1 text-gray-300 font-bold bg-gray-800/60 px-3 py-1 rounded-full border border-gray-600/40 text-xs uppercase">
                                            Attempt Used
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

                                {!!progress && (
                                    <div className="text-xs text-cyan-500 mb-3">
                                        Attempts: {progress.attempts || 0}
                                        {typeof progress.lastScore === 'number' ? ` • Last score: ${progress.lastScore}%` : ''}
                                    </div>
                                )}

                                <div className="text-xs text-cyan-700 font-bold uppercase tracking-wider flex items-center gap-2">
                                    {isCompleted ? 'Review Data' : isUnavailable ? 'Unavailable' : 'Click to Initiate'}
                                    {!isUnavailable && <ArrowLeft className="rotate-180" size={12} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );

    if (loading) {
        return (
             <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500">
                <Loader2 size={40} className="animate-spin" />
             </div>
        );
    }

    // Active Mission View

    if (activeMission) {
        const isPracticeMission = inferPracticeFromLegacy(activeMission);
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
                                    {activeMission.type === 'watch' && !isPracticeMission ? <Video size={14} /> : isPracticeMission ? <Brain size={14} /> : <BookOpen size={14} />}
                                    {activeMission.type === 'watch' && !isPracticeMission ? 'Video Log' : isPracticeMission ? 'Math Practice' : 'Intel Report'}
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

                            {isPracticeMission && (
                                <div className="mb-8 p-5 rounded-xl border border-cyan-900/30 bg-cyan-950/20">
                                    <p className="text-cyan-200/90 text-sm md:text-base">
                                        Complete each practice prompt. You need 70% or higher to pass.
                                    </p>
                                </div>
                            )}

                            {/* Quiz Section */}
                            <div className="mt-12">
                                <h3 className="flex items-center gap-2 text-xl font-bold text-white mb-6 pb-2 border-b border-cyan-900">
                                    <Brain className="text-purple-400" />
                                    {isPracticeMission ? 'Practice Drill' : 'Knowledge Check'}
                                </h3>

                                <div className="space-y-8">
                                    {isPracticeMission ? practiceQuestions.map((question, idx) => (
                                        <div key={question.id} className="p-6 bg-black/40 rounded-xl border border-cyan-900/30">
                                            <p className="font-bold text-white mb-4 text-lg">
                                                <span className="text-cyan-600 mr-2">{idx + 1}.</span>
                                                {question.prompt}
                                            </p>

                                            {question.graph && (
                                                <div className="mb-4">
                                                    <svg
                                                        viewBox="0 0 280 280"
                                                        className="w-full max-w-[280px] rounded-lg border border-cyan-800/70 bg-black/40"
                                                        onClick={(event) => {
                                                            if (question.inputMode !== 'graph-two-points' || !question.graph) return;
                                                            const rect = event.currentTarget.getBoundingClientRect();
                                                            const localX = event.clientX - rect.left;
                                                            const localY = event.clientY - rect.top;
                                                            const width = rect.width || 280;
                                                            const height = rect.height || 280;
                                                            const x = Math.round((localX / width) * (question.graph.maxX - question.graph.minX) + question.graph.minX);
                                                            const y = Math.round((((height - localY) / height) * (question.graph.maxY - question.graph.minY)) + question.graph.minY);

                                                            if (x < question.graph.minX || x > question.graph.maxX || y < question.graph.minY || y > question.graph.maxY) return;
                                                            handlePracticeGraphToggle(question.id, { x, y });
                                                        }}
                                                    >
                                                        {Array.from({ length: question.graph.maxX - question.graph.minX + 1 }, (_, index) => {
                                                            const xValue = question.graph!.minX + index;
                                                            const xPixel = ((xValue - question.graph!.minX) / (question.graph!.maxX - question.graph!.minX)) * 280;
                                                            const isAxis = xValue === 0;
                                                            return (
                                                                <line
                                                                    key={`gx-${question.id}-${xValue}`}
                                                                    x1={xPixel}
                                                                    y1={0}
                                                                    x2={xPixel}
                                                                    y2={280}
                                                                    stroke={isAxis ? 'rgba(34,211,238,0.65)' : 'rgba(34,211,238,0.12)'}
                                                                    strokeWidth={isAxis ? 2 : 1}
                                                                />
                                                            );
                                                        })}

                                                        {Array.from({ length: question.graph.maxY - question.graph.minY + 1 }, (_, index) => {
                                                            const yValue = question.graph!.minY + index;
                                                            const yPixel = 280 - ((yValue - question.graph!.minY) / (question.graph!.maxY - question.graph!.minY)) * 280;
                                                            const isAxis = yValue === 0;
                                                            return (
                                                                <line
                                                                    key={`gy-${question.id}-${yValue}`}
                                                                    x1={0}
                                                                    y1={yPixel}
                                                                    x2={280}
                                                                    y2={yPixel}
                                                                    stroke={isAxis ? 'rgba(34,211,238,0.65)' : 'rgba(34,211,238,0.12)'}
                                                                    strokeWidth={isAxis ? 2 : 1}
                                                                />
                                                            );
                                                        })}

                                                        {question.graph.type === 'read-line-equation' && (
                                                            <line
                                                                x1={0}
                                                                y1={280 - (((question.graph.line.slope * question.graph.minX) + question.graph.line.intercept - question.graph.minY) / (question.graph.maxY - question.graph.minY)) * 280}
                                                                x2={280}
                                                                y2={280 - (((question.graph.line.slope * question.graph.maxX) + question.graph.line.intercept - question.graph.minY) / (question.graph.maxY - question.graph.minY)) * 280}
                                                                stroke="rgba(244,114,182,0.9)"
                                                                strokeWidth={3}
                                                            />
                                                        )}

                                                        {(practiceGraphPoints[question.id] || []).map((point, pointIndex) => {
                                                            const xPixel = ((point.x - question.graph!.minX) / (question.graph!.maxX - question.graph!.minX)) * 280;
                                                            const yPixel = 280 - ((point.y - question.graph!.minY) / (question.graph!.maxY - question.graph!.minY)) * 280;
                                                            return (
                                                                <g key={`gp-${question.id}-${pointIndex}-${point.x}-${point.y}`}>
                                                                    <circle cx={xPixel} cy={yPixel} r={5} fill="rgba(34,197,94,1)" />
                                                                    <text x={xPixel + 8} y={yPixel - 8} fill="rgba(134,239,172,1)" fontSize="11">({point.x}, {point.y})</text>
                                                                </g>
                                                            );
                                                        })}
                                                    </svg>

                                                    {question.inputMode === 'graph-two-points' && (
                                                        <p className="text-xs text-cyan-500 mt-2">
                                                            Click the graph to select two points on the line. Click a selected point again to remove it.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {question.inputMode !== 'graph-two-points' && (
                                                <input
                                                    type="text"
                                                    inputMode={question.inputMode === 'text' || question.inputMode === 'equation' ? 'text' : 'numeric'}
                                                    value={practiceAnswers[question.id] || ''}
                                                    onChange={(e) => handlePracticeAnswerChange(question.id, e.target.value)}
                                                    className="w-full max-w-xs rounded-lg bg-black/30 border border-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                    placeholder={question.inputMode === 'equation' ? 'y = mx + b' : 'Enter answer'}
                                                />
                                            )}
                                        </div>
                                    )) : activeMission.questions.map((q, idx) => (
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

                                                {q.type === 'sort' && Array.isArray(answers[q.id]) && (
                                                    <div className="space-y-2">
                                                        {(answers[q.id] as string[]).map((opt, index) => (
                                                            <div
                                                                key={`${q.id}-sort-${index}`}
                                                                className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-black/20"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-cyan-500 font-bold text-sm w-6 text-center">{index + 1}</span>
                                                                    <span className="text-gray-200 md:text-lg">{opt}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveSortItem(q.id, index, -1)}
                                                                        disabled={index === 0}
                                                                        className="px-2 py-1 rounded border border-cyan-700 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        ↑
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveSortItem(q.id, index, 1)}
                                                                        disabled={index === (answers[q.id] as string[]).length - 1}
                                                                        className="px-2 py-1 rounded border border-cyan-700 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        ↓
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
                                            {feedback.newRank && <p className="text-yellow-300 font-bold">Promotion Unlocked: {feedback.newRank}</p>}
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
                                    disabled={submitting || (isPracticeMission
                                        ? practiceQuestions.length === 0 || practiceQuestions.some((question) => isPracticeQuestionIncomplete(question))
                                        : activeMission.questions.some((q) => {
                                            const value = answers[q.id];
                                            if (q.type === 'sort') {
                                                return !Array.isArray(value) || value.length === 0;
                                            }
                                            return typeof value !== 'string' || !value.trim();
                                        }))}
                                    className={`
                                        w-full mt-8 py-4 rounded-xl font-bold text-xl uppercase tracking-widest transition-all
                                        ${(isPracticeMission
                                            ? practiceQuestions.length === 0 || practiceQuestions.some((question) => isPracticeQuestionIncomplete(question))
                                            : activeMission.questions.some((q) => {
                                                const value = answers[q.id];
                                                if (q.type === 'sort') {
                                                    return !Array.isArray(value) || value.length === 0;
                                                }
                                                return typeof value !== 'string' || !value.trim();
                                            }))
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
                         <p className="text-cyan-600">One-Time, Repeatable, and Finished Assignments</p>
                     </div>
                </div>

                {renderMissionSection('One-Time Only', oneTimeMissions, 'No one-time assignments available right now.')}
                {renderMissionSection('Repeatable', repeatableMissions, 'No repeatable assignments available right now.')}

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white tracking-wide">Finished</h2>
                        <button
                            type="button"
                            onClick={() => setShowFinished((prev) => !prev)}
                            className="text-xs uppercase tracking-wider font-bold text-cyan-400 hover:text-white"
                        >
                            {showFinished ? 'Hide Finished' : `Show Finished (${finishedMissions.length})`}
                        </button>
                    </div>
                    {showFinished && renderMissionSection('Finished', finishedMissions, 'No finished assignments yet.', false)}
                </section>
             </div>
        </div>
    );
}
