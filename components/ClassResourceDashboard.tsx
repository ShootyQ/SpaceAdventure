"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Activity, Database, Map, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { ClassPlanetDiscoveryState, PLANETS, UserData } from "@/types";
import {
    RESOURCE_DISCOVERY_DOC_ID,
    getCurrentCargoUsed,
    getPlanetResources,
    getResourceDefinition,
    normalizeClassPlanetDiscoveryState,
} from "@/lib/resource-economy";

const normalizePlanetId = (planetId?: string) => String(planetId || "").trim().toLowerCase();

export function ClassResourceDashboard({
    teacherId,
    title = "Class Resource Dashboard",
    subtitle = "Track discovery progress, fleet activity, and stored cargo outside the map.",
}: {
    teacherId: string | null;
    title?: string;
    subtitle?: string;
}) {
    const [students, setStudents] = useState<UserData[]>([]);
    const [discoveries, setDiscoveries] = useState<ClassPlanetDiscoveryState>({});

    useEffect(() => {
        if (!teacherId) {
            setStudents([]);
            return;
        }

        const studentsQuery = query(collection(db, "users"), where("teacherId", "==", teacherId));
        const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
            setStudents(snapshot.docs.map((studentDoc) => ({ ...(studentDoc.data() as UserData), uid: studentDoc.id })));
        });

        return () => unsubscribe();
    }, [teacherId]);

    useEffect(() => {
        if (!teacherId) {
            setDiscoveries({});
            return;
        }

        const discoveryRef = doc(db, `users/${teacherId}/settings`, RESOURCE_DISCOVERY_DOC_ID);
        const unsubscribe = onSnapshot(discoveryRef, (snapshot) => {
            const data = snapshot.data();
            setDiscoveries(normalizeClassPlanetDiscoveryState(data?.planets));
        });

        return () => unsubscribe();
    }, [teacherId]);

    const nonSunPlanets = useMemo(() => PLANETS.filter((planet) => planet.id !== "sun"), []);

    const summary = useMemo(() => {
        const categoryTotals = { ore: 0, gas: 0, organic: 0 };
        const categoryFound = { ore: 0, gas: 0, organic: 0 };
        let discoveredSlots = 0;
        let totalSlots = 0;
        let completedPlanets = 0;

        nonSunPlanets.forEach((planet) => {
            const assignments = getPlanetResources(planet.id);
            const discoveredIds = new Set(discoveries[normalizePlanetId(planet.id)] || []);
            totalSlots += assignments.length;
            discoveredSlots += discoveredIds.size;
            if (assignments.length > 0 && assignments.every((assignment) => discoveredIds.has(assignment.resourceId))) {
                completedPlanets += 1;
            }

            assignments.forEach((assignment) => {
                categoryTotals[assignment.category] += 1;
                if (discoveredIds.has(assignment.resourceId)) {
                    categoryFound[assignment.category] += 1;
                }
            });
        });

        const activeMachines = students.reduce((sum, student) => sum + Object.keys(student.placedMachines || {}).length, 0);
        const storedCargo = students.reduce((sum, student) => sum + getCurrentCargoUsed(student.resources || {}), 0);

        return {
            discoveredSlots,
            totalSlots,
            completedPlanets,
            totalPlanets: nonSunPlanets.length,
            activeMachines,
            storedCargo,
            categoryTotals,
            categoryFound,
        };
    }, [discoveries, nonSunPlanets, students]);

    const planetRows = useMemo(() => {
        return nonSunPlanets.map((planet) => {
            const assignments = getPlanetResources(planet.id);
            const discoveredIds = new Set(discoveries[normalizePlanetId(planet.id)] || []);
            const discoveredAssignments = assignments.filter((assignment) => discoveredIds.has(assignment.resourceId));
            const progress = assignments.length > 0 ? Math.round((discoveredAssignments.length / assignments.length) * 100) : 0;
            const activeMachines = students.reduce((sum, student) => {
                return sum + Object.values(student.placedMachines || {}).filter((placedMachine) => normalizePlanetId(placedMachine.planetId) === planet.id).length;
            }, 0);
            const stationedStudents = students.filter((student) => normalizePlanetId(student.location) === planet.id).length;

            return {
                planet,
                assignments,
                discoveredAssignments,
                progress,
                activeMachines,
                stationedStudents,
            };
        });
    }, [discoveries, nonSunPlanets, students]);

    if (!teacherId) {
        return (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-white/70">
                Select a class to load discovery telemetry.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-500/20 bg-black/50 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-400">Telemetry</div>
                        <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-cyan-100/70">{subtitle}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-right">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">Discovery Progress</div>
                        <div className="mt-1 text-2xl font-bold text-white">{summary.discoveredSlots}/{summary.totalSlots}</div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardStat icon={Database} label="Resource Slots Found" value={`${summary.discoveredSlots}/${summary.totalSlots}`} detail={`${summary.completedPlanets}/${summary.totalPlanets} planets fully scanned`} />
                <DashboardStat icon={Users} label="Students Linked" value={`${students.length}`} detail="Live roster snapshot" />
                <DashboardStat icon={Activity} label="Active Field Machines" value={`${summary.activeMachines}`} detail="All deployed machines across the class" />
                <DashboardStat icon={Map} label="Cargo In Fleet" value={`${summary.storedCargo}`} detail="Combined stored resources on student ships" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {(["ore", "gas", "organic"] as const).map((category) => (
                    <div key={category} className="rounded-3xl border border-white/10 bg-black/40 p-5">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400">{category}</div>
                        <div className="mt-2 text-2xl font-bold text-white">{summary.categoryFound[category]}/{summary.categoryTotals[category]}</div>
                        <progress
                            className="mt-2 h-2 w-full overflow-hidden rounded-full [accent-color:#34d399]"
                            value={summary.categoryFound[category]}
                            max={summary.categoryTotals[category] || 1}
                        />
                    </div>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {planetRows.map((row) => (
                    <div key={row.planet.id} className="rounded-3xl border border-white/10 bg-black/40 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs uppercase tracking-[0.25em] text-cyan-400">{row.planet.id}</div>
                                <h2 className="mt-1 text-xl font-bold text-white">{row.planet.name}</h2>
                                <div className="mt-2 text-sm text-cyan-100/70">{row.discoveredAssignments.length}/{row.assignments.length} resources discovered</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-emerald-300">{row.progress}%</div>
                                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/60">Scan complete</div>
                            </div>
                        </div>

                        <progress
                            className="mt-3 h-2 w-full overflow-hidden rounded-full [accent-color:#2dd4bf]"
                            value={row.discoveredAssignments.length}
                            max={row.assignments.length || 1}
                        />

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">Class Activity</div>
                                <div className="mt-2 text-sm text-white">{row.activeMachines} machines deployed</div>
                                <div className="mt-1 text-xs text-cyan-100/60">{row.stationedStudents} students currently on planet</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">Discovered Intel</div>
                                {row.discoveredAssignments.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {row.discoveredAssignments.map((assignment) => {
                                            const resource = getResourceDefinition(assignment.resourceId);
                                            return (
                                                <span key={assignment.resourceId} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
                                                    {resource?.name || assignment.resourceName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-white/50">No discoveries logged yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DashboardStat({
    icon: Icon,
    label,
    value,
    detail,
}: {
    icon: typeof Database;
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400">{label}</div>
                    <div className="mt-2 text-3xl font-bold text-white">{value}</div>
                    <div className="mt-1 text-xs text-cyan-100/60">{detail}</div>
                </div>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}