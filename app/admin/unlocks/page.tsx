"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { PLANETS } from "@/types";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { SHIP_OPTIONS } from "@/lib/ships";
import {
  DEFAULT_UNLOCK_CONFIG,
  ensurePrefixedUnlockId,
  normalizeUnlockConfig,
  validateUnlockConfig,
  type UnlockChannel,
  type UnlockConfig,
  type UnlockRule,
} from "@/lib/unlocks";
import {
  DEFAULT_PET_UNLOCK_CHANCE_CONFIG,
  normalizePetUnlockAssignments,
  normalizePetUnlockChanceConfig,
  PET_OPTIONS,
  type RollablePetRarity,
  type PetUnlockAssignment,
  type PetUnlockChanceConfig,
  type PetUnlockMethod,
  type PetUnlockScope,
} from "@/lib/pets";

type ShopItem = {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  price: number;
};

type ShopResponse = {
  items: ShopItem[];
};

type EarnMethod = "xp" | "chance" | "shop" | "starter" | "unassigned";
type ScopeMode = "planet" | "any";
type RowDomain = "ship" | "avatar" | "pet" | "shop";
type ChanceRarity = RollablePetRarity;

type EditableRow = {
  key: string;
  domain: RowDomain;
  id: string;
  name: string;
  sourceName: string;
  category: string;
  method: EarnMethod;
  scope: ScopeMode;
  planetId: string;
  rarity?: string;
  assetPath?: string;
  price?: number;
  lockedMethod?: boolean;
  existingRuleId?: string;
  existingUnlockKey?: string;
};

const METHOD_OPTIONS: EarnMethod[] = ["xp", "chance", "shop", "starter", "unassigned"];
const PET_METHOD_OPTIONS: EarnMethod[] = ["chance", "shop", "starter", "unassigned"];
const SHOP_METHOD_OPTIONS: EarnMethod[] = ["shop"];
const UNLOCK_RULE_CHANNELS = new Set<UnlockChannel>(["xp", "chance", "shop"]);
const DEFAULT_SHOP_PRICE = 100;
const CHANCE_RARITY_OPTIONS: ChanceRarity[] = ["common", "uncommon", "rare", "extremely-rare"];

const toIntMin = (value: unknown, minValue: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minValue;
  return Math.max(minValue, Math.round(numeric));
};

const PLANET_OPTIONS = PLANETS.filter((planet) => planet.id !== "sun").map((planet) => ({
  id: String(planet.id).toLowerCase(),
  name: planet.name,
}));

const firstPlanetId = PLANET_OPTIONS[0]?.id || "earth";

const normalizePlanetValue = (value?: string) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return firstPlanetId;
  if (normalized === "any") return "any";
  return PLANET_OPTIONS.some((planet) => planet.id === normalized) ? normalized : firstPlanetId;
};

const toShopConfigItemId = (category: string, id: string) => {
  return `${String(category || "misc").trim().toLowerCase()}/${String(id || "").trim().toLowerCase()}`;
};

const getShopConfigIdForRow = (row: EditableRow) => {
  if (row.domain === "shop") return String(row.id || "").trim().toLowerCase();
  return toShopConfigItemId(row.category, row.id);
};

const getRuleForItem = (rules: UnlockRule[], itemId: string, kind: "ships" | "avatars") => {
  const normalizedId = String(itemId || "").trim();
  const canonicalId = ensurePrefixedUnlockId(normalizedId, kind);

  return rules.find((rule) => {
    const ruleId = String(rule.id || "").trim();
    const ruleUnlockKey = String(rule.unlockKey || "").trim();
    return ruleUnlockKey === normalizedId || ruleId === normalizedId || ruleId === canonicalId;
  });
};

const normalizeChanceRarity = (value?: string): ChanceRarity => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "common" || normalized === "uncommon" || normalized === "rare" || normalized === "extremely-rare") {
    return normalized;
  }
  return "common";
};

