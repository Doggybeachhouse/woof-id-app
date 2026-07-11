import { parseVoucherCode } from "@/lib/vouchers/parseCode";
import { prisma } from "@/lib/prisma";

export type VoucherErrorCode =
  | "not_found"
  | "already_redeemed"
  | "already_validated"
  | "cancelled";

export type VoucherLookup = {
  code: string;
  rewardTitle: string;
  dogName: string;
  woofId: string;
  ownerEmail: string;
  coinsSpent?: number;
  redeemedAt?: Date | null;
};

export type ValidateVoucherSuccess = {
  ok: true;
  alreadyValidated?: boolean;
  voucher: VoucherLookup;
};

export type ValidateVoucherFailure = {
  ok: false;
  errorCode: VoucherErrorCode;
  voucher?: VoucherLookup;
};

export type ValidateVoucherResult = ValidateVoucherSuccess | ValidateVoucherFailure;

const voucherInclude = {
  dog: {
    select: {
      name: true,
      woofId: true,
      owner: { select: { email: true } },
    },
  },
} as const;

function toVoucherLookup(
  existing: {
    code: string;
    rewardTitle: string;
    coinsSpent: number;
    redeemedAt: Date | null;
    dog: { name: string; woofId: string; owner: { email: string } };
  },
): VoucherLookup {
  return {
    code: existing.code,
    rewardTitle: existing.rewardTitle,
    dogName: existing.dog.name,
    woofId: existing.dog.woofId,
    ownerEmail: existing.dog.owner.email,
    coinsSpent: existing.coinsSpent,
    redeemedAt: existing.redeemedAt,
  };
}

/**
 * Kiosk validation — marks voucher VALIDATED but does not consume it.
 * Final redemption happens via Mplus completeSession webhook at payment.
 */
export async function validateVoucherByCode(
  rawCode: string,
  validatedById: string | null,
): Promise<ValidateVoucherResult> {
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
      voucher: toVoucherLookup(existing),
    };
  }

  if (existing.status === "CANCELLED") {
    return { ok: false, errorCode: "cancelled" };
  }

  if (existing.status === "VALIDATED") {
    return {
      ok: true,
      alreadyValidated: true,
      voucher: toVoucherLookup(existing),
    };
  }

  const updated = await prisma.rewardVoucher.updateMany({
    where: { id: existing.id, status: "ACTIVE" },
    data: {
      status: "VALIDATED",
      redeemedById: validatedById,
    },
  });

  if (updated.count === 0) {
    const refreshed = await prisma.rewardVoucher.findUnique({
      where: { code },
      include: voucherInclude,
    });
    if (!refreshed) {
      return { ok: false, errorCode: "not_found" };
    }
    if (refreshed.status === "VALIDATED") {
      return {
        ok: true,
        alreadyValidated: true,
        voucher: toVoucherLookup(refreshed),
      };
    }
    if (refreshed.status === "REDEEMED") {
      return {
        ok: false,
        errorCode: "already_redeemed",
        voucher: toVoucherLookup(refreshed),
      };
    }
    return { ok: false, errorCode: "not_found" };
  }

  return {
    ok: true,
    voucher: toVoucherLookup(existing),
  };
}

/** @deprecated Use validateVoucherByCode for kiosk scans. */
export async function redeemVoucherByCode(
  rawCode: string,
  redeemedById: string | null,
) {
  return validateVoucherByCode(rawCode, redeemedById);
}
