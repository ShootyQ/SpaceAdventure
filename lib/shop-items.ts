import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { PET_OPTIONS } from "@/lib/pets";
import { SHIP_OPTIONS } from "@/lib/ships";

const KNOWN_SHOP_CATEGORIES = new Set(["avatars", "objects", "pets", "ships", "flags"]);

const normalizeValue = (value: string) => String(value || "").trim().toLowerCase();

const normalizePathValue = (value: string) => normalizeValue(value).replace(/\\/g, "/").split(/[?#]/)[0];

const getPathStem = (value: string) => {
    const normalized = normalizePathValue(value);
    const lastSegment = normalized.split("/").pop() || normalized;
    return lastSegment.replace(/\.[^.]+$/g, "");
};

export const normalizeShopPetId = (petId: string) =>
    normalizeValue(petId)
        .replace(/\.[^.]+$/g, "")
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");

const buildCatalogLookup = (entries: Array<{ id: string; assetPath?: string }>) => {
    const byAssetPath = new Map<string, string>();
    const byToken = new Map<string, string>();

    entries.forEach((entry) => {
        const normalizedId = normalizeValue(entry.id);
        if (!normalizedId) return;

        byToken.set(normalizedId, normalizedId);

        const normalizedAssetPath = normalizePathValue(entry.assetPath || "");
        if (normalizedAssetPath) {
            byAssetPath.set(normalizedAssetPath, normalizedId);

            const stem = getPathStem(normalizedAssetPath);
            if (stem) byToken.set(stem, normalizedId);
        }
    });

    return { byAssetPath, byToken };
};

const avatarLookup = buildCatalogLookup(AVATAR_OPTIONS.map((avatar) => ({ id: avatar.id, assetPath: avatar.src })));
const petLookup = buildCatalogLookup(PET_OPTIONS.map((pet) => ({ id: pet.id, assetPath: pet.imageSrc })));
const shipLookup = buildCatalogLookup(SHIP_OPTIONS.map((ship) => ({ id: ship.id, assetPath: ship.assetPath })));

const getLookupForCategory = (category: string) => {
    const normalizedCategory = normalizeValue(category);
    if (normalizedCategory === "avatars") return avatarLookup;
    if (normalizedCategory === "pets") return petLookup;
    if (normalizedCategory === "ships") return shipLookup;
    return null;
};

export const resolveCanonicalShopUnlockId = ({
    category,
    rawId,
    imagePath,
}: {
    category: string;
    rawId: string;
    imagePath?: string;
}) => {
    const normalizedCategory = normalizeValue(category);
    const normalizedRawId = normalizePathValue(rawId);
    const lookup = getLookupForCategory(normalizedCategory);

    if (lookup) {
        const assetMatch = lookup.byAssetPath.get(normalizePathValue(imagePath || ""));
        if (assetMatch) return assetMatch;

        const rawToken = normalizedRawId.split("/").pop() || normalizedRawId;
        const rawStem = getPathStem(rawToken);

        const directMatch = lookup.byToken.get(rawToken) || lookup.byToken.get(rawStem);
        if (directMatch) return directMatch;
    }

    if (normalizedCategory === "pets") return normalizeShopPetId(normalizedRawId);
    return (normalizedRawId.split("/").pop() || normalizedRawId).replace(/\.[^.]+$/g, "");
};

export const getCanonicalShopItemId = ({
    category,
    rawId,
    imagePath,
}: {
    category: string;
    rawId: string;
    imagePath?: string;
}) => {
    const normalizedCategory = normalizeValue(category);
    const canonicalUnlockId = resolveCanonicalShopUnlockId({
        category: normalizedCategory,
        rawId,
        imagePath,
    });

    if (!normalizedCategory || !canonicalUnlockId) return "";
    return `${normalizedCategory}/${canonicalUnlockId}`;
};

export const canonicalizeShopItemId = (itemId: string, imagePath?: string) => {
    const normalizedItemId = normalizePathValue(itemId);
    if (!normalizedItemId) return "";

    const [rawCategory, ...rest] = normalizedItemId.split("/");
    const normalizedCategory = normalizeValue(rawCategory);
    const rawId = rest.join("/");

    if (!KNOWN_SHOP_CATEGORIES.has(normalizedCategory) || !rawId) return normalizedItemId;

    return getCanonicalShopItemId({
        category: normalizedCategory,
        rawId,
        imagePath,
    });
};