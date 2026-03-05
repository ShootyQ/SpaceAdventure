"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { db } from "@/lib/firebase";
import { getAssetPath } from "@/lib/utils";
import { DEFAULT_UNLOCK_CONFIG, getXpUnlockRules, normalizeUnlockConfig, resolveRuntimeUnlockId } from "@/lib/unlocks";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Check, Loader2 } from "lucide-react";
import { isXpUnlockEarned, normalizeXpUnlockProgressMap, syncXpUnlockProgressForRules } from "@/lib/xp-unlock-progress";

const getPurchasedShopAvatarIds = (purchasedShopItemIds?: string[]) => {
    return (purchasedShopItemIds || [])
        .filter((itemId) => String(itemId || "").toLowerCase().startsWith("avatars/"))
        .map((itemId) => String(itemId || "").split("/").pop() || "")
        .filter(Boolean);
};

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

const readPlanetXpValue = (planetXP: Record<string, number> | undefined, planetId: string) => {
    const normalizedPlanetId = normalizePlanetId(planetId);
    if (!normalizedPlanetId) return 0;

    const exact = Number(planetXP?.[normalizedPlanetId] || 0);
    if (exact > 0) return exact;

    const fallbackEntry = Object.entries(planetXP || {}).find(([key]) => normalizePlanetId(key) === normalizedPlanetId);
    return Number(fallbackEntry?.[1] || 0);
};