const buildUnlockRows = (
  unlockConfig: UnlockConfig,
  shopPrices: Record<string, number>,
  shopNameOverrides: Record<string, string>
): EditableRow[] => {
  const starterShipSet = new Set(unlockConfig.starters?.ships || []);
  const starterAvatarSet = new Set(unlockConfig.starters?.avatars || []);

  const shipRows: EditableRow[] = SHIP_OPTIONS.map((ship) => {
    const rule = getRuleForItem(unlockConfig.ships || [], ship.id, "ships");
    const channel = String(rule?.channel || "").toLowerCase();

    let method: EarnMethod = "unassigned";
    if (starterShipSet.has(ship.id)) method = "starter";
    else if (channel === "xp" || channel === "chance" || channel === "shop") method = channel as EarnMethod;

    const normalizedPlanet = normalizePlanetValue(rule?.planetId);
    const scope: ScopeMode = normalizedPlanet === "any" ? "any" : "planet";
    const shopItemId = toShopConfigItemId("ships", ship.id);
    const shopPrice = toIntMin(shopPrices[shopItemId] ?? DEFAULT_SHOP_PRICE, 0);
    const resolvedName = String(rule?.name || ship.name || ship.id);

    return {
      key: `ship:${ship.id}`,
      domain: "ship",
      id: ship.id,
      name: String((method === "shop" ? shopNameOverrides[shopItemId] : "") || resolvedName),
      sourceName: String(ship.name || ship.id),
      category: "ships",
      method,
      scope,
      planetId: scope === "planet" ? normalizedPlanet : firstPlanetId,
      rarity: method === "chance" ? normalizeChanceRarity(rule?.rarity) : undefined,
      price: method === "shop" ? shopPrice : undefined,
      assetPath: ship.assetPath,
      existingRuleId: rule?.id,
      existingUnlockKey: rule?.unlockKey,
    };
  });

  const avatarRows: EditableRow[] = AVATAR_OPTIONS.map((avatar) => {
    const rule = getRuleForItem(unlockConfig.avatars || [], avatar.id, "avatars");
    const channel = String(rule?.channel || "").toLowerCase();

    let method: EarnMethod = "unassigned";
    if (starterAvatarSet.has(avatar.id)) method = "starter";
    else if (channel === "xp" || channel === "chance" || channel === "shop") method = channel as EarnMethod;

    const normalizedPlanet = normalizePlanetValue(rule?.planetId);
    const scope: ScopeMode = normalizedPlanet === "any" ? "any" : "planet";
    const shopItemId = toShopConfigItemId("avatars", avatar.id);
    const shopPrice = toIntMin(shopPrices[shopItemId] ?? DEFAULT_SHOP_PRICE, 0);
    const resolvedName = String(rule?.name || avatar.name || avatar.id);

    return {
      key: `avatar:${avatar.id}`,
      domain: "avatar",
      id: avatar.id,
      name: String((method === "shop" ? shopNameOverrides[shopItemId] : "") || resolvedName),
      sourceName: String(avatar.name || avatar.id),
      category: "avatars",
      method,
      scope,
      planetId: scope === "planet" ? normalizedPlanet : firstPlanetId,
      rarity: method === "chance" ? normalizeChanceRarity(rule?.rarity) : undefined,
      price: method === "shop" ? shopPrice : undefined,
      assetPath: avatar.src,
      existingRuleId: rule?.id,
      existingUnlockKey: rule?.unlockKey,
    };
  });

  return [...shipRows, ...avatarRows];
};

