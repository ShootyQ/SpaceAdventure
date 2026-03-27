"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, increment, onSnapshot, runTransaction } from "firebase/firestore";
import { ArrowLeft, BookOpen, Bot, Hammer, Shield, Sparkles, Wrench, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { UserData } from "@/types";
import {
    canCraftMachine,
    canCraftShipUpgrade,
    formatMachineCostLabel,
    getBoosterStats,
    getCurrentCargoUsed,
    getCurrentShipUpgrade,
    getHullTierStats,
    getLanderStats,
    getMachineDefinition,
    getNextShipUpgrade,
    getResourceDefinition,
    MACHINE_CATALOG,
    STARTER_MINER_ID,
} from "@/lib/resource-economy";

export default function StudentCraftingPage() {
    const { user, userData } = useAuth();
    const [liveUserData, setLiveUserData] = useState<UserData | null>(userData || null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");
    const [recipeBookOpen, setRecipeBookOpen] = useState(false);

    useEffect(() => {
        setLiveUserData(userData || null);
    }, [userData]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            setLiveUserData(snapshot.data() as UserData);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const effectiveUserData = liveUserData || userData || null;
    const resources = effectiveUserData?.resources || {};
    const ownedMachines = effectiveUserData?.ownedMachines || {};
    const placedMachines = effectiveUserData?.placedMachines || {};
    const starterMiner = getMachineDefinition(STARTER_MINER_ID);
    const cargoUsed = getCurrentCargoUsed(resources);
    const hullStats = getHullTierStats(effectiveUserData?.upgrades?.hull);
    const upgradeLevels = {
        boosters: Number(effectiveUserData?.upgrades?.boosters || 0),
        hull: Number(effectiveUserData?.upgrades?.hull || 0),
        landers: Number(effectiveUserData?.upgrades?.landers || 0),
    } as const;

    const machineRows = useMemo(() => {
        return MACHINE_CATALOG.map((machine) => ({
            machine,
            totalOwned: Number(ownedMachines[machine.id] || 0),
            availability: canCraftMachine(machine.id, resources, ownedMachines, placedMachines),
            previousMachine: machine.previousMachineId ? getMachineDefinition(machine.previousMachineId) : null,
        }));
    }, [ownedMachines, placedMachines, resources]);

    const upgradeRows = useMemo(() => {
        return (["boosters", "hull", "landers"] as const).map((family) => ({
            family,
            currentUpgrade: getCurrentShipUpgrade(family, upgradeLevels[family]),
            nextUpgrade: getNextShipUpgrade(family, upgradeLevels[family]),
            availability: canCraftShipUpgrade(family, upgradeLevels[family], resources),
        }));
    }, [resources, upgradeLevels]);

    const runWithFeedback = async (actionKey: string, action: () => Promise<string>) => {
        setPendingAction(actionKey);
        setNotice("");
        try {
            const result = await action();
            setNotice(result);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Crafting failed.");
        } finally {
            setPendingAction(null);
        }
    };

    const handleStarterMinerPurchase = async () => {
        if (!user?.uid || !starterMiner?.starterPriceCredits) {
            throw new Error("Starter miner store is offline.");
        }

        const starterMinerPrice = starterMiner.starterPriceCredits;

        await runWithFeedback("buy-starter-miner", async () => {
            const userRef = doc(db, "users", user.uid);
            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) throw new Error("Student profile not found.");

                const latestUserData = snapshot.data() as UserData;
                const currentCredits = Number(latestUserData.galacticCredits || 0);
                if (currentCredits < starterMinerPrice) {
                    throw new Error(`You need ${starterMinerPrice} credits for the first miner.`);
                }

                transaction.update(userRef, {
                    galacticCredits: increment(-starterMinerPrice),
                    ownedMachines: {
                        ...(latestUserData.ownedMachines || {}),
                        [STARTER_MINER_ID]: Number(latestUserData.ownedMachines?.[STARTER_MINER_ID] || 0) + 1,
                    },
                });
            });

            return "Starter miner acquired and moved to cargo.";
        });
    };

    const handleCraftMachine = async (machineId: string) => {
        if (!user?.uid) throw new Error("You must be signed in to craft a machine.");

        await runWithFeedback(`craft-machine-${machineId}`, async () => {
            const machine = getMachineDefinition(machineId);
            if (!machine) throw new Error("Machine blueprint not found.");

            const userRef = doc(db, "users", user.uid);
            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) throw new Error("Student profile not found.");

                const latestUserData = snapshot.data() as UserData;
                const nextResources = { ...(latestUserData.resources || {}) };
                const nextOwnedMachines = { ...(latestUserData.ownedMachines || {}) };
                const availability = canCraftMachine(machineId, nextResources, nextOwnedMachines, latestUserData.placedMachines);
                if (!availability.ok) throw new Error(availability.reason || "Missing fabrication requirements.");

                machine.costs.forEach((cost) => {
                    nextResources[cost.resourceId] = Math.max(0, Number(nextResources[cost.resourceId] || 0) - cost.quantity);
                    if (nextResources[cost.resourceId] <= 0) delete nextResources[cost.resourceId];
                });

                if (machine.previousMachineId) {
                    nextOwnedMachines[machine.previousMachineId] = Math.max(0, Number(nextOwnedMachines[machine.previousMachineId] || 0) - 1);
                    if (nextOwnedMachines[machine.previousMachineId] <= 0) delete nextOwnedMachines[machine.previousMachineId];
                }

                nextOwnedMachines[machine.id] = Number(nextOwnedMachines[machine.id] || 0) + 1;

                transaction.update(userRef, {
                    resources: nextResources,
                    ownedMachines: nextOwnedMachines,
                });
            });

            return `${machine.name} crafted and added to cargo.`;
        });
    };

    const handleCraftUpgrade = async (family: "boosters" | "hull" | "landers") => {
        if (!user?.uid) throw new Error("You must be signed in to craft ship upgrades.");

        await runWithFeedback(`craft-upgrade-${family}`, async () => {
            const userRef = doc(db, "users", user.uid);

            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(userRef);
                if (!snapshot.exists()) throw new Error("Student profile not found.");

                const latestUserData = snapshot.data() as UserData;
                const currentLevel = Number(latestUserData.upgrades?.[family] || 0);
                const nextUpgrade = getNextShipUpgrade(family, currentLevel);
                const availability = canCraftShipUpgrade(family, currentLevel, latestUserData.resources || {});

                if (!nextUpgrade) throw new Error("Upgrade family already maxed.");
                if (!availability.ok) throw new Error(availability.reason || "Missing required materials.");

                const nextResources = { ...(latestUserData.resources || {}) };
                nextUpgrade.costs.forEach((cost) => {
                    nextResources[cost.resourceId] = Math.max(0, Number(nextResources[cost.resourceId] || 0) - cost.quantity);
                    if (nextResources[cost.resourceId] <= 0) delete nextResources[cost.resourceId];
                });

                transaction.update(userRef, {
                    resources: nextResources,
                    [`upgrades.${family}`]: currentLevel + 1,
                });
            });

            const craftedUpgrade = getNextShipUpgrade(family, upgradeLevels[family]);
            return `${craftedUpgrade?.name || "Upgrade"} installed.`;
        });
    };

    const boosterStats = getBoosterStats(upgradeLevels.boosters);
    const landerStats = getLanderStats(upgradeLevels.landers);

    return (
        <div className="min-h-screen bg-space-950 text-cyan-300 font-mono p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="border border-lime-500/30 bg-black/40 rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <Link href="/student/studentnavigation" className="p-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white transition-all">
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                                    <Hammer className="text-lime-400" /> Crafting Table
                                </h1>
                                <div className="text-xs text-lime-500/60 uppercase tracking-[0.3em]">Build machines, forge upgrades, review recipes</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <Link href="/student/settings?view=inventory" className="rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/20 transition-colors">
                                Open Cargo Hold
                            </Link>
                            <button
                                onClick={() => setRecipeBookOpen((current) => !current)}
                                className="rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide bg-lime-400 text-black hover:bg-lime-300 transition-colors flex items-center gap-2"
                            >
                                <BookOpen size={16} />
                                {recipeBookOpen ? "Close Recipe Book" : "Open Recipe Book"}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-4 mt-6">
                        <SummaryCard label="Cargo Used" value={`${cargoUsed}/${hullStats.cargoCapacity}`} detail={`${hullStats.label} hull`} />
                        <SummaryCard label="Boosters Installed" value={boosterStats.label} detail={`${boosterStats.travelReductionPercent}% travel reduction`} />
                        <SummaryCard label="Landers Installed" value={landerStats.label} detail={`+${landerStats.manualGatherBonus} manual gather`} />
                        <SummaryCard label="Machines Owned" value={String(Object.values(ownedMachines).reduce((sum, count) => sum + Number(count || 0), 0))} detail="Stored in cargo" />
                    </div>

                    {notice ? (
                        <div className="mt-4 rounded-2xl border border-lime-700/40 bg-lime-950/20 px-4 py-3 text-sm text-lime-100">
                            {notice}
                        </div>
                    ) : null}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                    <div className="space-y-6">
                        <div className="border border-lime-900/40 bg-black/40 rounded-3xl p-6">
                            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold text-lime-200 uppercase tracking-widest">Material Tray</h2>
                                    <p className="text-xs text-lime-700 uppercase tracking-[0.25em] mt-1">Live crafting ingredients on hand</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.keys(resources).length === 0 ? (
                                    <div className="col-span-full rounded-2xl border border-lime-900/50 bg-lime-950/10 p-4 text-sm text-lime-500">
                                        No crafting materials in cargo yet.
                                    </div>
                                ) : Object.entries(resources).map(([resourceId, quantity]) => {
                                    const resource = getResourceDefinition(resourceId);
                                    return (
                                        <div key={resourceId} className="rounded-2xl border border-lime-900/40 bg-lime-950/10 p-4 aspect-square flex flex-col justify-between">
                                            <div className="w-12 h-12 rounded-2xl border border-lime-500/20 bg-black/30 flex items-center justify-center text-sm font-bold text-lime-100">
                                                {resource?.symbol || "--"}
                                            </div>
                                            <div>
                                                <div className={`font-bold ${resource?.accentClass || "text-white"}`}>{resource?.name || resourceId}</div>
                                                <div className="text-[10px] uppercase tracking-[0.25em] text-lime-600 mt-1">{resource?.category || "unknown"}</div>
                                            </div>
                                            <div className="text-right text-2xl font-bold text-white">{quantity}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border border-amber-900/40 bg-black/40 rounded-3xl p-6">
                            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold text-amber-200 uppercase tracking-widest">Crafting Table</h2>
                                    <p className="text-xs text-amber-700 uppercase tracking-[0.25em] mt-1">Build machine hardware and upgrade your workshop line</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {machineRows.map(({ machine, totalOwned, availability, previousMachine }) => {
                                    const isStarterMiner = machine.id === STARTER_MINER_ID;
                                    return (
                                        <div key={machine.id} className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-4">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-lg border border-amber-800/60 px-2 py-1 text-xs font-bold text-amber-100 bg-black/30">{machine.symbol}</span>
                                                        <h3 className="text-base font-bold text-white uppercase tracking-wide">{machine.name}</h3>
                                                    </div>
                                                    <div className="text-xs text-amber-500 mt-2">{machine.description}</div>
                                                    <div className="text-xs text-amber-200/80 mt-2">Output: {machine.dailyOutput} unit(s) per day</div>
                                                    <div className="text-xs text-amber-200/80 mt-1">Owned in cargo: {totalOwned}</div>
                                                    <div className="text-xs text-amber-300/80 mt-1">Recipe: {isStarterMiner ? `${machine.starterPriceCredits || 0} credits` : formatMachineCostLabel(machine.costs)}</div>
                                                    {previousMachine ? <div className="text-xs text-amber-300/80 mt-1">Consumes one spare {previousMachine.name}</div> : null}
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[220px]">
                                                    <button
                                                        onClick={() => isStarterMiner ? handleStarterMinerPurchase() : handleCraftMachine(machine.id)}
                                                        disabled={isStarterMiner ? Boolean(pendingAction) : !availability.ok || Boolean(pendingAction)}
                                                        className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-amber-400 text-black hover:bg-amber-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                                    >
                                                        {pendingAction === (isStarterMiner ? "buy-starter-miner" : `craft-machine-${machine.id}`)
                                                            ? "Crafting..."
                                                            : isStarterMiner
                                                                ? `Buy Starter Miner (${machine.starterPriceCredits || 0} cr)`
                                                                : "Craft Machine"}
                                                    </button>
                                                    {!isStarterMiner ? (
                                                        <div className="rounded-xl border border-amber-900/50 bg-black/30 px-3 py-2 text-xs text-amber-200/80">
                                                            {availability.ok ? "Materials ready." : availability.reason}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border border-cyan-900/40 bg-black/40 rounded-3xl p-6">
                            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold text-cyan-200 uppercase tracking-widest">Systems Forge</h2>
                                    <p className="text-xs text-cyan-700 uppercase tracking-[0.25em] mt-1">Turn materials into ship upgrade installs</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {upgradeRows.map(({ family, currentUpgrade, nextUpgrade, availability }) => (
                                    <div key={family} className="rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-4">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <div className="text-xs uppercase tracking-[0.25em] text-cyan-600">{family}</div>
                                                <div className="mt-1 text-base font-bold text-white uppercase tracking-wide">{currentUpgrade?.name || "Offline"}</div>
                                                <div className="mt-1 text-xs text-cyan-300/80">Current: {currentUpgrade?.effect || "No active system."}</div>
                                                {nextUpgrade ? <div className="mt-2 text-xs text-cyan-300/80">Recipe: {formatMachineCostLabel(nextUpgrade.costs)}</div> : null}
                                            </div>

                                            <div className="flex flex-col gap-2 min-w-[240px]">
                                                <div className="rounded-xl border border-cyan-900/50 bg-black/30 px-3 py-2 text-xs text-cyan-200/80">
                                                    {nextUpgrade ? `Next: ${nextUpgrade.name}` : "Max tier reached."}
                                                </div>
                                                {nextUpgrade ? (
                                                    <button
                                                        onClick={() => handleCraftUpgrade(family)}
                                                        disabled={!availability.ok || Boolean(pendingAction)}
                                                        className="rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-wide bg-cyan-400 text-black hover:bg-cyan-300 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                                                    >
                                                        {pendingAction === `craft-upgrade-${family}` ? "Installing..." : "Craft Upgrade"}
                                                    </button>
                                                ) : null}
                                                {nextUpgrade ? (
                                                    <div className="rounded-xl border border-cyan-900/50 bg-black/30 px-3 py-2 text-xs text-cyan-200/80">
                                                        {availability.ok ? nextUpgrade.effect : availability.reason}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border border-purple-900/40 bg-black/40 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles className="text-purple-300" size={20} />
                                <div>
                                    <h2 className="text-lg font-bold text-purple-200 uppercase tracking-widest">Workshop Notes</h2>
                                    <p className="text-xs text-purple-700 uppercase tracking-[0.25em] mt-1">Quick reference</p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm text-purple-100/80">
                                <div className="rounded-2xl border border-purple-900/50 bg-purple-950/10 p-4">Starter miners are bought with credits. Everything after that comes from crafted materials.</div>
                                <div className="rounded-2xl border border-purple-900/50 bg-purple-950/10 p-4">Crafted machines land in cargo hold. Deploy them from cargo or directly from a planet surface.</div>
                                <div className="rounded-2xl border border-purple-900/50 bg-purple-950/10 p-4">Ship upgrades install immediately once forged, so cargo capacity and travel speed update right away.</div>
                            </div>
                        </div>

                        {recipeBookOpen ? (
                            <div className="border border-emerald-900/40 bg-black/40 rounded-3xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <BookOpen className="text-emerald-300" size={20} />
                                    <div>
                                        <h2 className="text-lg font-bold text-emerald-200 uppercase tracking-widest">Recipe Book</h2>
                                        <p className="text-xs text-emerald-700 uppercase tracking-[0.25em] mt-1">Reference pages for everything the table can make</p>
                                    </div>
                                </div>

                                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.25em] text-emerald-500 mb-2">Machine Recipes</div>
                                        <div className="space-y-2">
                                            {MACHINE_CATALOG.map((machine) => (
                                                <div key={`recipe-machine-${machine.id}`} className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="font-bold text-white">{machine.name}</div>
                                                            <div className="text-xs text-emerald-300/80 mt-1">{machine.description}</div>
                                                        </div>
                                                        <div className="text-right text-xs text-emerald-200/80">
                                                            <div>Tier {machine.tier}</div>
                                                            <div>{machine.dailyOutput}/day</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 text-xs text-emerald-200/80">
                                                        {machine.id === STARTER_MINER_ID ? `Cost: ${machine.starterPriceCredits || 0} credits` : `Cost: ${formatMachineCostLabel(machine.costs)}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase tracking-[0.25em] text-emerald-500 mb-2">Ship Upgrade Recipes</div>
                                        <div className="space-y-2">
                                            {upgradeRows.map(({ family, currentUpgrade, nextUpgrade }) => (
                                                <div key={`recipe-upgrade-${family}`} className="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4">
                                                    <div className="flex items-center gap-2 text-emerald-300 mb-2">
                                                        {family === "boosters" ? <Zap size={16} /> : family === "hull" ? <Shield size={16} /> : <Bot size={16} />}
                                                        <span className="text-xs uppercase tracking-[0.25em]">{family}</span>
                                                    </div>
                                                    <div className="font-bold text-white">Current: {currentUpgrade?.name || "Offline"}</div>
                                                    <div className="mt-1 text-xs text-emerald-200/80">Next: {nextUpgrade?.name || "Maxed"}</div>
                                                    {nextUpgrade ? <div className="mt-2 text-xs text-emerald-200/80">Cost: {formatMachineCostLabel(nextUpgrade.costs)}</div> : null}
                                                    {nextUpgrade ? <div className="mt-1 text-xs text-emerald-300/80">Effect: {nextUpgrade.effect}</div> : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-lime-900/50 bg-lime-950/10 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-lime-600">{label}</div>
            <div className="mt-2 text-lg font-bold text-white">{value}</div>
            <div className="mt-2 text-xs text-lime-200/70">{detail}</div>
        </div>
    );
}