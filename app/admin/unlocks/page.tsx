"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { SHIP_OPTIONS } from "@/lib/ships";
import {
  DEFAULT_UNLOCK_CONFIG,
  normalizeUnlockConfig,
  type UnlockChannel,
  type UnlockConfig,
  type UnlockRule,
} from "@/lib/unlocks";

const CHANNEL_OPTIONS: UnlockChannel[] = ["starter", "xp", "shop", "chance"];

const emptyRule = (type: "ship" | "avatar"): UnlockRule => ({
  id: "",
  name: "",
  planetId: "",
  unlockKey: "",
  channel: "xp",
  rarity: type === "ship" ? "common" : "common",
});

export default function AdminUnlocksPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UnlockConfig>(DEFAULT_UNLOCK_CONFIG);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
      const next = normalizeUnlockConfig((snapshot.data() as any) || null);
      setDraft(next);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const starterShipSet = useMemo(() => new Set(draft.starters.ships || []), [draft.starters.ships]);

  const toggleStarterShip = (shipId: string) => {
    setDraft((prev) => {
      const nextSet = new Set(prev.starters.ships || []);
      if (nextSet.has(shipId)) nextSet.delete(shipId);
      else nextSet.add(shipId);

      if (nextSet.size === 0) nextSet.add("finalship");

      return {
        ...prev,
        starters: {
          ...prev.starters,
          ships: Array.from(nextSet),
        },
      };
    });
  };

  const updateRule = (collection: "ships" | "avatars", index: number, key: keyof UnlockRule, value: string) => {
    setDraft((prev) => {
      const nextRules = [...prev[collection]];
      nextRules[index] = {
        ...nextRules[index],
        [key]: value,
      };
      return { ...prev, [collection]: nextRules };
    });
  };

  const addRule = (collection: "ships" | "avatars") => {
    setDraft((prev) => ({
      ...prev,
      [collection]: [...prev[collection], emptyRule(collection === "ships" ? "ship" : "avatar")],
    }));
  };

  const removeRule = (collection: "ships" | "avatars", index: number) => {
    setDraft((prev) => ({
      ...prev,
      [collection]: prev[collection].filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const normalized = normalizeUnlockConfig(draft);
      await setDoc(
        doc(db, "game-config", "unlocks"),
        {
          ...normalized,
          updatedAt: Date.now(),
          updatedBy: user?.email || null,
        },
        { merge: true }
      );
      alert("Unlock config saved.");
    } catch (error) {
      console.error("Failed to save unlock config:", error);
      alert("Failed to save unlock config.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-20 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 text-slate-900">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Unlock Config</h1>
          <p className="mt-1 text-sm text-slate-600">Reassign starter lists, rarity, channels, and unlock behavior without editing JSON files.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDraft(normalizeUnlockConfig(DEFAULT_UNLOCK_CONFIG))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Reset to JSON Defaults
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Unlock Config
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Starter Ships</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SHIP_OPTIONS.map((ship) => {
              const checked = starterShipSet.has(ship.id);
              return (
                <label key={ship.id} className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggleStarterShip(ship.id)} />
                  <span>{ship.name}</span>
                  <span className="ml-auto font-mono text-xs text-slate-500">{ship.id}</span>
                </label>
              );
            })}
          </div>
        </section>

        <RuleTable
          title="Ship Rules"
          rules={draft.ships}
          onAdd={() => addRule("ships")}
          onRemove={(index) => removeRule("ships", index)}
          onUpdate={(index, key, value) => updateRule("ships", index, key, value)}
        />

        <RuleTable
          title="Avatar Rules"
          rules={draft.avatars}
          onAdd={() => addRule("avatars")}
          onRemove={(index) => removeRule("avatars", index)}
          onUpdate={(index, key, value) => updateRule("avatars", index, key, value)}
        />
      </div>
    </div>
  );
}

function RuleTable({
  title,
  rules,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  rules: UnlockRule[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, key: keyof UnlockRule, value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={12} />
          Add Rule
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Planet</th>
              <th className="px-2 py-2">Unlock Key</th>
              <th className="px-2 py-2">Channel</th>
              <th className="px-2 py-2">Rarity</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={`${rule.id || "new"}-${index}`} className="border-b border-slate-100">
                <td className="px-2 py-2">
                  <input
                    value={rule.id}
                    onChange={(event) => onUpdate(index, "id", event.target.value)}
                    title="Rule ID"
                    placeholder="item-id"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={rule.name}
                    onChange={(event) => onUpdate(index, "name", event.target.value)}
                    title="Rule Name"
                    placeholder="Display name"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={rule.planetId}
                    onChange={(event) => onUpdate(index, "planetId", event.target.value.toLowerCase())}
                    title="Planet ID"
                    placeholder="earth"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={rule.unlockKey}
                    onChange={(event) => onUpdate(index, "unlockKey", event.target.value)}
                    title="Unlock Key"
                    placeholder="unlock-key"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={rule.channel || "xp"}
                    onChange={(event) => onUpdate(index, "channel", event.target.value)}
                    title="Unlock Channel"
                    className="w-full rounded border border-slate-300 px-2 py-1"
                  >
                    {CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    value={rule.rarity || ""}
                    onChange={(event) => onUpdate(index, "rarity", event.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    placeholder="common / uncommon / rare"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => onRemove(index)}
                    className="inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
