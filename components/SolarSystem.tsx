"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, User, Navigation, Plus, Minus, Lock, Unlock, Move, Crown, Star, Medal, LayoutGrid, Settings, Save, Trash2, ShieldCheck, Check, Flag, Gamepad2, Radio, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, getDoc, orderBy, arrayUnion, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import ManifestOverlay from "@/components/ManifestOverlay";
import { Ship, Rank, Behavior, AwardEvent, Planet, FlagConfig } from "@/types";

// Note: Removed local interface definitions in favor of @/types

// Default Ranks Definition (Fallback)
const DEFAULT_RANKS: Rank[] = [
    { id: '1', name: "Space Cadet", minXP: 0, image: getAssetPath("/images/badges/cadet.png") },
    { id: '2', name: "Rookie Pilot", minXP: 100, image: getAssetPath("/images/badges/RookiePilot.png") },
    { id: '3', name: "Star Scout", minXP: 300, image: getAssetPath("/images/badges/StarScout.png") },
    { id: '4', name: "Nebula Navigator", minXP: 600, image: getAssetPath("/images/badges/NebulaNavigator.png") },
    { id: '5', name: "Solar Specialist", minXP: 1000, image: getAssetPath("/images/badges/SolarSpecialist.png") },
    { id: '6', name: "Comet Captain", minXP: 1500, image: getAssetPath("/images/badges/CometCaptain.png") },
    { id: '7', name: "Galaxy Guardian", minXP: 2200, image: getAssetPath("/images/badges/GalaxyGuardian.png") },
    { id: '8', name: "Cosmic Commander", minXP: 3000, image: getAssetPath("/images/badges/CosmicCommander.png") },
    { id: '9', name: "Void Admiral", minXP: 4000, image: getAssetPath("/images/badges/VoidAdmiral.png") },
    { id: '10', name: "Grand Star Admiral", minXP: 5000, image: getAssetPath("/images/badges/GrandStarAdmiral.png") }
];

// Data Prototypes
// Note: We use pixelSize for calculations. 
// sun is center (0,0) effectively.
const PLANETS: Planet[] = [
  { id: "sun", name: "The Sun", color: "bg-yellow-500 shadow-[0_0_100px_#eab308]", size: "w-32 h-32", pixelSize: 128, orbitSize: 0, orbitDuration: 0, startAngle: 0, description: "The burning core of our system.", xpRequired: 0 },
  { id: "mercury", name: "Mercury", color: "bg-gray-400", size: "w-6 h-6", pixelSize: 24, orbitSize: 300, orbitDuration: 3888, startAngle: 45, description: "Hot, fast, and rocky.", xpRequired: 100 },
  { id: "venus", name: "Venus", color: "bg-orange-300", size: "w-8 h-8", pixelSize: 32, orbitSize: 450, orbitDuration: 9963, startAngle: 120, description: "Wrapped in thick clouds.", xpRequired: 250 },
  { id: "earth", name: "Earth", color: "bg-blue-500", size: "w-10 h-10", pixelSize: 40, orbitSize: 650, orbitDuration: 16200, startAngle: 200, description: "Home base.", xpRequired: 0 },
  { id: "mars", name: "Mars", color: "bg-red-500", size: "w-8 h-8", pixelSize: 32, orbitSize: 850, orbitDuration: 30456, startAngle: 300, description: "The Red Planet.", xpRequired: 500 },
  { id: "jupiter", name: "Jupiter", color: "bg-orange-200 shadow-inner", size: "w-24 h-24", pixelSize: 96, orbitSize: 1600, orbitDuration: 192132, startAngle: 60, description: "The Gas Giant.", xpRequired: 1000 },
  { id: "saturn", name: "Saturn", color: "bg-yellow-200", size: "w-20 h-20", pixelSize: 80, orbitSize: 2400, orbitDuration: 477252, startAngle: 180, description: "Ringed majestic world.", xpRequired: 2000 },
  { id: "uranus", name: "Uranus", color: "bg-cyan-300", size: "w-14 h-14", pixelSize: 56, orbitSize: 3400, orbitDuration: 1360962, startAngle: 270, description: "The Ice Giant.", xpRequired: 3500 },
  { id: "neptune", name: "Neptune", color: "bg-blue-700", size: "w-14 h-14", pixelSize: 56, orbitSize: 4400, orbitDuration: 2669760, startAngle: 90, description: "Windy and dark.", xpRequired: 5000 },
];

const DUMMY_SHIPS: Ship[] = [];

// Revamped SmallFlag to handle shapes without clipPath IDs collision risk (by just not using clipPath or generated IDs)
const TinyFlag = ({ config }: { config: FlagConfig }) => {
    const getColor = (id: string) => {
        const colors: Record<string, string> = {
            red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
            purple: '#a855f7', black: '#171717', white: '#f8fafc', orange: '#f97316'
        };
        return colors[id] || '#3b82f6';
    };
    
    const poleColors: Record<string, string> = {
        silver: '#cbd5e1', gold: '#eab308', wood: '#854d0e', black: '#262626'
    };

    const c1 = getColor(config.primaryColor);
    const c2 = getColor(config.secondaryColor);
    const uniqueId = `clip-${config.primaryColor}-${config.secondaryColor}-${config.pattern}-${config.shape}`.replace(/[^a-z0-9]/gi, '');

    return (
        <svg width="24" height="30" viewBox="0 0 24 30" className="drop-shadow-md">
            <rect x="2" y="2" width="2" height="28" rx="1" fill={poleColors[config.pole] || '#cbd5e1'} />
            <g transform="translate(4, 3)">
                <defs>
                   <clipPath id={uniqueId}>
                        {config.shape === 'rectangle' && <rect x="0" y="0" width="20" height="12" />}
                        {config.shape === 'pennant' && <polygon points="0,0 20,6 0,12" />}
                        {config.shape === 'triangle' && <polygon points="0,0 20,0 10,12 0,0" />} 
                        {config.shape === 'swallowtail' && <polygon points="0,0 20,0 20,12 10,6 0,12" />} 
                   </clipPath>
                </defs>
                <g clipPath={`url(#${uniqueId})`}>
                     {config.pattern === 'solid' && <rect x="0" y="0" width="20" height="12" fill={c1} />}
                     {config.pattern === 'stripe-h' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="0" y="6" width="20" height="6" fill={c2} /></>}
                     {config.pattern === 'stripe-v' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="10" y="0" width="10" height="12" fill={c2} /></>}
                     {config.pattern === 'cross' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><rect x="8" y="0" width="4" height="12" fill={c2} /><rect x="0" y="4" width="20" height="4" fill={c2} /></>}
                     {config.pattern === 'circle' && <><rect x="0" y="0" width="20" height="12" fill={c1} /><circle cx="10" cy="6" r="4" fill={c2} /></>}
                     {config.pattern === 'checkered' && <><rect x="0" y="0" width="10" height="6" fill={c1} /><rect x="10" y="0" width="10" height="6" fill={c2} /><rect x="0" y="6" width="10" height="6" fill={c2} /><rect x="10" y="6" width="10" height="6" fill={c1} /></>}
                </g>
            </g>
        </svg>
    );
}

