"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PET_UNLOCK_CHANCE_CONFIG,
  getPetUnlockHint,
  normalizePetUnlockChanceConfig,
  PET_OPTIONS,
  PetUnlockChanceConfig,
  RollablePetRarity,
} from "@/lib/pets";
import { useAuth } from "@/context/AuthContext";
import { Loader2, RefreshCw, Save, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";

const RARITY_ORDER: RollablePetRarity[] = ["common", "uncommon", "rare", "extremely-rare"];

export default function AdminCollectiblesPage() {
  const { user: currentUser } = useAuth();

  const [collectiblesConfig, setCollectiblesConfig] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
  const [collectiblesDraft, setCollectiblesDraft] = useState<PetUnlockChanceConfig>(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
  const [collectiblesLoading, setCollectiblesLoading] = useState(true);
  const [collectiblesSaving, setCollectiblesSaving] = useState(false);

  const loadCollectiblesConfig = async () => {
    setCollectiblesLoading(true);
    try {
      const configSnap = await getDoc(doc(db, "game-config", "collectibles"));
      const normalized = normalizePetUnlockChanceConfig((configSnap.data() as any)?.petUnlockChances || null);
      setCollectiblesConfig(normalized);
      setCollectiblesDraft(normalized);
    } catch (error) {
      console.error("Failed to load collectibles config:", error);
      setCollectiblesConfig(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
      setCollectiblesDraft(DEFAULT_PET_UNLOCK_CHANCE_CONFIG);
    } finally {
      setCollectiblesLoading(false);
    }
  };

  useEffect(() => {
    loadCollectiblesConfig();
  }, []);

  const collectiblesSummary = useMemo(() => {
    const total = PET_OPTIONS.length;
    const starter = PET_OPTIONS.filter((pet) => pet.starter).length;

    const byRarity = PET_OPTIONS.reduce<Record<string, number>>((acc, pet) => {
      const key = pet.rarity;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { total, starter, byRarity };
  }, []);

  const updateCollectibleChance = (scope: "planet" | "anyPlanet", rarity: RollablePetRarity, value: string) => {
    const numeric = Math.max(1, Math.round(Number(value) || 1));
    setCollectiblesDraft((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [rarity]: numeric,
      },
    }));
  };

  const updateCollectibleEnabled = (scope: "planet" | "anyPlanet", rarity: RollablePetRarity, enabled: boolean) => {
    setCollectiblesDraft((prev) => ({
      ...prev,
      enabled: {
        ...prev.enabled,
        [scope]: {
          ...prev.enabled[scope],
          [rarity]: enabled,
        },
      },
    }));
  };

  const updateTestingChance = (value: string) => {
    const numeric = Math.max(1, Math.round(Number(value) || 1));
    setCollectiblesDraft((prev) => ({ ...prev, testing: numeric }));
  };

  const updateTestingEnabled = (enabled: boolean) => {
    setCollectiblesDraft((prev) => ({
      ...prev,
      enabled: {
        ...prev.enabled,
        testing: enabled,
      },
    }));
  };

  const resetCollectiblesDraft = () => {
    setCollectiblesDraft(normalizePetUnlockChanceConfig(DEFAULT_PET_UNLOCK_CHANCE_CONFIG));
  };

  const saveCollectiblesConfig = async () => {
    try {
      setCollectiblesSaving(true);
      const normalizedDraft = normalizePetUnlockChanceConfig(collectiblesDraft);

      await setDoc(
        doc(db, "game-config", "collectibles"),
        {
          petUnlockChances: normalizedDraft,
          updatedAt: Date.now(),
          updatedBy: currentUser?.email || null,
        },
        { merge: true }
      );

      setCollectiblesConfig(normalizedDraft);
      setCollectiblesDraft(normalizedDraft);
      alert("Collectibles config saved.");
    } catch (error) {
      console.error("Failed to save collectibles config:", error);
      alert("Failed to save collectibles config.");
    } finally {
      setCollectiblesSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Collectibles Control Center</h1>
          <p className="mt-1 text-sm text-slate-600">Manage unlock odds and review every configured pet in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCollectiblesConfig}
            disabled={collectiblesLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={collectiblesLoading ? "animate-spin" : ""} />
            Reload
          </button>
          <button
            onClick={resetCollectiblesDraft}
            disabled={collectiblesSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={16} />
            Reset Defaults
          </button>
          <button
            onClick={saveCollectiblesConfig}
            disabled={collectiblesSaving || collectiblesLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {collectiblesSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Collectibles
          </button>
        </div>
      </div>

      {collectiblesLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-20 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Total Pets" value={collectiblesSummary.total} />
            <StatCard label="Starter Pets" value={collectiblesSummary.starter} />
            <StatCard label="Common" value={collectiblesSummary.byRarity.common || 0} />
            <StatCard label="Uncommon" value={collectiblesSummary.byRarity.uncommon || 0} />
            <StatCard label="Rare" value={collectiblesSummary.byRarity.rare || 0} />
            <StatCard label="Extremely Rare" value={collectiblesSummary.byRarity["extremely-rare"] || 0} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <SlidersHorizontal size={14} />
                Planet-specific odds
              </div>
              <div className="space-y-2">
                {RARITY_ORDER.map((rarity) => (
                  <div key={`planet-${rarity}`} className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{rarity}</span>
                    <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                      <span className="text-xs text-slate-500">1 /</span>
                      <input
                        type="number"
                        aria-label={`Planet ${rarity} odds denominator`}
                        min={1}
                        value={collectiblesDraft.planet[rarity]}
                        onChange={(e) => updateCollectibleChance("planet", rarity, e.target.value)}
                        className="w-full py-1 text-sm outline-none"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        aria-label={`Enable planet ${rarity} odds`}
                        checked={collectiblesDraft.enabled.planet[rarity]}
                        onChange={(e) => updateCollectibleEnabled("planet", rarity, e.target.checked)}
                      />
                      On
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Sparkles size={14} />
                Any-planet odds
              </div>
              <div className="space-y-2">
                {RARITY_ORDER.map((rarity) => (
                  <div key={`any-${rarity}`} className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{rarity}</span>
                    <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                      <span className="text-xs text-slate-500">1 /</span>
                      <input
                        type="number"
                        aria-label={`Any planet ${rarity} odds denominator`}
                        min={1}
                        value={collectiblesDraft.anyPlanet[rarity]}
                        onChange={(e) => updateCollectibleChance("anyPlanet", rarity, e.target.value)}
                        className="w-full py-1 text-sm outline-none"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        aria-label={`Enable any planet ${rarity} odds`}
                        checked={collectiblesDraft.enabled.anyPlanet[rarity]}
                        onChange={(e) => updateCollectibleEnabled("anyPlanet", rarity, e.target.checked)}
                      />
                      On
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-800">Testing drops</div>
              <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-600">testing</span>
                <div className="flex items-center gap-1 rounded border border-slate-300 px-2">
                  <span className="text-xs text-slate-500">1 /</span>
                  <input
                    type="number"
                    aria-label="Testing drop odds denominator"
                    min={1}
                    value={collectiblesDraft.testing}
                    onChange={(e) => updateTestingChance(e.target.value)}
                    className="w-full py-1 text-sm outline-none"
                  />
                </div>
                <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    aria-label="Enable testing drops"
                    checked={collectiblesDraft.enabled.testing}
                    onChange={(e) => updateTestingEnabled(e.target.checked)}
                  />
                  On
                </label>
              </div>

              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                Live config in map right now:
                <div className="mt-1 font-mono text-[10px] text-slate-700">
                  common 1/{collectiblesConfig.planet.common} • uncommon 1/{collectiblesConfig.planet.uncommon} • rare 1/
                  {collectiblesConfig.planet.rare} • x-rare 1/{collectiblesConfig.planet["extremely-rare"]}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Pet inventory map
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Pet</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Rarity</th>
                    <th className="px-3 py-2">Scope</th>
                    <th className="px-3 py-2">Starter</th>
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2">Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {PET_OPTIONS.map((pet) => (
                    <tr key={pet.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-900">{pet.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{pet.id}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {pet.rarity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{pet.unlockPlanetId ? `Planet: ${pet.unlockPlanetId}` : "Any planet"}</td>
                      <td className="px-3 py-2 text-slate-700">{pet.starter ? "Yes" : "No"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all">{pet.imageSrc || "-"}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{getPetUnlockHint(pet, collectiblesDraft) || "Starter"}</td>
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
