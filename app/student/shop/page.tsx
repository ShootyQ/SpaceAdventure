"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { ArrowLeft, Coins, LayoutDashboard, Loader2, Rocket, Sparkles } from "lucide-react";
import { SHIP_OPTIONS } from "@/lib/ships";
import { PET_OPTIONS } from "@/lib/pets";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { getAssetPath } from "@/lib/utils";

type ShopItem = {
    id: string;
    name: string;
    category: string;
    imagePath: string;
    price: number;
};

const CATEGORY_TITLES: Record<string, string> = {
    pets: "Pets",
    ships: "Ships",
    avatars: "Avatars",
    objects: "Objects",
};

const CATEGORY_ORDER = ["pets", "ships", "avatars", "objects"];

const getUnlockIdFromItem = (itemId: string) => String(itemId || "").split("/").pop() || "";

export default function StudentShopPage() {
    const { userData, user } = useAuth();
    const [creditsPerAward, setCreditsPerAward] = useState(1);
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [shopLoading, setShopLoading] = useState(true);
    const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
    const [equippingItemId, setEquippingItemId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");
    const [localCredits, setLocalCredits] = useState(0);
    const [localPurchasedIds, setLocalPurchasedIds] = useState<Set<string>>(new Set());
    const [localShipId, setLocalShipId] = useState("finalship");
    const [localAvatarId, setLocalAvatarId] = useState("bunny");
    const [localPetId, setLocalPetId] = useState("");

    useEffect(() => {
        setLocalCredits(Number(userData?.galacticCredits || 0));
    }, [userData?.galacticCredits]);

    useEffect(() => {
        setLocalShipId(userData?.spaceship?.modelId || userData?.spaceship?.id || "finalship");
    }, [userData?.spaceship?.id, userData?.spaceship?.modelId]);

    useEffect(() => {
        setLocalAvatarId(userData?.avatar?.avatarId || "bunny");
    }, [userData?.avatar?.avatarId]);

    useEffect(() => {
        setLocalPetId(userData?.selectedPetId || "");
    }, [userData?.selectedPetId]);

    useEffect(() => {
        const owned = new Set<string>(userData?.purchasedShopItemIds || []);
        const unlockedShipIds = new Set<string>(userData?.shopUnlockedShipIds || []);
        const unlockedAvatarIds = new Set<string>(userData?.shopUnlockedAvatarIds || []);
        const unlockedPetIds = new Set<string>(userData?.unlockedPetIds || []);

        shopItems.forEach((item) => {
            const unlockId = getUnlockIdFromItem(item.id);
            if (!unlockId) return;

            if (item.category === "ships" && unlockedShipIds.has(unlockId)) owned.add(item.id);
            if (item.category === "avatars" && unlockedAvatarIds.has(unlockId)) owned.add(item.id);
            if (item.category === "pets" && unlockedPetIds.has(unlockId)) owned.add(item.id);
        });

        setLocalPurchasedIds(owned);
    }, [userData?.purchasedShopItemIds, userData?.shopUnlockedShipIds, userData?.shopUnlockedAvatarIds, userData?.unlockedPetIds, shopItems]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setShopLoading(true);
                const response = await fetch("/api/admin/shop-items", { cache: "no-store" });
                if (!response.ok) throw new Error("Failed to load shop items");
                const payload = await response.json();
                if (!cancelled) {
                    const items = Array.isArray(payload?.items) ? payload.items : [];
                    setShopItems(items);
                }
            } catch (error) {
                console.error("Failed to load shop:", error);
                if (!cancelled) setShopItems([]);
            } finally {
                if (!cancelled) setShopLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const teacherId = userData?.teacherId;
        if (!teacherId) return;

        const unsub = onSnapshot(doc(db, `users/${teacherId}/settings`, "economy"), (snapshot) => {
            const raw = Number((snapshot.data() as any)?.creditsPerAward || 1);
            setCreditsPerAward(Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 1);
        });

        return () => unsub();
    }, [userData?.teacherId]);

    const groupedItems = useMemo(() => {
        const map: Record<string, ShopItem[]> = {};
        shopItems.forEach((item) => {
            const category = String(item.category || "misc").toLowerCase();
            if (!map[category]) map[category] = [];
            map[category].push(item);
        });

        Object.keys(map).forEach((key) => {
            map[key].sort((a, b) => a.name.localeCompare(b.name));
        });

        const orderedEntries = [
            ...CATEGORY_ORDER.filter((category) => map[category]).map((category) => [category, map[category]] as const),
            ...Object.entries(map).filter(([category]) => !CATEGORY_ORDER.includes(category)),
        ];

        return orderedEntries;
    }, [shopItems]);

    const handlePurchase = async (item: ShopItem) => {
        if (!user) {
            setNotice("Sign in required to buy items.");
            return;
        }

        if (localPurchasedIds.has(item.id)) {
            setNotice(`You already own ${item.name}.`);
            return;
        }

        if (localCredits < item.price) {
            setNotice(`Not enough Galactic Credits for ${item.name}.`);
            return;
        }

        setNotice("");
        setPurchasingItemId(item.id);

        try {
            const userRef = doc(db, "users", user.uid);
            const unlockId = getUnlockIdFromItem(item.id);

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) throw new Error("USER_NOT_FOUND");

                const data = snapshot.data() as any;
                const currentCredits = Number(data?.galacticCredits || 0);
                const purchased = new Set<string>(data?.purchasedShopItemIds || []);

                if (purchased.has(item.id)) throw new Error("ALREADY_OWNED");
                if (currentCredits < item.price) throw new Error("INSUFFICIENT_CREDITS");

                purchased.add(item.id);

                const updates: Record<string, any> = {
                    galacticCredits: currentCredits - item.price,
                    purchasedShopItemIds: Array.from(purchased),
                };

                if (item.category === "ships" && SHIP_OPTIONS.some((ship) => ship.id === unlockId)) {
                    const unlockedShips = new Set<string>(data?.shopUnlockedShipIds || []);
                    unlockedShips.add(unlockId);
                    updates.shopUnlockedShipIds = Array.from(unlockedShips);
                }

                if (item.category === "avatars" && AVATAR_OPTIONS.some((avatar) => avatar.id === unlockId)) {
                    const unlockedAvatars = new Set<string>(data?.shopUnlockedAvatarIds || []);
                    unlockedAvatars.add(unlockId);
                    updates.shopUnlockedAvatarIds = Array.from(unlockedAvatars);
                }

                if (item.category === "pets" && PET_OPTIONS.some((pet) => pet.id === unlockId)) {
                    const unlockedPets = new Set<string>(data?.unlockedPetIds || []);
                    unlockedPets.add(unlockId);
                    updates.unlockedPetIds = Array.from(unlockedPets);
                }

                transaction.set(userRef, updates, { merge: true });
            });

            setLocalCredits((prev) => Math.max(0, prev - item.price));
            setLocalPurchasedIds((prev) => new Set<string>([...Array.from(prev), item.id]));
            setNotice(`Purchased ${item.name}!`);
        } catch (error: any) {
            const message = String(error?.message || "");
            if (message.includes("INSUFFICIENT_CREDITS")) {
                setNotice(`Not enough Galactic Credits for ${item.name}.`);
            } else if (message.includes("ALREADY_OWNED")) {
                setNotice(`You already own ${item.name}.`);
            } else {
                console.error("Purchase failed:", error);
                setNotice("Purchase failed. Please try again.");
            }
        } finally {
            setPurchasingItemId(null);
        }
    };

    const handleEquip = async (item: ShopItem) => {
        if (!user) {
            setNotice("Sign in required to equip items.");
            return;
        }

        if (!localPurchasedIds.has(item.id)) {
            setNotice(`Buy ${item.name} first.`);
            return;
        }

        const unlockId = getUnlockIdFromItem(item.id);
        if (!unlockId) {
            setNotice("Unable to equip this item.");
            return;
        }

        setEquippingItemId(item.id);
        try {
            const userRef = doc(db, "users", user.uid);

            if (item.category === "ships") {
                const ship = SHIP_OPTIONS.find((option) => option.id === unlockId);
                if (!ship) {
                    setNotice("This ship cannot be equipped yet.");
                    return;
                }

                await updateDoc(userRef, {
                    "spaceship.id": ship.id,
                    "spaceship.modelId": ship.id,
                    "spaceship.type": ship.type,
                });
                setLocalShipId(ship.id);
            } else if (item.category === "avatars") {
                const avatar = AVATAR_OPTIONS.find((option) => option.id === unlockId);
                if (!avatar) {
                    setNotice("This avatar cannot be equipped yet.");
                    return;
                }

                await updateDoc(userRef, {
                    "avatar.avatarId": avatar.id,
                });
                setLocalAvatarId(avatar.id);
            } else if (item.category === "pets") {
                const pet = PET_OPTIONS.find((option) => option.id === unlockId);
                if (!pet) {
                    setNotice("This pet cannot be equipped yet.");
                    return;
                }

                const unlockedPetIds = new Set<string>(userData?.unlockedPetIds || []);
                unlockedPetIds.add(pet.id);

                await updateDoc(userRef, {
                    selectedPetId: pet.id,
                    unlockedPetIds: Array.from(unlockedPetIds),
                });
                setLocalPetId(pet.id);
            } else {
                setNotice("This item category is not equippable yet.");
                return;
            }

            setNotice(`Equipped ${item.name}.`);
        } catch (error) {
            console.error("Equip failed:", error);
            setNotice("Failed to equip item. Please try again.");
        } finally {
            setEquippingItemId(null);
        }
    };

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/student/settings" className="p-2 rounded-full border border-cyan-500/30 hover:bg-cyan-900/20 text-cyan-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Intergalactic Shop</h1>
                            <p className="text-cyan-600 text-sm">Spend Galactic Credits on cosmetics and upgrades.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 border border-amber-500/30 bg-amber-900/10 rounded-full">
                        <Coins size={16} className="text-amber-300" />
                        <span className="font-bold text-amber-100">{localCredits} GC</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/student" className="border border-emerald-500/30 bg-emerald-950/20 rounded-xl p-4 hover:border-emerald-400 transition-colors">
                        <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase tracking-wider text-sm"><LayoutDashboard size={16} /> Spaceship Interior</div>
                        <div className="text-xs text-emerald-200/70 mt-1">Visit your interior and view your current setup.</div>
                    </Link>
                    <Link href="/student/settings" className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-4 hover:border-purple-400 transition-colors">
                        <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-sm"><Sparkles size={16} /> DNA Sequencer</div>
                        <div className="text-xs text-purple-200/70 mt-1">Open pilot customization and identity controls.</div>
                    </Link>
                    <Link href="/student/map" className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-4 hover:border-cyan-400 transition-colors">
                        <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider text-sm"><Rocket size={16} /> Navigation</div>
                        <div className="text-xs text-cyan-200/70 mt-1">Return to map and continue your mission path.</div>
                    </Link>
                </div>

                <div className="border border-cyan-500/20 bg-black/40 rounded-2xl p-5">
                    <p className="text-sm text-cyan-200">
                        You currently earn <span className="text-amber-300 font-bold">{creditsPerAward} Galactic Credit{creditsPerAward === 1 ? "" : "s"}</span> each time your teacher awards XP.
                        Keep stacking rewards and spend your balance on the cosmetics you want most.
                    </p>
                    {notice ? <p className="mt-2 text-xs text-amber-200">{notice}</p> : null}
                </div>

                {shopLoading ? (
                    <div className="border border-cyan-800/50 bg-black/40 rounded-xl p-8 flex items-center justify-center gap-2 text-cyan-300">
                        <Loader2 size={18} className="animate-spin" /> Loading shop items...
                    </div>
                ) : groupedItems.length === 0 ? (
                    <div className="border border-cyan-800/50 bg-black/40 rounded-xl p-6 text-sm text-cyan-500">
                        No shop items found yet. Add images in your shop folders to populate this page.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedItems.map(([category, items]) => (
                            <section key={category} className="space-y-3">
                                <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                                    {CATEGORY_TITLES[category] || category}
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map((item) => {
                                        const isOwned = localPurchasedIds.has(item.id);
                                        const canAfford = localCredits >= item.price;
                                        const isPurchasing = purchasingItemId === item.id;
                                        const isEquipping = equippingItemId === item.id;
                                        const unlockId = getUnlockIdFromItem(item.id);
                                        const isEquippable =
                                            (item.category === "ships" && SHIP_OPTIONS.some((ship) => ship.id === unlockId)) ||
                                            (item.category === "avatars" && AVATAR_OPTIONS.some((avatar) => avatar.id === unlockId)) ||
                                            (item.category === "pets" && PET_OPTIONS.some((pet) => pet.id === unlockId));

                                        const isEquipped =
                                            (item.category === "ships" && localShipId === unlockId) ||
                                            (item.category === "avatars" && localAvatarId === unlockId) ||
                                            (item.category === "pets" && localPetId === unlockId);

                                        return (
                                            <div key={item.id} className="border border-cyan-800/50 bg-black/40 rounded-xl p-4">
                                                <div className="h-40 rounded-lg border border-cyan-900/40 bg-black/40 flex items-center justify-center p-3">
                                                    <img src={getAssetPath(item.imagePath)} alt={item.name} className="max-h-full max-w-full object-contain" />
                                                </div>
                                                <div className="mt-3 flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-white truncate">{item.name}</div>
                                                        <div className="text-xs text-cyan-600">{item.price} GC</div>
                                                    </div>
                                                    {isOwned ? (
                                                        <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-900/20">Owned</span>
                                                    ) : !canAfford ? (
                                                        <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/40 text-amber-300 bg-amber-900/20">Not enough</span>
                                                    ) : null}
                                                </div>

                                                <button
                                                    onClick={() => handlePurchase(item)}
                                                    disabled={isOwned || !canAfford || isPurchasing || isEquipping}
                                                    className={`mt-3 w-full py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${isOwned
                                                            ? "border-emerald-700/50 text-emerald-400 bg-emerald-950/20 cursor-default"
                                                            : !canAfford
                                                                ? "border-gray-700 text-gray-500 bg-black/40 cursor-not-allowed"
                                                                : "border-cyan-600 text-cyan-200 bg-cyan-900/20 hover:bg-cyan-800/30"
                                                        }`}
                                                >
                                                    {isPurchasing ? "Purchasing..." : isOwned ? "Owned" : "Buy"}
                                                </button>

                                                {isOwned && isEquippable ? (
                                                    <button
                                                        onClick={() => handleEquip(item)}
                                                        disabled={isEquipped || isEquipping || isPurchasing}
                                                        className={`mt-2 w-full py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors ${isEquipped
                                                                ? "border-purple-700/50 text-purple-300 bg-purple-950/20 cursor-default"
                                                                : "border-purple-500/70 text-purple-200 bg-purple-900/20 hover:bg-purple-800/30"
                                                            }`}
                                                    >
                                                        {isEquipping ? "Equipping..." : isEquipped ? "Equipped" : "Equip Now"}
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
