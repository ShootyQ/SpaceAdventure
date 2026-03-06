import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { getEffectiveUnlockedPetIds, PET_OPTIONS, STARTER_PET_IDS } from "@/lib/pets";
import { SHIP_OPTIONS } from "@/lib/ships";
import { getXpUnlockRules, resolveRuntimeUnlockId, type UnlockConfig } from "@/lib/unlocks";
import { isXpUnlockEarned, normalizeXpUnlockProgressMap } from "@/lib/xp-unlock-progress";
import { PLANETS, type UserData } from "@/types";

export type AchievementCategory = "collection" | "exploration" | "rarity";

export type AchievementMetric =
    | "pets_owned_excluding_starters"
    | "ships_owned_excluding_starters"
    | "avatars_owned_excluding_starters"
    | "planets_landed_excluding_sun"
    | "common_collectibles_owned"
    | "uncommon_collectibles_owned"
    | "rare_collectibles_owned"
    | "extremely_rare_collectibles_owned";

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

export type CollectibleRarity = "common" | "uncommon" | "rare" | "extremely-rare";
export type ShopItemRarityMap = Record<string, CollectibleRarity>;

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

const normalizeShopItemId = (itemId: string) => String(itemId || "").trim().toLowerCase();

const toEntityKey = (category: string, itemId: string) => {
    const normalizedCategory = String(category || "").trim().toLowerCase();
    const normalizedItemId = String(itemId || "").trim().toLowerCase();
    if (!normalizedCategory || !normalizedItemId) return "";
    return `${normalizedCategory}:${normalizedItemId}`;
};

const normalizeShopRarityMap = (shopItemRarities: Record<string, string | CollectibleRarity> | undefined): ShopItemRarityMap => {
    const normalized: ShopItemRarityMap = {};
    Object.entries(shopItemRarities || {}).forEach(([itemId, rarity]) => {
        const normalizedItemId = normalizeShopItemId(itemId);
        const parsed = resolveCatalogRarity(String(rarity || ""));
        if (!normalizedItemId || !parsed) return;
        normalized[normalizedItemId] = parsed;
    });
    return normalized;
};

const buildExplicitRarityRuleMap = (
    rules: Array<{ id?: string; unlockKey?: string; rarity?: string }> | undefined,
    catalogIds: Set<string>,
    idAliases: Record<string, string>
) => {
    const map = new Map<string, CollectibleRarity>();
    (rules || []).forEach((rule) => {
        const parsedRarity = resolveCatalogRarity(String(rule?.rarity || ""));
        if (!parsedRarity) return;

        const candidates = [String(rule?.unlockKey || ""), String(rule?.id || "")]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .map((value) => resolveRuntimeUnlockId(value, idAliases, catalogIds));

        candidates.forEach((candidate) => {
            const normalizedCandidate = String(candidate || "").trim();
            if (!normalizedCandidate) return;
            map.set(normalizedCandidate, parsedRarity);
        });
    });
    return map;
};

const buildCollectionTierDefinitions = ({
    prefix,
    title,
    description,
    metric,
    badgeImages,
}: {
    prefix: string;
    title: string;
    description: string;
    metric: AchievementMetric;
    badgeImages?: string[];
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
        badgeImage: badgeImages?.[index] || COLLECTION_BADGE_PLACEHOLDER,
    }));
};

