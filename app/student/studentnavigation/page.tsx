"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getAssetPath, isValidProfileName, sanitizeProfileName } from "@/lib/utils";
import { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { resolveShipAssetPath } from "@/lib/ships";
import { getPetById, getResolvedSelectedPetId } from "@/lib/pets";
import { DEFAULT_RANKS, getRankProgressSnapshot } from "@/lib/student-profile";
import { Rank } from "@/types";
import { Loader2, Pencil, Save } from "lucide-react";

export default function StudentNavigationPage() {
    const { user, userData } = useAuth();
    const [ranks, setRanks] = useState<Rank[]>(DEFAULT_RANKS);

    const [avatarNameDraft, setAvatarNameDraft] = useState("");
    const [shipNameDraft, setShipNameDraft] = useState("");
    const [petNameDraft, setPetNameDraft] = useState("");

    const [editingField, setEditingField] = useState<"avatar" | "ship" | "pet" | null>(null);
    const [savingField, setSavingField] = useState<"avatar" | "ship" | "pet" | null>(null);
    const [notice, setNotice] = useState<string>("");

    useEffect(() => {
        if (!userData) return;

        const selectedAvatarId = userData?.avatar?.avatarId || "bunny";
        const selectedAvatar = AVATAR_OPTIONS.find((avatar) => avatar.id === selectedAvatarId) || AVATAR_OPTIONS[0];
        const selectedPet = getPetById(getResolvedSelectedPetId(userData));

        setAvatarNameDraft(String(userData?.avatar?.name || userData?.displayName || selectedAvatar.name || "Pilot"));
        setShipNameDraft(String(userData?.spaceship?.name || "Starship"));
        setPetNameDraft(String(userData?.selectedPetName || selectedPet.name || "Companion"));
    }, [userData]);

    useEffect(() => {
        if (!userData) return;
        const teacherId = userData.role === "student" ? userData.teacherId : userData.uid;
        let ranksRef = doc(db, "game-config", "ranks");
        if (teacherId) ranksRef = doc(db, `users/${teacherId}/settings`, "ranks");

        const unsub = onSnapshot(ranksRef, async (snapshot) => {
            if (snapshot.exists() && Array.isArray((snapshot.data() as any)?.list)) {
                setRanks((snapshot.data() as any).list as Rank[]);
                return;
            }

            if (teacherId) {
                const fallbackUnsub = onSnapshot(doc(db, "game-config", "ranks"), (fallback) => {
                    if (fallback.exists() && Array.isArray((fallback.data() as any)?.list)) {
                        setRanks((fallback.data() as any).list as Rank[]);
                    }
                });
                return () => fallbackUnsub();
            }
        });

        return () => unsub();
    }, [userData]);

    const rankSummary = useMemo(() => {
        return getRankProgressSnapshot(Number(userData?.xp || 0), ranks);
    }, [userData?.xp, ranks]);

    const selectedAvatarId = userData?.avatar?.avatarId || "bunny";
    const selectedAvatar = AVATAR_OPTIONS.find((avatar) => avatar.id === selectedAvatarId) || AVATAR_OPTIONS[0];
    const selectedShipId = userData?.spaceship?.modelId || userData?.spaceship?.id || "finalship";
    const selectedPet = getPetById(getResolvedSelectedPetId(userData));

    const saveName = async (field: "avatar" | "ship" | "pet") => {
        if (!user) return;

        const rawValue = field === "avatar" ? avatarNameDraft : field === "ship" ? shipNameDraft : petNameDraft;
        const nextValue = sanitizeProfileName(rawValue);

        if (!isValidProfileName(nextValue)) {
            setNotice("Names must be 1-30 characters and use letters, numbers, or spaces.");
            return;
        }

        setSavingField(field);
        setNotice("");

        try {
            const userRef = doc(db, "users", user.uid);
            if (field === "avatar") {
                await updateDoc(userRef, { "avatar.name": nextValue });
            } else if (field === "ship") {
                await updateDoc(userRef, { "spaceship.name": nextValue });
            } else {
                await updateDoc(userRef, { selectedPetName: nextValue });
            }

            setEditingField(null);
            setNotice("Saved.");
        } catch (error) {
            console.error("Failed to save profile name:", error);
            setNotice("Failed to save. Please try again.");
        } finally {
            setSavingField(null);
        }
    };

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="border border-cyan-500/30 bg-black/40 rounded-2xl p-5 md:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white">Student Navigation</h1>
                            <p className="text-cyan-600 text-xs uppercase tracking-wider mt-1">Current loadout and mission status</p>
                        </div>
                        <Link href="/student" className="px-3 py-2 rounded-lg border border-cyan-600/40 text-cyan-200 hover:bg-cyan-900/30 transition-colors text-xs uppercase tracking-wider font-bold">
                            Spaceship Interior
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <LoadoutCard
                            label="Avatar"
                            assetSrc={selectedAvatar.src}
                            value={avatarNameDraft}
                            isEditing={editingField === "avatar"}
                            isSaving={savingField === "avatar"}
                            onStartEdit={() => setEditingField("avatar")}
                            onChange={setAvatarNameDraft}
                            onSave={() => saveName("avatar")}
                        />
                        <LoadoutCard
                            label="Ship"
                            assetSrc={resolveShipAssetPath(selectedShipId)}
                            value={shipNameDraft}
                            isEditing={editingField === "ship"}
                            isSaving={savingField === "ship"}
                            onStartEdit={() => setEditingField("ship")}
                            onChange={setShipNameDraft}
                            onSave={() => saveName("ship")}
                        />
                        <LoadoutCard
                            label="Pet"
                            assetSrc={selectedPet.imageSrc}
                            value={petNameDraft}
                            isEditing={editingField === "pet"}
                            isSaving={savingField === "pet"}
                            onStartEdit={() => setEditingField("pet")}
                            onChange={setPetNameDraft}
                            onSave={() => saveName("pet")}
                        />
                    </div>

                    <div className="mt-4 border border-cyan-900/50 rounded-xl p-4 bg-black/30">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-cyan-600">Current Rank</p>
                                <p className="text-xl font-bold text-white uppercase">{rankSummary.currentRank.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {rankSummary.currentRank.image ? (
                                    <img src={getAssetPath(rankSummary.currentRank.image)} alt={rankSummary.currentRank.name} className="w-12 h-12 object-contain" />
                                ) : null}
                                <div className="text-right">
                                    <p className="text-xs text-cyan-500 uppercase">XP Earned</p>
                                    <p className="text-lg text-cyan-200 font-bold">{rankSummary.xp}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-cyan-500">
                                <span>{rankSummary.xpInCurrentRank} in rank</span>
                                <span>{rankSummary.nextRank ? `${rankSummary.xpToNextRank} to ${rankSummary.nextRank.name}` : "Max rank reached"}</span>
                            </div>
                            <progress
                                value={rankSummary.progressPercent}
                                max={100}
                                className="w-full h-2 mt-1 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-black [&::-webkit-progress-value]:bg-cyan-500"
                            />
                        </div>
                    </div>

                    {notice ? <p className="mt-3 text-xs text-amber-200">{notice}</p> : null}
                </div>

                <div className="border border-cyan-500/20 bg-black/40 rounded-2xl p-5">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-white mb-3">Navigation Systems</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <NavCard href="/student/hangar" title="Hangar Bay" subtitle="Ship selection only" />
                        <NavCard href="/student/avatar" title="Avatar Selection" subtitle="Avatar selection only" />
                        <NavCard href="/student/pets" title="Pet Selection" subtitle="Pet selection only" />
                        <NavCard href="/student/flag" title="Flag Designer" subtitle="Customize your class flag" />
                        <NavCard href="/student/missions" title="Mission Log" subtitle="View and complete assignments" />
                        <NavCard href="/student" title="Spaceship Interior" subtitle="Enter interior view" />
                        <NavCard href="/student/shop" title="Intergalactic Shop" subtitle="Spend galactic credits" />
                        <NavCard href="/student/map" title="Solar System Map" subtitle="Open star map" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function NavCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
    return (
        <Link href={href} className="border border-cyan-700/40 bg-cyan-950/10 rounded-xl px-4 py-4 hover:border-cyan-400/60 hover:bg-cyan-900/20 transition-colors">
            <div className="text-sm font-bold uppercase tracking-wider text-cyan-200">{title}</div>
            <div className="text-xs text-cyan-500 mt-1">{subtitle}</div>
        </Link>
    );
}

function LoadoutCard({
    label,
    assetSrc,
    value,
    isEditing,
    isSaving,
    onStartEdit,
    onChange,
    onSave,
}: {
    label: string;
    assetSrc?: string;
    value: string;
    isEditing: boolean;
    isSaving: boolean;
    onStartEdit: () => void;
    onChange: (value: string) => void;
    onSave: () => void;
}) {
    return (
        <div className="border border-cyan-900/50 bg-black/30 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-cyan-600 mb-2">{label}</div>
            <div className="h-24 rounded-lg border border-cyan-900/40 bg-black/40 flex items-center justify-center p-2 mb-3">
                {assetSrc ? (
                    <img src={getAssetPath(assetSrc)} alt={label} className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="text-xs text-cyan-700">No asset</div>
                )}
            </div>

            {isEditing ? (
                <div className="flex gap-2">
                    <input
                        value={value}
                        onChange={(e) => onChange(sanitizeProfileName(e.target.value))}
                        maxLength={30}
                        className="w-full bg-black/50 border border-cyan-800 rounded px-2 py-1 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder={`${label} name`}
                    />
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-3 rounded border border-cyan-600/50 text-cyan-200 hover:bg-cyan-900/20 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    <div className="text-white font-bold truncate">{value}</div>
                    <button
                        onClick={onStartEdit}
                        title={`Edit ${label} name`}
                        aria-label={`Edit ${label} name`}
                        className="px-2 py-1 rounded border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/20"
                    >
                        <Pencil size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
