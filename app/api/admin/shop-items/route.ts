import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopItem = {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  price: number;
};

const SHOP_CONFIG_PATH = "game-config/shop";
const DEFAULT_PRICE = 100;
const SHOP_CATEGORIES = ["avatars", "objects", "pets", "ships"] as const;

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();

const normalizeNameFromFile = (fileName: string) => {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const spaced = stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return toTitleCase(spaced) || "Unnamed Item";
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
        prices[itemId] = Math.max(0, Math.round(numeric));
      }
    });

    return prices;
  } catch (error) {
    console.error("Failed to read shop prices config; using defaults:", error);
    return {};
  }
}

async function getDiscoveredShopItems(): Promise<ShopItem[]> {
  const path = await import("node:path");
  const [configuredPrices, legacyRoot, categoryRoots] = await Promise.all([
    getConfiguredPrices(),
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

      const id = normalizeItemIdFromRelativePath(`${category}/${normalizedRelativePath}`);
      const legacyId = normalizeItemIdFromRelativePath(`${category}/${relativePath}`);
      if (dedupe.has(id)) return;
      dedupe.add(id);

      const imagePath = `/images/collectibles/${category}/shop/${relativePath}`;
      const name = normalizeNameFromFile((normalizedRelativePath || relativePath).split("/").pop() || relativePath);
      const configuredPrice = configuredPrices[id] ?? configuredPrices[legacyId];

      items.push({
        id,
        name,
        category,
        imagePath,
        price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
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
    const id = normalizeItemIdFromRelativePath(`${category}/${normalizedRelative}`);
    if (dedupe.has(id)) return;
    dedupe.add(id);

    const imagePath = `/images/collectibles/ships/shop/${relativePath}`;
    const name = normalizeNameFromFile((normalizedRelative || relativePath).split("/").pop() || relativePath);
    const legacyId = normalizeItemIdFromRelativePath(`${category}/${segments.slice(1).join("/")}`);
    const configuredPrice = configuredPrices[id] ?? configuredPrices[legacyId];

    items.push({
      id,
      name,
      category,
      imagePath,
      price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
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

    const sanitizedPrices: Record<string, number> = {};
    Object.entries(rawPrices).forEach(([itemId, value]) => {
      const normalizedId = String(itemId || "").trim().toLowerCase();
      if (!normalizedId) return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      sanitizedPrices[normalizedId] = Math.max(0, Math.round(numeric));
    });

    await adminDb.doc(SHOP_CONFIG_PATH).set(
      {
        prices: sanitizedPrices,
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
