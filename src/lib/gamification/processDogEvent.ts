import type { Prisma } from "@prisma/client";
import {
  AchievementRuleType,
  CoinSourceType,
  JourneyEventType,
  type PrismaClient,
} from "@prisma/client";

import { COIN_AMOUNTS } from "@/lib/gamification/coins";
import { COIN_PER_PRODUCT_UNIT } from "@/lib/gamification/productUnits";
import { prisma } from "@/lib/prisma";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export type DogEventType =
  | "PROFILE_CREATED"
  | "CHECK_IN"
  | "TOP_UP"
  | "RECEIPT_CONFIRMED"
  | "PHOTO_UPLOADED";

export type ProcessDogEventInput = {
  dogProfileId: string;
  eventType: DogEventType;
  payload?: {
    visitId?: string;
    topUpId?: string;
    amountEur?: number;
    isFirstTopUp?: boolean;
    location?: string;
    photoChallengeSlug?: string;
    receiptId?: string;
    productUnitCount?: number;
  };
};

async function addCoins(
  tx: Tx,
  dogProfileId: string,
  amount: number,
  reason: string,
  sourceType: CoinSourceType,
  sourceId?: string,
) {
  if (amount === 0) return;

  await tx.dogProfile.update({
    where: { id: dogProfileId },
    data: { woofCoins: { increment: amount } },
  });

  await tx.coinLedger.create({
    data: {
      dogProfileId,
      amount,
      reason,
      sourceType,
      sourceId,
    },
  });

  await tx.journeyEvent.create({
    data: {
      dogProfileId,
      eventType: JourneyEventType.COINS_EARNED,
      title: `+${amount} Woof Coins`,
      body: reason,
      metadata: { amount, sourceType },
    },
  });
}

async function unlockAchievement(
  tx: Tx,
  dogProfileId: string,
  achievementId: string,
  achievementName: string,
) {
  const existing = await tx.dogAchievement.findUnique({
    where: {
      dogProfileId_achievementId: { dogProfileId, achievementId },
    },
  });
  if (existing) return;

  await tx.dogAchievement.create({
    data: { dogProfileId, achievementId },
  });

  await tx.journeyEvent.create({
    data: {
      dogProfileId,
      eventType: JourneyEventType.ACHIEVEMENT_UNLOCKED,
      title: `Badge unlocked: ${achievementName}`,
      metadata: { achievementId },
    },
  });
}

async function evaluateAchievements(tx: Tx, dogProfileId: string) {
  const dog = await tx.dogProfile.findUnique({
    where: { id: dogProfileId },
    include: {
      achievements: true,
      topUps: true,
      receipts: { where: { status: "CONFIRMED" }, include: { items: true } },
      photoChallenges: true,
    },
  });
  if (!dog) return;

  const unlockedIds = new Set(dog.achievements.map((a) => a.achievementId));
  const definitions = await tx.achievementDefinition.findMany();

  const topUpTotal = dog.topUps.reduce(
    (sum, t) => sum + Number(t.amountEur),
    0,
  );
  const snackCount = dog.receipts
    .flatMap((r) => r.items)
    .filter((i) => i.category === "SNACKS")
    .reduce((s, i) => s + i.quantity, 0);
  const lickyCount = dog.receipts
    .flatMap((r) => r.items)
    .filter((i) => i.category === "LICKY")
    .reduce((s, i) => s + i.quantity, 0);
  const toyCount = dog.receipts
    .flatMap((r) => r.items)
    .filter((i) => i.category === "TOYS")
    .reduce((s, i) => s + i.quantity, 0);

  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;

    const config = def.ruleConfig as Prisma.JsonObject;
    const threshold = Number(config.threshold ?? 0);
    let met = false;

    switch (def.ruleType) {
      case AchievementRuleType.VISIT_COUNT:
        met = dog.visitCount >= threshold;
        break;
      case AchievementRuleType.TOP_UP_COUNT:
        met = dog.topUps.length >= threshold;
        break;
      case AchievementRuleType.TOP_UP_TOTAL_EUR:
        met = topUpTotal >= threshold;
        break;
      case AchievementRuleType.RECEIPT_COUNT:
        met = dog.receipts.length >= threshold;
        break;
      case AchievementRuleType.PRODUCT_CATEGORY_COUNT: {
        const category = String(config.category ?? "");
        const counts: Record<string, number> = {
          SNACKS: snackCount,
          LICKY: lickyCount,
          TOYS: toyCount,
        };
        met = (counts[category] ?? 0) >= threshold;
        break;
      }
      case AchievementRuleType.PHOTO_COUNT:
        met = dog.photoChallenges.length >= threshold;
        break;
    }

    if (met) {
      await unlockAchievement(tx, dogProfileId, def.id, def.name);
    }
  }
}

