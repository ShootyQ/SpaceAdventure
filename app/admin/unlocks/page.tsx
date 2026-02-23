"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { SHIP_OPTIONS } from "@/lib/ships";
import {
  DEFAULT_UNLOCK_CONFIG,
  getUnlockMigrationReport,
  migrateRuleIdsToCanonical,
  normalizeUnlockConfig,
  validateUnlockConfig,
  type UnlockChannel,
  type UnlockConfig,
  type UnlockRule,
} from "@/lib/unlocks";

const CHANNEL_OPTIONS: UnlockChannel[] = ["starter", "xp", "shop", "chance"];
const MIGRATION_HISTORY_STORAGE_KEY = "unlockMigrationHistory:v1";
const MAX_MIGRATION_HISTORY = 5;

type MigrationArtifact = {
  mode: "dry-run" | "migrate-save";
  before: UnlockConfig;
  after: UnlockConfig;
  report: ReturnType<typeof getUnlockMigrationReport>;
  generatedAt: number;
};

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
  const [migrating, setMigrating] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [draft, setDraft] = useState<UnlockConfig>(DEFAULT_UNLOCK_CONFIG);
  const [migrationReport, setMigrationReport] = useState<MigrationArtifact["report"] | null>(null);
  const [migrationArtifact, setMigrationArtifact] = useState<MigrationArtifact | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<MigrationArtifact[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
      const next = migrateRuleIdsToCanonical(normalizeUnlockConfig((snapshot.data() as any) || null));
      setDraft(next);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(MIGRATION_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const sanitized: MigrationArtifact[] = parsed
        .map((entry: any) => ({
          mode: (entry?.mode === "migrate-save" ? "migrate-save" : "dry-run") as MigrationArtifact["mode"],
          before: normalizeUnlockConfig(entry?.before || null),
          after: normalizeUnlockConfig(entry?.after || null),
          report: {
            migratedShipRuleIds: Number(entry?.report?.migratedShipRuleIds || 0),
            migratedAvatarRuleIds: Number(entry?.report?.migratedAvatarRuleIds || 0),
            aliasesAdded: Number(entry?.report?.aliasesAdded || 0),
            totalAliases: Number(entry?.report?.totalAliases || 0),
            blockingConflicts: Array.isArray(entry?.report?.blockingConflicts) ? entry.report.blockingConflicts.map((value: any) => String(value)) : [],
            warnings: Array.isArray(entry?.report?.warnings) ? entry.report.warnings.map((value: any) => String(value)) : [],
          },
          generatedAt: Number(entry?.generatedAt || Date.now()),
        }))
        .sort((a, b) => b.generatedAt - a.generatedAt)
        .slice(0, MAX_MIGRATION_HISTORY);

      setMigrationHistory(sanitized);
    } catch (error) {
      console.error("Failed to load migration history:", error);
    }
  }, []);

  const pushMigrationHistory = (entry: MigrationArtifact) => {
    setMigrationHistory((prev) => {
      const next = [entry, ...prev]
        .sort((a, b) => b.generatedAt - a.generatedAt)
        .slice(0, MAX_MIGRATION_HISTORY);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(MIGRATION_HISTORY_STORAGE_KEY, JSON.stringify(next));
        }
      } catch (error) {
        console.error("Failed to persist migration history:", error);
      }
      return next;
    });
  };

  const starterShipSet = useMemo(() => new Set(draft.starters.ships || []), [draft.starters.ships]);
  const validation = useMemo(() => validateUnlockConfig(draft), [draft]);

  const toggleStarterShip = (shipId: string) => {
    setDraft((prev) => {
      const nextSet = new Set(prev.starters.ships || []);
      const wasChecked = nextSet.has(shipId);
      if (nextSet.has(shipId)) nextSet.delete(shipId);
      else nextSet.add(shipId);

      if (nextSet.size === 0) nextSet.add("finalship");

      const nextRules = wasChecked
        ? prev.ships
        : prev.ships.filter((rule) => String(rule.id || "").trim() !== shipId);

      return {
        ...prev,
        starters: {
          ...prev.starters,
          ships: Array.from(nextSet),
        },
        ships: nextRules,
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
      const normalized = migrateRuleIdsToCanonical(normalizeUnlockConfig(draft));
      const result = validateUnlockConfig(normalized);
      if (result.errors.length > 0) {
        alert(`Unlock config has ${result.errors.length} blocking issue(s). Fix them before saving.\n\n${result.errors.slice(0, 5).join("\n")}`);
        return;
      }

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

  const migrateConfigNow = async () => {
    try {
      setMigrating(true);
      const before = normalizeUnlockConfig(draft);
      const migrated = migrateRuleIdsToCanonical(before);
      const report = getUnlockMigrationReport(before, migrated);
      const artifact: MigrationArtifact = {
        mode: "migrate-save",
        before,
        after: migrated,
        report,
        generatedAt: Date.now(),
      };
      setMigrationReport(report);
      setMigrationArtifact(artifact);
      pushMigrationHistory(artifact);

      if (report.blockingConflicts.length > 0) {
        setDraft(migrated);
        alert(`Migration found ${report.blockingConflicts.length} blocking issue(s). Resolve them before saving.\n\n${report.blockingConflicts.slice(0, 5).join("\n")}`);
        return;
      }

      await setDoc(
        doc(db, "game-config", "unlocks"),
        {
          ...migrated,
          updatedAt: Date.now(),
          updatedBy: user?.email || null,
        },
        { merge: true }
      );

      setDraft(migrated);
      alert(`Migration complete. Converted ${report.migratedShipRuleIds + report.migratedAvatarRuleIds} rule IDs and added ${report.aliasesAdded} alias(es).`);
    } catch (error) {
      console.error("Failed to migrate unlock config:", error);
      alert("Failed to migrate unlock config.");
    } finally {
      setMigrating(false);
    }
  };

  const dryRunMigration = () => {
    try {
      setDryRunning(true);
      const before = normalizeUnlockConfig(draft);
      const migrated = migrateRuleIdsToCanonical(before);
      const report = getUnlockMigrationReport(before, migrated);
      const artifact: MigrationArtifact = {
        mode: "dry-run",
        before,
        after: migrated,
        report,
        generatedAt: Date.now(),
      };

      setMigrationReport(report);
      setMigrationArtifact(artifact);
      pushMigrationHistory(artifact);
    } finally {
      setDryRunning(false);
    }
  };

  const downloadMigrationReport = (artifact?: MigrationArtifact | null) => {
    const target = artifact || migrationArtifact;
    if (!target) {
      alert("Run migration or dry-run first to generate a report.");
      return;
    }

    const payload = {
      generatedAt: new Date(target.generatedAt).toISOString(),
      generatedBy: user?.email || null,
      mode: target.mode,
      report: target.report,
      before: target.before,
      after: target.after,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date(target.generatedAt).toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `unlock-migration-report-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
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
          <p className="mt-1 text-xs text-slate-500">Legacy ID aliases tracked: {Object.keys(draft.idAliases || {}).length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDraft(migrateRuleIdsToCanonical(normalizeUnlockConfig(DEFAULT_UNLOCK_CONFIG)))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Reset to JSON Defaults
          </button>
          <button
            onClick={dryRunMigration}
            disabled={dryRunning || migrating || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dryRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Dry Run Migration
          </button>
          <button
            onClick={migrateConfigNow}
            disabled={migrating || saving || dryRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {migrating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Migrate IDs + Save
          </button>
          <button
            onClick={() => downloadMigrationReport()}
            disabled={!migrationArtifact || migrating || saving || dryRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            Download Migration Report
          </button>
          <button
            onClick={saveConfig}
            disabled={saving || migrating}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Unlock Config
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {migrationReport && (
          <section className={`rounded-xl border p-4 ${migrationReport.blockingConflicts.length > 0 ? "border-rose-300 bg-rose-50" : "border-blue-300 bg-blue-50"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${migrationReport.blockingConflicts.length > 0 ? "text-rose-800" : "text-blue-800"}`}>
              Migration Report
            </h2>
            <div className={`mt-2 grid gap-2 text-sm ${migrationReport.blockingConflicts.length > 0 ? "text-rose-900" : "text-blue-900"}`}>
              <div>Mode: {migrationArtifact?.mode === "dry-run" ? "Dry run (no save)" : "Migrate + save"}</div>
              <div>Ship rule IDs migrated: {migrationReport.migratedShipRuleIds}</div>
              <div>Avatar rule IDs migrated: {migrationReport.migratedAvatarRuleIds}</div>
              <div>Aliases added: {migrationReport.aliasesAdded}</div>
              <div>Total aliases tracked: {migrationReport.totalAliases}</div>
            </div>

            {migrationReport.blockingConflicts.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-rose-800">
                {migrationReport.blockingConflicts.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            )}

            {migrationReport.warnings.length > 0 && (
              <ul className={`mt-3 space-y-1 text-sm ${migrationReport.blockingConflicts.length > 0 ? "text-rose-700" : "text-blue-800"}`}>
                {migrationReport.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {migrationHistory.length > 0 && (
          <section className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Recent Migration Reports</h2>
            <div className="mt-3 space-y-2">
              {migrationHistory.map((entry, index) => {
                const migratedTotal = entry.report.migratedShipRuleIds + entry.report.migratedAvatarRuleIds;
                const hasBlocking = entry.report.blockingConflicts.length > 0;
                return (
                  <div key={`${entry.generatedAt}-${index}`} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs">
                    <span className="font-medium text-slate-800">{new Date(entry.generatedAt).toLocaleString()}</span>
                    <span className={`rounded px-2 py-0.5 font-semibold ${entry.mode === "dry-run" ? "bg-indigo-100 text-indigo-800" : "bg-blue-100 text-blue-800"}`}>
                      {entry.mode === "dry-run" ? "Dry Run" : "Migrate + Save"}
                    </span>
                    <span className="text-slate-600">Migrated: {migratedTotal}</span>
                    <span className="text-slate-600">Aliases +{entry.report.aliasesAdded}</span>
                    <span className={hasBlocking ? "text-rose-700" : "text-emerald-700"}>
                      {hasBlocking ? `${entry.report.blockingConflicts.length} conflict(s)` : "No blocking conflicts"}
                    </span>
                    <button
                      onClick={() => {
                        setMigrationArtifact(entry);
                        setMigrationReport(entry.report);
                      }}
                      className="ml-auto rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => downloadMigrationReport(entry)}
                      className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <section className={`rounded-xl border p-4 ${validation.errors.length > 0 ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${validation.errors.length > 0 ? "text-rose-800" : "text-amber-800"}`}>
              Config Validation
            </h2>
            {validation.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-rose-800">
                {validation.errors.map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            )}
            {validation.warnings.length > 0 && (
              <ul className={`mt-2 space-y-1 text-sm ${validation.errors.length > 0 ? "text-rose-700" : "text-amber-800"}`}>
                {validation.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            )}
          </section>
        )}

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