export default function SolarSystem() {
  const { userData } = useAuth();
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [ships, setShips] = useState<Ship[]>([]);
  const [zoom, setZoom] = useState(0.25); // Start zoomed out to see more
  const [isLanded, setIsLanded] = useState(false); // New Landing State
  const [isOrbiting, setIsOrbiting] = useState(true); // Default active
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now()); // Game Loop Timer
  
  // Rank System
  const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);
  const ranksRef = useRef<Rank[]>(DEFAULT_RANKS); // Ref for access in listeners

  // Award System State
  const [awardQueue, setAwardQueue] = useState<AwardEvent[]>([]);
  const [currentAward, setCurrentAward] = useState<AwardEvent | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isCommandMode, setIsCommandMode] = useState(false); // Teacher Control Mode
  const [controlledShipId, setControlledShipId] = useState<string | null>(null);

  const [isSoundOn, setIsSoundOn] = useState(true); // Default on for Map View
  const toggleSound = () => {
      const newState = !isSoundOn;
      setIsSoundOn(newState);
      if (newState) {
          // Unlock audio context
          const audio = document.getElementById('map-notification-audio') as HTMLAudioElement;
          if (audio) {
              audio.volume = 0;
              audio.play().then(() => {
                  audio.pause();
                  audio.currentTime = 0;
                  audio.volume = 0.5;
              }).catch(e => console.error("Audio unlock failed", e));
          }
      }
  };

  const isSoundOnRef = useRef(isSoundOn);
  useEffect(() => { isSoundOnRef.current = isSoundOn; }, [isSoundOn]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const previousXPRef = useRef<Map<string, number>>(new Map());
  const isFirstLoad = useRef(true);

  const handleCloseManifest = useCallback(() => setIsGridVisible(false), []);

  // Refs for Coordinate Calcs inside Snapshot
  const panRef = useRef({ x: 0, y: 0 });
  
  // Sync Rank Ref
  useEffect(() => { ranksRef.current = ranks; }, [ranks]);

  // Load Ranks Configuration
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "ranks"), (doc) => {
        if (doc.exists() && doc.data().list) {
            setRanks(doc.data().list);
        }
    });
    return () => unsub();
  }, []);

  // Load Behaviors
  useEffect(() => {
    const q = query(collection(db, "behaviors"), orderBy("xp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
        setBehaviors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Behavior)));
    });
    return () => unsub();
  }, []);

  const zoomRef = useRef(zoom);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    setMounted(true);
    let frameId: number;
    const animate = () => {
        setNow(Date.now());
        frameId = requestAnimationFrame(animate);
    };
    // Pause animation if the Manifest Overlay is open to save resources
    if(isOrbiting && !isGridVisible && !awardQueue.length) frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isOrbiting, isGridVisible, awardQueue.length]);

  
  // Panning State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const landingProcessing = useRef(new Set<string>()); // Validates landing to prevent spam writes

  // Update Pan Ref
  useEffect(() => {
      panRef.current = pan;
  }, [pan]);

  // Award Queue Processor
  const prevQueueLength = useRef(0);
  const awardTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
      // If new awards come in, reset timer
      if (awardQueue.length > prevQueueLength.current) {
          if (awardTimer.current) clearTimeout(awardTimer.current);
          awardTimer.current = setTimeout(() => {
              setAwardQueue([]);
          }, 15000); 
      }
      prevQueueLength.current = awardQueue.length;
      return () => {
          if (awardTimer.current) clearTimeout(awardTimer.current);
      }
  }, [awardQueue]);

  // Real-time subscription to all star travelers
  useEffect(() => {
    // Listen to ALL users (so we can show the class roster)
    const q = query(collection(db, "users"));
    
    // Permission-Fail-Safe Snapshot Listener
    const unsubscribe = onSnapshot(q, {
        next: (snapshot) => {
            const fleet: Ship[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                const loc = data.location || 'earth';

                const shipData: Ship = {
                    id: doc.id,
                    cadetName: data.spaceship?.name || data.displayName || 'Unknown Traveler',
                    locationId: loc,
                    status: data.travelStatus || 'idle',
                    destinationId: data.destinationId,
                    travelStart: data.travelStart,
                    travelEnd: data.travelEnd,
                    avatarColor: data.spaceship?.color || 'text-cyan-400',
                    role: data.role, 
                    xp: data.xp || 0,
                    lastXpReason: data.lastXpReason,
                    flag: data.flag,
                    visitedPlanets: data.visitedPlanets || []
                };
                fleet.push(shipData);
            });
            setShips(fleet);

            // Award & Rank Logic
            fleet.forEach(shipData => {
                 if (!isFirstLoad.current) {
                    const oldXP = previousXPRef.current.get(shipData.id);
                    // Trigger if XP gained (and not just initialized from undefined)
                    if (oldXP !== undefined && shipData.xp > oldXP) {
                        
                        // 1. Calculate Start Pos
                        let startX = 0, startY = 0;
                        
                        // Find planet position
                        const planet = PLANETS.find(p => p.id === shipData.locationId);
                        if (planet) {
                            const period = planet.orbitDuration * 1000;
                            let angleDeg = planet.startAngle;
                            if (period > 0) {
                                 const tSeconds = Date.now() / 1000;
                                 const progress = (tSeconds % planet.orbitDuration) / planet.orbitDuration;
                                 angleDeg += progress * 360; 
                            }
                            const angleRad = angleDeg * (Math.PI / 180);
                            const r = planet.orbitSize / 2; // Using orbitSize from constants
                             // Map Pan offset? We can't easily get it here without Ref. 
                             // Let's just default to center for the animation start or a random edge.
                             // Actually, 0,0 is fine, it will fly in from center.
                        }

                        // 2. Check Rank Up
                        const oldRank = ranksRef.current.slice().sort((a,b) => b.minXP - a.minXP).find(r => oldXP >= r.minXP);
                        const newRank = ranksRef.current.slice().sort((a,b) => b.minXP - a.minXP).find(r => shipData.xp >= r.minXP);
                        
                        const isPromotion = newRank && oldRank && newRank.minXP > oldRank.minXP;

                        const event: AwardEvent = {
                            id: Math.random().toString(),
                            ship: shipData,
                            xpGained: shipData.xp - oldXP,
                            newRank: isPromotion ? newRank.name : undefined,
                            startPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                            reason: shipData.lastXpReason
                        };
                        
                        // Play notification sound safely if enabled
                        const audioElement = document.getElementById('map-notification-audio') as HTMLAudioElement;
                        if (audioElement && isSoundOnRef.current) {
                            console.log("Map: Playing Award Sound");
                            audioElement.currentTime = 0;
                            audioElement.volume = 0.5;
                            audioElement.play().catch(e => console.error("Map audio playback failed (Autoplay blocked? Click map to enable):", e));
                        }
                        
                        // Add to queue
                        setAwardQueue(prev => [...prev, event]);
                    }
                 }
                 // Always update ref
                 previousXPRef.current.set(shipData.id, shipData.xp);
            });
            isFirstLoad.current = false;
        },
        error: (e) => console.log("Silent Permission Error", e)
    });
    
    return () => unsubscribe();
  }, []);


  // Helper: Get Planet Position at specific time
  const getPlanetPosition = (planetId: string, timestamp: number) => {
      const planet = PLANETS.find(p => p.id === planetId);
      if (!planet) return { x: 0, y: 0 };
      if (planet.orbitSize === 0) return { x: 0, y: 0 }; // Sun

      const period = planet.orbitDuration * 1000;
      // Calculate angle based on time (if perod is 0, angle is startAngle)
      let angleDeg = planet.startAngle;
      if (period > 0) {
          // JS Animation Sync: We use `now` timestamp which is updated via requestAnimationFrame
          const tSeconds = timestamp / 1000;
          const progress = (tSeconds % planet.orbitDuration) / planet.orbitDuration;
          angleDeg += progress * 360; 
      }
      
      const angleRad = angleDeg * (Math.PI / 180);
      const r = planet.orbitSize / 2;
      return {
          x: r * Math.sin(angleRad),
          y: -r * Math.cos(angleRad)
      };
  };

  // Helper to format duration
  const formatDuration = (minutes: number) => {
      if (minutes < 60) return `${Math.round(minutes)} mins`;
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours < 24) return `${hours}h ${mins}m`;
      const days = Math.floor(hours / 24);
      const h = hours % 24;
      return `${days}d ${h}h`;
  };

  // Travel Logic
  const handleTravel = async (overrideId?: string) => {
    if (!selectedPlanet || !userData) return;
    
    // Determine Target ID (Self or Student override)
    const targetId = overrideId || userData.uid;
    const isOverride = !!overrideId;

    // 1. Determine Start Location (Use real-time ships data first, fallback to userdata)
    const ship = ships.find(s => s.id === targetId);
    
    // Safety check for override
    if (!ship && isOverride) {
        alert("Target signal lost. Cannot command.");
        return;
    }

    const currentLocId = ship?.locationId || (isOverride ? 'earth' : (userData.location || 'earth'));
    
    if (currentLocId === selectedPlanet.id && !isOverride) {
        alert("You are already here!");
        return;
    }

    // 2. Calculate Distance & Duration
    const startPlanet = PLANETS.find(p => p.id === currentLocId);
    const endPlanet = selectedPlanet; 
    
    if (!startPlanet) {
         console.error("Unknown start planet");
         return;
    }

    // Distance in logic units (Difference in orbit radii)
    const dist = Math.abs(endPlanet.orbitSize - startPlanet.orbitSize) / 2;
    
    // Base Speed: Earth->Neptune (1875 units) takes 1 Week (10080 mins)
    // Unit Time = 10080 / 1875 = ~5.376 mins per unit
    const TIME_PER_UNIT = 5.376;
    const baseMinutes = dist * TIME_PER_UNIT;

    // Apply Boosters
    // Formula: SpeedMultiplier = 1 + (Level * 1.2) -> Max Lvl 5 = 7x speed (1 wk -> 24h)
    const boosterLevel = userData.upgrades?.boosters || 0;
    const speedMultiplier = 1 + (boosterLevel * 1.2);
    
    // Final Duration
    let travelMinutes = Math.max(baseMinutes / speedMultiplier, 1); // Minimum 1 min
    
    const fuelCost = Math.ceil(travelMinutes / 5);

    // 3. Validation & Confirmation
    const hasEnoughFuel = (userData.xp || 0) >= fuelCost;
    
    if (!isOverride) {
        if (!hasEnoughFuel) {
            alert(`Insufficient Fuel Required: ${fuelCost} XP\nCurrent: ${userData.xp || 0} XP`);
            return;
        }

        const confirmMsg = `Plotting course to ${selectedPlanet.name}...\n\n` +
                           `Distance: ${Math.round(dist)} AU\n` +
                           `Estimated Time: ${formatDuration(travelMinutes)}\n` +
                           `Fuel Cost: ${fuelCost} XP ${boosterLevel > 0 ? `(Booster Lv.${boosterLevel})` : ''}\n\n` +
                           `Engage Hyperdrive?`;
        
        if (!confirm(confirmMsg)) return;
    } else {
        // Teacher moving a student
        if (!confirm(`Command ${ship?.cadetName} to travel to ${selectedPlanet.name}?\nDuration: ${formatDuration(travelMinutes)}`)) return;
    }

    const TRAVEL_DURATION_MS = travelMinutes * 60 * 1000;

    try {
        const userRef = doc(db, "users", targetId);
        
        const updates: any = {
            travelStatus: 'traveling',
            location: currentLocId, // Origin
            destinationId: selectedPlanet.id, // Target
            travelStart: Date.now(),
            travelEnd: Date.now() + TRAVEL_DURATION_MS
        };
        
        // Deduct Fuel (XP) - Teacher can choose to waive it
        if (!isOverride || confirm("Deduct fuel (XP) from student reserves?")) {
             updates.xp = increment(-fuelCost);
        }

        await updateDoc(userRef, updates);
        
        if (!isOverride) setSelectedPlanet(null);
        if (isOverride) alert(`Command Sent: ${ship?.cadetName} en route to ${selectedPlanet.name}`);
        
    } catch (error) {
        console.error("Initiating travel failed:", error);
        alert("Navigational Computer Error. Try again.");
    }
  };

  // Landing Logic (Arrival Check)
  useEffect(() => {
    if (!userData) return;
    
    // Check local permissions (or fallback admin check)
    const isAdmin = userData.role === 'teacher' || userData.role === 'admin' || userData.email === 'mr@shootyq.com';

    ships.forEach(ship => {
        // PERMISSION: I can land IF (It's me) OR (I am admin)
        const canLand = (ship.id === userData.uid) || isAdmin;

        // cleanup lock if idle
        if (ship.status !== 'traveling' && landingProcessing.current.has(ship.id)) {
            landingProcessing.current.delete(ship.id);
        }

        if (canLand && ship.status === 'traveling' && ship.travelEnd) {
             const hasArrived = now > ship.travelEnd;
             
             if (hasArrived && !landingProcessing.current.has(ship.id)) {
                 landingProcessing.current.add(ship.id); // Lock

                 const arrive = async () => {
                     try {
                          const userRef = doc(db, "users", ship.id); 
                          await updateDoc(userRef, {
                              travelStatus: 'idle',
                              location: ship.destinationId || 'earth',
                              destinationId: null,
                              travelStart: null,
                              travelEnd: null
                          });
                     } catch (e) {
                         console.error(`Landing failed for ${ship.cadetName}:`, e);
                         landingProcessing.current.delete(ship.id); // Unlock to retry
                     }
                 };
                 arrive();
             }
        }
    });
  }, [now, ships, userData]);

  // Ensure Teacher/User has a location on map load
  useEffect(() => {
    if (userData && !userData.location) {
        const fixLocation = async () => {
            try {
                const userRef = doc(db, "users", userData.uid);
                await updateDoc(userRef, { location: 'earth' }); 
            } catch (e) {
                console.error("Auto-positioning failed", e);
            }
        };
        fixLocation();
    }
  }, [userData]);

  // Record Landing
  useEffect(() => {
    if (isLanded && selectedPlanet && userData) {
        const recordVisit = async () => {
             const userRef = doc(db, "users", userData.uid);
             await updateDoc(userRef, {
                 visitedPlanets: arrayUnion(selectedPlanet.id)
             });
        };
        recordVisit();
    }
  }, [isLanded, selectedPlanet, userData]);

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = zoom - e.deltaY * 0.001;
    setZoom(Math.min(Math.max(0.05, newZoom), 2));
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  // Generate static stars for background (Client-side only to avoid hydration mismatch)
  const [stars, setStars] = useState<{id: number, top: string, left: string, size: string, opacity: number, animationDuration: string}[]>([]);

  useEffect(() => {
    setStars(Array.from({ length: 100 }, (_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() > 0.8 ? 'h-1 w-1' : 'h-0.5 w-0.5',
        opacity: 0.2 + Math.random() * 0.5,
        animationDuration: `${Math.random() * 3 + 2}s`
    })));
  }, []);

  return (
    <div 
        className={`relative w-full h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#00091d] to-black flex items-center justify-center min-h-[800px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
       {/* Hidden Audio Element */}
       <audio id="map-notification-audio" src={getAssetPath("/sounds/notification.m4a?v=2")} preload="auto" />

       {/* Sound Toggle */}
       <button 
           onClick={(e) => { e.stopPropagation(); toggleSound(); }}
           className={`absolute top-6 right-6 z-50 p-3 rounded-full border backdrop-blur-md transition-all ${isSoundOn ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-black/20 border-white/10 text-white/30 hover:bg-white/10 hover:text-white'}`}
       >
           {isSoundOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
       </button>

       {/* Starfield Background */}
       <div className="absolute inset-0 pointer-events-none">
          {stars.map(star => (
            <div 
                key={star.id}
                className={`absolute bg-white rounded-full ${star.size} animate-pulse`}
                style={{ 
                    top: star.top, 
                    left: star.left, 
                    opacity: star.opacity,
                    animationDuration: star.animationDuration
                }} 
            />
          ))}
       </div>
       
       {/* Solar System Container with Pan & Zoom */}
       <div 
            className="relative flex items-center justify-center transition-transform duration-75 ease-linear will-change-transform"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          
          {/* Traveling Ships Layer - Render BEHIND planets but atop orbits */}
          {ships.map(ship => {
              if (ship.status !== 'traveling' || !ship.destinationId || !ship.travelStart || !ship.travelEnd) return null;
              
              const startPos = getPlanetPosition(ship.locationId, now);
              const endPos = getPlanetPosition(ship.destinationId, now);
              
              const totalDuration = ship.travelEnd - ship.travelStart;
              const elapsed = now - ship.travelStart;
              const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
              
              if (progress >= 1 || progress <= 0) return null; // Or render at destination?

              // Simple Lerp
              const currentX = startPos.x + (endPos.x - startPos.x) * progress;
              const currentY = startPos.y + (endPos.y - startPos.y) * progress;
              
              // Angle for the rocket to point towards destination
              const dx = endPos.x - startPos.x;
              const dy = endPos.y - startPos.y;
              const rotationData = (Math.atan2(dy, dx) * 180 / Math.PI) + 45; // +45 because icon is tilted

              return (
                  <div 
                    key={`travel-${ship.id}`}
                    className="absolute z-10 flex flex-col items-center justify-center transition-opacity"
                    style={{
                        transform: `translate(${currentX}px, ${currentY}px)`
                    }}
                  >
                       {/* Trajectory Line (Optional - from start to end? No, from current to end looks better?) */}
                       {/* A line from Current to End shows where they are going */}
                       <div 
                         className="absolute top-1/2 left-1/2 h-0.5 bg-dashed from-transparent to-cyan-500/50 origin-left opacity-30 pointer-events-none"
                         style={{
                             width: Math.sqrt(dx*dx + dy*dy) * (1-progress),
                             transform: `rotate(${Math.atan2(dy, dx)}rad)`
                         }}
                       />

                      <div className="relative">
                          {ship.role === 'teacher' ? (
                              <Crown 
                                    size={24} 
                                    className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" 
                                    style={{ transform: `rotate(${rotationData}deg)` }}
                              />
                          ) : (
                              <div 
                                className="relative w-12 h-12 flex items-center justify-center"
                                style={{ transform: `rotate(${rotationData + 45}deg)` }}
                              >
                                  <div className="relative w-full h-full">
                                      <img 
                                            src={getAssetPath("/images/ships/finalship.png")}
                                            alt="Traveling Ship"
                                            className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] relative z-20" 
                                      />
                                      {/* Avatar Window */}
                                      <div className="absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-hidden bg-cyan-900/20">
                                            <img src={getAssetPath("/images/avatar/spacebunny.png")} className="w-full h-full object-cover scale-[1.35] translate-y-1" />
                                      </div>
                                  </div>
                              </div>
                          )}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 text-[8px] bg-black/50 text-white px-1 rounded whitespace-nowrap mt-1">
                              {ship.cadetName} ({Math.round(progress * 100)}%)
                          </span>
                      </div>
                  </div>
              )
          })}

          {PLANETS.map((planet) => (
             <React.Fragment key={planet.id}>
                {/* Orbit Ring */}
                {planet.id !== 'sun' && (
                    <div 
                      className="absolute rounded-full border border-white/10 pointer-events-none"
                      style={{ 
                          width: planet.orbitSize, 
                          height: planet.orbitSize,
                          zIndex: 0 
                      }}
                    />
                )}
                

                {/* Planet Container - Handles Rotation */}
                <div 
                  className="absolute flex items-center justify-center pointer-events-none"
                  style={{ 
                      width: planet.orbitSize || 1, 
                      height: planet.orbitSize || 1,
                      transform: isOrbiting && planet.orbitDuration > 0
                        ? `rotate(${(now / 1000 % planet.orbitDuration / planet.orbitDuration * 360) + planet.startAngle}deg)`
                        : `rotate(${planet.startAngle}deg)`
                  }}
                >
                    {/* The Planet Itself */}
                    <div 
                       className="relative cursor-pointer group pointer-events-auto"
                       // Move planet to the edge of the orbit ring (radius = orbitSize / 2)
                       style={{ 
                           transform: `translateY(-${planet.orbitSize / 2}px) rotate(${isOrbiting && planet.orbitDuration > 0 ? -((now / 1000 % planet.orbitDuration / planet.orbitDuration * 360) + planet.startAngle) : -planet.startAngle}deg)` 
                       }} 
                       onClick={(e) => {
                           e.stopPropagation();
                           setSelectedPlanet(planet);
                       }}
                    >
                       {/* Planet Visual */}
                       <div className={`rounded-full ${planet.size} ${planet.color} shadow-lg transition-transform group-hover:scale-125 z-20 relative ring-0 group-hover:ring-4 ring-white/20`}>
                          
                          {/* VISITED FLAGS (Map View) */}
                          {/* Show small markers for visitors */}
                          {ships.some(s => s.visitedPlanets?.includes(planet.id)) && (
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-end justify-center gap-0.5 h-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                  {ships.filter(s => s.visitedPlanets?.includes(planet.id)).slice(0, 3).map((v, i) => (
                                      <div 
                                        key={v.id} 
                                        className={`w-0.5 h-2 ${v.avatarColor?.replace('text', 'bg').replace('400', '500') || 'bg-white'} rounded-t-full shadow-[0_0_5px_rgba(255,255,255,0.8)]`} 
                                      />
                                  ))}
                                  {ships.filter(s => s.visitedPlanets?.includes(planet.id)).length > 3 && (
                                      <div className="w-0.5 h-1 bg-white rounded-full" />
                                  )}
                              </div>
                          )}

                          {/* Label - Always visible but subtle, pops on hover */}
                          {/* Wrapper handles positioning (translate) to avoid conflict with rotation transform */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 flex items-center justify-center w-32">
                              {/* Label Wrapper - No inverse rotation needed now as the planet div itself is counter-rotated */}
                              <div>
                                 <span 
                                    className="text-white/60 text-xs uppercase tracking-widest font-bold group-hover:text-white transition-all shadow-black drop-shadow-md bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10"
                                    style={{
                                        // Dynamic scaling based on zoom level to ensure readability
                                        // If zoom is small (e.g. 0.1), we want label to be larger to be seen.
                                        // group-hover scales it up further.
                                        fontSize: zoom < 0.3 ? `${1 / zoom * 0.5}rem` : '0.75rem',
                                        padding: zoom < 0.3 ? `${1 / zoom * 0.1}rem ${1 / zoom * 0.2}rem` : '0.125rem 0.5rem'
                                    }}
                                 >
                                    {planet.name}
                                 </span>
                              </div>
                          </div>
                      </div>
                       
                       {/* Docked Ships Indicators */}
                       <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                          {/* Parking Orbit Ring */}
                          {ships.filter(s => s.locationId === planet.id && s.status !== 'traveling').length > 0 && (
                                <div 
                                    className="absolute rounded-full border border-cyan-500/30 border-dashed animate-[spin_60s_linear_infinite]"
                                    style={{
                                        width: planet.pixelSize + 80, // radius + 40
                                        height: planet.pixelSize + 80,
                                    }}
                                />
                          )}

                          {ships.filter(s => s.locationId === planet.id && s.status !== 'traveling').map((ship, idx, arr) => {
                              // Distribute ships evenly around the planet + Animation
                              const orbitSpeed = 15; // Degrees per second
                              const timeOffset = (now / 1000) * orbitSpeed;
                              const startAngle = (idx * (360 / Math.max(arr.length, 1))) - 90; 
                              
                              const currentAngle = startAngle + timeOffset;
                              const radius = (planet.pixelSize / 2) + 40; // Increased distance
                              
                              return (
                                <div 
                                    key={ship.id} 
                                    className="absolute flex flex-col items-center justify-center" 
                                    style={{ 
                                        transform: `rotate(${currentAngle}deg) translate(${radius}px) rotate(${-currentAngle}deg)`,
                                        zIndex: 30
                                    }} 
                                >
                                    <span className="text-[10px] font-bold text-white bg-black/70 px-2 rounded border border-cyan-500/30 whitespace-nowrap mb-1 shadow-lg backdrop-blur-sm">
                                        {ship.cadetName}
                                    </span>
                                    {ship.role === 'teacher' ? (
                                        <Crown 
                                            size={24} 
                                            className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" 
                                            style={{ transform: 'rotate(0deg)' }} 
                                        />
                                    ) : (
                                        <div 
                                            className="relative w-12 h-12 flex items-center justify-center -mb-2"
                                            style={{ transform: 'rotate(-45deg)' }}
                                        >
                                            <div className="relative w-full h-full">
                                                <img 
                                                    src={getAssetPath("/images/ships/finalship.png")}
                                                    alt="Docked Ship"
                                                    className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-20"
                                                />
                                                <div className="absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-hidden bg-cyan-900/20">
                                                    <img src={getAssetPath("/images/avatar/spacebunny.png")} className="w-full h-full object-cover scale-[1.35] translate-y-1" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                              );
                          })}
                       </div>
                    </div>
                </div>
             </React.Fragment>
          ))}
       </div>

       {/* View Controls */}
       <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[60]">
           {/* Teacher Command Toggle */}
           {(userData?.role === 'teacher' || userData?.email === 'andrewpcarlson85@gmail.com') && (
               <button 
                    onClick={() => setIsCommandMode(!isCommandMode)}
                    className={`p-3 rounded-lg border backdrop-blur transition-colors flex items-center justify-center ${isCommandMode ? 'bg-orange-600 text-white border-orange-500 animate-pulse' : 'bg-black/50 border-white/20 text-orange-400 hover:bg-white/10'}`}
                    title="Fleet Command Override"
               >
                   <Gamepad2 size={24} />
               </button>
           )}

           {/* Class Grid Toggle */}
           <button 
                onClick={() => setIsGridVisible(!isGridVisible)}
                className={`p-3 rounded-lg border backdrop-blur transition-colors flex items-center justify-center ${isGridVisible ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-black/50 border-white/20 text-cyan-400 hover:bg-white/10'}`}
                title="Class Manifest"
           >
               <LayoutGrid size={24} />
           </button>

           <div className="bg-black/50 backdrop-blur border border-white/20 rounded-lg p-2 flex flex-col gap-2">
               <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-2 hover:bg-white/10 rounded text-white" title="Zoom In"><Plus /></button>
               <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.05))} className="p-2 hover:bg-white/10 rounded text-white" title="Zoom Out"><Minus /></button>
               <div className="w-full h-px bg-white/20 my-1" />
               <button onClick={() => { setPan({x:0, y:0}); setZoom(0.25); }} className="p-2 hover:bg-white/10 rounded text-white" title="Reset View"><Move size={20} /></button>
           </div>
           
           <button 
                onClick={() => setIsOrbiting(!isOrbiting)}
                className={`p-3 rounded-lg border backdrop-blur transition-colors flex items-center justify-center ${isOrbiting ? 'bg-blue-500/20 border-blue-400 text-blue-300' : 'bg-black/50 border-white/20 text-gray-400'}`}
                title="Toggle Orbits"
            >
                {isOrbiting ? <Unlock size={20} /> : <Lock size={20} />}
           </button>
       </div>

       {/* HUD Overlay for Selected Planet */}
       <AnimatePresence>
         {selectedPlanet && (
            <motion.div 
               initial={{ opacity: 0, x: 300 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 300 }}
               className="absolute right-0 top-0 bottom-0 w-80 bg-black/90 backdrop-blur-xl border-l border-white/10 p-6 z-50 flex flex-col"
            >
               {/* Header overrides for Command Mode */}
               {isCommandMode && controlledShipId && (
                   <div className="bg-orange-500/20 border border-orange-500/50 p-2 rounded mb-4 text-center">
                       <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">RELAYING COMMAND TO</p>
                       <p className="text-white font-bold">{ships.find(s => s.id === controlledShipId)?.cadetName || "Unknown Unit"}</p>
                   </div>
               )}

               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-3xl font-bold text-white">{selectedPlanet.name}</h2>
                    <p className="text-blue-300 text-sm">Sector {selectedPlanet.id.toUpperCase()}</p>
                 </div>
                 <button onClick={() => setSelectedPlanet(null)} className="text-gray-400 hover:text-white">✕</button>
               </div>
               
               <div className={`w-full h-32 rounded-lg mb-6 ${selectedPlanet.color} shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] opacity-80`} />
               
               <p className="text-gray-300 mb-6">{selectedPlanet.description}</p>
               
               <div className="mb-6">
                  <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Travel Requirements</div>
                  <div className="flex items-center gap-2 text-yellow-400">
                     <span className="font-bold text-xl">{selectedPlanet.xpRequired}</span>
                     <span className="text-sm">XP Clearance</span>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto">
                  <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Ships in Orbit</div>
                  <div className="space-y-2">
                     {ships.filter(s => s.locationId === selectedPlanet.id).length === 0 ? (
                        <p className="text-gray-600 italic">No ships currently in sector.</p>
                     ) : (
                        ships.filter(s => s.locationId === selectedPlanet.id).map(ship => (
                           <div key={ship.id} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                              <User size={16} className={ship.avatarColor} />
                              <span className="text-gray-200">{ship.cadetName}</span>
                           </div>
                        ))
                     )}
                  </div>
                  
                  {/* Visitors Log */}
                  <div className="mt-6">
                      <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Colony Flags Planted</div>
                      <div className="flex flex-wrap gap-2">
                          {ships.filter(s => s.visitedPlanets?.includes(selectedPlanet.id)).length === 0 ? (
                             <p className="text-gray-600 italic text-xs">No landings recorded.</p>
                          ) : (
                             ships.filter(s => s.visitedPlanets?.includes(selectedPlanet.id)).map(ship => (
                                 <div key={ship.id} title={`${ship.cadetName} was here`} className="relative group/flag">
                                     {ship.flag ? (
                                         <div className="scale-75"><TinyFlag config={ship.flag} /></div>
                                     ) : (
                                         <div className={`w-4 h-6 ${ship.avatarColor.replace('text','bg')} rounded-sm opacity-50`} />
                                     )}
                                 </div>
                             ))
                          )}
                      </div>
                  </div>
               </div>
               
               {/* Action Buttons */}
               {isCommandMode && controlledShipId ? (
                   <button 
                      onClick={() => handleTravel(controlledShipId)}
                      className="mt-4 w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-colors border border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse"
                   >
                      <Radio size={18} />
                      EXECUTE REMOTE JUMP
                   </button>
               ) : userData?.location === selectedPlanet.id ? (
                   <button 
                      onClick={() => {
                          setIsLanded(true);
                      }}
                      className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-colors border border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-pulse"
                   >
                      <Flag size={18} />
                      LAND ON SURFACE
                   </button>
               ) : (
                   <button 
                      onClick={() => handleTravel()}
                      className="mt-4 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-colors"
                   >
                      <Navigation size={18} />
                      ENGAGE HYPERDRIVE
                   </button>
               )}
            </motion.div>
         )}
       </AnimatePresence>
       
       {/* TEACHER COMMAND SIDEBAR */}
       <AnimatePresence>
           {isCommandMode && (
               <motion.div
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    className="absolute top-0 left-0 bottom-0 w-72 bg-black/90 backdrop-blur-xl border-r border-orange-500/30 z-50 flex flex-col pointer-events-auto"
               >
                   <div className="p-4 border-b border-orange-500/30 bg-orange-900/10">
                       <h2 className="text-orange-500 font-bold uppercase tracking-widest flex items-center gap-2">
                           <Gamepad2 size={20} /> Fleet Command
                       </h2>
                       <p className="text-white/30 text-xs mt-1">Remote Navigation Link Active</p>
                   </div>

                   <div className="flex-1 overflow-y-auto p-2 space-y-2">
                       {ships.filter(s => s.role !== 'teacher').sort((a,b) => a.cadetName.localeCompare(b.cadetName)).map(ship => (
                           <div 
                                key={ship.id}
                                onClick={() => setControlledShipId(controlledShipId === ship.id ? null : ship.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 relative overflow-hidden ${controlledShipId === ship.id ? 'bg-orange-500/20 border-orange-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                           >
                                <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/50`}>
                                    <User size={16} className={ship.avatarColor} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{ship.cadetName}</div>
                                    <div className="text-[10px] uppercase tracking-wider opacity-70">
                                        AT: {PLANETS.find(p => p.id === ship.locationId)?.name || 'Deep Space'}
                                    </div>
                                </div>
                                {controlledShipId === ship.id && (
                                    <div className="absolute right-2 text-orange-400 animate-pulse">
                                        <Radio size={16} />
                                    </div>
                                )}
                           </div>
                       ))}
                   </div>
                   
                   <div className="p-4 border-t border-orange-500/30 bg-orange-900/10 text-xs text-center">
                        {controlledShipId ? (
                            <span className="text-orange-400 font-bold animate-pulse">Select Destination Planet Map &rarr;</span>
                        ) : (
                            <span className="text-gray-500">Select a unit to override controls.</span>
                        )}
                   </div>
               </motion.div>
           )}
       </AnimatePresence>

       {/* Legend / Overlay Controls */}
       <div className="absolute bottom-6 left-6 p-4 bg-black/60 rounded-xl border border-white/10 backdrop-blur text-xs text-gray-400 pointer-events-none select-none">
          <h3 className="text-white font-bold mb-2 uppercase tracking-wider">System Command</h3>
          <p>Zoom Level: {Math.round(zoom * 100)}%</p>
          <p>Orbit Status: {isOrbiting ? "ACTIVE" : "LOCKED"}</p>
          <p>Coordinates: {Math.round(pan.x)}, {Math.round(pan.y)}</p>
          <p className="mt-2 text-blue-400">Scroll to zoom. Drag to pan.</p>
       </div>

       {/* CLASS GRID OVERLAY */}
       <ManifestOverlay 
            isVisible={isGridVisible} 
            onClose={handleCloseManifest}
            ships={ships}
            ranks={ranks}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            behaviors={behaviors}
       />

       {/* AWARD CEREMONY OVERLAY */}
       <AnimatePresence>
         {awardQueue.length > 0 && (
            <div 
                key="award-overlay"
                className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-auto cursor-pointer"
                onClick={() => setAwardQueue([])}
            >
                {/* Visual Backdrop (Dim the map slightly) */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
                />

                {/* Multiple Awards Container */}
                <div className="flex flex-wrap gap-8 items-center justify-center p-12 max-h-screen overflow-y-auto">
                    {awardQueue.map((award, index) => (
                        <motion.div
                            key={award.id}
                            initial={{ scale: 0, rotate: -10, y: 50 }}
                            animate={{ scale: 1, rotate: 0, y: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ 
                                type: "spring",
                                stiffness: 200,
                                damping: 20,
                                delay: index * 0.1 // Stagger effect
                            }}
                            className={`relative z-50 bg-black/90 border border-cyan-500 rounded-3xl p-6 flex flex-col items-center shadow-[0_0_60px_rgba(6,182,212,0.6)] text-center pointer-events-auto overflow-hidden
                                ${awardQueue.length > 1 ? 'w-[300px] aspect-auto' : 'w-[500px] aspect-square p-8'}
                            `}
                            onClick={(e) => {
                                // Optional: Allow clicking individual card to dismiss just that one? 
                                // User asked for whole screen click dismiss. 
                                // Let's just let the parent click handler handle it.
                                // e.stopPropagation(); 
                            }}
                        >
                            {/* Background Shine */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-transparent to-transparent" />

                            <h2 className={`${awardQueue.length > 1 ? 'text-sm' : 'text-xl'} text-cyan-300 font-mono tracking-widest mb-4 uppercase relative z-10`}>Training Milestone</h2>

                            {/* The Ship */}
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [0, -5, 5, 0] 
                                }}
                                transition={{ 
                                    repeat: Infinity,
                                    duration: 4,
                                    ease: "easeInOut"
                                }}
                                className={`relative z-10 ${awardQueue.length > 1 ? 'mb-2' : 'mb-6'}`}
                            >
                                <div className={`relative ${awardQueue.length > 1 ? 'w-24 h-24' : 'w-40 h-40'}`}>
                                    <img 
                                        src={getAssetPath("/images/ships/finalship.png")} 
                                        alt="Award Ship"
                                        className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] relative z-20"
                                    />
                                    {/* Avatar Window - Using simple color fallback because getting full user avatar data here might be complex without looking up ship again, 
                                        but we have 'ship' object in award.
                                     */}
                                    <div className={`absolute top-[22%] left-[26%] w-[48%] h-[30%] z-30 rounded-full overflow-hidden ${award.ship.avatarColor?.replace('text','bg').replace('400','900')}/40`}>
                                         {/* If we have avatar data, we could show it, but 'ship' object in award might be minimal.
                                             Let's check if we can show generic avatar or if we have color.
                                         */}
                                    </div>
                                </div>
                            </motion.div>

                            <div className={`${awardQueue.length > 1 ? 'text-2xl' : 'text-4xl'} font-bold text-white mb-2 font-sans relative z-10 truncate w-full`}>
                                {award.ship.cadetName}
                            </div>
                            
                            {award.reason && (
                                <div className={`text-cyan-400/80 ${awardQueue.length > 1 ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-widest mb-6 relative z-10`}>
                                    // {award.reason}
                                </div>
                            )}

                            {!award.reason && <div className="mb-6" />}

                            <div className="flex items-center justify-center gap-4 w-full relative z-10">
                                <div className="flex-1 bg-green-500/10 p-3 rounded-xl border border-green-500/30">
                                    <span className="block text-green-400 text-[10px] font-bold uppercase tracking-wider mb-1">XP Gained</span>
                                    <span className="block text-2xl font-black text-green-300">+{award.xpGained}</span>
                                </div>

                                {award.newRank && (
                                <motion.div 
                                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="flex-1 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-xl border border-yellow-500/50 flex flex-col items-center gap-1 shadow-[0_0_30px_rgba(234,179,8,0.4)] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                                    <span className="block text-yellow-300 text-[10px] font-black uppercase tracking-widest relative z-10">PROMOTION!</span>
                                    {(() => {
                                        const r = ranks.find(rk => rk.name === award.newRank);
                                        return r?.image && (
                                            <motion.img 
                                                    initial={{ scale: 0, rotate: 180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ type: "spring", bounce: 0.6 }}
                                                    src={r.image} 
                                                    alt="Rank Badge" 
                                                    className="w-16 h-16 object-contain my-1 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] relative z-10" 
                                            />
                                        );
                                    })()}
                                    <span className="block text-sm font-black text-yellow-100 truncate w-full text-center relative z-10">{award.newRank}</span>
                                </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
         )}
       </AnimatePresence>

       {/* LANDING VIEW OVERLAY */}
       <AnimatePresence>
         {isLanded && selectedPlanet && userData && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-end overflow-hidden"
            >
                {/* Space Background */}
                <div className="absolute inset-0 opacity-50">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black to-black" />
                </div>

                {/* Planet Info Header */}
                <div className="absolute top-10 left-0 right-0 text-center z-10">
                     <motion.h1 
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                     >
                        {selectedPlanet.name}
                     </motion.h1>
                     <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex items-center justify-center gap-2 mt-4 text-cyan-400 font-mono tracking-widest uppercase bg-black/60 inline-block px-4 py-2 rounded-full border border-cyan-500/30"
                     >
                        <Flag size={16} /> 
                        <span>Touchdown Confirmed</span>
                     </motion.div>
                </div>

                {/* Surface Horizon */}
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: "60%" }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className={`absolute bottom-0 left-[-50%] right-[-50%] h-[100vh] rounded-[100%] ${selectedPlanet.color} shadow-[0_0_100px_rgba(0,0,0,0.5)] z-0`}
                    style={{ filter: 'brightness(0.8)' }}
                />

                {/* Character & Flag Container */}
                <div className="relative z-10 mb-20 flex items-end gap-8 pb-32">
                     {/* Flag */}
                     <motion.div
                        initial={{ y: -200, opacity: 0, rotate: -20 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{ delay: 1.2, type: "spring" }}
                        className="origin-bottom-left"
                     >
                         <div className="transform scale-[3] drop-shadow-2xl">
                              {userData.flag ? <TinyFlag config={userData.flag} /> : <div className="w-4 h-8 bg-gray-400" />}
                         </div>
                     </motion.div>

                     {/* Avatar */}
                     <motion.div 
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         transition={{ delay: 0.8, type: "spring" }}
                         className="relative w-48 h-48 -mb-4"
                     >
                         <div className="absolute inset-0 bg-black/50 rounded-full blur-xl transform scale-x-150 translate-y-8 opacity-50" />
                         <div className="relative w-full h-full">
                               <div className="w-full h-full relative overflow-visible">
                                    <div className="absolute inset-0" style={{ backgroundColor: `hsl(${userData.avatar?.skinHue || 0}, 70%, 50%)`, maskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`, WebkitMaskImage: `url(${getAssetPath('/images/avatar/spacebunny.png')})`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }} />
                                    <img src={getAssetPath("/images/avatar/spacebunny.png")} className="w-full h-full object-contain relative z-10" style={{ filter: `hue-rotate(${userData.avatar?.hue || 0}deg)` }} />
                               </div>
                         </div>
                     </motion.div>
                </div>

                {/* Interactions */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="absolute bottom-10 z-20 flex flex-col gap-4 text-center"
                >
                     <button 
                        onClick={() => {
                            setIsLanded(false);
                            setSelectedPlanet(null);
                        }}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 backdrop-blur-md uppercase tracking-widest transition-all hover:scale-105"
                     >
                        Return to Orbit
                     </button>
                     <div className="text-white/30 text-xs uppercase tracking-[0.2em] font-mono">
                         Visit Recorded in Logbook
                     </div>
                </motion.div>

                {/* Visitors Section (Who else is here) */}
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                    className="absolute top-1/2 right-10 -translate-y-1/2 bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-sm hidden lg:block"
                 >
                     <h3 className="text-white/50 uppercase tracking-widest text-xs font-bold mb-4 border-b border-white/10 pb-2">Previous Explorers</h3>
                     <div className="flex flex-wrap gap-2">
                        {ships.filter(s => s.visitedPlanets?.includes(selectedPlanet.id) && s.id !== userData.uid).length > 0 ? (
                            ships.filter(s => s.visitedPlanets?.includes(selectedPlanet.id) && s.id !== userData.uid).map(s => (
                                <div key={s.id} className="relative group cursor-help">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-black">
                                       <div className={`w-full h-full ${s.avatarColor.replace('text', 'bg').replace('400', '900')}`} />
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                        {s.cadetName}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-white/30 italic text-sm">You are the first to land here!</p>
                        )}
                     </div>
                 </motion.div>

            </motion.div>
         )}
       </AnimatePresence>

    </div>
  );
}
// Force Update
