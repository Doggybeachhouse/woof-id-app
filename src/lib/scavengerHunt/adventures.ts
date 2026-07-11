import type { Locale } from "@/i18n/config";

export type HuntAdventureMeta = {
  slug: string;
  name: Record<Locale, string>;
  /** Shown under the frame title on the completion collage. */
  adventureLabel: Record<Locale, string>;
};

export const HUNT_ADVENTURES: Record<string, HuntAdventureMeta> = {
  zuid: {
    slug: "zuid",
    name: {
      nl: "Zuid",
      en: "Zuid",
      de: "Zuid",
    },
    adventureLabel: {
      nl: "Avontuur Zuid",
      en: "Zuid Adventure",
      de: "Abenteuer Zuid",
    },
  },
};

export function getHuntAdventure(slug: string): HuntAdventureMeta | null {
  return HUNT_ADVENTURES[slug] ?? null;
}

export function getAdventureDisplayName(slug: string, locale: Locale): string {
  const meta = getHuntAdventure(slug);
  if (meta) return meta.adventureLabel[locale] ?? meta.adventureLabel.nl;
  return slug;
}

/** Fixed frame headline on the completion collage (per product brief). */
export const ADVENTURE_FRAME_HEADLINE =
  "I walked the Doggy Beach House Adventure";
