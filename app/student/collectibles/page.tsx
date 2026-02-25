"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getAssetPath } from "@/lib/utils";
import { PLANETS } from "@/types";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { resolveShipAssetPath, SHIP_OPTIONS } from "@/lib/ships";
import {
    DEFAULT_UNLOCK_CONFIG,
    getXpUnlockRules,
    normalizeUnlockConfig,
    resolveRuntimeUnlockId,
    type UnlockChannel,
    type UnlockRule,
} from "@/lib/unlocks";
import {
    DEFAULT_PET_UNLOCK_CHANCE_CONFIG,
    getEffectiveUnlockedPetIds,
    normalizePetUnlockAssignments,
    normalizePetUnlockChanceConfig,
    PET_OPTIONS,
    type PetUnlockAssignment,
    type PetUnlockChanceConfig,
} from "@/lib/pets";

type EntryType = "ship" | "avatar" | "pet";

type BookEntry = {
    id: string;
    runtimeId: string;
    type: EntryType;
    name: string;
    planetKey: string;
    earnedBy: string;
    imagePath?: string;
    unlocked: boolean;
};

type PlanetUnlockMap = Record<string, Record<string, number>>;

const PLANET_IDS = PLANETS.filter((planet) => planet.id !== "sun").map((planet) => planet.id);
const PLANET_NAME_MAP = PLANETS.reduce<Record<string, string>>((map, planet) => {
    map[planet.id] = planet.name;
    return map;
}, {});

const TYPE_LABELS: Record<EntryType, string> = {
    ship: "Ship",
    avatar: "Avatar",
    pet: "Pet",
};

const TYPE_ORDER: EntryType[] = ["ship", "avatar", "pet"];

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const readPlanetXpValue = (planetXP: Record<string, number> | undefined, planetId: string) => {
    const normalizedPlanetId = normalizePlanetId(planetId);
    if (!normalizedPlanetId) return 0;

    const exact = Number(planetXP?.[normalizedPlanetId] || 0);
    if (exact > 0) return exact;

    const fallbackEntry = Object.entries(planetXP || {}).find(([key]) => normalizePlanetId(key) === normalizedPlanetId);
    return Number(fallbackEntry?.[1] || 0);
};

const toTitleCase = (value: string) => {
    return value
        .split("-")
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
        .join(" ");
};

const getPlanetKeyFromRuntimeId = (runtimeId: string) => {
    const [prefix] = String(runtimeId || "").toLowerCase().split("-");
    return PLANET_IDS.includes(prefix) ? prefix : "any";
};

const formatDropLabel = (rarity?: string) => {
    const normalized = String(rarity || "").trim().toLowerCase();
    if (!normalized) return "Chance Drop";
    return `${toTitleCase(normalized)} Drop`;
};

const getPurchasedShopIdsByCategory = (purchasedShopItemIds: string[] | undefined, category: string) => {
    const prefix = `${category}/`;
    return (purchasedShopItemIds || [])
        .filter((itemId) => String(itemId || "").toLowerCase().startsWith(prefix))
        .map((itemId) => String(itemId || "").split("/").pop() || "")
        .filter(Boolean);
};

const getRuleEarnedBy = ({
    rule,
    requiredXP,
}: {
    rule: UnlockRule;
    requiredXP: number;
}) => {
    const channel = String(rule.channel || "xp").toLowerCase() as UnlockChannel;

    if (channel === "starter") return "Starter Collectible";
    if (channel === "shop") return "Purchase in Shop";
    if (channel === "chance") return formatDropLabel(rule.rarity);

    if (requiredXP > 0) {
        return `XP Unlock at ${requiredXP.toLocaleString()} XP`;
    }
    return "XP Unlock";
};

