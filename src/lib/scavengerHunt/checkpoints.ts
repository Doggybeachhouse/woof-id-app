import type { Locale } from "@/i18n/config";

export type HuntCheckpoint = {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  sortOrder: number;
  title: Record<Locale, string>;
  instruction: Record<Locale, string>;
  hint: Record<Locale, string>;
};

/**
 * Losloopgebied Zuid — route by Doggy Beach House (GPS + photo checkpoints).
 */
export const ZUID_HUNT_CHECKPOINTS: HuntCheckpoint[] = [
  {
    id: "zuid-start",
    lat: 52.366496,
    lng: 4.524458,
    radiusMeters: 5,
    sortOrder: 0,
    title: {
      nl: "Start — Losloopgebied Zuid",
      en: "Start — Off-leash area Zuid",
      de: "Start — Freilaufgebiet Zuid",
    },
    instruction: {
      nl: "Welkom bij de Woof ID-speurtocht door losloopgebied Zuid! Hier mag je hond lekker vrij rondrennen. Maak een startfoto met je viervoeter — de wandeling gaat beginnen.",
      en: "Welcome to the Woof ID scavenger hunt through off-leash area Zuid! Your dog can run free here. Take a starting photo with your four-legged friend — the walk begins now.",
      de: "Willkommen bei der Woof ID-Schnitzeljagd durch das Freilaufgebiet Zuid! Hier darf dein Hund frei rennen. Mach ein Startfoto mit deinem Vierbeiner — los geht die Tour.",
    },
    hint: {
      nl: "Je staat aan het begin van het losloopgebied. Volg het zandpad richting de duinen — de volgende stop ligt iets verder het gebied in.",
      en: "You're at the start of the off-leash area. Follow the sandy path toward the dunes — the next stop is a bit deeper into the area.",
      de: "Du stehst am Anfang des Freilaufgebiets. Folge dem Sandweg Richtung Dünen — der nächste Stopp liegt etwas weiter im Gebiet.",
    },
  },
  {
    id: "zuid-pad-2",
    lat: 52.365665,
    lng: 4.526636,
    radiusMeters: 5,
    sortOrder: 1,
    title: {
      nl: "Het pad verder de duinen in",
      en: "Deeper into the dunes",
      de: "Weiter in die Dünen",
    },
    instruction: {
      nl: "Je loopt nu verder het losloopgebied in. Voel je het zand onder je schoenen? Even ademen, genieten, en maak een foto van je hond terwijl jullie verder de duinen in slenteren.",
      en: "You're heading further into the off-leash area. Feel the sand under your feet? Take a breath, enjoy the moment, and snap a photo of your dog as you wander deeper into the dunes.",
      de: "Du gehst weiter ins Freilaufgebiet hinein. Spürst du den Sand unter den Schuhen? Atme durch, genieße den Moment und mach ein Foto deines Hundes auf dem Weg durch die Dünen.",
    },
    hint: {
      nl: "Blijf het hoofdpad volgen dat dieper de duinen in slingert. Je hoeft geen zijpaden te nemen — loop gewoon door op het zand.",
      en: "Keep following the main path winding deeper into the dunes. No side trails needed — just keep walking on the sand.",
      de: "Bleib auf dem Hauptweg, der tiefer in die Dünen führt. Keine Seitenwege nötig — einfach weiter auf dem Sand gehen.",
    },
  },
  {
    id: "zuid-hek-awduinen",
    lat: 52.3651111,
    lng: 4.5273333,
    radiusMeters: 5,
    sortOrder: 2,
    title: {
      nl: "Het hek — Amsterdamse Waterleidingduinen",
      en: "The fence — Amsterdam Water Supply Dunes",
      de: "Der Zaun — Amsterdamse Waterleidingduinen",
    },
    instruction: {
      nl: "<strong>Loop naar het hek.</strong> Hier begint het gebied van de Amsterdamse Waterleidingduinen. Helaas mogen honden (en mensen zonder vergunning) hier niet verder vanwege de kwetsbare natuur: herten, vossen, konijnen en veel vogels leven hier beschermd.<br><br><strong>Hebben jullie al wat Zandvoorts wildlife gespot?</strong> Kijk rustig door het hek — maar blijf aan deze kant met je hond. Maak een foto van jullie bij het hek als herinnering aan de wilde buren van Zandvoort.",
      en: "<strong>Walk to the fence.</strong> Beyond here lies the Amsterdam Water Supply Dunes reserve. Dogs aren't allowed further in — this area protects deer, foxes, rabbits and many bird species.<br><br><strong>Spotted any of Zandvoort's wildlife yet?</strong> Peek through the fence — but stay on this side with your dog. Take a photo together at the fence as a memory of Zandvoort's wild neighbours.",
      de: "<strong>Geh zum Zaun.</strong> Dahinter beginnt das Naturschutzgebiet der Amsterdamse Waterleidingduinen. Hunde dürfen hier nicht weiter — dort leben geschützt Rehe, Füchse, Kaninchen und viele Vögel.<br><br><strong>Schon Wild in Zandvoort entdeckt?</strong> Schau durch den Zaun — bleib aber mit deinem Hund auf dieser Seite. Mach ein Foto am Zaun als Erinnerung an Zandvoorts wilde Nachbarn.",
    },
    hint: {
      nl: "Zoek het hek aan de rand van het losloopgebied — het grenst aan de Waterleidingduinen. Volg de kompasrichting tot je het rasterhek ziet.",
      en: "Look for the fence at the edge of the off-leash area — it borders the Water Supply Dunes. Follow the compass until you spot the wire fence.",
      de: "Suche den Zaun am Rand des Freilaufgebiets — er grenzt an die Waterleidingduinen. Folge dem Kompass, bis du das Drahtgitter siehst.",
    },
  },
  {
    id: "zuid-duintuin",
    lat: 52.366195,
    lng: 4.528677,
    radiusMeters: 5,
    sortOrder: 3,
    title: {
      nl: "De Duintuin",
      en: "The Dune Garden",
      de: "Der Dünengarten",
    },
    instruction: {
      nl: "<strong>Wist je dat Zandvoort ooit beroemd was om zijn aardappelen?</strong> De zandgrond en het zeeklimaat maakten de Zandvoortse aardappel extra zoet en geliefd — een echte streekproduct trots!<br><br>Bij deze duintuin groeien inheemse planten die de duinen gezond houden. Voor honden: gewone aardappel is <em>niet</em> gezond (rauw zelfs giftig), maar <strong>gekookte zoete aardappel</strong> zonder kruiden is een populaire, veilig hondensnack — rijk aan vezels en vitamines.<br><br>Maak een foto van je hond bij de duintuin. Bonuspunten als je een plant herkent!",
      en: "<strong>Did you know Zandvoort was once famous for its potatoes?</strong> Sandy soil and sea air made the local potato especially sweet — a true regional pride!<br><br>At this dune garden, native plants help keep the dunes healthy. For dogs: regular potato isn't safe raw, but <strong>plain cooked sweet potato</strong> is a popular healthy treat — rich in fibre and vitamins.<br><br>Take a photo of your dog at the dune garden. Extra woof if you spot a plant you know!",
      de: "<strong>Wusstest du, dass Zandvoort einst für seine Kartoffeln berühmt war?</strong> Sandboden und Meeresluft machten die Zandvoorter Kartoffel besonders süß — echtes regional Stolz!<br><br>In diesem Dünengarten wachsen heimische Pflanzen, die die Dünen stärken. Für Hunde: normale Kartoffeln sind roh ungesund, aber <strong>gekochte Süßkartoffel</strong> ohne Gewürze ist ein beliebter, sicherer Snack.<br><br>Mach ein Foto deines Hundes am Dünengarten!",
    },
    hint: {
      nl: "Vanaf het hek sla je af richting oosten. Zoek een plek met beplant duin — de duintuin ligt langs het pad, niet ver van het hek.",
      en: "From the fence, head east. Look for a planted dune patch along the path — the dune garden is near the fence, not far along the trail.",
      de: "Vom Zaun aus geht es Richtung Osten. Suche eine bepflanzte Dünenstelle am Weg — der Dünengarten liegt nicht weit vom Zaun entfernt.",
    },
  },
  {
    id: "zuid-zwanenmeer",
    lat: 52.366367,
    lng: 4.53416,
    radiusMeters: 5,
    sortOrder: 4,
    title: {
      nl: "Het Zwanenmeer",
      en: "Swan Lake",
      de: "Der Schwanensee",
    },
    instruction: {
      nl: "<strong>Wellicht heb je het al van een afstand gezien: het Zwanenmeer.</strong> Dit meer ontstond in de jaren na de sluiting van de stortplaats (1987) — regenwater vulde de oude kuil langzaam, en de natuur nam het over. Vandaag komen hier zwanen, eenden, reigers en andere watervogels.<br><br><strong>Let op:</strong> laat je hond in de zomer — zeker na warm weer — <em>niet</em> in het water zwemmen vanwege blauwalg. Daarom ligt dit checkpoint bewust op afstand van de oever.<br><br>Maak een foto met je hond met het meer op de achtergrond.",
      en: "<strong>Maybe you've already spotted it from afar: Swan Lake.</strong> This lake formed after the landfill closed in 1987 — rainwater slowly filled the old pit and nature reclaimed it. Today you'll see swans, ducks, herons and other water birds.<br><br><strong>Important:</strong> in summer, especially after hot weather, don't let your dog swim here due to blue-green algae risk. That's why this checkpoint is placed away from the shore.<br><br>Take a photo with your dog and the lake in the background.",
      de: "<strong>Vielleicht hast du es schon in der Ferne gesehen: der Schwanensee.</strong> Entstanden nach Schließung der Deponie 1987 — Regenwasser füllte die alte Grube, und die Natur eroberte sie zurück. Heute siehst du Schwäne, Enten, Reiher und andere Wasservögel.<br><br><strong>Achtung:</strong> Lass deinen Hund im Sommer — besonders nach Hitze — <em>nicht</em> im Wasser schwimmen (Blaualgen). Deshalb liegt dieser Checkpoint bewusst nicht direkt am Ufer.<br><br>Mach ein Foto mit deinem Hund und dem See im Hintergrund.",
    },
    hint: {
      nl: "Loop verder oostwaarts door de duinen. Het meer ligt in een lage kuil — je ziet het vaak al glinsteren tussen de heuvels voordat je er bent.",
      en: "Keep walking east through the dunes. The lake sits in a low pit — you can often spot it glinting between the hills before you arrive.",
      de: "Geh weiter ostwärts durch die Dünen. Der See liegt in einer Senke — oft siehst du ihn schon zwischen den Hügeln glitzern.",
    },
  },
  {
    id: "zuid-hoogste-heuvel",
    lat: 52.365782,
    lng: 4.5387583,
    radiusMeters: 5,
    sortOrder: 5,
    title: {
      nl: "De hoogste heuvel",
      en: "The highest dune hill",
      de: "Die höchste Düne",
    },
    instruction: {
      nl: "<strong>Je staat op de hoogste heuvel van losloopgebied Zuid!</strong> Vanaf hier heb je een prachtig uitzicht over de Waterleidingduinen.<br><br><strong>Tip:</strong> kom bij zonsondergang terug voor het mooiste uitzicht — maar zorg dat je vóór het donker weer de duinen uit bent. Hier is het 's nachts pikkedonker en makkelijk verdwalen.<br><br>Maak een foto van je hond met het uitzicht — jullie hebben het verdiend!",
      en: "<strong>You're on the highest hill in off-leash area Zuid!</strong> From here you get a stunning view over the Water Supply Dunes.<br><br><strong>Tip:</strong> come back at sunset for the best view — but make sure you're out of the dunes before dark. It's pitch black here at night and easy to get lost.<br><br>Take a photo of your dog with the view — you've earned it!",
      de: "<strong>Du stehst auf der höchsten Düne im Freilaufgebiet Zuid!</strong> Von hier hast du einen wunderschönen Blick über die Waterleidingduinen.<br><br><strong>Tipp:</strong> Komm bei Sonnenuntergang wieder — aber verlasse die Dünen vor Einbruch der Dunkelheit. Nachts ist es hier stockdunkel.<br><br>Mach ein Foto deines Hundes mit dem Panorama!",
    },
    hint: {
      nl: "Zoek de hoogste heuvel in het gebied — klim omhoog voor het beste uitzicht. Je bent er bijna als je de Waterleidingduinen breed voor je ziet liggen.",
      en: "Find the tallest hill in the area and climb up for the best view. You're close when you can see the Water Supply Dunes spread out below.",
      de: "Finde die höchste Düne im Gebiet und steig hinauf. Du bist nah dran, wenn du die Waterleidingduinen weit unter dir siehst.",
    },
  },
  {
    id: "zuid-hertendal",
    lat: 52.365194,
    lng: 4.530917,
    radiusMeters: 5,
    sortOrder: 6,
    title: {
      nl: "Het hertendal",
      en: "The deer valley",
      de: "Das Rehtal",
    },
    instruction: {
      nl: "<strong>We gaan weer terug — zie je het hek van de Waterleidingduinen?</strong> Ga iets dichterbij en kijk goed: dit is dé plek waar je vaak hertjes ziet staan.<br><br>Het is een dal met een heuvel erachter — herten schuilen hier graag uit de wind en zoeken beschutting. <strong>Laat ze met rust:</strong> geen blaffen, geen rennen naar het hek, en nooit voeren.<br><br>Maak een foto van je hond op afstand van het hek. Een hert gezien? Wat geluk — vertel het ons bij Doggy Beach House!",
      en: "<strong>Heading back — see the Water Supply Dunes fence again?</strong> Move a little closer and look carefully: this is where deer often stand.<br><br>It's a valley with a hill behind it — deer shelter here from the wind. <strong>Leave them in peace:</strong> no barking, no running toward the fence, never feed them.<br><br>Take a photo of your dog at a respectful distance. Seen a deer? Lucky you — tell us at Doggy Beach House!",
      de: "<strong>Auf dem Rückweg — siehst du den Zaun wieder?</strong> Geh etwas näher und schau genau hin: Hier stehen oft Rehe.<br><br>Ein Tal mit einem Hügel dahinter — Rehe suchen hier Schutz vor dem Wind. <strong>Lass sie in Ruhe:</strong> nicht ans Zaun rennen, nicht füttern.<br><br>Mach ein Foto deines Hundes in respektvoller Entfernung. Ein Reh gesehen? Glück gehabt!",
    },
    hint: {
      nl: "Loop terug richting het hek van de Waterleidingduinen. Zoek een lager gelegen plek in het dal — herten staan hier vaak aan de andere kant van het raster.",
      en: "Head back toward the Water Supply Dunes fence. Look for a lower spot in the valley — deer are often seen on the other side of the wire.",
      de: "Geh zurück Richtung Zaun der Waterleidingduinen. Suche eine tiefer gelegene Stelle im Tal — Rehe stehen oft auf der anderen Seite des Zauns.",
    },
  },
  {
    id: "zuid-finish",
    lat: 52.366585,
    lng: 4.525002,
    radiusMeters: 5,
    sortOrder: 7,
    title: {
      nl: "Finish — einde speurtocht",
      en: "Finish — end of the hunt",
      de: "Ziel — Ende der Schnitzeljagd",
    },
    instruction: {
      nl: "<strong>Gefeliciteerd, jullie hebben het gehaald!</strong> Waar je nu staat was tot 1987 een stortplaats voor huisafval — moeilijk voor te stellen in deze prachtige natuur, toch?<br><br>We hopen dat jullie het een mooie wandeling vonden. Maak een slotfoto met je hond — je verdient <strong>50 Woof Coins</strong> als beloning!<br><br>Bedankt voor het meedoen aan de Woof ID-speurtocht. 🐾",
      en: "<strong>Congratulations — you made it!</strong> Where you stand now was a household waste landfill until 1987 — hard to imagine in this beautiful nature, right?<br><br>We hope you enjoyed the walk. Take a final photo with your dog — you've earned <strong>50 Woof Coins</strong>!<br><br>Thanks for joining the Woof ID scavenger hunt. 🐾",
      de: "<strong>Glückwunsch — geschafft!</strong> Wo du jetzt stehst, war bis 1987 eine Hausmülldeponie — schwer vorstellbar in dieser schönen Natur, oder?<br><br>Wir hoffen, ihr hattet eine schöne Wanderung. Mach ein Abschlussfoto — ihr habt <strong>50 Woof Coins</strong> verdient!<br><br>Danke fürs Mitmachen bei der Woof ID-Schnitzeljagd. 🐾",
    },
    hint: {
      nl: "Je bent bijna klaar! Loop terug richting de ingang van het losloopgebied, waar je begon — de finish ligt vlak bij het startpunt.",
      en: "Almost done! Walk back toward the entrance of the off-leash area where you started — the finish is near your starting point.",
      de: "Fast geschafft! Geh zurück zum Eingang des Freilaufgebiets, wo du begonnen hast — das Ziel liegt nahe am Startpunkt.",
    },
  },
];

