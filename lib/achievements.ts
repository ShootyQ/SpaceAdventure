import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { getEffectiveUnlockedPetIds, PET_OPTIONS, STARTER_PET_IDS } from "@/lib/pets";
import { SHIP_OPTIONS } from "@/lib/ships";
import { getXpUnlockRules, resolveRuntimeUnlockId, type UnlockConfig } from "@/lib/unlocks";
import { PLANETS, type UserData } from "@/types";

export type AchievementCategory = "collection" | "exploration" | "rarity";

export type AchievementMetric =
    | "pets_owned_excluding_starters"
    | "ships_owned_excluding_starters"
    | "avatars_owned_excluding_starters"
    | "planets_landed_excluding_sun"
    | "has_common_collectible"
    | "has_uncommon_collectible"
    | "has_rare_collectible"
    | "has_extremely_rare_collectible";

export interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    category: AchievementCategory;
    metric: AchievementMetric;
    threshold: number;
    tier: number;
    hidden?: boolean;
    badgeImage?: string;
}

export interface AchievementEarnedEntry {
    earnedAt: number;
}

export type AchievementEarnedMap = Record<string, AchievementEarnedEntry>;

export interface AchievementCardState extends AchievementDefinition {
    currentValue: number;
    isEarned: boolean;
    progressPercent: number;
    earnedAt?: number;
}

export type PlanetUnlockMap = Record<string, Record<string, number>>;

type CollectibleRarity = "common" | "uncommon" | "rare" | "extremely-rare";

const PLANET_IDS_EXCLUDING_SUN = new Set(
    PLANETS.filter((planet) => planet.id !== "sun").map((planet) => String(planet.id || "").toLowerCase())
);

const COLLECTION_BADGE_PLACEHOLDER = "/images/badges/cadet.png";

const toTitleCase = (value: string) => {
    return value
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
        .join(" ");
};

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const readPlanetXpValue = (planetXP: Record<string, number> | undefined, planetId: string) => {
    const normalizedPlanetId = normalizePlanetId(planetId);
    if (!normalizedPlanetId) return 0;

    const exactValue = Number(planetXP?.[normalizedPlanetId] || 0);
    if (exactValue > 0) return exactValue;

    const fallbackEntry = Object.entries(planetXP || {}).find(([key]) => normalizePlanetId(key) === normalizedPlanetId);
    return Number(fallbackEntry?.[1] || 0);
};

const getPurchasedShopIdsByCategory = (purchasedShopItemIds: string[] | undefined, category: string) => {
    const prefix = `${String(category || "").toLowerCase()}/`;
    return (purchasedShopItemIds || [])
        .map((itemId) => String(itemId || ""))
        .filter((itemId) => itemId.toLowerCase().startsWith(prefix))
        .map((itemId) => itemId.split("/").pop() || "")
        .filter(Boolean);
};

const resolveCatalogRarity = (value: string): CollectibleRarity | null => {
    const normalizedValue = String(value || "").trim().toLowerCase();
    if (normalizedValue === "extremely-rare" || normalizedValue === "extremelyrare") return "extremely-rare";
    if (normalizedValue === "rare") return "rare";
    if (normalizedValue === "uncommon") return "uncommon";
    if (normalizedValue === "common" || normalizedValue === "standard") return "common";
    return null;
};

const resolveRarityFromText = (value: string): CollectibleRarity => {
    const normalized = String(value || "").toLowerCase();
    if (normalized.includes("extremely-rare") || normalized.includes("extremelyrare")) return "extremely-rare";
    if (normalized.includes("/rare/") || normalized.includes("-rare")) return "rare";
    if (normalized.includes("uncommon")) return "uncommon";
    return "common";
};

const resolveShipRarity = (shipId: string): CollectibleRarity => {
    const option = SHIP_OPTIONS.find((ship) => ship.id === shipId);
    if (option?.assetPath) return resolveRarityFromText(option.assetPath);
    return resolveRarityFromText(shipId);
};

const resolveAvatarRarity = (avatarId: string): CollectibleRarity => {
    const option = AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId);
    if (option?.src) return resolveRarityFromText(option.src);
    return resolveRarityFromText(avatarId);
};

