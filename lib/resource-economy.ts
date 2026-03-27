import {
    ClassPlanetDiscoveryState,
    MachineFamily,
    OwnedMachineInventory,
    PLANETS,
    PlacedMachine,
    ResourceCategory,
    ResourceInventory,
} from "@/types";

export interface ResourceDefinition {
    id: string;
    name: string;
    category: ResourceCategory;
    symbol: string;
    accentClass: string;
}

export interface PlanetResourceAssignment {
    planetId: string;
    resourceId: string;
    resourceName: string;
    category: ResourceCategory;
    machineFamily: MachineFamily;
}

export interface MachineCost {
    resourceId: string;
    quantity: number;
    category: ResourceCategory;
}

export interface MachineDefinition {
    id: string;
    family: MachineFamily;
    tier: number;
    name: string;
    dailyOutput: number;
    previousMachineId?: string;
    starterPriceCredits?: number;
    costs: MachineCost[];
    description: string;
    symbol: string;
}

export interface ShipUpgradeCost {
    resourceId: string;
    quantity: number;
}

export interface ShipUpgradeDefinition {
    id: string;
    family: "boosters" | "hull" | "landers";
    tier: number;
    name: string;
    role: string;
    effect: string;
    description: string;
    previousUpgradeName?: string;
    costs: ShipUpgradeCost[];
}

export interface HullTierStats {
    tier: number;
    cargoCapacity: number;
    activeMachineLimit: number;
    upgradeSlots: number;
    label: string;
}

export interface MachineAccrualSnapshot {
    definition: MachineDefinition;
    elapsedMs: number;
    unitsReady: number;
    nextUnitProgressPercent: number;
}

export interface CraftAvailability {
    ok: boolean;
    reason?: string;
}

export interface BoosterStats {
    level: number;
    tier: number;
    label: string;
    travelReductionPercent: number;
    speedMultiplier: number;
}

export interface LanderStats {
    level: number;
    tier: number;
    label: string;
    landingTimeReductionPercent: number;
    manualGatherBonus: number;
    deploymentSpeedLabel: string;
}

