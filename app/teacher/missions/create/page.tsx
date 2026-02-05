"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Video, BookOpen, GripVertical, Loader2 } from "lucide-react";

export default function CreateMissionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Mission State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [xpReward, setXpReward] = useState(100);
    const [type, setType] = useState<'read' | 'watch'>('read');
    const [contentUrl, setContentUrl] = useState("");
    const [contentText, setContentText] = useState("");

    // Questions State
    const [questions, setQuestions] = useState<any[]>([]);

    const addQuestion = () => {
        setQuestions([...questions, {
            id: Date.now().toString(),
            text: "",
            type: "mc",
            options: ["", "", "", ""],
            correctAnswer: "",
        }]);
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId: string, index: number, value: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOptions = [...(q.options || [])];
            newOptions[index] = value;
            return { ...q, options: newOptions };
        }));
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!user) throw new Error("Not authenticated");
            // Add to subcollection
            await addDoc(collection(db, `users/${user.uid}/missions`), {
                title,
                description,
                type,
                contentUrl: type === 'watch' ? contentUrl : null,
                contentText: type === 'read' ? contentText : null,
                questions,
                xpReward: Number(xpReward),
                teacherId: user.uid,
                createdAt: serverTimestamp()
            });
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
                    <h1 className="text-3xl font-bold uppercase tracking-widest text-white">New Mission Protocol</h1>
                </div>

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
                            ) : (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Reading Material</label>
                                    <textarea 
                                        value={contentText}
                                        onChange={(e) => setContentText(e.target.value)}
                                        className="w-full bg-cyan-950/20 border border-cyan-800 rounded p-3 text-white focus:border-cyan-500 outline-none h-48 font-sans"
                                        placeholder="Enter the lesson text here..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Questions Section */}
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
                                                onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
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
                                                            checked={q.correctAnswer === opt && opt !== ""}
                                                            onChange={() => updateQuestion(q.id, 'correctAnswer', opt)}
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
                                                    </div>
                                                ))}
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
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="fixed bottom-6 right-6 flex items-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-8 py-4 rounded-full shadow-lg shadow-cyan-900/50 transition-all z-50 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                        PUBLISH MISSION
                    </button>
                </form>
            </div>
        </div>
    );
}
