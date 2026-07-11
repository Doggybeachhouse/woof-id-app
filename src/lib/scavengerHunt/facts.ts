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

/** Beach & strand facts for the Zandvoort Strand hunt. */
export const BEACH_FACTS: DuneFact[] = [
  {
    id: "dog-summer-rules",
    title: {
      nl: "Honden op het strand",
      en: "Dogs on the beach",
      de: "Hunde am Strand",
    },
    body: {
      nl: "Van 15 april t/m 30 september mogen honden tussen 09:00 en 19:00 niet op Zandvoorts hoofdstrand. Buiten die tijden wel — en van oktober t/m april de hele dag los!",
      en: "From 15 April to 30 September, dogs aren't allowed on Zandvoort's main beach between 09:00 and 19:00. Outside those hours yes — and from October to April, off-lead all day!",
      de: "Vom 15. April bis 30. September sind Hunde zwischen 09:00 und 19:00 am Zandvoorter Hauptstrand nicht erlaubt. Außerhalb dieser Zeiten schon — und von Oktober bis April den ganzen Tag frei!",
    },
  },
  {
    id: "parnassia-dog-beach",
    title: {
      nl: "Parnassia — hondstrand",
      en: "Parnassia — dog beach",
      de: "Parnassia — Hundestrand",
    },
    body: {
      nl: "Achter Parnassia aan Zee in Bloemendaal mag je hond het hele jaar loslopen op het strand — zelfs midden in de zomer. Er geldt wel een opruimplicht!",
      en: "Behind Parnassia aan Zee in Bloemendaal, your dog can run free on the beach all year — even in mid-summer. Poop bags are mandatory!",
      de: "Hinter Parnassia aan Zee in Bloemendaal darf dein Hund das ganze Jahr frei am Strand laufen — sogar mitten im Sommer. Kotbeutel sind Pflicht!",
    },
  },
  {
    id: "tides",
    title: {
      nl: "Eb en vloed",
      en: "Tides",
      de: "Ebbe und Flut",
    },
    body: {
      nl: "De Noordzee heeft twee keer per dag eb en vloed. Bij vloed is het strand smaller; bij eb zie je schelpen, wad en soms zelfs zeehonden verderop richting IJmuiden.",
      en: "The North Sea has two high and two low tides each day. At high tide the beach is narrower; at low tide you'll spot shells, flats, and sometimes seals further toward IJmuiden.",
      de: "Die Nordsee hat zweimal täglich Ebbe und Flut. Bei Flut ist der Strand schmaler; bei Ebbe siehst du Muscheln, Watt und manchmal Robben Richtung IJmuiden.",
    },
  },
  {
    id: "film-city",
    title: {
      nl: "Filmstad Zandvoort",
      en: "Film city Zandvoort",
      de: "Filmstadt Zandvoort",
    },
    body: {
      nl: "Zandvoort is al sinds 1900 een filmstad — het Cinetone-filmstudio complex ligt hier. Elk september vind je Film by the Sea: art-house films met zeezicht.",
      en: "Zandvoort has been a film city since 1900 — the Cinetone film studio complex is here. Every September, Film by the Sea brings art-house cinema with sea views.",
      de: "Zandvoort ist seit 1900 eine Filmstadt — das Cinetone-Filmstudio liegt hier. Jedes September findet Film by the Sea statt: Art-House-Kino mit Meerblick.",
    },
  },
  {
    id: "f1-circuit",
    title: {
      nl: "Circuit Zandvoort",
      en: "Circuit Zandvoort",
      de: "Rennstrecke Zandvoort",
    },
    body: {
      nl: "Het Formule 1-circuit van Zandvoort ligt achter de duinen — sinds 1948 racen ze hier. Vanaf het strand hoor je soms de motoren als er geoefend wordt!",
      en: "Zandvoort's Formula 1 circuit sits behind the dunes — they've been racing here since 1948. From the beach you sometimes hear engines during test sessions!",
      de: "Die Formel-1-Rennstrecke von Zandvoort liegt hinter den Dünen — seit 1948 wird hier gerast. Vom Strand hörst du manchmal Motoren bei Testfahrten!",
    },
  },
  {
    id: "lifeguard-flags",
    title: {
      nl: "Strandvlaggen",
      en: "Beach flags",
      de: "Strandflaggen",
    },
    body: {
      nl: "Geel = voorzichtig zwemmen. Rood = gevaarlijk, niet zwemmen. Blauw = muien (gevaarlijke stromingen richting zee). Oranje = drijfmateriaal in het water.",
      en: "Yellow = swim with caution. Red = dangerous, don't swim. Blue = rip currents (strong flows toward the sea). Orange = floating debris in the water.",
      de: "Gelb = vorsichtig schwimmen. Rot = gefährlich, nicht schwimmen. Blau = Muien (starke Strömungen Richtung Meer). Orange = treibender Abfall im Wasser.",
    },
  },
];

export function getHuntFacts(huntSlug: string): DuneFact[] {
  if (huntSlug === "zandvoort-strand") return BEACH_FACTS;
  return DUNE_FACTS;
}

export function pickDuneFact(seed: number, huntSlug = "zuid"): DuneFact {
  const facts = getHuntFacts(huntSlug);
  const index = Math.abs(seed) % facts.length;
  return facts[index]!;
}
