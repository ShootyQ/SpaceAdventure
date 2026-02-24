import xpUnlockConfig from "@/data/collectibles/xp-unlocks.json";

export type UnlockChannel = "starter" | "chance" | "xp" | "shop";

export interface UnlockRule {
  id: string;
  name: string;
  planetId: string;
  unlockKey: string;
  channel?: UnlockChannel;
  rarity?: string;
}

export interface UnlockConfig {
  version: number;
  channels: UnlockChannel[];
  idAliases?: Record<string, string>;
  starters: {
    ships: string[];
    avatars?: string[];
    pets?: string[];
  };
  avatars: UnlockRule[];
  ships: UnlockRule[];
}

export interface UnlockValidationResult {
  errors: string[];
  warnings: string[];
}

export interface UnlockMigrationReport {
  migratedShipRuleIds: number;
  migratedAvatarRuleIds: number;
  aliasesAdded: number;
  totalAliases: number;
  blockingConflicts: string[];
  warnings: string[];
}

const DEFAULT_UNLOCK_CHANNELS: UnlockChannel[] = ["starter", "chance", "xp", "shop"];

const normalizeAliasMap = (raw: any): Record<string, string> => {
  if (!raw || typeof raw !== "object") return {};
  const next: Record<string, string> = {};
  Object.entries(raw).forEach(([legacyId, canonicalId]) => {
    const legacy = String(legacyId || "").trim();
    const canonical = String(canonicalId || "").trim();
    if (!legacy || !canonical || legacy === canonical) return;
    next[legacy] = canonical;
  });
  return next;
};

const getExpectedPrefix = (collection: "ships" | "avatars") => {
  return collection === "ships" ? "ship_" : "avatar_";
};

export const ensurePrefixedUnlockId = (id: string, collection: "ships" | "avatars"): string => {
  const normalized = String(id || "").trim();
  if (!normalized) return "";
  if (/^(ship_|avatar_|pet_|object_)/.test(normalized)) return normalized;
  return `${getExpectedPrefix(collection)}${normalized}`;
};

export const getLegacyIdsForCanonical = (canonicalId: string, aliases?: Record<string, string>): string[] => {
  const normalizedCanonicalId = String(canonicalId || "").trim();
  if (!normalizedCanonicalId) return [];

  const legacyIds = Object.entries(aliases || {})
    .filter(([, mappedCanonicalId]) => String(mappedCanonicalId || "").trim() === normalizedCanonicalId)
    .map(([legacyId]) => String(legacyId || "").trim())
    .filter(Boolean);

  return dedupeIds([normalizedCanonicalId, ...legacyIds]);
};

export const resolveRuntimeUnlockId = (
  id: string,
  aliases?: Record<string, string>,
  availableIds?: Set<string>
): string => {
  const candidates = getLegacyIdsForCanonical(id, aliases);
  if (candidates.length === 0) return String(id || "").trim();
  if (!availableIds || availableIds.size === 0) return candidates[0];
  return candidates.find((candidateId) => availableIds.has(candidateId)) || candidates[0];
};

export const migrateRuleIdsToCanonical = (config: UnlockConfig): UnlockConfig => {
  const aliasMap = { ...(config.idAliases || {}) };

  const migrateCollection = (rules: UnlockRule[], collection: "ships" | "avatars") => {
    return rules.map((rule) => {
      const legacyId = String(rule.id || "").trim();
      const canonicalId = ensurePrefixedUnlockId(legacyId, collection);
      if (legacyId && canonicalId && legacyId !== canonicalId) {
        aliasMap[legacyId] = canonicalId;
      }
      return {
        ...rule,
        id: canonicalId || legacyId,
      };
    });
  };

  const ships = migrateCollection(config.ships || [], "ships");
  const avatars = migrateCollection(config.avatars || [], "avatars");

  return {
    ...config,
    idAliases: normalizeAliasMap(aliasMap),
    ships,
    avatars,
  };
};