export default function StudentCollectiblesBookPage() {
    const { userData } = useAuth();

    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
    const [planetShipUnlocks, setPlanetShipUnlocks] = useState<PlanetUnlockMap>({});
    const [planetAvatarUnlocks, setPlanetAvatarUnlocks] = useState<PlanetUnlockMap>({});
    const [petUnlockAssignments, setPetUnlockAssignments] = useState<Record<string, PetUnlockAssignment>>({});
    const [petUnlockChanceConfig, setPetUnlockChanceConfig] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
            setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "collectibles"), (snapshot) => {
            const raw = (snapshot.data() as any) || {};
            setPetUnlockAssignments(normalizePetUnlockAssignments(raw?.petUnlockAssignments || null));
            setPetUnlockChanceConfig(normalizePetUnlockChanceConfig(raw?.petUnlockChances || null));
        });

        return () => unsub();
    }, []);

    useEffect(() => {
        const teacherId = userData?.role === "student" ? userData?.teacherId : userData?.uid;
        if (!teacherId) {
            setPlanetShipUnlocks({});
            setPlanetAvatarUnlocks({});
            return;
        }

        const unsub = onSnapshot(doc(db, `users/${teacherId}/planets`, "unlocks"), (snapshot) => {
            const data = (snapshot.data() as any) || {};
            setPlanetShipUnlocks((data?.ships || {}) as PlanetUnlockMap);
            setPlanetAvatarUnlocks((data?.avatars || {}) as PlanetUnlockMap);
        });

        return () => unsub();
    }, [userData?.role, userData?.teacherId, userData?.uid]);

    const shipCatalogIds = useMemo(() => new Set(SHIP_OPTIONS.map((ship) => ship.id)), []);
    const avatarCatalogIds = useMemo(() => new Set(AVATAR_OPTIONS.map((avatar) => avatar.id)), []);

    const unlockedShipIds = useMemo(() => {
        const idAliases = unlockConfig.idAliases;
        const unlocked = new Set<string>();

        (unlockConfig.starters?.ships || []).forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, shipCatalogIds));
        });

        getPurchasedShopIdsByCategory(userData?.purchasedShopItemIds, "ships").forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(id, idAliases, shipCatalogIds));
        });

        (userData?.shopUnlockedShipIds || []).forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, shipCatalogIds));
        });

        unlocked.add(String(userData?.spaceship?.modelId || userData?.spaceship?.id || "finalship"));

        getXpUnlockRules(unlockConfig.ships || []).forEach((rule) => {
            const planetId = normalizePlanetId(rule.planetId);
            const requiredXP = Number(planetShipUnlocks?.[planetId]?.[rule.unlockKey] || 0);
            const currentPlanetXP = readPlanetXpValue(userData?.planetXP as Record<string, number> | undefined, planetId);
            if (requiredXP > 0 && currentPlanetXP >= requiredXP) {
                unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, shipCatalogIds));
            }
        });

        return unlocked;
    }, [planetShipUnlocks, shipCatalogIds, unlockConfig.idAliases, unlockConfig.ships, unlockConfig.starters?.ships, userData?.planetXP, userData?.purchasedShopItemIds, userData?.shopUnlockedShipIds, userData?.spaceship?.id, userData?.spaceship?.modelId]);

    const unlockedAvatarIds = useMemo(() => {
        const idAliases = unlockConfig.idAliases;
        const unlocked = new Set<string>();

        (unlockConfig.starters?.avatars || []).forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds));
        });

        getPurchasedShopIdsByCategory(userData?.purchasedShopItemIds, "avatars").forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(id, idAliases, avatarCatalogIds));
        });

        (userData?.shopUnlockedAvatarIds || []).forEach((id) => {
            unlocked.add(resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds));
        });

        unlocked.add(String(userData?.avatar?.avatarId || "bunny"));

        getXpUnlockRules(unlockConfig.avatars || []).forEach((rule) => {
            const planetId = normalizePlanetId(rule.planetId);
            const requiredXP = Number(planetAvatarUnlocks?.[planetId]?.[rule.unlockKey] || 0);
            const currentPlanetXP = readPlanetXpValue(userData?.planetXP as Record<string, number> | undefined, planetId);
            if (requiredXP > 0 && currentPlanetXP >= requiredXP) {
                unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, avatarCatalogIds));
            }
        });

        return unlocked;
    }, [avatarCatalogIds, planetAvatarUnlocks, unlockConfig.avatars, unlockConfig.idAliases, unlockConfig.starters?.avatars, userData?.avatar?.avatarId, userData?.planetXP, userData?.purchasedShopItemIds, userData?.shopUnlockedAvatarIds]);

    const unlockedPetIds = useMemo(() => {
        const unlocked = getEffectiveUnlockedPetIds(userData || null);
        getPurchasedShopIdsByCategory(userData?.purchasedShopItemIds, "pets").forEach((petId) => unlocked.add(petId));
        return unlocked;
    }, [userData]);

    const entries = useMemo(() => {
        const merged = new Map<string, BookEntry>();
        const idAliases = unlockConfig.idAliases;

        const put = (entry: BookEntry) => {
            const key = `${entry.type}:${entry.runtimeId}`;
            if (!merged.has(key)) {
                merged.set(key, entry);
            }
        };

        unlockConfig.ships.forEach((rule) => {
            const runtimeId = resolveRuntimeUnlockId(rule.id, idAliases, shipCatalogIds);
            const shipOption = SHIP_OPTIONS.find((ship) => ship.id === runtimeId);
            const planetId = normalizePlanetId(rule.planetId) || getPlanetKeyFromRuntimeId(runtimeId);
            const requiredXP = Number(planetShipUnlocks?.[planetId]?.[rule.unlockKey] || 0);

            put({
                id: rule.id,
                runtimeId,
                type: "ship",
                name: String(rule.name || shipOption?.name || runtimeId),
                planetKey: PLANET_IDS.includes(planetId) ? planetId : "any",
                earnedBy: getRuleEarnedBy({ rule, requiredXP }),
                imagePath: shipOption?.assetPath || resolveShipAssetPath(runtimeId),
                unlocked: unlockedShipIds.has(runtimeId),
            });
        });

        (unlockConfig.starters?.ships || []).forEach((starterId) => {
            const runtimeId = resolveRuntimeUnlockId(String(starterId || ""), idAliases, shipCatalogIds);
            const shipOption = SHIP_OPTIONS.find((ship) => ship.id === runtimeId);

            put({
                id: runtimeId,
                runtimeId,
                type: "ship",
                name: String(shipOption?.name || runtimeId),
                planetKey: "any",
                earnedBy: "Starter Collectible",
                imagePath: shipOption?.assetPath || resolveShipAssetPath(runtimeId),
                unlocked: unlockedShipIds.has(runtimeId),
            });
        });

        unlockConfig.avatars.forEach((rule) => {
            const runtimeId = resolveRuntimeUnlockId(rule.id, idAliases, avatarCatalogIds);
            const avatarOption = AVATAR_OPTIONS.find((avatar) => avatar.id === runtimeId);
            const planetId = normalizePlanetId(rule.planetId) || getPlanetKeyFromRuntimeId(runtimeId);
            const requiredXP = Number(planetAvatarUnlocks?.[planetId]?.[rule.unlockKey] || 0);

            put({
                id: rule.id,
                runtimeId,
                type: "avatar",
                name: String(rule.name || avatarOption?.name || runtimeId),
                planetKey: PLANET_IDS.includes(planetId) ? planetId : "any",
                earnedBy: getRuleEarnedBy({ rule, requiredXP }),
                imagePath: avatarOption?.src,
                unlocked: unlockedAvatarIds.has(runtimeId),
            });
        });

        (unlockConfig.starters?.avatars || []).forEach((starterId) => {
            const runtimeId = resolveRuntimeUnlockId(String(starterId || ""), idAliases, avatarCatalogIds);
            const avatarOption = AVATAR_OPTIONS.find((avatar) => avatar.id === runtimeId);

            put({
                id: runtimeId,
                runtimeId,
                type: "avatar",
                name: String(avatarOption?.name || runtimeId),
                planetKey: "any",
                earnedBy: "Starter Collectible",
                imagePath: avatarOption?.src,
                unlocked: unlockedAvatarIds.has(runtimeId),
            });
        });

        PET_OPTIONS.forEach((pet) => {
            const normalizedPetId = String(pet.id || "").trim().toLowerCase();
            const assignment = petUnlockAssignments[normalizedPetId];

            const method = assignment?.method || (pet.starter ? "starter" : "chance");
            const scope = assignment?.scope || (pet.unlockPlanetId ? "planet" : "any");
            const rarity = assignment?.rarity || pet.rarity;

            const planetId = scope === "planet"
                ? normalizePlanetId(assignment?.planetId || pet.unlockPlanetId)
                : "any";

            let earnedBy = "Not yet assigned";
            if (method === "starter") earnedBy = "Starter Collectible";
            if (method === "shop") earnedBy = "Purchase in Shop";
            if (method === "chance") {
                const dropLabel = formatDropLabel(rarity);
                if (rarity === "testing") {
                    const denominator = Number(petUnlockChanceConfig.testing || 0);
                    earnedBy = denominator > 0
                        ? `Testing Drop (1 in ${denominator.toLocaleString()})`
                        : "Testing Drop";
                } else {
                    earnedBy = dropLabel;
                }
            }

            put({
                id: normalizedPetId,
                runtimeId: normalizedPetId,
                type: "pet",
                name: String(pet.name || normalizedPetId),
                planetKey: PLANET_IDS.includes(planetId) ? planetId : "any",
                earnedBy,
                imagePath: pet.imageSrc,
                unlocked: unlockedPetIds.has(normalizedPetId),
            });
        });

        return Array.from(merged.values()).sort((left, right) => {
            const leftTypeIndex = TYPE_ORDER.indexOf(left.type);
            const rightTypeIndex = TYPE_ORDER.indexOf(right.type);
            if (leftTypeIndex !== rightTypeIndex) return leftTypeIndex - rightTypeIndex;
            return left.name.localeCompare(right.name);
        });
    }, [avatarCatalogIds, petUnlockAssignments, petUnlockChanceConfig.testing, planetAvatarUnlocks, planetShipUnlocks, shipCatalogIds, unlockConfig.avatars, unlockConfig.idAliases, unlockConfig.ships, unlockConfig.starters?.avatars, unlockConfig.starters?.ships, unlockedAvatarIds, unlockedPetIds, unlockedShipIds]);

    const entriesByPlanet = useMemo(() => {
        const map = new Map<string, BookEntry[]>();
        [...PLANET_IDS, "any"].forEach((planetId) => map.set(planetId, []));

        entries.forEach((entry) => {
            const key = PLANET_IDS.includes(entry.planetKey) ? entry.planetKey : "any";
            map.get(key)?.push(entry);
        });

        return map;
    }, [entries]);

    const sectionOrder = useMemo(() => [...PLANET_IDS, "any"], []);

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
                <div className="border border-cyan-500/30 bg-black/40 rounded-2xl p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Collectibles Book</h1>
                            <p className="text-cyan-600 text-xs uppercase tracking-wider mt-1">Planet-by-planet collectible encyclopedia</p>
                        </div>
                        <Link href="/student/studentnavigation" className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold">
                            Back
                        </Link>
                    </div>

                    <p className="text-xs text-cyan-500 mb-3">
                        Locked collectibles show a question mark. Unlock requirements update automatically from your class configuration.
                    </p>
                </div>

                {sectionOrder.map((planetId) => {
                    const planetEntries = entriesByPlanet.get(planetId) || [];
                    if (planetEntries.length === 0) return null;

                    const sectionTitle = planetId === "any" ? "Any Planet / Global" : (PLANET_NAME_MAP[planetId] || toTitleCase(planetId));

                    return (
                        <section key={planetId} className="border border-cyan-500/20 bg-black/40 rounded-2xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <h2 className="text-lg font-bold uppercase tracking-wider text-white">{sectionTitle}</h2>
                                <div className="text-[11px] text-cyan-500 uppercase tracking-wider">{planetEntries.length} items</div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {planetEntries.map((entry) => (
                                    <article key={`${entry.type}:${entry.runtimeId}`} className="border border-cyan-700/40 bg-cyan-950/10 rounded-xl p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-[10px] uppercase tracking-widest text-cyan-500">{TYPE_LABELS[entry.type]}</span>
                                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${entry.unlocked ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/40 text-amber-300"}`}>
                                                {entry.unlocked ? "Unlocked" : "Locked"}
                                            </span>
                                        </div>

                                        <div className="mt-2 h-20 rounded-lg border border-cyan-900/50 bg-black/40 flex items-center justify-center overflow-hidden">
                                            {entry.unlocked && entry.imagePath ? (
                                                <img src={getAssetPath(entry.imagePath)} alt={entry.name} className="max-h-full max-w-full object-contain" />
                                            ) : (
                                                <span className="text-3xl font-black text-cyan-500/70">?</span>
                                            )}
                                        </div>

                                        <div className="mt-3">
                                            <div className="text-sm font-bold text-white leading-tight">{entry.name}</div>
                                            <div className="text-xs text-cyan-500 mt-1">{entry.earnedBy}</div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
