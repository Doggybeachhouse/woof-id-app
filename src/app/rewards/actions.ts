"use server";

import { revalidatePath } from "next/cache";

import { redeemRewardForDog } from "@/lib/gamification/redeemReward";
import { requireUser } from "@/lib/serverAuth";

export async function redeemRewardAction(dogProfileId: string, rewardId: string) {
  const session = await requireUser();
  const userId = (session.user as { id: string }).id;

  try {
    const result = await redeemRewardForDog(dogProfileId, userId, rewardId);
    revalidatePath("/rewards");
    revalidatePath(`/dogs/${dogProfileId}`);
    return {
      ok: true as const,
      voucherId: result.voucher.id,
      code: result.voucher.code,
      newBalance: result.newBalance,
      rewardTitle: result.reward.title,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Inwisselen mislukt",
    };
  }
}
