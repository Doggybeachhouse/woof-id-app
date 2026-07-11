import type { Locale } from "@/i18n/config";

export type DuneFact = {
  id: string;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  imageUrl?: string;
};

/** Rotating dune facts shown while walking between checkpoints. */
export const DUNE_FACTS: DuneFact[] = [
  {
    id: "deer-poop",
    title: {
      nl: "Wist je dat…?",
      en: "Did you know…?",
      de: "Wusstest du…?",
    },
    body: {
      nl: "Hertenpoep ziet eruit als kleine ronde balletjes — vaak in groepjes. Zo herken je dat er herten in de buurt zijn geweest!",
      en: "Deer droppings look like small round pellets — often in little clusters. That's how you know deer have been nearby!",
      de: "Rehkot sieht aus wie kleine runde Kügelchen — oft in Gruppen. So erkennst du, dass Rehe in der Nähe waren!",
    },
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Roe_deer_droppings.jpg/320px-Roe_deer_droppings.jpg",
  },
  {
    id: "deer-village",
    title: {
      nl: "Zandvoort bij nacht",
      en: "Zandvoort at night",
      de: "Zandvoort bei Nacht",
    },
    body: {
      nl: "Soms wandelen herten 's nachts het dorp in — zeldzaam, maar je kunt een hele groep tegenkomen. Blijf rustig en geniet van het moment!",
      en: "Sometimes deer walk into the village at night — rare, but you might see a whole group. Stay calm and enjoy the moment!",
      de: "Manchmal laufen Rehe nachts ins Dorf — selten, aber du kannst eine ganze Gruppe sehen. Bleib ruhig und genieße den Moment!",
    },
  },
  {
    id: "shifting-dunes",
    title: {
      nl: "Levende duinen",
      en: "Living dunes",
      de: "Lebende Dünen",
    },
    body: {
      nl: "De duinen zijn nooit hetzelfde: wind en zee verschuiven het zand constant. Daarom verandert het landschap elk seizoen een beetje.",
      en: "The dunes are never the same: wind and sea constantly shift the sand. That's why the landscape changes a little every season.",
      de: "Die Dünen sind nie gleich: Wind und Meer verschieben den Sand ständig. Deshalb verändert sich die Landschaft jede Saison ein wenig.",
    },
  },
  {
    id: "dune-plants",
    title: {
      nl: "Duinplanten",
      en: "Dune plants",
      de: "Dünenpflanzen",
    },
    body: {
      nl: "Helmgras en duinviooltjes houden het zand vast met hun wortels. Zonder deze planten zouden de duinen wegwaaien!",
      en: "Marram grass and dune pansies hold the sand together with their roots. Without these plants, the dunes would blow away!",
      de: "Dünengras und Duinveilchen halten den Sand mit ihren Wurzeln fest. Ohne diese Pflanzen würden die Dünen wegwehen!",
    },
  },
];

export function pickDuneFact(seed: number): DuneFact {
  const index = Math.abs(seed) % DUNE_FACTS.length;
  return DUNE_FACTS[index]!;
}
