import { UserData } from "@/types";

export function hasPaidSubscriptionHistory(userData?: UserData | null) {
  return Boolean(userData?.subscriptionActivatedAt || userData?.stripeSubscriptionId);
}

export function isSubscriptionActive(userData?: UserData | null) {
  return userData?.subscriptionStatus === "active";
}

export function isTeacherAccessRestricted(userData?: UserData | null) {
  if (!userData || userData.role !== "teacher") return false;
  return hasPaidSubscriptionHistory(userData) && !isSubscriptionActive(userData);
}

export function getTeacherStudentLimit(userData?: UserData | null) {
  return isSubscriptionActive(userData) ? 30 : 5;
}
