"use server";

import { revalidatePath } from "next/cache";

import { getLocale, getTranslatorForLocale } from "@/i18n/server";
import { requireStaff } from "@/lib/serverAuth";
import {
  validateVoucherByCode,
  type VoucherErrorCode,
} from "@/lib/vouchers/redeem";

const ERROR_KEYS: Record<VoucherErrorCode, string> = {
  not_found: "admin.vouchers.errors.notFound",
  already_redeemed: "admin.vouchers.errors.alreadyRedeemed",
  already_validated: "admin.vouchers.errors.alreadyValidated",
  cancelled: "admin.vouchers.errors.cancelled",
};

export async function redeemVoucherByCodeAction(code: string) {
  const session = await requireStaff();
  const staffId = (session.user as { id: string }).id;
  const locale = await getLocale();
  const t = getTranslatorForLocale(locale);

  const result = await validateVoucherByCode(code, staffId);

  if (!result.ok) {
    return {
      ok: false as const,
      error: t(ERROR_KEYS[result.errorCode]),
      errorCode: result.errorCode,
      voucher: result.voucher ?? null,
    };
  }

  revalidatePath("/admin/vouchers");
  revalidatePath("/admin/voucher-display");

  return {
    ok: true as const,
    alreadyValidated: result.alreadyValidated ?? false,
    voucher: result.voucher,
  };
}
