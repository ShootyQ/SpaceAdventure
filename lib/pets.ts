import { UserData } from "@/types";
import { PLANETS } from "@/types";
import collectiblesCatalog from "@/data/collectibles/catalog.json";

export type PetRarity = "standard" | "common" | "uncommon" | "rare" | "extremely-rare" | "testing";
export type RollablePetRarity = "common" | "uncommon" | "rare" | "extremely-rare";

export interface PetOption {
    id: string;
    name: string;
    emoji: string;
    imageSrc?: string;
    rarity: PetRarity;
    unlockPlanetId?: string;
    unlockHint?: string;
    starter: boolean;
}

export interface PetUnlockChanceConfig {
    planet: Record<RollablePetRarity, number>;
    anyPlanet: Record<RollablePetRarity, number>;
    testing: number;
    enabled: {
        planet: Record<RollablePetRarity, boolean>;
        anyPlanet: Record<RollablePetRarity, boolean>;
        testing: boolean;
    };
}

export type PetUnlockMethod = "chance" | "shop" | "starter" | "unassigned";
export type PetUnlockScope = "planet" | "any";

export interface PetUnlockAssignment {
    method: PetUnlockMethod;
    scope: PetUnlockScope;
    planetId?: string;
    rarity?: RollablePetRarity;
}

const DEFAULT_PLANET_RARITY_CHANCES: Record<RollablePetRarity, number> = {
    common: 50,
    uncommon: 500,
    rare: 1000,
    "extremely-rare": 5000,
};

const DEFAULT_ANY_PLANET_RARITY_CHANCES: Record<RollablePetRarity, number> = {
    common: 250,
    uncommon: 2500,
    rare: 5000,
    "extremely-rare": 25000,
};

const DEFAULT_TESTING_CHANCE_DENOMINATOR = 20;

export const DEFAULT_PET_UNLOCK_CHANCE_CONFIG: PetUnlockChanceConfig = {
    planet: { ...DEFAULT_PLANET_RARITY_CHANCES },
    anyPlanet: { ...DEFAULT_ANY_PLANET_RARITY_CHANCES },
    testing: DEFAULT_TESTING_CHANCE_DENOMINATOR,
    enabled: {
        planet: {
            common: true,
            uncommon: true,
            rare: true,
            "extremely-rare": true,
        },
        anyPlanet: {
            common: true,
            uncommon: true,
            rare: true,
            "extremely-rare": true,
        },
        testing: true,
    },
};

const PET_EMOJI_FALLBACKS: Record<string, string> = {
    batpet: "🦇",
    mothpet: "🦋",
    otterpet: "🦦",
    snakepet: "🐍",
    galaxycatpet: "🐱",
    puddlepup: "🐶",
    cloudcub: "🐻",
    canyonraptor: "🦖",
    "acidic-axolotl": "🦎",
    rockcat: "🐈",
};

const PET_NAME_FALLBACKS: Record<string, string> = {
    slimepet: "Nebula Goo",
    skateboardsquirrell: "Kickflip Comet Squirrel",
};

type CatalogItem = {
    id: string;
    type: string;
    rarity?: string;
    name: string;
    asset?: string;
    active?: boolean;
    tags?: string[];
};

const KNOWN_PLANET_IDS = new Set(PLANETS.map((planet) => planet.id.toLowerCase()).filter((planetId) => planetId !== "sun"));

const toTitleCase = (value: string) => {
    return value
        .split("-")
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
        .join(" ");
};

const resolvePlanetIdFromItem = (item: CatalogItem): string | undefined => {
    const tagPlanet = (item.tags || []).find((tag) => KNOWN_PLANET_IDS.has(String(tag).toLowerCase()));
    if (tagPlanet) return String(tagPlanet).toLowerCase();

    const assetFile = decodeURIComponent(String(item.asset || "")).split("/").pop() || "";
    const [planetPrefix] = assetFile.toLowerCase().split(".");
    if (KNOWN_PLANET_IDS.has(planetPrefix)) return planetPrefix;

    return undefined;
};

const resolveRarity = (value?: string): PetRarity => {
    const rarity = String(value || "").toLowerCase();
    if (rarity === "standard" || rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare" || rarity === "testing") {
        return rarity;
    }
    return "common";
};