const buildPetRows = (
  petAssignments: Record<string, PetUnlockAssignment>,
  petNameOverrides: Record<string, string>,
  shopPrices: Record<string, number>,
  shopNameOverrides: Record<string, string>
): EditableRow[] => {
  return PET_OPTIONS.map((pet) => {
    const assignment = petAssignments[String(pet.id || "").toLowerCase()];
    const resolvedMethod: PetUnlockMethod = assignment?.method || (pet.starter ? "starter" : "chance");
    const resolvedScope: PetUnlockScope = assignment?.scope || (pet.unlockPlanetId ? "planet" : "any");
    const resolvedPlanetId = normalizePlanetValue(assignment?.planetId || pet.unlockPlanetId || firstPlanetId);
    const resolvedChanceRarity = normalizeChanceRarity((assignment as any)?.rarity || pet.rarity);
    const shopItemId = toShopConfigItemId("pets", pet.id);
    const shopPrice = toIntMin(shopPrices[shopItemId] ?? DEFAULT_SHOP_PRICE, 0);
    const resolvedBaseName = String(petNameOverrides[pet.id] || pet.name || pet.id);

    return {
      key: `pet:${pet.id}`,
      domain: "pet",
      id: pet.id,
      name: String((resolvedMethod === "shop" ? shopNameOverrides[shopItemId] : "") || resolvedBaseName),
      sourceName: String(pet.name || pet.id),
      category: "pets",
      method: resolvedMethod,
      scope: resolvedScope,
      planetId: resolvedScope === "planet" ? resolvedPlanetId : firstPlanetId,
      rarity: resolvedMethod === "chance" ? resolvedChanceRarity : undefined,
      price: resolvedMethod === "shop" ? shopPrice : undefined,
      assetPath: pet.imageSrc,
    };
  });
};

const buildShopRows = (
  shopItems: ShopItem[],
  shopPrices: Record<string, number>,
  shopNameOverrides: Record<string, string>
): EditableRow[] => {
  return shopItems.map((item) => {
    const normalizedItemId = String(item.id || "").trim().toLowerCase();
    return {
    key: `shop:${item.id}`,
    domain: "shop",
    id: item.id,
    name: String(shopNameOverrides[normalizedItemId] || item.name || item.id),
    sourceName: String(item.name || item.id),
    category: String(item.category || "misc").toLowerCase(),
    method: "shop",
    scope: "any",
    planetId: firstPlanetId,
    assetPath: item.imagePath,
    price: toIntMin(shopPrices[normalizedItemId] ?? item.price, 0),
    lockedMethod: true,
  };
  });
};