export default function StudentAvatarPage() {
    const { user, userData } = useAuth();

    const [unlockConfig, setUnlockConfig] = useState(DEFAULT_UNLOCK_CONFIG);
    const [planetAvatarUnlocks, setPlanetAvatarUnlocks] = useState<Record<string, Record<string, number>>>({});
    const [planetAvatarUnlockConfiguredAt, setPlanetAvatarUnlockConfiguredAt] = useState<Record<string, Record<string, number>>>({});
    const [xpUnlockProgress, setXpUnlockProgress] = useState(() => normalizeXpUnlockProgressMap(userData?.xpUnlockProgress || {}));
    const [avatarId, setAvatarId] = useState<string>(String(userData?.avatar?.avatarId || "bunny"));
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");

    const avatarCatalogIds = useMemo(() => new Set(AVATAR_OPTIONS.map((avatar) => avatar.id)), []);

    useEffect(() => {
        setXpUnlockProgress(normalizeXpUnlockProgressMap(userData?.xpUnlockProgress || {}));
    }, [userData?.xpUnlockProgress]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "game-config", "unlocks"), (snapshot) => {
            setUnlockConfig(normalizeUnlockConfig((snapshot.data() as any) || null));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const teacherId = userData?.role === "student" ? userData?.teacherId : userData?.uid;
        if (!teacherId) {
            setPlanetAvatarUnlocks({});
            setPlanetAvatarUnlockConfiguredAt({});
            return;
        }

        const unsub = onSnapshot(collection(db, `users/${teacherId}/planets`), (snapshot) => {
            const nextMap: Record<string, Record<string, number>> = {};
            const nextConfiguredAtMap: Record<string, Record<string, number>> = {};

            snapshot.forEach((planetDoc) => {
                const planetId = normalizePlanetId(planetDoc.id);
                if (!planetId) return;
                const data = planetDoc.data() as any;
                const rawUnlocks = (data?.unlocks?.avatars || {}) as Record<string, unknown>;
                const rawConfiguredAt = (data?.unlockConfiguredAt?.avatars || {}) as Record<string, unknown>;
                const normalizedUnlocks: Record<string, number> = {};
                const normalizedConfiguredAt: Record<string, number> = {};

                Object.entries(rawUnlocks).forEach(([key, value]) => {
                    const threshold = Number(value || 0);
                    if (threshold > 0) normalizedUnlocks[key] = threshold;
                });

                Object.entries(rawConfiguredAt).forEach(([key, value]) => {
                    const timestamp = Math.floor(Number(value || 0));
                    if (timestamp > 0) normalizedConfiguredAt[key] = timestamp;
                });

                nextMap[planetId] = normalizedUnlocks;
                nextConfiguredAtMap[planetId] = normalizedConfiguredAt;
            });

            setPlanetAvatarUnlocks(nextMap);
            setPlanetAvatarUnlockConfiguredAt(nextConfiguredAtMap);
        });

        return () => unsub();
    }, [userData?.role, userData?.teacherId, userData?.uid]);

    useEffect(() => {
        if (!user?.uid) return;

        const avatarXpUnlockRules = getXpUnlockRules(unlockConfig.avatars || []);
        const { changed, nextProgress } = syncXpUnlockProgressForRules({
            progress: xpUnlockProgress,
            rules: avatarXpUnlockRules,
            unlockThresholds: planetAvatarUnlocks,
            domain: "avatar",
            planetXP: userData?.planetXP as Record<string, number> | undefined,
            unlockConfiguredAt: planetAvatarUnlockConfiguredAt,
            readPlanetXpValue,
        });

        if (!changed) return;
        setXpUnlockProgress(nextProgress);
        updateDoc(doc(db, "users", user.uid), { xpUnlockProgress: nextProgress }).catch((error) => {
            console.error("Failed to sync avatar XP unlock progress:", error);
        });
    }, [planetAvatarUnlockConfiguredAt, planetAvatarUnlocks, unlockConfig.avatars, user?.uid, userData?.planetXP, xpUnlockProgress]);

    const unlockedAvatarIds = useMemo(() => {
        const idAliases = unlockConfig.idAliases;
        const starterAvatarIds = (unlockConfig.starters?.avatars || []).map((id) =>
            resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds)
        );
        const purchasedShopAvatarIds = getPurchasedShopAvatarIds(userData?.purchasedShopItemIds).map((id) =>
            resolveRuntimeUnlockId(id, idAliases, avatarCatalogIds)
        );
        const normalizedShopAvatarIds = (userData?.shopUnlockedAvatarIds || []).map((id) =>
            resolveRuntimeUnlockId(String(id || ""), idAliases, avatarCatalogIds)
        );

        const unlocked = new Set<string>([
            ...starterAvatarIds,
            ...purchasedShopAvatarIds,
            ...normalizedShopAvatarIds,
            String(userData?.avatar?.avatarId || "bunny"),
        ]);

        const avatarXpUnlockRules = getXpUnlockRules(unlockConfig.avatars || []);
        avatarXpUnlockRules.forEach((rule) => {
            const normalizedPlanetId = normalizePlanetId(rule.planetId);
            const currentPlanetXP = readPlanetXpValue(userData?.planetXP as Record<string, number> | undefined, normalizedPlanetId);
            const requiredXP = Number(planetAvatarUnlocks?.[normalizedPlanetId]?.[rule.unlockKey] || 0);
            if (isXpUnlockEarned({
                progress: xpUnlockProgress,
                planetId: normalizedPlanetId,
                unlockKey: rule.unlockKey,
                domain: "avatar",
                requiredXP,
                currentPlanetXP,
                configuredAt: Number(planetAvatarUnlockConfiguredAt?.[normalizedPlanetId]?.[rule.unlockKey] || 0),
            })) {
                unlocked.add(resolveRuntimeUnlockId(rule.id, idAliases, avatarCatalogIds));
            }
        });

        return unlocked;
    }, [avatarCatalogIds, planetAvatarUnlockConfiguredAt, planetAvatarUnlocks, unlockConfig.avatars, unlockConfig.idAliases, unlockConfig.starters?.avatars, userData?.avatar?.avatarId, userData?.planetXP, userData?.purchasedShopItemIds, userData?.shopUnlockedAvatarIds, xpUnlockProgress]);

    useEffect(() => {
        const currentAvatarId = String(userData?.avatar?.avatarId || "bunny");
        if (unlockedAvatarIds.has(avatarId)) return;
        setAvatarId(unlockedAvatarIds.has(currentAvatarId) ? currentAvatarId : "bunny");
    }, [avatarId, unlockedAvatarIds, userData?.avatar?.avatarId]);

    const selectableAvatars = useMemo(() => {
        return AVATAR_OPTIONS.filter((avatar) => unlockedAvatarIds.has(avatar.id));
    }, [unlockedAvatarIds]);

    const handleSave = async () => {
        if (!user) return;
        const safeAvatarId = unlockedAvatarIds.has(avatarId) ? avatarId : String(userData?.avatar?.avatarId || "bunny");

        setSaving(true);
        setNotice("");

        try {
            await updateDoc(doc(db, "users", user.uid), { "avatar.avatarId": safeAvatarId });
            setNotice("Avatar updated.");
        } catch (error) {
            console.error("Failed to save avatar:", error);
            setNotice("Failed to save avatar.");
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
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Avatar Selection</h1>
                            <p className="text-cyan-600 text-xs uppercase tracking-wider mt-1">Choose your pilot identity</p>
                        </div>
                        <Link href="/student/studentnavigation" className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold">
                            Back
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {selectableAvatars.map((avatar) => {
                            const selected = avatarId === avatar.id;
                            return (
                                <button
                                    key={avatar.id}
                                    type="button"
                                    onClick={() => setAvatarId(avatar.id)}
                                    className={`group relative p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${selected ? "bg-cyan-900/40 border-cyan-300" : "border-cyan-900/50 bg-black/40 hover:bg-cyan-900/20 hover:border-cyan-500/60"}`}
                                    title={avatar.name}
                                >
                                    <div className="w-20 h-20 rounded-full overflow-hidden border border-cyan-500/40 bg-black/40">
                                        <img src={getAssetPath(avatar.src)} alt={avatar.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className={`text-[11px] uppercase tracking-wider text-center leading-tight font-bold ${selected ? "text-white" : "text-cyan-300 group-hover:text-white"}`}>
                                        {avatar.name}
                                    </div>
                                    {selected ? <Check size={14} className="absolute top-2 right-2 text-cyan-200" /> : null}
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
                            {saving ? <Loader2 size={14} className="animate-spin inline-block" /> : "Confirm Avatar"}
                        </button>
                    </div>

                    {notice ? <p className="mt-3 text-xs text-amber-200">{notice}</p> : null}
                </div>
            </div>
        </div>
    );
}