export interface TravelComputation {
    distanceUnits: number;
    baseMinutes: number;
    adjustedMinutes: number;
    travelReductionPercent: number;
    speedMultiplier: number;
    boosterLabel: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const TRAVEL_TIME_PER_ORBIT_UNIT = 5.376;
const BOOSTER_TRAVEL_REDUCTION_BY_TIER = [0, 20, 40, 65] as const;
const LANDER_TIME_REDUCTION_BY_TIER = [0, 20, 40, 60] as const;
const LANDER_MANUAL_BONUS_BY_TIER = [0, 1, 2, 3] as const;
const LANDER_DEPLOYMENT_LABEL_BY_TIER = [
    "Standard deployment cadence",
    "Standard deployment cadence",
    "Faster machine setup",
    "Fastest machine setup",
] as const;

export const RESOURCE_CATALOG: ResourceDefinition[] = [
    { id: "iron", name: "Iron", category: "ore", symbol: "Fe", accentClass: "text-stone-300" },
    { id: "sulfur", name: "Sulfur", category: "ore", symbol: "S", accentClass: "text-yellow-300" },
    { id: "quartz", name: "Quartz", category: "ore", symbol: "Qz", accentClass: "text-sky-200" },
    { id: "iron-oxide", name: "Iron Oxide", category: "ore", symbol: "Ox", accentClass: "text-red-300" },
    { id: "ammonia-ice", name: "Ammonia Ice", category: "ore", symbol: "Ai", accentClass: "text-cyan-200" },
    { id: "ice", name: "Ice", category: "ore", symbol: "Ic", accentClass: "text-blue-100" },
    { id: "ammonia", name: "Ammonia", category: "ore", symbol: "Nh", accentClass: "text-lime-200" },
    { id: "helium", name: "Helium", category: "gas", symbol: "He", accentClass: "text-fuchsia-200" },
    { id: "carbon-dioxide", name: "Carbon Dioxide", category: "gas", symbol: "CO2", accentClass: "text-slate-200" },
    { id: "oxygen", name: "Oxygen", category: "gas", symbol: "O2", accentClass: "text-cyan-300" },
    { id: "argon", name: "Argon", category: "gas", symbol: "Ar", accentClass: "text-violet-200" },
    { id: "hydrogen", name: "Hydrogen", category: "gas", symbol: "H", accentClass: "text-blue-200" },
    { id: "methane", name: "Methane", category: "gas", symbol: "CH4", accentClass: "text-emerald-200" },
    { id: "neon", name: "Neon", category: "gas", symbol: "Ne", accentClass: "text-pink-200" },
    { id: "sun-moss", name: "Sun Moss", category: "organic", symbol: "Sm", accentClass: "text-lime-300" },
    { id: "cloud-bloom", name: "Cloud Bloom", category: "organic", symbol: "Cb", accentClass: "text-rose-200" },
    { id: "algae", name: "Algae", category: "organic", symbol: "Ag", accentClass: "text-green-300" },
    { id: "red-moss", name: "Red Moss", category: "organic", symbol: "Rm", accentClass: "text-red-200" },
    { id: "sky-coral", name: "Sky Coral", category: "organic", symbol: "Sc", accentClass: "text-cyan-100" },
    { id: "glow-kelp", name: "Glow Kelp", category: "organic", symbol: "Gk", accentClass: "text-emerald-300" },
    { id: "blue-lichen", name: "Blue Lichen", category: "organic", symbol: "Bl", accentClass: "text-blue-300" },
    { id: "sea-bloom", name: "Sea Bloom", category: "organic", symbol: "Sb", accentClass: "text-teal-200" },
];

export const RESOURCE_BY_ID = new Map<string, ResourceDefinition>(
    RESOURCE_CATALOG.map((resource) => [resource.id, resource])
);

export const PLANET_RESOURCE_ASSIGNMENTS: PlanetResourceAssignment[] = [
    { planetId: "mercury", resourceId: "iron", resourceName: "Iron", category: "ore", machineFamily: "miner" },
    { planetId: "mercury", resourceId: "helium", resourceName: "Helium", category: "gas", machineFamily: "extractor" },
    { planetId: "mercury", resourceId: "sun-moss", resourceName: "Sun Moss", category: "organic", machineFamily: "harvester" },
    { planetId: "venus", resourceId: "sulfur", resourceName: "Sulfur", category: "ore", machineFamily: "miner" },
    { planetId: "venus", resourceId: "carbon-dioxide", resourceName: "Carbon Dioxide", category: "gas", machineFamily: "extractor" },
    { planetId: "venus", resourceId: "cloud-bloom", resourceName: "Cloud Bloom", category: "organic", machineFamily: "harvester" },
    { planetId: "earth", resourceId: "quartz", resourceName: "Quartz", category: "ore", machineFamily: "miner" },
    { planetId: "earth", resourceId: "oxygen", resourceName: "Oxygen", category: "gas", machineFamily: "extractor" },
    { planetId: "earth", resourceId: "algae", resourceName: "Algae", category: "organic", machineFamily: "harvester" },
    { planetId: "mars", resourceId: "iron-oxide", resourceName: "Iron Oxide", category: "ore", machineFamily: "miner" },
    { planetId: "mars", resourceId: "argon", resourceName: "Argon", category: "gas", machineFamily: "extractor" },
    { planetId: "mars", resourceId: "red-moss", resourceName: "Red Moss", category: "organic", machineFamily: "harvester" },
    { planetId: "jupiter", resourceId: "ammonia-ice", resourceName: "Ammonia Ice", category: "ore", machineFamily: "miner" },
    { planetId: "jupiter", resourceId: "hydrogen", resourceName: "Hydrogen", category: "gas", machineFamily: "extractor" },
    { planetId: "jupiter", resourceId: "sky-coral", resourceName: "Sky Coral", category: "organic", machineFamily: "harvester" },
    { planetId: "saturn", resourceId: "ice", resourceName: "Ice", category: "ore", machineFamily: "miner" },
    { planetId: "saturn", resourceId: "methane", resourceName: "Methane", category: "gas", machineFamily: "extractor" },
    { planetId: "saturn", resourceId: "glow-kelp", resourceName: "Glow Kelp", category: "organic", machineFamily: "harvester" },
    { planetId: "uranus", resourceId: "ammonia", resourceName: "Ammonia", category: "ore", machineFamily: "miner" },
    { planetId: "uranus", resourceId: "hydrogen", resourceName: "Hydrogen", category: "gas", machineFamily: "extractor" },
    { planetId: "uranus", resourceId: "blue-lichen", resourceName: "Blue Lichen", category: "organic", machineFamily: "harvester" },
    { planetId: "neptune", resourceId: "ice", resourceName: "Ice", category: "ore", machineFamily: "miner" },
    { planetId: "neptune", resourceId: "neon", resourceName: "Neon", category: "gas", machineFamily: "extractor" },
    { planetId: "neptune", resourceId: "sea-bloom", resourceName: "Sea Bloom", category: "organic", machineFamily: "harvester" },
];

export const PLANET_RESOURCE_MAP = PLANET_RESOURCE_ASSIGNMENTS.reduce<Record<string, PlanetResourceAssignment[]>>((assignments, entry) => {
    if (!assignments[entry.planetId]) assignments[entry.planetId] = [];
    assignments[entry.planetId].push(entry);
    return assignments;
}, {});

export const MACHINE_CATALOG: MachineDefinition[] = [
    {
        id: "miner-basic",
        family: "miner",
        tier: 1,
        name: "Basic Miner",
        dailyOutput: 1,
        starterPriceCredits: 20,
        costs: [],
        description: "Starter ore machine for the first automation step.",
        symbol: "MIN",
    },
    {
        id: "miner-improved",
        family: "miner",
        tier: 2,
        name: "Improved Miner",
        dailyOutput: 2,
        previousMachineId: "miner-basic",
        costs: [
            { resourceId: "iron", quantity: 2, category: "ore" },
            { resourceId: "quartz", quantity: 2, category: "ore" },
            { resourceId: "sulfur", quantity: 1, category: "ore" },
        ],
        description: "Upgraded drilling head for better ore throughput.",
        symbol: "MIN",
    },
    {
        id: "miner-advanced",
        family: "miner",
        tier: 3,
        name: "Advanced Miner",
        dailyOutput: 3,
        previousMachineId: "miner-improved",
        costs: [
            { resourceId: "iron", quantity: 3, category: "ore" },
            { resourceId: "iron-oxide", quantity: 3, category: "ore" },
            { resourceId: "ice", quantity: 2, category: "ore" },
            { resourceId: "sulfur", quantity: 2, category: "ore" },
        ],
        description: "Deep-core mining rig built for sustained operations.",
        symbol: "MIN",
    },
    {
        id: "miner-elite",
        family: "miner",
        tier: 4,
        name: "Elite Miner",
        dailyOutput: 5,
        previousMachineId: "miner-advanced",
        costs: [
            { resourceId: "iron", quantity: 5, category: "ore" },
            { resourceId: "quartz", quantity: 5, category: "ore" },
            { resourceId: "ammonia-ice", quantity: 5, category: "ore" },
            { resourceId: "ice", quantity: 5, category: "ore" },
        ],
        description: "High-end ore platform for large-scale extraction.",
        symbol: "MIN",
    },
    {
        id: "extractor-basic",
        family: "extractor",
        tier: 1,
        name: "Basic Extractor",
        dailyOutput: 1,
        costs: [
            { resourceId: "iron", quantity: 2, category: "ore" },
            { resourceId: "oxygen", quantity: 2, category: "gas" },
        ],
        description: "Starter gas extractor for atmospheric collection.",
        symbol: "EXT",
    },
    {
        id: "extractor-improved",
        family: "extractor",
        tier: 2,
        name: "Improved Extractor",
        dailyOutput: 2,
        previousMachineId: "extractor-basic",
        costs: [
            { resourceId: "iron", quantity: 2, category: "ore" },
            { resourceId: "carbon-dioxide", quantity: 2, category: "gas" },
            { resourceId: "argon", quantity: 2, category: "gas" },
        ],
        description: "Reinforced gas intake system with better separation.",
        symbol: "EXT",
    },
    {
        id: "extractor-advanced",
        family: "extractor",
        tier: 3,
        name: "Advanced Extractor",
        dailyOutput: 3,
        previousMachineId: "extractor-improved",
        costs: [
            { resourceId: "helium", quantity: 3, category: "gas" },
            { resourceId: "hydrogen", quantity: 3, category: "gas" },
            { resourceId: "methane", quantity: 3, category: "gas" },
            { resourceId: "iron", quantity: 2, category: "ore" },
        ],
        description: "Field extractor tuned for volatile gas reserves.",
        symbol: "EXT",
    },
    {
        id: "extractor-elite",
        family: "extractor",
        tier: 4,
        name: "Elite Extractor",
        dailyOutput: 5,
        previousMachineId: "extractor-advanced",
        costs: [
            { resourceId: "hydrogen", quantity: 5, category: "gas" },
            { resourceId: "neon", quantity: 5, category: "gas" },
            { resourceId: "helium", quantity: 5, category: "gas" },
            { resourceId: "methane", quantity: 5, category: "gas" },
        ],
        description: "High-throughput gas processor for advanced harvest routes.",
        symbol: "EXT",
    },
    {
        id: "harvester-basic",
        family: "harvester",
        tier: 1,
        name: "Basic Harvester",
        dailyOutput: 1,
        costs: [
            { resourceId: "iron", quantity: 2, category: "ore" },
            { resourceId: "algae", quantity: 2, category: "organic" },
        ],
        description: "Starter organic collection rig.",
        symbol: "HAR",
    },
    {
        id: "harvester-improved",
        family: "harvester",
        tier: 2,
        name: "Improved Harvester",
        dailyOutput: 2,
        previousMachineId: "harvester-basic",
        costs: [
            { resourceId: "algae", quantity: 2, category: "organic" },
            { resourceId: "red-moss", quantity: 2, category: "organic" },
            { resourceId: "cloud-bloom", quantity: 2, category: "organic" },
        ],
        description: "Upgraded biocollector for complex plant matter.",
        symbol: "HAR",
    },
    {
        id: "harvester-advanced",
        family: "harvester",
        tier: 3,
        name: "Advanced Harvester",
        dailyOutput: 3,
        previousMachineId: "harvester-improved",
        costs: [
            { resourceId: "glow-kelp", quantity: 3, category: "organic" },
            { resourceId: "blue-lichen", quantity: 3, category: "organic" },
            { resourceId: "sea-bloom", quantity: 3, category: "organic" },
            { resourceId: "red-moss", quantity: 2, category: "organic" },
        ],
        description: "Field biofarm tuned for fragile alien organics.",
        symbol: "HAR",
    },
    {
        id: "harvester-elite",
        family: "harvester",
        tier: 4,
        name: "Elite Harvester",
        dailyOutput: 5,
        previousMachineId: "harvester-advanced",
        costs: [
            { resourceId: "sky-coral", quantity: 5, category: "organic" },
            { resourceId: "sea-bloom", quantity: 5, category: "organic" },
            { resourceId: "glow-kelp", quantity: 5, category: "organic" },
            { resourceId: "cloud-bloom", quantity: 5, category: "organic" },
        ],
        description: "Late-game organic harvester for dense ecosystems.",
        symbol: "HAR",
    },
];

export const MACHINE_BY_ID = new Map<string, MachineDefinition>(
    MACHINE_CATALOG.map((machine) => [machine.id, machine])
);

export const SHIP_UPGRADE_CATALOG: ShipUpgradeDefinition[] = [
    {
        id: "boosters-tier-1",
        family: "boosters",
        tier: 1,
        name: "Basic Booster",
        role: "Travel",
        effect: "Baseline travel speed",
        description: "Default ship booster.",
        costs: [],
    },
    {
        id: "boosters-tier-2",
        family: "boosters",
        tier: 2,
        name: "Improved Booster",
        role: "Travel",
        effect: "Travel time reduced by 20%",
        description: "Cuts travel times noticeably.",
        previousUpgradeName: "Basic Booster",
        costs: [
            { resourceId: "iron", quantity: 2 },
            { resourceId: "quartz", quantity: 2 },
            { resourceId: "helium", quantity: 2 },
        ],
    },
    {
        id: "boosters-tier-3",
        family: "boosters",
        tier: 3,
        name: "Advanced Booster",
        role: "Travel",
        effect: "Travel time reduced by 40%",
        description: "Makes broader travel much easier.",
        previousUpgradeName: "Improved Booster",
        costs: [
            { resourceId: "iron", quantity: 3 },
            { resourceId: "sulfur", quantity: 3 },
            { resourceId: "hydrogen", quantity: 3 },
        ],
    },
    {
        id: "boosters-tier-4",
        family: "boosters",
        tier: 4,
        name: "Elite Booster",
        role: "Travel",
        effect: "Travel time reduced by 65%",
        description: "Turns long trips into short ones.",
        previousUpgradeName: "Advanced Booster",
        costs: [
            { resourceId: "iron", quantity: 5 },
            { resourceId: "quartz", quantity: 5 },
            { resourceId: "hydrogen", quantity: 5 },
        ],
    },
    {
        id: "hull-tier-1",
        family: "hull",
        tier: 1,
        name: "Basic Hull",
        role: "Capacity",
        effect: "Cargo 20, active machines 2, upgrade slots 1",
        description: "Default ship hull.",
        costs: [],
    },
    {
        id: "hull-tier-2",
        family: "hull",
        tier: 2,
        name: "Improved Hull",
        role: "Capacity",
        effect: "Cargo 40, active machines 4, upgrade slots 2",
        description: "Carries more and supports a larger ship build.",
        previousUpgradeName: "Basic Hull",
        costs: [
            { resourceId: "iron", quantity: 2 },
            { resourceId: "quartz", quantity: 2 },
            { resourceId: "algae", quantity: 2 },
        ],
    },
    {
        id: "hull-tier-3",
        family: "hull",
        tier: 3,
        name: "Advanced Hull",
        role: "Capacity",
        effect: "Cargo 70, active machines 6, upgrade slots 3",
        description: "Built for larger operations.",
        previousUpgradeName: "Improved Hull",
        costs: [
            { resourceId: "iron-oxide", quantity: 3 },
            { resourceId: "ice", quantity: 3 },
            { resourceId: "oxygen", quantity: 3 },
        ],
    },
    {
        id: "hull-tier-4",
        family: "hull",
        tier: 4,
        name: "Elite Hull",
        role: "Capacity",
        effect: "Cargo 100, active machines 8, upgrade slots 4",
        description: "Maximum scale and flexibility.",
        previousUpgradeName: "Advanced Hull",
        costs: [
            { resourceId: "iron", quantity: 5 },
            { resourceId: "ice", quantity: 5 },
            { resourceId: "sea-bloom", quantity: 5 },
        ],
    },
    {
        id: "landers-tier-1",
        family: "landers",
        tier: 1,
        name: "Basic Lander",
        role: "Planet Efficiency",
        effect: "Baseline landing and manual collection",
        description: "Default landing module.",
        costs: [],
    },
    {
        id: "landers-tier-2",
        family: "landers",
        tier: 2,
        name: "Improved Lander",
        role: "Planet Efficiency",
        effect: "Landing time reduced by 20%; +1 manual gather bonus",
        description: "Makes planet-side work smoother.",
        previousUpgradeName: "Basic Lander",
        costs: [
            { resourceId: "iron", quantity: 2 },
            { resourceId: "algae", quantity: 2 },
            { resourceId: "oxygen", quantity: 2 },
        ],
    },
    {
        id: "landers-tier-3",
        family: "landers",
        tier: 3,
        name: "Advanced Lander",
        role: "Planet Efficiency",
        effect: "Landing time reduced by 40%; +2 manual gather bonus; machine setup faster",
        description: "Boosts deployment and manual collection.",
        previousUpgradeName: "Improved Lander",
        costs: [
            { resourceId: "sulfur", quantity: 3 },
            { resourceId: "red-moss", quantity: 3 },
            { resourceId: "methane", quantity: 3 },
        ],
    },
    {
        id: "landers-tier-4",
        family: "landers",
        tier: 4,
        name: "Elite Lander",
        role: "Planet Efficiency",
        effect: "Landing time reduced by 60%; +3 manual gather bonus; fastest machine setup",
        description: "Best planet-side performance.",
        previousUpgradeName: "Advanced Lander",
        costs: [
            { resourceId: "quartz", quantity: 5 },
            { resourceId: "cloud-bloom", quantity: 5 },
            { resourceId: "neon", quantity: 5 },
        ],
    },
];

export const HULL_TIER_STATS: HullTierStats[] = [
    { tier: 1, cargoCapacity: 20, activeMachineLimit: 2, upgradeSlots: 1, label: "Basic Hull" },
    { tier: 2, cargoCapacity: 40, activeMachineLimit: 4, upgradeSlots: 2, label: "Improved Hull" },
    { tier: 3, cargoCapacity: 70, activeMachineLimit: 6, upgradeSlots: 3, label: "Advanced Hull" },
    { tier: 4, cargoCapacity: 100, activeMachineLimit: 8, upgradeSlots: 4, label: "Elite Hull" },
];

export const STARTER_MINER_ID = "miner-basic";
export const RESOURCE_DISCOVERY_DOC_ID = "resourceDiscovery";

export function getHullTierStats(hullUpgradeLevel?: number): HullTierStats {
    const normalizedLevel = Math.max(0, Math.min(Number(hullUpgradeLevel || 0), HULL_TIER_STATS.length - 1));
    return HULL_TIER_STATS[normalizedLevel];
}

export function getCurrentCargoUsed(resources?: ResourceInventory): number {
    return Object.values(resources || {}).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
}

export function getStoredCargoUnits(
    resources?: ResourceInventory,
    ownedMachines?: OwnedMachineInventory,
    placedMachines?: Record<string, PlacedMachine>
): number {
    const resourceUnits = getCurrentCargoUsed(resources);
    const machineUnits = MACHINE_CATALOG.reduce((sum, machine) => {
        return sum + getAvailableMachineCount(machine.id, ownedMachines, placedMachines);
    }, 0);

    return resourceUnits + machineUnits;
}

export function getAvailableMachineCount(
    machineId: string,
    ownedMachines?: OwnedMachineInventory,
    placedMachines?: Record<string, PlacedMachine>
): number {
    const ownedCount = Number(ownedMachines?.[machineId] || 0);
    const deployedCount = Object.values(placedMachines || {}).filter((placedMachine) => placedMachine.machineId === machineId).length;
    return Math.max(0, ownedCount - deployedCount);
}

export function getPlanetResources(planetId?: string): PlanetResourceAssignment[] {
    const normalizedPlanetId = String(planetId || "").trim().toLowerCase();
    return PLANET_RESOURCE_MAP[normalizedPlanetId] || [];
}

export function getResourceDefinition(resourceId?: string): ResourceDefinition | undefined {
    return RESOURCE_BY_ID.get(String(resourceId || "").trim().toLowerCase());
}

export function getMachineDefinition(machineId?: string): MachineDefinition | undefined {
    return MACHINE_BY_ID.get(String(machineId || "").trim().toLowerCase());
}

export function canCraftMachine(
    machineId: string,
    resources?: ResourceInventory,
    ownedMachines?: OwnedMachineInventory,
    placedMachines?: Record<string, PlacedMachine>
): CraftAvailability {
    const definition = getMachineDefinition(machineId);
    if (!definition) {
        return { ok: false, reason: "Blueprint not found." };
    }

    for (const cost of definition.costs) {
        const availableQuantity = Number(resources?.[cost.resourceId] || 0);
        if (availableQuantity < cost.quantity) {
            const resourceName = getResourceDefinition(cost.resourceId)?.name || cost.resourceId;
            return { ok: false, reason: `Need ${cost.quantity} ${resourceName}.` };
        }
    }

    if (definition.previousMachineId) {
        const availablePrevious = getAvailableMachineCount(definition.previousMachineId, ownedMachines, placedMachines);
        if (availablePrevious <= 0) {
            const previousName = getMachineDefinition(definition.previousMachineId)?.name || definition.previousMachineId;
            return { ok: false, reason: `Requires one spare ${previousName}.` };
        }
    }

    return { ok: true };
}

export function getCurrentShipUpgrade(
    family: ShipUpgradeDefinition["family"],
    currentLevel?: number
): ShipUpgradeDefinition | undefined {
    const currentTier = Math.max(1, Number(currentLevel || 0) + 1);
    return SHIP_UPGRADE_CATALOG.find((upgrade) => upgrade.family === family && upgrade.tier === currentTier);
}

export function getNextShipUpgrade(
    family: ShipUpgradeDefinition["family"],
    currentLevel?: number
): ShipUpgradeDefinition | undefined {
    const nextTier = Math.max(2, Number(currentLevel || 0) + 2);
    return SHIP_UPGRADE_CATALOG.find((upgrade) => upgrade.family === family && upgrade.tier === nextTier);
}

export function canCraftShipUpgrade(
    family: ShipUpgradeDefinition["family"],
    currentLevel: number | undefined,
    resources?: ResourceInventory
): CraftAvailability {
    const nextUpgrade = getNextShipUpgrade(family, currentLevel);
    if (!nextUpgrade) {
        return { ok: false, reason: "Upgrade family already maxed." };
    }

    for (const cost of nextUpgrade.costs) {
        const availableQuantity = Number(resources?.[cost.resourceId] || 0);
        if (availableQuantity < cost.quantity) {
            const resourceName = getResourceDefinition(cost.resourceId)?.name || cost.resourceId;
            return { ok: false, reason: `Need ${cost.quantity} ${resourceName}.` };
        }
    }

    return { ok: true };
}

export function getBoosterStats(boostersLevel?: number): BoosterStats {
    const level = Math.max(0, Number(boostersLevel || 0));
    const currentUpgrade = getCurrentShipUpgrade("boosters", level);
    const tier = Math.max(1, Math.min(level + 1, BOOSTER_TRAVEL_REDUCTION_BY_TIER.length));
    const travelReductionPercent = BOOSTER_TRAVEL_REDUCTION_BY_TIER[tier - 1] || 0;
    const speedMultiplier = travelReductionPercent >= 100 ? Number.POSITIVE_INFINITY : 1 / (1 - travelReductionPercent / 100);

    return {
        level,
        tier,
        label: currentUpgrade?.name || `Booster Tier ${tier}`,
        travelReductionPercent,
        speedMultiplier,
    };
}

export function getLanderStats(landersLevel?: number): LanderStats {
    const level = Math.max(0, Number(landersLevel || 0));
    const currentUpgrade = getCurrentShipUpgrade("landers", level);
    const tier = Math.max(1, Math.min(level + 1, LANDER_TIME_REDUCTION_BY_TIER.length));

    return {
        level,
        tier,
        label: currentUpgrade?.name || `Lander Tier ${tier}`,
        landingTimeReductionPercent: LANDER_TIME_REDUCTION_BY_TIER[tier - 1] || 0,
        manualGatherBonus: LANDER_MANUAL_BONUS_BY_TIER[tier - 1] || 0,
        deploymentSpeedLabel: LANDER_DEPLOYMENT_LABEL_BY_TIER[tier - 1] || LANDER_DEPLOYMENT_LABEL_BY_TIER[0],
    };
}

export function getTravelComputationByOrbitDistance(
    startOrbitSize: number,
    endOrbitSize: number,
    boostersLevel?: number
): TravelComputation {
    const distanceUnits = Math.abs(Number(endOrbitSize || 0) - Number(startOrbitSize || 0)) / 2;
    const baseMinutes = distanceUnits * TRAVEL_TIME_PER_ORBIT_UNIT;
    const boosterStats = getBoosterStats(boostersLevel);
    const adjustedMinutes = Math.max(baseMinutes / Math.max(boosterStats.speedMultiplier, 1), 1);

    return {
        distanceUnits,
        baseMinutes,
        adjustedMinutes,
        travelReductionPercent: boosterStats.travelReductionPercent,
        speedMultiplier: boosterStats.speedMultiplier,
        boosterLabel: boosterStats.label,
    };
}

export function getTravelComputationBetweenPlanets(
    startPlanetId: string,
    endPlanetId: string,
    boostersLevel?: number
): TravelComputation | null {
    const normalizedStart = String(startPlanetId || "").trim().toLowerCase();
    const normalizedEnd = String(endPlanetId || "").trim().toLowerCase();
    const startPlanet = PLANETS.find((planet) => planet.id === normalizedStart);
    const endPlanet = PLANETS.find((planet) => planet.id === normalizedEnd);

    if (!startPlanet || !endPlanet) {
        return null;
    }

    return getTravelComputationByOrbitDistance(startPlanet.orbitSize, endPlanet.orbitSize, boostersLevel);
}

export function getMachineUnitDurationMs(machineId?: string): number {
    const definition = getMachineDefinition(machineId);
    if (!definition || definition.dailyOutput <= 0) return MS_PER_DAY;
    return MS_PER_DAY / definition.dailyOutput;
}

export function getMachineAccrualSnapshot(placedMachine: PlacedMachine, now = Date.now()): MachineAccrualSnapshot | null {
    const definition = getMachineDefinition(placedMachine.machineId);
    if (!definition) return null;

    const lastCollectedAt = Math.max(placedMachine.lastCollectedAt || placedMachine.placedAt, placedMachine.placedAt || 0);
    const elapsedMs = Math.max(0, now - lastCollectedAt);
    const unitsPerMillisecond = definition.dailyOutput / MS_PER_DAY;
    const exactUnits = elapsedMs * unitsPerMillisecond;
    const unitsReady = Math.floor(exactUnits);
    const nextUnitProgressPercent = Math.min(100, Math.max(0, (exactUnits - unitsReady) * 100));

    return {
        definition,
        elapsedMs,
        unitsReady,
        nextUnitProgressPercent,
    };
}

export function formatMachineCostLabel(costs: MachineCost[] | ShipUpgradeCost[]): string {
    if (!costs.length) return "Included";

    return costs
        .map((cost) => {
            const resource = getResourceDefinition(cost.resourceId);
            return `${cost.quantity} ${resource?.name || cost.resourceId}`;
        })
        .join(" • ");
}

export function buildPlacedMachineId(machineId: string, planetId: string, resourceId: string): string {
    const timestamp = Date.now();
    return `${machineId}-${planetId}-${resourceId}-${timestamp}`;
}

export function normalizeClassPlanetDiscoveryState(rawValue: unknown): ClassPlanetDiscoveryState {
    if (!rawValue || typeof rawValue !== "object") return {};

    const next: ClassPlanetDiscoveryState = {};
    Object.entries(rawValue as Record<string, unknown>).forEach(([planetId, value]) => {
        const normalizedPlanetId = String(planetId || "").trim().toLowerCase();
        if (!normalizedPlanetId || !Array.isArray(value)) return;

        const normalizedResources = Array.from(new Set(
            value
                .map((resourceId) => String(resourceId || "").trim().toLowerCase())
                .filter(Boolean)
        ));

        if (normalizedResources.length > 0) {
            next[normalizedPlanetId] = normalizedResources;
        }
    });

    return next;
}

export function getDiscoveredPlanetResources(
    planetId: string,
    discoveries?: ClassPlanetDiscoveryState
): PlanetResourceAssignment[] {
    const normalizedPlanetId = String(planetId || "").trim().toLowerCase();
    const discoveredIds = new Set(discoveries?.[normalizedPlanetId] || []);
    return getPlanetResources(normalizedPlanetId).filter((resource) => discoveredIds.has(resource.resourceId));
}
