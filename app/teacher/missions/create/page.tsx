"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Video, BookOpen, GripVertical, Loader2 } from "lucide-react";
import { PracticeAssignmentConfig } from "@/lib/practice";

type QuestionType = 'mc' | 'tf' | 'sort';
type MissionContentType = 'read' | 'watch' | 'practice';

type BuilderQuestion = {
    id: string;
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer: string | string[];
    correctAnswerIndex?: number | null;
};

export default function CreateMissionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingMission, setLoadingMission] = useState(false);
    
    // Mission State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [xpReward, setXpReward] = useState(100);
    const [type, setType] = useState<MissionContentType>('read');
    const [contentUrl, setContentUrl] = useState("");
    const [contentText, setContentText] = useState("");
    const [practiceConfig, setPracticeConfig] = useState<PracticeAssignmentConfig>({
        templateId: 'math-multiplication-1-12',
        subject: 'math',
        gradeLevel: 3,
        questionCount: 24,
        tableMin: 1,
        tableMax: 12,
        multiplicandMin: 1,
        multiplicandMax: 12,
        attemptPolicy: 'once',
    });

    // Questions State
    const [questions, setQuestions] = useState<BuilderQuestion[]>([]);

    const [editMissionId, setEditMissionId] = useState<string | null>(null);
    const isEditMode = !!editMissionId;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const missionId = new URLSearchParams(window.location.search).get('edit');
        setEditMissionId(missionId);
    }, []);

    const ensureMinOptions = (input: string[], min = 4) => {
        const next = [...input];
        while (next.length < min) next.push('');
        return next;
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            id: Date.now().toString(),
            text: "",
            type: "mc",
            options: ["", "", "", ""],
            correctAnswer: "",
            correctAnswerIndex: null,
        }]);
    };

    const updateQuestion = (id: string, field: keyof BuilderQuestion, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateQuestionType = (id: string, nextType: QuestionType) => {
        setQuestions(questions.map(q => {
            if (q.id !== id) return q;
            const currentOptions = Array.isArray(q.options) ? q.options : ["", "", "", ""];
            if (nextType === 'tf') {
                return { ...q, type: nextType, options: ['True', 'False'], correctAnswer: 'True', correctAnswerIndex: null };
            }
            if (nextType === 'mc') {
                const mcOptions = q.type === 'tf' ? ['', '', '', ''] : ensureMinOptions(currentOptions, 4);
                const existingCorrect = typeof q.correctAnswer === 'string' ? q.correctAnswer : '';
                const existingIndex = mcOptions.findIndex(opt => opt === existingCorrect);
                return {
                    ...q,
                    type: nextType,
                    options: mcOptions,
                    correctAnswer: existingCorrect,
                    correctAnswerIndex: existingIndex >= 0 ? existingIndex : null
                };
            }
            const sortOptions = q.type === 'tf' ? ['', '', '', ''] : ensureMinOptions(currentOptions, 4);
            return { ...q, type: nextType, options: sortOptions, correctAnswer: '', correctAnswerIndex: null };
        }));
    };

    const updateOption = (qId: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOptions = [...(q.options || [])];
            newOptions[index] = value;
            const isSelected = q.type === 'mc' && q.correctAnswerIndex === index;
            return {
                ...q,
                options: newOptions,
                correctAnswer: isSelected ? value : q.correctAnswer
            };
        }));
    };

    const addOption = (qId: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            return { ...q, options: [...(q.options || []), ''] };
        }));
    };

    const removeOption = (qId: string, optionIndex: number) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            if ((q.options || []).length <= 2) return q;

            const nextOptions = [...q.options];
            nextOptions.splice(optionIndex, 1);

            let nextIndex = q.correctAnswerIndex ?? null;
            if (nextIndex !== null) {
                if (nextIndex === optionIndex) nextIndex = null;
                else if (nextIndex > optionIndex) nextIndex = nextIndex - 1;
            }

            return {
                ...q,
                options: nextOptions,
                correctAnswerIndex: nextIndex,
                correctAnswer: nextIndex !== null ? (nextOptions[nextIndex] || '') : ''
            };
        }));
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    useEffect(() => {
        const loadMissionForEdit = async () => {
            if (!user || !editMissionId) return;
            setLoadingMission(true);
            try {
                const missionRef = doc(db, `users/${user.uid}/missions`, editMissionId);
                const snap = await getDoc(missionRef);
                if (!snap.exists()) {
                    alert('Mission not found.');
                    router.push('/teacher/missions');
                    return;
                }

                const data = snap.data() as any;
                setTitle(data.title || '');
                setDescription(data.description || '');
                setXpReward(Number(data.xpReward || 100));
                setType(data.type === 'watch' ? 'watch' : data.type === 'practice' ? 'practice' : 'read');
                setContentUrl(data.contentUrl || '');
                setContentText(data.contentText || '');
                if (data.practiceConfig) {
                    setPracticeConfig((prev) => ({
                        ...prev,
                        ...data.practiceConfig,
                    }));
                }

                const loadedQuestions: BuilderQuestion[] = (data.questions || []).map((q: any, idx: number) => {
                    const qType: QuestionType = q.type === 'tf' || q.type === 'sort' ? q.type : 'mc';
                    const rawOptions: string[] = Array.isArray(q.options) ? q.options : [];
                    const safeOptions = qType === 'tf'
                        ? ['True', 'False']
                        : (qType === 'mc' ? ensureMinOptions(rawOptions, 4) : rawOptions);

                    const answerString = typeof q.correctAnswer === 'string' ? q.correctAnswer : '';
                    const answerIndex = qType === 'mc' ? safeOptions.findIndex(opt => opt === answerString) : -1;

                    return {
                        id: q.id || `${Date.now()}-${idx}`,
                        text: q.text || '',
                        type: qType,
                        options: safeOptions,
                        correctAnswer: qType === 'sort'
                            ? (Array.isArray(q.correctAnswer) ? q.correctAnswer : safeOptions.filter(Boolean))
                            : (qType === 'tf'
                                ? (String(q.correctAnswer || '').toLowerCase() === 'false' ? 'False' : 'True')
                                : answerString),
                        correctAnswerIndex: qType === 'mc' ? (answerIndex >= 0 ? answerIndex : null) : null,
                    };
                });

                setQuestions(loadedQuestions);
            } catch (error) {
                console.error('Error loading mission:', error);
                alert('Failed to load mission.');
            } finally {
                setLoadingMission(false);
            }
        };

        loadMissionForEdit();
    }, [editMissionId, router, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!user) throw new Error("Not authenticated");
            const normalizedQuestions = type === 'practice' ? [] : questions.map((q) => {
                const normalizedOptions = (q.options || []).map((opt: string) => (opt || '').trim());
                if (q.type === 'tf') {
                    const normalizedTf = String(q.correctAnswer || '').trim().toLowerCase();
                    return {
                        ...q,
                        options: ['True', 'False'],
                        correctAnswer: normalizedTf === 'false' ? 'false' : 'true'
                    };
                }
                if (q.type === 'sort') {
                    return {
                        ...q,
                        options: normalizedOptions,
                        correctAnswer: normalizedOptions.filter(Boolean)
                    };
                }
                if (q.type === 'mc') {
                    const selectedFromIndex = (q.correctAnswerIndex ?? -1) >= 0
                        ? (normalizedOptions[q.correctAnswerIndex as number] || '')
                        : '';
                    const normalizedMc = selectedFromIndex || String(q.correctAnswer || '').trim();
                    return {
                        ...q,
                        options: normalizedOptions,
                        correctAnswer: normalizedMc,
                        correctAnswerIndex: null
                    };
                }
                return {
                    ...q,
                    options: normalizedOptions,
                    correctAnswer: String(q.correctAnswer || '').trim()
                };
            });

            if (isEditMode && editMissionId) {
                await updateDoc(doc(db, `users/${user.uid}/missions`, editMissionId), {
                    title,
                    description,
                    type,
                    contentUrl: type === 'watch' ? contentUrl : null,
                    contentText: type === 'read' ? contentText : null,
                    practiceConfig: type === 'practice' ? practiceConfig : null,
                    questions: normalizedQuestions,
                    xpReward: Number(xpReward),
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, `users/${user.uid}/missions`), {
                    title,
                    description,
                    type,
                    contentUrl: type === 'watch' ? contentUrl : null,
                    contentText: type === 'read' ? contentText : null,
                    practiceConfig: type === 'practice' ? practiceConfig : null,
                    questions: normalizedQuestions,
                    xpReward: Number(xpReward),
                    teacherId: user.uid,
                    createdAt: serverTimestamp()
                });
            }
            router.push("/teacher/missions");
        } catch (error) {
            console.error("Error creating mission:", error);
            alert("Failed to create mission. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-space-950 p-6 font-mono text-cyan-400">
            <div className="max-w-4xl mx-auto mb-20">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/missions" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold uppercase tracking-widest text-white">{isEditMode ? 'Edit Mission Protocol' : 'New Mission Protocol'}</h1>
                </div>

                {loadingMission && (
                    <div className="flex items-center gap-3 text-cyan-400 mb-6">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-sm uppercase tracking-wider">Loading Mission Data...</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Basic Info Section */}
                    <div className="bg-black/40 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm">
                        <h2 className="text-white font-bold text-xl mb-4 border-b border-cyan-900/50 pb-2">1. Mission Overview</h2>
                        <div className="grid gap-6">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Mission Title</label>
                                <input 
                                    required
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                    placeholder="e.g. Operation: Solar Wind"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Briefing (Description)</label>
                                <textarea 
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none h-24"
                                    placeholder="Brief description of the learning objective..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">XP Reward</label>
                                    <input 
                                        type="number" 
                                        value={xpReward}
                                        onChange={(e) => setXpReward(Number(e.target.value))}
                                        className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Content Type</label>
                                    <div className="flex bg-cyan-950/30 rounded p-1 border border-cyan-800">
                                        <button 
                                            type="button"
                                            onClick={() => setType('read')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded transition-all ${type === 'read' ? 'bg-cyan-600 text-black font-bold' : 'hover:bg-cyan-900/50'}`}
                                        >
                                            <BookOpen size={16} /> Reading
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setType('watch')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded transition-all ${type === 'watch' ? 'bg-cyan-600 text-black font-bold' : 'hover:bg-cyan-900/50'}`}
                                        >
                                            <Video size={16} /> Video
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setType('practice')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded transition-all ${type === 'practice' ? 'bg-cyan-600 text-black font-bold' : 'hover:bg-cyan-900/50'}`}
                                        >
                                            Basic Math
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {type === 'watch' ? (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Video URL (YouTube)</label>
                                    <input 
                                        type="url" 
                                        value={contentUrl}
                                        onChange={(e) => setContentUrl(e.target.value)}
                                        className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                </div>
                            ) : type === 'read' ? (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Reading Material</label>
                                    <textarea 
                                        value={contentText}
                                        onChange={(e) => setContentText(e.target.value)}
                                        className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none h-48 font-sans"
                                        placeholder="Enter the lesson text here..."
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                                        <h3 className="text-white font-bold mb-1">Practice Drill Setup</h3>
                                        <p className="text-sm text-cyan-500">Auto-generated math problems (no manual question writing).</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Grade Level</label>
                                            <select
                                                value={practiceConfig.gradeLevel}
                                                onChange={(e) => setPracticeConfig({ ...practiceConfig, gradeLevel: Number(e.target.value) as 3 | 4 })}
                                                className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            >
                                                <option value={3}>3rd Grade</option>
                                                <option value={4}>4th Grade</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Problems per Attempt</label>
                                            <input
                                                type="number"
                                                min={5}
                                                max={60}
                                                value={practiceConfig.questionCount}
                                                onChange={(e) => setPracticeConfig({ ...practiceConfig, questionCount: Number(e.target.value) || 24 })}
                                                className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Table Range</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={12}
                                                    value={practiceConfig.tableMin}
                                                    onChange={(e) => setPracticeConfig({ ...practiceConfig, tableMin: Number(e.target.value) || 1 })}
                                                    className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={12}
                                                    value={practiceConfig.tableMax}
                                                    onChange={(e) => setPracticeConfig({ ...practiceConfig, tableMax: Number(e.target.value) || 12 })}
                                                    className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Attempt Limit</label>
                                            <select
                                                value={practiceConfig.attemptPolicy}
                                                onChange={(e) => setPracticeConfig({ ...practiceConfig, attemptPolicy: e.target.value as 'once' | 'unlimited' })}
                                                className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            >
                                                <option value="once">One Attempt</option>
                                                <option value="unlimited">Unlimited Attempts</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Questions Section */}
                    {type !== 'practice' && (
                    <div className="bg-black/40 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6 border-b border-cyan-900/50 pb-2">
                            <h2 className="text-white font-bold text-xl">2. Assessment</h2>
                            <button 
                                type="button" 
                                onClick={addQuestion}
                                className="flex items-center gap-2 text-cyan-400 hover:text-white text-sm uppercase tracking-wider font-bold"
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>

                        <div className="space-y-6">
                            {questions.map((q, qIndex) => (
                                <div key={q.id} className="bg-cyan-950/20 border border-cyan-800/50 rounded-lg p-4 relative">
                                    <button 
                                        type="button"
                                        onClick={() => removeQuestion(q.id)}
                                        className="absolute top-4 right-4 text-red-500 hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="grid gap-4 pr-8">
                                        <div className="grid grid-cols-[1fr,200px] gap-4">
                                            <input 
                                                required
                                                type="text" 
                                                value={q.text}
                                                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                className="bg-black/30 border border-cyan-800 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                                placeholder={`Question #${qIndex + 1}`}
                                            />
                                            <select 
                                                value={q.type}
                                                onChange={(e) => updateQuestionType(q.id, e.target.value as 'mc' | 'tf' | 'sort')}
                                                className="bg-black/30 border border-cyan-800 rounded p-2 text-cyan-400 outline-none"
                                            >
                                                <option value="mc">Multiple Choice</option>
                                                <option value="tf">True / False</option>
                                                <option value="sort">Sort Order</option>
                                            </select>
                                        </div>

                                        {q.type === 'tf' && (
                                            <div className="flex gap-4">
                                                {['True', 'False'].map(val => (
                                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name={`q-${q.id}`} 
                                                            checked={q.correctAnswer === val}
                                                            onChange={() => updateQuestion(q.id, 'correctAnswer', val)}
                                                            className="accent-cyan-500"
                                                        />
                                                        <span className="text-white">{val}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === 'mc' && (
                                            <div className="space-y-2 pl-4 border-l-2 border-cyan-900">
                                                {q.options.map((opt: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <input 
                                                            type="radio" 
                                                            name={`q-${q.id}-ans`}
                                                            checked={q.correctAnswerIndex === i}
                                                            onChange={() => setQuestions(questions.map(item => item.id === q.id ? {
                                                                ...item,
                                                                correctAnswerIndex: i,
                                                                correctAnswer: item.options[i] || ''
                                                            } : item))}
                                                            className="accent-cyan-500"
                                                        />
                                                        <input 
                                                            required
                                                            type="text" 
                                                            value={opt}
                                                            onChange={(e) => updateOption(q.id, i, e.target.value)}
                                                            className="flex-grow bg-black/30 border border-cyan-800/50 rounded p-2 text-sm text-gray-300 focus:border-cyan-500 outline-none"
                                                            placeholder={`Option ${i + 1}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(q.id, i)}
                                                            className="text-red-400 hover:text-red-300"
                                                            title="Remove option"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addOption(q.id)}
                                                    className="mt-2 text-xs uppercase tracking-wider text-cyan-400 hover:text-white font-bold"
                                                >
                                                    + Add Option
                                                </button>
                                            </div>
                                        )}

                                        {q.type === 'sort' && (
                                            <div className="space-y-2 pl-4 border-l-2 border-cyan-900">
                                                <p className="text-xs text-cyan-600 mb-2">Enter items in the CORRECT order. Details will be shuffled for cadets.</p>
                                                {q.options.map((opt: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="text-cyan-700 font-bold">{i + 1}</span>
                                                        <input 
                                                            required
                                                            type="text" 
                                                            value={opt}
                                                            onChange={(e) => updateOption(q.id, i, e.target.value)}
                                                            className="flex-grow bg-black/30 border border-cyan-800/50 rounded p-2 text-sm text-gray-300 focus:border-cyan-500 outline-none"
                                                            placeholder={`Item ${i + 1}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(q.id, i)}
                                                            className="text-red-400 hover:text-red-300"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addOption(q.id)}
                                                    className="mt-2 text-xs uppercase tracking-wider text-cyan-400 hover:text-white font-bold"
                                                >
                                                    + Add Item
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || loadingMission}
                        className="fixed bottom-6 right-6 flex items-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-8 py-4 rounded-full shadow-lg shadow-cyan-900/50 transition-all z-50 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                        {isEditMode ? 'SAVE MISSION' : 'PUBLISH MISSION'}
                    </button>
                </form>
            </div>
        </div>
    );
}
