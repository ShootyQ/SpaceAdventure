"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getAssetPath } from "@/lib/utils";
import { getEffectiveUnlockedPetIds, getResolvedSelectedPetId, PET_OPTIONS } from "@/lib/pets";
import { Check, Loader2 } from "lucide-react";

type ShopPetMeta = {
    name: string;
    imagePath: string;
};

const getPurchasedShopPetIds = (purchasedShopItemIds?: string[]) => {
    return (purchasedShopItemIds || [])
        .filter((itemId) => String(itemId || "").toLowerCase().startsWith("pets/"))
        .map((itemId) => String(itemId || "").split("/").pop() || "")
        .filter(Boolean);
};

const formatDynamicPetName = (petId: string) => {
    return String(petId || "")
        .replace(/\.[^.]+$/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "Companion";
};

export default function StudentPetsPage() {
    const { user, userData } = useAuth();

    const [petId, setPetId] = useState(getResolvedSelectedPetId(userData));
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [shopPetMeta, setShopPetMeta] = useState<Record<string, ShopPetMeta>>({});
    const [shopNameOverrides, setShopNameOverrides] = useState<Record<string, string>>({});
    const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setPetId(getResolvedSelectedPetId(userData));
    }, [userData?.selectedPetId, userData?.unlockedPetIds]);

    useEffect(() => {
        let mounted = true;

        const loadShopPetMeta = async () => {
            try {
                const response = await fetch("/api/admin/shop-items", { cache: "no-store" });
                if (!response.ok) return;

                const payload = await response.json();
                const items = Array.isArray(payload?.items) ? payload.items : [];
                const nextMeta: Record<string, ShopPetMeta> = {};

                items.forEach((item: any) => {
                    if (String(item?.category || "").toLowerCase() !== "pets") return;
                    const normalizedId = String(item?.id || "")
                        .toLowerCase()
                        .split("/")
                        .pop() || "";
                    if (!normalizedId) return;

                    nextMeta[normalizedId] = {
                        name: String(item?.name || formatDynamicPetName(normalizedId)),
                        imagePath: String(item?.imagePath || ""),
                    };
                });

                if (mounted) setShopPetMeta(nextMeta);
            } catch (error) {
                console.error("Failed to load shop pet metadata:", error);
            }
        };

        loadShopPetMeta();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "shop"), (snapshot) => {
            const raw = (snapshot.data() as any)?.nameOverrides || {};
            const normalized: Record<string, string> = {};

            Object.entries(raw).forEach(([itemId, value]) => {
                const normalizedItemId = String(itemId || "").trim().toLowerCase();
                const nextName = String(value || "").trim();
                if (!normalizedItemId || !nextName) return;

                const petIdFromPath = normalizedItemId.startsWith("pets/")
                    ? normalizedItemId.split("/").pop() || ""
                    : "";
                if (!petIdFromPath) return;

                normalized[petIdFromPath] = nextName;
            });

            setShopNameOverrides(normalized);
        });

        return () => unsub();
    }, []);

    const purchasedShopPetIds = getPurchasedShopPetIds(userData?.purchasedShopItemIds);
    const unlockedPetIds = useMemo(() => {
        return new Set<string>([
            ...Array.from(getEffectiveUnlockedPetIds(userData)),
            ...purchasedShopPetIds,
        ]);
    }, [purchasedShopPetIds, userData?.unlockedPetIds]);

    const visiblePets = useMemo(() => {
        const knownPetIds = new Set(PET_OPTIONS.map((pet) => pet.id));

        const knownUnlockedPets = PET_OPTIONS
            .filter((pet) => unlockedPetIds.has(pet.id))
            .map((pet) => ({
                id: pet.id,
                name: pet.name,
                emoji: pet.emoji,
                imageSrc: pet.imageSrc || shopPetMeta[pet.id]?.imagePath || `/images/collectibles/pets/shop/${pet.id}.png`,
            }));

        const dynamicUnlockedPets = Array.from(unlockedPetIds)
            .filter((id) => !knownPetIds.has(id))
            .map((id) => ({
                id,
                name: String(shopNameOverrides[id] || shopPetMeta[id]?.name || formatDynamicPetName(id)),
                emoji: "🐾",
                imageSrc: String(shopPetMeta[id]?.imagePath || `/images/collectibles/pets/shop/${id}.png`),
            }));

        return [...knownUnlockedPets, ...dynamicUnlockedPets].sort((a, b) => a.name.localeCompare(b.name));
    }, [shopNameOverrides, shopPetMeta, unlockedPetIds]);

    const handleSave = async () => {
        if (!user) return;

        const safePetId = unlockedPetIds.has(petId) ? petId : getResolvedSelectedPetId(userData);

        setSaving(true);
        setNotice("");

        try {
            await updateDoc(doc(db, "users", user.uid), {
                selectedPetId: safePetId,
                unlockedPetIds: Array.from(unlockedPetIds),
            });
            setNotice("Companion updated.");
        } catch (error) {
            console.error("Failed to save companion:", error);
            setNotice("Failed to save companion.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-5">
                <div className="border border-cyan-500/30 bg-black/40 rounded-2xl p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Pet Selection</h1>
                            <p className="text-cyan-600 text-xs uppercase tracking-wider mt-1">Choose your current companion</p>
                        </div>
                        <Link href="/student/studentnavigation" className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold">
                            Back
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {visiblePets.map((pet) => {
                            const selected = petId === pet.id;
                            const hasBrokenImage = brokenImageIds.has(pet.id);

                            return (
                                <button
                                    key={pet.id}
                                    type="button"
                                    onClick={() => setPetId(pet.id)}
                                    className={`group relative p-3 rounded-xl border transition-all flex items-center gap-3 ${selected ? "bg-cyan-900/40 border-cyan-300" : "border-cyan-900/50 bg-black/40 hover:bg-cyan-900/20 hover:border-cyan-500/60"}`}
                                    title={pet.name}
                                >
                                    <div className="w-12 h-12 rounded-full bg-black/50 border border-cyan-500/40 flex items-center justify-center text-2xl overflow-hidden">
                                        {!hasBrokenImage && pet.imageSrc ? (
                                            <img
                                                src={getAssetPath(pet.imageSrc)}
                                                alt={pet.name}
                                                className="w-full h-full object-contain"
                                                onError={() => {
                                                    setBrokenImageIds((previous) => {
                                                        const next = new Set(previous);
                                                        next.add(pet.id);
                                                        return next;
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <>{pet.emoji}</>
                                        )}
                                    </div>

                                    <div className="text-left min-w-0 flex-1">
                                        <div className={`text-xs font-bold uppercase tracking-wider truncate ${selected ? "text-white" : "text-cyan-300 group-hover:text-white"}`}>
                                            {pet.name}
                                        </div>
                                        <div className="mt-1 text-[10px] text-green-300/80 uppercase tracking-widest">Unlocked</div>
                                    </div>

                                    {selected ? <Check size={14} className="text-cyan-200" /> : null}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-100 hover:bg-cyan-900/30 disabled:opacity-60 text-xs uppercase tracking-wider font-bold"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin inline-block" /> : "Confirm Companion"}
                        </button>
                    </div>

                    {notice ? <p className="mt-3 text-xs text-amber-200">{notice}</p> : null}
                </div>
            </div>
        </div>
    );
}
