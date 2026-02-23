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
  starters: {
    ships: string[];
    avatars?: string[];
    pets?: string[];
  };
  avatars: UnlockRule[];
  ships: UnlockRule[];
}

const DEFAULT_UNLOCK_CHANNELS: UnlockChannel[] = ["starter", "chance", "xp", "shop"];

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

  return {
    id,
    name,
    planetId,
    unlockKey,
    channel,
    rarity,
  };
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

  return {
    version: Number(raw?.version || DEFAULT_UNLOCK_CONFIG.version || 1),
    channels: channels.length > 0 ? channels : DEFAULT_UNLOCK_CHANNELS,
    starters: {
      ships: starterShips.length > 0 ? starterShips : ["finalship"],
      avatars: starterAvatars,
      pets: starterPets,
    },
    avatars: normalizeRuleArray(raw?.avatars ?? DEFAULT_UNLOCK_CONFIG.avatars),
    ships: normalizeRuleArray(raw?.ships ?? DEFAULT_UNLOCK_CONFIG.ships),
  };
};

export const getXpUnlockRules = (rules: UnlockRule[]): UnlockRule[] => {
  return rules.filter((rule) => !rule.channel || rule.channel === "xp");
};
