import { UserData } from "@/types";
import collectiblesCatalog from "@/data/collectibles/catalog.json";

export interface PetOption {
    id: string;
    name: string;
    emoji: string;
    imageSrc?: string;
    unlockPlanetId?: string;
    unlockHint?: string;
    starter: boolean;
}

export const GALAXY_CAT_PET_ID = "galaxycatpet";
export const GALAXY_CAT_CHANCE_DENOMINATOR = 1000;
export const TESTING_PUDDLE_PUP_ID = "puddlepup";
export const TESTING_PUDDLE_PUP_CHANCE_DENOMINATOR = 20;

const PET_EMOJI_FALLBACKS: Record<string, string> = {
    batpet: "🦇",
    mothpet: "🦋",
    otterpet: "🦦",
    snakepet: "🐍",
    [GALAXY_CAT_PET_ID]: "🐱",
    [TESTING_PUDDLE_PUP_ID]: "🐶",
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

const catalogPetItems = ((collectiblesCatalog as any)?.items || [])
    .filter((item: CatalogItem) => item.type === "pet" && item.active !== false)
    .map((item: CatalogItem): PetOption => ({
        id: item.id,
        name: item.name,
        emoji: PET_EMOJI_FALLBACKS[item.id] || "🐾",
        imageSrc: item.asset,
        starter: Boolean((item.tags || []).includes("starter")),
        unlockPlanetId: item.id === GALAXY_CAT_PET_ID ? "neptune" : undefined,
        unlockHint:
            item.id === GALAXY_CAT_PET_ID
                ? `Gain XP while orbiting Neptune (${GALAXY_CAT_CHANCE_DENOMINATOR.toLocaleString()}-to-1 chance)`
                : item.id === TESTING_PUDDLE_PUP_ID
                    ? `Testing drop: Gain XP on any planet (${TESTING_PUDDLE_PUP_CHANCE_DENOMINATOR.toLocaleString()}-to-1 chance)`
                    : undefined,
    }));

export const PET_OPTIONS: PetOption[] = catalogPetItems.length > 0 ? catalogPetItems : [
    { id: "batpet", name: "Space Bat", emoji: "🦇", imageSrc: "/images/collectibles/pets/common/batpet.png", starter: true },
    { id: "mothpet", name: "Cosmic Moth", emoji: "🦋", imageSrc: "/images/collectibles/pets/common/mothpet.png", starter: true },
    { id: "otterpet", name: "Orbit Otter", emoji: "🦦", imageSrc: "/images/collectibles/pets/common/otterpet.png", starter: true },
    { id: "snakepet", name: "Nebula Snake", emoji: "🐍", imageSrc: "/images/collectibles/pets/common/snakepet.png", starter: true },
];

export const STARTER_PET_IDS = PET_OPTIONS.filter((pet) => pet.starter).map((pet) => pet.id);
export const DEFAULT_PET_ID = STARTER_PET_IDS[0] || PET_OPTIONS[0].id;

export const PLANET_PET_UNLOCKS = PET_OPTIONS.reduce<Record<string, string[]>>((acc, pet) => {
    if (!pet.unlockPlanetId) return acc;
    const planetId = pet.unlockPlanetId.toLowerCase();
    const current = acc[planetId] || [];
    acc[planetId] = [...current, pet.id];
    return acc;
}, {});

export const getUnlockPetIdsForPlanet = (planetId?: string | null): string[] => {
    if (!planetId) return [];
    return PLANET_PET_UNLOCKS[planetId.toLowerCase()] || [];
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
    }
    return PET_OPTIONS.find((pet) => pet.id === DEFAULT_PET_ID) || PET_OPTIONS[0];
};