const sanitizeDenominator = (value: unknown, fallback: number) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.max(1, Math.round(num));
};

export const normalizePetUnlockChanceConfig = (raw?: Partial<PetUnlockChanceConfig> | null): PetUnlockChanceConfig => {
    const planet = {
        common: sanitizeDenominator(raw?.planet?.common, DEFAULT_PLANET_RARITY_CHANCES.common),
        uncommon: sanitizeDenominator(raw?.planet?.uncommon, DEFAULT_PLANET_RARITY_CHANCES.uncommon),
        rare: sanitizeDenominator(raw?.planet?.rare, DEFAULT_PLANET_RARITY_CHANCES.rare),
        "extremely-rare": sanitizeDenominator(raw?.planet?.["extremely-rare"], DEFAULT_PLANET_RARITY_CHANCES["extremely-rare"]),
    };

    const anyPlanet = {
        common: sanitizeDenominator(raw?.anyPlanet?.common, DEFAULT_ANY_PLANET_RARITY_CHANCES.common),
        uncommon: sanitizeDenominator(raw?.anyPlanet?.uncommon, DEFAULT_ANY_PLANET_RARITY_CHANCES.uncommon),
        rare: sanitizeDenominator(raw?.anyPlanet?.rare, DEFAULT_ANY_PLANET_RARITY_CHANCES.rare),
        "extremely-rare": sanitizeDenominator(raw?.anyPlanet?.["extremely-rare"], DEFAULT_ANY_PLANET_RARITY_CHANCES["extremely-rare"]),
    };

    return {
        planet,
        anyPlanet,
        testing: sanitizeDenominator(raw?.testing, DEFAULT_TESTING_CHANCE_DENOMINATOR),
        enabled: {
            planet: {
                common: raw?.enabled?.planet?.common !== false,
                uncommon: raw?.enabled?.planet?.uncommon !== false,
                rare: raw?.enabled?.planet?.rare !== false,
                "extremely-rare": raw?.enabled?.planet?.["extremely-rare"] !== false,
            },
            anyPlanet: {
                common: raw?.enabled?.anyPlanet?.common !== false,
                uncommon: raw?.enabled?.anyPlanet?.uncommon !== false,
                rare: raw?.enabled?.anyPlanet?.rare !== false,
                "extremely-rare": raw?.enabled?.anyPlanet?.["extremely-rare"] !== false,
            },
            testing: raw?.enabled?.testing !== false,
        },
    };
};

export const normalizePetUnlockAssignments = (raw?: Record<string, any> | null): Record<string, PetUnlockAssignment> => {
    if (!raw || typeof raw !== "object") return {};

    const normalized: Record<string, PetUnlockAssignment> = {};

    Object.entries(raw).forEach(([petId, value]) => {
        const normalizedPetId = String(petId || "").trim().toLowerCase();
        if (!normalizedPetId) return;

        const methodRaw = String((value as any)?.method || "chance").trim().toLowerCase();
        const method: PetUnlockMethod = (methodRaw === "starter" || methodRaw === "unassigned" || methodRaw === "shop") ? methodRaw : "chance";

        const scopeRaw = String((value as any)?.scope || "any").trim().toLowerCase();
        const scope: PetUnlockScope = scopeRaw === "planet" ? "planet" : "any";

        const planetId = String((value as any)?.planetId || "").trim().toLowerCase();
        const rarityRaw = String((value as any)?.rarity || "").trim().toLowerCase();
        const rarity: RollablePetRarity = (
            rarityRaw === "common" ||
            rarityRaw === "uncommon" ||
            rarityRaw === "rare" ||
            rarityRaw === "extremely-rare"
        ) ? rarityRaw : "common";

        normalized[normalizedPetId] = {
            method,
            scope,
            planetId: scope === "planet" ? planetId : undefined,
            rarity: method === "chance" ? rarity : undefined,
        };
    });

    return normalized;
};

const getChanceDenominator = (rarity: PetRarity, unlockPlanetId: string | undefined, config: PetUnlockChanceConfig) => {
    if (rarity === "testing") return config.testing;
    if (rarity === "standard") return undefined;
    if (unlockPlanetId) return config.planet[rarity];
    return config.anyPlanet[rarity];
};

