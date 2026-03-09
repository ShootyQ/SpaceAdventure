import { NextResponse } from "next/server";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { PET_OPTIONS, normalizePetUnlockAssignments } from "@/lib/pets";
import { resolveShipAssetPath } from "@/lib/ships";
import { canonicalizeShopItemId, getCanonicalShopItemId } from "@/lib/shop-items";
import { normalizeUnlockConfig } from "@/lib/unlocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopItem = {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  price: number;
  rarity?: "common" | "uncommon" | "rare" | "extremely-rare";
};

type CollectibleRarity = "common" | "uncommon" | "rare" | "extremely-rare";

const SHOP_CONFIG_PATH = "game-config/shop";
const DEFAULT_PRICE = 100;
const SHOP_CATEGORIES = ["avatars", "objects", "pets", "ships"] as const;

const FILE_NAME_NAME_OVERRIDES: Record<string, string> = {
  slimepet: "Nebula Goo",
  skateboardsquirrell: "Kickflip Comet Squirrel",
};

const SHOP_FILE_SUFFIX_PATTERN = /([._-](avatar|pet))?[._-]shop$/i;
const SHOP_ROLE_SUFFIX_PATTERN = /[._-](avatar|pet)$/i;

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();

const normalizeNameFromFile = (fileName: string) => {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const cleanedStem = stem
    .replace(SHOP_FILE_SUFFIX_PATTERN, "")
    .replace(SHOP_ROLE_SUFFIX_PATTERN, "")
    .trim();
  const normalizedStem = cleanedStem.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  const override = FILE_NAME_NAME_OVERRIDES[normalizedStem];
  if (override) return override;
  const spaced = cleanedStem.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return toTitleCase(spaced) || "Unnamed Item";
};

const getUnlockIdFromShopItemId = (itemId: string) =>
  String(itemId || "")
    .trim()
    .toLowerCase()
    .split("/")
    .pop() || "";

const getKnownShopDisplayName = (category: string, itemId: string) => {
  const unlockId = getUnlockIdFromShopItemId(itemId);
  if (!unlockId) return "";

  if (category === "avatars") {
    return AVATAR_OPTIONS.find((avatar) => String(avatar.id || "").trim().toLowerCase() === unlockId)?.name || "";
  }

  if (category === "pets") {
    return PET_OPTIONS.find((pet) => String(pet.id || "").trim().toLowerCase() === unlockId)?.name || "";
  }

  return "";
};

const normalizeItemIdFromRelativePath = (relativeFilePath: string) => {
  const withoutExt = relativeFilePath.replace(/\.[^.]+$/, "");
  return withoutExt
    .replace(/\\/g, "/")
    .toLowerCase()
    .replace(/[^a-z0-9/._-]+/g, "-")
    .replace(/\/+$/g, "");
};

const normalizeCategoryRelativePath = (category: string, relativePath: string) => {
  const segments = String(relativePath || "").split("/").filter(Boolean);
  if (segments[0]?.toLowerCase() === category.toLowerCase()) {
    return segments.slice(1).join("/");
  }
  return relativePath;
};

const isImage = (fileName: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);

async function resolveShopAssetRoot() {
  const path = await import("node:path");
  return path.join(process.cwd(), "public", "images", "collectibles", "ships", "shop");
}

async function resolveCategoryShopRoot(category: string) {
  const path = await import("node:path");
  return path.join(process.cwd(), "public", "images", "collectibles", category, "shop");
}

async function getAdminDbSafe() {
  try {
    const firebaseAdmin = await import("@/lib/firebase-admin");
    return firebaseAdmin.adminDb;
  } catch (error) {
    console.error("Failed to load admin DB module:", error);
    return null;
  }
}

async function walkFiles(dir: string): Promise<string[]> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkFiles(fullPath);
      if (entry.isFile() && isImage(entry.name)) return [fullPath];
      return [] as string[];
    })
  );

  return nested.flat();
}

