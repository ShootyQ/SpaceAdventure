import { SpaceshipConfig } from "@/types";

export interface ShipOption {
    id: string;
    name: string;
    type: SpaceshipConfig["type"];
    assetPath: string;
}

export const SHIP_OPTIONS: ShipOption[] = [
    { id: "finalship", name: "Standard Interceptor", type: "fighter", assetPath: "/images/ships/finalship.png" },
    { id: "alienship", name: "Alien Scout", type: "scout", assetPath: "/images/ships/alienship.png" },
    { id: "jellyalienship", name: "Bio-Cruiser", type: "cruiser", assetPath: "/images/ships/jellyalienship.png" },
    { id: "coconutship", name: "Tropical Drifter", type: "cruiser", assetPath: "/images/ships/coconutship.png" },
    { id: "dragoneggship", name: "Dragon Scale Pod", type: "scout", assetPath: "/images/ships/dragoneggship.png" },

    { id: "earth-xp-earn", name: "Earth XP Earn", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/earth-xp earn.png" },
    { id: "mars-xp-earn", name: "Mars XP Earn", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/mars-xp earn.png" },
    { id: "mercury-xp-earn", name: "Mercury XP Earn", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/mercury-xp earn.png" },
    { id: "venus-xp-earn", name: "Venus XP Earn", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/venus-xp earn.png" },

    { id: "earth-uncommon", name: "Earth Uncommon", type: "scout", assetPath: "/images/collectibles/ships/uncommon/earth-uncommon.png" },
    { id: "mars-uncommon", name: "Mars Uncommon", type: "scout", assetPath: "/images/collectibles/ships/uncommon/mars-uncommon.png" },
    { id: "mercury-uncommon", name: "Mercury Uncommon", type: "scout", assetPath: "/images/collectibles/ships/uncommon/mercury-uncommon.png" },
    { id: "venus-uncommon", name: "Venus Uncommon", type: "scout", assetPath: "/images/collectibles/ships/uncommon/venus-uncommon.png" },

    { id: "earth-extremely-rare", name: "Earth Extremely Rare", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/earth-extremely rare.png" },
    { id: "mars-extremely-rare", name: "Mars Extremely Rare", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/mars-extremelyrare.png" },
    { id: "mercury-extremely-rare", name: "Mercury Extremely Rare", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/mercury-extremelyrare.png" },
    { id: "venus-extremely-rare", name: "Venus Extremely Rare", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/venus-extremelyrare.png" },
];

const SHIP_ASSET_PATHS = new Map<string, string>(
    SHIP_OPTIONS.map((ship) => [ship.id, ship.assetPath])
);

export function resolveShipAssetPath(shipId?: string): string {
    const normalized = String(shipId || "finalship").trim();
    if (!normalized) return "/images/ships/finalship.png";

    return SHIP_ASSET_PATHS.get(normalized) || `/images/ships/${normalized}.png`;
}