export const getPetUnlockHint = (pet: Pick<PetOption, "rarity" | "unlockPlanetId" | "starter">, config?: Partial<PetUnlockChanceConfig> | null) => {
    const normalizedConfig = normalizePetUnlockChanceConfig(config || null);
    const rarity = pet.rarity;
    const unlockPlanetId = pet.unlockPlanetId;

    if (rarity === "standard") return undefined;

    const chance = getChanceDenominator(rarity, unlockPlanetId, normalizedConfig);
    if (!chance) return "Locked";

    if (rarity === "testing") {
        return `Testing drop: Gain XP on any planet (1-in-${chance.toLocaleString()} chance)`;
    }

    if (unlockPlanetId) {
        return `Gain XP while orbiting ${toTitleCase(unlockPlanetId)} (1-in-${chance.toLocaleString()} chance)`;
    }

    return `Gain XP on any planet (1-in-${chance.toLocaleString()} chance)`;
};

const catalogPetItems = ((collectiblesCatalog as any)?.items || [])
    .filter((item: CatalogItem) => item.type === "pet" && item.active !== false)
    .map((item: CatalogItem): PetOption => {
        const rarity = resolveRarity(item.rarity);
        const unlockPlanetId = resolvePlanetIdFromItem(item);
        const starter = rarity === "standard" || Boolean((item.tags || []).includes("starter"));

        return {
            id: item.id,
            name: item.name,
            emoji: PET_EMOJI_FALLBACKS[item.id] || "🐾",
            imageSrc: item.asset,
            rarity,
            starter,
            unlockPlanetId,
            unlockHint: getPetUnlockHint({ rarity, unlockPlanetId, starter }),
        };
    });

export const PET_OPTIONS: PetOption[] = catalogPetItems.length > 0 ? catalogPetItems : [
    { id: "batpet", name: "Space Bat", emoji: "🦇", imageSrc: "/images/collectibles/pets/standard/batpet.png", rarity: "standard", starter: true },
    { id: "mothpet", name: "Cosmic Moth", emoji: "🦋", imageSrc: "/images/collectibles/pets/standard/mothpet.png", rarity: "standard", starter: true },
    { id: "otterpet", name: "Orbit Otter", emoji: "🦦", imageSrc: "/images/collectibles/pets/standard/otterpet.png", rarity: "standard", starter: true },
    { id: "snakepet", name: "Nebula Snake", emoji: "🐍", imageSrc: "/images/collectibles/pets/standard/snakepet.png", rarity: "standard", starter: true },
];

export const STARTER_PET_IDS = PET_OPTIONS.filter((pet) => pet.starter).map((pet) => pet.id);
export const DEFAULT_PET_ID = STARTER_PET_IDS[0] || PET_OPTIONS[0].id;

const ROLLABLE_RARITIES: RollablePetRarity[] = ["common", "uncommon", "rare", "extremely-rare"];

const pickRandomPetId = (pool: PetOption[]) => {
    if (pool.length === 0) return null;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index]?.id || null;
};