async function getConfiguredPrices(): Promise<Record<string, number>> {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) return {};

    const snapshot = await adminDb.doc(SHOP_CONFIG_PATH).get();
    if (!snapshot.exists) return {};

    const raw = (snapshot.data() as any)?.prices || {};
    const prices: Record<string, number> = {};

    Object.entries(raw).forEach(([itemId, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        const canonicalId = canonicalizeShopItemId(String(itemId || ""));
        if (!canonicalId) return;
        prices[canonicalId] = Math.max(0, Math.round(numeric));
      }
    });

    return prices;
  } catch (error) {
    console.error("Failed to read shop prices config; using defaults:", error);
    return {};
  }
}

async function getConfiguredRarities(): Promise<Record<string, CollectibleRarity>> {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) return {};

    const snapshot = await adminDb.doc(SHOP_CONFIG_PATH).get();
    if (!snapshot.exists) return {};

    const raw = (snapshot.data() as any)?.rarities || {};
    const rarities: Record<string, CollectibleRarity> = {};

    Object.entries(raw).forEach(([itemId, value]) => {
      const normalizedId = canonicalizeShopItemId(String(itemId || ""));
      const rarity = String(value || "").trim().toLowerCase();
      if (!normalizedId) return;
      if (rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare") {
        rarities[normalizedId] = rarity;
      }
    });

    return rarities;
  } catch (error) {
    console.error("Failed to read shop rarity config; using unassigned defaults:", error);
    return {};
  }
}

async function getConfiguredNameOverrides(): Promise<Record<string, string>> {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) return {};

    const snapshot = await adminDb.doc(SHOP_CONFIG_PATH).get();
    if (!snapshot.exists) return {};

    const raw = (snapshot.data() as any)?.nameOverrides || {};
    const names: Record<string, string> = {};

    Object.entries(raw).forEach(([itemId, value]) => {
      const normalizedId = canonicalizeShopItemId(String(itemId || ""));
      const nextName = String(value || "").trim();
      if (!normalizedId || !nextName) return;
      names[normalizedId] = nextName;
    });

    return names;
  } catch (error) {
    console.error("Failed to read shop name overrides config; using filename defaults:", error);
    return {};
  }
}

async function getUnlockConfigSafe() {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) return normalizeUnlockConfig(null);

    const snapshot = await adminDb.doc("game-config/unlocks").get();
    return normalizeUnlockConfig((snapshot.data() as any) || null);
  } catch (error) {
    console.error("Failed to read unlock config for shop inventory map:", error);
    return normalizeUnlockConfig(null);
  }
}

async function getCollectiblesConfigSafe() {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) return { petUnlockAssignments: {}, petNameOverrides: {} };

    const snapshot = await adminDb.doc("game-config/collectibles").get();
    const raw = (snapshot.data() as any) || {};

    const petUnlockAssignments = normalizePetUnlockAssignments(raw?.petUnlockAssignments || null);
    const rawNameOverrides = raw?.petNameOverrides || {};
    const petNameOverrides: Record<string, string> = {};

    Object.entries(rawNameOverrides).forEach(([petId, value]) => {
      const normalizedId = String(petId || "").trim().toLowerCase();
      const nextName = String(value || "").trim();
      if (!normalizedId || !nextName) return;
      petNameOverrides[normalizedId] = nextName;
    });

    return { petUnlockAssignments, petNameOverrides };
  } catch (error) {
    console.error("Failed to read collectibles config for shop inventory map:", error);
    return { petUnlockAssignments: {}, petNameOverrides: {} };
  }
}

