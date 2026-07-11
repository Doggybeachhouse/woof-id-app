import { parseVoucherCode } from "@/lib/vouchers/parseCode";
import { getRewardArticleRule } from "@/lib/mplus/rewardArticleMap";
import { upsertMplusSessionContext } from "@/lib/mplus/sessionContext";
import type {
  MplusCompleteSessionPayload,
  MplusScanCodeResponse,
} from "@/lib/mplus/webhook/types";
import { prisma } from "@/lib/prisma";

const USABLE_VOUCHER_STATUSES = ["ACTIVE", "VALIDATED"] as const;
const VOUCHER_CODE_PATTERN = /^WVH[A-F0-9]+$/;

function normalizeScannedCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function isVoucherCode(code: string): boolean {
  return VOUCHER_CODE_PATTERN.test(parseVoucherCode(code));
}

async function lookupWalletDog(scannedCode: string) {
  const trimmed = scannedCode.trim();
  const candidates = [trimmed, trimmed.replace(/\s+/g, "")];

  for (const candidate of candidates) {
    const link = await prisma.woofWalletLink.findFirst({
      where: { walletCardId: candidate },
      include: { dog: { select: { id: true, name: true } } },
    });
    if (link) return link;
  }

  return null;
}

export async function processScanCodeWebhook(
  payload: MplusCompleteSessionPayload,
): Promise<MplusScanCodeResponse> {
  const sessionId = payload.session?.sessionId?.trim();
  const scannedRaw = payload.scanCode?.scannedCode?.trim() ?? "";

  if (!scannedRaw) {
    return { scanCode: { recognized: false, message: "Empty code" } };
  }

  const scannedCode = normalizeScannedCode(scannedRaw);

  if (isVoucherCode(scannedCode)) {
    const code = parseVoucherCode(scannedCode);
    const voucher = await prisma.rewardVoucher.findUnique({
      where: { code },
      include: { dog: { select: { id: true, name: true } } },
    });

    if (!voucher) {
      return {
        scanCode: {
          recognized: false,
          message: "Woof voucher niet gevonden",
        },
      };
    }

    if (voucher.status === "REDEEMED") {
      return {
        scanCode: {
          recognized: false,
          message: "Deze voucher is al verzilverd",
        },
      };
    }

    if (voucher.status === "CANCELLED") {
      return {
        scanCode: {
          recognized: false,
          message: "Deze voucher is geannuleerd",
        },
      };
    }

    if (!USABLE_VOUCHER_STATUSES.includes(voucher.status as "ACTIVE" | "VALIDATED")) {
      return {
        scanCode: {
          recognized: false,
          message: "Voucher niet bruikbaar",
        },
      };
    }

    if (sessionId) {
      await upsertMplusSessionContext({
        sessionId,
        dogProfileId: voucher.dogProfileId,
        voucherId: voucher.id,
        rewardId: voucher.rewardId,
      });
    }

    const rule = getRewardArticleRule(voucher.rewardId);
    const articleHint =
      rule && rule.articleNumbers.length > 0
        ? ` Scan het ${voucher.rewardTitle}-artikel om de korting te activeren.`
        : "";

    return {
      scanCode: {
        recognized: true,
        message: `Woof voucher: ${voucher.rewardTitle} (${code})`,
        customerMessage: `Hoi! ${voucher.dog.name} heeft een ${voucher.rewardTitle}-voucher.${articleHint}`,
      },
    };
  }

  const walletLink = await lookupWalletDog(scannedCode);
  if (walletLink && sessionId) {
    await upsertMplusSessionContext({
      sessionId,
      dogProfileId: walletLink.dogProfileId,
    });

    return {
      scanCode: {
        recognized: true,
        message: `Woof Wallet: ${walletLink.dog.name}`,
        customerMessage: `Welkom ${walletLink.dog.name}! Woof Wallet gekoppeld.`,
      },
    };
  }

  return { scanCode: { recognized: false } };
}
