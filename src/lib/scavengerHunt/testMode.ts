import { isStaffRole } from "@/lib/serverAuth";

export function isHuntTestModeEnvEnabled(): boolean {
  return process.env.HUNT_TEST_MODE === "true";
}

/** Staff or `HUNT_TEST_MODE=true` (owner demo on prod). */
export function canUseHuntTestMode(role?: string): boolean {
  return isStaffRole(role) || isHuntTestModeEnvEnabled();
}
