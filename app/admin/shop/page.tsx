"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, ShoppingCart } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

type ShopItem = {
  id: string;
  name: string;
  category: string;
  imagePath: string;
  price: number;
  rarity?: "common" | "uncommon" | "rare" | "extremely-rare";
};

type ShopResponse = {
  items: ShopItem[];
  defaultPrice: number;
};

const getAssetPath = (asset: string) => asset;
const RARITY_OPTIONS = ["", "common", "uncommon", "rare", "extremely-rare"] as const;
type CollectibleRarity = Exclude<(typeof RARITY_OPTIONS)[number], "">;

export default function AdminShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({});
  const [defaultPrice, setDefaultPrice] = useState(100);
  const [rarityOverrides, setRarityOverrides] = useState<Record<string, CollectibleRarity>>({});
  const [draftRarities, setDraftRarities] = useState<Record<string, "" | CollectibleRarity>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadShopItems = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const response = await fetch("/api/admin/shop-items", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load shop items");
      const payload: ShopResponse = await response.json();

      const loadedItems = Array.isArray(payload.items) ? payload.items : [];
      const loadedDefaultPrice = Number(payload.defaultPrice || 100);

      setItems(loadedItems);
      setDefaultPrice(Number.isFinite(loadedDefaultPrice) ? Math.max(0, Math.round(loadedDefaultPrice)) : 100);

      const priceMap: Record<string, number> = {};
      const rarityMap: Record<string, "" | CollectibleRarity> = {};
      loadedItems.forEach((item) => {
        priceMap[item.id] = Number.isFinite(Number(item.price)) ? Math.max(0, Math.round(Number(item.price))) : 100;
        const rarity = String(item.rarity || "").trim().toLowerCase();
        if (rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare") {
          rarityMap[item.id] = rarity;
        } else {
          rarityMap[item.id] = "";
        }
      });
      setDraftPrices(priceMap);
      setDraftRarities(rarityMap);
    } catch (error) {
      console.error(error);
      alert("Failed to load shop items.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShopItems();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "shop"), (snapshot) => {
      const raw = (snapshot.data() as any)?.prices || {};
      const normalized: Record<string, number> = {};
      const normalizedRarities: Record<string, CollectibleRarity> = {};

      Object.entries(raw).forEach(([itemId, value]) => {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          normalized[String(itemId)] = Math.max(0, Math.round(numeric));
        }
      });

      const rawRarities = (snapshot.data() as any)?.rarities || {};
      Object.entries(rawRarities).forEach(([itemId, value]) => {
        const normalizedItemId = String(itemId || "").trim().toLowerCase();
        const rarity = String(value || "").trim().toLowerCase();
        if (!normalizedItemId) return;
        if (rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare") {
          normalizedRarities[normalizedItemId] = rarity;
        }
      });

      setPriceOverrides(normalized);
      setRarityOverrides(normalizedRarities);
    });

    return () => unsub();
  }, []);

  const resolvedItems = useMemo(() => {
    return items.map((item) => {
      const override = priceOverrides[item.id];
      return {
        ...item,
        price: Number.isFinite(override) ? override : item.price,
        rarity: rarityOverrides[item.id] || item.rarity,
      };
    });
  }, [items, priceOverrides, rarityOverrides]);

  useEffect(() => {
    const nextDraft: Record<string, number> = {};
    const nextRarityDraft: Record<string, "" | CollectibleRarity> = {};
    resolvedItems.forEach((item) => {
      nextDraft[item.id] = item.price;
      const rarity = String(item.rarity || "").trim().toLowerCase();
      nextRarityDraft[item.id] =
        rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare"
          ? (rarity as CollectibleRarity)
          : "";
    });
    setDraftPrices(nextDraft);
    setDraftRarities(nextRarityDraft);
  }, [resolvedItems]);

  const categorySummary = useMemo(() => {
    return resolvedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
  }, [resolvedItems]);

  const savePrices = async () => {
    try {
      setSaving(true);
      const sanitizedRarities: Record<string, CollectibleRarity> = {};
      Object.entries(draftRarities).forEach(([itemId, rarity]) => {
        const normalizedItemId = String(itemId || "").trim().toLowerCase();
        if (!normalizedItemId) return;
        if (rarity === "common" || rarity === "uncommon" || rarity === "rare" || rarity === "extremely-rare") {
          sanitizedRarities[normalizedItemId] = rarity;
        }
      });

      await setDoc(
        doc(db, "game-config", "shop"),
        {
          prices: draftPrices,
          rarities: sanitizedRarities,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      alert("Shop prices and rarities saved.");
    } catch (error) {
      console.error(error);
      alert("Failed to save shop prices.");
    } finally {
      setSaving(false);
    }
  };

  const updatePrice = (itemId: string, value: string) => {
    const numeric = Number(value);
    setDraftPrices((prev) => ({
      ...prev,
      [itemId]: Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0,
    }));
  };

  const updateRarity = (itemId: string, value: string) => {
    const normalized = String(value || "").trim().toLowerCase();
    setDraftRarities((prev) => ({
      ...prev,
      [itemId]: normalized === "common" || normalized === "uncommon" || normalized === "rare" || normalized === "extremely-rare"
        ? (normalized as CollectibleRarity)
        : "",
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Shop Items</h1>
          <p className="mt-1 text-sm text-slate-600">All shop images auto-appear here. New images default to {defaultPrice} GC until you change them. Set rarity to include shop finds in rarity achievements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadShopItems}
            disabled={refreshing || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Reload
          </button>
          <button
            onClick={savePrices}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Shop Config
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-20 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Total Items" value={resolvedItems.length} />
            {Object.entries(categorySummary).map(([category, count]) => (
              <StatCard key={category} label={category} value={count} />
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Shop inventory map
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Preview</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Rarity</th>
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2">Price (GC)</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-3 py-2">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                          <img src={getAssetPath(item.imagePath)} alt={item.name} className="h-10 w-10 object-contain" />
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.id}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draftRarities[item.id] ?? ""}
                          onChange={(e) => updateRarity(item.id, e.target.value)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs uppercase text-slate-900 outline-none"
                          aria-label={`Rarity for ${item.name}`}
                        >
                          {RARITY_OPTIONS.map((rarity) => (
                            <option key={`${item.id}-rarity-${rarity || "none"}`} value={rarity}>
                              {rarity || "not set"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all">{item.imagePath}</td>
                      <td className="px-3 py-2">
                        <div className="flex max-w-[120px] items-center gap-2 rounded border border-slate-300 px-2">
                          <ShoppingCart size={12} className="text-slate-500" />
                          <input
                            type="number"
                            min={0}
                            aria-label={`Price for ${item.name}`}
                            title={`Price for ${item.name}`}
                            placeholder="100"
                            value={draftPrices[item.id] ?? defaultPrice}
                            onChange={(e) => updatePrice(item.id, e.target.value)}
                            className="w-full py-1 text-sm outline-none"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
