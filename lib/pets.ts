import { UserData } from "@/types";

export interface PetOption {
    id: string;
    name: string;
    emoji: string;
    imageSrc?: string;
    unlockPlanetId?: string;
    starter: boolean;
}

export const PET_OPTIONS: PetOption[] = [
    { id: "batpet", name: "Space Bat", emoji: "🦇", imageSrc: "/images/pets/batpet.png", starter: true },
    { id: "mothpet", name: "Cosmic Moth", emoji: "🦋", imageSrc: "/images/pets/mothpet.png", starter: true },
    { id: "otterpet", name: "Orbit Otter", emoji: "🦦", imageSrc: "/images/pets/otterpet.png", starter: true },
    { id: "snakepet", name: "Nebula Snake", emoji: "🐍", imageSrc: "/images/pets/snakepet.png", starter: true },
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
