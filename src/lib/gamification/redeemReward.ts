import { CoinSourceType, JourneyEventType } from "@prisma/client";

import { getRewardById } from "@/lib/gamification/rewards";
import { createUniqueVoucherCode } from "@/lib/vouchers/code";
import { prisma } from "@/lib/prisma";

export async function redeemRewardForDog(
  dogProfileId: string,
  ownerUserId: string,
  rewardId: string,
) {
  const reward = getRewardById(rewardId);
  if (!reward) {
    throw new Error("Beloning niet gevonden");
  }

  return prisma.$transaction(async (tx) => {
    const dog = await tx.dogProfile.findFirst({
      where: { id: dogProfileId, ownerUserId },
    });

    if (!dog) {
      throw new Error("Hond niet gevonden");
    }

    if (dog.woofCoins < reward.coins) {
      throw new Error("Niet genoeg Woof Coins");
    }

    const code = await createUniqueVoucherCode();

    await tx.dogProfile.update({
      where: { id: dog.id },
      data: { woofCoins: { decrement: reward.coins } },
    });

    await tx.coinLedger.create({
      data: {
        dogProfileId: dog.id,
        amount: -reward.coins,
        reason: `Ingewisseld: ${reward.title}`,
        sourceType: CoinSourceType.REDEMPTION,
      },
    });

    const voucher = await tx.rewardVoucher.create({
      data: {
        code,
        dogProfileId: dog.id,
        rewardId: reward.id,
        rewardTitle: reward.title,
        coinsSpent: reward.coins,
      },
    });

    await tx.journeyEvent.create({
      data: {
        dogProfileId: dog.id,
        eventType: JourneyEventType.REWARD_REDEEMED,
        title: `${reward.title} ingewisseld`,
        body: `-${reward.coins} Woof Coins · voucher ${code}`,
        metadata: {
          voucherId: voucher.id,
          rewardId: reward.id,
          coinsSpent: reward.coins,
        },
      },
    });

    const updatedDog = await tx.dogProfile.findUnique({
      where: { id: dog.id },
      select: { woofCoins: true },
    });

    return {
      voucher,
      newBalance: updatedDog?.woofCoins ?? 0,
      reward,
    };
  });
}