export const rollPetUnlocksForXpEvent = ({
    planetId,
    currentlyUnlockedPetIds,
    chanceConfig,
    assignmentOverrides,
}: {
    planetId: string;
    currentlyUnlockedPetIds: Set<string>;
    chanceConfig?: Partial<PetUnlockChanceConfig> | null;
    assignmentOverrides?: Record<string, PetUnlockAssignment> | null;
}): string[] => {
    const normalizedConfig = normalizePetUnlockChanceConfig(chanceConfig || null);
    const normalizedAssignments = normalizePetUnlockAssignments(assignmentOverrides || null);
    const normalizedPlanetId = String(planetId || "").toLowerCase();
    if (!normalizedPlanetId || normalizedPlanetId === "sun") return [];

    const unlocked = new Set(currentlyUnlockedPetIds);
    const newlyUnlocked: string[] = [];

    const rollPool = (pool: PetOption[], denominator?: number) => {
        if (!denominator || pool.length === 0) return;
        const hit = Math.random() < (1 / denominator);
        if (!hit) return;

        const pickedId = pickRandomPetId(pool);
        if (!pickedId || unlocked.has(pickedId)) return;

        unlocked.add(pickedId);
        newlyUnlocked.push(pickedId);
    };

    ROLLABLE_RARITIES.forEach((rarity) => {
        const planetPool = PET_OPTIONS.filter((pet) => (
            (() => {
                const assignment = normalizedAssignments[String(pet.id || "").toLowerCase()];
                const effectiveMethod: PetUnlockMethod = assignment?.method || (pet.starter ? "starter" : "chance");
                if (effectiveMethod !== "chance") return false;

                const assignmentRarity = assignment?.rarity;
                const effectiveRarity = (
                    assignmentRarity === "common" ||
                    assignmentRarity === "uncommon" ||
                    assignmentRarity === "rare" ||
                    assignmentRarity === "extremely-rare"
                )
                    ? assignmentRarity
                    : pet.rarity;

                const effectiveScope: PetUnlockScope = assignment?.scope || (pet.unlockPlanetId ? "planet" : "any");
                const effectivePlanetId = effectiveScope === "planet"
                    ? (assignment?.planetId || pet.unlockPlanetId || "").toLowerCase()
                    : "";

                return effectiveRarity === rarity &&
                    effectiveScope === "planet" &&
                    effectivePlanetId === normalizedPlanetId;
            })() &&
            !pet.starter &&
            !unlocked.has(pet.id)
        ));

        const anyPlanetPool = PET_OPTIONS.filter((pet) => (
            (() => {
                const assignment = normalizedAssignments[String(pet.id || "").toLowerCase()];
                const effectiveMethod: PetUnlockMethod = assignment?.method || (pet.starter ? "starter" : "chance");
                if (effectiveMethod !== "chance") return false;

                const assignmentRarity = assignment?.rarity;
                const effectiveRarity = (
                    assignmentRarity === "common" ||
                    assignmentRarity === "uncommon" ||
                    assignmentRarity === "rare" ||
                    assignmentRarity === "extremely-rare"
                )
                    ? assignmentRarity
                    : pet.rarity;

                const effectiveScope: PetUnlockScope = assignment?.scope || (pet.unlockPlanetId ? "planet" : "any");
                return effectiveRarity === rarity && effectiveScope === "any";
            })() &&
            !pet.starter &&
            !unlocked.has(pet.id)
        ));

        if (normalizedConfig.enabled.planet[rarity]) {
            rollPool(planetPool, normalizedConfig.planet[rarity]);
        }
        if (normalizedConfig.enabled.anyPlanet[rarity]) {
            rollPool(anyPlanetPool, normalizedConfig.anyPlanet[rarity]);
        }
    });

    const testingPool = PET_OPTIONS.filter((pet) => (
        pet.rarity === "testing" &&
        !pet.starter &&
        !unlocked.has(pet.id)
    ));
    if (normalizedConfig.enabled.testing) {
        rollPool(testingPool, normalizedConfig.testing);
    }

    return newlyUnlocked;
};

export const getEffectiveUnlockedPetIds = (userData?: Pick<UserData, "unlockedPetIds"> | null): Set<string> => {
    return new Set([...(userData?.unlockedPetIds || []), ...STARTER_PET_IDS]);
};

export const getResolvedSelectedPetId = (
    userData?: Pick<UserData, "selectedPetId" | "unlockedPetIds"> | null
): string => {
    const unlocked = getEffectiveUnlockedPetIds(userData || null);
    const selected = userData?.selectedPetId;
    if (selected && unlocked.has(selected)) return selected;
    return STARTER_PET_IDS.find((id) => unlocked.has(id)) || DEFAULT_PET_ID;
};

export const getPetById = (petId?: string | null): PetOption => {
    if (petId) {
        const found = PET_OPTIONS.find((pet) => pet.id === petId);
        if (found) return found;

        const normalizedPetId = String(petId)
            .trim()
            .toLowerCase()
            .replace(/\.[^.]+$/g, "")
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (normalizedPetId) {
            const dynamicName = PET_NAME_FALLBACKS[normalizedPetId] || normalizedPetId
                .replace(/[-_]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, (char) => char.toUpperCase()) || "Companion";

            return {
                id: normalizedPetId,
                name: dynamicName,
                emoji: "🐾",
                imageSrc: `/images/collectibles/pets/shop/${normalizedPetId}.png`,
                rarity: "common",
                starter: false,
            };
        }
    }
    return PET_OPTIONS.find((pet) => pet.id === DEFAULT_PET_ID) || PET_OPTIONS[0];
};