export const getUnlockMigrationReport = (beforeConfig: UnlockConfig, afterConfig: UnlockConfig): UnlockMigrationReport => {
  const countMigratedRules = (beforeRules: UnlockRule[], afterRules: UnlockRule[]) => {
    const length = Math.min(beforeRules.length, afterRules.length);
    let count = 0;
    for (let index = 0; index < length; index += 1) {
      const beforeId = String(beforeRules[index]?.id || "").trim();
      const afterId = String(afterRules[index]?.id || "").trim();
      if (beforeId && afterId && beforeId !== afterId) count += 1;
    }
    return count;
  };

  const beforeAliases = Object.keys(beforeConfig.idAliases || {}).length;
  const afterAliases = Object.keys(afterConfig.idAliases || {}).length;
  const validation = validateUnlockConfig(afterConfig);

  return {
    migratedShipRuleIds: countMigratedRules(beforeConfig.ships || [], afterConfig.ships || []),
    migratedAvatarRuleIds: countMigratedRules(beforeConfig.avatars || [], afterConfig.avatars || []),
    aliasesAdded: Math.max(0, afterAliases - beforeAliases),
    totalAliases: afterAliases,
    blockingConflicts: validation.errors,
    warnings: validation.warnings,
  };
};

const dedupeIds = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  ids.forEach((id) => {
    const normalized = String(id || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const normalizeRule = (raw: any): UnlockRule | null => {
  const id = String(raw?.id || "").trim();
  const name = String(raw?.name || "").trim() || id;
  const planetId = String(raw?.planetId || "").trim().toLowerCase();
  const unlockKey = String(raw?.unlockKey || "").trim() || id;
  if (!id) return null;

  const channelRaw = String(raw?.channel || "").trim().toLowerCase();
  const channel = DEFAULT_UNLOCK_CHANNELS.includes(channelRaw as UnlockChannel)
    ? (channelRaw as UnlockChannel)
    : undefined;

  const rarity = String(raw?.rarity || "").trim() || undefined;

  const normalizedRule: UnlockRule = {
    id,
    name,
    planetId,
    unlockKey,
    channel: channel || "xp",
  };

  if (rarity) {
    normalizedRule.rarity = rarity;
  }

  return normalizedRule;
};

const normalizeRuleArray = (rawArray: any): UnlockRule[] => {
  if (!Array.isArray(rawArray)) return [];
  return rawArray
    .map((raw) => normalizeRule(raw))
    .filter((rule): rule is UnlockRule => Boolean(rule));
};

export const DEFAULT_UNLOCK_CONFIG: UnlockConfig = {
  version: Number((xpUnlockConfig as any)?.version || 1),
  channels: DEFAULT_UNLOCK_CHANNELS,
  idAliases: normalizeAliasMap((xpUnlockConfig as any)?.idAliases),
  starters: {
    ships: Array.isArray((xpUnlockConfig as any)?.starters?.ships)
      ? (xpUnlockConfig as any).starters.ships.map((id: any) => String(id))
      : ["finalship"],
    avatars: Array.isArray((xpUnlockConfig as any)?.starters?.avatars)
      ? (xpUnlockConfig as any).starters.avatars.map((id: any) => String(id))
      : [],
    pets: Array.isArray((xpUnlockConfig as any)?.starters?.pets)
      ? (xpUnlockConfig as any).starters.pets.map((id: any) => String(id))
      : [],
  },
  avatars: normalizeRuleArray((xpUnlockConfig as any)?.avatars),
  ships: normalizeRuleArray((xpUnlockConfig as any)?.ships),
};

export const normalizeUnlockConfig = (raw?: Partial<UnlockConfig> | null): UnlockConfig => {
  const channelsRaw = Array.isArray(raw?.channels) ? raw?.channels : DEFAULT_UNLOCK_CONFIG.channels;
  const channels = channelsRaw
    .map((channel) => String(channel || "").trim().toLowerCase())
    .filter((channel): channel is UnlockChannel => DEFAULT_UNLOCK_CHANNELS.includes(channel as UnlockChannel));

  const starterShips = Array.isArray(raw?.starters?.ships)
    ? raw!.starters!.ships!.map((id) => String(id || "").trim()).filter(Boolean)
    : DEFAULT_UNLOCK_CONFIG.starters.ships;

  const starterAvatars = Array.isArray(raw?.starters?.avatars)
    ? raw!.starters!.avatars!.map((id) => String(id || "").trim()).filter(Boolean)
    : DEFAULT_UNLOCK_CONFIG.starters.avatars || [];

  const starterPets = Array.isArray(raw?.starters?.pets)
    ? raw!.starters!.pets!.map((id) => String(id || "").trim()).filter(Boolean)
    : DEFAULT_UNLOCK_CONFIG.starters.pets || [];

  const normalizedStarterShips = dedupeIds(starterShips);
  const normalizedStarterAvatars = dedupeIds(starterAvatars);
  const normalizedStarterPets = dedupeIds(starterPets);

  const normalizedShips = normalizeRuleArray(raw?.ships ?? DEFAULT_UNLOCK_CONFIG.ships)
    .filter((rule) => !normalizedStarterShips.includes(rule.id));
  const normalizedAvatars = normalizeRuleArray(raw?.avatars ?? DEFAULT_UNLOCK_CONFIG.avatars)
    .filter((rule) => !normalizedStarterAvatars.includes(rule.id));

  return {
    version: Number(raw?.version || DEFAULT_UNLOCK_CONFIG.version || 1),
    channels: channels.length > 0 ? channels : DEFAULT_UNLOCK_CHANNELS,
    idAliases: normalizeAliasMap(raw?.idAliases ?? DEFAULT_UNLOCK_CONFIG.idAliases),
    starters: {
      ships: normalizedStarterShips.length > 0 ? normalizedStarterShips : ["finalship"],
      avatars: normalizedStarterAvatars,
      pets: normalizedStarterPets,
    },
    avatars: normalizedAvatars,
    ships: normalizedShips,
  };
};

export const validateUnlockConfig = (config: UnlockConfig): UnlockValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const starterShips = new Set(config.starters?.ships || []);
  const starterAvatars = new Set(config.starters?.avatars || []);

  const validateRuleCollection = (rules: UnlockRule[], collection: "ships" | "avatars") => {
    const seenIds = new Set<string>();
    rules.forEach((rule, index) => {
      const label = `${collection} rule #${index + 1}`;
      const id = String(rule?.id || "").trim();
      const unlockKey = String(rule?.unlockKey || "").trim();
      const channel = String(rule?.channel || "xp").toLowerCase();

      if (!id) errors.push(`${label}: missing id.`);
      if (!unlockKey) errors.push(`${label}: missing unlock key.`);

      if (id && seenIds.has(id)) {
        errors.push(`${label}: duplicate id '${id}' in ${collection}.`);
      }
      if (id) seenIds.add(id);

      if (channel === "starter") {
        errors.push(`${label}: channel cannot be 'starter' in rules. Use Starter lists instead.`);
      }

      if (channel === "xp" && !String(rule?.planetId || "").trim()) {
        errors.push(`${label}: XP channel requires a planet id.`);
      }

      if (id && collection === "ships" && starterShips.has(id)) {
        errors.push(`${label}: '${id}' is both starter and rule-based.`);
      }
      if (id && collection === "avatars" && starterAvatars.has(id)) {
        errors.push(`${label}: '${id}' is both starter and rule-based.`);
      }

      if (id && !/^(ship_|avatar_|pet_|object_)/.test(id)) {
        warnings.push(`${label}: id '${id}' is legacy format (missing category prefix).`);
      }
    });
  };

  validateRuleCollection(config.ships || [], "ships");
  validateRuleCollection(config.avatars || [], "avatars");

  const aliasEntries = Object.entries(config.idAliases || {});
  const aliasKeys = new Set<string>();
  aliasEntries.forEach(([legacyId, canonicalId]) => {
    const legacy = String(legacyId || "").trim();
    const canonical = String(canonicalId || "").trim();
    if (!legacy || !canonical) {
      errors.push("idAliases contains an empty key or value.");
      return;
    }
    if (legacy === canonical) {
      warnings.push(`idAliases '${legacy}' -> '${canonical}' is redundant.`);
    }
    if (aliasKeys.has(legacy)) {
      errors.push(`idAliases has duplicate legacy id '${legacy}'.`);
    }
    aliasKeys.add(legacy);
  });

  return { errors, warnings };
};

export const getXpUnlockRules = (rules: UnlockRule[]): UnlockRule[] => {
  return rules.filter((rule) => !rule.channel || rule.channel === "xp");
};