export async function processDogEvent(input: ProcessDogEventInput) {
  return prisma.$transaction(async (tx) => {
    const dog = await tx.dogProfile.findUnique({
      where: { id: input.dogProfileId },
    });
    if (!dog) throw new Error("Dog not found");

    switch (input.eventType) {
      case "PROFILE_CREATED":
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dog.id,
            eventType: JourneyEventType.PROFILE_CREATED,
            title: `${dog.name} kreeg een Woof ID`,
            body: `Woof ID: ${dog.woofId}`,
          },
        });
        break;

      case "CHECK_IN": {
        const location =
          input.payload?.location ?? "Doggy Beach House Zandvoort";
        await tx.dogProfile.update({
          where: { id: dog.id },
          data: { visitCount: { increment: 1 } },
        });
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dog.id,
            eventType: JourneyEventType.CHECK_IN,
            title: `${dog.name} checkte in bij ${location}`,
            body: `+${COIN_AMOUNTS.CHECK_IN} Woof Coins`,
            metadata: { visitId: input.payload?.visitId, location },
          },
        });
        await addCoins(
          tx,
          dog.id,
          COIN_AMOUNTS.CHECK_IN,
          "Check-in in de winkel",
          CoinSourceType.CHECK_IN,
          input.payload?.visitId,
        );
        break;
      }

      case "TOP_UP": {
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dog.id,
            eventType: JourneyEventType.TOP_UP,
            title: `Opwaardering geregistreerd`,
            body: input.payload?.amountEur
              ? `€${input.payload.amountEur.toFixed(2)}`
              : undefined,
            metadata: { topUpId: input.payload?.topUpId },
          },
        });
        if (input.payload?.isFirstTopUp) {
          await addCoins(
            tx,
            dog.id,
            COIN_AMOUNTS.FIRST_TOP_UP,
            "Eerste opwaardering",
            CoinSourceType.TOP_UP,
            input.payload?.topUpId,
          );
        }
        break;
      }

      case "RECEIPT_CONFIRMED": {
        const units = Math.max(0, input.payload?.productUnitCount ?? 0);
        const coins = units * COIN_PER_PRODUCT_UNIT;
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dog.id,
            eventType: JourneyEventType.RECEIPT_SCANNED,
            title: "Bon bevestigd",
            body:
              units > 0
                ? `${units} artikel${units === 1 ? "" : "en"} · +${coins} Woof Coins`
                : "Bon opgeslagen",
            metadata: {
              receiptId: input.payload?.receiptId,
              productUnitCount: units,
            },
          },
        });
        if (units > 0) {
          await tx.journeyEvent.create({
            data: {
              dogProfileId: dog.id,
              eventType: JourneyEventType.PRODUCTS_REGISTERED,
              title: `${units} producten geregistreerd`,
              metadata: { receiptId: input.payload?.receiptId, units },
            },
          });
          await addCoins(
            tx,
            dog.id,
            coins,
            `${units} gekochte artikel${units === 1 ? "" : "en"} op bon`,
            CoinSourceType.RECEIPT,
            input.payload?.receiptId,
          );
        }
        break;
      }

      case "PHOTO_UPLOADED":
        await tx.journeyEvent.create({
          data: {
            dogProfileId: dog.id,
            eventType: JourneyEventType.PHOTO_UPLOADED,
            title: "Foto-opdracht voltooid",
            body: `+${COIN_AMOUNTS.PHOTO_CHALLENGE} Woof Coins`,
            metadata: {
              challengeSlug: input.payload?.photoChallengeSlug,
            },
          },
        });
        await addCoins(
          tx,
          dog.id,
          COIN_AMOUNTS.PHOTO_CHALLENGE,
          "Foto-opdracht",
          CoinSourceType.PHOTO,
        );
        break;
    }

    await evaluateAchievements(tx, dog.id);

    return tx.dogProfile.findUnique({
      where: { id: dog.id },
      include: {
        achievements: { include: { achievement: true } },
        journeyEvents: { orderBy: { occurredAt: "desc" }, take: 5 },
      },
    });
  });
}
