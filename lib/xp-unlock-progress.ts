export type XpUnlockDomain = "ship" | "avatar";

export type XpUnlockProgressEntry = {
  baselineXP: number;
  requiredXP: number;
  configuredAt?: number;
};

export type XpUnlockProgressMap = Record<string, Record<string, XpUnlockProgressEntry>>;

type RuleLike = {
  planetId?: string;
  unlockKey?: string;
};

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const toProgressKey = (domain: XpUnlockDomain, unlockKey?: string) => {
  const normalizedUnlockKey = String(unlockKey || "").trim();
  if (!normalizedUnlockKey) return "";
  return `${domain}:${normalizedUnlockKey}`;
};

export const normalizeXpUnlockProgressMap = (raw: unknown): XpUnlockProgressMap => {
  if (!raw || typeof raw !== "object") return {};

  const next: XpUnlockProgressMap = {};

  Object.entries(raw as Record<string, unknown>).forEach(([planetId, entries]) => {
    const normalizedPlanetId = normalizePlanetId(planetId);
    if (!normalizedPlanetId || !entries || typeof entries !== "object") return;

    const normalizedEntries: Record<string, XpUnlockProgressEntry> = {};
    Object.entries(entries as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
      if (!entryValue || typeof entryValue !== "object") return;

      const baselineXP = Number((entryValue as any)?.baselineXP || 0);
      const requiredXP = Number((entryValue as any)?.requiredXP || 0);
      const configuredAt = Number((entryValue as any)?.configuredAt || 0);
      if (!entryKey || !Number.isFinite(baselineXP) || !Number.isFinite(requiredXP) || requiredXP <= 0) return;

      normalizedEntries[String(entryKey)] = {
        baselineXP: Math.max(0, Math.floor(baselineXP)),
        requiredXP: Math.max(1, Math.floor(requiredXP)),
        ...(Number.isFinite(configuredAt) && configuredAt > 0 ? { configuredAt: Math.floor(configuredAt) } : {}),
      };
    });

    if (Object.keys(normalizedEntries).length > 0) {
      next[normalizedPlanetId] = normalizedEntries;
    }
  });

  return next;
};

export const isXpUnlockEarned = ({
  progress,
  planetId,
  unlockKey,
  domain,
  requiredXP,
  currentPlanetXP,
  configuredAt,
}: {
  progress: XpUnlockProgressMap;
  planetId?: string;
  unlockKey?: string;
  domain: XpUnlockDomain;
  requiredXP: number;
  currentPlanetXP: number;
  configuredAt?: number;
}) => {
  const normalizedPlanetId = normalizePlanetId(planetId);
  const normalizedRequiredXP = Math.max(0, Math.floor(Number(requiredXP || 0)));
  const normalizedConfiguredAt = Math.max(0, Math.floor(Number(configuredAt || 0)));
  if (!normalizedPlanetId || !normalizedRequiredXP) return false;

  const progressKey = toProgressKey(domain, unlockKey);
  if (!progressKey) return false;

  const entry = progress?.[normalizedPlanetId]?.[progressKey];
  if (!entry) {
    if (normalizedConfiguredAt > 0) return false;
    return Math.max(0, Math.floor(Number(currentPlanetXP || 0))) >= normalizedRequiredXP;
  }

  if (Math.floor(Number(entry.requiredXP || 0)) !== normalizedRequiredXP) {
    if (normalizedConfiguredAt > 0) return false;
    return Math.max(0, Math.floor(Number(currentPlanetXP || 0))) >= normalizedRequiredXP;
  }

  if (normalizedConfiguredAt > 0 && Math.floor(Number(entry.configuredAt || 0)) < normalizedConfiguredAt) {
    return false;
  }

  const baselineXP = Math.max(0, Math.floor(Number(entry.baselineXP || 0)));
  const normalizedCurrentXP = Math.max(0, Math.floor(Number(currentPlanetXP || 0)));
  return normalizedCurrentXP - baselineXP >= normalizedRequiredXP;
};

export const syncXpUnlockProgressForRules = ({
  progress,
  rules,
  unlockThresholds,
  domain,
  planetXP,
  unlockConfiguredAt,
  readPlanetXpValue,
}: {
  progress: XpUnlockProgressMap;
  rules: RuleLike[];
  unlockThresholds: Record<string, Record<string, number>>;
  domain: XpUnlockDomain;
  planetXP?: Record<string, number>;
  unlockConfiguredAt?: Record<string, Record<string, number>>;
  readPlanetXpValue: (planetXP: Record<string, number> | undefined, planetId: string) => number;
}) => {
  let changed = false;
  const next: XpUnlockProgressMap = { ...progress };

  rules.forEach((rule) => {
    const normalizedPlanetId = normalizePlanetId(rule.planetId);
    if (!normalizedPlanetId) return;

    const unlockKey = String(rule.unlockKey || "").trim();
    if (!unlockKey) return;

    const requiredXP = Math.max(0, Math.floor(Number(unlockThresholds?.[normalizedPlanetId]?.[unlockKey] || 0)));
    if (requiredXP <= 0) return;
    const configuredAt = Math.max(0, Math.floor(Number(unlockConfiguredAt?.[normalizedPlanetId]?.[unlockKey] || 0)));

    const progressKey = toProgressKey(domain, unlockKey);
    const currentPlanetXP = Math.max(0, Math.floor(Number(readPlanetXpValue(planetXP, normalizedPlanetId) || 0)));

    const existingPlanetProgress = next[normalizedPlanetId] || {};
    const existingEntry = existingPlanetProgress[progressKey];
    const existingRequiredXP = Math.max(0, Math.floor(Number(existingEntry?.requiredXP || 0)));
    const existingConfiguredAt = Math.max(0, Math.floor(Number(existingEntry?.configuredAt || 0)));
    const hasConfiguredAt = configuredAt > 0;

    const shouldCreateFromConfiguredAt = hasConfiguredAt && (!existingEntry || existingConfiguredAt < configuredAt);
    const shouldCreateFromThresholdMismatch = Boolean(existingEntry && existingRequiredXP !== requiredXP);

    if (shouldCreateFromConfiguredAt || shouldCreateFromThresholdMismatch) {
      next[normalizedPlanetId] = {
        ...existingPlanetProgress,
        [progressKey]: {
          baselineXP: currentPlanetXP,
          requiredXP,
          ...(hasConfiguredAt ? { configuredAt } : {}),
        },
      };
      changed = true;
    }
  });

  return {
    changed,
    nextProgress: changed ? normalizeXpUnlockProgressMap(next) : progress,
  };
};