const buildRarityTierDefinitions = ({
    prefix,
    title,
    metric,
}: {
    prefix: string;
    title: string;
    metric: AchievementMetric;
}): AchievementDefinition[] => {
    const thresholds = [10, 20, 30, 40];
    return thresholds.map((threshold, index) => ({
        id: `${prefix}-${threshold}`,
        title: `${title} ${index + 1}`,
        description: `Own ${threshold} ${title.replace(" Collector", "")} collectibles`,
        category: "rarity",
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
        badgeImages: [
            "/images/achievements/pets1.hatchlinghandler.10.png",
            "/images/achievements/pets2.creaturekeeper.20.png",
            "/images/achievements/pets3.beastbinder.30.png",
            "/images/achievements/pets4.mythicmenagerie.40.png",
        ],
    }).map((achievement, index) => {
        const tierTitles = ["Hatchling Handler", "Creature Keeper", "Beast Binder", "Mythic Menagerie"];
        return {
            ...achievement,
            title: tierTitles[index] || achievement.title,
            description: `Own ${achievement.threshold} non-starter pets`,
        };
    }),
    ...buildCollectionTierDefinitions({
        prefix: "ships-owned",
        title: "Fleet Builder",
        description: "Own non-starter ships",
        metric: "ships_owned_excluding_starters",
        badgeImages: [
            "/images/achievements/ships1.hangarhand.10.png",
            "/images/achievements/ships2.dockyardarchitect.20.png",
            "/images/achievements/ships3.starshipsyndicate.30.png",
            "/images/achievements/ships4.armadaascendant.40.png",
        ],
    }).map((achievement, index) => {
        const tierTitles = ["Hangar Hand", "Dockyard Architect", "Starship Syndicate", "Armada Ascendant"];
        return {
            ...achievement,
            title: tierTitles[index] || achievement.title,
            description: `Own ${achievement.threshold} non-starter ships`,
        };
    }),
    ...buildCollectionTierDefinitions({
        prefix: "avatars-owned",
        title: "Avatar Curator",
        description: "Own non-starter avatars",
        metric: "avatars_owned_excluding_starters",
        badgeImages: [
            "/images/achievements/avatar1.maskmaker.10.png",
            "/images/achievements/avatar2.personakeeper.20.png",
            "/images/achievements/avatar3.iconarchivist.30.png",
            "/images/achievements/avatar4.legendloomright.40.png",
        ],
    }).map((achievement, index) => {
        const tierTitles = ["Mask Maker", "Persona Keeper", "Icon Archivist", "Legend Loomright"];
        return {
            ...achievement,
            title: tierTitles[index] || achievement.title,
            description: `Own ${achievement.threshold} non-starter avatars`,
        };
    }),
    {
        id: "landed-planets-1",
        title: "First Touchdown",
        description: "Land on 1 planet (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: 1,
        tier: 1,
        badgeImage: "/images/achievements/planetexplorer.firsttouchdown.1.png",
    },
    {
        id: "landed-planets-4",
        title: "Orbit Hopper",
        description: "Land on 4 planets (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: 4,
        tier: 2,
        badgeImage: "/images/achievements/planetexplorer.orbithopper.4.png",
    },
    {
        id: "landed-planets-all",
        title: "Celestial Pathfinder",
        description: "Land on 8 planets (sun excluded)",
        category: "exploration",
        metric: "planets_landed_excluding_sun",
        threshold: 8,
        tier: 3,
        badgeImage: "/images/achievements/planetexplorer.celestialpathfinder.8.png",
    },
    ...buildRarityTierDefinitions({
        prefix: "rarity-common",
        title: "Common Collector",
        metric: "common_collectibles_owned",
    }),
    ...buildRarityTierDefinitions({
        prefix: "rarity-uncommon",
        title: "Uncommon Collector",
        metric: "uncommon_collectibles_owned",
    }),
    ...buildRarityTierDefinitions({
        prefix: "rarity-rare",
        title: "Rare Collector",
        metric: "rare_collectibles_owned",
    }),
    ...buildRarityTierDefinitions({
        prefix: "rarity-extremely-rare",
        title: "Extremely Rare Collector",
        metric: "extremely_rare_collectibles_owned",
    }),
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
    const xpUnlockProgress = normalizeXpUnlockProgressMap((userData as any)?.xpUnlockProgress || {});
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
        if (isXpUnlockEarned({
            progress: xpUnlockProgress,
            planetId,
            unlockKey: rule.unlockKey,
            domain: "ship",
            requiredXP,
            currentPlanetXP,
        })) {
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
    const xpUnlockProgress = normalizeXpUnlockProgressMap((userData as any)?.xpUnlockProgress || {});
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
        if (isXpUnlockEarned({
            progress: xpUnlockProgress,
            planetId,
            unlockKey: rule.unlockKey,
            domain: "avatar",
            requiredXP,
            currentPlanetXP,
        })) {
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
    shopItemRarities,
}: {
    userData: UserData;
    unlockConfig: UnlockConfig;
    planetShipUnlocks: PlanetUnlockMap;
    planetAvatarUnlocks: PlanetUnlockMap;
    shopItemRarities?: Record<string, string | CollectibleRarity>;
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

    const rarityCounts: Record<CollectibleRarity, number> = {
        common: 0,
        uncommon: 0,
        rare: 0,
        "extremely-rare": 0,
    };

    const explicitEntityRarities = new Map<string, CollectibleRarity>();
    const shipCatalogIds = new Set(SHIP_OPTIONS.map((ship) => String(ship.id || "")));
    const avatarCatalogIds = new Set(AVATAR_OPTIONS.map((avatar) => String(avatar.id || "")));
    const explicitShipRarities = buildExplicitRarityRuleMap(unlockConfig.ships || [], shipCatalogIds, unlockConfig.idAliases || {});
    const explicitAvatarRarities = buildExplicitRarityRuleMap(unlockConfig.avatars || [], avatarCatalogIds, unlockConfig.idAliases || {});
    const normalizedShopRarities = normalizeShopRarityMap(shopItemRarities);

    Array.from(unlockedPetIds).forEach((petId) => {
        const pet = PET_OPTIONS.find((option) => option.id === petId);
        const rarity = pet ? resolveCatalogRarity(pet.rarity) : null;
        const entityKey = toEntityKey("pets", String(petId || ""));
        if (rarity && entityKey) explicitEntityRarities.set(entityKey, rarity);
    });

    Array.from(unlockedShipIds).forEach((shipId) => {
        const normalizedShipId = String(shipId || "").trim();
        const rarity = explicitShipRarities.get(normalizedShipId);
        const entityKey = toEntityKey("ships", normalizedShipId);
        if (rarity && entityKey) explicitEntityRarities.set(entityKey, rarity);
    });

    Array.from(unlockedAvatarIds).forEach((avatarId) => {
        const normalizedAvatarId = String(avatarId || "").trim();
        const rarity = explicitAvatarRarities.get(normalizedAvatarId);
        const entityKey = toEntityKey("avatars", normalizedAvatarId);
        if (rarity && entityKey) explicitEntityRarities.set(entityKey, rarity);
    });

    Object.entries(normalizedShopRarities).forEach(([shopItemId, rarity]) => {
        if (!(userData.purchasedShopItemIds || []).some((id) => normalizeShopItemId(id) === shopItemId)) return;

        const [rawCategory, ...rest] = shopItemId.split("/");
        const category = String(rawCategory || "").trim().toLowerCase();
        const nestedId = rest.join("/").trim();
        if (!category || !nestedId) return;

        const entityKey = toEntityKey(category, nestedId);
        if (!entityKey) return;
        // Shop-configured rarity should be authoritative for purchased shop finds.
        explicitEntityRarities.set(entityKey, rarity);
    });

    explicitEntityRarities.forEach((rarity) => {
        rarityCounts[rarity] += 1;
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
        common_collectibles_owned: Math.max(0, rarityCounts.common),
        uncommon_collectibles_owned: Math.max(0, rarityCounts.uncommon),
        rare_collectibles_owned: Math.max(0, rarityCounts.rare),
        extremely_rare_collectibles_owned: Math.max(0, rarityCounts["extremely-rare"]),
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
