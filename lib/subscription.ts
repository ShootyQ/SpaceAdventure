import { UserData } from "@/types";

export const TEACHER_TRIAL_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMillis(value: any): number | null {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value?.toDate === "function") {
    const parsed = value.toDate()?.getTime?.();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.seconds === "number") {
    const nanos = typeof value?.nanoseconds === "number" ? value.nanoseconds : 0;
    return value.seconds * 1000 + Math.floor(nanos / 1_000_000);
  }
  return null;
}

function getTrialStartMs(userData?: UserData | null) {
  return toMillis(userData?.trialStartedAt) ?? toMillis(userData?.createdAt);
}

function getTrialEndMs(userData?: UserData | null, trialStartMs?: number | null) {
  const explicitEnd = toMillis(userData?.trialEndsAt);
  if (explicitEnd) return explicitEnd;
  if (!trialStartMs) return null;
  return trialStartMs + TEACHER_TRIAL_DAYS * MS_PER_DAY;
}

export function getTeacherTrialInfo(userData?: UserData | null, nowMs = Date.now()) {
  if (!userData || userData.role !== "teacher") return null;

  const trialStartMs = getTrialStartMs(userData);
  const trialEndMs = getTrialEndMs(userData, trialStartMs);
  if (!trialStartMs || !trialEndMs) {
    return {
      trialStartMs: null,
      trialEndMs: null,
      trialDaysRemaining: null,
      trialExpired: false,
    };
  }

  const trialExpired = nowMs >= trialEndMs;
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndMs - nowMs) / MS_PER_DAY));

  return {
    trialStartMs,
    trialEndMs,
    trialDaysRemaining,
    trialExpired,
  };
}

export function hasPaidSubscriptionHistory(userData?: UserData | null) {
  return Boolean(userData?.subscriptionActivatedAt || userData?.stripeSubscriptionId);
}

export function isSubscriptionActive(userData?: UserData | null) {
  return userData?.subscriptionStatus === "active";
}

export function isTeacherTrialActive(userData?: UserData | null) {
  if (!userData || userData.role !== "teacher") return false;
  if (isSubscriptionActive(userData)) return false;
  const trialInfo = getTeacherTrialInfo(userData);
  return Boolean(trialInfo && !trialInfo.trialExpired);
}

export function isTeacherTrialExpired(userData?: UserData | null) {
  if (!userData || userData.role !== "teacher") return false;
  if (isSubscriptionActive(userData)) return false;
  const trialInfo = getTeacherTrialInfo(userData);
  return Boolean(trialInfo?.trialExpired);
}

export function isTeacherAccessRestricted(userData?: UserData | null) {
  if (!userData || userData.role !== "teacher") return false;
  if (isSubscriptionActive(userData)) return false;
  return hasPaidSubscriptionHistory(userData) || isTeacherTrialExpired(userData);
}

export function getTeacherStudentLimit(userData?: UserData | null) {
  if (!userData || userData.role !== "teacher") return 30;
  return 30;
}
