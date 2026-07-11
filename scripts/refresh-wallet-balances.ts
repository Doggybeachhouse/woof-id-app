import "dotenv/config";

import { getWalletBalance } from "@/lib/mplus/balance";
import { isMplusConfigured } from "@/lib/mplus/config";
import { prisma } from "@/lib/prisma";

async function main() {
  if (!isMplusConfigured()) {
    console.error("Mplus is not configured; aborting.");
    process.exit(1);
  }

  const links = await prisma.woofWalletLink.findMany({
    select: { dogProfileId: true, walletCardId: true },
  });

  let refreshed = 0;
  let cached = 0;
  let unavailable = 0;

  for (const link of links) {
    const view = await getWalletBalance(link.walletCardId, link.dogProfileId);
    if (view.source === "live") {
      refreshed += 1;
      console.log(`live  ${link.walletCardId}  €${view.balanceEur.toFixed(2)}`);
    } else if (view.source === "cache") {
      cached += 1;
      console.log(`cache ${link.walletCardId}  €${view.balanceEur.toFixed(2)}`);
    } else {
      unavailable += 1;
      console.log(`skip  ${link.walletCardId}  (${view.reason})`);
    }
  }

  console.log(
    `Done: ${links.length} wallets — ${refreshed} live, ${cached} cache-only, ${unavailable} unavailable`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
