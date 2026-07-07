import { parseVoucherCode } from "@/lib/vouchers/parseCode";
import { prisma } from "@/lib/prisma";

export type RedeemVoucherErrorCode =
  | "not_found"
  | "already_redeemed"
  | "cancelled";

export type RedeemVoucherSuccess = {
  ok: true;
  voucher: {
    code: string;
    rewardTitle: string;
    dogName: string;
    woofId: string;
    ownerEmail: string;
    coinsSpent: number;
  };
};

export type RedeemVoucherFailure = {
  ok: false;
  errorCode: RedeemVoucherErrorCode;
  voucher?: {
    code: string;
    rewardTitle: string;
    dogName: string;
    woofId?: string;
    ownerEmail?: string;
    redeemedAt?: Date | null;
  };
};

export type RedeemVoucherResult = RedeemVoucherSuccess | RedeemVoucherFailure;

const voucherInclude = {
  dog: {
    select: {
      name: true,
      woofId: true,
      owner: { select: { email: true } },
    },
  },
} as const;

export async function redeemVoucherByCode(
  rawCode: string,
  redeemedById: string | null,
): Promise<RedeemVoucherResult> {
  const code = parseVoucherCode(rawCode);
  if (!code.startsWith("WVH")) {
    return { ok: false, errorCode: "not_found" };
  }

  const existing = await prisma.rewardVoucher.findUnique({
    where: { code },
    include: voucherInclude,
  });

  if (!existing) {
    return { ok: false, errorCode: "not_found" };
  }

  if (existing.status === "REDEEMED") {
    return {
      ok: false,
      errorCode: "already_redeemed",
      voucher: {
        code: existing.code,
        rewardTitle: existing.rewardTitle,
        dogName: existing.dog.name,
        woofId: existing.dog.woofId,
        ownerEmail: existing.dog.owner.email,
        redeemedAt: existing.redeemedAt,
      },
    };
  }

  if (existing.status === "CANCELLED") {
    return { ok: false, errorCode: "cancelled" };
  }

  const updated = await prisma.rewardVoucher.updateMany({
    where: { id: existing.id, status: "ACTIVE" },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
      redeemedById,
    },
  });

  if (updated.count === 0) {
    const refreshed = await prisma.rewardVoucher.findUnique({
      where: { code },
      include: voucherInclude,
    });
    if (refreshed?.status === "REDEEMED") {
      return {
        ok: false,
        errorCode: "already_redeemed",
        voucher: {
          code: refreshed.code,
          rewardTitle: refreshed.rewardTitle,
          dogName: refreshed.dog.name,
          woofId: refreshed.dog.woofId,
          ownerEmail: refreshed.dog.owner.email,
          redeemedAt: refreshed.redeemedAt,
        },
      };
    }
    return { ok: false, errorCode: "not_found" };
  }

  return {
    ok: true,
    voucher: {
      code: existing.code,
      rewardTitle: existing.rewardTitle,
      dogName: existing.dog.name,
      woofId: existing.dog.woofId,
      ownerEmail: existing.dog.owner.email,
      coinsSpent: existing.coinsSpent,
    },
  };
}