export default function AdminUnlocksPage() {
  const { user } = useAuth();

  const [unlockConfig, setUnlockConfig] = useState<UnlockConfig>(DEFAULT_UNLOCK_CONFIG);
  const [petChanceConfig, setPetChanceConfig] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
  const [petAssignments, setPetAssignments] = useState<Record<string, PetUnlockAssignment>>({});
  const [petNameOverrides, setPetNameOverrides] = useState<Record<string, string>>({});

  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopPrices, setShopPrices] = useState<Record<string, number>>({});
  const [shopNameOverrides, setShopNameOverrides] = useState<Record<string, string>>({});

  const [unlockLoaded, setUnlockLoaded] = useState(false);
  const [collectiblesLoaded, setCollectiblesLoaded] = useState(false);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [shopInventoryLoaded, setShopInventoryLoaded] = useState(false);

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [initializedRows, setInitializedRows] = useState(false);

  const reloadShopInventory = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/shop-items", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load shop items");
      const payload: ShopResponse = await response.json();
      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setShopItems(nextItems);
    } catch (error) {
      console.error("Failed to load shop inventory:", error);
      setShopItems([]);
    } finally {
      setShopInventoryLoaded(true);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    reloadShopInventory();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
      const normalized = normalizeUnlockConfig((snapshot.data() as Partial<UnlockConfig>) || null);
      setUnlockConfig(normalized);
      setUnlockLoaded(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "collectibles"), (snapshot) => {
      const raw = (snapshot.data() as any) || {};
      setPetChanceConfig(normalizePetUnlockChanceConfig(raw?.petUnlockChances || null));
      setPetAssignments(normalizePetUnlockAssignments(raw?.petUnlockAssignments || null));

      const rawNameOverrides = raw?.petNameOverrides || {};
      const normalizedNames: Record<string, string> = {};
      Object.entries(rawNameOverrides).forEach(([petId, value]) => {
        const key = String(petId || "").trim().toLowerCase();
        const nextName = String(value || "").trim();
        if (key && nextName) normalizedNames[key] = nextName;
      });
      setPetNameOverrides(normalizedNames);
      setCollectiblesLoaded(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "shop"), (snapshot) => {
      const raw = (snapshot.data() as any) || {};
      const rawPrices = raw?.prices || {};
      const normalizedPrices: Record<string, number> = {};
      Object.entries(rawPrices).forEach(([itemId, value]) => {
        const key = String(itemId || "").trim().toLowerCase();
        if (!key) return;
        normalizedPrices[key] = toIntMin(value, 0);
      });
      setShopPrices(normalizedPrices);

      const rawNameOverrides = raw?.nameOverrides || {};
      const normalizedNames: Record<string, string> = {};
      Object.entries(rawNameOverrides).forEach(([itemId, value]) => {
        const key = String(itemId || "").trim().toLowerCase();
        const nextName = String(value || "").trim();
        if (key && nextName) normalizedNames[key] = nextName;
      });
      setShopNameOverrides(normalizedNames);

      setShopLoaded(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!unlockLoaded || !collectiblesLoaded || !shopLoaded || !shopInventoryLoaded) return;
    if (initializedRows) return;

    const unlockRows = buildUnlockRows(unlockConfig, shopPrices, shopNameOverrides);
    const petRows = buildPetRows(petAssignments, petNameOverrides, shopPrices, shopNameOverrides);
    const discoveredShopRows = buildShopRows(shopItems, shopPrices, shopNameOverrides);

    const managedShopItemIds = new Set<string>([
      ...unlockRows.map((row) => getShopConfigIdForRow(row)),
      ...petRows.map((row) => getShopConfigIdForRow(row)),
    ]);

    const shopRows = discoveredShopRows.filter((row) => !managedShopItemIds.has(getShopConfigIdForRow(row)));

    const nextRows = [...unlockRows, ...petRows, ...shopRows];

    setRows(nextRows);
    setInitializedRows(true);
  }, [
    unlockLoaded,
    collectiblesLoaded,
    shopLoaded,
    shopInventoryLoaded,
    initializedRows,
    unlockConfig,
    petAssignments,
    petNameOverrides,
    shopItems,
    shopPrices,
    shopNameOverrides,
  ]);

  const categories = useMemo(() => {
    const discovered = new Set<string>(["ships", "avatars", "pets", "objects", "flags"]);
    rows.forEach((row) => discovered.add(String(row.category || "misc").toLowerCase()));
    return ["all", ...Array.from(discovered).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const categoryPass = categoryFilter === "all" || row.category === categoryFilter;
      const methodPass = methodFilter === "all" || row.method === methodFilter;
      return categoryPass && methodPass;
    });
  }, [rows, categoryFilter, methodFilter]);

  const updateRow = (key: string, updater: (row: EditableRow) => EditableRow) => {
    setRows((prev) => prev.map((row) => (row.key === key ? updater(row) : row)));
  };

  const updateMethod = (key: string, nextMethod: EarnMethod) => {
    updateRow(key, (row) => {
      const method = row.lockedMethod ? row.method : nextMethod;
      const needsScope = method === "xp" || method === "chance";
      const needsRarity = method === "chance";
      const shopItemId = getShopConfigIdForRow(row);
      const nextPrice = method === "shop"
        ? toIntMin(row.price ?? shopPrices[shopItemId] ?? DEFAULT_SHOP_PRICE, 0)
        : row.price;
      return {
        ...row,
        method,
        scope: needsScope ? row.scope : "any",
        planetId: needsScope ? row.planetId : firstPlanetId,
        rarity: needsRarity ? normalizeChanceRarity(row.rarity) : undefined,
        price: nextPrice,
      };
    });
  };

  const reloadAll = async () => {
    setInitializedRows(false);
    await reloadShopInventory();
  };

  const saveAll = async () => {
    try {
      setSaving(true);

      const shipRows = rows.filter((row) => row.domain === "ship");
      const avatarRows = rows.filter((row) => row.domain === "avatar");
      const petRows = rows.filter((row) => row.domain === "pet");

      const nextStarterShips = shipRows.filter((row) => row.method === "starter").map((row) => row.id);
      const nextStarterAvatars = avatarRows.filter((row) => row.method === "starter").map((row) => row.id);

      const buildRulesFor = (targetRows: EditableRow[], kind: "ships" | "avatars"): UnlockRule[] => {
        return targetRows
          .filter((row) => row.method === "xp" || row.method === "chance" || row.method === "shop")
          .map((row) => {
            const channel = row.method as UnlockChannel;
            const normalizedPlanet = row.scope === "planet" ? normalizePlanetValue(row.planetId) : "any";

            return {
              id: row.existingRuleId || ensurePrefixedUnlockId(row.id, kind),
              name: String(row.name || row.id).trim() || row.id,
              planetId: channel === "xp" || channel === "chance" ? normalizedPlanet : "",
              unlockKey: row.id,
              channel,
              rarity: channel === "chance" ? normalizeChanceRarity(row.rarity) : undefined,
            };
          });
      };

      const nextUnlockDraft = normalizeUnlockConfig({
        ...unlockConfig,
        starters: {
          ...unlockConfig.starters,
          ships: nextStarterShips.length > 0 ? nextStarterShips : ["finalship"],
          avatars: nextStarterAvatars,
        },
        ships: buildRulesFor(shipRows, "ships"),
        avatars: buildRulesFor(avatarRows, "avatars"),
      });

      const validation = validateUnlockConfig(nextUnlockDraft);
      if (validation.errors.length > 0) {
        alert(`Unlock config has ${validation.errors.length} blocking issue(s).\n\n${validation.errors.slice(0, 8).join("\n")}`);
        return;
      }

      const nextPetAssignments: Record<string, PetUnlockAssignment> = {};
      const nextPetNameOverrides: Record<string, string> = {};

      petRows.forEach((row) => {
        const normalizedPetId = String(row.id || "").trim().toLowerCase();
        if (!normalizedPetId) return;

        const nextMethod: PetUnlockMethod = row.method === "starter" || row.method === "unassigned" || row.method === "shop" ? row.method : "chance";
        const nextScope: PetUnlockScope = row.scope === "planet" ? "planet" : "any";

        const nextAssignment: PetUnlockAssignment = {
          method: nextMethod,
          scope: nextScope,
        };
        if (nextMethod === "chance") {
          nextAssignment.rarity = normalizeChanceRarity(row.rarity);
        }
        if (nextScope === "planet") {
          nextAssignment.planetId = normalizePlanetValue(row.planetId);
        }
        nextPetAssignments[normalizedPetId] = nextAssignment;

        const trimmedName = String(row.name || "").trim();
        if (trimmedName && trimmedName !== row.sourceName) {
          nextPetNameOverrides[normalizedPetId] = trimmedName;
        }
      });

      const nextShopPrices: Record<string, number> = {};
      const nextShopNames: Record<string, string> = {};
      const shopBackedRows = rows.filter((row) => row.method === "shop" || row.domain === "shop");
      const prioritizedRows = [...shopBackedRows].sort((a, b) => {
        if (a.domain === b.domain) return 0;
        if (a.domain === "shop") return 1;
        if (b.domain === "shop") return -1;
        return 0;
      });
      const seenShopIds = new Set<string>();

      prioritizedRows.forEach((row) => {
        const normalizedItemId = getShopConfigIdForRow(row);
        if (!normalizedItemId || seenShopIds.has(normalizedItemId)) return;
        seenShopIds.add(normalizedItemId);

        nextShopPrices[normalizedItemId] = toIntMin(row.price ?? shopPrices[normalizedItemId] ?? DEFAULT_SHOP_PRICE, 0);

        const trimmedName = String(row.name || "").trim();
        nextShopNames[normalizedItemId] = trimmedName || row.sourceName || row.id;
      });

      await Promise.all([
        setDoc(
          doc(db, "game-config", "unlocks"),
          {
            ...nextUnlockDraft,
            updatedAt: Date.now(),
            updatedBy: user?.email || null,
          },
          { merge: true }
        ),
        setDoc(
          doc(db, "game-config", "collectibles"),
          {
            petUnlockChances: petChanceConfig,
            petUnlockAssignments: nextPetAssignments,
            petNameOverrides: nextPetNameOverrides,
            updatedAt: Date.now(),
            updatedBy: user?.email || null,
          },
          { merge: true }
        ),
        setDoc(
          doc(db, "game-config", "shop"),
          {
            prices: nextShopPrices,
            nameOverrides: nextShopNames,
            updatedAt: Date.now(),
            updatedBy: user?.email || null,
          },
          { merge: true }
        ),
      ]);

      alert("Unlock assignments saved.");
    } catch (error) {
      console.error("Failed to save unlock assignments:", error);
      alert("Failed to save unlock assignments.");
    } finally {
      setSaving(false);
    }
  };

  const isLoading = !unlockLoaded || !collectiblesLoaded || !shopLoaded || !shopInventoryLoaded || !initializedRows;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Unlock Assignment Manager</h1>
          <p className="mt-1 text-sm text-slate-600">Filter by category and earn type, then edit assignment fields in one list.</p>
          <p className="mt-1 text-xs text-slate-500">Saves to Firebase docs under game-config: unlocks, collectibles, and shop.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadAll}
            disabled={refreshing || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Reload
          </button>
          <button
            onClick={saveAll}
            disabled={saving || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save All
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Earn Method</div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">all</option>
            {METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Items Shown</div>
          <div className="mt-1 text-base font-semibold text-slate-900">{filteredRows.length}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Data Sources</div>
          <div className="mt-1 text-xs text-slate-700">Unlocks + Collectibles + Shop</div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-20 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Planet</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const rowMethodOptions = row.domain === "pet"
                    ? PET_METHOD_OPTIONS
                    : row.domain === "shop"
                      ? SHOP_METHOD_OPTIONS
                      : METHOD_OPTIONS;

                  const showScope = row.method === "xp" || row.method === "chance";
                  const showPlanet = showScope && row.scope === "planet";
                  const showRarity = row.method === "chance";
                  const showPrice = row.domain === "shop" || row.method === "shop";

                  return (
                    <tr key={row.key} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                            {row.assetPath ? (
                              <img src={row.assetPath} alt={row.name} className="h-8 w-8 object-contain" />
                            ) : (
                              <span className="text-[10px] text-slate-500">N/A</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateRow(row.key, (prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
                              aria-label={`Name for ${row.id}`}
                              title={`Name for ${row.id}`}
                              placeholder={row.sourceName}
                            />
                            {showRarity ? (
                              <div className="mt-2">
                                <select
                                  value={normalizeChanceRarity(row.rarity)}
                                  onChange={(e) => updateRow(row.key, (prev) => ({ ...prev, rarity: normalizeChanceRarity(e.target.value) }))}
                                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs uppercase text-slate-800 outline-none focus:border-blue-400"
                                  aria-label={`Chance rarity for ${row.id}`}
                                >
                                  {CHANCE_RARITY_OPTIONS.map((rarity) => (
                                    <option key={`${row.key}-rarity-${rarity}`} value={rarity}>
                                      {rarity}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 align-middle text-slate-700">{row.category}</td>

                      <td className="px-3 py-2">
                        <select
                          value={row.method}
                          onChange={(e) => updateMethod(row.key, e.target.value as EarnMethod)}
                          disabled={row.lockedMethod}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-500"
                          aria-label={`Method for ${row.id}`}
                        >
                          {rowMethodOptions.map((method) => (
                            <option key={`${row.key}-${method}`} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        {showScope ? (
                          <select
                            value={row.scope}
                            onChange={(e) => updateRow(row.key, (prev) => ({ ...prev, scope: e.target.value as ScopeMode }))}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400"
                            aria-label={`Scope for ${row.id}`}
                          >
                            <option value="planet">planet</option>
                            <option value="any">any</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {showPlanet ? (
                          <select
                            value={row.planetId}
                            onChange={(e) => updateRow(row.key, (prev) => ({ ...prev, planetId: normalizePlanetValue(e.target.value) }))}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-400"
                            aria-label={`Planet for ${row.id}`}
                          >
                            {PLANET_OPTIONS.map((planet) => (
                              <option key={`${row.key}-${planet.id}`} value={planet.id}>
                                {planet.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {showPrice ? (
                          <input
                            type="number"
                            min={0}
                            value={row.price ?? 0}
                            onChange={(e) => updateRow(row.key, (prev) => ({ ...prev, price: toIntMin(e.target.value, 0) }))}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
                            aria-label={`Price for ${row.id}`}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
