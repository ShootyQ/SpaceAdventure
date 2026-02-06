// Shared Type Definitions

export interface Planet {
    id: string;
    name: string;
    color: string;
    size: string;
    pixelSize: number;
    orbitSize: number;
    orbitDuration: number;
    startAngle: number;
    description: string;
    xpRequired: number;
}

export const PLANETS: Planet[] = [
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
    type: 'scout' | 'fighter' | 'cargo' | 'cruiser';
    speed: number;
    modelId?: string;
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
    activeHat?: string;
    hat?: string; // Legacy support if needed
    avatarId?: string;
}

export interface UserData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: 'teacher' | 'student' | 'pending' | 'admin';
    teacherId?: string; // Links student to a teacher
    classCode?: string; // For teachers, unique code for students to join
    classId?: string;   // Optional grouping
    status: 'active' | 'pending_approval' | 'rejected';
    spaceship?: SpaceshipConfig;
    flag?: FlagConfig;
    avatar?: AvatarConfig;
    location?: string; // Planet ID
    xp?: number;
    fuel?: number; // Renewable Resource
    level?: number;
    upgrades?: {
        boosters: number;
        fuel: number;
        landers: number;
        hull: number;
    };
    travelStatus?: "idle" | "traveling";
    destinationId?: string;
    travelStart?: number;
    travelEnd?: number;
    lastAward?: any;
    lastXpReason?: string;
    visitedPlanets?: string[];
    unlockedHats?: string[];
    completedMissions?: string[];
    schoolName?: string;
    subscriptionStatus?: 'trial' | 'active';
    // Credentials for Print-outs (Optional/Classroom Management)
    username?: string;
    password?: string;
    
    // Teaching Team
    coTeacherEmails?: string[];
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
    avatar?: AvatarConfig;
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

export interface AsteroidEvent {
  active: boolean;
  startTime: number;
  duration: number;
  targetXP: number;
  startClassXP: number;
  reward: string;
  penalty: string;
  status: 'active' | 'success' | 'failed' | 'idle';
}

export interface ClassBonusConfig {
    current: number;
    target: number;
    reward: string;
}
