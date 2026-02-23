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

const isImage = (fileName: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);

async function resolveShopAssetRoot() {
  const path = await import("node:path");
  return path.join(process.cwd(), "public", "images", "collectibles", "ships", "shop");
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
  const [path, shopAssetRoot] = await Promise.all([import("node:path"), resolveShopAssetRoot()]);
  const [files, configuredPrices] = await Promise.all([walkFiles(shopAssetRoot), getConfiguredPrices()]);

  const items = files.map((absolutePath) => {
    const relativePath = path.relative(shopAssetRoot, absolutePath).replace(/\\/g, "/");
    const pathParts = relativePath.split("/").filter(Boolean);
    const category = pathParts[0] || "misc";
    const imagePath = `/images/collectibles/ships/shop/${relativePath}`;
    const id = normalizeItemIdFromRelativePath(relativePath);
    const name = normalizeNameFromFile(relativePath.split("/").pop() || relativePath);
    const configuredPrice = configuredPrices[id];

    return {
      id,
      name,
      category,
      imagePath,
      price: Number.isFinite(configuredPrice) ? configuredPrice : DEFAULT_PRICE,
    } as ShopItem;
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