const buildCollectionTierDefinitions = ({
    prefix,
    title,
    description,
    metric,
}: {
    prefix: string;
    title: string;
    description: string;
    metric: AchievementMetric;
}): AchievementDefinition[] => {
    const thresholds = [10, 20, 30, 40];
    return thresholds.map((threshold, index) => ({
        id: `${prefix}-${threshold}`,
        title: `${title} ${index + 1}`,
        description: `${description} (${threshold})`,
        category: "collection",
        metric,
        threshold,
        tier: index + 1,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    }));
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    ...buildCollectionTierDefinitions({
        prefix: "pets-owned",
        title: "Pet Collector",
        description: "Own non-starter pets",
        metric: "pets_owned_excluding_starters",
    }),
    ...buildCollectionTierDefinitions({
        prefix: "ships-owned",
        title: "Fleet Builder",
        description: "Own non-starter ships",
        metric: "ships_owned_excluding_starters",
    }),
    ...buildCollectionTierDefinitions({
        prefix: "avatars-owned",
        title: "Avatar Curator",
        description: "Own non-starter avatars",
        metric: "avatars_owned_excluding_starters",
    }),
    {
        id: "landed-planets-1",
        title: "First Contact",
        description: "Land on 1 planet (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: 1,
        tier: 1,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "landed-planets-4",
        title: "Sector Scout",
        description: "Land on 4 planets (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: 4,
        tier: 2,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "landed-planets-all",
        title: "System Cartographer",
        description: "Land on all planets (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: PLANET_IDS_EXCLUDING_SUN.size,
        tier: 3,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "rarity-common",
        title: "Common Collector",
        description: "Own at least one Common collectible",
        category: "rarity",
        metric: "has_common_collectible",
        threshold: 1,
        tier: 1,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "rarity-uncommon",
        title: "Uncommon Collector",
        description: "Own at least one Uncommon collectible",
        category: "rarity",
        metric: "has_uncommon_collectible",
        threshold: 1,
        tier: 2,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "rarity-rare",
        title: "Rare Collector",
        description: "Own at least one Rare collectible",
        category: "rarity",
        metric: "has_rare_collectible",
        threshold: 1,
        tier: 3,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
    {
        id: "rarity-extremely-rare",
        title: "Extremely Rare Collector",
        description: "Own at least one Extremely Rare collectible",
        category: "rarity",
        metric: "has_extremely_rare_collectible",
        threshold: 1,
        tier: 4,
        badgeImage: COLLECTION_BADGE_PLACEHOLDER,
    },
];

const resolveUnlockedShipIds = ({
    userData,
    unlockConfig,
    planetShipUnlocks,
}: {
    userData: UserData;
    unlockConfig: UnlockConfig;
    planetShipUnlocks: PlanetUnlockMap;
}) => {
    const idAliases = unlockConfig.idAliases;
    const shipCatalogIds = new Set(SHIP_OPTIONS.map((ship) => ship.id));
    const unlocked = new Set<string>();

    (unlockConfig.starters?.ships || []).forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, shipCatalogIds));
    });

    getPurchasedShopIdsByCategory(userData.purchasedShopItemIds, "ships").forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(id, idAliases, shipCatalogIds));
    });

    (userData.shopUnlockedShipIds || []).forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, shipCatalogIds));
    });

    unlocked.add(String(userData.spaceship?.modelId || userData.spaceship?.id || "finalship"));

    getXpUnlockRules(unlockConfig.ships || []).forEach((rule) => {
        const planetId = normalizePlanetId(rule.planetId);
        const requiredXP = Number(planetShipUnlocks?.[planetId]?.[rule.unlockKey] || 0);
        const currentPlanetXP = readPlanetXpValue(userData.planetXP as Record<string, number> | undefined, planetId);
        if (requiredXP > 0 && currentPlanetXP >= requiredXP) {
            unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, shipCatalogIds));
        }
    });

    return unlocked;
};

const resolveUnlockedAvatarIds = ({
    userData,
    unlockConfig,
    planetAvatarUnlocks,
}: {
    userData: UserData;
    unlockConfig: UnlockConfig;
    planetAvatarUnlocks: PlanetUnlockMap;
}) => {
    const idAliases = unlockConfig.idAliases;
    const avatarCatalogIds = new Set(AVATAR_OPTIONS.map((avatar) => avatar.id));
    const unlocked = new Set<string>();

    (unlockConfig.starters?.avatars || []).forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds));
    });

    getPurchasedShopIdsByCategory(userData.purchasedShopItemIds, "avatars").forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(id, idAliases, avatarCatalogIds));
    });

    (userData.shopUnlockedAvatarIds || []).forEach((id) => {
        unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds));
    });

    unlocked.add(String(userData.avatar?.avatarId || "bunny"));

    getXpUnlockRules(unlockConfig.avatars || []).forEach((rule) => {
        const planetId = normalizePlanetId(rule.planetId);
        const requiredXP = Number(planetAvatarUnlocks?.[planetId]?.[rule.unlockKey] || 0);
        const currentPlanetXP = readPlanetXpValue(userData.planetXP as Record<string, number> | undefined, planetId);
        if (requiredXP > 0 && currentPlanetXP >= requiredXP) {
            unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, avatarCatalogIds));
        }
    });

    return unlocked;
};

