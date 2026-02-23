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

    { id: "earth-xp-earn", name: "Terra Vanguard", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/earth-xp earn.png" },
    { id: "jupiter-xp-earn", name: "Stormbelly Freighter", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/jupiter-xp earn.png" },
    { id: "mars-xp-earn", name: "Crimson Striker", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/mars-xp earn.png" },
    { id: "mercury-xp-earn", name: "Solar Needle", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/mercury-xp earn.png" },
    { id: "saturn-xp-earn", name: "Ringline Hauler", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/saturn-xp earn.png" },
    { id: "uranus-xp-earn", name: "Cryo Bulkrunner", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/uranus-xp earn.png" },
    { id: "venus-xp-earn", name: "Aurora Lance", type: "cargo", assetPath: "/images/collectibles/ships/xp-unlocks/venus-xp earn.png" },

    { id: "earth-uncommon", name: "Blue Meridian", type: "scout", assetPath: "/images/collectibles/ships/uncommon/earth-uncommon.png" },
    { id: "jupiter-uncommon", name: "Tempest Skimmer", type: "scout", assetPath: "/images/collectibles/ships/uncommon/jupiter-uncommon.png" },
    { id: "mars-uncommon", name: "Dustrunner Mk II", type: "scout", assetPath: "/images/collectibles/ships/uncommon/mars-uncommon.png" },
    { id: "mercury-uncommon", name: "Helios Dart", type: "scout", assetPath: "/images/collectibles/ships/uncommon/mercury-uncommon.png" },
    { id: "saturn-uncommon", name: "Halo Glider", type: "scout", assetPath: "/images/collectibles/ships/uncommon/saturn-uncommon.png" },
    { id: "uranus-uncommon", name: "Tiltwind Sprite", type: "scout", assetPath: "/images/collectibles/ships/uncommon/uranus-uncommon.png" },
    { id: "venus-uncommon", name: "Cloudpiercer", type: "scout", assetPath: "/images/collectibles/ships/uncommon/venus-uncommon.png" },

    { id: "earth-extremely-rare", name: "Gaia Sovereign", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/earth-extremely rare.png" },
    { id: "jupiter-extremely-rare", name: "Zephyr Colossus", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/jupiter-extremely rare.png" },
    { id: "mars-extremely-rare", name: "Red Dreadnought", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/mars-extremelyrare.png" },
    { id: "mercury-extremely-rare", name: "Perihelion Wraith", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/mercury-extremelyrare.png" },
    { id: "saturn-extremely-rare", name: "Ring Sovereign", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/saturn-extremely rare.png" },
    { id: "uranus-extremely-rare", name: "Obliquity Monarch", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/uranus-extremely rare.png" },
    { id: "venus-extremely-rare", name: "Celestial Siren", type: "cruiser", assetPath: "/images/collectibles/ships/extremely-rare/venus-extremelyrare.png" },
];

const SHIP_ASSET_PATHS = new Map<string, string>(
    SHIP_OPTIONS.map((ship) => [ship.id, ship.assetPath])
);

export function resolveShipAssetPath(shipId?: string): string {
    const normalized = String(shipId || "finalship").trim();
    if (!normalized) return "/images/ships/finalship.png";

    return SHIP_ASSET_PATHS.get(normalized) || `/images/ships/${normalized}.png`;
}
