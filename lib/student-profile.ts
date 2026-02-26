import { Rank } from "@/types";

export const DEFAULT_RANKS: Rank[] = [
    { id: "1", name: "Space Cadet", minXP: 0, image: "/images/badges/cadet.png" },
    { id: "2", name: "Rookie Pilot", minXP: 100, image: "/images/badges/RookiePilot.png" },
    { id: "3", name: "Star Scout", minXP: 300, image: "/images/badges/StarScout.png" },
    { id: "4", name: "Nebula Navigator", minXP: 600, image: "/images/badges/NebulaNavigator.png" },
    { id: "5", name: "Solar Specialist", minXP: 1000, image: "/images/badges/SolarSpecialist.png" },
    { id: "6", name: "Comet Captain", minXP: 1500, image: "/images/badges/CometCaptain.png" },
    { id: "7", name: "Galaxy Guardian", minXP: 2200, image: "/images/badges/GalaxyGuardian.png" },
    { id: "8", name: "Cosmic Commander", minXP: 3000, image: "/images/badges/CosmicCommander.png" },
    { id: "9", name: "Void Admiral", minXP: 4000, image: "/images/badges/VoidAdmiral.png" },
    { id: "10", name: "Grand Star Admiral", minXP: 5000, image: "/images/badges/GrandStarAdmiral.png" },
];

export interface RankProgressSnapshot {
    currentRank: Rank;
    nextRank: Rank | null;
    xp: number;
    xpInCurrentRank: number;
    xpToNextRank: number;
    progressPercent: number;
}

export const getRankProgressSnapshot = (xpValue: number, rankList: Rank[]): RankProgressSnapshot => {
    const xp = Math.max(0, Number(xpValue || 0));
    const sortedRanksAsc = [...(rankList?.length ? rankList : DEFAULT_RANKS)].sort((a, b) => a.minXP - b.minXP);
    const sortedRanksDesc = [...sortedRanksAsc].sort((a, b) => b.minXP - a.minXP);

    const currentRank = sortedRanksDesc.find((rank) => xp >= rank.minXP) || sortedRanksAsc[0];
    const currentRankIndex = sortedRanksAsc.findIndex((rank) => rank.id === currentRank.id);
    const nextRank = currentRankIndex >= 0 ? (sortedRanksAsc[currentRankIndex + 1] || null) : null;

    const currentRankFloor = currentRank?.minXP || 0;
    const xpInCurrentRank = Math.max(xp - currentRankFloor, 0);
    const xpToNextRank = nextRank ? Math.max(nextRank.minXP - xp, 0) : 0;
    const rankSpan = nextRank ? Math.max(nextRank.minXP - currentRankFloor, 1) : 1;
    const progressPercent = nextRank ? Math.min(100, Math.max(0, (xpInCurrentRank / rankSpan) * 100)) : 100;

    return {
        currentRank,
        nextRank,
        xp,
        xpInCurrentRank,
        xpToNextRank,
        progressPercent,
    };
};