export const resolveAchievementMetrics = ({
    userData,
    unlockConfig,
    planetShipUnlocks,
    planetAvatarUnlocks,
}: {
    userData: UserData;
    unlockConfig: UnlockConfig;
    planetShipUnlocks: PlanetUnlockMap;
    planetAvatarUnlocks: PlanetUnlockMap;
}): Record<AchievementMetric, number> => {
    const unlockedShipIds = resolveUnlockedShipIds({ userData, unlockConfig, planetShipUnlocks });
    const unlockedAvatarIds = resolveUnlockedAvatarIds({ userData, unlockConfig, planetAvatarUnlocks });
    const unlockedPetIds = getEffectiveUnlockedPetIds(userData || null);
    getPurchasedShopIdsByCategory(userData.purchasedShopItemIds, "pets").forEach((petId) => unlockedPetIds.add(petId));

    const starterShipIds = new Set(
        (unlockConfig.starters?.ships?.length ? unlockConfig.starters.ships : ["finalship"]).map((id) => String(id || "").toLowerCase())
    );
    const configuredStarterAvatarIds = unlockConfig.starters?.avatars || [];
    const starterAvatarIds = new Set(
        (configuredStarterAvatarIds.length > 0 ? configuredStarterAvatarIds : ["bunny"]).map((id) => String(id || "").toLowerCase())
    );
    const starterPetIds = new Set(STARTER_PET_IDS.map((id) => String(id || "").toLowerCase()));

    const ownedNonStarterShipCount = Array.from(unlockedShipIds).filter((id) => !starterShipIds.has(String(id || "").toLowerCase())).length;
    const ownedNonStarterAvatarCount = Array.from(unlockedAvatarIds).filter((id) => !starterAvatarIds.has(String(id || "").toLowerCase())).length;
    const ownedNonStarterPetCount = Array.from(unlockedPetIds).filter((id) => !starterPetIds.has(String(id || "").toLowerCase())).length;

    const collectibleRarities = new Set<CollectibleRarity>();

    Array.from(unlockedPetIds).forEach((petId) => {
        const pet = PET_OPTIONS.find((option) => option.id === petId);
        const rarity = pet ? resolveCatalogRarity(pet.rarity) : resolveRarityFromText(String(petId || ""));
        if (rarity) collectibleRarities.add(rarity);
    });

    Array.from(unlockedShipIds).forEach((shipId) => {
        collectibleRarities.add(resolveShipRarity(String(shipId || "")));
    });

    Array.from(unlockedAvatarIds).forEach((avatarId) => {
        collectibleRarities.add(resolveAvatarRarity(String(avatarId || "")));
    });

    const visitedPlanets = new Set(
        (userData.visitedPlanets || [])
            .map((planetId) => String(planetId || "").toLowerCase())
            .filter((planetId) => PLANET_IDS_EXCLUDING_SUN.has(planetId))
    );

    return {
        pets_owned_excluding_starters: Math.max(0, ownedNonStarterPetCount),
        ships_owned_excluding_starters: Math.max(0, ownedNonStarterShipCount),
        avatars_owned_excluding_starters: Math.max(0, ownedNonStarterAvatarCount),
        planets_landed_excluding_sun: visitedPlanets.size,
        has_common_collectible: collectibleRarities.has("common") ? 1 : 0,
        has_uncommon_collectible: collectibleRarities.has("uncommon") ? 1 : 0,
        has_rare_collectible: collectibleRarities.has("rare") ? 1 : 0,
        has_extremely_rare_collectible: collectibleRarities.has("extremely-rare") ? 1 : 0,
    };
};

export const getAchievementCategoryLabel = (category: AchievementCategory) => {
    if (category === "collection") return "Collection";
    if (category === "exploration") return "Exploration";
    if (category === "rarity") return "Rarity";
    return toTitleCase(category);
};

export const evaluateAchievements = ({
    definitions,
    metrics,
    earnedMap,
}: {
    definitions?: AchievementDefinition[];
    metrics: Record<AchievementMetric, number>;
    earnedMap?: AchievementEarnedMap;
}): AchievementCardState[] => {
    const sourceDefinitions = definitions || ACHIEVEMENT_DEFINITIONS;
    const safeEarnedMap = earnedMap || {};

    return sourceDefinitions.map((definition) => {
        const currentValue = Number(metrics[definition.metric] || 0);
        const threshold = Math.max(1, Number(definition.threshold || 1));
        const earned = safeEarnedMap[definition.id];
        const isMetricComplete = currentValue >= threshold;
        const isEarned = Boolean(earned) || isMetricComplete;
        const progressPercent = Math.max(0, Math.min(100, Math.round((currentValue / threshold) * 100)));

        return {
            ...definition,
            currentValue,
            isEarned,
            progressPercent,
            earnedAt: earned?.earnedAt,
        };
    });
};
