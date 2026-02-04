"use client";

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserData, AsteroidEvent, PLANETS } from '@/types';
import { Radio, ShieldAlert, UserPlus, Rocket, Star, CheckCircle } from 'lucide-react';

interface FeedItem {
    id: string;
    timestamp: number;
    message: string;
    type: 'info' | 'alert' | 'success' | 'warning';
    icon?: any;
}

export default function CommsFeed() {
    const [feed, setFeed] = useState<FeedItem[]>([
        { id: 'init', timestamp: Date.now(), message: "Comms Link Established...", type: 'info', icon: Radio },
        { id: 'sys', timestamp: Date.now() - 5000, message: "System check complete. Sensors active.", type: 'success', icon: CheckCircle }
    ]);
    const processedRef = useRef<Set<string>>(new Set());
    const previousUserData = useRef<Record<string, UserData>>({});

    const addFeedItem = (message: string, type: 'info' | 'alert' | 'success' | 'warning' = 'info', icon?: any) => {
        setFeed(prev => [
            { id: Date.now().toString() + Math.random(), timestamp: Date.now(), message, type, icon },
            ...prev
        ].slice(0, 50)); // Keep last 50
    };

    // Format time helper
    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const { userData } = useAuth();

    // 1. Listen for User Changes (Real-time feed)
    useEffect(() => {
        if (!userData) return;
        let q = query(collection(db, "users"));
        
        if (userData.role === 'teacher') {
             q = query(collection(db, "users"), where("teacherId", "==", userData.uid));
        } else if (userData.role === 'student' && userData.teacherId) {
             q = query(collection(db, "users"), where("teacherId", "==", userData.teacherId));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data() as UserData;
                const name = data.displayName || data.email || 'Unknown';
                const id = change.doc.id;
                const prev = previousUserData.current[id];

                if (change.type === "added") {
                    // Initialize tracking
                    previousUserData.current[id] = data;

                    if (data.status === 'pending_approval') {
                        // Only alert if this appears to be a "new" addition relative to our session start? 
                        // Actually "added" fires for all initial docs too. 
                        // So we compare timestamps? Or just ignore initial load alerts for existing documents.
                        // We handled "isFirstLoad" in the previous version, but let's be smarter.
                        // If document createdAt is recent? We don't have createdAt on UserData.
                        // We'll stick to not alerting on initial load for now.
                    }
                }
                
                if (change.type === "modified") {
                    // 1. XP Gain
                    if (prev && data.xp !== undefined && prev.xp !== undefined && data.xp > prev.xp) {
                        const diff = data.xp - prev.xp;
                        // Filter small noise if needed, but every XP counts!
                        // Maybe group them? No, individual is fine for a feed.
                        // Check reasons?
                        const reason = data.lastXpReason ? ` for ${data.lastXpReason}` : '';
                        addFeedItem(`${name} gained +${diff} XP${reason}`, 'success', Star);
                    }

                    // 2. Pending Approval
                    if (data.status === 'pending_approval' && (!prev || prev.status !== 'pending_approval')) {
                        addFeedItem(`Action Required: ${name} awaiting approval`, 'warning', UserPlus);
                    }
                    
                    // 3. Travel Start
                    if (data.travelStatus === 'traveling' && (!prev || prev.travelStatus !== 'traveling')) {
                         const planet = PLANETS.find(p => p.id === data.destinationId)?.name || 'Unknown Sector';
                         addFeedItem(`${name} departed for ${planet}`, 'info', Rocket);
                    }

                    // 4. Arrival (Transition from traveling to idle at a new location)
                    if (data.travelStatus === 'idle' && prev?.travelStatus === 'traveling' && data.location !== prev.location) {
                         const planet = PLANETS.find(p => p.id === data.location)?.name || 'Unknown Sector';
                         addFeedItem(`${name} arrived at ${planet}`, 'info', CheckCircle);
                    }

                    // Update Ref
                    previousUserData.current[id] = data;
                }
            });
        });
        return () => unsub();
    }, []);

    // 2. Listen for Asteroid Events
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "asteroidEvent"), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as AsteroidEvent;
                const key = `asteroid-${data.startTime}-${data.status}`;
                if (!processedRef.current.has(key)) {
                    if (data.status === 'active') {
                        addFeedItem("⚠️ ASTEROID DETECTED! DEFENSE SYSTEMS ENGAGED", 'alert', ShieldAlert);
                    } else if (data.status === 'success') {
                         addFeedItem("Asteroid threat eliminated. Well done, Commander.", 'success', CheckCircle);
                    } else if (data.status === 'failed') {
                         addFeedItem("Impact confirmed. Hull damage sustained.", 'alert', ShieldAlert);
                    }
                    processedRef.current.add(key);
                }
            }
        });
        return () => unsub();
    }, []);

    return (
        <div className="flex-1 flex flex-col border border-cyan-500/20 bg-black/40 rounded-xl p-6 overflow-hidden h-full">
            <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-2 text-cyan-300">
                    <Radio size={20} className="animate-pulse" />
                    <span className="text-sm font-bold tracking-widest uppercase">Live Comms Feed</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {feed.map((item) => (
                    <div key={item.id} className={`flex gap-3 text-sm font-mono border-l-2 pl-3 py-1 animate-in fade-in slide-in-from-left-2 duration-300 ${
                        item.type === 'alert' ? 'border-red-500 bg-red-900/10' :
                        item.type === 'warning' ? 'border-yellow-500 bg-yellow-900/10' :
                        item.type === 'success' ? 'border-green-500 bg-green-900/10' :
                        'border-cyan-500/30'
                    }`}>
                        <div className="opacity-50 text-[10px] w-12 flex-shrink-0 pt-0.5">
                            {formatTime(item.timestamp)}
                        </div>
                        <div className="flex-1">
                            <div className={`flex items-center gap-2 font-bold mb-0.5 ${
                                item.type === 'alert' ? 'text-red-400' :
                                item.type === 'warning' ? 'text-yellow-400' :
                                item.type === 'success' ? 'text-green-400' :
                                'text-cyan-400'
                            }`}>
                                {item.icon && <item.icon size={12} />}
                                <span>{item.message}</span>
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="flex gap-3 text-sm font-mono opacity-50 pl-3 border-l-2 border-dashed border-cyan-500/20">
                     <div className="text-[10px] w-12 text-cyan-500/50">NOW</div>
                     <div className="text-cyan-500/50 italic animate-pulse">Scanning frequencies...</div>
                </div>
            </div>
        </div>
    );
}
