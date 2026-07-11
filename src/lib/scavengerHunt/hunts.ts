import type { Locale } from "@/i18n/config";

export type HuntRouteVariant = "full" | "short";

export type HuntCatalogEntry = {
  slug: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  durationMinutesFull: number;
  durationMinutesShort: number;
  /** Difficulty on a 1–5 scale (half steps allowed, e.g. 2.5). */
  difficultyStars: number;
  /** Checkpoint array index that can be skipped on the short route. */
  optionalSkipCheckpointIndex: number | null;
  areaLabel: Record<Locale, string>;
  /** Override default hunts.wheelchairNotice when set. */
  wheelchairNotice?: Record<Locale, string>;
};

export const HUNT_CATALOG: HuntCatalogEntry[] = [
  {
    slug: "zuid",
    name: {
      nl: "Losloopgebied Zuid",
      en: "Off-leash area Zuid",
      de: "Freilaufgebiet Zuid",
    },
    description: {
      nl: "Wandel met je hond door losloopgebied Zuid. Loop naar GPS-checkpoints, maak foto's en verdien Woof Coins.",
      en: "Walk your dog through off-leash area Zuid. Reach GPS checkpoints, take photos, and earn Woof Coins.",
      de: "Wandere mit deinem Hund durch das Freilaufgebiet Zuid. Erreiche GPS-Checkpoints, mach Fotos und verdiene Woof Coins.",
    },
    durationMinutesFull: 60,
    durationMinutesShort: 40,
    difficultyStars: 2.5,
    optionalSkipCheckpointIndex: 5,
    areaLabel: {
      nl: "Zandvoort",
      en: "Zandvoort",
      de: "Zandvoort",
    },
  },
  {
    slug: "zandvoort-strand",
    name: {
      nl: "Zandvoort Strand",
      en: "Zandvoort Beach",
      de: "Strand Zandvoort",
    },
    description: {
      nl: "Wandel een rondje over strand en duinen rond Zuid strand. Van Doggy Beach House langs iconische plekken — foto's, weetjes en Woof Coins.",
      en: "Walk a loop along beach and dunes around South Beach. From Doggy Beach House past iconic spots — photos, fun facts, and Woof Coins.",
      de: "Wandere eine Runde über Strand und Dünen am Südstrand. Vom Doggy Beach House vorbei an ikonischen Orten — Fotos, Fakten und Woof Coins.",
    },
    durationMinutesFull: 45,
    durationMinutesShort: 45,
    difficultyStars: 2,
    optionalSkipCheckpointIndex: null,
    areaLabel: {
      nl: "Zandvoort · strand",
      en: "Zandvoort · beach",
      de: "Zandvoort · Strand",
    },
    wheelchairNotice: {
      nl: "Gedeeltelijk toegankelijk — zand, duinpaden en strand zijn lastig met rolstoel of rollator.",
      en: "Partially accessible — sand, dune paths, and the beach are difficult with a wheelchair or rollator.",
      de: "Teilweise barrierefrei — Sand, Dünenwege und Strand sind mit Rollstuhl oder Rollator schwierig.",
    },
  },
];

export function getHuntBySlug(slug: string): HuntCatalogEntry | null {
  return HUNT_CATALOG.find((h) => h.slug === slug) ?? null;
}

export function getHuntDisplayName(slug: string, locale: Locale): string {
  const hunt = getHuntBySlug(slug);
  if (!hunt) return slug;
  return hunt.name[locale] ?? hunt.name.nl;
}

export function getHuntDescription(slug: string, locale: Locale): string {
  const hunt = getHuntBySlug(slug);
  if (!hunt) return "";
  return hunt.description[locale] ?? hunt.description.nl;
}

export function getDurationMinutes(
  slug: string,
  variant: HuntRouteVariant,
): number {
  const hunt = getHuntBySlug(slug);
  if (!hunt) return 0;
  return variant === "short"
    ? hunt.durationMinutesShort
    : hunt.durationMinutesFull;
}

export function parseRouteVariant(value: unknown): HuntRouteVariant {
  return value === "short" ? "short" : "full";
}