/** @deprecated Full Zandvoort route including DBH and Amsterdam-adjacent areas. */
export const ZANDVOORT_HUNT_CHECKPOINTS: HuntCheckpoint[] = [
  {
    id: "dbh-start",
    lat: 52.3721086,
    lng: 4.5281375,
    radiusMeters: 50,
    sortOrder: 0,
    title: {
      nl: "Start bij Doggy Beach House",
      en: "Start at Doggy Beach House",
      de: "Start beim Doggy Beach House",
    },
    instruction: {
      nl: "Begin je speurtocht bij de ingang van Doggy Beach House. Maak een foto met je hond voor het pand.",
      en: "Begin your scavenger hunt at the Doggy Beach House entrance. Take a photo with your dog in front of the building.",
      de: "Beginne deine Schnitzeljagd am Eingang des Doggy Beach House. Mach ein Foto mit deinem Hund vor dem Gebäude.",
    },
    hint: {
      nl: "Je bent bij Doggy Beach House — de start van de route.",
      en: "You're at Doggy Beach House — the start of the route.",
      de: "Du bist beim Doggy Beach House — der Start der Route.",
    },
  },
  {
    id: "strand-parnassia",
    lat: 52.378,
    lng: 4.535,
    radiusMeters: 50,
    sortOrder: 1,
    title: {
      nl: "Strand bij Parnassia",
      en: "Beach near Parnassia",
      de: "Strand bei Parnassia",
    },
    instruction: {
      nl: "Loop richting het strand bij Parnassia. Zoek het uitzicht op zee en maak een foto van je hond op het pad.",
      en: "Walk toward the beach near Parnassia. Find the sea view and snap a photo of your dog on the path.",
      de: "Geh Richtung Strand bei Parnassia. Finde den Meerblick und mach ein Foto deines Hundes auf dem Weg.",
    },
    hint: {
      nl: "Loop richting het strand en Parnassia.",
      en: "Head toward the beach and Parnassia.",
      de: "Geh Richtung Strand und Parnassia.",
    },
  },
  {
    id: "duinpieperpad",
    lat: 52.3783,
    lng: 4.5597,
    radiusMeters: 55,
    sortOrder: 2,
    title: {
      nl: "Start Duinpieperpad",
      en: "Duinpieperpad trailhead",
      de: "Start Duinpieperpad",
    },
    instruction: {
      nl: "Vind het begin van het Duinpieperpad. Maak een foto waar je hond de duin ingaat of bij het bord staat.",
      en: "Find the start of the Duinpieperpad trail. Take a photo of your dog entering the dunes or by the sign.",
      de: "Finde den Start des Duinpieperpad-Weges. Mach ein Foto, wo dein Hund in die Dünen geht oder am Schild steht.",
    },
    hint: {
      nl: "Zoek het bord of begin van het Duinpieperpad.",
      en: "Look for the sign or trailhead of the Duinpieperpad.",
      de: "Suche das Schild oder den Start des Duinpieperpad.",
    },
  },
  {
    id: "visscherspad",
    lat: 52.3779,
    lng: 4.5654,
    radiusMeters: 50,
    sortOrder: 3,
    title: {
      nl: "Visscherspad",
      en: "Visscherspad",
      de: "Visscherspad",
    },
    instruction: {
      nl: "Volg het Visscherspad door de duinen. Maak een foto van je hond op het pad tussen het helmgras.",
      en: "Follow the Visscherspad through the dunes. Take a photo of your dog on the path among the marram grass.",
      de: "Folge dem Visscherspad durch die Dünen. Mach ein Foto deines Hundes auf dem Weg zwischen dem Dünengras.",
    },
    hint: {
      nl: "Blijf het Visscherspad volgen door de duinen.",
      en: "Keep following the Visscherspad through the dunes.",
      de: "Bleib auf dem Visscherspad durch die Dünen.",
    },
  },
  {
    id: "losloop-zuid",
    lat: 52.3665,
    lng: 4.532,
    radiusMeters: 60,
    sortOrder: 4,
    title: {
      nl: "Losloopgebied Zuid",
      en: "Off-leash area South",
      de: "Freilaufgebiet Süd",
    },
    instruction: {
      nl: "Je bent in het losloopgebied in de duinen. Laat je hond even rennen en maak een actiefoto!",
      en: "You're in the off-leash dune area. Let your dog run free and capture an action shot!",
      de: "Du bist im Freilaufgebiet in den Dünen. Lass deinen Hund rennen und mach ein Actionfoto!",
    },
    hint: {
      nl: "Je bent in het losloopgebied Zuid.",
      en: "You're in off-leash area Zuid.",
      de: "Du bist im Freilaufgebiet Zuid.",
    },
  },
  {
    id: "dbh-finish",
    lat: 52.3721086,
    lng: 4.5281375,
    radiusMeters: 50,
    sortOrder: 5,
    title: {
      nl: "Terug bij Doggy Beach House",
      en: "Back at Doggy Beach House",
      de: "Zurück beim Doggy Beach House",
    },
    instruction: {
      nl: "Gefeliciteerd! Loop terug naar Doggy Beach House en maak een feestfoto met je hond om de speurtocht af te ronden.",
      en: "Congratulations! Walk back to Doggy Beach House and take a celebration photo with your dog to finish the hunt.",
      de: "Glückwunsch! Geh zurück zum Doggy Beach House und mach ein Feierfoto mit deinem Hund, um die Schnitzeljagd abzuschließen.",
    },
    hint: {
      nl: "Loop terug naar Doggy Beach House.",
      en: "Walk back to Doggy Beach House.",
      de: "Geh zurück zum Doggy Beach House.",
    },
  },
];

export function getHuntCheckpoints(slug: string): HuntCheckpoint[] {
  if (slug === "zuid") {
    return ZUID_HUNT_CHECKPOINTS;
  }
  if (slug === "zandvoort-dunes") {
    return ZANDVOORT_HUNT_CHECKPOINTS;
  }
  return [];
}

export function getCheckpointByIndex(
  slug: string,
  index: number,
): HuntCheckpoint | undefined {
  return getHuntCheckpoints(slug)[index];
}
