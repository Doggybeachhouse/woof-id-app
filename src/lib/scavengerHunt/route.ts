import { getHuntCheckpoints } from "@/lib/scavengerHunt/checkpoints";
import {
  getHuntBySlug,
  type HuntRouteVariant,
} from "@/lib/scavengerHunt/hunts";

export function getSkipCheckpointIndices(
  slug: string,
  variant: HuntRouteVariant,
): number[] {
  if (variant === "full") return [];
  const hunt = getHuntBySlug(slug);
  if (hunt?.optionalSkipCheckpointIndex == null) return [];
  return [hunt.optionalSkipCheckpointIndex];
}

export function getActiveCheckpointIndices(
  slug: string,
  variant: HuntRouteVariant,
): number[] {
  const skip = new Set(getSkipCheckpointIndices(slug, variant));
  return getHuntCheckpoints(slug)
    .map((_, index) => index)
    .filter((index) => !skip.has(index));
}

export function getNextStepIndex(
  slug: string,
  currentIndex: number,
  variant: HuntRouteVariant,
): number {
  const checkpoints = getHuntCheckpoints(slug);
  const skip = new Set(getSkipCheckpointIndices(slug, variant));
  let next = currentIndex + 1;
  while (skip.has(next) && next < checkpoints.length) {
    next += 1;
  }
  return next;
}

export function isHuntComplete(
  slug: string,
  nextStep: number,
  variant: HuntRouteVariant,
): boolean {
  const active = getActiveCheckpointIndices(slug, variant);
  if (active.length === 0) return true;
  const lastRequired = active[active.length - 1]!;
  return nextStep > lastRequired;
}

export function canChangeRouteVariant(
  slug: string,
  currentStep: number,
  submissions: { checkpointIndex: number }[],
  hunt: { optionalSkipCheckpointIndex: number | null },
): boolean {
  if (hunt.optionalSkipCheckpointIndex == null) return false;
  const skipIndex = hunt.optionalSkipCheckpointIndex;
  if (submissions.some((s) => s.checkpointIndex === skipIndex)) return false;
  if (currentStep > skipIndex) return false;
  return true;
}

export function resolveCurrentStep(
  step: number,
  slug: string,
  variant: HuntRouteVariant,
): number {
  const checkpoints = getHuntCheckpoints(slug);
  const skip = new Set(getSkipCheckpointIndices(slug, variant));
  let resolved = step;
  while (skip.has(resolved) && resolved < checkpoints.length) {
    resolved += 1;
  }
  return resolved;
}

export function getQuestPosition(
  currentStep: number,
  activeIndices: number[],
): { current: number; total: number } {
  const total = activeIndices.length;
  const position = activeIndices.indexOf(currentStep);
  return {
    current: position >= 0 ? position + 1 : total,
    total,
  };
}
