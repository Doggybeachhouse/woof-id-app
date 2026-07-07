import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

export async function createUniqueVoucherCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(6).toString("hex").toUpperCase();
    const code = `WVH${suffix}`;
    const existing = await prisma.rewardVoucher.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("Kon geen unieke vouchercode maken");
}