async function getDiscoveredShopItems(): Promise<ShopItem[]> {
  const path = await import("node:path");
  const [configuredPrices, configuredNameOverrides, configuredRarities, unlockConfig, collectiblesConfig, legacyRoot, categoryRoots] = await Promise.all([
    getConfiguredPrices(),
    getConfiguredNameOverrides(),
    getConfiguredRarities(),
    getUnlockConfigSafe(),
    getCollectiblesConfigSafe(),
    resolveShopAssetRoot(),
    Promise.all(SHOP_CATEGORIES.map((category) => resolveCategoryShopRoot(category))),
  ]);

  const [legacyFiles, categoryFilesGrouped] = await Promise.all([
    walkFiles(legacyRoot),
    Promise.all(categoryRoots.map((root) => walkFiles(root))),
  ]);

  const dedupe = new Set<string>();
  const items: ShopItem[] = [];

  categoryFilesGrouped.forEach((files, index) => {
    const category = SHOP_CATEGORIES[index];
    const root = categoryRoots[index];

    files.forEach((absolutePath) => {
      const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
      if (!relativePath) return;

      const normalizedRelativePath = normalizeCategoryRelativePath(category, relativePath);

      const imagePath = `/images/collectibles/${category}/shop/${relativePath}`;
      const id = canonicalizeShopItemId(normalizeItemIdFromRelativePath(`${category}/${normalizedRelativePath}`), imagePath);
      const legacyId = canonicalizeShopItemId(normalizeItemIdFromRelativePath(`${category}/${relativePath}`), imagePath);
      if (dedupe.has(id)) return;
      dedupe.add(id);

      const nameFromFile = normalizeNameFromFile((normalizedRelativePath || relativePath).split("/").pop() || relativePath);
      const knownName = getKnownShopDisplayName(category, id) || getKnownShopDisplayName(category, legacyId);
      const name = configuredNameOverrides[id] ?? configuredNameOverrides[legacyId] ?? knownName ?? nameFromFile;
      const configuredPrice = configuredPrices[id] ?? configuredPrices[legacyId];
      const configuredRarity = configuredRarities[id] ?? configuredRarities[legacyId];

      items.push({
        id,
        name,
        category,
        imagePath,
        price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
        rarity: configuredRarity,
      });
    });
  });

  legacyFiles.forEach((absolutePath) => {
    const relativePath = path.relative(legacyRoot, absolutePath).replace(/\\/g, "/");
    if (!relativePath) return;

    const segments = relativePath.split("/").filter(Boolean);
    const categoryCandidate = String(segments[0] || "").toLowerCase();
    const category = SHOP_CATEGORIES.includes(categoryCandidate as (typeof SHOP_CATEGORIES)[number])
      ? categoryCandidate
      : "misc";

    const normalizedRelative = category !== "misc"
      ? normalizeCategoryRelativePath(category, segments.slice(1).join("/"))
      : relativePath;
    const imagePath = `/images/collectibles/ships/shop/${relativePath}`;
    const id = canonicalizeShopItemId(normalizeItemIdFromRelativePath(`${category}/${normalizedRelative}`), imagePath);
    if (dedupe.has(id)) return;
    dedupe.add(id);

    const nameFromFile = normalizeNameFromFile((normalizedRelative || relativePath).split("/").pop() || relativePath);
    const legacyId = canonicalizeShopItemId(normalizeItemIdFromRelativePath(`${category}/${segments.slice(1).join("/")}`), imagePath);
    const knownName = getKnownShopDisplayName(category, id) || getKnownShopDisplayName(category, legacyId);
    const name = configuredNameOverrides[id] ?? configuredNameOverrides[legacyId] ?? knownName ?? nameFromFile;
    const configuredPrice = configuredPrices[id] ?? configuredPrices[legacyId];
    const configuredRarity = configuredRarities[id] ?? configuredRarities[legacyId];

    items.push({
      id,
      name,
      category,
      imagePath,
      price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
      rarity: configuredRarity,
    });
  });

  const addConfigShopItem = ({
    category,
    unlockId,
    displayName,
    imagePath,
  }: {
    category: "ships" | "avatars" | "pets";
    unlockId: string;
    displayName: string;
    imagePath: string;
  }) => {
    const normalizedUnlockId = String(unlockId || "").trim().toLowerCase();
    if (!normalizedUnlockId) return;

    const id = getCanonicalShopItemId({ category, rawId: normalizedUnlockId, imagePath });
    if (dedupe.has(id)) return;
    dedupe.add(id);

    const configuredPrice = configuredPrices[id];
    const configuredName = configuredNameOverrides[id];
    const configuredRarity = configuredRarities[id];

    items.push({
      id,
      name: configuredName || String(displayName || normalizedUnlockId),
      category,
      imagePath,
      price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
      rarity: configuredRarity,
    });
  };

  (unlockConfig.ships || []).forEach((rule) => {
    if (String(rule.channel || "").toLowerCase() !== "shop") return;
    const unlockId = String(rule.unlockKey || rule.id || "").trim();
    addConfigShopItem({
      category: "ships",
      unlockId,
      displayName: String(rule.name || unlockId),
      imagePath: resolveShipAssetPath(unlockId),
    });
  });

  (unlockConfig.avatars || []).forEach((rule) => {
    if (String(rule.channel || "").toLowerCase() !== "shop") return;
    const unlockId = String(rule.unlockKey || rule.id || "").trim();
    const avatarOption = AVATAR_OPTIONS.find((avatar) => avatar.id === unlockId || avatar.id === String(rule.id || "").trim());
    addConfigShopItem({
      category: "avatars",
      unlockId,
      displayName: String(rule.name || avatarOption?.name || unlockId),
      imagePath: String(avatarOption?.src || `/images/collectibles/avatars/shop/${unlockId}.png`),
    });
  });

  Object.entries(collectiblesConfig.petUnlockAssignments || {}).forEach(([petId, assignment]) => {
    if (String((assignment as any)?.method || "").toLowerCase() !== "shop") return;

    const normalizedPetId = String(petId || "").trim().toLowerCase();
    if (!normalizedPetId) return;

    const petOption = PET_OPTIONS.find((pet) => String(pet.id || "").trim().toLowerCase() === normalizedPetId);
    addConfigShopItem({
      category: "pets",
      unlockId: normalizedPetId,
      displayName: String(collectiblesConfig.petNameOverrides?.[normalizedPetId] || petOption?.name || normalizedPetId),
      imagePath: String(petOption?.imageSrc || `/images/collectibles/pets/shop/${normalizedPetId}.png`),
    });
  });

  return items.sort((a, b) => {
    const categoryDiff = a.category.localeCompare(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function GET() {
  try {
    const items = await getDiscoveredShopItems();
    return NextResponse.json({ items, defaultPrice: DEFAULT_PRICE });
  } catch (error) {
    console.error("Failed to load shop items:", error);
    return NextResponse.json({ error: "Failed to load shop items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminDb = await getAdminDbSafe();
    if (!adminDb) {
      return NextResponse.json({ error: "Shop pricing backend unavailable" }, { status: 503 });
    }

    const body = await request.json();
    const rawPrices = (body as any)?.prices || {};
    const rawRarities = (body as any)?.rarities || {};

    const sanitizedPrices: Record<string, number> = {};
    Object.entries(rawPrices).forEach(([itemId, value]) => {
      const normalizedId = String(itemId || "").trim().toLowerCase();
      if (!normalizedId) return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      sanitizedPrices[normalizedId] = Math.max(0, Math.round(numeric));
    });

    const sanitizedRarities: Record<string, CollectibleRarity> = {};
    Object.entries(rawRarities).forEach(([itemId, value]) => {
      const normalizedId = String(itemId || "").trim().toLowerCase();
      const rarity = String(value || "").trim().toLowerCase();
      if (!normalizedId) return;
      if (rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare") {
        sanitizedRarities[normalizedId] = rarity;
      }
    });

    await adminDb.doc(SHOP_CONFIG_PATH).set(
      {
        prices: sanitizedPrices,
        rarities: sanitizedRarities,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save shop prices:", error);
    return NextResponse.json({ error: "Failed to save shop prices" }, { status: 500 });
  }
}
