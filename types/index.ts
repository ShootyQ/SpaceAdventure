// Shared Type Definitions

export interface FlagConfig {
    pole: string;
    shape: string;
    primaryColor: string;
    secondaryColor: string;
    pattern: string;
}
  
export interface SpaceshipConfig {
    name: string;
    color: string;
    type: 'scout' | 'fighter' | 'cargo';
    speed: number;
}
  
export interface Rank {
    id: string; // unique ID for editing stability
    name: string;
    minXP: number;
    image: string;
}

export interface AvatarConfig {
    hue?: number;
    skinHue?: number;
    bgHue?: number;
    bgSat?: number;
    bgLight?: number;
}

export interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'teacher' | 'student' | 'pending' | 'admin';
    status: 'active' | 'pending_approval' | 'rejected';
    spaceship?: SpaceshipConfig;
    flag?: FlagConfig;
    avatar?: AvatarConfig;
    location?: string; // Planet ID
    xp?: number;
    level?: number;
    travelStatus?: "idle" | "traveling";
    destinationId?: string;
    travelStart?: number;
    travelEnd?: number;
    lastAward?: any;
    visitedPlanets?: string[];
}
  
export interface Planet {
    id: string;
    name: string;
    color: string;
    size: string; // Tailwind class
    pixelSize: number; // Actual pixel width/height for calculations
    orbitSize: number; // Pixel value for calculation
    orbitDuration: number; // Seconds
    startAngle: number; // Degrees
    description: string;
    xpRequired: number;
}
  
export interface Ship {
    id: string;
    cadetName: string;
    locationId: string; // Planet ID
    status: "idle" | "traveling";
    destinationId?: string;
    avatarColor: string;
    travelStart?: number; // Timestamp
    travelEnd?: number; // Timestamp
    role?: 'teacher' | 'student';
    xp: number; // Added XP tracking
    lastXpReason?: string;
    flag?: FlagConfig;
    visitedPlanets?: string[];
}
  
export interface AwardEvent {
      id: string;
      ship: Ship;
      xpGained: number;
      newRank?: string;
      startPos: { x: number, y: number }; // Screen coordinates to fly from
      reason?: string;
}
  
export interface Behavior {
      id: string;
      label: string;
      xp: number; 
      color: string;
}  