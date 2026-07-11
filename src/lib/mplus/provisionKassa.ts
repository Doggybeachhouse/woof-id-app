import { getMplusCredentials, isMplusKassaAutoSyncEnabled } from "@/lib/mplus/config";
import {
  createGiftcard,
  findWoofWalletGiftcardType,
  getGiftcard,
  getGiftcardTypes,
} from "@/lib/mplus/giftcard";
import {
  findOrCreateMplusRelation,
  updateMplusRelationExtraText,
} from "@/lib/mplus/relations";
import { prisma } from "@/lib/prisma";

export type ProvisionDogKassaResult = {
  synced: boolean;
  relationNumber?: number;
  walletCardId?: string;
  walletCreated?: boolean;
  skippedReason?: string;
};

function buildDogKassaNote(woofId: string, dogName: string): string {
  return `Woof ID ${woofId} — ${dogName}`;
}

/**
 * Ensures the dog owner exists as an Mplus relation and optionally provisions
 * a Woof Wallet gift card when none was manually linked. Never throws.
 */
export async function provisionDogInMplusKassa(input: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  dogProfileId: string;
  woofId: string;
  dogName: string;
  manualWalletCardId?: string;
}): Promise<ProvisionDogKassaResult> {
  if (!isMplusKassaAutoSyncEnabled()) {
    return { synced: false, skippedReason: "auto_sync_disabled" };
  }

  const credentials = getMplusCredentials();
  if (!credentials) {
    return { synced: false, skippedReason: "mplus_not_configured" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { mplusRelationNumber: true },
    });
    if (!user) {
      return { synced: false, skippedReason: "user_not_found" };
    }

    let relationNumber = user.mplusRelationNumber ?? undefined;
    if (!relationNumber) {
      relationNumber =
        (await findOrCreateMplusRelation({
          userId: input.userId,
          name: input.userName,
          email: input.userEmail,
        })) ?? undefined;

      if (relationNumber) {
        await prisma.user.update({
          where: { id: input.userId },
          data: { mplusRelationNumber: relationNumber },
        });
      }
    }

    if (relationNumber) {
      const note = buildDogKassaNote(input.woofId, input.dogName);
      await updateMplusRelationExtraText(relationNumber, note);
    }

    const manualWallet = input.manualWalletCardId?.trim();
    if (manualWallet) {
      const existing = await getGiftcard(manualWallet);
      return {
        synced: true,
        relationNumber,
        walletCardId: manualWallet,
        walletCreated: false,
        skippedReason: existing ? undefined : "manual_wallet_not_found_in_mplus",
      };
    }

    const types = await getGiftcardTypes();
    const woofType = findWoofWalletGiftcardType(types);
    if (!woofType) {
      return {
        synced: Boolean(relationNumber),
        relationNumber,
        skippedReason: "woof_wallet_card_type_not_found",
      };
    }

    const created = await createGiftcard({
      cardTypeId: woofType.cardTypeId,
      branchNumber: credentials.branchNumber,
      employeeNumber: credentials.employeeNumber,
      amountCents: 0,
      externalReference: input.woofId,
      relationNumber,
    });

    if (!created.ok) {
      return {
        synced: Boolean(relationNumber),
        relationNumber,
        skippedReason: "giftcard_create_failed",
      };
    }

    await prisma.woofWalletLink.create({
      data: {
        dogProfileId: input.dogProfileId,
        walletCardId: created.cardNumber,
        linkedBy: "mplus-auto-provision",
      },
    });

    return {
      synced: true,
      relationNumber,
      walletCardId: created.cardNumber,
      walletCreated: true,
    };
  } catch (error) {
    console.error("[mplus/provision] provisionDogInMplusKassa failed", {
      dogProfileId: input.dogProfileId,
      woofId: input.woofId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { synced: false, skippedReason: "unexpected_error" };
  }
}

/**
 * Creates or links an Mplus relation when a Woof ID account is registered.
 * Never throws.
 */
export async function provisionUserInMplusKassa(input: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<{ synced: boolean; relationNumber?: number }> {
  if (!isMplusKassaAutoSyncEnabled()) {
    return { synced: false };
  }

  try {
    const relationNumber = await findOrCreateMplusRelation({
      userId: input.userId,
      name: input.name,
      email: input.email,
    });

    if (!relationNumber) {
      return { synced: false };
    }

    await prisma.user.update({
      where: { id: input.userId },
      data: { mplusRelationNumber: relationNumber },
    });

    return { synced: true, relationNumber };
  } catch (error) {
    console.error("[mplus/provision] provisionUserInMplusKassa failed", {
      userId: input.userId,
      email: input.email,
      error: error instanceof Error ? error.message : String(error),
    });
    return { synced: false };
  }
}
